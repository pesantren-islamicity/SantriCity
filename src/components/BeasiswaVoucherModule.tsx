import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Language,
  NilaiMataPelajaran,
  SantriProfile,
  ScholarshipApplication,
  ScholarshipCategory,
  ScholarshipProgram,
  ScholarshipVoucher,
  UserRole,
} from '../types/pesantren';
import { exportToCsv } from '../services/storageService';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Maximize2,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from 'lucide-react';

interface BeasiswaVoucherModuleProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  programs: ScholarshipProgram[];
  vouchers: ScholarshipVoucher[];
  applications: ScholarshipApplication[];
  onClaimVoucher: (voucherId: string) => void;
  onIssueVoucher: (
    voucher: Omit<ScholarshipVoucher, 'id' | 'kodeVoucher'>
  ) => void;
  onSubmitApplication: (
    application: Omit<ScholarshipApplication, 'id'>
  ) => void;
  onUpdateApplicationStatus: (
    applicationId: string,
    status: ScholarshipApplication['status']
  ) => void;
  currentRole: UserRole;
  lang: Language;
}

const CATEGORIES: ScholarshipCategory[] = [
  'Semua',
  'Pemerintah & Kedinasan',
  'Tahfidz & Riset',
  'Mitra & Korporasi',
  'Prestasi & Talenta',
];

export const BeasiswaVoucherModule: React.FC<BeasiswaVoucherModuleProps> = ({
  santri,
  nilaiList,
  programs,
  vouchers,
  applications,
  onClaimVoucher,
  onIssueVoucher,
  onSubmitApplication,
  onUpdateApplicationStatus,
  currentRole,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<ScholarshipCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyEligible, setOnlyEligible] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<
    'direktori' | 'voucher' | 'pengajuan'
  >('direktori');

  // Modals
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [applyingProgram, setApplyingProgram] =
    useState<ScholarshipProgram | null>(null);
  const [jalurPrestasi, setJalurPrestasi] = useState<string>('');
  const [catatanMotivasi, setCatatanMotivasi] = useState<string>('');

  const [selectedVoucherQr, setSelectedVoucherQr] =
    useState<ScholarshipVoucher | null>(null);
  const voucherCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isIssueVoucherOpen, setIsIssueVoucherOpen] = useState<boolean>(false);
  const [newVoucherTitle, setNewVoucherTitle] = useState<string>('');
  const [newVoucherProgram, setNewVoucherProgram] = useState<string>(
    programs[0]?.nama || "Beasiswa Tahfizh Al-Qur'an"
  );
  const [newVoucherNominal, setNewVoucherNominal] = useState<number>(2500000);
  const [newVoucherCat, setNewVoucherCat] =
    useState<ScholarshipVoucher['kategoriVoucher']>('Pembebasan SPP/UKT');

  const [posterError, setPosterError] = useState<boolean>(false);

  // Render QR code when voucher pass modal is open
  useEffect(() => {
    if (selectedVoucherQr && voucherCanvasRef.current) {
      QRCode.toCanvas(
        voucherCanvasRef.current,
        JSON.stringify({
          kode: selectedVoucherQr.kodeVoucher,
          santri: santri.nama,
          nis: santri.nis,
          nominal: selectedVoucherQr.nominalRupiah,
          program: selectedVoucherQr.programBeasiswa,
        }),
        {
          width: 180,
          margin: 2,
          color: { dark: '#064e3b', light: '#ffffff' },
        },
        (err) => {
          if (err) console.error('Voucher QR failed:', err);
        }
      );
    }
  }, [selectedVoucherQr, santri.nama, santri.nis]);

  const avgNilai = useMemo(() => {
    if (!nilaiList.length) return 90.0;
    return Number(
      (
        nilaiList.reduce((acc, item) => acc + item.akhir, 0) / nilaiList.length
      ).toFixed(1)
    );
  }, [nilaiList]);

  // Evaluate eligibility per scholarship program against active santri profile
  const evaluatedPrograms = useMemo(() => {
    return programs.map((prog) => {
      const checks: { label: string; met: boolean }[] = [];

      if (typeof prog.syaratMinimalJuz === 'number') {
        checks.push({
          label: `Tahfidz ≥ ${prog.syaratMinimalJuz} Juz (${santri.capaianJuz} Juz)`,
          met: santri.capaianJuz >= prog.syaratMinimalJuz,
        });
      }
      if (typeof prog.syaratMinimalNilai === 'number') {
        checks.push({
          label: `Nilai Rata-rata ≥ ${prog.syaratMinimalNilai} (${avgNilai})`,
          met: avgNilai >= prog.syaratMinimalNilai,
        });
      }
      if (typeof prog.syaratMinimalDisiplin === 'number') {
        checks.push({
          label: `Poin Adab ≥ ${prog.syaratMinimalDisiplin} (${santri.poinDisiplin})`,
          met: santri.poinDisiplin >= prog.syaratMinimalDisiplin,
        });
      }

      const metCount = checks.filter((c) => c.met).length;
      const isEligible = checks.length === 0 || metCount === checks.length;
      const matchPercent =
        checks.length > 0 ? Math.round((metCount / checks.length) * 100) : 100;

      const existingApp = applications.find(
        (a) => a.santriId === santri.id && a.scholarshipId === prog.id
      );

      return {
        ...prog,
        checks,
        isEligible,
        matchPercent,
        existingApp,
      };
    });
  }, [
    applications,
    avgNilai,
    programs,
    santri.capaianJuz,
    santri.id,
    santri.poinDisiplin,
  ]);

  const filteredPrograms = useMemo(() => {
    return evaluatedPrograms.filter((p) => {
      const matchCat =
        selectedCategory === 'Semua' || p.kategori === selectedCategory;
      const matchElig = !onlyEligible || p.isEligible;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.penyelenggara.toLowerCase().includes(q) ||
        p.dukunganFinansial.toLowerCase().includes(q) ||
        p.voucherBenefit.toLowerCase().includes(q);
      return matchCat && matchElig && matchQuery;
    });
  }, [evaluatedPrograms, onlyEligible, searchQuery, selectedCategory]);

  const santriVouchers = useMemo(
    () => vouchers.filter((v) => v.santriId === santri.id),
    [vouchers, santri.id]
  );

  const santriApplications = useMemo(
    () =>
      currentRole === 'admin' || currentRole === 'keuangan' || currentRole === 'ustaz'
        ? applications
        : applications.filter((a) => a.santriId === santri.id),
    [applications, currentRole, santri.id]
  );

  const totalEligibleCount = evaluatedPrograms.filter((p) => p.isEligible).length;
  const totalPotentialVoucher = evaluatedPrograms
    .filter((p) => p.isEligible)
    .reduce((acc, curr) => acc + curr.voucherPendidikanNominal, 0);
  const activeVoucherSum = santriVouchers
    .filter((v) => v.status !== 'Sudah Diklaim')
    .reduce((acc, curr) => acc + curr.nominalRupiah, 0);

  const handleOpenApply = (program: ScholarshipProgram) => {
    setApplyingProgram(program);
    setJalurPrestasi(
      `Tahfidz ${santri.capaianJuz} Juz · Rata-rata Akademik ${avgNilai} · Adab ${santri.poinDisiplin}`
    );
    setCatatanMotivasi('');
  };

  const handleSubmitApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingProgram) return;

    onSubmitApplication({
      santriId: santri.id,
      santriNama: santri.nama,
      scholarshipId: applyingProgram.id,
      scholarshipNama: applyingProgram.nama,
      tanggalDaftar: new Date().toISOString().slice(0, 10),
      jalurPrestasi: jalurPrestasi.trim() || `Tahfidz ${santri.capaianJuz} Juz`,
      estimasiVoucher: applyingProgram.voucherPendidikanNominal,
      catatanMotivasi:
        catatanMotivasi.trim() ||
        'Bertekad menuntaskan studi lanjut dengan tenang dan berkontribusi bagi umat.',
      status: 'Diajukan',
    });

    setApplyingProgram(null);
    setActiveSubTab('pengajuan');
  };

  const handleIssueNewVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    onIssueVoucher({
      santriId: santri.id,
      judul: newVoucherTitle.trim() || `Voucher Pendidikan ${newVoucherProgram}`,
      programBeasiswa: newVoucherProgram,
      nominalRupiah: Number(newVoucherNominal),
      kategoriVoucher: newVoucherCat,
      berlakuHingga: '2027-06-30',
      status: 'Aktif Siap Pakai',
    });
    setIsIssueVoucherOpen(false);
    setNewVoucherTitle('');
    setActiveSubTab('voucher');
  };

  const handleExportCsv = () => {
    const rows = evaluatedPrograms.map((p) => ({
      Kode: p.kode,
      ProgramBeasiswa: p.nama,
      Penyelenggara: p.penyelenggara,
      Kategori: p.kategori,
      DukunganFinansial: p.dukunganFinansial,
      NominalVoucherRp: p.voucherPendidikanNominal,
      KelayakanSantri: p.isEligible ? 'Memenuhi Syarat' : 'Perlu Peningkatan',
      BatasDaftar: p.batasPendaftaran,
    }));
    exportToCsv(`peluang_beasiswa_${santri.nis}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Peluang Beasiswa & Voucher SantriCity
            </h2>
            <span className="font-arabic text-emerald-400 text-lg font-bold">
              فرص المنح الدراسية والدعم المالي
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Kuliah tenang dengan dukungan finansial & voucher pendidikan yang memadai untuk santri berprestasi dan penghafal Al-Qur&apos;an.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {(currentRole === 'admin' ||
            currentRole === 'keuangan' ||
            currentRole === 'ustaz') && (
            <button
              type="button"
              onClick={() => setIsIssueVoucherOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Voucher Santri</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Showcase: Slogan + Official Attached Beasiswa Poster */}
      <section className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2.5">
            <div className="text-xs font-medium text-emerald-400">
              Program Pendanaan Studi Lanjut & Perguruan Tinggi Mitra
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight max-w-xl">
              Kuliah Tenang dengan Dukungan Finansial & Voucher yang Memadai
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              Sistem pencocokan otomatis menghubungkan capaian hafalan ({santri.capaianJuz} Juz), nilai akademik ({avgNilai}), dan poin adab ({santri.poinDisiplin}) milik <span className="text-white font-semibold">{santri.nama}</span> ke 12 jalur beasiswa nasional, filantropi BOTA, BAZNAS, hingga kerja sama kedinasan POLRI.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800 font-mono tabular-nums">
            <div>
              <div className="text-[11px] text-neutral-400">Layak Daftar</div>
              <div className="text-lg font-bold text-emerald-400">
                {totalEligibleCount} / {programs.length} Jalur
              </div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-400">Voucher Aktif</div>
              <div className="text-lg font-bold text-amber-400">
                Rp {(activeVoucherSum / 1000000).toFixed(1)} Jt
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-[11px] text-neutral-400">Status Pengajuan</div>
              <div className="text-lg font-bold text-white">
                {santriApplications.length} Ajuan
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Embedded User-Provided Scholarship Visual */}
        <div className="lg:col-span-5 relative bg-neutral-950 border-t lg:border-t-0 lg:border-l border-neutral-800 min-h-[220px] flex items-center justify-center overflow-hidden">
          {!posterError ? (
            <img
              src="/assets/aistudio/image_3291cabb.png"
              alt="Daftar 12 Peluang Beasiswa SantriCity - Kuliah Tenang dengan Dukungan Finansial yang Memadai"
              referrerPolicy="no-referrer"
              onError={() => setPosterError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center space-y-2">
              <GraduationCap className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">
                12 Jalur Peluang Beasiswa Resmi
              </div>
              <p className="text-xs text-neutral-400">
                KIP Kuliah, BOTA, Bank Indonesia, BIB, Tahfizh, PPA, BAZNAS, Pemprov, Pemda, dan POLRI.
              </p>
            </div>
          )}

          {!posterError && (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="Perbesar poster peluang beasiswa"
              className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-neutral-950/90 hover:bg-neutral-900 text-xs font-medium text-white border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lihat Panduan Resmi</span>
            </button>
          )}
        </div>
      </section>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Beasiswa Memenuhi Syarat</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {totalEligibleCount} Program
          </div>
          <div className="text-[11px] text-neutral-400">
            Dari total {programs.length} mitra & pemerintah
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Potensi Dukungan Voucher</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
            Rp {(totalPotentialVoucher / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[11px] text-neutral-400">
            Akumulasi keringanan UKT & riset layak
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Voucher Siap Pakai Santri</span>
            <Ticket className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {santriVouchers.filter((v) => v.status === 'Aktif Siap Pakai').length}{' '}
            Voucher
          </div>
          <div className="text-[11px] text-neutral-400">
            Senilai Rp {activeVoucherSum.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Profil Kelayakan Santri</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {santri.capaianJuz} Juz · {avgNilai}
          </div>
          <div className="text-[11px] text-neutral-400">
            Poin Disiplin {santri.poinDisiplin}/100
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('direktori')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'direktori'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Direktori 12 Beasiswa ({programs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('voucher')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'voucher'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Dompet Voucher Pendidikan ({santriVouchers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('pengajuan')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'pengajuan'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Riwayat Pengajuan ({santriApplications.length})
          </button>
        </div>

        {activeSubTab === 'direktori' && (
          <button
            type="button"
            onClick={() => setOnlyEligible(!onlyEligible)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              onlyEligible
                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-semibold'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            {onlyEligible ? 'Menampilkan Yang Layak Saja' : 'Filter: Layak Profil Santri'}
          </button>
        )}
      </div>

      {/* TAB 1: DIRECTORY OF 12 SCHOLARSHIPS */}
      {activeSubTab === 'direktori' && (
        <div className="space-y-4">
          {/* Category & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari KIP, BI, BIB, BAZNAS, POLRI..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 3-Column Scholarship Cards */}
          {filteredPrograms.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <p className="text-xs text-neutral-400">
                Tidak ada program beasiswa yang cocok dengan filter aktif.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Semua');
                  setSearchQuery('');
                  setOnlyEligible(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-white hover:bg-neutral-700 cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((prog) => (
                <article
                  key={prog.id}
                  className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Unboxed Metadata */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                      <span className="font-mono tabular-nums text-neutral-300">
                        {prog.kode} · {prog.kategori}
                      </span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          prog.isEligible ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {prog.isEligible
                          ? `Layak (${prog.matchPercent}%)`
                          : `Kesesuaian ${prog.matchPercent}%`}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {prog.nama}
                      </h4>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {prog.penyelenggara}
                      </div>
                    </div>

                    {/* Financial & Voucher Summary */}
                    <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
                      <div className="text-neutral-200 leading-relaxed">
                        {prog.dukunganFinansial}
                      </div>
                      <div className="text-[11px] text-amber-300 font-mono tabular-nums">
                        Voucher: Rp{' '}
                        {prog.voucherPendidikanNominal.toLocaleString('id-ID')} ·{' '}
                        {prog.voucherBenefit}
                      </div>
                    </div>

                    {/* Eligibility Criteria */}
                    {prog.checks.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-neutral-800/80 text-[11px]">
                        {prog.checks.map((chk, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 ${
                              chk.met ? 'text-emerald-400' : 'text-neutral-400'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{chk.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                      Kuota {prog.kuotaTersedia} · s/d {prog.batasPendaftaran}
                    </span>

                    {prog.existingApp ? (
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('pengajuan')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-cyan-300 hover:bg-neutral-700 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {prog.existingApp.status}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenApply(prog)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Ajukan Beasiswa
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EDUCATIONAL VOUCHER WALLET */}
      {activeSubTab === 'voucher' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {santriVouchers.length === 0 ? (
            <div className="col-span-full p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <Ticket className="w-6 h-6 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Belum ada voucher pendidikan aktif untuk santri ini. Ajukan beasiswa dari direktori untuk memperoleh dukungan voucher.
              </p>
            </div>
          ) : (
            santriVouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                    <span className="text-neutral-400">{voucher.kodeVoucher}</span>
                    <span
                      className={
                        voucher.status === 'Aktif Siap Pakai'
                          ? 'text-emerald-400 font-semibold'
                          : 'text-cyan-400 font-semibold'
                      }
                    >
                      {voucher.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">
                    {voucher.judul}
                  </h4>
                  <div className="text-xs text-neutral-400">
                    {voucher.programBeasiswa} · {voucher.kategoriVoucher}
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-xs text-neutral-400">Nilai Voucher</span>
                    <span className="text-lg font-bold text-amber-400">
                      Rp {voucher.nominalRupiah.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                    Berlaku s/d {voucher.berlakuHingga}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVoucherQr(voucher)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kode QR</span>
                    </button>

                    {voucher.status === 'Aktif Siap Pakai' && (
                      <button
                        type="button"
                        onClick={() => onClaimVoucher(voucher.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors cursor-pointer"
                      >
                        Klaim
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: SCHOLARSHIP APPLICATIONS TABLE */}
      {activeSubTab === 'pengajuan' && (
        <section className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/70 text-neutral-400 border-b border-neutral-800">
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Program Beasiswa</th>
                  <th className="py-3 px-4 font-semibold">Santri & Jalur</th>
                  <th className="py-3 px-4 font-semibold">Estimasi Voucher</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {(currentRole === 'admin' ||
                    currentRole === 'keuangan' ||
                    currentRole === 'ustaz') && (
                    <th className="py-3 px-4 font-semibold text-right">
                      Tindakan
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {santriApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      Belum ada pengajuan beasiswa tercatat.
                    </td>
                  </tr>
                ) : (
                  santriApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-neutral-300">
                        {app.tanggalDaftar}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {app.scholarshipNama}
                        </div>
                        <div className="text-[11px] text-neutral-400 line-clamp-1">
                          {app.catatanMotivasi}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-200 font-medium">
                          {app.santriNama}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {app.jalurPrestasi}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-amber-400 font-semibold">
                        Rp {app.estimasiVoucher.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            app.status === 'Disetujui / Aktif'
                              ? 'text-emerald-400'
                              : app.status === 'Seleksi Berkas'
                              ? 'text-cyan-400'
                              : app.status === 'Perlu Lengkapi Berkas'
                              ? 'text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      {(currentRole === 'admin' ||
                        currentRole === 'keuangan' ||
                        currentRole === 'ustaz') && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {app.status !== 'Disetujui / Aktif' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateApplicationStatus(
                                  app.id,
                                  'Disetujui / Aktif'
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold cursor-pointer"
                            >
                              Setujui
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal: Poster Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Panduan Resmi 12 Jalur Peluang Beasiswa SantriCity
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Tutup pratinjau poster"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src="/assets/aistudio/image_3291cabb.png"
              alt="Daftar Lengkap 12 Peluang Beasiswa"
              referrerPolicy="no-referrer"
              className="w-full rounded-xl object-contain max-h-[75vh]"
            />
          </div>
        </div>
      )}

      {/* Modal: Apply Scholarship */}
      {applyingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Pengajuan: {applyingProgram.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyingProgram(null)}
                aria-label="Tutup modal pengajuan"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-neutral-400">Calon Penerima</div>
                <div className="text-white font-semibold">
                  {santri.nama} ({santri.nis})
                </div>
                <div className="text-amber-400 font-mono tabular-nums">
                  Estimasi Dukungan Voucher: Rp{' '}
                  {applyingProgram.voucherPendidikanNominal.toLocaleString(
                    'id-ID'
                  )}
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Ringkasan Jalur Prestasi & Hafalan
                </label>
                <input
                  type="text"
                  value={jalurPrestasi}
                  onChange={(e) => setJalurPrestasi(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Rencana Studi & Motivasi Pengajuan
                </label>
                <textarea
                  rows={3}
                  value={catatanMotivasi}
                  onChange={(e) => setCatatanMotivasi(e.target.value)}
                  placeholder="Jelaskan rencana studi lanjut dan manfaat dukungan finansial bagi ketenangan belajar..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setApplyingProgram(null)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Kirim Pengajuan Beasiswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Voucher (Admin/Keuangan/Ustaz) */}
      {isIssueVoucherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                Terbitkan Voucher Pendidikan Santri
              </h3>
              <button
                type="button"
                onClick={() => setIsIssueVoucherOpen(false)}
                aria-label="Tutup modal voucher"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueNewVoucher} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Judul Voucher
                </label>
                <input
                  type="text"
                  value={newVoucherTitle}
                  onChange={(e) => setNewVoucherTitle(e.target.value)}
                  placeholder="Contoh: Voucher Pembebasan SPP Prestasi Tahfidz"
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Program Beasiswa Sumber
                </label>
                <select
                  value={newVoucherProgram}
                  onChange={(e) => setNewVoucherProgram(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.nama}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Kategori Voucher
                  </label>
                  <select
                    value={newVoucherCat}
                    onChange={(e) =>
                      setNewVoucherCat(
                        e.target.value as ScholarshipVoucher['kategoriVoucher']
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pembebasan SPP/UKT">Pembebasan SPP/UKT</option>
                    <option value="Voucher Riset & StartUp Center">
                      Riset & StartUp Center
                    </option>
                    <option value="Tunjangan Kitab & Literatur">
                      Kitab & Literatur
                    </option>
                    <option value="Subsidi Asrama & Konsumsi">
                      Subsidi Asrama
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={500000}
                    step={250000}
                    value={newVoucherNominal}
                    onChange={(e) =>
                      setNewVoucherNominal(Number(e.target.value))
                    }
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsIssueVoucherOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Voucher QR Pass */}
      {selectedVoucherQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Voucher Pendidikan Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucherQr(null)}
                aria-label="Tutup modal QR voucher"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {selectedVoucherQr.judul}
              </h4>
              <div className="text-base font-mono tabular-nums font-bold text-amber-400">
                Rp {selectedVoucherQr.nominalRupiah.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white inline-block mx-auto">
              <canvas ref={voucherCanvasRef} />
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-mono tabular-nums text-emerald-400 font-semibold">
                {selectedVoucherQr.kodeVoucher}
              </div>
              <div className="text-neutral-400">
                Tunjukkan kepada Bendahara SPP / Mitra Universitas
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVoucherQr(null)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
