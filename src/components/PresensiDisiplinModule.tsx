import React, { useState } from 'react';
import {
  SantriProfile,
  PresensiHarian,
  CatatanDisiplin,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  CalendarCheck2,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { exportToCsv } from '../services/storageService';

interface PresensiDisiplinProps {
  santri: SantriProfile;
  presensiList: PresensiHarian[];
  disiplinList: CatatanDisiplin[];
  onAddPresensi: (presensi: Omit<PresensiHarian, 'id'>) => void;
  onAddDisiplin: (catatan: Omit<CatatanDisiplin, 'id'>) => void;
  currentRole: UserRole;
  lang: Language;
}

export const PresensiDisiplinModule: React.FC<PresensiDisiplinProps> = ({
  santri,
  presensiList,
  disiplinList,
  onAddPresensi,
  onAddDisiplin,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [activeTab, setActiveTab] = useState<'presensi' | 'disiplin'>('presensi');
  const [isPresensiModalOpen, setIsPresensiModalOpen] = useState<boolean>(false);
  const [isDisiplinModalOpen, setIsDisiplinModalOpen] = useState<boolean>(false);

  // Form State Presensi
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [subuh, setSubuh] = useState<'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [dhuha, setDhuha] = useState<'Hadir' | 'Izin' | 'Alpa'>('Hadir');
  const [sekolahPagi, setSekolahPagi] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [ashar, setAshar] = useState<'Hadir' | 'Masbuk' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [halaqahSore, setHalaqahSore] = useState<'Hadir' | 'Izin' | 'Alpa'>('Hadir');
  const [maghribIsya, setMaghribIsya] = useState<'Hadir' | 'Masbuk' | 'Izin' | 'Alpa'>('Hadir');
  const [belajarMalam, setBelajarMalam] = useState<'Hadir' | 'Izin' | 'Alpa'>('Hadir');
  const [keterangan, setKeterangan] = useState<string>('Tertib dan tepat waktu di masjid.');

  // Form State Disiplin
  const [dispTanggal, setDispTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [jenis, setJenis] = useState<'Prestasi' | 'Pelanggaran'>('Prestasi');
  const [kategori, setKategori] = useState<'Ibadah' | 'Bahasa' | 'Kebersihan' | 'Akademik' | 'Sosial'>('Ibadah');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [poin, setPoin] = useState<number>(5);
  const [pemberi, setPemberi] = useState<string>('Majelis Pembina Santri');

  const handlePresensiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPresensi({
      santriId: santri.id,
      tanggal,
      subuh,
      dhuha,
      sekolahPagi,
      ashar,
      halaqahSore,
      maghribIsya,
      belajarMalam,
      keterangan,
      tercatatOleh: `Musyrif Asrama (${currentRole})`,
    });
    setIsPresensiModalOpen(false);
  };

  const handleDisiplinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDisiplin({
      santriId: santri.id,
      tanggal: dispTanggal,
      jenis,
      kategori,
      deskripsi,
      poin: jenis === 'Pelanggaran' ? -Math.abs(Number(poin)) : Math.abs(Number(poin)),
      pemberiSanksiAtauPenghargaan: pemberi,
      statusPenanganan: 'Selesai',
    });
    setIsDisiplinModalOpen(false);
    setDeskripsi('');
  };

  const handleExport = () => {
    if (activeTab === 'presensi') {
      const rows = presensiList.map((p) => ({
        Tanggal: p.tanggal,
        Subuh: p.subuh,
        Dhuha: p.dhuha,
        SekolahPagi: p.sekolahPagi,
        Ashar: p.ashar,
        HalaqahSore: p.halaqahSore,
        MaghribIsya: p.maghribIsya,
        BelajarMalam: p.belajarMalam,
        Keterangan: p.keterangan || '',
        Pencatat: p.tercatatOleh,
      }));
      exportToCsv(`absensi_ibadah_${santri.nis}`, rows);
    } else {
      const rows = disiplinList.map((d) => ({
        Tanggal: d.tanggal,
        Jenis: d.jenis,
        Kategori: d.kategori,
        Deskripsi: d.deskripsi,
        Poin: d.poin,
        Pemberi: d.pemberiSanksiAtauPenghargaan,
        Status: d.statusPenanganan || 'Selesai',
      }));
      exportToCsv(`catatan_disiplin_adab_${santri.nis}`, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Presensi Ibadah & Disiplin Adab Santri
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Monitoring sholat berjamaah lima waktu, halaqah harian, serta catatan poin keteladanan akhlak.
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

          {(currentRole === 'ustaz' || currentRole === 'admin') && (
            <>
              {activeTab === 'presensi' ? (
                <button
                  onClick={() => setIsPresensiModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Presensi Hari Ini</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsDisiplinModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Prestasi / Catatan</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Indeks Poin Adab & Disiplin</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-emerald-400">
              {santri.poinDisiplin}
            </span>
            <span className="text-xs text-neutral-400">/ 100 Poin</span>
          </div>
          <p className="text-[11px] text-neutral-400">Kategori: Sangat Baik & Teladan (Mumtaz)</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Kehadiran Sholat Jamaah</span>
            <CalendarCheck2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-blue-400">
              98.5%
            </span>
            <span className="text-xs text-neutral-400">Tepat Waktu</span>
          </div>
          <p className="text-[11px] text-neutral-400">Sholat Subuh & Maghrib Selalu di Shaf Utama</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Penghargaan & Prestasi</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-amber-400">
              {disiplinList.filter((d) => d.jenis === 'Prestasi').length}
            </span>
            <span className="text-xs text-neutral-400">Piagam Penghargaan</span>
          </div>
          <p className="text-[11px] text-neutral-400">Tingkat Pesantren & Musabaqah Wilayah</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('presensi')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'presensi'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Presensi Ibadah Harian
        </button>
        <button
          onClick={() => setActiveTab('disiplin')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'disiplin'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Riwayat Prestasi & Catatan Adab
        </button>
      </div>

      {/* View 1: Presensi Table */}
      {activeTab === 'presensi' ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-medium">Tanggal</th>
                  <th className="py-3 px-3 font-medium text-center">Subuh</th>
                  <th className="py-3 px-3 font-medium text-center">Dhuha</th>
                  <th className="py-3 px-3 font-medium text-center">Sekolah</th>
                  <th className="py-3 px-3 font-medium text-center">Ashar</th>
                  <th className="py-3 px-3 font-medium text-center">Halaqah</th>
                  <th className="py-3 px-3 font-medium text-center">Maghrib-Isya</th>
                  <th className="py-3 px-3 font-medium text-center">Jam Malam</th>
                  <th className="py-3 px-4 font-medium">Keterangan Musyrif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {presensiList.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                      {p.tanggal}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono text-[11px] font-medium ${p.subuh === 'Hadir' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.subuh}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-medium text-emerald-400">
                        {p.dhuha}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-medium text-emerald-400">
                        {p.sekolahPagi}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono text-[11px] font-medium ${p.ashar === 'Hadir' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.ashar}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-medium text-emerald-400">
                        {p.halaqahSore}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-medium text-emerald-400">
                        {p.maghribIsya}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-medium text-emerald-400">
                        {p.belajarMalam}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      <div>{p.keterangan || '-'}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{p.tercatatOleh}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View 2: Disiplin & Prestasi Cards */
        <div className="space-y-3">
          {disiplinList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    item.jenis === 'Prestasi'
                      ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400'
                      : 'bg-rose-950/60 border-rose-700/50 text-rose-400'
                  }`}
                >
                  {item.jenis === 'Prestasi' ? (
                    <Award className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        item.jenis === 'Prestasi' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.jenis}: {item.kategori}
                    </span>
                    <span className="text-neutral-500 text-[11px]">·</span>
                    <span className="text-neutral-400 text-xs font-mono">{item.tanggal}</span>
                  </div>

                  <p className="text-xs text-white font-medium leading-relaxed">
                    {item.deskripsi}
                  </p>

                  <div className="text-[11px] text-neutral-400">
                    Oleh: {item.pemberiSanksiAtauPenghargaan}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-lg font-bold font-mono-numbers ${
                    item.poin > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.poin > 0 ? `+${item.poin}` : item.poin} Poin
                </span>
                <div className="text-[11px] text-neutral-400">{item.statusPenanganan}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Input Presensi */}
      {isPresensiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Pencatatan Presensi Ibadah Santri</span>
              </h3>
              <button
                onClick={() => setIsPresensiModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePresensiSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Tanggal Absensi</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Sholat Subuh</label>
                  <select
                    value={subuh}
                    onChange={(e) => setSubuh(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir Tepat Waktu</option>
                    <option value="Masbuk">Masbuk</option>
                    <option value="Sakit">Sakit di Kamar</option>
                    <option value="Izin">Izin Pulang</option>
                    <option value="Alpa">Alpa / Terlambat</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Sholat Dhuha</label>
                  <select
                    value={dhuha}
                    onChange={(e) => setDhuha(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Sekolah Pagi</label>
                  <select
                    value={sekolahPagi}
                    onChange={(e) => setSekolahPagi(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Sholat Ashar</label>
                  <select
                    value={ashar}
                    onChange={(e) => setAshar(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Masbuk">Masbuk</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Halaqah Sore</label>
                  <select
                    value={halaqahSore}
                    onChange={(e) => setHalaqahSore(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Maghrib - Isya</label>
                  <select
                    value={maghribIsya}
                    onChange={(e) => setMaghribIsya(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Masbuk">Masbuk</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Belajar Malam</label>
                  <select
                    value={belajarMalam}
                    onChange={(e) => setBelajarMalam(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Catatan Tambahan Musyrif</label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPresensiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Input Disiplin */}
      {isDisiplinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pencatatan Prestasi & Adab Santri</span>
              </h3>
              <button
                onClick={() => setIsDisiplinModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDisiplinSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Jenis Catatan</label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Prestasi">Prestasi & Keteladanan (+ Poin)</option>
                    <option value="Pelanggaran">Pelanggaran Tata Tertib (- Poin)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Ibadah">Ibadah & Ubudiyah</option>
                    <option value="Akademik">Akademik & Kitab</option>
                    <option value="Bahasa">Disiplin Bahasa (Arab/Inggris)</option>
                    <option value="Kebersihan">Kebersihan & Kerapian</option>
                    <option value="Sosial">Sosial & Adab Santri</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={dispTanggal}
                    onChange={(e) => setDispTanggal(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Poin</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={poin}
                    onChange={(e) => setPoin(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows={3}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Contoh: Juara 1 lomba pidato bahasa Arab antar asrama..."
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Pemberi Penghargaan / Penindak</label>
                <input
                  type="text"
                  value={pemberi}
                  onChange={(e) => setPemberi(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsDisiplinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
