import React, { useMemo, useState } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
} from '../types/pesantren';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  BookOpen,
  TrendingUp,
  Search,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';

interface GlobalTahfidzLeaderboardProps {
  santri: SantriProfile;
  allSantriList?: SantriProfile[];
  allTahfidzList?: TahfidzEntry[];
  onNavigateTab: (tab: string) => void;
  onSelectSantri?: (santri: SantriProfile) => void;
}

type LeaderboardSortMode = 'juz' | 'targetPercent' | 'tajwid';
type AsramaFilter = 'Semua' | 'Putra' | 'Putri';

interface LeaderboardEntry {
  id: string;
  nama: string;
  namaArab?: string;
  nis: string;
  kelas: string;
  asrama: string;
  genderGroup: 'Putra' | 'Putri';
  halaqah: string;
  capaianJuz: number;
  targetJuz: number;
  targetPercent: number;
  ziyadahSetoranCount: number;
  avgTajwid: number;
  lastSurah: string;
  lastJuz: number;
  weeklyDeltaJuz: number;
  streakDays: number;
  isRegistered: boolean;
  sourceProfile?: SantriProfile;
}

const GLOBAL_COHORT_PEERS: Omit<
  LeaderboardEntry,
  'targetPercent' | 'isRegistered' | 'sourceProfile'
>[] = [
  {
    id: 'peer-001',
    nama: 'Zaidan Al-Farizi',
    namaArab: 'زيدان الفارزي',
    nis: '2023.10.0108',
    kelas: '12 Madrasah Aliyah - Agama',
    asrama: 'Asrama Putra Al-Furqan',
    genderGroup: 'Putra',
    halaqah: 'Halaqah Tahfidz Mutqin A',
    capaianJuz: 27.5,
    targetJuz: 30,
    ziyadahSetoranCount: 48,
    avgTajwid: 97,
    lastSurah: 'Al-Ahqaf',
    lastJuz: 26,
    weeklyDeltaJuz: 0.8,
    streakDays: 34,
  },
  {
    id: 'peer-002',
    nama: 'Khadijah Azzahra Putri',
    namaArab: 'خديجة الزهراء',
    nis: '2023.10.0142',
    kelas: '12 Madrasah Aliyah - IPA Tahfidz',
    asrama: 'Asrama Putri Khadijah',
    genderGroup: 'Putri',
    halaqah: 'Halaqah Tahfidz Mutqin B',
    capaianJuz: 25.2,
    targetJuz: 30,
    ziyadahSetoranCount: 44,
    avgTajwid: 96,
    lastSurah: 'Az-Zumar',
    lastJuz: 24,
    weeklyDeltaJuz: 0.7,
    streakDays: 29,
  },
  {
    id: 'peer-003',
    nama: 'Luqman Hakim Al-Mubarok',
    namaArab: 'لقمان حكيم المبارك',
    nis: '2024.10.0205',
    kelas: '11 Madrasah Aliyah - IPA Tahfidz',
    asrama: 'Asrama Putra Al-Furqan',
    genderGroup: 'Putra',
    halaqah: 'Halaqah Tahfidz Sanad 1',
    capaianJuz: 21.4,
    targetJuz: 30,
    ziyadahSetoranCount: 39,
    avgTajwid: 94,
    lastSurah: 'Al-Qasas',
    lastJuz: 20,
    weeklyDeltaJuz: 0.6,
    streakDays: 21,
  },
  {
    id: 'peer-004',
    nama: 'Nafisa Rahmawati',
    namaArab: 'نفيسة رحمواتي',
    nis: '2024.10.0249',
    kelas: '11 Madrasah Aliyah - Keagamaan',
    asrama: 'Asrama Putri Khadijah',
    genderGroup: 'Putri',
    halaqah: 'Halaqah Tahfidz Sanad 2',
    capaianJuz: 19.6,
    targetJuz: 30,
    ziyadahSetoranCount: 36,
    avgTajwid: 95,
    lastSurah: 'Al-Furqan',
    lastJuz: 19,
    weeklyDeltaJuz: 0.6,
    streakDays: 19,
  },
  {
    id: 'peer-005',
    nama: 'Ibrahim Khalilullah',
    namaArab: 'إبراهيم خليل الله',
    nis: '2024.10.0331',
    kelas: '11 Madrasah Aliyah - IPS',
    asrama: 'Asrama Putra Al-Furqan',
    genderGroup: 'Putra',
    halaqah: 'Halaqah Reguler Fajar',
    capaianJuz: 15.8,
    targetJuz: 20,
    ziyadahSetoranCount: 31,
    avgTajwid: 91,
    lastSurah: 'An-Nahl',
    lastJuz: 14,
    weeklyDeltaJuz: 0.4,
    streakDays: 14,
  },
  {
    id: 'peer-006',
    nama: 'Salma Salsabila',
    namaArab: 'سلمى سلسبيل',
    nis: '2025.10.0410',
    kelas: '10 Madrasah Aliyah - IPA Tahfidz',
    asrama: 'Asrama Putri Khadijah',
    genderGroup: 'Putri',
    halaqah: 'Halaqah Akselerasi 10',
    capaianJuz: 13.4,
    targetJuz: 20,
    ziyadahSetoranCount: 28,
    avgTajwid: 93,
    lastSurah: 'Yusuf',
    lastJuz: 13,
    weeklyDeltaJuz: 0.5,
    streakDays: 16,
  },
  {
    id: 'peer-007',
    nama: 'Yusuf Manshur Al-Ghifari',
    namaArab: 'يوسف منصور الغفاري',
    nis: '2025.10.0452',
    kelas: '10 Madrasah Aliyah - Reguler',
    asrama: 'Asrama Putra Al-Furqan',
    genderGroup: 'Putra',
    halaqah: 'Halaqah Reguler Maghrib',
    capaianJuz: 9.2,
    targetJuz: 15,
    ziyadahSetoranCount: 22,
    avgTajwid: 89,
    lastSurah: 'Al-Anfal',
    lastJuz: 9,
    weeklyDeltaJuz: 0.3,
    streakDays: 11,
  },
];

export const GlobalTahfidzLeaderboard: React.FC<GlobalTahfidzLeaderboardProps> = ({
  santri,
  allSantriList,
  allTahfidzList = [],
  onNavigateTab,
  onSelectSantri,
}) => {
  const [sortMode, setSortMode] = useState<LeaderboardSortMode>('juz');
  const [asramaFilter, setAsramaFilter] = useState<AsramaFilter>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllRows, setShowAllRows] = useState<boolean>(false);

  const combinedEntries = useMemo<LeaderboardEntry[]>(() => {
    const registeredList =
      allSantriList && allSantriList.length > 0 ? allSantriList : [santri];

    const registeredIds = new Set(registeredList.map((s) => s.id));

    const registeredEntries: LeaderboardEntry[] = registeredList.map((profile) => {
      const santriLogs = allTahfidzList.filter((t) => t.santriId === profile.id);
      const ziyadahLogs = santriLogs.filter((t) => t.tipe === 'Ziyadah');
      const scoredLogs = santriLogs.filter((t) => t.tajwid > 0);
      const avgTajwid = scoredLogs.length
        ? Math.round(
            scoredLogs.reduce((acc, cur) => acc + cur.tajwid, 0) /
              scoredLogs.length
          )
        : 93;

      const latestZiyadah = ziyadahLogs[0] || santriLogs[0];
      const safeTarget = Math.max(1, profile.targetJuz);
      const targetPercent = Math.min(
        100,
        Math.round((profile.capaianJuz / safeTarget) * 100)
      );
      const isPutri =
        profile.asrama.toLowerCase().includes('putri') ||
        profile.nama.toLowerCase().includes('aisyah');

      return {
        id: profile.id,
        nama: profile.nama,
        namaArab: profile.namaArab,
        nis: profile.nis,
        kelas: profile.kelas,
        asrama: profile.asrama,
        genderGroup: isPutri ? 'Putri' : 'Putra',
        halaqah: latestZiyadah?.musyrifNama || 'Halaqah Utama Pesantren',
        capaianJuz: profile.capaianJuz,
        targetJuz: profile.targetJuz,
        targetPercent,
        ziyadahSetoranCount: Math.max(ziyadahLogs.length, Math.round(profile.capaianJuz * 1.8)),
        avgTajwid,
        lastSurah: latestZiyadah?.surah || 'Maryam',
        lastJuz: latestZiyadah?.juz || Math.max(1, Math.floor(profile.capaianJuz)),
        weeklyDeltaJuz: Number((0.4 + Math.min(0.6, ziyadahLogs.length * 0.1)).toFixed(1)),
        streakDays: 12 + ziyadahLogs.length * 3,
        isRegistered: true,
        sourceProfile: profile,
      };
    });

    const peerEntries: LeaderboardEntry[] = GLOBAL_COHORT_PEERS.filter(
      (peer) => !registeredIds.has(peer.id)
    ).map((peer) => ({
      ...peer,
      targetPercent: Math.min(
        100,
        Math.round((peer.capaianJuz / Math.max(1, peer.targetJuz)) * 100)
      ),
      isRegistered: false,
    }));

    return [...registeredEntries, ...peerEntries];
  }, [santri, allSantriList, allTahfidzList]);

  const sortEntries = (entries: LeaderboardEntry[], mode: LeaderboardSortMode) => {
    return [...entries].sort((a, b) => {
      if (mode === 'targetPercent') {
        if (b.targetPercent !== a.targetPercent) return b.targetPercent - a.targetPercent;
        return b.capaianJuz - a.capaianJuz;
      }
      if (mode === 'tajwid') {
        if (b.avgTajwid !== a.avgTajwid) return b.avgTajwid - a.avgTajwid;
        return b.ziyadahSetoranCount - a.ziyadahSetoranCount;
      }
      if (b.capaianJuz !== a.capaianJuz) return b.capaianJuz - a.capaianJuz;
      return b.avgTajwid - a.avgTajwid;
    });
  };

  // Global Ziyadah ranking (unfiltered) for active santri standing banner
  const globalRanked = useMemo(
    () => sortEntries(combinedEntries, sortMode),
    [combinedEntries, sortMode]
  );

  const activeRankIndex = globalRanked.findIndex((item) => item.id === santri.id);
  const activeEntry = activeRankIndex >= 0 ? globalRanked[activeRankIndex] : null;
  const rankAbove = activeRankIndex > 0 ? globalRanked[activeRankIndex - 1] : null;

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = globalRanked.filter((entry) => {
      const matchesAsrama =
        asramaFilter === 'Semua' || entry.genderGroup === asramaFilter;
      const matchesSearch =
        !query ||
        entry.nama.toLowerCase().includes(query) ||
        entry.kelas.toLowerCase().includes(query) ||
        entry.lastSurah.toLowerCase().includes(query) ||
        entry.asrama.toLowerCase().includes(query);
      return matchesAsrama && matchesSearch;
    });
    return filtered;
  }, [globalRanked, asramaFilter, searchQuery]);

  const topThree = filteredAndSorted.slice(0, 3);
  const visibleRows = showAllRows
    ? filteredAndSorted
    : filteredAndSorted.slice(0, 6);

  const gapToRankAbove =
    activeEntry && rankAbove
      ? Number(Math.max(0.1, rankAbove.capaianJuz - activeEntry.capaianJuz).toFixed(1))
      : 0;

  return (
    <section
      aria-label="Global Tahfidz Leaderboard"
      className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Global Tahfidz Leaderboard
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Peringkat Ziyadah Lintas Asrama
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Klasemen progres hafalan Ziyadah santri untuk menumbuhkan kompetisi akademik yang sehat, sportif, dan mutqin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('tahfidz')}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-colors flex items-center gap-1.5 self-start lg:self-auto shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Setor Ziyadah</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Santri Standing Strip */}
      {activeEntry && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-neutral-950/80 to-neutral-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] text-emerald-300 uppercase font-semibold leading-none">
                Rank
              </span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400 leading-tight">
                #{activeRankIndex + 1}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white flex items-center gap-2 flex-wrap">
                <span>{activeEntry.nama}</span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {activeEntry.capaianJuz} / {activeEntry.targetJuz} Juz ({activeEntry.targetPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {rankAbove ? (
                  <>
                    Peringkat <strong className="text-neutral-200">#{activeRankIndex + 1}</strong> dari {globalRanked.length} santri · Terpaut{' '}
                    <strong className="text-amber-300">{gapToRankAbove} Juz</strong> dari{' '}
                    <span className="text-neutral-200">{rankAbove.nama}</span> (#{activeRankIndex}).
                  </>
                ) : (
                  <>
                    Memimpin klasemen puncak dari {globalRanked.length} santri · Pertahankan istiqamah murojaah & ziyadah!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-emerald-300 font-semibold">
                +{activeEntry.weeklyDeltaJuz} Juz/pekan
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-amber-300 font-semibold">
                {activeEntry.streakDays}h Streak
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setSortMode('juz')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sortMode === 'juz'
                  ? 'bg-emerald-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Capaian Juz
            </button>
            <button
              type="button"
              onClick={() => setSortMode('targetPercent')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sortMode === 'targetPercent'
                  ? 'bg-emerald-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Progres Target (%)
            </button>
            <button
              type="button"
              onClick={() => setSortMode('tajwid')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sortMode === 'tajwid'
                  ? 'bg-emerald-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tajwid & Mutqin
            </button>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            {(['Semua', 'Putra', 'Putri'] as AsramaFilter[]).map((filterOpt) => (
              <button
                key={filterOpt}
                type="button"
                onClick={() => setAsramaFilter(filterOpt)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  asramaFilter === filterOpt
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {filterOpt === 'Semua' ? 'Semua' : `Asrama ${filterOpt}`}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari santri, surah, atau kelas..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topThree.map((entry, idx) => {
            const isCurrent = entry.id === santri.id;
            const podiumStyles =
              idx === 0
                ? {
                    border: 'border-amber-500/50 bg-gradient-to-b from-amber-950/35 to-neutral-950/90',
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    icon: <Crown className="w-4 h-4 text-amber-400" />,
                    bar: 'bg-amber-400',
                    label: 'Peringkat #1',
                  }
                : idx === 1
                ? {
                    border: 'border-slate-500/40 bg-gradient-to-b from-slate-900/50 to-neutral-950/90',
                    badge: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
                    icon: <Medal className="w-4 h-4 text-slate-300" />,
                    bar: 'bg-slate-300',
                    label: 'Peringkat #2',
                  }
                : {
                    border: 'border-orange-600/40 bg-gradient-to-b from-orange-950/30 to-neutral-950/90',
                    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                    icon: <Award className="w-4 h-4 text-orange-400" />,
                    bar: 'bg-orange-400',
                    label: 'Peringkat #3',
                  };

            return (
              <div
                key={entry.id}
                onClick={() => {
                  if (entry.sourceProfile && onSelectSantri) {
                    onSelectSantri(entry.sourceProfile);
                  }
                }}
                className={`p-4 rounded-xl border space-y-3 transition-colors ${podiumStyles.border} ${
                  isCurrent ? 'ring-1 ring-emerald-400/70' : ''
                } ${entry.sourceProfile && onSelectSantri ? 'cursor-pointer hover:border-emerald-400/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${podiumStyles.badge}`}
                  >
                    {podiumStyles.icon}
                    <span>{podiumStyles.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-neutral-950">
                        Aktif
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      +{entry.weeklyDeltaJuz} Juz
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white truncate">{entry.nama}</h4>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {entry.kelas} · {entry.genderGroup}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold font-mono-numbers text-white">
                      {entry.capaianJuz} <span className="text-xs font-normal text-neutral-400">/ {entry.targetJuz} Juz</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {entry.targetPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${podiumStyles.bar}`}
                      style={{ width: `${entry.targetPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/70">
                  <span>Ziyadah: <strong className="text-neutral-200">{entry.lastSurah}</strong></span>
                  <span>Tajwid: <strong className="text-emerald-300 font-mono">{entry.avgTajwid}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked Leaderboard Table / List */}
      <div className="space-y-2">
        {visibleRows.length === 0 ? (
          <div className="p-6 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center text-xs text-neutral-400">
            Tidak ada santri yang cocok dengan filter pencarian tersebut.
          </div>
        ) : (
          visibleRows.map((entry, idx) => {
            const isCurrent = entry.id === santri.id;
            return (
              <div
                key={entry.id}
                onClick={() => {
                  if (entry.sourceProfile && onSelectSantri) {
                    onSelectSantri(entry.sourceProfile);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                } ${entry.sourceProfile && onSelectSantri ? 'cursor-pointer' : ''}`}
              >
                {/* Left: Rank + Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 border ${
                      idx === 0
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : idx === 1
                        ? 'bg-slate-500/15 text-slate-200 border-slate-500/40'
                        : idx === 2
                        ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">
                        {entry.nama}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-neutral-950">
                          Santri Terpilih
                        </span>
                      )}
                      {entry.isRegistered && !isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          Profil Aktif
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400">
                      <span className="truncate">{entry.halaqah}</span>
                      <span>·</span>
                      <span>Surah {entry.lastSurah} (Juz {entry.lastJuz})</span>
                    </div>
                  </div>
                </div>

                {/* Right: Ziyadah Bar + Metrics */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="w-36 sm:w-44 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-white">
                        {entry.capaianJuz} / {entry.targetJuz} Juz
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {entry.targetPercent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCurrent ? 'bg-emerald-400' : 'bg-emerald-500/80'
                        }`}
                        style={{ width: `${entry.targetPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right min-w-[76px]">
                    <div className="text-xs font-mono font-bold text-neutral-200">
                      Tajwid {entry.avgTajwid}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {entry.ziyadahSetoranCount}x Ziyadah
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Toggle + Motivation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            “Fastabiqul Khairat” — Berlomba-lombalah dalam menghafal dan memutqinkan kalamullah.
          </span>
        </div>

        {filteredAndSorted.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllRows((prev) => !prev)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            {showAllRows ? (
              <>
                <span>Tampilkan Ringkas</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Lihat Semua ({filteredAndSorted.length} Santri)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};
