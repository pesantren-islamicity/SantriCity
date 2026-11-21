import {
  HajiUmrohAIStudyCaseResult,
  HajiUmrohAyatBasis,
  HajiUmrohPracticumSession,
} from '../types/pesantren';
import { postGeminiTask } from './geminiService';

const AYAT_DESCRIPTIONS: Record<HajiUmrohAyatBasis, string> = {
  'QS 22:27':
    'QS Al-Hajj 22:27 menegaskan kewajiban seruan publikasi syiar haji (adzdzin fin-nas) serta kesiapan melayani mobilitas jamaah yang datang dari segala penjuru jauh.',
  'QS 22:28':
    'QS Al-Hajj 22:28 menyoroti dimensi manfaat sosial-ekonomi yang dirasakan jamaah dan umat, dzikir atas rezeki hewan ternak (hadyu), serta keadilan distribusi bagi fakir miskin.',
  'QS 22:29':
    'QS Al-Hajj 22:29 menekankan penyempurnaan manasik melalui penghilangan kotoran/tahallul (tsummalyaqdhu tafatsahum), penunaian nazar amanah, dan Thawaf di Baitul Atiq.',
};

export async function analyzeHajiUmrohStudyCase(params: {
  topik: string;
  fokusAyat: HajiUmrohAyatBasis;
  peranSimulasi: HajiUmrohPracticumSession['peranSimulasi'];
  skenarioKasus: string;
}): Promise<HajiUmrohAIStudyCaseResult> {
  const safeTopik =
    typeof params.topik === 'string' && params.topik.trim()
      ? params.topik.trim()
      : 'Manajemen Layanan Jamaah Kaffah';
  const safeAyat: HajiUmrohAyatBasis =
    params.fokusAyat === 'QS 22:27' ||
    params.fokusAyat === 'QS 22:28' ||
    params.fokusAyat === 'QS 22:29'
      ? params.fokusAyat
      : 'QS 22:27';
  const safeRole = params.peranSimulasi || 'Muthawwif / Pembimbing Ibadah';
  const safeSkenario =
    typeof params.skenarioKasus === 'string' && params.skenarioKasus.trim()
      ? params.skenarioKasus.trim()
      : 'Bagaimana mengintegrasikan layanan jamaah yang amanah dan sesuai kaidah manasik?';

  let result: HajiUmrohAIStudyCaseResult = {
    topik: safeTopik,
    fokusAyat: safeAyat,
    assessedAt: new Date().toLocaleString('id-ID'),
    ringkasanAnalisis: `Pendekatan kaffah untuk peran ${safeRole} pada topik "${safeTopik}" menuntut keseimbangan antara kepatuhan fiqh manasik, ketepatan SOP operasional, dan pelayanan penuh empati kepada tamu Allah.`,
    relevansiAyat: AYAT_DESCRIPTIONS[safeAyat],
    langkahManajemenKaffah: [
      `Petakan alur layanan jamaah secara tertulis agar selaras dengan prinsip ${safeAyat} dan regulasi PPIU/PIHK Kemenag.`,
      'Siapkan pendampingan kelompok kecil (rasio ideal 1 muthawwif per 15–20 jamaah) disertai protokol kesehatan untuk jamaah lansia.',
      'Lakukan audit keterbukaan biaya, jadwal keberangkatan, dan dokumentasi pelaporan pasca-ibadah kepada jamaah dan keluarga.',
    ],
    indikatorKeberhasilan:
      'Jamaah menunaikan seluruh rukun dan wajib ibadah dengan tenang, sah secara syar\'i, serta seluruh hak akomodasi dan logistik terpenuhi sesuai akad.',
    referensiDalil:
      'QS Al-Hajj (22): 27–29; Al-Idhah fi Manasikil Hajj (Imam An-Nawawi); UU No. 8 Tahun 2019.',
  };

  try {
    const parsed = await postGeminiTask<{
      ringkasanAnalisis?: unknown;
      relevansiAyat?: unknown;
      langkahManajemenKaffah?: unknown;
      indikatorKeberhasilan?: unknown;
      referensiDalil?: unknown;
    }>('haji-umroh', {
      topik: safeTopik,
      fokusAyat: safeAyat,
      peranSimulasi: safeRole,
      skenarioKasus: safeSkenario,
    });

    if (parsed && typeof parsed === 'object') {
      const safeSteps = Array.isArray(parsed.langkahManajemenKaffah)
        ? parsed.langkahManajemenKaffah
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 4)
        : [];

      result = {
        ...result,
        ringkasanAnalisis:
          typeof parsed.ringkasanAnalisis === 'string' && parsed.ringkasanAnalisis.trim()
            ? parsed.ringkasanAnalisis.trim()
            : result.ringkasanAnalisis,
        relevansiAyat:
          typeof parsed.relevansiAyat === 'string' && parsed.relevansiAyat.trim()
            ? parsed.relevansiAyat.trim()
            : result.relevansiAyat,
        langkahManajemenKaffah:
          safeSteps.length > 0 ? safeSteps : result.langkahManajemenKaffah,
        indikatorKeberhasilan:
          typeof parsed.indikatorKeberhasilan === 'string' &&
          parsed.indikatorKeberhasilan.trim()
            ? parsed.indikatorKeberhasilan.trim()
            : result.indikatorKeberhasilan,
        referensiDalil:
          typeof parsed.referensiDalil === 'string' && parsed.referensiDalil.trim()
            ? parsed.referensiDalil.trim()
            : result.referensiDalil,
      };
    }
  } catch (err) {
    console.warn('Server AI Haji Umroh fallback used:', err);
  }

  return result;
}
