import React, { useEffect } from 'react';
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
  Building2,
  Ticket,
  Scale,
  X,
  User,
  Compass,
  Landmark,
  Library,
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
  | 'startup-center'
  | 'beasiswa'
  | 'klinik-syariah'
  | 'haji-umroh'
  | 'universitas'
  | 'elibrary'
  | 'ai'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  lang: Language;
  santriList: SantriProfile[];
  activeSantri: SantriProfile;
  onSelectSantri: (santri: SantriProfile) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  onRoleChange,
  lang,
  santriList,
  activeSantri,
  onSelectSantri,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const t = getTranslation(lang);

  useEffect(() => {
    if (!isMobileOpen || !onCloseMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

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
    { id: 'startup-center', label: (t as any).navStartupCenter || 'StartUp Center & Fasilitas', icon: Building2, badge: 'Smart' },
    { id: 'beasiswa', label: (t as any).navBeasiswa || 'Peluang Beasiswa & Voucher', icon: Ticket, badge: '12 Jalur' },
    { id: 'klinik-syariah', label: (t as any).navKlinikSyariah || 'Klinik Bisnis Syariah', icon: Scale, badge: 'Muamalah' },
    { id: 'haji-umroh', label: (t as any).navHajiUmroh || 'Prodi Manajemen Haji & Umroh', icon: Compass, badge: 'QS 22:27-29' },
    { id: 'universitas', label: (t as any).navUniversitas || 'Universitas Islamicity Int.', icon: Landmark, badge: '4 Fakultas' },
    { id: 'elibrary', label: (t as any).navElibrary || 'Perpustakaan Digital (E-Library)', icon: Library, badge: 'E-Book QR' },
    { id: 'ai', label: t.navAI, icon: Sparkles, badge: 'AI 360°' },
    { id: 'admin', label: t.navAdmin, icon: ShieldAlert },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && onCloseMobile && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        aria-label="Menu navigasi SantriCity"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:static md:w-64 lg:w-72 shrink-0 border-r border-neutral-800 bg-neutral-950 p-4 pb-6 flex flex-col justify-between h-dvh md:h-[calc(100vh-61px)] md:sticky md:top-[61px] overflow-y-auto overscroll-contain transition-transform duration-200 ease-out ${
          isMobileOpen
            ? 'translate-x-0 pointer-events-auto shadow-2xl shadow-black/80'
            : '-translate-x-full pointer-events-none md:translate-x-0 md:pointer-events-auto'
        }`}
      >
        <div className="space-y-4">
          {/* Mobile Menu Header & Close Button */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                313
              </div>
              <span className="text-sm font-bold text-emerald-400">Menu SantriCity</span>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Tutup menu navigasi"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-neutral-400" />
                <span>Tutup</span>
              </button>
            )}
          </div>

          {/* Mobile Role Switcher inside Drawer */}
          {onRoleChange && (
            <div className="flex sm:hidden items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Peran:</span>
              </div>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-neutral-950 text-xs text-emerald-300 font-medium py-1 px-2 rounded-lg border border-emerald-800/40 focus:outline-none cursor-pointer"
              >
                <option value="wali" className="bg-neutral-900 text-white">Wali: {activeSantri.nama.split(' ')[0]}</option>
                <option value="santri" className="bg-neutral-900 text-white">Santri</option>
                <option value="ustaz" className="bg-neutral-900 text-white">Ustaz / Musyrif</option>
                <option value="medis" className="bg-neutral-900 text-white">Medis Poskestren</option>
                <option value="keuangan" className="bg-neutral-900 text-white">Bendahara SPP</option>
                <option value="admin" className="bg-neutral-900 text-white">Pengasuh & Admin</option>
              </select>
            </div>
          )}

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
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
    </>
  );
};
