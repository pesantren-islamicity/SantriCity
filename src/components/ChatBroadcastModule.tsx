import React, { useState } from 'react';
import {
  SantriProfile,
  PesanChat,
  BroadcastTelegram,
  UserRole,
  Language,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  MessageSquare,
  Send,
  Radio,
  ExternalLink,
  MessageCircle,
  Copy,
  CheckCircle2,
  Bell,
  Sparkles,
  PhoneCall,
} from 'lucide-react';

interface ChatBroadcastProps {
  santri: SantriProfile;
  chatMessages: PesanChat[];
  broadcasts: BroadcastTelegram[];
  onSendMessage: (pesan: string) => void;
  currentRole: UserRole;
  lang: Language;
}

export const ChatBroadcastModule: React.FC<ChatBroadcastProps> = ({
  santri,
  chatMessages,
  onSendMessage,
  broadcasts,
  currentRole,
  lang,
}) => {
  const t = getTranslation(lang);
  const [activeTab, setActiveTab] = useState<'chat' | 'broadcast' | 'instantTemplate'>('chat');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleCopyTemplate = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(id);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  // Instant messaging templates (WA / Telegram dispatch generator)
  const waTemplates = [
    {
      id: 'wa-tahfidz',
      title: 'Laporan Perkembangan Tahfidz Harian',
      text: `*Laporan Tahfidz SantriCity Masyarakat*\nNama: ${santri.nama}\nNIS: ${santri.nis}\nCapaian Saat Ini: ${santri.capaianJuz} / 30 Juz\nPredikat: Mumtaz\nAlhamdulillah ananda hari ini menyelesaikan setoran dengan baik.\n\nKanal Resmi: https://t.me/SantriCity313 | http://pesantren.islamicity.tv`,
    },
    {
      id: 'wa-kesehatan',
      title: 'Notifikasi Pemeriksaan Poskestren',
      text: `*Informasi Poskestren SantriCity 313*\nYth. Bapak/Ibu ${santri.waliNama},\nAnanda ${santri.nama} telah diperiksa oleh tim medis poskestren dan diberikan terapi serta istirahat teratur di kamar pondok.\nKondisi: Stabil & Dalam Pemantauan Medis.\n\nLayanan Poskestren 24 Jam: http://pesantren.islamicity.tv`,
    },
    {
      id: 'wa-perizinan',
      title: 'Konfirmasi Keluar Gerbang (QR Pass)',
      text: `*Notifikasi Keamanan Gerbang SantriCity*\nSantri: ${santri.nama} (NIS: ${santri.nis})\nTelah terverifikasi keluar melalui Pos 1 Gerbang Utama Pesantren dengan QR Pass resmi pada waktu yang telah disetujui.\nBatas Kembali: Harap tiba sebelum waktu sholat Maghrib.\n\nInfo: https://t.me/SantriCity313`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Pusat Komunikasi, Chat Internal & Siaran 313</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Saluran langsung komunikasi wali santri, musyrif asrama, serta siaran maklumat t.me/SantriCity313.
          </p>
        </div>

        <a
          href="https://t.me/SantriCity313"
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60 transition-colors flex items-center gap-2"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>Buka Kanal Telegram t.me/SantriCity313</span>
          <ExternalLink className="w-3 h-3 text-cyan-500" />
        </a>
      </div>

      {/* Module Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat Musyrif & Wali</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'broadcast'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>Siaran Resmi Telegram ({broadcasts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('instantTemplate')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'instantTemplate'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-emerald-400" />
          <span>Generator Pesan Instan (WhatsApp)</span>
        </button>
      </div>

      {/* TAB 1: Chat Internal */}
      {activeTab === 'chat' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col h-[520px]">
          {/* Chat Header */}
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400">
                Ust
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Musyrif Asrama: Ust. Ahmad Fauzan, Al-Hafidz
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Online · Pendamping Santri {santri.nama.split(' ')[0]}</span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-neutral-400">
              <span>Peran Anda: <strong className="text-emerald-400 uppercase font-mono">{currentRole}</strong></span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-950/40">
            {chatMessages.map((msg) => {
              const isSenderMe =
                (currentRole === 'wali' && msg.pengirimRole === 'wali') ||
                (currentRole === 'ustaz' && msg.pengirimRole === 'ustaz') ||
                (currentRole !== 'wali' && msg.pengirimRole !== 'wali');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-neutral-500 mb-1 px-1">
                    {msg.pengirimNama} · {msg.timestamp}
                  </div>
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isSenderMe
                        ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-800/60 rounded-tr-none'
                        : 'bg-neutral-800 text-neutral-100 border border-neutral-700/80 rounded-tl-none'
                    }`}
                  >
                    {msg.pesan}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Tulis pesan Anda sebagai ${currentRole}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Official Telegram 313 Broadcasts */}
      {activeTab === 'broadcast' && (
        <div className="space-y-4">
          {broadcasts.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {item.channel}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-xs font-medium text-neutral-300">
                    {item.kategori}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="font-mono">{item.tanggal}</span>
                  {item.prioritas === 'Tinggi' && (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                      Penting
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-white">
                {item.judul}
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
                {item.isi}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                <span>Dilihat oleh {item.dilihat.toLocaleString()} penerima santri & wali</span>
                <a
                  href="https://t.me/SantriCity313"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                >
                  <span>Buka di Telegram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Instant Message Templates (WA Dispatch) */}
      {activeTab === 'instantTemplate' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
            <h3 className="text-xs font-bold text-white">
              Integrasi Pengiriman Laporan Pesan Instan
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Kirimkan ringkasan capaian akademik, kabar tahfidz, dan laporan poskestren ananda langsung ke nomor kontak wali santri dengan satu klik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {waTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{template.title}</span>
                  </h4>
                  <pre className="text-[11px] text-neutral-300 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 font-sans whitespace-pre-wrap leading-relaxed">
                    {template.text}
                  </pre>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => handleCopyTemplate(template.text, template.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-1"
                  >
                    {copiedTemplate === template.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(template.text)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-neutral-950 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
