import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  NilaiMataPelajaran,
  NextLessonBatchRecommendation,
  NextLessonRecommendationItem,
  PeerComparisonSummary,
  UserRole,
} from '../types/pesantren';
import {
  generateNextLessonRecommendations,
  generatePeerComparison,
} from '../services/geminiService';
import { loadFromLocal, saveToLocal } from '../services/storageService';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Flame,
  GraduationCap,
  Users,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  Layers,
  ChevronRight,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface NextLessonPanelProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  currentRole: UserRole;
  onOpenTutorBot?: (subjectKode: string, initialPrompt?: string) => void;
}

export const NextLessonPanel: React.FC<NextLessonPanelProps> = ({
  santri,
  nilaiList,
  currentRole,
  onOpenTutorBot,
}) => {
  const [recommendations, setRecommendations] = useState<NextLessonBatchRecommendation | null>(null);
  const [peerComparison, setPeerComparison] = useState<PeerComparisonSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'gap' | 'remedial' | 'mastery' | 'pending' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'lessons' | 'peer-comparison'>('lessons');

  // Load persisted recommendations for this santri
  useEffect(() => {
    const cachedLessons = loadFromLocal<Record<string, NextLessonBatchRecommendation>>('next_lesson_recommendations', {});
    if (cachedLessons[santri.id]) {
      setRecommendations(cachedLessons[santri.id]);
    } else {
      handleGenerateRecommendations();
    }

    // Load or generate peer comparison
    const comparison = generatePeerComparison(santri, nilaiList);
    setPeerComparison(comparison);
  }, [santri.id, nilaiList]);

  const handleGenerateRecommendations = async () => {
    setIsLoading(true);
    try {
      const res = await generateNextLessonRecommendations(santri, nilaiList);
      setRecommendations(res);
      const cached = loadFromLocal<Record<string, NextLessonBatchRecommendation>>('next_lesson_recommendations', {});
      cached[santri.id] = res;
      saveToLocal('next_lesson_recommendations', cached);
    } catch (err) {
      console.error('Failed to generate next lessons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = (lessonId: string) => {
    if (!recommendations) return;
    const updatedLessons = recommendations.recommendedLessons.map((l) =>
      l.id === lessonId ? { ...l, isCompleted: !l.isCompleted } : l
    );
    const updatedBatch = { ...recommendations, recommendedLessons: updatedLessons };
    setRecommendations(updatedBatch);

    const cached = loadFromLocal<Record<string, NextLessonBatchRecommendation>>('next_lesson_recommendations', {});
    cached[santri.id] = updatedBatch;
    saveToLocal('next_lesson_recommendations', cached);
  };

  const filteredLessons = (recommendations?.recommendedLessons || []).filter((l) => {
    if (activeFilter === 'completed') return l.isCompleted;
    if (activeFilter === 'pending') return !l.isCompleted;
    if (activeFilter === 'gap') return l.gapType === 'Kesenjangan Konsep (Curriculum Gap)';
    if (activeFilter === 'remedial') return l.gapType === 'Penguatan Fondasi (Remedial & Drill)';
    if (activeFilter === 'mastery') return l.gapType === 'Akselerasi Pengayaan (Advanced Mastery)';
    return true;
  });

  const completedCount = (recommendations?.recommendedLessons || []).filter((l) => l.isCompleted).length;
  const totalCount = recommendations?.recommendedLessons.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls & Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setViewMode('lessons')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'lessons'
                ? 'bg-emerald-600 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Rekomendasi Pelajaran Berikutnya ({totalCount})</span>
          </button>
          <button
            onClick={() => setViewMode('peer-comparison')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'peer-comparison'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Peer Comparison (Rata-rata Angkatan)</span>
          </button>
        </div>

        <button
          onClick={handleGenerateRecommendations}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isLoading ? 'Menganalisis Asesmen...' : 'Perbarui Analisis Kurikulum AI'}</span>
        </button>
      </div>

      {viewMode === 'lessons' && (
        <>
          {/* Header Banner: AI Diagnosis & Curriculum Gap Summary */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Compass className="w-48 h-48 text-emerald-400" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Rekomendasi Topik Belajar Berikutnya (Next Lessons)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        AI Curriculum Gap Engine
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Disusun otomatis dari disparitas nilai harian, tugas, UTS, dan UAS santri {santri.nama}
                    </p>
                  </div>
                </div>

                {recommendations?.generatedAt && (
                  <span className="text-[11px] text-neutral-400 bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800">
                    Dianalisis: {recommendations.generatedAt}
                  </span>
                )}
              </div>

              {/* Diagnosis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Diagnosis Menyeluruh
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {recommendations?.overallDiagnosis || 'Menganalisis capaian kurikulum terkini...'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-amber-500/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Celah Kurikulum Utama
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {recommendations?.primaryCurriculumGapSummary || 'Mengidentifikasi prasyarat kompetensi...'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-indigo-500/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Saran Ritme Pacing
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {recommendations?.weeklyPacingAdvice || 'Fokuskan 45-60 menit setiap sesi.'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="flex-1 bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-xs font-semibold text-neutral-300 shrink-0 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {completedCount} dari {totalCount} Topik Selesai Dipahami ({progressPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-neutral-200 text-neutral-900 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Semua Topik ({totalCount})
            </button>
            <button
              onClick={() => setActiveFilter('gap')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'gap'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-amber-400 border border-neutral-800'
              }`}
            >
              Kesenjangan Konsep
            </button>
            <button
              onClick={() => setActiveFilter('remedial')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'remedial'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-rose-400 border border-neutral-800'
              }`}
            >
              Penguatan Fondasi (Remedial)
            </button>
            <button
              onClick={() => setActiveFilter('mastery')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'mastery'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-purple-400 border border-neutral-800'
              }`}
            >
              Akselerasi Pengayaan
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'pending'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-emerald-400 border border-neutral-800'
              }`}
            >
              Belum Selesai ({totalCount - completedCount})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'completed'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-teal-400 border border-neutral-800'
              }`}
            >
              Selesai ({completedCount})
            </button>
          </div>

          {/* Lessons List */}
          {filteredLessons.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
              <Compass className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-400">
                Tidak ada topik rekomendasi yang sesuai dengan filter yang dipilih.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLessons.map((item) => {
                const isRemedial = item.gapType === 'Penguatan Fondasi (Remedial & Drill)';
                const isMastery = item.gapType === 'Akselerasi Pengayaan (Advanced Mastery)';
                const isConceptGap = item.gapType === 'Kesenjangan Konsep (Curriculum Gap)';

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl transition-all duration-200 border ${
                      item.isCompleted
                        ? 'bg-neutral-900/40 border-neutral-800/80 opacity-75'
                        : isRemedial
                        ? 'bg-gradient-to-r from-rose-950/20 via-neutral-900 to-neutral-900 border-rose-500/30 shadow-sm'
                        : isMastery
                        ? 'bg-gradient-to-r from-purple-950/20 via-neutral-900 to-neutral-900 border-purple-500/30 shadow-sm'
                        : 'bg-gradient-to-r from-amber-950/20 via-neutral-900 to-neutral-900 border-amber-500/30 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Priority & Content */}
                      <div className="space-y-3 flex-1">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                            Prioritas #{item.priorityOrder}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                              isRemedial
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isMastery
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isRemedial && <AlertTriangle className="w-2.5 h-2.5" />}
                            {isMastery && <Flame className="w-2.5 h-2.5" />}
                            {isConceptGap && <Sparkles className="w-2.5 h-2.5" />}
                            <span>{item.gapType}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-950 text-neutral-300 border border-neutral-800">
                            [{item.subjectKode}] {item.subjectMapel}
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-950 text-neutral-300 border border-neutral-800">
                            Nilai Asesmen: <span className="text-emerald-400">{item.currentScore}</span> ({item.scoreStatus})
                          </span>
                        </div>

                        {/* Lesson Topic Title */}
                        <div>
                          <h4
                            className={`text-base font-bold ${
                              item.isCompleted ? 'line-through text-neutral-400' : 'text-white'
                            }`}
                          >
                            {item.topicTitle}
                          </h4>
                          <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                            <span className="font-semibold text-emerald-400">Target Sasaran: </span>
                            {item.lessonObjective}
                          </p>
                        </div>

                        {/* Prerequisite Gaps Identified */}
                        {item.prerequisiteGaps && item.prerequisiteGaps.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block mb-1">
                              🔍 Celah Kurikulum Terdeteksi Dari Asesmen:
                            </span>
                            <ul className="text-xs text-neutral-400 list-disc list-inside space-y-0.5">
                              {item.prerequisiteGaps.map((gap, gIdx) => (
                                <li key={gIdx}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Core Concepts Chips */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Konsep Kunci yang Dipelajari:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.coreConcepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-950 text-neutral-300 border border-neutral-800"
                              >
                                • {concept}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Reference Book & Estimated Duration */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-neutral-300 font-medium">Rujukan: </span>
                            {item.recommendedKitabOrResource}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Estimasi: {item.estimatedStudyMinutes} Menit</span>
                          </span>
                        </div>

                        {/* Suggested Pedagogical Action */}
                        <div className="text-xs text-neutral-300 bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-800/60 flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-white">Langkah Aksi: </strong>
                            {item.suggestedAction}
                          </span>
                        </div>
                      </div>

                      {/* Right Action Toolbar */}
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0">
                        {/* Toggle Completed */}
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            item.isCompleted
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {item.isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Selesai Dipahami</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5" />
                              <span>Tandai Selesai</span>
                            </>
                          )}
                        </button>

                        {/* Open in Tutor Bot */}
                        {onOpenTutorBot && (
                          <button
                            onClick={() =>
                              onOpenTutorBot(
                                item.subjectKode,
                                item.practicePrompt || `Jelaskan topik "${item.topicTitle}" pada mata pelajaran ${item.subjectMapel} secara mendalam.`
                              )
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Tanya Tutor Bot AI</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: PEER COMPARISON (ANONYMIZED COHORT BENCHMARK) */}
      {viewMode === 'peer-comparison' && peerComparison && (
        <div className="space-y-6">
          {/* Header Banner Peer Comparison */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-neutral-900 to-neutral-900 border border-indigo-500/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Analisis Peer Comparison & Rata-rata Angkatan
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      Kelas: {peerComparison.kelas}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Membandingkan capaian akademik santri terhadap agregat rata-rata {peerComparison.cohortSize} santri satu angkatan
                  </p>
                </div>
              </div>

              {/* Anonymity Shield Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-950 text-neutral-300 text-xs border border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-medium">Data Teman Sekelas Dianonimkan</span>
              </div>
            </div>

            {/* AI Cohort Insight Narrative */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-indigo-500/20 text-xs text-neutral-300 leading-relaxed">
              <span className="font-bold text-indigo-300 block mb-1">
                💡 Kesimpulan Analisis Komparatif AI:
              </span>
              {peerComparison.aiCohortInsight}
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Rata-rata Santri</span>
                <p className="text-xl font-bold text-white">{peerComparison.santriOverallAverage}</p>
                <span className="text-[10px] text-neutral-400">Skor agregat semua mapel</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Rata-rata Angkatan</span>
                <p className="text-xl font-bold text-neutral-300">{peerComparison.classOverallAverage}</p>
                <span className="text-[10px] text-neutral-400">{peerComparison.cohortSize} santri satu kelas</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Deviasi Komparatif</span>
                <p
                  className={`text-xl font-bold flex items-center gap-1 ${
                    peerComparison.overallDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {peerComparison.overallDelta >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {peerComparison.overallDelta >= 0 ? `+${peerComparison.overallDelta}` : peerComparison.overallDelta}
                </p>
                <span className="text-[10px] text-neutral-400">Poin vs rata-rata kelas</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Kedudukan Persentil</span>
                <p className="text-xl font-bold text-indigo-400">Top {100 - peerComparison.overallPercentile}%</p>
                <span className="text-[10px] text-neutral-400">Persentil ke-{peerComparison.overallPercentile} angkatan</span>
              </div>
            </div>
          </div>

          {/* Subject Benchmark Table / Cards */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Perbandingan Terperinci Tiap Mata Pelajaran</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {peerComparison.subjectsBenchmark.map((subj) => {
                const isAbove = subj.delta > 0;
                const isEven = subj.delta === 0;

                return (
                  <div
                    key={subj.kode}
                    className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{subj.mapel}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                            {subj.kode}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">Kategori: {subj.kategori}</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                          isAbove
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isEven
                            ? 'bg-neutral-800 text-neutral-300'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isAbove ? `+${subj.delta}` : subj.delta} poin
                      </span>
                    </div>

                    {/* Comparative Visual Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Skor Santri: <strong className="text-emerald-400">{subj.santriScore}</strong></span>
                        <span className="text-neutral-400">Rata-rata Kelas: <strong className="text-neutral-200">{subj.classAverage}</strong></span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-neutral-950 rounded-full h-2.5 overflow-hidden border border-neutral-800 relative">
                        {/* Class Average Marker */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-neutral-400 z-10"
                          style={{ left: `${subj.classAverage}%` }}
                          title={`Rata-rata kelas: ${subj.classAverage}`}
                        />
                        {/* Santri Progress */}
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isAbove
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-400'
                              : 'bg-gradient-to-r from-amber-600 to-rose-400'
                          }`}
                          style={{ width: `${Math.min(100, subj.santriScore)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>Terendah Kelas: {subj.classLowest}</span>
                        <span className="text-indigo-400 font-medium">Persentil: ke-{subj.percentileRank}</span>
                        <span>Tertinggi Kelas: {subj.classHighest}</span>
                      </div>
                    </div>

                    {/* Standing Pill & Action */}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-neutral-400">
                        Status: <strong className={isAbove ? 'text-emerald-400' : 'text-amber-400'}>{subj.standing}</strong>
                      </span>
                      {onOpenTutorBot && (
                        <button
                          onClick={() =>
                            onOpenTutorBot(
                              subj.kode,
                              `Bagaimana cara meningkatkan penguasaan materi ${subj.mapel} agar dapat mencapai skor maksimal?`
                            )
                          }
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                        >
                          Konsultasi Tutor Bot <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start gap-2.5 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-neutral-200">Etika & Privasi Data Santri: </strong>
              {peerComparison.anonymizedNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
