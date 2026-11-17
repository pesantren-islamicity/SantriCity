import React, { useMemo, useState } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  NilaiMataPelajaran,
  PresensiHarian,
  CatatanDisiplin,
  TagihanKeuangan,
  AIAnalisisKaffah,
  UserRole,
} from '../types/pesantren';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Lock,
  Search,
  ShieldCheck,
  Users,
  CalendarCheck2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';
import { exportReportToPdf } from '../services/pdfExportService';

export type ExportDatasetCategory = 'progress' | 'attendance' | 'financial';

interface AdminDataExportPanelProps {
  santriList: SantriProfile[];
  tahfidzList: TahfidzEntry[];
  nilaiList: NilaiMataPelajaran[];
  presensiList: PresensiHarian[];
  disiplinList: CatatanDisiplin[];
  tagihanList: TagihanKeuangan[];
  aiKaffahMap: Record<string, AIAnalisisKaffah>;
  currentRole: UserRole;
  onStatusFeedback?: (msg: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Pengasuh & Admin',
  ustaz: 'Ustaz / Musyrif',
  keuangan: 'Bendahara SPP',
  medis: 'Medis Poskestren',
  wali: 'Wali Santri',
  santri: 'Santri',
};

const CATEGORY_PERMISSIONS: Record<ExportDatasetCategory, UserRole[]> = {
  progress: ['admin', 'ustaz'],
  attendance: ['admin', 'ustaz'],
  financial: ['admin', 'keuangan'],
};

const isRoleAuthorizedAny = (role: UserRole): boolean =>
  role === 'admin' || role === 'ustaz' || role === 'keuangan';

const isCategoryAuthorized = (
  category: ExportDatasetCategory,
  role: UserRole
): boolean => CATEGORY_PERMISSIONS[category].includes(role);

export const AdminDataExportPanel: React.FC<AdminDataExportPanelProps> = ({
  santriList,
  tahfidzList,
  nilaiList,
  presensiList,
  disiplinList,
  tagihanList,
  aiKaffahMap,
  currentRole,
  onStatusFeedback,
}) => {
  const defaultCategory: ExportDatasetCategory =
    currentRole === 'keuangan' ? 'financial' : 'progress';

  const [category, setCategory] = useState<ExportDatasetCategory>(defaultCategory);

  // Shared & Category Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSantriId, setSelectedSantriId] = useState<string>('ALL');
  const [asramaFilter, setAsramaFilter] = useState<string>('ALL');
  const [santriStatusFilter, setSantriStatusFilter] = useState<string>('ALL');
  const [progressTierFilter, setProgressTierFilter] = useState<'ALL' | 'HIGH' | 'MID' | 'LOW'>('ALL');
  const [attendanceQualityFilter, setAttendanceQualityFilter] = useState<'ALL' | 'PERFECT' | 'EXCEPTION'>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [financeStatusFilter, setFinanceStatusFilter] = useState<string>('ALL');
  const [financePeriodFilter, setFinancePeriodFilter] = useState<string>('ALL');
  const [localAlert, setLocalAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const effectiveCategory: ExportDatasetCategory = isCategoryAuthorized(category, currentRole)
    ? category
    : currentRole === 'keuangan'
    ? 'financial'
    : 'progress';

  const santriLookup = useMemo(() => {
    const map = new Map<string, SantriProfile>();
    santriList.forEach((s) => map.set(s.id, s));
    return map;
  }, [santriList]);

  const asramaOptions = useMemo(
    () => Array.from(new Set(santriList.map((s) => s.asrama))),
    [santriList]
  );

  const periodOptions = useMemo(
    () => Array.from(new Set(tagihanList.map((t) => t.bulanTahun))),
    [tagihanList]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSantriId('ALL');
    setAsramaFilter('ALL');
    setSantriStatusFilter('ALL');
    setProgressTierFilter('ALL');
    setAttendanceQualityFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setFinanceStatusFilter('ALL');
    setFinancePeriodFilter('ALL');
    setLocalAlert(null);
  };

  // 1. Filtered Santri Progress Rows
  const filteredProgressRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return santriList
      .map((s) => {
        const sTahfidz = tahfidzList.filter((t) => t.santriId === s.id);
        const sNilai = nilaiList.filter((n) => n.santriId === s.id);
        const sDisiplin = disiplinList.filter((d) => d.santriId === s.id);
        const aiScore = aiKaffahMap[s.id]?.skorHolistik ?? null;

        const targetPercent = Math.min(
          100,
          Math.round((s.capaianJuz / Math.max(1, s.targetJuz)) * 100)
        );
        const avgAkademik = sNilai.length
          ? Number(
              (sNilai.reduce((acc, cur) => acc + cur.akhir, 0) / sNilai.length).toFixed(1)
            )
          : null;
        const scoredTajwid = sTahfidz.filter((t) => t.tajwid > 0);
        const avgTajwid = scoredTajwid.length
          ? Math.round(
              scoredTajwid.reduce((acc, cur) => acc + cur.tajwid, 0) / scoredTajwid.length
            )
          : null;

        return {
          santri: s,
          targetPercent,
          totalSetoran: sTahfidz.length,
          ziyadahCount: sTahfidz.filter((t) => t.tipe === 'Ziyadah').length,
          avgTajwid,
          avgAkademik,
          aiScore,
          prestasiCount: sDisiplin.filter((d) => d.jenis === 'Prestasi').length,
        };
      })
      .filter((row) => {
        if (selectedSantriId !== 'ALL' && row.santri.id !== selectedSantriId) return false;
        if (asramaFilter !== 'ALL' && row.santri.asrama !== asramaFilter) return false;
        if (santriStatusFilter !== 'ALL' && row.santri.status !== santriStatusFilter) return false;
        if (progressTierFilter === 'HIGH' && row.targetPercent < 75) return false;
        if (progressTierFilter === 'MID' && (row.targetPercent < 50 || row.targetPercent >= 75)) return false;
        if (progressTierFilter === 'LOW' && row.targetPercent >= 50) return false;
        if (
          q &&
          !row.santri.nama.toLowerCase().includes(q) &&
          !row.santri.nis.toLowerCase().includes(q) &&
          !row.santri.kelas.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
  }, [
    santriList,
    tahfidzList,
    nilaiList,
    disiplinList,
    aiKaffahMap,
    selectedSantriId,
    asramaFilter,
    santriStatusFilter,
    progressTierFilter,
    searchQuery,
  ]);

  // 2. Filtered Attendance Rows
  const filteredAttendanceRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return presensiList
      .map((p) => {
        const s = santriLookup.get(p.santriId);
        const sessions = [
          p.subuh,
          p.dhuha,
          p.sekolahPagi,
          p.ashar,
          p.halaqahSore,
          p.maghribIsya,
          p.belajarMalam,
        ];
        const hadirCount = sessions.filter((st) => st === 'Hadir').length;
        const isPerfect = hadirCount === 7;
        return {
          presensi: p,
          santriNama: s?.nama || p.santriId,
          santriNis: s?.nis || '-',
          asrama: s?.asrama || '-',
          hadirCount,
          isPerfect,
        };
      })
      .filter((row) => {
        if (selectedSantriId !== 'ALL' && row.presensi.santriId !== selectedSantriId) return false;
        if (asramaFilter !== 'ALL' && row.asrama !== asramaFilter) return false;
        if (attendanceQualityFilter === 'PERFECT' && !row.isPerfect) return false;
        if (attendanceQualityFilter === 'EXCEPTION' && row.isPerfect) return false;
        if (dateFrom && row.presensi.tanggal < dateFrom) return false;
        if (dateTo && row.presensi.tanggal > dateTo) return false;
        if (
          q &&
          !row.santriNama.toLowerCase().includes(q) &&
          !row.santriNis.toLowerCase().includes(q) &&
          !(row.presensi.keterangan || '').toLowerCase().includes(q) &&
          !(row.presensi.tercatatOleh || '').toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
  }, [
    presensiList,
    santriLookup,
    selectedSantriId,
    asramaFilter,
    attendanceQualityFilter,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  // 3. Filtered Financial Rows
  const filteredFinancialRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tagihanList
      .map((inv) => {
        const s = santriLookup.get(inv.santriId);
        return {
          invoice: inv,
          santriNama: s?.nama || inv.santriId,
          santriNis: s?.nis || '-',
          asrama: s?.asrama || '-',
          rincianSummary: inv.posTagihan.map((p) => p.item).join('; '),
        };
      })
      .filter((row) => {
        if (selectedSantriId !== 'ALL' && row.invoice.santriId !== selectedSantriId) return false;
        if (asramaFilter !== 'ALL' && row.asrama !== asramaFilter) return false;
        if (financeStatusFilter !== 'ALL' && row.invoice.status !== financeStatusFilter) return false;
        if (financePeriodFilter !== 'ALL' && row.invoice.bulanTahun !== financePeriodFilter) return false;
        if (
          q &&
          !row.invoice.nomorInvoice.toLowerCase().includes(q) &&
          !row.santriNama.toLowerCase().includes(q) &&
          !row.santriNis.toLowerCase().includes(q) &&
          !(row.invoice.nomorReferensi || '').toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
  }, [
    tagihanList,
    santriLookup,
    selectedSantriId,
    asramaFilter,
    financeStatusFilter,
    financePeriodFilter,
    searchQuery,
  ]);

  const buildFilterSummary = (): string => {
    const parts: string[] = [];
    if (selectedSantriId !== 'ALL') {
      const s = santriLookup.get(selectedSantriId);
      parts.push(`Santri: ${s?.nama || selectedSantriId}`);
    }
    if (asramaFilter !== 'ALL') parts.push(`Asrama: ${asramaFilter}`);
    if (effectiveCategory === 'progress') {
      if (santriStatusFilter !== 'ALL') parts.push(`Status: ${santriStatusFilter}`);
      if (progressTierFilter !== 'ALL') parts.push(`Capaian: ${progressTierFilter}`);
    } else if (effectiveCategory === 'attendance') {
      if (attendanceQualityFilter !== 'ALL') parts.push(`Kepatuhan: ${attendanceQualityFilter}`);
      if (dateFrom || dateTo) parts.push(`Tanggal: ${dateFrom || '...'} s/d ${dateTo || '...'}`);
    } else {
      if (financeStatusFilter !== 'ALL') parts.push(`Status SPP: ${financeStatusFilter}`);
      if (financePeriodFilter !== 'ALL') parts.push(`Periode: ${financePeriodFilter}`);
    }
    if (searchQuery.trim()) parts.push(`Kata kunci: "${searchQuery.trim()}"`);
    return parts.length > 0 ? parts.join(' | ') : 'Semua Data (Tanpa Filter Pembatas)';
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!isCategoryAuthorized(effectiveCategory, currentRole)) {
      setLocalAlert({
        type: 'error',
        text: `Peran ${ROLE_LABELS[currentRole]} tidak memiliki otoritas untuk mengekspor laporan kategori ini.`,
      });
      return;
    }

    const filterSummary = buildFilterSummary();

    if (effectiveCategory === 'progress') {
      if (filteredProgressRows.length === 0) {
        setLocalAlert({
          type: 'error',
          text: 'Tidak ada data progres santri yang sesuai dengan filter untuk diekspor.',
        });
        return;
      }

      if (format === 'csv') {
        const csvRows = filteredProgressRows.map((r) => ({
          NIS: r.santri.nis,
          NamaSantri: r.santri.nama,
          Kelas: r.santri.kelas,
          Asrama: r.santri.asrama,
          StatusSantri: r.santri.status,
          CapaianJuz: r.santri.capaianJuz,
          TargetJuz: r.santri.targetJuz,
          PersentaseTarget: `${r.targetPercent}%`,
          SetoranTahfidz: r.totalSetoran,
          RataTajwid: r.avgTajwid ?? '-',
          RataAkademik: r.avgAkademik ?? '-',
          PoinDisiplin: r.santri.poinDisiplin,
          SkorAIKaffah: r.aiScore ?? '-',
        }));
        exportToCsv('laporan_progres_santri_terfilter', csvRows);
      } else {
        const avgJuz = (
          filteredProgressRows.reduce((a, b) => a + b.santri.capaianJuz, 0) /
          filteredProgressRows.length
        ).toFixed(1);
        const avgDisiplin = Math.round(
          filteredProgressRows.reduce((a, b) => a + b.santri.poinDisiplin, 0) /
            filteredProgressRows.length
        );
        exportReportToPdf({
          filename: 'laporan_progres_santri_terfilter',
          title: 'LAPORAN PROGRES TAHFIDZ, AKADEMIK & KEDISIPLINAN SANTRI',
          subtitle: 'Ekspor Konsol Admin · Rekapitulasi Capaian Hafalan & Akademik Terfilter',
          exportedByRole: ROLE_LABELS[currentRole],
          filterSummary,
          kpiSummary: `Total Santri: ${filteredProgressRows.length} | Rata-rata Hafalan: ${avgJuz} Juz | Rata-rata Poin Disiplin: ${avgDisiplin}/100`,
          columns: [
            'NIS',
            'Nama Santri',
            'Kelas / Asrama',
            'Juz (Target)',
            'Progres',
            'Setoran',
            'Tajwid',
            'Akademik',
            'Disiplin',
            'AI Kaffah',
            'Status',
          ],
          rows: filteredProgressRows.map((r) => [
            r.santri.nis,
            r.santri.nama,
            `${r.santri.kelas}\n${r.santri.asrama}`,
            `${r.santri.capaianJuz} / ${r.santri.targetJuz}`,
            `${r.targetPercent}%`,
            `${r.totalSetoran}x (${r.ziyadahCount} Ziyadah)`,
            r.avgTajwid ?? '-',
            r.avgAkademik ?? '-',
            `${r.santri.poinDisiplin}/100`,
            r.aiScore ?? '-',
            r.santri.status,
          ]),
        });
      }
    } else if (effectiveCategory === 'attendance') {
      if (filteredAttendanceRows.length === 0) {
        setLocalAlert({
          type: 'error',
          text: 'Tidak ada catatan presensi yang sesuai dengan filter untuk diekspor.',
        });
        return;
      }

      if (format === 'csv') {
        const csvRows = filteredAttendanceRows.map((r) => ({
          Tanggal: r.presensi.tanggal,
          NIS: r.santriNis,
          NamaSantri: r.santriNama,
          Asrama: r.asrama,
          Subuh: r.presensi.subuh,
          Dhuha: r.presensi.dhuha,
          SekolahPagi: r.presensi.sekolahPagi,
          Ashar: r.presensi.ashar,
          HalaqahSore: r.presensi.halaqahSore,
          MaghribIsya: r.presensi.maghribIsya,
          BelajarMalam: r.presensi.belajarMalam,
          SesiHadir: `${r.hadirCount}/7`,
          Keterangan: r.presensi.keterangan,
          PetugasPencatat: r.presensi.tercatatOleh,
        }));
        exportToCsv('laporan_presensi_santri_terfilter', csvRows);
      } else {
        const perfectCount = filteredAttendanceRows.filter((r) => r.isPerfect).length;
        exportReportToPdf({
          filename: 'laporan_presensi_santri_terfilter',
          title: 'LAPORAN PRESENSI IBADAH & KEGIATAN HARIAN SANTRI',
          subtitle: 'Ekspor Konsol Admin · Monitoring Kedisiplinan 7 Waktu Pesantren',
          exportedByRole: ROLE_LABELS[currentRole],
          filterSummary,
          kpiSummary: `Total Log Harian: ${filteredAttendanceRows.length} | Tertib Penuh (7/7): ${perfectCount} Hari (${Math.round(
            (perfectCount / filteredAttendanceRows.length) * 100
          )}%)`,
          columns: [
            'Tanggal',
            'NIS / Santri',
            'Subuh',
            'Dhuha',
            'Sekolah',
            'Ashar',
            'Halaqah',
            'Maghrib',
            'Malam',
            'Skor',
            'Keterangan',
          ],
          rows: filteredAttendanceRows.map((r) => [
            r.presensi.tanggal,
            `${r.santriNama}\n(${r.santriNis})`,
            r.presensi.subuh,
            r.presensi.dhuha,
            r.presensi.sekolahPagi,
            r.presensi.ashar,
            r.presensi.halaqahSore,
            r.presensi.maghribIsya,
            r.presensi.belajarMalam,
            `${r.hadirCount}/7`,
            r.presensi.keterangan || '-',
          ]),
        });
      }
    } else {
      if (filteredFinancialRows.length === 0) {
        setLocalAlert({
          type: 'error',
          text: 'Tidak ada data tagihan keuangan yang sesuai dengan filter untuk diekspor.',
        });
        return;
      }

      if (format === 'csv') {
        const csvRows = filteredFinancialRows.map((r) => ({
          NomorInvoice: r.invoice.nomorInvoice,
          NIS: r.santriNis,
          NamaSantri: r.santriNama,
          Asrama: r.asrama,
          Periode: r.invoice.bulanTahun,
          TotalNominalIDR: r.invoice.totalNominal,
          JatuhTempo: r.invoice.jatuhTempo,
          StatusPembayaran: r.invoice.status,
          MetodePembayaran: r.invoice.metodePembayaran || '-',
          TanggalBayar: r.invoice.tanggalBayar || '-',
          NomorReferensi: r.invoice.nomorReferensi || '-',
          RincianPos: r.rincianSummary,
        }));
        exportToCsv('laporan_keuangan_spp_terfilter', csvRows);
      } else {
        const totalNominal = filteredFinancialRows.reduce(
          (acc, cur) => acc + cur.invoice.totalNominal,
          0
        );
        const totalLunas = filteredFinancialRows
          .filter((r) => r.invoice.status === 'Lunas')
          .reduce((acc, cur) => acc + cur.invoice.totalNominal, 0);
        const totalTunggakan = totalNominal - totalLunas;

        exportReportToPdf({
          filename: 'laporan_keuangan_spp_terfilter',
          title: 'LAPORAN KEUANGAN & REKAPITULASI TAGIHAN SPP SANTRI',
          subtitle: 'Ekspor Konsol Admin · Buku Besar Tagihan Pendidikan & Asrama',
          exportedByRole: ROLE_LABELS[currentRole],
          filterSummary,
          kpiSummary: `Total Invoice: ${filteredFinancialRows.length} | Total Nominal: Rp ${totalNominal.toLocaleString(
            'id-ID'
          )} | Terbayar: Rp ${totalLunas.toLocaleString(
            'id-ID'
          )} | Sisa Tagihan: Rp ${totalTunggakan.toLocaleString('id-ID')}`,
          columns: [
            'No. Invoice',
            'Santri (NIS)',
            'Periode',
            'Nominal (IDR)',
            'Jatuh Tempo',
            'Status',
            'Metode Bayar',
            'Tgl Bayar / Ref',
          ],
          rows: filteredFinancialRows.map((r) => [
            r.invoice.nomorInvoice,
            `${r.santriNama}\n(${r.santriNis})`,
            r.invoice.bulanTahun,
            `Rp ${r.invoice.totalNominal.toLocaleString('id-ID')}`,
            r.invoice.jatuhTempo,
            r.invoice.status,
            r.invoice.metodePembayaran || '-',
            r.invoice.tanggalBayar
              ? `${r.invoice.tanggalBayar}\n${r.invoice.nomorReferensi || ''}`
              : '-',
          ]),
        });
      }
    }

    const labelMap: Record<ExportDatasetCategory, string> = {
      progress: 'Laporan Progres Santri',
      attendance: 'Laporan Presensi & Kedisiplinan',
      financial: 'Laporan Keuangan & SPP',
    };
    const msg = `${labelMap[effectiveCategory]} berhasil diekspor ke format ${format.toUpperCase()} oleh ${ROLE_LABELS[currentRole]}.`;
    setLocalAlert({ type: 'success', text: msg });
    onStatusFeedback?.(msg);
  };

  const activeRowCount =
    effectiveCategory === 'progress'
      ? filteredProgressRows.length
      : effectiveCategory === 'attendance'
      ? filteredAttendanceRows.length
      : filteredFinancialRows.length;

  const authorized = isRoleAuthorizedAny(currentRole);

  return (
    <section
      aria-label="Pusat Ekspor Data Terfilter Admin"
      className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Pusat Ekspor Data Terfilter (CSV & PDF)
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 ${
                authorized
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                  : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
              }`}
            >
              {authorized ? (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Otoritas Aktif: {ROLE_LABELS[currentRole]}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Akses Terbatas ({ROLE_LABELS[currentRole]})</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Filter dan unduh laporan resmi progres santri, presensi harian, serta rekapitulasi tagihan keuangan SPP ke format CSV atau PDF.
          </p>
        </div>

        {authorized && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor CSV ({activeRowCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh PDF ({activeRowCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Authorization Gate when role is unauthorized */}
      {!authorized ? (
        <div className="p-6 rounded-xl bg-neutral-950/80 border border-rose-900/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h4 className="text-sm font-bold text-white">
              Otorisasi Diperlukan untuk Ekspor Data Kelembagaan
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Peran saat ini (<strong className="text-rose-300">{ROLE_LABELS[currentRole]}</strong>) tidak diperbolehkan mengekspor rekapitulasi data lintas santri. Silakan beralih ke peran{' '}
              <strong className="text-emerald-300">Pengasuh & Admin</strong>,{' '}
              <strong className="text-emerald-300">Ustaz / Musyrif</strong>, atau{' '}
              <strong className="text-emerald-300">Bendahara SPP</strong> melalui pemilih peran di bilah atas.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Category Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  id: 'progress' as ExportDatasetCategory,
                  label: 'Progres Tahfidz & Akademik',
                  desc: 'Juz, Nilai Mapel, Disiplin, AI Kaffah',
                  icon: Users,
                  rolesText: 'Admin & Ustaz',
                },
                {
                  id: 'attendance' as ExportDatasetCategory,
                  label: 'Presensi Ibadah & Harian',
                  desc: 'Absensi 7 Waktu & Kepatuhan Asrama',
                  icon: CalendarCheck2,
                  rolesText: 'Admin & Ustaz',
                },
                {
                  id: 'financial' as ExportDatasetCategory,
                  label: 'Keuangan & Tagihan SPP',
                  desc: 'Invoice, Status Lunas, Referensi Bayar',
                  icon: CreditCard,
                  rolesText: 'Admin & Bendahara',
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const allowed = isCategoryAuthorized(tab.id, currentRole);
              const isSelected = effectiveCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    setCategory(tab.id);
                    setLocalAlert(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    !allowed
                      ? 'bg-neutral-950/40 border-neutral-800/60 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-950/35 border-emerald-500/60 shadow-sm cursor-pointer'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 cursor-pointer'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {allowed ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4 text-neutral-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="truncate">{tab.label}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">{tab.desc}</p>
                    {!allowed && (
                      <span className="text-[10px] font-mono text-amber-400">
                        Khusus {tab.rolesText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filter Laporan Sebelum Ekspor</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIS, atau kode..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Santri Selector */}
              <select
                value={selectedSantriId}
                onChange={(e) => setSelectedSantriId(e.target.value)}
                className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Semua Santri ({santriList.length})</option>
                {santriList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.nis})
                  </option>
                ))}
              </select>

              {/* Asrama Filter */}
              <select
                value={asramaFilter}
                onChange={(e) => setAsramaFilter(e.target.value)}
                className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Semua Asrama</option>
                {asramaOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* Category-specific primary filter */}
              {effectiveCategory === 'progress' && (
                <select
                  value={progressTierFilter}
                  onChange={(e) => setProgressTierFilter(e.target.value as 'ALL' | 'HIGH' | 'MID' | 'LOW')}
                  className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Capaian Hafalan</option>
                  <option value="HIGH">Target ≥ 75% (Unggulan)</option>
                  <option value="MID">Target 50% - 74%</option>
                  <option value="LOW">Target &lt; 50% (Bimbingan)</option>
                </select>
              )}

              {effectiveCategory === 'attendance' && (
                <select
                  value={attendanceQualityFilter}
                  onChange={(e) => setAttendanceQualityFilter(e.target.value as 'ALL' | 'PERFECT' | 'EXCEPTION')}
                  className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Status Kepatuhan</option>
                  <option value="PERFECT">Tertib Penuh (7/7 Waktu)</option>
                  <option value="EXCEPTION">Ada Masbuk / Izin / Alpha</option>
                </select>
              )}

              {effectiveCategory === 'financial' && (
                <select
                  value={financeStatusFilter}
                  onChange={(e) => setFinanceStatusFilter(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Status Pembayaran</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                  <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                </select>
              )}
            </div>

            {/* Extra secondary filters row */}
            {effectiveCategory === 'progress' && (
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                <span className="text-neutral-400 text-[11px]">Status Santri:</span>
                {(['ALL', 'Aktif', 'Izin Pulang'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSantriStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                      santriStatusFilter === st
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua Status' : st}
                  </button>
                ))}
              </div>
            )}

            {effectiveCategory === 'attendance' && (
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                <span className="text-neutral-400 text-[11px]">Rentang Tanggal:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                />
                <span className="text-neutral-500 text-[11px]">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {effectiveCategory === 'financial' && (
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                <span className="text-neutral-400 text-[11px]">Periode Tagihan:</span>
                <select
                  value={financePeriodFilter}
                  onChange={(e) => setFinancePeriodFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Periode</option>
                  {periodOptions.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {localAlert && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                localAlert.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-700/60 text-rose-200'
              }`}
            >
              {localAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{localAlert.text}</span>
            </div>
          )}

          {/* Filtered Data Preview Table */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-neutral-300">
                Pratinjau Data Terfilter ({activeRowCount} baris siap ekspor)
              </span>
              <span className="font-mono text-neutral-500 truncate max-w-full">
                {buildFilterSummary()}
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              {effectiveCategory === 'progress' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900/90 text-neutral-400 border-b border-neutral-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">NIS & Santri</th>
                      <th className="py-2.5 px-3 font-medium">Kelas & Asrama</th>
                      <th className="py-2.5 px-3 font-medium">Hafalan Juz</th>
                      <th className="py-2.5 px-3 font-medium">Akademik</th>
                      <th className="py-2.5 px-3 font-medium">Disiplin</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/70">
                    {filteredProgressRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-neutral-500">
                          Tidak ada data progres yang cocok dengan filter aktif.
                        </td>
                      </tr>
                    ) : (
                      filteredProgressRows.map((row) => (
                        <tr key={row.santri.id} className="hover:bg-neutral-900/40">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{row.santri.nama}</div>
                            <div className="font-mono text-[10px] text-neutral-400">{row.santri.nis}</div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-300">
                            <div>{row.santri.kelas}</div>
                            <div className="text-[10px] text-neutral-500">{row.santri.asrama}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-emerald-400">
                              {row.santri.capaianJuz} / {row.santri.targetJuz}
                            </span>{' '}
                            <span className="text-[10px] text-neutral-400">({row.targetPercent}%)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-200">
                            {row.avgAkademik ?? '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-300">
                            {row.santri.poinDisiplin}/100
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-700 text-neutral-200">
                              {row.santri.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {effectiveCategory === 'attendance' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900/90 text-neutral-400 border-b border-neutral-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Tanggal</th>
                      <th className="py-2.5 px-3 font-medium">Santri</th>
                      <th className="py-2.5 px-3 font-medium">Subuh</th>
                      <th className="py-2.5 px-3 font-medium">Sekolah</th>
                      <th className="py-2.5 px-3 font-medium">Ashar</th>
                      <th className="py-2.5 px-3 font-medium">Malam</th>
                      <th className="py-2.5 px-3 font-medium">Kepatuhan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/70">
                    {filteredAttendanceRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-neutral-500">
                          Tidak ada log presensi yang cocok dengan filter aktif.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendanceRows.map((row) => (
                        <tr key={row.presensi.id} className="hover:bg-neutral-900/40">
                          <td className="py-2.5 px-3 font-mono text-neutral-300">
                            {row.presensi.tanggal}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{row.santriNama}</div>
                            <div className="font-mono text-[10px] text-neutral-400">{row.santriNis}</div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-200">{row.presensi.subuh}</td>
                          <td className="py-2.5 px-3 text-neutral-200">{row.presensi.sekolahPagi}</td>
                          <td className="py-2.5 px-3 text-neutral-200">{row.presensi.ashar}</td>
                          <td className="py-2.5 px-3 text-neutral-200">{row.presensi.belajarMalam}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                row.isPerfect
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {row.hadirCount}/7 Hadir
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {effectiveCategory === 'financial' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900/90 text-neutral-400 border-b border-neutral-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">No. Invoice</th>
                      <th className="py-2.5 px-3 font-medium">Santri</th>
                      <th className="py-2.5 px-3 font-medium">Periode</th>
                      <th className="py-2.5 px-3 font-medium">Nominal</th>
                      <th className="py-2.5 px-3 font-medium">Jatuh Tempo</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/70">
                    {filteredFinancialRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-neutral-500">
                          Tidak ada tagihan keuangan yang cocok dengan filter aktif.
                        </td>
                      </tr>
                    ) : (
                      filteredFinancialRows.map((row) => (
                        <tr key={row.invoice.id} className="hover:bg-neutral-900/40">
                          <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                            {row.invoice.nomorInvoice}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{row.santriNama}</div>
                            <div className="font-mono text-[10px] text-neutral-400">{row.santriNis}</div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-300">{row.invoice.bulanTahun}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">
                            Rp {row.invoice.totalNominal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-400">
                            {row.invoice.jatuhTempo}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                row.invoice.status === 'Lunas'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : row.invoice.status === 'Menunggu Konfirmasi'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {row.invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
