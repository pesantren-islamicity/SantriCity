import {
  AcademicGoal,
  AcademicGoalAlert,
  SantriProfile,
} from '../types/pesantren';
import { loadFromLocal, saveToLocal } from './storageService';

const READ_ALERTS_KEY = 'read_goal_alert_ids';

export function getReadAlertIds(): string[] {
  return loadFromLocal<string[]>(READ_ALERTS_KEY, []);
}

export function markAlertAsRead(alertId: string): string[] {
  const current = getReadAlertIds();
  if (!current.includes(alertId)) {
    const updated = [...current, alertId];
    saveToLocal(READ_ALERTS_KEY, updated);
    return updated;
  }
  return current;
}

export function markAllAlertsAsRead(alertIds: string[]): string[] {
  const current = getReadAlertIds();
  const merged = Array.from(new Set([...current, ...alertIds]));
  saveToLocal(READ_ALERTS_KEY, merged);
  return merged;
}

export function generateAcademicGoalAlerts(
  goals: AcademicGoal[],
  santriList: SantriProfile[],
  readAlertIds: string[] = getReadAlertIds(),
  referenceDateStr: string = '2026-09-28'
): AcademicGoalAlert[] {
  const alerts: AcademicGoalAlert[] = [];
  const refDate = new Date(referenceDateStr);

  goals.forEach((goal) => {
    const santri = santriList.find((s) => s.id === goal.santriId) || {
      nama: 'Santri Pondok',
      id: goal.santriId,
    };

    const deadline = new Date(goal.targetDeadline);
    const daysToGoal = Math.ceil(
      (deadline.getTime() - refDate.getTime()) / (1000 * 3600 * 24)
    );

    // 1. Goal 100% Completed Alert
    if (goal.currentProgressPercentage === 100 || goal.status === 'Tercapai') {
      const alertId = `alert-comp-${goal.id}`;
      alerts.push({
        id: alertId,
        goalId: goal.id,
        santriId: goal.santriId,
        santriName: santri.nama,
        type: 'goal_completed',
        title: `🏆 Sasaran Belajar Tercapai Sempurna: ${goal.title}`,
        message: `Maa syaa Allah! Ananda ${santri.nama} telah menyelesaikan seluruh ${goal.milestones.length} tahapan pada sasaran '${goal.title}' dengan capaian 100%.`,
        urgency: 'celebration',
        goalTitle: goal.title,
        category: goal.category,
        deadlineDate: goal.targetDeadline,
        daysRemaining: daysToGoal,
        progressPercentage: goal.currentProgressPercentage,
        createdAt: goal.updatedAt || goal.createdAt,
        isRead: readAlertIds.includes(alertId),
      });
    }

    // 2. Goal Deadline Approaching Alert
    if (goal.currentProgressPercentage < 100 && goal.status !== 'Tercapai') {
      // If deadline is within 90 days or overdue
      if (daysToGoal <= 90) {
        const isOverdue = daysToGoal < 0;
        const alertId = `alert-goal-dl-${goal.id}-${isOverdue ? 'overdue' : 'approaching'}`;
        const urgency = isOverdue
          ? 'critical'
          : daysToGoal <= 21
          ? 'critical'
          : daysToGoal <= 60
          ? 'warning'
          : 'info';

        alerts.push({
          id: alertId,
          goalId: goal.id,
          santriId: goal.santriId,
          santriName: santri.nama,
          type: 'deadline_approaching',
          title: isOverdue
            ? `⚠️ Tenggat Sasaran Terlewati: ${goal.title}`
            : `⏳ Tenggat Sasaran Belajar Mendekat: ${goal.title}`,
          message: isOverdue
            ? `Sasaran '${goal.title}' ananda ${santri.nama} telah melewati batas waktu ${Math.abs(daysToGoal)} hari lalu (${goal.targetDeadline}). Capaian saat ini ${goal.currentProgressPercentage}%. Segera lakukan evaluasi akselerasi.`
            : `Tenggat akhir sasaran '${goal.title}' ananda ${santri.nama} tersisa ${daysToGoal} hari lagi (Target: ${goal.targetDeadline}). Capaian saat ini: ${goal.currentProgressPercentage}% (${goal.milestones.filter((m) => m.isCompleted).length} dari ${goal.milestones.length} tahapan).`,
          urgency,
          goalTitle: goal.title,
          category: goal.category,
          deadlineDate: goal.targetDeadline,
          daysRemaining: daysToGoal,
          progressPercentage: goal.currentProgressPercentage,
          createdAt: goal.updatedAt || goal.createdAt,
          isRead: readAlertIds.includes(alertId),
        });
      }
    }

    // 3. Milestones Reached / Achieved Alert
    goal.milestones.forEach((ms) => {
      if (ms.isCompleted) {
        const alertId = `alert-ms-done-${ms.id}`;
        alerts.push({
          id: alertId,
          goalId: goal.id,
          santriId: goal.santriId,
          santriName: santri.nama,
          type: 'milestone_reached',
          title: `🎉 Milestone Tercapai: ${ms.title}`,
          message: `Alhamdulillah! Tahapan '${ms.title}' berhasil diselesaikan oleh ${santri.nama} untuk sasaran '${goal.title}'${ms.completedAt ? ` (Selesai: ${ms.completedAt})` : ''}.${ms.notes ? ` Catatan: "${ms.notes}"` : ''}`,
          urgency: 'celebration',
          goalTitle: goal.title,
          milestoneTitle: ms.title,
          category: goal.category,
          deadlineDate: ms.targetDate,
          progressPercentage: goal.currentProgressPercentage,
          createdAt: ms.completedAt || goal.updatedAt,
          isRead: readAlertIds.includes(alertId),
        });
      } else {
        // 4. Milestone Deadline Approaching (Uncompleted)
        const msDate = new Date(ms.targetDate);
        const daysToMs = Math.ceil(
          (msDate.getTime() - refDate.getTime()) / (1000 * 3600 * 24)
        );

        if (daysToMs <= 45) {
          const isOverdue = daysToMs < 0;
          const alertId = `alert-ms-dl-${ms.id}`;
          const urgency = isOverdue
            ? 'critical'
            : daysToMs <= 14
            ? 'critical'
            : 'warning';

          alerts.push({
            id: alertId,
            goalId: goal.id,
            santriId: goal.santriId,
            santriName: santri.nama,
            type: 'milestone_deadline',
            title: isOverdue
              ? `⚠️ Tahapan Terlambat: ${ms.title}`
              : `⏰ Tenggat Tahapan Mendekat: ${ms.title}`,
            message: isOverdue
              ? `Tahapan '${ms.title}' pada sasaran '${goal.title}' telah melewati tenggat ${Math.abs(daysToMs)} hari lalu (${ms.targetDate}). Mohon jadwalkan setoran susulan.`
              : `Tahapan terdekat '${ms.title}' pada sasaran '${goal.title}' jatuh tempo dalam ${daysToMs} hari (${ms.targetDate}). Santri diharapkan mempersiapkan hafalan/materi uji.`,
            urgency,
            goalTitle: goal.title,
            milestoneTitle: ms.title,
            category: goal.category,
            deadlineDate: ms.targetDate,
            daysRemaining: daysToMs,
            progressPercentage: goal.currentProgressPercentage,
            createdAt: goal.updatedAt || goal.createdAt,
            isRead: readAlertIds.includes(alertId),
          });
        }
      }
    });

    // 5. AI Velocity Warning Alert
    if (
      goal.aiFeedback?.velocityAssessment === 'Needs Acceleration' ||
      goal.aiFeedback?.velocityAssessment === 'Critical Delay'
    ) {
      const alertId = `alert-vel-${goal.id}-${goal.aiFeedback.velocityAssessment}`;
      const isCritical = goal.aiFeedback.velocityAssessment === 'Critical Delay';

      alerts.push({
        id: alertId,
        goalId: goal.id,
        santriId: goal.santriId,
        santriName: santri.nama,
        type: 'velocity_warning',
        title: isCritical
          ? `🚨 Peringatan Laju Kritis AI: ${goal.title}`
          : `⚡ Akselerasi Sasaran Diperlukan: ${goal.title}`,
        message: `Sistem AI mendeteksi status laju '${goal.aiFeedback.velocityAssessment}' untuk ananda ${santri.nama}. ${goal.aiFeedback.suggestedActions[0] || 'Lakukan penyesuaian jam belajar bersama musyrif.'}`,
        urgency: isCritical ? 'critical' : 'warning',
        goalTitle: goal.title,
        category: goal.category,
        deadlineDate: goal.targetDeadline,
        daysRemaining: daysToGoal,
        progressPercentage: goal.currentProgressPercentage,
        createdAt: goal.updatedAt,
        isRead: readAlertIds.includes(alertId),
      });
    }
  });

  // Sort alerts: Unread first, then by urgency (critical > warning > celebration > info)
  const urgencyWeight = {
    critical: 4,
    warning: 3,
    celebration: 2,
    info: 1,
  };

  return alerts.sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (diff !== 0) return diff;
    return (b.daysRemaining ?? 999) - (a.daysRemaining ?? 999);
  });
}
