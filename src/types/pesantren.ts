export type UserRole = 'wali' | 'santri' | 'ustaz' | 'medis' | 'keuangan' | 'admin';

export type Language = 'id' | 'en' | 'ar';

export interface SantriProfile {
  id: string;
  nis: string; // Nomor Induk Santri
  nama: string;
  namaArab?: string;
  kamar: string;
  asrama: string;
  kelas: string;
  angkatan: string;
  waliNama: string;
  waliNoHp: string;
  waliHubungan: string;
  fotoUrl: string;
  status: 'Aktif' | 'Izin Pulang' | 'Di Poskestren' | 'Alumni';
  poinDisiplin: number; // base 100
  targetJuz: number;
  capaianJuz: number;
  golonganDarah: string;
  alergi: string[];
}

export interface TahfidzEntry {
  id: string;
  santriId: string;
  tanggal: string;
  waktu: 'Subuh' | 'Ashar' | 'Maghrib' | 'Malam';
  tipe: 'Ziyadah' | 'Murajaah' | 'Tasmi\'';
  surah: string;
  surahNomor: number;
  ayatMulai: number;
  ayatSelesai: number;
  juz: number;
  kelancaran: 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul' | 'Sedang Ditinjau';
  tajwid: number; // 0 - 100
  catatanMusyrif: string;
  musyrifNama: string;
  // Audio recording & Ustaz verification fields
  audioUrl?: string;
  audioDurationSeconds?: number;
  statusVerifikasi?: 'Menunggu Verifikasi Ustaz' | 'Terverifikasi Mumtaz' | 'Terverifikasi' | 'Perlu Perbaikan (Remedial)';
  catatanSantri?: string;
  diverifikasiOleh?: string;
  diverifikasiPada?: string;
}

export type TimeOfDaySlot = 'Subuh / Pagi Buta' | 'Pagi (Sekolah Formal)' | 'Siang / Ba\'da Dzuhur' | 'Sore (Halaqah Asar)' | 'Malam (Ba\'da Maghrib & Belajar Mandiri)';

export interface SubjectPerformanceInsight {
  kode: string;
  mapel: string;
  kategori: 'Agama' | 'Umum' | 'Bahasa';
  avgScore: number;
  performanceTier: 'Unggul / Mahir (Peak)' | 'Stabil Baik' | 'Perlu Pendampingan';
  bestStudySlot: TimeOfDaySlot;
  recommendedTechnique: string;
  notes: string;
}

export interface StudyPatternSummary {
  santriId: string;
  overallPeakTime: TimeOfDaySlot;
  secondaryPeakTime: TimeOfDaySlot;
  cognitivePace: 'Reflektif & Analitis Mendalam' | 'Cepat & Tangkas Terstruktur' | 'Komprehensif Holistik';
  executiveSummary: string;
  topPerformingSubjects: SubjectPerformanceInsight[];
  growthOpportunitySubjects: SubjectPerformanceInsight[];
  timeSlotRecommendations: {
    slot: TimeOfDaySlot;
    energyLevel: 'Tinggi (Peak Focus)' | 'Sedang (Optimal)' | 'Ringan (Review & Murajaah)';
    recommendedSubjects: string[];
    productivityTip: string;
  }[];
  generatedAt: string;
}

export interface NilaiMataPelajaran {
  id: string;
  santriId: string;
  kode: string;
  mapel: string;
  kategori: 'Agama' | 'Umum' | 'Bahasa';
  guru: string;
  harian: number;
  tugas: number;
  uts: number;
  uas: number;
  akhir: number;
  predikat: 'A' | 'B+' | 'B' | 'C';
  catatan: string;
  waktuBelajarEfektif?: TimeOfDaySlot;
  jamPelajaran?: string;
  hariJadwal?: string;
}

export interface RoadmapStudyTopic {
  id: string;
  subjectKode: string;
  subjectMapel: string;
  topik: string;
  tingkatUrgensi: 'Tinggi' | 'Sedang' | 'Pengayaan';
  alasanRekomendasi: string;
  targetKompetensi: string;
  durasiMinggu: number;
  sumberRujukan: string; // kitab / buku referensi
  status: 'Rencana' | 'Sedang Dipelajari' | 'Selesai Dipahami';
}

export type LessonGapType =
  | 'Kesenjangan Konsep (Curriculum Gap)'
  | 'Penguatan Fondasi (Remedial & Drill)'
  | 'Akselerasi Pengayaan (Advanced Mastery)';

export interface NextLessonRecommendationItem {
  id: string;
  subjectKode: string;
  subjectMapel: string;
  kategori: 'Agama' | 'Umum' | 'Bahasa';
  currentScore: number;
  scoreStatus: 'Perlu Perbaikan Segera' | 'Perlu Pemantapan' | 'Optimal & Unggul';
  gapType: LessonGapType;
  topicTitle: string;
  lessonObjective: string;
  coreConcepts: string[];
  prerequisiteGaps: string[];
  recommendedKitabOrResource: string;
  estimatedStudyMinutes: number;
  priorityOrder: number;
  suggestedAction: string;
  practicePrompt: string;
  isCompleted?: boolean;
}

export interface NextLessonBatchRecommendation {
  santriId: string;
  generatedAt: string;
  overallDiagnosis: string;
  primaryCurriculumGapSummary: string;
  recommendedLessons: NextLessonRecommendationItem[];
  weeklyPacingAdvice: string;
}

export interface SubjectPeerBenchmark {
  kode: string;
  mapel: string;
  kategori: 'Agama' | 'Umum' | 'Bahasa';
  santriScore: number;
  classAverage: number;
  classHighest: number;
  classLowest: number;
  percentileRank: number; // e.g. 85th percentile
  delta: number; // santriScore - classAverage
  cohortSize: number;
  standing: 'Di Atas Rata-rata Kelas' | 'Sesuai Rata-rata Kelas' | 'Perlu Akselerasi';
}

export interface PeerComparisonSummary {
  santriId: string;
  kelas: string;
  cohortSize: number;
  santriOverallAverage: number;
  classOverallAverage: number;
  overallDelta: number;
  overallPercentile: number;
  subjectsBenchmark: SubjectPeerBenchmark[];
  strongestSubjects: string[];
  gapSubjects: string[];
  aiCohortInsight: string;
  anonymizedNote: string;
  generatedAt: string;
}

export type TutorBotMode = 'explain' | 'summary' | 'quiz';

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  dalilOrReference?: string;
}

export interface TutorBotMessage {
  id: string;
  sender: 'santri' | 'tutor';
  timestamp: string;
  mode?: TutorBotMode;
  subjectKode?: string;
  subjectMapel?: string;
  text: string;
  summaryPoints?: string[];
  quizQuestions?: QuizQuestionItem[];
  kitabReference?: string;
  isStreaming?: boolean;
}

export interface LearningRoadmap {
  santriId: string;
  tanggalDibuat: string;
  ringkasanStrategi: string;
  fokusPrioritasUtama: string;
  topikRekomendasi: RoadmapStudyTopic[];
  terakhirDiperbarui: string;
}

export type WeeklyStudyDay = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Ahad';

export type ScheduleFocusType =
  | 'Target Sasaran Akademik (Pending Goal)'
  | 'Optimalisasi Pola Jam Prima (Peak Chronobiology)'
  | 'Penguatan Celah Kurikulum (Curriculum Gap)'
  | 'Murajaah & Konsolidasi';

export interface SmartScheduleSlot {
  id: string;
  day: WeeklyStudyDay;
  timeSlot: TimeOfDaySlot;
  timeRange: string; // e.g. "05:15 - 06:15 WIB"
  focusType: ScheduleFocusType;
  subjectOrGoalTitle: string;
  subjectKode?: string;
  linkedGoalId?: string;
  linkedGoalTitle?: string;
  linkedMilestoneTitle?: string;
  taskDescription: string;
  recommendedTechnique: string;
  targetDurationMinutes: number;
  energyAlignment: 'Sangat Selaras (Peak Focus Match)' | 'Keseimbangan Relaksasi' | 'Dukungan Konsistensi';
  isCompleted?: boolean;
  completedAt?: string;
}

export interface SmartStudyTimetable {
  santriId: string;
  generatedAt: string;
  weekLabel: string;
  overallStrategy: string;
  peakSlotUtilized: TimeOfDaySlot;
  secondaryPeakSlotUtilized: TimeOfDaySlot;
  totalWeeklyStudyHours: number;
  goalAlignmentRate: number; // 0 - 100
  chronobiologyAlignmentRate: number; // 0 - 100
  slots: SmartScheduleSlot[];
  smartTips: string[];
}

export type StudyIntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface StudyIntensityActivity {
  id: string;
  type: 'sekolah' | 'halaqah' | 'belajar_malam' | 'ujian' | 'tugas' | 'tahfidz' | 'mandiri';
  title: string;
  score?: number;
  maxScore?: number;
  durationMinutes: number;
  subjectKode?: string;
  subjectName?: string;
  timeSlot?: string;
}

export interface DailyStudyIntensity {
  date: string; // YYYY-MM-DD
  dayOfWeek: WeeklyStudyDay;
  hijriDate?: string;
  intensityScore: number; // 0 - 100
  intensityLevel: StudyIntensityLevel;
  effectiveStudyMinutes: number;
  presensiSummary: {
    subuh: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa';
    dhuha: 'Hadir' | 'Izin' | 'Alpa';
    sekolahPagi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
    ashar: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa';
    halaqahSore: 'Hadir' | 'Izin' | 'Alpa';
    maghribIsya: 'Hadir' | 'Masbuk' | 'Izin' | 'Alpa';
    belajarMalam: 'Hadir' | 'Izin' | 'Alpa';
    attendanceRate: number; // 0 - 100%
  };
  academicActivities: StudyIntensityActivity[];
  productivityStatus:
    | 'Puncak Produktivitas'
    | 'Intensitas Tinggi'
    | 'Konsisten Produktif'
    | 'Intensitas Ringan'
    | 'Istirahat / Pemulihan';
  keterangan?: string;
  isPeakSurge: boolean;
}

export interface StudyIntensityAnalysis {
  santriId: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalStudyHours: number;
  averageDailyIntensity: number;
  peakDayOfWeek: WeeklyStudyDay;
  levelDistribution: {
    level0Count: number;
    level1Count: number;
    level2Count: number;
    level3Count: number;
    level4Count: number;
  };
  correlationInsight: {
    highIntensityDaysScoreAvg: number;
    normalDaysScoreAvg: number;
    scoreLiftPercentage: number;
    narrative: string;
  };
  burnoutWarning?: string;
  dailyRecords: DailyStudyIntensity[];
}

export interface AIDailyDigest {
  santriId: string;
  generatedAt: string;
  dateStr: string;
  hijriDate: string;
  overallReadiness: {
    status: 'Sangat Prima & Fokus' | 'Stabil & Kondusif' | 'Perlu Pemulihan Ringan';
    score: number; // 0 - 100
    headline: string;
  };
  prayerTakeaways: {
    punctualityRate: number; // 0 - 100
    subuhStatus: string;
    dhuhaStatus: string;
    asharStatus: string;
    nightAttendanceStatus: string;
    highlights: string;
    spiritualStreakDays: number;
  };
  healthTakeaways: {
    status: string;
    vitalsSummary: string;
    medicalAlert: boolean;
    allergiesNoted: string;
    recommendation: string;
  };
  academicTakeaways: {
    recentScoresSummary: string;
    latestTahfidzProgress: string;
    studyIntensityLevel: string;
    effectiveStudyHours: string;
    keyAchievement: string;
  };
  perspectives: {
    wali: string;
    santri: string;
    ustaz: string;
  };
  actionableNextStep: string;
}

export type GoalCategory =
  | 'Tahfidz Mutqin'
  | 'Kitab Turats'
  | 'Sains & Teknologi'
  | 'Bahasa Internasional'
  | 'Studi Lanjut Timur Tengah / PTN';

export type GoalVelocityStatus =
  | 'On Track'
  | 'Ahead of Schedule'
  | 'Needs Acceleration'
  | 'Critical Delay';

export interface AcademicGoalMilestone {
  id: string;
  title: string;
  targetDate: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface AcademicGoalAIFeedback {
  summary: string;
  velocityAssessment: GoalVelocityStatus;
  confidenceScore: number; // 0 - 100
  suggestedActions: string[];
  nextMilestoneToFocus: string;
  lastEvaluatedAt: string;
}

export interface AcademicGoal {
  id: string;
  santriId: string;
  title: string;
  category: GoalCategory;
  description: string;
  targetDeadline: string;
  currentProgressPercentage: number;
  status: 'Aktif' | 'Tercapai' | 'Dalam Evaluasi' | 'Perlu Perhatian';
  milestones: AcademicGoalMilestone[];
  aiFeedback?: AcademicGoalAIFeedback;
  createdAt: string;
  updatedAt: string;
}

export type AcademicGoalAlertType =
  | 'deadline_approaching'
  | 'milestone_reached'
  | 'milestone_deadline'
  | 'goal_completed'
  | 'velocity_warning';

export interface AcademicGoalAlert {
  id: string;
  goalId: string;
  santriId: string;
  santriName: string;
  type: AcademicGoalAlertType;
  title: string;
  message: string;
  urgency: 'critical' | 'warning' | 'celebration' | 'info';
  goalTitle: string;
  milestoneTitle?: string;
  category: GoalCategory;
  deadlineDate: string;
  daysRemaining?: number;
  progressPercentage: number;
  createdAt: string;
  isRead: boolean;
}

export type GrowthMilestoneCategory = 'Tahfidz' | 'Akademik' | 'Prestasi' | 'Adab & Ubudiyah';
export type GrowthMilestoneStage = 'Kelas 10' | 'Kelas 11' | 'Kelas 12';
export type GrowthMilestoneStatus = 'Tercapai' | 'Sedang Berjalan' | 'Proyeksi Masa Depan';

export interface GrowthMilestone {
  id: string;
  santriId: string;
  title: string;
  category: GrowthMilestoneCategory;
  stage: GrowthMilestoneStage;
  academicYear: string; // e.g. "2024/2025"
  dateFormatted: string; // e.g. "Nov 2024" or "25 Sep 2026"
  dateSort: string; // e.g. "2024-11-15"
  status: GrowthMilestoneStatus;
  progressPercentage?: number;
  achievementMetric?: string;
  mentorOrEvaluator: string;
  description: string;
  keySkillsGained: string[];
  certificateUrl?: string;
  isHighlight?: boolean;
}

export interface SantriTenureSummary {
  santriId: string;
  tenureDuration: string;
  entryDate: string;
  projectedGraduationDate: string;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  futureMilestones: number;
  completionRate: number;
  tahfidzJuzProgress: {
    start: number;
    current: number;
    target: number;
  };
  gpaProgress: {
    year1: number;
    year2: number;
    current: number;
  };
}

export interface PresensiHarian {
  id: string;
  santriId: string;
  tanggal: string;
  subuh: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa';
  dhuha: 'Hadir' | 'Izin' | 'Alpa';
  sekolahPagi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  ashar: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa';
  halaqahSore: 'Hadir' | 'Izin' | 'Alpa';
  maghribIsya: 'Hadir' | 'Masbuk' | 'Izin' | 'Alpa';
  belajarMalam: 'Hadir' | 'Izin' | 'Alpa';
  keterangan?: string;
  tercatatOleh: string;
}

export interface CatatanDisiplin {
  id: string;
  santriId: string;
  tanggal: string;
  jenis: 'Prestasi' | 'Pelanggaran';
  kategori: 'Ibadah' | 'Bahasa' | 'Kebersihan' | 'Akademik' | 'Sosial';
  deskripsi: string;
  poin: number; // + or -
  pemberiSanksiAtauPenghargaan: string;
  statusPenanganan?: 'Selesai' | 'Dalam Bimbingan' | 'Perlu Perhatian Wali';
}

export interface RekamMedis {
  id: string;
  santriId: string;
  tanggal: string;
  keluhan: string;
  pemeriksaanFisik: {
    suhuTubuh: number; // Celcius
    tensiDarah: string; // mmHg
    nadi: number; // bpm
  };
  diagnosa: string;
  tindakan: string;
  obatDiberikan: string[];
  statusPerawatan: 'Rawat Jalan' | 'Rawat Inap Poskestren' | 'Rujuk RS Eksternal';
  lamaIstirahatHari: number;
  tenagaMedis: string;
  notifikasiWaliTerkirim: boolean;
  kondisiTerkini: 'Stabil' | 'Membaik' | 'Observasi Ketat' | 'Pulih';
}

export interface TagihanKeuangan {
  id: string;
  santriId: string;
  nomorInvoice: string;
  bulanTahun: string;
  posTagihan: {
    item: string;
    nominal: number;
  }[];
  totalNominal: number;
  jatuhTempo: string;
  status: 'Lunas' | 'Belum Lunas' | 'Menunggu Konfirmasi';
  metodePembayaran?: 'QRIS Instant' | 'Virtual Account BSI' | 'Virtual Account Muamalat' | 'Transfer Tunai';
  tanggalBayar?: string;
  nomorReferensi?: string;
  receiptUrl?: string;
}

export interface IzinKeluarPondok {
  id: string;
  santriId: string;
  kodeIzin: string; // e.g. IZ-2026-09-001
  keperluan: 'Keluarga' | 'Sakit/Rujukan' | 'Lomba/Eksternal' | 'Liburan Semester' | 'Lainnya';
  detailAlasan: string;
  penjemput: string;
  hubunganPenjemput: string;
  waktuRencanaKeluar: string;
  waktuRencanaKembali: string;
  waktuAktualKeluar?: string;
  waktuAktualKembali?: string;
  status: 'Diajukan' | 'Disetujui Pengasuh' | 'Ditolak' | 'Sedang Keluar' | 'Selesai Kembali' | 'Terlambat';
  disetujuiOleh?: string;
  qrPayload: string;
  catatanPetugasGerbang?: string;
}

export interface PesanChat {
  id: string;
  santriId: string;
  pengirimRole: UserRole;
  pengirimNama: string;
  penerimaNama: string;
  pesan: string;
  timestamp: string;
  dibaca: boolean;
  lampiran?: string;
}

export interface BroadcastTelegram {
  id: string;
  judul: string;
  channel: 't.me/SantriCity313' | 'Official Pengumuman' | 'Darurat Poskestren';
  kategori: 'Penting' | 'Akademik' | 'Kesehatan' | 'Jadwal' | 'Kegiatan';
  isi: string;
  tanggal: string;
  prioritas: 'Normal' | 'Tinggi' | 'Darurat';
  dilihat: number;
}

export interface AgendaPesantren {
  id: string;
  judul: string;
  kategori: 'Ujian' | 'Kajian Akbar' | 'Kunjungan Wali' | 'Dauroh Tahfidz' | 'Libur Pondok';
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  keterangan: string;
  pengingatHarian: boolean;
}

export interface AIAnalisisKaffah {
  santriId: string;
  skorHolistik: number; // 0 - 100
  pilar: {
    tahfidzAlQuran: number;
    prestasiAkademik: number;
    adabKedisiplinan: number;
    kesehatanFisik: number;
    keaktifanSosial: number;
  };
  ringkasanKaffah: string;
  kekuatanUtama: string[];
  areaPengembangan: string[];
  rekomendasiWali: string;
  rekomendasiMusyrif: string;
  prediksiKelulusanTarget: string;
  terakhirDiperbarui: string;
}

export type TahfidzBadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export type TahfidzBadgeCategory =
  | 'Progres Target Juz'
  | 'Mutqin & Fashahah'
  | 'Ujian & Tasmi\''
  | 'Kedisiplinan Halaqah';

export interface TahfidzBadge {
  id: string;
  code: string;
  title: string;
  titleArabic: string;
  subtitle: string;
  description: string;
  category: TahfidzBadgeCategory;
  tier: TahfidzBadgeTier;
  iconType: 'book' | 'award' | 'star' | 'trophy' | 'crown' | 'sparkles' | 'shield' | 'flame' | 'gem';
  accentColor: 'emerald' | 'amber' | 'blue' | 'purple' | 'cyan' | 'rose';
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercentage: number; // 0 - 100
  currentMetricValue: number;
  targetMetricValue: number;
  progressLabel: string; // e.g. "18.5 / 30 Juz"
  requirementText: string;
  motivationalHadith: string;
  benefits: string[];
}

export interface DailyHalaqahRoutineGoal {
  waktu: 'Subuh' | 'Ashar' | 'Maghrib/Malam';
  tipe: 'Ziyadah' | 'Murajaah' | 'Tikrar Mandiri';
  focusSurah: string;
  targetAyat: string;
  halamanEstimasi: number;
  durasiMenit: number;
  panduanMetode: string;
}

export interface WeeklyTahfidzPlanMilestone {
  pekanKe: number;
  rentangTanggal: string;
  targetZiyadahJuz: string;
  targetMurajaahJuz: string;
  totalHalamanPekanIni: number;
  fokusTajwid: string;
  jadwalTasmiPekan: string;
  status: 'Sedang Berjalan' | 'Rencana Mendatang' | 'Tercapai';
}

export interface AITahfidzPlannerPlan {
  santriId: string;
  generatedAt: string;
  semesterLabel: string;
  targetJuz: number;
  currentCapaianJuz: number;
  remainingJuz: number;
  remainingDaysInSemester: number;
  activeStudyDaysPerWeek: number;
  totalEffectiveStudyDays: number;
  requiredHalamanPerHari: number;
  requiredBarisPerHari: number;
  recommendedMurajaahJuzPerHari: number;
  velocityStatus: 'Optimal & Realistis' | 'Akselerasi Tinggi' | 'Santai (Bisa Dinaikkan)' | 'Perlu Penyesuaian Beban';
  feasibilityScore: number;
  todayGoal: {
    tanggal: string;
    targetSurah: string;
    targetAyat: string;
    targetJuz: number;
    halamanCount: number;
    jadwalSesi: DailyHalaqahRoutineGoal[];
    targetMurajaahHariIni: string;
    tipsHafalanHariIni: string;
    isCompleted?: boolean;
  };
  weeklyRoadmap: WeeklyTahfidzPlanMilestone[];
  aiRecommendations: {
    strategiMenghafal: string;
    metodeMurajaah: string;
    jadwalTikrarOptimal: string;
    nasihatPencegahanLupa: string;
    catatanUntukWali: string;
    catatanUntukMusyrif: string;
  };
}

export type SmartFacilityCategory =
  | 'Semua'
  | 'Co-Working & Riset'
  | 'Lab AI & Robotika'
  | 'Studio Media & Dakwah'
  | 'Ruang Fokus Akustik';

export type LightingMode =
  | 'Fokus Pagi (5000K)'
  | 'Nyaman Siang (4000K)'
  | 'Teduh Malam (3000K)';

export interface SmartFacilityEnvironment {
  suhuCelsius: number;
  kelembapanPersen: number;
  kualitasUdaraAqi: number;
  pencahayaanLux: number;
  tingkatKebisinganDb: number;
  wifiGbps: number;
  dayaCadanganUps: string;
  modePencahayaan: LightingMode;
}

export interface SmartFacilityZone {
  id: string;
  kodeRuang: string;
  nama: string;
  namaArab: string;
  kategori: Exclude<SmartFacilityCategory, 'Semua'>;
  lantai: string;
  kapasitasKursi: number;
  terisiSaatIni: number;
  statusOperasional: 'Tersedia' | 'Hampir Penuh' | 'Sesi Terjadwal' | 'Pemeliharaan';
  fotoUrl: string;
  deskripsi: string;
  infrastrukturUnggulan: string[];
  lingkunganCerdas: SmartFacilityEnvironment;
  indeksKenyamanan: number; // 0 - 100
  energiSolarPersen: number; // 0 - 100
}

export interface FacilityBooking {
  id: string;
  santriId: string;
  santriNama: string;
  facilityId: string;
  facilityNama: string;
  tanggal: string;
  slotWaktu: string;
  modeBelajar:
    | 'Deep Work / Fokus'
    | 'Diskusi Tim Startup'
    | 'Riset & Coding'
    | 'Produksi Konten'
    | 'Murajaah Akustik';
  jumlahPeserta: number;
  keperluan: string;
  status: 'Dikonfirmasi' | 'Sedang Berlangsung' | 'Selesai' | 'Dibatalkan';
  kodeAksesQr: string;
}

export type AchievementMedalTier =
  | 'Kehormatan (Platinum)'
  | 'Emas (Gold)'
  | 'Perak (Silver)'
  | 'Perunggu (Bronze)';

export type AchievementMedalDomain =
  | "Tahfidz Al-Qur'an"
  | 'Target Akademik'
  | 'Prestasi Terpadu';

export interface AchievementMedal {
  id: string;
  kodeMedali: string;
  judul: string;
  judulArab: string;
  domain: AchievementMedalDomain;
  tier: AchievementMedalTier;
  ikon: 'crown' | 'trophy' | 'medal' | 'award' | 'star' | 'sparkles';
  isEarned: boolean;
  progressPercent: number;
  progressLabel: string;
  kriteria: string;
  diperolehPada?: string;
  sumberPencapaian: string;
  penghargaan: string;
}

export type ScholarshipCategory =
  | 'Semua'
  | 'Pemerintah & Kedinasan'
  | 'Tahfidz & Riset'
  | 'Mitra & Korporasi'
  | 'Prestasi & Talenta';

export interface ScholarshipProgram {
  id: string;
  kode: string;
  nama: string;
  penyelenggara: string;
  kategori: Exclude<ScholarshipCategory, 'Semua'>;
  dukunganFinansial: string;
  voucherPendidikanNominal: number;
  voucherBenefit: string;
  syaratMinimalJuz?: number;
  syaratMinimalNilai?: number;
  syaratMinimalDisiplin?: number;
  kuotaTersedia: number;
  batasPendaftaran: string;
  fokusUnggulan: string[];
}

export interface ScholarshipVoucher {
  id: string;
  santriId: string;
  kodeVoucher: string;
  judul: string;
  programBeasiswa: string;
  nominalRupiah: number;
  kategoriVoucher:
    | 'Pembebasan SPP/UKT'
    | 'Voucher Riset & StartUp Center'
    | 'Tunjangan Kitab & Literatur'
    | 'Subsidi Asrama & Konsumsi';
  berlakuHingga: string;
  status: 'Aktif Siap Pakai' | 'Sudah Diklaim' | 'Menunggu Verifikasi';
}

export interface ScholarshipApplication {
  id: string;
  santriId: string;
  santriNama: string;
  scholarshipId: string;
  scholarshipNama: string;
  tanggalDaftar: string;
  jalurPrestasi: string;
  estimasiVoucher: number;
  catatanMotivasi: string;
  status:
    | 'Diajukan'
    | 'Seleksi Berkas'
    | 'Disetujui / Aktif'
    | 'Perlu Lengkapi Berkas';
}



