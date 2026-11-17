import React, { useState, useRef } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  Search,
  Award,
  Sparkles,
  Volume2,
  Mic,
  Play,
  Pause,
  UserCheck,
  Clock,
  ShieldCheck,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';
import { TahfidzProfileBadgeCard } from './TahfidzProfileBadgeCard';
import { TahfidzAudioRecorderModal } from './TahfidzAudioRecorderModal';
import { TahfidzUstazVerificationModal } from './TahfidzUstazVerificationModal';
import { AITahfidzPlannerPanel } from './AITahfidzPlannerPanel';
import { TahfidzJuzProgressChart } from './TahfidzJuzProgressChart';

interface TahfidzModuleProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  onAddEntry: (entry: Omit<TahfidzEntry, 'id'>) => void;
  onUpdateEntry?: (entry: TahfidzEntry) => void;
  currentRole: UserRole;
  lang: Language;
}

export const TahfidzModule: React.FC<TahfidzModuleProps> = ({
  santri,
  tahfidzList,
  onAddEntry,
  onUpdateEntry,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [activeSubTab, setActiveSubTab] = useState<'mutabaah' | 'ai-planner'>('mutabaah');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [verifyingEntry, setVerifyingEntry] = useState<TahfidzEntry | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Form State
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [waktu, setWaktu] = useState<'Subuh' | 'Ashar' | 'Maghrib' | 'Malam'>('Subuh');
  const [tipe, setTipe] = useState<'Ziyadah' | 'Murajaah' | 'Tasmi\''>('Ziyadah');
  const [surah, setSurah] = useState<string>('Maryam');
  const [ayatMulai, setAyatMulai] = useState<number>(1);
  const [ayatSelesai, setAyatSelesai] = useState<number>(25);
  const [juz, setJuz] = useState<number>(16);
  const [kelancaran, setKelancaran] = useState<'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul' | 'Sedang Ditinjau'>('Mumtaz');
  const [tajwid, setTajwid] = useState<number>(95);
  const [catatanMusyrif, setCatatanMusyrif] = useState<string>('');
  const [musyrifNama, setMusyrifNama] = useState<string>('Ust. Ahmad Fauzan, Al-Hafidz');

  const pendingVerificationCount = tahfidzList.filter(
    (t) => t.statusVerifikasi === 'Menunggu Verifikasi Ustaz'
  ).length;

  const audioCount = tahfidzList.filter((t) => !!t.audioUrl).length;

  const filteredEntries = tahfidzList.filter((item) => {
    let matchType = true;
    if (filterType === 'all') matchType = true;
    else if (filterType === 'audio') matchType = !!item.audioUrl;
    else if (filterType === 'pending') matchType = item.statusVerifikasi === 'Menunggu Verifikasi Ustaz';
    else matchType = item.tipe === filterType;

    const matchSearch =
      item.surah.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.musyrifNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.catatanMusyrif.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.catatanSantri && item.catatanSantri.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  const handleToggleInlineAudio = (item: TahfidzEntry) => {
    if (!item.audioUrl) return;

    if (playingAudioId === item.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const audio = new Audio(item.audioUrl);
      activeAudioRef.current = audio;
      setPlayingAudioId(item.id);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
    }
  };

  const handleSaveVerification = (updatedEntry: TahfidzEntry) => {
    if (onUpdateEntry) {
      onUpdateEntry(updatedEntry);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEntry({
      santriId: santri.id,
      tanggal,
      waktu,
      tipe,
      surah,
      surahNomor: 19,
      ayatMulai: Number(ayatMulai),
      ayatSelesai: Number(ayatSelesai),
      juz: Number(juz),
      kelancaran,
      tajwid: Number(tajwid),
      catatanMusyrif: catatanMusyrif || 'Alhamdulillah setoran lancar dan tertib.',
      musyrifNama,
    });
    setIsModalOpen(false);
    setCatatanMusyrif('');
  };

  const handleExport = () => {
    const rows = filteredEntries.map((e) => ({
      Tanggal: e.tanggal,
      Waktu: e.waktu,
      Tipe: e.tipe,
      Surah: e.surah,
      Juz: e.juz,
      Ayat: `${e.ayatMulai} - ${e.ayatSelesai}`,
      Kelancaran: e.kelancaran,
      SkorTajwid: e.tajwid,
      Musyrif: e.musyrifNama,
      Catatan: e.catatanMusyrif,
    }));
    exportToCsv(`mutabaah_tahfidz_${santri.nis}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tahfidz & Mutaba'ah Al-Qur'an
            </h2>
            <span className="font-arabic text-emerald-400 text-lg font-bold">
              حفظ القرآن الكريم
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Pencatatan ziyadah, murajaah, tasmi' harian bersanad dengan standarisasi tajwid kaffah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab(activeSubTab === 'ai-planner' ? 'mutabaah' : 'ai-planner')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              activeSubTab === 'ai-planner'
                ? 'bg-neutral-800 text-emerald-300 border-neutral-700'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
            }`}
            title="Buka AI Tahfidz Planner Target Harian"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeSubTab === 'ai-planner' ? 'Ke Riwayat Setoran' : 'AI Tahfidz Planner'}</span>
          </button>

          {pendingVerificationCount > 0 && (
            <button
              onClick={() => setFilterType('pending')}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors shadow-xs"
              title="Lihat rekaman santri yang menunggu verifikasi Ustaz"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>{pendingVerificationCount} Perlu Verifikasi</span>
            </button>
          )}

          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 transform hover:scale-102 active:scale-98"
            title="Rekam audio setoran hafalan menggunakan mikrofon browser untuk verifikasi Ustaz"
          >
            <Mic className="w-4 h-4 text-neutral-950 animate-pulse" />
            <span>Rekam Setoran Suara</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {(currentRole === 'ustaz' || currentRole === 'admin') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Input Setoran Tatap Muka</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Switcher: Mutaba'ah vs AI Planner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('mutabaah')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'mutabaah'
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mutaba'ah & Riwayat Setoran</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-950 text-neutral-400 font-mono">
              {tahfidzList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('ai-planner')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'ai-planner'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Tahfidz Planner</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Target Harian
            </span>
          </button>
        </div>

        {activeSubTab === 'mutabaah' && (
          <div className="flex items-center gap-2 px-3 text-xs text-neutral-400">
            <span className="text-neutral-500">Target Semester:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              Juz {santri.targetJuz}
            </span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-500">Sisa:</span>
            <span className="font-semibold text-amber-400 font-mono">
              {Math.max(0, santri.targetJuz - santri.capaianJuz)} Juz
            </span>
          </div>
        )}
      </div>

      {activeSubTab === 'ai-planner' ? (
        <AITahfidzPlannerPanel
          santri={santri}
          tahfidzList={tahfidzList}
          onOpenAudioRecorder={() => setIsAudioModalOpen(true)}
        />
      ) : (
        <>
          {/* Quick AI Planner Teaser Banner in Mutaba'ah view */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    Rekomendasi Target Harian AI Santri
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                    Sisa {Math.max(0, santri.targetJuz - santri.capaianJuz)} Juz
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Untuk mengkhatamkan target Juz {santri.targetJuz} di semester ini, target ideal santri adalah ~{Math.max(1, Math.round(((santri.targetJuz - santri.capaianJuz) * 20) / 56))} halaman/hari dengan 3 ritme halaqah harian.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('ai-planner')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Buka AI Planner</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Santri Tahfidz Profile Card with Virtual Achievement Badges */}
          <TahfidzProfileBadgeCard santri={santri} tahfidzList={tahfidzList} />

      {/* Progress & Target Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Capaian Hafalan</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-white">
              {santri.capaianJuz}
            </span>
            <span className="text-xs text-neutral-400">/ {santri.targetJuz} Juz Selesai</span>
          </div>
          <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(santri.capaianJuz / santri.targetJuz) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Rata-Rata Nilai Tajwid</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-amber-400">
              {tahfidzList.length
                ? Math.round(tahfidzList.reduce((acc, c) => acc + c.tajwid, 0) / tahfidzList.length)
                : 95}
            </span>
            <span className="text-xs text-neutral-400">/ 100 (Mumtaz)</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Makhraj, Sifat Huruf, Mad, dan Ghunnah Sangat Baik
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Ritme Mutaba'ah Harian</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-cyan-400">
              2x Sehari
            </span>
            <span className="text-xs text-neutral-400">Subuh & Ashar</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Halaqah Musyrif: Ust. Ahmad Fauzan, Al-Hafidz
          </p>
        </div>
      </div>

      {/* D3.js Progress Bar Chart: Capaian Juz vs Target Semester */}
      <TahfidzJuzProgressChart santri={santri} tahfidzList={tahfidzList} />

      {/* 30 Juz Visual Grid Matrix */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-300">
            Matriks Status 30 Juz Al-Qur'an
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Mutqin
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 inline-block" /> Ziyadah
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-800 inline-block" /> Belum
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-15 gap-1.5 text-center font-mono text-xs">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
            const isCompleted = juzNum <= Math.floor(santri.capaianJuz);
            const isCurrent = juzNum === Math.ceil(santri.capaianJuz) && santri.capaianJuz % 1 !== 0;

            return (
              <div
                key={juzNum}
                title={`Juz ${juzNum} - ${isCompleted ? 'Mutqin' : isCurrent ? 'Sedang Berjalan' : 'Belum'}`}
                className={`p-2 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 font-bold'
                    : isCurrent
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold animate-pulse'
                    : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-600'
                }`}
              >
                {juzNum}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType('Ziyadah')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterType === 'Ziyadah'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ziyadah (Baru)
          </button>
          <button
            onClick={() => setFilterType('Murajaah')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterType === 'Murajaah'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Murajaah (Ulang)
          </button>
          <button
            onClick={() => setFilterType('Tasmi\'')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterType === 'Tasmi\''
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tasmi' (Ujian)
          </button>
          <button
            onClick={() => setFilterType('audio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'audio'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rekaman Audio ({audioCount})</span>
          </button>
          {pendingVerificationCount > 0 && (
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'pending'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Perlu Verifikasi ({pendingVerificationCount})</span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari surah, musyrif, catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table of Entries */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px]">
              <tr>
                <th className="py-3 px-4 font-medium">Tanggal / Waktu</th>
                <th className="py-3 px-4 font-medium">Tipe</th>
                <th className="py-3 px-4 font-medium">Surah & Ayat</th>
                <th className="py-3 px-4 font-medium">Juz</th>
                <th className="py-3 px-4 font-medium">Kelancaran</th>
                <th className="py-3 px-4 font-medium text-right">Skor Tajwid</th>
                <th className="py-3 px-4 font-medium">Rekaman Suara & Verifikasi</th>
                <th className="py-3 px-4 font-medium">Musyrif & Bimbingan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredEntries.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                    <div>{item.tanggal}</div>
                    <div className="text-[11px] text-neutral-500">{item.waktu}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-medium text-emerald-400">
                      {item.tipe}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-white">
                    <div>Q.S. {item.surah}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      Ayat {item.ayatMulai} - {item.ayatSelesai}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                    Juz {item.juz}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        item.kelancaran === 'Sedang Ditinjau'
                          ? 'text-amber-400 italic'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.kelancaran}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono-numbers text-right font-bold text-amber-400">
                    {item.tajwid > 0 ? item.tajwid : <span className="text-neutral-500">-</span>}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.audioUrl ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleInlineAudio(item)}
                            className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] font-mono font-semibold transition-colors ${
                              playingAudioId === item.id
                                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm'
                                : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                            }`}
                            title="Putar rekaman suara setoran"
                          >
                            {playingAudioId === item.id ? (
                              <Pause className="w-3 h-3 text-neutral-950" />
                            ) : (
                              <Play className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>{item.audioDurationSeconds ? `${item.audioDurationSeconds}s` : 'Audio'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVerifyingEntry(item)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/40 transition-colors flex items-center gap-1"
                            title={
                              currentRole === 'ustaz' || currentRole === 'admin'
                                ? 'Buka Panel Penilaian & Koreksi Ustaz'
                                : 'Dengar Rekaman & Tinjau Evaluasi'
                            }
                          >
                            <UserCheck className="w-3 h-3 text-cyan-400" />
                            <span>
                              {currentRole === 'ustaz' || currentRole === 'admin' ? 'Verifikasi' : 'Review'}
                            </span>
                          </button>
                        </div>

                        {item.statusVerifikasi && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold self-start border ${
                              item.statusVerifikasi === 'Menunggu Verifikasi Ustaz'
                                ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse'
                                : item.statusVerifikasi === 'Perlu Perbaikan (Remedial)'
                                ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                            }`}
                          >
                            {item.statusVerifikasi}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-500 italic">
                        Tatap Muka
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-neutral-300 font-medium">{item.musyrifNama}</div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">
                      {item.catatanMusyrif}
                    </p>
                    {item.catatanSantri && (
                      <p className="text-[10px] text-emerald-400/90 italic mt-0.5 line-clamp-1">
                        Santri: "{item.catatanSantri}"
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal: Input Setoran Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Input Setoran Hafalan Santri</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Waktu Sesi</label>
                  <select
                    value={waktu}
                    onChange={(e) => setWaktu(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Subuh">Subuh</option>
                    <option value="Ashar">Ashar</option>
                    <option value="Maghrib">Maghrib</option>
                    <option value="Malam">Malam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tipe Mutaba'ah</label>
                  <select
                    value={tipe}
                    onChange={(e) => setTipe(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Ziyadah">Ziyadah (Hafalan Baru)</option>
                    <option value="Murajaah">Murajaah (Pengulangan)</option>
                    <option value="Tasmi'">Tasmi' (Ujian Simak)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Juz</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={juz}
                    onChange={(e) => setJuz(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-neutral-400 block mb-1">Nama Surah</label>
                  <input
                    type="text"
                    value={surah}
                    onChange={(e) => setSurah(e.target.value)}
                    placeholder="Contoh: Maryam"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Ayat Mulai</label>
                  <input
                    type="number"
                    value={ayatMulai}
                    onChange={(e) => setAyatMulai(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Ayat Selesai</label>
                  <input
                    type="number"
                    value={ayatSelesai}
                    onChange={(e) => setAyatSelesai(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Kelancaran</label>
                  <select
                    value={kelancaran}
                    onChange={(e) => setKelancaran(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mumtaz">Mumtaz (Sempurna)</option>
                    <option value="Jayyid Jiddan">Jayyid Jiddan (Sangat Baik)</option>
                    <option value="Jayyid">Jayyid (Baik)</option>
                    <option value="Maqbul">Maqbul (Cukup)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Skor Tajwid (0-100)</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={tajwid}
                    onChange={(e) => setTajwid(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Nama Musyrif Penyimak</label>
                <input
                  type="text"
                  value={musyrifNama}
                  onChange={(e) => setMusyrifNama(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Catatan Koreksi & Rekomendasi</label>
                <textarea
                  rows={2}
                  value={catatanMusyrif}
                  onChange={(e) => setCatatanMusyrif(e.target.value)}
                  placeholder="Catatan makharijul huruf, waqaf ibtida'..."
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rekam Setoran Audio via Mikrofon Browser */}
      <TahfidzAudioRecorderModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        santri={santri}
        onSubmitRecording={(newEntry) => {
          onAddEntry(newEntry);
        }}
      />

      {/* Modal: Verifikasi Rekaman Suara oleh Ustaz / Review */}
      {verifyingEntry && (
        <TahfidzUstazVerificationModal
          isOpen={!!verifyingEntry}
          onClose={() => setVerifyingEntry(null)}
          entry={verifyingEntry}
          santri={santri}
          currentRole={currentRole}
          onSaveVerification={handleSaveVerification}
        />
      )}
    </div>
  );
};
