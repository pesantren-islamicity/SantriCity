import React, { useState, useEffect } from 'react';
import {
  SantriProfile,
  NilaiMataPelajaran,
  TutorBotMode,
  TutorBotMessage,
  QuizQuestionItem,
} from '../types/pesantren';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lightbulb,
  GraduationCap,
  ChevronRight,
  BookMarked,
  Brain,
  MessageSquare,
} from 'lucide-react';
import { askTutorBotAI } from '../services/geminiService';

interface TutorBotPanelProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  initialSubjectKode?: string;
  initialPrompt?: string;
}

export const TutorBotPanel: React.FC<TutorBotPanelProps> = ({
  santri,
  nilaiList,
  initialSubjectKode,
  initialPrompt,
}) => {
  const [selectedSubjectKode, setSelectedSubjectKode] = useState<string>(
    initialSubjectKode || nilaiList[0]?.kode || ''
  );
  const [mode, setMode] = useState<TutorBotMode>('explain');
  const [inputQuery, setInputQuery] = useState<string>(initialPrompt || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [showQuizResults, setShowQuizResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSubjectKode) {
      setSelectedSubjectKode(initialSubjectKode);
    }
    if (initialPrompt) {
      setInputQuery(initialPrompt);
    }
  }, [initialSubjectKode, initialPrompt]);

  const selectedSubject =
    nilaiList.find((n) => n.kode === selectedSubjectKode) || nilaiList[0];

  // Pre-seed conversation with greeting from Ustaz AI Tutor
  const [messages, setMessages] = useState<TutorBotMessage[]>([
    {
      id: 'init-1',
      sender: 'tutor',
      timestamp: 'Baru saja',
      text: `Ahlan wa sahlan ananda ${santri.nama}! Saya adalah Ustaz AI Tutor Anda. Silakan pilih mata pelajaran dan mode bantuan yang diinginkan (Penjelasan Konseptual, Ringkasan Materi, atau Kuis Latihan). Ada materi yang ingin Anda tanyakan hari ini?`,
      kitabReference: 'Asisten Belajar Mandiri Kurikulum SantriCity 313',
    },
  ]);

  // Suggested prompt ideas per subject
  const getPromptSuggestions = (subject: NilaiMataPelajaran): string[] => {
    if (subject.mapel.includes('Nahwu')) {
      return [
        'Jelaskan perbedaan mendasar antara Isim Mu\'rob dan Isim Mabni beserta contohnya.',
        'Buat ringkasan bab Kalam dan tanda-tanda I\'rab dalam Matan Alfiyah.',
        'Buat 2 soal kuis latihan i\'rab isim inna dan khabar kaana.',
      ];
    } else if (subject.mapel.includes('Fiqih')) {
      return [
        'Jelaskan rukun dan syarat sah jual beli (bai\') dalam Fathul Qorib.',
        'Ringkas pembagian air suci menyucikan dan mutanajjis dalam 3 poin.',
        'Berikan kuis latihan seputar zakat fitrah dan waktu wajibnya.',
      ];
    } else if (subject.mapel.includes('Hadits')) {
      return [
        'Bagaimana syarah hadits tentang niat dalam Bulughul Maram?',
        'Ringkas pengertian hadits shahih, hasan, dan dhaif secara ringkas.',
        'Buat kuis seputar rawi dan sanad hadits.',
      ];
    } else if (subject.mapel.includes('Matematika')) {
      return [
        'Jelaskan konsep dasar turunan fungsi aljabar dengan analogi sederhana.',
        'Ringkas rumus integral tentu dan penggunaannya dalam geometri.',
        'Buat 2 soal latihan kuis kalkulus pemodelan matematika.',
      ];
    } else if (subject.mapel.includes('Fisika')) {
      return [
        'Jelaskan Hukum Termodinamika II dan contohnya dalam fenomena alam.',
        'Ringkas konsep gelombang elektromagnetik dan spektrum cahaya.',
        'Buat kuis latihan fisika optik dan indeks bias.',
      ];
    } else {
      return [
        `Jelaskan konsep kunci bab materi terkini dalam ${subject.mapel}.`,
        `Buat ringkasan 4 poin utama materi ${subject.mapel} untuk hafalan.`,
        `Buatkan kuis latihan interaktif pemahaman materi ${subject.mapel}.`,
      ];
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || !selectedSubject || isLoading) return;

    const userMsg: TutorBotMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'santri',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
      mode,
      subjectKode: selectedSubject.kode,
      subjectMapel: selectedSubject.mapel,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await askTutorBotAI(textToSend, mode, selectedSubject, santri);

      const botMsg: TutorBotMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        mode,
        subjectKode: selectedSubject.kode,
        subjectMapel: selectedSubject.mapel,
        summaryPoints: response.summaryPoints,
        quizQuestions: response.quizQuestions,
        kitabReference: response.kitabReference,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Tutor bot error:', err);
      const errorMsg: TutorBotMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: 'Mohon maaf, sistem asisten tutor sedang memproses banyak permintaan. Namun intisari kurikulum materi Anda tetap aman tersimpan.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuizOption = (questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleCheckQuizAnswer = (questionId: string) => {
    setShowQuizResults((prev) => ({
      ...prev,
      [questionId]: true,
    }));
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/40 border border-indigo-500/30 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ustaz AI Tutor • Asisten Kurikulum Mandiri 24 Jam</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Konsultasi & Pendalaman Materi Santri: {santri.nama}</span>
            </h3>
            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              Tanyakan materi kitab turats, sains eksakta, maupun bahasa asing. AI Tutor menyediakan penjelasan konseptual ramah santri, ringkasan poin inti materi, hingga kuis latihan interaktif.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2 font-mono">
              <BookMarked className="w-4 h-4 text-emerald-400" />
              <span>{nilaiList.length} Mata Pelajaran</span>
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Subject Selector & Mode Switcher */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Subject dropdown */}
        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs font-semibold text-neutral-300 shrink-0 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Mapel Fokus:</span>
          </label>
          <select
            value={selectedSubjectKode}
            onChange={(e) => setSelectedSubjectKode(e.target.value)}
            className="w-full md:w-auto flex-1 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {nilaiList.map((n) => (
              <option key={n.id} value={n.kode}>
                [{n.kode}] {n.mapel} — {n.kategori} (Nilai: {n.akhir})
              </option>
            ))}
          </select>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-x-auto shrink-0">
          <button
            onClick={() => setMode('explain')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'explain'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Penjelasan Konsep</span>
          </button>

          <button
            onClick={() => setMode('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'summary'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ringkasan Materi</span>
          </button>

          <button
            onClick={() => setMode('quiz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'quiz'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Kuis Latihan</span>
          </button>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 min-h-[420px] max-h-[600px] overflow-y-auto flex flex-col shadow-inner">
        {messages.map((msg) => {
          const isTutor = msg.sender === 'tutor';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${
                isTutor ? 'self-start' : 'self-end flex-row-reverse'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                  isTutor
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isTutor ? <Bot className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl space-y-3 text-xs leading-relaxed ${
                  isTutor
                    ? 'bg-neutral-950/90 border border-neutral-800 text-neutral-200'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-center justify-between gap-3 text-[10px] pb-1 border-b border-neutral-800/60">
                  <span className="font-bold">
                    {isTutor ? 'Ustaz AI Tutor (SantriCity)' : `${santri.nama}`}
                  </span>
                  <span className="opacity-70 font-mono">{msg.timestamp}</span>
                </div>

                {/* Subtitle / Topic Reference if present */}
                {msg.subjectMapel && (
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-mono">
                    <BookOpen className="w-3 h-3" />
                    <span>[{msg.subjectKode}] {msg.subjectMapel}</span>
                  </div>
                )}

                {/* Main Text Body */}
                <div className="whitespace-pre-line text-xs">{msg.text}</div>

                {/* Summary Bullet Points if present */}
                {msg.summaryPoints && msg.summaryPoints.length > 0 && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Poin Inti Ringkasan Materi:
                    </span>
                    <ul className="space-y-1.5">
                      {msg.summaryPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-neutral-200">
                          <span className="text-emerald-400 font-bold font-mono">#{i + 1}</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quiz Questions Render if present */}
                {msg.quizQuestions && msg.quizQuestions.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {msg.quizQuestions.map((q, qIndex) => {
                      const selectedOption = quizAnswers[q.id];
                      const isSubmitted = showQuizResults[q.id];
                      const isCorrect = selectedOption === q.correctOptionIndex;

                      return (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-white text-xs flex items-start gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                                Soal {qIndex + 1}
                              </span>
                              <span>{q.question}</span>
                            </h5>
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 gap-1.5">
                            {q.options.map((opt, optIndex) => {
                              const isThisSelected = selectedOption === optIndex;
                              const isThisCorrectOption = q.correctOptionIndex === optIndex;

                              let btnStyle = 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700';

                              if (isSubmitted) {
                                if (isThisCorrectOption) {
                                  btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold';
                                } else if (isThisSelected && !isCorrect) {
                                  btnStyle = 'bg-red-950/60 border-red-500 text-red-200';
                                } else {
                                  btnStyle = 'bg-neutral-950/40 border-neutral-800/40 opacity-50';
                                }
                              } else if (isThisSelected) {
                                btnStyle = 'bg-indigo-950/80 border-indigo-500 text-white font-semibold';
                              }

                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => handleSelectQuizOption(q.id, optIndex)}
                                  disabled={isSubmitted}
                                  className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-mono font-bold">
                                      {String.fromCharCode(65 + optIndex)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                  {isSubmitted && isThisCorrectOption && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                  {isSubmitted && isThisSelected && !isCorrect && (
                                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Check answer action */}
                          {!isSubmitted ? (
                            <button
                              onClick={() => handleCheckQuizAnswer(q.id)}
                              disabled={selectedOption === undefined}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 disabled:opacity-40 transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Periksa Jawaban</span>
                            </button>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1 text-[11px]">
                              <div className="flex items-center gap-1.5 font-bold">
                                {isCorrect ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Jawaban Anda Tepat! Mumtaz!
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Jawaban Belum Tepat.
                                  </span>
                                )}
                              </div>
                              <p className="text-neutral-300 leading-relaxed">
                                {q.explanation}
                              </p>
                              {q.dalilOrReference && (
                                <p className="text-amber-400 text-[10px] font-mono pt-1 border-t border-neutral-900">
                                  Rujukan: {q.dalilOrReference}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Kitab Reference Footer */}
                {msg.kitabReference && (
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1 font-mono">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      <span>{msg.kitabReference}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 self-start p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Ustaz AI Tutor sedang merumuskan jawaban & materi kurikulum...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts Pill Buttons */}
      {selectedSubject && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Inspirasi Pertanyaan untuk [{selectedSubject.kode}] {selectedSubject.mapel}:
          </span>
          <div className="flex flex-wrap gap-2">
            {getPromptSuggestions(selectedSubject).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs text-left transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="line-clamp-1">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Message Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-2 shadow-lg"
      >
        <input
          type="text"
          placeholder={`Tanyakan materi ${selectedSubject?.mapel || 'pelajaran'}... (Mode: ${
            mode === 'explain' ? 'Penjelasan' : mode === 'summary' ? 'Ringkasan' : 'Kuis Latihan'
          })`}
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-md disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Kirim</span>
        </button>
      </form>
    </div>
  );
};
