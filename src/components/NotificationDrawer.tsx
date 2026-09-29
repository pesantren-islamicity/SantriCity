import React, { useState } from 'react';
import { BroadcastTelegram, AcademicGoalAlert } from '../types/pesantren';
import {
  Bell,
  Radio,
  ExternalLink,
  X,
  Check,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Trophy,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  broadcasts: BroadcastTelegram[];
  goalAlerts: AcademicGoalAlert[];
  onMarkAllAsRead: () => void;
  onMarkGoalAlertAsRead: (alertId: string) => void;
  onMarkAllGoalAlertsAsRead: () => void;
  onNavigateToGoals?: () => void;
  onOpenPushSimulator?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  broadcasts,
  goalAlerts,
  onMarkAllAsRead,
  onMarkGoalAlertAsRead,
  onMarkAllGoalAlertsAsRead,
  onNavigateToGoals,
  onOpenPushSimulator,
}) => {
  const [activeTab, setActiveTab] = useState<'goals' | 'broadcasts'>('goals');
  const [goalFilter, setGoalFilter] = useState<'all' | 'deadlines' | 'milestones' | 'velocity'>('all');

  if (!isOpen) return null;

  const unreadGoalAlertsCount = goalAlerts.filter((a) => !a.isRead).length;

  const filteredGoalAlerts = goalAlerts.filter((alert) => {
    if (goalFilter === 'deadlines') {
      return alert.type === 'deadline_approaching' || alert.type === 'milestone_deadline';
    }
    if (goalFilter === 'milestones') {
      return alert.type === 'milestone_reached' || alert.type === 'goal_completed';
    }
    if (goalFilter === 'velocity') {
      return alert.type === 'velocity_warning';
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-neutral-950 border-l border-neutral-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pusat Notifikasi & Peringatan</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Peringatan otomatis target akademik & siaran resmi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPushSimulator && (
              <button
                onClick={onOpenPushSimulator}
                title="Buka Push Notification Simulator (Notification API)"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Push Simulator</span>
              </button>
            )}
            <button
              onClick={() => {
                if (activeTab === 'goals') {
                  onMarkAllGoalAlertsAsRead();
                } else {
                  onMarkAllAsRead();
                }
              }}
              title="Tandai semua pesan di tab ini sebagai sudah dibaca"
              className="text-xs text-neutral-400 hover:text-emerald-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tandai Dibaca</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Tab Navigation */}
        <div className="flex items-center gap-2 p-2 border-b border-neutral-800/80 bg-neutral-900/40">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'goals'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target & Milestones</span>
            {unreadGoalAlertsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-neutral-950">
                {unreadGoalAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'broadcasts'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Siaran Telegram 313</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-950 text-neutral-300">
              {broadcasts.length}
            </span>
          </button>
        </div>

        {/* Tab 1 Content: Academic Goal & Milestone Alerts */}
        {activeTab === 'goals' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Filter Pills */}
            <div className="p-3 border-b border-neutral-800/60 bg-neutral-950 flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'all', label: `Semua (${goalAlerts.length})` },
                {
                  key: 'deadlines',
                  label: `Tenggat Mendekat (${
                    goalAlerts.filter(
                      (a) =>
                        a.type === 'deadline_approaching' ||
                        a.type === 'milestone_deadline'
                    ).length
                  })`,
                },
                {
                  key: 'milestones',
                  label: `Milestone Tercapai (${
                    goalAlerts.filter(
                      (a) =>
                        a.type === 'milestone_reached' ||
                        a.type === 'goal_completed'
                    ).length
                  })`,
                },
                {
                  key: 'velocity',
                  label: `Laju AI (${
                    goalAlerts.filter((a) => a.type === 'velocity_warning').length
                  })`,
                },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setGoalFilter(f.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    goalFilter === f.key
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Alerts Feed */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {filteredGoalAlerts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-2 my-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-300">
                    Tidak ada peringatan target saat ini
                  </p>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    Seluruh jadwal milestone dan batas waktu target belajar santri berada dalam status normal.
                  </p>
                </div>
              ) : (
                filteredGoalAlerts.map((alert) => {
                  const isCelebration =
                    alert.type === 'milestone_reached' ||
                    alert.type === 'goal_completed';
                  const isDeadline =
                    alert.type === 'deadline_approaching' ||
                    alert.type === 'milestone_deadline';
                  const isVelocity = alert.type === 'velocity_warning';

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                        !alert.isRead
                          ? isCelebration
                            ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border-emerald-500/40 shadow-sm'
                            : alert.urgency === 'critical'
                            ? 'bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border-red-500/40'
                            : 'bg-neutral-900 border-amber-500/30'
                          : 'bg-neutral-900/60 border-neutral-800/80 opacity-80'
                      }`}
                    >
                      {/* Unread indicator badge */}
                      {!alert.isRead && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}

                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {alert.santriName}
                        </span>

                        <span className="px-2 py-0.5 rounded-md font-mono bg-neutral-950 text-neutral-400 border border-neutral-800">
                          {alert.category}
                        </span>

                        {isCelebration && (
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span>Milestone Tercapai</span>
                          </span>
                        )}

                        {isDeadline && (
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                              alert.urgency === 'critical'
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {alert.daysRemaining !== undefined &&
                              alert.daysRemaining < 0
                                ? 'Terlambat'
                                : 'Tenggat Mendekat'}
                            </span>
                          </span>
                        )}

                        {isVelocity && (
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            <span>Laju AI Diperlukan</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Message */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 leading-snug">
                          {isCelebration ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : alert.urgency === 'critical' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span>{alert.title}</span>
                        </h4>

                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>

                      {/* Progress thumbnail */}
                      <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3 h-3 text-emerald-400" />
                          <span className="text-neutral-400">Progres Sasaran:</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {alert.progressPercentage}%
                          </span>
                        </div>

                        {alert.deadlineDate && (
                          <div className="flex items-center gap-1 font-mono text-neutral-400 text-[10px]">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            <span>Target: {alert.deadlineDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-xs">
                        {onNavigateToGoals && (
                          <button
                            onClick={() => {
                              onMarkGoalAlertAsRead(alert.id);
                              onNavigateToGoals();
                              onClose();
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
                          >
                            <span>Buka Sasaran (Goals)</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!alert.isRead ? (
                          <button
                            onClick={() => onMarkGoalAlertAsRead(alert.id)}
                            className="text-neutral-400 hover:text-white text-[11px] flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Tandai Dibaca</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Sudah Dibaca
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2 Content: Telegram Broadcasts */}
        {activeTab === 'broadcasts' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {broadcasts.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-2 hover:border-emerald-600/40 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-cyan-400 font-semibold">
                    {item.channel}
                  </span>
                  <span className="text-neutral-500 font-mono">{item.tanggal}</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">
                  {item.judul}
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-3">
                  {item.isi}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Automated Goal Tracking • SantriCity</span>
          </div>
          <a
            href="https://t.me/SantriCity313"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <span>t.me/SantriCity313</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
