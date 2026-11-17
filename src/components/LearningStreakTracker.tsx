import React, { useEffect, useMemo, useState } from 'react';
import {
  PresensiHarian,
  SantriProfile,
  TahfidzEntry,
} from '../types/pesantren';
import {
  ConsistencyBadge,
  ConsistencyBadgeTier,
  evaluateLearningStreak,
  recordDailyAppUsage,
  toggleDailyStudyCheckIn,
} from '../services/learningStreakService';
import {
  Award,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Lock,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';

interface LearningStreakTrackerProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  presensiList: PresensiHarian[];
  onNavigateTab: (tab: string) => void;
}

const getTierStyles = (tier: ConsistencyBadgeTier, unlocked: boolean) => {
  if (!unlocked) {
    return {
      card: 'bg-neutral-950/50 border-neutral-800/80 opacity-75 hover:opacity-100',
      iconBox: 'bg-neutral-900 border-neutral-800 text-neutral-500',
      badge: 'bg-neutral-900 text-neutral-400 border-neutral-800',
      bar: 'bg-neutral-600',
    };
  }

  switch (tier) {
    case 'Platinum':
      return {
        card: 'bg-gradient-to-br from-cyan-950/40 to-neutral-950 border-cyan-500/40',
        iconBox: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        bar: 'bg-cyan-400',
      };
    case 'Emas':
      return {
        card: 'bg-gradient-to-br from-amber-950/35 to-neutral-950 border-amber-500/40',
        iconBox: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        bar: 'bg-amber-400',
      };
    case 'Zamrud':
      return {
        card: 'bg-gradient-to-br from-emerald-950/40 to-neutral-950 border-emerald-500/45',
        iconBox: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        bar: 'bg-emerald-400',
      };
    case 'Perak':
      return {
        card: 'bg-gradient-to-br from-slate-900/60 to-neutral-950 border-slate-400/40',
        iconBox: 'bg-slate-400/15 border-slate-400/40 text-slate-200',
        badge: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
        bar: 'bg-slate-300',
      };
    case 'Perunggu':
    default:
      return {
        card: 'bg-gradient-to-br from-orange-950/35 to-neutral-950 border-orange-500/40',
        iconBox: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        bar: 'bg-orange-400',
      };
  }
};

const renderBadgeIcon = (
  icon: ConsistencyBadge['icon'],
  className = 'w-4 h-4'
) => {
  switch (icon) {
    case 'crown':
      return <Crown className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'calendar':
      return <CalendarCheck2 className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'flame':
    default:
      return <Flame className={className} />;
  }
};

export const LearningStreakTracker: React.FC<LearningStreakTrackerProps> = ({
  santri,
  tahfidzList,
  presensiList,
  onNavigateTab,
}) => {
  const [checkInVersion, setCheckInVersion] = useState<number>(0);
  const [selectedBadge, setSelectedBadge] = useState<ConsistencyBadge | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState<boolean>(false);

  // Record daily app session usage automatically when santri visits dashboard
  useEffect(() => {
    recordDailyAppUsage(santri.id);
    setCheckInVersion((v) => v + 1);
  }, [santri.id]);

  const streak = useMemo(
    () => evaluateLearningStreak(santri, tahfidzList, presensiList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [santri, tahfidzList, presensiList, checkInVersion]
  );

  const handleDailyCheckIn = () => {
    toggleDailyStudyCheckIn(santri.id);
    setCheckInVersion((v) => v + 1);
    setJustCheckedIn(true);
    window.setTimeout(() => setJustCheckedIn(false), 3500);
  };

  return (
    <section
      aria-label="Pelacak Streak Belajar dan Lencana Konsistensi"
      className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-5"
    >
      {/* Top Header + Daily Participation Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Learning Streak & Consistency Badges
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {streak.unlockedBadgeCount}/{streak.badges.length} Lencana Diraih
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pantau istiqamah penggunaan aplikasi harian & konsistensi setoran Tahfidz untuk membuka lencana kehormatan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDailyCheckIn}
            disabled={streak.isTodayCheckedIn}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              streak.isTodayCheckedIn
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 cursor-default'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-950/40'
            }`}
          >
            {streak.isTodayCheckedIn ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Check-in Belajar Hari Ini Tercatat</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Check-in Belajar Hari Ini</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('tahfidz')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Log Tahfidz</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {justCheckedIn && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Barakallah! Partisipasi belajar harian tercatat — streak aktif{' '}
            <strong>{streak.currentStreakDays} hari</strong> berturut-turut.
          </span>
        </div>
      )}

      {/* Streak Metrics + 7-Day Rolling Activity Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 cols: Streak KPI Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-amber-500/30 space-y-1">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Streak Belajar Aktif</span>
            </span>
            <div className="text-2xl font-bold font-mono-numbers text-amber-300">
              {streak.currentStreakDays}{' '}
              <span className="text-xs font-normal text-neutral-400">Hari</span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Rekor Terbaik: <strong className="text-neutral-200">{streak.longestStreakDays} Hari</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-emerald-500/30 space-y-1">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Konsistensi Tahfidz</span>
            </span>
            <div className="text-2xl font-bold font-mono-numbers text-emerald-400">
              {streak.tahfidzConsecutiveDays}{' '}
              <span className="text-xs font-normal text-neutral-400">Hari</span>
            </div>
            <p className="text-[10px] text-neutral-400">
              {tahfidzList.length} Total Setoran Tercatat
            </p>
          </div>
        </div>

        {/* Right 7 cols: Rolling 7-Day Consistency Calendar Bar */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-neutral-200">
              Aktivitas 7 Hari Terakhir ({streak.weeklyActiveDaysCount}/7 Hari Aktif)
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {streak.weeklyConsistencyRate}% Konsisten
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {streak.last7Days.map((day) => {
              const cellStyle =
                day.hasAppUsage && day.hasTahfidzEntry
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : day.hasAppUsage
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : day.hasTahfidzEntry
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500';

              return (
                <div
                  key={day.dateStr}
                  title={`${day.dateStr}: ${
                    day.hasAppUsage ? 'Aktif Aplikasi' : 'Belum Check-in'
                  } · ${
                    day.hasTahfidzEntry
                      ? `${Math.max(1, day.tahfidzCount)} Setoran Tahfidz`
                      : 'Belum ada setoran tahfidz'
                  }`}
                  className={`p-2 rounded-xl border text-center space-y-1 transition-all ${cellStyle} ${
                    day.isToday ? 'ring-1 ring-white/40' : ''
                  }`}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider">
                    {day.shortDay}
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {day.dayNumber}
                  </div>
                  <div className="flex items-center justify-center gap-1 pt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.hasAppUsage ? 'bg-amber-400' : 'bg-neutral-700'
                      }`}
                      title="Penggunaan Aplikasi Harian"
                    />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.hasTahfidzEntry ? 'bg-emerald-400' : 'bg-neutral-700'
                      }`}
                      title="Setoran Tahfidz"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400 pt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Aktif Aplikasi Harian
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Setoran Tahfidz
              </span>
            </div>
            <span>Klik lencana di bawah untuk melihat syarat pembukaan</span>
          </div>
        </div>
      </div>

      {/* Consistency Badges Showcase */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Consistency Badges (Lencana Istiqamah Harian)</span>
          </h4>
          <span className="text-[11px] text-neutral-400">
            {streak.unlockedBadgeCount} Terbuka ·{' '}
            {streak.badges.length - streak.unlockedBadgeCount} Menuju Target
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {streak.badges.map((badge) => {
            const styles = getTierStyles(badge.tier, badge.isUnlocked);
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => setSelectedBadge(badge)}
                className={`p-3.5 rounded-xl border text-left transition-all space-y-2.5 cursor-pointer ${styles.card}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBox}`}
                    >
                      {badge.isUnlocked ? (
                        renderBadgeIcon(badge.icon, 'w-4 h-4')
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {badge.title}
                      </div>
                      <div className="text-[10px] font-arabic text-neutral-400 truncate">
                        {badge.titleArabic}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${styles.badge}`}
                  >
                    {badge.tier}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      {badge.isUnlocked
                        ? badge.unlockedLabel || 'Tercapai'
                        : 'Progres Saat Ini'}
                    </span>
                    <span className="font-mono font-semibold text-neutral-200">
                      {badge.currentValue}/{badge.targetValue} {badge.unitLabel}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Detail Inspector Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-mono font-bold text-amber-400">
                {selectedBadge.code} · Lencana Konsistensi
              </span>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                  getTierStyles(selectedBadge.tier, selectedBadge.isUnlocked).iconBox
                }`}
              >
                {renderBadgeIcon(selectedBadge.icon, 'w-6 h-6')}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {selectedBadge.title}
                </h4>
                <p className="text-xs font-arabic text-emerald-400">
                  {selectedBadge.titleArabic}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Syarat Pencapaian:</span>
                <p className="text-neutral-200">{selectedBadge.criteria}</p>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Apresiasi Pesantren:</span>
                <p className="text-emerald-300 font-medium">{selectedBadge.rewardNote}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Status Lencana:</span>
                <span
                  className={`font-bold ${
                    selectedBadge.isUnlocked ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {selectedBadge.isUnlocked ? 'SUDAH DIRAIH ✓' : 'DALAM PROGRES'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    getTierStyles(selectedBadge.tier, selectedBadge.isUnlocked).bar
                  }`}
                  style={{ width: `${selectedBadge.progressPercent}%` }}
                />
              </div>
              <div className="text-right font-mono text-[11px] text-neutral-400">
                {selectedBadge.currentValue} / {selectedBadge.targetValue} {selectedBadge.unitLabel} (
                {selectedBadge.progressPercent}%)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              {!selectedBadge.isUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBadge(null);
                    onNavigateTab('tahfidz');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 cursor-pointer"
                >
                  Setor Tahfidz Sekarang
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
