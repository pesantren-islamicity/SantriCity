import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
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
  UserCheck,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';

interface PerizinanQrProps {
  santri: SantriProfile;
  izinList: IzinKeluarPondok[];
  onAddIzin: (izin: Omit<IzinKeluarPondok, 'id'>) => void;
  onUpdateIzinStatus: (izinId: string, status: IzinKeluarPondok['status'], note?: string) => void;
  currentRole: UserRole;
  lang: Language;
}

export const PerizinanQrModule: React.FC<PerizinanQrProps> = ({
  santri,
  izinList,
  onAddIzin,
  onUpdateIzinStatus,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedQrPass, setSelectedQrPass] = useState<IzinKeluarPondok | null>(null);
  const [scannerSimulatorOpen, setScannerSimulatorOpen] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Form State
  const [keperluan, setKeperluan] = useState<'Keluarga' | 'Sakit/Rujukan' | 'Lomba/Eksternal' | 'Liburan Semester' | 'Lainnya'>('Keluarga');
  const [detailAlasan, setDetailAlasan] = useState<string>('Menghadiri agenda silaturahmi keluarga di kota asal');
  const [penjemput, setPenjemput] = useState<string>(santri.waliNama);
  const [hubunganPenjemput, setHubunganPenjemput] = useState<string>(santri.waliHubungan);
  const [waktuRencanaKeluar, setWaktuRencanaKeluar] = useState<string>('2026-10-02 08:00 WIB');
  const [waktuRencanaKembali, setWaktuRencanaKembali] = useState<string>('2026-10-04 17:00 WIB');

  // QR Canvas Ref for modal
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (selectedQrPass && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        selectedQrPass.qrPayload,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [selectedQrPass]);

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
      status: currentRole === 'admin' ? 'Disetujui Pengasuh' : 'Diajukan',
      disetujuiOleh: currentRole === 'admin' ? 'K.H. Ahmad Nawawi, M.A.' : undefined,
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

  const activePass = izinList.find((i) => i.status === 'Disetujui Pengasuh' || i.status === 'Sedang Keluar');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>Sistem Perizinan Keluar Berbasis QR Code</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Verifikasi izin keluar/pulang digital aman dan terverifikasi untuk keamanan gerbang pos pesantren 24 jam.
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

          <button
            onClick={() => setScannerSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <ScanLine className="w-4 h-4 text-cyan-400" />
            <span>Simulator Pindai Gerbang (Pos Satpam)</span>
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

      {/* Active Permit Highlight Card */}
      {activePass ? (
        <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/20 space-y-4">
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

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                {activePass.status}
              </span>
              <button
                onClick={() => setSelectedQrPass(activePass)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Buka QR Pass</span>
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

          <div className="text-xs text-neutral-300 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80 flex items-center justify-between">
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
      ) : (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Tidak Ada Izin Keluar yang Aktif</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Ananda berada di dalam lingkungan asrama pondok pesantren dengan aman dan tertib mengikuti seluruh kegiatan.
          </p>
        </div>
      )}

      {/* History of Permits */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden space-y-4 p-5">
        <h3 className="text-xs font-semibold text-neutral-300">
          Riwayat Pengajuan & Perizinan Keluar Pondok
        </h3>

        <div className="space-y-3">
          {izinList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/70">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {item.kodeIzin}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-xs text-white font-semibold">
                    {item.keperluan}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${
                      item.status === 'Selesai Kembali'
                        ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        : item.status === 'Disetujui Pengasuh'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>

                  <button
                    onClick={() => setSelectedQrPass(item)}
                    className="p-1 text-neutral-400 hover:text-white"
                    title="Tampilkan QR Pass"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 text-[11px] block">Alasan Detail:</span>
                  <p className="text-neutral-200">{item.detailAlasan}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] block">Penjemput:</span>
                  <p className="text-neutral-200 font-medium">
                    {item.penjemput} ({item.hubunganPenjemput})
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Jadwal: {item.waktuRencanaKeluar} s/d {item.waktuRencanaKembali}</span>
                </div>
                {item.disetujuiOleh && (
                  <span>Oleh: {item.disetujuiOleh}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: QR Code Pass View */}
      {selectedQrPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-bold text-white">QR Pass Gerbang SantriCity</span>
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

            {/* Canvas rendered QR Code */}
            <div className="p-3 bg-white rounded-xl inline-block shadow-inner mx-auto">
              <canvas ref={qrCanvasRef} className="mx-auto" />
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <p className="font-semibold text-emerald-300">
                Status: {selectedQrPass.status}
              </p>
              <p className="text-[11px] text-neutral-400">
                Tunjukkan QR code ini ke petugas satpam di Pos 1 Gerbang Utama Pesantren saat penjemputan.
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Izin Fisik</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Scanner Simulator (Pos Satpam Gerbang) */}
      {scannerSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-cyan-400" />
                <span>Simulator Pindai Gerbang Satpam (Pos 1)</span>
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

            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-800/40 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center mx-auto text-cyan-400 animate-pulse">
                <ScanLine className="w-8 h-8" />
              </div>
              <p className="text-xs text-neutral-300">
                Arahkan pemindai optik gerbang ke QR Pass santri untuk verifikasi validitas dan mencatat waktu aktual keluar/kembali.
              </p>

              {activePass ? (
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Deteksi Pass:</span>
                    <span className="font-mono text-emerald-400 font-bold">{activePass.kodeIzin}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Santri: </span>
                    <span className="text-white font-medium">{santri.nama}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Status Saat Ini: </span>
                    <span className="font-bold text-emerald-400">{activePass.status}</span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    {activePass.status === 'Disetujui Pengasuh' && (
                      <button
                        onClick={() => {
                          const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                          onUpdateIzinStatus(activePass.id, 'Sedang Keluar', `Keluar gerbang pos 1 pada ${now} bersama penjemput ${activePass.penjemput}`);
                          setScanResult(`VERIFIKASI BERHASIL: Santri dicatat "Sedang Keluar" pada ${now}. Pesan notifikasi otomatis terkirim ke orang tua.`);
                        }}
                        className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold text-xs"
                      >
                        Pindai & Catat Keluar Gerbang
                      </button>
                    )}

                    {activePass.status === 'Sedang Keluar' && (
                      <button
                        onClick={() => {
                          const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                          onUpdateIzinStatus(activePass.id, 'Selesai Kembali', `Telah kembali ke asrama tepat waktu pada ${now}`);
                          setScanResult(`VERIFIKASI BERHASIL: Santri dicatat "Selesai Kembali" pada ${now}. Perizinan ditutup.`);
                        }}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs"
                      >
                        Pindai & Catat Tiba Kembali di Asrama
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-neutral-900 text-neutral-400 text-xs">
                  Tidak ada izin yang siap dipindai saat ini.
                </div>
              )}
            </div>

            {scanResult && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scanResult}</span>
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
                    onChange={(e) => setKeperluan(e.target.value as any)}
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
                Pengajuan izin akan diteruskan otomatis ke Majelis Pengasuh dan QR Pass akan terbit begitu disetujui.
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
