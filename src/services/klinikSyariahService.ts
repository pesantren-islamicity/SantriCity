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

  const labaBersihEstimasi = Math.round(
    omzetBulananRp * (marginHalalPersen / 100)
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
    Math.max(76, Math.round(74 + marginHalalPersen * 0.6))
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
      status: statusHalal.includes('BPJPH') ? 'Terpenuhi' : 'Perlu Penguatan',
      catatan: statusHalal.includes('BPJPH')
        ? 'Legalitas halal BPJPH aktif dan bahan baku terverifikasi thoyyib.'
        : 'Lanjutkan proses sertifikasi halal gratis (SEHATI/BPJPH) dan dokumentasikan pemasok bahan baku.',
    },
    {
      pilar: 'Kejelasan Pembagian Margin / Nisbah',
      status: 'Terpenuhi',
      catatan: `Margin usaha sehat (${marginHalalPersen}%) dengan estimasi laba bersih Rp ${labaBersihEstimasi.toLocaleString(
        'id-ID'
      )}/bulan dan modal kerja Rp ${modalBerjalanRp.toLocaleString('id-ID')}.`,
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
    namaUsaha,
    akadDianalisis: akad,
    assessedAt: new Date().toLocaleString('id-ID'),
    statusKepatuhan,
    skorKepatuhan: baseKepatuhan,
    skorDayaSaingBisnis: baseDayaSaing,
    ringkasanDiagnosis: `Audit muamalah pada "${namaUsaha}" dengan akad ${akad} menghasilkan status ${statusKepatuhan}. ${akadSpecificNote}`,
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
      ringkasanDiagnosis?: string;
      rekomendasiEksekusi?: string[];
      nasihatDewanSyariah?: string;
    }>('klinik-syariah', {
      namaUsaha,
      akad,
      omzetBulananRp,
      modalBerjalanRp,
      marginHalalPersen,
      statusHalal,
      keluhanAtauSkenario,
    });

    if (parsed.ringkasanDiagnosis) {
      result = {
        ...result,
        ringkasanDiagnosis: parsed.ringkasanDiagnosis,
        rekomendasiEksekusi: Array.isArray(parsed.rekomendasiEksekusi)
          ? parsed.rekomendasiEksekusi.slice(0, 4)
          : result.rekomendasiEksekusi,
        nasihatDewanSyariah:
          parsed.nasihatDewanSyariah || result.nasihatDewanSyariah,
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
