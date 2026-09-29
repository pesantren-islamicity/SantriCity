import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  NilaiMataPelajaran,
  StudyPatternSummary,
  AcademicGoal,
  SmartStudyTimetable,
  SmartScheduleSlot,
  WeeklyStudyDay,
  ScheduleFocusType,
  TimeOfDaySlot,
  UserRole,
} from '../types/pesantren';
import {
  generateSmartStudyTimetable,
  generateStudyPatternSummary,
} from '../services/geminiService';
import { loadFromLocal, saveToLocal } from '../services/storageService';
import {
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Circle,
  Zap,
  Target,
  BookOpen,
  ArrowRight,
  Printer,
  Compass,
  AlertCircle,
  Lightbulb,
  Check,
  Bot,
  Plus,
  X,
  Filter,
  Layers,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';

interface SmartSchedulerPanelProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  studyPattern: StudyPatternSummary | null;
  academicGoals: AcademicGoal[];
  currentRole: UserRole;
  onOpenTutorBot?: (subjectKode: string, initialPrompt?: string) => void;
  onNavigateToPattern?: () => void;
  onNavigateToGoals?: () => void;
}

export const SmartSchedulerPanel: React.FC<SmartSchedulerPanelProps> = ({
  santri,
  nilaiList,
  studyPattern,
  academicGoals,
  currentRole,
  onOpenTutorBot,
  onNavigateToPattern,
  onNavigateToGoals,
}) => {
  const [timetable, setTimetable] = useState<SmartStudyTimetable | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<WeeklyStudyDay | 'all'>('all');
  const [selectedFocus, setSelectedFocus] = useState<ScheduleFocusType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('cards');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State for Custom Study Slot
  const [newDay, setNewDay] = useState<WeeklyStudyDay>('Senin');
  const [newTimeSlot, setNewTimeSlot] = useState<TimeOfDaySlot>('Subuh / Pagi Buta');
  const [newTimeRange, setNewTimeRange] = useState<string>('05:15 - 06:15 WIB');
  const [newFocusType, setNewFocusType] = useState<ScheduleFocusType>('Target Sasaran Akademik (Pending Goal)');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newKode, setNewKode] = useState<string>('AR-01');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTechnique, setNewTechnique] = useState<string>('Active Recall & Pomodoro 25/5');
  const [newDuration, setNewDuration] = useState<number>(60);

  // Load persisted timetable or auto-generate
  useEffect(() => {
    const cachedTimetables = loadFromLocal<Record<string, SmartStudyTimetable>>('smart_study_timetables', {});
    if (cachedTimetables[santri.id]) {
      setTimetable(cachedTimetables[santri.id]);
    } else {
      handleGenerateTimetable();
    }
  }, [santri.id]);

  const handleGenerateTimetable = async () => {
    setIsLoading(true);
    try {
      // Use existing pattern or fallback generator
      const pattern = studyPattern || (await generateStudyPatternSummary(santri, nilaiList));
      const res = await generateSmartStudyTimetable(santri, pattern, academicGoals, nilaiList);
      setTimetable(res);

      const cached = loadFromLocal<Record<string, SmartStudyTimetable>>('smart_study_timetables', {});
      cached[santri.id] = res;
      saveToLocal('smart_study_timetables', cached);
    } catch (err) {
      console.error('Failed to generate smart timetable:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = (slotId: string) => {
    if (!timetable) return;
    const updatedSlots = timetable.slots.map((s) =>
      s.id === slotId
        ? {
            ...s,
            isCompleted: !s.isCompleted,
            completedAt: !s.isCompleted ? new Date().toISOString() : undefined,
          }
        : s
    );
    const updatedTimetable = { ...timetable, slots: updatedSlots };
    setTimetable(updatedTimetable);

    const cached = loadFromLocal<Record<string, SmartStudyTimetable>>('smart_study_timetables', {});
    cached[santri.id] = updatedTimetable;
    saveToLocal('smart_study_timetables', cached);
  };

  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetable || !newTitle.trim()) return;

    const customSlot: SmartScheduleSlot = {
      id: `custom-slot-${Date.now()}`,
      day: newDay,
      timeSlot: newTimeSlot,
      timeRange: newTimeRange,
      focusType: newFocusType,
      subjectOrGoalTitle: newTitle.trim(),
      subjectKode: newKode,
      taskDescription: newTaskDesc.trim() || 'Sesi belajar mandiri terfokus santri.',
      recommendedTechnique: newTechnique,
      targetDurationMinutes: Number(newDuration),
      energyAlignment: 'Sangat Selaras (Peak Focus Match)',
      isCompleted: false,
    };

    const updatedSlots = [...timetable.slots, customSlot];
    const totalMinutes = updatedSlots.reduce((acc, curr) => acc + curr.targetDurationMinutes, 0);
    const updatedTimetable: SmartStudyTimetable = {
      ...timetable,
      slots: updatedSlots,
      totalWeeklyStudyHours: parseFloat((totalMinutes / 60).toFixed(1)),
    };

    setTimetable(updatedTimetable);
    const cached = loadFromLocal<Record<string, SmartStudyTimetable>>('smart_study_timetables', {});
    cached[santri.id] = updatedTimetable;
    saveToLocal('smart_study_timetables', cached);

    // Reset form
    setNewTitle('');
    setNewTaskDesc('');
    setIsAddModalOpen(false);
  };

  const handlePrintTimetable = () => {
    window.print();
  };

  const daysList: WeeklyStudyDay[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

  // Filter slots
  const filteredSlots = (timetable?.slots || []).filter((s) => {
    if (selectedDay !== 'all' && s.day !== selectedDay) return false;
    if (selectedFocus !== 'all' && s.focusType !== selectedFocus) return false;
    if (statusFilter === 'pending' && s.isCompleted) return false;
    if (statusFilter === 'completed' && !s.isCompleted) return false;
    return true;
  });

  const completedSlotsCount = (timetable?.slots || []).filter((s) => s.isCompleted).length;
  const totalSlotsCount = timetable?.slots?.length || 0;
  const progressPercent = totalSlotsCount > 0 ? Math.round((completedSlotsCount / totalSlotsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Smart Scheduler (Timetable Mingguan)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Chronobiology & Goal Synced
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Jadwal belajar mandiri personal santri {santri.nama} berbasis jam prima dan target pending
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintTimetable}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all flex items-center gap-1.5"
            title="Cetak Jadwal Belajar Mingguan"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Sesi</span>
          </button>

          <button
            onClick={handleGenerateTimetable}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Menyinkronkan AI...' : 'Susun Ulang AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Strategy & Synchronization Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-white">Strategi Harmonisasi Jadwal AI:</h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {timetable?.overallStrategy ||
                'Jadwal belajar mandiri diselaraskan dengan ritme energi santri, memprioritaskan penyelesaian milestone aktif pada jendela konsentrasi prima.'}
            </p>

            {/* Smart Chrono Synchronizer Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <div
                onClick={onNavigateToPattern}
                className="cursor-pointer px-2.5 py-1 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-all"
                title="Buka Analisis Pola Belajar"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Pola Jam Prima Utama: <strong>{timetable?.peakSlotUtilized || 'Subuh / Pagi Buta'}</strong></span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </div>

              <div
                onClick={onNavigateToGoals}
                className="cursor-pointer px-2.5 py-1 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-indigo-500/30 text-indigo-300 flex items-center gap-1.5 transition-all"
                title="Buka Target Akademik"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Goal Pending Terintegrasi: <strong>{academicGoals.filter(g => g.status === 'Aktif').length} Target</strong></span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </div>
            </div>
          </div>

          {/* Quick Metrics KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2.5 shrink-0 min-w-[280px]">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-medium">Beban Belajar Pekanan</span>
              <p className="text-base font-bold text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{timetable?.totalWeeklyStudyHours || 16.5} Jam</span>
              </p>
              <span className="text-[9px] text-neutral-500">{totalSlotsCount} sesi terstruktur</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-medium">Kesesuaian Kronobiologi</span>
              <p className="text-base font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{timetable?.chronobiologyAlignmentRate || 98}%</span>
              </p>
              <span className="text-[9px] text-neutral-500">Korelasi jam prima</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-medium">Penyelarasan Target Goal</span>
              <p className="text-base font-bold text-indigo-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>{timetable?.goalAlignmentRate || 95}%</span>
              </p>
              <span className="text-[9px] text-neutral-500">Milestone terakomodasi</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
              <span className="text-[10px] text-neutral-400 font-medium">Kemajuan Pekan Ini</span>
              <p className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{progressPercent}%</span>
              </p>
              <span className="text-[9px] text-neutral-500">
                {completedSlotsCount} dari {totalSlotsCount} sesi tuntas
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar for Weekly Execution */}
        <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-4">
          <div className="flex-1 bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-neutral-300 shrink-0">
            {completedSlotsCount} / {totalSlotsCount} Selesai ({progressPercent}%)
          </span>
        </div>

        {/* Smart Tips Bullets */}
        {timetable?.smartTips && timetable.smartTips.length > 0 && (
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Nasihat Produktivitas Santri Pekan Ini:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-neutral-400">
              {timetable.smartTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Navigation Bar */}
      <div className="space-y-3">
        {/* Day Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              selectedDay === 'all'
                ? 'bg-neutral-200 text-neutral-900 shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Semua Hari (Pekanan)
          </button>
          {daysList.map((day) => {
            const countForDay = (timetable?.slots || []).filter((s) => s.day === day).length;
            const completedForDay = (timetable?.slots || []).filter(
              (s) => s.day === day && s.isCompleted
            ).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedDay === day
                    ? 'bg-emerald-600 text-neutral-950 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                <span>{day}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedDay === day ? 'bg-emerald-700 text-white' : 'bg-neutral-950 text-neutral-400'
                  }`}
                >
                  {completedForDay}/{countForDay}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Focus Type & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Tipe Fokus</option>
              <option value="Target Sasaran Akademik (Pending Goal)">Target Sasaran Akademik (Goal)</option>
              <option value="Optimalisasi Pola Jam Prima (Peak Chronobiology)">Pola Jam Prima</option>
              <option value="Penguatan Celah Kurikulum (Curriculum Gap)">Celah Kurikulum</option>
              <option value="Murajaah & Konsolidasi">Murajaah & Konsolidasi</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Status Sesi</option>
              <option value="pending">Belum Selesai</option>
              <option value="completed">Selesai</option>
            </select>

            <span className="text-neutral-500 text-xs">
              Menampilkan {filteredSlots.length} sesi
            </span>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tampilan Kartu
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tampilan Ringkas
            </button>
          </div>
        </div>
      </div>

      {/* SESSIONS LIST */}
      {filteredSlots.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
          <Calendar className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-sm text-neutral-400">
            Tidak ada sesi belajar mandiri yang cocok dengan filter yang dipilih.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlots.map((slot) => {
            const isGoal = slot.focusType === 'Target Sasaran Akademik (Pending Goal)';
            const isPeak = slot.focusType === 'Optimalisasi Pola Jam Prima (Peak Chronobiology)';
            const isGap = slot.focusType === 'Penguatan Celah Kurikulum (Curriculum Gap)';
            const isReview = slot.focusType === 'Murajaah & Konsolidasi';

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  slot.isCompleted
                    ? 'bg-neutral-900/40 border-neutral-800/80 opacity-75'
                    : isGoal
                    ? 'bg-gradient-to-br from-indigo-950/20 via-neutral-900 to-neutral-900 border-indigo-500/30 shadow-sm'
                    : isPeak
                    ? 'bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-900 border-amber-500/30 shadow-sm'
                    : isGap
                    ? 'bg-gradient-to-br from-rose-950/20 via-neutral-900 to-neutral-900 border-rose-500/30 shadow-sm'
                    : 'bg-gradient-to-br from-teal-950/20 via-neutral-900 to-neutral-900 border-teal-500/30 shadow-sm'
                }`}
              >
                {/* Slot Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                      {slot.day}
                    </span>

                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {slot.timeRange}
                    </span>
                  </div>

                  {/* Focus Badge */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                        isGoal
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : isPeak
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isGap
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      }`}
                    >
                      {isGoal && <Target className="w-2.5 h-2.5" />}
                      {isPeak && <Zap className="w-2.5 h-2.5" />}
                      {isGap && <AlertCircle className="w-2.5 h-2.5" />}
                      {isReview && <BookOpen className="w-2.5 h-2.5" />}
                      <span>{slot.focusType.split('(')[0]}</span>
                    </span>

                    {slot.subjectKode && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-950 text-neutral-400 border border-neutral-800">
                        {slot.subjectKode}
                      </span>
                    )}

                    <span className="text-[10px] text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                      {slot.targetDurationMinutes} mnt
                    </span>
                  </div>

                  {/* Slot Title */}
                  <h4
                    className={`text-sm font-bold leading-snug ${
                      slot.isCompleted ? 'line-through text-neutral-400' : 'text-white'
                    }`}
                  >
                    {slot.subjectOrGoalTitle}
                  </h4>

                  {/* Linked Goal or Milestone Pill if present */}
                  {slot.linkedMilestoneTitle && (
                    <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-start gap-1.5">
                      <Target className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">Target Milestone: </strong>
                        {slot.linkedMilestoneTitle}
                      </span>
                    </div>
                  )}

                  {/* Task Description */}
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {slot.taskDescription}
                  </p>

                  {/* Recommended Technique */}
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-neutral-400">
                    <span className="font-semibold text-emerald-400">Teknik:</span>
                    <span className="text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                      {slot.recommendedTechnique}
                    </span>
                  </div>
                </div>

                {/* Slot Footer Action Toolbar */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  {/* Toggle Complete */}
                  <button
                    onClick={() => handleToggleComplete(slot.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      slot.isCompleted
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                    }`}
                  >
                    {slot.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tuntas</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" />
                        <span>Tandai Selesai</span>
                      </>
                    )}
                  </button>

                  {/* Consult Tutor Bot */}
                  {onOpenTutorBot && (
                    <button
                      onClick={() =>
                        onOpenTutorBot(
                          slot.subjectKode || 'AR-01',
                          `Bantu saya mempelajari materi ini pada sesi belajar ${slot.day} (${slot.timeRange}): "${slot.subjectOrGoalTitle}". Rekomendasikan langkah latihan praktis!`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1"
                      title="Buka materi ini di Tutor Bot AI"
                    >
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tutor Bot</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID / TABLE COMPACT VIEW */
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Hari & Jam</th>
                <th className="py-3 px-4">Fokus & Kategori</th>
                <th className="py-3 px-4">Topik / Target Belajar</th>
                <th className="py-3 px-4">Teknik Belajar</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredSlots.map((slot) => (
                <tr
                  key={slot.id}
                  className={`hover:bg-neutral-800/40 transition-colors ${
                    slot.isCompleted ? 'bg-neutral-950/40 text-neutral-500' : ''
                  }`}
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-white">{slot.day}</div>
                    <div className="text-[11px] text-emerald-400 font-mono">{slot.timeRange}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-950 border border-neutral-800 text-neutral-300 font-medium">
                      {slot.focusType.split('(')[0]}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div
                      className={`font-semibold ${
                        slot.isCompleted ? 'line-through text-neutral-500' : 'text-white'
                      }`}
                    >
                      {slot.subjectOrGoalTitle}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {slot.taskDescription}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-neutral-400">
                    {slot.recommendedTechnique}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-300">
                    {slot.targetDurationMinutes} mnt
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleToggleComplete(slot.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                        slot.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white'
                      }`}
                    >
                      {slot.isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Selesai</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3 h-3" />
                          <span>Belum</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {onOpenTutorBot && (
                      <button
                        onClick={() =>
                          onOpenTutorBot(
                            slot.subjectKode || 'AR-01',
                            `Bantu saya mempelajari topik ini: "${slot.subjectOrGoalTitle}"`
                          )
                        }
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-indigo-400 hover:text-indigo-300"
                        title="Tanya Tutor Bot"
                      >
                        <Bot className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: TAMBAH SESI BELAJAR KUSTOM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Tambah Sesi Belajar Mandiri</h3>
                  <p className="text-xs text-neutral-400">Masukkan jadwal belajar mandiri tambahan</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSlot} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Hari Belajar</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as WeeklyStudyDay)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {daysList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={newTimeRange}
                    onChange={(e) => setNewTimeRange(e.target.value)}
                    placeholder="Contoh: 05:15 - 06:15 WIB"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">Fokus Belajar</label>
                <select
                  value={newFocusType}
                  onChange={(e) => setNewFocusType(e.target.value as ScheduleFocusType)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Target Sasaran Akademik (Pending Goal)">Target Sasaran Akademik (Pending Goal)</option>
                  <option value="Optimalisasi Pola Jam Prima (Peak Chronobiology)">Optimalisasi Pola Jam Prima (Peak Chronobiology)</option>
                  <option value="Penguatan Celah Kurikulum (Curriculum Gap)">Penguatan Celah Kurikulum (Curriculum Gap)</option>
                  <option value="Murajaah & Konsolidasi">Murajaah & Konsolidasi</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">Topik / Nama Target Belajar</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Setoran Bait 510-560 Syarah Ibnu 'Aqil"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">Deskripsi Tugas / Aktivitas</label>
                <textarea
                  rows={2}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Aktivitas yang akan dikerjakan pada sesi ini..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Teknik Belajar</label>
                  <input
                    type="text"
                    value={newTechnique}
                    onChange={(e) => setNewTechnique(e.target.value)}
                    placeholder="Contoh: Feynman Method & Drill"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
