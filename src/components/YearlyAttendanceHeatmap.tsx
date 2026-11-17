import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PresensiHarian, SantriProfile } from '../types/pesantren';
import {
  Calendar,
  Flame,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface YearlyAttendanceHeatmapProps {
  santri: SantriProfile;
  presensiList: PresensiHarian[];
}

type SessionFocus = 'all' | 'subuh' | 'sekolah' | 'malam';

interface DayAttendanceCell {
  dateStr: string;
  dateObj: Date;
  monthIndex: number;
  dayOfWeek: number; // 0 = Mon .. 6 = Sun
  weekIndex: number;
  score: number | null; // 0..100, null if future / no schedule
  tier: 'empty' | 'critical' | 'warning' | 'good' | 'great' | 'perfect';
  subuh: PresensiHarian['subuh'];
  dhuha: PresensiHarian['dhuha'];
  sekolahPagi: PresensiHarian['sekolahPagi'];
  ashar: PresensiHarian['ashar'];
  halaqahSore: PresensiHarian['halaqahSore'];
  maghribIsya: PresensiHarian['maghribIsya'];
  belajarMalam: PresensiHarian['belajarMalam'];
  keterangan: string;
  isActualRecord: boolean;
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahad'];
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreStatus(val: string): number {
  if (val === 'Hadir') return 1;
  if (val === 'Masbuk') return 0.72;
  if (val === 'Izin') return 0.45;
  if (val === 'Sakit') return 0.35;
  return 0;
}

function computeCellScore(
  cell: Pick<
    DayAttendanceCell,
    | 'subuh'
    | 'dhuha'
    | 'sekolahPagi'
    | 'ashar'
    | 'halaqahSore'
    | 'maghribIsya'
    | 'belajarMalam'
  >,
  focus: SessionFocus
): number {
  if (focus === 'subuh') {
    return Math.round(scoreStatus(cell.subuh) * 100);
  }
  if (focus === 'sekolah') {
    return Math.round(scoreStatus(cell.sekolahPagi) * 100);
  }
  if (focus === 'malam') {
    return Math.round(
      ((scoreStatus(cell.halaqahSore) +
        scoreStatus(cell.maghribIsya) +
        scoreStatus(cell.belajarMalam)) /
        3) *
        100
    );
  }
  const total =
    scoreStatus(cell.subuh) +
    scoreStatus(cell.dhuha) +
    scoreStatus(cell.sekolahPagi) +
    scoreStatus(cell.ashar) +
    scoreStatus(cell.halaqahSore) +
    scoreStatus(cell.maghribIsya) +
    scoreStatus(cell.belajarMalam);
  return Math.round((total / 7) * 100);
}

function getTierFromScore(
  score: number | null
): DayAttendanceCell['tier'] {
  if (score === null) return 'empty';
  if (score === 100) return 'perfect';
  if (score >= 88) return 'great';
  if (score >= 72) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

function getTierColor(tier: DayAttendanceCell['tier']): string {
  switch (tier) {
    case 'perfect':
      return '#34d399'; // emerald-400
    case 'great':
      return '#10b981'; // emerald-500
    case 'good':
      return '#0284c7'; // sky-600
    case 'warning':
      return '#d97706'; // amber-600
    case 'critical':
      return '#e11d48'; // rose-600
    case 'empty':
    default:
      return '#171717'; // neutral-900
  }
}

export const YearlyAttendanceHeatmap: React.FC<
  YearlyAttendanceHeatmapProps
> = ({ santri, presensiList }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [sessionFocus, setSessionFocus] = useState<SessionFocus>('all');
  const [containerWidth, setContainerWidth] = useState<number>(780);
  const [activeCell, setActiveCell] = useState<DayAttendanceCell | null>(null);

  // Track responsive container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(
        Math.max(320, Math.floor(el.getBoundingClientRect().width))
      );
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Index actual presensi records by YYYY-MM-DD
  const actualByDate = useMemo(() => {
    const map = new Map<string, PresensiHarian>();
    presensiList.forEach((item) => {
      if (item.santriId === santri.id) {
        map.set(item.tanggal, item);
      }
    });
    return map;
  }, [presensiList, santri.id]);

  // Cutoff date for 2026 active academic calendar (or latest actual entry if later)
  const latestActualDateStr = useMemo(() => {
    const dates = Array.from(actualByDate.keys()).sort();
    const latest = dates[dates.length - 1];
    const baseline = '2026-09-29';
    return latest && latest > baseline ? latest : baseline;
  }, [actualByDate]);

  // Build 365/366-day yearly dataset combining actual records + deterministic pesantren yearly history
  const yearlyCells = useMemo<DayAttendanceCell[]>(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const allDays = d3.timeDays(startDate, d3.timeDay.offset(endDate, 1));

    // Align weeks starting Monday (0..6)
    const firstDayMondayIdx = (startDate.getDay() + 6) % 7;
    const baseReliability = Math.min(
      0.97,
      Math.max(0.84, (santri.poinDisiplin || 92) / 100)
    );

    return allDays.map((dateObj, idx) => {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeek = (dateObj.getDay() + 6) % 7; // Mon=0 .. Sun=6
      const weekIndex = Math.floor((idx + firstDayMondayIdx) / 7);

      const actual = actualByDate.get(dateStr);
      if (actual) {
        const draft = {
          subuh: actual.subuh,
          dhuha: actual.dhuha,
          sekolahPagi: actual.sekolahPagi,
          ashar: actual.ashar,
          halaqahSore: actual.halaqahSore,
          maghribIsya: actual.maghribIsya,
          belajarMalam: actual.belajarMalam,
        };
        const score = computeCellScore(draft, sessionFocus);
        return {
          dateStr,
          dateObj,
          monthIndex: dateObj.getMonth(),
          dayOfWeek,
          weekIndex,
          score,
          tier: getTierFromScore(score),
          ...draft,
          keterangan: actual.keterangan || 'Tercatat oleh Musyrif Asrama',
          isActualRecord: true,
        };
      }

      // Leave future 2026 dates beyond current academic date empty
      if (selectedYear === 2026 && dateStr > latestActualDateStr) {
        return {
          dateStr,
          dateObj,
          monthIndex: dateObj.getMonth(),
          dayOfWeek,
          weekIndex,
          score: null,
          tier: 'empty',
          subuh: 'Hadir',
          dhuha: 'Hadir',
          sekolahPagi: 'Hadir',
          ashar: 'Hadir',
          halaqahSore: 'Hadir',
          maghribIsya: 'Hadir',
          belajarMalam: 'Hadir',
          keterangan: 'Jadwal mendatang belum berlangsung',
          isActualRecord: false,
        };
      }

      // Deterministic seasonal & behavioral synthesis for historical days
      const seed = hashSeed(`${santri.id}-${dateStr}`);
      const r1 = (seed % 1000) / 1000;
      const r2 = ((seed >>> 10) % 1000) / 1000;
      const r3 = ((seed >>> 20) % 1000) / 1000;

      // Subtle realistic patterns: mid-year transition / exam weeks & weekend home permits
      const isRamadhanBreakWindow =
        (selectedYear === 2026 && mm === '03' && Number(dd) >= 18 && Number(dd) <= 24) ||
        (selectedYear === 2025 && mm === '04' && Number(dd) >= 1 && Number(dd) <= 7);
      const isPancarobaWindow = mm === '02' || mm === '08';

      let subuh: PresensiHarian['subuh'] = 'Hadir';
      let dhuha: PresensiHarian['dhuha'] = 'Hadir';
      let sekolahPagi: PresensiHarian['sekolahPagi'] = 'Hadir';
      let ashar: PresensiHarian['ashar'] = 'Hadir';
      let halaqahSore: PresensiHarian['halaqahSore'] = 'Hadir';
      let maghribIsya: PresensiHarian['maghribIsya'] = 'Hadir';
      let belajarMalam: PresensiHarian['belajarMalam'] = 'Hadir';
      let keterangan = 'Tertib penuh seluruh rangkaian ibadah & KBM';

      if (isRamadhanBreakWindow) {
        subuh = 'Izin';
        dhuha = 'Izin';
        sekolahPagi = 'Izin';
        ashar = 'Izin';
        halaqahSore = 'Izin';
        maghribIsya = 'Izin';
        belajarMalam = 'Izin';
        keterangan = 'Izin pulang resmi masa liburan pesantren bersama keluarga';
      } else if (isPancarobaWindow && r1 > 0.94) {
        subuh = 'Sakit';
        sekolahPagi = 'Sakit';
        ashar = 'Sakit';
        dhuha = 'Izin';
        halaqahSore = 'Izin';
        maghribIsya = 'Izin';
        belajarMalam = 'Izin';
        keterangan = 'Istirahat pemulihan ringan di Poskestren / asrama';
      } else {
        // Occasional Subuh masbuk on Monday/Sunday transitions or fatigue days
        const subuhPenalty = dayOfWeek === 0 || dayOfWeek === 6 ? 0.05 : 0.015;
        if (r1 > baseReliability - subuhPenalty) {
          subuh = r2 > 0.25 ? 'Masbuk' : 'Alpa';
          keterangan =
            subuh === 'Masbuk'
              ? 'Masbuk 1 rakaat pada sholat Subuh berjamaah'
              : 'Terlambat bangun menjelang iqomah Subuh';
        }
        if (r2 > 0.93) {
          ashar = 'Masbuk';
          keterangan = 'Masbuk Ashar setelah kegiatan ekstrakurikuler/piket';
        }
        if (r3 > 0.965) {
          belajarMalam = 'Izin';
          keterangan = 'Izin kegiatan organisasi/konsultasi pembina saat jam malam';
        }
      }

      const draft = {
        subuh,
        dhuha,
        sekolahPagi,
        ashar,
        halaqahSore,
        maghribIsya,
        belajarMalam,
      };
      const score = computeCellScore(draft, sessionFocus);

      return {
        dateStr,
        dateObj,
        monthIndex: dateObj.getMonth(),
        dayOfWeek,
        weekIndex,
        score,
        tier: getTierFromScore(score),
        ...draft,
        keterangan,
        isActualRecord: false,
      };
    });
  }, [
    selectedYear,
    actualByDate,
    latestActualDateStr,
    santri.id,
    santri.poinDisiplin,
    sessionFocus,
  ]);

  // Set default inspected day (latest recorded day with data)
  useEffect(() => {
    const recorded = yearlyCells.filter((c) => c.score !== null);
    if (recorded.length > 0) {
      const latestActual = [...recorded]
        .reverse()
        .find((c) => c.isActualRecord);
      setActiveCell(latestActual || recorded[recorded.length - 1]);
    } else {
      setActiveCell(null);
    }
  }, [selectedYear, santri.id, sessionFocus, yearlyCells]);

  // Compute annual pattern insights for guardians
  const insights = useMemo(() => {
    const activeDays = yearlyCells.filter((c) => c.score !== null);
    if (activeDays.length === 0) {
      return {
        avgScore: 0,
        perfectDays: 0,
        bestStreak: 0,
        subuhOnTimeRate: 0,
        weakestDayLabel: '-',
        strongestMonthLabel: '-',
      };
    }

    const avgScore = Number(
      (
        activeDays.reduce((acc, c) => acc + (c.score || 0), 0) /
        activeDays.length
      ).toFixed(1)
    );
    const perfectDays = activeDays.filter((c) => c.score === 100).length;
    const subuhOnTimeCount = activeDays.filter(
      (c) => c.subuh === 'Hadir'
    ).length;
    const subuhOnTimeRate = Number(
      ((subuhOnTimeCount / activeDays.length) * 100).toFixed(1)
    );

    // Best streak of >= 88% score
    let bestStreak = 0;
    let currStreak = 0;
    activeDays.forEach((c) => {
      if ((c.score || 0) >= 88) {
        currStreak++;
        if (currStreak > bestStreak) bestStreak = currStreak;
      } else {
        currStreak = 0;
      }
    });

    // Day-of-week average to spot weakest day
    const daySums = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
    activeDays.forEach((c) => {
      daySums[c.dayOfWeek].sum += c.score || 0;
      daySums[c.dayOfWeek].count += 1;
    });
    let weakestIdx = 0;
    let weakestAvg = 101;
    daySums.forEach((d, idx) => {
      if (d.count > 0) {
        const avg = d.sum / d.count;
        if (avg < weakestAvg) {
          weakestAvg = avg;
          weakestIdx = idx;
        }
      }
    });

    // Strongest month
    const monthSums = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
    activeDays.forEach((c) => {
      monthSums[c.monthIndex].sum += c.score || 0;
      monthSums[c.monthIndex].count += 1;
    });
    let bestMonthIdx = 0;
    let bestMonthAvg = -1;
    monthSums.forEach((m, idx) => {
      if (m.count > 0) {
        const avg = m.sum / m.count;
        if (avg > bestMonthAvg) {
          bestMonthAvg = avg;
          bestMonthIdx = idx;
        }
      }
    });

    return {
      avgScore,
      perfectDays,
      bestStreak,
      subuhOnTimeRate,
      weakestDayLabel: `${DAY_LABELS[weakestIdx]} (${weakestAvg.toFixed(1)}%)`,
      strongestMonthLabel: `${MONTH_LABELS[bestMonthIdx]} (${bestMonthAvg.toFixed(1)}%)`,
    };
  }, [yearlyCells]);

  // Render D3 Calendar Heatmap SVG
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || yearlyCells.length === 0) return;

    const maxWeek = d3.max(yearlyCells, (d) => d.weekIndex) || 52;
    const numWeeks = maxWeek + 1;

    const margin = { top: 22, right: 12, bottom: 10, left: 36 };
    const availableForGrid = Math.max(660, containerWidth - margin.left - margin.right);
    const cellStep = Math.floor(availableForGrid / numWeeks);
    const cellSize = Math.max(9, Math.min(14, cellStep - 3));
    const step = cellSize + 3;

    const svgWidth = margin.left + numWeeks * step + margin.right;
    const svgHeight = margin.top + 7 * step + margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Day-of-week labels (Mon, Wed, Fri, Sun)
    [0, 2, 4, 6].forEach((dayIdx) => {
      root
        .append('text')
        .attr('x', -8)
        .attr('y', dayIdx * step + cellSize / 2 + 3)
        .attr('text-anchor', 'end')
        .attr('fill', '#737373')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(DAY_LABELS[dayIdx]);
    });

    // Month labels positioned at first week containing day 1..7 of each month
    const monthPositions = new Map<number, number>();
    yearlyCells.forEach((cell) => {
      if (cell.dateObj.getDate() <= 7 && !monthPositions.has(cell.monthIndex)) {
        monthPositions.set(cell.monthIndex, cell.weekIndex);
      }
    });

    Array.from(monthPositions.entries()).forEach(([monthIdx, weekIdx]) => {
      root
        .append('text')
        .attr('x', weekIdx * step)
        .attr('y', -8)
        .attr('fill', '#a3a3a3')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(MONTH_LABELS[monthIdx]);
    });

    // Day cells
    const rects = root
      .selectAll<SVGRectElement, DayAttendanceCell>('rect.heatmap-cell')
      .data(yearlyCells, (d) => d.dateStr)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', (d) => d.weekIndex * step)
      .attr('y', (d) => d.dayOfWeek * step)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 2.5)
      .attr('fill', (d) => getTierColor(d.tier))
      .attr('stroke', (d) =>
        activeCell?.dateStr === d.dateStr
          ? '#f8fafc'
          : d.isActualRecord
          ? '#6ee7b7'
          : d.tier === 'empty'
          ? '#262626'
          : 'transparent'
      )
      .attr('stroke-width', (d) =>
        activeCell?.dateStr === d.dateStr ? 1.6 : d.isActualRecord ? 1.1 : 0.8
      )
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.6);
        setActiveCell(d);
      })
      .on('mouseleave', function (_event, d) {
        const isSelected = activeCell?.dateStr === d.dateStr;
        d3.select(this)
          .attr(
            'stroke',
            isSelected
              ? '#f8fafc'
              : d.isActualRecord
              ? '#6ee7b7'
              : d.tier === 'empty'
              ? '#262626'
              : 'transparent'
          )
          .attr('stroke-width', isSelected ? 1.6 : d.isActualRecord ? 1.1 : 0.8);
      })
      .on('click', (_event, d) => {
        setActiveCell(d);
      });

    rects
      .append('title')
      .text((d) =>
        d.score === null
          ? `${d.dateStr}: Belum terjadwal`
          : `${d.dateStr}: Skor ${d.score}% (${d.keterangan})`
      );
  }, [yearlyCells, containerWidth, activeCell?.dateStr]);

  return (
    <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">
              Peta Panas Presensi Tahunan (Yearly Attendance Heatmap)
            </h3>
          </div>
          <p className="text-xs text-neutral-400">
            Visualisasi pola kehadiran jangka panjang 365 hari untuk memantau konsistensi ibadah, sekolah, dan ketahanan fisik {santri.nama}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Session Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px]">
            {(
              [
                { id: 'all', label: '7 Sesi Penuh' },
                { id: 'subuh', label: 'Subuh' },
                { id: 'sekolah', label: 'Sekolah' },
                { id: 'malam', label: 'Halaqah & Malam' },
              ] as { id: SessionFocus; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSessionFocus(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  sessionFocus === opt.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Year Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
            {[2025, 2026].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Long-Term Pattern Insights KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Rata-rata Tahunan</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            {insights.avgScore}%
          </div>
          <div className="text-[10px] text-neutral-500">
            {insights.perfectDays} hari sempurna 100%
          </div>
        </div>

        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Rekor Streak Hadir</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400">
            {insights.bestStreak} <span className="text-xs font-normal text-neutral-400">Hari</span>
          </div>
          <div className="text-[10px] text-neutral-500">
            Berturut-turut disiplin tinggi
          </div>
        </div>

        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Ketepatan Subuh</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-400">
            {insights.subuhOnTimeRate}%
          </div>
          <div className="text-[10px] text-neutral-500">
            Tepat waktu shaf pertama masjid
          </div>
        </div>

        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Pola Hari & Bulan</span>
            <Info className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-xs font-semibold font-mono text-neutral-200 truncate">
            Prima: {insights.strongestMonthLabel}
          </div>
          <div className="text-[11px] font-mono text-neutral-400 truncate">
            Perhatian: {insights.weakestDayLabel}
          </div>
        </div>
      </div>

      {/* D3 Calendar Heatmap Grid */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto pb-1 rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-3"
      >
        <svg
          ref={svgRef}
          className="block"
          role="img"
          aria-label={`Heatmap presensi tahunan ${santri.nama} tahun ${selectedYear}`}
        />
      </div>

      {/* Legend & Interactive Selected Day Inspector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        {/* Selected / Hovered Day Breakdown */}
        {activeCell && (
          <div className="flex-1 p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-white">
                  {activeCell.dateObj.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-neutral-600">·</span>
                <span
                  className={`font-mono font-bold ${
                    activeCell.score === null
                      ? 'text-neutral-500'
                      : activeCell.score >= 88
                      ? 'text-emerald-400'
                      : activeCell.score >= 72
                      ? 'text-sky-400'
                      : activeCell.score >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeCell.score === null
                    ? 'Belum Terjadwal'
                    : `Skor ${activeCell.score}%`}
                </span>
                {activeCell.isActualRecord && (
                  <>
                    <span className="text-neutral-600">·</span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Data Terverifikasi Musyrif
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {activeCell.keterangan}
              </p>
            </div>

            {activeCell.score !== null && (
              <div className="grid grid-cols-7 gap-1.5 text-center shrink-0">
                {(
                  [
                    { label: 'Sbh', val: activeCell.subuh },
                    { label: 'Dhh', val: activeCell.dhuha },
                    { label: 'KBM', val: activeCell.sekolahPagi },
                    { label: 'Ash', val: activeCell.ashar },
                    { label: 'Hlq', val: activeCell.halaqahSore },
                    { label: 'Mgh', val: activeCell.maghribIsya },
                    { label: 'Mlm', val: activeCell.belajarMalam },
                  ] as const
                ).map((s) => (
                  <div
                    key={s.label}
                    className="px-1.5 py-1 rounded bg-neutral-900 border border-neutral-800"
                  >
                    <div className="text-[9px] font-mono text-neutral-500">
                      {s.label}
                    </div>
                    <div
                      className={`text-[10px] font-mono font-semibold ${
                        s.val === 'Hadir'
                          ? 'text-emerald-400'
                          : s.val === 'Masbuk'
                          ? 'text-sky-400'
                          : s.val === 'Alpa'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {s.val === 'Hadir'
                        ? '✓'
                        : s.val === 'Masbuk'
                        ? 'M'
                        : s.val === 'Sakit'
                        ? 'S'
                        : s.val === 'Izin'
                        ? 'I'
                        : 'A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 shrink-0">
          <span className="font-medium text-neutral-500">Legenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" />
            <span>&lt;50%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" />
            <span>Izin/Sakit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
            <span>Masbuk</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
            <span>88–99%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-400 inline-block" />
            <span>100%</span>
          </span>
        </div>
      </div>
    </div>
  );
};
