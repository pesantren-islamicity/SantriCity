import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  AITahfidzPlannerPlan,
  DailyHalaqahRoutineGoal,
} from '../types/pesantren';
import { generateAITahfidzPlan } from '../services/tahfidzPlannerService';
import { loadFromLocal, saveToLocal } from '../services/storageService';
import {
  Sparkles,
  Calendar,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sliders,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  ShieldCheck,
  Heart,
  Volume2,
  Mic,
  Award,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';

interface AITahfidzPlannerPanelProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  onOpenAudioRecorder?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AITahfidzPlannerPanel: React.FC<AITahfidzPlannerPanelProps> = ({
  santri,
  tahfidzList,
  onOpenAudioRecorder,
  onNavigateToTab,
}) => {
  const storageKey = `tahfidz_plan_${santri.id}`;

  // Configuration state
  const [targetJuz, setTargetJuz] = useState<number>(santri.targetJuz || 30);
  const [remainingDays, setRemainingDays] = useState<number>(65);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(6);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Plan state
  const [plan, setPlan] = useState<AITahfidzPlannerPlan | null>(() => {
    return loadFromLocal<AITahfidzPlannerPlan | null>(storageKey, null);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTodayDone, setIsTodayDone] = useState<boolean>(false);

  // Active subview in planner: 'today' | 'roadmap' | 'ai-insights'
  const [activeView, setActiveView] = useState<'today' | 'roadmap' | 'ai-insights'>('today');

  const loadPlan = async (isForced = false) => {
    setIsLoading(true);
    try {
      if (!isForced) {
        const cached = loadFromLocal<AITahfidzPlannerPlan | null>(storageKey, null);
        if (cached && cached.santriId === santri.id) {
          setPlan(cached);
          setIsLoading(false);
          return;
        }
      }

      const generated = await generateAITahfidzPlan(
        santri,
        tahfidzList,
        targetJuz,
        remainingDays,
        daysPerWeek
      );
      setPlan(generated);
    } catch (err) {
      console.warn('Error loading AI Tahfidz Plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(false);
  }, [santri.id]);

  const handleRecalculate = (e: React.FormEvent) => {
    e.preventDefault();
    loadPlan(true);
    setShowConfig(false);
  };

  const getVelocityColor = (status: AITahfidzPlannerPlan['velocityStatus']) => {
    switch (status) {
      case 'Optimal & Realistis':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'Akselerasi Tinggi':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'Santai (Bisa Dinaikkan)':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'Perlu Penyesuaian Beban':
      default:
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    }
  };

  const renderSessionIcon = (waktu: DailyHalaqahRoutineGoal['waktu']) => {
    switch (waktu) {
      case 'Subuh':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'Ashar':
        return <Sunset className="w-4 h-4 text-orange-400" />;
      case 'Maghrib/Malam':
      default:
        return <Moon className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (!plan) {
    return (
      <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-sm text-neutral-300">Menyusun AI Tahfidz Planner personal untuk ananda...</p>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((plan.currentCapaianJuz / plan.targetJuz) * 100));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top AI Planner Hero Card */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-5">
          {/* Header Title & Config Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-neutral-950 shrink-0 shadow-lg shadow-emerald-950/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    AI Tahfidz Planner & Target Harian
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getVelocityColor(plan.velocityStatus)}`}>
                    {plan.velocityStatus}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Proyeksi akselerasi ziyadah & murajaah berbasis sisa hari semester menuju target {plan.targetJuz} Juz
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5"
                title="Sesuaikan Target Juz & Sisa Hari Semester"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi Target</span>
              </button>

              <button
                onClick={() => loadPlan(true)}
                disabled={isLoading}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors disabled:opacity-50"
                title="Perbarui Analisis AI"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Interactive Simulator Bar (Collapsible) */}
          {showConfig && (
            <form
              onSubmit={handleRecalculate}
              className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 space-y-3 animate-fadeIn"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kustomisasi Parameter Semester & Target Santri</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Target Juz Akhir Semester</label>
                  <select
                    value={targetJuz}
                    onChange={(e) => setTargetJuz(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  >
                    {[15, 20, 25, 30].map((num) => (
                      <option key={num} value={num}>
                        {num} Juz Al-Qur'an
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Sisa Hari Semester</span>
                    <span className="font-mono text-emerald-400 font-bold">{remainingDays} Hari</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    step={5}
                    value={remainingDays}
                    onChange={(e) => setRemainingDays(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Hari Belajar Aktif / Pekan</label>
                  <select
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  >
                    <option value={5}>5 Hari / Pekan</option>
                    <option value={6}>6 Hari / Pekan (Standar Asrama)</option>
                    <option value={7}>7 Hari / Pekan (Intensif)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-1 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-colors shadow-xs"
                >
                  Hitung Ulang Rencana AI
                </button>
              </div>
            </form>
          )}

          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Metric 1: Capaian vs Target */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="text-[11px] text-neutral-400">Capaian Saat Ini</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-white">{plan.currentCapaianJuz}</span>
                <span className="text-xs text-neutral-400 font-medium">/ {plan.targetJuz} Juz</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-neutral-400">
                Sisa: <strong className="text-amber-300 font-mono">{plan.remainingJuz} Juz</strong> ({progressPercent}%)
              </div>
            </div>

            {/* Metric 2: Target Halaman per Hari */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="text-[11px] text-neutral-400">Target Ziyadah Harian</div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {plan.requiredHalamanPerHari}
                </span>
                <span className="text-xs text-neutral-300 font-medium">Halaman / Hari</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                Setara ~{plan.requiredBarisPerHari} Baris Mushaf Madinah
              </p>
            </div>

            {/* Metric 3: Target Murajaah Harian */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="text-[11px] text-neutral-400">Target Murajaah Harian</div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-teal-400">
                  {plan.recommendedMurajaahJuzPerHari}
                </span>
                <span className="text-xs text-neutral-300 font-medium">Juz / Hari</span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Menjaga kemutqinan hafalan lama
              </p>
            </div>

            {/* Metric 4: Sisa Waktu & Kelayakan */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
              <div className="text-[11px] text-neutral-400">Kelayakan Target Semester</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-amber-400">
                  {plan.feasibilityScore}
                </span>
                <span className="text-xs text-neutral-400">/ 100</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                {plan.remainingDaysInSemester} Hari ({plan.totalEffectiveStudyDays} Hari Aktif)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Switcher between Planner Views */}
      <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveView('today')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeView === 'today'
              ? 'bg-neutral-800 text-emerald-300 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Target Halaqah Hari Ini</span>
        </button>

        <button
          onClick={() => setActiveView('roadmap')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeView === 'roadmap'
              ? 'bg-neutral-800 text-emerald-300 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Peta Jalan Mingguan ({plan.weeklyRoadmap.length} Pekan)</span>
        </button>

        <button
          onClick={() => setActiveView('ai-insights')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeView === 'ai-insights'
              ? 'bg-neutral-800 text-emerald-300 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Strategi & Nasihat AI</span>
        </button>
      </div>

      {/* VIEW 1: TODAY'S RECITATION TARGET & HALAQAH ROUTINES */}
      {activeView === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Today's Target Card (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Target Setoran Hari Ini
                  </h4>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTodayDone(!isTodayDone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isTodayDone
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isTodayDone ? 'Tuntas Disetor' : 'Tandai Selesai'}</span>
                </button>
              </div>
            </div>

            {/* Target Surah Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-neutral-950 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                  Ziyadah Hafalan Baru
                </div>
                <div className="text-base font-bold text-white">
                  Q.S. {plan.todayGoal.targetSurah}
                </div>
                <div className="text-xs text-neutral-300">
                  Fokus: <strong className="text-emerald-300">{plan.todayGoal.targetAyat}</strong> (Juz {plan.todayGoal.targetJuz})
                </div>
              </div>

              {onOpenAudioRecorder && (
                <button
                  onClick={onOpenAudioRecorder}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-950/40 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Rekam audio tilawah setoran hari ini"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Rekam Tilawah</span>
                </button>
              )}
            </div>

            {/* 3 Halaqah Sessions (Subuh, Ashar, Maghrib/Malam) */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Pembagian Ritme Halaqah 3 Sesi Harian:
              </div>

              {plan.todayGoal.jadwalSesi.map((sesi, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/90 space-y-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        {renderSessionIcon(sesi.waktu)}
                      </div>
                      <span className="text-xs font-bold text-white">
                        Sesi {sesi.waktu} · {sesi.tipe}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">{sesi.targetAyat}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400">{sesi.durasiMenit} Menit</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/60 leading-relaxed">
                    💡 <strong>Panduan:</strong> {sesi.panduanMetode}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Today's Murajaah & Mnemonic Tips (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Murajaah Target Card */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Target Murajaah Hari Ini
                </h4>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-xs font-bold text-teal-300">
                  {plan.todayGoal.targetMurajaahHariIni}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Alokasikan waktu setelah Sholat Ashar untuk mengulang juz hafalan lama sebelum beranjak ke setoran baru.
                </p>
              </div>

              {/* Mnemonic / Daily AI Tip */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200/90 space-y-1 leading-relaxed">
                <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tips Hafalan AI Hari Ini:</span>
                </div>
                <p className="text-neutral-300 text-[11px] italic">
                  "{plan.todayGoal.tipsHafalanHariIni}"
                </p>
              </div>
            </div>

            {/* Quick Strategy Digest */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Konsistensi & Penjagaan
                </h4>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                {plan.aiRecommendations.strategiMenghafal}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY TAHFIDZ ROADMAP */}
      {activeView === 'roadmap' && (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Peta Jalan Mingguan Semester Ganjil 2026/2027</span>
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Rencana bertahap pekanan untuk menuntaskan {plan.remainingJuz} Juz tersisa
              </p>
            </div>

            <span className="text-xs text-emerald-400 font-mono font-semibold">
              Total {plan.weeklyRoadmap.length} Pekan Belajar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plan.weeklyRoadmap.map((pekan) => (
              <div
                key={pekan.pekanKe}
                className={`p-4 rounded-xl border transition-all space-y-2 ${
                  pekan.status === 'Sedang Berjalan'
                    ? 'bg-neutral-950 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-neutral-950/60 border-neutral-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-neutral-800 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                      {pekan.pekanKe}
                    </span>
                    <span className="text-xs font-bold text-white">
                      Pekan Ke-{pekan.pekanKe}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      pekan.status === 'Sedang Berjalan'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {pekan.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-neutral-200 font-medium">
                    🎯 <strong>Target Ziyadah:</strong> {pekan.targetZiyadahJuz}
                  </div>
                  <div className="text-neutral-400">
                    🔄 <strong>Murajaah:</strong> {pekan.targetMurajaahJuz}
                  </div>
                  <div className="text-emerald-400/90 text-[11px]">
                    ✨ <strong>Fokus Tajwid:</strong> {pekan.fokusTajwid}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-[11px] text-neutral-400 font-mono">
                  <span>Beban: ~{pekan.totalHalamanPekanIni} Halaman</span>
                  <span>{pekan.jadwalTasmiPekan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: AI PEDAGOGICAL STRATEGY & ADVICE */}
      {activeView === 'ai-insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Metode Murajaah Spiral */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Metode Murajaah Spiral
              </h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              {plan.aiRecommendations.metodeMurajaah}
            </p>
          </div>

          {/* Card 2: Jadwal Tikrar Optimal */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-teal-400">
              <Clock className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Jadwal Pengulangan (Tikrar)
              </h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              {plan.aiRecommendations.jadwalTikrarOptimal}
            </p>
          </div>

          {/* Card 3: Nasihat Wali Santri */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-rose-400">
              <Heart className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Bimbingan untuk Orang Tua / Wali
              </h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              {plan.aiRecommendations.catatanUntukWali}
            </p>
          </div>

          {/* Card 4: Arahan Musyrif Halaqah */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Award className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Arahan untuk Asatidz Musyrif
              </h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              {plan.aiRecommendations.catatanUntukMusyrif}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
