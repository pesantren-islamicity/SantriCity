/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useMemo, useRef } from 'react';
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
  SmartFacilityZone,
  FacilityBooking,
  ScholarshipProgram,
  ScholarshipVoucher,
  ScholarshipApplication,
  ShariaBusinessClinicCase,
  ShariaConsultationSession,
  HajiUmrohCourse,
  HajiUmrohPracticumSession,
  UniversityProgram,
  UniversityAdmissionApplication,
  ELibraryBook,
  ELibraryLoan,
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
  INITIAL_SMART_FACILITIES,
  INITIAL_FACILITY_BOOKINGS,
  INITIAL_SCHOLARSHIP_PROGRAMS,
  INITIAL_SCHOLARSHIP_VOUCHERS,
  INITIAL_SCHOLARSHIP_APPLICATIONS,
  INITIAL_SHARIA_BUSINESS_CASES,
  INITIAL_SHARIA_CONSULTATIONS,
  INITIAL_HAJI_UMROH_COURSES,
  INITIAL_HAJI_UMROH_PRACTICUMS,
  INITIAL_UNIVERSITY_PROGRAMS,
  INITIAL_UNIVERSITY_APPLICATIONS,
  INITIAL_ELIBRARY_BOOKS,
  INITIAL_ELIBRARY_LOANS,
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
import { StartupCenterModule } from './components/StartupCenterModule';
import { BeasiswaVoucherModule } from './components/BeasiswaVoucherModule';
import { KlinikBisnisSyariahModule } from './components/KlinikBisnisSyariahModule';
import { ManajemenHajiUmrohModule } from './components/ManajemenHajiUmrohModule';
import { UniversitasIslamicityModule } from './components/UniversitasIslamicityModule';
import { PerpustakaanDigitalModule } from './components/PerpustakaanDigitalModule';
import { AIAnalisisKaffahModule } from './components/AIAnalisisKaffahModule';
import { AdminConsoleModule } from './components/AdminConsoleModule';
import { KaffahReportModal } from './components/KaffahReportModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationToastBanner } from './components/NotificationToastBanner';
import { PushNotificationSimulatorModal } from './components/PushNotificationSimulatorModal';

interface ModuleErrorBoundaryProps {
  resetKey: string;
  onBackToOverview: () => void;
  children: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kendala saat memuat modul.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Module render error:', error, info);
  }

  componentDidUpdate(prevProps: ModuleErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">
            Tampilan Modul Perlu Dimuat Ulang
          </h3>
          <p className="text-neutral-400 leading-relaxed">
            {this.state.errorMessage}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-3.5 py-2 rounded-lg font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
            >
              Muat Ulang Modul
            </button>
            <button
              type="button"
              onClick={this.props.onBackToOverview}
              className="px-3.5 py-2 rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function sanitizeFacilities(raw: unknown): SmartFacilityZone[] {
  if (!Array.isArray(raw) || raw.length === 0) return INITIAL_SMART_FACILITIES;
  const valid = raw.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as SmartFacilityZone).id === 'string' &&
      typeof (item as SmartFacilityZone).nama === 'string' &&
      typeof (item as SmartFacilityZone).kodeRuang === 'string' &&
      typeof (item as SmartFacilityZone).deskripsi === 'string' &&
      typeof (item as SmartFacilityZone).kapasitasKursi === 'number' &&
      Array.isArray((item as SmartFacilityZone).infrastrukturUnggulan) &&
      (item as SmartFacilityZone).lingkunganCerdas &&
      typeof (item as SmartFacilityZone).lingkunganCerdas.suhuCelsius === 'number'
  );
  return valid ? (raw as SmartFacilityZone[]) : INITIAL_SMART_FACILITIES;
}

function sanitizeBookings(raw: unknown): FacilityBooking[] {
  if (!Array.isArray(raw)) return INITIAL_FACILITY_BOOKINGS;
  return raw.filter(
    (item): item is FacilityBooking =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as FacilityBooking).id === 'string' &&
          typeof (item as FacilityBooking).santriId === 'string' &&
          typeof (item as FacilityBooking).facilityNama === 'string'
      )
  );
}

function sanitizeShariaCases(raw: unknown): ShariaBusinessClinicCase[] {
  if (!Array.isArray(raw) || raw.length === 0) return INITIAL_SHARIA_BUSINESS_CASES;
  const valid = raw.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as ShariaBusinessClinicCase).id === 'string' &&
      typeof (item as ShariaBusinessClinicCase).namaUsaha === 'string' &&
      typeof (item as ShariaBusinessClinicCase).akadUtama === 'string' &&
      typeof (item as ShariaBusinessClinicCase).statusSertifikasiHalal === 'string' &&
      typeof (item as ShariaBusinessClinicCase).kendalaUtama === 'string'
  );
  return valid ? (raw as ShariaBusinessClinicCase[]) : INITIAL_SHARIA_BUSINESS_CASES;
}

function sanitizeShariaConsultations(raw: unknown): ShariaConsultationSession[] {
  if (!Array.isArray(raw)) return INITIAL_SHARIA_CONSULTATIONS;
  return raw.filter(
    (item): item is ShariaConsultationSession =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as ShariaConsultationSession).id === 'string' &&
          typeof (item as ShariaConsultationSession).namaUsaha === 'string'
      )
  );
}

function sanitizeHajiUmrohCourses(raw: unknown): HajiUmrohCourse[] {
  if (!Array.isArray(raw) || raw.length === 0) return INITIAL_HAJI_UMROH_COURSES;
  const valid = raw.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as HajiUmrohCourse).id === 'string' &&
      typeof (item as HajiUmrohCourse).namaMk === 'string' &&
      typeof (item as HajiUmrohCourse).sks === 'number'
  );
  return valid ? (raw as HajiUmrohCourse[]) : INITIAL_HAJI_UMROH_COURSES;
}

function sanitizeHajiUmrohPracticums(raw: unknown): HajiUmrohPracticumSession[] {
  if (!Array.isArray(raw)) return INITIAL_HAJI_UMROH_PRACTICUMS;
  return raw.filter(
    (item): item is HajiUmrohPracticumSession =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as HajiUmrohPracticumSession).id === 'string' &&
          typeof (item as HajiUmrohPracticumSession).judulPraktikum === 'string'
      )
  );
}

function sanitizeUniversityApplications(
  raw: unknown
): UniversityAdmissionApplication[] {
  if (!Array.isArray(raw)) return INITIAL_UNIVERSITY_APPLICATIONS;
  return raw.filter(
    (item): item is UniversityAdmissionApplication =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as UniversityAdmissionApplication).id === 'string' &&
          typeof (item as UniversityAdmissionApplication).namaProdi === 'string' &&
          typeof (item as UniversityAdmissionApplication).santriNama === 'string'
      )
  );
}

function sanitizeELibraryLoans(raw: unknown): ELibraryLoan[] {
  if (!Array.isArray(raw)) return INITIAL_ELIBRARY_LOANS;
  return raw.filter(
    (item): item is ELibraryLoan =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as ELibraryLoan).id === 'string' &&
          typeof (item as ELibraryLoan).bookId === 'string' &&
          typeof (item as ELibraryLoan).judulBuku === 'string' &&
          typeof (item as ELibraryLoan).qrPayload === 'string'
      )
  );
}

function loadArrayFromLocal<T>(
  key: string,
  fallback: T[],
  requireNonEmpty = false
): T[] {
  const loaded = loadFromLocal<unknown>(key, fallback);
  if (!Array.isArray(loaded)) return fallback;
  if (requireNonEmpty && loaded.length === 0) return fallback;
  return loaded as T[];
}

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Santri & Data Collections
  const [santriList, setSantriList] = useState<SantriProfile[]>(() =>
    loadArrayFromLocal('santriList', INITIAL_SANTRI_LIST, true)
  );
  const [activeSantriId, setActiveSantriId] = useState<string>(() =>
    loadFromLocal('activeSantriId', INITIAL_SANTRI_LIST[0].id)
  );

  const [tahfidzList, setTahfidzList] = useState<TahfidzEntry[]>(() =>
    loadArrayFromLocal('tahfidzList', INITIAL_TAHFIDZ_ENTRIES)
  );
  const [nilaiList, setNilaiList] = useState<NilaiMataPelajaran[]>(() =>
    loadArrayFromLocal('nilaiList', INITIAL_NILAI_MAPEL)
  );
  const [presensiList, setPresensiList] = useState<PresensiHarian[]>(() =>
    loadArrayFromLocal('presensiList', INITIAL_PRESENSI_LIST)
  );
  const [disiplinList, setDisiplinList] = useState<CatatanDisiplin[]>(() =>
    loadArrayFromLocal('disiplinList', INITIAL_DISIPLIN_LIST)
  );
  const [kesehatanList, setKesehatanList] = useState<RekamMedis[]>(() =>
    loadArrayFromLocal('kesehatanList', INITIAL_REKAM_MEDIS)
  );
  const [tagihanList, setTagihanList] = useState<TagihanKeuangan[]>(() =>
    loadArrayFromLocal('tagihanList', INITIAL_TAGIHAN_LIST)
  );
  const [izinList, setIzinList] = useState<IzinKeluarPondok[]>(() =>
    loadArrayFromLocal('izinList', INITIAL_IZIN_LIST)
  );
  const [chatMessages, setChatMessages] = useState<PesanChat[]>(() =>
    loadArrayFromLocal('chatMessages', INITIAL_CHAT_MESSAGES)
  );
  const [broadcasts, setBroadcasts] = useState<BroadcastTelegram[]>(() =>
    loadArrayFromLocal('broadcasts', INITIAL_TELEGRAM_BROADCASTS)
  );
  const [agendas, setAgendas] = useState<AgendaPesantren[]>(() =>
    loadArrayFromLocal('agendas', INITIAL_AGENDA_PESANTREN)
  );
  const [aiKaffahMap, setAiKaffahMap] = useState<Record<string, AIAnalisisKaffah>>(() => {
    const loaded = loadFromLocal<unknown>('aiKaffahMap', INITIAL_AI_KAFFAH);
    return loaded && typeof loaded === 'object' && !Array.isArray(loaded)
      ? (loaded as Record<string, AIAnalisisKaffah>)
      : INITIAL_AI_KAFFAH;
  });
  const [academicGoals, setAcademicGoals] = useState<AcademicGoal[]>(() =>
    loadArrayFromLocal('academicGoals', INITIAL_ACADEMIC_GOALS)
  );
  const [smartFacilities, setSmartFacilities] = useState<SmartFacilityZone[]>(() =>
    sanitizeFacilities(loadFromLocal<unknown>('smartFacilities', INITIAL_SMART_FACILITIES))
  );
  const [facilityBookings, setFacilityBookings] = useState<FacilityBooking[]>(() =>
    sanitizeBookings(loadFromLocal<unknown>('facilityBookings', INITIAL_FACILITY_BOOKINGS))
  );
  const [scholarshipPrograms] = useState<ScholarshipProgram[]>(
    INITIAL_SCHOLARSHIP_PROGRAMS
  );
  const [scholarshipVouchers, setScholarshipVouchers] = useState<
    ScholarshipVoucher[]
  >(() => loadArrayFromLocal('scholarshipVouchers', INITIAL_SCHOLARSHIP_VOUCHERS));
  const [scholarshipApplications, setScholarshipApplications] = useState<
    ScholarshipApplication[]
  >(() =>
    loadArrayFromLocal('scholarshipApplications', INITIAL_SCHOLARSHIP_APPLICATIONS)
  );
  const [shariaBusinessCases, setShariaBusinessCases] = useState<
    ShariaBusinessClinicCase[]
  >(() =>
    sanitizeShariaCases(
      loadFromLocal<unknown>('shariaBusinessCases', INITIAL_SHARIA_BUSINESS_CASES)
    )
  );
  const [shariaConsultations, setShariaConsultations] = useState<
    ShariaConsultationSession[]
  >(() =>
    sanitizeShariaConsultations(
      loadFromLocal<unknown>('shariaConsultations', INITIAL_SHARIA_CONSULTATIONS)
    )
  );
  const [hajiUmrohCourses, setHajiUmrohCourses] = useState<HajiUmrohCourse[]>(
    () =>
      sanitizeHajiUmrohCourses(
        loadFromLocal<unknown>('hajiUmrohCourses', INITIAL_HAJI_UMROH_COURSES)
      )
  );
  const [hajiUmrohPracticums, setHajiUmrohPracticums] = useState<
    HajiUmrohPracticumSession[]
  >(() =>
    sanitizeHajiUmrohPracticums(
      loadFromLocal<unknown>(
        'hajiUmrohPracticums',
        INITIAL_HAJI_UMROH_PRACTICUMS
      )
    )
  );
  const [universityPrograms] = useState<UniversityProgram[]>(
    INITIAL_UNIVERSITY_PROGRAMS
  );
  const [universityApplications, setUniversityApplications] = useState<
    UniversityAdmissionApplication[]
  >(() =>
    sanitizeUniversityApplications(
      loadFromLocal<unknown>(
        'universityApplications',
        INITIAL_UNIVERSITY_APPLICATIONS
      )
    )
  );
  const [elibraryBooks] = useState<ELibraryBook[]>(INITIAL_ELIBRARY_BOOKS);
  const [elibraryLoans, setElibraryLoans] = useState<ELibraryLoan[]>(() =>
    sanitizeELibraryLoans(
      loadFromLocal<unknown>('elibraryLoans', INITIAL_ELIBRARY_LOANS)
    )
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
  const activeSantri =
    santriList.find((s) => s.id === activeSantriId) ||
    santriList[0] ||
    INITIAL_SANTRI_LIST[0];

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
    saveToLocal('smartFacilities', smartFacilities);
    saveToLocal('facilityBookings', facilityBookings);
    saveToLocal('scholarshipVouchers', scholarshipVouchers);
    saveToLocal('scholarshipApplications', scholarshipApplications);
    saveToLocal('shariaBusinessCases', shariaBusinessCases);
    saveToLocal('shariaConsultations', shariaConsultations);
    saveToLocal('hajiUmrohCourses', hajiUmrohCourses);
    saveToLocal('hajiUmrohPracticums', hajiUmrohPracticums);
    saveToLocal('universityApplications', universityApplications);
    saveToLocal('elibraryLoans', elibraryLoans);
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
    smartFacilities,
    facilityBookings,
    scholarshipVouchers,
    scholarshipApplications,
    shariaBusinessCases,
    shariaConsultations,
    hajiUmrohCourses,
    hajiUmrohPracticums,
    universityApplications,
    elibraryLoans,
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

  // Reset viewport & main container scroll position whenever activeTab changes (fixes mobile blank screen after deep scroll)
  const mainRef = useRef<HTMLElement | null>(null);

  const scrollToTopOfPage = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    if (typeof document !== 'undefined') {
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  };

  useEffect(() => {
    scrollToTopOfPage();
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(() => {
        scrollToTopOfPage();
      });
      return () => window.cancelAnimationFrame(rafId);
    }
  }, [activeTab]);

  const handleNavigateTab = (nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    setIsMobileMenuOpen(false);
    scrollToTopOfPage();
  };

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

  const handleUpdateTahfidz = (updatedEntry: TahfidzEntry) => {
    setTahfidzList((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    );
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

  const handleUpdateFacility = (updated: SmartFacilityZone) => {
    setSmartFacilities((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleAddBooking = (
    booking: Omit<FacilityBooking, 'id' | 'kodeAksesQr'>
  ) => {
    const shortName = booking.santriNama.split(' ')[0].toUpperCase();
    const newBooking: FacilityBooking = {
      ...booking,
      id: `bk-${Date.now()}`,
      kodeAksesQr: `SC-PASS-${new Date().getFullYear()}-${shortName}-${Math.floor(
        100 + Math.random() * 900
      )}`,
    };
    setFacilityBookings((prev) => [newBooking, ...prev]);
  };

  const handleUpdateBookingStatus = (
    bookingId: string,
    status: FacilityBooking['status']
  ) => {
    setFacilityBookings((prev) =>
      prev.map((item) => (item.id === bookingId ? { ...item, status } : item))
    );
  };

  const handleClaimVoucher = (voucherId: string) => {
    setScholarshipVouchers((prev) =>
      prev.map((v) =>
        v.id === voucherId ? { ...v, status: 'Sudah Diklaim' } : v
      )
    );
  };

  const handleIssueVoucher = (
    voucher: Omit<ScholarshipVoucher, 'id' | 'kodeVoucher'>
  ) => {
    const newVoucher: ScholarshipVoucher = {
      ...voucher,
      id: `vcr-${Date.now()}`,
      kodeVoucher: `VCR-SC-${Math.floor(100000 + Math.random() * 900000)}`,
    };
    setScholarshipVouchers((prev) => [newVoucher, ...prev]);
  };

  const handleSubmitScholarshipApp = (
    application: Omit<ScholarshipApplication, 'id'>
  ) => {
    const newApp: ScholarshipApplication = {
      ...application,
      id: `app-${Date.now()}`,
    };
    setScholarshipApplications((prev) => [newApp, ...prev]);
  };

  const handleUpdateScholarshipAppStatus = (
    applicationId: string,
    status: ScholarshipApplication['status']
  ) => {
    setScholarshipApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
    );
  };

  const handleAddShariaCase = (
    newCase: Omit<ShariaBusinessClinicCase, 'id'>
  ) => {
    const created: ShariaBusinessClinicCase = {
      ...newCase,
      id: `biz-${Date.now()}`,
    };
    setShariaBusinessCases((prev) => [created, ...prev]);
  };

  const handleAddShariaConsultation = (
    session: Omit<ShariaConsultationSession, 'id'>
  ) => {
    const created: ShariaConsultationSession = {
      ...session,
      id: `shc-${Date.now()}`,
    };
    setShariaConsultations((prev) => [created, ...prev]);
  };

  const handleUpdateShariaConsultationStatus = (
    sessionId: string,
    status: ShariaConsultationSession['status']
  ) => {
    setShariaConsultations((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status } : s))
    );
  };

  const handleUpdateHajiCourseStatus = (
    courseId: string,
    status: HajiUmrohCourse['status']
  ) => {
    setHajiUmrohCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status } : c))
    );
  };

  const handleAddHajiPracticum = (
    session: Omit<HajiUmrohPracticumSession, 'id'>
  ) => {
    const created: HajiUmrohPracticumSession = {
      ...session,
      id: `hup-${Date.now()}`,
    };
    setHajiUmrohPracticums((prev) => [created, ...prev]);
  };

  const handleUpdateHajiPracticumStatus = (
    sessionId: string,
    status: HajiUmrohPracticumSession['status']
  ) => {
    setHajiUmrohPracticums((prev) =>
      prev.map((p) => (p.id === sessionId ? { ...p, status } : p))
    );
  };

  const handleAddUniversityApp = (
    app: Omit<UniversityAdmissionApplication, 'id'>
  ) => {
    const created: UniversityAdmissionApplication = {
      ...app,
      id: `pmb-${Date.now()}`,
    };
    setUniversityApplications((prev) => [created, ...prev]);
  };

  const handleUpdateUniversityAppStatus = (
    appId: string,
    status: UniversityAdmissionApplication['status']
  ) => {
    setUniversityApplications((prev) =>
      prev.map((item) => (item.id === appId ? { ...item, status } : item))
    );
  };

  const handleBorrowELibraryBook = (loan: Omit<ELibraryLoan, 'id'>) => {
    const created: ELibraryLoan = {
      ...loan,
      id: `loan-${Date.now()}`,
    };
    setElibraryLoans((prev) => [created, ...prev]);
  };

  const handleUpdateELibraryLoanStatus = (
    loanId: string,
    status: ELibraryLoan['status'],
    note?: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    setElibraryLoans((prev) =>
      prev.map((loan) =>
        loan.id === loanId
          ? {
              ...loan,
              status,
              tanggalKembali: status === 'Dikembalikan' ? today : loan.tanggalKembali,
              catatanPetugas: note || loan.catatanPetugas,
            }
          : loan
      )
    );
  };

  const handleExtendELibraryLoan = (loanId: string, extraDays = 7) => {
    setElibraryLoans((prev) =>
      prev.map((loan) => {
        if (loan.id !== loanId) return loan;
        const base = new Date(loan.tanggalJatuhTempo);
        const validBase = Number.isNaN(base.getTime()) ? new Date() : base;
        validBase.setDate(validBase.getDate() + extraDays);
        return {
          ...loan,
          tanggalJatuhTempo: validBase.toISOString().slice(0, 10),
          catatanPetugas: `Diperpanjang +${extraDays} hari via Portal SantriCity.`,
        };
      })
    );
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
    if (Array.isArray(restored.santriList) && restored.santriList.length > 0) setSantriList(restored.santriList);
    if (Array.isArray(restored.tahfidzList)) setTahfidzList(restored.tahfidzList);
    if (Array.isArray(restored.nilaiList)) setNilaiList(restored.nilaiList);
    if (Array.isArray(restored.presensiList)) setPresensiList(restored.presensiList);
    if (Array.isArray(restored.disiplinList)) setDisiplinList(restored.disiplinList);
    if (Array.isArray(restored.kesehatanList)) setKesehatanList(restored.kesehatanList);
    if (Array.isArray(restored.tagihanList)) setTagihanList(restored.tagihanList);
    if (Array.isArray(restored.izinList)) setIzinList(restored.izinList);
    if (Array.isArray(restored.chatMessages)) setChatMessages(restored.chatMessages);
    if (Array.isArray(restored.broadcasts)) setBroadcasts(restored.broadcasts);
    if (Array.isArray(restored.agendas)) setAgendas(restored.agendas);
    if (restored.aiKaffahMap && typeof restored.aiKaffahMap === 'object') setAiKaffahMap(restored.aiKaffahMap);
    if (Array.isArray(restored.academicGoals)) setAcademicGoals(restored.academicGoals);
    if (restored.smartFacilities) setSmartFacilities(sanitizeFacilities(restored.smartFacilities));
    if (restored.facilityBookings) setFacilityBookings(sanitizeBookings(restored.facilityBookings));
    if (Array.isArray(restored.scholarshipVouchers)) setScholarshipVouchers(restored.scholarshipVouchers);
    if (Array.isArray(restored.scholarshipApplications)) setScholarshipApplications(restored.scholarshipApplications);
    if (restored.shariaBusinessCases) setShariaBusinessCases(sanitizeShariaCases(restored.shariaBusinessCases));
    if (restored.shariaConsultations) setShariaConsultations(sanitizeShariaConsultations(restored.shariaConsultations));
    if (restored.hajiUmrohCourses) setHajiUmrohCourses(sanitizeHajiUmrohCourses(restored.hajiUmrohCourses));
    if (restored.hajiUmrohPracticums) setHajiUmrohPracticums(sanitizeHajiUmrohPracticums(restored.hajiUmrohPracticums));
    if (restored.universityApplications) setUniversityApplications(sanitizeUniversityApplications(restored.universityApplications));
    if (restored.elibraryLoans) setElibraryLoans(sanitizeELibraryLoans(restored.elibraryLoans));
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
    smartFacilities,
    facilityBookings,
    scholarshipVouchers,
    scholarshipApplications,
    shariaBusinessCases,
    shariaConsultations,
    hajiUmrohCourses,
    hajiUmrohPracticums,
    universityApplications,
    elibraryLoans,
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
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleNavigateTab}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          lang={lang}
          santriList={santriList}
          activeSantri={activeSantri}
          onSelectSantri={(s) => setActiveSantriId(s.id)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main
          ref={mainRef}
          className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 overflow-x-hidden"
        >
          <ModuleErrorBoundary
            resetKey={`${activeTab}-${activeSantri.id}`}
            onBackToOverview={() => handleNavigateTab('overview')}
          >
          {activeTab === 'overview' && (
            <DashboardKaffah
              santri={activeSantri}
              allSantriList={santriList}
              allTahfidzList={tahfidzList}
              tahfidzList={santriTahfidz}
              nilaiList={santriNilai}
              presensiList={santriPresensi}
              kesehatanList={santriKesehatan}
              tagihanList={santriTagihan}
              izinList={santriIzin}
              broadcasts={broadcasts}
              aiKaffah={santriAiKaffah}
              academicGoals={academicGoals}
              lang={lang}
              currentRole={currentRole}
              onNavigateTab={(tab) => handleNavigateTab(tab as ActiveTab)}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onRunAiAnalysis={handleRunAiAnalysis}
              isAiAnalyzing={isAiAnalyzing}
              onOpenPushSimulator={() => setIsPushSimulatorOpen(true)}
              onSelectSantri={(s) => setActiveSantriId(s.id)}
            />
          )}

          {activeTab === 'tahfidz' && (
            <TahfidzModule
              santri={activeSantri}
              tahfidzList={santriTahfidz}
              onAddEntry={handleAddTahfidz}
              onUpdateEntry={handleUpdateTahfidz}
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

          {activeTab === 'startup-center' && (
            <StartupCenterModule
              santri={activeSantri}
              facilities={smartFacilities}
              bookings={facilityBookings}
              onUpdateFacility={handleUpdateFacility}
              onAddBooking={handleAddBooking}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'beasiswa' && (
            <BeasiswaVoucherModule
              santri={activeSantri}
              nilaiList={santriNilai}
              programs={scholarshipPrograms}
              vouchers={scholarshipVouchers}
              applications={scholarshipApplications}
              onClaimVoucher={handleClaimVoucher}
              onIssueVoucher={handleIssueVoucher}
              onSubmitApplication={handleSubmitScholarshipApp}
              onUpdateApplicationStatus={handleUpdateScholarshipAppStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'klinik-syariah' && (
            <KlinikBisnisSyariahModule
              santri={activeSantri}
              cases={shariaBusinessCases}
              consultations={shariaConsultations}
              onAddCase={handleAddShariaCase}
              onAddConsultation={handleAddShariaConsultation}
              onUpdateConsultationStatus={handleUpdateShariaConsultationStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'haji-umroh' && (
            <ManajemenHajiUmrohModule
              santri={activeSantri}
              courses={hajiUmrohCourses}
              practicums={hajiUmrohPracticums}
              onUpdateCourseStatus={handleUpdateHajiCourseStatus}
              onAddPracticum={handleAddHajiPracticum}
              onUpdatePracticumStatus={handleUpdateHajiPracticumStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'universitas' && (
            <UniversitasIslamicityModule
              santri={activeSantri}
              nilaiList={santriNilai}
              programs={universityPrograms}
              applications={universityApplications}
              onAddApplication={handleAddUniversityApp}
              onUpdateApplicationStatus={handleUpdateUniversityAppStatus}
              currentRole={currentRole}
              lang={lang}
            />
          )}

          {activeTab === 'elibrary' && (
            <PerpustakaanDigitalModule
              santri={activeSantri}
              nilaiList={santriNilai}
              books={elibraryBooks}
              loans={elibraryLoans}
              onBorrowBook={handleBorrowELibraryBook}
              onUpdateLoanStatus={handleUpdateELibraryLoanStatus}
              onExtendLoan={handleExtendELibraryLoan}
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
              tahfidzList={tahfidzList}
              nilaiList={nilaiList}
              presensiList={presensiList}
              disiplinList={disiplinList}
              kesehatanList={kesehatanList}
              tagihanList={tagihanList}
              aiKaffahMap={aiKaffahMap}
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
          </ModuleErrorBoundary>
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
