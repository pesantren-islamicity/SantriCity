import React, { useState } from 'react';
import {
  SantriProfile,
  AcademicGoal,
  AcademicGoalMilestone,
  GoalCategory,
  GoalVelocityStatus,
  NilaiMataPelajaran,
  TahfidzEntry,
  UserRole,
  Language,
} from '../types/pesantren';
import {
  Target,
  Sparkles,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Compass,
  Award,
  Trophy,
  Zap,
  Medal,
  Star,
  Crown,
  Lock,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';
import { evaluateAcademicGoalProgress, suggestMilestonesForGoal } from '../services/geminiService';
import {
  ProgressRing,
  evaluateGamificationBadges,
  BadgeIcon,
  GamificationBadge,
} from './AcademicGamification';

interface AcademicGoalsModuleProps {
  santri: SantriProfile;
  goals: AcademicGoal[];
  nilaiList: NilaiMataPelajaran[];
  tahfidzList: TahfidzEntry[];
  currentRole: UserRole;
  lang: Language;
  onAddGoal: (goal: Omit<AcademicGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateGoal: (goal: AcademicGoal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const AcademicGoalsModule: React.FC<AcademicGoalsModuleProps> = ({
  santri,
  goals,
  nilaiList,
  tahfidzList,
  currentRole,
  lang,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [velocityFilter, setVelocityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Evaluating state
  const [evaluatingGoalId, setEvaluatingGoalId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<GoalCategory>('Tahfidz Mutqin');
  const [targetDeadline, setTargetDeadline] = useState<string>('2027-06-30');
  const [description, setDescription] = useState<string>('');
  const [milestones, setMilestones] = useState<AcademicGoalMilestone[]>([]);
  const [isSuggestingMilestones, setIsSuggestingMilestones] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ title: string; message: string } | null>(null);

  // Quick Add Milestone modal
  const [activeGoalForNewMilestone, setActiveGoalForNewMilestone] = useState<string | null>(null);
  const [quickMilestoneTitle, setQuickMilestoneTitle] = useState<string>('');
  const [quickMilestoneDate, setQuickMilestoneDate] = useState<string>('2027-01-30');

  // Gamification state & Selected Badge Detail Modal
  const [selectedBadge, setSelectedBadge] = useState<GamificationBadge | null>(null);
  const [badgeCelebration, setBadgeCelebration] = useState<{
    badge: GamificationBadge;
    milestoneTitle: string;
  } | null>(null);

  // Filtered goals
  const santriGoals = goals.filter((g) => g.santriId === santri.id);
  const filteredGoals = santriGoals.filter((g) => {
    const matchCat = categoryFilter === 'all' || g.category === categoryFilter;
    const matchVel = velocityFilter === 'all' || g.aiFeedback?.velocityAssessment === velocityFilter;
    const matchSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.milestones.some((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchVel && matchSearch;
  });

  // Gamification Evaluation
  const gamification = evaluateGamificationBadges(santriGoals);

  // KPI Calculations
  const totalGoals = santriGoals.length;
  const onTrackGoalsCount = santriGoals.filter(
    (g) => g.aiFeedback?.velocityAssessment === 'On Track' || g.aiFeedback?.velocityAssessment === 'Ahead of Schedule'
  ).length;
  const totalMilestonesCount = santriGoals.reduce((acc, curr) => acc + curr.milestones.length, 0);
  const completedMilestonesCount = santriGoals.reduce(
    (acc, curr) => acc + curr.milestones.filter((m) => m.isCompleted).length,
    0
  );
  const avgProgress = totalGoals > 0
    ? Math.round(santriGoals.reduce((acc, curr) => acc + curr.currentProgressPercentage, 0) / totalGoals)
    : 0;

  // Toggle milestone completion
  const handleToggleMilestone = async (goal: AcademicGoal, milestoneId: string) => {
    let completedMilestoneTitle = '';
    let isMarkedDone = false;

    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextState = !m.isCompleted;
        isMarkedDone = nextState;
        completedMilestoneTitle = m.title;
        return {
          ...m,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toISOString().slice(0, 10) : undefined,
        };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const newProgressPct = updatedMilestones.length > 0
      ? Math.round((completedCount / updatedMilestones.length) * 100)
      : 0;

    let newStatus: AcademicGoal['status'] = goal.status;
    if (newProgressPct === 100) newStatus = 'Tercapai';
    else if (newProgressPct > 0) newStatus = 'Aktif';

    const updatedGoal: AcademicGoal = {
      ...goal,
      milestones: updatedMilestones,
      currentProgressPercentage: newProgressPct,
      status: newStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onUpdateGoal(updatedGoal);

    if (isMarkedDone) {
      // Check if this completion unlocked a new badge
      const previousUnlockedIds = new Set(
        evaluateGamificationBadges(santriGoals).badges.filter((b) => b.isUnlocked).map((b) => b.id)
      );

      const nextGoals = santriGoals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g));
      const nextBadges = evaluateGamificationBadges(nextGoals).badges;
      const newlyUnlockedBadge = nextBadges.find(
        (b) => b.isUnlocked && !previousUnlockedIds.has(b.id)
      );

      if (newlyUnlockedBadge) {
        setBadgeCelebration({
          badge: newlyUnlockedBadge,
          milestoneTitle: completedMilestoneTitle,
        });
      } else {
        setToastNotification({
          title: `🎉 Milestone Tercapai: "${completedMilestoneTitle}"`,
          message: `Progress sasaran bertambah menjadi ${newProgressPct}%. +120 XP keilmuan ditambahkan ke profil santri!`,
        });
        setTimeout(() => setToastNotification(null), 5000);
      }
    }

    // Run AI progress evaluation in background
    try {
      const newFeedback = await evaluateAcademicGoalProgress(updatedGoal, santri, nilaiList, tahfidzList);
      onUpdateGoal({
        ...updatedGoal,
        aiFeedback: newFeedback,
      });
    } catch (err) {
      console.warn('AI progress re-evaluation error:', err);
    }
  };

  // Run AI progress evaluation for a single goal
  const handleRunAiEvaluation = async (goal: AcademicGoal) => {
    setEvaluatingGoalId(goal.id);
    try {
      const feedback = await evaluateAcademicGoalProgress(goal, santri, nilaiList, tahfidzList);
      onUpdateGoal({
        ...goal,
        aiFeedback: feedback,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      console.error('Failed to evaluate goal with AI:', err);
    } finally {
      setEvaluatingGoalId(null);
    }
  };

  // Run AI progress evaluation for all goals
  const handleEvaluateAllGoals = async () => {
    setIsEvaluatingAll(true);
    try {
      for (const goal of santriGoals) {
        const feedback = await evaluateAcademicGoalProgress(goal, santri, nilaiList, tahfidzList);
        onUpdateGoal({
          ...goal,
          aiFeedback: feedback,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
      }
    } catch (err) {
      console.error('Failed to evaluate all goals:', err);
    } finally {
      setIsEvaluatingAll(false);
    }
  };

  // Open modal for creating or editing
  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setTitle('');
    setCategory('Tahfidz Mutqin');
    setTargetDeadline('2027-06-30');
    setDescription('');
    setMilestones([
      { id: `ms-1-${Date.now()}`, title: 'Penyelesaian Tahap Persiapan & Orientasi Awal', targetDate: '2026-11-15', isCompleted: false },
      { id: `ms-2-${Date.now()}`, title: 'Penguasaan 50% Materi & Evaluasi Ujian Tengah', targetDate: '2027-02-28', isCompleted: false },
      { id: `ms-3-${Date.now()}`, title: 'Simulasi Skala Penuh & Ujian Pra-Kelulusan', targetDate: '2027-05-15', isCompleted: false },
      { id: `ms-4-${Date.now()}`, title: 'Pencapaian Sertifikasi & Kelulusan Sasaran Akhir', targetDate: '2027-06-30', isCompleted: false },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: AcademicGoal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setCategory(goal.category);
    setTargetDeadline(goal.targetDeadline);
    setDescription(goal.description);
    setMilestones([...goal.milestones]);
    setIsModalOpen(true);
  };

  // AI Auto-suggest milestones inside modal
  const handleSuggestMilestones = async () => {
    if (!title) {
      alert('Silakan isi judul target terlebih dahulu.');
      return;
    }
    setIsSuggestingMilestones(true);
    try {
      const suggested = await suggestMilestonesForGoal(title, category, targetDeadline);
      setMilestones(suggested);
    } catch (err) {
      console.error('Failed to suggest milestones:', err);
    } finally {
      setIsSuggestingMilestones(false);
    }
  };

  // Save Modal Form
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || milestones.length === 0) return;

    const completedCount = milestones.filter((m) => m.isCompleted).length;
    const progressPct = Math.round((completedCount / milestones.length) * 100);

    if (editingGoalId) {
      const existing = goals.find((g) => g.id === editingGoalId);
      if (existing) {
        const updated: AcademicGoal = {
          ...existing,
          title,
          category,
          targetDeadline,
          description,
          milestones,
          currentProgressPercentage: progressPct,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        onUpdateGoal(updated);
        // re-run AI evaluation
        handleRunAiEvaluation(updated);
      }
    } else {
      const newGoalData: Omit<AcademicGoal, 'id' | 'createdAt' | 'updatedAt'> = {
        santriId: santri.id,
        title,
        category,
        description,
        targetDeadline,
        currentProgressPercentage: progressPct,
        status: 'Aktif',
        milestones,
      };
      onAddGoal(newGoalData);
    }

    setIsModalOpen(false);
  };

  // Quick add milestone to existing goal
  const handleAddQuickMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalForNewMilestone || !quickMilestoneTitle) return;

    const targetGoal = goals.find((g) => g.id === activeGoalForNewMilestone);
    if (!targetGoal) return;

    const newMs: AcademicGoalMilestone = {
      id: `ms-${Date.now()}`,
      title: quickMilestoneTitle,
      targetDate: quickMilestoneDate,
      isCompleted: false,
    };

    const updatedMilestones = [...targetGoal.milestones, newMs];
    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const newProgressPct = Math.round((completedCount / updatedMilestones.length) * 100);

    const updatedGoal: AcademicGoal = {
      ...targetGoal,
      milestones: updatedMilestones,
      currentProgressPercentage: newProgressPct,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onUpdateGoal(updatedGoal);
    setActiveGoalForNewMilestone(null);
    setQuickMilestoneTitle('');
  };

  // Export to CSV
  const handleExportCsv = () => {
    const rows = santriGoals.flatMap((g) =>
      g.milestones.map((m, idx) => ({
        JudulSasaran: g.title,
        Kategori: g.category,
        BatasWaktuTarget: g.targetDeadline,
        ProgresSasaranPersen: `${g.currentProgressPercentage}%`,
        EvaluasiLajuAI: g.aiFeedback?.velocityAssessment || 'Belum Dievaluasi',
        SkorKepercayaanAI: g.aiFeedback?.confidenceScore ? `${g.aiFeedback.confidenceScore}%` : '-',
        NoTahapan: idx + 1,
        NamaMilestone: m.title,
        TenggatMilestone: m.targetDate,
        StatusMilestone: m.isCompleted ? 'SELESAI' : 'BELUM',
        TanggalSelesai: m.completedAt || '-',
        CatatanMusyrif: m.notes || '-',
      }))
    );
    exportToCsv(`academic_goals_${santri.nis}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Milestone Reached / Goal Trigger */}
      {toastNotification && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-neutral-900 border border-emerald-500/50 shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{toastNotification.title}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  Tersinkronisasi
                </span>
              </h4>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                {toastNotification.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span>Target & Sasaran Belajar (Academic Goals)</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AI Milestone Tracker
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Penetapan aspirasi keilmuan jangka panjang santri, pemantauan tahapan konkret (milestones), dan pelacakan laju progres berbasis AI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Sasaran CSV</span>
          </button>

          <button
            onClick={handleEvaluateAllGoals}
            disabled={isEvaluatingAll || santriGoals.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingAll ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isEvaluatingAll ? 'Menganalisis Progres...' : 'Lacak Progres Semua Target (AI)'}</span>
          </button>

          {(currentRole === 'santri' || currentRole === 'ustaz' || currentRole === 'admin' || currentRole === 'wali') && (
            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sasaran Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Sasaran Belajar</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">{totalGoals}</div>
          <p className="text-[11px] text-neutral-400">Target Jangka Menengah & Panjang</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Sasaran On Track / Cepat</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-300">{onTrackGoalsCount}</div>
          <p className="text-[11px] text-neutral-400">Kecepatan Sesuai Lintasan AI</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-400">
            <span>Tahapan (Milestones) Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-blue-300">
            {completedMilestonesCount} / {totalMilestonesCount}
          </div>
          <p className="text-[11px] text-neutral-400">Tahapan Terverifikasi</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Rata-Rata Kemajuan</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-300">{avgProgress}%</div>
          <p className="text-[11px] text-neutral-400">Akumulasi Capaian Portofolio</p>
        </div>
      </div>

      {/* Gamification Level & Badges Showcase */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 space-y-4 shadow-xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Santri Level Progress Ring */}
            <div className="relative">
              <ProgressRing
                progress={gamification.levelProgressPct}
                size={76}
                strokeWidth={7}
                circleColorClass="text-amber-400"
                trackColorClass="text-neutral-800"
                showText={false}
                glow
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Crown className="w-4 h-4 text-amber-400 mb-0.5" />
                <span className="text-[10px] font-mono font-bold text-white leading-none">
                  LVL {gamification.currentLevel}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  Jenjang Keilmuan Santri
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {gamification.totalXp} Total XP
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                <span>{gamification.levelTitle}</span>
              </h3>
              <div className="flex items-center gap-2 mt-1.5 max-w-sm">
                <div className="w-40 sm:w-56 h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${gamification.levelProgressPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  {gamification.totalXp} / {gamification.nextLevelXp} XP
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-neutral-400 block">Lencana Terbuka</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {gamification.unlockedCount} / {gamification.badges.length} Medali
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Badges Carousel / Grid */}
        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between pb-2 text-xs">
            <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Koleksi Lencana Kehormatan Milestone Akademik (Visual Badges)</span>
            </span>
            <span className="text-[11px] text-neutral-400">
              Klik lencana untuk melihat syarat & progres
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {gamification.badges.map((badge) => {
              return (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                    badge.isUnlocked
                      ? 'bg-neutral-950/80 border-amber-500/30 hover:border-amber-400 shadow-md hover:shadow-amber-500/10'
                      : 'bg-neutral-950/40 border-neutral-800/60 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Top: Icon & Tier */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        badge.isUnlocked
                          ? 'bg-amber-400/10 border-amber-400/30 shadow-inner'
                          : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <BadgeIcon
                        iconName={badge.iconName}
                        tier={badge.colorTier}
                        isUnlocked={badge.isUnlocked}
                        sizeClass="w-5 h-5"
                      />
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${
                        badge.isUnlocked
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      +{badge.bonusXp} XP
                    </span>
                  </div>

                  {/* Middle: Badge Title */}
                  <div className="mt-2.5">
                    <h4
                      className={`text-xs font-bold leading-snug line-clamp-1 ${
                        badge.isUnlocked ? 'text-white' : 'text-neutral-400'
                      }`}
                    >
                      {badge.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 italic font-serif">
                      {badge.titleArabic}
                    </p>
                  </div>

                  {/* Bottom: Mini Progress Bar or Status */}
                  <div className="mt-2 pt-1.5 border-t border-neutral-800/60 flex items-center justify-between text-[10px]">
                    {badge.isUnlocked ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Terbuka</span>
                      </span>
                    ) : (
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
                          <span>Progres</span>
                          <span>{badge.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400/60 rounded-full"
                            style={{ width: `${badge.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          {[
            { key: 'all', label: 'Semua Kategori' },
            { key: 'Tahfidz Mutqin', label: 'Tahfidz Mutqin' },
            { key: 'Kitab Turats', label: 'Kitab Turats' },
            { key: 'Studi Lanjut Timur Tengah / PTN', label: 'Studi Lanjut' },
            { key: 'Sains & Teknologi', label: 'Sains & Tekno' },
            { key: 'Bahasa Internasional', label: 'Bahasa Asing' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                categoryFilter === cat.key
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Velocity filter */}
          <select
            value={velocityFilter}
            onChange={(e) => setVelocityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Laju AI</option>
            <option value="Ahead of Schedule">Ahead of Schedule (Lebih Cepat)</option>
            <option value="On Track">On Track (Sesuai Jadwal)</option>
            <option value="Needs Acceleration">Needs Acceleration (Perlu Percepatan)</option>
            <option value="Critical Delay">Critical Delay (Keterlambatan Kritis)</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari sasaran, tahapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Goal Cards List */}
      <div className="space-y-6">
        {filteredGoals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <Target className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-300">Belum Ada Sasaran Belajar yang Cocok</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Tetapkan target jangka panjang santri seperti khatam 30 juz bersanad, hafalan Alfiyah, atau persiapan beasiswa Al-Azhar Kairo.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sasaran Pertama</span>
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isEvaluatingThis = evaluatingGoalId === goal.id;
            const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
            const totalMs = goal.milestones.length;
            const velocity = goal.aiFeedback?.velocityAssessment || 'On Track';

            // Velocity color styling
            let velocityBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            let velocityIcon = <Clock className="w-3 h-3 text-blue-400" />;

            if (velocity === 'Ahead of Schedule') {
              velocityBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              velocityIcon = <Sparkles className="w-3 h-3 text-emerald-400" />;
            } else if (velocity === 'Needs Acceleration') {
              velocityBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              velocityIcon = <AlertTriangle className="w-3 h-3 text-amber-400" />;
            } else if (velocity === 'Critical Delay') {
              velocityBadgeClass = 'bg-red-500/10 text-red-400 border-red-500/30';
              velocityIcon = <Flame className="w-3 h-3 text-red-400" />;
            }

            return (
              <div
                key={goal.id}
                className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 transition-all space-y-5 shadow-lg relative overflow-hidden"
              >
                {/* Header of Goal Card */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                        {goal.category}
                      </span>

                      {/* Velocity Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1.5 ${velocityBadgeClass}`}
                      >
                        {velocityIcon}
                        <span>Laju AI: {velocity}</span>
                      </span>

                      {/* Confidence Score */}
                      {goal.aiFeedback?.confidenceScore && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-neutral-950 text-neutral-400 border border-neutral-800">
                          AI Confidence: {goal.aiFeedback.confidenceScore}%
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          goal.status === 'Tercapai'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {goal.status}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {goal.title}
                    </h3>

                    {goal.description && (
                      <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Target Date */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Target: <strong className="text-white">{goal.targetDeadline}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRunAiEvaluation(goal)}
                        disabled={isEvaluatingThis}
                        title="Evaluasi Ulang dengan AI"
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isEvaluatingThis ? 'animate-spin text-emerald-400' : ''}`} />
                        <span>{isEvaluatingThis ? 'Menganalisis...' : 'Lacak AI'}</span>
                      </button>

                      {(currentRole === 'ustaz' || currentRole === 'admin' || currentRole === 'santri') && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(goal)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus sasaran "${goal.title}"?`)) {
                                onDeleteGoal(goal.id);
                              }
                            }}
                            className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Ring & Summary Bar */}
                <div className="bg-neutral-950/70 p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-center gap-4">
                  {/* Visual Progress Ring */}
                  <div className="shrink-0 flex items-center gap-3">
                    <ProgressRing
                      progress={goal.currentProgressPercentage}
                      size={58}
                      strokeWidth={5.5}
                      circleColorClass={
                        goal.currentProgressPercentage === 100
                          ? 'text-cyan-400'
                          : goal.currentProgressPercentage >= 50
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                      trackColorClass="text-neutral-800"
                      glow={goal.currentProgressPercentage === 100}
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          Progres Sasaran
                        </span>
                        {goal.currentProgressPercentage === 100 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                            100% Selesai
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400">
                        {completedCount} dari {totalMs} Milestone Tuntas
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Linear Bar & Subtext */}
                  <div className="flex-1 w-full space-y-1.5 border-t sm:border-t-0 sm:border-l border-neutral-800 pt-3 sm:pt-0 sm:pl-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ketercapaian Tahapan (Milestones)</span>
                      </span>
                      <span className="font-bold font-mono text-emerald-400 text-xs">
                        {completedCount} / {totalMs} ({goal.currentProgressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${goal.currentProgressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Milestones Checklist / Stepper */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-800/80">
                    <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[10px]">
                      Daftar Tahapan Terukur (Milestones)
                    </span>
                    <button
                      onClick={() => {
                        setActiveGoalForNewMilestone(goal.id);
                        setQuickMilestoneTitle('');
                        setQuickMilestoneDate(goal.targetDeadline);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Tahapan</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {goal.milestones.map((ms, idx) => (
                      <div
                        key={ms.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          ms.isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-neutral-200'
                            : 'bg-neutral-950/70 border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleMilestone(goal, ms.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              ms.isCompleted
                                ? 'bg-emerald-500 border-emerald-400 text-neutral-950'
                                : 'border-neutral-600 hover:border-emerald-500 bg-neutral-900'
                            }`}
                          >
                            {ms.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold text-neutral-500">
                                #{idx + 1}
                              </span>
                              <span className={`text-xs font-semibold ${ms.isCompleted ? 'line-through text-neutral-400' : 'text-white'}`}>
                                {ms.title}
                              </span>
                            </div>

                            {ms.notes && (
                              <p className="text-[11px] text-neutral-400">
                                {ms.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-[11px] font-mono">
                          {ms.isCompleted ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <Award className="w-3 h-3 text-amber-400" />
                                <span>+120 XP</span>
                              </span>
                              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Tuntas ({ms.completedAt || 'Tercapai'})</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              <span>Tenggat: {ms.targetDate}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Feedback Panel */}
                {goal.aiFeedback && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-neutral-950 to-neutral-950 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Analisis Laju Progres AI (Milestone Tracking)</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Evaluasi: {goal.aiFeedback.lastEvaluatedAt}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed italic">
                      "{goal.aiFeedback.summary}"
                    </p>

                    {/* Next Milestone Highlight */}
                    {goal.aiFeedback.nextMilestoneToFocus && (
                      <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 shrink-0">
                          Fokus Terdekat
                        </span>
                        <span className="text-neutral-200 font-medium truncate">
                          {goal.aiFeedback.nextMilestoneToFocus}
                        </span>
                      </div>
                    )}

                    {/* Suggested Actions */}
                    {goal.aiFeedback.suggestedActions?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block">
                          Rekomendasi Tindakan Strategis (Suggested Actions):
                        </span>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-neutral-300">
                          {goal.aiFeedback.suggestedActions.map((act, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Create / Edit Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>{editingGoalId ? 'Edit Sasaran Belajar' : 'Buat Sasaran Belajar Baru (Academic Goal)'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 block font-medium">Judul Target / Sasaran Belajar</label>
                <input
                  type="text"
                  placeholder="Contoh: Khatam 30 Juz Al-Qur'an Mutqin & Tasmi' Akbar Bersanad"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 block font-medium">Kategori Sasaran</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GoalCategory)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tahfidz Mutqin">Tahfidz Mutqin</option>
                    <option value="Kitab Turats">Kitab Turats (Dirasah Islamiyah)</option>
                    <option value="Studi Lanjut Timur Tengah / PTN">Studi Lanjut Timur Tengah / PTN</option>
                    <option value="Sains & Teknologi">Sains & Teknologi</option>
                    <option value="Bahasa Internasional">Bahasa Internasional (Arab/Inggris)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 block font-medium">Target Tenggat Waktu (Deadline)</label>
                  <input
                    type="date"
                    value={targetDeadline}
                    onChange={(e) => setTargetDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 block font-medium">Deskripsi & Rincian Rencana</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan aspirasi keilmuan, pembimbing yang dituju, atau luaran konkret yang diharapkan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Milestones Editor */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <span>Tahapan Terukur (Milestones)</span>
                    <span className="text-[10px] text-neutral-500 font-mono">({milestones.length} Tahap)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestMilestones}
                      disabled={isSuggestingMilestones}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${isSuggestingMilestones ? 'animate-spin' : ''}`} />
                      <span>{isSuggestingMilestones ? 'Merumuskan...' : '✨ Susun Milestones AI'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMilestones([
                          ...milestones,
                          {
                            id: `ms-${Date.now()}`,
                            title: '',
                            targetDate: targetDeadline,
                            isCompleted: false,
                          },
                        ]);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {milestones.map((ms, idx) => (
                    <div
                      key={ms.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-500 text-[10px]">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Nama tahapan milestone..."
                          value={ms.title}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].title = e.target.value;
                            setMilestones(updated);
                          }}
                          className="flex-1 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                          required
                        />

                        <input
                          type="date"
                          value={ms.targetDate}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].targetDate = e.target.value;
                            setMilestones(updated);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 text-xs w-36"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setMilestones(milestones.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Catatan / indikator bukti (opsional)..."
                        value={ms.notes || ''}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[idx].notes = e.target.value;
                          setMilestones(updated);
                        }}
                        className="w-full p-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all shadow-md shadow-emerald-950/40"
                >
                  Simpan Sasaran Belajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Milestone Modal */}
      {activeGoalForNewMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tambah Tahapan Milestone Baru</span>
              </h3>
              <button
                onClick={() => setActiveGoalForNewMilestone(null)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuickMilestone} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-400 block">Deskripsi Tahapan</label>
                <input
                  type="text"
                  placeholder="Contoh: Sima'an 10 Juz bersama Musyrif"
                  value={quickMilestoneTitle}
                  onChange={(e) => setQuickMilestoneTitle(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 block">Target Tanggal Selesai</label>
                <input
                  type="date"
                  value={quickMilestoneDate}
                  onChange={(e) => setQuickMilestoneDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveGoalForNewMilestone(null)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Tahapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gamification Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                  selectedBadge.isUnlocked
                    ? 'bg-amber-400/10 border-amber-400/40 shadow-lg shadow-amber-500/20'
                    : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <BadgeIcon
                  iconName={selectedBadge.iconName}
                  tier={selectedBadge.colorTier}
                  isUnlocked={selectedBadge.isUnlocked}
                  sizeClass="w-8 h-8"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      selectedBadge.isUnlocked
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {selectedBadge.isUnlocked ? 'Lencana Terbuka' : 'Terkunci'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">
                    +{selectedBadge.bonusXp} XP
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedBadge.name}
                </h3>
                <p className="text-xs text-neutral-400 font-serif italic">
                  {selectedBadge.titleArabic}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="text-neutral-300">
                <strong className="text-neutral-200 block text-[11px] uppercase tracking-wider mb-1">
                  Deskripsi Kehormatan:
                </strong>
                <p className="text-neutral-400 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800 text-neutral-300">
                <strong className="text-neutral-200 block text-[11px] uppercase tracking-wider mb-1">
                  Syarat Ketercapaian:
                </strong>
                <p className="text-emerald-400 font-medium">
                  {selectedBadge.requirement}
                </p>
              </div>

              {selectedBadge.unlockedAt && (
                <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 font-mono">
                  Dibuka pada: <span className="text-white">{selectedBadge.unlockedAt}</span>
                </div>
              )}
            </div>

            {/* Progress bar towards badge unlock */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 text-[11px]">Kesiapan Syarat Milestone:</span>
                <span className="font-bold font-mono text-emerald-400">
                  {selectedBadge.progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${selectedBadge.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gamification Badge Unlock Celebration Modal */}
      {badgeCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-amber-500/50 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            {/* Celebration radiant ring glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/20 via-yellow-500/20 to-emerald-500/20 border-2 border-amber-400/60 flex items-center justify-center shadow-xl shadow-amber-500/30 animate-bounce">
              <BadgeIcon
                iconName={badgeCelebration.badge.iconName}
                tier={badgeCelebration.badge.colorTier}
                isUnlocked={true}
                sizeClass="w-12 h-12"
              />
            </div>

            <div className="space-y-1 relative">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/40 inline-block mb-1">
                Lencana Baru Terbuka! 🏅
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {badgeCelebration.badge.name}
              </h3>
              <p className="text-sm text-amber-300 font-serif italic">
                {badgeCelebration.badge.titleArabic}
              </p>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed px-2">
              Selamat! Keberhasilan menuntaskan milestone <strong className="text-white">"{badgeCelebration.milestoneTitle}"</strong> telah mengantarkan santri meraih gelar kehormatan ini.
            </p>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-around text-xs font-mono">
              <div>
                <span className="text-neutral-500 text-[10px] block">Bonus Penghargaan</span>
                <span className="text-amber-400 font-bold text-sm">+{badgeCelebration.badge.bonusXp} XP</span>
              </div>
              <div className="w-px h-8 bg-neutral-800" />
              <div>
                <span className="text-neutral-500 text-[10px] block">Tingkat Prestasi</span>
                <span className="text-emerald-400 font-bold text-sm uppercase">{badgeCelebration.badge.colorTier}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setBadgeCelebration(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 shadow-lg shadow-amber-950/50 transition-all"
              >
                Alhamdulillah, Lanjutkan Perjuangan!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
