import {
  AcademicGoal,
  AchievementMedal,
  NilaiMataPelajaran,
  SantriProfile,
  TahfidzEntry,
} from '../types/pesantren';

/**
 * Evaluates and awards digital Achievement Medals for a santri based on:
 * 1. Completed Tahfidz targets, juz thresholds, and verified tajwid quality.
 * 2. Completed Academic Goals, achieved goal milestones, and subject grade averages.
 * 3. Integrated Kaffah excellence across Tahfidz, Academics, and Character.
 */
export function evaluateSantriAchievementMedals(
  santri: SantriProfile,
  tahfidzList: TahfidzEntry[] = [],
  nilaiList: NilaiMataPelajaran[] = [],
  academicGoals: AcademicGoal[] = []
): AchievementMedal[] {
  const capaianJuz = santri.capaianJuz || 0;
  const targetJuz = santri.targetJuz || 30;
  const tahfidzRatio = targetJuz > 0 ? capaianJuz / targetJuz : 0;
  const tahfidzPct = Math.min(100, Math.round(tahfidzRatio * 100));

  const santriGoals = academicGoals.filter((g) => g.santriId === santri.id);
  const completedGoals = santriGoals.filter(
    (g) => g.status === 'Tercapai' || g.currentProgressPercentage >= 100
  );

  const allMilestones = santriGoals.flatMap((g) => g.milestones || []);
  const completedMilestones = allMilestones.filter((m) => m.isCompleted);

  const avgTajwid =
    tahfidzList.length > 0
      ? Math.round(
          tahfidzList.reduce((acc, item) => acc + (item.tajwid || 0), 0) /
            tahfidzList.length
        )
      : 0;

  const avgAcademic =
    nilaiList.length > 0
      ? Number(
          (
            nilaiList.reduce((acc, item) => acc + item.akhir, 0) /
            nilaiList.length
          ).toFixed(1)
        )
      : 0;

  const medals: AchievementMedal[] = [
    // 1. Khatam Target Juz Tahfidz
    {
      id: `mdl-tahfidz-target-${santri.id}`,
      kodeMedali: 'MED-THF-30',
      judul: `Medali Mahkota Target ${targetJuz} Juz`,
      judulArab: 'وسام تاج الحفاظ',
      domain: "Tahfidz Al-Qur'an",
      tier: 'Kehormatan (Platinum)',
      ikon: 'crown',
      isEarned: capaianJuz >= targetJuz,
      progressPercent: tahfidzPct,
      progressLabel: `${capaianJuz.toFixed(1)} / ${targetJuz} Juz`,
      kriteria: `Menyelesaikan seluruh target hafalan ${targetJuz} Juz dengan pengesahan Musyrif Tahfidz.`,
      diperolehPada:
        capaianJuz >= targetJuz ? 'Terpenuhi Semester Aktif' : undefined,
      sumberPencapaian: `Target Tahfidz ${targetJuz} Juz`,
      penghargaan:
        'Piagam Kehormatan Pengasuh Pondok & Selempang Wisuda Tahfidz Utama.',
    },

    // 2. Separuh Perjalanan Target Tahfidz (50%+)
    {
      id: `mdl-tahfidz-half-${santri.id}`,
      kodeMedali: 'MED-THF-50',
      judul: 'Medali Ksatria Separuh Target Tahfidz',
      judulArab: 'وسام نصف المسيرة',
      domain: "Tahfidz Al-Qur'an",
      tier: 'Perak (Silver)',
      ikon: 'medal',
      isEarned: capaianJuz >= targetJuz * 0.5,
      progressPercent: Math.min(
        100,
        Math.round((capaianJuz / Math.max(1, targetJuz * 0.5)) * 100)
      ),
      progressLabel: `${capaianJuz.toFixed(1)} / ${(targetJuz * 0.5).toFixed(1)} Juz`,
      kriteria: `Melampaui 50% dari target hafalan Al-Qur'an santri (${(
        targetJuz * 0.5
      ).toFixed(1)} Juz).`,
      diperolehPada:
        capaianJuz >= targetJuz * 0.5 ? 'Semester Berjalan 2026' : undefined,
      sumberPencapaian: 'Evaluasi Halaqah Musyrif',
      penghargaan:
        'Prioritas pembinaan pra-sanad dan sertifikat apresiasi tengah marhalah.',
    },

    // 3. 15 Juz Mutqin Milestone
    {
      id: `mdl-tahfidz-15-${santri.id}`,
      kodeMedali: 'MED-THF-15',
      judul: 'Medali Emas 15 Juz Al-Qur\'an',
      judulArab: 'الوسام الذهبي ١٥ جزءًا',
      domain: "Tahfidz Al-Qur'an",
      tier: 'Emas (Gold)',
      ikon: 'trophy',
      isEarned: capaianJuz >= 15,
      progressPercent: Math.min(100, Math.round((capaianJuz / 15) * 100)),
      progressLabel: `${Math.min(15, capaianJuz).toFixed(1)} / 15.0 Juz`,
      kriteria: 'Menuntaskan hafalan minimal 15 Juz Al-Qur\'an secara terverifikasi.',
      diperolehPada: capaianJuz >= 15 ? 'September 2026' : undefined,
      sumberPencapaian: 'Mutaba\'ah Tahfidz Harian',
      penghargaan:
        'Akses khusus Pod Fokus Maktabah Digital & rekomendasi duta tasmi\' pondok.',
    },

    // 4. Penuntasan Target Akademik / Milestone Goals
    {
      id: `mdl-goal-milestone-${santri.id}`,
      kodeMedali: 'MED-AKD-MS',
      judul:
        completedGoals.length > 0
          ? 'Medali Emas Penuntasan Target Belajar'
          : 'Medali Perintis Milestone Akademik',
      judulArab: 'وسام الإنجاز الأكاديمي',
      domain: 'Target Akademik',
      tier: completedGoals.length > 0 ? 'Emas (Gold)' : 'Perak (Silver)',
      ikon: 'award',
      isEarned: completedGoals.length > 0 || completedMilestones.length >= 3,
      progressPercent:
        completedGoals.length > 0
          ? 100
          : Math.min(100, Math.round((completedMilestones.length / 3) * 100)),
      progressLabel:
        completedGoals.length > 0
          ? `${completedGoals.length} Target Tuntas`
          : `${completedMilestones.length} / 3 Milestone Tuntas`,
      kriteria:
        'Menyelesaikan minimal 1 Target Akademik penuh (100%) atau 3 milestone sasaran belajar strategis.',
      diperolehPada:
        completedGoals.length > 0 || completedMilestones.length >= 3
          ? 'September 2026'
          : undefined,
      sumberPencapaian:
        completedGoals.length > 0
          ? `Goal: ${completedGoals[0].title}`
          : 'Pelacak Milestone Academic Goals',
      penghargaan:
        'Pencatatan kehormatan pada Rapor Kaffah dan rekomendasi pembinaan MQK/Olimpiade.',
    },

    // 5. Predikat Akademik Unggul (Rata-rata >= 90)
    {
      id: `mdl-academic-excellence-${santri.id}`,
      kodeMedali: 'MED-AKD-90',
      judul: 'Medali Bintang Mutamayyiz Akademik',
      judulArab: 'وسام التميز العلمي',
      domain: 'Target Akademik',
      tier: 'Emas (Gold)',
      ikon: 'star',
      isEarned: avgAcademic >= 90,
      progressPercent: Math.min(100, Math.round((avgAcademic / 90) * 100)),
      progressLabel: `Rata-rata ${avgAcademic || 0} / 90.0`,
      kriteria:
        'Meraih rata-rata nilai akhir mata pelajaran Kitab Turats, Bahasa, dan Sains minimal 90.0.',
      diperolehPada: avgAcademic >= 90 ? 'Semester Ganjil 2026' : undefined,
      sumberPencapaian: `${nilaiList.length} Mata Pelajaran Kurikulum`,
      penghargaan:
        'Beasiswa apresiasi buku turats & prioritas reservasi Ibn Al-Haytham AI Lab.',
    },

    // 6. Kaffah Paripurna (Tahfidz + Akademik + Adab)
    {
      id: `mdl-kaffah-integrated-${santri.id}`,
      kodeMedali: 'MED-KFH-01',
      judul: 'Medali Kehormatan Santri Kaffah',
      judulArab: 'وسام الطالب الكافّة',
      domain: 'Prestasi Terpadu',
      tier: 'Kehormatan (Platinum)',
      ikon: 'sparkles',
      isEarned:
        tahfidzPct >= 50 &&
        avgAcademic >= 90 &&
        (santri.poinDisiplin || 0) >= 90 &&
        (avgTajwid >= 90 || tahfidzList.length === 0),
      progressPercent: Math.round(
        (Math.min(1, tahfidzPct / 50) * 34 +
          Math.min(1, avgAcademic / 90) * 33 +
          Math.min(1, (santri.poinDisiplin || 0) / 90) * 33)
      ),
      progressLabel: `Tahfidz ${tahfidzPct}% · Nilai ${avgAcademic} · Adab ${santri.poinDisiplin}`,
      kriteria:
        'Memenuhi keseimbangan Kaffah: progres Tahfidz ≥ 50%, rata-rata akademik ≥ 90, dan poin adab ≥ 90.',
      diperolehPada:
        tahfidzPct >= 50 && avgAcademic >= 90 && (santri.poinDisiplin || 0) >= 90
          ? 'September 2026'
          : undefined,
      sumberPencapaian: 'Integrasi Penilaian Kaffah 360°',
      penghargaan:
        'Gelar kehormatan Santri Teladan Kaffah pada Papan Kehormatan Pondok.',
    },
  ];

  // Dynamically append individual Achievement Medals for every AcademicGoal marked 100% / Tercapai
  completedGoals.forEach((goal, idx) => {
    medals.push({
      id: `mdl-goal-completed-${goal.id}`,
      kodeMedali: `MED-GOAL-${idx + 1}`,
      judul: `Medali Tuntas: ${goal.title}`,
      judulArab: 'وسام إتمام الهدف',
      domain: 'Target Akademik',
      tier: 'Kehormatan (Platinum)',
      ikon: 'trophy',
      isEarned: true,
      progressPercent: 100,
      progressLabel: `${goal.milestones.filter((m) => m.isCompleted).length}/${goal.milestones.length} Milestone`,
      kriteria: `Menuntaskan target belajar "${goal.title}" (${goal.category}).`,
      diperolehPada: goal.updatedAt || 'Baru saja diraih',
      sumberPencapaian: `Academic Goal · ${goal.category}`,
      penghargaan:
        'Sertifikat pencapaian target individual oleh Musyrif & Dewan Asatidz.',
    });
  });

  return medals;
}
