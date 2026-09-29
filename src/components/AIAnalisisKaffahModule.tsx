import React from 'react';
import {
  SantriProfile,
  AIAnalisisKaffah,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  HeartHandshake,
  TrendingUp,
  RefreshCw,
  Printer,
  Calendar,
} from 'lucide-react';

interface AIAnalisisProps {
  santri: SantriProfile;
  aiKaffah: AIAnalisisKaffah;
  onRunAiAnalysis: () => void;
  isAiAnalyzing: boolean;
  onOpenReportModal: () => void;
  currentRole: UserRole;
  lang: Language;
}

export const AIAnalisisKaffahModule: React.FC<AIAnalisisProps> = ({
  santri,
  aiKaffah,
  onRunAiAnalysis,
  isAiAnalyzing,
  onOpenReportModal,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Dasbor Analitik AI Kaffah (Monitoring Menyeluruh)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Sintesis multi-dimensi kecerdasan buatan berbasis data Al-Qur'an, kitab kuning, presensi ibadah, dan rekam medis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReportModal}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-400" />
            <span>Cetak Rapor Kaffah</span>
          </button>

          <button
            onClick={onRunAiAnalysis}
            disabled={isAiAnalyzing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAiAnalyzing ? 'Menganalisis Gemini...' : 'Perbarui Analisis AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Scorecard Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/40 inline-block">
              INTELLIGENT TARBIYAH 360°
            </span>
            <h3 className="text-lg font-bold text-white">
              Indeks Kaffah: {santri.nama}
            </h3>
            <p className="text-xs text-neutral-400">
              Evaluasi komprehensif kepribadian santri, kapabilitas keilmuan, dan kesiapan hafalan.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 shrink-0">
            <div className="text-right">
              <div className="text-xs text-neutral-400 font-medium">Skor Kaffah Terpadu</div>
              <div className="text-3xl font-extrabold font-mono-numbers text-emerald-400">
                {aiKaffah.skorHolistik}
                <span className="text-xs text-neutral-500 font-normal"> / 100</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 5 Pillars Breakdown with Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400 font-medium">1. Al-Qur'an & Tajwid</span>
              <span className="font-mono text-emerald-400 font-bold">{aiKaffah.pilar.tahfidzAlQuran}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.tahfidzAlQuran}%` }} />
            </div>
            <span className="text-[10px] text-neutral-500 block">Bobot Evaluasi: 30%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400 font-medium">2. Akademik Kitab</span>
              <span className="font-mono text-blue-400 font-bold">{aiKaffah.pilar.prestasiAkademik}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.prestasiAkademik}%` }} />
            </div>
            <span className="text-[10px] text-neutral-500 block">Bobot Evaluasi: 25%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400 font-medium">3. Adab & Ubudiyah</span>
              <span className="font-mono text-emerald-400 font-bold">{aiKaffah.pilar.adabKedisiplinan}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.adabKedisiplinan}%` }} />
            </div>
            <span className="text-[10px] text-neutral-500 block">Bobot Evaluasi: 25%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400 font-medium">4. Kesehatan Fisik</span>
              <span className="font-mono text-teal-400 font-bold">{aiKaffah.pilar.kesehatanFisik}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.kesehatanFisik}%` }} />
            </div>
            <span className="text-[10px] text-neutral-500 block">Bobot Evaluasi: 10%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400 font-medium">5. Keaktifan Sosial</span>
              <span className="font-mono text-purple-400 font-bold">{aiKaffah.pilar.keaktifanSosial}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${aiKaffah.pilar.keaktifanSosial}%` }} />
            </div>
            <span className="text-[10px] text-neutral-500 block">Bobot Evaluasi: 10%</span>
          </div>
        </div>

        {/* Narrative Synthesis */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
          <span className="text-neutral-400 font-semibold text-[11px] block">
            Rangkuman Sintesis AI Kaffah:
          </span>
          <p className="text-neutral-200 leading-relaxed text-sm">
            {aiKaffah.ringkasanKaffah}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-1 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>Terakhir dimutakhirkan: {aiKaffah.terakhirDiperbarui}</span>
          </div>
        </div>
      </div>

      {/* Grid: Strengths, Improvements, Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Strengths */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Kekuatan Utama Santri</span>
          </div>

          <ul className="space-y-2.5 text-xs">
            {aiKaffah.kekuatanUtama.map((item, idx) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-neutral-300 leading-relaxed flex items-start gap-2"
              >
                <span className="text-emerald-400 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas of Improvement */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Area Pengembangan & Pengawasan</span>
          </div>

          <ul className="space-y-2.5 text-xs">
            {aiKaffah.areaPengembangan.map((item, idx) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-neutral-300 leading-relaxed flex items-start gap-2"
              >
                <span className="text-amber-400 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendation Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
            <HeartHandshake className="w-4 h-4" />
            <span>Panduan Tindak Lanjut untuk Wali Santri:</span>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {aiKaffah.rekomendasiWali}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-800/40 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Instruksi Bimbingan untuk Musyrif & Asatidz:</span>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {aiKaffah.rekomendasiMusyrif}
          </p>
        </div>
      </div>

      {/* Forecast Target */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
        <div className="space-y-1">
          <span className="font-bold text-white block">Proyeksi Kelulusan & Target 30 Juz Bersanad:</span>
          <p className="text-neutral-400 leading-relaxed max-w-2xl">
            {aiKaffah.prediksiKelulusanTarget}
          </p>
        </div>
        <span className="text-emerald-400 font-mono text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800/50 shrink-0">
          On-Track
        </span>
      </div>
    </div>
  );
};
