import React, { useState } from 'react';
import {
  SantriProfile,
  BroadcastTelegram,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  ShieldAlert,
  Database,
  Download,
  Upload,
  Lock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  HardDrive,
  RefreshCw,
  Send,
} from 'lucide-react';
import { downloadJsonBackup, exportToCsv } from '../services/storageService';

interface AdminConsoleProps {
  santriList: SantriProfile[];
  broadcasts: BroadcastTelegram[];
  onAddBroadcast: (bc: Omit<BroadcastTelegram, 'id'>) => void;
  fullDatabaseState: unknown;
  onRestoreBackup: (restoredData: any) => void;
  isOnline: boolean;
  onManualSync: () => void;
  isSyncing: boolean;
  currentRole: UserRole;
  lang: Language;
}

export const AdminConsoleModule: React.FC<AdminConsoleProps> = ({
  santriList,
  broadcasts,
  onAddBroadcast,
  fullDatabaseState,
  onRestoreBackup,
  isOnline,
  onManualSync,
  isSyncing,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [bcTitle, setBcTitle] = useState<string>('');
  const [bcChannel, setBcChannel] = useState<'t.me/SantriCity313' | 'Official Pengumuman' | 'Darurat Poskestren'>('t.me/SantriCity313');
  const [bcCategory, setBcCategory] = useState<'Penting' | 'Akademik' | 'Kesehatan' | 'Jadwal' | 'Kegiatan'>('Penting');
  const [bcContent, setBcContent] = useState<string>('');
  const [bcPriority, setBcPriority] = useState<'Normal' | 'Tinggi' | 'Darurat'>('Normal');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleBackupDownload = () => {
    downloadJsonBackup(fullDatabaseState, 'santricity_masyarakat_full_backup');
    setStatusMessage('Cadangan database JSON lengkap berhasil diunduh ke penyimpanan lokal.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onRestoreBackup(parsed);
        setStatusMessage('Basis data berhasil dipulihkan dari berkas cadangan!');
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err) {
        alert('Format file JSON tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  const handleExportAllSantriCsv = () => {
    const rows = santriList.map((s) => ({
      NIS: s.nis,
      Nama: s.nama,
      Kelas: s.kelas,
      Kamar: s.kamar,
      Asrama: s.asrama,
      CapaianHafalanJuz: s.capaianJuz,
      TargetJuz: s.targetJuz,
      PoinDisiplin: s.poinDisiplin,
      Status: s.status,
      Wali: s.waliNama,
      NoHpWali: s.waliNoHp,
      GolDarah: s.golonganDarah,
      Alergi: s.alergi.join('; '),
    }));
    exportToCsv('rekapitulasi_seluruh_santricity', rows);
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcContent.trim()) return;

    onAddBroadcast({
      judul: bcTitle,
      channel: bcChannel,
      kategori: bcCategory,
      isi: bcContent,
      tanggal: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      prioritas: bcPriority,
      dilihat: 1,
    });

    setBcTitle('');
    setBcContent('');
    setStatusMessage(`Siaran resmi berhasil diterbitkan ke saluran ${bcChannel} dan disebarkan ke seluruh wali santri.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <span>Konsol Admin, Keamanan & Pencadangan Data</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Pengelolaan operasional pesantren, sinkronisasi cloud lintas perangkat, cadangan otomatis, dan siaran darurat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onManualSync}
            disabled={isSyncing || !isOnline}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Cloud'}</span>
          </button>

          <button
            onClick={handleBackupDownload}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Cadangan JSON</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* KPI System Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Santri Terdaftar</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-white">
            {santriList.length}
          </div>
          <p className="text-[11px] text-neutral-400">Database Aktif Sinkron</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Protokol Enkripsi</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            AES-256 GCM
          </div>
          <p className="text-[11px] text-neutral-400">Privasi End-to-End Terjamin</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Status Penyimpanan</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-cyan-300 font-mono">
            Local + Cloud Sync
          </div>
          <p className="text-[11px] text-neutral-400">Tahan Offline & Auto-Cache</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Kanal Maklumat</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            t.me/SantriCity313
          </div>
          <p className="text-[11px] text-neutral-400">{broadcasts.length} Siaran Terpublikasi</p>
        </div>
      </div>

      {/* Grid: Backup & Restore + Export CSV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Restore Box */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Pusat Pencadangan & Pemulihan (Disaster Recovery)</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Amankan seluruh data akademik, riwayat hafalan Al-Qur'an, transaksi SPP, rekam medis poskestren, dan presensi santri ke berkas cadangan offline berenkripsi.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleBackupDownload}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Cadangan JSON</span>
            </button>

            <label className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pulihkan dari File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Export Data Sheets Box */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Lembar Kerja Lengkap (CSV / Excel)</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Ekspor rekapitulasi data santri pondok, buku besar keuangan, dan transkrip akademik secara mandiri untuk arsip kementerian atau dinas pendidikan.
          </p>

          <div className="pt-2">
            <button
              onClick={handleExportAllSantriCsv}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor Rekapitulasi Data Santri (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Publisher Form */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Terbitkan Siaran Resmi Pesantren (t.me/SantriCity313)</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">Broadcast Dispatcher</span>
        </div>

        <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-neutral-400 block mb-1">Judul Maklumat / Pengumuman</label>
              <input
                type="text"
                value={bcTitle}
                onChange={(e) => setBcTitle(e.target.value)}
                placeholder="Contoh: Jadwal Kedatangan Tamu Syaikh Talaqqi Mesir..."
                className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Saluran Distribusi</label>
              <select
                value={bcChannel}
                onChange={(e) => setBcChannel(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="t.me/SantriCity313">t.me/SantriCity313 (Utama)</option>
                <option value="Official Pengumuman">Official Pengumuman</option>
                <option value="Darurat Poskestren">Darurat Poskestren</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 block mb-1">Kategori</label>
              <select
                value={bcCategory}
                onChange={(e) => setBcCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Penting">Penting & Maklumat</option>
                <option value="Akademik">Akademik & Ujian</option>
                <option value="Kesehatan">Kesehatan & Poskestren</option>
                <option value="Jadwal">Jadwal & Agenda</option>
                <option value="Kegiatan">Kegiatan & Ekstrakurikuler</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Tingkat Prioritas</label>
              <select
                value={bcPriority}
                onChange={(e) => setBcPriority(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Normal">Normal</option>
                <option value="Tinggi">Tinggi (Pemberitahuan Khusus)</option>
                <option value="Darurat">Darurat (Push Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-neutral-400 block mb-1">Isi Pesan Maklumat</label>
            <textarea
              rows={3}
              value={bcContent}
              onChange={(e) => setBcContent(e.target.value)}
              placeholder="Tuliskan isi pengumuman yang akan dikirimkan ke seluruh wali santri..."
              className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publikasikan Siaran ke Saluran 313</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
