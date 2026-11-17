import JSZip from 'jszip';
import {
  CatatanDisiplin,
  NilaiMataPelajaran,
  PresensiHarian,
  RekamMedis,
  SantriProfile,
  TahfidzEntry,
  UserRole,
} from '../types/pesantren';

export type ArchiveYearOption = '2026' | '2025' | 'all';

export interface YearlyArchiveInput {
  year: ArchiveYearOption;
  santriList: SantriProfile[];
  presensiList: PresensiHarian[];
  disiplinList: CatatanDisiplin[];
  nilaiList: NilaiMataPelajaran[];
  kesehatanList: RekamMedis[];
  tahfidzList: TahfidzEntry[];
  exportedByRole: UserRole;
}

export interface YearlyArchiveResult {
  filename: string;
  fileCount: number;
  totalRecords: number;
  counts: {
    santri: number;
    attendance: number;
    discipline: number;
    grades: number;
    health: number;
    tahfidz: number;
  };
}

const matchesYear = (dateStr: string | undefined, year: ArchiveYearOption): boolean => {
  if (year === 'all') return true;
  if (!dateStr) return false;
  return dateStr.startsWith(year);
};

export async function downloadYearlyArchiveZip(
  input: YearlyArchiveInput
): Promise<YearlyArchiveResult> {
  const {
    year,
    santriList,
    presensiList,
    disiplinList,
    nilaiList,
    kesehatanList,
    tahfidzList,
    exportedByRole,
  } = input;

  const yearLabel = year === 'all' ? 'all_years' : year;
  const generatedAt = new Date().toISOString();

  const filteredPresensi = presensiList.filter((item) => matchesYear(item.tanggal, year));
  const filteredDisiplin = disiplinList.filter((item) => matchesYear(item.tanggal, year));
  const filteredHealth = kesehatanList.filter((item) => matchesYear(item.tanggal, year));
  const filteredTahfidz = tahfidzList.filter((item) => matchesYear(item.tanggal, year));
  // NilaiMataPelajaran records represent annual/semester term evaluations without individual date stamps
  const archivedGrades = nilaiList;

  const counts = {
    santri: santriList.length,
    attendance: filteredPresensi.length,
    discipline: filteredDisiplin.length,
    grades: archivedGrades.length,
    health: filteredHealth.length,
    tahfidz: filteredTahfidz.length,
  };

  const totalRecords =
    counts.attendance +
    counts.discipline +
    counts.grades +
    counts.health +
    counts.tahfidz;

  const zip = new JSZip();

  const manifest = {
    institution: 'Pondok Pesantren SantriCity Masyarakat',
    archiveType: 'Annual Historical Offline Archive',
    archiveYear: year === 'all' ? 'All Recorded Years' : year,
    generatedAt,
    exportedByRole,
    formatVersion: '1.0.0',
    files: [
      'manifest.json',
      'santri_profiles.json',
      'attendance.json',
      'grades.json',
      'health.json',
      'tahfidz.json',
    ],
    recordCounts: counts,
    totalHistoricalRecords: totalRecords,
  };

  const santriProfilesPayload = {
    archiveYear: manifest.archiveYear,
    generatedAt,
    recordCount: santriList.length,
    records: santriList,
  };

  const attendancePayload = {
    archiveYear: manifest.archiveYear,
    generatedAt,
    attendanceRecordCount: filteredPresensi.length,
    disciplineRecordCount: filteredDisiplin.length,
    summaryBySantri: santriList.map((s) => {
      const logs = filteredPresensi.filter((p) => p.santriId === s.id);
      const perfectDays = logs.filter(
        (p) =>
          p.subuh === 'Hadir' &&
          p.dhuha === 'Hadir' &&
          p.sekolahPagi === 'Hadir' &&
          p.ashar === 'Hadir' &&
          p.halaqahSore === 'Hadir' &&
          p.maghribIsya === 'Hadir' &&
          p.belajarMalam === 'Hadir'
      ).length;
      return {
        santriId: s.id,
        nis: s.nis,
        nama: s.nama,
        totalDailyLogs: logs.length,
        perfectComplianceDays: perfectDays,
        poinDisiplin: s.poinDisiplin,
      };
    }),
    attendanceRecords: filteredPresensi,
    disciplineRecords: filteredDisiplin,
  };

  const gradesPayload = {
    archiveYear: manifest.archiveYear,
    generatedAt,
    recordCount: archivedGrades.length,
    summaryBySantri: santriList.map((s) => {
      const subjectRows = archivedGrades.filter((g) => g.santriId === s.id);
      const avgFinalScore = subjectRows.length
        ? Number(
            (
              subjectRows.reduce((acc, cur) => acc + cur.akhir, 0) /
              subjectRows.length
            ).toFixed(2)
          )
        : null;
      return {
        santriId: s.id,
        nis: s.nis,
        nama: s.nama,
        subjectCount: subjectRows.length,
        averageFinalScore: avgFinalScore,
      };
    }),
    records: archivedGrades,
  };

  const healthPayload = {
    archiveYear: manifest.archiveYear,
    generatedAt,
    recordCount: filteredHealth.length,
    summaryBySantri: santriList.map((s) => {
      const medicalRows = filteredHealth.filter((h) => h.santriId === s.id);
      return {
        santriId: s.id,
        nis: s.nis,
        nama: s.nama,
        golonganDarah: s.golonganDarah,
        alergi: s.alergi,
        visitCount: medicalRows.length,
        latestCondition: medicalRows[0]?.kondisiTerkini || 'Sehat',
      };
    }),
    records: filteredHealth,
  };

  const tahfidzPayload = {
    archiveYear: manifest.archiveYear,
    generatedAt,
    recordCount: filteredTahfidz.length,
    summaryBySantri: santriList.map((s) => {
      const entries = filteredTahfidz.filter((t) => t.santriId === s.id);
      const scored = entries.filter((t) => t.tajwid > 0);
      const avgTajwid = scored.length
        ? Number(
            (
              scored.reduce((acc, cur) => acc + cur.tajwid, 0) / scored.length
            ).toFixed(1)
          )
        : null;
      return {
        santriId: s.id,
        nis: s.nis,
        nama: s.nama,
        capaianJuz: s.capaianJuz,
        targetJuz: s.targetJuz,
        totalSubmissions: entries.length,
        ziyadahSubmissions: entries.filter((t) => t.tipe === 'Ziyadah').length,
        murajaahSubmissions: entries.filter((t) => t.tipe === 'Murajaah').length,
        tasmiSubmissions: entries.filter((t) => t.tipe === "Tasmi'").length,
        averageTajwid: avgTajwid,
      };
    }),
    records: filteredTahfidz,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('santri_profiles.json', JSON.stringify(santriProfilesPayload, null, 2));
  zip.file('attendance.json', JSON.stringify(attendancePayload, null, 2));
  zip.file('grades.json', JSON.stringify(gradesPayload, null, 2));
  zip.file('health.json', JSON.stringify(healthPayload, null, 2));
  zip.file('tahfidz.json', JSON.stringify(tahfidzPayload, null, 2));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateSlug = generatedAt.slice(0, 10);
  const filename = `santricity_yearly_archive_${yearLabel}_${dateSlug}.zip`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    fileCount: 6,
    totalRecords,
    counts,
  };
}
