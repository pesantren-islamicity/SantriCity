import React, { useState } from 'react';
import {
  AgendaPesantren,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  CalendarDays,
  Calendar,
  ExternalLink,
  Download,
  Plus,
  Clock,
  MapPin,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import {
  generateGoogleCalendarUrl,
  exportToIcsFile,
} from '../services/calendarService';

interface KalenderModuleProps {
  agendas: AgendaPesantren[];
  onAddAgenda: (agenda: Omit<AgendaPesantren, 'id'>) => void;
  currentRole: UserRole;
  lang: Language;
}

export const KalenderModule: React.FC<KalenderModuleProps> = ({
  agendas,
  onAddAgenda,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [reminderActive, setReminderActive] = useState<boolean>(true);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Form State
  const [judul, setJudul] = useState<string>('Haflah Khotmil Qur\'an & Wisuda Santri');
  const [kategori, setKategori] = useState<'Ujian' | 'Kajian Akbar' | 'Kunjungan Wali' | 'Dauroh Tahfidz' | 'Libur Pondok'>('Kajian Akbar');
  const [tanggalMulai, setTanggalMulai] = useState<string>('2026-11-20');
  const [tanggalSelesai, setTanggalSelesai] = useState<string>('2026-11-21');
  const [lokasi, setLokasi] = useState<string>('Aula Utama SantriCity & Siaran Live islamicity.tv');
  const [keterangan, setKeterangan] = useState<string>('Wisuda tahfidz 30 juz dan apresiasi santri teladan bersama seluruh wali santri.');

  const filteredAgendas = agendas.filter((a) => {
    if (filterCat === 'all') return true;
    return a.kategori === filterCat;
  });

  const handleExportAllIcs = () => {
    exportToIcsFile(agendas, 'santricity_pesantren_agenda.ics');
  };

  const handleToggleReminder = () => {
    const nextState = !reminderActive;
    setReminderActive(nextState);
    setReminderToast(
      nextState
        ? 'Notifikasi pengingat harian agenda pesantren telah diaktifkan untuk gawai Anda.'
        : 'Pengingat harian telah dinonaktifkan.'
    );
    setTimeout(() => setReminderToast(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAgenda({
      judul,
      kategori,
      tanggalMulai,
      tanggalSelesai,
      lokasi,
      keterangan,
      pengingatHarian: true,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <span>Kalender Kegiatan & Ujian Pesantren</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Sinkronisasi jadwal ujian, dauroh tahfidz, dan jadwal kunjungan wali langsung ke Google Calendar atau gawai Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllIcs}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
            title="Download file .ics untuk Apple Calendar, Outlook, Google Calendar"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unduh Kalender (.ICS)</span>
          </button>

          <button
            onClick={handleToggleReminder}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              reminderActive
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{reminderActive ? 'Pengingat Aktif' : 'Aktifkan Pengingat'}</span>
          </button>

          {(currentRole === 'admin' || currentRole === 'ustaz') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agenda Baru</span>
            </button>
          )}
        </div>
      </div>

      {reminderToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl w-fit">
        {['all', 'Ujian', 'Dauroh Tahfidz', 'Kajian Akbar', 'Kunjungan Wali', 'Libur Pondok'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterCat === cat
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'Semua Agenda' : cat}
          </button>
        ))}
      </div>

      {/* Agendas List */}
      <div className="space-y-4">
        {filteredAgendas.map((item) => {
          const googleCalUrl = generateGoogleCalendarUrl(item);

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">
                    {new Date(item.tanggalMulai).toLocaleString('id-ID', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold font-mono-numbers text-white">
                    {new Date(item.tanggalMulai).getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400">
                      {item.kategori}
                    </span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-xs font-mono text-neutral-400">
                      {item.tanggalMulai} s/d {item.tanggalSelesai}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {item.judul}
                  </h3>

                  <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
                    {item.keterangan}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item.lokasi}</span>
                  </div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={googleCalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 transition-colors flex items-center gap-1.5"
                  title="Simpan langsung ke Google Calendar Anda"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Calendar</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Agenda Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>Tambah Agenda Kegiatan Pesantren</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Judul Kegiatan / Ujian</label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Ujian">Ujian Semester & Tasmi'</option>
                    <option value="Dauroh Tahfidz">Dauroh Tahfidz Intensif</option>
                    <option value="Kajian Akbar">Kajian Akbar & Wisuda</option>
                    <option value="Kunjungan Wali">Kunjungan Wali Santri</option>
                    <option value="Libur Pondok">Libur Pondok</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Lokasi Kegiatan</label>
                  <input
                    type="text"
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Keterangan / Panduan Wali</label>
                <textarea
                  rows={3}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
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
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
