import React from 'react';
import {
  Award,
  Trophy,
  Medal,
  Star,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  BookOpen,
  Crown,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { AcademicGoal, GoalCategory } from '../types/pesantren';

export interface GamificationBadge {
  id: string;
  code: string;
  name: string;
  titleArabic: string;
  category: GoalCategory | 'Universal';
  description: string;
  requirement: string;
  iconName: 'trophy' | 'medal' | 'star' | 'crown' | 'zap' | 'flame' | 'shield' | 'book';
  colorTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'emerald';
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercent: number; // 0 - 100 towards unlock
  bonusXp: number;
}

// Circular Progress Ring Component with SVG
export interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // diameter in px
  strokeWidth?: number;
  circleColorClass?: string;
  progressColorClass?: string;
  trackColorClass?: string;
  showText?: boolean;
  fontSizeClass?: string;
  label?: string;
  sublabel?: string;
  glow?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 64,
  strokeWidth = 6,
  circleColorClass = 'text-emerald-500',
  trackColorClass = 'text-neutral-800',
  showText = true,
  fontSizeClass = 'text-xs font-bold font-mono',
  label,
  sublabel,
  glow = false,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={trackColorClass}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${circleColorClass} transition-all duration-700 ease-out`}
            style={{
              filter: glow ? 'drop-shadow(0 0 6px currentColor)' : undefined,
            }}
          />
        </svg>

        {showText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className={`${fontSizeClass} leading-none text-white`}>
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>

      {(label || sublabel) && (
        <div className="mt-1 text-center">
          {label && <p className="text-[11px] font-semibold text-neutral-200">{label}</p>}
          {sublabel && <p className="text-[10px] text-neutral-400">{sublabel}</p>}
        </div>
      )}
    </div>
  );
};

// Evaluate badges unlocked by Santri's goals and completed milestones
export function evaluateGamificationBadges(goals: AcademicGoal[]): {
  badges: GamificationBadge[];
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  nextLevelXp: number;
  currentLevelBaseXp: number;
  levelProgressPct: number;
  unlockedCount: number;
} {
  const allMilestones = goals.flatMap((g) => g.milestones);
  const completedMilestones = allMilestones.filter((m) => m.isCompleted);
  const completedGoals = goals.filter((g) => g.status === 'Tercapai' || g.currentProgressPercentage === 100);

  const tahfidzGoals = goals.filter((g) => g.category === 'Tahfidz Mutqin');
  const tahfidzCompletedMs = tahfidzGoals.flatMap((g) => g.milestones).filter((m) => m.isCompleted);

  const turatsGoals = goals.filter((g) => g.category === 'Kitab Turats');
  const turatsCompletedMs = turatsGoals.flatMap((g) => g.milestones).filter((m) => m.isCompleted);

  const sainsGoals = goals.filter((g) => g.category === 'Sains & Teknologi' || g.category === 'Studi Lanjut Timur Tengah / PTN');
  const sainsCompletedMs = sainsGoals.flatMap((g) => g.milestones).filter((m) => m.isCompleted);

  const bahasaGoals = goals.filter((g) => g.category === 'Bahasa Internasional');
  const bahasaCompletedMs = bahasaGoals.flatMap((g) => g.milestones).filter((m) => m.isCompleted);

  // Define Badge Catalog
  const badgeDefinitions: GamificationBadge[] = [
    {
      id: 'badge-first-step',
      code: 'FIRST_STEP',
      name: 'Langkah Pertama Penuntut Ilmu',
      titleArabic: 'بداية السالكين',
      category: 'Universal',
      description: 'Menyelesaikan tahapan milestone akademik pertama dengan istiqomah.',
      requirement: 'Selesaikan minimal 1 milestone belajar',
      iconName: 'zap',
      colorTier: 'bronze',
      isUnlocked: completedMilestones.length >= 1,
      unlockedAt: completedMilestones[0]?.completedAt || (completedMilestones.length >= 1 ? '2026-09-28' : undefined),
      progressPercent: Math.min(100, (completedMilestones.length / 1) * 100),
      bonusXp: 150,
    },
    {
      id: 'badge-hafizh-intisar',
      code: 'TAHFIDZ_MASTER',
      name: 'Bintang Mutqin Al-Qur’an',
      titleArabic: 'حامل لواء القرآن',
      category: 'Tahfidz Mutqin',
      description: 'Menuntaskan minimal 3 tahapan setoran / tasmi’ ziyadah tahfidz.',
      requirement: 'Selesaikan 3 milestone kategori Tahfidz Mutqin',
      iconName: 'crown',
      colorTier: 'emerald',
      isUnlocked: tahfidzCompletedMs.length >= 3,
      unlockedAt: tahfidzCompletedMs[2]?.completedAt || (tahfidzCompletedMs.length >= 3 ? '2026-09-28' : undefined),
      progressPercent: Math.min(100, Math.round((tahfidzCompletedMs.length / 3) * 100)),
      bonusXp: 350,
    },
    {
      id: 'badge-faqih-turats',
      code: 'FAQIH_TURATS',
      name: 'Pendekar Kutubus Sittah & Nahwu',
      titleArabic: 'فارس متون التراث',
      category: 'Kitab Turats',
      description: 'Menuntaskan milestone pembacaan syarah matan kitab turats & gramatika Arab.',
      requirement: 'Selesaikan minimal 2 milestone kategori Kitab Turats',
      iconName: 'book',
      colorTier: 'silver',
      isUnlocked: turatsCompletedMs.length >= 2,
      unlockedAt: turatsCompletedMs[1]?.completedAt || (turatsCompletedMs.length >= 2 ? '2026-09-28' : undefined),
      progressPercent: Math.min(100, Math.round((turatsCompletedMs.length / 2) * 100)),
      bonusXp: 300,
    },
    {
      id: 'badge-momentum-five',
      code: 'MOMENTUM_BUILDER',
      name: 'Sang Penakluk Hambatan (5 Milestones)',
      titleArabic: 'صاحب العزيمة الفولاذية',
      category: 'Universal',
      description: 'Konsistensi tinggi: berhasil menyelesaikan 5 tahapan akademik lintas mata pelajaran.',
      requirement: 'Selesaikan total 5 milestone akademik',
      iconName: 'trophy',
      colorTier: 'gold',
      isUnlocked: completedMilestones.length >= 5,
      unlockedAt: completedMilestones[4]?.completedAt || (completedMilestones.length >= 5 ? '2026-09-28' : undefined),
      progressPercent: Math.min(100, Math.round((completedMilestones.length / 5) * 100)),
      bonusXp: 500,
    },
    {
      id: 'badge-perfectionist-goal',
      code: 'GOAL_PERFECTIONIST',
      name: 'Mahkota Kelulusan Sempurna (100% Target)',
      titleArabic: 'تاج الإتقان الأكاديمي',
      category: 'Universal',
      description: 'Menuntaskan 100% seluruh tahapan dalam satu sasaran belajar jangka panjang.',
      requirement: 'Raih 100% kemajuan pada 1 sasaran belajar penuh',
      iconName: 'medal',
      colorTier: 'platinum',
      isUnlocked: completedGoals.length >= 1,
      unlockedAt: completedGoals[0]?.updatedAt || (completedGoals.length >= 1 ? '2026-09-28' : undefined),
      progressPercent: completedGoals.length >= 1 ? 100 : Math.max(0, ...goals.map(g => g.currentProgressPercentage), 0),
      bonusXp: 600,
    },
    {
      id: 'badge-polyglot-scholar',
      code: 'GLOBAL_SCHOLAR',
      name: 'Duta Sains & Bahasa Dunia',
      titleArabic: 'سفير المعرفة المعاصرة',
      category: 'Bahasa Internasional',
      description: 'Aktif menyelesaikan milestone sains modern, bahasa Arab, atau persiapan universitas.',
      requirement: 'Selesaikan 2 milestone sains / bahasa internasional',
      iconName: 'shield',
      colorTier: 'gold',
      isUnlocked: (sainsCompletedMs.length + bahasaCompletedMs.length) >= 2,
      unlockedAt: (sainsCompletedMs.length + bahasaCompletedMs.length) >= 2 ? '2026-09-28' : undefined,
      progressPercent: Math.min(100, Math.round(((sainsCompletedMs.length + bahasaCompletedMs.length) / 2) * 100)),
      bonusXp: 400,
    },
  ];

  // Calculate XP & Level
  // Each milestone completed grants 120 XP
  // Each badge unlocked grants its bonus XP
  // Total progress percentage grants 2 XP per 1%
  const milestoneXp = completedMilestones.length * 120;
  const badgeBonusXp = badgeDefinitions.filter((b) => b.isUnlocked).reduce((sum, b) => sum + b.bonusXp, 0);
  const totalGoalProgressPct = goals.reduce((sum, g) => sum + g.currentProgressPercentage, 0);
  const progressXp = totalGoalProgressPct * 2;

  const totalXp = milestoneXp + badgeBonusXp + progressXp;

  // Level thresholds:
  // Level 1: 0 - 300 XP (Talib Pemula)
  // Level 2: 301 - 800 XP (Penuntut Ilmu Tekun)
  // Level 3: 801 - 1500 XP (Mujtahid Muda)
  // Level 4: 1501 - 2500 XP (Ksatria Mutqin)
  // Level 5: 2501+ XP (Alim Robani Teladan)
  const levels = [
    { level: 1, minXp: 0, maxXp: 300, title: 'Thalib Pemula (Mubtadi’)' },
    { level: 2, minXp: 301, maxXp: 800, title: 'Penuntut Ilmu Tekun (Mutadabbir)' },
    { level: 3, minXp: 801, maxXp: 1600, title: 'Mujtahid Unggul (Mujaddid)' },
    { level: 4, minXp: 1601, maxXp: 2600, title: 'Ksatria Mutqin (Hafizh Mujtahid)' },
    { level: 5, minXp: 2601, maxXp: 4000, title: 'Alim Rabbani Teladan (Fakhrul Mahad)' },
  ];

  let currentLevelObj = levels[0];
  for (const lvl of levels) {
    if (totalXp >= lvl.minXp) {
      currentLevelObj = lvl;
    }
  }

  const currentLevel = currentLevelObj.level;
  const levelTitle = currentLevelObj.title;
  const nextLevelXp = currentLevelObj.maxXp;
  const currentLevelBaseXp = currentLevelObj.minXp;
  const levelSpan = nextLevelXp - currentLevelBaseXp;
  const levelProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((totalXp - currentLevelBaseXp) / levelSpan) * 100))
  );

  return {
    badges: badgeDefinitions,
    totalXp,
    currentLevel,
    levelTitle,
    nextLevelXp,
    currentLevelBaseXp,
    levelProgressPct,
    unlockedCount: badgeDefinitions.filter((b) => b.isUnlocked).length,
  };
}

// Badge Icon Renderer
export const BadgeIcon: React.FC<{
  iconName: GamificationBadge['iconName'];
  tier: GamificationBadge['colorTier'];
  isUnlocked: boolean;
  sizeClass?: string;
}> = ({ iconName, tier, isUnlocked, sizeClass = 'w-6 h-6' }) => {
  if (!isUnlocked) {
    return <Lock className={`${sizeClass} text-neutral-600`} />;
  }

  switch (iconName) {
    case 'crown':
      return <Crown className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'medal':
      return <Medal className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'trophy':
      return <Trophy className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'book':
      return <BookOpen className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'shield':
      return <ShieldCheck className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'zap':
      return <Zap className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'flame':
      return <Flame className={`${sizeClass} ${getTierColor(tier)}`} />;
    case 'star':
    default:
      return <Star className={`${sizeClass} ${getTierColor(tier)}`} />;
  }
};

function getTierColor(tier: GamificationBadge['colorTier']): string {
  switch (tier) {
    case 'emerald':
      return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]';
    case 'platinum':
      return 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.6)]';
    case 'gold':
      return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]';
    case 'silver':
      return 'text-neutral-200 drop-shadow-[0_0_6px_rgba(229,231,235,0.4)]';
    case 'bronze':
    default:
      return 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]';
  }
}
