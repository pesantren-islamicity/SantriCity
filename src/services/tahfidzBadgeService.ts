import { SantriProfile, TahfidzEntry, TahfidzBadge, TahfidzBadgeTier } from '../types/pesantren';

/**
 * Calculates and evaluates all Tahfidz Virtual Achievement Badges for a given santri.
 * Evaluates progress against targetJuz, capaianJuz, tajwid averages, and tasmi records.
 */
export function calculateTahfidzBadges(
  santri: SantriProfile,
  tahfidzList: TahfidzEntry[] = []
): TahfidzBadge[] {
  const capaian = santri.capaianJuz || 0;
  const target = santri.targetJuz || 30;
  const progressRatio = target > 0 ? capaian / target : 0;
  const progressPctTotal = Math.min(100, Math.round(progressRatio * 100));

  // Tajwid average calculation
  const avgTajwid =
    tahfidzList.length > 0
      ? Math.round(tahfidzList.reduce((acc, curr) => acc + (curr.tajwid || 0), 0) / tahfidzList.length)
      : 95;

  // Tasmi count with Mumtaz or Jayyid Jiddan
  const tasmiCount = tahfidzList.filter(
    (e) => e.tipe === "Tasmi'" && (e.kelancaran === 'Mumtaz' || e.kelancaran === 'Jayyid Jiddan')
  ).length;

  // Subuh setoran count with high quality
  const subuhHighQualityCount = tahfidzList.filter(
    (e) => e.waktu === 'Subuh' && (e.tajwid >= 90 || e.kelancaran === 'Mumtaz')
  ).length;

  // 1. Lencana Bintang Juz 'Amma (Min 1 Juz)
  const isJuzAmmaUnlocked = capaian >= 1.0;
  const juzAmmaProgress = Math.min(100, Math.round((capaian / 1.0) * 100));

  // 2. Lencana 25% Target Juz
  const target25Val = target * 0.25;
  const is25Unlocked = capaian >= target25Val;
  const progress25 = Math.min(100, Math.round((capaian / target25Val) * 100));

  // 3. Lencana 10 Juz Mutqin (Fondasi)
  const is10JuzUnlocked = capaian >= 10.0;
  const progress10Juz = Math.min(100, Math.round((capaian / 10.0) * 100));

  // 4. Lencana 50% Target Juz (Separuh Perjalanan)
  const target50Val = target * 0.5;
  const is50Unlocked = capaian >= target50Val;
  const progress50 = Math.min(100, Math.round((capaian / target50Val) * 100));

  // 5. Lencana 75% Target Juz (Akselerasi)
  const target75Val = target * 0.75;
  const is75Unlocked = capaian >= target75Val;
  const progress75 = Math.min(100, Math.round((capaian / target75Val) * 100));

  // 6. Lencana 100% Target Juz (Khatam / Mahkota Cahaya)
  const is100Unlocked = capaian >= target;
  const progress100 = progressPctTotal;

  // 7. Sanad Tajwid Mumtaz (Avg Tajwid >= 92)
  const isTajwidUnlocked = avgTajwid >= 92;
  const tajwidProgress = Math.min(100, Math.round((avgTajwid / 92) * 100));

  // 8. Ksatria Tasmi' Sekali Duduk
  const isTasmiUnlocked = tasmiCount >= 1 || capaian >= 15;
  const tasmiProgress = isTasmiUnlocked ? 100 : Math.min(100, Math.round((tasmiCount / 1) * 100));

  // 9. Penjaga Fajar Istiqomah (Subuh Sessions >= 3 or overall disciplined)
  const isIstiqomahUnlocked = subuhHighQualityCount >= 3 || santri.poinDisiplin >= 92;
  const istiqomahProgress = isIstiqomahUnlocked ? 100 : Math.min(100, Math.round((subuhHighQualityCount / 3) * 100));

  const badges: TahfidzBadge[] = [
    {
      id: 'bdg-juz-amma',
      code: 'BDG-01',
      title: "Bintang Juz 'Amma",
      titleArabic: 'نجم جزء عم',
      subtitle: 'Langkah Pertama Penjaga Wahyu',
      description: "Dianugerahkan atas keberhasilan menuntaskan hafalan Juz 30 (Juz 'Amma) dengan kelancaran tajwid dan makhraj yang baik.",
      category: 'Progres Target Juz',
      tier: 'Bronze',
      iconType: 'star',
      accentColor: 'amber',
      isUnlocked: isJuzAmmaUnlocked,
      unlockedAt: isJuzAmmaUnlocked ? 'Semester Ganjil 2024' : undefined,
      progressPercentage: juzAmmaProgress,
      currentMetricValue: Math.min(1, capaian),
      targetMetricValue: 1,
      progressLabel: `${Math.min(1, capaian).toFixed(1)} / 1.0 Juz`,
      requirementText: 'Tuntaskan minimal 1.0 Juz Al-Qur\'an (Juz 30)',
      motivationalHadith: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ (Sebaik-baik kalian adalah orang yang belajar Al-Qur\'an dan mengajarkannya - HR. Bukhari)',
      benefits: ['Hak setoran tasmi Juz 30 di depan musyrif', 'Pin Bintang Juz Amma pada seragam formal'],
    },
    {
      id: 'bdg-target-25',
      code: 'BDG-02',
      title: 'Perintis Seperempat Jalan',
      titleArabic: 'رائد ربع القرآن',
      subtitle: '25% Menuju Target Juz Pondok',
      description: `Berhasil melampaui 25% (${target25Val.toFixed(1)} Juz) dari total target ${target} Juz yang dicanangkan bersama musyrif.`,
      category: 'Progres Target Juz',
      tier: 'Bronze',
      iconType: 'flame',
      accentColor: 'emerald',
      isUnlocked: is25Unlocked,
      unlockedAt: is25Unlocked ? 'Maret 2025' : undefined,
      progressPercentage: progress25,
      currentMetricValue: capaian,
      targetMetricValue: target25Val,
      progressLabel: `${capaian.toFixed(1)} / ${target25Val.toFixed(1)} Juz`,
      requirementText: `Raih minimal 25% target juz (${target25Val.toFixed(1)} Juz dari ${target} Juz)`,
      motivationalHadith: 'اقْرَؤُوا القُرْآنَ فإنَّه يَأْتي يَومَ القِيامَةِ شَفِيعًا لأَصْحابِهِ (Bacalah Al-Qur\'an, karena ia akan datang pada hari kiamat sebagai syafa\'at bagi para pembacanya - HR. Muslim)',
      benefits: ['Sertifikat Tahfidz Tahap I Tingkat Pesantren', 'Akses ke halaqah murajaah lanjutan'],
    },
    {
      id: 'bdg-juz-10',
      code: 'BDG-03',
      title: 'Penjaga Fondasi 10 Juz',
      titleArabic: 'حافظ عشرة أجزاء',
      subtitle: 'Fondasi 10 Juz Mutqin',
      description: 'Menuntaskan 10 Juz hafalan Al-Qur\'an dengan daya ingat kokoh, mutaba\'ah fajar konsisten, dan evaluasi tajwid berkala.',
      category: 'Progres Target Juz',
      tier: 'Silver',
      iconType: 'shield',
      accentColor: 'blue',
      isUnlocked: is10JuzUnlocked,
      unlockedAt: is10JuzUnlocked ? 'September 2025' : undefined,
      progressPercentage: progress10Juz,
      currentMetricValue: capaian,
      targetMetricValue: 10,
      progressLabel: `${capaian.toFixed(1)} / 10.0 Juz`,
      requirementText: 'Selesaikan hafalan minimal 10 Juz Al-Qur\'an secara mutqin',
      motivationalHadith: 'مَثَلُ الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ حَافِظٌ لَهُ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ (Orang yang membaca Al-Qur\'an dan ia menghafalnya, bersama para malaikat yang mulia dan taat - HR. Bukhari)',
      benefits: ['Hak mengimami sholat rawatib asrama santri', 'Rekomendasi beasiswa halaqah intensif'],
    },
    {
      id: 'bdg-target-50',
      code: 'BDG-04',
      title: 'Separuh Perjalanan Suci (50%)',
      titleArabic: 'نصف المسيرة المباركة',
      subtitle: '50% Target Juz Tercapai',
      description: `Mencapai tonggak emas setengah perjalanan: ${target50Val.toFixed(1)} Juz tuntas dari target ${target} Juz santri.`,
      category: 'Progres Target Juz',
      tier: 'Gold',
      iconType: 'award',
      accentColor: 'amber',
      isUnlocked: is50Unlocked,
      unlockedAt: is50Unlocked ? 'Januari 2026' : undefined,
      progressPercentage: progress50,
      currentMetricValue: capaian,
      targetMetricValue: target50Val,
      progressLabel: `${capaian.toFixed(1)} / ${target50Val.toFixed(1)} Juz`,
      requirementText: `Selesaikan minimal 50% target hafalan (${target50Val.toFixed(1)} Juz)`,
      motivationalHadith: 'يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تَرَتِّلُ فِي الدُّنْيَا (Dikatakan kepada penghafal Al-Qur\'an: Bacalah, naiklah derajatmu, dan tartilkanlah - HR. Tirmidzi)',
      benefits: ['Piagam Penghargaan Santri City 15 Juz', 'Sesi Tasmi Akbar Setengah Al-Qur\'an'],
    },
    {
      id: 'bdg-target-75',
      code: 'BDG-05',
      title: 'Akselerasi Fajar 75%',
      titleArabic: 'فجر ثلاثة أرباع القرآن',
      subtitle: '75% Target Juz Tercapai',
      description: `Melampaui 75% target (${target75Val.toFixed(1)} Juz dari ${target} Juz), memasuki fase pemantapan mutqin dan persiapan pra-sanad.`,
      category: 'Progres Target Juz',
      tier: 'Platinum',
      iconType: 'trophy',
      accentColor: 'purple',
      isUnlocked: is75Unlocked,
      unlockedAt: is75Unlocked ? 'September 2026' : undefined,
      progressPercentage: progress75,
      currentMetricValue: capaian,
      targetMetricValue: target75Val,
      progressLabel: `${capaian.toFixed(1)} / ${target75Val.toFixed(1)} Juz`,
      requirementText: `Raih minimal 75% target hafalan (${target75Val.toFixed(1)} Juz)`,
      motivationalHadith: 'إِنَّ لِلَّهِ أَهْلِينَ مِنَ النَّاسِ، قَالُوا: مَنْ هُمْ يَا رَسُولَ اللَّهِ؟ قَالَ: أَهْلُ الْقُرْآنِ هُمْ أَهْلُ اللَّهِ وَخَاصَّتُهُ (Sesungguhnya Allah memiliki keluarga di antara manusia: para ahlul Qur\'an adalah keluarga Allah dan orang-orang istimewa-Nya - HR. Ahmad)',
      benefits: ['Masuk program karantina tasmi 20-30 juz', 'Bimbingan sanad Qira\'at Ashim riwayat Hafs'],
    },
    {
      id: 'bdg-target-100',
      code: 'BDG-06',
      title: 'Mahkota Cahaya Al-Qur\'an (100%)',
      titleArabic: 'تاج الوقار والنور',
      subtitle: 'Khatam 100% Target Juz Sempurna',
      description: `Puncak keberhasilan: menuntaskan 100% target (${target} Juz). Mempersembahkan mahkota kemuliaan bagi kedua orang tua di akhirat.`,
      category: 'Progres Target Juz',
      tier: 'Diamond',
      iconType: 'crown',
      accentColor: 'cyan',
      isUnlocked: is100Unlocked,
      unlockedAt: is100Unlocked ? 'Oktober 2026' : undefined,
      progressPercentage: progress100,
      currentMetricValue: capaian,
      targetMetricValue: target,
      progressLabel: `${capaian.toFixed(1)} / ${target} Juz`,
      requirementText: `Tuntaskan seluruh 100% target (${target} Juz) secara mutqin`,
      motivationalHadith: 'مَنْ قَرَأَ الْقُرْآنَ وَعَمِلَ بِمَا فِيهِ أُلْبِسَ وَالِدَاهُ تَاجًا يَوْمَ الْقِيَامَةِ (Barangsiapa membaca Al-Qur\'an dan mengamalkannya, kedua orang tuanya akan dipakaikan mahkota pada hari kiamat yang cahayanya lebih terang dari matahari - HR. Abu Dawud)',
      benefits: ['Wisuda Akbar Hafidz Kaffah SantriCity', 'Ijazah Sanad Tahfidz Bersambung ke Rasulullah SAW', 'Rekomendasi Kuliah Timur Tengah'],
    },
    {
      id: 'bdg-tajwid-mumtaz',
      code: 'BDG-07',
      title: 'Sanad Tajwid Mumtaz',
      titleArabic: 'ممتاز في التجويد والإتقan',
      subtitle: 'Rata-Rata Tajwid ≥ 92 (Mumtaz)',
      description: 'Mempertahankan standar mutu bacaan sempurna: makhraj huruf presisi, sifat huruf tepat, dan mad ghunnah teratur rapi.',
      category: 'Mutqin & Fashahah',
      tier: 'Gold',
      iconType: 'sparkles',
      accentColor: 'emerald',
      isUnlocked: isTajwidUnlocked,
      unlockedAt: isTajwidUnlocked ? 'Oktober 2026' : undefined,
      progressPercentage: tajwidProgress,
      currentMetricValue: avgTajwid,
      targetMetricValue: 92,
      progressLabel: `${avgTajwid} / 92 Skor`,
      requirementText: 'Pertahankan rata-rata skor evaluasi tajwid minimal 92/100',
      motivationalHadith: 'الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ (Orang yang mahir membaca Al-Qur\'an akan bersama malaikat utusan yang mulia lagi taat - HR. Muslim)',
      benefits: ['Sertifikasi standarisasi Tahsin Al-Jazariyyah', 'Asisten tutor tajwid junior'],
    },
    {
      id: 'bdg-tasmi-master',
      code: 'BDG-08',
      title: 'Ksatria Tasmi\' Sekali Duduk',
      titleArabic: 'فارس التسميع المتقن',
      subtitle: 'Lulus Tasmi\' Tanpa Catatan Fatal',
      description: 'Dianugerahkan atas kelulusan ujian tasmi bil-ghaib di depan dewan penguji masyaikh pesantren dengan ketahanan mental prima.',
      category: 'Ujian & Tasmi\'',
      tier: 'Platinum',
      iconType: 'book',
      accentColor: 'rose',
      isUnlocked: isTasmiUnlocked,
      unlockedAt: isTasmiUnlocked ? 'Agustus 2026' : undefined,
      progressPercentage: tasmiProgress,
      currentMetricValue: isTasmiUnlocked ? 1 : 0,
      targetMetricValue: 1,
      progressLabel: isTasmiUnlocked ? 'Tercapai (Tasmi Mumtaz)' : '0 / 1 Sesi',
      requirementText: 'Tuntaskan minimal 1 sesi ujian Tasmi\' Resmi sekali duduk predikat Mumtaz',
      motivationalHadith: 'تَعَاهَدُوا هَذَا الْقُرْآنَ فَوَالَّذِي نَفْسِي بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا (Jagalah Al-Qur\'an ini, demi Dzat yang jiwaku berada di tangan-Nya, ia lebih cepat lepas daripada unta dari ikatannya - HR. Bukhari)',
      benefits: ['Surat Keputusan Kelulusan Tasmi Dewan Masyaikh', 'Lencana Pita Kehormatan Qari'],
    },
    {
      id: 'bdg-istiqomah-subuh',
      code: 'BDG-09',
      title: 'Penjaga Fajar Istiqomah',
      titleArabic: 'حارس الفجر المبارك',
      subtitle: 'Disiplin Tinggi Setoran Fajar',
      description: 'Konsisten hadir tepat waktu pada halaqah ba\'da Subuh dan Ashar, menjadi teladan adab mulia dan ketertiban asrama.',
      category: 'Kedisiplinan Halaqah',
      tier: 'Silver',
      iconType: 'gem',
      accentColor: 'cyan',
      isUnlocked: isIstiqomahUnlocked,
      unlockedAt: isIstiqomahUnlocked ? 'Juli 2026' : undefined,
      progressPercentage: istiqomahProgress,
      currentMetricValue: subuhHighQualityCount,
      targetMetricValue: 3,
      progressLabel: `${subuhHighQualityCount} / 3 Sesi Fajar Mumtaz`,
      requirementText: 'Raih minimal 3 setoran fajar dengan predikat Mumtaz serta poin kedisiplinan ≥ 92',
      motivationalHadith: 'اللَّهُمَّ بَارِكْ لأُمَّتِي فِي بُكُورِهَا (Ya Allah berkahilah umatku pada waktu pagi mereka - HR. Abu Dawud)',
      benefits: ['Predikat Santri Teladan Fajar', 'Apresiasi reward poin disiplin pondok'],
    },
  ];

  return badges;
}

/**
 * Calculates summary stats for the badges shelf
 */
export function getTahfidzBadgeSummary(badges: TahfidzBadge[]) {
  const totalBadges = badges.length;
  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const unlockedCount = unlockedBadges.length;
  const unlockPercentage = Math.round((unlockedCount / totalBadges) * 100);

  // Highest unlocked tier
  const tiers: TahfidzBadgeTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  let highestTier: TahfidzBadgeTier = 'Bronze';
  for (const t of tiers) {
    if (unlockedBadges.some((b) => b.tier === t)) {
      highestTier = t;
    }
  }

  // Honorary title
  let honoraryTitle = 'Penuntut Ilmu Al-Qur\'an';
  let honoraryTitleArabic = 'طالب القرآن الكريم';
  if (unlockedCount >= 8) {
    honoraryTitle = 'Ksatria Mahkota Al-Qur\'an';
    honoraryTitleArabic = 'فارس تاج القرآن';
  } else if (unlockedCount >= 6) {
    honoraryTitle = 'Hafidz Berprestasi Mumtaz';
    honoraryTitleArabic = 'حافظ ممتاز متميز';
  } else if (unlockedCount >= 4) {
    honoraryTitle = 'Pejuang Tahfidz Mutqin';
    honoraryTitleArabic = 'مجاهد التحفيظ المتقن';
  } else if (unlockedCount >= 2) {
    honoraryTitle = 'Santri Perintis Hafidz';
    honoraryTitleArabic = 'رائد الحفظ المبارك';
  }

  return {
    totalBadges,
    unlockedCount,
    unlockPercentage,
    highestTier,
    honoraryTitle,
    honoraryTitleArabic,
    recentUnlocked: unlockedBadges.slice(0, 3),
  };
}
