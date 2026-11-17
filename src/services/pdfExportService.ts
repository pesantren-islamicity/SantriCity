import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfExportTableConfig {
  filename: string;
  title: string;
  subtitle: string;
  exportedByRole: string;
  filterSummary: string;
  kpiSummary: string;
  columns: string[];
  rows: (string | number)[][];
}

export function exportReportToPdf(config: PdfExportTableConfig): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowStr = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Top Header Band
  doc.setFillColor(16, 185, 129); // emerald-500 accent bar
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('PONDOK PESANTREN SANTRICITY MASYARAKAT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(config.subtitle, 14, 19.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text(config.title, 14, 27);

  // Right-aligned export metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Dicetak: ${nowStr} WIB`, pageWidth - 14, 14, { align: 'right' });
  doc.text(`Otoritas: ${config.exportedByRole}`, pageWidth - 14, 19.5, { align: 'right' });
  doc.text(`Total Baris: ${config.rows.length}`, pageWidth - 14, 25, { align: 'right' });

  // Filter & KPI summary box
  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 30.5, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text(`Filter Aktif: ${config.filterSummary}`, 17, 35.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(config.kpiSummary, 17, 40);

  autoTable(doc, {
    startY: 46,
    head: [config.columns],
    body: config.rows.map((row) => row.map((cell) => String(cell))),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [6, 78, 59], // emerald-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(
        'Dokumen Resmi Konsol Admin SantriCity · Rahasia Kelembagaan',
        14,
        pageHeight - 8
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`${config.filename}_${dateSlug}.pdf`);
}
