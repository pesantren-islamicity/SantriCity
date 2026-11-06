import React, { useState } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  TahfidzBadge,
  TahfidzBadgeTier,
} from '../types/pesantren';
import {
  calculateTahfidzBadges,
  getTahfidzBadgeSummary,
} from '../services/tahfidzBadgeService';
import { TahfidzBadgeModal } from './TahfidzBadgeModal';
import {
  Award,
  Crown,
  Trophy,
  Star,
  Sparkles,
  Shield,
  Flame,
  Gem,
  BookOpen,
  ChevronRight,
  Target,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';

interface TahfidzProfileBadgeCardProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
}

export const TahfidzProfileBadgeCard: React.FC<TahfidzProfileBadgeCardProps> = ({
  santri,
  tahfidzList,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  // Compute badges dynamically
  const badges = calculateTahfidzBadges(santri, tahfidzList);
  const summary = getTahfidzBadgeSummary(badges);

  const handleOpenBadge = (badgeId: string) => {
    setSelectedBadgeId(badgeId);
    setIsModalOpen(true);
  };

  const renderBadgeIcon = (iconType: TahfidzBadge['iconType'], className = 'w-4 h-4') => {
    switch (iconType) {
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
      case 'shield':
        return <Shield className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'gem':
        return <Gem className={className} />;
      case 'book':
      default:
        return <BookOpen className={className} />;
    }
  };

  const getTierHalo = (tier: TahfidzBadgeTier) => {
    switch (tier) {
      case 'Diamond':
        return 'ring-cyan-400 shadow-cyan-500/30 border-cyan-400';
      case 'Platinum':
        return 'ring-purple-400 shadow-purple-500/30 border-purple-400';
      case 'Gold':
        return 'ring-amber-400 shadow-amber-500/30 border-amber-400';
      case 'Silver':
        return 'ring-slate-300 shadow-slate-400/20 border-slate-300';
      case 'Bronze':
      default:
        return 'ring-amber-600 shadow-amber-600/20 border-amber-600';
    }
  };

  const getBadgeStyle = (tier: TahfidzBadgeTier) => {
    switch (tier) {
      case 'Diamond':
        return {
          bg: 'bg-cyan-950/40 hover:bg-cyan-950/70',
          border: 'border-cyan-400/50 hover:border-cyan-400',
          text: 'text-cyan-300',
          glow: 'shadow-cyan-950/40',
        };
      case 'Platinum':
        return {
          bg: 'bg-purple-950/40 hover:bg-purple-950/70',
          border: 'border-purple-400/50 hover:border-purple-400',
          text: 'text-purple-300',
          glow: 'shadow-purple-950/40',
        };
      case 'Gold':
        return {
          bg: 'bg-amber-950/40 hover:bg-amber-950/70',
          border: 'border-amber-400/50 hover:border-amber-400',
          text: 'text-amber-300',
          glow: 'shadow-amber-950/40',
        };
      case 'Silver':
        return {
          bg: 'bg-slate-900/60 hover:bg-slate-800/80',
          border: 'border-slate-400/50 hover:border-slate-300',
          text: 'text-slate-200',
          glow: 'shadow-slate-950/40',
        };
      case 'Bronze':
      default:
        return {
          bg: 'bg-amber-950/30 hover:bg-amber-950/60',
          border: 'border-amber-700/50 hover:border-amber-600',
          text: 'text-amber-400',
          glow: 'shadow-amber-950/40',
        };
    }
  };

  const remainingJuz = Math.max(0, santri.targetJuz - santri.capaianJuz);
  const progressRatio = santri.targetJuz > 0 ? (santri.capaianJuz / santri.targetJuz) * 100 : 0;

  return (
    <>
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient background light */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Santri Identity & Title */}
          <div className="flex items-start gap-4">
            {/* Avatar with Tier Rank Halo */}
            <div className="relative shrink-0">
              <img
                src={santri.fotoUrl}
                alt={santri.nama}
                referrerPolicy="no-referrer"
                className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover border-2 shadow-xl ring-2 ring-offset-2 ring-offset-neutral-950 ${getTierHalo(
                  summary.highestTier
                )}`}
              />
              <div
                className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 border border-neutral-700 text-amber-300 flex items-center gap-1 shadow-md"
                title={`Peringkat Tertinggi: Tier ${summary.highestTier}`}
              >
                <Award className="w-3 h-3 text-amber-400" />
                <span>{summary.highestTier}</span>
              </div>
            </div>

            {/* Name, Titles & Academic Meta */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {santri.nama}
                </h3>
                {santri.namaArab && (
                  <span className="font-arabic text-emerald-400 text-sm font-semibold">
                    {santri.namaArab}
                  </span>
                )}
              </div>

              {/* Honorary Title Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>{summary.honoraryTitle}</span>
                  <span className="text-[10px] text-emerald-400/70 font-arabic hidden sm:inline">
                    · {summary.honoraryTitleArabic}
                  </span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  NIS: <strong className="text-neutral-300">{santri.nis}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                <span>{santri.kelas}</span>
                <span>·</span>
                <span>{santri.asrama} ({santri.kamar})</span>
                <span>·</span>
                <span>Pembimbing: <strong className="text-neutral-300">Ust. Ahmad Fauzan, Al-Hafidz</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Target Juz Progress Pill & Badge Shelf CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:shrink-0">
            {/* Target Progress Box */}
            <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1.5 min-w-[200px]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Tahfidz</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {progressRatio.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-white">
                  {santri.capaianJuz}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  / {santri.targetJuz} Juz Selesai
                </span>
              </div>

              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, progressRatio)}%` }}
                />
              </div>

              <div className="text-[11px] text-neutral-400 flex justify-between">
                <span>Kurang: <strong className="text-amber-300 font-mono">{remainingJuz.toFixed(1)} Juz</strong></span>
                <span className="text-emerald-400 font-medium">{summary.unlockedCount}/{summary.totalBadges} Lencana</span>
              </div>
            </div>

            {/* Button to open badge modal */}
            <button
              onClick={() => {
                setSelectedBadgeId(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 group shrink-0"
              title="Buka Lemari Lencana Tahfidz & Lihat Seluruh Capaian"
            >
              <Award className="w-4 h-4 text-neutral-950 group-hover:scale-110 transition-transform" />
              <span>Lemari Lencana</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: VIRTUAL ACHIEVEMENT BADGES SHELF */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Award className="w-3 h-3" />
              </div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                Koleksi Lencana Prestasi Santri (Virtual Achievement Badges)
              </h4>
            </div>

            <button
              onClick={() => {
                setSelectedBadgeId(null);
                setIsModalOpen(true);
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Lihat Semua ({summary.totalBadges})</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Badges Horizontal Carousel / Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {badges.map((badge) => {
              const style = getBadgeStyle(badge.tier);

              return (
                <button
                  key={badge.id}
                  onClick={() => handleOpenBadge(badge.id)}
                  title={`${badge.title} (${badge.tier}) - ${badge.isUnlocked ? 'Tercapai' : `Progres ${badge.progressPercentage}%`}`}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 relative group ${
                    badge.isUnlocked
                      ? `${style.bg} ${style.border} ${style.glow} hover:scale-105 cursor-pointer`
                      : 'bg-neutral-950/40 border-neutral-800/60 opacity-55 hover:opacity-85 hover:border-neutral-700'
                  }`}
                >
                  {/* Icon Medallion */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border relative transition-all ${
                      badge.isUnlocked
                        ? `${style.border} bg-neutral-950/80 ${style.text} shadow-sm group-hover:ring-1 group-hover:ring-emerald-400`
                        : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    {renderBadgeIcon(badge.iconType, 'w-4 h-4')}

                    {/* Status Pip */}
                    {badge.isUnlocked ? (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center text-[9px] shadow">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[8px] border border-neutral-700">
                        <Lock className="w-2 h-2" />
                      </div>
                    )}
                  </div>

                  {/* Title & Tier */}
                  <div className="w-full">
                    <div className="text-[11px] font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {badge.title}
                    </div>
                    <div className="text-[9px] text-neutral-400 font-mono mt-0.5">
                      {badge.isUnlocked ? (
                        <span className="text-emerald-400 font-medium">Tercapai</span>
                      ) : (
                        <span>{badge.progressPercentage}%</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Detail Modal */}
      <TahfidzBadgeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        badges={badges}
        santri={santri}
        initialSelectedBadgeId={selectedBadgeId}
      />
    </>
  );
};
