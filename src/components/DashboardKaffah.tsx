import React from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  NilaiMataPelajaran,
  PresensiHarian,
  RekamMedis,
  TagihanKeuangan,
  IzinKeluarPondok,
  BroadcastTelegram,
  AIAnalisisKaffah,
  Language,
  UserRole,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  BookOpen,
  GraduationCap,
  HeartPulse,
  CreditCard,
  QrCode,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  MessageCircle,
  Target,
  Radio,
} from 'lucide-react';
import { AIDailyDigestSection } from './AIDailyDigestSection';
import { GrowthTimelineSection } from './GrowthTimelineSection';

interface DashboardKaffahProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  nilaiList: NilaiMataPelajaran[];
  presensiList: PresensiHarian[];
  kesehatanList: RekamMedis[];
  tagihanList: TagihanKeuangan[];
  izinList: IzinKeluarPondok[];
  broadcasts: BroadcastTelegram[];
  aiKaffah: AIAnalisisKaffah;
  lang: Language;
  currentRole: UserRole;
  onNavigateTab: (tab: string) => void;
  onOpenReportModal: () => void;
  onRunAiAnalysis: () => void;
  isAiAnalyzing: boolean;
  onOpenPushSimulator?: () => void;
}

export const DashboardKaffah: React.FC<DashboardKaffahProps> = ({
  santri,
  tahfidzList,
  nilaiList,
  presensiList,
  kesehatanList,
  tagihanList,
  izinList,
  broadcasts,
  aiKaffah,
  lang,
  currentRole,
  onNavigateTab,
  onOpenReportModal,
  onRunAiAnalysis,
  isAiAnalyzing,
  onOpenPushSimulator,
}) => {
  const t = getTranslation(lang);

  const unpaidTagihan = tagihanList.filter((item) => item.status === 'Belum Lunas');
  const totalUnpaid = unpaidTagihan.reduce((acc, curr) => acc + curr.totalNominal, 0);

  const todayPresensi = presensiList[0] || {
    subuh: 'Hadir',
    dhuha: 'Hadir',
    sekolahPagi: 'Hadir',
    ashar: 'Hadir',
    halaqahSore: 'Hadir',
    maghribIsya: 'Hadir',
    belajarMalam: 'Hadir',
    keterangan: 'Tertib penuh',
  };

  const latestHealth = kesehatanList[0];
  const latestTahfidz = tahfidzList[0];
  const activePermit = izinList.find((i) => i.status === 'Disetujui Pengasuh' || i.status === 'Sedang Keluar');

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/santri_hero_academy_1790644557112.jpg"
            alt="SantriCity Academy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={santri.fotoUrl}
                alt={santri.nama}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-neutral-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-neutral-950">
                {santri.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {santri.nama}
                </h1>
                {santri.namaArab && (
                  <span className="font-arabic text-emerald-400 text-base font-semibold px-2">
                    {santri.namaArab}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                <span>NIS: <strong className="text-neutral-200 font-mono">{santri.nis}</strong></span>
                <span>·</span>
                <span>{santri.kelas}</span>
                <span>·</span>
                <span>{santri.kamar}</span>
              </div>

              <p className="text-xs text-neutral-400">
                Wali: <strong className="text-neutral-300">{santri.waliNama}</strong> ({santri.waliHubungan})
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenReportModal}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700/80 transition-colors flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t.exportPDF}</span>
            </button>

            <button
              onClick={onRunAiAnalysis}
              disabled={isAiAnalyzing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/50 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAiAnalyzing ? 'Menganalisis...' : 'Analisis AI Kaffah'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Broadcast Notice Bar */}
      {broadcasts.length > 0 && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/60 border border-cyan-700/60 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-cyan-300 font-mono">
                  {broadcasts[0].channel}
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400 text-[11px]">{broadcasts[0].tanggal}</span>
              </div>
              <p className="text-xs text-neutral-300 font-medium line-clamp-1">
                {broadcasts[0].judul}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('chat')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 shrink-0"
          >
            <span>Buka Saluran</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Primary High-Value Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Tahfidz Al-Qur'an */}
        <div
          onClick={() => onNavigateTab('tahfidz')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-600/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Hafalan Al-Qur'an</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-white">
              {santri.capaianJuz}
            </span>
            <span className="text-xs text-neutral-400">/ {santri.targetJuz} Juz</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(santri.capaianJuz / santri.targetJuz) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Surah Terakhir: {latestTahfidz ? latestTahfidz.surah : 'Al-Baqarah'}</span>
              <span className="text-emerald-400 font-medium">
                {Math.round((santri.capaianJuz / santri.targetJuz) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Rata-Rata Akademik */}
        <div
          onClick={() => onNavigateTab('akademik')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-600/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Prestasi Akademik</span>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-white">
              {nilaiList.length
                ? (
                    nilaiList.reduce((acc, c) => acc + c.akhir, 0) / nilaiList.length
                  ).toFixed(1)
                : '92.4'}
            </span>
            <span className="text-xs text-blue-400 font-semibold">Predikat A</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {nilaiList.length} Mata Pelajaran (Nahwu, Sharaf, Fiqih & Sains)
          </p>
        </div>

        {/* Card 3: Adab & Disiplin */}
        <div
          onClick={() => onNavigateTab('presensi')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-600/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Poin Kedisiplinan & Adab</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-emerald-400">
              {santri.poinDisiplin}
            </span>
            <span className="text-xs text-neutral-400">/ 100 Poin</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Juara 1 MQK Wilayah & Aktif Ubudiyah
          </p>
        </div>

        {/* Card 4: Status Keuangan & SPP */}
        <div
          onClick={() => onNavigateTab('keuangan')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-600/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Status SPP Digital</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-bold font-mono-numbers ${
                totalUnpaid > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {totalUnpaid > 0 ? `Rp ${totalUnpaid.toLocaleString('id-ID')}` : 'Lunas Bersih'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>
              {totalUnpaid > 0 ? 'Tagihan Bulan Oktober' : 'Tidak ada tunggakan'}
            </span>
            <span className="text-amber-400 underline font-medium">Kelola</span>
          </div>
        </div>
      </div>

      {/* AI Daily Digest (Prayer Punctuality, Health Status, & Recent Academic Progress) */}
      <AIDailyDigestSection
        santri={santri}
        presensiList={presensiList}
        kesehatanList={kesehatanList}
        nilaiList={nilaiList}
        tahfidzList={tahfidzList}
        currentRole={currentRole}
        onNavigateTab={onNavigateTab}
      />

      {/* Academic Goals Quick Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white">
                Target & Sasaran Belajar Santri (Academic Goals)
              </h4>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI Milestone Tracker
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 mt-0.5 max-w-2xl">
              Pantau progres target jangka panjang: Khatam 30 Juz Bersanad, Matan Alfiyah 1.002 Bait, dan Beasiswa Al-Azhar Kairo dengan evaluasi laju AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          {onOpenPushSimulator && (
            <button
              onClick={onOpenPushSimulator}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
              title="Buka Push Notification Simulator"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Uji Push Notif</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('target-akademik')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Buka Modul Goals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Growth Timeline: Academic & Tahfidz Milestones Over Tenure */}
      <GrowthTimelineSection
        santri={santri}
        currentRole={currentRole}
        onNavigateTab={onNavigateTab}
        onOpenPushSimulator={onOpenPushSimulator}
      />

      {/* Grid: AI Kaffah 360 Radar & Daily Prayer Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Kaffah Analysis Overview (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Analitik AI Kaffah (Perkembangan Menyeluruh)
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Pembaruan: {aiKaffah.terakhirDiperbarui}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-mono-numbers text-emerald-400">
                {aiKaffah.skorHolistik}
              </span>
              <span className="text-xs text-neutral-500 font-medium">/100</span>
            </div>
          </div>

          {/* 5 Pillars Bar Visualizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">Tahfidz & Tajwid</span>
                <span className="font-mono text-emerald-400 font-semibold">{aiKaffah.pilar.tahfidzAlQuran}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.tahfidzAlQuran}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">Akademik Kitab & Sains</span>
                <span className="font-mono text-blue-400 font-semibold">{aiKaffah.pilar.prestasiAkademik}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.prestasiAkademik}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">Adab & Kedisiplinan</span>
                <span className="font-mono text-emerald-400 font-semibold">{aiKaffah.pilar.adabKedisiplinan}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.adabKedisiplinan}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">Kesehatan Fisik</span>
                <span className="font-mono text-teal-400 font-semibold">{aiKaffah.pilar.kesehatanFisik}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.kesehatanFisik}%` }} />
              </div>
            </div>
          </div>

          {/* Narrative Summary & Actionable Recommendation */}
          <div className="space-y-3 pt-1">
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80">
              {aiKaffah.ringkasanKaffah}
            </p>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rekomendasi Khusus Wali Santri:</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                {aiKaffah.rekomendasiWali}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => onNavigateTab('ai')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>Lihat Detail Laporan Analitik AI</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Daily Sholat & Halaqah Presensi Matrix (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Absensi Ibadah & Kegiatan Hari Ini
                </h3>
                <span className="text-[11px] text-neutral-400">
                  {todayPresensi.tanggal || '28 September 2026'}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('presensi')}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Riwayat
            </button>
          </div>

          {/* Prayer Attendance List */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Sholat Subuh Berjamaah</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.subuh}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Sholat Dhuha & Dzikir Pagi</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.dhuha}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Sekolah Formal (Madrasah)</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.sekolahPagi}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Sholat Ashar & Halaqah Sore</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.ashar}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Maghrib - Isya & Tahfidz Malam</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.maghribIsya}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-neutral-800">
              <span className="text-neutral-300 font-medium">Belajar Mandiri / Jam Malam</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {todayPresensi.belajarMalam}
              </span>
            </div>
          </div>

          {/* Quick Notice: Poskestren / Active Exit Permit */}
          {activePermit && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Izin Keluar Aktif: {activePermit.kodeIzin}</span>
                </span>
                <span className="font-mono text-[10px]">{activePermit.status}</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                {activePermit.keperluan} · Penjemput: {activePermit.penjemput}
              </p>
            </div>
          )}

          {latestHealth && (
            <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-neutral-200 font-medium">Kondisi Medis Poskestren: </span>
                  <span className="text-neutral-400">{latestHealth.kondisiTerkini} ({latestHealth.diagnosa})</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('poskestren')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                RME
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
