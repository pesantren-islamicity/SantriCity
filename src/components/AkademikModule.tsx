import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  NilaiMataPelajaran,
  UserRole,
  Language,
  LearningRoadmap,
  RoadmapStudyTopic,
  StudyPatternSummary,
  TimeOfDaySlot,
  AcademicGoal,
  PresensiHarian,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  GraduationCap,
  Award,
  FileSpreadsheet,
  Plus,
  BookOpen,
  Search,
  Sparkles,
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookMarked,
  RefreshCw,
  Flame,
  Check,
  Trash2,
  Target,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Zap,
  TrendingUp,
  Brain,
  Lightbulb,
  Bot,
  MessageSquare,
  Calendar,
  BarChart3,
  Layers,
} from 'lucide-react';
import { exportToCsv, loadFromLocal, saveToLocal } from '../services/storageService';
import { generateLearningRoadmap, generateStudyPatternSummary } from '../services/geminiService';
import { INITIAL_ACADEMIC_GOALS, INITIAL_PRESENSI_LIST } from '../data/mockData';
import { TutorBotPanel } from './TutorBotPanel';
import { NextLessonPanel } from './NextLessonPanel';
import { SmartSchedulerPanel } from './SmartSchedulerPanel';
import { StudyIntensityHeatmapPanel } from './StudyIntensityHeatmapPanel';

interface AkademikModuleProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  presensiList?: PresensiHarian[];
  onAddNilai: (nilai: Omit<NilaiMataPelajaran, 'id'>) => void;
  currentRole: UserRole;
  lang: Language;
  academicGoals?: AcademicGoal[];
}

export const AkademikModule: React.FC<AkademikModuleProps> = ({
  santri,
  nilaiList,
  presensiList,
  onAddNilai,
  currentRole,
  lang,
  academicGoals,
}) => {
  const t = getTranslation(lang);
  const resolvedGoals = academicGoals || loadFromLocal<AcademicGoal[]>('pesantren_academic_goals', INITIAL_ACADEMIC_GOALS);
  const resolvedPresensi =
    presensiList && presensiList.length > 0
      ? presensiList
      : loadFromLocal<PresensiHarian[]>('presensiList', INITIAL_PRESENSI_LIST).filter(
          (p) => p.santriId === santri.id
        );
  const [activeSubTab, setActiveSubTab] = useState<
    'transkrip' | 'study-intensity' | 'smart-scheduler' | 'next-lessons' | 'roadmap' | 'pattern' | 'tutorbot'
  >('transkrip');
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState<boolean>(false);

  // Pre-fill states for Tutor Bot navigation
  const [tutorBotInitialSubject, setTutorBotInitialSubject] = useState<string>('');
  const [tutorBotInitialPrompt, setTutorBotInitialPrompt] = useState<string>('');

  const handleOpenTutorBot = (subjectKode: string, initialPrompt?: string) => {
    setTutorBotInitialSubject(subjectKode);
    if (initialPrompt) {
      setTutorBotInitialPrompt(initialPrompt);
    }
    setActiveSubTab('tutorbot');
  };

  // Roadmap State
  const [roadmap, setRoadmap] = useState<LearningRoadmap | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [roadmapFilter, setRoadmapFilter] = useState<'all' | 'Tinggi' | 'Sedang' | 'Pengayaan' | 'ongoing' | 'done'>('all');

  // Study Pattern State
  const [studyPattern, setStudyPattern] = useState<StudyPatternSummary | null>(null);
  const [isGeneratingPattern, setIsGeneratingPattern] = useState<boolean>(false);

  // Form State for Nilai
  const [kode, setKode] = useState<string>('AR-02');
  const [mapel, setMapel] = useState<string>('Balaghah & Sastra Arab');
  const [kategori, setKategori] = useState<'Agama' | 'Umum' | 'Bahasa'>('Agama');
  const [guru, setGuru] = useState<string>('Ust. Hamzah Rabbani');
  const [harian, setHarian] = useState<number>(90);
  const [tugas, setTugas] = useState<number>(92);
  const [uts, setUts] = useState<number>(88);
  const [uas, setUas] = useState<number>(94);
  const [catatan, setCatatan] = useState<string>('Bagus dan aktif berdiskusi di kelas.');
  const [waktuBelajarEfektif, setWaktuBelajarEfektif] = useState<TimeOfDaySlot>('Subuh / Pagi Buta');
  const [jamPelajaran, setJamPelajaran] = useState<string>('05:30 - 06:45 WIB');
  const [hariJadwal, setHariJadwal] = useState<string>('Senin & Rabu');

  // Form State for Custom Study Topic
  const [newTopicSubjectKode, setNewTopicSubjectKode] = useState<string>('');
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicUrgensi, setNewTopicUrgensi] = useState<'Tinggi' | 'Sedang' | 'Pengayaan'>('Tinggi');
  const [newTopicAlasan, setNewTopicAlasan] = useState<string>('');
  const [newTopicTarget, setNewTopicTarget] = useState<string>('');
  const [newTopicDurasi, setNewTopicDurasi] = useState<number>(2);
  const [newTopicSumber, setNewTopicSumber] = useState<string>('');

  // Load persisted roadmap & study pattern when santri changes
  useEffect(() => {
    const cachedRoadmaps = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
    if (cachedRoadmaps && cachedRoadmaps[santri.id]) {
      setRoadmap(cachedRoadmaps[santri.id]);
    } else {
      initRoadmap();
    }

    const cachedPatterns = loadFromLocal<Record<string, StudyPatternSummary>>('study_patterns', {});
    if (cachedPatterns && cachedPatterns[santri.id]) {
      setStudyPattern(cachedPatterns[santri.id]);
    } else {
      initStudyPattern();
    }
  }, [santri.id]);

  const initStudyPattern = async () => {
    setIsGeneratingPattern(true);
    try {
      const generated = await generateStudyPatternSummary(santri, nilaiList);
      setStudyPattern(generated);
      const cached = loadFromLocal<Record<string, StudyPatternSummary>>('study_patterns', {});
      cached[santri.id] = generated;
      saveToLocal('study_patterns', cached);
    } catch (err) {
      console.error('Failed to init study pattern:', err);
    } finally {
      setIsGeneratingPattern(false);
    }
  };

  const handleRefreshStudyPattern = async () => {
    setIsGeneratingPattern(true);
    try {
      const generated = await generateStudyPatternSummary(santri, nilaiList);
      setStudyPattern(generated);
      const cached = loadFromLocal<Record<string, StudyPatternSummary>>('study_patterns', {});
      cached[santri.id] = generated;
      saveToLocal('study_patterns', cached);
    } catch (err) {
      console.error('Failed to refresh study pattern:', err);
    } finally {
      setIsGeneratingPattern(false);
    }
  };

  const initRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const generated = await generateLearningRoadmap(santri, nilaiList);
      setRoadmap(generated);
      const cached = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
      cached[santri.id] = generated;
      saveToLocal('learning_roadmaps', cached);
    } catch (err) {
      console.error('Failed to init learning roadmap:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const updated = await generateLearningRoadmap(santri, nilaiList);
      setRoadmap(updated);
      const cached = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
      cached[santri.id] = updated;
      saveToLocal('learning_roadmaps', cached);
    } catch (err) {
      console.error('Failed to re-generate learning roadmap:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleUpdateTopicStatus = (topicId: string, newStatus: RoadmapStudyTopic['status']) => {
    if (!roadmap) return;
    const updatedTopics = roadmap.topikRekomendasi.map((tp) =>
      tp.id === topicId ? { ...tp, status: newStatus } : tp
    );
    const updatedRoadmap: LearningRoadmap = {
      ...roadmap,
      topikRekomendasi: updatedTopics,
      terakhirDiperbarui: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
    };
    setRoadmap(updatedRoadmap);
    const cached = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
    cached[santri.id] = updatedRoadmap;
    saveToLocal('learning_roadmaps', cached);
  };

  const handleDeleteTopic = (topicId: string) => {
    if (!roadmap) return;
    const updatedTopics = roadmap.topikRekomendasi.filter((tp) => tp.id !== topicId);
    const updatedRoadmap: LearningRoadmap = {
      ...roadmap,
      topikRekomendasi: updatedTopics,
    };
    setRoadmap(updatedRoadmap);
    const cached = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
    cached[santri.id] = updatedRoadmap;
    saveToLocal('learning_roadmaps', cached);
  };

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmap || !newTopicTitle) return;

    const matchedSubject = nilaiList.find((n) => n.kode === newTopicSubjectKode);
    const newTopic: RoadmapStudyTopic = {
      id: `topic-custom-${Date.now()}`,
      subjectKode: newTopicSubjectKode || (nilaiList[0]?.kode || 'GEN-01'),
      subjectMapel: matchedSubject ? matchedSubject.mapel : (newTopicSubjectKode || 'Mata Pelajaran Kepesantrenan'),
      topik: newTopicTitle,
      tingkatUrgensi: newTopicUrgensi,
      alasanRekomendasi: newTopicAlasan || 'Penugasan khusus pembinaan akademik oleh guru pengampu.',
      targetKompetensi: newTopicTarget || 'Penguasaan materi lanjutan secara komprehensif.',
      durasiMinggu: Number(newTopicDurasi) || 2,
      sumberRujukan: newTopicSumber || 'Kitab Kurikulum SantriCity & Diktat Mandiri',
      status: 'Rencana',
    };

    const updatedRoadmap: LearningRoadmap = {
      ...roadmap,
      topikRekomendasi: [newTopic, ...roadmap.topikRekomendasi],
      terakhirDiperbarui: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
    };

    setRoadmap(updatedRoadmap);
    const cached = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
    cached[santri.id] = updatedRoadmap;
    saveToLocal('learning_roadmaps', cached);

    // Reset Form
    setNewTopicTitle('');
    setNewTopicAlasan('');
    setNewTopicTarget('');
    setNewTopicSumber('');
    setIsAddTopicModalOpen(false);
  };

  const filteredNilai = nilaiList.filter((item) => {
    const matchKategori = kategoriFilter === 'all' || item.kategori === kategoriFilter;
    const matchSearch =
      item.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guru.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKategori && matchSearch;
  });

  const avgAkhir = nilaiList.length
    ? (nilaiList.reduce((acc, curr) => acc + curr.akhir, 0) / nilaiList.length).toFixed(1)
    : '0.0';

  const handleSubmitNilai = (e: React.FormEvent) => {
    e.preventDefault();
    const finalScore = Number(((harian * 0.2) + (tugas * 0.2) + (uts * 0.3) + (uas * 0.3)).toFixed(1));
    let predikat: 'A' | 'B+' | 'B' | 'C' = 'A';
    if (finalScore < 75) predikat = 'C';
    else if (finalScore < 85) predikat = 'B';
    else if (finalScore < 90) predikat = 'B+';

    onAddNilai({
      santriId: santri.id,
      kode,
      mapel,
      kategori,
      guru,
      harian: Number(harian),
      tugas: Number(tugas),
      uts: Number(uts),
      uas: Number(uas),
      akhir: finalScore,
      predikat,
      catatan,
      waktuBelajarEfektif,
      jamPelajaran,
      hariJadwal,
    });
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    if (activeSubTab === 'roadmap' && roadmap) {
      const rows = roadmap.topikRekomendasi.map((tp) => ({
        KodeMapel: tp.subjectKode,
        MataPelajaran: tp.subjectMapel,
        TopikBelajar: tp.topik,
        TingkatUrgensi: tp.tingkatUrgensi,
        DurasiPekan: tp.durasiMinggu,
        AlasanRekomendasi: tp.alasanRekomendasi,
        TargetKompetensi: tp.targetKompetensi,
        SumberRujukan: tp.sumberRujukan,
        Status: tp.status,
      }));
      exportToCsv(`learning_roadmap_${santri.nis}`, rows);
      return;
    }

    if (activeSubTab === 'pattern' && studyPattern) {
      const rows = [
        ...studyPattern.topPerformingSubjects.map((s) => ({
          Kelompok: 'Mata Pelajaran Unggulan',
          Kode: s.kode,
          MataPelajaran: s.mapel,
          Kategori: s.kategori,
          NilaiRerata: s.avgScore,
          TingkatPerforma: s.performanceTier,
          WaktuBelajarTerbaik: s.bestStudySlot,
          TeknikRekomendasi: s.recommendedTechnique,
          AnalisisAI: s.notes,
        })),
        ...studyPattern.growthOpportunitySubjects.map((s) => ({
          Kelompok: 'Peluang Akselerasi',
          Kode: s.kode,
          MataPelajaran: s.mapel,
          Kategori: s.kategori,
          NilaiRerata: s.avgScore,
          TingkatPerforma: s.performanceTier,
          WaktuBelajarTerbaik: s.bestStudySlot,
          TeknikRekomendasi: s.recommendedTechnique,
          AnalisisAI: s.notes,
        })),
      ];
      exportToCsv(`study_pattern_analysis_${santri.nis}`, rows);
      return;
    }

    const rows = filteredNilai.map((n) => ({
      Kode: n.kode,
      MataPelajaran: n.mapel,
      Kategori: n.kategori,
      GuruPengampu: n.guru,
      WaktuBelajar: n.waktuBelajarEfektif || '-',
      Jadwal: n.hariJadwal || '-',
      Harian: n.harian,
      Tugas: n.tugas,
      UTS: n.uts,
      UAS: n.uas,
      NilaiAkhir: n.akhir,
      Predikat: n.predikat,
      Catatan: n.catatan,
    }));
    exportToCsv(`transkrip_akademik_${santri.nis}`, rows);
  };

  // Roadmap metrics calculations
  const totalRoadmapTopics = roadmap?.topikRekomendasi.length || 0;
  const completedTopicsCount = roadmap?.topikRekomendasi.filter((t) => t.status === 'Selesai Dipahami').length || 0;
  const inProgressTopicsCount = roadmap?.topikRekomendasi.filter((t) => t.status === 'Sedang Dipelajari').length || 0;
  const highUrgencyCount = roadmap?.topikRekomendasi.filter((t) => t.tingkatUrgensi === 'Tinggi').length || 0;
  const roadmapProgressPct = totalRoadmapTopics > 0 ? Math.round((completedTopicsCount / totalRoadmapTopics) * 100) : 0;

  const filteredTopics = (roadmap?.topikRekomendasi || []).filter((topic) => {
    if (roadmapFilter === 'all') return true;
    if (roadmapFilter === 'Tinggi') return topic.tingkatUrgensi === 'Tinggi';
    if (roadmapFilter === 'Sedang') return topic.tingkatUrgensi === 'Sedang';
    if (roadmapFilter === 'Pengayaan') return topic.tingkatUrgensi === 'Pengayaan';
    if (roadmapFilter === 'ongoing') return topic.status === 'Sedang Dipelajari';
    if (roadmapFilter === 'done') return topic.status === 'Selesai Dipahami';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.navAkademik}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {santri.kelas}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Rekapitulasi berkala capaian kurikulum kepesantrenan (Dirasah Islamiyah) dan kurikulum terpadu dilengkapi Peta Belajar Cerdas (AI Learning Roadmap).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {activeSubTab === 'roadmap'
                ? 'Ekspor Roadmap CSV'
                : activeSubTab === 'pattern'
                ? 'Ekspor Pola Belajar CSV'
                : 'Ekspor Nilai CSV'}
            </span>
          </button>

          {activeSubTab === 'pattern' && (
            <button
              onClick={handleRefreshStudyPattern}
              disabled={isGeneratingPattern}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-neutral-950 shadow-md shadow-amber-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPattern ? 'animate-spin' : ''}`} />
              <span>{isGeneratingPattern ? 'Menganalisis Pola...' : 'Analisis Ulang Pola Belajar (AI)'}</span>
            </button>
          )}

          {(currentRole === 'ustaz' || currentRole === 'admin') && activeSubTab === 'transkrip' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Input Nilai Mapel</span>
            </button>
          )}

          {activeSubTab === 'roadmap' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateRoadmap}
                disabled={isGeneratingRoadmap}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingRoadmap ? 'animate-spin' : ''}`} />
                <span>{isGeneratingRoadmap ? 'Menganalisis Nilai...' : 'Perbarui Roadmap AI'}</span>
              </button>

              {(currentRole === 'ustaz' || currentRole === 'admin') && (
                <button
                  onClick={() => {
                    setNewTopicSubjectKode(nilaiList[0]?.kode || '');
                    setIsAddTopicModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Topik</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Switcher: Transkrip Nilai vs Study Intensity vs Smart Scheduler vs Next Lessons vs AI Learning Roadmap vs Pola Belajar vs Tutor Bot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
        <button
          onClick={() => setActiveSubTab('transkrip')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'transkrip'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>Transkrip</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-950 text-neutral-300">
            {nilaiList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('study-intensity')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'study-intensity'
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 shadow-sm border border-emerald-500/40'
              : 'text-neutral-400 hover:text-emerald-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Intensitas</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            Heatmap
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('smart-scheduler')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'smart-scheduler'
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 shadow-sm border border-emerald-500/40'
              : 'text-neutral-400 hover:text-emerald-400'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Scheduler</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            <Zap className="w-2.5 h-2.5" />
            AI
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('next-lessons')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'next-lessons'
              ? 'bg-gradient-to-r from-teal-500/25 to-emerald-500/25 text-teal-300 shadow-sm border border-teal-500/40'
              : 'text-neutral-400 hover:text-teal-400'
          }`}
        >
          <Compass className="w-4 h-4 text-teal-400" />
          <span>Next Lessons</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            Gaps
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('roadmap')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'roadmap'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 shadow-sm border border-emerald-500/40'
              : 'text-neutral-400 hover:text-emerald-400'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Roadmap</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            Adaptive
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('pattern')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'pattern'
              ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 shadow-sm border border-amber-500/40'
              : 'text-neutral-400 hover:text-amber-400'
          }`}
        >
          <Brain className="w-4 h-4 text-amber-400" />
          <span>Pola Jam</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            <Zap className="w-2.5 h-2.5" />
            Peak
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('tutorbot')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'tutorbot'
              ? 'bg-gradient-to-r from-indigo-500/25 to-emerald-500/25 text-indigo-300 shadow-sm border border-indigo-500/40'
              : 'text-neutral-400 hover:text-indigo-400'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Tutor Bot</span>
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            24/7
          </span>
        </button>
      </div>

      {/* VIEW 1: TRANSKRIP & DAFTAR NILAI */}
      {activeSubTab === 'transkrip' && (
        <div className="space-y-6">
          {/* KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Rata-Rata Kumulatif (IPK)</span>
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono-numbers text-white">
                  {avgAkhir}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">Predikat Mumtaz (A)</span>
              </div>
              <p className="text-[11px] text-neutral-400">Peringkat 2 dari 34 Santri di Kelas</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Mata Pelajaran Aktif</span>
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono-numbers text-blue-400">
                  {nilaiList.length}
                </span>
                <span className="text-xs text-neutral-400">Mapel Terdaftar</span>
              </div>
              <p className="text-[11px] text-neutral-400">Dirasah Islamiyah, Sains & Bahasa</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Target Kelulusan Akademik</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono-numbers text-amber-400">
                  100%
                </span>
                <span className="text-xs text-neutral-400">Tuntas KKM</span>
              </div>
              <p className="text-[11px] text-neutral-400">Batas KKM Standar Pondok: 75.0</p>
            </div>
          </div>

          {/* Quick AI Advisor, Study Intensity, Smart Scheduler, Next Lessons, Chronobiology, & Tutor Bot Recommendation Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Study Intensity</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Heatmap
                    </span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    Visualisasi kalender produktivitas 7 sesi presensi harian & capaian nilai.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('study-intensity')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Lihat Heatmap</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Smart Scheduler AI</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Timetable
                    </span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    Jadwal belajar mandiri personal tersinkron pola jam prima & target goals.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('smart-scheduler')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal Pekanan</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-neutral-900 to-neutral-900 border border-teal-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Next Lessons AI</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-teal-500/20 text-teal-300">
                      Gaps
                    </span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    Rekomendasi topik pelajaran berikutnya & analisis kesenjangan kurikulum.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('next-lessons')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-neutral-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Rekomendasi Topik</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Learning Roadmap</span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    {roadmap?.fokusPrioritasUtama || 'Sistem AI telah merumuskan topik belajar berprioritas tinggi.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('roadmap')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Peta Belajar</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Pola Belajar Prima</span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    Waktu prima: <strong className="text-amber-300">{studyPattern?.overallPeakTime || 'Subuh / Fajar'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('pattern')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Pola Jam Prima</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-neutral-900 to-neutral-900 border border-indigo-500/20 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Ustaz AI Tutor</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      24 Jam
                    </span>
                  </h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 line-clamp-2">
                    Penjelasan konsep, ringkasan materi ujian, & kuis interaktif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('tutorbot')}
                className="w-full py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Buka Tutor</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
              {['all', 'Agama', 'Umum', 'Bahasa'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setKategoriFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    kategoriFilter === cat
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Semua Kategori' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari mata pelajaran, guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table of Grades */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Mata Pelajaran & Kode</th>
                    <th className="py-3 px-4 font-medium">Kategori</th>
                    <th className="py-3 px-4 font-medium">Waktu Belajar Efektif</th>
                    <th className="py-3 px-4 font-medium">Guru Pengampu</th>
                    <th className="py-3 px-4 font-medium text-right">Harian</th>
                    <th className="py-3 px-4 font-medium text-right">Tugas</th>
                    <th className="py-3 px-4 font-medium text-right">UTS</th>
                    <th className="py-3 px-4 font-medium text-right">UAS</th>
                    <th className="py-3 px-4 font-medium text-right">Nilai Akhir</th>
                    <th className="py-3 px-4 font-medium text-center">Predikat</th>
                    <th className="py-3 px-4 font-medium">Catatan Guru</th>
                    <th className="py-3 px-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {filteredNilai.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">
                        <div>{item.mapel}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{item.kode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-300 font-medium">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-medium">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{item.waktuBelajarEfektif || 'Subuh / Fajar'}</span>
                        </div>
                        {item.jamPelajaran && (
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {item.jamPelajaran}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {item.guru}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-neutral-300">
                        {item.harian}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-neutral-300">
                        {item.tugas}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-neutral-300">
                        {item.uts}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-neutral-300">
                        {item.uas}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-400 text-sm">
                        {item.akhir}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-xs ${
                          item.predikat === 'A'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.predikat === 'B+'
                            ? 'bg-blue-500/10 text-blue-400'
                            : item.predikat === 'B'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {item.predikat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 text-[11px] max-w-xs">
                        {item.catatan}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setActiveSubTab('roadmap');
                          }}
                          title="Lihat Rekomendasi Topik di Learning Roadmap"
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors inline-flex items-center gap-1"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Roadmap</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AI LEARNING ROADMAP */}
      {activeSubTab === 'roadmap' && (
        <div className="space-y-6">
          {/* AI Advisor Overview Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/30 border border-emerald-500/30 relative overflow-hidden space-y-5 shadow-xl">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Adaptive Pedagogical Roadmap • SantriCity 313</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Peta Belajar Cerdas Santri: {santri.nama}
                </h3>
                <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
                  {roadmap?.ringkasanStrategi ||
                    'Algoritma AI menganalisis disparitas nilai ujian harian, tugas, UTS, UAS, dan capaian tahfidz santri untuk merekomendasikan topik kajian spesifik yang memerlukan akselerasi remedial ataupun pengayaan prestasi.'}
                </p>
              </div>

              <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800 text-right shrink-0">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Status Terakhir Diperbarui
                </span>
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  {roadmap?.terakhirDiperbarui || 'Terkini'}
                </span>
              </div>
            </div>

            {/* Main Focus Box */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-emerald-500/20 flex items-start gap-3 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-emerald-300 block mb-0.5">
                  Fokus Prioritas 4 Pekan Ke Depan:
                </span>
                <p className="text-neutral-200">
                  {roadmap?.fokusPrioritasUtama || 'Penguatan konsep analitik sains eksakta serta pemantapan kaidah i\'rab nahwu terapan.'}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 pt-1">
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 block">Total Topik Rekomendasi</span>
                <span className="text-2xl font-bold font-mono text-white">{totalRoadmapTopics}</span>
                <span className="text-[10px] text-neutral-400 block">Materi Terkurasi</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-amber-400 block flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" />
                  Prioritas Tinggi
                </span>
                <span className="text-2xl font-bold font-mono text-amber-300">{highUrgencyCount}</span>
                <span className="text-[10px] text-neutral-400 block">Akselerasi Nilai</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-blue-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  Sedang Dipelajari
                </span>
                <span className="text-2xl font-bold font-mono text-blue-300">{inProgressTopicsCount}</span>
                <span className="text-[10px] text-neutral-400 block">Dalam Pembinaan</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-emerald-400 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Selesai Dipahami
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-300">{completedTopicsCount}</span>
                <span className="text-[10px] text-emerald-400 font-semibold block">{roadmapProgressPct}% Tuntas</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 relative z-10 pt-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Tingkat Ketercapaian Roadmap Belajar</span>
                <span className="font-semibold text-emerald-400">{completedTopicsCount} dari {totalRoadmapTopics} Topik ({roadmapProgressPct}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                  style={{ width: `${roadmapProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter Bar for Topics */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
              {[
                { key: 'all', label: 'Semua Topik' },
                { key: 'Tinggi', label: 'Prioritas Tinggi' },
                { key: 'Sedang', label: 'Prioritas Sedang' },
                { key: 'Pengayaan', label: 'Pengayaan Prestasi' },
                { key: 'ongoing', label: 'Sedang Dipelajari' },
                { key: 'done', label: 'Selesai Dipahami' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setRoadmapFilter(f.key as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    roadmapFilter === f.key
                      ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-neutral-400 flex items-center gap-2">
              <span>Menampilkan {filteredTopics.length} rekomendasi belajar</span>
            </div>
          </div>

          {/* Topic List Cards */}
          <div className="space-y-4">
            {filteredTopics.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <BookMarked className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400">Tidak ada topik belajar yang cocok dengan filter yang dipilih.</p>
                <button
                  onClick={() => setRoadmapFilter('all')}
                  className="px-3 py-1.5 rounded-xl text-xs bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  Tampilkan Semua Topik
                </button>
              </div>
            ) : (
              filteredTopics.map((topic, idx) => {
                const isUrgent = topic.tingkatUrgensi === 'Tinggi';
                const isEnrichment = topic.tingkatUrgensi === 'Pengayaan';
                const isDone = topic.status === 'Selesai Dipahami';
                const isInProgress = topic.status === 'Sedang Dipelajari';

                return (
                  <div
                    key={topic.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-neutral-900/60 border-neutral-800/80 opacity-90'
                        : isUrgent
                        ? 'bg-neutral-900 border-red-500/30 shadow-md shadow-red-950/20'
                        : isEnrichment
                        ? 'bg-neutral-900 border-emerald-500/30'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Main details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Subject Badge */}
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold font-mono bg-neutral-800 text-neutral-200 border border-neutral-700">
                            {topic.subjectKode} • {topic.subjectMapel}
                          </span>

                          {/* Urgency Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 ${
                              isUrgent
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : isEnrichment
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isUrgent ? (
                              <Flame className="w-3 h-3 text-red-400" />
                            ) : isEnrichment ? (
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-blue-400" />
                            )}
                            <span>{topic.tingkatUrgensi}</span>
                          </span>

                          {/* Estimated Duration */}
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] text-neutral-400 bg-neutral-950 border border-neutral-800">
                            Estimasi: {topic.durasiMinggu} Pekan Belajar
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isInProgress
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {topic.status}
                          </span>
                        </div>

                        {/* Title of topic */}
                        <div>
                          <h4 className={`text-base font-bold tracking-tight ${isDone ? 'line-through text-neutral-400' : 'text-white'}`}>
                            {topic.topik}
                          </h4>
                        </div>

                        {/* Rationale based on student performance */}
                        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Alasan Rekomendasi AI (Berdasarkan Nilai Santri):
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {topic.alasanRekomendasi}
                          </p>
                        </div>

                        {/* Competency & Reference Books */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                            <span className="text-[10px] text-neutral-400 block mb-0.5">Target Kompetensi:</span>
                            <span className="text-neutral-200 font-medium">{topic.targetKompetensi}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                            <span className="text-[10px] text-neutral-400 block mb-0.5">Sumber / Kitab Rujukan:</span>
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <BookOpen className="w-3 h-3 shrink-0" />
                              {topic.sumberRujukan}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-800">
                        {topic.status !== 'Selesai Dipahami' ? (
                          <>
                            {topic.status === 'Rencana' ? (
                              <button
                                onClick={() => handleUpdateTopicStatus(topic.id, 'Sedang Dipelajari')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5"
                              >
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                <span>Mulai Pelajari</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleUpdateTopicStatus(topic.id, 'Selesai Dipahami')}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Tandai Selesai</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateTopicStatus(topic.id, 'Sedang Dipelajari')}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Kaji Ulang (Aktifkan)</span>
                          </button>
                        )}

                        {(currentRole === 'ustaz' || currentRole === 'admin') && (
                          <button
                            onClick={() => handleDeleteTopic(topic.id)}
                            title="Hapus Rekomendasi Topik"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: AI STUDY PATTERN SUMMARY & CHRONOBIOLOGY ANALYSIS */}
      {activeSubTab === 'pattern' && (
        <div className="space-y-6">
          {/* Header Advisor Card for Study Pattern */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/30 border border-amber-500/30 relative overflow-hidden space-y-5 shadow-xl">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Study Pattern & Chronobiology Summary • SantriCity</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Pola Jam Belajar Terbaik & Kekuatan Subjek: {santri.nama}</span>
                </h3>
                <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
                  {studyPattern?.executiveSummary ||
                    'AI menganalisis korelasi antara histori nilai mata pelajaran, tipe subjek kurikulum, dan ritme biologis harian untuk mengidentifikasi jam prima (peak focus window) serta strategi belajar santri.'}
                </p>
              </div>

              <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800 text-right shrink-0">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-mono">
                  Terakhir Dianalisis
                </span>
                <span className="text-xs font-semibold text-amber-400 font-mono">
                  {studyPattern?.generatedAt || 'Tersinkronisasi'}
                </span>
              </div>
            </div>

            {/* Peak Time Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 pt-1">
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sunrise className="w-4 h-4 text-amber-400" />
                    <span>Waktu Prima Utama (Peak Window)</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono">
                    Prioritas #1
                  </span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {studyPattern?.overallPeakTime || 'Subuh / Pagi Buta'}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Retensi kognitif & konsentrasi tertinggi santri saat menyerap kaidah ilmu.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sunset className="w-4 h-4 text-emerald-400" />
                    <span>Waktu Prima Pendukung</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-mono">
                    Prioritas #2
                  </span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {studyPattern?.secondaryPeakTime || 'Sore (Halaqah Asar)'}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Optimal untuk dialog interaktif bahasa, diskusi muamalah, dan simulasi lisan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span>Karakteristik Ritme Belajar</span>
                  </span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {studyPattern?.cognitivePace || 'Reflektif & Analitis Mendalam'}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Sangat kuat dalam pemahaman kaidah terstruktur dan perumusan dalil terpadu.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Top Performing Subjects vs Growth Opportunity Subjects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Top Performing Subjects */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Mata Pelajaran Performa Tertinggi</h4>
                    <p className="text-[11px] text-neutral-400">Subjek dengan nilai ujian kumulatif paling konsisten</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Peak Mastery
                </span>
              </div>

              <div className="space-y-3">
                {studyPattern?.topPerformingSubjects && studyPattern.topPerformingSubjects.length > 0 ? (
                  studyPattern.topPerformingSubjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 hover:border-emerald-500/40 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded">
                              {sub.kode}
                            </span>
                            <span className="text-xs font-bold text-white">{sub.mapel}</span>
                          </div>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">
                            Kategori: <strong className="text-neutral-300">{sub.kategori}</strong>
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold font-mono text-emerald-400">{sub.avgScore}</span>
                          <span className="text-[10px] text-neutral-500 block">Rata-rata</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-neutral-900">
                        <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
                          <span className="text-[10px] text-neutral-400 block font-medium">Waktu Belajar Efektif:</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {sub.bestStudySlot}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
                          <span className="text-[10px] text-neutral-400 block font-medium">Teknik Terbukti Unggul:</span>
                          <span className="text-emerald-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                            <Lightbulb className="w-3 h-3" />
                            {sub.recommendedTechnique}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-300 italic bg-neutral-900/40 p-2 rounded-lg">
                        "{sub.notes}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">Belum ada data mata pelajaran.</p>
                )}
              </div>
            </div>

            {/* Right: Growth Opportunity Subjects */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Mata Pelajaran Peluang Akselerasi</h4>
                    <p className="text-[11px] text-neutral-400">Subjek potensial untuk ditingkatkan melalui optimalisasi jadwal</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Growth Target
                </span>
              </div>

              <div className="space-y-3">
                {studyPattern?.growthOpportunitySubjects && studyPattern.growthOpportunitySubjects.length > 0 ? (
                  studyPattern.growthOpportunitySubjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 hover:border-amber-500/40 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded">
                              {sub.kode}
                            </span>
                            <span className="text-xs font-bold text-white">{sub.mapel}</span>
                          </div>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">
                            Kategori: <strong className="text-neutral-300">{sub.kategori}</strong>
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold font-mono text-amber-400">{sub.avgScore}</span>
                          <span className="text-[10px] text-neutral-500 block">Rata-rata</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-neutral-900">
                        <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
                          <span className="text-[10px] text-neutral-400 block font-medium">Rekomendasi Waktu Belajar:</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Sun className="w-3 h-3" />
                            {sub.bestStudySlot}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
                          <span className="text-[10px] text-neutral-400 block font-medium">Intervensi Terarah:</span>
                          <span className="text-emerald-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                            <Lightbulb className="w-3 h-3" />
                            {sub.recommendedTechnique}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-300 italic bg-neutral-900/40 p-2 rounded-lg">
                        "{sub.notes}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">Semua mata pelajaran telah mencapai performa optimal.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: 24-Hour Time Slot Strategy Matrix */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Matriks Jadwal Waktu & Efisiensi Energi Belajar</h4>
                  <p className="text-[11px] text-neutral-400">Panduan pemilihan mata pelajaran berdasarkan fase kesiapan biologis harian santri</p>
                </div>
              </div>
              <span className="text-xs text-neutral-400 hidden sm:inline">SantriCity Chronobiology Matrix</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {studyPattern?.timeSlotRecommendations?.map((slotRec, i) => {
                const isFajar = slotRec.slot.includes('Subuh');
                const isPagi = slotRec.slot.includes('Pagi (Sekolah');
                const isSore = slotRec.slot.includes('Sore');
                const isMalam = slotRec.slot.includes('Malam');

                let slotIcon = <Sunrise className="w-4 h-4 text-amber-400" />;
                let borderAccent = 'border-amber-500/30';
                if (isPagi) {
                  slotIcon = <Sun className="w-4 h-4 text-yellow-400" />;
                  borderAccent = 'border-yellow-500/30';
                } else if (isSore) {
                  slotIcon = <Sunset className="w-4 h-4 text-orange-400" />;
                  borderAccent = 'border-orange-500/30';
                } else if (isMalam) {
                  slotIcon = <Moon className="w-4 h-4 text-indigo-400" />;
                  borderAccent = 'border-indigo-500/30';
                }

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl bg-neutral-950 border ${borderAccent} flex flex-col justify-between space-y-3 hover:border-amber-400/60 transition-all`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
                          {slotIcon}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800 font-bold">
                          {slotRec.energyLevel}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-white">{slotRec.slot}</h5>

                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-400 block font-medium">Mata Pelajaran Ideal:</span>
                        <div className="flex flex-wrap gap-1">
                          {slotRec.recommendedSubjects.map((subName, j) => (
                            <span
                              key={j}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-900 text-emerald-300 border border-neutral-800"
                            >
                              {subName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-900 text-[11px] text-neutral-300 leading-relaxed">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider mb-0.5">
                        Tips Produktivitas:
                      </span>
                      {slotRec.productivityTip}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STUDY INTENSITY HEATMAP (PRODUCTIVITY CALENDAR GRID) */}
      {activeSubTab === 'study-intensity' && (
        <StudyIntensityHeatmapPanel
          santri={santri}
          nilaiList={nilaiList}
          presensiList={resolvedPresensi}
          currentRole={currentRole}
          onNavigateToSmartScheduler={() => setActiveSubTab('smart-scheduler')}
          onOpenTutorBot={handleOpenTutorBot}
        />
      )}

      {/* VIEW: AI SMART SCHEDULER (WEEKLY STUDY TIMETABLE) */}
      {activeSubTab === 'smart-scheduler' && (
        <SmartSchedulerPanel
          santri={santri}
          nilaiList={nilaiList}
          studyPattern={studyPattern}
          academicGoals={resolvedGoals}
          currentRole={currentRole}
          onOpenTutorBot={handleOpenTutorBot}
          onNavigateToPattern={() => setActiveSubTab('pattern')}
          onNavigateToGoals={() => setActiveSubTab('smart-scheduler')}
        />
      )}

      {/* VIEW 4: AI NEXT LESSON RECOMMENDATIONS & PEER COMPARISON */}
      {activeSubTab === 'next-lessons' && (
        <NextLessonPanel
          santri={santri}
          nilaiList={nilaiList}
          currentRole={currentRole}
          onOpenTutorBot={handleOpenTutorBot}
        />
      )}

      {/* VIEW 5: TUTOR BOT AI (TANYA GURU & PENDALAMAN KURIKULUM) */}
      {activeSubTab === 'tutorbot' && (
        <TutorBotPanel
          santri={santri}
          nilaiList={nilaiList}
          initialSubjectKode={tutorBotInitialSubject}
          initialPrompt={tutorBotInitialPrompt}
        />
      )}

      {/* Modal Input Nilai Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>Input Nilai Mata Pelajaran</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNilai} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-neutral-400 block mb-1">Nama Mata Pelajaran</label>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Agama">Dirasah Islamiyah (Agama)</option>
                    <option value="Umum">Sains & Umum</option>
                    <option value="Bahasa">Bahasa (Arab & Inggris)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Guru Pengampu</label>
                  <input
                    type="text"
                    value={guru}
                    onChange={(e) => setGuru(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Harian (20%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={harian}
                    onChange={(e) => setHarian(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Tugas (20%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tugas}
                    onChange={(e) => setTugas(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">UTS (30%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={uts}
                    onChange={(e) => setUts(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">UAS (30%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={uas}
                    onChange={(e) => setUas(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Catatan Evaluasi Guru</label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Study Time Chronobiology Attributes */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Jadwal & Waktu Efektif Belajar (Chronobiology Profile)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-neutral-400 block mb-1 text-[11px]">Waktu Belajar Efektif</label>
                    <select
                      value={waktuBelajarEfektif}
                      onChange={(e) => setWaktuBelajarEfektif(e.target.value as TimeOfDaySlot)}
                      className="w-full p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="Subuh / Pagi Buta">Subuh / Pagi Buta</option>
                      <option value="Pagi (Sekolah Formal)">Pagi (Sekolah Formal)</option>
                      <option value="Siang / Ba'da Dzuhur">Siang / Ba'da Dzuhur</option>
                      <option value="Sore (Halaqah Asar)">Sore (Halaqah Asar)</option>
                      <option value="Malam (Ba'da Maghrib & Belajar Mandiri)">Malam (Ba'da Maghrib / Mandiri)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 text-[11px]">Jam Pelajaran</label>
                    <input
                      type="text"
                      placeholder="Contoh: 05:30 - 06:45 WIB"
                      value={jamPelajaran}
                      onChange={(e) => setJamPelajaran(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 text-[11px]">Hari Pertemuan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Senin & Rabu"
                      value={hariJadwal}
                      onChange={(e) => setHariJadwal(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Topik Belajar Manual (Learning Roadmap) */}
      {isAddTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Tambah Topik Roadmap Belajar Santri</span>
              </h3>
              <button
                onClick={() => setIsAddTopicModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomTopic} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Pilih Mata Pelajaran Terkait</label>
                  <select
                    value={newTopicSubjectKode}
                    onChange={(e) => setNewTopicSubjectKode(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {nilaiList.map((n) => (
                      <option key={n.id} value={n.kode}>
                        [{n.kode}] {n.mapel} (Nilai: {n.akhir})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Tingkat Prioritas Urgensi</label>
                  <select
                    value={newTopicUrgensi}
                    onChange={(e) => setNewTopicUrgensi(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tinggi">Tinggi (Akselerasi Nilai / Remedial)</option>
                    <option value="Sedang">Sedang (Penguatan Konsep)</option>
                    <option value="Pengayaan">Pengayaan (MQK / Olimpiade Sains)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Judul Topik Pembelajaran Spesifik</label>
                <input
                  type="text"
                  placeholder="Contoh: Pendalaman I'rab Bab Maf'ul Bih & Aplikasi Syarah Ibnu Aqil"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Alasan Rekomendasi Berdasarkan Capaian Santri</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Evaluasi UAS menunjukkan perlunya penguatan pada identifikasi kedudukan isim manshubat..."
                  value={newTopicAlasan}
                  onChange={(e) => setNewTopicAlasan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Target Kompetensi Capaian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Mampu menerjemah dan men-tashrif 20 kalimat kitab gundul"
                    value={newTopicTarget}
                    onChange={(e) => setNewTopicTarget(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Estimasi Durasi (Pekan)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newTopicDurasi}
                    onChange={(e) => setNewTopicDurasi(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Sumber Rujukan (Kitab / Buku Referensi)</label>
                <input
                  type="text"
                  placeholder="Contoh: Kitab Matan Alfiyah Ibnu Malik & Modul Latihan SantriCity"
                  value={newTopicSumber}
                  onChange={(e) => setNewTopicSumber(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddTopicModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Topik Belajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
