import React, { useState } from 'react';
import {
  SantriProfile,
  RekamMedis,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  HeartPulse,
  Thermometer,
  Activity,
  AlertCircle,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Send,
  Pill,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';

interface PoskestrenModuleProps {
  santri: SantriProfile;
  kesehatanList: RekamMedis[];
  onAddRekamMedis: (rekam: Omit<RekamMedis, 'id'>) => void;
  currentRole: UserRole;
  lang: Language;
}

export const PoskestrenModule: React.FC<PoskestrenModuleProps> = ({
  santri,
  kesehatanList,
  onAddRekamMedis,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [notifSentBanner, setNotifSentBanner] = useState<string | null>(null);

  // Form State
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [keluhan, setKeluhan] = useState<string>('Pusing dan demam sejak sore hari setelah kegiatan olahraga');
  const [suhuTubuh, setSuhuTubuh] = useState<number>(37.6);
  const [tensiDarah, setTensiDarah] = useState<string>('115/75');
  const [nadi, setNadi] = useState<number>(80);
  const [diagnosa, setDiagnosa] = useState<string>('Febris H-1 susp. Viral Infection');
  const [tindakan, setTindakan] = useState<string>('Istirahat cukup di kamar poskestren, kompres hangat, hidrasi cukup');
  const [obatInput, setObatInput] = useState<string>('Paracetamol 500mg 3x1, Vitamin C 500mg 1x1');
  const [statusPerawatan, setStatusPerawatan] = useState<'Rawat Jalan' | 'Rawat Inap Poskestren' | 'Rujuk RS Eksternal'>('Rawat Jalan');
  const [lamaIstirahat, setLamaIstirahat] = useState<number>(1);
  const [tenagaMedis, setTenagaMedis] = useState<string>('dr. H. Rizal Maulana, Sp.A & Ns. Fatimah');
  const [kondisiTerkini, setKondisiTerkini] = useState<'Stabil' | 'Membaik' | 'Observasi Ketat' | 'Pulih'>('Stabil');

  const latest = kesehatanList[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const obatList = obatInput.split(',').map((s) => s.trim()).filter(Boolean);
    onAddRekamMedis({
      santriId: santri.id,
      tanggal,
      keluhan,
      pemeriksaanFisik: {
        suhuTubuh: Number(suhuTubuh),
        tensiDarah,
        nadi: Number(nadi),
      },
      diagnosa,
      tindakan,
      obatDiberikan: obatList,
      statusPerawatan,
      lamaIstirahatHari: Number(lamaIstirahat),
      tenagaMedis,
      notifikasiWaliTerkirim: true,
      kondisiTerkini,
    });
    setIsModalOpen(false);
    setNotifSentBanner(`Laporan medis berhasil disimpan dan notifikasi instan otomatis terkirim ke Wali Santri (${santri.waliNama}) via WhatsApp & Sistem.`);
    setTimeout(() => setNotifSentBanner(null), 6000);
  };

  const handleExport = () => {
    const rows = kesehatanList.map((k) => ({
      Tanggal: k.tanggal,
      Keluhan: k.keluhan,
      SuhuTubuh: `${k.pemeriksaanFisik.suhuTubuh} °C`,
      TensiDarah: k.pemeriksaanFisik.tensiDarah,
      Nadi: `${k.pemeriksaanFisik.nadi} bpm`,
      Diagnosa: k.diagnosa,
      Tindakan: k.tindakan,
      Obat: k.obatDiberikan.join('; '),
      StatusPerawatan: k.statusPerawatan,
      LamaIstirahat: `${k.lamaIstirahatHari} Hari`,
      TenagaMedis: k.tenagaMedis,
      Kondisi: k.kondisiTerkini,
    }));
    exportToCsv(`rekam_medis_poskestren_${santri.nis}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <span>Poskestren (Pos Kesehatan Pesantren & RME)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Rekam Medis Elektronik (RME) terintegrasi dokter pondok, perawat poskestren, dan notifikasi real-time ke wali.
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

          {(currentRole === 'medis' || currentRole === 'admin') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pemeriksaan Medis</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {notifSentBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notifSentBanner}</span>
        </div>
      )}

      {/* Hero & Quick Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Poskestren Clinic Image Card (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 relative flex flex-col justify-end min-h-[220px]">
          <img
            src="/src/assets/images/santri_poskestren_1790644568944.jpg"
            alt="Poskestren Pesantren"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="relative p-5 space-y-2">
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 inline-block">
              POSKESTREN 24 JAM
            </span>
            <h3 className="text-sm font-bold text-white">
              Pusat Layanan Kesehatan SantriCity
            </h3>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Didukung dokter jaga, ruang observasi steril, apotek herbal dan modern, serta ambulan siaga rujukan RS.
            </p>
          </div>
        </div>

        {/* Health Profile Vitals (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">
              Parameter Vital Terakhir ({latest ? latest.tanggal : 'Hari ini'})
            </span>
            <span className="text-xs font-mono text-emerald-400 font-medium">
              Kondisi: {latest ? latest.kondisiTerkini : 'Sehat Prima'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                <span>Suhu Tubuh</span>
              </div>
              <div className="text-xl font-bold font-mono-numbers text-white">
                {latest ? `${latest.pemeriksaanFisik.suhuTubuh} °C` : '36.6 °C'}
              </div>
              <div className="text-[10px] text-neutral-500">Normal (36.5 - 37.2)</div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Tensi Darah</span>
              </div>
              <div className="text-xl font-bold font-mono-numbers text-white">
                {latest ? latest.pemeriksaanFisik.tensiDarah : '110/70'}
              </div>
              <div className="text-[10px] text-neutral-500">mmHg (Optimal)</div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                <span>Denyut Nadi</span>
              </div>
              <div className="text-xl font-bold font-mono-numbers text-white">
                {latest ? `${latest.pemeriksaanFisik.nadi} bpm` : '78 bpm'}
              </div>
              <div className="text-[10px] text-neutral-500">Detak per Menit</div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Golongan Darah</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {santri.golonganDarah || 'O+'}
              </div>
              <div className="text-[10px] text-neutral-500">Rhesus Positif</div>
            </div>
          </div>

          {/* Allergy warnings */}
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-neutral-200">Riwayat Alergi Santri:</span>
              <p className="text-neutral-400 text-[11px]">
                {santri.alergi.length
                  ? santri.alergi.join(', ')
                  : 'Tidak ada riwayat alergi obat maupun makanan yang dilaporkan.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History of Medical Examination */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden space-y-4 p-5">
        <h3 className="text-xs font-semibold text-neutral-300">
          Riwayat Rekam Medis Santri di Poskestren
        </h3>

        <div className="space-y-3">
          {kesehatanList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/70">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {item.tanggal}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-xs text-neutral-300 font-medium">
                    {item.statusPerawatan}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span>Tenaga Medis: <strong>{item.tenagaMedis}</strong></span>
                  {item.notifikasiWaliTerkirim && (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                      <Send className="w-3 h-3" /> Notifikasi Terkirim
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 text-[11px] block">Keluhan Santri:</span>
                  <p className="text-white font-medium">{item.keluhan}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] block">Diagnosa Medis:</span>
                  <p className="text-emerald-300 font-semibold">{item.diagnosa}</p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-neutral-400 text-[11px] block">Tindakan Medis & Edukasi:</span>
                <p className="text-neutral-300">{item.tindakan}</p>
              </div>

              {item.obatDiberikan.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                    <Pill className="w-3 h-3 text-emerald-400" /> Resep Obat:
                  </span>
                  {item.obatDiberikan.map((obat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-mono"
                    >
                      {obat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Input Pemeriksaan Medis */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-emerald-400" />
                <span>Pencatatan Rekam Medis Elektronik (RME)</span>
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
                  <label className="text-neutral-400 block mb-1">Tanggal Pemeriksaan</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Status Perawatan</label>
                  <select
                    value={statusPerawatan}
                    onChange={(e) => setStatusPerawatan(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Rawat Jalan">Rawat Jalan (Kamar Santri)</option>
                    <option value="Rawat Inap Poskestren">Rawat Inap Poskestren</option>
                    <option value="Rujuk RS Eksternal">Rujuk RS Eksternal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Suhu Tubuh (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={suhuTubuh}
                    onChange={(e) => setSuhuTubuh(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Tensi Darah</label>
                  <input
                    type="text"
                    value={tensiDarah}
                    onChange={(e) => setTensiDarah(e.target.value)}
                    placeholder="120/80"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Nadi (bpm)</label>
                  <input
                    type="number"
                    value={nadi}
                    onChange={(e) => setNadi(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Keluhan Pasien</label>
                <textarea
                  rows={2}
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Diagnosa Medis</label>
                <input
                  type="text"
                  value={diagnosa}
                  onChange={(e) => setDiagnosa(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Tindakan Medis / Perawatan</label>
                <textarea
                  rows={2}
                  value={tindakan}
                  onChange={(e) => setTindakan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Obat Diberikan (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={obatInput}
                  onChange={(e) => setObatInput(e.target.value)}
                  placeholder="Contoh: Paracetamol 500mg 3x1, Ambroxol Sirup"
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tenaga Medis Pemeriksa</label>
                  <input
                    type="text"
                    value={tenagaMedis}
                    onChange={(e) => setTenagaMedis(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Kondisi Terkini</label>
                  <select
                    value={kondisiTerkini}
                    onChange={(e) => setKondisiTerkini(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Stabil">Stabil</option>
                    <option value="Membaik">Membaik</option>
                    <option value="Observasi Ketat">Observasi Ketat</option>
                    <option value="Pulih">Pulih</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-2">
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Notifikasi otomatis akan dikirim ke ponsel wali santri saat data disimpan.</span>
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
                  Simpan & Kirim Notifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
