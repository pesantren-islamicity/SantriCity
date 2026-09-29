import React, { useState, useMemo } from 'react';
import {
  SantriProfile,
  GrowthMilestone,
  GrowthMilestoneCategory,
  GrowthMilestoneStage,
  GrowthMilestoneStatus,
  UserRole,
} from '../types/pesantren';
import {
  INITIAL_GROWTH_MILESTONES,
  calculateSantriTenureSummary,
} from '../data/growthMilestonesData';
import { loadFromLocal, saveToLocal } from '../services/storageService';
import {
  Compass,
  Award,
  BookOpen,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Printer,
  ChevronRight,
  Filter,
  Check,
  X,
  Target,
  Trophy,
  Heart,
  Star,
  Layers,
  ArrowUpRight,
  Radio,
  Bell,
} from 'lucide-react';
import { triggerMilestonePushNotification } from '../services/pushNotificationService';

interface GrowthTimelineSectionProps {
  santri: SantriProfile;
  currentRole: UserRole;
  onNavigateTab?: (tab: string) => void;
  onOpenPushSimulator?: () => void;
}

export const GrowthTimelineSection: React.FC<GrowthTimelineSectionProps> = ({
  santri,
  currentRole,
  onNavigateTab,
  onOpenPushSimulator,
}) => {
  const storageKey = `pesantren_growth_milestones_${santri.id}`;

  // Persisted milestones state
  const [milestones, setMilestones] = useState<GrowthMilestone[]>(() => {
    const saved = loadFromLocal<GrowthMilestone[] | null>(storageKey, null);
    if (saved && saved.length > 0) return saved;
    // Filter initial milestones matching santri or fallback to snt-001
    const matching = INITIAL_GROWTH_MILESTONES.filter((m) => m.santriId === santri.id);
    return matching.length > 0 ? matching : INITIAL_GROWTH_MILESTONES.filter((m) => m.santriId === 'snt-001');
  });

  // Calculate Tenure Summary
  const tenureSummary = useMemo(() => {
    return calculateSantriTenureSummary(santri, milestones);
  }, [santri, milestones]);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  // Modal States
  const [selectedMilestone, setSelectedMilestone] = useState<GrowthMilestone | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State for Adding Milestone
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<GrowthMilestoneCategory>('Tahfidz');
  const [newStage, setNewStage] = useState<GrowthMilestoneStage>('Kelas 11');
  const [newAcademicYear, setNewAcademicYear] = useState<string>('2026/2027');
  const [newDateFormatted, setNewDateFormatted] = useState<string>('Oktober 2026');
  const [newDateSort, setNewDateSort] = useState<string>('2026-10-15');
  const [newStatus, setNewStatus] = useState<GrowthMilestoneStatus>('Tercapai');
  const [newAchievement, setNewAchievement] = useState<string>('');
  const [newMentor, setNewMentor] = useState<string>('Ust. Ahmad Fauzan');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSkills, setNewSkills] = useState<string>('Tahfidz Mutqin, Fashahah, Tajwid');

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    return milestones
      .filter((m) => (selectedCategory === 'all' ? true : m.category === selectedCategory))
      .filter((m) => (selectedStage === 'all' ? true : m.stage === selectedStage))
      .sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  }, [milestones, selectedCategory, selectedStage]);

  // Group milestones by Stage (Kelas 10, Kelas 11, Kelas 12)
  const groupedMilestones = useMemo(() => {
    const groups: {
      stage: GrowthMilestoneStage;
      academicYear: string;
      label: string;
      sublabel: string;
      items: GrowthMilestone[];
    }[] = [
      {
        stage: 'Kelas 10',
        academicYear: '2024/2025',
        label: 'Tahun I · Fondasi & Pembentukan Karakter',
        sublabel: 'Matrikulasi makhorijul huruf, penguatan adab asrama, dan dasar kitab kuning',
        items: filteredMilestones.filter((m) => m.stage === 'Kelas 10'),
      },
      {
        stage: 'Kelas 11',
        academicYear: '2025/2026 - 2026/2027',
        label: 'Tahun II · Akselerasi & Penguasaan Kompetensi (Tahap Saat Ini)',
        sublabel: 'Ziyadah tahfidz intensif, hafalan Alfiyah, dan partisipasi olimpiade sains',
        items: filteredMilestones.filter((m) => m.stage === 'Kelas 11'),
      },
      {
        stage: 'Kelas 12',
        academicYear: '2026/2027',
        label: 'Tahun III · Pemantapan Sanad & Studi Lanjut Perguruan Tinggi',
        sublabel: 'Ujian pra-sanad 30 juz, wisuda kaffah, dan persiapan beasiswa internasional',
        items: filteredMilestones.filter((m) => m.stage === 'Kelas 12'),
      },
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [filteredMilestones]);

  // Handler Add Milestone
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEntry: GrowthMilestone = {
      id: `ms-custom-${Date.now()}`,
      santriId: santri.id,
      title: newTitle.trim(),
      category: newCategory,
      stage: newStage,
      academicYear: newAcademicYear,
      dateFormatted: newDateFormatted,
      dateSort: newDateSort,
      status: newStatus,
      progressPercentage: newStatus === 'Sedang Berjalan' ? 50 : undefined,
      achievementMetric: newAchievement.trim() || undefined,
      mentorOrEvaluator: newMentor.trim() || 'Ustaz Pembimbing',
      description: newDescription.trim() || 'Pencapaian tonggak penting santri dalam kurikulum kepesantrenan.',
      keySkillsGained: newSkills.split(',').map((s) => s.trim()).filter(Boolean),
    };

    const updated = [...milestones, newEntry];
    setMilestones(updated);
    saveToLocal(storageKey, updated);
    setIsAddModalOpen(false);

    // Trigger Browser Push Notification if milestone reached
    if (newStatus === 'Tercapai') {
      triggerMilestonePushNotification({
        id: `ms-push-${newEntry.id}`,
        title: `🎉 Milestone Santri Tercapai: ${newEntry.title}`,
        body: `Maa syaa Allah! Ananda ${santri.nama} (${newEntry.stage}) berhasil menuntaskan milestone ${newEntry.category}. Evaluator: ${newEntry.mentorOrEvaluator}.`,
        data: {
          santriId: santri.id,
          santriName: santri.nama,
          type: 'milestone_reached',
          url: 'goals',
        },
      });
    }

    // Reset Form
    setNewTitle('');
    setNewAchievement('');
    setNewDescription('');
  };

  // Helper get Category Icon & Color
  const getCategoryTheme = (category: GrowthMilestoneCategory) => {
    switch (category) {
      case 'Tahfidz':
        return {
          icon: BookOpen,
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          badgeBg: 'bg-emerald-500/15 text-emerald-300',
        };
      case 'Akademik':
        return {
          icon: GraduationCap,
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/20',
          badgeBg: 'bg-blue-500/15 text-blue-300',
        };
      case 'Prestasi':
        return {
          icon: Trophy,
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          badgeBg: 'bg-amber-500/15 text-amber-300',
        };
      case 'Adab & Ubudiyah':
      default:
        return {
          icon: Star,
          bg: 'bg-teal-500/10',
          text: 'text-teal-400',
          border: 'border-teal-500/20',
          badgeBg: 'bg-teal-500/15 text-teal-300',
        };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden space-y-0">
      {/* HEADER SECTION */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Growth Timeline: Perjalanan Santri</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/25">
                Tenure Milestone Tracker
              </span>
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Rekam jejak komprehensif perkembangan akademik, capaian tahfidz, dan prestasi sejak awal masuk hingga proyeksi kelulusan.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-400">
            <span className="text-neutral-200 font-semibold">{santri.nama}</span>
            <span aria-hidden="true">·</span>
            <span>Angkatan {santri.angkatan}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">Masa Khidmah: {tenureSummary.tenureDuration}</span>
            <span aria-hidden="true">·</span>
            <span>Target Wisuda: {tenureSummary.projectedGraduationDate}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === 'timeline' ? 'grid' : 'timeline')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Ganti tampilan timeline atau kartu"
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>{viewMode === 'timeline' ? 'Tampilan Kartu' : 'Tampilan Garis Waktu'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Cetak Portofolio Rekam Jejak Santri"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-400" />
            <span>Cetak CV Santri</span>
          </button>

          {onOpenPushSimulator && (
            <button
              onClick={onOpenPushSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 rounded-xl transition-colors border border-emerald-500/30 focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Buka Push Notification Simulator (Notification API)"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Push Simulator</span>
            </button>
          )}

          {(currentRole === 'ustaz' || currentRole === 'admin' || currentRole === 'santri') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm shadow-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Milestone</span>
            </button>
          )}
        </div>
      </div>

      {/* TENURE PROGRESS SUMMARY RIBBON */}
      <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border-b border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Tenure Period */}
        <div className="space-y-1">
          <div className="text-[11px] text-neutral-400 font-medium">Masa Belajar di Pondok</div>
          <div className="text-xl font-bold font-mono text-white">{tenureSummary.tenureDuration}</div>
          <div className="text-[11px] text-neutral-400">
            Masuk: <strong className="text-neutral-300">{tenureSummary.entryDate}</strong>
          </div>
        </div>

        {/* Metric 2: Completed Milestones */}
        <div className="space-y-1">
          <div className="text-[11px] text-neutral-400 font-medium">Pencapaian Tonggak</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-400">{tenureSummary.completedMilestones}</span>
            <span className="text-xs text-neutral-400">/ {tenureSummary.totalMilestones} Selesai</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${tenureSummary.completionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Tahfidz Acceleration */}
        <div className="space-y-1">
          <div className="text-[11px] text-neutral-400 font-medium">Laju Tahfidz Kumulatif</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-400">{tenureSummary.tahfidzJuzProgress.current}</span>
            <span className="text-xs text-neutral-400">/ {tenureSummary.tahfidzJuzProgress.target} Juz</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">Ahead of Schedule (+1.8 Juz/bln)</div>
        </div>

        {/* Metric 4: Academic Progress Trajectory */}
        <div className="space-y-1">
          <div className="text-[11px] text-neutral-400 font-medium">Lintasan Rerata Rapor</div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span className="text-neutral-400">{tenureSummary.gpaProgress.year1}</span>
            <span className="text-neutral-600">→</span>
            <span className="text-neutral-300">{tenureSummary.gpaProgress.year2}</span>
            <span className="text-neutral-600">→</span>
            <span className="text-emerald-400 text-base">{tenureSummary.gpaProgress.current}</span>
          </div>
          <div className="text-[11px] text-neutral-400">Predikat A Istiqomah</div>
        </div>
      </div>

      {/* FILTER & CATEGORY TOGGLE BAR */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3">
        {/* Category Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'Semua Milestone' },
            { id: 'Tahfidz', label: "Tahfidz Al-Qur'an" },
            { id: 'Akademik', label: 'Akademik & Sains' },
            { id: 'Prestasi', label: 'Prestasi & MQK' },
            { id: 'Adab & Ubudiyah', label: 'Adab & Ubudiyah' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selectedCategory === cat.id
                  ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-400 text-[11px] hidden sm:inline">Jenjang Kelas:</span>
          {['all', 'Kelas 10', 'Kelas 11', 'Kelas 12'].map((stg) => (
            <button
              key={stg}
              onClick={() => setSelectedStage(stg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedStage === stg
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800'
              }`}
            >
              {stg === 'all' ? 'Semua' : stg}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TIMELINE CONTENT AREA */}
      <div className="p-6">
        {groupedMilestones.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-neutral-800 text-neutral-400">
              <Compass className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-200">Tidak ada milestone yang sesuai dengan filter.</p>
            <p className="text-xs text-neutral-400">Pilih kategori atau jenjang kelas lain untuk melihat rekam jejak.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedMilestones.map((group, groupIdx) => (
              <div key={group.stage} className="space-y-5">
                {/* Stage Header Banner */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-200">
                    {groupIdx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{group.label}</span>
                      <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {group.academicYear}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">{group.sublabel}</p>
                  </div>
                </div>

                {/* Timeline Nodes Container */}
                <div className="relative pl-6 sm:pl-8 border-l-2 border-neutral-800 space-y-6 ml-4">
                  {group.items.map((milestone) => {
                    const theme = getCategoryTheme(milestone.category);
                    const CategoryIcon = theme.icon;
                    const isCompleted = milestone.status === 'Tercapai';
                    const isInProgress = milestone.status === 'Sedang Berjalan';

                    return (
                      <div
                        key={milestone.id}
                        onClick={() => setSelectedMilestone(milestone)}
                        className={`relative group cursor-pointer transition-all ${
                          milestone.isHighlight ? 'scale-[1.01]' : ''
                        }`}
                      >
                        {/* Timeline Node Icon Indicator */}
                        <div
                          className={`absolute -left-[35px] sm:-left-[43px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${
                            isCompleted
                              ? 'bg-emerald-950 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/20'
                              : isInProgress
                              ? 'bg-amber-950 border-amber-400 text-amber-300 animate-pulse shadow-md shadow-amber-500/20'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-400 border-dashed'
                          }`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>

                        {/* Milestone Card */}
                        <div
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            milestone.isHighlight
                              ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                              : isCompleted
                              ? 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                              : isInProgress
                              ? 'bg-amber-950/20 border-amber-500/30'
                              : 'bg-neutral-950/40 border-neutral-800/60 border-dashed opacity-85'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${theme.badgeBg} ${theme.border}`}
                              >
                                {milestone.category}
                              </span>
                              <span className="text-xs text-neutral-400 font-mono font-medium">
                                {milestone.dateFormatted}
                              </span>
                              {milestone.isHighlight && (
                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Tonggak Utama
                                </span>
                              )}
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Tercapai
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                  Sedang Berjalan ({milestone.progressPercentage}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-700">
                                  <Target className="w-3.5 h-3.5" />
                                  Proyeksi Target
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="space-y-1.5">
                            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {milestone.title}
                            </h4>
                            <p className="text-xs text-neutral-300 leading-relaxed">
                              {milestone.description}
                            </p>
                          </div>

                          {/* In-progress progress bar */}
                          {isInProgress && milestone.progressPercentage && (
                            <div className="space-y-1 my-3">
                              <div className="flex justify-between text-[11px] text-neutral-400">
                                <span>Kemajuan Pencapaian Saat Ini</span>
                                <span className="text-amber-300 font-bold font-mono">{milestone.progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${milestone.progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Bottom Metadata & Skills */}
                          <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
                            <div className="space-y-1">
                              {milestone.achievementMetric && (
                                <div className="text-neutral-200">
                                  Capaian/Nilai: <strong className="text-emerald-400">{milestone.achievementMetric}</strong>
                                </div>
                              )}
                              <div className="text-[11px]">
                                Penguji / Pembimbing: <span className="text-neutral-300">{milestone.mentorOrEvaluator}</span>
                              </div>
                            </div>

                            {/* Key Skills */}
                            <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
                              {milestone.keySkillsGained.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: MILESTONE DETAIL INSPECTOR */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Detail Tonggak Capaian Santri</h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {selectedMilestone.dateFormatted} · {selectedMilestone.stage}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedMilestone.category}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  Tahun Ajaran: {selectedMilestone.academicYear}
                </span>
              </div>

              <h4 className="text-base font-bold text-white leading-snug">
                {selectedMilestone.title}
              </h4>

              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
                {selectedMilestone.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                  <div className="text-[11px] text-neutral-400">Predikat / Skor Capaian:</div>
                  <div className="font-bold text-emerald-400 text-sm">
                    {selectedMilestone.achievementMetric || 'Lulus Memenuhi Kriteria Kaffah'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                  <div className="text-[11px] text-neutral-400">Penguji / Musyrif:</div>
                  <div className="font-bold text-neutral-200 truncate">
                    {selectedMilestone.mentorOrEvaluator}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-semibold text-neutral-300">Kompetensi yang Terbentuk:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMilestone.keySkillsGained.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-200 border border-neutral-700"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMilestone(null);
                    if (onNavigateTab) onNavigateTab('target-akademik');
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <span>Lihat Modul Target Belajar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    triggerMilestonePushNotification({
                      id: `ms-push-${selectedMilestone.id}-${Date.now()}`,
                      title: `🎉 Milestone Santri: ${selectedMilestone.title}`,
                      body: `Ananda ${santri.nama} (${selectedMilestone.stage}) menuntaskan tonggak ${selectedMilestone.category}. Capaian: ${selectedMilestone.achievementMetric || 'Mumtaz'}. Pembimbing: ${selectedMilestone.mentorOrEvaluator}.`,
                      data: {
                        santriId: santri.id,
                        santriName: santri.nama,
                        type: 'milestone_reached',
                        url: 'goals',
                      },
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  title="Picu Push Notification API (Browser Native & Banner Toast)"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Picu Push Notifikasi</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedMilestone(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MILESTONE FORM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Milestone Rekam Jejak Santri</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Judul Tonggak Capaian:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Tasmi' 10 Juz Sekali Duduk / Medali Emas OSN"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Kategori:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as GrowthMilestoneCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tahfidz">Tahfidz Al-Qur'an</option>
                    <option value="Akademik">Akademik & Kitab</option>
                    <option value="Prestasi">Prestasi & Lomba</option>
                    <option value="Adab & Ubudiyah">Adab & Ubudiyah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Tingkat Kelas:</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as GrowthMilestoneStage)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Kelas 10">Kelas 10 (Fondasi)</option>
                    <option value="Kelas 11">Kelas 11 (Akselerasi)</option>
                    <option value="Kelas 12">Kelas 12 (Wisuda)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Bulan/Tahun:</label>
                  <input
                    type="text"
                    required
                    value={newDateFormatted}
                    onChange={(e) => setNewDateFormatted(e.target.value)}
                    placeholder="Contoh: Okt 2026"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Tanggal Sort:</label>
                  <input
                    type="date"
                    required
                    value={newDateSort}
                    onChange={(e) => setNewDateSort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Status:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as GrowthMilestoneStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tercapai">Tercapai</option>
                    <option value="Sedang Berjalan">Sedang Berjalan</option>
                    <option value="Proyeksi Masa Depan">Target Depan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Capaian/Skor:</label>
                  <input
                    type="text"
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    placeholder="Contoh: Mumtaz (Tajwid 95)"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Penguji/Asatidz:</label>
                  <input
                    type="text"
                    value={newMentor}
                    onChange={(e) => setNewMentor(e.target.value)}
                    placeholder="Contoh: Ust. Ahmad Fauzan"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Deskripsi Singkat:</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ceritakan proses dan evaluasi pencapaian santri..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Kompetensi Terbentuk (Pisahkan Koma):
                </label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="Tahfidz, Tajwid, Fashahah"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-emerald-400 hover:bg-emerald-300 text-neutral-950 transition-colors shadow-sm"
                >
                  Simpan Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
