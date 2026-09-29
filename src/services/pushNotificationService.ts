/**
 * Browser Push Notification Service for Academic Milestones
 * Uses standard Notification API with in-app toast fallbacks, sound, vibration,
 * and audio chime effects. Works even if the notification drawer is closed.
 */

import { loadFromLocal, saveToLocal } from './storageService';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  timestamp?: number;
  data?: {
    goalId?: string;
    milestoneId?: string;
    santriId?: string;
    santriName?: string;
    type?: string;
    url?: string;
  };
}

const NOTIFICATION_PERMISSION_KEY = 'push_notification_permission_preference';
const PUSH_NOTIF_HISTORY_KEY = 'push_notification_history';
const PUSH_SETTINGS_KEY = 'push_notification_settings';

export interface PushNotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  milestoneReached: boolean;
  goalCompleted: boolean;
  deadlineApproaching: boolean;
  velocityWarning: boolean;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  vibrateEnabled: true,
  milestoneReached: true,
  goalCompleted: true,
  deadlineApproaching: true,
  velocityWarning: true,
};

/**
 * Check if the browser supports the Web Notification API
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn('Notification API not supported by browser.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    saveToLocal(NOTIFICATION_PERMISSION_KEY, permission);
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Get user settings for push notifications
 */
export function getPushNotificationSettings(): PushNotificationSettings {
  return loadFromLocal<PushNotificationSettings>(PUSH_SETTINGS_KEY, DEFAULT_SETTINGS);
}

/**
 * Update user settings for push notifications
 */
export function updatePushNotificationSettings(settings: Partial<PushNotificationSettings>): PushNotificationSettings {
  const current = getPushNotificationSettings();
  const updated = { ...current, ...settings };
  saveToLocal(PUSH_SETTINGS_KEY, updated);
  return updated;
}

/**
 * Get notification history
 */
export function getNotificationHistory(): PushNotificationPayload[] {
  return loadFromLocal<PushNotificationPayload[]>(PUSH_NOTIF_HISTORY_KEY, []);
}

/**
 * Save notification to history log
 */
export function saveNotificationToHistory(payload: PushNotificationPayload): void {
  const history = getNotificationHistory();
  const filtered = history.filter((h) => h.id !== payload.id);
  const updated = [payload, ...filtered].slice(0, 30); // Keep last 30
  saveToLocal(PUSH_NOTIF_HISTORY_KEY, updated);
}

/**
 * Play pleasant Islamic pesantren chime audio via Web Audio API synth
 */
function playCelebrationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic pentatonic bell sequence (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.6);
    });
  } catch {
    // Ignore audio context errors if autoplay is blocked
  }
}

/**
 * Dispatch Push Notification using Browser Notification API,
 * with fallbacks and in-app custom event dispatching so components can react
 * (e.g., banner toasts, drawer badge update, audio chime).
 */
export function triggerMilestonePushNotification(
  payload: PushNotificationPayload,
  onClickHandler?: () => void
): boolean {
  const settings = getPushNotificationSettings();
  if (!settings.enabled) return false;

  // Add timestamp if not present
  const fullPayload: PushNotificationPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
  };

  // Save to history log
  saveNotificationToHistory(fullPayload);

  // Play audio chime if enabled
  if (settings.soundEnabled) {
    playCelebrationChime();
  }

  // Vibrate mobile device if supported
  if (settings.vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 75, 150]);
    } catch {
      // Ignore vibration error
    }
  }

  // 1. Dispatch in-app custom event so the UI can show a rich floating banner toast
  // even if browser permission was blocked or drawer is closed
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('santricity:milestone_notification', {
      detail: fullPayload,
    });
    window.dispatchEvent(event);
  }

  // 2. Trigger native OS browser Notification API
  if (isPushNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notification = new Notification(fullPayload.title, {
        body: fullPayload.body,
        icon: fullPayload.icon,
        badge: fullPayload.badge,
        tag: fullPayload.tag || fullPayload.id,
        data: fullPayload.data,
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        if (onClickHandler) {
          onClickHandler();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('santricity:open_notification_drawer', {
              detail: fullPayload,
            })
          );
        }
      };

      return true;
    } catch (err) {
      console.warn('Native notification spawn failed, relied on in-app toast event:', err);
      return false;
    }
  }

  return false;
}
