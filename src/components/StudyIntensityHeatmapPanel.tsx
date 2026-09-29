import React, { useState, useMemo } from 'react';
import {
  SantriProfile,
  NilaiMataPelajaran,
  PresensiHarian,
  UserRole,
  DailyStudyIntensity,
  StudyIntensityLevel,
  WeeklyStudyDay,
} from '../types/pesantren';
import {
  buildStudyIntensityAnalysis,
  DAY_OF_WEEK_MAP,
} from '../services/studyIntensityService';
import { exportToCsv } from '../services/storageService';
import {
  Calendar,
  Flame,
  Award,
  Clock,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Brain,
  Layers,
  BarChart3,
  Compass,
} from 'lucide-react';

interface StudyIntensityHeatmapPanelProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  presensiList?: PresensiHarian[];
  currentRole: UserRole;
  onNavigateToSmartScheduler?: () => void;
  onOpenTutorBot?: (subjectKode: string, initialPrompt?: string) => void;
}

export const StudyIntensityHeatmapPanel: React.FC<StudyIntensityHeatmapPanelProps> = ({
  santri,
  nilaiList,
  presensiList = [],
  currentRole,
  onNavigateToSmartScheduler,
  onOpenTutorBot,
}) => {
  // Filter and view states
  const [dateRange, setDateRange] = useState<30 | 60 | 90>(90);
  const [viewMode, setViewMode] = useState<'matrix' | 'monthly'>('matrix');
  const [levelFilter, setLevelFilter] = useState<'all' | 'peak' | 'normal' | 'low'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 = September (0-indexed)
  const [hoveredDay, setHoveredDay] = useState<DailyStudyIntensity | null>(null);

  // Generate complete intensity analysis
  const analysis = useMemo(() => {
    return buildStudyIntensityAnalysis(santri, presensiList, nilaiList, dateRange);
  }, [santri, presensiList, nilaiList, dateRange]);

  // Selected Day state (defaults to the latest record)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return analysis.dailyRecords.length > 0
      ? analysis.dailyRecords[analysis.dailyRecords.length - 1].date
      : '2026-09-29';
  });

  const selectedDay = useMemo(() => {
    return (
      analysis.dailyRecords.find((d) => d.date === selectedDateStr) ||
      analysis.dailyRecords[analysis.dailyRecords.length - 1] ||
      null
    );
  }, [analysis.dailyRecords, selectedDateStr]);

  // Helper color map for intensity levels
  const getLevelColorClass = (level: StudyIntensityLevel, isSelected: boolean) => {
    const ringClass = isSelected ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-neutral-950 scale-105 z-10' : '';
    switch (level) {
      case 4:
        return `bg-emerald-400 text-neutral-950 shadow-sm shadow-emerald-400/40 hover:bg-emerald-300 ${ringClass}`;
      case 3:
        return `bg-emerald-500 text-neutral-950 hover:bg-emerald-400 ${ringClass}`;
      case 2:
        return `bg-emerald-700 text-emerald-100 hover:bg-emerald-600 ${ringClass}`;
      case 1:
        return `bg-emerald-950 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900 ${ringClass}`;
      case 0:
      default:
        return `bg-neutral-900 text-neutral-500 border border-neutral-800 hover:bg-neutral-800 ${ringClass}`;
    }
  };

  // Helper background styling for the monthly big day blocks
  const getMonthlyCellBg = (level: StudyIntensityLevel, isSelected: boolean) => {
    const border = isSelected ? 'border-emerald-400 shadow-md shadow-emerald-500/20' : 'border-neutral-800/80';
    switch (level) {
      case 4:
        return `bg-gradient-to-br from-emerald-950/70 via-emerald-900/40 to-neutral-900 border ${border}`;
      case 3:
        return `bg-gradient-to-br from-emerald-950/50 to-neutral-900 border ${border}`;
      case 2:
        return `bg-neutral-900/90 border ${border}`;
      case 1:
        return `bg-neutral-900/60 border ${border}`;
      case 0:
      default:
        return `bg-neutral-950/60 border ${border}`;
    }
  };

  // Group records into matrix weeks (columns of 7 days: Monday -> Sunday)
  const matrixWeeks = useMemo(() => {
    const weeks: (DailyStudyIntensity | null)[][] = [];
    if (analysis.dailyRecords.length === 0) return weeks;

    // We align days Monday through Sunday (1: Mon, 2: Tue ... 0: Sun)
    // Order in column: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Ahad
    const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'] as WeeklyStudyDay[];

    let currentWeek: (DailyStudyIntensity | null)[] = new Array(7).fill(null);

    analysis.dailyRecords.forEach((record) => {
      // Find row index (0 = Senin, 6 = Ahad)
      const rowIndex = dayOrder.indexOf(record.dayOfWeek);

      if (rowIndex === 0 && currentWeek.some((item) => item !== null)) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null);
      }

      currentWeek[rowIndex] = record;

      if (rowIndex === 6) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null);
      }
    });

    if (currentWeek.some((item) => item !== null)) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [analysis.dailyRecords]);

  // Month labels for matrix header
  const matrixMonthLabels = useMemo(() => {
    const labels: { name: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    matrixWeeks.forEach((week, wIdx) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const parts = firstValidDay.date.split('-');
        const monthNum = parseInt(parts[1], 10);
        if (monthNum !== lastMonth) {
          lastMonth = monthNum;
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
          ];
          labels.push({ name: monthNames[monthNum - 1], weekIndex: wIdx });
        }
      }
    });

    return labels;
  }, [matrixWeeks]);

  // Filter records by selected level filter if active
  const filteredDailyRecords = useMemo(() => {
    if (levelFilter === 'peak') {
      return analysis.dailyRecords.filter((d) => d.intensityLevel >= 3);
    } else if (levelFilter === 'normal') {
      return analysis.dailyRecords.filter((d) => d.intensityLevel === 2);
    } else if (levelFilter === 'low') {
      return analysis.dailyRecords.filter((d) => d.intensityLevel <= 1);
    }
    return analysis.dailyRecords;
  }, [analysis.dailyRecords, levelFilter]);

  // Monthly Calendar Grid records for the selected month
  const monthlyGridDays = useMemo(() => {
    const year = 2026;
    const month = selectedMonth; // 6: July, 7: August, 8: September
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week index for Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const cells: { dateStr: string; record?: DailyStudyIntensity; isCurrentMonth: boolean; dayNum: number }[] = [];

    // Preceding empty/previous month cells
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ dateStr: `prev-${i}`, isCurrentMonth: false, dayNum: 0 });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const yyyy = year;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const rec = analysis.dailyRecords.find((d) => d.date === dateStr);
      cells.push({ dateStr, record: rec, isCurrentMonth: true, dayNum: day });
    }

    return cells;
  }, [selectedMonth, analysis.dailyRecords]);

  // Export to CSV handler
  const handleExportCsv = () => {
    const exportData = analysis.dailyRecords.map((d) => ({
      Tanggal: d.date,
      Hari: d.dayOfWeek,
      KalenderHijriyah: d.hijriDate || '-',
      SkorIntensitas: d.intensityScore,
      LevelIntensitas: `Level ${d.intensityLevel}`,
      StatusProduktivitas: d.productivityStatus,
      JamBelajarEfektif: `${Math.round((d.effectiveStudyMinutes / 60) * 10) / 10} jam`,
      KehadiranSubuh: d.presensiSummary.subuh,
      KehadiranSekolahPagi: d.presensiSummary.sekolahPagi,
      KehadiranHalaqahSore: d.presensiSummary.halaqahSore,
      KehadiranBelajarMalam: d.presensiSummary.belajarMalam,
      TingkatKehadiran: `${d.presensiSummary.attendanceRate}%`,
      KeteranganMusyrif: d.keterangan || '-',
    }));
    exportToCsv(`Study_Intensity_Heatmap_${santri.nis}_${santri.nama.replace(/\s+/g, '_')}`, exportData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConsultTutorBot = () => {
    if (onOpenTutorBot) {
      const prompt = `Assalamu'alaikum Tutor Bot. Berdasarkan data Study Intensity Heatmap saya, rerata intensitas belajar saya berada di level ${analysis.averageDailyIntensity}/100 dengan hari paling produktif di ${analysis.peakDayOfWeek}. Bagaimana tips menjaga konsistensi belajar dan menghindari kelelahan (burnout) saat persiapan ujian akhir?`;
      onOpenTutorBot('TF-07', prompt);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
                Study Intensity & Heatmap Produktivitas Belajar
              </h2>
            </div>
            <p className="text-sm text-neutral-400">
              Fusi matematis presensi 7 sesi harian pesantren & rekam capaian asesmen mata pelajaran
              santri untuk memetakan ritme belajar produktif.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-400">
              <span className="font-medium text-neutral-200">{santri.nama}</span>
              <span aria-hidden="true">·</span>
              <span>NIS {santri.nis}</span>
              <span aria-hidden="true">·</span>
              <span>Kelas {santri.kelas} · {santri.asrama} ({santri.kamar})</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">{analysis.periodLabel}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Unduh data riwayat intensitas belajar dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Cetak Laporan Kalender Heatmap"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-400" />
              <span>Cetak</span>
            </button>
            {onNavigateToSmartScheduler && (
              <button
                onClick={onNavigateToSmartScheduler}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm shadow-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Buka Smart Scheduler</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* METRIC HIGHLIGHT CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Current Streak */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Rentang Produktif</span>
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-neutral-100">{analysis.currentStreakDays}</span>
            <span className="text-xs text-neutral-400">hari berturut</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">Sedang Berjalan</div>
        </div>

        {/* Longest Streak */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Rekor Streak</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-neutral-100">{analysis.longestStreakDays}</span>
            <span className="text-xs text-neutral-400">hari</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Rekor Semester Ganjil</div>
        </div>

        {/* Average Intensity */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Rerata Intensitas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400">{analysis.averageDailyIntensity}</span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Level 3 (Tinggi)</div>
        </div>

        {/* Total Study Hours */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Jam Belajar Efektif</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-neutral-100">{analysis.totalStudyHours}</span>
            <span className="text-xs text-neutral-400">jam</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">KBM, Halaqah, Malam</div>
        </div>

        {/* Peak Day of Week */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Hari Paling Prima</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-lg font-bold text-neutral-100 truncate">
            {analysis.peakDayOfWeek}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Pola Kronobiologi</div>
        </div>

        {/* Score Lift Correlation */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Korelasi Nilai</span>
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-400">+{analysis.correlationInsight.scoreLiftPercentage}%</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Peningkatan Nilai Ujian</div>
        </div>
      </div>

      {/* Burnout Warning Banner (if detected) */}
      {analysis.burnoutWarning && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-300">Peringatan Manajemen Energi Santri (Sunnah Balance)</div>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              {analysis.burnoutWarning}
            </p>
          </div>
        </div>
      )}

      {/* CONTROLS & FILTER BAR */}
      <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            onClick={() => setViewMode('matrix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              viewMode === 'matrix'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriks Mingguan</span>
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              viewMode === 'monthly'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalender Bulanan</span>
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-500 hidden sm:inline mr-1">Rentang:</span>
          {[
            { label: '30 Hari', value: 30 },
            { label: '60 Hari', value: 60 },
            { label: '90 Hari (Semester)', value: 90 },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value as 30 | 60 | 90)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                dateRange === r.value
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Intensity Level Legend Bar */}
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="text-[11px] text-neutral-500">Rendah</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3.5 h-3.5 rounded bg-neutral-900 border border-neutral-800"
              title="Level 0: Istirahat / Minimal (<20)"
            />
            <span
              className="w-3.5 h-3.5 rounded bg-emerald-950 border border-emerald-800/40"
              title="Level 1: Ringan (20-44)"
            />
            <span
              className="w-3.5 h-3.5 rounded bg-emerald-700"
              title="Level 2: Produktif (45-71)"
            />
            <span
              className="w-3.5 h-3.5 rounded bg-emerald-500"
              title="Level 3: Tinggi (72-89)"
            />
            <span
              className="w-3.5 h-3.5 rounded bg-emerald-400 shadow-sm shadow-emerald-400/50"
              title="Level 4: Puncak Produktivitas (90-100)"
            />
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">Puncak</span>
        </div>
      </div>

      {/* MAIN VISUALIZATION AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: HEATMAP GRID (MATRIX OR MONTHLY) */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'matrix' ? (
            /* ================= VIEW 1: MATRIX MINGGUAN (GITHUB-STYLE HEATMAP) ================= */
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 overflow-x-auto shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-neutral-200">
                    Matriks Intensitas Belajar Harian (GitHub Contribution Grid)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Klik salah satu kotak tanggal untuk menginspeksi rincian 7 sesi presensi dan capaian akademik.
                  </p>
                </div>
                {/* Level Quick Filter Buttons */}
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setLevelFilter('all')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      levelFilter === 'all'
                        ? 'bg-neutral-800 text-neutral-100 font-medium'
                        : 'text-neutral-400 hover:text-neutral-300'
                    }`}
                  >
                    Semua ({analysis.dailyRecords.length})
                  </button>
                  <button
                    onClick={() => setLevelFilter('peak')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      levelFilter === 'peak'
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                        : 'text-neutral-400 hover:text-neutral-300'
                    }`}
                  >
                    Puncak (L3-4: {analysis.levelDistribution.level3Count + analysis.levelDistribution.level4Count})
                  </button>
                  <button
                    onClick={() => setLevelFilter('low')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      levelFilter === 'low'
                        ? 'bg-neutral-800 text-neutral-300 font-medium'
                        : 'text-neutral-400 hover:text-neutral-300'
                    }`}
                  >
                    Istirahat (L0-1: {analysis.levelDistribution.level0Count + analysis.levelDistribution.level1Count})
                  </button>
                </div>
              </div>

              {/* Grid Container */}
              <div className="min-w-[620px]">
                {/* Month Labels Row */}
                <div className="flex text-[11px] text-neutral-400 mb-2 pl-9">
                  {matrixWeeks.map((_, idx) => {
                    const label = matrixMonthLabels.find((m) => m.weekIndex === idx);
                    return (
                      <div key={idx} className="w-5 text-left shrink-0">
                        {label ? <span className="font-semibold text-neutral-300">{label.name}</span> : null}
                      </div>
                    );
                  })}
                </div>

                {/* Day Rows (Senin to Ahad) */}
                <div className="flex flex-col gap-1.5">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'].map((dayName, rowIdx) => {
                    // Only show label on Senin, Rabu, Jumat to avoid clutter
                    const showDayLabel = rowIdx === 0 || rowIdx === 2 || rowIdx === 4;
                    return (
                      <div key={dayName} className="flex items-center gap-1.5">
                        <span className="w-7 text-[10px] text-neutral-400 font-mono text-right shrink-0">
                          {showDayLabel ? dayName.slice(0, 3) : ''}
                        </span>

                        {/* Week Cells for this day */}
                        <div className="flex items-center gap-1.5">
                          {matrixWeeks.map((week, wIdx) => {
                            const dayRecord = week[rowIdx];
                            if (!dayRecord) {
                              return (
                                <div
                                  key={`empty-${wIdx}-${rowIdx}`}
                                  className="w-4 h-4 rounded-[4px] bg-neutral-950/40 border border-neutral-900/60"
                                />
                              );
                            }

                            const isSelected = selectedDateStr === dayRecord.date;
                            const isDimmed =
                              levelFilter === 'peak'
                                ? dayRecord.intensityLevel < 3
                                : levelFilter === 'normal'
                                ? dayRecord.intensityLevel !== 2
                                : levelFilter === 'low'
                                ? dayRecord.intensityLevel > 1
                                : false;

                            return (
                              <button
                                key={dayRecord.date}
                                onClick={() => setSelectedDateStr(dayRecord.date)}
                                onMouseEnter={() => setHoveredDay(dayRecord)}
                                onMouseLeave={() => setHoveredDay(null)}
                                className={`w-4 h-4 rounded-[4px] transition-all transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${getLevelColorClass(
                                  dayRecord.intensityLevel,
                                  isSelected
                                )} ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                                aria-label={`${dayRecord.dayOfWeek}, ${dayRecord.date}: Skor ${dayRecord.intensityScore} (${dayRecord.productivityStatus})`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Hover Tooltip Bar */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 min-h-[30px]">
                {hoveredDay ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200">
                      {hoveredDay.dayOfWeek}, {hoveredDay.date}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-bold">Skor {hoveredDay.intensityScore}/100</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-300">{hoveredDay.productivityStatus}</span>
                    <span aria-hidden="true">·</span>
                    <span>{Math.round((hoveredDay.effectiveStudyMinutes / 60) * 10) / 10} jam belajar</span>
                  </div>
                ) : (
                  <span className="text-neutral-500 italic">
                    Arahkan kursor atau sentuh sel kotak untuk intisari harian cepat.
                  </span>
                )}
                <span className="text-[11px] text-neutral-500 font-mono">
                  {analysis.totalDays} Total Hari Terpetakan
                </span>
              </div>
            </div>
          ) : (
            /* ================= VIEW 2: KALENDER BULANAN (MONTHLY CALENDAR GRID) ================= */
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-sm space-y-4">
              {/* Month Switcher Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-neutral-200">
                    Kalender Presensi & Produktivitas Belajar
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Tampilan kalender resmi bulanan dengan detail status per tanggal.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedMonth((prev) => Math.max(6, prev - 1))}
                    disabled={selectedMonth <= 6}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-neutral-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-neutral-200 px-2 min-w-[110px] text-center">
                    {selectedMonth === 6 && 'Juli 2026'}
                    {selectedMonth === 7 && 'Agustus 2026'}
                    {selectedMonth === 8 && 'September 2026'}
                  </span>
                  <button
                    onClick={() => setSelectedMonth((prev) => Math.min(8, prev + 1))}
                    disabled={selectedMonth >= 8}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-neutral-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers (Senin -> Ahad) */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-neutral-400 pb-1 border-b border-neutral-800">
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
                <span>Ahd</span>
              </div>

              {/* Monthly Cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthlyGridDays.map((cell, idx) => {
                  if (!cell.isCurrentMonth || !cell.record) {
                    return (
                      <div
                        key={`month-empty-${idx}`}
                        className="h-20 rounded-xl bg-neutral-950/40 border border-neutral-900/60 p-2 opacity-30"
                      />
                    );
                  }

                  const rec = cell.record;
                  const isSelected = selectedDateStr === rec.date;

                  return (
                    <button
                      key={rec.date}
                      onClick={() => setSelectedDateStr(rec.date)}
                      className={`h-20 rounded-xl p-2 flex flex-col justify-between text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${getMonthlyCellBg(
                        rec.intensityLevel,
                        isSelected
                      )}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-emerald-300' : 'text-neutral-200'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            rec.intensityLevel === 4
                              ? 'bg-emerald-400 text-neutral-950'
                              : rec.intensityLevel === 3
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : rec.intensityLevel === 2
                              ? 'bg-neutral-800 text-neutral-300'
                              : 'text-neutral-500'
                          }`}
                        >
                          {rec.intensityScore}
                        </span>
                      </div>

                      {/* Mini session indicator dots */}
                      <div className="flex items-center gap-1 my-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.presensiSummary.sekolahPagi === 'Hadir'
                              ? 'bg-emerald-400'
                              : rec.presensiSummary.sekolahPagi === 'Sakit'
                              ? 'bg-rose-500'
                              : 'bg-neutral-700'
                          }`}
                          title={`Sekolah Pagi: ${rec.presensiSummary.sekolahPagi}`}
                        />
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.presensiSummary.halaqahSore === 'Hadir'
                              ? 'bg-emerald-400'
                              : 'bg-neutral-700'
                          }`}
                          title={`Halaqah Sore: ${rec.presensiSummary.halaqahSore}`}
                        />
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.presensiSummary.belajarMalam === 'Hadir'
                              ? 'bg-sky-400'
                              : 'bg-neutral-700'
                          }`}
                          title={`Belajar Malam: ${rec.presensiSummary.belajarMalam}`}
                        />
                      </div>

                      {/* Bottom Activity Tag / Status */}
                      <div className="truncate text-[10px] text-neutral-400">
                        {rec.academicActivities.length > 0 ? (
                          <span className="text-emerald-300/90 font-medium">
                            {rec.academicActivities[0].title.split(':')[0]}
                          </span>
                        ) : (
                          <span className="text-neutral-500">{rec.productivityStatus}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CORRELATION & ANALYTICS CARD */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  Analisis Korelasi: Intensitas Belajar vs Capaian Nilai Asesmen
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                +{analysis.correlationInsight.scoreLiftPercentage}% Skor Lebih Tinggi
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {analysis.correlationInsight.narrative}
            </p>

            {/* Visual comparative bars */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Hari Intensitas Tinggi (Level 3 & 4)</span>
                  <span className="font-bold text-emerald-400">
                    Rerata: {analysis.correlationInsight.highIntensityDaysScoreAvg} / 100
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysis.correlationInsight.highIntensityDaysScoreAvg}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Hari Reguler / Rendah (Level 0 - 2)</span>
                  <span className="font-bold text-neutral-300">
                    Rerata: {analysis.correlationInsight.normalDaysScoreAvg} / 100
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-neutral-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysis.correlationInsight.normalDaysScoreAvg}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Level Distribution breakdown */}
            <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
              <span>Distribusi Hari:</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Puncak: {analysis.levelDistribution.level4Count} hari</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Tinggi: {analysis.levelDistribution.level3Count} hari</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                  <span>Produktif: {analysis.levelDistribution.level2Count} hari</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                  <span>Istirahat: {analysis.levelDistribution.level0Count + analysis.levelDistribution.level1Count} hari</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSPECTOR DRAWER / DETAIL PANEL FOR SELECTED DAY */}
        <div className="space-y-4">
          {selectedDay ? (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-sm space-y-5">
              {/* Header of selected day */}
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                    Detail Hari Terpilih
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {selectedDay.hijriDate}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-100">
                  {selectedDay.dayOfWeek}, {selectedDay.date}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      selectedDay.intensityLevel === 4
                        ? 'bg-emerald-400 text-neutral-950'
                        : selectedDay.intensityLevel === 3
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedDay.intensityLevel === 2
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    Level {selectedDay.intensityLevel}: {selectedDay.productivityStatus}
                  </span>
                  <span className="text-xs text-neutral-400">
                    Skor: <strong className="text-neutral-200">{selectedDay.intensityScore}/100</strong>
                  </span>
                </div>
              </div>

              {/* Key Metrics of this day */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Jam Belajar Efektif</div>
                  <div className="text-base font-bold text-neutral-100 mt-0.5">
                    {Math.round((selectedDay.effectiveStudyMinutes / 60) * 10) / 10} Jam
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400">Tingkat Kehadiran</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {selectedDay.presensiSummary.attendanceRate}%
                  </div>
                </div>
              </div>

              {/* 7 Daily Pesantren Sessions Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Presensi 7 Sesi Harian Pesantren
                </h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Subuh (Kajian Fajar)', status: selectedDay.presensiSummary.subuh },
                    { label: 'Dhuha & Wirid', status: selectedDay.presensiSummary.dhuha },
                    { label: 'Sekolah Pagi (KBM Formal)', status: selectedDay.presensiSummary.sekolahPagi },
                    { label: 'Ashar Berjamaah', status: selectedDay.presensiSummary.ashar },
                    { label: 'Halaqah Sore (Tahfidz/Diniyyah)', status: selectedDay.presensiSummary.halaqahSore },
                    { label: 'Maghrib - Isya', status: selectedDay.presensiSummary.maghribIsya },
                    { label: "Belajar Malam (Muthola'ah)", status: selectedDay.presensiSummary.belajarMalam },
                  ].map((sesi) => (
                    <div
                      key={sesi.label}
                      className="p-2 rounded-xl bg-neutral-950/50 border border-neutral-850 flex items-center justify-between"
                    >
                      <span className="text-neutral-300">{sesi.label}</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          sesi.status === 'Hadir'
                            ? 'text-emerald-400'
                            : sesi.status === 'Masbuk'
                            ? 'text-amber-400'
                            : sesi.status === 'Sakit'
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {sesi.status === 'Hadir' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : sesi.status === 'Sakit' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{sesi.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic Activities & Assessments on this day */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Aktivitas & Asesmen Terjadwal
                </h4>
                {selectedDay.academicActivities.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDay.academicActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-200">{act.title}</span>
                          {act.score !== undefined && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Nilai: {act.score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>{act.timeSlot || `${act.durationMinutes} menit`}</span>
                          {act.subjectKode && <span>Kode: {act.subjectKode}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 text-xs text-neutral-400 text-center">
                    Tidak ada jadwal ujian khusus atau asesmen formal di hari ini.
                  </div>
                )}
              </div>

              {/* Notes from Musyrif / Asatidz */}
              {selectedDay.keterangan && (
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Catatan Musyrif & Evaluasi
                  </div>
                  <p className="text-xs text-neutral-300 italic leading-relaxed">
                    "{selectedDay.keterangan}"
                  </p>
                </div>
              )}

              {/* Action Buttons for this day */}
              <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
                {onOpenTutorBot && (
                  <button
                    onClick={handleConsultTutorBot}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Konsultasikan Ritme dengan Tutor Bot AI</span>
                  </button>
                )}
                {onNavigateToSmartScheduler && (
                  <button
                    onClick={onNavigateToSmartScheduler}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Jadwalkan Target Belajar Berikutnya</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center text-neutral-400 text-xs">
              Pilih tanggal pada matriks atau kalender untuk melihat analisis detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
