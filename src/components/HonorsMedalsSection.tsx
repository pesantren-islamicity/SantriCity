import React, { useMemo, useState } from 'react';
import {
  AcademicGoal,
  AchievementMedal,
  AchievementMedalDomain,
  AchievementMedalTier,
  NilaiMataPelajaran,
  SantriProfile,
  TahfidzEntry,
} from '../types/pesantren';
import { evaluateSantriAchievementMedals } from '../services/achievementMedalService';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Crown,
  Lock,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
} from 'lucide-react';

interface HonorsMedalsSectionProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  nilaiList: NilaiMataPelajaran[];
  academicGoals: AcademicGoal[];
  onNavigateTab: (tab: string) => void;
}

type MedalFilter = 'all' | 'earned' | 'tahfidz' | 'akademik';

export const HonorsMedalsSection: React.FC<HonorsMedalsSectionProps> = ({
  santri,
  tahfidzList,
  nilaiList,
  academicGoals,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<MedalFilter>('all');
  const [selectedMedal, setSelectedMedal] = useState<AchievementMedal | null>(null);

  const medals = useMemo(
    () =>
      evaluateSantriAchievementMedals(
        santri,
        tahfidzList,
        nilaiList,
        academicGoals
      ),
    [santri, tahfidzList, nilaiList, academicGoals]
  );

  const earnedMedals = useMemo(
    () => medals.filter((m) => m.isEarned),
    [medals]
  );

  const filteredMedals = useMemo(() => {
    switch (filter) {
      case 'earned':
        return medals.filter((m) => m.isEarned);
      case 'tahfidz':
        return medals.filter((m) => m.domain === "Tahfidz Al-Qur'an");
      case 'akademik':
        return medals.filter(
          (m) =>
            m.domain === 'Target Akademik' || m.domain === 'Prestasi Terpadu'
        );
      case 'all':
      default:
        return medals;
    }
  }, [medals, filter]);

  const getTierColors = (tier: AchievementMedalTier, isEarned: boolean) => {
    if (!isEarned) {
      return {
        ring: '#404040',
        fill: '#171717',
        ribbon: '#262626',
        textClass: 'text-neutral-500',
        accentClass: 'text-neutral-400',
        barClass: 'fill-neutral-600',
      };
    }

    switch (tier) {
      case 'Kehormatan (Platinum)':
        return {
          ring: '#22d3ee',
          fill: '#083344',
          ribbon: '#0e7490',
          textClass: 'text-cyan-300',
          accentClass: 'text-cyan-400',
          barClass: 'fill-cyan-400',
        };
      case 'Emas (Gold)':
        return {
          ring: '#fbbf24',
          fill: '#451a03',
          ribbon: '#b45309',
          textClass: 'text-amber-300',
          accentClass: 'text-amber-400',
          barClass: 'fill-amber-400',
        };
      case 'Perak (Silver)':
        return {
          ring: '#cbd5e1',
          fill: '#1e293b',
          ribbon: '#475569',
          textClass: 'text-slate-200',
          accentClass: 'text-slate-300',
          barClass: 'fill-slate-300',
        };
      case 'Perunggu (Bronze)':
      default:
        return {
          ring: '#d97706',
          fill: '#431407',
          ribbon: '#9a3412',
          textClass: 'text-orange-300',
          accentClass: 'text-orange-400',
          barClass: 'fill-orange-400',
        };
    }
  };

  const renderMedalIcon = (
    ikon: AchievementMedal['ikon'],
    className = 'w-5 h-5'
  ) => {
    switch (ikon) {
      case 'crown':
        return <Crown className={className} />;
      case 'trophy':
        return <Trophy className={className} />;
      case 'award':
        return <Award className={className} />;
      case 'star':
        return <Star className={className} />;
      case 'sparkles':
        return <Sparkles className={className} />;
      case 'medal':
      default:
        return <Medal className={className} />;
    }
  };

  const renderDomainLabel = (domain: AchievementMedalDomain) => domain;

  return (
    <section
      aria-label="Dewan Kehormatan dan Medali Prestasi Santri"
      className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Dewan Kehormatan & Medali Prestasi Digital
            </h3>
            <span className="font-arabic text-base text-amber-400 font-bold">
              لوحة الشرف والأوسمة الرقمية
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="font-mono tabular-nums text-amber-300 font-semibold">
              {earnedMedals.length} dari {medals.length} Medali Diraih
            </span>
            <span aria-hidden="true">·</span>
            <span>Dianugerahkan otomatis saat target Tahfidz atau Akademik tuntas</span>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'earned', label: `Diraih (${earnedMedals.length})` },
                { id: 'tahfidz', label: 'Tahfidz' },
                { id: 'akademik', label: 'Akademik' },
              ] as { id: MedalFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('target-akademik')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-950 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Target Akademik</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3-in-a-Row Achievement Medals Grid */}
      {filteredMedals.length === 0 ? (
        <div className="p-8 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center space-y-2">
          <Medal className="w-6 h-6 text-neutral-500 mx-auto" />
          <p className="text-xs text-neutral-400">
            Belum ada medali pada kategori filter ini. Lanjutkan setoran Tahfidz atau penuntasan Target Akademik untuk membuka medali.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedals.map((medal) => {
            const colors = getTierColors(medal.tier, medal.isEarned);

            return (
              <button
                key={medal.id}
                type="button"
                onClick={() => setSelectedMedal(medal)}
                className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-4 cursor-pointer ${
                  medal.isEarned
                    ? 'bg-neutral-950/90 border-neutral-700/80 hover:border-amber-500/60'
                    : 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Crafted SVG Digital Medal Emblem */}
                  <div className="relative w-14 h-16 shrink-0 flex items-center justify-center">
                    <svg
                      viewBox="0 0 56 64"
                      className="w-full h-full"
                      aria-hidden="true"
                    >
                      {/* Medal Ribbon */}
                      <polygon
                        points="16,0 26,0 28,22 18,22"
                        fill={colors.ribbon}
                      />
                      <polygon
                        points="40,0 30,0 28,22 38,22"
                        fill={colors.ribbon}
                        fillOpacity="0.85"
                      />
                      {/* Outer Seal Ring */}
                      <circle
                        cx="28"
                        cy="38"
                        r="22"
                        fill={colors.fill}
                        stroke={colors.ring}
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="28"
                        cy="38"
                        r="17"
                        fill="none"
                        stroke={colors.ring}
                        strokeOpacity="0.45"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    </svg>
                    <div
                      className={`absolute top-[28px] left-1/2 -translate-x-1/2 ${
                        medal.isEarned ? colors.accentClass : 'text-neutral-500'
                      }`}
                    >
                      {medal.isEarned ? (
                        renderMedalIcon(medal.ikon, 'w-5 h-5')
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Medal Metadata & Title (Zero-Pill Typography) */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium flex-wrap">
                      <span className={colors.textClass}>{medal.tier}</span>
                      <span aria-hidden="true" className="text-neutral-600">
                        ·
                      </span>
                      <span className="text-neutral-400">
                        {renderDomainLabel(medal.domain)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {medal.judul}
                    </h4>

                    <div className="font-arabic text-xs text-neutral-400">
                      {medal.judulArab}
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Status Footer */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80 w-full">
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                    <span className="text-neutral-400">{medal.progressLabel}</span>
                    {medal.isEarned ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Diraih</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">
                        {medal.progressPercent}%
                      </span>
                    )}
                  </div>

                  <svg
                    className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-800 block"
                    viewBox="0 0 100 4"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="0"
                      y="0"
                      width={Math.min(100, Math.max(2, medal.progressPercent))}
                      height="4"
                      className={colors.barClass}
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Action Footer Links */}
      <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
        <span>
          Medali digital terhubung dengan sertifikasi Dewan Pengasuh & Musyrif SantriCity.
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigateTab('tahfidz')}
            className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Setoran Tahfidz</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('target-akademik')}
            className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Tuntaskan Goals</span>
          </button>
        </div>
      </div>

      {/* Medal Inspection Modal */}
      {selectedMedal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-mono tabular-nums">
                  {selectedMedal.kodeMedali}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedal(null)}
                aria-label="Tutup detail medali"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className="w-16 h-16 rounded-full mx-auto bg-neutral-950 border-2 border-amber-400/50 flex items-center justify-center text-amber-400">
                {renderMedalIcon(selectedMedal.ikon, 'w-8 h-8')}
              </div>
              <div className="text-xs text-neutral-400">
                {selectedMedal.tier} · {selectedMedal.domain}
              </div>
              <h4 className="text-base font-bold text-white">
                {selectedMedal.judul}
              </h4>
              <div className="font-arabic text-base text-amber-400">
                {selectedMedal.judulArab}
              </div>
            </div>

            <div className="space-y-3 text-xs bg-neutral-950/70 p-4 rounded-xl border border-neutral-800">
              <div>
                <div className="text-neutral-400 mb-0.5">Kriteria Penghargaan</div>
                <p className="text-neutral-200 leading-relaxed">
                  {selectedMedal.kriteria}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800 font-mono tabular-nums">
                <span className="text-neutral-400">Capaian:</span>
                <span className="text-emerald-400 font-semibold">
                  {selectedMedal.progressLabel} ({selectedMedal.progressPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="text-neutral-400">Sumber:</span>
                <span className="text-neutral-200 text-right">
                  {selectedMedal.sumberPencapaian}
                </span>
              </div>
              {selectedMedal.diperolehPada && (
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="text-neutral-400">Tanggal Anugerah:</span>
                  <span className="text-amber-300 font-semibold">
                    {selectedMedal.diperolehPada}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-neutral-800">
                <div className="text-neutral-400 mb-0.5">Hak & Apresiasi Pondok</div>
                <p className="text-neutral-200 leading-relaxed">
                  {selectedMedal.penghargaan}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMedal(null)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
