import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  NilaiMataPelajaran,
  PresensiHarian,
  RekamMedis,
  AIDailyDigest,
  UserRole,
} from '../types/pesantren';
import { generateAIDailyDigest } from '../services/geminiService';
import { loadFromLocal, saveToLocal } from '../services/storageService';
import {
  Sparkles,
  Clock,
  HeartPulse,
  GraduationCap,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  Flame,
  CheckCircle2,
  Activity,
  Bot,
  Compass,
  Smile,
  BookOpen,
} from 'lucide-react';

interface AIDailyDigestSectionProps {
  santri: SantriProfile;
  presensiList: PresensiHarian[];
  kesehatanList: RekamMedis[];
  nilaiList: NilaiMataPelajaran[];
  tahfidzList: TahfidzEntry[];
  currentRole: UserRole;
  onNavigateTab: (tab: string) => void;
}

export const AIDailyDigestSection: React.FC<AIDailyDigestSectionProps> = ({
  santri,
  presensiList,
  kesehatanList,
  nilaiList,
  tahfidzList,
  currentRole,
  onNavigateTab,
}) => {
  const [digest, setDigest] = useState<AIDailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activePerspective, setActivePerspective] = useState<'wali' | 'santri' | 'ustaz'>(
    currentRole === 'wali' ? 'wali' : currentRole === 'santri' ? 'santri' : 'ustaz'
  );
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const storageKey = `pesantren_ai_daily_digest_${santri.id}`;

  const loadDigest = async (forceRegenerate = false) => {
    setIsLoading(true);
    try {
      if (!forceRegenerate) {
        const cached = loadFromLocal<AIDailyDigest | null>(storageKey, null);
        if (cached && cached.santriId === santri.id) {
          setDigest(cached);
          setIsLoading(false);
          return;
        }
      }

      const generated = await generateAIDailyDigest(
        santri,
        presensiList,
        kesehatanList,
        nilaiList,
        tahfidzList
      );
      setDigest(generated);
      saveToLocal(storageKey, generated);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDigest(false);
  }, [santri.id]);

  // Copy WhatsApp formatted digest for parents
  const handleCopyDigest = () => {
    if (!digest) return;
    const textToCopy = `*IKHTISAR HARIAN SANTRI (AI DAILY DIGEST)*
Pesantren Modern SantriCity
Santri: *${santri.nama}* (Kelas ${santri.kelas} · ${santri.asrama})
Tanggal: ${digest.dateStr} (${digest.hijriDate})

📌 *Kesiapan & Kebugaran:* ${digest.overallReadiness.status} (Skor: ${digest.overallReadiness.score}/100)
"${digest.overallReadiness.headline}"

🕌 *Presensi & Ketepatan Sholat:*
- Kehadiran Tepat Waktu: ${digest.prayerTakeaways.punctualityRate}%
- Subuh: ${digest.prayerTakeaways.subuhStatus} · Dhuha: ${digest.prayerTakeaways.dhuhaStatus} · Belajar Malam: ${digest.prayerTakeaways.nightAttendanceStatus}
- Catatan: ${digest.prayerTakeaways.highlights}

🩺 *Status Kesehatan (Poskestren):*
- Kondisi: ${digest.healthTakeaways.status}
- Tanda Vital: ${digest.healthTakeaways.vitalsSummary}
- Catatan Medis: ${digest.healthTakeaways.recommendation}

📖 *Kemajuan Akademik & Tahfidz:*
- Nilai Mapel Unggulan: ${digest.academicTakeaways.recentScoresSummary}
- Setoran Tahfidz: ${digest.academicTakeaways.latestTahfidzProgress}
- Capaian Utama: ${digest.academicTakeaways.keyAchievement}

💌 *Pesan untuk Wali Santri:*
"${digest.perspectives.wali}"

_Sistem Informasi Santri Kaffah SantriCity_`;

    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Text to Speech playback
  const handleToggleSpeech = () => {
    if (!digest) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const narrative = `${digest.overallReadiness.headline}. Pesan untuk wali santri: ${digest.perspectives.wali}. Status kesehatan: ${digest.healthTakeaways.status}. Presensi sholat tepat waktu: ${digest.prayerTakeaways.punctualityRate} persen.`;
      const utterance = new SpeechSynthesisUtterance(narrative);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!digest && isLoading) {
    return (
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center space-y-3 shadow-lg">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-spin">
          <RefreshCw className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-neutral-200">
          Menyusun AI Daily Digest santri...
        </p>
        <p className="text-xs text-neutral-400">
          Mengagregasi ketepatan ibadah shalat, rekam medis poskestren, dan capaian akademik terkini.
        </p>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-xl overflow-hidden">
      {/* TOP HEADER BAR */}
      <div className="p-5 sm:p-6 border-b border-neutral-800/80 bg-neutral-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>AI Daily Digest</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/25">
                Ikhtisar Harian Santri
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="text-neutral-300 font-medium">{digest.dateStr}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-mono">{digest.hijriDate}</span>
            <span aria-hidden="true">·</span>
            <span>Diperbarui: {digest.generatedAt}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Narration Button */}
          <button
            onClick={handleToggleSpeech}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors border focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
            }`}
            title="Dengarkan pembacaan suara rangkuman AI"
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isSpeaking ? 'Hentikan Suara' : 'Dengarkan Audio'}</span>
          </button>

          {/* Copy WhatsApp Button */}
          <button
            onClick={handleCopyDigest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Salin rangkuman lengkap dalam format pesan WhatsApp untuk wali santri"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Salin WA</span>
              </>
            )}
          </button>

          {/* Regenerate Button */}
          <button
            onClick={() => loadDigest(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
            title="Analisis ulang ringkasan harian dengan Gemini AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Menyintesis...' : 'Perbarui AI'}</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE HEADLINE BANNER */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950/30 via-neutral-900/60 to-neutral-900/40 border-b border-neutral-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <span>Status Kesiapan & Kebugaran Hari Ini</span>
              <span aria-hidden="true">·</span>
              <span className="text-neutral-300 lowercase font-normal">{digest.overallReadiness.status}</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-neutral-100 leading-snug">
              "{digest.overallReadiness.headline}"
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center bg-neutral-950/80 px-4 py-2.5 rounded-xl border border-neutral-800">
            <div className="text-right">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Skor Kesiapan</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {digest.overallReadiness.score}
                <span className="text-xs text-neutral-500 font-normal">/100</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* THREE CORE ACTIVITY TAKEAWAY CARDS */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: PRAYER PUNCTUALITY & SPIRITUAL ROUTINE */}
        <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-4 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                  Ketepatan Sholat & Ubudiyah
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {digest.prayerTakeaways.punctualityRate}% Tepat Waktu
              </span>
            </div>

            {/* Prayer Status Summary */}
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-300">Sholat Subuh Berjamaah</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {digest.prayerTakeaways.subuhStatus}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-300">Dhuha & Wirid Pagi</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {digest.prayerTakeaways.dhuhaStatus}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-300">Muthola'ah Jam Malam</span>
                <span className="font-semibold text-sky-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {digest.prayerTakeaways.nightAttendanceStatus}
                </span>
              </div>
            </div>

            {/* Highlights Quote & Streak */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-neutral-300 italic leading-relaxed">
                "{digest.prayerTakeaways.highlights}"
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Streak Ibadah: {digest.prayerTakeaways.spiritualStreakDays} hari tertib penuh</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('presensi')}
            className="w-full py-1.5 rounded-xl text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition-colors flex items-center justify-center gap-1"
          >
            <span>Lihat Presensi Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CARD 2: HEALTH STATUS (POSKESTREN) */}
        <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-4 flex flex-col justify-between space-y-4 hover:border-teal-500/30 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                  Kesehatan & Kebugaran
                </h3>
              </div>
              <span className="text-xs font-medium text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                {digest.healthTakeaways.status}
              </span>
            </div>

            {/* Vital Signs Box */}
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
              <div className="text-[11px] text-neutral-400 uppercase font-mono font-medium">
                Pemeriksaan Fisik Terkini
              </div>
              <div className="text-xs font-semibold text-neutral-200 font-mono">
                {digest.healthTakeaways.vitalsSummary}
              </div>
              <div className="text-[11px] text-neutral-400 pt-0.5">
                Riwayat Alergi: <span className="text-neutral-300">{digest.healthTakeaways.allergiesNoted}</span>
              </div>
            </div>

            {/* Health Advice */}
            <div className="space-y-1 pt-1">
              <div className="text-[11px] font-semibold text-teal-400">Anjuran Medis & Sunnah:</div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {digest.healthTakeaways.recommendation}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('poskestren')}
            className="w-full py-1.5 rounded-xl text-xs font-medium text-teal-400 hover:text-teal-300 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition-colors flex items-center justify-center gap-1"
          >
            <span>Buka Rekam Medis (RME)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CARD 3: RECENT ACADEMIC & TAHFIDZ PROGRESS */}
        <div className="rounded-2xl bg-neutral-950/70 border border-neutral-800/90 p-4 flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                  Kemajuan Akademik & Tahfidz
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                {digest.academicTakeaways.studyIntensityLevel.split(' ')[0]} {digest.academicTakeaways.studyIntensityLevel.split(' ')[1]}
              </span>
            </div>

            {/* Academic Highlights */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-0.5">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Mapel Unggulan</div>
                <div className="font-semibold text-neutral-200 truncate">
                  {digest.academicTakeaways.recentScoresSummary}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-0.5">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Tahfidz Terkini</div>
                <div className="font-semibold text-emerald-300 truncate">
                  {digest.academicTakeaways.latestTahfidzProgress}
                </div>
              </div>
            </div>

            {/* Key Achievement */}
            <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
              <span className="font-semibold text-blue-400 block mb-0.5">Capaian Hari Ini:</span>
              {digest.academicTakeaways.keyAchievement}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('akademik')}
            className="w-full py-1.5 rounded-xl text-xs font-medium text-blue-400 hover:text-blue-300 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition-colors flex items-center justify-center gap-1"
          >
            <span>Buka Rapor & Analisis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PERSPECTIVE SWITCHER & NARRATIVE FOOTER */}
      <div className="p-5 sm:p-6 border-t border-neutral-800/80 bg-neutral-950/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Perspektif & Bimbingan Khusus:</span>
          </div>

          {/* Perspective Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <button
              onClick={() => setActivePerspective('wali')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activePerspective === 'wali'
                  ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Untuk Wali Santri
            </button>
            <button
              onClick={() => setActivePerspective('santri')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activePerspective === 'santri'
                  ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Muhasabah Santri
            </button>
            <button
              onClick={() => setActivePerspective('ustaz')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activePerspective === 'ustaz'
                  ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Observasi Musyrif
            </button>
          </div>
        </div>

        {/* Narrative Perspective Box */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200 leading-relaxed italic">
          "{digest.perspectives[activePerspective]}"
        </div>

        {/* Actionable Next Step Bar */}
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold text-emerald-300 uppercase tracking-wide mr-1.5">
                Langkah Belajar Selanjutnya:
              </span>
              <span className="text-neutral-300 font-normal">
                {digest.actionableNextStep}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => onNavigateTab('target-akademik')}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              Lihat Target Sasaran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
