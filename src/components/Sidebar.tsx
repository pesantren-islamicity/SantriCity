import React from 'react';
import {
  UserRole,
  Language,
  SantriProfile,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CalendarCheck2,
  HeartPulse,
  CreditCard,
  QrCode,
  MessageSquare,
  CalendarDays,
  Sparkles,
  ShieldAlert,
  Lock,
  ChevronDown,
  Target,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'tahfidz'
  | 'akademik'
  | 'target-akademik'
  | 'presensi'
  | 'poskestren'
  | 'keuangan'
  | 'perizinan'
  | 'chat'
  | 'kalender'
  | 'ai'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: UserRole;
  lang: Language;
  santriList: SantriProfile[];
  activeSantri: SantriProfile;
  onSelectSantri: (santri: SantriProfile) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  lang,
  santriList,
  activeSantri,
  onSelectSantri,
}) => {
  const t = getTranslation(lang);

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'tahfidz', label: t.navTahfidz, icon: BookOpen, badge: `${activeSantri.capaianJuz} Juz` },
    { id: 'akademik', label: t.navAkademik, icon: GraduationCap },
    { id: 'target-akademik', label: (t as any).navAcademicGoals || 'Target Akademik', icon: Target, badge: 'AI Goal' },
    { id: 'presensi', label: t.navPresensi, icon: CalendarCheck2 },
    { id: 'poskestren', label: t.navKesehatan, icon: HeartPulse },
    { id: 'keuangan', label: t.navKeuangan, icon: CreditCard, badge: 'SPP' },
    { id: 'perizinan', label: t.navPerizinan, icon: QrCode },
    { id: 'chat', label: t.navChat, icon: MessageSquare },
    { id: 'kalender', label: t.navKalender, icon: CalendarDays },
    { id: 'ai', label: t.navAI, icon: Sparkles, badge: 'AI 360°' },
    { id: 'admin', label: t.navAdmin, icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 lg:w-72 shrink-0 border-r border-neutral-800 bg-neutral-950 p-4 flex flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] overflow-y-auto">
      <div className="space-y-4">
        {/* Active Santri Selector Card */}
        <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Profil Santri Terpilih</span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
              NIS: {activeSantri.nis}
            </span>
          </div>

          <div className="relative">
            <select
              value={activeSantri.id}
              onChange={(e) => {
                const found = santriList.find((s) => s.id === e.target.value);
                if (found) onSelectSantri(found);
              }}
              className="w-full bg-neutral-950 text-neutral-200 text-xs font-semibold py-2 px-2.5 rounded-lg border border-neutral-700/80 focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer pr-8"
            >
              {santriList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kelas.split(' - ')[0]})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
            <span className="truncate">{activeSantri.asrama}</span>
            <span>·</span>
            <span className="text-emerald-400 font-mono font-medium">{activeSantri.status}</span>
          </div>
        </div>

        {/* Navigation Modules */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/40 shadow-sm shadow-emerald-950'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/70'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & E2EE Info */}
      <div className="pt-4 border-t border-neutral-800/80 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enkripsi End-to-End</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">256-bit</span>
        </div>

        <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300 font-medium">SantriCity 313</span>
            <span className="text-[10px] text-emerald-400 font-mono">v3.13-Pro</span>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Terintegrasi ekosistem Islamicity TV, Poskestren, dan Pembayaran SPP Digital.
          </p>
        </div>
      </div>
    </aside>
  );
};
