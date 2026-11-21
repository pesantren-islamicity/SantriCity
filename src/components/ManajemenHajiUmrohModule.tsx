import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  HajiUmrohAIStudyCaseResult,
  HajiUmrohAyatBasis,
  HajiUmrohCompetencyPillar,
  HajiUmrohCourse,
  HajiUmrohPracticumSession,
  Language,
  SantriProfile,
  UserRole,
} from '../types/pesantren';
import { analyzeHajiUmrohStudyCase } from '../services/hajiUmrohService';
import { exportToCsv } from '../services/storageService';
import {
  BarChart3,
  BookOpenCheck,
  Calculator,
  Calendar,
  CheckCircle2,
  Compass,
  FileSpreadsheet,
  GraduationCap,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

interface ManajemenHajiUmrohModuleProps {
  santri: SantriProfile;
  courses: HajiUmrohCourse[];
  practicums: HajiUmrohPracticumSession[];
  onUpdateCourseStatus: (
    courseId: string,
    status: HajiUmrohCourse['status']
  ) => void;
  onAddPracticum: (session: Omit<HajiUmrohPracticumSession, 'id'>) => void;
  onUpdatePracticumStatus: (
    sessionId: string,
    status: HajiUmrohPracticumSession['status']
  ) => void;
  currentRole: UserRole;
  lang: Language;
}

type HajiUmrohSubTab = 'landasan' | 'kurikulum' | 'simulasi' | 'studi-kasus';

interface AyatFrameworkItem {
  ayat: HajiUmrohAyatBasis;
  judulPilar: string;
  fokusManajemen: string;
  arab: string;
  transliterasi: string;
  terjemahan: string;
  tafsirKaffah: string;
  kompetensiInti: string[];
}

const QS_22_FRAMEWORK: AyatFrameworkItem[] = [
  {
    ayat: 'QS 22:27',
    judulPilar: 'Dakwah Syiar, Mobilisasi Global & Logistik Perjalanan',
    fokusManajemen: 'Pemasaran Syariah, Tata Kelola PPIU/PIHK, Rute & Akomodasi',
    arab: 'وَأَذِّن فِي النَّاسِ بِالْحَجِّ يَأْتُوكَ رِجَالًا وَعَلَىٰ كُلِّ ضَامِرٍ يَأْتِينَ مِن كُلِّ فَجٍّ عَمِيقٍ',
    transliterasi:
      "Wa adzdzin fin-nāsi bil-ḥajji ya'tūka rijālan wa 'alā kulli ḍāmirin ya'tīna min kulli fajjin 'amīq.",
    terjemahan:
      'Dan berserulah kepada manusia untuk mengerjakan haji, niscaya mereka akan datang kepadamu dengan berjalan kaki dan mengendarai unta yang kurus yang datang dari segenap penjuru yang jauh.',
    tafsirKaffah:
      'Menjadi fondasi manajemen komunikasi publik, syiar dakwah Baitullah yang jujur bebas gharar, serta kesiapan infrastruktur transportasi, manifest visa Nusuk, dan logistik lintas wilayah bagi seluruh jamaah.',
    kompetensiInti: [
      'Menyusun strategi informasi & edukasi calon jamaah berbasis amanah (tanpa penipuan jadwal atau fasilitas)',
      'Mengelola penjadwalan penerbangan, manifest kloter, dan transportasi antar-kota suci',
      'Menjamin aksesibilitas layanan bagi jamaah dari berbagai daerah terpencil dan lansia',
    ],
  },
  {
    ayat: 'QS 22:28',
    judulPilar: 'Ekosistem Ekonomi Syariah, Hadyu & Pemberdayaan Umat',
    fokusManajemen: 'Keuangan Bebas Riba, Manajemen Hadyu/Dam & Filantropi',
    arab: 'لِّيَشْهَدُوا مَنَافِعَ لَهُمْ وَيَذْكُرُوا اسْمَ اللَّهِ فِي أَيَّامٍ مَّعْلُومَاتٍ عَلَىٰ مَا رَزَقَهُم مِّن بَهِيمَةِ الْأَنْعَامِ ۖ فَكُلُوا مِنْهَا وَأَطْعِمُوا الْبَائِسَ الْفَقِيرَ',
    transliterasi:
      "Liyasyhadū manāfi'a lahum wa yadzkurusmallāhi fī ayyāmim ma'lūmātin 'alā mā razaqahum min bahīmatil-an'ām, fakulū minhā wa aṭ'imul-bā'isal-faqīr.",
    terjemahan:
      'Supaya mereka menyaksikan berbagai manfaat bagi mereka dan supaya mereka menyebut nama Allah pada hari yang telah ditentukan atas rezeki yang Allah telah berikan kepada mereka berupa binatang ternak. Maka makanlah sebahagian daripadanya dan (sebahagian lagi) berikanlah untuk dimakan orang-orang yang sengsara dan fakir.',
    tafsirKaffah:
      'Menegaskan bahwa penyelenggaraan haji & umroh harus melahirkan nilai tambah ekonomi halal yang berkah, keterbukaan akad pembiayaan perjalanan, serta manajemen hewan hadyu dan infaq sosial yang tepat sasaran.',
    kompetensiInti: [
      'Merancang skema tabungan & akad pembiayaan umroh/haji (Murabahah/Wakalah) bebas riba',
      'Mengelola pembayaran Dam & Hadyu secara transparan melalui lembaga resmi Al-Adahi',
      'Membangun rantai pasok katering halal thoyyib Nusantara dan pemberdayaan UMKM jamaah',
    ],
  },
  {
    ayat: 'QS 22:29',
    judulPilar: 'Kesempurnaan Manasik, Tahallul Higienis & Layanan Baitullah',
    fokusManajemen: 'Bimbingan Muthawwif, Sanitasi Kesehatan & Kepatuhan Syar’i',
    arab: 'ثُمَّ لْيَقْضُوا تَفَثَهُمْ وَلْيُوفُوا نُذُورَهُمْ وَلْيَطَّوَّفُوا بِالْبَيْتِ الْعَتِيقِ',
    transliterasi:
      "Tsummalyaqḍū tafatsahum walyūfū nudzūrahum walyaththawwafū bil-baitil-'atīq.",
    terjemahan:
      'Kemudian, hendaklah mereka menghilangkan kotoran yang ada pada badan mereka dan hendaklah mereka menyempurnakan nazar-nazar mereka dan hendaklah mereka melakukan thawaf sekeliling rumah yang tua itu (Baitullah).',
    tafsirKaffah:
      'Mengintegrasikan kesahihan fikih ibadah (tahallul, penyempurnaan nazar/komitmen, dan thawaf bil Baitil Atiq) dengan standar kebersihan lingkungan, sanitasi tenda Mina, dan ketertiban pergerakan jamaah.',
    kompetensiInti: [
      'Membimbing tata cara manasik haji & umroh sesuai sunnah dengan pendekatan ramah lansia',
      'Mengawal standar kebersihan, sanitasi tahallul (qadha tafats), dan manajemen kesehatan kloter',
      'Memastikan komitmen kontrak layanan (walyufu nudzurahum) terpenuhi hingga jamaah kembali ke tanah air',
    ],
  },
];

interface ManasikStage {
  id: string;
  urutan: number;
  kodeLokasi: string;
  namaTahap: string;
  ayatTerkait: HajiUmrohAyatBasis;
  bacaanUtama: string;
  kaidahFiqh: string;
  sopManajemenKaffah: string;
  x: number;
  y: number;
}

const MANASIK_STAGES: ManasikStage[] = [
  {
    id: 'stg-1',
    urutan: 1,
    kodeLokasi: 'MIQAT',
    namaTahap: 'Miqat & Niat Ihram',
    ayatTerkait: 'QS 22:27',
    bacaanUtama: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً / حَجًّا · لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ',
    kaidahFiqh:
      'Berpakaian ihram sebelum melintasi batas miqat (Bir Ali / Yalamlam), menjaga larangan ihram sepanjang perjalanan.',
    sopManajemenKaffah:
      'Verifikasi gelang identitas rombongan, edukasi larangan ihram di bus/pesawat, dan briefing titik kumpul Masjidil Haram.',
    x: 68,
    y: 86,
  },
  {
    id: 'stg-2',
    urutan: 2,
    kodeLokasi: 'ARAFAH',
    namaTahap: 'Wuquf di Padang Arafah',
    ayatTerkait: 'QS 22:27',
    bacaanUtama: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ',
    kaidahFiqh:
      'Rukun utama haji pada 9 Dzulhijjah sejak tergelincir matahari hingga terbit fajar 10 Dzulhijjah.',
    sopManajemenKaffah:
      'Pengaturan tenda berpendingin, jadwal khutbah wukuf, hidrasi elektrolit berkala, dan prioritas evakuasi medis jamaah rentan.',
    x: 204,
    y: 52,
  },
  {
    id: 'stg-3',
    urutan: 3,
    kodeLokasi: 'MUZDALIFAH',
    namaTahap: 'Mabit di Muzdalifah',
    ayatTerkait: 'QS 22:28',
    bacaanUtama: 'فَاذْكُرُوا اللَّهَ عِندَ الْمَشْعَرِ الْحَرَامِ',
    kaidahFiqh:
      'Bermalam dan memperbanyak dzikir setelah bertolak dari Arafah serta menyiapkan batu kerikil untuk jumrah.',
    sopManajemenKaffah:
      'Manajemen antrean bus taraddudi Armina, pembagian kantong kerikil steril, dan skema murur bagi jamaah lansia.',
    x: 342,
    y: 92,
  },
  {
    id: 'stg-4',
    urutan: 4,
    kodeLokasi: 'MINA',
    namaTahap: 'Jumrah, Hadyu & Tahallul',
    ayatTerkait: 'QS 22:29',
    bacaanUtama: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ رَجْمًا لِلشَّيَاطِينِ وَرِضًا لِلرَّحْمَنِ',
    kaidahFiqh:
      'Melontar Jumrah Aqabah, menyembelih hadyu (QS 22:28), dan mencukur rambut/tahallul awal (qadha tafats QS 22:29).',
    sopManajemenKaffah:
      'Pemilihan waktu lontar teraman, verifikasi voucher sembelih Al-Adahi, dan sanitasi area cukur higienis sekali pakai.',
    x: 478,
    y: 54,
  },
  {
    id: 'stg-5',
    urutan: 5,
    kodeLokasi: 'KA’BAH',
    namaTahap: "Thawaf Ifadhah bil Baitil 'Atiq & Sa'i",
    ayatTerkait: 'QS 22:29',
    bacaanUtama: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
    kaidahFiqh:
      'Menyempurnakan rukun thawaf 7 putaran mengelilingi Baitullah dan sa’i Shafa-Marwah untuk meraih tahallul tsani.',
    sopManajemenKaffah:
      'Pendampingan regu dengan alat komunikasi audio nirkabel (earphone muthawwif) dan penjadwalan lantai atas bagi pengguna kursi roda.',
    x: 614,
    y: 88,
  },
  {
    id: 'stg-6',
    urutan: 6,
    kodeLokasi: 'WADA',
    namaTahap: "Hari Tasyriq & Thawaf Wada'",
    ayatTerkait: 'QS 22:29',
    bacaanUtama: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا',
    kaidahFiqh:
      'Menuntaskan mabit dan lontar 3 jumrah pada hari Tasyriq serta menutup manasik dengan Thawaf Wada’ sebelum kepulangan.',
    sopManajemenKaffah:
      'Audit pasca-ibadah, penyaluran dokumentasi laporan hadyu/infaq kepada jamaah, dan penimbangan bagasi aman sebelum ke bandara.',
    x: 742,
    y: 58,
  },
];

const PILLAR_ORDER: HajiUmrohCompetencyPillar[] = [
  'Dakwah & Mobilisasi Jamaah',
  'Ekonomi Syariah & Hadyu',
  'Fiqh Manasik & Tahallul',
  'Tata Kelola PPIU/PIHK & Regulasi',
  'Bahasa Arab & Bimbingan Muthawwif',
];

export const ManajemenHajiUmrohModule: React.FC<
  ManajemenHajiUmrohModuleProps
> = ({
  santri,
  courses,
  practicums,
  onUpdateCourseStatus,
  onAddPracticum,
  onUpdatePracticumStatus,
  currentRole,
}) => {
  const safeCourses = useMemo(
    () =>
      (Array.isArray(courses) ? courses : []).filter(
        (c): c is HajiUmrohCourse =>
          Boolean(c && c.id && typeof c.namaMk === 'string')
      ),
    [courses]
  );

  const safePracticums = useMemo(
    () =>
      (Array.isArray(practicums) ? practicums : []).filter(
        (p): p is HajiUmrohPracticumSession =>
          Boolean(p && p.id && typeof p.judulPraktikum === 'string')
      ),
    [practicums]
  );

  const [activeSubTab, setActiveSubTab] =
    useState<HajiUmrohSubTab>('landasan');
  const [selectedAyat, setSelectedAyat] =
    useState<HajiUmrohAyatBasis>('QS 22:27');

  // Kurikulum filters
  const [filterAyat, setFilterAyat] = useState<'Semua' | HajiUmrohAyatBasis>(
    'Semua'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manasik Simulator state
  const [selectedStageId, setSelectedStageId] = useState<string>('stg-1');
  const [completedStages, setCompletedStages] = useState<string[]>([
    'stg-1',
    'stg-2',
  ]);

  // Operational & Hadyu Calculator state
  const [calcJamaahCount, setCalcJamaahCount] = useState<number>(45);
  const [calcPackageDays, setCalcPackageDays] = useState<number>(12);
  const [calcPackageMillionRp, setCalcPackageMillionRp] = useState<number>(34);
  const [calcHadyuPct, setCalcHadyuPct] = useState<number>(6);

  // AI Study Case State
  const [caseTopic, setCaseTopic] = useState<string>(
    safeCourses[0]?.namaMk || 'Manajemen Layanan Jamaah Lansia saat Thawaf'
  );
  const [caseAyat, setCaseAyat] = useState<HajiUmrohAyatBasis>('QS 22:29');
  const [caseRole, setCaseRole] =
    useState<HajiUmrohPracticumSession['peranSimulasi']>(
      'Muthawwif / Pembimbing Ibadah'
    );
  const [caseScenario, setCaseScenario] = useState<string>(
    'Rombongan membawa 14 jamaah lanjut usia yang menggunakan kursi roda saat puncak Thawaf Ifadhah dan Tahallul di Masjidil Haram.'
  );
  const [studyResult, setStudyResult] =
    useState<HajiUmrohAIStudyCaseResult | null>(null);
  const [isAnalyzingCase, setIsAnalyzingCase] = useState<boolean>(false);

  // Practicum Registration Modal
  const [isPracticumModalOpen, setIsPracticumModalOpen] =
    useState<boolean>(false);
  const [pracTitle, setPracTitle] = useState<string>('');
  const [pracAyat, setPracAyat] = useState<HajiUmrohAyatBasis>('QS 22:29');
  const [pracRole, setPracRole] =
    useState<HajiUmrohPracticumSession['peranSimulasi']>(
      'Muthawwif / Pembimbing Ibadah'
    );
  const [pracDate, setPracDate] = useState<string>('2026-11-24');
  const [pracLocation, setPracLocation] = useState<string>(
    "Lapangan Manasik & Miniatur Ka'bah SantriCity"
  );
  const [pracNotes, setPracNotes] = useState<string>('');

  // D3 Chart Refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(740);
  const [hoveredPillar, setHoveredPillar] = useState<{
    pilar: string;
    totalSks: number;
    completedSks: number;
    courseCount: number;
    pct: number;
  } | null>(null);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      try {
        const measured = Math.floor(el.getBoundingClientRect().width);
        if (measured > 0) {
          setChartWidth(Math.max(240, measured));
        }
      } catch {
        // ignore resize measurement failure
      }
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load baseline AI study case automatically on mount
  useEffect(() => {
    if (!studyResult) {
      analyzeHajiUmrohStudyCase({
        topik: caseTopic,
        fokusAyat: caseAyat,
        peranSimulasi: caseRole,
        skenarioKasus: caseScenario,
      })
        .then(setStudyResult)
        .catch((err) => console.warn('Initial Haji Umroh study load skipped:', err));
    }
  }, []);

  // Curriculum KPI derivations
  const kpiStats = useMemo(() => {
    const totalCourses = safeCourses.length;
    const totalSks = safeCourses.reduce(
      (acc, c) => acc + (Number(c.sks) || 0),
      0
    );
    const completedCourses = safeCourses.filter((c) => c.status === 'Lulus');
    const completedSks = completedCourses.reduce(
      (acc, c) => acc + (Number(c.sks) || 0),
      0
    );
    const activeCourses = safeCourses.filter(
      (c) => c.status === 'Sedang Ditempuh'
    ).length;
    const masteryPct =
      totalSks > 0 ? Math.round((completedSks / totalSks) * 100) : 0;

    return {
      totalCourses,
      totalSks,
      completedCoursesCount: completedCourses.length,
      completedSks,
      activeCourses,
      masteryPct,
      practicumDone: safePracticums.filter(
        (p) => p.status === 'Lulus Praktikum'
      ).length,
    };
  }, [safeCourses, safePracticums]);

  // Pillar telemetry for D3 chart
  const pillarData = useMemo(() => {
    return PILLAR_ORDER.map((pilar) => {
      const items = safeCourses.filter((c) => c.pilar === pilar);
      const totalSks = items.reduce((acc, c) => acc + (Number(c.sks) || 0), 0);
      const completedSks = items.reduce(
        (acc, c) =>
          acc +
          (c.status === 'Lulus'
            ? Number(c.sks) || 0
            : c.status === 'Sedang Ditempuh'
            ? (Number(c.sks) || 0) * 0.5
            : 0),
        0
      );
      const pct =
        totalSks > 0
          ? Math.min(100, Math.round((completedSks / totalSks) * 100))
          : 0;
      return {
        pilar,
        totalSks,
        completedSks,
        courseCount: items.length,
        pct,
      };
    });
  }, [safeCourses]);

  // Render D3 Pillar Mastery Bar Chart
  useEffect(() => {
    const svgEl = chartSvgRef.current;
    if (!svgEl || !pillarData.length) return;

    try {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = prefersReducedMotion ? 0 : 400;

      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();

      const isVeryNarrow = chartWidth < 400;
      const isCompact = chartWidth < 560;
      const margin = {
        top: 14,
        right: isVeryNarrow ? 14 : isCompact ? 20 : 28,
        bottom: 30,
        left: isVeryNarrow ? 104 : isCompact ? 146 : 225,
      };

      const height = 220;
      const innerWidth = Math.max(120, chartWidth - margin.left - margin.right);
      const innerHeight = height - margin.top - margin.bottom;

      svg
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${chartWidth} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const root = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
      const yScale = d3
        .scaleBand<string>()
        .domain(pillarData.map((d) => d.pilar))
        .range([0, innerHeight])
        .padding(0.32);

      const gridTicks = [0, 25, 50, 75, 100];
      root
        .selectAll('line.grid-x')
        .data(gridTicks)
        .enter()
        .append('line')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#262626')
        .attr('stroke-dasharray', '3,3');

      root
        .selectAll('rect.pillar-track')
        .data(pillarData)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.pilar) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('rx', 5)
        .attr('fill', '#171717')
        .attr('stroke', '#262626');

      const bars = root
        .selectAll('rect.pillar-fill')
        .data(pillarData)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.pilar) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('rx', 5)
        .attr('fill', (d) => (d.pct >= 75 ? '#10b981' : '#14b8a6'))
        .attr('width', 0);

      bars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => Math.max(4, xScale(d.pct)));

      root
        .selectAll('text.pillar-val')
        .data(pillarData)
        .enter()
        .append('text')
        .attr('y', (d) => (yScale(d.pilar) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('x', (d) => {
          const xEnd = xScale(d.pct);
          return xEnd > innerWidth - 76 ? xEnd - 8 : xEnd + 8;
        })
        .attr('text-anchor', (d) =>
          xScale(d.pct) > innerWidth - 76 ? 'end' : 'start'
        )
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', isVeryNarrow ? '10px' : '11px')
        .attr('font-weight', '600')
        .attr('fill', (d) =>
          xScale(d.pct) > innerWidth - 76 ? '#0a0a0a' : '#e5e5e5'
        )
        .text((d) => `${d.pct}% (${d.totalSks} SKS)`);

      root
        .selectAll('text.pillar-label')
        .data(pillarData)
        .enter()
        .append('text')
        .attr('x', -10)
        .attr('y', (d) => (yScale(d.pilar) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('fill', '#e5e5e5')
        .attr('font-size', isCompact ? '10px' : '11px')
        .attr('font-weight', '600')
        .text((d) =>
          isVeryNarrow
            ? d.pilar.slice(0, 15)
            : isCompact
            ? d.pilar.slice(0, 21)
            : d.pilar
        );

      root
        .selectAll('rect.pillar-hit')
        .data(pillarData)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.pilar) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', (_event: MouseEvent, d) => setHoveredPillar(d))
        .on('mouseleave', () => setHoveredPillar(null));

      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(gridTicks)
        .tickFormat((d) => `${d}%`);

      const axisG = root
        .append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis);

      axisG.select('.domain').attr('stroke', '#404040');
      axisG.selectAll('.tick line').attr('stroke', '#404040');
      axisG
        .selectAll('.tick text')
        .attr('fill', '#a3a3a3')
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono, monospace');
    } catch (err) {
      console.warn('HajiUmroh D3 chart skipped:', err);
    }
  }, [pillarData, chartWidth]);

  const activeAyatObj = useMemo(
    () =>
      QS_22_FRAMEWORK.find((item) => item.ayat === selectedAyat) ||
      QS_22_FRAMEWORK[0],
    [selectedAyat]
  );

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return safeCourses.filter((c) => {
      const matchAyat = filterAyat === 'Semua' || c.landasanAyat === filterAyat;
      const matchQuery =
        !q ||
        String(c.namaMk || '').toLowerCase().includes(q) ||
        String(c.kodeMk || '').toLowerCase().includes(q) ||
        String(c.kompetensiKaffah || '').toLowerCase().includes(q) ||
        String(c.kitabReferensi || '').toLowerCase().includes(q);
      return matchAyat && matchQuery;
    });
  }, [safeCourses, filterAyat, searchQuery]);

  const activeStage = useMemo(
    () =>
      MANASIK_STAGES.find((s) => s.id === selectedStageId) || MANASIK_STAGES[0],
    [selectedStageId]
  );

  const operationalCalc = useMemo(() => {
    const jamaah = Math.max(10, Number(calcJamaahCount) || 45);
    const days = Math.max(7, Number(calcPackageDays) || 12);
    const pricePerPerson = Math.max(20, Number(calcPackageMillionRp) || 34) * 1000000;
    const hadyuRate = Math.max(1, Number(calcHadyuPct) || 6) / 100;

    const totalBudgetRp = jamaah * pricePerPerson;
    const muthawwifNeeded = Math.max(1, Math.ceil(jamaah / 20));
    const totalHadyuSocialRp = Math.round(totalBudgetRp * hadyuRate);
    const porsiFakirMiskin = Math.round(jamaah * 2.5);
    const mealPortions = jamaah * days * 3;

    return {
      totalBudgetRp,
      muthawwifNeeded,
      totalHadyuSocialRp,
      porsiFakirMiskin,
      mealPortions,
    };
  }, [calcJamaahCount, calcPackageDays, calcPackageMillionRp, calcHadyuPct]);

  const handleToggleStageCompleted = (stageId: string) => {
    setCompletedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleRunCaseAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzingCase(true);
    try {
      const res = await analyzeHajiUmrohStudyCase({
        topik: caseTopic,
        fokusAyat: caseAyat,
        peranSimulasi: caseRole,
        skenarioKasus: caseScenario,
      });
      setStudyResult(res);
    } catch (err) {
      console.warn('Study case analysis error:', err);
    } finally {
      setIsAnalyzingCase(false);
    }
  };

  const handleSubmitPracticum = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPracticum({
      santriId: santri?.id || 'snt-001',
      santriNama: santri?.nama || 'Santri',
      judulPraktikum:
        pracTitle.trim() ||
        'Simulasi Pembimbingan Manasik & Layanan Jamaah Kaffah',
      fokusAyat: pracAyat,
      peranSimulasi: pracRole,
      tanggal: pracDate,
      lokasi: pracLocation.trim() || 'Lapangan Manasik SantriCity',
      catatanCapaian:
        pracNotes.trim() ||
        'Pelaksanaan praktik manasik terpadu dan evaluasi ketepatan SOP layanan tamu Allah.',
      status: 'Menunggu Verifikasi',
    });
    setIsPracticumModalOpen(false);
    setPracTitle('');
    setPracNotes('');
    setActiveSubTab('studi-kasus');
  };

  const handleExportCurriculumCsv = () => {
    const rows = safeCourses.map((c) => ({
      KodeMK: c.kodeMk,
      MataKuliah: c.namaMk,
      Semester: c.semester,
      SKS: c.sks,
      LandasanAyat: c.landasanAyat,
      PilarKompetensi: c.pilar,
      Status: c.status,
      KitabReferensi: c.kitabReferensi,
    }));
    exportToCsv('prodi_manajemen_haji_umroh_kaffah_qs22', rows);
  };

  const canManageStatus =
    currentRole === 'ustaz' ||
    currentRole === 'admin' ||
    currentRole === 'santri';

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Prodi Manajemen Haji & Umroh Islamicity Kaffah
            </h2>
            <span className="font-arabic text-emerald-400 text-lg font-bold">
              قسم إدارة الحج والعمرة الكافة
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            Kurikulum terpadu pengelolaan perjalanan ibadah haji, umroh, logistik Masyair, ekonomi syariah hadyu, dan bimbingan manasik berlandaskan QS Al-Hajj (22): 27–29.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCurriculumCsv}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Kurikulum CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPracticumModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Daftar Praktikum Manasik</span>
          </button>
        </div>
      </div>

      {/* 4-Column Academic KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Beban Mata Kuliah Inti</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {kpiStats.totalCourses} MK · {kpiStats.totalSks} SKS
          </div>
          <div className="text-[11px] text-neutral-400">
            Terintegrasi 144 SKS Sarjana Terapan Kaffah
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Ketuntasan Kurikulum QS 22:27–29</span>
            <BookOpenCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {kpiStats.masteryPct}% ({kpiStats.completedSks}/{kpiStats.totalSks} SKS)
          </div>
          <div className="text-[11px] text-neutral-400">
            {kpiStats.completedCoursesCount} Lulus · {kpiStats.activeCourses} Sedang Ditempuh
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Simulasi Rute Manasik</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {completedStages.length} / {MANASIK_STAGES.length} Tahap
          </div>
          <div className="text-[11px] text-neutral-400">
            Miqat hingga Thawaf Wada&apos; tersertifikasi
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Praktikum Lapangan & Muthawwif</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {safePracticums.length} Sesi ({kpiStats.practicumDone} Lulus)
          </div>
          <div className="text-[11px] text-neutral-400">
            Standar Kompetensi PPIU/PIHK & BNSP
          </div>
        </div>
      </div>

      {/* D3 Competency Chart */}
      <section
        aria-label="Grafik Capaian 5 Pilar Kompetensi Prodi Manajemen Haji & Umroh"
        className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Peta Penguasaan 5 Pilar Kompetensi Manajemen Haji & Umroh
            </h3>
          </div>
          <div className="text-xs text-neutral-400">
            {hoveredPillar ? (
              <span className="font-mono tabular-nums text-emerald-300">
                {hoveredPillar.pilar} · {hoveredPillar.courseCount} Mata Kuliah ·{' '}
                {hoveredPillar.completedSks}/{hoveredPillar.totalSks} SKS ({hoveredPillar.pct}%)
              </span>
            ) : (
              <span>Arahkan kursor pada batang pilar untuk melihat rincian SKS</span>
            )}
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full overflow-hidden">
          <svg
            ref={chartSvgRef}
            role="img"
            aria-label="Grafik D3 capaian kompetensi Prodi Manajemen Haji dan Umroh"
            className="block w-full select-none"
          />
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto w-fit max-w-full">
        {(
          [
            { id: 'landasan', label: 'Landasan QS 22:27–29', icon: Compass },
            {
              id: 'kurikulum',
              label: `Kurikulum & MK (${safeCourses.length})`,
              icon: BookOpenCheck,
            },
            {
              id: 'simulasi',
              label: 'Simulasi Manasik & Kalkulator Hadyu',
              icon: Calculator,
            },
            {
              id: 'studi-kasus',
              label: `Studi Kasus AI & Praktikum (${safePracticums.length})`,
              icon: Sparkles,
            },
          ] as {
            id: HajiUmrohSubTab;
            label: string;
            icon: React.ComponentType<{ className?: string }>;
          }[]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LANDASAN QS AL-HAJJ 22:27-29 */}
      {activeSubTab === 'landasan' && (
        <div className="space-y-5">
          {/* Ayat Switcher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {QS_22_FRAMEWORK.map((item) => {
              const isSelected = selectedAyat === item.ayat;
              const alignedCount = safeCourses.filter(
                (c) => c.landasanAyat === item.ayat
              ).length;
              return (
                <button
                  key={item.ayat}
                  type="button"
                  onClick={() => setSelectedAyat(item.ayat)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 border-emerald-500/70 text-white'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span
                      className={
                        isSelected
                          ? 'text-emerald-400 font-bold'
                          : 'text-neutral-400 font-semibold'
                      }
                    >
                      {item.ayat}
                    </span>
                    <span className="text-neutral-400">
                      {alignedCount} Mata Kuliah
                    </span>
                  </div>
                  <div className="text-sm font-bold leading-snug">
                    {item.judulPilar}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {item.fokusManajemen}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Focused Ayat Tafsir & Competency Breakdown */}
          <article className="p-5 sm:p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div>
                <div className="text-xs font-mono text-emerald-400 font-semibold">
                  Surah Al-Hajj · {activeAyatObj.ayat}
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeAyatObj.judulPilar}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilterAyat(activeAyatObj.ayat);
                  setActiveSubTab('kurikulum');
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-neutral-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Lihat Mata Kuliah {activeAyatObj.ayat}
              </button>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <p
                dir="rtl"
                className="font-arabic text-xl sm:text-2xl leading-loose text-emerald-300 text-right"
              >
                {activeAyatObj.arab}
              </p>
              <p className="text-xs text-neutral-400 italic leading-relaxed">
                {activeAyatObj.transliterasi}
              </p>
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed pt-2 border-t border-neutral-800/80">
                &ldquo;{activeAyatObj.terjemahan}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white">
                  Relevansi Epistemologi Manajemen Kaffah
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {activeAyatObj.tafsirKaffah}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white">
                  Standar Capaian Lulusan ({activeAyatObj.ayat})
                </h4>
                <ul className="space-y-2 text-xs text-neutral-300">
                  {activeAyatObj.kompetensiInti.map((komp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{komp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* TAB 2: KURIKULUM & MATA KULIAH */}
      {activeSubTab === 'kurikulum' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto max-w-full">
              {(['Semua', 'QS 22:27', 'QS 22:28', 'QS 22:29'] as const).map(
                (basis) => (
                  <button
                    key={basis}
                    type="button"
                    onClick={() => setFilterAyat(basis)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      filterAyat === basis
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {basis === 'Semua' ? 'Semua Ayat' : basis}
                  </button>
                )
              )}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari mata kuliah, kode, kitab..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <p className="text-sm text-neutral-300 font-medium">
                Tidak ada mata kuliah yang sesuai dengan filter pencarian.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterAyat('Semua');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
              >
                Reset Filter Kurikulum
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCourses.map((mk) => (
                <article
                  key={mk.id}
                  className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-neutral-400">
                      <span>
                        {mk.kodeMk} · Semester {mk.semester} · {mk.sks} SKS ·{' '}
                        <span className="text-emerald-400 font-semibold">
                          {mk.landasanAyat}
                        </span>
                      </span>
                      <span
                        className={`font-sans font-semibold ${
                          mk.status === 'Lulus'
                            ? 'text-emerald-400'
                            : mk.status === 'Sedang Ditempuh'
                            ? 'text-cyan-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {mk.status}
                        {mk.nilaiHuruf ? ` (${mk.nilaiHuruf})` : ''}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {mk.namaMk}
                      </h4>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Pilar: {mk.pilar}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {mk.kompetensiKaffah}
                    </p>

                    <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-800">
                      Referensi: <span className="text-neutral-300">{mk.kitabReferensi}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCaseTopic(mk.namaMk);
                        setCaseAyat(mk.landasanAyat);
                        setCaseScenario(
                          `Studi kasus implementasi kompetensi "${mk.namaMk}": ${mk.kompetensiKaffah}`
                        );
                        setActiveSubTab('studi-kasus');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-emerald-300 cursor-pointer"
                    >
                      Bedah Kasus AI
                    </button>

                    {canManageStatus && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-neutral-500">Status:</span>
                        <select
                          aria-label={`Ubah status ${mk.namaMk}`}
                          value={mk.status}
                          onChange={(e) =>
                            onUpdateCourseStatus(
                              mk.id,
                              e.target.value as HajiUmrohCourse['status']
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="Rencana">Rencana</option>
                          <option value="Sedang Ditempuh">Sedang Ditempuh</option>
                          <option value="Lulus">Lulus</option>
                        </select>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SIMULASI MANASIK & KALKULATOR HADYU */}
      {activeSubTab === 'simulasi' && (
        <div className="space-y-6">
          {/* Interactive 6-Stage Manasik Route Explorer */}
          <section className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Simulasi Alur Rukun Manasik & Operasi Masyair (QS 22:27–29)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Pilih titik tahapan pada peta alur untuk memeriksa kaidah fikih, bacaan utama, dan SOP pelayanan jamaah kaffah.
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                Progres Simulasi: {completedStages.length}/{MANASIK_STAGES.length} Tahap
              </div>
            </div>

            {/* Interactive SVG Manasik Route Map */}
            <div className="w-full overflow-x-auto pb-1">
              <svg
                viewBox="0 0 810 140"
                className="w-full min-w-[540px] h-36 rounded-xl bg-neutral-950 border border-neutral-800 select-none"
                role="img"
                aria-label="Diagram interaktif alur perjalanan manasik haji dan umroh"
              >
                {/* Connecting Path */}
                <path
                  d={`M ${MANASIK_STAGES.map((s) => `${s.x} ${s.y}`).join(' L ')}`}
                  fill="none"
                  stroke="#262626"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                {MANASIK_STAGES.map((stage) => {
                  const isSelected = stage.id === selectedStageId;
                  const isDone = completedStages.includes(stage.id);
                  return (
                    <g
                      key={stage.id}
                      onClick={() => setSelectedStageId(stage.id)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={stage.x}
                        cy={stage.y}
                        r={isSelected ? 18 : 14}
                        fill={
                          isSelected
                            ? '#10b981'
                            : isDone
                            ? '#065f46'
                            : '#171717'
                        }
                        stroke={isSelected ? '#6ee7b7' : '#404040'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        x={stage.x}
                        y={stage.y + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill={isSelected ? '#052e16' : '#f5f5f5'}
                      >
                        {stage.urutan}
                      </text>
                      <text
                        x={stage.x}
                        y={stage.y > 70 ? stage.y + 32 : stage.y - 24}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                        fill={isSelected ? '#34d399' : '#a3a3a3'}
                      >
                        {stage.kodeLokasi}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Stage Detail Deck */}
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div>
                  <div className="text-xs font-mono tabular-nums text-emerald-400">
                    Tahap {activeStage.urutan} · {activeStage.kodeLokasi} · Basis{' '}
                    {activeStage.ayatTerkait}
                  </div>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {activeStage.namaTahap}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStageCompleted(activeStage.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    completedStages.includes(activeStage.id)
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  {completedStages.includes(activeStage.id)
                    ? 'Tahap Dikuasai'
                    : 'Tandai Dikuasai'}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] text-neutral-400 mb-1">
                  Bacaan & Talbiyah / Dzikir Inti
                </div>
                <p
                  dir="rtl"
                  className="font-arabic text-lg text-emerald-300 text-right leading-relaxed"
                >
                  {activeStage.bacaanUtama}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-white">
                    Kaidah Fiqh Manasik
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    {activeStage.kaidahFiqh}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-white">
                    SOP Manajemen Operasional & Jamaah Kaffah
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    {activeStage.sopManajemenKaffah}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Operational & Hadyu Calculator (QS 22:27-28) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs">
              <div className="pb-3 border-b border-neutral-800">
                <h3 className="text-sm font-bold text-white">
                  Perencana Rombongan, Logistik & Alokasi Hadyu (QS 22:28)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Hitung kebutuhan pembimbing Muthawwif, anggaran perjalanan halal, dan porsi manfaat hadyu bagi fakir miskin.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Jumlah Jamaah dalam 1 Rombongan
                  </label>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {calcJamaahCount} Jamaah
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={calcJamaahCount}
                  onChange={(e) => setCalcJamaahCount(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Durasi Perjalanan Ibadah
                  </label>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {calcPackageDays} Hari
                  </span>
                </div>
                <input
                  type="range"
                  min={9}
                  max={40}
                  step={1}
                  value={calcPackageDays}
                  onChange={(e) => setCalcPackageDays(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Biaya Transparan per Jamaah (Akad Bebas Riba)
                  </label>
                  <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                    Rp {calcPackageMillionRp} Juta
                  </span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={95}
                  step={1}
                  value={calcPackageMillionRp}
                  onChange={(e) =>
                    setCalcPackageMillionRp(Number(e.target.value))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Alokasi Dana Hadyu, Dam & Filantropi Umat (%)
                  </label>
                  <span className="font-mono tabular-nums text-amber-400 font-semibold">
                    {calcHadyuPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={15}
                  step={1}
                  value={calcHadyuPct}
                  onChange={(e) => setCalcHadyuPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-6 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="pb-3 border-b border-neutral-800">
                <h3 className="text-sm font-bold text-white">
                  Proyeksi Tata Kelola Kloter & Dampak Sosial Umat
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Menjaga rasio pelayanan amanah (1:20) dan kebermanfaatan sosial QS 22:28.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono tabular-nums">
                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-sans text-neutral-400">
                    Total Dana Amanah Rombongan
                  </div>
                  <div className="text-base font-bold text-white">
                    Rp {(operationalCalc.totalBudgetRp / 1000000).toLocaleString('id-ID')} Jt
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-sans text-neutral-400">
                    Kebutuhan Muthawwif & Pembimbing
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    {operationalCalc.muthawwifNeeded} Pembimbing (1:20)
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-sans text-neutral-400">
                    Alokasi Hadyu & Sedekah Fuqara
                  </div>
                  <div className="text-base font-bold text-amber-400">
                    Rp {operationalCalc.totalHadyuSocialRp.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-[11px] font-sans text-neutral-400">
                    Logistik Katering Halal Thoyyib
                  </div>
                  <div className="text-base font-bold text-cyan-400">
                    {operationalCalc.mealPortions.toLocaleString('id-ID')} Porsi
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                Sesuai <strong className="text-white">QS Al-Hajj 22:28</strong>, pengelolaan hadyu dan dam rombongan ini memproyeksikan distribusi{' '}
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  ~{operationalCalc.porsiFakirMiskin} paket pangan
                </span>{' '}
                untuk kaum fakir miskin melalui skema resmi yang diaudit syariah.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STUDI KASUS AI & PRAKTIKUM MANASIK */}
      {activeSubTab === 'studi-kasus' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Case Input Form */}
            <form
              onSubmit={handleRunCaseAnalysis}
              className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs h-fit"
            >
              <div className="pb-3 border-b border-neutral-800">
                <h3 className="text-sm font-bold text-white">
                  Bedah Studi Kasus Manajemen Haji & Umroh AI
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Analisis operasional dan solusi fikih berdasarkan landasan QS Al-Hajj 22:27–29.
                </p>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Topik / Mata Kuliah
                </label>
                <input
                  type="text"
                  value={caseTopic}
                  onChange={(e) => setCaseTopic(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Landasan Ayat
                  </label>
                  <select
                    value={caseAyat}
                    onChange={(e) =>
                      setCaseAyat(e.target.value as HajiUmrohAyatBasis)
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="QS 22:27">QS 22:27 (Mobilisasi)</option>
                    <option value="QS 22:28">QS 22:28 (Ekonomi & Hadyu)</option>
                    <option value="QS 22:29">QS 22:29 (Manasik & Tahallul)</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">
                    Peran Pengelola
                  </label>
                  <select
                    value={caseRole}
                    onChange={(e) =>
                      setCaseRole(
                        e.target.value as HajiUmrohPracticumSession['peranSimulasi']
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Muthawwif / Pembimbing Ibadah">
                      Muthawwif / Pembimbing Ibadah
                    </option>
                    <option value="Manajer Operasional PPIU/PIHK">
                      Manajer Operasional PPIU/PIHK
                    </option>
                    <option value="Koordinator Logistik & Masyair">
                      Koordinator Logistik & Masyair
                    </option>
                    <option value="Pengelola Hadyu & Keuangan Syariah">
                      Pengelola Hadyu & Keuangan Syariah
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Skenario / Masalah Lapangan
                </label>
                <textarea
                  rows={3}
                  value={caseScenario}
                  onChange={(e) => setCaseScenario(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isAnalyzingCase}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isAnalyzingCase ? 'animate-spin' : ''}`}
                />
                <span>
                  {isAnalyzingCase
                    ? 'Menganalisis Perspektif QS 22:27–29...'
                    : 'Analisis Studi Kasus Kaffah'}
                </span>
              </button>
            </form>

            {/* Result Panel */}
            <div className="lg:col-span-7 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              {!studyResult ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  Memuat hasil analisis studi kasus...
                </div>
              ) : (
                <>
                  <div className="pb-3 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-mono tabular-nums text-emerald-400">
                        Basis {String(studyResult.fokusAyat || '')} ·{' '}
                        {String(studyResult.assessedAt || '')}
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {String(studyResult.topik || '')}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {typeof studyResult.ringkasanAnalisis === 'string'
                      ? studyResult.ringkasanAnalisis
                      : ''}
                  </p>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                    <div className="font-semibold text-emerald-400">
                      Keterkaitan QS Al-Hajj 22:27–29
                    </div>
                    <p className="text-neutral-300 leading-relaxed">
                      {typeof studyResult.relevansiAyat === 'string'
                        ? studyResult.relevansiAyat
                        : ''}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <h4 className="font-semibold text-white">
                      Langkah Manajemen Kaffah
                    </h4>
                    <ul className="space-y-1.5 text-neutral-300">
                      {(Array.isArray(studyResult.langkahManajemenKaffah)
                        ? studyResult.langkahManajemenKaffah
                        : []
                      ).map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            {typeof step === 'string' ? step : String(step || '')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
                    <div>
                      <span className="text-neutral-200 font-semibold block mb-0.5">
                        Indikator Keberhasilan
                      </span>
                      <span>
                        {typeof studyResult.indikatorKeberhasilan === 'string'
                          ? studyResult.indikatorKeberhasilan
                          : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-200 font-semibold block mb-0.5">
                        Referensi Dalil & Regulasi
                      </span>
                      <span>
                        {typeof studyResult.referensiDalil === 'string'
                          ? studyResult.referensiDalil
                          : ''}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Practicum Schedule Table */}
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Logbook Praktikum Manasik, Muthawwif & Tata Kelola Kloter
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Daftar sesi praktik laboratorium lapangan Program Studi Manajemen Haji & Umroh SantriCity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPracticumModalOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tambah Sesi Praktikum</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950/70 text-neutral-400 border-b border-neutral-800">
                    <th className="py-3 px-4 font-semibold">Tanggal & Lokasi</th>
                    <th className="py-3 px-4 font-semibold">Judul Praktikum & Ayat</th>
                    <th className="py-3 px-4 font-semibold">Santri & Peran</th>
                    <th className="py-3 px-4 font-semibold">Catatan Capaian</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    {(currentRole === 'ustaz' || currentRole === 'admin') && (
                      <th className="py-3 px-4 font-semibold text-right">
                        Verifikasi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {safePracticums.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        Belum ada sesi praktikum manajemen haji & umroh terdaftar.
                      </td>
                    </tr>
                  ) : (
                    safePracticums.map((ses) => (
                      <tr
                        key={ses.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                          <div className="text-white font-semibold">
                            {ses.tanggal}
                          </div>
                          <div className="text-[11px] font-sans text-neutral-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{ses.lokasi}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {ses.judulPraktikum}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400">
                            Basis {ses.fokusAyat}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-neutral-200 font-medium flex items-center gap-1">
                            <Users className="w-3 h-3 text-neutral-400" />
                            <span>{ses.santriNama}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {ses.peranSimulasi}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-neutral-300 line-clamp-2">
                            {ses.catatanCapaian}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              ses.status === 'Lulus Praktikum'
                                ? 'text-emerald-400'
                                : ses.status === 'Terjadwal'
                                ? 'text-cyan-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {ses.status}
                          </span>
                        </td>
                        {(currentRole === 'ustaz' || currentRole === 'admin') && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {ses.status !== 'Lulus Praktikum' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdatePracticumStatus(
                                    ses.id,
                                    'Lulus Praktikum'
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold cursor-pointer"
                              >
                                Sahkan Lulus
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal: Register New Manasik / Operations Practicum */}
      {isPracticumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Daftar Praktikum Manajemen Haji & Umroh
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPracticumModalOpen(false)}
                aria-label="Tutup modal praktikum"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPracticum} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Judul Sesi Praktikum / Simulasi
                </label>
                <input
                  type="text"
                  value={pracTitle}
                  onChange={(e) => setPracTitle(e.target.value)}
                  placeholder="Contoh: Simulasi Pemandu Thawaf & Tahallul Rombongan 45 Jamaah"
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Fokus Landasan Ayat
                  </label>
                  <select
                    value={pracAyat}
                    onChange={(e) =>
                      setPracAyat(e.target.value as HajiUmrohAyatBasis)
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="QS 22:27">QS 22:27 (Dakwah & Rute)</option>
                    <option value="QS 22:28">QS 22:28 (Ekonomi & Hadyu)</option>
                    <option value="QS 22:29">QS 22:29 (Manasik & Thawaf)</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">
                    Peran Praktik
                  </label>
                  <select
                    value={pracRole}
                    onChange={(e) =>
                      setPracRole(
                        e.target.value as HajiUmrohPracticumSession['peranSimulasi']
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Muthawwif / Pembimbing Ibadah">
                      Muthawwif / Pembimbing Ibadah
                    </option>
                    <option value="Manajer Operasional PPIU/PIHK">
                      Manajer Operasional PPIU/PIHK
                    </option>
                    <option value="Koordinator Logistik & Masyair">
                      Koordinator Logistik & Masyair
                    </option>
                    <option value="Pengelola Hadyu & Keuangan Syariah">
                      Pengelola Hadyu & Keuangan Syariah
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={pracDate}
                    onChange={(e) => setPracDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Lokasi Lab</label>
                  <input
                    type="text"
                    value={pracLocation}
                    onChange={(e) => setPracLocation(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Target Capaian Kompetensi
                </label>
                <textarea
                  rows={2}
                  value={pracNotes}
                  onChange={(e) => setPracNotes(e.target.value)}
                  placeholder="Contoh: Melatih komunikasi Arab lapangan dan prosedur keselamatan lansia."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPracticumModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Simpan Pendaftaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
