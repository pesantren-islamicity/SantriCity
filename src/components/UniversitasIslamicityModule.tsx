import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Language,
  NilaiMataPelajaran,
  SantriProfile,
  UniversityAIRecommendation,
  UniversityAdmissionApplication,
  UniversityFacultyCode,
  UniversityProgram,
  UserRole,
} from '../types/pesantren';
import { recommendUniversityProgram } from '../services/universitasService';
import { exportToCsv } from '../services/storageService';
import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileSpreadsheet,
  Globe,
  GraduationCap,
  Landmark,
  Layers,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

interface UniversitasIslamicityModuleProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  programs: UniversityProgram[];
  applications: UniversityAdmissionApplication[];
  onAddApplication: (app: Omit<UniversityAdmissionApplication, 'id'>) => void;
  onUpdateApplicationStatus: (
    appId: string,
    status: UniversityAdmissionApplication['status']
  ) => void;
  currentRole: UserRole;
  lang: Language;
}

type UniversitasSubTab = 'direktori' | 'pmb' | 'konsultan-ai';

interface FacultySummaryMeta {
  kode: UniversityFacultyCode;
  nama: string;
  singkatan: string;
  deskripsi: string;
}

const FACULTY_METADATA: FacultySummaryMeta[] = [
  {
    kode: 'FTIK',
    nama: 'Fakultas Tarbiyah dan Ilmu Keguruan',
    singkatan: 'FTIK',
    deskripsi:
      "Mencetak pendidik madrasah, pembina Pendidikan Al-Qur'an, ahli bahasa, sains tadris, dan profesi guru (PPG).",
  },
  {
    kode: 'FASIH',
    nama: 'Fakultas Syariah & Ilmu Hukum',
    singkatan: 'FASIH',
    deskripsi:
      'Mengembangkan ahli hukum keluarga Islam, muamalah ekonomi syariah, siyasah tata negara, dan hukum bisnis.',
  },
  {
    kode: 'FUAD',
    nama: 'Fakultas Ushuluddin, Adab, & Dakwah',
    singkatan: 'FUAD',
    deskripsi:
      "Pusat keilmuan Al-Qur'an & Tafsir, Hadis, pemikiran Islam, komunikasi dakwah, konseling, serta sastra & sejarah Islam.",
  },
  {
    kode: 'FEBI',
    nama: 'Fakultas Ekonomi & Bisnis Islam',
    singkatan: 'FEBI',
    deskripsi:
      'Menyiapkan praktisi Bisnis Syariah, Manajemen Haji & Umrah, perbankan syariah, nazhir zakat-wakaf, dan industri halal global.',
  },
];

const FEATURED_PROGRAM_IDS = [
  'uni-febi-08', // Manajemen Haji & Umrah (QS 22:27-29)
  'uni-febi-06', // Manajemen Bisnis Syariah
  'uni-ftik-14', // Pendidikan Al-Qur'an (Tahfidz & Tafaqquh)
  'uni-fuad-01', // Ilmu Al-Quran & Tafsir
  'uni-febi-01', // Perbankan Syariah
  'uni-fasih-02', // Hukum Ekonomi Syariah (Muamalah)
  'uni-ftik-13', // PPG
];

const BROCHURE_IMAGE_PATH = '/assets/aistudio/image_0e5943bd.png';

function synthesizeProgramDetails(prodi: UniversityProgram) {
  const gelarLulusan =
    prodi.gelarLulusan ||
    (prodi.jenjang === 'Profesi (PPG)'
      ? 'Gr.'
      : prodi.fakultasKode === 'FTIK'
      ? 'S.Pd.'
      : prodi.fakultasKode === 'FASIH'
      ? 'S.H.'
      : prodi.fakultasKode === 'FEBI'
      ? 'S.E.'
      : 'S.Ag.');

  const lamaStudi =
    prodi.lamaStudi ||
    (prodi.jenjang === 'Profesi (PPG)'
      ? '2 Semester (1 Tahun Profesi)'
      : '8 Semester (4 Tahun)');

  const totalSks =
    typeof prodi.totalSks === 'number'
      ? prodi.totalSks
      : prodi.jenjang === 'Profesi (PPG)'
      ? 36
      : 144;

  const deskripsiMendalam =
    prodi.deskripsiMendalam ||
    `${prodi.namaProdi} di bawah ${prodi.fakultasNama} (${prodi.jurusan}) dirancang untuk mencetak lulusan berintegritas Qur'ani yang menguasai teori keilmuan modern, praktik lapangan terstruktur, serta kesiapan berkarier sebagai ${prodi.prospekKarir}.`;

  const fokusKurikulum =
    Array.isArray(prodi.fokusKurikulum) && prodi.fokusKurikulum.length > 0
      ? prodi.fokusKurikulum
      : [
          `Fondasi Keilmuan ${prodi.jurusan} & Metodologi Riset`,
          `Aplikasi Praktik ${prodi.namaProdi} Berbasis Etika Syariah`,
          'Penguatan Bahasa Arab & Bahasa Inggris Akademik',
          'Praktik Lapangan & Tugas Akhir Berdampak Umat',
        ];

  const landasanQurani =
    prodi.landasanQurani ||
    "QS Al-Mujadilah (58): 11 — Mengangkat derajat orang beriman dan berilmu yang mengamalkan keahliannya secara kaffah.";

  const sertifikasiPendamping =
    Array.isArray(prodi.sertifikasiPendamping) &&
    prodi.sertifikasiPendamping.length > 0
      ? prodi.sertifikasiPendamping
      : ['Sertifikat Kemahiran Bahasa Arab/Inggris', 'Portofolio Praktikum Profesi'];

  const mitraGlobal =
    prodi.mitraGlobal ||
    'Ekosistem Pendidikan, Lembaga Riset & Jaringan Industri Halal Mitra SantriCity';

  return {
    gelarLulusan,
    lamaStudi,
    totalSks,
    deskripsiMendalam,
    fokusKurikulum,
    landasanQurani,
    sertifikasiPendamping,
    mitraGlobal,
  };
}

export const UniversitasIslamicityModule: React.FC<
  UniversitasIslamicityModuleProps
> = ({
  santri,
  nilaiList,
  programs,
  applications,
  onAddApplication,
  onUpdateApplicationStatus,
  currentRole,
}) => {
  const safePrograms = useMemo(
    () =>
      (Array.isArray(programs) ? programs : []).filter(
        (p): p is UniversityProgram =>
          Boolean(p && p.id && typeof p.namaProdi === 'string')
      ),
    [programs]
  );

  const safeApplications = useMemo(
    () =>
      (Array.isArray(applications) ? applications : []).filter(
        (a): a is UniversityAdmissionApplication =>
          Boolean(a && a.id && typeof a.namaProdi === 'string')
      ),
    [applications]
  );

  const avgNilai = useMemo(() => {
    const valid = (Array.isArray(nilaiList) ? nilaiList : []).filter(
      (n) => n && typeof n.akhir === 'number'
    );
    if (valid.length === 0) return 88.5;
    const total = valid.reduce((acc, item) => acc + item.akhir, 0);
    return Number((total / valid.length).toFixed(1));
  }, [nilaiList]);

  const [activeSubTab, setActiveSubTab] =
    useState<UniversitasSubTab>('direktori');
  const [selectedFaculty, setSelectedFaculty] = useState<
    UniversityFacultyCode | 'Semua'
  >('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyUnggul, setOnlyUnggul] = useState<boolean>(false);

  // Interactive Program Inspector State
  const [inspectedProgramId, setInspectedProgramId] = useState<string>(
    () =>
      safePrograms.find((p) => p.id === 'uni-febi-08')?.id ||
      safePrograms[0]?.id ||
      'uni-ftik-01'
  );
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(false);

  // Brochure Lightbox & Fallback state
  const [isBrochureOpen, setIsBrochureOpen] = useState<boolean>(false);
  const [brochureImgError, setBrochureImgError] = useState<boolean>(false);

  // PMB Application Modal
  const [isPmbModalOpen, setIsPmbModalOpen] = useState<boolean>(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    safePrograms[0]?.id || 'uni-ftik-01'
  );
  const [jalurMasuk, setJalurMasuk] = useState<
    UniversityAdmissionApplication['jalurMasuk']
  >("Jalur Tahfidz Al-Qur'an");
  const [catatanRencanaStudi, setCatatanRencanaStudi] = useState<string>('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // AI Study Advisor State
  const [aiMinatUtama, setAiMinatUtama] = useState<string>(
    "Manajemen Haji & Umrah, Bisnis Syariah, dan Pendidikan Al-Qur'an"
  );
  const [aiFakultasFokus, setAiFakultasFokus] = useState<
    UniversityFacultyCode | 'Semua'
  >('Semua');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<UniversityAIRecommendation | null>(
    null
  );

  // D3 Faculty Chart Refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(720);

  const facultyStats = useMemo(() => {
    return FACULTY_METADATA.map((meta) => {
      const list = safePrograms.filter((p) => p.fakultasKode === meta.kode);
      const unggul = list.filter((p) => p.akreditasiUnggul).length;
      const reguler = list.length - unggul;
      return {
        ...meta,
        total: list.length,
        unggul,
        reguler,
      };
    });
  }, [safePrograms]);

  const featuredPrograms = useMemo(() => {
    const byId = FEATURED_PROGRAM_IDS.map((id) =>
      safePrograms.find((p) => p.id === id)
    ).filter((p): p is UniversityProgram => Boolean(p));
    if (byId.length > 0) return byId;
    return safePrograms.slice(0, 6);
  }, [safePrograms]);

  const totalPrograms = safePrograms.length;
  const totalUnggul = useMemo(
    () => safePrograms.filter((p) => p.akreditasiUnggul).length,
    [safePrograms]
  );
  const santriApplications = useMemo(
    () => safeApplications.filter((a) => a.santriId === santri.id),
    [safeApplications, santri.id]
  );
  const acceptedCount = useMemo(
    () =>
      safeApplications.filter(
        (a) => a.status === 'Diterima / Siap Matrikulasi'
      ).length,
    [safeApplications]
  );

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return safePrograms.filter((item) => {
      const matchesFaculty =
        selectedFaculty === 'Semua' || item.fakultasKode === selectedFaculty;
      const matchesUnggul = !onlyUnggul || item.akreditasiUnggul;
      const matchesQuery =
        !q ||
        item.namaProdi.toLowerCase().includes(q) ||
        item.jurusan.toLowerCase().includes(q) ||
        item.fakultasNama.toLowerCase().includes(q) ||
        item.prospekKarir.toLowerCase().includes(q) ||
        (item.deskripsiMendalam || '').toLowerCase().includes(q);
      return matchesFaculty && matchesUnggul && matchesQuery;
    });
  }, [safePrograms, selectedFaculty, onlyUnggul, searchQuery]);

  const inspectedProgram = useMemo(() => {
    return (
      safePrograms.find((p) => p.id === inspectedProgramId) ||
      filteredPrograms[0] ||
      safePrograms[0] ||
      null
    );
  }, [safePrograms, filteredPrograms, inspectedProgramId]);

  const inspectedDetails = useMemo(
    () => (inspectedProgram ? synthesizeProgramDetails(inspectedProgram) : null),
    [inspectedProgram]
  );

  // Group filtered programs by Faculty -> Jurusan
  const groupedDirectory = useMemo(() => {
    return FACULTY_METADATA.map((meta) => {
      const facPrograms = filteredPrograms.filter(
        (p) => p.fakultasKode === meta.kode
      );
      if (facPrograms.length === 0) return null;

      const jurusanOrder: string[] = [];
      const jurusanMap: Record<string, UniversityProgram[]> = {};

      facPrograms.forEach((p) => {
        if (!jurusanMap[p.jurusan]) {
          jurusanMap[p.jurusan] = [];
          jurusanOrder.push(p.jurusan);
        }
        jurusanMap[p.jurusan].push(p);
      });

      return {
        meta,
        totalCount: facPrograms.length,
        unggulCount: facPrograms.filter((p) => p.akreditasiUnggul).length,
        jurusanGroups: jurusanOrder.map((jurusan) => ({
          jurusan,
          items: jurusanMap[jurusan],
        })),
      };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [filteredPrograms]);

  // Escape handler for modals
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDetailOpen(false);
        setIsBrochureOpen(false);
        setIsPmbModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Observe responsive width for D3 Chart
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    try {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          if (w > 220) {
            setChartWidth(w);
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    } catch {
      // Safe fallback width on unsupported environments
    }
  }, []);

  // Render D3 Horizontal Breakdown Chart
  useEffect(() => {
    const svgEl = chartSvgRef.current;
    if (!svgEl || facultyStats.length === 0) return;

    try {
      const margin = { top: 18, right: 28, bottom: 26, left: 68 };
      const width = Math.max(300, chartWidth);
      const height = 196;
      const innerWidth = Math.max(120, width - margin.left - margin.right);
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const maxTotal = d3.max(facultyStats, (d) => d.total) || 15;

      const xScale = d3
        .scaleLinear()
        .domain([0, Math.max(15, maxTotal + 2)])
        .range([0, innerWidth]);

      const yScale = d3
        .scaleBand()
        .domain(facultyStats.map((d) => d.kode))
        .range([0, innerHeight])
        .padding(0.32);

      // Horizontal subtle grid lines
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .ticks(5)
            .tickSize(-innerHeight)
            .tickFormat((d) => `${d}`)
        )
        .call((axisG) => {
          axisG.select('.domain').remove();
          axisG
            .selectAll('.tick line')
            .attr('stroke', '#262626')
            .attr('stroke-dasharray', '2,2');
          axisG
            .selectAll('.tick text')
            .attr('fill', '#737373')
            .attr('font-size', '10px');
        });

      // Y axis faculty codes
      g.append('g')
        .call(d3.axisLeft(yScale).tickSize(0))
        .call((axisG) => {
          axisG.select('.domain').remove();
          axisG
            .selectAll('.tick text')
            .attr('fill', '#e5e5e5')
            .attr('font-size', '11px')
            .attr('font-weight', '600');
        });

      const reduceMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Unggul (*) bar segment
      const unggulBars = g
        .selectAll('.bar-unggul')
        .data(facultyStats)
        .enter()
        .append('rect')
        .attr('class', 'bar-unggul')
        .attr('y', (d) => yScale(d.kode) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('x', 0)
        .attr('rx', 4)
        .attr('fill', '#10b981');

      if (reduceMotion) {
        unggulBars.attr('width', (d) => xScale(d.unggul));
      } else {
        unggulBars
          .attr('width', 0)
          .transition()
          .duration(450)
          .attr('width', (d) => xScale(d.unggul));
      }

      // Non-Unggul segment stacked next to Unggul
      const regBars = g
        .selectAll('.bar-reguler')
        .data(facultyStats)
        .enter()
        .append('rect')
        .attr('class', 'bar-reguler')
        .attr('y', (d) => yScale(d.kode) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('x', (d) => xScale(d.unggul))
        .attr('rx', 4)
        .attr('fill', '#06b6d4')
        .attr('opacity', 0.78);

      if (reduceMotion) {
        regBars.attr('width', (d) =>
          Math.max(0, xScale(d.total) - xScale(d.unggul))
        );
      } else {
        regBars
          .attr('width', 0)
          .transition()
          .duration(450)
          .attr('width', (d) =>
            Math.max(0, xScale(d.total) - xScale(d.unggul))
          );
      }

      // Value labels
      g.selectAll('.bar-label')
        .data(facultyStats)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d) => xScale(d.total) + 6)
        .attr('y', (d) => (yScale(d.kode) ?? 0) + yScale.bandwidth() / 2 + 4)
        .attr('fill', '#a3a3a3')
        .attr('font-size', '10px')
        .text((d) => `${d.total} Prodi (${d.unggul}*)`);
    } catch {
      // Safe D3 guard
    }
  }, [chartWidth, facultyStats]);

  const handleInspectProgram = (
    programId: string,
    openMobileDrawer = false
  ) => {
    setInspectedProgramId(programId);
    if (openMobileDrawer) {
      setIsMobileDetailOpen(true);
    } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleOpenPmbForProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setIsMobileDetailOpen(false);
    setIsPmbModalOpen(true);
  };

  const handleConsultAiForProgram = (prodi: UniversityProgram) => {
    setAiFakultasFokus(prodi.fakultasKode);
    setAiMinatUtama(
      `Tertarik pada program studi ${prodi.namaProdi} (${prodi.fakultasKode}) untuk berkarier sebagai ${prodi.prospekKarir}`
    );
    setIsMobileDetailOpen(false);
    setActiveSubTab('konsultan-ai');
  };

  const handleSubmitPmb = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenProgram =
      safePrograms.find((p) => p.id === selectedProgramId) || safePrograms[0];
    if (!chosenProgram) return;

    onAddApplication({
      santriId: santri.id,
      santriNama: santri.nama,
      fakultasKode: chosenProgram.fakultasKode,
      programId: chosenProgram.id,
      namaProdi: chosenProgram.namaProdi,
      jalurMasuk,
      tanggalDaftar: new Date().toISOString().slice(0, 10),
      catatanRencanaStudi:
        catatanRencanaStudi.trim() ||
        `Pengajuan studi lanjut program ${chosenProgram.namaProdi} (${chosenProgram.fakultasKode}) berbasis kompetensi Al-Qur'an & akademik SantriCity.`,
      status: 'Diajukan',
    });

    setCatatanRencanaStudi('');
    setIsPmbModalOpen(false);
    setActiveSubTab('pmb');
    setFeedbackNotice(
      `Pendaftaran PMB untuk ${santri.nama} pada prodi ${chosenProgram.namaProdi} berhasil dicatat.`
    );
  };

  const handleRunAiAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiLoading(true);
    try {
      const rec = await recommendUniversityProgram({
        santri,
        minatUtama: aiMinatUtama,
        fakultasFokus: aiFakultasFokus,
        avgNilai,
        programs: safePrograms,
      });
      setAiResult(rec);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredPrograms.map((p, idx) => {
      const details = synthesizeProgramDetails(p);
      return {
        No: idx + 1,
        KodeFakultas: p.fakultasKode,
        Fakultas: p.fakultasNama,
        Jurusan: p.jurusan,
        ProgramStudi: p.namaProdi,
        Jenjang: p.jenjang,
        Gelar: details.gelarLulusan,
        LamaStudi: details.lamaStudi,
        TotalSKS: details.totalSks,
        AkreditasiUnggul: p.akreditasiUnggul ? 'Ya (*)' : 'Terakreditasi',
        BahasaPengantar: p.bahasaPengantar,
        MinTahfidzJuz: p.minTahfidzJuz ?? 3,
        MinNilaiRata: p.minNilaiRata ?? 82,
        LandasanQurani: details.landasanQurani,
        DeskripsiMendalam: details.deskripsiMendalam,
        ProspekKarir: p.prospekKarir,
      };
    });
    exportToCsv('Direktori_Universitas_Islamicity_Internasional', rows);
  };

  const canReviewPmb = currentRole === 'admin' || currentRole === 'ustaz';

  const renderProgramDeepDetail = (
    prodi: UniversityProgram,
    details: ReturnType<typeof synthesizeProgramDetails>
  ) => {
    const reqJuz = prodi.minTahfidzJuz ?? 3;
    const reqNilai = prodi.minNilaiRata ?? 82;
    const meetsJuz = santri.capaianJuz >= reqJuz;
    const meetsNilai = avgNilai >= reqNilai;

    return (
      <div className="space-y-4">
        {/* Kicker + Title */}
        <div className="space-y-1.5 border-b border-neutral-800 pb-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-cyan-400">
            <span>{prodi.fakultasKode}</span>
            <span aria-hidden="true" className="text-neutral-600">
              ·
            </span>
            <span>{prodi.jurusan}</span>
            <span aria-hidden="true" className="text-neutral-600">
              ·
            </span>
            <span className="text-neutral-300">
              {prodi.jenjang} ({details.gelarLulusan})
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
            {prodi.namaProdi}
            {prodi.akreditasiUnggul ? (
              <span className="text-emerald-400 ml-1" title="Terakreditasi Unggul">
                *
              </span>
            ) : null}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400 pt-0.5">
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                prodi.akreditasiUnggul ? 'text-emerald-400' : 'text-cyan-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                {prodi.akreditasiUnggul
                  ? 'Terakreditasi Unggul (*)'
                  : 'Terakreditasi Resmi'}
              </span>
            </span>
            <span aria-hidden="true" className="text-neutral-700">
              ·
            </span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span>
                {details.lamaStudi} · {details.totalSks} SKS
              </span>
            </span>
          </div>
        </div>

        {/* Deskripsi Mendalam */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Deskripsi Mendalam Program Studi</span>
          </h4>
          <p className="text-xs sm:text-[13px] text-neutral-300 leading-relaxed">
            {details.deskripsiMendalam}
          </p>
        </div>

        {/* Landasan Qur'ani */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1">
          <p className="text-[11px] font-semibold text-amber-400">
            Landasan Qur&apos;ani & Filosofi Keilmuan
          </p>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {details.landasanQurani}
          </p>
        </div>

        {/* Fokus Kurikulum */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Fokus Kurikulum & Mata Kuliah Inti</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-neutral-300">
            {details.fokusKurikulum.map((mk, idx) => (
              <li
                key={`${prodi.id}-mk-${idx}`}
                className="flex items-start gap-2 leading-relaxed"
              >
                <span className="font-mono tabular-nums text-[11px] text-emerald-400 shrink-0 mt-0.5">
                  0{idx + 1}.
                </span>
                <span>{mk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prospek Karir, Sertifikasi & Mitra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
            <p className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Prospek Karir Lulusan</span>
            </p>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {prodi.prospekKarir}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
            <p className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sertifikasi Pendamping</span>
            </p>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {details.sertifikasiPendamping.join(' · ')}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400 leading-relaxed">
          <span className="text-neutral-300 font-medium">Bahasa & Mitra:</span>{' '}
          {prodi.bahasaPengantar} · {details.mitraGlobal}
        </div>

        {/* Kesesuaian Kesiapan Santri */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-200">
              Kesiapan {santri.nama}
            </span>
            <span className="font-mono tabular-nums text-[11px] text-neutral-400">
              Syarat Min: {reqJuz} Juz · Nilai {reqNilai}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400">Tahfidz</span>
              <span
                className={
                  meetsJuz ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
                }
              >
                {santri.capaianJuz} Juz {meetsJuz ? '✓' : '△'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-400">Akademik</span>
              <span
                className={
                  meetsNilai ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
                }
              >
                {avgNilai} {meetsNilai ? '✓' : '△'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleOpenPmbForProgram(prodi.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Daftar PMB Prodi Ini</span>
          </button>
          <button
            type="button"
            onClick={() => handleConsultAiForProgram(prodi)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Konsultasi AI</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
            <Landmark className="w-4 h-4 shrink-0" />
            <span>
              Pendidikan Tinggi Terpadu · 4 Fakultas · {totalPrograms} Program
              Studi & PPG
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Universitas Islamicity Internasional
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            جامعة إسلامي سيتي الدولية — Direktori Interaktif Fakultas, Deskripsi
            Mendalam Setiap Prodi, PMB Jalur Tahfidz & Konsultan Studi AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBrochureOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lihat Brosur Resmi</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 cursor-pointer transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV Prodi</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPmbModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Daftar PMB Santri</span>
          </button>
        </div>
      </div>

      {/* Feedback Notice Banner */}
      {feedbackNotice && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            aria-label="Tutup pemberitahuan"
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Program Studi</span>
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {totalPrograms} Prodi
          </p>
          <p className="text-[11px] text-neutral-400">
            4 Fakultas · 36 Prodi Brosur & 2 Prodi Kaffah
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Terakreditasi Unggul (*)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {totalUnggul} Prodi
          </p>
          <p className="text-[11px] text-neutral-400">
            {totalPrograms > 0
              ? `${Math.round((totalUnggul / totalPrograms) * 100)}% dari total katalog resmi`
              : 'Standar Mutu Internasional'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Kesiapan Santri Terpilih</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {santri.capaianJuz} Juz
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            {santri.nama} · Rerata Nilai {avgNilai}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Pengajuan PMB SantriCity</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {safeApplications.length} Berkas
          </p>
          <p className="text-[11px] text-neutral-400">
            {acceptedCount} Diterima · {santriApplications.length} Pengajuan{' '}
            {santri.nama.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Overview Split: D3 Faculty Breakdown + Official Brochure Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          ref={chartContainerRef}
          className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Sebaran Program Studi per Fakultas</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Perbandingan jumlah program studi Terakreditasi Unggul (*) dan
                program reguler di empat fakultas utama.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-neutral-400 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Unggul (*)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500 inline-block opacity-80" />
                Reguler / Profesi
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              ref={chartSvgRef}
              className="w-full h-48 block"
              role="img"
              aria-label="Grafik sebaran program studi per fakultas Universitas Islamicity Internasional"
            />
          </div>
        </div>

        {/* Official Brochure Preview Card */}
        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Brosur Resmi Fakultas</span>
            </div>
            <button
              type="button"
              onClick={() => setIsBrochureOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Perbesar
            </button>
          </div>

          <div
            onClick={() => setIsBrochureOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsBrochureOpen(true);
            }}
            className="relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 h-36 cursor-pointer group"
          >
            {!brochureImgError ? (
              <img
                src={BROCHURE_IMAGE_PATH}
                alt="Daftar Resmi Fakultas dan Program Studi Universitas Islamicity Internasional"
                referrerPolicy="no-referrer"
                onError={() => setBrochureImgError(true)}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-cyan-950/70 to-emerald-950/60">
                <Landmark className="w-8 h-8 text-cyan-400 mb-1.5" />
                <p className="text-xs font-semibold text-white">
                  Universitas Islamicity Internasional
                </p>
                <p className="text-[11px] text-neutral-300">
                  FTIK · FASIH · FUAD · FEBI
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5">
              <p className="text-[11px] font-medium text-white">
                Klik untuk melihat daftar fakultas ukuran penuh
              </p>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Klik program studi mana saja di bawah untuk membaca{' '}
            <span className="text-emerald-400 font-medium">
              deskripsi mendalam, kurikulum inti, dan syarat tahfidz
            </span>
            .
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('direktori')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            activeSubTab === 'direktori'
              ? 'bg-emerald-500 text-neutral-950'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          Direktori Fakultas & Prodi ({totalPrograms})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('pmb')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            activeSubTab === 'pmb'
              ? 'bg-emerald-500 text-neutral-950'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          Pendaftaran PMB Santri ({safeApplications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('konsultan-ai')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            activeSubTab === 'konsultan-ai'
              ? 'bg-emerald-500 text-neutral-950'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Konsultan AI Pemilihan Prodi</span>
        </button>
      </div>

      {/* ================= TAB 1: DIREKTORI FAKULTAS & PRODI ================= */}
      {activeSubTab === 'direktori' && (
        <div className="space-y-5">
          {/* Quick Interactive Spotlight Strip */}
          {featuredPrograms.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h2 className="text-xs font-semibold text-white">
                  Program Studi Unggulan & Kaffah (Klik untuk Deskripsi Mendalam)
                </h2>
                <span className="text-[11px] text-neutral-400">
                  Pilih salah satu untuk langsung meninjau kurikulum
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                {featuredPrograms.map((fp) => {
                  const isActive = inspectedProgram?.id === fp.id;
                  return (
                    <button
                      key={`feat-${fp.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedFaculty('Semua');
                        setSearchQuery('');
                        handleInspectProgram(fp.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500/70 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {fp.fakultasKode} · {fp.namaProdi}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Faculty Quick Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {facultyStats.map((fac) => {
              const isSelected = selectedFaculty === fac.kode;
              return (
                <button
                  key={fac.kode}
                  type="button"
                  onClick={() =>
                    setSelectedFaculty(isSelected ? 'Semua' : fac.kode)
                  }
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-emerald-950/50 border-emerald-500/60 shadow-sm shadow-emerald-950/40'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-400">
                      {fac.kode}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-emerald-400">
                      {fac.total} Prodi · {fac.unggul}*
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-white leading-snug">
                    {fac.nama}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {fac.deskripsi}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari prodi (mis. Manajemen Haji & Umrah, Bisnis Syariah, Pendidikan Al-Qur'an, PPG)..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyUnggul((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                  onlyUnggul
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {onlyUnggul
                  ? '✓ Filter Unggul (*) Aktif'
                  : 'Tampilkan Hanya Unggul (*)'}
              </button>

              {selectedFaculty !== 'Semua' && (
                <button
                  type="button"
                  onClick={() => setSelectedFaculty('Semua')}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  Semua Fakultas
                </button>
              )}
            </div>
          </div>

          {/* Mobile Quick Banner to inspect selected Prodi */}
          {inspectedProgram && (
            <div className="lg:hidden p-4 rounded-2xl bg-neutral-900/95 border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-cyan-400">
                  Prodi Dipilih · {inspectedProgram.fakultasKode}
                </p>
                <p className="text-xs font-bold text-white truncate">
                  {inspectedProgram.namaProdi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDetailOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap"
              >
                Buka Deskripsi
              </button>
            </div>
          )}

          {/* Split Interactive Catalog (Left) + Sticky Deep Detail Panel (Right on Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Catalog Column */}
            <div className="lg:col-span-7 space-y-5">
              {groupedDirectory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-2">
                  <p className="text-sm font-semibold text-white">
                    Program studi tidak ditemukan
                  </p>
                  <p className="text-xs text-neutral-400">
                    Ubah kata kunci pencarian atau reset filter fakultas untuk
                    menampilkan seluruh {totalPrograms} program studi.
                  </p>
                </div>
              ) : (
                groupedDirectory.map((group) => (
                  <section
                    key={group.meta.kode}
                    className="rounded-2xl bg-neutral-900/90 border border-neutral-800 overflow-hidden"
                  >
                    <div className="p-4 bg-neutral-950/70 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>
                            {group.meta.nama} ({group.meta.kode})
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {group.meta.deskripsi}
                        </p>
                      </div>
                      <div className="text-xs font-mono tabular-nums text-emerald-400 shrink-0">
                        {group.totalCount} Prodi · {group.unggulCount} Unggul (*)
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {group.jurusanGroups.map((jg) => (
                        <div
                          key={jg.jurusan}
                          className="space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-1.5">
                            <h4 className="text-xs font-bold text-amber-400">
                              {jg.jurusan}
                            </h4>
                            <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                              {jg.items.length} Program
                            </span>
                          </div>

                          <ol className="space-y-2">
                            {jg.items.map((prodi, index) => {
                              const details = synthesizeProgramDetails(prodi);
                              const isInspected =
                                inspectedProgram?.id === prodi.id;
                              const meetsJuz =
                                santri.capaianJuz >=
                                (prodi.minTahfidzJuz ?? 0);

                              return (
                                <li
                                  key={prodi.id}
                                  className={`rounded-xl border transition-colors ${
                                    isInspected
                                      ? 'bg-emerald-950/35 border-emerald-500/60'
                                      : 'bg-neutral-950/60 border-neutral-800/90 hover:border-neutral-700'
                                  }`}
                                >
                                  <div className="p-3.5 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleInspectProgram(prodi.id)
                                        }
                                        className="text-left min-w-0 flex-1 cursor-pointer group focus:outline-none"
                                      >
                                        <p className="text-xs sm:text-[13px] font-semibold text-white group-hover:text-emerald-300 transition-colors">
                                          {index + 1}. {prodi.namaProdi}
                                          {prodi.akreditasiUnggul ? (
                                            <span className="text-emerald-400 font-bold ml-1">
                                              *
                                            </span>
                                          ) : null}
                                        </p>
                                        <p className="text-[11px] text-neutral-400 mt-0.5">
                                          {prodi.jenjang} ({details.gelarLulusan})
                                          {' · '}
                                          {prodi.akreditasiUnggul
                                            ? 'Terakreditasi Unggul'
                                            : 'Terakreditasi Resmi'}
                                          {' · '}
                                          {details.totalSks} SKS
                                        </p>
                                      </button>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleInspectProgram(prodi.id)
                                          }
                                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                                            isInspected
                                              ? 'bg-emerald-500 text-neutral-950 font-semibold'
                                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700'
                                          }`}
                                        >
                                          <span>
                                            {isInspected ? 'Aktif' : 'Detail'}
                                          </span>
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    <p
                                      onClick={() =>
                                        handleInspectProgram(prodi.id)
                                      }
                                      className="text-[11px] text-neutral-300 leading-relaxed line-clamp-2 cursor-pointer"
                                    >
                                      {details.deskripsiMendalam}
                                    </p>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] font-mono tabular-nums text-neutral-400">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span>
                                          Syarat:{' '}
                                          <strong
                                            className={
                                              meetsJuz
                                                ? 'text-emerald-400'
                                                : 'text-amber-400'
                                            }
                                          >
                                            {prodi.minTahfidzJuz ?? 3} Juz
                                          </strong>
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span>
                                          Min. Nilai{' '}
                                          <strong className="text-neutral-200">
                                            {prodi.minNilaiRata ?? 82}
                                          </strong>
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenPmbForProgram(prodi.id)
                                        }
                                        className="font-sans text-[11px] font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
                                      >
                                        Daftar PMB →
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            {/* Right Sticky Deep Description Panel (Desktop lg+) */}
            <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20 rounded-2xl bg-neutral-900/95 border border-neutral-800 p-5">
              {inspectedProgram && inspectedDetails ? (
                renderProgramDeepDetail(inspectedProgram, inspectedDetails)
              ) : (
                <div className="py-12 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    Pilih Program Studi
                  </p>
                  <p className="text-xs text-neutral-400">
                    Klik salah satu program studi di daftar sebelah kiri untuk
                    melihat deskripsi mendalam, mata kuliah inti, dan prospek
                    karirnya.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PENDAFTARAN PMB SANTRI ================= */}
      {activeSubTab === 'pmb' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-white">
                Penerimaan Mahasiswa Baru (PMB) Terintegrasi SantriCity
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Rekap pengajuan kuliah lanjutan santri ke Universitas Islamicity
                Internasional melalui jalur Tahfidz, Prestasi Kitab, maupun
                Beasiswa Kaffah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPmbModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Pendaftaran Baru</span>
            </button>
          </div>

          {safeApplications.length === 0 ? (
            <div className="p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                Belum ada pengajuan PMB tercatat
              </p>
              <p className="text-xs text-neutral-400">
                Klik tombol &quot;Daftar PMB Santri&quot; untuk mendaftarkan{' '}
                {santri.nama} ke salah satu dari {totalPrograms} program studi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {safeApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-cyan-400">
                        {app.fakultasKode}
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span className="font-semibold text-white">
                        {app.namaProdi}
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span
                        className={`font-medium ${
                          app.status === 'Diterima / Siap Matrikulasi'
                            ? 'text-emerald-400'
                            : app.status === 'Verifikasi Berkas'
                            ? 'text-amber-400'
                            : 'text-cyan-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Pendaftar:{' '}
                      <strong className="text-white">{app.santriNama}</strong> ·{' '}
                      {app.jalurMasuk} · Tanggal {app.tanggalDaftar}
                    </p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {app.catatanRencanaStudi}
                    </p>
                  </div>

                  {canReviewPmb && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        aria-label={`Ubah status PMB ${app.santriNama}`}
                        value={app.status}
                        onChange={(e) =>
                          onUpdateApplicationStatus(
                            app.id,
                            e.target
                              .value as UniversityAdmissionApplication['status']
                          )
                        }
                        className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="Diajukan">Diajukan</option>
                        <option value="Verifikasi Berkas">
                          Verifikasi Berkas
                        </option>
                        <option value="Diterima / Siap Matrikulasi">
                          Diterima / Siap Matrikulasi
                        </option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: KONSULTAN AI PEMILIHAN PRODI ================= */}
      {activeSubTab === 'konsultan-ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleRunAiAdvisor}
            className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4 h-fit"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Compass className="w-4 h-4" />
              <span>Penasihat Studi AI Kaffah</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Analisis kecocokan {totalPrograms} program studi Universitas
              Islamicity Internasional berdasarkan capaian hafalan{' '}
              <strong className="text-white">{santri.capaianJuz} Juz</strong>,
              rerata nilai <strong className="text-white">{avgNilai}</strong>,
              dan minat karir santri.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                Fokus Fakultas (Opsional)
              </label>
              <select
                value={aiFakultasFokus}
                onChange={(e) =>
                  setAiFakultasFokus(
                    e.target.value as UniversityFacultyCode | 'Semua'
                  )
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Semua">
                  Semua Fakultas (FTIK, FASIH, FUAD, FEBI)
                </option>
                <option value="FTIK">FTIK — Tarbiyah & Ilmu Keguruan</option>
                <option value="FASIH">FASIH — Syariah & Ilmu Hukum</option>
                <option value="FUAD">FUAD — Ushuluddin, Adab, & Dakwah</option>
                <option value="FEBI">FEBI — Ekonomi & Bisnis Islam</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                Minat Utama & Cita-cita Santri
              </label>
              <textarea
                rows={4}
                value={aiMinatUtama}
                onChange={(e) => setAiMinatUtama(e.target.value)}
                placeholder="Contoh: Manajemen Haji & Umrah, Bisnis Syariah, atau Pendidikan Al-Qur'an..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAiLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-neutral-950 text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`}
              />
              <span>
                {isAiLoading
                  ? 'Menganalisis Profil & Prodi...'
                  : 'Dapatkan Rekomendasi Prodi'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
            {!aiResult ? (
              <div className="py-10 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">
                  Siap Memetakan Jalur Kuliah {santri.nama}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Lengkapi minat utama santri di panel sebelah kiri lalu klik{' '}
                  <strong className="text-neutral-200">
                    Dapatkan Rekomendasi Prodi
                  </strong>{' '}
                  untuk memperoleh rekomendasi program studi terbaik beserta
                  rencana persiapannya.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Hasil Pemetaan Studi — {aiResult.santriNama}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Dievaluasi: {aiResult.assessedAt} · Fokus:{' '}
                      {aiResult.minatUtama}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                  <p className="text-[11px] font-semibold text-cyan-400">
                    Ringkasan Kesiapan Akademik & Tahfidz
                  </p>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {aiResult.ringkasanProfil}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-white">
                    Top Program Studi Direkomendasikan
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {aiResult.rekomendasiProdi.map((rec, i) => {
                      const matched = safePrograms.find(
                        (p) =>
                          p.namaProdi.toLowerCase() ===
                          rec.namaProdi.toLowerCase()
                      );
                      return (
                        <div
                          key={`${rec.namaProdi}-${i}`}
                          className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-emerald-400">
                              #{i + 1} · {rec.fakultasKode} — {rec.namaProdi}
                              {matched?.akreditasiUnggul ? ' *' : ''}
                            </p>
                            <p className="text-xs text-neutral-300 leading-relaxed">
                              {rec.alasanKesesuaian}
                            </p>
                          </div>
                          {matched && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSubTab('direktori');
                                  handleInspectProgram(matched.id, false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                Lihat Prodi
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenPmbForProgram(matched.id)
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                Daftar Prodi
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                    <p className="text-xs font-semibold text-amber-400">
                      Rencana Persiapan Santri
                    </p>
                    <ul className="space-y-1.5 text-xs text-neutral-300 list-disc pl-4">
                      {aiResult.rencanaPersiapanSantri.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                    <p className="text-xs font-semibold text-emerald-400">
                      Nasihat Akademik & Adab Penuntut Ilmu
                    </p>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {aiResult.nasihatAkademik}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL MENDALAM PRODI (MOBILE / TABLET) ================= */}
      {isMobileDetailOpen && inspectedProgram && inspectedDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 lg:hidden"
          onClick={() => setIsMobileDetailOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300">
                Detail Mendalam Program Studi
              </span>
              <button
                type="button"
                aria-label="Tutup detail program studi"
                onClick={() => setIsMobileDetailOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderProgramDeepDetail(inspectedProgram, inspectedDetails)}
          </div>
        </div>
      )}

      {/* ================= MODAL: PENDAFTARAN PMB ================= */}
      {isPmbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Formulir Pendaftaran PMB Santri
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Universitas Islamicity Internasional · Pendaftar:{' '}
                  {santri.nama}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup formulir PMB"
                onClick={() => setIsPmbModalOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPmb} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Program Studi Pilihan ({totalPrograms} Program Resmi)
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                >
                  {FACULTY_METADATA.map((fac) => (
                    <optgroup
                      key={fac.kode}
                      label={`${fac.kode} — ${fac.nama}`}
                    >
                      {safePrograms
                        .filter((p) => p.fakultasKode === fac.kode)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.namaProdi}
                            {p.akreditasiUnggul ? ' * (Unggul)' : ''} —{' '}
                            {p.jurusan}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Jalur Masuk / Seleksi
                </label>
                <select
                  value={jalurMasuk}
                  onChange={(e) =>
                    setJalurMasuk(
                      e.target
                        .value as UniversityAdmissionApplication['jalurMasuk']
                    )
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Jalur Tahfidz Al-Qur'an">
                    Jalur Tahfidz Al-Qur&apos;an (Capaian Saat Ini:{' '}
                    {santri.capaianJuz} Juz)
                  </option>
                  <option value="Jalur Prestasi Akademik & Kitab">
                    Jalur Prestasi Akademik & Kitab (Rerata: {avgNilai})
                  </option>
                  <option value="Jalur Beasiswa Internasional Kaffah">
                    Jalur Beasiswa Internasional Kaffah
                  </option>
                  <option value="Jalur Reguler SantriCity">
                    Jalur Reguler SantriCity
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Catatan Rencana Studi & Pengabdian
                </label>
                <textarea
                  rows={3}
                  value={catatanRencanaStudi}
                  onChange={(e) => setCatatanRencanaStudi(e.target.value)}
                  placeholder="Tuliskan fokus riset atau target pengabdian keilmuan santri setelah lulus..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPmbModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold cursor-pointer"
                >
                  Kirim Pengajuan PMB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BROSUR RESMI LIGHTBOX ================= */}
      {isBrochureOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBrochureOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Daftar Resmi Fakultas & Program Studi
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Universitas Islamicity Internasional · Tanda (*) =
                  Terakreditasi Unggul
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup brosur resmi"
                onClick={() => setIsBrochureOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
              {!brochureImgError ? (
                <img
                  src={BROCHURE_IMAGE_PATH}
                  alt="Brosur Lengkap Fakultas dan Program Studi Universitas Islamicity Internasional"
                  referrerPolicy="no-referrer"
                  onError={() => setBrochureImgError(true)}
                  className="w-full h-auto block"
                />
              ) : (
                <div className="p-8 text-center space-y-2">
                  <Landmark className="w-10 h-10 text-cyan-400 mx-auto" />
                  <p className="text-sm font-bold text-white">
                    FTIK · FASIH · FUAD · FEBI
                  </p>
                  <p className="text-xs text-neutral-400">
                    Seluruh {totalPrograms} Program Studi & PPG tersedia secara
                    interaktif di tab Direktori Fakultas & Prodi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
