import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import QRCode from 'qrcode';
import {
  FacilityBooking,
  Language,
  LightingMode,
  SantriProfile,
  SmartFacilityCategory,
  SmartFacilityZone,
  UserRole,
} from '../types/pesantren';
import { exportToCsv } from '../services/storageService';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  LampDesk,
  Minus,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Users,
  Volume2,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react';

interface StartupCenterModuleProps {
  santri: SantriProfile;
  facilities: SmartFacilityZone[];
  bookings: FacilityBooking[];
  onUpdateFacility: (updated: SmartFacilityZone) => void;
  onAddBooking: (booking: Omit<FacilityBooking, 'id' | 'kodeAksesQr'>) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    status: FacilityBooking['status']
  ) => void;
  currentRole: UserRole;
  lang: Language;
}

type TelemetryChartMetric = 'occupancy' | 'comfort-solar';

interface TooltipInfo {
  visible: boolean;
  label: string;
  metricA: string;
  metricB: string;
  note: string;
}

const CATEGORIES: SmartFacilityCategory[] = [
  'Semua',
  'Co-Working & Riset',
  'Lab AI & Robotika',
  'Studio Media & Dakwah',
  'Ruang Fokus Akustik',
];

const LIGHTING_OPTIONS: {
  mode: LightingMode;
  shortLabel: string;
  lux: number;
}[] = [
  { mode: 'Fokus Pagi (5000K)', shortLabel: '5000K Fokus', lux: 520 },
  { mode: 'Nyaman Siang (4000K)', shortLabel: '4000K Nyaman', lux: 460 },
  { mode: 'Teduh Malam (3000K)', shortLabel: '3000K Teduh', lux: 380 },
];

export const StartupCenterModule: React.FC<StartupCenterModuleProps> = ({
  santri,
  facilities,
  bookings,
  onUpdateFacility,
  onAddBooking,
  onUpdateBookingStatus,
  currentRole,
}) => {
  const safeFacilities = useMemo(
    () =>
      (Array.isArray(facilities) ? facilities : []).filter(
        (f): f is SmartFacilityZone =>
          Boolean(f && f.lingkunganCerdas && typeof f.nama === 'string')
      ),
    [facilities]
  );

  const safeBookings = useMemo(
    () =>
      (Array.isArray(bookings) ? bookings : []).filter(
        (b): b is FacilityBooking => Boolean(b && b.id && b.facilityNama)
      ),
    [bookings]
  );

  const [selectedCategory, setSelectedCategory] =
    useState<SmartFacilityCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMetric, setChartMetric] =
    useState<TelemetryChartMetric>('occupancy');
  const [bookingScope, setBookingScope] = useState<'santri' | 'all'>('santri');

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingFacilityId, setBookingFacilityId] = useState<string>(
    safeFacilities[0]?.id || 'fac-001'
  );
  const [bookingDate, setBookingDate] = useState<string>('2026-11-18');
  const [bookingSlot, setBookingSlot] = useState<string>('15:30 - 17:15 WIB');
  const [bookingMode, setBookingMode] =
    useState<FacilityBooking['modeBelajar']>('Deep Work / Fokus');
  const [bookingParticipants, setBookingParticipants] = useState<number>(2);
  const [bookingPurpose, setBookingPurpose] = useState<string>('');

  // QR Pass Modal State
  const [activeQrPass, setActiveQrPass] = useState<FacilityBooking | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Image error fallback tracking
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // D3 Chart Refs & Width
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(760);
  const [chartHoverInfo, setChartHoverInfo] = useState<TooltipInfo>({
    visible: false,
    label: '',
    metricA: '',
    metricB: '',
    note: '',
  });

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

  // Render QR Code inside pass modal
  useEffect(() => {
    if (activeQrPass && qrCanvasRef.current) {
      try {
        QRCode.toCanvas(
          qrCanvasRef.current,
          JSON.stringify({
            pass: activeQrPass.kodeAksesQr,
            santri: activeQrPass.santriNama,
            room: activeQrPass.facilityNama,
            slot: `${activeQrPass.tanggal} ${activeQrPass.slotWaktu}`,
          }),
          {
            width: 184,
            margin: 2,
            color: { dark: '#064e3b', light: '#ffffff' },
          },
          (err) => {
            if (err) console.error('QR generation failed:', err);
          }
        );
      } catch (err) {
        console.warn('QR canvas render skipped:', err);
      }
    }
  }, [activeQrPass]);

  // Aggregate infrastructure metrics across facilities
  const infraMetrics = useMemo(() => {
    if (!safeFacilities.length) {
      return {
        avgTemp: 22.2,
        avgAqi: 16,
        avgComfort: 96,
        avgSolar: 85,
        maxWifi: 2.5,
        minNoise: 26,
        maxNoise: 36,
        totalSeats: 84,
        occupiedSeats: 53,
      };
    }

    const count = safeFacilities.length;
    const avgTemp = Number(
      (
        safeFacilities.reduce((acc, f) => acc + (Number(f.lingkunganCerdas?.suhuCelsius) || 22), 0) /
        count
      ).toFixed(1)
    );
    const avgAqi = Math.round(
      safeFacilities.reduce((acc, f) => acc + (Number(f.lingkunganCerdas?.kualitasUdaraAqi) || 16), 0) /
        count
    );
    const avgComfort = Math.round(
      safeFacilities.reduce((acc, f) => acc + (Number(f.indeksKenyamanan) || 95), 0) / count
    );
    const avgSolar = Math.round(
      safeFacilities.reduce((acc, f) => acc + (Number(f.energiSolarPersen) || 85), 0) / count
    );
    const maxWifi = Math.max(
      ...safeFacilities.map((f) => Number(f.lingkunganCerdas?.wifiGbps) || 2.0)
    );
    const noises = safeFacilities.map((f) => Number(f.lingkunganCerdas?.tingkatKebisinganDb) || 32);
    const totalSeats = safeFacilities.reduce((acc, f) => acc + (Number(f.kapasitasKursi) || 1), 0);
    const occupiedSeats = safeFacilities.reduce((acc, f) => acc + (Number(f.terisiSaatIni) || 0), 0);

    return {
      avgTemp,
      avgAqi,
      avgComfort,
      avgSolar,
      maxWifi,
      minNoise: Math.min(...noises),
      maxNoise: Math.max(...noises),
      totalSeats,
      occupiedSeats,
    };
  }, [safeFacilities]);

  // Filtered Facilities
  const filteredFacilities = useMemo(() => {
    return safeFacilities.filter((f) => {
      const matchCategory =
        selectedCategory === 'Semua' || f.kategori === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const features = Array.isArray(f.infrastrukturUnggulan) ? f.infrastrukturUnggulan : [];
      const matchQuery =
        !q ||
        String(f.nama || '').toLowerCase().includes(q) ||
        String(f.kodeRuang || '').toLowerCase().includes(q) ||
        String(f.deskripsi || '').toLowerCase().includes(q) ||
        features.some((item) => String(item || '').toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [safeFacilities, selectedCategory, searchQuery]);

  // Filtered Bookings
  const visibleBookings = useMemo(() => {
    if (bookingScope === 'all' && (currentRole === 'ustaz' || currentRole === 'admin')) {
      return safeBookings;
    }
    return safeBookings.filter((b) => b.santriId === santri?.id);
  }, [safeBookings, bookingScope, currentRole, santri?.id]);

  // Render D3 Telemetry Bar Chart
  useEffect(() => {
    const svgEl = chartSvgRef.current;
    if (!svgEl || !safeFacilities.length) return;

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
      top: 16,
      right: isVeryNarrow ? 14 : isCompact ? 20 : 32,
      bottom: 32,
      left: isVeryNarrow ? 74 : isCompact ? 124 : 210,
    };

    const height = 228;
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

    const getPct = (d: SmartFacilityZone) => {
      const cap = Math.max(1, Number(d.kapasitasKursi) || 1);
      const occ = Math.max(0, Number(d.terisiSaatIni) || 0);
      return Math.min(100, Math.max(0, (occ / cap) * 100));
    };

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const yScale = d3
      .scaleBand<string>()
      .domain(safeFacilities.map((f) => f.id))
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

    // Tracks
    root
      .selectAll('rect.zone-track')
      .data(safeFacilities)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.id) ?? 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('rx', 5)
      .attr('fill', '#171717')
      .attr('stroke', '#262626');

    if (chartMetric === 'occupancy') {
      const bars = root
        .selectAll('rect.zone-fill')
        .data(safeFacilities)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.id) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('rx', 5)
        .attr('fill', (d) => (getPct(d) >= 85 ? '#f59e0b' : '#10b981'))
        .attr('width', 0);

      bars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => Math.max(4, xScale(getPct(d))));

      root
        .selectAll('text.zone-val')
        .data(safeFacilities)
        .enter()
        .append('text')
        .attr('y', (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('x', (d) => {
          const xEnd = xScale(getPct(d));
          return xEnd > innerWidth - 88 ? xEnd - 8 : xEnd + 8;
        })
        .attr('text-anchor', (d) =>
          xScale(getPct(d)) > innerWidth - 88 ? 'end' : 'start'
        )
        .attr('fill', (d) =>
          xScale(getPct(d)) > innerWidth - 88 ? '#0a0a0a' : '#e5e5e5'
        )
        .text(
          (d) =>
            `${Number(d.terisiSaatIni) || 0}/${Math.max(1, Number(d.kapasitasKursi) || 1)} (${Math.round(
              getPct(d)
            )}%)`
        );
    } else {
      // Comfort index (top half) + Solar power percentage (bottom half)
      const bandH = yScale.bandwidth();
      const halfH = Math.max(6, (bandH - 3) / 2);

      const comfortBars = root
        .selectAll('rect.comfort-fill')
        .data(safeFacilities)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.id) ?? 0)
        .attr('height', halfH)
        .attr('rx', 3)
        .attr('fill', '#10b981')
        .attr('width', 0);

      comfortBars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) =>
          Math.max(4, xScale(Math.min(100, Math.max(0, Number(d.indeksKenyamanan) || 0))))
        );

      const solarBars = root
        .selectAll('rect.solar-fill')
        .data(safeFacilities)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d) => (yScale(d.id) ?? 0) + halfH + 3)
        .attr('height', halfH)
        .attr('rx', 3)
        .attr('fill', '#06b6d4')
        .attr('width', 0);

      solarBars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) =>
          Math.max(4, xScale(Math.min(100, Math.max(0, Number(d.energiSolarPersen) || 0))))
        );

      root
        .selectAll('text.zone-val')
        .data(safeFacilities)
        .enter()
        .append('text')
        .attr('y', (d) => (yScale(d.id) ?? 0) + bandH / 2)
        .attr('dy', '0.35em')
        .attr('x', innerWidth - 8)
        .attr('text-anchor', 'end')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', isVeryNarrow ? '9px' : '10px')
        .attr('font-weight', '600')
        .attr('fill', isVeryNarrow ? '#e5e5e5' : '#0a0a0a')
        .text((d) =>
          isVeryNarrow
            ? `${Number(d.indeksKenyamanan) || 0}% · ${Number(d.energiSolarPersen) || 0}%`
            : `Nyaman ${Number(d.indeksKenyamanan) || 0}% · Surya ${Number(d.energiSolarPersen) || 0}%`
        );
    }

    // Left Y-axis labels
    const yLabels = root
      .selectAll('g.y-zone')
      .data(safeFacilities)
      .enter()
      .append('g')
      .attr(
        'transform',
        (d) => `translate(-10, ${(yScale(d.id) ?? 0) + yScale.bandwidth() / 2})`
      );

    yLabels
      .append('text')
      .attr('text-anchor', 'end')
      .attr('dy', '0.35em')
      .attr('fill', '#e5e5e5')
      .attr('font-size', isCompact ? '10px' : '11px')
      .attr('font-weight', '600')
      .text((d) =>
        isCompact
          ? String(d.kodeRuang || '')
          : `${String(d.kodeRuang || '')} · ${String(d.nama || '').split(' ').slice(0, 3).join(' ')}`
      );

    // Hit rectangles for hover summary readout
    root
      .selectAll('rect.zone-hit')
      .data(safeFacilities)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.id) ?? 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event: MouseEvent, d) => {
        const occPct = Math.round(getPct(d));
        setChartHoverInfo({
          visible: true,
          label: `${String(d.kodeRuang || '')} · ${String(d.nama || '')}`,
          metricA: `Okupansi: ${Number(d.terisiSaatIni) || 0}/${Math.max(1, Number(d.kapasitasKursi) || 1)} kursi (${occPct}%)`,
          metricB: `Kenyamanan ${Number(d.indeksKenyamanan) || 0}/100 · Surya ${Number(d.energiSolarPersen) || 0}%`,
          note: `Suhu ${Number(d.lingkunganCerdas?.suhuCelsius) || 22}°C · AQI ${Number(d.lingkunganCerdas?.kualitasUdaraAqi) || 16} · Kebisingan ${Number(d.lingkunganCerdas?.tingkatKebisinganDb) || 32} dB · Wi-Fi ${Number(d.lingkunganCerdas?.wifiGbps) || 2.5} Gbps`,
        });
      })
      .on('mouseleave', () => {
        setChartHoverInfo((prev) => ({ ...prev, visible: false }));
      });

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
      console.warn('StartupCenter D3 chart skipped:', err);
    }
  }, [chartMetric, chartWidth, safeFacilities]);

  // Compute comfort index deterministically from temperature & lighting settings
  const computeComfortIndex = (temp: number, aqi: number, noise: number) => {
    const tempPenalty = Math.abs(temp - 22.0) * 2.5;
    const aqiPenalty = Math.max(0, aqi - 15) * 0.4;
    const noisePenalty = Math.max(0, noise - 32) * 0.35;
    return Math.round(
      Math.max(78, Math.min(99, 99 - tempPenalty - aqiPenalty - noisePenalty))
    );
  };

  const handleAdjustTemperature = (zone: SmartFacilityZone, delta: number) => {
    const nextTemp = Number(
      Math.max(20.0, Math.min(26.0, zone.lingkunganCerdas.suhuCelsius + delta)).toFixed(1)
    );
    const nextComfort = computeComfortIndex(
      nextTemp,
      zone.lingkunganCerdas.kualitasUdaraAqi,
      zone.lingkunganCerdas.tingkatKebisinganDb
    );
    onUpdateFacility({
      ...zone,
      lingkunganCerdas: {
        ...zone.lingkunganCerdas,
        suhuCelsius: nextTemp,
      },
      indeksKenyamanan: nextComfort,
    });
  };

  const handleChangeLighting = (zone: SmartFacilityZone, mode: LightingMode) => {
    const match = LIGHTING_OPTIONS.find((opt) => opt.mode === mode);
    onUpdateFacility({
      ...zone,
      lingkunganCerdas: {
        ...zone.lingkunganCerdas,
        modePencahayaan: mode,
        pencahayaanLux: match ? match.lux : zone.lingkunganCerdas.pencahayaanLux,
      },
    });
  };

  const handleOpenBookingForZone = (facilityId: string) => {
    setBookingFacilityId(facilityId);
    setBookingPurpose('');
    setIsBookingModalOpen(true);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const targetZone = safeFacilities.find((f) => f.id === bookingFacilityId);
    if (!targetZone) return;

    onAddBooking({
      santriId: santri?.id || 'snt-001',
      santriNama: santri?.nama || 'Santri',
      facilityId: targetZone.id,
      facilityNama: targetZone.nama,
      tanggal: bookingDate,
      slotWaktu: bookingSlot,
      modeBelajar: bookingMode,
      jumlahPeserta: Number(bookingParticipants) || 1,
      keperluan:
        bookingPurpose.trim() ||
        'Belajar mandiri, riset proyek startup santri, dan penguatan literasi digital.',
      status: 'Dikonfirmasi',
    });

    // Update current seat occupancy realistically (capped at capacity)
    const cap = Math.max(1, Number(targetZone.kapasitasKursi) || 1);
    const nextOccupied = Math.min(
      cap,
      (Number(targetZone.terisiSaatIni) || 0) + (Number(bookingParticipants) || 1)
    );
    const nextStatus: SmartFacilityZone['statusOperasional'] =
      nextOccupied / cap >= 0.85
        ? 'Hampir Penuh'
        : targetZone.statusOperasional;

    onUpdateFacility({
      ...targetZone,
      terisiSaatIni: nextOccupied,
      statusOperasional: nextStatus,
    });

    setIsBookingModalOpen(false);
    setBookingPurpose('');
  };

  const handleExportFacilities = () => {
    const rows = safeFacilities.map((f) => ({
      Kode: f.kodeRuang,
      Fasilitas: f.nama,
      Kategori: f.kategori,
      Lantai: f.lantai,
      Terisi: f.terisiSaatIni,
      Kapasitas: f.kapasitasKursi,
      SuhuC: f.lingkunganCerdas?.suhuCelsius ?? 22,
      AQI: f.lingkunganCerdas?.kualitasUdaraAqi ?? 16,
      KebisinganDb: f.lingkunganCerdas?.tingkatKebisinganDb ?? 32,
      WifiGbps: f.lingkunganCerdas?.wifiGbps ?? 2.5,
      IndeksKenyamanan: f.indeksKenyamanan,
      EnergiSuryaPersen: f.energiSolarPersen,
    }));
    exportToCsv('startup_center_fasilitas_cerdas', rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight">
              StartUp Center & Fasilitas Cerdas
            </h2>
            <span className="font-arabic text-emerald-400 text-lg font-bold">
              مركز الابتكار والتعلم الذكي
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Infrastruktur ruang belajar berdaya energi surya hybrid, jaringan fiber 2.5 Gbps, kontrol suhu & pencahayaan sirkadian untuk kenyamanan belajar santri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportFacilities}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleOpenBookingForZone(safeFacilities[0]?.id || 'fac-001')
            }
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Reservasi Ruang Belajar</span>
          </button>
        </div>
      </div>

      {/* 4-Column Infrastructure KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Konektivitas Riset</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {infraMetrics.maxWifi} Gbps
          </div>
          <div className="text-[11px] text-neutral-400">
            Wi-Fi 6E Mesh · Dual-ISP Fiber
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Suplai Energi Surya</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
            {infraMetrics.avgSolar}%
          </div>
          <div className="text-[11px] text-neutral-400">
            Solar Hybrid + UPS Cadangan Aktif
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Termal & Udara Bersih</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-bold text-white">
              {infraMetrics.avgTemp}°C
            </span>
            <span className="text-xs text-emerald-400">
              AQI {infraMetrics.avgAqi} Baik
            </span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Filtrasi HEPA-13 & Sirkulasi Segar
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Indeks Kenyamanan & Akustik</span>
            <Volume2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-bold text-amber-400">
              {infraMetrics.avgComfort}
            </span>
            <span className="text-xs text-neutral-400">
              / 100 · {infraMetrics.minNoise}–{infraMetrics.maxNoise} dB
            </span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Keterisian {infraMetrics.occupiedSeats}/{infraMetrics.totalSeats} Kursi
          </div>
        </div>
      </div>

      {/* D3.js Telemetry Chart Card */}
      <section
        aria-label="Grafik Telemetri Ruang StartUp Center"
        className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Pemantauan Okupansi, Kenyamanan & Energi Zona
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Arahkan kursor pada batang zona untuk melihat rincian suhu, kebisingan akustik, dan kecepatan jaringan.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartMetric('occupancy')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMetric === 'occupancy'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Okupansi Kursi (%)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('comfort-solar')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMetric === 'comfort-solar'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Kenyamanan & Surya
            </button>
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full overflow-hidden">
          <svg
            ref={chartSvgRef}
            role="img"
            aria-label="Grafik D3 okupansi dan kenyamanan zona StartUp Center"
            className="block w-full select-none"
          />
        </div>

        <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {chartHoverInfo.visible ? (
            <div className="flex flex-wrap items-center gap-2 text-neutral-200">
              <span className="font-semibold text-white">{chartHoverInfo.label}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="font-mono tabular-nums text-emerald-400">
                {chartHoverInfo.metricA}
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="font-mono tabular-nums text-cyan-400">
                {chartHoverInfo.metricB}
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-neutral-400">{chartHoverInfo.note}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-neutral-400">
              {chartMetric === 'occupancy' ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-xs bg-emerald-500 inline-block" />
                    <span>Kapasitas Lapang (&lt;85%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-xs bg-amber-500 inline-block" />
                    <span>Hampir Penuh (&ge;85%)</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-xs bg-emerald-500 inline-block" />
                    <span>Indeks Kenyamanan Belajar (%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-xs bg-cyan-500 inline-block" />
                    <span>Kontribusi Daya Surya (%)</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === category
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ruang, fasilitas, Wi-Fi..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Smart Facility Zone Cards Grid */}
      {filteredFacilities.length === 0 ? (
        <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
          <Building2 className="w-6 h-6 text-neutral-500 mx-auto" />
          <p className="text-sm font-medium text-neutral-300">
            Tidak ada zona fasilitas yang sesuai dengan pencarian.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Semua');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
          >
            Tampilkan Semua Zona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFacilities.map((zone) => {
            const cap = Math.max(1, Number(zone.kapasitasKursi) || 1);
            const occ = Math.max(0, Number(zone.terisiSaatIni) || 0);
            const occRatio = occ / cap;
            const occPct = Math.round(occRatio * 100);
            const barColorClass =
              occPct >= 85 ? 'fill-amber-500' : 'fill-emerald-500';
            const imgFailed = !!failedImages[zone.id];
            const zoneFeatures = Array.isArray(zone.infrastrukturUnggulan)
              ? zone.infrastrukturUnggulan
              : [];

            return (
              <article
                key={zone.id}
                className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* 16:9 Architectural Preview with Gradient Scrim */}
                  <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
                    {!imgFailed ? (
                      <img
                        src={zone.fotoUrl}
                        alt={zone.nama}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [zone.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-emerald-950/30 flex flex-col items-center justify-center gap-2 text-neutral-400">
                        <Cpu className="w-8 h-8 text-emerald-400" />
                        <span className="text-xs font-medium">{zone.nama}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-neutral-300 font-mono tabular-nums">
                          <span>{zone.kodeRuang}</span>
                          <span aria-hidden="true">·</span>
                          <span>{zone.lantai}</span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug mt-0.5">
                          {zone.nama}
                        </h3>
                      </div>

                      <span className="font-arabic text-sm text-emerald-300 font-semibold shrink-0">
                        {zone.namaArab}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    {/* Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-neutral-400">
                        <span className="text-neutral-200 font-medium">
                          {zone.kategori}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            zone.statusOperasional === 'Hampir Penuh'
                              ? 'text-amber-400 font-medium'
                              : 'text-emerald-400 font-medium'
                          }
                        >
                          {zone.statusOperasional}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Nyaman {zone.indeksKenyamanan}/100
                        </span>
                      </div>

                      <div className="font-mono tabular-nums text-neutral-300">
                        {zone.terisiSaatIni}/{zone.kapasitasKursi} Kursi ({occPct}%)
                      </div>
                    </div>

                    {/* Clean SVG Occupancy Bar (No inline styles) */}
                    <svg
                      className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-800 block"
                      viewBox="0 0 100 4"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(100, Math.max(2, occPct))}
                        height="4"
                        className={barColorClass}
                      />
                    </svg>

                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {zone.deskripsi}
                    </p>

                    {/* Infrastructure Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-neutral-300">
                      {zoneFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Smart Comfort Control Bar */}
                    <div className="pt-4 border-t border-neutral-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Kontrol Kenyamanan Belajar Cerdas</span>
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                          {zone.lingkunganCerdas.tingkatKebisinganDb} dB · AQI{' '}
                          {zone.lingkunganCerdas.kualitasUdaraAqi} ·{' '}
                          {zone.lingkunganCerdas.pencahayaanLux} lux
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Thermal Control */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800">
                          <div className="flex items-center gap-2 text-xs">
                            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-neutral-400">Suhu AC</span>
                            <span className="font-mono tabular-nums font-bold text-white">
                              {zone.lingkunganCerdas.suhuCelsius}°C
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustTemperature(zone, -0.5)}
                              aria-label={`Turunkan suhu ${zone.nama}`}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustTemperature(zone, 0.5)}
                              aria-label={`Naikkan suhu ${zone.nama}`}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Circadian Lighting Switcher */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400 shrink-0">
                            <LampDesk className="w-3.5 h-3.5 text-amber-400" />
                            <span>Lampu</span>
                          </div>
                          <select
                            aria-label={`Mode pencahayaan ${zone.nama}`}
                            value={zone.lingkunganCerdas.modePencahayaan}
                            onChange={(e) =>
                              handleChangeLighting(
                                zone,
                                e.target.value as LightingMode
                              )
                            }
                            className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer truncate"
                          >
                            {LIGHTING_OPTIONS.map((opt) => (
                              <option
                                key={opt.mode}
                                value={opt.mode}
                                className="bg-neutral-900 text-white"
                              >
                                {opt.shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="px-5 py-3.5 bg-neutral-950/60 border-t border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono tabular-nums">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{zone.lingkunganCerdas.dayaCadanganUps}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBookingForZone(zone.id)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Reservasi Zona Ini
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Smart Access & Reservations Table */}
      <section className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Jadwal Reservasi & Akses Pintu QR Cerdas
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Daftar pemesanan zona belajar dengan tiket QR otomatis untuk akses Smart Lock StartUp Center.
            </p>
          </div>

          {(currentRole === 'ustaz' || currentRole === 'admin') && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBookingScope('santri')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  bookingScope === 'santri'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Santri Terpilih
              </button>
              <button
                type="button"
                onClick={() => setBookingScope('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  bookingScope === 'all'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Semua Santri
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/70 text-neutral-400 border-b border-neutral-800">
                <th className="py-3 px-4 font-semibold">Tanggal & Sesi</th>
                <th className="py-3 px-4 font-semibold">Zona & Mode Belajar</th>
                <th className="py-3 px-4 font-semibold">Santri & Peserta</th>
                <th className="py-3 px-4 font-semibold">Keperluan Riset / Belajar</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Belum ada jadwal reservasi StartUp Center untuk santri ini.
                  </td>
                </tr>
              ) : (
                visibleBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                      <div className="text-neutral-200 font-semibold">
                        {booking.tanggal}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {booking.slotWaktu}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">
                        {booking.facilityNama}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        {booking.modeBelajar}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-neutral-200 font-medium">
                        {booking.santriNama}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono tabular-nums flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{booking.jumlahPeserta} Orang</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-neutral-300 line-clamp-2">
                        {booking.keperluan}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          booking.status === 'Sedang Berlangsung'
                            ? 'text-emerald-400'
                            : booking.status === 'Dikonfirmasi'
                            ? 'text-cyan-400'
                            : booking.status === 'Dibatalkan'
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {booking.status !== 'Dibatalkan' && (
                          <button
                            type="button"
                            onClick={() => setActiveQrPass(booking)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-neutral-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Tiket QR</span>
                          </button>
                        )}
                        {booking.status === 'Dikonfirmasi' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateBookingStatus(booking.id, 'Dibatalkan')
                            }
                            className="px-2 py-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: New Workspace Reservation */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Reservasi Zona StartUp Center
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                aria-label="Tutup modal reservasi"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Pilih Zona Fasilitas Cerdas
                </label>
                <select
                  value={bookingFacilityId}
                  onChange={(e) => setBookingFacilityId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {safeFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.kodeRuang} · {f.nama} (Tersedia{' '}
                      {Math.max(0, (Number(f.kapasitasKursi) || 0) - (Number(f.terisiSaatIni) || 0))} kursi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Slot Sesi</label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="08:00 - 10:00 WIB">08:00 - 10:00 WIB</option>
                    <option value="13:00 - 14:30 WIB">13:00 - 14:30 WIB</option>
                    <option value="15:30 - 17:15 WIB">15:30 - 17:15 WIB</option>
                    <option value="19:30 - 21:00 WIB">19:30 - 21:00 WIB</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Mode Belajar
                  </label>
                  <select
                    value={bookingMode}
                    onChange={(e) =>
                      setBookingMode(
                        e.target.value as FacilityBooking['modeBelajar']
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Deep Work / Fokus">Deep Work / Fokus</option>
                    <option value="Riset & Coding">Riset & Coding</option>
                    <option value="Diskusi Tim Startup">
                      Diskusi Tim Startup
                    </option>
                    <option value="Produksi Konten">Produksi Konten</option>
                    <option value="Murajaah Akustik">Murajaah Akustik</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">
                    Jumlah Peserta
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={bookingParticipants}
                    onChange={(e) =>
                      setBookingParticipants(Number(e.target.value))
                    }
                    required
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Agenda Riset / Pembelajaran
                </label>
                <textarea
                  rows={2}
                  value={bookingPurpose}
                  onChange={(e) => setBookingPurpose(e.target.value)}
                  placeholder="Contoh: Uji coba IoT hidroponik asrama atau rekaman kajian tematik..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Terbitkan Tiket QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Smart Lock QR Pass */}
      {activeQrPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Smart Access Pass</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveQrPass(null)}
                aria-label="Tutup tiket QR"
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {activeQrPass.facilityNama}
              </h4>
              <p className="text-xs text-neutral-400 font-mono tabular-nums">
                {activeQrPass.tanggal} · {activeQrPass.slotWaktu}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white inline-block mx-auto">
              <canvas ref={qrCanvasRef} />
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-mono tabular-nums text-emerald-400 font-semibold">
                {activeQrPass.kodeAksesQr}
              </div>
              <div className="text-neutral-400">
                Pemesan: <span className="text-neutral-200">{activeQrPass.santriNama}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveQrPass(null)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
