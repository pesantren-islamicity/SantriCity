import React, { useState, useRef } from 'react';
import {
  TahfidzEntry,
  SantriProfile,
  UserRole,
} from '../types/pesantren';
import {
  X,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Award,
  Play,
  Pause,
  UserCheck,
  Clock,
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface TahfidzUstazVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TahfidzEntry;
  santri: SantriProfile;
  currentRole: UserRole;
  onSaveVerification: (updatedEntry: TahfidzEntry) => void;
}

export const TahfidzUstazVerificationModal: React.FC<TahfidzUstazVerificationModalProps> = ({
  isOpen,
  onClose,
  entry,
  santri,
  currentRole,
  onSaveVerification,
}) => {
  const [kelancaran, setKelancaran] = useState<TahfidzEntry['kelancaran']>(
    entry.kelancaran === 'Sedang Ditinjau' ? 'Mumtaz' : entry.kelancaran
  );
  const [tajwidScore, setTajwidScore] = useState<number>(entry.tajwid || 92);
  const [catatanMusyrif, setCatatanMusyrif] = useState<string>(
    entry.catatanMusyrif && !entry.catatanMusyrif.includes('Rekaman audio santri baru diunggah')
      ? entry.catatanMusyrif
      : 'Maa syaa Allah bacaan tartil dan lancar. Sifatul huruf dan makhraj terjaga rapi.'
  );
  const [statusVerifikasi, setStatusVerifikasi] = useState<
    'Terverifikasi Mumtaz' | 'Terverifikasi' | 'Perlu Perbaikan (Remedial)'
  >(
    entry.statusVerifikasi === 'Terverifikasi Mumtaz'
      ? 'Terverifikasi Mumtaz'
      : entry.statusVerifikasi === 'Perlu Perbaikan (Remedial)'
      ? 'Perlu Perbaikan (Remedial)'
      : 'Terverifikasi Mumtaz'
  );
  const [musyrifNama, setMusyrifNama] = useState<string>(
    entry.musyrifNama || 'Ust. Ahmad Fauzan, Al-Hafidz'
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const canVerify = currentRole === 'ustaz' || currentRole === 'admin';

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: TahfidzEntry = {
      ...entry,
      kelancaran,
      tajwid: Number(tajwidScore),
      catatanMusyrif,
      musyrifNama,
      statusVerifikasi,
      diverifikasiOleh: musyrifNama,
      diverifikasiPada: new Date().toISOString().slice(0, 10),
    };
    onSaveVerification(updated);
    onClose();
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-cyan-950/40">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Verifikasi Rekaman Bacaan Al-Qur'an
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    entry.statusVerifikasi === 'Menunggu Verifikasi Ustaz'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse'
                      : entry.statusVerifikasi === 'Perlu Perbaikan (Remedial)'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  {entry.statusVerifikasi || 'Menunggu Verifikasi'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Q.S. {entry.surah} ({entry.ayatMulai} - {entry.ayatSelesai}) · Juz {entry.juz} · Santri:{' '}
                <strong className="text-neutral-200">{santri.nama}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Audio Player Station */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Rekaman Suara Santri ({entry.waktu} · {entry.tanggal})</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Durasi: {formatDuration(entry.audioDurationSeconds)}
              </span>
            </div>

            {entry.audioUrl ? (
              <div className="space-y-2">
                <audio
                  ref={audioRef}
                  src={entry.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="w-full h-10 rounded-lg"
                  controls
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 text-center">
                Tidak ada file audio terlampir pada setoran ini.
              </div>
            )}

            {entry.catatanSantri && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1">
                <div className="text-[11px] font-semibold text-emerald-400">Pesan dari Santri:</div>
                <p className="italic">"{entry.catatanSantri}"</p>
              </div>
            )}
          </div>

          {/* Form Verifikasi Musyrif */}
          {canVerify ? (
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Panel Penilaian Dewan Asatidz / Musyrif
                </span>
              </div>

              {/* Status Verifikasi Radio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Keputusan Verifikasi</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Terverifikasi Mumtaz', label: 'Mumtaz (Sempurna)', color: 'text-emerald-300 border-emerald-500/30' },
                    { id: 'Terverifikasi', label: 'Terverifikasi Sah', color: 'text-cyan-300 border-cyan-500/30' },
                    { id: 'Perlu Perbaikan (Remedial)', label: 'Perlu Perbaikan', color: 'text-rose-300 border-rose-500/30' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusVerifikasi(s.id as any)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        statusVerifikasi === s.id
                          ? 'bg-neutral-800 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kelancaran & Skor Tajwid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Predikat Kelancaran</label>
                  <select
                    value={kelancaran}
                    onChange={(e) => setKelancaran(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mumtaz">Mumtaz (Istimewa Tanpa Salah)</option>
                    <option value="Jayyid Jiddan">Jayyid Jiddan (Sangat Baik)</option>
                    <option value="Jayyid">Jayyid (Baik)</option>
                    <option value="Maqbul">Maqbul (Cukup)</option>
                    <option value="Sedang Ditinjau">Sedang Ditinjau</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">Skor Tajwid (0 - 100)</label>
                    <span className="font-mono text-emerald-400 font-bold text-xs">{tajwidScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={tajwidScore}
                    onChange={(e) => setTajwidScore(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Catatan Bimbingan Musyrif */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Catatan Koreksi Tajwid, Makhraj & Rekomendasi Musyrif
                </label>
                <textarea
                  rows={3}
                  value={catatanMusyrif}
                  onChange={(e) => setCatatanMusyrif(e.target.value)}
                  placeholder="Berikan masukan koreksi tajwid untuk santri..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Nama Musyrif Verifikator */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Ustaz / Musyrif Penilai</label>
                <input
                  type="text"
                  value={musyrifNama}
                  onChange={(e) => setMusyrifNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            /* View-only mode for Santri or Wali */
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
                <span className="text-neutral-400">Hasil Penilaian Musyrif</span>
                <span className="font-bold text-emerald-400">
                  Skor Tajwid: {entry.tajwid || 92} (Mumtaz)
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-neutral-400">Catatan Bimbingan Ustaz:</div>
                <p className="text-neutral-200 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  {entry.catatanMusyrif || 'Belum ada catatan verifikasi tertulis.'}
                </p>
              </div>

              <div className="text-[11px] text-neutral-400 pt-1">
                Musyrif Pembimbing:{' '}
                <strong className="text-neutral-200">{entry.musyrifNama}</strong>
                {entry.diverifikasiPada && ` · Diverifikasi: ${entry.diverifikasiPada}`}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Tutup
            </button>

            {canVerify && (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Hasil Verifikasi</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
