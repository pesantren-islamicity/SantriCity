import React, { useState } from 'react';
import {
  SantriProfile,
  TagihanKeuangan,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  Building2,
  Copy,
  Plus,
  Printer,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';

interface KeuanganSppProps {
  santri: SantriProfile;
  tagihanList: TagihanKeuangan[];
  onPayInvoice: (invoiceId: string, metode: string) => void;
  onAddInvoice: (invoice: Omit<TagihanKeuangan, 'id'>) => void;
  currentRole: UserRole;
  lang: Language;
}

export const KeuanganSppModule: React.FC<KeuanganSppProps> = ({
  santri,
  tagihanList,
  onPayInvoice,
  onAddInvoice,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<TagihanKeuangan | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<TagihanKeuangan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bsi' | 'muamalat'>('qris');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState<boolean>(false);

  // Create Invoice State
  const [bulanTahun, setBulanTahun] = useState<string>('November 2026');
  const [nominalSpp, setNominalSpp] = useState<number>(1350000);
  const [nominalMakan, setNominalMakan] = useState<number>(750000);
  const [nominalKesehatan, setNominalKesehatan] = useState<number>(100000);
  const [nominalInfaq, setNominalInfaq] = useState<number>(50000);

  const filteredTagihan = tagihanList.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const totalBelumLunas = tagihanList
    .filter((t) => t.status === 'Belum Lunas')
    .reduce((acc, curr) => acc + curr.totalNominal, 0);

  const handleCopyVa = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    if (!activePaymentInvoice) return;
    const methodLabel =
      paymentMethod === 'qris'
        ? 'QRIS Instant'
        : paymentMethod === 'bsi'
        ? 'Virtual Account BSI'
        : 'Virtual Account Muamalat';

    onPayInvoice(activePaymentInvoice.id, methodLabel);
    setActivePaymentInvoice(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pos = [
      { item: 'SPP Pendidikan & Asrama Bulanan', nominal: Number(nominalSpp) },
      { item: 'Uang Makan Nutrisi Harian (3x Sehari)', nominal: Number(nominalMakan) },
      { item: 'Layanan Poskestren & Asuransi Santri', nominal: Number(nominalKesehatan) },
      { item: 'Infaq Sarana Digitalisasi SantriCity', nominal: Number(nominalInfaq) },
    ];
    const total = pos.reduce((acc, c) => acc + c.nominal, 0);

    onAddInvoice({
      santriId: santri.id,
      nomorInvoice: `INV/2026/${Math.floor(1000 + Math.random() * 9000)}/SC-0313`,
      bulanTahun,
      posTagihan: pos,
      totalNominal: total,
      jatuhTempo: '2026-11-10',
      status: 'Belum Lunas',
    });
    setIsCreateInvoiceOpen(false);
  };

  const handleExport = () => {
    const rows = tagihanList.map((t) => ({
      Invoice: t.nomorInvoice,
      Bulan: t.bulanTahun,
      TotalNominal: t.totalNominal,
      JatuhTempo: t.jatuhTempo,
      Status: t.status,
      MetodeBayar: t.metodePembayaran || '-',
      TanggalBayar: t.tanggalBayar || '-',
      NoReferensi: t.nomorReferensi || '-',
    }));
    exportToCsv(`riwayat_spp_keuangan_${santri.nis}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Manajemen Keuangan & SPP Digital</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Pembayaran iuran pendidikan pesantren terintegrasi QRIS, Virtual Account Bank Syariah, dan kwitansi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {(currentRole === 'keuangan' || currentRole === 'admin') && (
            <button
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Tagihan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Tagihan Berjalan</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono-numbers ${
                totalBelumLunas > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              Rp {totalBelumLunas.toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {totalBelumLunas > 0 ? 'Segera lakukan pembayaran sebelum jatuh tempo' : 'Alhamdulillah lunas'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Metode Pembayaran Resmi</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white">
            QRIS & Virtual Account Syariah
          </div>
          <p className="text-[11px] text-neutral-400">Bank Syariah Indonesia (BSI) & Muamalat</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Keamanan Transaksi</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-semibold text-white">
            Verifikasi Real-Time Otomatis
          </div>
          <p className="text-[11px] text-neutral-400">Tanpa perlu unggah bukti transfer manual</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl w-fit">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Semua Tagihan ({tagihanList.length})
        </button>
        <button
          onClick={() => setFilterStatus('Belum Lunas')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterStatus === 'Belum Lunas'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Belum Lunas ({tagihanList.filter((t) => t.status === 'Belum Lunas').length})
        </button>
        <button
          onClick={() => setFilterStatus('Lunas')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterStatus === 'Lunas'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Riwayat Lunas ({tagihanList.filter((t) => t.status === 'Lunas').length})
        </button>
      </div>

      {/* Invoices List Cards */}
      <div className="space-y-4">
        {filteredTagihan.map((inv) => (
          <div
            key={inv.id}
            className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {inv.bulanTahun}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-xs font-mono text-neutral-400">
                    {inv.nomorInvoice}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Jatuh Tempo: <strong className="text-neutral-300 font-mono">{inv.jatuhTempo}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    inv.status === 'Lunas'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                  }`}
                >
                  {inv.status}
                </span>

                {inv.status === 'Belum Lunas' ? (
                  <button
                    onClick={() => setActivePaymentInvoice(inv)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Bayar Sekarang</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setReceiptInvoice(inv)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 transition-colors flex items-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kwitansi Resmi</span>
                  </button>
                )}
              </div>
            </div>

            {/* Breakdown item list */}
            <div className="space-y-2 text-xs">
              {inv.posTagihan.map((pos, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-neutral-300 py-1 border-b border-neutral-800/40 last:border-none"
                >
                  <span>{pos.item}</span>
                  <span className="font-mono-numbers text-neutral-200">
                    Rp {pos.nominal.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs font-bold text-white border-t border-neutral-800">
              <span>Total Tagihan:</span>
              <span className="text-base font-mono-numbers text-emerald-400">
                Rp {inv.totalNominal.toLocaleString('id-ID')}
              </span>
            </div>

            {inv.status === 'Lunas' && (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>Dibayar via: {inv.metodePembayaran}</span>
                <span className="font-mono text-neutral-400">{inv.tanggalBayar} · Ref: {inv.nomorReferensi}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Bayar Tagihan (Interactive Checkout) */}
      {activePaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">Pembayaran SPP Digital</h3>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {activePaymentInvoice.nomorInvoice}
                </span>
              </div>
              <button
                onClick={() => setActivePaymentInvoice(null)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Total Pembayaran:</span>
              <span className="text-lg font-bold font-mono-numbers text-emerald-400">
                Rp {activePaymentInvoice.totalNominal.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">
                Pilih Kanal Pembayaran:
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'qris'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-[11px]">QRIS Instant</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bsi')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'bsi'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-[11px]">BSI Syariah</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('muamalat')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'muamalat'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-[11px]">Muamalat</span>
                </button>
              </div>
            </div>

            {/* Payment Instructions according to method */}
            {paymentMethod === 'qris' ? (
              <div className="p-4 rounded-xl bg-white text-neutral-900 text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  QRIS Standar Pembayaran Nasional
                </div>
                {/* Clean inline SVG QR code mock for merchant */}
                <div className="w-44 h-44 mx-auto bg-neutral-100 p-2 rounded-lg border border-neutral-300 flex items-center justify-center">
                  <div className="w-full h-full border-4 border-dashed border-neutral-800 rounded flex flex-col items-center justify-center gap-1">
                    <QrCode className="w-20 h-20 text-neutral-900" />
                    <span className="text-[10px] font-mono font-bold text-neutral-700">
                      SANTRI CITY 313
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-600 font-medium">
                  Scan dengan aplikasi BCA Mobile, BSI Mobile, GoPay, OVO, atau ShopeePay.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                  <span>Nomor Virtual Account:</span>
                  <span className="font-mono text-emerald-400">Verifikasi Otomatis</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="font-mono font-bold text-sm text-white tracking-wider">
                    {paymentMethod === 'bsi' ? '99210-2024-100313' : '77210-2024-100313'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyVa(
                        paymentMethod === 'bsi' ? '992102024100313' : '772102024100313'
                      )
                    }
                    className="p-1.5 text-neutral-400 hover:text-white"
                    title="Salin Nomor VA"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
                {isCopied && (
                  <div className="text-[10px] text-emerald-400 font-mono text-center">
                    Nomor VA berhasil disalin!
                  </div>
                )}
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Buka M-Banking Syariah Anda, pilih menu Pembayaran Virtual Account, masukkan nomor di atas dan konfirmasi nama santri Muhammad Fayyadh.
                </p>
              </div>
            )}

            {/* Simulated Live Payment Settlement Trigger */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActivePaymentInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simulasi Selesai Bayar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official Receipt (Kwitansi Resmi) */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white text-neutral-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                  313
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Kwitansi Pembayaran Digital Resmi
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    SantriCity Masyarakat · Pesantren Islamicity
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptInvoice(null)}
                className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-100 rounded-lg">
                <div>
                  <span className="text-[11px] text-neutral-500 block">Nomor Kwitansi:</span>
                  <span className="font-mono font-bold text-neutral-900">{receiptInvoice.nomorInvoice}</span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-500 block">Tanggal Pelunasan:</span>
                  <span className="font-mono font-bold text-neutral-900">{receiptInvoice.tanggalBayar || 'Lunas'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-500 block">Nama Santri:</span>
                  <span className="font-bold text-neutral-900">{santri.nama} (NIS: {santri.nis})</span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-500 block">Wali Santri:</span>
                  <span className="font-bold text-neutral-900">{santri.waliNama}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-y border-neutral-200 py-3">
                {receiptInvoice.posTagihan.map((pos, idx) => (
                  <div key={idx} className="flex justify-between text-neutral-700">
                    <span>{pos.item}</span>
                    <span className="font-mono font-medium">Rp {pos.nominal.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1">
                <span>Total Dibayar:</span>
                <span className="font-mono text-emerald-700 text-base">
                  Rp {receiptInvoice.totalNominal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="text-[10px] text-neutral-500 text-center pt-2">
                Dokumen ini merupakan tanda bukti pembayaran sah yang dihasilkan otomatis oleh sistem cloud SantriCity 313 terenkripsi end-to-end.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kwitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Terbitkan Tagihan Baru (Bendahara) */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Penerbitan Tagihan Iuran Pesantren</span>
              </h3>
              <button
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Periode Bulan & Tahun</label>
                <input
                  type="text"
                  value={bulanTahun}
                  onChange={(e) => setBulanTahun(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">SPP Pendidikan & Asrama (Rp)</label>
                  <input
                    type="number"
                    value={nominalSpp}
                    onChange={(e) => setNominalSpp(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Uang Makan Nutrisi (Rp)</label>
                  <input
                    type="number"
                    value={nominalMakan}
                    onChange={(e) => setNominalMakan(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Poskestren & Asuransi (Rp)</label>
                  <input
                    type="number"
                    value={nominalKesehatan}
                    onChange={(e) => setNominalKesehatan(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Infaq Sarana Digital (Rp)</label>
                  <input
                    type="number"
                    value={nominalInfaq}
                    onChange={(e) => setNominalInfaq(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between font-bold text-white">
                <span>Total Estimasi Tagihan:</span>
                <span className="text-emerald-400 font-mono-numbers">
                  Rp {(nominalSpp + nominalMakan + nominalKesehatan + nominalInfaq).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Terbitkan Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
