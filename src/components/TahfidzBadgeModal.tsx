import React, { useState } from 'react';
import {
  TahfidzBadge,
  TahfidzBadgeTier,
  SantriProfile,
} from '../types/pesantren';
import {
  X,
  Award,
  BookOpen,
  Star,
  Trophy,
  Crown,
  Sparkles,
  Shield,
  Flame,
  Gem,
  CheckCircle2,
  Lock,
  ChevronRight,
  Printer,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface TahfidzBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: TahfidzBadge[];
  santri: SantriProfile;
  initialSelectedBadgeId?: string | null;
}

export const TahfidzBadgeModal: React.FC<TahfidzBadgeModalProps> = ({
  isOpen,
  onClose,
  badges,
  santri,
  initialSelectedBadgeId,
}) => {
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>(
    initialSelectedBadgeId || (badges[0] ? badges[0].id : '')
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked' | 'target'>('all');
  const [isCopiedShare, setIsCopiedShare] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedBadge = badges.find((b) => b.id === selectedBadgeId) || badges[0];

  const filteredBadges = badges.filter((b) => {
    if (activeFilter === 'unlocked') return b.isUnlocked;
    if (activeFilter === 'locked') return !b.isUnlocked;
    if (activeFilter === 'target') return b.category === 'Progres Target Juz';
    return true;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const renderBadgeIcon = (iconType: TahfidzBadge['iconType'], className = 'w-6 h-6') => {
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

  const getTierBadgeStyle = (tier: TahfidzBadgeTier) => {
    switch (tier) {
      case 'Diamond':
        return {
          border: 'border-cyan-400/60',
          bg: 'bg-cyan-950/40',
          text: 'text-cyan-300',
          badgeText: 'text-cyan-200',
          gradient: 'from-cyan-500 via-teal-400 to-emerald-400',
          glow: 'shadow-cyan-500/20',
        };
      case 'Platinum':
        return {
          border: 'border-purple-400/60',
          bg: 'bg-purple-950/40',
          text: 'text-purple-300',
          badgeText: 'text-purple-200',
          gradient: 'from-purple-500 via-indigo-400 to-pink-400',
          glow: 'shadow-purple-500/20',
        };
      case 'Gold':
        return {
          border: 'border-amber-400/60',
          bg: 'bg-amber-950/40',
          text: 'text-amber-300',
          badgeText: 'text-amber-200',
          gradient: 'from-amber-400 via-yellow-300 to-orange-400',
          glow: 'shadow-amber-500/20',
        };
      case 'Silver':
        return {
          border: 'border-slate-300/60',
          bg: 'bg-slate-900/60',
          text: 'text-slate-200',
          badgeText: 'text-slate-100',
          gradient: 'from-slate-200 via-neutral-300 to-slate-400',
          glow: 'shadow-slate-400/20',
        };
      case 'Bronze':
      default:
        return {
          border: 'border-amber-700/60',
          bg: 'bg-amber-950/30',
          text: 'text-amber-500',
          badgeText: 'text-amber-400',
          gradient: 'from-amber-600 via-orange-600 to-amber-700',
          glow: 'shadow-amber-700/20',
        };
    }
  };

  const handleShareBadge = () => {
    if (!selectedBadge) return;
    const shareText = `🏅 Lencana Tahfidz SantriCity: ${selectedBadge.title} (${selectedBadge.titleArabic})\nSantri: ${santri.nama} (NIS: ${santri.nis})\nStatus: ${selectedBadge.isUnlocked ? 'Tercapai / Diraih' : `Progres ${selectedBadge.progressPercentage}%`}\nTarget Juz: ${santri.capaianJuz}/${santri.targetJuz} Juz\nPesantren Modern SantriCity (pesantren.islamicity.tv)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setIsCopiedShare(true);
      setTimeout(() => setIsCopiedShare(false), 2500);
    }
  };

  const tierStyle = selectedBadge ? getTierBadgeStyle(selectedBadge.tier) : getTierBadgeStyle('Gold');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-950/40">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lemari Lencana Prestasi Tahfidz
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {unlockedCount} / {badges.length} Diraih
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Penghargaan capaian ziyadah, murajaah, dan ketahanan tasmi' santri bersanad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Badge Grid Shelf (5 cols) */}
          <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col overflow-y-auto space-y-3 bg-neutral-900/30">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap font-medium ${
                  activeFilter === 'all'
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Semua ({badges.length})
              </button>
              <button
                onClick={() => setActiveFilter('unlocked')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap font-medium ${
                  activeFilter === 'unlocked'
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Diraih ({unlockedCount})
              </button>
              <button
                onClick={() => setActiveFilter('locked')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap font-medium ${
                  activeFilter === 'locked'
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Dikejar ({badges.length - unlockedCount})
              </button>
              <button
                onClick={() => setActiveFilter('target')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap font-medium ${
                  activeFilter === 'target'
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Target Juz
              </button>
            </div>

            {/* Badges List */}
            <div className="space-y-2 flex-1 pr-1">
              {filteredBadges.map((badge) => {
                const isSelected = badge.id === selectedBadgeId;
                const style = getTierBadgeStyle(badge.tier);

                return (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadgeId(badge.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 relative overflow-hidden group ${
                      isSelected
                        ? 'bg-neutral-800/90 border-emerald-500 shadow-md shadow-emerald-950/30'
                        : badge.isUnlocked
                        ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                        : 'bg-neutral-950/40 border-neutral-800/60 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {/* Badge Icon Medallion */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border relative ${
                        badge.isUnlocked
                          ? `${style.bg} ${style.border} ${style.text} shadow-sm`
                          : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                      }`}
                    >
                      {renderBadgeIcon(badge.iconType, 'w-5 h-5')}
                      {badge.isUnlocked ? (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center text-[10px] shadow">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[9px] border border-neutral-700">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Badge Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {badge.title}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold border ${style.border} ${style.bg} ${style.text}`}
                        >
                          {badge.tier}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="truncate">{badge.subtitle}</span>
                        <span className="font-mono text-emerald-400 shrink-0 font-medium ml-2">
                          {badge.progressPercentage}%
                        </span>
                      </div>

                      {/* Mini progress line */}
                      <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            badge.isUnlocked ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${badge.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Badge Inspector Card (7 cols) */}
          {selectedBadge && (
            <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto space-y-5 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
              <div className="space-y-5">
                {/* Top Medallion Banner */}
                <div
                  className={`p-5 rounded-2xl border ${tierStyle.border} ${tierStyle.bg} relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-xl ${tierStyle.glow}`}
                >
                  <div
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center border-2 ${tierStyle.border} bg-neutral-950/80 ${tierStyle.text} shrink-0 shadow-lg relative`}
                  >
                    {renderBadgeIcon(selectedBadge.iconType, 'w-10 h-10')}
                    {selectedBadge.isUnlocked && (
                      <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold shadow-md">
                        TERCAPAI
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider border border-neutral-700 bg-neutral-900/90 text-neutral-300">
                        Tier {selectedBadge.tier}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">
                        {selectedBadge.category}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {selectedBadge.title}
                    </h2>

                    <div className="font-arabic text-emerald-400 text-base font-semibold">
                      {selectedBadge.titleArabic}
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                      {selectedBadge.description}
                    </p>
                  </div>
                </div>

                {/* Progress & Target Requirement Card */}
                <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Status Capaian Santri</span>
                    <span
                      className={`font-semibold font-mono ${
                        selectedBadge.isUnlocked ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {selectedBadge.progressLabel} ({selectedBadge.progressPercentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedBadge.isUnlocked
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${selectedBadge.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-start gap-2 text-xs text-neutral-300 pt-1">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-200">Syarat Penganugerahan:</strong>{' '}
                      <span>{selectedBadge.requirementText}</span>
                    </div>
                  </div>

                  {selectedBadge.unlockedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 pt-1 border-t border-neutral-800/80">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Dianugerahkan Resmi pada: <strong>{selectedBadge.unlockedAt}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Benefits / Hak Istimewa */}
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 space-y-2">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Apresiasi & Hak Istimewa Santri:</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-neutral-300">
                    {selectedBadge.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hadith Quote Banner */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200/90 leading-relaxed space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Nasihat Hikmah Nabawiyyah:</span>
                  </div>
                  <p className="italic text-neutral-300 text-[11px]">
                    "{selectedBadge.motivationalHadith}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <button
                  onClick={handleShareBadge}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isCopiedShare ? 'Teks Berhasil Disalin!' : 'Bagikan Info Lencana'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-colors shadow-md shadow-emerald-950/40"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
