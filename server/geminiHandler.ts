import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-4-hydrogen';

export class ServerGeminiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'ServerGeminiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ServerGeminiError(
      'GEMINI_API_KEY belum dikonfigurasi pada server. Silakan atur di panel Settings > Secrets.',
      503,
      'API_KEY_MISSING'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanJsonText(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractUpstreamStatus(err: unknown): { statusCode: number; message: string; code?: string } {
  if (err instanceof ServerGeminiError) {
    return { statusCode: err.statusCode, message: err.message, code: err.code };
  }

  const anyErr = err as { status?: number; statusCode?: number; message?: string; code?: string };
  const status = anyErr?.status || anyErr?.statusCode;
  const rawMessage = anyErr?.message || 'Gagal memproses permintaan Gemini API di server.';

  if (status === 400 || rawMessage.includes('API_KEY_INVALID')) {
    return {
      statusCode: 400,
      message: 'API Key Gemini tidak valid. Periksa pengaturan di Settings > Secrets.',
      code: 'API_KEY_INVALID',
    };
  }
  if (status === 403 || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      statusCode: 403,
      message: 'Akses Gemini API ditolak. Periksa izin API key di Settings > Secrets.',
      code: 'PERMISSION_DENIED',
    };
  }
  if (status === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      statusCode: 404,
      message: `Model AI (${MODEL_NAME}) tidak ditemukan pada endpoint upstream.`,
      code: 'MODEL_NOT_FOUND',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      statusCode: 429,
      message: 'Kuota permintaan Gemini API sedang padat atau habis. Silakan coba beberapa saat lagi.',
      code: 'RESOURCE_EXHAUSTED',
    };
  }

  return {
    statusCode: status && status >= 400 && status < 600 ? status : 502,
    message: rawMessage,
    code: anyErr?.code || 'UPSTREAM_ERROR',
  };
}

async function generateJsonFromPrompt<T>(prompt: string): Promise<T> {
  const ai = getGeminiClient();
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      if (!text.trim()) {
        throw new ServerGeminiError('Model mengembalikan respons kosong.', 502, 'EMPTY_RESPONSE');
      }

      const parsed = JSON.parse(cleanJsonText(text)) as T;
      return parsed;
    } catch (err) {
      lastError = err;
      const mapped = extractUpstreamStatus(err);
      const isRetryable = mapped.statusCode === 429 || mapped.statusCode >= 500;
      if (!isRetryable || attempt === maxAttempts - 1) {
        throw new ServerGeminiError(mapped.message, mapped.statusCode, mapped.code);
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function handleGeminiTask(task: string, payload: any): Promise<unknown> {
  switch (task) {
    case 'kaffah': {
      const { santri, avgTajwid, avgNilai, presensiScore, latestDiagnosa, prestasiSummary } = payload;
      const prompt = `
Sebagai pakar pedagogi pesantren dan psikolog pendidikan Islam di SantriCity, lakukan analisis evaluasi komprehensif (kaffah) untuk santri berikut:
- Nama: ${santri?.nama} (Kelas: ${santri?.kelas}, Asrama: ${santri?.asrama})
- Capaian Tahfidz: ${santri?.capaianJuz} / ${santri?.targetJuz} Juz (Rata-rata tajwid: ${avgTajwid})
- Nilai Rata-rata Akademik: ${avgNilai}
- Poin Disiplin & Adab: ${santri?.poinDisiplin} / 100 (Presensi: ${presensiScore}%)
- Riwayat Kesehatan Terakhir: ${latestDiagnosa || 'Sehat prima'}
- Catatan Prestasi / Prestasi Terakhir: ${prestasiSummary || 'Aktif'}

Format output dalam format JSON valid:
{
  "ringkasanKaffah": "deskripsi naratif 2-3 kalimat perkembangan santri",
  "kekuatanUtama": ["kekuatan 1", "kekuatan 2", "kekuatan 3"],
  "areaPengembangan": ["area 1", "area 2"],
  "rekomendasiWali": "pesan actionable untuk orang tua / wali santri",
  "rekomendasiMusyrif": "arahan bimbingan bagi ustaz / musyrif asrama",
  "prediksiKelulusanTarget": "proyeksi kelulusan tahfidz 30 juz dan target akademik"
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'learning-roadmap': {
      const { santri, formattedSubjectsSummary } = payload;
      const prompt = `
Sebagai pakar kurikulum kepesantrenan dan konsultan pedagogik Islam terpadu di SantriCity, buatlah rencana belajar terarah ("Learning Roadmap") untuk santri:
- Nama: ${santri?.nama} (Kelas: ${santri?.kelas})
- Target Akademik & Tahfidz: Capaian hafalan ${santri?.capaianJuz}/${santri?.targetJuz} Juz
- Data Rekapitulasi Nilai Akademik Terkini:
${formattedSubjectsSummary}

Tugas:
Analisis kekuatan dan area mata pelajaran yang memerlukan akselerasi atau penguatan (terutama yang memiliki nilai lebih rendah atau predikat B+/B/C, sekaligus topik pengayaan untuk mata pelajaran unggulan). Hasilkan 3 sampai 5 topik pembelajaran spesifik yang sangat relevan dan aplikatif dalam format JSON murni:

{
  "ringkasanStrategi": "ringkasan strategi belajar naratif 2-3 kalimat yang memotivasi santri dan instruktif bagi asatidz",
  "fokusPrioritasUtama": "fokus 1-2 bidang yang paling krusial untuk ditingkatkan dalam 4 pekan ke depan",
  "topikRekomendasi": [
    {
      "id": "lr-1",
      "subjectKode": "KODE_MAPEL",
      "subjectMapel": "NAMA_MAPEL",
      "topik": "Judul spesifik topik materi yang harus dipelajari",
      "tingkatUrgensi": "Tinggi" | "Sedang" | "Pengayaan",
      "alasanRekomendasi": "Mengapa santri membutuhkan topik ini berdasarkan data nilainya",
      "targetKompetensi": "Kemampuan konkret yang harus dikuasai setelah belajar topik ini",
      "durasiMinggu": 2,
      "sumberRujukan": "Judul kitab kuning / modul rujukan pesantren / bab buku rujukan",
      "status": "Rencana"
    }
  ]
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'goal-progress': {
      const { santri, avgNilai, goal, progressPct, completedCount, milestonesSummary } = payload;
      const prompt = `
Sebagai Konsultan Akademik dan Perencana Target Pendidikan Santri di SantriCity, lakukan evaluasi pelacakan progres AI (Progress Tracking against Milestones) untuk sasaran belajar jangka panjang santri:

PROFIL SANTRI:
- Nama: ${santri?.nama} (Kelas: ${santri?.kelas})
- Capaian Tahfidz: ${santri?.capaianJuz} / ${santri?.targetJuz} Juz
- Rata-rata Nilai Akademik: ${avgNilai}

TARGET SASARAN BELAJAR:
- Judul Target: ${goal?.title}
- Kategori: ${goal?.category}
- Batas Waktu Akhir: ${goal?.targetDeadline}
- Deskripsi: ${goal?.description}
- Progres Saat Ini: ${progressPct}% (${completedCount} dari ${goal?.milestones?.length || 0} milestone tercapai)

DAFTAR TAHAPAN (MILESTONES):
${milestonesSummary}

TUGAS EVALUASI:
Analisis kecepatan kemajuan santri (velocity), perbandingan dengan tanggal tenggat, dan kekuatan akademiknya. Hasilkan penilaian JSON murni:
{
  "summary": "Analisis mendalam 2-3 kalimat mengenai kecepatan dan mutu capaian milestone santri saat ini",
  "velocityAssessment": "On Track" | "Ahead of Schedule" | "Needs Acceleration" | "Critical Delay",
  "confidenceScore": 88,
  "suggestedActions": [
    "Langkah konkret 1",
    "Langkah konkret 2",
    "Langkah konkret 3"
  ],
  "nextMilestoneToFocus": "Nama milestone terdekat yang harus menjadi fokus utama saat ini"
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'suggest-milestones': {
      const { title, category, targetDeadline } = payload;
      const prompt = `
Buatlah 4 sampai 5 tahapan (milestones) terukur, realistis, dan berurutan untuk sasaran akademik santri pesantren berikut:
- Judul Sasaran: "${title}"
- Kategori: ${category}
- Target Tenggat Waktu: ${targetDeadline}

Hasilkan array JSON murni:
[
  {
    "id": "ms-auto-1",
    "title": "Deskripsi tahapan konkret yang harus diselesaikan",
    "targetDate": "YYYY-MM-DD",
    "isCompleted": false,
    "notes": "Catatan singkat indikator keberhasilan"
  }
]
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'study-pattern': {
      const { santri, avgOverall, subjectsText, slotAveragesText, bestSlot, secondSlot } = payload;
      const prompt = `
Sebagai Spesialis Psikologi Belajar dan Analis Pola Belajar Santri (Study Pattern Analyst) di Pondok Pesantren Digital:
Lakukan analisis mendalam pola belajar (Study Pattern Analysis) untuk santri berikut berdasarkan histori nilai dan jadwal waktu belajar:

DATA SANTRI:
- Nama: ${santri?.nama} (Kelas: ${santri?.kelas})
- Capaian Tahfidz: ${santri?.capaianJuz} / ${santri?.targetJuz} Juz
- Nilai Rata-Rata Kumulatif: ${avgOverall}

HISTORI NILAI MATA PELAJARAN:
${subjectsText}

ANALISIS JADWAL RATA-RATA WAKTU:
${slotAveragesText}

TUGAS ANDA:
Identifikasi pola waktu terbaik (best times of day) dan mata pelajaran unggulan santri.
Hasilkan output JSON murni:
{
  "overallPeakTime": "${bestSlot}",
  "secondaryPeakTime": "${secondSlot}",
  "cognitivePace": "Reflektif & Analitis Mendalam" | "Cepat & Tangkas Terstruktur" | "Komprehensif Holistik",
  "executiveSummary": "Ringkasan naratif 2-3 kalimat ilmiah mengenai korelasi waktu prima biologis (circadian rhythm) santri dan penguasaan subjek tertentu",
  "topPerformingSubjects": [
    {
      "kode": "Kode",
      "mapel": "Nama Mapel",
      "kategori": "Agama" | "Umum" | "Bahasa",
      "avgScore": 94.5,
      "performanceTier": "Unggul / Mahir (Peak)",
      "bestStudySlot": "${bestSlot}",
      "recommendedTechnique": "Teknik spesifik misal: Active Recall & Murajaah Fajar",
      "notes": "Alasan mengapa santri unggul di mata pelajaran ini"
    }
  ],
  "growthOpportunitySubjects": [
    {
      "kode": "Kode",
      "mapel": "Nama Mapel",
      "kategori": "Agama" | "Umum" | "Bahasa",
      "avgScore": 87.2,
      "performanceTier": "Perlu Pendampingan",
      "bestStudySlot": "Pagi (Sekolah Formal)",
      "recommendedTechnique": "Teknik spesifik misal: Spaced Repetition & Tutorial Sebaya",
      "notes": "Potensi akselerasi bila dipindahkan atau diperkuat pada jam tertentu"
    }
  ],
  "timeSlotRecommendations": [
    {
      "slot": "Subuh / Pagi Buta",
      "energyLevel": "Tinggi (Peak Focus)",
      "recommendedSubjects": ["Nahwu & Sharaf", "Hadits Tematik"],
      "productivityTip": "Kondisi kortisol dan ketenangan fajar sangat ideal untuk menghafal bait matan dan matan hadits."
    },
    {
      "slot": "Pagi (Sekolah Formal)",
      "energyLevel": "Sedang (Optimal)",
      "recommendedSubjects": ["Matematika", "Fisika Terapan"],
      "productivityTip": "Kapasitas kalkulasi logika bekerja maksimal di jam pagi dengan pencahayaan alami."
    },
    {
      "slot": "Sore (Halaqah Asar)",
      "energyLevel": "Tinggi (Peak Focus)",
      "recommendedSubjects": ["English for Islamic Scholar", "Muhadatsah"],
      "productivityTip": "Suasana interaktif sangat mendukung latihan kelancaran berbicara dan diskusi bahasa asing."
    },
    {
      "slot": "Malam (Ba'da Maghrib & Belajar Mandiri)",
      "energyLevel": "Ringan (Review & Murajaah)",
      "recommendedSubjects": ["Fiqih Muamalat", "Muthala'ah"],
      "productivityTip": "Gunakan teknik pemetaan konsep (mind mapping) dan review santai sebelum istirahat tidur."
    }
  ]
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'tutor-bot': {
      const { question, mode, selectedSubject, santri } = payload;
      const prompt = `
Anda adalah "Ustaz AI Tutor" di Pondok Pesantren Digital SantriCity 313.
Tugas Anda mendampingi santri secara interaktif untuk memahami materi pelajaran kurikulum pesantren dan sains modern.

PROFIL SANTRI:
- Nama: ${santri?.nama} (Kelas: ${santri?.kelas})
- Mata Pelajaran: ${selectedSubject?.mapel} (${selectedSubject?.kode} - Kategori: ${selectedSubject?.kategori})
- Guru Pengampu: ${selectedSubject?.guru}
- Nilai Terakhir: ${selectedSubject?.akhir} (Predikat: ${selectedSubject?.predikat})

MODE PERMINTAAN: ${String(mode || 'explain').toUpperCase()}
PERTANYAAN / TOPIK SANTRI:
"${question}"

INSTRUKSI KHUSUS BERDASARKAN MODE:
1. JIKA MODE = 'explain' (Penjelasan Konseptual):
   Berikan penjelasan yang mendalam, ramah, dan mudah dipahami, sertakan contoh analogi praktis, kaidah atau dalil/rumus terkait, serta rujukan kitab/buku ajar.
2. JIKA MODE = 'summary' (Ringkasan Materi & Poin Kunci):
   Berikan ikhtisar padat dengan format "summaryPoints" berisi 3-5 butir poin inti materi yang esensial untuk dihafalkan/dipahami.
3. JIKA MODE = 'quiz' (Kuis Latihan Pemahaman):
   Hasilkan 2 sampai 3 soal pilihan ganda latihan interaktif ("quizQuestions") lengkap dengan 4 opsi, index jawaban benar (0-3), dan penjelasan/pembahasan mendalam.

Keluarkan respon HANYA dalam bentuk format JSON murni:
{
  "text": "Jawaban utama / penjelasan pembuka dari Ustaz AI Tutor...",
  "kitabReference": "Kitab / buku referensi (misal: Alfiyah Ibnu Malik Bab Kalam / Fisika Halliday Resnick)",
  "summaryPoints": [
    "Poin kunci 1...",
    "Poin kunci 2..."
  ],
  "quizQuestions": [
    {
      "id": "q1",
      "question": "Pertanyaan kuis...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctOptionIndex": 1,
      "explanation": "Pembahasan mengapa jawaban ini benar...",
      "dalilOrReference": "Bait Alfiyah / Dalil Al-Qur'an / Teorema"
    }
  ]
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'next-lessons': {
      const { santri, sortedNilaiText } = payload;
      const prompt = `
Anda adalah Kepala Kurikulum & Pedagogi AI Pondok Pesantren Digital SantriCity 313.
Tugas Anda: Menganalisis nilai asesmen santri (Ulangan Harian, Tugas, UTS, UAS, Nilai Akhir) untuk mendiagnosis "Curriculum Gaps" (kesenjangan kurikulum) dan merekomendasikan "Next Lesson" (topik spesifik berikutnya yang harus dipelajari).

PROFIL SANTRI:
- Nama: ${santri?.nama}
- Kelas: ${santri?.kelas}

DATA ASESMEN TERBARU SANTRI:
${sortedNilaiText}

INSTRUKSI:
1. Analisis kesenjangan konsep (curriculum gaps) berdasarkan disparitas nilai harian vs ujian, nilai terendah vs target kelulusan santri.
2. Klasifikasikan jenis celah kurikulum:
   - "Kesenjangan Konsep (Curriculum Gap)" jika ada topik prasyarat yang belum matang
   - "Penguatan Fondasi (Remedial & Drill)" jika nilai di bawah 80 atau nilai tugas tertinggal
   - "Akselerasi Pengayaan (Advanced Mastery)" jika nilai sudah 90+ dan siap melangkah ke materi tingkat tinggi
3. Berikan 3 hingga 5 rekomendasi pelajaran berikutnya (Next Lessons) berurutan berdasarkan prioritas urgensi.
4. Setiap pelajaran harus memiliki topik spesifik, sasaran kompetensi, konsep inti, celah prasyarat yang dideteksi, kitab/buku ajar rujukan, estimasi durasi belajar, dan prompt latihan untuk Tutor Bot.

KELUARKAN HANYA JSON MURNI:
{
  "overallDiagnosis": "Diagnosis komprehensif kurikulum santri...",
  "primaryCurriculumGapSummary": "Ringkasan kesenjangan kurikulum utama...",
  "weeklyPacingAdvice": "Nasihat ritme belajar mingguan...",
  "recommendedLessons": [
    {
      "id": "nl-1",
      "subjectKode": "kode mapel",
      "subjectMapel": "nama mapel",
      "kategori": "Agama",
      "currentScore": 87.2,
      "scoreStatus": "Perlu Pemantapan",
      "gapType": "Kesenjangan Konsep (Curriculum Gap)",
      "topicTitle": "Topik spesifik pelajaran berikutnya",
      "lessonObjective": "Sasaran kompetensi...",
      "coreConcepts": ["Konsep 1", "Konsep 2", "Konsep 3"],
      "prerequisiteGaps": ["Celah pemahaman yang terdeteksi dari asesmen"],
      "recommendedKitabOrResource": "Kitab / Buku Ajar & Bab",
      "estimatedStudyMinutes": 45,
      "priorityOrder": 1,
      "suggestedAction": "Langkah praktis belajar",
      "practicePrompt": "Pertanyaan kuis atau prompt untuk ditanyakan ke Tutor Bot AI"
    }
  ]
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'smart-timetable': {
      const {
        santri,
        peakSlot,
        secondarySlot,
        cognitivePace,
        pendingMilestonesText,
        gapSubjectsText,
      } = payload;
      const prompt = `
Anda adalah Kepala Sistem Penjadwalan Cerdas AI (Smart Scheduler) Pondok Pesantren Digital SantriCity 313.
Tugas Anda: Membuat jadwal belajar mingguan yang sangat personal (personalized weekly study timetable) untuk santri, mengintegrasikan secara harmonis antara 'Study Pattern' (kronobiologi jam prima) dan 'Target Sasaran Akademik Pending' (Academic Goals & Milestones).

PROFIL SANTRI:
- Nama: ${santri?.nama}
- Kelas: ${santri?.kelas}
- Pola Jam Belajar Prima (Peak Focus Slot): ${peakSlot}
- Jam Belajar Sekunder (Secondary Slot): ${secondarySlot}
- Gaya Kognitif: ${cognitivePace || 'Komprehensif Holistik'}

TARGET AKADEMIK PENDING SANTRI (GOALS & MILESTONES):
${pendingMilestonesText}

MATA PELAJARAN DENGAN KESENJANGAN KURIKULUM (GAP PRIORITAS):
${gapSubjectsText}

ATURAN PENJADWALAN PESANTREN:
1. Hari mencakup 7 hari penuh: 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'.
2. Sesi harian disesuaikan dengan ritme pesantren:
   - Subuh / Pagi Buta (05:15 - 06:15 WIB) -> Cocok untuk hafalan mutqin / tahfidz / kaidah qawaid berat saat otak segar.
   - Pagi (Sekolah Formal) (07:00 - 11:30 WIB) -> Pembelajaran kelas madrasah.
   - Siang / Ba'da Dzuhur (13:30 - 14:30 WIB) -> Kajian ringan / istirahat qailulah / diskusi sebaya.
   - Sore (Halaqah Asar) (16:15 - 17:15 WIB) -> Halaqah Al-Qur'an / olahraga santri / sains interaktif.
   - Malam (Ba'da Maghrib & Belajar Mandiri) (19:45 - 21:15 WIB) -> Belajar mandiri kitab, latihan soal drill, bedah kasus.
3. Tempatkan target akademik yang paling sulit atau milestone prioritas pada jam prima santri (${peakSlot}).
4. Tempatkan perbaikan mata pelajaran kurikulum gap pada jam sekunder (${secondarySlot}).
5. Buat 2 hingga 3 slot belajar mandiri per hari (total sekitar 14-18 slot dalam seminggu).
6. Sertakan teknik belajar spesifik (Feynman Technique, Sima'an Berpasangan, Active Recall, Pomodoro 25/5, dll).

KELUARKAN HANYA JSON MURNI:
{
  "overallStrategy": "Penjelasan ringkas strategi jadwal mingguan...",
  "totalWeeklyStudyHours": 16.5,
  "goalAlignmentRate": 96,
  "chronobiologyAlignmentRate": 98,
  "smartTips": [
    "Tips praktis 1...",
    "Tips praktis 2...",
    "Tips praktis 3..."
  ],
  "slots": [
    {
      "id": "slot-1",
      "day": "Senin",
      "timeSlot": "Subuh / Pagi Buta",
      "timeRange": "05:15 - 06:15 WIB",
      "focusType": "Target Sasaran Akademik (Pending Goal)",
      "subjectOrGoalTitle": "Nama topik atau goal",
      "subjectKode": "AR-01",
      "linkedGoalTitle": "Judul Goal jika relevan",
      "linkedMilestoneTitle": "Judul Milestone jika relevan",
      "taskDescription": "Aktivitas spesifik yang dikerjakan",
      "recommendedTechnique": "Teknik belajar yang disarankan",
      "targetDurationMinutes": 60,
      "energyAlignment": "Sangat Selaras (Peak Focus Match)"
    }
  ]
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'daily-digest': {
      const {
        santri,
        todayStr,
        hijriStr,
        todayPresensi,
        healthStatus,
        vitalsText,
        allergiesText,
        topSubjects,
        tahfidzSummary,
      } = payload;
      const prompt = `
Sebagai Asisten AI Pesantren Terpadu di SantriCity, buatkan 'AI Daily Digest' (Rangkuman Harian Pintar) untuk santri berikut pada tanggal ${todayStr} (${hijriStr}):
- Nama Santri: ${santri?.nama} (Kelas: ${santri?.kelas}, Asrama: ${santri?.asrama}, Kamar: ${santri?.kamar})
- Presensi 7 Sesi Hari Ini: Subuh (${todayPresensi?.subuh}), Dhuha (${todayPresensi?.dhuha}), KBM Pagi (${todayPresensi?.sekolahPagi}), Ashar (${todayPresensi?.ashar}), Halaqah Sore (${todayPresensi?.halaqahSore}), Maghrib-Isya (${todayPresensi?.maghribIsya}), Belajar Malam (${todayPresensi?.belajarMalam})
- Catatan Musyrif Hari Ini: "${todayPresensi?.keterangan || '-'}"
- Status Kesehatan Poskestren: Kondisi ${healthStatus}, Tanda Vital (${vitalsText}), Alergi (${allergiesText})
- Prestasi Akademik Terkini: Nilai Unggulan: ${topSubjects}, Tahfidz Terakhir: ${tahfidzSummary} (Capaian: ${santri?.capaianJuz}/${santri?.targetJuz} Juz)

Hasilkan respon HANYA dalam format JSON valid:
{
  "headline": "Satu kalimat rangkuman eksekutif capaian hari ini",
  "readinessScore": 96,
  "readinessStatus": "Sangat Prima & Fokus",
  "prayerHighlights": "Uraian 1-2 kalimat tentang ketepatan sholat dan ibadah hari ini",
  "healthRecommendation": "Saran pemeliharaan kesehatan / istirahat sunnah 1 kalimat",
  "academicKeyAchievement": "Capaian akademik dan tahfidz utama hari ini",
  "perspectiveWali": "Pesan hangat, informatif, dan menenangkan untuk orang tua / wali santri (2-3 kalimat)",
  "perspectiveSantri": "Pesan afirmasi, refleksi diri, dan motivasi belajar untuk santri (2 kalimat)",
  "perspectiveUstaz": "Catatan bimbingan pedagogis dan adab bagi ustaz / musyrif (2 kalimat)",
  "actionableNextStep": "Langkah aksi konkrit santri berikutnya untuk sesi malam atau esok pagi"
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'tahfidz-planner': {
      const {
        santri,
        currentCapaian,
        targetJuz,
        remainingJuz,
        remainingDays,
        totalEffectiveStudyDays,
        avgTajwid,
        requiredHalamanPerHari,
        requiredBarisPerHari,
      } = payload;
      const prompt = `
Anda adalah Pakar Kurikulum Tahfidz Al-Qur'an dan Musyrif Senior Pesantren Modern SantriCity.
Tugas Anda: Buat strategi personalisasi AI Tahfidz Planner untuk santri berikut.

Data Santri:
- Nama: ${santri?.nama} (${santri?.kelas}, ${santri?.asrama})
- Capaian Hafalan Terkini: ${currentCapaian} Juz
- Target Juz Semester Ini: ${targetJuz} Juz
- Sisa Hafalan: ${remainingJuz} Juz
- Sisa Hari Semester: ${remainingDays} Hari (${totalEffectiveStudyDays} hari aktif)
- Rata-rata Skor Tajwid: ${avgTajwid}/100
- Beban Rata-rata: ${requiredHalamanPerHari} Halaman per hari (${requiredBarisPerHari} baris/hari)

Format Output JSON persis:
{
  "strategiMenghafal": "penjelasan strategi spesifik dan terukur 2-3 kalimat",
  "metodeMurajaah": "panduan murajaah praktis 2 kalimat",
  "jadwalTikrarOptimal": "panduan ritme waktu tikrar fajar, ashar, malam",
  "nasihatPencegahanLupa": "kiat pencegahan lupa hafalan 1-2 kalimat",
  "catatanUntukWali": "pesan motivasi dan pendampingan untuk orang tua 2 kalimat",
  "catatanUntukMusyrif": "arahan bimbingan bagi ustaz musyrif halaqah 2 kalimat",
  "tipsHafalanHariIni": "tips praktis untuk hari ini 1 kalimat"
}
`;
      return generateJsonFromPrompt(prompt);
    }

    case 'klinik-syariah': {
      const {
        namaUsaha,
        akad,
        omzetBulananRp,
        modalBerjalanRp,
        marginHalalPersen,
        statusHalal,
        keluhanAtauSkenario,
      } = payload;
      const prompt = `Anda adalah Dewan Pengawas Syariah & Konsultan Bisnis Syariah Pesantren.
Audit skenario usaha berikut secara ringkas dalam bahasa Indonesia formal dan aplikatif:
- Nama Usaha: ${namaUsaha}
- Akad Utama: ${akad}
- Omzet Bulanan: Rp ${Number(omzetBulananRp || 0).toLocaleString('id-ID')}
- Modal Berjalan: Rp ${Number(modalBerjalanRp || 0).toLocaleString('id-ID')}
- Margin Keuntungan: ${marginHalalPersen}%
- Status Halal: ${statusHalal}
- Skenario / Kendala: ${keluhanAtauSkenario}

Balas HANYA dalam JSON valid tanpa markdown dengan struktur:
{
  "ringkasanDiagnosis": "2-3 kalimat diagnosis kesesuaian kaidah fiqh muamalah dan strategi bisnis",
  "rekomendasiEksekusi": ["langkah 1", "langkah 2", "langkah 3"],
  "nasihatDewanSyariah": "1-2 kalimat nasihat adab bermuamalah"
}`;
      return generateJsonFromPrompt(prompt);
    }

    default:
      throw new ServerGeminiError(`Task AI tidak dikenal: ${task}`, 404, 'UNKNOWN_TASK');
  }
}
