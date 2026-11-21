import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  ELibraryAIRecommendation,
  ELibraryBook,
  ELibraryCategory,
  ELibraryLoan,
  Language,
  NilaiMataPelajaran,
  SantriProfile,
  UserRole,
} from '../types/pesantren';
import { recommendLibraryBooks } from '../services/elibraryService';
import { exportToCsv } from '../services/storageService';
import { PermitSvgQrCode } from './PermitSvgQrCode';
import {
  BarChart3,
  BookOpen,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  Library,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

interface PerpustakaanDigitalModuleProps {
  santri: SantriProfile;
  nilaiList: NilaiMataPelajaran[];
  books: ELibraryBook[];
  loans: ELibraryLoan[];
  onBorrowBook: (loan: Omit<ELibraryLoan, 'id'>) => void;
  onUpdateLoanStatus: (
    loanId: string,
    status: ELibraryLoan['status'],
    note?: string
  ) => void;
  onExtendLoan: (loanId: string, extraDays?: number) => void;
  currentRole: UserRole;
  lang: Language;
}

type ELibrarySubTab = 'katalog' | 'peminjaman-qr' | 'rekomendasi-ai';

const LIBRARY_CATEGORIES: ELibraryCategory[] = [
  "Tafsir & Al-Qur'an",
  'Hadis & Sirah',
  'Fiqih & Muamalah',
  'Bahasa Arab & Adab',
  'Ekonomi, Bisnis & Haji',
  'Sains & Teknologi Santri',
];

const INTEREST_PRESETS: { label: string; minat: string; tujuan: string; kategori: ELibraryCategory | 'Semua' }[] = [
  {
    label: 'Hafalan Qur’an & Adab Halaqah',
    minat: "Pendalaman tafsir ayat peradaban, adab penghafal Al-Qur'an, dan metode murajaah mutqin",
    tujuan: 'Memperkuat kualitas tasmi’ 20–30 Juz sekaligus memahami kandungan maudhu’i ayat',
    kategori: "Tafsir & Al-Qur'an",
  },
  {
    label: 'Manajemen Haji, Umrah & Bisnis Halal',
    minat: 'Tata kelola haji umrah QS 22:27-29, fikih muamalah kontemporer, dan koperasi syariah',
    tujuan: 'Menyiapkan riset studi lanjut prodi Manajemen Haji & Umroh serta Klinik Bisnis Syariah',
    kategori: 'Ekonomi, Bisnis & Haji',
  },
  {
    label: 'AI, Rekayasa Software & Ilmu Falak',
    minat: 'Kecerdasan buatan beretika Islam, ilmu falak astronomi, dan pengembangan teknologi pesantren',
    tujuan: 'Merancang prototipe aplikasi EdTech Islami di StartUp Center SantriCity',
    kategori: 'Sains & Teknologi Santri',
  },
];

function formatDateAddDays(baseDateStr: string, daysToAdd: number): string {
  const parsed = new Date(baseDateStr);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + daysToAdd);
    return fallback.toISOString().slice(0, 10);
  }
  parsed.setDate(parsed.getDate() + daysToAdd);
  return parsed.toISOString().slice(0, 10);
}

export const PerpustakaanDigitalModule: React.FC<PerpustakaanDigitalModuleProps> = ({
  santri,
  nilaiList,
  books,
  loans,
  onBorrowBook,
  onUpdateLoanStatus,
  onExtendLoan,
  currentRole,
  lang,
}) => {
  void lang;

  const [subTab, setSubTab] = useState<ELibrarySubTab>('katalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ELibraryCategory | 'Semua'>('Semua');
  const [selectedFormat, setSelectedFormat] = useState<'Semua' | ELibraryBook['format']>('Semua');

  // Reader & Detail Modal
  const [readerBook, setReaderBook] = useState<ELibraryBook | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Borrow Form Modal
  const [borrowTargetBook, setBorrowTargetBook] = useState<ELibraryBook | null>(null);
  const [borrowType, setBorrowType] = useState<ELibraryLoan['jenisPinjam']>('Akses E-Reader QR');
  const [borrowDays, setBorrowDays] = useState<number>(14);
  const [borrowNote, setBorrowNote] = useState<string>('Kebutuhan pendalaman materi halaqah dan tugas riset santri.');
  const [borrowFeedback, setBorrowFeedback] = useState<string | null>(null);

  // QR Pass Modal & Scanner Simulator Modal
  const [selectedLoanQr, setSelectedLoanQr] = useState<ELibraryLoan | null>(null);
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scanInput, setScanInput] = useState<string>('');
  const [scanNotice, setScanNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // AI Recommendation State
  const [aiCategoryFocus, setAiCategoryFocus] = useState<ELibraryCategory | 'Semua'>('Semua');
  const [minatBaca, setMinatBaca] = useState<string>(
    "Tafsir Al-Qur'an, Manajemen Haji & Umrah QS 22:27-29, serta pengembangan teknologi AI di pesantren"
  );
  const [tujuanBelajar, setTujuanBelajar] = useState<string>(
    'Memperkuat hafalan mutqin dan menyusun karya tulis ilmiah berbasis literatur klasik & modern'
  );
  const [aiResult, setAiResult] = useState<ELibraryAIRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const qrSvgContainerRef = useRef<HTMLDivElement | null>(null);

  const safeBooks = useMemo(() => (Array.isArray(books) ? books : []), [books]);
  const safeLoans = useMemo(() => (Array.isArray(loans) ? loans : []), [loans]);
  const safeNilai = useMemo(() => (Array.isArray(nilaiList) ? nilaiList : []), [nilaiList]);

  // Compute live available copies for every book dynamically from active/pending loans
  const activeCountByBookId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const loan of safeLoans) {
      if (loan.status === 'Dipinjam (Aktif)' || loan.status === 'Menunggu Ambil QR' || loan.status === 'Terlambat') {
        map[loan.bookId] = (map[loan.bookId] || 0) + 1;
      }
    }
    return map;
  }, [safeLoans]);

  const booksWithAvailability = useMemo(() => {
    return safeBooks.map((book) => {
      const borrowed = activeCountByBookId[book.id] || 0;
      const tersedia = Math.max(0, book.stokTotal - borrowed);
      return { ...book, stokTersedia: tersedia, sedangDipinjam: borrowed };
    });
  }, [safeBooks, activeCountByBookId]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return booksWithAvailability.filter((book) => {
      if (selectedCategory !== 'Semua' && book.kategori !== selectedCategory) return false;
      if (selectedFormat !== 'Semua' && book.format !== selectedFormat) return false;
      if (!q) return true;
      const haystack = `${book.judul} ${book.judulArab || ''} ${book.penulis} ${book.kodeKitab} ${book.kategori} ${book.topikKunci.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [booksWithAvailability, searchQuery, selectedCategory, selectedFormat]);

  const santriLoans = useMemo(
    () => safeLoans.filter((l) => l.santriId === santri.id),
    [safeLoans, santri.id]
  );

  const visibleLoans = useMemo(() => {
    if (currentRole === 'admin' || currentRole === 'ustaz') return safeLoans;
    return santriLoans;
  }, [currentRole, safeLoans, santriLoans]);

  const activeLoansList = useMemo(
    () =>
      visibleLoans.filter(
        (l) => l.status === 'Dipinjam (Aktif)' || l.status === 'Menunggu Ambil QR' || l.status === 'Terlambat'
      ),
    [visibleLoans]
  );

  const totalCopies = useMemo(
    () => booksWithAvailability.reduce((sum, b) => sum + b.stokTotal, 0),
    [booksWithAvailability]
  );
  const totalAvailableCopies = useMemo(
    () => booksWithAvailability.reduce((sum, b) => sum + b.stokTersedia, 0),
    [booksWithAvailability]
  );

  const avgNilai = useMemo(() => {
    if (safeNilai.length === 0) return 86.5;
    const total = safeNilai.reduce((acc, n) => acc + (Number(n.akhir) || 0), 0);
    return total / safeNilai.length;
  }, [safeNilai]);

  // Close open modals on Escape key
  useEffect(() => {
    const hasOpenModal = Boolean(readerBook || borrowTargetBook || selectedLoanQr || scannerOpen);
    if (!hasOpenModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReaderBook(null);
        setBorrowTargetBook(null);
        setSelectedLoanQr(null);
        setScannerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readerBook, borrowTargetBook, selectedLoanQr, scannerOpen]);

  // D3 Category Distribution Chart
  const categoryStats = useMemo(() => {
    return LIBRARY_CATEGORIES.map((kat) => {
      const items = booksWithAvailability.filter((b) => b.kategori === kat);
      const totalJudul = items.length;
      const totalTersedia = items.reduce((sum, item) => sum + item.stokTersedia, 0);
      return {
        kategori: kat,
        shortLabel:
          kat === "Tafsir & Al-Qur'an"
            ? 'Tafsir Qur’an'
            : kat === 'Hadis & Sirah'
            ? 'Hadis & Sirah'
            : kat === 'Fiqih & Muamalah'
            ? 'Fiqih Muamalah'
            : kat === 'Bahasa Arab & Adab'
            ? 'Bahasa Arab'
            : kat === 'Ekonomi, Bisnis & Haji'
            ? 'Bisnis & Haji'
            : 'Sains & AI',
        totalJudul,
        totalTersedia,
      };
    });
  }, [booksWithAvailability]);

  useEffect(() => {
    if (!chartWrapperRef.current || !chartSvgRef.current) return;

    const renderChart = () => {
      try {
        const container = chartWrapperRef.current;
        const svgEl = chartSvgRef.current;
        if (!container || !svgEl) return;

        const width = Math.max(280, container.clientWidth || 560);
        const height = 210;
        const margin = { top: 10, right: 44, bottom: 20, left: 106 };
        const innerW = Math.max(120, width - margin.left - margin.right);
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const maxVal = Math.max(10, d3.max(categoryStats, (d) => d.totalTersedia) || 20);
        const x = d3.scaleLinear().domain([0, maxVal * 1.15]).range([0, innerW]);
        const y = d3
          .scaleBand<string>()
          .domain(categoryStats.map((d) => d.shortLabel))
          .range([0, innerH])
          .padding(0.32);

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(x).ticks(4).tickSize(-innerH))
          .call((axis) => axis.select('.domain').remove())
          .call((axis) =>
            axis.selectAll('.tick line').attr('stroke', '#262626').attr('stroke-dasharray', '2,2')
          )
          .call((axis) => axis.selectAll('.tick text').attr('fill', '#737373').attr('font-size', '10px'));

        g.append('g')
          .call(d3.axisLeft(y).tickSize(0))
          .call((axis) => axis.select('.domain').remove())
          .call((axis) =>
            axis
              .selectAll('.tick text')
              .attr('fill', '#d4d4d4')
              .attr('font-size', '11px')
              .attr('dx', '-6')
          );

        const reducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        const bars = g
          .selectAll('.lib-bar')
          .data(categoryStats)
          .enter()
          .append('rect')
          .attr('class', 'lib-bar')
          .attr('y', (d) => y(d.shortLabel) ?? 0)
          .attr('height', y.bandwidth())
          .attr('x', 0)
          .attr('rx', 4)
          .attr('fill', '#10b981')
          .attr('fill-opacity', 0.85);

        if (reducedMotion) {
          bars.attr('width', (d) => Math.max(4, x(d.totalTersedia)));
        } else {
          bars
            .attr('width', 0)
            .transition()
            .duration(450)
            .attr('width', (d) => Math.max(4, x(d.totalTersedia)));
        }

        g.selectAll('.lib-val')
          .data(categoryStats)
          .enter()
          .append('text')
          .attr('x', (d) => x(d.totalTersedia) + 6)
          .attr('y', (d) => (y(d.shortLabel) ?? 0) + y.bandwidth() / 2 + 4)
          .attr('fill', '#a3e635')
          .attr('font-size', '10px')
          .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
          .text((d) => `${d.totalTersedia} eks`);
      } catch (err) {
        console.error('D3 E-Library chart error:', err);
      }
    };

    renderChart();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => renderChart());
      ro.observe(chartWrapperRef.current);
      return () => ro.disconnect();
    }
  }, [categoryStats]);

  const handleExportCatalog = () => {
    const rows = filteredBooks.map((b) => ({
      KodeKitab: b.kodeKitab,
      ISBN: b.isbn,
      Judul: b.judul,
      Penulis: b.penulis,
      Kategori: b.kategori,
      Bahasa: b.bahasa,
      Format: b.format,
      Halaman: b.jumlahHalaman,
      StokTotal: b.stokTotal,
      StokTersedia: b.stokTersedia,
      Rating: b.ratingPembaca,
    }));
    exportToCsv('Katalog_ELibrary_Islamicity', rows);
  };

  const handleOpenBorrowModal = (book: ELibraryBook) => {
    setBorrowTargetBook(book);
    setBorrowType(book.format === 'E-Book PDF/EPUB' ? 'Akses E-Reader QR' : 'Pinjam Fisik & Digital QR');
    setBorrowDays(14);
    setBorrowNote('Kebutuhan pendalaman literasi santri dan rujukan belajar.');
  };

  const handleSubmitBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowTargetBook) return;
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = formatDateAddDays(today, borrowDays);
    const tokenSuffix = `LN-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrPayload = `SC313-ELIB:${borrowTargetBook.kodeKitab}:${santri.nis}:${tokenSuffix}`;
    const initialStatus: ELibraryLoan['status'] =
      borrowType === 'Akses E-Reader QR' ? 'Dipinjam (Aktif)' : 'Menunggu Ambil QR';

    onBorrowBook({
      bookId: borrowTargetBook.id,
      kodeKitab: borrowTargetBook.kodeKitab,
      judulBuku: borrowTargetBook.judul,
      santriId: santri.id,
      santriNama: santri.nama,
      nis: santri.nis,
      tanggalPinjam: today,
      tanggalJatuhTempo: dueDate,
      status: initialStatus,
      qrPayload,
      jenisPinjam: borrowType,
      catatanPetugas: borrowNote.trim() || 'Peminjaman terdaftar di E-Library Islamicity.',
    });

    setBorrowTargetBook(null);
    setSubTab('peminjaman-qr');
    setBorrowFeedback(
      `QR Peminjaman untuk "${borrowTargetBook.judul}" berhasil diterbitkan (${qrPayload}).`
    );
    window.setTimeout(() => setBorrowFeedback(null), 5000);
  };

  const handleCopyQrPayload = (loan: ELibraryLoan) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(loan.qrPayload).catch(() => {});
    }
    setCopiedLoanId(loan.id);
    window.setTimeout(() => setCopiedLoanId(null), 2000);
  };

  const handleDownloadLoanSvg = (loan: ELibraryLoan) => {
    const svgEl = qrSvgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(svgEl)}`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-ELibrary-${loan.kodeKitab}-${loan.nis}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizedScanQuery = scanInput.trim().toLowerCase();
  const matchedScannedLoan = normalizedScanQuery
    ? safeLoans.find(
        (l) =>
          l.qrPayload.toLowerCase() === normalizedScanQuery ||
          l.kodeKitab.toLowerCase() === normalizedScanQuery ||
          l.qrPayload.toLowerCase().includes(normalizedScanQuery)
      )
    : activeLoansList[0];

  const handleOpenScanner = (loan?: ELibraryLoan) => {
    const target = loan || activeLoansList[0];
    setScanInput(target ? target.qrPayload : '');
    setScanNotice(null);
    setScannerOpen(true);
  };

  const handleRunAIRecommendation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAiLoading(true);
    try {
      const rec = await recommendLibraryBooks({
        santri,
        avgNilai,
        minatBaca,
        tujuanBelajar,
        kategoriFokus: aiCategoryFocus,
        books: safeBooks,
      });
      setAiResult(rec);
    } catch (err) {
      console.error('Error generating E-Library recommendation:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <Library className="w-4 h-4" />
            <span>Maktabah Digital Terintegrasi QR · SantriCity 313</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Perpustakaan Digital (E-Library) Islamicity
          </h2>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            Katalog kitab turats & literatur modern, peminjaman instan berbasis verifikasi SVG QR Code, serta kurasi bacaan berbasis AI yang disesuaikan dengan minat dan capaian hafalan {santri.nama}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCatalog}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Katalog CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenScanner()}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pindai QR Kios</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('rekomendasi-ai');
              void handleRunAIRecommendation();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rekomendasi Buku AI</span>
          </button>
        </div>
      </div>

      {borrowFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{borrowFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setBorrowFeedback(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Koleksi Digital</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {booksWithAvailability.length} <span className="text-xs font-normal text-neutral-400">Judul</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {LIBRARY_CATEGORIES.length} disiplin turats, syariah & sains
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Lisensi & Eksemplar Siap</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {totalAvailableCopies} <span className="text-xs font-normal text-neutral-400">/ {totalCopies}</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Tersedia untuk akses e-reader maupun pinjam fisik
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Peminjaman QR Aktif</span>
            <QrCode className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {activeLoansList.length} <span className="text-xs font-normal text-neutral-400">Pass QR</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {visibleLoans.filter((l) => l.status === 'Menunggu Ambil QR').length} menunggu verifikasi kios QR
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Profil Literasi Santri</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {santri.capaianJuz} <span className="text-xs font-normal text-neutral-400">Juz · Nilai {avgNilai.toFixed(1)}</span>
          </div>
          <p className="text-[11px] text-neutral-400 truncate">
            {santri.nama}
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setSubTab('katalog')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            subTab === 'katalog'
              ? 'bg-emerald-500 text-neutral-950 font-semibold'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Katalog Buku Digital ({booksWithAvailability.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('peminjaman-qr')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            subTab === 'peminjaman-qr'
              ? 'bg-emerald-500 text-neutral-950 font-semibold'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Peminjaman Berbasis QR ({visibleLoans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('rekomendasi-ai')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            subTab === 'rekomendasi-ai'
              ? 'bg-emerald-500 text-neutral-950 font-semibold'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rekomendasi Buku AI</span>
        </button>
      </div>

      {/* TAB 1: KATALOG BUKU DIGITAL */}
      {subTab === 'katalog' && (
        <div className="space-y-5">
          {/* Distribution Chart + Search Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Distribusi Eksemplar Siap per Rumpun</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">Live Stok</span>
              </div>
              <div ref={chartWrapperRef} className="w-full overflow-hidden">
                <svg ref={chartSvgRef} className="w-full h-[210px]" />
              </div>
            </div>

            <div className="lg:col-span-7 p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari judul kitab, penulis, topik, atau kode kitab..."
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as 'Semua' | ELibraryBook['format'])}
                    className="bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Format</option>
                    <option value="E-Book PDF/EPUB">E-Book PDF/EPUB</option>
                    <option value="Kitab Digital & Fisik">Kitab Digital & Fisik</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Semua')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedCategory === 'Semua'
                        ? 'bg-emerald-500 text-neutral-950 font-semibold'
                        : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    Semua Rumpun ({booksWithAvailability.length})
                  </button>
                  {LIBRARY_CATEGORIES.map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setSelectedCategory(kat)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        selectedCategory === kat
                          ? 'bg-emerald-500 text-neutral-950 font-semibold'
                          : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                <span>
                  Menampilkan <strong className="text-white font-mono tabular-nums">{filteredBooks.length}</strong> koleksi sesuai filter
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua');
                    setSelectedFormat('Semua');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>

          {/* Book Catalog Grid */}
          {filteredBooks.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">Tidak ada koleksi yang cocok dengan pencarian Anda.</p>
              <p className="text-xs text-neutral-400">Coba ubah kata kunci atau pilih rumpun kategori lainnya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const existingActiveLoan = santriLoans.find(
                  (l) =>
                    l.bookId === book.id &&
                    (l.status === 'Dipinjam (Aktif)' || l.status === 'Menunggu Ambil QR')
                );

                return (
                  <article
                    key={book.id}
                    className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
                        <span className="text-emerald-400 font-semibold">{book.kodeKitab}</span>
                        <span className="flex items-center gap-1 text-amber-400 tabular-nums">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {book.ratingPembaca.toFixed(1)}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {book.judul}
                        </h3>
                        {book.judulArab && (
                          <p className="font-arabic text-sm text-emerald-400/90 mt-1" dir="rtl">
                            {book.judulArab}
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-400">
                        {book.penulis} · {book.tahunTerbit}
                      </p>

                      <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">
                        {book.ringkasanIsi}
                      </p>

                      <div className="pt-1 text-[11px] text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-neutral-200 font-medium">{book.kategori}</span>
                        <span>·</span>
                        <span>{book.bahasa}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{book.jumlahHalaman} hal</span>
                        <span>·</span>
                        <span>{book.format}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-mono tabular-nums font-semibold ${
                          book.stokTersedia > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {book.stokTersedia > 0
                          ? `Siap ${book.stokTersedia}/${book.stokTotal} eks`
                          : 'Stok Dipinjam Penuh'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReaderBook(book)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                        >
                          Baca Cuplikan
                        </button>

                        {existingActiveLoan ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLoanQr(existingActiveLoan)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-600/40 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Lihat QR</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={book.stokTersedia <= 0}
                            onClick={() => handleOpenBorrowModal(book)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pinjam QR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEMINJAMAN BERBASIS QR */}
      {subTab === 'peminjaman-qr' && (
        <div className="space-y-5">
          {/* Action Strip */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">
                Tiket Sirkulasi & Verifikasi Peminjaman QR Code
              </h3>
              <p className="text-xs text-neutral-400">
                Setiap peminjaman menghasilkan SVG QR unik untuk check-out di kios E-Library, pengaktifan baca offline, hingga pengembalian cepat.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenScanner()}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Pindai QR Sirkulasi</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('katalog')}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pilih Buku dari Katalog</span>
              </button>
            </div>
          </div>

          {/* Highlighted Active Loan QR Card */}
          {activeLoansList.length > 0 && (
            <div className="p-5 rounded-xl bg-neutral-900 border border-emerald-600/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-emerald-400">
                    {activeLoansList[0].kodeKitab}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300 font-medium">{activeLoansList[0].jenisPinjam}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {activeLoansList[0].status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">
                  {activeLoansList[0].judulBuku}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                    <span className="text-[11px] text-neutral-400 block">Peminjam</span>
                    <span className="text-neutral-100 font-medium">{activeLoansList[0].santriNama}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                    <span className="text-[11px] text-neutral-400 block">Tanggal Pinjam</span>
                    <span className="font-mono tabular-nums text-neutral-100">{activeLoansList[0].tanggalPinjam}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                    <span className="text-[11px] text-neutral-400 block">Jatuh Tempo</span>
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">{activeLoansList[0].tanggalJatuhTempo}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedLoanQr(activeLoansList[0])}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Perbesar Kartu QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenScanner(activeLoansList[0])}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Simulasi Pindai Kios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExtendLoan(activeLoansList[0].id, 7)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Perpanjang +7 Hari</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLoanQr(activeLoansList[0])}
                className="p-3 rounded-xl bg-white border border-neutral-700 shrink-0 self-center lg:self-auto cursor-pointer hover:opacity-95 transition-opacity"
                aria-label="Perbesar QR Peminjaman"
              >
                <PermitSvgQrCode
                  value={activeLoansList[0].qrPayload}
                  size={128}
                  label={`QR Peminjaman ${activeLoansList[0].kodeKitab}`}
                />
              </button>
            </div>
          )}

          {/* Loan History & Active Table/Cards */}
          {visibleLoans.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <p className="text-sm font-semibold text-white">Belum ada riwayat peminjaman E-Library.</p>
              <p className="text-xs text-neutral-400">Pilih buku dari katalog untuk membuat tiket peminjaman QR pertama.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleLoans.map((loan) => {
                const matchedBook = booksWithAvailability.find((b) => b.id === loan.bookId);
                return (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-mono font-bold text-emerald-400">{loan.kodeKitab}</span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-neutral-300 font-medium">{loan.santriNama}</span>
                        <span className="text-neutral-500">·</span>
                        <span
                          className={`font-mono font-semibold ${
                            loan.status === 'Dipinjam (Aktif)'
                              ? 'text-emerald-400'
                              : loan.status === 'Menunggu Ambil QR'
                              ? 'text-amber-400'
                              : loan.status === 'Dikembalikan'
                              ? 'text-neutral-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{loan.judulBuku}</h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400 font-mono tabular-nums">
                        <span>Pinjam: {loan.tanggalPinjam}</span>
                        <span>·</span>
                        <span>Jatuh Tempo: {loan.tanggalJatuhTempo}</span>
                        {loan.tanggalKembali && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400">Kembali: {loan.tanggalKembali}</span>
                          </>
                        )}
                      </div>

                      {loan.catatanPetugas && (
                        <p className="text-[11px] text-neutral-400">{loan.catatanPetugas}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {matchedBook && (
                        <button
                          type="button"
                          onClick={() => setReaderBook(matchedBook)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
                        >
                          Buka E-Reader
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedLoanQr(loan)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Tiket</span>
                      </button>

                      {loan.status === 'Menunggu Ambil QR' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateLoanStatus(
                              loan.id,
                              'Dipinjam (Aktif)',
                              'Terverifikasi via QR Kios Perpustakaan.'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                        >
                          Aktifkan QR
                        </button>
                      )}

                      {(loan.status === 'Dipinjam (Aktif)' || loan.status === 'Terlambat') && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateLoanStatus(
                              loan.id,
                              'Dikembalikan',
                              'Dikembalikan dan diverifikasi via QR E-Library.'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer"
                        >
                          Kembalikan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REKOMENDASI BUKU BERBASIS AI */}
      {subTab === 'rekomendasi-ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Form Column */}
          <form
            onSubmit={handleRunAIRecommendation}
            className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 self-start"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span>Kurator Literasi AI Islamicity</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Profil Minat & Target Bacaan Santri
              </h3>
              <p className="text-xs text-neutral-400">
                AI menganalisis hafalan ({santri.capaianJuz} Juz), rerata akademik ({avgNilai.toFixed(1)}), dan minat spesifik santri untuk memilihkan literatur terarah.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-medium text-neutral-400 block">
                Contoh Topik Cepat:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMinatBaca(preset.minat);
                      setTujuanBelajar(preset.tujuan);
                      setAiCategoryFocus(preset.kategori);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Rumpun Keilmuan Fokus
              </label>
              <select
                value={aiCategoryFocus}
                onChange={(e) => setAiCategoryFocus(e.target.value as ELibraryCategory | 'Semua')}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none cursor-pointer"
              >
                <option value="Semua">Lintas Semua Rumpun (Otomatis)</option>
                {LIBRARY_CATEGORIES.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Minat Baca & Tema Ketertarikan
              </label>
              <textarea
                rows={3}
                value={minatBaca}
                onChange={(e) => setMinatBaca(e.target.value)}
                placeholder="Contoh: Fiqih muamalah startup digital, manajemen haji, atau tafsir ayat kepemimpinan..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Tujuan Belajar / Target Pekan Ini
              </label>
              <input
                type="text"
                value={tujuanBelajar}
                onChange={(e) => setTujuanBelajar(e.target.value)}
                placeholder="Contoh: Menyusun makalah MQK atau persiapan studi lanjut..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAiLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-neutral-950 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Menyusun Rekomendasi AI...' : 'Hasilkan Rekomendasi Buku AI'}</span>
            </button>
          </form>

          {/* AI Results Column */}
          <div className="lg:col-span-7 space-y-4">
            {!aiResult ? (
              <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  Siap Mengkurasi Daftar Bacaan {santri.nama}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Lengkapi minat baca di sebelah kiri atau klik tombol di bawah ini untuk memperoleh 3 rekomendasi kitab/buku dari katalog beserta jadwal target baca pekanan.
                </p>
                <button
                  type="button"
                  onClick={() => void handleRunAIRecommendation()}
                  disabled={isAiLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mulai Kurasi AI Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-neutral-900 border border-emerald-700/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-emerald-400">
                      Analisis Karakter Literasi · {aiResult.santriNama}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {aiResult.assessedAt}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {aiResult.ringkasanMinat}
                  </p>
                </div>

                <div className="space-y-3">
                  {aiResult.bukuDirekomendasikan.map((rec, idx) => {
                    const matchedCatalogBook = booksWithAvailability.find(
                      (b) => b.kodeKitab === rec.kodeKitab || b.judul === rec.judulBuku
                    );

                    return (
                      <div
                        key={`${rec.kodeKitab}-${idx}`}
                        className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-emerald-400 font-semibold">
                            #{idx + 1} · {rec.kodeKitab} · {rec.kategori}
                          </span>
                          <span className="text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.targetBacaPekanan}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white">{rec.judulBuku}</h4>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {rec.alasanKesesuaian}
                        </p>

                        {matchedCatalogBook && (
                          <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                              Siap {matchedCatalogBook.stokTersedia}/{matchedCatalogBook.stokTotal} eks · {matchedCatalogBook.jumlahHalaman} hal
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReaderBook(matchedCatalogBook)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
                              >
                                Baca E-Reader
                              </button>
                              <button
                                type="button"
                                disabled={matchedCatalogBook.stokTersedia <= 0}
                                onClick={() => handleOpenBorrowModal(matchedCatalogBook)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 flex items-center gap-1 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Pinjam via QR</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Rencana Literasi Terstruktur Pekanan
                  </h4>
                  <ul className="space-y-1.5 text-xs text-neutral-300">
                    {aiResult.rencanaLiterasiSantri.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2 border-t border-neutral-800 text-xs text-emerald-300 italic">
                    “{aiResult.nasihatLiterasi}”
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DIGITAL E-READER & DETAIL BUKU */}
      {readerBook && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-neutral-800">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {readerBook.kodeKitab} · ISBN {readerBook.isbn} · {readerBook.kategori}
                </div>
                <h3 className="text-lg font-bold text-white leading-snug">
                  {readerBook.judul}
                </h3>
                {readerBook.judulArab && (
                  <p className="font-arabic text-base text-emerald-400" dir="rtl">
                    {readerBook.judulArab}
                  </p>
                )}
                <p className="text-xs text-neutral-400">
                  {readerBook.penulis} · {readerBook.penerbit} ({readerBook.tahunTerbit})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReaderBook(null)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                aria-label="Tutup E-Reader"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Sinopsis & Cakupan Bahasan
              </span>
              <p className="text-xs text-neutral-200 leading-relaxed">
                {readerBook.ringkasanIsi}
              </p>
              <div className="text-[11px] text-neutral-400 pt-1">
                Kata Kunci: <strong className="text-neutral-200">{readerBook.topikKunci.join(' · ')}</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-emerald-400">
                  Pratinjau E-Reader Digital
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  {(['sm', 'base', 'lg'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setReaderFontSize(sz)}
                      className={`px-2 py-0.5 rounded font-mono cursor-pointer ${
                        readerFontSize === sz
                          ? 'bg-emerald-500 text-neutral-950 font-bold'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {sz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`text-neutral-200 leading-relaxed whitespace-pre-line ${
                  readerFontSize === 'sm'
                    ? 'text-xs'
                    : readerFontSize === 'lg'
                    ? 'text-base'
                    : 'text-sm'
                }`}
              >
                {readerBook.cuplikanTeks}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-400 font-mono tabular-nums">
                {readerBook.jumlahHalaman} halaman · {readerBook.bahasa}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReaderBook(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = readerBook;
                    setReaderBook(null);
                    handleOpenBorrowModal(target);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pinjam & Terbitkan QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM PEMINJAMAN QR BARU */}
      {borrowTargetBook && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitBorrow}
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  Penerbitan Tiket Peminjaman QR · {borrowTargetBook.kodeKitab}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {borrowTargetBook.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBorrowTargetBook(null)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between">
              <span className="text-neutral-400">Santri Peminjam:</span>
              <span className="text-white font-semibold">
                {santri.nama} ({santri.nis})
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Jenis Akses Peminjaman
              </label>
              <select
                value={borrowType}
                onChange={(e) => setBorrowType(e.target.value as ELibraryLoan['jenisPinjam'])}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none"
              >
                <option value="Akses E-Reader QR">Akses E-Reader QR (Langsung Aktif)</option>
                <option value="Pinjam Fisik & Digital QR">Pinjam Eksemplar Fisik + E-Reader (Verifikasi Kios)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Durasi Peminjaman
              </label>
              <select
                value={borrowDays}
                onChange={(e) => setBorrowDays(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none"
              >
                <option value={7}>7 Hari (1 Pekan)</option>
                <option value={14}>14 Hari (2 Pekan)</option>
                <option value={21}>21 Hari (Riset Tugas Akhir)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Catatan Tujuan Baca / Riset
              </label>
              <textarea
                rows={2}
                value={borrowNote}
                onChange={(e) => setBorrowNote(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-neutral-100 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setBorrowTargetBook(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Terbitkan SVG QR Peminjaman</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: DETAIL KARTU QR PEMINJAMAN */}
      {selectedLoanQr && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  Tiket QR Perpustakaan Digital
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedLoanQr.judulBuku}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoanQr(null)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <div
                ref={qrSvgContainerRef}
                className="p-3 rounded-xl bg-white shadow-md"
              >
                <PermitSvgQrCode
                  value={selectedLoanQr.qrPayload}
                  size={180}
                  label={`QR Peminjaman ${selectedLoanQr.kodeKitab}`}
                />
              </div>
              <code className="text-[11px] font-mono text-cyan-300 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 break-all text-center">
                {selectedLoanQr.qrPayload}
              </code>
              <span className="text-xs font-semibold text-emerald-400">
                Status: {selectedLoanQr.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleCopyQrPayload(selectedLoanQr)}
                className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLoanId === selectedLoanQr.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode QR</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadLoanSvg(selectedLoanQr)}
                className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh SVG QR</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              {selectedLoanQr.status === 'Menunggu Ambil QR' && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateLoanStatus(
                      selectedLoanQr.id,
                      'Dipinjam (Aktif)',
                      'Diambil & diverifikasi QR oleh pustakawan.'
                    );
                    setSelectedLoanQr({
                      ...selectedLoanQr,
                      status: 'Dipinjam (Aktif)',
                    });
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                >
                  Konfirmasi Pengambilan QR
                </button>
              )}

              {(selectedLoanQr.status === 'Dipinjam (Aktif)' || selectedLoanQr.status === 'Terlambat') && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateLoanStatus(
                      selectedLoanQr.id,
                      'Dikembalikan',
                      'Buku dikembalikan via verifikasi kartu QR.'
                    );
                    setSelectedLoanQr(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer"
                >
                  Proses Pengembalian QR
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedLoanQr(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SIMULATOR SCANNER QR KIOS PERPUSTAKAAN */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Scanner & Verifikasi QR Kios E-Library
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Pindai atau masukkan token QR untuk check-out / check-in pengembalian buku.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Token Payload QR / Kode Kitab
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setScanNotice(null);
                }}
                placeholder="SC313-ELIB:EL-TAF-101:2024.10.0313:LOAN-001"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
              />
            </div>

            {safeLoans.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-400 block">
                  Pilih cepat tiket QR terdaftar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {safeLoans.slice(0, 4).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setScanInput(l.qrPayload);
                        setScanNotice(null);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-mono bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer"
                    >
                      {l.kodeKitab} ({l.status.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchedScannedLoan ? (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400">
                    Tiket Terverifikasi: {matchedScannedLoan.kodeKitab}
                  </span>
                  <span className="font-mono text-amber-300">{matchedScannedLoan.status}</span>
                </div>
                <p className="font-semibold text-white">{matchedScannedLoan.judulBuku}</p>
                <p className="text-neutral-400">
                  Peminjam: {matchedScannedLoan.santriNama} · NIS {matchedScannedLoan.nis}
                </p>

                {scanNotice && (
                  <p className={`font-medium ${scanNotice.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {scanNotice.text}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {matchedScannedLoan.status === 'Menunggu Ambil QR' && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLoanStatus(
                          matchedScannedLoan.id,
                          'Dipinjam (Aktif)',
                          'Check-out berhasil melalui pemindaian QR Kios Perpustakaan.'
                        );
                        setScanNotice({
                          ok: true,
                          text: 'Check-out QR berhasil. Buku kini berstatus Dipinjam (Aktif).',
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer"
                    >
                      Verifikasi Check-Out (Pinjam)
                    </button>
                  )}

                  {(matchedScannedLoan.status === 'Dipinjam (Aktif)' ||
                    matchedScannedLoan.status === 'Terlambat') && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLoanStatus(
                          matchedScannedLoan.id,
                          'Dikembalikan',
                          'Pengembalian tercatat melalui scanner QR Kios Perpustakaan.'
                        );
                        setScanNotice({
                          ok: true,
                          text: 'Check-in pengembalian QR berhasil & stok tersedia diperbarui.',
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer"
                    >
                      Verifikasi Check-In (Kembali)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
                Token QR belum cocok dengan catatan peminjaman. Periksa kembali kode kitab atau payload QR.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
