import React, { useState, useRef } from 'react';
import {
  SantriProfile,
  IzinKeluarPondok,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  QrCode,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ScanLine,
  Printer,
  Download,
  Copy,
  Check,
  Lock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';
import { PermitSvgQrCode } from './PermitSvgQrCode';

interface PerizinanQrProps {
  santri: SantriProfile;
  izinList: IzinKeluarPondok[];
  onAddIzin: (izin: Omit<IzinKeluarPondok, 'id'>) => void;
  onUpdateIzinStatus: (izinId: string, status: IzinKeluarPondok['status'], note?: string) => void;
  currentRole: UserRole;
  lang: Language;
}

const isApprovedPermitStatus = (status: IzinKeluarPondok['status']): boolean =>
  status === 'Disetujui Pengasuh' ||
  status === 'Sedang Keluar' ||
  status === 'Selesai Kembali' ||
  status === 'Terlambat';

const getStatusBadgeStyle = (status: IzinKeluarPondok['status']): string => {
  switch (status) {
    case 'Disetujui Pengasuh':
      return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
    case 'Sedang Keluar':
      return 'bg-cyan-950 text-cyan-300 border-cyan-700/60';
    case 'Selesai Kembali':
      return 'bg-neutral-900 text-neutral-300 border-neutral-700';
    case 'Ditolak':
    case 'Terlambat':
      return 'bg-rose-950 text-rose-300 border-rose-800';
    default:
      return 'bg-amber-950 text-amber-300 border-amber-800';
  }
};

export const PerizinanQrModule: React.FC<PerizinanQrProps> = ({
  santri,
  izinList,
  onAddIzin,
  onUpdateIzinStatus,
  currentRole,
  lang,
}) => {
  void getTranslation(lang);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedQrPass, setSelectedQrPass] = useState<IzinKeluarPondok | null>(null);
  const [scannerSimulatorOpen, setScannerSimulatorOpen] = useState<boolean>(false);
  const [scanInput, setScanInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);

  // Form State
  const [keperluan, setKeperluan] = useState<'Keluarga' | 'Sakit/Rujukan' | 'Lomba/Eksternal' | 'Liburan Semester' | 'Lainnya'>('Keluarga');
  const [detailAlasan, setDetailAlasan] = useState<string>('Menghadiri agenda silaturahmi keluarga di kota asal');
  const [penjemput, setPenjemput] = useState<string>(santri.waliNama);
  const [hubunganPenjemput, setHubunganPenjemput] = useState<string>(santri.waliHubungan);
  const [waktuRencanaKeluar, setWaktuRencanaKeluar] = useState<string>('2026-10-02 08:00 WIB');
  const [waktuRencanaKembali, setWaktuRencanaKembali] = useState<string>('2026-10-04 17:00 WIB');

  const modalQrContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permitCode = `IZ-2026-${Math.floor(10 + Math.random() * 90)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrPayload = `SC313-VERIFIED-PASS:${permitCode}:${santri.nis}:${santri.nama.replace(/\s+/g, '_')}`;

    onAddIzin({
      santriId: santri.id,
      kodeIzin: permitCode,
      keperluan,
      detailAlasan,
      penjemput,
      hubunganPenjemput,
      waktuRencanaKeluar,
      waktuRencanaKembali,
      status: currentRole === 'admin' || currentRole === 'ustaz' ? 'Disetujui Pengasuh' : 'Diajukan',
      disetujuiOleh: currentRole === 'admin' || currentRole === 'ustaz' ? 'K.H. Ahmad Nawawi, M.A.' : undefined,
      qrPayload,
      catatanPetugasGerbang: 'Wajib membawa kartu fisik santri dan melapor saat tiba.',
    });
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const rows = izinList.map((i) => ({
      KodeIzin: i.kodeIzin,
      Keperluan: i.keperluan,
      Alasan: i.detailAlasan,
      Penjemput: `${i.penjemput} (${i.hubunganPenjemput})`,
      RencanaKeluar: i.waktuRencanaKeluar,
      RencanaKembali: i.waktuRencanaKembali,
      AktualKeluar: i.waktuAktualKeluar || '-',
      AktualKembali: i.waktuAktualKembali || '-',
      Status: i.status,
      DisetujuiOleh: i.disetujuiOleh || '-',
    }));
    exportToCsv(`perizinan_santri_${santri.nis}`, rows);
  };

  const handleDownloadSvg = (permit: IzinKeluarPondok) => {
    const svgEl = modalQrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(svgEl)}`;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-Izin-${permit.kodeIzin}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyPayload = (permit: IzinKeluarPondok) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(permit.qrPayload).catch(() => {});
    }
    setCopiedPassId(permit.id);
    window.setTimeout(() => setCopiedPassId(null), 2000);
  };

  const openScannerWithPermit = (permit?: IzinKeluarPondok) => {
    const target = permit || activePass;
    setScanInput(target ? target.qrPayload : '');
    setScanResult(null);
    setScannerSimulatorOpen(true);
  };

  const activePass = izinList.find(
    (i) => i.status === 'Disetujui Pengasuh' || i.status === 'Sedang Keluar'
  );
  const approvedPermits = izinList.filter((i) => isApprovedPermitStatus(i.status));

  const normalizedQuery = scanInput.trim().toLowerCase();
  const matchedScannedPermit = normalizedQuery
    ? izinList.find(
        (item) =>
          item.qrPayload.toLowerCase() === normalizedQuery ||
          item.kodeIzin.toLowerCase() === normalizedQuery ||
          item.qrPayload.toLowerCase().includes(normalizedQuery)
      )
    : activePass;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>Sistem Perizinan Keluar Berbasis SVG QR Code</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Setiap izin yang disetujui otomatis menghasilkan QR Code vektor (SVG) terenkripsi untuk verifikasi instan petugas gerbang pos pesantren.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => openScannerWithPermit(activePass)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <ScanLine className="w-4 h-4 text-cyan-400" />
            <span>Verifikasi Gerbang (Pos Satpam)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Izin Baru</span>
          </button>
        </div>
      </div>

      {/* Active Permit Highlight Card with Visual SVG QR Code */}
      {activePass ? (
        <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/20">
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
            <div className="flex-1 w-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {activePass.kodeIzin}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Izin Aktif: {activePass.keperluan}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeStyle(activePass.status)}`}>
                    {activePass.status}
                  </span>
                  <button
                    onClick={() => openScannerWithPermit(activePass)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Pindai Pos 1</span>
                  </button>
                  <button
                    onClick={() => setSelectedQrPass(activePass)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Perbesar Pass</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 text-[11px] block">Rencana Keluar Pondok:</span>
                  <span className="font-mono text-white font-medium">{activePass.waktuRencanaKeluar}</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 text-[11px] block">Batas Waktu Kembali:</span>
                  <span className="font-mono text-white font-medium">{activePass.waktuRencanaKembali}</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 text-[11px] block">Pihak Penjemput Resmi:</span>
                  <span className="text-neutral-200 font-medium">{activePass.penjemput} ({activePass.hubunganPenjemput})</span>
                </div>
              </div>

              <div className="text-xs text-neutral-300 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                <p>
                  <strong>Keperluan:</strong> {activePass.detailAlasan}
                </p>
                {activePass.disetujuiOleh && (
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Disetujui: {activePass.disetujuiOleh}
                  </span>
                )}
              </div>
            </div>

            {/* Inline SVG QR Preview on Active Permit */}
            <button
              type="button"
              onClick={() => setSelectedQrPass(activePass)}
              className="group shrink-0 w-full lg:w-auto flex flex-col items-center p-3 rounded-2xl bg-neutral-950/90 border border-emerald-500/30 hover:border-emerald-400 transition-colors"
              title="Klik untuk memperbesar & mengunduh SVG QR Pass"
            >
              <div className="p-2 bg-white rounded-xl shadow-inner group-hover:scale-[1.02] transition-transform">
                <PermitSvgQrCode
                  value={activePass.qrPayload}
                  size={120}
                  label={`QR Pass Aktif ${activePass.kodeIzin}`}
                />
              </div>
              <span className="mt-2 text-[11px] font-mono font-semibold text-emerald-400">
                SVG QR TERVERIFIKASI
              </span>
              <span className="text-[10px] text-neutral-400">
                Klik untuk perbesar / cetak
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Tidak Ada Izin Keluar yang Aktif</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Ananda berada di dalam lingkungan asrama pondok pesantren dengan aman dan tertib mengikuti seluruh kegiatan.
          </p>
        </div>
      )}

      {/* History of Permits with Visual SVG QR Codes for Approved Permits */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-neutral-300">
            Daftar & Riwayat Perizinan Keluar Pondok ({approvedPermits.length} QR Disetujui)
          </h3>
          <span className="text-[11px] text-neutral-500">
            Setiap izin yang disetujui dilengkapi generator QR SVG siap pindai
          </span>
        </div>

        <div className="space-y-3">
          {izinList.map((item) => {
            const approved = isApprovedPermitStatus(item.status);
            const canVerifyAtGate =
              item.status === 'Disetujui Pengasuh' || item.status === 'Sedang Keluar';

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/70">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {item.kodeIzin}
                      </span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-xs text-white font-semibold">
                        {item.keperluan}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusBadgeStyle(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      {item.status === 'Diajukan' &&
                        (currentRole === 'admin' || currentRole === 'ustaz') && (
                          <button
                            onClick={() =>
                              onUpdateIzinStatus(
                                item.id,
                                'Disetujui Pengasuh',
                                'Disetujui Pengasuh — SVG QR Pass diterbitkan untuk Pos 1'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-colors"
                          >
                            Setujui & Terbitkan QR
                          </button>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Alasan Detail:</span>
                      <p className="text-neutral-200">{item.detailAlasan}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Penjemput Resmi:</span>
                      <p className="text-neutral-200 font-medium">
                        {item.penjemput} ({item.hubunganPenjemput})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400 pt-2 border-t border-neutral-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>
                        Jadwal: {item.waktuRencanaKeluar} s/d {item.waktuRencanaKembali}
                      </span>
                    </div>
                    {item.disetujuiOleh && <span>Disetujui oleh: {item.disetujuiOleh}</span>}
                  </div>

                  {approved && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedQrPass(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-800 flex items-center gap-1 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Buka QR Pass SVG</span>
                      </button>

                      {canVerifyAtGate && (
                        <button
                          onClick={() => openScannerWithPermit(item)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/60 flex items-center gap-1 transition-colors"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>Verifikasi di Gerbang</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right-side Visual SVG QR Card for Approved Permits */}
                <div className="shrink-0 flex items-center justify-center">
                  {approved ? (
                    <button
                      type="button"
                      onClick={() => setSelectedQrPass(item)}
                      className="group flex flex-col items-center p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/60 transition-colors"
                      title={`Pindai atau perbesar QR Pass ${item.kodeIzin}`}
                    >
                      <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-[1.03] transition-transform">
                        <PermitSvgQrCode
                          value={item.qrPayload}
                          size={88}
                          label={`QR Izin ${item.kodeIzin}`}
                        />
                      </div>
                      <span
                        className={`mt-1.5 text-[10px] font-mono font-semibold ${
                          item.status === 'Selesai Kembali'
                            ? 'text-neutral-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.status === 'Selesai Kembali' ? 'QR Arsip Selesai' : 'QR Valid · Pindai'}
                      </span>
                    </button>
                  ) : item.status === 'Ditolak' ? (
                    <div className="w-[108px] h-[118px] rounded-xl bg-rose-950/20 border border-rose-900/50 flex flex-col items-center justify-center p-2 text-center gap-1.5">
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span className="text-[10px] text-rose-300 leading-tight font-medium">
                        Izin Ditolak
                      </span>
                    </div>
                  ) : (
                    <div className="w-[108px] h-[118px] rounded-xl bg-neutral-900/60 border border-dashed border-amber-700/50 flex flex-col items-center justify-center p-2 text-center gap-1.5">
                      <Lock className="w-5 h-5 text-amber-400" />
                      <span className="text-[10px] text-amber-300/90 leading-tight">
                        QR Terbit Setelah Disetujui
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Enlarged SVG QR Code Pass View */}
      {selectedQrPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>QR Pass SVG Gerbang SantriCity</span>
              </span>
              <button
                onClick={() => setSelectedQrPass(null)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">{santri.nama}</h3>
              <p className="text-xs text-neutral-400">NIS: {santri.nis} · {santri.kelas}</p>
              <div className="text-xs font-mono text-emerald-400 font-bold pt-1">
                {selectedQrPass.kodeIzin}
              </div>
            </div>

            {/* Pure SVG rendered QR Code */}
            <div
              ref={modalQrContainerRef}
              className="p-3 bg-white rounded-xl inline-block shadow-inner mx-auto"
            >
              <PermitSvgQrCode
                value={selectedQrPass.qrPayload}
                size={208}
                label={`QR Pass Gerbang ${selectedQrPass.kodeIzin}`}
              />
            </div>

            <div className="text-xs text-neutral-300 space-y-1.5">
              <p className="font-semibold text-emerald-300">
                Status: {selectedQrPass.status}
              </p>
              <p className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 break-all">
                {selectedQrPass.qrPayload}
              </p>
              <p className="text-[11px] text-neutral-400">
                Tunjukkan QR code SVG ini ke petugas satpam di Pos 1 Gerbang Utama Pesantren untuk verifikasi status keluar/masuk.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleDownloadSvg(selectedQrPass)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh SVG</span>
              </button>
              <button
                onClick={() => handleCopyPayload(selectedQrPass)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 transition-colors"
              >
                {copiedPassId === selectedQrPass.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guard Gate Scanner & Status Verification (Pos Satpam Gerbang) */}
      {scannerSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-cyan-400" />
                <span>Pemindai Verifikasi Gerbang Satpam (Pos 1)</span>
              </h3>
              <button
                onClick={() => {
                  setScannerSimulatorOpen(false);
                  setScanResult(null);
                }}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Scanner Payload Input / Quick Select */}
            <div className="space-y-2 text-xs">
              <label className="text-neutral-400 block font-medium">
                Kode / Payload QR Hasil Pindai Optik:
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setScanResult(null);
                }}
                placeholder="Masukkan kode izin (mis. IZ-2026-...) atau hasil scan QR"
                className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-300 focus:outline-none focus:border-cyan-500"
              />
              {izinList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {izinList.map((permit) => (
                    <button
                      key={permit.id}
                      type="button"
                      onClick={() => {
                        setScanInput(permit.qrPayload);
                        setScanResult(null);
                      }}
                      className={`px-2 py-1 rounded-lg font-mono text-[10px] border transition-colors ${
                        scanInput === permit.qrPayload
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {permit.kodeIzin} ({permit.status})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Result Panel */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-800/40 space-y-3">
              {matchedScannedPermit ? (
                isApprovedPermitStatus(matchedScannedPermit.status) ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-5 h-5 shrink-0 ${
                            matchedScannedPermit.status === 'Selesai Kembali'
                              ? 'text-neutral-400'
                              : 'text-emerald-400'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-white">
                            {matchedScannedPermit.status === 'Selesai Kembali'
                              ? 'PAS SUDAH SELESAI / ARSIP'
                              : 'QR PASS VALID & TERVERIFIKASI'}
                          </div>
                          <div className="font-mono text-[11px] text-emerald-400">
                            {matchedScannedPermit.kodeIzin}
                          </div>
                        </div>
                      </div>

                      <div className="p-1.5 bg-white rounded-lg shrink-0">
                        <PermitSvgQrCode
                          value={matchedScannedPermit.qrPayload}
                          size={64}
                          label={`Scan Preview ${matchedScannedPermit.kodeIzin}`}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Santri:</span>
                        <span className="text-white font-medium">{santri.nama} ({santri.nis})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Penjemput:</span>
                        <span className="text-neutral-200">{matchedScannedPermit.penjemput}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Status Saat Ini:</span>
                        <span className="font-bold text-emerald-400">{matchedScannedPermit.status}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {matchedScannedPermit.status === 'Disetujui Pengasuh' && (
                        <button
                          onClick={() => {
                            const now =
                              new Date().toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) + ' WIB';
                            onUpdateIzinStatus(
                              matchedScannedPermit.id,
                              'Sedang Keluar',
                              `Keluar gerbang pos 1 pada ${now} bersama penjemput ${matchedScannedPermit.penjemput}`
                            );
                            setScanResult({
                              ok: true,
                              message: `VERIFIKASI BERHASIL: Santri dicatat "Sedang Keluar" pada ${now}. Notifikasi otomatis terkirim ke wali.`,
                            });
                          }}
                          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold text-xs transition-colors"
                        >
                          Pindai & Catat Keluar Gerbang
                        </button>
                      )}

                      {matchedScannedPermit.status === 'Sedang Keluar' && (
                        <button
                          onClick={() => {
                            const now =
                              new Date().toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) + ' WIB';
                            onUpdateIzinStatus(
                              matchedScannedPermit.id,
                              'Selesai Kembali',
                              `Telah kembali ke asrama tepat waktu pada ${now}`
                            );
                            setScanResult({
                              ok: true,
                              message: `VERIFIKASI BERHASIL: Santri dicatat "Selesai Kembali" pada ${now}. Perizinan ditutup.`,
                            });
                          }}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs transition-colors"
                        >
                          Pindai & Catat Tiba Kembali di Asrama
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-xs text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">IZIN BELUM DISETUJUI PENGASUH</p>
                      <p className="text-neutral-300 mt-0.5">
                        Kode <span className="font-mono">{matchedScannedPermit.kodeIzin}</span> berstatus{' '}
                        <strong>{matchedScannedPermit.status}</strong>. Santri tidak diperkenankan keluar gerbang sebelum QR Pass resmi diterbitkan.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-3 space-y-2 text-xs text-neutral-400">
                  {normalizedQuery ? (
                    <>
                      <XCircle className="w-7 h-7 text-rose-400 mx-auto" />
                      <p className="font-semibold text-rose-300">QR Code Tidak Terdaftar</p>
                      <p>Tidak ditemukan izin keluar yang cocok dengan payload atau kode tersebut.</p>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-7 h-7 text-cyan-400 mx-auto" />
                      <p>Pilih kode izin di atas atau masukkan hasil scan QR untuk memverifikasi status gerbang.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {scanResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  scanResult.ok
                    ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-700/60 text-rose-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scanResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Ajukan Izin Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Form Pengajuan Izin Keluar Pondok</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Keperluan</label>
                  <select
                    value={keperluan}
                    onChange={(e) => setKeperluan(e.target.value as IzinKeluarPondok['keperluan'])}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Keluarga">Keluarga / Silaturahmi</option>
                    <option value="Sakit/Rujukan">Sakit / Rujukan Medis</option>
                    <option value="Lomba/Eksternal">Lomba & Prestasi Santri</option>
                    <option value="Liburan Semester">Liburan Semester Pondok</option>
                    <option value="Lainnya">Keperluan Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Penjemput Resmi</label>
                  <input
                    type="text"
                    value={penjemput}
                    onChange={(e) => setPenjemput(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Hubungan Penjemput</label>
                <input
                  type="text"
                  value={hubunganPenjemput}
                  onChange={(e) => setHubunganPenjemput(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Alasan Detail Izin</label>
                <textarea
                  rows={2}
                  value={detailAlasan}
                  onChange={(e) => setDetailAlasan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Waktu Rencana Keluar</label>
                  <input
                    type="text"
                    value={waktuRencanaKeluar}
                    onChange={(e) => setWaktuRencanaKeluar(e.target.value)}
                    placeholder="Contoh: 2026-10-02 08:00 WIB"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Waktu Batas Kembali</label>
                  <input
                    type="text"
                    value={waktuRencanaKembali}
                    onChange={(e) => setWaktuRencanaKembali(e.target.value)}
                    placeholder="Contoh: 2026-10-04 17:00 WIB"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px]">
                Pengajuan izin akan diteruskan otomatis ke Majelis Pengasuh dan QR Pass SVG akan terbit otomatis begitu disetujui.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Kirim Pengajuan Izin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

