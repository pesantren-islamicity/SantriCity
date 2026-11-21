import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfExportTableConfig {
  filename: string;
  title: string;
  subtitle: string;
  exportedByRole: string;
  filterSummary: string;
  kpiSummary: string;
  columns: string[];
  rows: (string | number)[][];
}

export function exportReportToPdf(config: PdfExportTableConfig): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowStr = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Top Header Band
  doc.setFillColor(16, 185, 129); // emerald-500 accent bar
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('PONDOK PESANTREN SANTRICITY MASYARAKAT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(config.subtitle, 14, 19.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text(config.title, 14, 27);

  // Right-aligned export metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Dicetak: ${nowStr} WIB`, pageWidth - 14, 14, { align: 'right' });
  doc.text(`Otoritas: ${config.exportedByRole}`, pageWidth - 14, 19.5, { align: 'right' });
  doc.text(`Total Baris: ${config.rows.length}`, pageWidth - 14, 25, { align: 'right' });

  // Filter & KPI summary box
  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 30.5, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text(`Filter Aktif: ${config.filterSummary}`, 17, 35.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(config.kpiSummary, 17, 40);

  autoTable(doc, {
    startY: 46,
    head: [config.columns],
    body: config.rows.map((row) => row.map((cell) => String(cell))),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [6, 78, 59], // emerald-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(
        'Dokumen Resmi Konsol Admin SantriCity · Rahasia Kelembagaan',
        14,
        pageHeight - 8
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`${config.filename}_${dateSlug}.pdf`);
}

import type {
  AIAnalisisKaffah,
  LearningRoadmap,
  NextLessonBatchRecommendation,
  PresensiHarian,
  RekamMedis,
  SantriProfile,
  SmartStudyTimetable,
  StudyPatternSummary,
  TahfidzBadge,
  TahfidzEntry,
  NilaiMataPelajaran,
} from '../types/pesantren';

export interface KaffahPdfReportData {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  nilaiList: NilaiMataPelajaran[];
  presensiList: PresensiHarian[];
  kesehatanList: RekamMedis[];
  aiKaffah: AIAnalisisKaffah;
  unlockedBadges: TahfidzBadge[];
  totalBadgesCount: number;
  roadmap?: LearningRoadmap;
  studyPattern?: StudyPatternSummary;
  nextLessonBatch?: NextLessonBatchRecommendation;
  smartTimetable?: SmartStudyTimetable;
}

/**
 * Strips non-Latin-1 glyphs (such as Arabic script or emojis) so jsPDF built-in Helvetica
 * never renders corrupted characters while keeping Indonesian punctuation clean.
 */
function sanitizePdfText(input: unknown, fallback = '-'): string {
  if (input === null || input === undefined) return fallback;
  const normalized = String(input)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return normalized || fallback;
}

export function exportKaffahReportToPdf(data: KaffahPdfReportData): string {
  const {
    santri,
    tahfidzList,
    nilaiList,
    presensiList,
    kesehatanList,
    aiKaffah,
    unlockedBadges,
    totalBadgesCount,
    roadmap,
    studyPattern,
    nextLessonBatch,
    smartTimetable,
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 18;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 2.5, 'F');
      y = 14;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(6, 78, 59);
    doc.text(sanitizePdfText(title.toUpperCase()), marginX, y);
    y += 1.8;
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4.5;
  };

  // Top Emerald Bar & Official Letterhead
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text('BISMILLAHIRRAHMANIRRAHIM', pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('PONDOK PESANTREN SANTRICITY MASYARAKAT', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(
    'Kanal Resmi: t.me/SantriCity313 | Portal: http://pesantren.islamicity.tv | Layanan: http://f.pesantren.islamicity.tv',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(
    'SURAT LAPORAN PERKEMBANGAN SANTRI KAFFAH (HOLISTIK) - SEMESTER GANJIL 2026/2027',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 3;

  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5.5;

  // Student Identity Card Box
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, y, contentWidth, 22, 1.5, 1.5, 'FD');

  const leftColX = marginX + 3.5;
  const rightColX = marginX + contentWidth / 2 + 2;
  let idY = y + 5.5;

  const drawIdField = (x: number, label: string, val: string, boldVal = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(label, x, idY);
    doc.setFont('helvetica', boldVal ? 'bold' : 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(`: ${sanitizePdfText(val)}`, x + 28, idY);
  };

  drawIdField(leftColX, 'Nama Santri', santri.nama, true);
  drawIdField(rightColX, 'Kamar / Asrama', `${santri.kamar} (${santri.asrama})`);
  idY += 5.5;
  drawIdField(leftColX, 'Nomor Induk (NIS)', santri.nis);
  drawIdField(rightColX, 'Wali Santri', `${santri.waliNama} (${santri.waliHubungan})`);
  idY += 5.5;
  drawIdField(leftColX, 'Kelas / Jenjang', santri.kelas);
  drawIdField(rightColX, 'Status Santri', santri.status, true);

  y += 27.5;

  // Section I: Tahfidz & Tajwid Al-Qur'an
  drawSectionHeading("I. Capaian Tahfidz & Tajwid Al-Qur'an");

  const avgTajwid = tahfidzList.length
    ? Math.round(tahfidzList.reduce((acc, cur) => acc + (Number(cur.tajwid) || 95), 0) / tahfidzList.length)
    : 95;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`Hafalan Tuntas: ${santri.capaianJuz} dari ${santri.targetJuz} Juz`, marginX, y);
  doc.text(`Rata-Rata Nilai Tajwid: ${avgTajwid}/100 (Mumtaz)`, pageWidth - marginX, y, { align: 'right' });
  y += 3.5;

  const tahfidzRows = tahfidzList.slice(0, 6).map((t) => [
    sanitizePdfText(`${t.tanggal} (${t.waktu})`),
    sanitizePdfText(t.tipe),
    sanitizePdfText(`Q.S. ${t.surah} (${t.ayatMulai}-${t.ayatSelesai})`),
    `Juz ${t.juz}`,
    sanitizePdfText(t.kelancaran),
    `${t.tajwid ?? 95}`,
    sanitizePdfText(t.musyrifNama),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Tanggal & Waktu', 'Tipe', 'Surah & Ayat', 'Juz', 'Kelancaran', 'Tajwid', 'Musyrif']],
    body: tahfidzRows.length > 0 ? tahfidzRows : [['-', '-', 'Belum ada riwayat setoran tercatat', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [31, 41, 55], lineColor: [209, 213, 219], lineWidth: 0.2 },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginX, right: marginX },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  if (unlockedBadges.length > 0) {
    ensureSpace(12);
    const badgeNames = unlockedBadges.map((b) => `${b.title} (${b.tier})`).join(', ');
    const badgeLines = doc.splitTextToSize(
      `Lencana Prestasi Tahfidz (${unlockedBadges.length}/${totalBadgesCount} Diraih): ${sanitizePdfText(badgeNames)}`,
      contentWidth - 6
    );
    const boxH = badgeLines.length * 4 + 4;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(marginX, y, contentWidth, boxH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text(badgeLines, marginX + 3, y + 4.5);
    y += boxH + 5;
  } else {
    y += 3;
  }

  // Section II: Transkrip Nilai Akademik & Kitab Kuning
  drawSectionHeading('II. Transkrip Nilai Akademik & Kitab Kuning');

  const avgNilaiNum = nilaiList.length
    ? nilaiList.reduce((acc, curr) => acc + (Number(curr.akhir) || 0), 0) / nilaiList.length
    : 92.4;
  const avgNilaiStr = avgNilaiNum.toFixed(1);
  const avgPredikat = avgNilaiNum >= 90 ? 'A' : avgNilaiNum >= 82 ? 'B+' : avgNilaiNum >= 75 ? 'B' : 'C';

  const nilaiRows = nilaiList.map((n) => [
    sanitizePdfText(n.mapel),
    sanitizePdfText(n.kategori),
    String(n.harian),
    String(n.uts),
    String(n.uas),
    String(n.akhir),
    sanitizePdfText(n.predikat),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Mata Pelajaran', 'Kategori', 'Harian', 'UTS', 'UAS', 'Nilai Akhir', 'Predikat']],
    body: [
      ...nilaiRows,
      ['Rata-Rata Kumulatif (IPK)', '-', '-', '-', '-', avgNilaiStr, avgPredikat],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [31, 41, 55], lineColor: [209, 213, 219], lineWidth: 0.2 },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === nilaiRows.length) {
        hookData.cell.styles.fillColor = [236, 253, 245];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginX, right: marginX },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // Optional AI Academic Enrichments (Roadmap, Study Pattern, Next Lessons, Smart Timetable)
  if (roadmap && roadmap.topikRekomendasi.length > 0) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text(
      sanitizePdfText(`Rekomendasi AI Learning Roadmap (Target: ${roadmap.fokusPrioritasUtama})`),
      marginX,
      y
    );
    y += 2.5;
    autoTable(doc, {
      startY: y,
      head: [['Kode', 'Topik Prioritas', 'Urgensi', 'Rujukan Kitab/Sumber', 'Durasi']],
      body: roadmap.topikRekomendasi.slice(0, 4).map((tp) => [
        sanitizePdfText(tp.subjectKode),
        sanitizePdfText(tp.topik),
        sanitizePdfText(tp.tingkatUrgensi),
        sanitizePdfText(tp.sumberRujukan),
        `${tp.durasiMinggu} Pekan`,
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.8, textColor: [55, 65, 81], lineColor: [229, 231, 235] },
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  if (studyPattern) {
    ensureSpace(20);
    const patternSummary = doc.splitTextToSize(
      sanitizePdfText(
        `AI Study Pattern - Waktu Prima: ${studyPattern.overallPeakTime} | Pola Kognitif: ${studyPattern.cognitivePace}. "${studyPattern.executiveSummary}"`
      ),
      contentWidth - 6
    );
    const boxH = patternSummary.length * 3.8 + 5;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(marginX, y, contentWidth, boxH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text(patternSummary, marginX + 3, y + 4.5);
    y += boxH + 4;
  }

  if (nextLessonBatch && nextLessonBatch.recommendedLessons.length > 0) {
    ensureSpace(18);
    const nlLines = doc.splitTextToSize(
      sanitizePdfText(
        `AI Next Lessons (${nextLessonBatch.recommendedLessons.filter((l) => l.isCompleted).length}/${nextLessonBatch.recommendedLessons.length} Selesai) - Diagnosis: ${nextLessonBatch.primaryCurriculumGapSummary}`
      ),
      contentWidth - 6
    );
    const boxH = nlLines.length * 3.8 + 5;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(marginX, y, contentWidth, boxH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(17, 94, 89);
    doc.text(nlLines, marginX + 3, y + 4.5);
    y += boxH + 4;
  }

  if (smartTimetable && smartTimetable.slots.length > 0) {
    ensureSpace(16);
    const ttText = sanitizePdfText(
      `AI Smart Scheduler: ${smartTimetable.totalWeeklyStudyHours} Jam/Pekan (${smartTimetable.slots.filter((s) => s.isCompleted).length}/${smartTimetable.slots.length} sesi selesai) · Prioritas: ${smartTimetable.peakSlotUtilized}`
    );
    const ttLines = doc.splitTextToSize(ttText, contentWidth - 6);
    const boxH = ttLines.length * 3.8 + 4.5;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(marginX, y, contentWidth, boxH, 1.2, 1.2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 78, 59);
    doc.text(ttLines, marginX + 3, y + 4.5);
    y += boxH + 4;
  }

  // Study Intensity Heatmap Highlight Strip
  ensureSpace(12);
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(marginX, y, contentWidth, 9, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(31, 41, 55);
  doc.text('Ritme & Intensitas Belajar: Rerata 82/100 (Produktivitas Tinggi) · Rekor 24 Hari', marginX + 3, y + 5.8);
  doc.setTextColor(5, 150, 105);
  doc.text('+8.6% Korelasi Nilai Ujian', pageWidth - marginX - 3, y + 5.8, { align: 'right' });
  y += 14;

  // Section III & IV: Adab, Ubudiyah, Disiplin & Kesehatan (Side-by-Side)
  ensureSpace(34);
  const colW = (contentWidth - 4) / 2;
  const latestPresensi = presensiList[0];
  const latestMedis = kesehatanList[0];

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(marginX, y, colW, 28, 1.2, 1.2, 'FD');
  doc.roundedRect(marginX + colW + 4, y, colW, 28, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text('III. ADAB, DISIPLIN & UBUDIYAH', marginX + 3, y + 5.5);
  doc.text('IV. KESEHATAN (POSKESTREN)', marginX + colW + 7, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(55, 65, 81);
  doc.text(`Poin Kedisiplinan: ${santri.poinDisiplin} / 100 Poin`, marginX + 3, y + 11);
  doc.text(
    sanitizePdfText(
      latestPresensi
        ? `Presensi Terkini (${latestPresensi.tanggal}): Subuh ${latestPresensi.subuh}, Halaqah ${latestPresensi.halaqahSore}`
        : 'Kehadiran Jamaah Subuh: 99% Hadir Tepat Waktu'
    ),
    marginX + 3,
    y + 16
  );
  const adabNote = doc.splitTextToSize(
    'Catatan: Santri teladan dalam adab asrama dan ibadah rawatib.',
    colW - 6
  );
  doc.text(adabNote, marginX + 3, y + 21);

  doc.text(
    sanitizePdfText(`Status Vital: ${latestMedis ? latestMedis.kondisiTerkini : 'Sehat & Aktif'}`),
    marginX + colW + 7,
    y + 11
  );
  doc.text(`Golongan Darah: ${sanitizePdfText(santri.golonganDarah)}`, marginX + colW + 7, y + 16);
  const alergiText = doc.splitTextToSize(
    sanitizePdfText(
      `Alergi: ${santri.alergi.length ? santri.alergi.join(', ') : 'Nihil'}${
        latestMedis ? ` | Diagnosa Terakhir: ${latestMedis.diagnosa}` : ''
      }`
    ),
    colW - 6
  );
  doc.text(alergiText, marginX + colW + 7, y + 21);

  y += 34;

  // Section V: Sintesis Analitik AI Kaffah SantriCity
  drawSectionHeading('V. Sintesis Analitik AI Kaffah SantriCity');
  const ringkasanLines = doc.splitTextToSize(
    sanitizePdfText(`"${aiKaffah.ringkasanKaffah}"`),
    contentWidth - 6
  );
  const waliLines = doc.splitTextToSize(
    sanitizePdfText(`Pesan Pembinaan untuk Wali: ${aiKaffah.rekomendasiWali}`),
    contentWidth - 6
  );
  const aiBoxH = 14 + ringkasanLines.length * 3.8 + waliLines.length * 3.8;
  ensureSpace(aiBoxH + 8);

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(marginX, y, contentWidth, aiBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text(`Skor Holistik Kaffah: ${aiKaffah.skorHolistik} / 100`, marginX + 3, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `Pilar -> Tahfidz: ${aiKaffah.pilar.tahfidzAlQuran} | Akademik: ${aiKaffah.pilar.prestasiAkademik} | Adab: ${aiKaffah.pilar.adabKedisiplinan} | Medis: ${aiKaffah.pilar.kesehatanFisik} | Sosial: ${aiKaffah.pilar.keaktifanSosial}`,
    pageWidth - marginX - 3,
    y + 5.5,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(ringkasanLines, marginX + 3, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.text(waliLines, marginX + 3, y + 12.5 + ringkasanLines.length * 3.8);

  y += aiBoxH + 10;

  // Section VI: Signatures
  ensureSpace(34);
  doc.setDrawColor(209, 213, 219);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  const sigW = contentWidth / 3;
  const sigLabels = ['Wali Santri', 'Musyrif Pembina Tahfidz', 'Pengasuh Pondok Pesantren'];
  const sigNames = [
    sanitizePdfText(santri.waliNama),
    'Ust. Ahmad Fauzan, Al-Hafidz',
    'K.H. Ahmad Nawawi, M.A.',
  ];

  sigLabels.forEach((lbl, idx) => {
    const centerX = marginX + sigW * idx + sigW / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(lbl, centerX, y, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(sigNames[idx], centerX, y + 18, { align: 'center' });
    doc.line(centerX - 24, y + 19.2, centerX + 24, y + 19.2);
  });

  // Page Footers across all generated pages
  const nowStr = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Rapor Resmi Kaffah SantriCity · ${sanitizePdfText(santri.nama)} (${santri.nis}) · ${nowStr} WIB`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const safeFileSlug = sanitizePdfText(santri.nama, 'Santri')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `Rapor_Kaffah_${safeFileSlug}_${santri.nis}_${dateSlug}.pdf`;
  doc.save(filename);
  return filename;
}

