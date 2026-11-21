import {
  ELibraryAIRecommendation,
  ELibraryBook,
  ELibraryCategory,
  SantriProfile,
} from '../types/pesantren';
import { postGeminiTask } from './geminiService';

const VALID_CATEGORIES: ELibraryCategory[] = [
  "Tafsir & Al-Qur'an",
  'Hadis & Sirah',
  'Fiqih & Muamalah',
  'Bahasa Arab & Adab',
  'Ekonomi, Bisnis & Haji',
  'Sains & Teknologi Santri',
];

function isValidCategory(val: unknown): val is ELibraryCategory {
  return typeof val === 'string' && VALID_CATEGORIES.includes(val as ELibraryCategory);
}

export async function recommendLibraryBooks(params: {
  santri: SantriProfile;
  avgNilai: number;
  minatBaca: string;
  tujuanBelajar: string;
  kategoriFokus: ELibraryCategory | 'Semua';
  books: ELibraryBook[];
}): Promise<ELibraryAIRecommendation> {
  const safeSantriNama = params.santri?.nama || 'Santri SantriCity';
  const safeKelas = params.santri?.kelas || 'Santri Reguler';
  const safeJuz = Number(params.santri?.capaianJuz) || 0;
  const safeAvgNilai = Number.isFinite(params.avgNilai) ? params.avgNilai : 85;
  const safeMinat =
    typeof params.minatBaca === 'string' && params.minatBaca.trim()
      ? params.minatBaca.trim()
      : 'Pendalaman Tafsir Qur’an, Manajemen Haji/Bisnis Syariah, dan Inovasi Teknologi Santri';
  const safeTujuan =
    typeof params.tujuanBelajar === 'string' && params.tujuanBelajar.trim()
      ? params.tujuanBelajar.trim()
      : 'Memperkuat hafalan, memperluas riset ilmiah, serta menyiapkan studi lanjut unggulan.';

  const pool =
    params.kategoriFokus !== 'Semua'
      ? params.books.filter((b) => b.kategori === params.kategoriFokus)
      : params.books;

  const keywords = `${safeMinat} ${safeTujuan}`
    .toLowerCase()
    .split(/[\s,.;:/]+/)
    .filter((w) => w.length >= 3);

  const scoredPool = [...(pool.length > 0 ? pool : params.books)].sort((a, b) => {
    const textA = `${a.judul} ${a.ringkasanIsi} ${a.topikKunci.join(' ')} ${a.kategori}`.toLowerCase();
    const textB = `${b.judul} ${b.ringkasanIsi} ${b.topikKunci.join(' ')} ${b.kategori}`.toLowerCase();
    const scoreA = keywords.reduce((sum, kw) => (textA.includes(kw) ? sum + 2 : sum), a.ratingPembaca);
    const scoreB = keywords.reduce((sum, kw) => (textB.includes(kw) ? sum + 2 : sum), b.ratingPembaca);
    return scoreB - scoreA;
  });

  const fallbackBooks = scoredPool.slice(0, 3).map((book, idx) => ({
    kodeKitab: book.kodeKitab,
    judulBuku: book.judul,
    kategori: book.kategori,
    alasanKesesuaian: `Sangat relevan dengan minat "${safeMinat.slice(0, 65)}" serta mendukung capaian tahfidz ${safeJuz} Juz dan rata-rata nilai ${safeAvgNilai.toFixed(1)}.`,
    targetBacaPekanan:
      idx === 0
        ? '25 halaman / pekan (ba’da Subuh & Ashar)'
        : idx === 1
        ? '20 halaman / pekan (sesi literasi malam)'
        : '15 halaman / pekan (ringkasan & diskusi halaqah)',
  }));

  let result: ELibraryAIRecommendation = {
    santriNama: safeSantriNama,
    minatBaca: safeMinat,
    tujuanBelajar: safeTujuan,
    assessedAt: new Date().toLocaleString('id-ID'),
    ringkasanMinat: `${safeSantriNama} (${safeKelas}) menunjukkan kesiapan literasi tinggi dengan capaian ${safeJuz} Juz dan rerata nilai ${safeAvgNilai.toFixed(1)}. Kombinasi bacaan turats dan literatur kontemporer akan mengoptimalkan target belajar "${safeTujuan.slice(0, 70)}".`,
    bukuDirekomendasikan: fallbackBooks,
    rencanaLiterasiSantri: [
      'Alokasikan 25 menit rutin setiap ba’da Ashar untuk membaca bab inti menggunakan E-Reader Digital.',
      'Buat ringkasan 3 poin faedah dan diskusikan bersama musyrif atau teman halaqah setiap pekan.',
      'Aktifkan peminjaman QR untuk menyimpan akses buku pendukung proyek karya tulis ilmiah santri.',
    ],
    nasihatLiterasi:
      'Ikatlah ilmu dengan tulisan dan bacaan yang teratur; satu bab yang dipahami mendalam lebih berkah daripada seratus lembar yang tergesa-gesa.',
  };

  try {
    const availableBooksText = params.books
      .map(
        (b) =>
          `- [${b.kodeKitab}] "${b.judul}" | Kategori: ${b.kategori} | Penulis: ${b.penulis} | Topik: ${b.topikKunci.join(', ')}`
      )
      .join('\n');

    const parsed = await postGeminiTask<{
      ringkasanMinat?: unknown;
      bukuDirekomendasikan?: unknown;
      rencanaLiterasiSantri?: unknown;
      nasihatLiterasi?: unknown;
    }>('elibrary-rekomendasi', {
      santriNama: safeSantriNama,
      kelas: safeKelas,
      capaianJuz: safeJuz,
      avgNilai: safeAvgNilai,
      minatBaca: safeMinat,
      tujuanBelajar: safeTujuan,
      kategoriFokus: params.kategoriFokus,
      availableBooksText,
    });

    if (parsed && typeof parsed === 'object') {
      const safeRecs = Array.isArray(parsed.bukuDirekomendasikan)
        ? parsed.bukuDirekomendasikan
            .map((item) => {
              if (!item || typeof item !== 'object') return null;
              const obj = item as Record<string, unknown>;
              const rawKode = typeof obj.kodeKitab === 'string' ? obj.kodeKitab.trim() : '';
              const rawJudul = typeof obj.judulBuku === 'string' ? obj.judulBuku.trim() : '';
              const matchedBook =
                params.books.find(
                  (b) =>
                    b.kodeKitab.toLowerCase() === rawKode.toLowerCase() ||
                    b.judul.toLowerCase() === rawJudul.toLowerCase()
                ) || scoredPool[0];
              if (!matchedBook) return null;
              return {
                kodeKitab: matchedBook.kodeKitab,
                judulBuku: matchedBook.judul,
                kategori: isValidCategory(obj.kategori) ? obj.kategori : matchedBook.kategori,
                alasanKesesuaian:
                  typeof obj.alasanKesesuaian === 'string' && obj.alasanKesesuaian.trim()
                    ? obj.alasanKesesuaian.trim()
                    : `Cocok untuk memperdalam minat ${safeMinat} pada bidang ${matchedBook.kategori}.`,
                targetBacaPekanan:
                  typeof obj.targetBacaPekanan === 'string' && obj.targetBacaPekanan.trim()
                    ? obj.targetBacaPekanan.trim()
                    : '20 halaman / pekan (sesi literasi terstruktur)',
              };
            })
            .filter(
              (
                item
              ): item is {
                kodeKitab: string;
                judulBuku: string;
                kategori: ELibraryCategory;
                alasanKesesuaian: string;
                targetBacaPekanan: string;
              } => item !== null
            )
            .slice(0, 3)
        : [];

      const safePlan = Array.isArray(parsed.rencanaLiterasiSantri)
        ? parsed.rencanaLiterasiSantri
            .map((step) => (typeof step === 'string' ? step.trim() : ''))
            .filter(Boolean)
            .slice(0, 4)
        : [];

      result = {
        ...result,
        ringkasanMinat:
          typeof parsed.ringkasanMinat === 'string' && parsed.ringkasanMinat.trim()
            ? parsed.ringkasanMinat.trim()
            : result.ringkasanMinat,
        bukuDirekomendasikan:
          safeRecs.length > 0 ? safeRecs : result.bukuDirekomendasikan,
        rencanaLiterasiSantri:
          safePlan.length > 0 ? safePlan : result.rencanaLiterasiSantri,
        nasihatLiterasi:
          typeof parsed.nasihatLiterasi === 'string' && parsed.nasihatLiterasi.trim()
            ? parsed.nasihatLiterasi.trim()
            : result.nasihatLiterasi,
      };
    }
  } catch (err) {
    console.warn('Server AI E-Library recommendation fallback used:', err);
  }

  return result;
}
