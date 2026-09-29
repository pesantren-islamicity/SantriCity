import {
  SantriProfile,
  NilaiMataPelajaran,
  PresensiHarian,
  DailyStudyIntensity,
  StudyIntensityAnalysis,
  StudyIntensityLevel,
  StudyIntensityActivity,
  WeeklyStudyDay,
} from '../types/pesantren';

// Convert JS Date day of week index to Indonesian WeeklyStudyDay
export const DAY_OF_WEEK_MAP: WeeklyStudyDay[] = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

// Approximate Hijri conversion for late 2026 (Semester Ganjil 1448 H)
export const getApproximateHijriDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Approximate mapping for Sept 2026 ~ Rabi'ul Awwal 1448 H
    if (year === 2026) {
      if (month === 9) {
        const hijriDay = ((day + 18) % 30) + 1;
        return `${hijriDay} Rabi'ul Awwal 1448 H`;
      } else if (month === 8) {
        const hijriDay = ((day + 17) % 30) + 1;
        return `${hijriDay} Safar 1448 H`;
      } else if (month === 7) {
        const hijriDay = ((day + 16) % 30) + 1;
        return `${hijriDay} Muharram 1448 H`;
      }
    }
  } catch {
    // fallback
  }
  return '1448 H';
};

/**
 * Generate synthetic realistic historical presensi records for the semester
 * from 2026-07-01 to 2026-09-29 if records are sparse.
 */
export const generateRealisticHistoricalPresensi = (
  santriId: string,
  existingList: PresensiHarian[]
): PresensiHarian[] => {
  const existingMap = new Map<string, PresensiHarian>();
  existingList
    .filter((p) => p.santriId === santriId)
    .forEach((p) => existingMap.set(p.tanggal, p));

  const result: PresensiHarian[] = [...existingList.filter((p) => p.santriId === santriId)];

  // Dates from 2026-07-01 to 2026-09-29
  const startDate = new Date(2026, 6, 1); // July 1, 2026
  const endDate = new Date(2026, 8, 29); // Sept 29, 2026

  const curr = new Date(startDate);
  let idCounter = 100;

  while (curr <= endDate) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (!existingMap.has(dateStr)) {
      const dayOfWeek = curr.getDay(); // 0: Sun, 5: Fri, 6: Sat
      const isFriday = dayOfWeek === 5;
      const isSunday = dayOfWeek === 0;

      // Realistic variation based on pesantren routine
      // Mid-August (Aug 15-22) is UTS exam week -> 100% attendances
      const isExamWeek = curr.getMonth() === 7 && curr.getDate() >= 15 && curr.getDate() <= 22;
      // Slight illness on July 23-24
      const isSickDay = curr.getMonth() === 6 && (curr.getDate() === 23 || curr.getDate() === 24);

      let subuh: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa' = 'Hadir';
      let dhuha: 'Hadir' | 'Izin' | 'Alpa' = 'Hadir';
      let sekolahPagi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' = 'Hadir';
      let ashar: 'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa' = 'Hadir';
      let halaqahSore: 'Hadir' | 'Izin' | 'Alpa' = 'Hadir';
      let maghribIsya: 'Hadir' | 'Masbuk' | 'Izin' | 'Alpa' = 'Hadir';
      let belajarMalam: 'Hadir' | 'Izin' | 'Alpa' = 'Hadir';
      let ket = 'Hadir tertib di seluruh sesi harian.';

      if (isSickDay) {
        subuh = 'Izin';
        dhuha = 'Izin';
        sekolahPagi = 'Sakit';
        ashar = 'Sakit';
        halaqahSore = 'Izin';
        maghribIsya = 'Izin';
        belajarMalam = 'Izin';
        ket = 'Istirahat di Poskestren karena demam ringan dan flu.';
      } else if (isFriday) {
        // Friday in pesantren: evening is often relaxed / khitobah / santri night
        dhuha = 'Hadir';
        sekolahPagi = 'Hadir';
        halaqahSore = 'Hadir';
        belajarMalam = 'Hadir';
        ket = 'Kegiatan Muhadharah & Khitobah 3 Bahasa malam Jumat.';
      } else if (isSunday) {
        // Sunday morning: Kerja bakti / ro'an & riyadhoh
        dhuha = 'Hadir';
        ket = 'Olahraga sunnah memanah & mutholaah mandiri perpustakaan.';
      } else if (isExamWeek) {
        subuh = 'Hadir';
        dhuha = 'Hadir';
        sekolahPagi = 'Hadir';
        ashar = 'Hadir';
        halaqahSore = 'Hadir';
        maghribIsya = 'Hadir';
        belajarMalam = 'Hadir';
        ket = 'Pekan Asesmen Tengah Semester (UTS) - Mutholaah malam intensif.';
      } else {
        // Normal days with realistic small variations
        const rand = (curr.getDate() * 7 + curr.getMonth() * 13) % 100;
        if (rand === 12 || rand === 42) {
          ashar = 'Masbuk';
          ket = 'Masbuk 1 rakaat shalat Ashar karena menyelesaikan tugas lab.';
        } else if (rand === 73) {
          subuh = 'Masbuk';
          ket = 'Masbuk shalat Subuh, langsung mengejar dzikir ma\'tsurat.';
        }
      }

      const generatedPresensi: PresensiHarian = {
        id: `prs-hist-${idCounter++}`,
        santriId,
        tanggal: dateStr,
        subuh,
        dhuha,
        sekolahPagi,
        ashar,
        halaqahSore,
        maghribIsya,
        belajarMalam,
        keterangan: ket,
        tercatatOleh: 'Musyrif Ali Bin Abi Thalib & Kesantrian',
      };

      result.push(generatedPresensi);
    }

    curr.setDate(curr.getDate() + 1);
  }

  // Sort descending by date
  return result.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
};

/**
 * Calculates the Intensity Index (0-100) and Level (0-4) for a single day.
 */
export const calculateSingleDayIntensity = (
  dateStr: string,
  presensi: PresensiHarian | undefined,
  nilaiList: NilaiMataPelajaran[]
): DailyStudyIntensity => {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayIndex = dateObj.getDay();
  const dayOfWeek = DAY_OF_WEEK_MAP[dayIndex];
  const hijriDate = getApproximateHijriDate(dateStr);

  // 1. Presensi Session Scoring
  let presensiScore = 0;
  let totalAttendedCount = 0;
  const totalSessions = 7;

  // Fallback defaults if no record exists for that day
  const defaultPresensi = presensi || {
    id: `temp-${dateStr}`,
    santriId: '',
    tanggal: dateStr,
    subuh: 'Hadir',
    dhuha: 'Hadir',
    sekolahPagi: 'Hadir',
    ashar: 'Hadir',
    halaqahSore: 'Hadir',
    maghribIsya: 'Hadir',
    belajarMalam: 'Hadir',
    tercatatOleh: 'Sistem Pesantren Otomatis',
  };

  // Subuh (12 pts)
  if (defaultPresensi.subuh === 'Hadir') {
    presensiScore += 12;
    totalAttendedCount++;
  } else if (defaultPresensi.subuh === 'Masbuk') {
    presensiScore += 8;
    totalAttendedCount += 0.7;
  }

  // Dhuha (8 pts)
  if (defaultPresensi.dhuha === 'Hadir') {
    presensiScore += 8;
    totalAttendedCount++;
  }

  // Sekolah Pagi (25 pts)
  if (defaultPresensi.sekolahPagi === 'Hadir') {
    presensiScore += 25;
    totalAttendedCount++;
  } else if (defaultPresensi.sekolahPagi === 'Izin') {
    presensiScore += 6;
  }

  // Ashar (10 pts)
  if (defaultPresensi.ashar === 'Hadir') {
    presensiScore += 10;
    totalAttendedCount++;
  } else if (defaultPresensi.ashar === 'Masbuk') {
    presensiScore += 6;
    totalAttendedCount += 0.7;
  }

  // Halaqah Sore (20 pts)
  if (defaultPresensi.halaqahSore === 'Hadir') {
    presensiScore += 20;
    totalAttendedCount++;
  } else if (defaultPresensi.halaqahSore === 'Izin') {
    presensiScore += 5;
  }

  // Maghrib-Isya (10 pts)
  if (defaultPresensi.maghribIsya === 'Hadir') {
    presensiScore += 10;
    totalAttendedCount++;
  } else if (defaultPresensi.maghribIsya === 'Masbuk') {
    presensiScore += 6;
    totalAttendedCount += 0.7;
  }

  // Belajar Malam (15 pts)
  if (defaultPresensi.belajarMalam === 'Hadir') {
    presensiScore += 15;
    totalAttendedCount++;
  }

  const attendanceRate = Math.round((totalAttendedCount / totalSessions) * 100);

  // 2. Synthesize Academic Activities for that day
  const academicActivities: StudyIntensityActivity[] = [];
  let academicScoreBonus = 0;
  let effectiveMinutes = 0;

  // Add baseline sessions if attended
  if (defaultPresensi.sekolahPagi === 'Hadir') {
    effectiveMinutes += 240; // 4 hours formal school
    // Pick subjects scheduled for this day
    const matchingSubjects = nilaiList.filter((n) =>
      n.hariJadwal ? n.hariJadwal.includes(dayOfWeek) : true
    );
    const primarySubject = matchingSubjects[0] || nilaiList[0];
    if (primarySubject) {
      academicActivities.push({
        id: `act-pagi-${dateStr}`,
        type: 'sekolah',
        title: `KBM Pagi: ${primarySubject.mapel}`,
        subjectKode: primarySubject.kode,
        subjectName: primarySubject.mapel,
        durationMinutes: 240,
        timeSlot: '07:30 - 11:30 WIB',
      });
    }
  }

  if (defaultPresensi.halaqahSore === 'Hadir') {
    effectiveMinutes += 90; // 1.5 hours halaqah
    const tahfidzSubject = nilaiList.find((n) => n.kode === 'TF-07' || n.kategori === 'Agama');
    academicActivities.push({
      id: `act-sore-${dateStr}`,
      type: 'halaqah',
      title: tahfidzSubject
        ? `Halaqah Al-Qur'an: ${tahfidzSubject.mapel}`
        : 'Halaqah Diniyyah & Tahfidz',
      durationMinutes: 90,
      timeSlot: '16:00 - 17:30 WIB',
      subjectName: tahfidzSubject?.mapel,
    });
  }

  if (defaultPresensi.belajarMalam === 'Hadir') {
    effectiveMinutes += 90; // 1.5 hours night study
    const nightSubject =
      nilaiList.find((n) => n.waktuBelajarEfektif === "Malam (Ba'da Maghrib & Belajar Mandiri)") ||
      nilaiList.find((n) => n.kategori === 'Agama') ||
      nilaiList[1];

    academicActivities.push({
      id: `act-malam-${dateStr}`,
      type: 'belajar_malam',
      title: nightSubject
        ? `Muthola'ah Terbimbing: ${nightSubject.mapel}`
        : "Muthola'ah & Review Mandiri",
      durationMinutes: 90,
      timeSlot: '20:00 - 21:30 WIB',
      subjectKode: nightSubject?.kode,
      subjectName: nightSubject?.mapel,
    });
  }

  // 3. Historical assessment surges (UTS / Quizzes / Checkpoints)
  const isMidAugustUTS = dateStr >= '2026-08-15' && dateStr <= '2026-08-22';
  const isEarlySeptemberQuiz =
    dateStr === '2026-09-08' ||
    dateStr === '2026-09-09' ||
    dateStr === '2026-09-22' ||
    dateStr === '2026-09-23';

  if (isMidAugustUTS) {
    academicScoreBonus += 15;
    effectiveMinutes += 60;
    const testSubject =
      nilaiList[(dateObj.getDate() + dateObj.getDay()) % nilaiList.length] || nilaiList[0];
    if (testSubject) {
      academicActivities.push({
        id: `act-uts-${dateStr}`,
        type: 'ujian',
        title: `Asesmen Tengah Semester (UTS): ${testSubject.mapel}`,
        score: testSubject.uts,
        maxScore: 100,
        durationMinutes: 90,
        subjectKode: testSubject.kode,
        subjectName: testSubject.mapel,
        timeSlot: '08:00 - 09:30 WIB',
      });
    }
  } else if (isEarlySeptemberQuiz) {
    academicScoreBonus += 10;
    effectiveMinutes += 45;
    const quizSubject = nilaiList[(dateObj.getDate() * 3) % nilaiList.length] || nilaiList[0];
    if (quizSubject) {
      academicActivities.push({
        id: `act-quiz-${dateStr}`,
        type: 'tugas',
        title: `Ulangan Harian & Setoran: ${quizSubject.mapel}`,
        score: quizSubject.harian,
        maxScore: 100,
        durationMinutes: 60,
        subjectKode: quizSubject.kode,
        subjectName: quizSubject.mapel,
        timeSlot: '10:00 - 11:00 WIB',
      });
    }
  }

  // 4. Combine into final composite index (0-100)
  // Presensi contributes 80%, academic milestones contribute 20%
  let rawScore = Math.round(presensiScore * 0.82 + academicScoreBonus);

  // If sick day or off day, throttle down
  if (defaultPresensi.sekolahPagi === 'Sakit') {
    rawScore = Math.min(rawScore, 15);
    effectiveMinutes = 0;
  }

  // Clamp 0 to 100
  const intensityScore = Math.min(100, Math.max(0, rawScore));

  // Determine Level (0 - 4)
  let intensityLevel: StudyIntensityLevel = 0;
  let productivityStatus: DailyStudyIntensity['productivityStatus'] = 'Istirahat / Pemulihan';
  let isPeakSurge = false;

  if (intensityScore >= 90) {
    intensityLevel = 4;
    productivityStatus = 'Puncak Produktivitas';
    isPeakSurge = true;
  } else if (intensityScore >= 72) {
    intensityLevel = 3;
    productivityStatus = 'Intensitas Tinggi';
  } else if (intensityScore >= 45) {
    intensityLevel = 2;
    productivityStatus = 'Konsisten Produktif';
  } else if (intensityScore >= 20) {
    intensityLevel = 1;
    productivityStatus = 'Intensitas Ringan';
  } else {
    intensityLevel = 0;
    productivityStatus = 'Istirahat / Pemulihan';
  }

  return {
    date: dateStr,
    dayOfWeek,
    hijriDate,
    intensityScore,
    intensityLevel,
    effectiveStudyMinutes: effectiveMinutes,
    presensiSummary: {
      subuh: defaultPresensi.subuh,
      dhuha: defaultPresensi.dhuha,
      sekolahPagi: defaultPresensi.sekolahPagi,
      ashar: defaultPresensi.ashar,
      halaqahSore: defaultPresensi.halaqahSore,
      maghribIsya: defaultPresensi.maghribIsya,
      belajarMalam: defaultPresensi.belajarMalam,
      attendanceRate,
    },
    academicActivities,
    productivityStatus,
    keterangan: defaultPresensi.keterangan,
    isPeakSurge,
  };
};

/**
 * Builds the complete multi-month Study Intensity Analysis for a Santri.
 */
export const buildStudyIntensityAnalysis = (
  santri: SantriProfile,
  presensiList: PresensiHarian[],
  nilaiList: NilaiMataPelajaran[],
  dateRangeDays: 30 | 60 | 90 = 90
): StudyIntensityAnalysis => {
  // Ensure we have historical presensi data populated
  const populatedPresensi = generateRealisticHistoricalPresensi(santri.id, presensiList);
  const presensiMap = new Map<string, PresensiHarian>();
  populatedPresensi.forEach((p) => presensiMap.set(p.tanggal, p));

  // Determine date bounds (up to 2026-09-29)
  const endDateObj = new Date(2026, 8, 29); // Sept 29, 2026
  const startDateObj = new Date(endDateObj);
  startDateObj.setDate(startDateObj.getDate() - (dateRangeDays - 1));

  const dailyRecords: DailyStudyIntensity[] = [];
  const curr = new Date(startDateObj);

  while (curr <= endDateObj) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const pres = presensiMap.get(dateStr);
    const dayAnalysis = calculateSingleDayIntensity(dateStr, pres, nilaiList);
    dailyRecords.push(dayAnalysis);

    curr.setDate(curr.getDate() + 1);
  }

  // Calculate Metrics
  const totalDays = dailyRecords.length;
  let totalScoreSum = 0;
  let totalStudyMinutes = 0;

  const levelDistribution = {
    level0Count: 0,
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    level4Count: 0,
  };

  const dayOfWeekScores: Record<WeeklyStudyDay, { sum: number; count: number }> = {
    Senin: { sum: 0, count: 0 },
    Selasa: { sum: 0, count: 0 },
    Rabu: { sum: 0, count: 0 },
    Kamis: { sum: 0, count: 0 },
    Jumat: { sum: 0, count: 0 },
    Sabtu: { sum: 0, count: 0 },
    Ahad: { sum: 0, count: 0 },
  };

  // Streak calculations (Intensity >= 50 counts as productive)
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Level counts & aggregations
  dailyRecords.forEach((rec) => {
    totalScoreSum += rec.intensityScore;
    totalStudyMinutes += rec.effectiveStudyMinutes;

    if (rec.intensityLevel === 0) levelDistribution.level0Count++;
    else if (rec.intensityLevel === 1) levelDistribution.level1Count++;
    else if (rec.intensityLevel === 2) levelDistribution.level2Count++;
    else if (rec.intensityLevel === 3) levelDistribution.level3Count++;
    else if (rec.intensityLevel === 4) levelDistribution.level4Count++;

    // Day of week stats
    dayOfWeekScores[rec.dayOfWeek].sum += rec.intensityScore;
    dayOfWeekScores[rec.dayOfWeek].count++;

    // Streak tracker
    if (rec.intensityScore >= 45) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  });

  // Calculate Current Streak backwards from the most recent day
  for (let i = dailyRecords.length - 1; i >= 0; i--) {
    if (dailyRecords[i].intensityScore >= 45) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Find Peak Day of Week
  let peakDay: WeeklyStudyDay = 'Selasa';
  let highestDayAvg = 0;
  (Object.keys(dayOfWeekScores) as WeeklyStudyDay[]).forEach((day) => {
    const data = dayOfWeekScores[day];
    if (data.count > 0) {
      const avg = data.sum / data.count;
      if (avg > highestDayAvg) {
        highestDayAvg = avg;
        peakDay = day;
      }
    }
  });

  const averageDailyIntensity = totalDays > 0 ? Math.round(totalScoreSum / totalDays) : 0;
  const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  // Correlation Insight: Calculate average score of assessments on high-intensity days vs normal
  const highIntensityDays = dailyRecords.filter((d) => d.intensityScore >= 75);
  const normalDays = dailyRecords.filter((d) => d.intensityScore < 75);

  let highIntensityAssessments: number[] = [];
  let normalIntensityAssessments: number[] = [];

  highIntensityDays.forEach((d) => {
    d.academicActivities.forEach((a) => {
      if (a.score !== undefined) highIntensityAssessments.push(a.score);
    });
  });

  normalDays.forEach((d) => {
    d.academicActivities.forEach((a) => {
      if (a.score !== undefined) normalIntensityAssessments.push(a.score);
    });
  });

  const highAvg =
    highIntensityAssessments.length > 0
      ? highIntensityAssessments.reduce((a, b) => a + b, 0) / highIntensityAssessments.length
      : 93.4;
  const normAvg =
    normalIntensityAssessments.length > 0
      ? normalIntensityAssessments.reduce((a, b) => a + b, 0) / normalIntensityAssessments.length
      : 84.8;

  const scoreLift = Math.round((highAvg - normAvg) * 10) / 10;
  const liftPct = Math.round(((highAvg - normAvg) / normAvg) * 100 * 10) / 10;

  // Check burnout risk (e.g., > 10 straight days of Level 4 without rest)
  let consecutiveLevel4 = 0;
  let maxConsecutiveLevel4 = 0;
  dailyRecords.forEach((d) => {
    if (d.intensityLevel === 4) {
      consecutiveLevel4++;
      if (consecutiveLevel4 > maxConsecutiveLevel4) {
        maxConsecutiveLevel4 = consecutiveLevel4;
      }
    } else {
      consecutiveLevel4 = 0;
    }
  });

  let burnoutWarning: string | undefined = undefined;
  if (maxConsecutiveLevel4 >= 8) {
    burnoutWarning = `Terdeteksi lonjakan beban belajar tinggi selama ${maxConsecutiveLevel4} hari berurutan tanpa jeda istirahat penuh. Disarankan menyisipkan sesi relaksasi sunnah (Qailulah dan riyadhoh) pada akhir pekan.`;
  }

  const startFormatted = startDateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const endFormatted = endDateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    santriId: santri.id,
    periodLabel: `${startFormatted} – ${endFormatted} (${dateRangeDays} Hari)`,
    startDate: dailyRecords[0]?.date || '',
    endDate: dailyRecords[dailyRecords.length - 1]?.date || '',
    totalDays,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    totalStudyHours,
    averageDailyIntensity,
    peakDayOfWeek: peakDay,
    levelDistribution,
    correlationInsight: {
      highIntensityDaysScoreAvg: Math.round(highAvg * 10) / 10,
      normalDaysScoreAvg: Math.round(normAvg * 10) / 10,
      scoreLiftPercentage: liftPct,
      narrative: `Data historis membuktikan bahwa hari-hari dengan intensitas belajar tinggi (Level 3 & 4) menghasilkan rerata asesmen ${Math.round(highAvg * 10) / 10} (+${scoreLift} poin / +${liftPct}% lebih unggul dibanding hari reguler ${Math.round(normAvg * 10) / 10}).`,
    },
    burnoutWarning,
    dailyRecords,
  };
};
