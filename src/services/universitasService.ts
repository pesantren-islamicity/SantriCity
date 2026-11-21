import {
  SantriProfile,
  UniversityAIRecommendation,
  UniversityFacultyCode,
  UniversityProgram,
} from '../types/pesantren';
import { postGeminiTask } from './geminiService';

const VALID_FACULTIES: UniversityFacultyCode[] = ['FTIK', 'FASIH', 'FUAD', 'FEBI'];

function isValidFaculty(val: unknown): val is UniversityFacultyCode {
  return typeof val === 'string' && VALID_FACULTIES.includes(val as UniversityFacultyCode);
}

export async function recommendUniversityProgram(params: {
  santri: SantriProfile;
  minatUtama: string;
  fakultasFokus: UniversityFacultyCode | 'Semua';
  avgNilai: number;
  programs: UniversityProgram[];
}): Promise<UniversityAIRecommendation> {
  const safeSantriNama = params.santri?.nama || 'Santri SantriCity';
  const safeJuz = Number(params.santri?.capaianJuz) || 0;
  const safeDisiplin = Number(params.santri?.poinDisiplin) || 90;
  const safeAvgNilai = Number.isFinite(params.avgNilai) ? params.avgNilai : 85;
  const safeMinat =
    typeof params.minatUtama === 'string' && params.minatUtama.trim()
      ? params.minatUtama.trim()
      : 'Pendidikan Islam, Kepemimpinan & Kewirausahaan Halal';

  const filteredPool =
    params.fakultasFokus !== 'Semua'
      ? params.programs.filter((p) => p.fakultasKode === params.fakultasFokus)
      : params.programs;

  const unggulPool = filteredPool.filter((p) => p.akreditasiUnggul);
  const candidateList = unggulPool.length >= 3 ? unggulPool : filteredPool;

  const fallbackRecs = candidateList.slice(0, 3).map((p) => ({
    namaProdi: p.namaProdi,
    fakultasKode: p.fakultasKode,
    alasanKesesuaian: `Selaras dengan capaian ${safeJuz} Juz dan rata-rata nilai ${safeAvgNilai.toFixed(1)} (${p.jurusan}${p.akreditasiUnggul ? ', Terakreditasi Unggul (*)' : ''}).`,
  }));

  let result: UniversityAIRecommendation = {
    santriNama: safeSantriNama,
    minatUtama: safeMinat,
    assessedAt: new Date().toLocaleString('id-ID'),
    ringkasanProfil: `${safeSantriNama} memiliki capaian hafalan ${safeJuz} Juz, poin disiplin ${safeDisiplin}, dan rerata akademik ${safeAvgNilai.toFixed(1)} — sangat siap mengikuti perkuliahan berstandar internasional di Universitas Islamicity Internasional.`,
    rekomendasiProdi:
      fallbackRecs.length > 0
        ? fallbackRecs
        : [
            {
              namaProdi: 'Pendidikan Agama Islam',
              fakultasKode: 'FTIK',
              alasanKesesuaian:
                'Fondasi kuat untuk pengembangan pendidik dan pemimpin lembaga Islam modern.',
            },
          ],
    rencanaPersiapanSantri: [
      'Ikuti program intensif ToAFL (Bahasa Arab) dan IELTS guna memenuhi standar perkuliahan multibahasa.',
      'Lampirkan portofolio sertifikat tahfidz dan prestasi pesantren untuk Jalur Beasiswa Internasional Kaffah.',
      'Konsultasikan pemetaan mata kuliah pilihan lintas fakultas bersama wali kelas dan tim akademik.',
    ],
    nasihatAkademik:
      'Satukan kecerdasan intelektual, sanad keilmuan Al-Qur\'an, dan etika profesional agar kuliah menjadi jalan pengabdian ilmu bagi peradaban.',
  };

  try {
    const parsed = await postGeminiTask<{
      ringkasanProfil?: unknown;
      rekomendasiProdi?: unknown;
      rencanaPersiapanSantri?: unknown;
      nasihatAkademik?: unknown;
    }>('universitas-islamicity', {
      santriNama: safeSantriNama,
      capaianJuz: safeJuz,
      avgNilai: safeAvgNilai,
      poinDisiplin: safeDisiplin,
      minatUtama: safeMinat,
      fakultasFokus: params.fakultasFokus,
    });

    if (parsed && typeof parsed === 'object') {
      const safeRecs = Array.isArray(parsed.rekomendasiProdi)
        ? parsed.rekomendasiProdi
            .map((item) => {
              if (!item || typeof item !== 'object') return null;
              const obj = item as Record<string, unknown>;
              const namaProdi =
                typeof obj.namaProdi === 'string' ? obj.namaProdi.trim() : '';
              const alasanKesesuaian =
                typeof obj.alasanKesesuaian === 'string'
                  ? obj.alasanKesesuaian.trim()
                  : '';
              const fakultasKode: UniversityFacultyCode = isValidFaculty(
                obj.fakultasKode
              )
                ? obj.fakultasKode
                : params.fakultasFokus !== 'Semua'
                ? params.fakultasFokus
                : 'FTIK';
              if (!namaProdi) return null;
              return {
                namaProdi,
                fakultasKode,
                alasanKesesuaian:
                  alasanKesesuaian ||
                  'Sesuai dengan minat studi dan rekam jejak akademik santri.',
              };
            })
            .filter(
              (
                item
              ): item is {
                namaProdi: string;
                fakultasKode: UniversityFacultyCode;
                alasanKesesuaian: string;
              } => item !== null
            )
            .slice(0, 3)
        : [];

      const safeSteps = Array.isArray(parsed.rencanaPersiapanSantri)
        ? parsed.rencanaPersiapanSantri
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 4)
        : [];

      result = {
        ...result,
        ringkasanProfil:
          typeof parsed.ringkasanProfil === 'string' &&
          parsed.ringkasanProfil.trim()
            ? parsed.ringkasanProfil.trim()
            : result.ringkasanProfil,
        rekomendasiProdi:
          safeRecs.length > 0 ? safeRecs : result.rekomendasiProdi,
        rencanaPersiapanSantri:
          safeSteps.length > 0 ? safeSteps : result.rencanaPersiapanSantri,
        nasihatAkademik:
          typeof parsed.nasihatAkademik === 'string' &&
          parsed.nasihatAkademik.trim()
            ? parsed.nasihatAkademik.trim()
            : result.nasihatAkademik,
      };
    }
  } catch (err) {
    console.warn('Server AI Universitas Islamicity fallback used:', err);
  }

  return result;
}
