import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  ShieldCheck,
  Send,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getPushNotificationSettings,
  updatePushNotificationSettings,
  triggerMilestonePushNotification,
  PushNotificationSettings,
} from '../services/pushNotificationService';
import { SantriProfile, AcademicGoal } from '../types/pesantren';

interface PushNotificationSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSantri: SantriProfile;
  goals: AcademicGoal[];
  onNavigateToGoals?: () => void;
}

export const PushNotificationSimulatorModal: React.FC<PushNotificationSimulatorModalProps> = ({
  isOpen,
  onClose,
  activeSantri,
  goals,
  onNavigateToGoals,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [settings, setSettings] = useState<PushNotificationSettings>(getPushNotificationSettings());
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customBody, setCustomBody] = useState<string>('');
  const [selectedMilestonePreset, setSelectedMilestonePreset] = useState<string>('preset-tahfidz');
  const [lastDispatchedTime, setLastDispatchedTime] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setSettings(getPushNotificationSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const supported = isPushNotificationSupported();

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const handleToggleSetting = (key: keyof PushNotificationSettings) => {
    const updated = updatePushNotificationSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  // Presets based on actual goals or pesantren milestones
  const presets = [
    {
      id: 'preset-tahfidz',
      label: "Tasmi' 15 Juz Sekali Duduk Selesai Mutqin",
      category: "Tahfidz Al-Qur'an",
      title: `🎉 Tahfidz Milestone Reached: Tasmi' 15 Juz Mutqin`,
      body: `Maa syaa Allah! Ananda ${activeSantri.nama} berhasil menyelesaikan tasmi' 15 juz di hadapan dewan masyaikh dengan nilai Tajwid 96 (Mumtaz).`,
    },
    {
      id: 'preset-alfiyah',
      label: 'Hafalan Matan Alfiyah Bait ke-500',
      category: 'Akademik Kitab Turats',
      title: `🏆 Academic Milestone: Hafal 500 Bait Alfiyah Ibnu Malik`,
      body: `Alhamdulillah! Ananda ${activeSantri.nama} telah lulus setoran 500 bait Alfiyah pada sesi halaqah malam bersama Ustaz Hamzah.`,
    },
    {
      id: 'preset-mqk',
      label: 'Juara 1 MQK Wilayah Cabang Fiqih Fathul Qorib',
      category: 'Prestasi Akademik',
      title: `🥇 Prestasi Santri: Juara 1 MQK Wilayah Tingkat Aliyah`,
      body: `Selamat untuk ananda ${activeSantri.nama} yang dinobatkan sebagai Qari' Terbaik MQK Wilayah dengan skor sempurna 97.5!`,
    },
    {
      id: 'preset-math',
      label: 'Kelulusan Ujian Standar Olimpiade Sains (OSN)',
      category: 'Sains & Teknologi',
      title: `⚡ Milestone Sains: Lolos Seleksi Provinsi OSN Fisika & Matematika`,
      body: `Pencapaian luar biasa! Nilai evaluasi simulasi sains ananda ${activeSantri.nama} mencapai 94.0 (Peringkat 1 Kontingen).`,
    },
  ];

  const handleDispatchPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId) || presets[0];

    const success = triggerMilestonePushNotification(
      {
        id: `push-milestone-${Date.now()}`,
        title: preset.title,
        body: preset.body,
        tag: `milestone-${activeSantri.id}`,
        data: {
          santriId: activeSantri.id,
          santriName: activeSantri.nama,
          type: 'milestone_reached',
          url: 'goals',
        },
      },
      () => {
        if (onNavigateToGoals) onNavigateToGoals();
      }
    );

    setLastDispatchedTime(new Date().toLocaleTimeString('id-ID'));
  };

  const handleDispatchCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    triggerMilestonePushNotification(
      {
        id: `push-custom-${Date.now()}`,
        title: customTitle.trim(),
        body: customBody.trim() || `Milestone akademik ananda ${activeSantri.nama} berhasil dicapai dengan capaian sempurna.`,
        tag: `milestone-${activeSantri.id}`,
        data: {
          santriId: activeSantri.id,
          santriName: activeSantri.nama,
          type: 'milestone_reached',
          url: 'goals',
        },
      },
      () => {
        if (onNavigateToGoals) onNavigateToGoals();
      }
    );

    setCustomTitle('');
    setCustomBody('');
    setLastDispatchedTime(new Date().toLocaleTimeString('id-ID'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Push Notification Simulator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Web Notification API
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Uji notifikasi browser saat milestone akademik santri tercapai (bahkan saat laci notifikasi ditutup).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Status Box */}
        <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Izin Notifikasi Browser (Desktop & Mobile)</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Status saat ini:{' '}
                <span
                  className={`font-mono font-bold ${
                    permission === 'granted'
                      ? 'text-emerald-400'
                      : permission === 'denied'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                >
                  {permission.toUpperCase()}
                </span>
                {!supported && ' (Browser tidak mendukung Notification API)'}
              </div>
            </div>

            {permission !== 'granted' ? (
              <button
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-neutral-950 transition-colors shadow-sm self-start sm:self-auto"
              >
                Minta Izin Notifikasi
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Izin Aktif
              </span>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
            ℹ️ <strong>Catatan:</strong> Jika izin berstatus 'DENIED' atau diblokir di peramban, simulator tetap secara otomatis memicu <em>In-App Toast Banner & Audio Chime</em> mengambang di layar Anda.
          </p>
        </div>

        {/* Toggles Row: Sound, Vibration, Push Enabled */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <button
            onClick={() => handleToggleSetting('enabled')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
              settings.enabled
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className="font-medium">Push Notif Aktif</span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                settings.enabled ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-neutral-800'
              }`}
            >
              {settings.enabled ? '✓' : ''}
            </div>
          </button>

          <button
            onClick={() => handleToggleSetting('soundEnabled')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
              settings.soundEnabled
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nada Chime</span>
            </span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                settings.soundEnabled ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-neutral-800'
              }`}
            >
              {settings.soundEnabled ? '✓' : ''}
            </div>
          </button>

          <button
            onClick={() => handleToggleSetting('vibrateEnabled')}
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
              settings.vibrateEnabled
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className="font-medium">Getar Mobile</span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                settings.vibrateEnabled ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-neutral-800'
              }`}
            >
              {settings.vibrateEnabled ? '✓' : ''}
            </div>
          </button>
        </div>

        {/* SECTION 1: INSTANT PRESETS FOR ACADEMIC MILESTONES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulasi Tonggak Akademik Santri (Preset Instan):</span>
            </span>
            {lastDispatchedTime && (
              <span className="text-[10px] text-emerald-400 font-mono">
                Terkirim: {lastDispatchedTime} WIB
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-medium font-mono">{preset.category}</span>
                    <span className="text-neutral-500">Milestone</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {preset.label}
                  </h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {preset.body}
                  </p>
                </div>

                <button
                  onClick={() => handleDispatchPreset(preset.id)}
                  className="w-full py-1.5 rounded-lg text-xs font-medium text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Kirim Push Notifikasi</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: CUSTOM MILESTONE NOTIFICATION DISPATCHER */}
        <form onSubmit={handleDispatchCustom} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kirim Notifikasi Milestone Kustom</span>
            </span>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 mb-1">Judul Notifikasi:</label>
            <input
              type="text"
              required
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Contoh: 🌟 Milestone Tercapai: Selesai Ujian Fiqih Kitab Kuning"
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-300 mb-1">Isi Pesan Notifikasi:</label>
            <input
              type="text"
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder={`Contoh: Alhamdulillah ananda ${activeSantri.nama} meraih nilai 95 dan tuntas target pekan ini.`}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-xl font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Picu Notifikasi Kustom ke Browser</span>
          </button>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs">
          <span className="text-[11px] text-neutral-500">
            Terhubung ke Notification API & Service Worker Simulator
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
