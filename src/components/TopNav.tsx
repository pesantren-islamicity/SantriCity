import React from 'react';
import {
  UserRole,
  Language,
  SantriProfile,
} from '../types/pesantren';
import { getTranslation } from '../data/translations';
import {
  ShieldCheck,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Globe,
  User,
  ExternalLink,
  Radio,
} from 'lucide-react';

interface TopNavProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  activeSantri: SantriProfile;
  unreadBroadcastCount: number;
  onOpenNotifications: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  onOpenPushSimulator?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRole,
  onRoleChange,
  lang,
  onLangChange,
  isDarkMode,
  onToggleDarkMode,
  isOnline,
  onToggleOnline,
  activeSantri,
  unreadBroadcastCount,
  onOpenNotifications,
  onManualSync,
  isSyncing,
  onOpenPushSimulator,
}) => {
  const t = getTranslation(lang);

  const roleLabels: Record<UserRole, string> = {
    wali: t.roleWali,
    santri: t.roleSantri,
    ustaz: t.roleUstaz,
    medis: t.roleMedis,
    keuangan: t.roleKeuangan,
    admin: t.roleAdmin,
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="text-lg sm:text-xl font-bold tracking-tight text-emerald-400 flex items-center gap-2 hover:text-emerald-300 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              313
            </div>
            <span>SantriCity Masyarakat</span>
          </a>
          <span className="hidden lg:inline text-xs text-neutral-500 font-mono">
            t.me/SantriCity313
          </span>
        </div>

        {/* Zone 2: 4-6 clean text navigation links / Ecosystem Network */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-neutral-400">
          <a
            href="http://pesantren.islamicity.tv"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <span>pesantren.islamicity.tv</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>
          <a
            href="http://f.pesantren.islamicity.tv"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <span>f.pesantren</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>
          <a
            href="http://global.pesantren.islamicity.tv"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <span>global.pesantren</span>
            <ExternalLink className="w-3 h-3 text-neutral-500" />
          </a>
          <a
            href="https://t.me/SantriCity313"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-cyan-400/90 font-mono"
          >
            <span>Telegram 313</span>
            <ExternalLink className="w-3 h-3 text-cyan-500" />
          </a>
        </nav>

        {/* Zone 3: 1-2 primary actions + controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cloud Sync & Offline Simulator */}
          <button
            onClick={onToggleOnline}
            title={isOnline ? t.online : t.offline}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/40 hover:bg-amber-900/40'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden xl:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </button>

          {/* Sync Trigger */}
          <button
            onClick={onManualSync}
            disabled={isSyncing || !isOnline}
            title={t.syncStatus}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-neutral-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Language Switcher */}
          <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <Globe className="w-3.5 h-3.5 text-neutral-500 ml-1.5 mr-0.5" />
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as Language)}
              className="bg-transparent text-xs text-neutral-200 font-medium py-1 px-1.5 rounded focus:outline-none cursor-pointer"
            >
              <option value="id" className="bg-neutral-900 text-white">ID</option>
              <option value="en" className="bg-neutral-900 text-white">EN</option>
              <option value="ar" className="bg-neutral-900 text-white">العربية</option>
            </select>
          </div>

          {/* Role Switcher (Multi-user Portal) */}
          <div className="flex items-center bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-0.5">
            <User className="w-3.5 h-3.5 text-emerald-400 ml-1.5" />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-xs text-emerald-300 font-medium py-1 px-2 rounded focus:outline-none cursor-pointer"
              title={t.switchRole}
            >
              <option value="wali" className="bg-neutral-900 text-white">Wali: {activeSantri.nama.split(' ')[0]}</option>
              <option value="santri" className="bg-neutral-900 text-white">Santri ({activeSantri.nama.split(' ')[1] || 'Siswa'})</option>
              <option value="ustaz" className="bg-neutral-900 text-white">Ustaz / Musyrif</option>
              <option value="medis" className="bg-neutral-900 text-white">Tenaga Medis Poskestren</option>
              <option value="keuangan" className="bg-neutral-900 text-white">Bendahara SPP</option>
              <option value="admin" className="bg-neutral-900 text-white">Pengasuh & Admin</option>
            </select>
          </div>

          {/* Push Notification Simulator Button */}
          {onOpenPushSimulator && (
            <button
              onClick={onOpenPushSimulator}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
              title="Browser Push Notification API Simulator"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold hidden md:inline">Push Simulator</span>
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-neutral-800 transition-colors"
            title={t.announcement}
          >
            <Bell className="w-4 h-4" />
            {unreadBroadcastCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-neutral-950">
                {unreadBroadcastCount}
              </span>
            )}
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-neutral-800 transition-colors"
            title="Ganti Mode Tampilan"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-300" />}
          </button>
        </div>
      </div>
    </header>
  );
};
