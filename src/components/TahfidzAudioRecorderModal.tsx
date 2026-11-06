import React, { useState, useRef, useEffect } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
} from '../types/pesantren';
import {
  blobToDataUrl,
  isMicrophoneSupported,
  generateSampleRecitationAudio,
} from '../services/audioRecordingService';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  X,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Info,
} from 'lucide-react';

interface TahfidzAudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  santri: SantriProfile;
  onSubmitRecording: (entry: Omit<TahfidzEntry, 'id'>) => void;
}

const POPULAR_SURAHS = [
  { nomor: 1, nama: 'Al-Fatihah', juz: 1, totalAyat: 7 },
  { nomor: 18, nama: 'Al-Kahf', juz: 15, totalAyat: 110 },
  { nomor: 19, nama: 'Maryam', juz: 16, totalAyat: 98 },
  { nomor: 36, nama: 'Yasin', juz: 22, totalAyat: 83 },
  { nomor: 55, nama: 'Ar-Rahman', juz: 27, totalAyat: 78 },
  { nomor: 56, nama: 'Al-Waqi\'ah', juz: 27, totalAyat: 96 },
  { nomor: 67, nama: 'Al-Mulk', juz: 29, totalAyat: 30 },
  { nomor: 78, nama: 'An-Naba\'', juz: 30, totalAyat: 40 },
  { nomor: 87, nama: 'Al-A\'la', juz: 30, totalAyat: 19 },
  { nomor: 93, nama: 'Adh-Dhuha', juz: 30, totalAyat: 11 },
];

export const TahfidzAudioRecorderModal: React.FC<TahfidzAudioRecorderModalProps> = ({
  isOpen,
  onClose,
  santri,
  onSubmitRecording,
}) => {
  // Form details
  const [selectedSurah, setSelectedSurah] = useState<string>('Maryam');
  const [surahNomor, setSurahNomor] = useState<number>(19);
  const [juz, setJuz] = useState<number>(16);
  const [ayatMulai, setAyatMulai] = useState<number>(1);
  const [ayatSelesai, setAyatSelesai] = useState<number>(15);
  const [tipe, setTipe] = useState<'Ziyadah' | 'Murajaah' | 'Tasmi\''>('Ziyadah');
  const [waktu, setWaktu] = useState<'Subuh' | 'Ashar' | 'Maghrib' | 'Malam'>('Subuh');
  const [catatanSantri, setCatatanSantri] = useState<string>('');

  // Audio Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Audio Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Handle Surah change
  const handleSurahChange = (surahName: string) => {
    setSelectedSurah(surahName);
    const found = POPULAR_SURAHS.find((s) => s.nama === surahName);
    if (found) {
      setSurahNomor(found.nomor);
      setJuz(found.juz);
      setAyatMulai(1);
      setAyatSelesai(Math.min(found.totalAyat, 15));
    }
  };

  // Cleanup on unmount or close
  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  if (!isOpen) return null;

  // Start recording using browser microphone API
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    if (!isMicrophoneSupported()) {
      setErrorMessage(
        'Browser Anda belum mendukung MediaRecorder API atau izin mikrofon diblokir. Anda dapat menggunakan tombol "Gunakan Sampel Audio" di bawah.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Setup audio analyzer for sound wave animation
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, v) => acc + v, 0);
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch {
        // non-blocking if analyzer fails
      }

      // Determine supported mimeType
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = selectedMimeType || 'audio/webm';
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);

        try {
          const dataUrl = await blobToDataUrl(recordedBlob);
          setAudioUrl(dataUrl);
        } catch {
          const blobUrl = URL.createObjectURL(recordedBlob);
          setAudioUrl(blobUrl);
        }

        // Cleanup stream tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setAudioLevel(0);
      };

      mediaRecorder.start(250); // gather chunks every 250ms
      setIsRecording(true);

      // Start recording timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            // max 3 minutes
            handleStopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.warn('Microphone permission error:', err);
      setErrorMessage(
        'Akses mikrofon ditolak atau tidak terdeteksi. Silakan periksa izin mikrofon browser Anda, atau gunakan "Gunakan Sampel Audio" untuk demonstrasi.'
      );
      setIsRecording(false);
      cleanupRecording();
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
      }
    }
    setAudioDuration(recordingSeconds || 1);
    setIsRecording(false);
  };

  // Generate synthetic test recitation sample
  const handleUseSampleAudio = async () => {
    setErrorMessage(null);
    try {
      const sample = await generateSampleRecitationAudio();
      setAudioBlob(sample.blob);
      setAudioUrl(sample.dataUrl);
      setAudioDuration(sample.durationSeconds);
      setRecordingSeconds(sample.durationSeconds);
    } catch {
      setErrorMessage('Gagal memuat sampel audio sintetis.');
    }
  };

  // Play / Pause audio preview
  const handleTogglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // Submit audio recitation for Ustaz verification
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrl) {
      setErrorMessage('Silakan rekam audio bacaan Al-Qur\'an terlebih dahulu sebelum mengirim.');
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);

    const newEntry: Omit<TahfidzEntry, 'id'> = {
      santriId: santri.id,
      tanggal: today,
      waktu,
      tipe,
      surah: selectedSurah,
      surahNomor,
      ayatMulai: Number(ayatMulai),
      ayatSelesai: Number(ayatSelesai),
      juz: Number(juz),
      kelancaran: 'Sedang Ditinjau',
      tajwid: 0, // Will be graded by ustaz
      catatanMusyrif: 'Rekaman audio santri baru diunggah. Menunggu peninjauan fashahah dan tajwid oleh Ustaz.',
      musyrifNama: 'Ust. Ahmad Fauzan, Al-Hafidz',
      audioUrl,
      audioDurationSeconds: audioDuration || recordingSeconds || 5,
      statusVerifikasi: 'Menunggu Verifikasi Ustaz',
      catatanSantri: catatanSantri || 'Bismillah, setoran mandiri ananda via rekaman audio.',
    };

    onSubmitRecording(newEntry);
    setIsSubmitting(false);
    cleanupRecording();
    onClose();
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-950/40">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Rekam Setoran Hafalan Suara Santri
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Verifikasi Asatidz
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Santri: <strong className="text-neutral-200">{santri.nama}</strong> (NIS: {santri.nis})
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              cleanupRecording();
              onClose();
            }}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form & Recorder Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Form Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Surah Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pilih Surah Al-Qur'an</span>
              </label>
              <select
                value={selectedSurah}
                onChange={(e) => handleSurahChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {POPULAR_SURAHS.map((s) => (
                  <option key={s.nomor} value={s.nama}>
                    Q.S. {s.nama} (Juz {s.juz} · {s.totalAyat} Ayat)
                  </option>
                ))}
              </select>
            </div>

            {/* Tipe Setoran & Waktu */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Tipe Setoran</label>
                <select
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value as 'Ziyadah' | 'Murajaah' | 'Tasmi\'')}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Ziyadah">Ziyadah (Baru)</option>
                  <option value="Murajaah">Murajaah (Ulang)</option>
                  <option value="Tasmi'">Tasmi' (Ujian)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Waktu Halaqah</label>
                <select
                  value={waktu}
                  onChange={(e) => setWaktu(e.target.value as 'Subuh' | 'Ashar' | 'Maghrib' | 'Malam')}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Subuh">Subuh</option>
                  <option value="Ashar">Ashar</option>
                  <option value="Maghrib">Maghrib</option>
                  <option value="Malam">Malam</option>
                </select>
              </div>
            </div>

            {/* Ayat Range & Juz */}
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Juz Ke-</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={juz}
                  onChange={(e) => setJuz(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Ayat Mulai</label>
                <input
                  type="number"
                  min={1}
                  value={ayatMulai}
                  onChange={(e) => setAyatMulai(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Ayat Selesai</label>
                <input
                  type="number"
                  min={ayatMulai}
                  value={ayatSelesai}
                  onChange={(e) => setAyatSelesai(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Interactive Microphone Recording Station */}
          <div className="p-5 rounded-2xl bg-neutral-900 border-2 border-neutral-800/90 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Studio Rekam Mikrofon (Recitation Booth)
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Maksimal: 03:00 Menit
              </span>
            </div>

            {/* Live Visualizer & Timer Area */}
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              {/* Dynamic Sound Wave Bars Animation */}
              <div className="flex items-end justify-center gap-1.5 h-14 w-full px-4">
                {Array.from({ length: 24 }).map((_, idx) => {
                  let barHeight = 6;
                  if (isRecording) {
                    const waveMod = Math.sin((idx + recordingSeconds * 4) * 0.5);
                    barHeight = Math.max(6, Math.min(52, (audioLevel * 0.5) + (waveMod * 20) + 12));
                  } else if (audioUrl) {
                    barHeight = 16 + (idx % 6) * 5;
                  }

                  return (
                    <div
                      key={idx}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        isRecording
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-300 animate-pulse'
                          : audioUrl
                          ? 'bg-emerald-500/70'
                          : 'bg-neutral-800'
                      }`}
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* Timer Display */}
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
                <span
                  className={`text-2xl font-bold font-mono ${
                    isRecording ? 'text-rose-400' : audioUrl ? 'text-emerald-400' : 'text-neutral-500'
                  }`}
                >
                  {formatTimer(isRecording ? recordingSeconds : audioDuration || recordingSeconds)}
                </span>
                <span className="text-xs text-neutral-400">
                  {isRecording ? 'Sedang Merekam...' : audioUrl ? 'Audio Siap Ditinjau' : 'Siap Merekam'}
                </span>
              </div>

              {/* Main Record / Stop Action Button */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{audioUrl ? 'Rekam Ulang Suara' : 'Mulai Rekam Suara'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 animate-pulse"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Hentikan Rekaman</span>
                  </button>
                )}

                {!isRecording && !audioUrl && (
                  <button
                    type="button"
                    onClick={handleUseSampleAudio}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors flex items-center gap-1.5"
                    title="Gunakan sampel audio sintetis jika mikrofon sedang tidak terhubung"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gunakan Sampel Audio Uji</span>
                  </button>
                )}
              </div>
            </div>

            {/* Audio Preview Player */}
            {audioUrl && !isRecording && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pratinjau Hasil Rekaman Santri</span>
                  </span>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    Durasi: {formatTimer(audioDuration || recordingSeconds)}
                  </span>
                </div>

                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="w-full h-9 rounded-lg"
                  controls
                />
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{errorMessage}</span>
                  <div>
                    <button
                      type="button"
                      onClick={handleUseSampleAudio}
                      className="text-amber-300 hover:underline font-semibold"
                    >
                      Klik di sini untuk mengisi sampel rekaman otomatis →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Catatan Santri untuk Musyrif */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Pesan / Catatan Santri untuk Ustaz Pembimbing (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Mohon dikoreksi mad jaiz munfashil dan ghunnah di ayat 8-10 ya Ustaz..."
              value={catatanSantri}
              onChange={(e) => setCatatanSantri(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                cleanupRecording();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!audioUrl || isRecording || isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Rekaman untuk Verifikasi Ustaz'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
