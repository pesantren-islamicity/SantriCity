import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SantriProfile, TahfidzEntry } from '../types/pesantren';
import { BarChart3, CheckCircle2, Target, TrendingUp } from 'lucide-react';

interface TahfidzJuzProgressChartProps {
  santri: SantriProfile;
  tahfidzList: TahfidzEntry[];
}

type ChartViewMode = 'semester-comparison' | 'marhalah-breakdown';

interface ComparisonRow {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  maxValue: number;
  color: string;
  pages: number;
  percentOfTarget: number;
  description: string;
}

interface MarhalahRow {
  block: string;
  rangeStart: number;
  rangeEnd: number;
  achieved: number;
  targetInBlock: number;
  capacity: number;
  statusText: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  primaryValue: string;
  secondaryValue: string;
  detail: string;
}

export const TahfidzJuzProgressChart: React.FC<TahfidzJuzProgressChartProps> = ({
  santri,
  tahfidzList,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [viewMode, setViewMode] = useState<ChartViewMode>('semester-comparison');
  const [semesterTargetJuz, setSemesterTargetJuz] = useState<number>(
    santri.targetJuz || 30
  );
  const [containerWidth, setContainerWidth] = useState<number>(760);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    primaryValue: '',
    secondaryValue: '',
    detail: '',
  });

  // Sync semester target whenever active santri changes
  useEffect(() => {
    setSemesterTargetJuz(santri.targetJuz || 30);
  }, [santri.id, santri.targetJuz]);

  // Responsive container width tracking via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(320, Math.floor(el.getBoundingClientRect().width));
      setContainerWidth(next);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const capaianJuz = Math.max(0, Math.min(30, santri.capaianJuz || 0));
  const pendingZiyadahCount = useMemo(
    () =>
      tahfidzList.filter(
        (entry) =>
          entry.tipe === 'Ziyadah' &&
          entry.statusVerifikasi === 'Menunggu Verifikasi Ustaz'
      ).length,
    [tahfidzList]
  );

  // Small fractional estimate for pending audio ziyadah (~0.2 juz per pending submission, capped)
  const pendingJuzEstimate = useMemo(
    () => Number(Math.min(1.0, pendingZiyadahCount * 0.2).toFixed(1)),
    [pendingZiyadahCount]
  );

  const effectiveProjectedJuz = Number(
    Math.min(30, capaianJuz + pendingJuzEstimate).toFixed(1)
  );
  const remainingToTarget = Number(
    Math.max(0, semesterTargetJuz - capaianJuz).toFixed(1)
  );
  const completionPct =
    semesterTargetJuz > 0
      ? Math.min(100, Math.round((capaianJuz / semesterTargetJuz) * 100))
      : 0;

  // Pace milestone: assuming current semester is ~68% elapsed toward semester target
  const midSemesterBenchmarkJuz = Number(
    Math.min(30, semesterTargetJuz * 0.68).toFixed(1)
  );
  const isOnTrack = capaianJuz >= midSemesterBenchmarkJuz;

  const targetPresets = useMemo(() => {
    const base = new Set<number>([15, 20, 24, 30, santri.targetJuz || 30]);
    return Array.from(base)
      .filter((v) => v >= 5 && v <= 30)
      .sort((a, b) => a - b);
  }, [santri.targetJuz]);

  const comparisonRows: ComparisonRow[] = useMemo(() => {
    const rows: ComparisonRow[] = [
      {
        id: 'capaian',
        label: 'Capaian Mutqin',
        sublabel: `${capaianJuz} Juz terverifikasi`,
        value: capaianJuz,
        maxValue: 30,
        color: '#10b981', // Emerald 500
        pages: Math.round(capaianJuz * 20),
        percentOfTarget:
          semesterTargetJuz > 0
            ? Math.round((capaianJuz / semesterTargetJuz) * 100)
            : 0,
        description:
          remainingToTarget === 0
            ? 'Alhamdulillah, target semester telah terlampaui atau tercapai.'
            : `Tercapai ${completionPct}% dari target ${semesterTargetJuz} Juz semester ini.`,
      },
      {
        id: 'proyeksi',
        label: 'Proyeksi + Pending',
        sublabel:
          pendingJuzEstimate > 0
            ? `+${pendingJuzEstimate} Juz menunggu simak`
            : 'Belum ada antrean verifikasi',
        value: effectiveProjectedJuz,
        maxValue: 30,
        color: '#14b8a6', // Teal 500
        pages: Math.round(effectiveProjectedJuz * 20),
        percentOfTarget:
          semesterTargetJuz > 0
            ? Math.round((effectiveProjectedJuz / semesterTargetJuz) * 100)
            : 0,
        description:
          pendingZiyadahCount > 0
            ? `Termasuk estimasi ${pendingZiyadahCount} rekaman ziyadah yang sedang ditinjau musyrif.`
            : 'Sama dengan capaian terverifikasi saat ini.',
      },
      {
        id: 'benchmark',
        label: 'Patokan Pekan Ini',
        sublabel: '68% linimasa semester',
        value: midSemesterBenchmarkJuz,
        maxValue: 30,
        color: '#06b6d4', // Cyan 500
        pages: Math.round(midSemesterBenchmarkJuz * 20),
        percentOfTarget: 68,
        description: isOnTrack
          ? `Unggul +${Number((capaianJuz - midSemesterBenchmarkJuz).toFixed(1))} Juz di atas patokan pekan berjalan.`
          : `Tertinggal ${Number((midSemesterBenchmarkJuz - capaianJuz).toFixed(1))} Juz dari patokan pekan berjalan.`,
      },
      {
        id: 'target',
        label: 'Target Semester',
        sublabel: `Batas akhir semester`,
        value: semesterTargetJuz,
        maxValue: 30,
        color: '#f59e0b', // Amber 500
        pages: Math.round(semesterTargetJuz * 20),
        percentOfTarget: 100,
        description: `Target total yang ditetapkan untuk akhir semester (${semesterTargetJuz * 20} halaman Mushaf Madinah).`,
      },
    ];
    return rows;
  }, [
    capaianJuz,
    completionPct,
    effectiveProjectedJuz,
    isOnTrack,
    midSemesterBenchmarkJuz,
    pendingJuzEstimate,
    pendingZiyadahCount,
    remainingToTarget,
    semesterTargetJuz,
  ]);

  const marhalahRows: MarhalahRow[] = useMemo(() => {
    const blocks = [
      { block: 'Juz 1 – 5', rangeStart: 0, rangeEnd: 5 },
      { block: 'Juz 6 – 10', rangeStart: 5, rangeEnd: 10 },
      { block: 'Juz 11 – 15', rangeStart: 10, rangeEnd: 15 },
      { block: 'Juz 16 – 20', rangeStart: 15, rangeEnd: 20 },
      { block: 'Juz 21 – 25', rangeStart: 20, rangeEnd: 25 },
      { block: 'Juz 26 – 30', rangeStart: 25, rangeEnd: 30 },
    ];

    return blocks.map((b) => {
      const capacity = 5;
      const achieved = Number(
        Math.max(0, Math.min(capacity, capaianJuz - b.rangeStart)).toFixed(1)
      );
      const targetInBlock = Number(
        Math.max(0, Math.min(capacity, semesterTargetJuz - b.rangeStart)).toFixed(1)
      );

      let statusText = 'Belum Ditargetkan';
      if (targetInBlock === 0 && achieved === 0) {
        statusText = 'Tahap Berikutnya';
      } else if (achieved >= targetInBlock && targetInBlock > 0) {
        statusText = achieved >= capacity ? 'Mutqin Penuh' : 'Target Blok Tercapai';
      } else if (achieved > 0) {
        statusText = 'Sedang Berjalan';
      } else {
        statusText = 'Target Semester Ini';
      }

      return {
        ...b,
        achieved,
        targetInBlock,
        capacity,
        statusText,
      };
    });
  }, [capaianJuz, semesterTargetJuz]);

  // Render D3 SVG chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 0 : 450;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const isCompact = containerWidth < 540;
    const margin = {
      top: 28,
      right: isCompact ? 20 : 32,
      bottom: 36,
      left: isCompact ? 112 : 148,
    };

    const chartHeight = viewMode === 'semester-comparison' ? 248 : 292;
    const innerWidth = Math.max(160, containerWidth - margin.left - margin.right);
    const innerHeight = chartHeight - margin.top - margin.bottom;

    svg
      .attr('width', containerWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${chartHeight}`);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (viewMode === 'semester-comparison') {
      const xScale = d3.scaleLinear().domain([0, 30]).range([0, innerWidth]);
      const yScale = d3
        .scaleBand<string>()
        .domain(comparisonRows.map((d) => d.id))
        .range([0, innerHeight])
        .padding(0.34);

      // Vertical grid lines every 5 Juz
      const gridTicks = [0, 5, 10, 15, 20, 25, 30];
      root
        .append('g')
        .selectAll('line.grid-x')
        .data(gridTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-x')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#262626')
        .attr('stroke-dasharray', '3,3');

      // Target semester shaded zone (0 -> semesterTargetJuz)
      root
        .append('rect')
        .attr('x', 0)
        .attr('y', -4)
        .attr('width', xScale(semesterTargetJuz))
        .attr('height', innerHeight + 8)
        .attr('rx', 6)
        .attr('fill', 'rgba(245, 158, 11, 0.04)');

      // Full 30 Juz background tracks for each comparison bar
      root
        .selectAll('rect.bar-track')
        .data(comparisonRows)
        .enter()
        .append('rect')
        .attr('class', 'bar-track')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.id) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('rx', 6)
        .attr('fill', '#171717')
        .attr('stroke', '#262626')
        .attr('stroke-width', 1);

      // Actual value bars with D3 transition
      const bars = root
        .selectAll('rect.bar-fill')
        .data(comparisonRows)
        .enter()
        .append('rect')
        .attr('class', 'bar-fill')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.id) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('rx', 6)
        .attr('fill', (d) => d.color)
        .attr('fill-opacity', (d) => (d.id === 'target' ? 0.85 : 0.95))
        .attr('width', 0)
        .style('cursor', 'pointer');

      bars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => Math.max(4, xScale(d.value)));

      // Interactive hover hit targets covering full bar width
      root
        .selectAll('rect.bar-hit')
        .data(comparisonRows)
        .enter()
        .append('rect')
        .attr('class', 'bar-hit')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.id) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mousemove', (event: MouseEvent, d) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const relX = event.clientX - rect.left;
          const relY = event.clientY - rect.top;
          setTooltip({
            visible: true,
            x: Math.min(rect.width - 235, Math.max(12, relX + 12)),
            y: Math.max(12, relY - 76),
            title: d.label,
            primaryValue: `${d.value} Juz (${d.pages} Halaman)`,
            secondaryValue: `${d.percentOfTarget}% dari Target Semester`,
            detail: d.description,
          });
        })
        .on('mouseleave', () => {
          setTooltip((prev) => ({ ...prev, visible: false }));
        });

      // Left Y-axis labels (row name + quiet sublabel)
      const yLabels = root
        .selectAll('g.y-label')
        .data(comparisonRows)
        .enter()
        .append('g')
        .attr('class', 'y-label')
        .attr(
          'transform',
          (d) => `translate(-12, ${(yScale(d.id) ?? 0) + yScale.bandwidth() / 2})`
        );

      yLabels
        .append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '-0.15em')
        .attr('fill', '#f5f5f5')
        .attr('font-size', isCompact ? '11px' : '12px')
        .attr('font-weight', '600')
        .text((d) => d.label);

      yLabels
        .append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '1.15em')
        .attr('fill', '#a3a3a3')
        .attr('font-size', '10px')
        .text((d) => d.sublabel);

      // Value labels at bar ends
      root
        .selectAll('text.bar-value')
        .data(comparisonRows)
        .enter()
        .append('text')
        .attr('class', 'bar-value')
        .attr('y', (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('x', (d) => {
          const barEnd = xScale(d.value);
          return barEnd > innerWidth - 68 ? barEnd - 8 : barEnd + 8;
        })
        .attr('text-anchor', (d) =>
          xScale(d.value) > innerWidth - 68 ? 'end' : 'start'
        )
        .attr('fill', (d) =>
          xScale(d.value) > innerWidth - 68 ? '#0a0a0a' : '#e5e5e5'
        )
        .text((d) => `${d.value} Juz`);

      // Vertical Target Semester Reference Line
      const targetX = xScale(semesterTargetJuz);
      root
        .append('line')
        .attr('x1', targetX)
        .attr('x2', targetX)
        .attr('y1', -12)
        .attr('y2', innerHeight + 4)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,4');

      root
        .append('text')
        .attr('x', Math.min(innerWidth - 4, targetX))
        .attr('y', -16)
        .attr('text-anchor', targetX > innerWidth * 0.78 ? 'end' : 'middle')
        .attr('fill', '#fbbf24')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`Target Semester: ${semesterTargetJuz} Juz`);

      // Bottom D3 Axis
      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(gridTicks)
        .tickFormat((d) => `${d} Juz`);

      const axisGroup = root
        .append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis);

      axisGroup.select('.domain').attr('stroke', '#404040');
      axisGroup.selectAll('.tick line').attr('stroke', '#404040');
      axisGroup
        .selectAll('.tick text')
        .attr('fill', '#a3a3a3')
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono, monospace');
    } else {
      // VIEW 2: Marhalah Breakdown (Per 5 Juz Blocks)
      const xScale = d3.scaleLinear().domain([0, 5]).range([0, innerWidth]);
      const yScale = d3
        .scaleBand<string>()
        .domain(marhalahRows.map((d) => d.block))
        .range([0, innerHeight])
        .padding(0.32);

      const gridTicks = [0, 1, 2, 3, 4, 5];
      root
        .append('g')
        .selectAll('line.grid-x')
        .data(gridTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-x')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#262626')
        .attr('stroke-dasharray', '3,3');

      // Track background (5 Juz capacity per block)
      root
        .selectAll('rect.block-track')
        .data(marhalahRows)
        .enter()
        .append('rect')
        .attr('class', 'block-track')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.block) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('rx', 6)
        .attr('fill', '#171717')
        .attr('stroke', '#262626')
        .attr('stroke-width', 1);

      // Target semester requirement overlay inside each block
      root
        .selectAll('rect.block-target-band')
        .data(marhalahRows)
        .enter()
        .append('rect')
        .attr('class', 'block-target-band')
        .attr('x', 0)
        .attr('y', (d) => (yScale(d.block) ?? 0) + 2)
        .attr('width', (d) => xScale(d.targetInBlock))
        .attr('height', Math.max(4, yScale.bandwidth() - 4))
        .attr('rx', 4)
        .attr('fill', 'rgba(245, 158, 11, 0.14)');

      // Achieved bar fill
      const blockBars = root
        .selectAll('rect.block-achieved')
        .data(marhalahRows)
        .enter()
        .append('rect')
        .attr('class', 'block-achieved')
        .attr('x', 0)
        .attr('y', (d) => (yScale(d.block) ?? 0) + 4)
        .attr('height', Math.max(6, yScale.bandwidth() - 8))
        .attr('rx', 4)
        .attr('fill', (d) => {
          if (d.achieved >= 5) return '#10b981';
          if (d.achieved > 0) return '#f59e0b';
          return '#404040';
        })
        .attr('width', 0);

      blockBars
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => (d.achieved > 0 ? Math.max(4, xScale(d.achieved)) : 0));

      // Vertical target tick marker inside each block where targetInBlock > 0
      root
        .selectAll('line.block-target-tick')
        .data(marhalahRows.filter((d) => d.targetInBlock > 0))
        .enter()
        .append('line')
        .attr('class', 'block-target-tick')
        .attr('x1', (d) => xScale(d.targetInBlock))
        .attr('x2', (d) => xScale(d.targetInBlock))
        .attr('y1', (d) => (yScale(d.block) ?? 0) - 2)
        .attr('y2', (d) => (yScale(d.block) ?? 0) + yScale.bandwidth() + 2)
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 2);

      // Left Y-axis labels
      const yBlockLabels = root
        .selectAll('g.y-block-label')
        .data(marhalahRows)
        .enter()
        .append('g')
        .attr('class', 'y-block-label')
        .attr(
          'transform',
          (d) =>
            `translate(-12, ${(yScale(d.block) ?? 0) + yScale.bandwidth() / 2})`
        );

      yBlockLabels
        .append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '-0.1em')
        .attr('fill', '#f5f5f5')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text((d) => d.block);

      yBlockLabels
        .append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '1.15em')
        .attr('fill', '#a3a3a3')
        .attr('font-size', '10px')
        .text((d) => d.statusText);

      // Value labels at end of each block bar
      root
        .selectAll('text.block-val')
        .data(marhalahRows)
        .enter()
        .append('text')
        .attr('class', 'block-val')
        .attr('y', (d) => (yScale(d.block) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('x', (d) => {
          const endX = xScale(Math.max(d.achieved, d.targetInBlock));
          return endX > innerWidth - 95 ? innerWidth - 8 : endX + 8;
        })
        .attr('text-anchor', (d) => {
          const endX = xScale(Math.max(d.achieved, d.targetInBlock));
          return endX > innerWidth - 95 ? 'end' : 'start';
        })
        .attr('fill', '#e5e5e5')
        .text((d) => `${d.achieved} / ${d.targetInBlock} Juz`);

      // Interactive hover hit targets
      root
        .selectAll('rect.block-hit')
        .data(marhalahRows)
        .enter()
        .append('rect')
        .attr('class', 'block-hit')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.block) ?? 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mousemove', (event: MouseEvent, d) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const relX = event.clientX - rect.left;
          const relY = event.clientY - rect.top;
          setTooltip({
            visible: true,
            x: Math.min(rect.width - 235, Math.max(12, relX + 12)),
            y: Math.max(12, relY - 76),
            title: `Marhalah ${d.block}`,
            primaryValue: `Capaian: ${d.achieved} dari 5 Juz`,
            secondaryValue: `Target Semester Blok: ${d.targetInBlock} Juz`,
            detail: `${d.statusText} (${Math.round(d.achieved * 20)} / ${Math.round(d.targetInBlock * 20)} Halaman)`,
          });
        })
        .on('mouseleave', () => {
          setTooltip((prev) => ({ ...prev, visible: false }));
        });

      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(gridTicks)
        .tickFormat((d) => `${d} Juz`);

      const axisGroup = root
        .append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis);

      axisGroup.select('.domain').attr('stroke', '#404040');
      axisGroup.selectAll('.tick line').attr('stroke', '#404040');
      axisGroup
        .selectAll('.tick text')
        .attr('fill', '#a3a3a3')
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono, monospace');
    }
  }, [
    comparisonRows,
    containerWidth,
    marhalahRows,
    semesterTargetJuz,
    viewMode,
  ]);

  return (
    <section
      aria-label="Grafik Progress Bar Capaian Juz Santri"
      className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">
              Grafik Progress Capaian Juz vs Target Semester
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span>Visualisasi D3.js</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400 font-medium">
              {capaianJuz} Juz Tercapai ({Math.round(capaianJuz * 20)} hal)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-amber-400 font-medium">
              Target {semesterTargetJuz} Juz ({completionPct}%)
            </span>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Target Preset Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 whitespace-nowrap">
              Target Semester:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
              {targetPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSemesterTargetJuz(preset)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    semesterTargetJuz === preset
                      ? 'bg-amber-500 text-neutral-950 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {preset}J
                </button>
              ))}
            </div>
          </div>

          {/* Chart Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800">
            <button
              type="button"
              onClick={() => setViewMode('semester-comparison')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'semester-comparison'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Komparasi Target
            </button>
            <button
              type="button"
              onClick={() => setViewMode('marhalah-breakdown')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'marhalah-breakdown'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Per 5 Juz
            </button>
          </div>
        </div>
      </div>

      {/* D3 Chart Canvas with Floating Tooltip */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`Grafik progress bar D3 menunjukkan capaian ${capaianJuz} juz dibandingkan target semester ${semesterTargetJuz} juz`}
          className="block w-full select-none"
        />

        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-20 w-56 p-3 rounded-lg bg-neutral-950 border border-neutral-700 shadow-xl space-y-1"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="text-xs font-semibold text-white">
              {tooltip.title}
            </div>
            <div className="text-xs font-mono tabular-nums font-bold text-emerald-400">
              {tooltip.primaryValue}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-amber-300">
              {tooltip.secondaryValue}
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug pt-0.5">
              {tooltip.detail}
            </p>
          </div>
        )}
      </div>

      {/* Legend & Quantitative Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-emerald-500 inline-block" />
            <span>Capaian Mutqin</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-teal-500 inline-block" />
            <span>Proyeksi + Pending</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-cyan-500 inline-block" />
            <span>Patokan Pekan Berjalan</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-amber-500 inline-block" />
            <span>Target Semester ({semesterTargetJuz} Juz)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums">
          {remainingToTarget === 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Target Semester Tercapai</span>
            </span>
          ) : isOnTrack ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sesuai Jalur · Sisa {remainingToTarget} Juz</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Target className="w-3.5 h-3.5" />
              <span>Perlu Akselerasi · Sisa {remainingToTarget} Juz</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
