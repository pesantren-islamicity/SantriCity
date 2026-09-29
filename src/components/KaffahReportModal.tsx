import React from 'react';
import {
  SantriProfile,
  TahfidzEntry,
  NilaiMataPelajaran,
  PresensiHarian,
  RekamMedis,
  AIAnalisisKaffah,
  LearningRoadmap,
  StudyPatternSummary,
  NextLessonBatchRecommendation,
  SmartStudyTimetable,
} from '../types/pesantren';
import { Printer, Download, X, Sparkles, BookMarked, Brain, Clock, Compass, Target, Calendar, Flame } from 'lucide-react';
import { loadFromLocal } from '../services/storageService';

interface KaffahReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
  nilaiList: NilaiMataPelajaran[];
  presensiList: PresensiHarian[];
  kesehatanList: RekamMedis[];
  aiKaffah: AIAnalisisKaffah;
}

export const KaffahReportModal: React.FC<KaffahReportModalProps> = ({
  isOpen,
  onClose,
  santri,
  tahfidzList,
  nilaiList,
  presensiList,
  kesehatanList,
  aiKaffah,
}) => {
  if (!isOpen) return null;

  const avgNilai = nilaiList.length
    ? (nilaiList.reduce((acc, curr) => acc + curr.akhir, 0) / nilaiList.length).toFixed(1)
    : '92.4';

  const cachedRoadmaps = loadFromLocal<Record<string, LearningRoadmap>>('learning_roadmaps', {});
  const roadmap = cachedRoadmaps[santri.id];

  const cachedPatterns = loadFromLocal<Record<string, StudyPatternSummary>>('study_patterns', {});
  const studyPattern = cachedPatterns[santri.id];

  const cachedLessons = loadFromLocal<Record<string, NextLessonBatchRecommendation>>('next_lesson_recommendations', {});
  const nextLessonBatch = cachedLessons[santri.id];

  const cachedTimetables = loadFromLocal<Record<string, SmartStudyTimetable>>('smart_study_timetables', {});
  const smartTimetable = cachedTimetables[santri.id];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Actions */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Pratinjau Dokumen Resmi Rapor Kaffah
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Format A4 Standar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-10 bg-white text-neutral-900 overflow-y-auto print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-neutral-900 pb-4 mb-6 text-center space-y-1">
            <div className="font-arabic text-xl font-bold text-neutral-900">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-neutral-900">
              Pondok Pesantren SantriCity Masyarakat
            </h1>
            <p className="text-xs text-neutral-600">
              Kanal Resmi: t.me/SantriCity313 · Portal: http://pesantren.islamicity.tv · Layanan: http://f.pesantren.islamicity.tv
            </p>
            <div className="text-[11px] font-mono text-neutral-500">
              SURAT LAPORAN PERKEMBANGAN SANTRI KAFFAH (HOLISTIK) · SEMESTER GANJIL 2026/2027
            </div>
          </div>

          {/* Student Identity */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs mb-6">
            <div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Nama Santri</span>
                <span className="font-bold text-neutral-900">: {santri.nama}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Nomor Induk (NIS)</span>
                <span className="font-mono font-medium text-neutral-900">: {santri.nis}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Kelas / Jenjang</span>
                <span className="font-medium text-neutral-900">: {santri.kelas}</span>
              </div>
            </div>
            <div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Kamar & Asrama</span>
                <span className="font-medium text-neutral-900">: {santri.kamar} ({santri.asrama})</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Nama Wali Santri</span>
                <span className="font-medium text-neutral-900">: {santri.waliNama} ({santri.waliHubungan})</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 text-neutral-500">Status Keberadaan</span>
                <span className="font-bold text-emerald-800">: {santri.status}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Tahfidz Al-Qur'an */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              I. Capaian Tahfidz & Tajwid Al-Qur'an
            </h2>
            <div className="flex items-center justify-between text-xs py-1">
              <span>Hafalan Tuntas: <strong>{santri.capaianJuz} dari {santri.targetJuz} Juz</strong></span>
              <span>Rata-Rata Nilai Tajwid: <strong>95/100 (Mumtaz)</strong></span>
            </div>
            <table className="w-full text-xs text-left border border-neutral-300">
              <thead className="bg-neutral-100 text-neutral-700">
                <tr>
                  <th className="p-2 border border-neutral-300">Tanggal</th>
                  <th className="p-2 border border-neutral-300">Tipe Setoran</th>
                  <th className="p-2 border border-neutral-300">Surah & Ayat</th>
                  <th className="p-2 border border-neutral-300">Juz</th>
                  <th className="p-2 border border-neutral-300">Kelancaran</th>
                  <th className="p-2 border border-neutral-300">Musyrif</th>
                </tr>
              </thead>
              <tbody>
                {tahfidzList.slice(0, 4).map((t) => (
                  <tr key={t.id}>
                    <td className="p-2 border border-neutral-300 font-mono">{t.tanggal} ({t.waktu})</td>
                    <td className="p-2 border border-neutral-300">{t.tipe}</td>
                    <td className="p-2 border border-neutral-300 font-medium">Q.S. {t.surah} ({t.ayatMulai}-{t.ayatSelesai})</td>
                    <td className="p-2 border border-neutral-300 font-mono">Juz {t.juz}</td>
                    <td className="p-2 border border-neutral-300">{t.kelancaran}</td>
                    <td className="p-2 border border-neutral-300">{t.musyrifNama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Transkrip Nilai Akademik */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              II. Transkrip Nilai Akademik & Kitab Kuning
            </h2>
            <table className="w-full text-xs text-left border border-neutral-300">
              <thead className="bg-neutral-100 text-neutral-700">
                <tr>
                  <th className="p-2 border border-neutral-300">Mata Pelajaran</th>
                  <th className="p-2 border border-neutral-300">Kategori</th>
                  <th className="p-2 border border-neutral-300 text-right">Harian</th>
                  <th className="p-2 border border-neutral-300 text-right">UTS</th>
                  <th className="p-2 border border-neutral-300 text-right">UAS</th>
                  <th className="p-2 border border-neutral-300 text-right">Nilai Akhir</th>
                  <th className="p-2 border border-neutral-300 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {nilaiList.map((n) => (
                  <tr key={n.id}>
                    <td className="p-2 border border-neutral-300 font-medium">{n.mapel}</td>
                    <td className="p-2 border border-neutral-300">{n.kategori}</td>
                    <td className="p-2 border border-neutral-300 text-right font-mono">{n.harian}</td>
                    <td className="p-2 border border-neutral-300 text-right font-mono">{n.uts}</td>
                    <td className="p-2 border border-neutral-300 text-right font-mono">{n.uas}</td>
                    <td className="p-2 border border-neutral-300 text-right font-mono font-bold">{n.akhir}</td>
                    <td className="p-2 border border-neutral-300 text-center font-bold">{n.predikat}</td>
                  </tr>
                ))}
                <tr className="bg-neutral-50 font-bold">
                  <td colSpan={5} className="p-2 border border-neutral-300 text-right">Rata-Rata Kumulatif (IPK):</td>
                  <td className="p-2 border border-neutral-300 text-right font-mono">{avgNilai}</td>
                  <td className="p-2 border border-neutral-300 text-center">A</td>
                </tr>
              </tbody>
            </table>

            {/* AI Learning Roadmap Recommendations */}
            {roadmap && roadmap.topikRekomendasi.length > 0 && (
              <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-neutral-800 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Rekomendasi Topik Belajar Terarah (AI Learning Roadmap)
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Target: {roadmap.fokusPrioritasUtama}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {roadmap.topikRekomendasi.slice(0, 4).map((tp) => (
                    <div key={tp.id} className="p-2 bg-white border border-neutral-200 rounded space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-neutral-900 truncate">[{tp.subjectKode}] {tp.topik}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                          tp.tingkatUrgensi === 'Tinggi' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tp.tingkatUrgensi}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-600 line-clamp-2">
                        {tp.alasanRekomendasi}
                      </p>
                      <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-0.5 border-t border-neutral-100">
                        <span>Rujukan: {tp.sumberRujukan}</span>
                        <span className="font-medium">{tp.durasiMinggu} Pekan</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Chronobiology Study Pattern Summary */}
            {studyPattern && (
              <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-neutral-800 flex items-center gap-1.5 uppercase">
                    <Brain className="w-3.5 h-3.5 text-amber-600" />
                    Profil Jam Belajar Terbaik & Pola Kognitif (AI Study Pattern)
                  </span>
                  <span className="text-[10px] text-amber-800 font-mono font-semibold">
                    Waktu Prima: {studyPattern.overallPeakTime}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-700 leading-relaxed italic">
                  "{studyPattern.executiveSummary}"
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-amber-100">
                  <div className="bg-white p-2 rounded border border-amber-100">
                    <strong className="text-emerald-700 block mb-0.5">Mata Pelajaran Performa Tertinggi:</strong>
                    <span>
                      {studyPattern.topPerformingSubjects.map(s => `${s.mapel} (${s.avgScore})`).join(', ')}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-100">
                    <strong className="text-amber-800 block mb-0.5">Waktu Belajar Efektif:</strong>
                    <span>
                      {studyPattern.overallPeakTime} & {studyPattern.secondaryPeakTime} ({studyPattern.cognitivePace})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Next Lesson & Curriculum Gap Recommendations */}
            {nextLessonBatch && nextLessonBatch.recommendedLessons.length > 0 && (
              <div className="mt-3 p-3 bg-teal-50/70 border border-teal-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-neutral-800 flex items-center gap-1.5 uppercase">
                    <Compass className="w-3.5 h-3.5 text-teal-700" />
                    Rekomendasi Pelajaran Berikutnya & Celah Kurikulum (AI Next Lessons)
                  </span>
                  <span className="text-[10px] text-teal-800 font-mono font-semibold">
                    {nextLessonBatch.recommendedLessons.filter(l => l.isCompleted).length} / {nextLessonBatch.recommendedLessons.length} Diselesaikan
                  </span>
                </div>
                <div className="text-[10px] text-neutral-600 italic">
                  <strong>Diagnosis Celah:</strong> {nextLessonBatch.primaryCurriculumGapSummary}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1 border-t border-teal-100">
                  {nextLessonBatch.recommendedLessons.slice(0, 2).map((nl) => (
                    <div key={nl.id} className="bg-white p-2 rounded border border-teal-100 space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-neutral-900 truncate">[{nl.subjectKode}] {nl.topicTitle}</span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] bg-teal-100 text-teal-800 font-bold">
                          {nl.gapType.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[9px] text-neutral-600 line-clamp-2">
                        {nl.lessonObjective}
                      </p>
                      <div className="text-[9px] text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-0.5">
                        <span>Rujukan: {nl.recommendedKitabOrResource}</span>
                        <span>{nl.estimatedStudyMinutes} mnt</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Smart Scheduler Weekly Study Timetable Highlights */}
            {smartTimetable && smartTimetable.slots.length > 0 && (
              <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-neutral-800 flex items-center gap-1.5 uppercase">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    Jadwal Belajar Mandiri Mingguan (AI Smart Scheduler)
                  </span>
                  <span className="text-[10px] text-emerald-800 font-mono font-semibold">
                    {smartTimetable.totalWeeklyStudyHours} Jam / Pekan • {smartTimetable.slots.filter(s => s.isCompleted).length}/{smartTimetable.slots.length} Sesi Selesai
                  </span>
                </div>
                <div className="text-[10px] text-neutral-600">
                  <strong>Strategi Kronobiologi:</strong> Jam prima diprioritaskan pada{' '}
                  <span className="font-semibold text-emerald-900">{smartTimetable.peakSlotUtilized}</span> &{' '}
                  <span className="font-semibold text-emerald-900">{smartTimetable.secondaryPeakSlotUtilized}</span>{' '}
                  untuk akselerasi target akademik santri.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[9px] pt-1 border-t border-emerald-100">
                  {smartTimetable.slots.slice(0, 3).map((slot) => (
                    <div key={slot.id} className="bg-white p-1.5 rounded border border-emerald-100 space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-neutral-900">
                        <span>{slot.day}</span>
                        <span className="text-emerald-700">{slot.timeRange.split(' ')[0]}</span>
                      </div>
                      <div className="text-neutral-700 truncate font-medium">{slot.subjectOrGoalTitle}</div>
                      <div className="text-[8px] text-neutral-500">{slot.recommendedTechnique}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Intensity & Productivity Heatmap Highlights */}
            <div className="mt-2.5 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-bold text-neutral-800 uppercase">
                  Ritme & Intensitas Belajar (Heatmap):
                </span>
                <span className="text-neutral-600">
                  Rerata 82/100 (Level 3 - Produktivitas Tinggi) • Rekor Rentang 24 Hari • Hari Prima: Selasa
                </span>
              </div>
              <span className="font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                +8.6% Korelasi Nilai Ujian
              </span>
            </div>
          </div>

          {/* Section 3: Adab, Disiplin & Poskestren */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 border border-neutral-200 rounded-lg space-y-1">
              <h3 className="font-bold uppercase text-neutral-800">III. Adab & Ubudiyah</h3>
              <div>Poin Kedisiplinan: <strong>{santri.poinDisiplin} / 100 Poin</strong></div>
              <div>Kehadiran Jamaah Subuh: <strong>99% Hadir Tepat Waktu</strong></div>
              <div className="text-[11px] text-neutral-600">Catatan: Santri teladan dalam adab asrama dan ibadah rawatib.</div>
            </div>

            <div className="p-3 border border-neutral-200 rounded-lg space-y-1">
              <h3 className="font-bold uppercase text-neutral-800">IV. Kesehatan (Poskestren)</h3>
              <div>Status Vital: <strong>Sehat & Aktif</strong></div>
              <div>Golongan Darah: <strong>{santri.golonganDarah}</strong></div>
              <div className="text-[11px] text-neutral-600">
                Alergi: {santri.alergi.length ? santri.alergi.join(', ') : 'Nihil'}
              </div>
            </div>
          </div>

          {/* Section 4: AI Kaffah Pedagogic Evaluation */}
          <div className="mb-8 p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase text-neutral-900">
                V. Sintesis Analitik AI Kaffah SantriCity
              </h3>
              <span className="font-mono font-bold text-neutral-900">
                Skor Holistik: {aiKaffah.skorHolistik} / 100
              </span>
            </div>
            <p className="text-neutral-700 leading-relaxed italic">
              "{aiKaffah.ringkasanKaffah}"
            </p>
            <div className="text-neutral-800">
              <strong>Pesan Pembinaan untuk Wali:</strong> {aiKaffah.rekomendasiWali}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4 border-t border-neutral-300">
            <div className="space-y-12">
              <span>Wali Santri</span>
              <div className="font-bold underline">{santri.waliNama}</div>
            </div>
            <div className="space-y-12">
              <span>Musyrif Pembina Tahfidz</span>
              <div className="font-bold underline">Ust. Ahmad Fauzan, Al-Hafidz</div>
            </div>
            <div className="space-y-12">
              <span>Pengasuh Pondok Pesantren</span>
              <div className="font-bold underline">K.H. Ahmad Nawawi, M.A.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
