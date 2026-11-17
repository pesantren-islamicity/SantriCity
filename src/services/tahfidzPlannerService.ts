import {
  SantriProfile,
  TahfidzEntry,
  AITahfidzPlannerPlan,
  DailyHalaqahRoutineGoal,
  WeeklyTahfidzPlanMilestone,
} from '../types/pesantren';
import { loadFromLocal, saveToLocal } from './storageService';
import { postGeminiTask } from './geminiService';

/**
 * Generates an AI-powered Tahfidz Planner plan for a santri.
 * Calculates daily recitation pace (pages and lines per day), weekly roadmap,
 * and daily halaqah routines to achieve the target Juz within the remaining semester days.
 */
export async function generateAITahfidzPlan(
  santri: SantriProfile,
  tahfidzList: TahfidzEntry[] = [],
  customTargetJuz?: number,
  customRemainingDays?: number,
  customDaysPerWeek = 6
): Promise<AITahfidzPlannerPlan> {
  const currentCapaian = santri.capaianJuz || 0;
  const targetJuz = customTargetJuz || santri.targetJuz || 30;
  const remainingJuz = Math.max(0, Number((targetJuz - currentCapaian).toFixed(1)));

  // Remaining days in semester (default 65 days if not provided)
  const remainingDays = customRemainingDays || 65;
  const effectiveStudyWeeks = Math.max(1, Math.ceil(remainingDays / 7));
  const activeStudyDaysPerWeek = Math.max(4, Math.min(7, customDaysPerWeek));
  const totalEffectiveStudyDays = Math.max(1, Math.round((remainingDays / 7) * activeStudyDaysPerWeek));

  // Mushaf Madinah Standard: 20 pages per Juz, 15 lines per page
  const totalRemainingPages = remainingJuz * 20;
  const requiredHalamanPerHari = Number((totalRemainingPages / totalEffectiveStudyDays).toFixed(2));
  const requiredBarisPerHari = Math.round(requiredHalamanPerHari * 15);

  // Recommended murajaah pace (typically 1/15th to 1/20th of memorized juz daily)
  const recommendedMurajaahJuzPerHari = currentCapaian > 0
    ? Number(Math.max(0.5, Math.min(3.0, currentCapaian / 15)).toFixed(1))
    : 0.5;

  // Velocity & Feasibility Assessment
  let velocityStatus: AITahfidzPlannerPlan['velocityStatus'] = 'Optimal & Realistis';
  let feasibilityScore = 88;

  if (requiredHalamanPerHari > 3.0) {
    velocityStatus = 'Perlu Penyesuaian Beban';
    feasibilityScore = 58;
  } else if (requiredHalamanPerHari >= 2.0) {
    velocityStatus = 'Akselerasi Tinggi';
    feasibilityScore = 78;
  } else if (requiredHalamanPerHari < 0.8) {
    velocityStatus = 'Santai (Bisa Dinaikkan)';
    feasibilityScore = 95;
  } else {
    velocityStatus = 'Optimal & Realistis';
    feasibilityScore = 90;
  }

  // Next target surah & juz determination
  const nextJuzNumber = Math.min(30, Math.floor(currentCapaian) + 1);
  const nextSurahName = getSurahForJuz(nextJuzNumber);

  // Today's Daily Routine Goals (Subuh, Ashar, Maghrib/Malam)
  const subuhPages = Number(Math.max(0.5, (requiredHalamanPerHari * 0.65)).toFixed(1));
  const asharMurajaahJuz = recommendedMurajaahJuzPerHari;
  const malamTikrarPages = subuhPages;

  const todaySessions: DailyHalaqahRoutineGoal[] = [
    {
      waktu: 'Subuh',
      tipe: 'Ziyadah',
      focusSurah: nextSurahName,
      targetAyat: `Halaman ke-${Math.round(currentCapaian * 20 % 20) + 1} (${subuhPages} Halaman Baru)`,
      halamanEstimasi: subuhPages,
      durasiMenit: 45,
      panduanMetode: 'Talaqqi 3x menyimak bacaan musyrif, ulang 10x per ayat, sambung 1 halaman utuh tanpa melihat mushaf.',
    },
    {
      waktu: 'Ashar',
      tipe: 'Murajaah',
      focusSurah: `Murajaah Penguatan Juz ${Math.max(1, nextJuzNumber - 1)}`,
      targetAyat: `${asharMurajaahJuz} Juz Kumulatif`,
      halamanEstimasi: asharMurajaahJuz * 20,
      durasiMenit: 40,
      panduanMetode: 'Simaan berpasangan (tasmi\' partner) bersama teman sebangku halaqah dengan koreksi saling menyimak.',
    },
    {
      waktu: 'Maghrib/Malam',
      tipe: 'Tikrar Mandiri',
      focusSurah: `${nextSurahName} (Pemantapan Hafalan Subuh)`,
      targetAyat: `Ulang 20x hafalan baru ba'da Isya`,
      halamanEstimasi: malamTikrarPages,
      durasiMenit: 35,
      panduanMetode: 'Muthola\'ah mandiri sebelum istirahat tidur, membaca hafalan baru dalam sholat sunnah witir / tahajjud.',
    },
  ];

  // Generate 8-week structured roadmap
  const weeklyRoadmap: WeeklyTahfidzPlanMilestone[] = [];
  const weeksCount = Math.min(10, Math.max(4, effectiveStudyWeeks));
  const pagesPerWeek = Math.round(totalRemainingPages / weeksCount);

  for (let w = 1; w <= weeksCount; w++) {
    const startJuzEst = (currentCapaian + ((w - 1) * pagesPerWeek) / 20).toFixed(1);
    const endJuzEst = Math.min(targetJuz, Number(currentCapaian + (w * pagesPerWeek) / 20)).toFixed(1);

    weeklyRoadmap.push({
      pekanKe: w,
      rentangTanggal: `Pekan ${w} · Semester Ganjil 2026`,
      targetZiyadahJuz: `Ziyadah Halaman ${((w - 1) * pagesPerWeek) + 1} - ${w * pagesPerWeek} (Menuju Juz ${endJuzEst})`,
      targetMurajaahJuz: `Murajaah Rutin ${Math.round(w % 5) + 1} Juz Terakhir`,
      totalHalamanPekanIni: pagesPerWeek,
      fokusTajwid: w % 2 === 0 ? 'Mad Jaiz Munfashil & Sifat Hams' : 'Makharijul Huruf Halqiyah & Ghunnah',
      jadwalTasmiPekan: `Tasmi' Akhir Pekan (Jum'at Pagi)`,
      status: w === 1 ? 'Sedang Berjalan' : 'Rencana Mendatang',
    });
  }

  // Base Plan with rich defaults
  let planResult: AITahfidzPlannerPlan = {
    santriId: santri.id,
    generatedAt: new Date().toISOString(),
    semesterLabel: 'Semester Ganjil 2026/2027',
    targetJuz,
    currentCapaianJuz: currentCapaian,
    remainingJuz,
    remainingDaysInSemester: remainingDays,
    activeStudyDaysPerWeek,
    totalEffectiveStudyDays,
    requiredHalamanPerHari,
    requiredBarisPerHari,
    recommendedMurajaahJuzPerHari,
    velocityStatus,
    feasibilityScore,
    todayGoal: {
      tanggal: new Date().toISOString().slice(0, 10),
      targetSurah: nextSurahName,
      targetAyat: `Ayat 1 - 25 (${subuhPages} Halaman)`,
      targetJuz: nextJuzNumber,
      halamanCount: subuhPages,
      jadwalSesi: todaySessions,
      targetMurajaahHariIni: `Juz ${Math.max(1, nextJuzNumber - 1)} (1.0 Juz Penuh)`,
      tipsHafalanHariIni: 'Fokuskan 30 menit fajar tanpa gawai/distraksi. Dengarkan rekaman Syaikh Mishary Alafasy sebelum mulai menyetor.',
      isCompleted: false,
    },
    weeklyRoadmap,
    aiRecommendations: {
      strategiMenghafal: `Dengan sisa ${remainingJuz} Juz dalam ${remainingDays} hari (${totalEffectiveStudyDays} hari efektif belajar), ananda perlu menyetor rata-rata ${requiredHalamanPerHari} halaman (${requiredBarisPerHari} baris) per hari. Kecepatan ini berada pada ritme ${velocityStatus.toLowerCase()} yang aman bagi daya ingat jangka panjang.`,
      metodeMurajaah: 'Terapkan metode Murajaah Spiral: 80% waktu murajaah dialokasikan untuk 3 juz hafalan terbaru, dan 20% untuk juz lama agar hafalan tidak menguap.',
      jadwalTikrarOptimal: 'Tikrar (pengulangan) dilakukan 3 kali: setelah setoran Subuh (5x), sebelum halaqah Ashar (3x), dan sebelum tidur (3x tanpa melihat mushaf).',
      nasihatPencegahanLupa: 'Hindari menambah hafalan baru jika setoran 2 hari sebelumnya belum mutqin. Kualitas kelancaran lebih utama daripada kuantitas buru-buru.',
      catatanUntukWali: `Mohon ayah/bunda senantiasa mengapresiasi ikhtiar ananda ${santri.nama.split(' ')[0]}. Pada akhir pekan, luangkan 10 menit untuk menyimak hafalan ananda melalui video call atau telepon hangat.`,
      catatanUntukMusyrif: `Santri memiliki daya tangkap tajwid yang baik (${tahfidzList.length ? Math.round(tahfidzList.reduce((acc, c) => acc + c.tajwid, 0) / tahfidzList.length) : 95}/100). Rekomendasikan ujian Tasmi per 2.5 juz sebelum lanjut juz berikutnya.`,
    },
  };

  // Enhance with server-side Gemini API
  try {
    const avgTajwid = tahfidzList.length
      ? Math.round(tahfidzList.reduce((acc, c) => acc + c.tajwid, 0) / tahfidzList.length)
      : 95;

    const parsed = await postGeminiTask<{
      strategiMenghafal?: string;
      metodeMurajaah?: string;
      jadwalTikrarOptimal?: string;
      nasihatPencegahanLupa?: string;
      catatanUntukWali?: string;
      catatanUntukMusyrif?: string;
      tipsHafalanHariIni?: string;
    }>('tahfidz-planner', {
      santri,
      currentCapaian,
      targetJuz,
      remainingJuz,
      remainingDays,
      totalEffectiveStudyDays,
      avgTajwid,
      requiredHalamanPerHari,
      requiredBarisPerHari,
    });

    if (parsed.strategiMenghafal) {
      planResult = {
        ...planResult,
        todayGoal: {
          ...planResult.todayGoal,
          tipsHafalanHariIni: parsed.tipsHafalanHariIni || planResult.todayGoal.tipsHafalanHariIni,
        },
        aiRecommendations: {
          strategiMenghafal: parsed.strategiMenghafal || planResult.aiRecommendations.strategiMenghafal,
          metodeMurajaah: parsed.metodeMurajaah || planResult.aiRecommendations.metodeMurajaah,
          jadwalTikrarOptimal: parsed.jadwalTikrarOptimal || planResult.aiRecommendations.jadwalTikrarOptimal,
          nasihatPencegahanLupa: parsed.nasihatPencegahanLupa || planResult.aiRecommendations.nasihatPencegahanLupa,
          catatanUntukWali: parsed.catatanUntukWali || planResult.aiRecommendations.catatanUntukWali,
          catatanUntukMusyrif: parsed.catatanUntukMusyrif || planResult.aiRecommendations.catatanUntukMusyrif,
        },
      };
    }
  } catch (err) {
    console.warn('Server AI Tahfidz Planner request failed, using deterministic baseline:', err);
  }

  // Persist plan to local storage
  const storageKey = `tahfidz_plan_${santri.id}`;
  saveToLocal(storageKey, planResult);

  return planResult;
}

/**
 * Helper to retrieve surah name by Juz index
 */
function getSurahForJuz(juzNum: number): string {
  const juzSurahMap: Record<number, string> = {
    1: 'Al-Baqarah (Awal)',
    2: 'Al-Baqarah (Lanjutan 142)',
    3: 'Ali \'Imran (Awal)',
    4: 'An-Nisa\' (Awal)',
    5: 'An-Nisa\' (Lanjutan)',
    6: 'Al-Ma\'idah',
    7: 'Al-An\'am',
    8: 'Al-A\'raf',
    9: 'Al-Anfal',
    10: 'At-Taubah',
    11: 'Yunus & Hud',
    12: 'Yusuf',
    13: 'Ar-Ra\'d & Ibrahim',
    14: 'Al-Hijr & An-Nahl',
    15: 'Al-Isra\' & Al-Kahf',
    16: 'Maryam & Thaha',
    17: 'Al-Anbiya\' & Al-Hajj',
    18: 'Al-Mu\'minun & An-Nur',
    19: 'Al-Furqan & Asy-Syu\'ara',
    20: 'An-Naml & Al-Qashash',
    21: 'Al-\'Ankabut & Luqman',
    22: 'Al-Ahzab & Saba\'',
    23: 'Yasin & Ash-Shaffat',
    24: 'Az-Zumar & Ghafir',
    25: 'Fushshilat & Asy-Syura',
    26: 'Al-Ahqaf & Muhammad',
    27: 'Adz-Dzariyat & Ar-Rahman',
    28: 'Al-Mujadilah & Al-Jumu\'ah',
    29: 'Al-Mulk & Al-Qalam',
    30: 'An-Naba\' s/d An-Nas',
  };
  return juzSurahMap[juzNum] || `Juz ${juzNum}`;
}
