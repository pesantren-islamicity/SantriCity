/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  Language,
  SantriProfile,
  TahfidzEntry,
  NilaiMataPelajaran,
  PresensiHarian,
  CatatanDisiplin,
  RekamMedis,
  TagihanKeuangan,
  IzinKeluarPondok,
  PesanChat,
  BroadcastTelegram,
  AgendaPesantren,
  AIAnalisisKaffah,
  AcademicGoal,
} from './types/pesantren';
import {
  INITIAL_SANTRI_LIST,
  INITIAL_TAHFIDZ_ENTRIES,
  INITIAL_NILAI_MAPEL,
  INITIAL_PRESENSI_LIST,
  INITIAL_DISIPLIN_LIST,
  INITIAL_REKAM_MEDIS,
  INITIAL_TAGIHAN_LIST,
  INITIAL_IZIN_LIST,
  INITIAL_CHAT_MESSAGES,
  INITIAL_TELEGRAM_BROADCASTS,
  INITIAL_AGENDA_PESANTREN,
  INITIAL_AI_KAFFAH,
  INITIAL_ACADEMIC_GOALS,
} from './data/mockData';
import { loadFromLocal, saveToLocal } from './services/storageService';
import { analyzeSantriKaffah } from './services/geminiService';
import {
  generateAcademicGoalAlerts,
  getReadAlertIds,
  markAlertAsRead,
  markAllAlertsAsRead,
} from './services/goalNotificationService';
import { TopNav } from './components/TopNav';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardKaffah } from './components/DashboardKaffah';
import { TahfidzModule } from './components/TahfidzModule';
import { AkademikModule } from './components/AkademikModule';
import { AcademicGoalsModule } from './components/AcademicGoalsModule';
import { PresensiDisiplinModule } from './components/PresensiDisiplinModule';
import { PoskestrenModule } from './components/PoskestrenModule';
import { KeuanganSppModule } from './components/KeuanganSppModule';
import { PerizinanQrModule } from './components/PerizinanQrModule';
import { ChatBroadcastModule } from './components/ChatBroadcastModule';
import { KalenderModule } from './components/KalenderModule';
import { AIAnalisisKaffahModule } from './components/AIAnalisisKaffahModule';
import { AdminConsoleModule } from './components/AdminConsoleModule';
import { KaffahReportModal } from './components/KaffahReportModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationToastBanner } from './components/NotificationToastBanner';
import { PushNotificationSimulatorModal } from './components/PushNotificationSimulatorModal';

export default function App() {
  // Global State
  const [currentRole, setCurrentRole] = useState<UserRole>('wali');
  const [lang, setLang] = useState<Language>('id');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isPushSimulatorOpen, setIsPushSimulatorOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  // Santri & Data Collections
  const [santriList, setSantriList] = useState<SantriProfile[]>(() =>
    loadFromLocal('santriList', INITIAL_SANTRI_LIST)
  );
  const [activeSantriId, setActiveSantriId] = useState<string>(() =>
    loadFromLocal('activeSantriId', INITIAL_SANTRI_LIST[0].id)
  );

  const [tahfidzList, setTahfidzList] = useState<TahfidzEntry[]>(() =>
    loadFromLocal('tahfidzList', INITIAL_TAHFIDZ_ENTRIES)
  );
  const [nilaiList, setNilaiList] = useState<NilaiMataPelajaran[]>(() =>
    loadFromLocal('nilaiList', INITIAL_NILAI_MAPEL)
  );
  const [presensiList, setPresensiList] = useState<PresensiHarian[]>(() =>
    loadFromLocal('presensiList', INITIAL_PRESENSI_LIST)
  );
  const [disiplinList, setDisiplinList] = useState<CatatanDisiplin[]>(() =>
    loadFromLocal('disiplinList', INITIAL_DISIPLIN_LIST)
  );
  const [kesehatanList, setKesehatanList] = useState<RekamMedis[]>(() =>
    loadFromLocal('kesehatanList', INITIAL_REKAM_MEDIS)
  );
  const [tagihanList, setTagihanList] = useState<TagihanKeuangan[]>(() =>
    loadFromLocal('tagihanList', INITIAL_TAGIHAN_LIST)
  );
  const [izinList, setIzinList] = useState<IzinKeluarPondok[]>(() =>
    loadFromLocal('izinList', INITIAL_IZIN_LIST)
  );
  const [chatMessages, setChatMessages] = useState<PesanChat[]>(() =>
    loadFromLocal('chatMessages', INITIAL_CHAT_MESSAGES)
  );
  const [broadcasts, setBroadcasts] = useState<BroadcastTelegram[]>(() =>
    loadFromLocal('broadcasts', INITIAL_TELEGRAM_BROADCASTS)
  );
  const [agendas, setAgendas] = useState<AgendaPesantren[]>(() =>
    loadFromLocal('agendas', INITIAL_AGENDA_PESANTREN)
  );
  const [aiKaffahMap, setAiKaffahMap] = useState<Record<string, AIAnalisisKaffah>>(() =>
    loadFromLocal('aiKaffahMap', INITIAL_AI_KAFFAH)
  );
  const [academicGoals, setAcademicGoals] = useState<AcademicGoal[]>(() =>
    loadFromLocal('academicGoals', INITIAL_ACADEMIC_GOALS)
  );

  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState<number>(2);
  const [readGoalAlertIds, setReadGoalAlertIds] = useState<string[]>(() => getReadAlertIds());

  // Automatic Academic Goals Alerts
  const goalAlerts = useMemo(() => {
    return generateAcademicGoalAlerts(academicGoals, santriList, readGoalAlertIds);
  }, [academicGoals, santriList, readGoalAlertIds]);

  const unreadGoalAlertsCount = goalAlerts.filter((a) => !a.isRead).length;
  const totalUnreadNotifications = unreadBroadcastCount + unreadGoalAlertsCount;

  const handleMarkGoalAlertAsRead = (alertId: string) => {
    const updated = markAlertAsRead(alertId);
    setReadGoalAlertIds(updated);
  };

  const handleMarkAllGoalAlertsAsRead = () => {
    const allIds = goalAlerts.map((a) => a.id);
    const updated = markAllAlertsAsRead(allIds);
    setReadGoalAlertIds(updated);
  };

  // Active Santri calculation
  const activeSantri = santriList.find((s) => s.id === activeSantriId) || santriList[0];

  // Filtered by active santri
  const santriTahfidz = tahfidzList.filter((item) => item.santriId === activeSantri.id);
  const santriNilai = nilaiList.filter((item) => item.santriId === activeSantri.id);
  const santriPresensi = presensiList.filter((item) => item.santriId === activeSantri.id);
  const santriDisiplin = disiplinList.filter((item) => item.santriId === activeSantri.id);
  const santriKesehatan = kesehatanList.filter((item) => item.santriId === activeSantri.id);
  const santriTagihan = tagihanList.filter((item) => item.santriId === activeSantri.id);
  const santriIzin = izinList.filter((item) => item.santriId === activeSantri.id);
  const santriChat = chatMessages.filter((item) => item.santriId === activeSantri.id);

  const santriAiKaffah: AIAnalisisKaffah =
    aiKaffahMap[activeSantri.id] || INITIAL_AI_KAFFAH['snt-001'];

  // Save to LocalStorage effects
  useEffect(() => {
    saveToLocal('santriList', santriList);
    saveToLocal('activeSantriId', activeSantriId);
    saveToLocal('tahfidzList', tahfidzList);
    saveToLocal('nilaiList', nilaiList);
    saveToLocal('presensiList', presensiList);
    saveToLocal('disiplinList', disiplinList);
    saveToLocal('kesehatanList', kesehatanList);
    saveToLocal('tagihanList', tagihanList);
    saveToLocal('izinList', izinList);
    saveToLocal('chatMessages', chatMessages);
    saveToLocal('broadcasts', broadcasts);
    saveToLocal('agendas', agendas);
    saveToLocal('aiKaffahMap', aiKaffahMap);
    saveToLocal('academicGoals', academicGoals);
  }, [
    santriList,
    activeSantriId,
    tahfidzList,
    nilaiList,
    presensiList,
    disiplinList,
    kesehatanList,
    tagihanList,
    izinList,
    chatMessages,
    broadcasts,
    agendas,
    aiKaffahMap,
    academicGoals,
  ]);

  // Dark Mode root class syncing
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Arabic RTL alignment handling
  useEffect(() => {
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }, [lang]);

  // Network offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Simulation
  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  // Actions
  const handleAddTahfidz = (entry: Omit<TahfidzEntry, 'id'>) => {
    const newEntry: TahfidzEntry = {
      ...entry,
      id: `thf-${Date.now()}`,
    };
    setTahfidzList([newEntry, ...tahfidzList]);

    // Update santri capaianJuz if Ziyadah
    if (entry.tipe === 'Ziyadah') {
      const added = 0.2; // approx increment
      setSantriList((prev) =>
        prev.map((s) =>
          s.id === activeSantri.id
            ? { ...s, capaianJuz: Number(Math.min(s.targetJuz, s.capaianJuz + added).toFixed(1)) }
            : s
        )
      );
    }
  };

  const handleAddNilai = (entry: Omit<NilaiMataPelajaran, 'id'>) => {
    const newEntry: NilaiMataPelajaran = {
      ...entry,
      id: `nil-${Date.now()}`,
    };
    setNilaiList([newEntry, ...nilaiList]);
  };

  const handleAddAcademicGoal = (goal: Omit<AcademicGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: AcademicGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setAcademicGoals([newGoal, ...academicGoals]);
  };

  const handleUpdateAcademicGoal = (goal: AcademicGoal) => {
    setAcademicGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
  };

  const handleDeleteAcademicGoal = (goalId: string) => {
    setAcademicGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleAddPresensi = (entry: Omit<PresensiHarian, 'id'>) => {
    const newEntry: PresensiHarian = {
      ...entry,
      id: `prs-${Date.now()}`,
    };
    setPresensiList([newEntry, ...presensiList]);
  };

  const handleAddDisiplin = (entry: Omit<CatatanDisiplin, 'id'>) => {
    const newEntry: CatatanDisiplin = {
      ...entry,
      id: `dsp-${Date.now()}`,
    };
    setDisiplinList([newEntry, ...disiplinList]);
    setSantriList((prev) =>
      prev.map((s) =>
        s.id === activeSantri.id
          ? { ...s, poinDisiplin: Math.min(100, Math.max(0, s.poinDisiplin + entry.poin)) }
          : s
      )
    );
  };

  const handleAddRekamMedis = (entry: Omit<RekamMedis, 'id'>) => {
    const newEntry: RekamMedis = {
      ...entry,
      id: `med-${Date.now()}`,
    };
    setKesehatanList([newEntry, ...kesehatanList]);

    // Update status if Rawat Inap
    if (entry.statusPerawatan === 'Rawat Inap Poskestren') {
      setSantriList((prev) =>
        prev.map((s) => (s.id === activeSantri.id ? { ...s, status: 'Di Poskestren' } : s))
      );
    }
  };

  const handlePayInvoice = (invoiceId: string, metode: string) => {
    const now = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

    setTagihanList((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'Lunas',
              metodePembayaran: metode as any,
              tanggalBayar: now,
              nomorReferensi: `SETTLE-${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : inv
      )
    );
  };

  const handleAddInvoice = (inv: Omit<TagihanKeuangan, 'id'>) => {
    const newInv: TagihanKeuangan = {
      ...inv,
      id: `inv-${Date.now()}`,
    };
    setTagihanList([newInv, ...tagihanList]);
  };

  const handleAddIzin = (entry: Omit<IzinKeluarPondok, 'id'>) => {
    const newEntry: IzinKeluarPondok = {
      ...entry,
      id: `izn-${Date.now()}`,
    };
    setIzinList([newEntry, ...izinList]);
  };

  const handleUpdateIzinStatus = (
    izinId: string,
    status: IzinKeluarPondok['status'],
    note?: string
  ) => {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setIzinList((prev) =>
      prev.map((i) => {
        if (i.id !== izinId) return i;
        return {
          ...i,
          status,
          waktuAktualKeluar: status === 'Sedang Keluar' ? now : i.waktuAktualKeluar,
          waktuAktualKembali: status === 'Selesai Kembali' ? now : i.waktuAktualKembali,
          catatanPetugasGerbang: note || i.catatanPetugasGerbang,
        };
      })
    );

    // Update santri status
    if (status === 'Sedang Keluar') {
      setSantriList((prev) =>
        prev.map((s) => (s.id === activeSantri.id ? { ...s, status: 'Izin Pulang' } : s))
      );
    } else if (status === 'Selesai Kembali') {
      setSantriList((prev) =>
        prev.map((s) => (s.id === activeSantri.id ? { ...s, status: 'Aktif' } : s))
      );
    }
  };

  const handleSendMessage = (pesan: string) => {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const senderName =
      currentRole === 'wali'
        ? activeSantri.waliNama
        : currentRole === 'ustaz'
        ? 'Ust. Ahmad Fauzan, Al-Hafidz'
        : `${currentRole.toUpperCase()} Officer`;

    const newMsg: PesanChat = {
      id: `cht-${Date.now()}`,
      santriId: activeSantri.id,
      pengirimRole: currentRole,
      pengirimNama: senderName,
      penerimaNama: currentRole === 'wali' ? 'Ust. Ahmad Fauzan' : activeSantri.waliNama,
      pesan,
      timestamp: now,
      dibaca: true,
    };
    setChatMessages([...chatMessages, newMsg]);
  };

  const handleAddBroadcast = (bc: Omit<BroadcastTelegram, 'id'>) => {
    const newBc: BroadcastTelegram = {
      ...bc,
      id: `bc-${Date.now()}`,
    };
    setBroadcasts([newBc, ...broadcasts]);
    setUnreadBroadcastCount((prev) => prev + 1);
  };

  const handleAddAgenda = (ag: Omit<AgendaPesantren, 'id'>) => {
    const newAg: AgendaPesantren = {
      ...ag,
      id: `agd-${Date.now()}`,
    };
    setAgendas([newAg, ...agendas]);
  };

  const handleRunAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    try {
      const result = await analyzeSantriKaffah(
        activeSantri,
        santriTahfidz,
        santriNilai,
        santriPresensi,
        santriDisiplin,
        santriKesehatan
      );
      setAiKaffahMap((prev) => ({
        ...prev,
        [activeSantri.id]: result,
      }));
    } catch (err) {
      console.error('Error running AI Kaffah analysis:', err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleRestoreBackup = (restored: any) => {
    if (restored.santriList) setSantriList(restored.santriList);
    if (restored.tahfidzList) setTahfidzList(restored.tahfidzList);
    if (restored.nilaiList) setNilaiList(restored.nilaiList);
    if (restored.presensiList) setPresensiList(restored.presensiList);
    if (restored.disiplinList) setDisiplinList(restored.disiplinList);
    if (restored.kesehatanList) setKesehatanList(restored.kesehatanList);
    if (restored.tagihanList) setTagihanList(restored.tagihanList);
    if (restored.izinList) setIzinList(restored.izinList);
    if (restored.chatMessages) setChatMessages(restored.chatMessages);
    if (restored.broadcasts) setBroadcasts(restored.broadcasts);
    if (restored.agendas) setAgendas(restored.agendas);
    if (restored.aiKaffahMap) setAiKaffahMap(restored.aiKaffahMap);
    if (restored.academicGoals) setAcademicGoals(restored.academicGoals);
  };

  const fullDatabaseState = {
    santriList,
    activeSantriId,
    tahfidzList,
    nilaiList,
    presensiList,
    disiplinList,
    kesehatanList,
    tagihanList,
    izinList,
    chatMessages,
    broadcasts,
    agendas,
    aiKaffahMap,
    academicGoals,
    exportedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar with 3-Zone contract */}
      <TopNav
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        lang={lang}
        onLangChange={setLang}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        activeSantri={activeSantri}
        unreadBroadcastCount={totalUnreadNotifications}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onManualSync={handleManualSync}
        isSyncing={isSyncing}
        onOpenPushSimulator={() => setIsPushSimulatorOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          lang={lang}
          santriList={santriList}
          activeSantri={activeSantri}
          onSelectSantri={(s) => setActiveSantriId(s.id)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <DashboardKaffah
              santri={activeSantri}
              tahfidzList={santriTahfidz}
              nilaiList={santriNilai}
              presensiList={santriPresensi}
              kesehatanList={santriKesehatan}
              tagihanList={santriTagihan}
              izinList={santriIzin}
              broadcasts={broadcasts}
              aiKaffah={santriAiKaffah}
              lang={lang}
              currentRole={currentRole}
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onRunAiAnalysis={handleRunAiAnalysis}
              isAiAnalyzing={isAiAnalyzing}
              onOpenPushSimulator={() => setIsPushSimulatorOpen(true)}
            />
          )}

          {activeTab === 'tahfidz' && (
            <TahfidzModule
              santri={activeSantri}
              tahfidzList={santriTahfidz}
              onAddEntry={handleAddTahfidz}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'akademik' && (
            <AkademikModule
              santri={activeSantri}
              nilaiList={santriNilai}
              presensiList={santriPresensi}
              onAddNilai={handleAddNilai}
              currentRole={currentRole}
              lang={lang}
              academicGoals={academicGoals}
            />
          )}

          {activeTab === 'target-akademik' && (
            <AcademicGoalsModule
              santri={activeSantri}
              goals={academicGoals}
              nilaiList={santriNilai}
              tahfidzList={santriTahfidz}
              currentRole={currentRole}
              lang={lang}
              onAddGoal={handleAddAcademicGoal}
              onUpdateGoal={handleUpdateAcademicGoal}
              onDeleteGoal={handleDeleteAcademicGoal}
            />
          )}

          {activeTab === 'presensi' && (
            <PresensiDisiplinModule
              santri={activeSantri}
              presensiList={santriPresensi}
              disiplinList={santriDisiplin}
              onAddPresensi={handleAddPresensi}
              onAddDisiplin={handleAddDisiplin}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'poskestren' && (
            <PoskestrenModule
              santri={activeSantri}
              kesehatanList={santriKesehatan}
              onAddRekamMedis={handleAddRekamMedis}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'keuangan' && (
            <KeuanganSppModule
              santri={activeSantri}
              tagihanList={santriTagihan}
              onPayInvoice={handlePayInvoice}
              onAddInvoice={handleAddInvoice}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'perizinan' && (
            <PerizinanQrModule
              santri={activeSantri}
              izinList={santriIzin}
              onAddIzin={handleAddIzin}
              onUpdateIzinStatus={handleUpdateIzinStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'chat' && (
            <ChatBroadcastModule
              santri={activeSantri}
              chatMessages={santriChat}
              broadcasts={broadcasts}
              onSendMessage={handleSendMessage}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'kalender' && (
            <KalenderModule
              agendas={agendas}
              onAddAgenda={handleAddAgenda}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'ai' && (
            <AIAnalisisKaffahModule
              santri={activeSantri}
              aiKaffah={santriAiKaffah}
              onRunAiAnalysis={handleRunAiAnalysis}
              isAiAnalyzing={isAiAnalyzing}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'admin' && (
            <AdminConsoleModule
              santriList={santriList}
              broadcasts={broadcasts}
              onAddBroadcast={handleAddBroadcast}
              fullDatabaseState={fullDatabaseState}
              onRestoreBackup={handleRestoreBackup}
              isOnline={isOnline}
              onManualSync={handleManualSync}
              isSyncing={isSyncing}
              currentRole={currentRole}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Printable Kaffah Progress Report Modal */}
      <KaffahReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        santri={activeSantri}
        tahfidzList={santriTahfidz}
        nilaiList={santriNilai}
        presensiList={santriPresensi}
        kesehatanList={santriKesehatan}
        aiKaffah={santriAiKaffah}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        broadcasts={broadcasts}
        goalAlerts={goalAlerts}
        onMarkAllAsRead={() => setUnreadBroadcastCount(0)}
        onMarkGoalAlertAsRead={handleMarkGoalAlertAsRead}
        onMarkAllGoalAlertsAsRead={handleMarkAllGoalAlertsAsRead}
        onNavigateToGoals={() => setActiveTab('target-akademik')}
        onOpenPushSimulator={() => setIsPushSimulatorOpen(true)}
      />

      {/* Floating Notification Toast Banner (triggers on browser custom event even if drawer is closed) */}
      <NotificationToastBanner
        onOpenDrawer={() => setIsNotificationOpen(true)}
        onNavigateToGoals={() => setActiveTab('target-akademik')}
      />

      {/* Push Notification Simulator Modal */}
      <PushNotificationSimulatorModal
        isOpen={isPushSimulatorOpen}
        onClose={() => setIsPushSimulatorOpen(false)}
        activeSantri={activeSantri}
        goals={academicGoals}
        onNavigateToGoals={() => {
          setIsPushSimulatorOpen(false);
          setActiveTab('target-akademik');
        }}
      />
    </div>
  );
}
