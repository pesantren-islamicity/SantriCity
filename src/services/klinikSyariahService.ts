import {
  ShariaBusinessClinicCase,
  ShariaClinicAuditPillar,
  ShariaClinicAuditResult,
  ShariaContractType,
} from '../types/pesantren';
import { postGeminiTask } from './geminiService';

/**
 * Runs an AI-assisted Sharia Business & Fiqh Muamalah Clinic audit.
 * Evaluates contract validity (bebas riba, gharar, maysir), halal compliance,
 * zakat tijarah calculation, and actionable business execution steps.
 */
export async function diagnoseShariaBusiness(params: {
  caseId: string;
  namaUsaha: string;
  akad: ShariaContractType;
  omzetBulananRp: number;
  modalBerjalanRp: number;
  marginHalalPersen: number;
  statusHalal: string;
  keluhanAtauSkenario: string;
}): Promise<ShariaClinicAuditResult> {
  const {
    caseId,
    namaUsaha,
    akad,
    omzetBulananRp,
    modalBerjalanRp,
    marginHalalPersen,
    statusHalal,
    keluhanAtauSkenario,
  } = params;

  const safeScenario = typeof keluhanAtauSkenario === 'string' ? keluhanAtauSkenario : '';
  const safeStatusHalal = typeof statusHalal === 'string' ? statusHalal : 'Siap Pengajuan';
  const scenarioLower = safeScenario.toLowerCase();
  const hasRibaKeyword =
    scenarioLower.includes('bunga') ||
    scenarioLower.includes('denda keterlambatan berlipat') ||
    scenarioLower.includes('riba');
  const hasGhararKeyword =
    scenarioLower.includes('tanpa stok') ||
    scenarioLower.includes('tidak jelas') ||
    scenarioLower.includes('spekulasi') ||
    scenarioLower.includes('gharar');

  const safeOmzet = Number.isFinite(Number(omzetBulananRp)) ? Number(omzetBulananRp) : 0;
  const safeModal = Number.isFinite(Number(modalBerjalanRp)) ? Number(modalBerjalanRp) : 0;
  const safeMargin = Number.isFinite(Number(marginHalalPersen)) ? Number(marginHalalPersen) : 20;

  const labaBersihEstimasi = Math.round(
    safeOmzet * (safeMargin / 100)
  );
  const estimasiZakatBulananRp = Math.round(labaBersihEstimasi * 0.025);

  // Deterministic baseline evaluation
  const baseKepatuhan = hasRibaKeyword
    ? 68
    : hasGhararKeyword
    ? 79
    : safeStatusHalal.includes('BPJPH')
    ? 96
    : 91;

  const baseDayaSaing = Math.min(
    98,
    Math.max(76, Math.round(74 + safeMargin * 0.6))
  );

  const statusKepatuhan: ShariaClinicAuditResult['statusKepatuhan'] =
    hasRibaKeyword
      ? 'Perlu Koreksi Mendesak (Risiko Gharar/Riba)'
      : hasGhararKeyword || !safeStatusHalal.includes('BPJPH')
      ? 'Memerlukan Penyempurnaan Akad'
      : 'Sah & Sesuai Kaidah Syariah';

  const akadSpecificNote = (() => {
    switch (akad) {
      case 'Murabahah':
        return 'Pastikan barang sudah menjadi milik penjual secara sah sebelum akad jual beli dilakukan, dan sebutkan harga perolehan serta margin keuntungan secara transparan.';
      case 'Mudharabah':
        return 'Nisbah bagi hasil wajib ditetapkan dalam persentase dari laba bersih (bukan nominal tetap), dan kerugian modal murni ditanggung shahibul maal kecuali akibat kelalaian pengelola.';
      case 'Musyarakah':
        return 'Catat porsi modal masing-masing mitra secara tertulis; pembagian laba mengikuti kesepakatan nisbah sedangkan risiko rugi dibagi proporsional sesuai porsi modal.';
      case 'Ijarah':
        return 'Objek sewa/jasa, durasi pemanfaatan, serta besaran ujrah harus disepakati di awal tanpa syarat tersembunyi.';
      case 'Salam / Istishna':
        return 'Untuk sistem pre-order atau pesanan produksi, rincikan spesifikasi barang, ukuran, kuantitas, serta tanggal penyerahan secara akurat agar terhindar dari gharar.';
      case 'Wakalah bil Ujrah':
      default:
        return 'Cantumkan batasan kewenangan wakil serta imbalan jasa (ujrah) yang disepakati di awal akad.';
    }
  })();

  const fallbackPillars: ShariaClinicAuditPillar[] = [
    {
      pilar: 'Bebas Riba & Penalti Batil',
      status: hasRibaKeyword ? 'Perlu Penguatan' : 'Terpenuhi',
      catatan: hasRibaKeyword
        ? 'Ditemukan indikasi bunga/denda komersial. Ganti dengan ta\'widh (ganti rugi riil) atau ta\'zir yang disalurkan untuk dana sosial/infaq.'
        : 'Tidak terdapat skema bunga pinjaman maupun denda keterlambatan yang menjadi pendapatan usaha.',
    },
    {
      pilar: 'Bebas Gharar & Kejelasan Akad',
      status: hasGhararKeyword ? 'Perlu Penguatan' : 'Terpenuhi',
      catatan: hasGhararKeyword
        ? 'Pastikan kepemilikan barang atau izin wakalah sudah jelas sebelum transaksi dilakukan agar tidak termasuk menjual barang yang belum dimiliki.'
        : akadSpecificNote,
    },
    {
      pilar: 'Kehalalan Produk & Rantai Pasok',
      status: safeStatusHalal.includes('BPJPH') ? 'Terpenuhi' : 'Perlu Penguatan',
      catatan: safeStatusHalal.includes('BPJPH')
        ? 'Legalitas halal BPJPH aktif dan bahan baku terverifikasi thoyyib.'
        : 'Lanjutkan proses sertifikasi halal gratis (SEHATI/BPJPH) dan dokumentasikan pemasok bahan baku.',
    },
    {
      pilar: 'Kejelasan Pembagian Margin / Nisbah',
      status: 'Terpenuhi',
      catatan: `Margin usaha sehat (${safeMargin}%) dengan estimasi laba bersih Rp ${labaBersihEstimasi.toLocaleString(
        'id-ID'
      )}/bulan dan modal kerja Rp ${safeModal.toLocaleString('id-ID')}.`,
    },
    {
      pilar: 'Kewajiban Zakat Tijarah & Infaq Produktif',
      status: 'Terpenuhi',
      catatan: `Sisihkan 2.5% zakat/infaq produktif sebesar Rp ${estimasiZakatBulananRp.toLocaleString(
        'id-ID'
      )}/bulan sebagai instrumen keberkahan usaha.`,
    },
  ];

  let result: ShariaClinicAuditResult = {
    caseId,
    namaUsaha: namaUsaha || 'Unit Usaha Santri',
    akadDianalisis: akad,
    assessedAt: new Date().toLocaleString('id-ID'),
    statusKepatuhan,
    skorKepatuhan: baseKepatuhan,
    skorDayaSaingBisnis: baseDayaSaing,
    ringkasanDiagnosis: `Audit muamalah pada "${namaUsaha || 'Unit Usaha Santri'}" dengan akad ${akad} menghasilkan status ${statusKepatuhan}. ${akadSpecificNote}`,
    evaluasiAkad: fallbackPillars,
    rekomendasiEksekusi: [
      `Dokumentasikan lembar akad ${akad} tertulis lengkap dengan rukun ijab-qabul, objek transaksi, dan mekanisme penyelesaian sengketa secara musyawarah.`,
      `Pisahkan rekening kas operasional usaha dan dana pribadi santri guna memudahkan perhitungan zakat perniagaan 2.5% serta audit koperasi pondok.`,
      'Manfaatkan StartUp Center SantriCity untuk digitalisasi laporan laba-rugi mingguan dan perluasan pasar produk halal.',
    ],
    estimasiZakatBulananRp,
    nasihatDewanSyariah:
      'Kejujuran dalam menyebutkan kualitas dan harga pokok adalah ruh keberkahan perniagaan Rasulullah SAW. Keberhasilan bisnis santri diukur dari keabsahan akad sebelum besaran laba.',
  };

  // Live enrichment via server-side Gemini endpoint
  try {
    const parsed = await postGeminiTask<{
      ringkasanDiagnosis?: unknown;
      rekomendasiEksekusi?: unknown;
      nasihatDewanSyariah?: unknown;
    }>('klinik-syariah', {
      namaUsaha,
      akad,
      omzetBulananRp: safeOmzet,
      modalBerjalanRp: safeModal,
      marginHalalPersen: safeMargin,
      statusHalal: safeStatusHalal,
      keluhanAtauSkenario: safeScenario,
    });

    if (parsed && typeof parsed === 'object') {
      const safeSummary =
        typeof parsed.ringkasanDiagnosis === 'string' && parsed.ringkasanDiagnosis.trim()
          ? parsed.ringkasanDiagnosis.trim()
          : result.ringkasanDiagnosis;
      const safeRecs = Array.isArray(parsed.rekomendasiEksekusi)
        ? parsed.rekomendasiEksekusi
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 4)
        : [];
      const safeAdvice =
        typeof parsed.nasihatDewanSyariah === 'string' && parsed.nasihatDewanSyariah.trim()
          ? parsed.nasihatDewanSyariah.trim()
          : result.nasihatDewanSyariah;

      result = {
        ...result,
        ringkasanDiagnosis: safeSummary,
        rekomendasiEksekusi:
          safeRecs.length > 0 ? safeRecs : result.rekomendasiEksekusi,
        nasihatDewanSyariah: safeAdvice,
      };
    }
  } catch (err) {
    console.warn('Server AI Klinik Syariah request failed, using deterministic audit baseline:', err);
  }

  return result;
}

export function buildAuditFromBusinessCase(
  biz: ShariaBusinessClinicCase
): Promise<ShariaClinicAuditResult> {
  return diagnoseShariaBusiness({
    caseId: biz.id,
    namaUsaha: biz.namaUsaha,
    akad: biz.akadUtama,
    omzetBulananRp: biz.omzetBulananRp,
    modalBerjalanRp: biz.modalBerjalanRp,
    marginHalalPersen: biz.marginHalalPersen,
    statusHalal: biz.statusSertifikasiHalal,
    keluhanAtauSkenario: biz.kendalaUtama,
  });
}
