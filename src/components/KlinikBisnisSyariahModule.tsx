import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Language,
  SantriProfile,
  ShariaBusinessClinicCase,
  ShariaClinicAuditResult,
  ShariaConsultationSession,
  ShariaContractType,
  UserRole,
} from '../types/pesantren';
import {
  buildAuditFromBusinessCase,
  diagnoseShariaBusiness,
} from '../services/klinikSyariahService';
import { exportToCsv } from '../services/storageService';
import {
  BarChart3,
  Briefcase,
  Calculator,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  HeartHandshake,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

interface KlinikBisnisSyariahModuleProps {
  santri: SantriProfile;
  cases: ShariaBusinessClinicCase[];
  consultations: ShariaConsultationSession[];
  onAddCase: (newCase: Omit<ShariaBusinessClinicCase, 'id'>) => void;
  onAddConsultation: (
    session: Omit<ShariaConsultationSession, 'id'>
  ) => void;
  onUpdateConsultationStatus: (
    sessionId: string,
    status: ShariaConsultationSession['status']
  ) => void;
  currentRole: UserRole;
  lang: Language;
}

type ClinicSubTab = 'audit' | 'kalkulator' | 'portofolio' | 'jadwal';

const AKAD_TYPES: ShariaContractType[] = [
  'Murabahah',
  'Mudharabah',
  'Musyarakah',
  'Ijarah',
  'Salam / Istishna',
  'Wakalah bil Ujrah',
];

export const KlinikBisnisSyariahModule: React.FC<
  KlinikBisnisSyariahModuleProps
> = ({
  santri,
  cases,
  consultations,
  onAddCase,
  onAddConsultation,
  onUpdateConsultationStatus,
  currentRole,
}) => {
  const safeCases = useMemo(
    () =>
      (Array.isArray(cases) ? cases : []).filter(
        (c): c is ShariaBusinessClinicCase =>
          Boolean(c && c.id && typeof c.namaUsaha === 'string')
      ),
    [cases]
  );

  const safeConsultations = useMemo(
    () =>
      (Array.isArray(consultations) ? consultations : []).filter(
        (s): s is ShariaConsultationSession =>
          Boolean(s && s.id && typeof s.namaUsaha === 'string')
      ),
    [consultations]
  );

  const [activeSubTab, setActiveSubTab] = useState<ClinicSubTab>('audit');

  // Audit AI State
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    safeCases[0]?.id || 'custom'
  );
  const [customBusinessName, setCustomBusinessName] = useState<string>(
    safeCases[0]?.namaUsaha || 'Usaha Mandiri Santri'
  );
  const [customAkad, setCustomAkad] = useState<ShariaContractType>(
    safeCases[0]?.akadUtama || 'Mudharabah'
  );
  const [customOmzet, setCustomOmzet] = useState<number>(
    Number(safeCases[0]?.omzetBulananRp) || 12000000
  );
  const [customMargin, setCustomMargin] = useState<number>(
    Number(safeCases[0]?.marginHalalPersen) || 25
  );
  const [customScenario, setCustomScenario] = useState<string>(
    safeCases[0]?.kendalaUtama ||
      'Ingin menyusun akad kerja sama bagi hasil dengan investor alumni pesantren agar transparan dan sah secara syariah.'
  );
  const [auditResult, setAuditResult] =
    useState<ShariaClinicAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Interactive Calculator State
  const [calcMode, setCalcMode] = useState<'murabahah' | 'mudharabah'>(
    'mudharabah'
  );
  const [calcCapital, setCalcCapital] = useState<number>(10000000);
  const [calcMarginOrProfitPct, setCalcMarginOrProfitPct] =
    useState<number>(20);
  const [calcTenorMonths, setCalcTenorMonths] = useState<number>(6);
  const [calcPengelolaNisbah, setCalcPengelolaNisbah] = useState<number>(60);

  // Modals State
  const [isConsultModalOpen, setIsConsultModalOpen] = useState<boolean>(false);
  const [consultUsaha, setConsultUsaha] = useState<string>(
    safeCases[0]?.namaUsaha || 'Barokah Smart Hydroponics & IoT'
  );
  const [consultAkad, setConsultAkad] =
    useState<ShariaContractType>('Mudharabah');
  const [consultDate, setConsultDate] = useState<string>('2026-11-20');
  const [consultSlot, setConsultSlot] = useState<string>('14:00 - 15:00 WIB');
  const [consultTopic, setConsultTopic] = useState<string>('');

  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState<boolean>(false);
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newUnitSector, setNewUnitSector] =
    useState<ShariaBusinessClinicCase['sektor']>('Teknologi & EdTech');
  const [newUnitAkad, setNewUnitAkad] =
    useState<ShariaContractType>('Murabahah');
  const [newUnitOmzet, setNewUnitOmzet] = useState<number>(8000000);
  const [newUnitModal, setNewUnitModal] = useState<number>(4000000);
  const [newUnitMargin, setNewUnitMargin] = useState<number>(25);
  const [newUnitKendala, setNewUnitKendala] = useState<string>('');

  // D3 Chart Refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(760);
  const [hoveredCase, setHoveredCase] =
    useState<ShariaBusinessClinicCase | null>(null);

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
        // ignore measurement failure
      }
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load initial audit automatically on first mount
  useEffect(() => {
    if (!auditResult && safeCases[0]) {
      buildAuditFromBusinessCase(safeCases[0])
        .then(setAuditResult)
        .catch((err) => {
          console.warn('Initial audit load failed:', err);
        });
    }
  }, [safeCases]);

  // Aggregate metrics
  const kpiStats = useMemo(() => {
    const totalOmzet = safeCases.reduce(
      (acc, c) => acc + (Number(c.omzetBulananRp) || 0),
      0
    );
    const avgCompliance = safeCases.length
      ? Math.round(
          safeCases.reduce(
            (acc, c) => acc + (Number(c.skorKepatuhanSyariah) || 90),
            0
          ) / safeCases.length
        )
      : 95;
    const totalZakat = safeCases.reduce(
      (acc, c) =>
        acc +
        Math.round(
          (Number(c.omzetBulananRp) || 0) *
            ((Number(c.marginHalalPersen) || 0) / 100) *
            0.025
        ),
      0
    );
    const certifiedCount = safeCases.filter((c) =>
      String(c.statusSertifikasiHalal || '').includes('BPJPH')
    ).length;

    return {
      totalUnits: safeCases.length,
      avgCompliance,
      totalOmzet,
      totalZakat,
      certifiedCount,
    };
  }, [safeCases]);

  // Render D3 Sharia Compliance & Margin Bar Chart
  useEffect(() => {
    const svgEl = chartSvgRef.current;
    if (!svgEl || !safeCases.length) return;

    try {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = prefersReducedMotion ? 0 : 420;

      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();

    const isVeryNarrow = chartWidth < 400;
    const isCompact = chartWidth < 560;
    const margin = {
      top: 16,
      right: isVeryNarrow ? 14 : isCompact ? 20 : 32,
      bottom: 32,
      left: isVeryNarrow ? 98 : isCompact ? 132 : 220,
    };

    const height = 224;
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

    const getScore = (d: ShariaBusinessClinicCase) =>
      Math.min(100, Math.max(0, Number(d.skorKepatuhanSyariah) || 90));

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const yScale = d3
      .scaleBand<string>()
      .domain(safeCases.map((c) => c.id))
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
      .selectAll('rect.biz-track')
      .data(safeCases)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.id) ?? 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('rx', 5)
      .attr('fill', '#171717')
      .attr('stroke', '#262626');

    const bars = root
      .selectAll('rect.biz-fill')
      .data(safeCases)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.id) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 5)
      .attr('fill', (d) => (getScore(d) >= 95 ? '#10b981' : '#14b8a6'))
      .attr('width', 0);

    bars
      .transition()
      .duration(duration)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => Math.max(4, xScale(getScore(d))));

    root
      .selectAll('text.biz-score')
      .data(safeCases)
      .enter()
      .append('text')
      .attr('y', (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('x', (d) => Math.max(24, xScale(getScore(d)) - 8))
      .attr('text-anchor', 'end')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', isVeryNarrow ? '10px' : '11px')
      .attr('font-weight', '700')
      .attr('fill', '#0a0a0a')
      .text((d) =>
        isVeryNarrow
          ? `${getScore(d)}%`
          : `${getScore(d)}% · ${String(d.akadUtama || '')}`
      );

    root
      .selectAll('text.biz-label')
      .data(safeCases)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#e5e5e5')
      .attr('font-size', isCompact ? '10px' : '11px')
      .attr('font-weight', '600')
      .text((d) =>
        isVeryNarrow
          ? String(d.namaUsaha || '').slice(0, 14)
          : isCompact
          ? String(d.namaUsaha || '').slice(0, 18)
          : String(d.namaUsaha || '').slice(0, 30)
      );

    root
      .selectAll('rect.biz-hit')
      .data(safeCases)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.id) ?? 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event: MouseEvent, d) => setHoveredCase(d))
      .on('mouseleave', () => setHoveredCase(null));

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
      console.warn('KlinikSyariah D3 chart skipped:', err);
    }
  }, [safeCases, chartWidth]);

  // Select case preset for Audit AI
  const handleSelectCaseForAudit = (caseId: string) => {
    setSelectedCaseId(caseId);
    const found = safeCases.find((c) => c.id === caseId);
    if (found) {
      setCustomBusinessName(found.namaUsaha);
      setCustomAkad(found.akadUtama);
      setCustomOmzet(Number(found.omzetBulananRp) || 12000000);
      setCustomMargin(Number(found.marginHalalPersen) || 25);
      setCustomScenario(found.kendalaUtama || '');
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuditing(true);
    try {
      const matched = safeCases.find((c) => c.id === selectedCaseId);
      const res = await diagnoseShariaBusiness({
        caseId: selectedCaseId,
        namaUsaha: customBusinessName,
        akad: customAkad,
        omzetBulananRp: Number(customOmzet) || 0,
        modalBerjalanRp:
          Number(matched?.modalBerjalanRp) || Math.round((Number(customOmzet) || 0) * 0.5),
        marginHalalPersen: Number(customMargin) || 20,
        statusHalal: matched?.statusSertifikasiHalal || 'Siap Pengajuan',
        keluhanAtauSkenario: customScenario,
      });
      setAuditResult(res);
    } catch (err) {
      console.warn('Audit run failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Interactive Calculator derivations
  const calculatorMetrics = useMemo(() => {
    if (calcMode === 'murabahah') {
      const marginAmount = Math.round(
        calcCapital * (calcMarginOrProfitPct / 100)
      );
      const totalSellingPrice = calcCapital + marginAmount;
      const monthlyInstallment = Math.round(
        totalSellingPrice / Math.max(1, calcTenorMonths)
      );
      const zakat25 = Math.round(marginAmount * 0.025);
      return {
        labelA: 'Harga Jual Transparan',
        valA: totalSellingPrice,
        labelB: 'Margin Tetap Disepakati',
        valB: marginAmount,
        labelC: `Angsuran / Bulan (${calcTenorMonths}x)`,
        valC: monthlyInstallment,
        zakat: zakat25,
        principle:
          'Harga jual Murabahah bersifat tetap sejak akad ditandatangani. Tidak ada bunga berbunga maupun denda keterlambatan yang masuk ke kas pendapatan.',
      };
    } else {
      const estimatedMonthlyNetProfit = Math.round(
        calcCapital * (calcMarginOrProfitPct / 100)
      );
      const pengelolaShare = Math.round(
        estimatedMonthlyNetProfit * (calcPengelolaNisbah / 100)
      );
      const investorShare = estimatedMonthlyNetProfit - pengelolaShare;
      const zakat25 = Math.round(pengelolaShare * 0.025);
      return {
        labelA: 'Proyeksi Laba Bersih',
        valA: estimatedMonthlyNetProfit,
        labelB: `Bagian Pengelola (${calcPengelolaNisbah}%)`,
        valB: pengelolaShare,
        labelC: `Bagian Shahibul Maal (${100 - calcPengelolaNisbah}%)`,
        valC: investorShare,
        zakat: zakat25,
        principle:
          'Mudharabah membagi hasil berdasarkan persentase laba nyata, bukan persentase tetap dari modal. Jika terjadi kerugian tanpa kelalaian pengelola, risiko finansial ditanggung pemilik modal.',
      };
    }
  }, [
    calcCapital,
    calcMarginOrProfitPct,
    calcMode,
    calcPengelolaNisbah,
    calcTenorMonths,
  ]);

  const handleSubmitConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    onAddConsultation({
      santriId: santri?.id || 'snt-001',
      santriNama: santri?.nama || 'Santri',
      namaUsaha: consultUsaha,
      konsultanNama: 'Dr. H. Ridwan Kamil, Lc., M.E.Sy (Dewan Syariah)',
      topikAkad: consultAkad,
      tanggal: consultDate,
      slotWaktu: consultSlot,
      keluhanBisnis:
        consultTopic.trim() ||
        'Konsultasi struktur akad bisnis syariah, pembukuan halal, dan kesiapan ekspansi usaha.',
      status: 'Menunggu Konfirmasi',
    });
    setIsConsultModalOpen(false);
    setConsultTopic('');
    setActiveSubTab('jadwal');
  };

  const handleSubmitNewUnit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCase({
      santriId: santri?.id || 'snt-001',
      santriNama: santri?.nama || 'Santri',
      namaUsaha: newUnitName.trim() || 'Usaha Baru SantriCity',
      sektor: newUnitSector,
      akadUtama: newUnitAkad,
      omzetBulananRp: Number(newUnitOmzet) || 0,
      modalBerjalanRp: Number(newUnitModal) || 0,
      marginHalalPersen: Number(newUnitMargin) || 20,
      skorKepatuhanSyariah: 92,
      statusSertifikasiHalal: 'Siap Pengajuan',
      statusZakatUsaha: 'Infaq Produktif',
      kendalaUtama:
        newUnitKendala.trim() ||
        'Membutuhkan review legalitas akad muamalah dan pembukuan keuangan syariah.',
      statusKlinik: 'Aktif Inkubasi',
    });
    setIsAddUnitModalOpen(false);
    setNewUnitName('');
    setNewUnitKendala('');
    setActiveSubTab('portofolio');
  };

  const handleExportCsv = () => {
    const rows = safeCases.map((c) => ({
      NamaUsaha: c.namaUsaha,
      Santri: c.santriNama,
      Sektor: c.sektor,
      AkadUtama: c.akadUtama,
      OmzetBulananRp: c.omzetBulananRp,
      MarginPersen: c.marginHalalPersen,
      SkorKepatuhanSyariah: c.skorKepatuhanSyariah,
      StatusHalal: c.statusSertifikasiHalal,
      StatusZakat: c.statusZakatUsaha,
    }));
    exportToCsv('klinik_bisnis_syariah_santricity', rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Klinik Bisnis Syariah Cerdas
            </h2>
            <span className="font-arabic text-emerald-400 text-lg font-bold">
              عيادة الأعمال الشرعية الذكية
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Pusat konsultasi fiqh muamalah, audit akad bebas riba dan gharar, kalkulator zakat perniagaan, serta inkubasi wirausaha santri berdaya saing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConsultModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Konsultasi Dewan Syariah</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Unit Usaha Inkubasi</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {kpiStats.totalUnits} Unit
          </div>
          <div className="text-[11px] text-neutral-400">
            {kpiStats.certifiedCount} tersertifikasi Halal BPJPH
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Indeks Kepatuhan Syariah</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {kpiStats.avgCompliance} / 100
          </div>
          <div className="text-[11px] text-neutral-400">
            Audit Bebas Riba, Gharar & Maysir
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Omzet Usaha Santri</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            Rp {(kpiStats.totalOmzet / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[11px] text-neutral-400">
            Akumulasi omzet bulanan binaan
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Zakat & Infaq Produktif (2.5%)</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            Rp {kpiStats.totalZakat.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-neutral-400">
            Alokasi pemberdayaan umat per bulan
          </div>
        </div>
      </div>

      {/* D3.js Sharia Compliance Overview Chart */}
      <section
        aria-label="Grafik Indeks Kepatuhan Syariah Usaha Santri"
        className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Skor Kepatuhan Muamalah & Akad Unit Usaha Santri
            </h3>
          </div>
          <div className="text-xs text-neutral-400">
            {hoveredCase ? (
              <span className="font-mono tabular-nums text-emerald-300">
                {hoveredCase.namaUsaha} · Omzet Rp{' '}
                {hoveredCase.omzetBulananRp.toLocaleString('id-ID')} · Margin{' '}
                {hoveredCase.marginHalalPersen}%
              </span>
            ) : (
              <span>Arahkan kursor ke batang untuk melihat rincian omzet dan akad</span>
            )}
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full overflow-hidden">
          <svg
            ref={chartSvgRef}
            role="img"
            aria-label="Grafik D3 skor kepatuhan syariah unit usaha santri"
            className="block w-full select-none"
          />
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto w-fit max-w-full">
        {(
          [
            { id: 'audit', label: 'Audit Akad & Diagnosis AI', icon: Sparkles },
            { id: 'kalkulator', label: 'Kalkulator Akad & Zakat', icon: Calculator },
            { id: 'portofolio', label: `Portofolio Inkubasi (${safeCases.length})`, icon: Briefcase },
            { id: 'jadwal', label: `Jadwal Konsultasi (${safeConsultations.length})`, icon: Calendar },
          ] as {
            id: ClinicSubTab;
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

      {/* TAB 1: AI SHARIA AUDIT & DIAGNOSIS */}
      {activeSubTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Workbench */}
          <form
            onSubmit={handleRunAudit}
            className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs h-fit"
          >
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                Parameter Diagnosis Akad & Usaha
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pilih usaha binaan atau masukkan skenario transaksi baru untuk diaudit kesesuaian syariahnya.
              </p>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                Muat Profil Usaha Terdaftar
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => handleSelectCaseForAudit(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                {safeCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaUsaha} ({c.akadUtama})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                Nama Usaha / Unit Bisnis
              </label>
              <input
                type="text"
                value={customBusinessName}
                onChange={(e) => setCustomBusinessName(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Akad Muamalah
                </label>
                <select
                  value={customAkad}
                  onChange={(e) =>
                    setCustomAkad(e.target.value as ShariaContractType)
                  }
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {AKAD_TYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">
                  Estimasi Margin (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={customMargin}
                  onChange={(e) => setCustomMargin(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                Skenario Transaksi / Kendala Bisnis
              </label>
              <textarea
                rows={3}
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="Contoh: Jual beli sistem pre-order dengan DP 30%, atau skema bagi hasil investor..."
                className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAuditing}
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`}
              />
              <span>
                {isAuditing
                  ? 'Menganalisis Kaidah Muamalah...'
                  : 'Jalankan Audit Syariah Cerdas'}
              </span>
            </button>
          </form>

          {/* Diagnosis Result Panel */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
            {!auditResult ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                Memuat hasil audit muamalah...
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                  <div>
                    <div className="text-[11px] font-mono tabular-nums text-neutral-400">
                      Akad {String(auditResult.akadDianalisis || '')} · Diperiksa{' '}
                      {String(auditResult.assessedAt || '')}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {String(auditResult.namaUsaha || '')}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right font-mono tabular-nums">
                    <div className="text-xl font-bold text-emerald-400">
                      {Number(auditResult.skorKepatuhan) || 0} / 100
                    </div>
                    <div className="text-[11px] text-amber-300 font-sans font-medium">
                      {String(auditResult.statusKepatuhan || '')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {typeof auditResult.ringkasanDiagnosis === 'string'
                    ? auditResult.ringkasanDiagnosis
                    : ''}
                </p>

                {/* 5 Sharia Compliance Pillars */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-neutral-200">
                    Evaluasi 5 Pilar Kepatuhan Fiqh Muamalah
                  </h4>
                  <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl bg-neutral-950/60">
                    {(Array.isArray(auditResult.evaluasiAkad)
                      ? auditResult.evaluasiAkad
                      : []
                    ).map((item, idx) => (
                      <div key={idx} className="p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">
                            {typeof item?.pilar === 'string' ? item.pilar : ''}
                          </span>
                          <span
                            className={
                              item?.status === 'Terpenuhi'
                                ? 'text-emerald-400 font-medium'
                                : 'text-amber-400 font-medium'
                            }
                          >
                            {typeof item?.status === 'string' ? item.status : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                          {typeof item?.catatan === 'string' ? item.catatan : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Execution Roadmap & Zakat Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">
                      Langkah Perbaikan & Akselerasi
                    </h4>
                    <ul className="space-y-1.5 text-neutral-300 text-[11px]">
                      {(Array.isArray(auditResult.rekomendasiEksekusi)
                        ? auditResult.rekomendasiEksekusi
                        : []
                      ).map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="font-semibold text-amber-300">
                      Nasihat Dewan Pengawas Syariah
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed italic">
                      &ldquo;
                      {typeof auditResult.nasihatDewanSyariah === 'string'
                        ? auditResult.nasihatDewanSyariah
                        : ''}
                      &rdquo;
                    </p>
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between font-mono tabular-nums text-[11px]">
                      <span className="text-neutral-400">
                        Zakat / Infaq 2.5%:
                      </span>
                      <span className="text-emerald-400 font-bold">
                        Rp{' '}
                        {Number(
                          auditResult.estimasiZakatBulananRp || 0
                        ).toLocaleString('id-ID')}
                        /bln
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHARIA CONTRACT & ZAKAT CALCULATOR */}
      {activeSubTab === 'kalkulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                Simulasi Perhitungan Akad Syariah
              </h3>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCalcMode('mudharabah')}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    calcMode === 'mudharabah'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Mudharabah
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('murabahah')}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    calcMode === 'murabahah'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Murabahah
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-neutral-400">
                  {calcMode === 'murabahah'
                    ? 'Harga Perolehan Barang (Rp)'
                    : 'Total Modal Usaha (Rp)'}
                </label>
                <span className="font-mono tabular-nums text-white font-semibold">
                  Rp {calcCapital.toLocaleString('id-ID')}
                </span>
              </div>
              <input
                type="range"
                min={1000000}
                max={50000000}
                step={500000}
                value={calcCapital}
                onChange={(e) => setCalcCapital(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-neutral-400">
                  {calcMode === 'murabahah'
                    ? 'Margin Keuntungan Disepakati (%)'
                    : 'Proyeksi Laba Bersih Bulanan (% dari Modal)'}
                </label>
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  {calcMarginOrProfitPct}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={calcMarginOrProfitPct}
                onChange={(e) =>
                  setCalcMarginOrProfitPct(Number(e.target.value))
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {calcMode === 'murabahah' ? (
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Tenor Cicilan Tanpa Denda Riba
                  </label>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {calcTenorMonths} Bulan
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={calcTenorMonths}
                  onChange={(e) => setCalcTenorMonths(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-neutral-400">
                    Nisbah Pengelola (Mudharib) vs Pemodal
                  </label>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {calcPengelolaNisbah}% : {100 - calcPengelolaNisbah}%
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={5}
                  value={calcPengelolaNisbah}
                  onChange={(e) =>
                    setCalcPengelolaNisbah(Number(e.target.value))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-6 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                Hasil Simulasi Transparan & Zakat Tijarah
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Perhitungan bebas bunga majemuk sesuai fatwa DSN-MUI.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-[11px] font-sans text-neutral-400">
                  {calculatorMetrics.labelA}
                </div>
                <div className="text-base font-bold text-white">
                  Rp {calculatorMetrics.valA.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-[11px] font-sans text-neutral-400">
                  {calculatorMetrics.labelB}
                </div>
                <div className="text-base font-bold text-emerald-400">
                  Rp {calculatorMetrics.valB.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-[11px] font-sans text-neutral-400">
                  {calculatorMetrics.labelC}
                </div>
                <div className="text-base font-bold text-cyan-400">
                  Rp {calculatorMetrics.valC.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="font-sans text-neutral-300 font-medium">
                  Alokasi Zakat Perniagaan / Infaq 2.5%
                </span>
                <span className="text-amber-400 font-bold">
                  Rp {calculatorMetrics.zakat.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {calculatorMetrics.principle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INCUBATED BUSINESS PORTFOLIO */}
      {activeSubTab === 'portofolio' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              Unit usaha santri dan koperasi binaan Klinik Bisnis Syariah SantriCity.
            </p>
            <button
              type="button"
              onClick={() => setIsAddUnitModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Daftarkan Unit Usaha</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeCases.map((biz) => (
              <article
                key={biz.id}
                className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                    <span>
                      {biz.sektor} · Akad {biz.akadUtama}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                      Kepatuhan {Number(biz.skorKepatuhanSyariah) || 0}/100
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {biz.namaUsaha}
                    </h4>
                    <div className="text-xs text-neutral-400">
                      Founder: {biz.santriNama} · {biz.statusKlinik}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {biz.kendalaUtama}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 font-mono tabular-nums text-[11px]">
                    <div>
                      <div className="text-neutral-500">Omzet / Bln</div>
                      <div className="text-white font-semibold">
                        Rp {((Number(biz.omzetBulananRp) || 0) / 1000000).toFixed(1)} Jt
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Margin Halal</div>
                      <div className="text-emerald-400 font-semibold">
                        {Number(biz.marginHalalPersen) || 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Sertifikasi</div>
                      <div className="text-amber-300 font-sans truncate">
                        {String(biz.statusSertifikasiHalal || '').replace(
                          'Tersertifikasi Halal ',
                          ''
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">
                    {biz.statusZakatUsaha}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectCaseForAudit(biz.id);
                        setActiveSubTab('audit');
                        buildAuditFromBusinessCase(biz)
                          .then(setAuditResult)
                          .catch((err) => console.warn('Audit load failed:', err));
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-emerald-300 cursor-pointer"
                    >
                      Audit AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultUsaha(biz.namaUsaha);
                        setConsultAkad(biz.akadUtama);
                        setIsConsultModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                    >
                      Konsultasi
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONSULTATION SCHEDULE TABLE */}
      {activeSubTab === 'jadwal' && (
        <section className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/70 text-neutral-400 border-b border-neutral-800">
                  <th className="py-3 px-4 font-semibold">Jadwal Sesi</th>
                  <th className="py-3 px-4 font-semibold">Usaha & Topik Akad</th>
                  <th className="py-3 px-4 font-semibold">Santri & Konsultan</th>
                  <th className="py-3 px-4 font-semibold">Fokus Konsultasi</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {(currentRole === 'ustaz' || currentRole === 'admin') && (
                    <th className="py-3 px-4 font-semibold text-right">
                      Tindakan
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {safeConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      Belum ada jadwal konsultasi klinik bisnis syariah.
                    </td>
                  </tr>
                ) : (
                  safeConsultations.map((ses) => (
                    <tr
                      key={ses.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                        <div className="text-white font-semibold">
                          {ses.tanggal}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {ses.slotWaktu}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {ses.namaUsaha}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          Akad {ses.topikAkad}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-200 font-medium">
                          {ses.santriNama}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {ses.konsultanNama}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-neutral-300 line-clamp-2">
                          {ses.keluhanBisnis}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            ses.status === 'Selesai'
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
                          {ses.status === 'Menunggu Konfirmasi' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateConsultationStatus(ses.id, 'Terjadwal')
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold cursor-pointer"
                            >
                              Konfirmasi
                            </button>
                          )}
                          {ses.status === 'Terjadwal' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateConsultationStatus(ses.id, 'Selesai')
                              }
                              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 font-medium cursor-pointer"
                            >
                              Selesai
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
      )}

      {/* Modal: Schedule Sharia Business Consultation */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Jadwalkan Sesi Klinik Bisnis Syariah
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConsultModalOpen(false)}
                aria-label="Tutup modal konsultasi"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitConsultation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Nama Usaha / Inisiatif
                  </label>
                  <input
                    type="text"
                    value={consultUsaha}
                    onChange={(e) => setConsultUsaha(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Topik Akad Muamalah
                  </label>
                  <select
                    value={consultAkad}
                    onChange={(e) =>
                      setConsultAkad(e.target.value as ShariaContractType)
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {AKAD_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={consultDate}
                    onChange={(e) => setConsultDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Slot Sesi</label>
                  <select
                    value={consultSlot}
                    onChange={(e) => setConsultSlot(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="10:00 - 11:00 WIB">10:00 - 11:00 WIB</option>
                    <option value="14:00 - 15:00 WIB">14:00 - 15:00 WIB</option>
                    <option value="16:00 - 17:00 WIB">16:00 - 17:00 WIB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Pertanyaan Akad / Rencana Bisnis
                </label>
                <textarea
                  rows={3}
                  value={consultTopic}
                  onChange={(e) => setConsultTopic(e.target.value)}
                  placeholder="Contoh: Review kontrak bagi hasil pemasok atau pengurusan sertifikasi halal BPJPH..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsConsultModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Kirim Permintaan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Business Unit */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                Daftarkan Unit Usaha ke Klinik Syariah
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                aria-label="Tutup modal pendaftaran usaha"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewUnit} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Nama Usaha Santri
                </label>
                <input
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Contoh: Kurma & Madu Asli SantriMart"
                  required
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Sektor</label>
                  <select
                    value={newUnitSector}
                    onChange={(e) =>
                      setNewUnitSector(
                        e.target.value as ShariaBusinessClinicCase['sektor']
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Agribisnis & Hidroponik">
                      Agribisnis & Hidroponik
                    </option>
                    <option value="Teknologi & EdTech">
                      Teknologi & EdTech
                    </option>
                    <option value="Kuliner & Produk Halal">
                      Kuliner & Produk Halal
                    </option>
                    <option value="Kriya & Busana Muslim">
                      Kriya & Busana Muslim
                    </option>
                    <option value="Jasa Kreatif & Media">
                      Jasa Kreatif & Media
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Akad Utama
                  </label>
                  <select
                    value={newUnitAkad}
                    onChange={(e) =>
                      setNewUnitAkad(e.target.value as ShariaContractType)
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {AKAD_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Omzet/Bln (Rp)
                  </label>
                  <input
                    type="number"
                    min={500000}
                    step={500000}
                    value={newUnitOmzet}
                    onChange={(e) => setNewUnitOmzet(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min={500000}
                    step={500000}
                    value={newUnitModal}
                    onChange={(e) => setNewUnitModal(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Margin (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={75}
                    value={newUnitMargin}
                    onChange={(e) => setNewUnitMargin(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Fokus Pembinaan & Kendala Akad
                </label>
                <textarea
                  rows={2}
                  value={newUnitKendala}
                  onChange={(e) => setNewUnitKendala(e.target.value)}
                  placeholder="Contoh: Ingin memastikan akad pemasaran ke toko mitra bebas gharar..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Daftarkan Usaha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
