import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Type Definitions
export interface FirmInfo {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface TableData {
  headers: string[];
  rows: any[][];
  title?: string;
}

export interface ChartData {
  element: HTMLElement;
  title: string;
}

export interface ReportData {
  title?: string;
  dateRange?: DateRange;
  tables?: TableData[];
  charts?: ChartData[];
  summary?: { label: string; value: string | number }[];
  customContent?: any;
}

// Color Scheme (matching app theme - blues and grays)
const COLORS = {
  primary: [59, 130, 246], // Blue-500
  secondary: [107, 114, 128], // Gray-500
  headerBg: [30, 58, 138], // Blue-900
  alternateRow: [243, 244, 246], // Gray-100
  text: [31, 41, 55], // Gray-800
  textLight: [107, 114, 128], // Gray-500
  border: [229, 231, 235], // Gray-200
};

// Helper function to add header section
export function addHeaderToPDF(
  doc: jsPDF,
  title: string,
  firmInfo: FirmInfo,
  dateRange?: DateRange
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  let currentY = 20;

  // Firm name/logo section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(firmInfo.name, marginLeft, currentY);
  currentY += 8;

  // Firm contact info (smaller, gray)
  if (firmInfo.address || firmInfo.phone || firmInfo.email) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    
    const contactInfo: string[] = [];
    if (firmInfo.address) contactInfo.push(firmInfo.address);
    if (firmInfo.phone) contactInfo.push(`Tel: ${firmInfo.phone}`);
    if (firmInfo.email) contactInfo.push(firmInfo.email);
    
    doc.text(contactInfo.join(' | '), marginLeft, currentY);
    currentY += 6;
  }

  // Divider line
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 10;

  // Report title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(title, marginLeft, currentY);
  currentY += 10;

  // Date information (right-aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
  
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const generatedText = `Generated: ${dateGenerated}`;
  const generatedWidth = doc.getTextWidth(generatedText);
  doc.text(generatedText, pageWidth - marginRight - generatedWidth, currentY - 10);

  // Date range if provided
  if (dateRange) {
    const rangeText = `Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`;
    const rangeWidth = doc.getTextWidth(rangeText);
    doc.text(rangeText, pageWidth - marginRight - rangeWidth, currentY - 5);
  }

  currentY += 5;

  return currentY;
}

// Helper function to add footer section
export function addFooterToPDF(
  doc: jsPDF,
  pageNumber: number,
  totalPages?: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const footerY = pageHeight - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);

  // Page number (left)
  const pageText = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`;
  doc.text(pageText, marginLeft, footerY);

  // Timestamp (center)
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const timestampWidth = doc.getTextWidth(timestamp);
  doc.text(timestamp, (pageWidth - timestampWidth) / 2, footerY);

  // Confidential watermark (right)
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  const confidentialText = 'CONFIDENTIAL';
  const confidentialWidth = doc.getTextWidth(confidentialText);
  doc.text(confidentialText, pageWidth - marginRight - confidentialWidth, footerY);

  // Footer divider line
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
}

// Helper function to add table to PDF
export function addTableToPDF(
  doc: jsPDF,
  tableData: any[][],
  headers: string[],
  title?: string,
  startY?: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  let currentY = startY || 60;

  // Add table title if provided
  if (title) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(title, marginLeft, currentY);
    currentY += 8;
  }

  // Generate table using autoTable
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: currentY,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: COLORS.alternateRow,
    },
    margin: { left: marginLeft, right: 20 },
    didDrawPage: (data) => {
      // Add footer on each new page
      const pageCount = (doc as any).internal.getNumberOfPages();
      addFooterToPDF(doc, pageCount);
    },
  });

  // Return the Y position after table
  const finalY = (doc as any).lastAutoTable.finalY;
  return finalY + 10;
}

// Helper function to add chart to PDF
export async function addChartToPDF(
  doc: jsPDF,
  chartElement: HTMLElement,
  title: string,
  startY?: number
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  let currentY = startY || 60;

  try {
    // Add chart title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(title, marginLeft, currentY);
    currentY += 8;

    // Convert chart to canvas using html2canvas
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    });

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions to fit within page width
    const maxWidth = pageWidth - marginLeft - marginRight;
    const imgWidth = maxWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if image fits on current page
    const pageHeight = doc.internal.pageSize.getHeight();
    if (currentY + imgHeight > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
      // Add title again on new page
      doc.text(title, marginLeft, currentY);
      currentY += 8;
    }

    // Add image to PDF
    doc.addImage(imgData, 'PNG', marginLeft, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 10;

    return currentY;
  } catch (error) {
    console.error('Error adding chart to PDF:', error);
    // Add error message to PDF instead
    doc.setFontSize(10);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text('Chart could not be rendered', marginLeft, currentY);
    return currentY + 10;
  }
}

// Helper function to add summary section
function addSummarySection(
  doc: jsPDF,
  summary: { label: string; value: string | number }[],
  startY: number
): number {
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text('Summary', marginLeft, currentY);
  currentY += 8;

  // Create summary table
  const summaryData = summary.map(item => [item.label, String(item.value)]);
  
  autoTable(doc, {
    body: summaryData,
    startY: currentY,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' },
    },
    margin: { left: marginLeft, right: pageWidth / 2 },
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  return finalY + 10;
}

// Determine optimal orientation based on report type and data
function getOptimalOrientation(reportType: string, reportData: ReportData): 'portrait' | 'landscape' {
  // Use landscape for reports with wide tables or multiple columns
  const landscapeReports = ['financial-performance', 'time-billing', 'client-profitability'];
  
  if (landscapeReports.some(type => reportType.toLowerCase().includes(type))) {
    return 'landscape';
  }

  // Check if any table has many columns
  if (reportData.tables && reportData.tables.length > 0) {
    const maxColumns = Math.max(...reportData.tables.map(t => t.headers.length));
    if (maxColumns > 5) {
      return 'landscape';
    }
  }

  return 'portrait';
}

// Main export function
export async function exportReportToPDF(
  reportData: ReportData,
  reportType: string,
  firmInfo: FirmInfo
): Promise<void> {
  try {
    // Validate inputs
    if (!reportData) {
      throw new Error('Report data is required');
    }
    if (!reportType) {
      throw new Error('Report type is required');
    }
    if (!firmInfo || !firmInfo.name) {
      throw new Error('Firm information with name is required');
    }

    // Determine orientation
    const orientation = getOptimalOrientation(reportType, reportData);

    // Initialize PDF document
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
    });

    // Set default title if not provided
    const reportTitle = reportData.title || formatReportType(reportType);

    // Add header
    let currentY = addHeaderToPDF(doc, reportTitle, firmInfo, reportData.dateRange);
    currentY += 5;

    // Add summary section if available
    if (reportData.summary && reportData.summary.length > 0) {
      currentY = addSummarySection(doc, reportData.summary, currentY);
      currentY += 5;
    }

    // Add tables
    if (reportData.tables && reportData.tables.length > 0) {
      for (const table of reportData.tables) {
        // Check if we need a new page
        const pageHeight = doc.internal.pageSize.getHeight();
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 20;
        }

        currentY = addTableToPDF(
          doc,
          table.rows,
          table.headers,
          table.title,
          currentY
        );
        currentY += 5;
      }
    }

    // Add charts
    if (reportData.charts && reportData.charts.length > 0) {
      for (const chart of reportData.charts) {
        // Check if we need a new page
        const pageHeight = doc.internal.pageSize.getHeight();
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = 20;
        }

        currentY = await addChartToPDF(
          doc,
          chart.element,
          chart.title,
          currentY
        );
        currentY += 5;
      }
    }

    // Add footer to all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooterToPDF(doc, i, totalPages);
    }

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `${formatReportType(reportType)}-${date}.pdf`;

    // Download PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to format report type for display
function formatReportType(reportType: string): string {
  return reportType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Report-specific export functions for convenience

export async function exportFinancialPerformance(
  data: {
    metrics: { label: string; value: string | number }[];
    chartElements?: HTMLElement[];
    detailsTable?: { headers: string[]; rows: any[][] };
  },
  firmInfo: FirmInfo,
  dateRange: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Financial Performance Report',
    dateRange,
    summary: data.metrics,
    tables: data.detailsTable ? [data.detailsTable] : undefined,
    charts: data.chartElements
      ? data.chartElements.map((el, i) => ({
          element: el,
          title: `Chart ${i + 1}`,
        }))
      : undefined,
  };

  await exportReportToPDF(reportData, 'financial-performance', firmInfo);
}

export async function exportARAgingReport(
  data: {
    agingBuckets: { headers: string[]; rows: any[][] };
    summary: { label: string; value: string | number }[];
  },
  firmInfo: FirmInfo,
  dateRange?: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Accounts Receivable Aging Report',
    dateRange,
    summary: data.summary,
    tables: [data.agingBuckets],
  };

  await exportReportToPDF(reportData, 'ar-aging', firmInfo);
}

export async function exportClientProfitability(
  data: {
    clientTable: { headers: string[]; rows: any[][] };
    metrics: { label: string; value: string | number }[];
    chartElements?: HTMLElement[];
  },
  firmInfo: FirmInfo,
  dateRange: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Client Profitability Report',
    dateRange,
    summary: data.metrics,
    tables: [data.clientTable],
    charts: data.chartElements
      ? data.chartElements.map((el, i) => ({
          element: el,
          title: `Chart ${i + 1}`,
        }))
      : undefined,
  };

  await exportReportToPDF(reportData, 'client-profitability', firmInfo);
}

export async function exportTimeBillingReport(
  data: {
    utilizationTable: { headers: string[]; rows: any[][] };
    chartElements?: HTMLElement[];
    summary?: { label: string; value: string | number }[];
  },
  firmInfo: FirmInfo,
  dateRange: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Time & Billing Report',
    dateRange,
    summary: data.summary,
    tables: [data.utilizationTable],
    charts: data.chartElements
      ? data.chartElements.map((el, i) => ({
          element: el,
          title: `Chart ${i + 1}`,
        }))
      : undefined,
  };

  await exportReportToPDF(reportData, 'time-billing', firmInfo);
}

export async function exportProjectStatusReport(
  data: {
    projectTable: { headers: string[]; rows: any[][] };
    summary?: { label: string; value: string | number }[];
  },
  firmInfo: FirmInfo,
  dateRange?: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Project Status Report',
    dateRange,
    summary: data.summary,
    tables: [data.projectTable],
  };

  await exportReportToPDF(reportData, 'project-status', firmInfo);
}
