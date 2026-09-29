import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  Trophy,
  CheckCircle2,
  X,
  ChevronRight,
  Target,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { PushNotificationPayload } from '../services/pushNotificationService';

interface NotificationToastBannerProps {
  onOpenDrawer: () => void;
  onNavigateToGoals?: () => void;
}

export const NotificationToastBanner: React.FC<NotificationToastBannerProps> = ({
  onOpenDrawer,
  onNavigateToGoals,
}) => {
  const [activeNotification, setActiveNotification] = useState<PushNotificationPayload | null>(null);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);

  useEffect(() => {
    const handleNotificationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<PushNotificationPayload>;
      if (customEvent.detail) {
        setActiveNotification(customEvent.detail);
        setIsDismissing(false);

        // Auto dismiss after 7.5 seconds
        const timer = setTimeout(() => {
          setIsDismissing(true);
          setTimeout(() => setActiveNotification(null), 300);
        }, 7500);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('santricity:milestone_notification', handleNotificationEvent);
    return () => {
      window.removeEventListener('santricity:milestone_notification', handleNotificationEvent);
    };
  }, []);

  if (!activeNotification) return null;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => setActiveNotification(null), 300);
  };

  const handleClickBanner = () => {
    handleDismiss();
    if (activeNotification.data?.url === 'goals' && onNavigateToGoals) {
      onNavigateToGoals();
    } else {
      onOpenDrawer();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-16 sm:top-20 right-4 sm:right-6 z-50 max-w-md w-full transition-all duration-300 transform ${
        isDismissing ? 'opacity-0 translate-y-[-10px] scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div className="rounded-2xl bg-neutral-900/95 border-2 border-emerald-500/50 p-4 shadow-2xl backdrop-blur-md text-white flex items-start gap-3.5 relative overflow-hidden group">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/30 transition-all" />

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950 text-neutral-950 mt-0.5">
          <Trophy className="w-5 h-5 text-neutral-950 animate-bounce" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-6 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Push Notification · Milestone Santri</span>
          </div>

          <h4
            onClick={handleClickBanner}
            className="text-xs sm:text-sm font-bold text-white hover:text-emerald-300 transition-colors cursor-pointer leading-snug"
          >
            {activeNotification.title}
          </h4>

          <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
            {activeNotification.body}
          </p>

          <div className="flex items-center gap-3 pt-1 text-[11px]">
            <button
              onClick={handleClickBanner}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 group/btn"
            >
              <span>Buka Detail Milestone</span>
              <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Tutup Notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
