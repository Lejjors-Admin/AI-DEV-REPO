import * as XLSX from 'xlsx';

// Type Definitions (matching pdf-export.ts for consistency)
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

export interface ReportData {
  title?: string;
  dateRange?: DateRange;
  tables?: TableData[];
  summary?: { label: string; value: string | number }[];
  customContent?: any;
}

// Excel styling constants
const EXCEL_STYLES = {
  headerFill: {
    fgColor: { rgb: "1E3A8A" } // Blue-900
  },
  headerFont: {
    bold: true,
    color: { rgb: "FFFFFF" }
  },
  summaryLabelFont: {
    bold: true
  },
  currencyFormat: "$#,##0.00",
  percentageFormat: "0.00%",
  dateFormat: "mm/dd/yyyy",
  numberFormat: "#,##0.00"
};

/**
 * Creates a formatted worksheet with headers and data
 * @param data - 2D array of data rows
 * @param headers - Array of header strings
 * @param columnWidths - Optional array of column widths
 * @returns XLSX worksheet object
 */
export function createWorksheet(
  data: any[][],
  headers: string[],
  columnWidths?: number[]
): XLSX.WorkSheet {
  // Combine headers and data
  const sheetData = [headers, ...data];
  
  // Create worksheet from array of arrays
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Apply header styling
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    // Apply bold and background color to headers
    worksheet[cellAddress].s = {
      font: EXCEL_STYLES.headerFont,
      fill: EXCEL_STYLES.headerFill,
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  
  // Set column widths
  if (columnWidths && columnWidths.length > 0) {
    worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
  } else {
    // Auto-size columns based on content
    worksheet['!cols'] = autoSizeColumns(sheetData);
  }
  
  return worksheet;
}

/**
 * Auto-calculates column widths based on content
 * @param data - 2D array of sheet data
 * @returns Array of column width objects
 */
function autoSizeColumns(data: any[][]): XLSX.ColInfo[] {
  const columnWidths: number[] = [];
  
  data.forEach(row => {
    row.forEach((cell, colIndex) => {
      const cellValue = cell?.toString() || '';
      const cellLength = cellValue.length;
      
      if (!columnWidths[colIndex] || cellLength > columnWidths[colIndex]) {
        columnWidths[colIndex] = Math.min(cellLength + 2, 50); // Max width of 50
      }
    });
  });
  
  return columnWidths.map(width => ({ wch: width || 10 }));
}

/**
 * Adds a summary sheet with report metadata
 * @param workbook - XLSX workbook object
 * @param metadata - Object containing report metadata
 * @param firmInfo - Firm information
 * @param dateRange - Optional date range
 */
export function addSummarySheet(
  workbook: XLSX.WorkBook,
  metadata: {
    reportTitle: string;
    generatedDate: string;
    summary?: { label: string; value: string | number }[];
  },
  firmInfo: FirmInfo,
  dateRange?: DateRange
): void {
  const summaryData: any[][] = [];
  
  // Firm information section
  summaryData.push(['REPORT INFORMATION']);
  summaryData.push(['Firm Name', firmInfo.name]);
  if (firmInfo.address) summaryData.push(['Address', firmInfo.address]);
  if (firmInfo.phone) summaryData.push(['Phone', firmInfo.phone]);
  if (firmInfo.email) summaryData.push(['Email', firmInfo.email]);
  summaryData.push([]); // Empty row
  
  // Report details
  summaryData.push(['REPORT DETAILS']);
  summaryData.push(['Report Title', metadata.reportTitle]);
  summaryData.push(['Generated Date', metadata.generatedDate]);
  
  if (dateRange) {
    summaryData.push(['Period Start', new Date(dateRange.startDate).toLocaleDateString()]);
    summaryData.push(['Period End', new Date(dateRange.endDate).toLocaleDateString()]);
  }
  summaryData.push([]); // Empty row
  
  // Summary metrics if provided
  if (metadata.summary && metadata.summary.length > 0) {
    summaryData.push(['SUMMARY METRICS']);
    metadata.summary.forEach(item => {
      summaryData.push([item.label, item.value]);
    });
  }
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Apply styling to section headers (rows with single cell)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    if (cellA && summaryData[row].length === 1) {
      // Section header
      cellA.s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: "E5E7EB" } } // Gray-200
      };
    } else if (cellA) {
      // Label column (bold)
      cellA.s = {
        font: EXCEL_STYLES.summaryLabelFont
      };
    }
  }
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Label column
    { wch: 40 }  // Value column
  ];
  
  // Add to workbook as first sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
}

/**
 * Formats a cell range as currency
 * @param worksheet - XLSX worksheet object
 * @param cellRange - Cell range in A1 notation (e.g., "B2:B10")
 */
export function formatCurrency(worksheet: XLSX.WorkSheet, cellRange: string): void {
  const range = XLSX.utils.decode_range(cellRange);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n'; // Number type
        cell.z = EXCEL_STYLES.currencyFormat;
      }
    }
  }
}

/**
 * Formats a cell range as percentage
 * @param worksheet - XLSX worksheet object
 * @param cellRange - Cell range in A1 notation (e.g., "C2:C10")
 */
export function formatPercentage(worksheet: XLSX.WorkSheet, cellRange: string): void {
  const range = XLSX.utils.decode_range(cellRange);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n'; // Number type
        cell.z = EXCEL_STYLES.percentageFormat;
      }
    }
  }
}

/**
 * Formats a cell range as date
 * @param worksheet - XLSX worksheet object
 * @param cellRange - Cell range in A1 notation (e.g., "A2:A10")
 */
export function formatDate(worksheet: XLSX.WorkSheet, cellRange: string): void {
  const range = XLSX.utils.decode_range(cellRange);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell) {
        // Convert string dates to Excel date serial numbers
        if (typeof cell.v === 'string') {
          const date = new Date(cell.v);
          if (!isNaN(date.getTime())) {
            cell.v = date;
            cell.t = 'd'; // Date type
          }
        }
        
        if (cell.t === 'd' || cell.v instanceof Date) {
          cell.z = EXCEL_STYLES.dateFormat;
        }
      }
    }
  }
}

/**
 * Formats a cell range as number with thousand separators
 * @param worksheet - XLSX worksheet object
 * @param cellRange - Cell range in A1 notation
 */
export function formatNumber(worksheet: XLSX.WorkSheet, cellRange: string): void {
  const range = XLSX.utils.decode_range(cellRange);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = EXCEL_STYLES.numberFormat;
      }
    }
  }
}

/**
 * Main Excel export function - exports report data to Excel workbook
 * @param reportData - Report data including tables, summary, etc.
 * @param reportType - Type of report (e.g., 'financial-performance')
 * @param firmInfo - Firm information for header
 */
export async function exportReportToExcel(
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

    // Create new workbook
    const workbook = XLSX.utils.book_new();
    
    // Set workbook properties
    workbook.Props = {
      Title: reportData.title || formatReportType(reportType),
      Subject: `${formatReportType(reportType)} Report`,
      Author: firmInfo.name,
      CreatedDate: new Date()
    };

    // Add summary sheet
    addSummarySheet(
      workbook,
      {
        reportTitle: reportData.title || formatReportType(reportType),
        generatedDate: new Date().toLocaleString(),
        summary: reportData.summary
      },
      firmInfo,
      reportData.dateRange
    );

    // Add data sheets for each table
    if (reportData.tables && reportData.tables.length > 0) {
      reportData.tables.forEach((table, index) => {
        const sheetName = table.title || `Data ${index + 1}`;
        const worksheet = createWorksheet(table.rows, table.headers);
        
        // Apply report-type specific formatting
        applyReportTypeFormatting(worksheet, reportType, table.headers);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));
      });
    }

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `${formatReportType(reportType)}-${date}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Applies report-type specific formatting to worksheet
 * @param worksheet - XLSX worksheet object
 * @param reportType - Type of report
 * @param headers - Column headers for identifying columns
 */
function applyReportTypeFormatting(
  worksheet: XLSX.WorkSheet,
  reportType: string,
  headers: string[]
): void {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const dataRowStart = 2; // Row 1 is headers, data starts at row 2
  
  // Find columns by header name (case-insensitive)
  const findColumn = (searchTerms: string[]): number => {
    return headers.findIndex(header => 
      searchTerms.some(term => header.toLowerCase().includes(term.toLowerCase()))
    );
  };

  // Financial Performance Report
  if (reportType.toLowerCase().includes('financial')) {
    const revenueCol = findColumn(['revenue', 'income', 'sales']);
    const expenseCol = findColumn(['expense', 'cost']);
    const profitCol = findColumn(['profit', 'net income', 'margin']);
    
    if (revenueCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(revenueCol)}${dataRowStart}:${XLSX.utils.encode_col(revenueCol)}${range.e.r + 1}`);
    }
    if (expenseCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(expenseCol)}${dataRowStart}:${XLSX.utils.encode_col(expenseCol)}${range.e.r + 1}`);
    }
    if (profitCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(profitCol)}${dataRowStart}:${XLSX.utils.encode_col(profitCol)}${range.e.r + 1}`);
    }
  }

  // AR Aging Report
  if (reportType.toLowerCase().includes('ar') || reportType.toLowerCase().includes('aging')) {
    const amountCol = findColumn(['amount', 'balance', 'total']);
    const dateCol = findColumn(['date', 'due date', 'invoice date']);
    
    if (amountCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(amountCol)}${dataRowStart}:${XLSX.utils.encode_col(amountCol)}${range.e.r + 1}`);
    }
    if (dateCol >= 0) {
      formatDate(worksheet, `${XLSX.utils.encode_col(dateCol)}${dataRowStart}:${XLSX.utils.encode_col(dateCol)}${range.e.r + 1}`);
    }
  }

  // Client Profitability Report
  if (reportType.toLowerCase().includes('profitability') || reportType.toLowerCase().includes('client')) {
    const revenueCol = findColumn(['revenue', 'billing', 'fees']);
    const costCol = findColumn(['cost', 'expense']);
    const marginCol = findColumn(['margin', 'profit %', 'profitability']);
    
    if (revenueCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(revenueCol)}${dataRowStart}:${XLSX.utils.encode_col(revenueCol)}${range.e.r + 1}`);
    }
    if (costCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(costCol)}${dataRowStart}:${XLSX.utils.encode_col(costCol)}${range.e.r + 1}`);
    }
    if (marginCol >= 0) {
      formatPercentage(worksheet, `${XLSX.utils.encode_col(marginCol)}${dataRowStart}:${XLSX.utils.encode_col(marginCol)}${range.e.r + 1}`);
    }
  }

  // Time & Billing Report
  if (reportType.toLowerCase().includes('time') || reportType.toLowerCase().includes('billing')) {
    const hoursCol = findColumn(['hours', 'time', 'billable hours']);
    const rateCol = findColumn(['rate', 'hourly rate']);
    const amountCol = findColumn(['amount', 'total', 'billing']);
    const utilizationCol = findColumn(['utilization', 'efficiency', '%']);
    
    if (hoursCol >= 0) {
      formatNumber(worksheet, `${XLSX.utils.encode_col(hoursCol)}${dataRowStart}:${XLSX.utils.encode_col(hoursCol)}${range.e.r + 1}`);
    }
    if (rateCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(rateCol)}${dataRowStart}:${XLSX.utils.encode_col(rateCol)}${range.e.r + 1}`);
    }
    if (amountCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(amountCol)}${dataRowStart}:${XLSX.utils.encode_col(amountCol)}${range.e.r + 1}`);
    }
    if (utilizationCol >= 0) {
      formatPercentage(worksheet, `${XLSX.utils.encode_col(utilizationCol)}${dataRowStart}:${XLSX.utils.encode_col(utilizationCol)}${range.e.r + 1}`);
    }
  }

  // Project Status Report
  if (reportType.toLowerCase().includes('project') || reportType.toLowerCase().includes('status')) {
    const progressCol = findColumn(['progress', 'complete', '%']);
    const budgetCol = findColumn(['budget', 'estimate']);
    const actualCol = findColumn(['actual', 'spent']);
    const dateCol = findColumn(['date', 'due date', 'deadline']);
    
    if (progressCol >= 0) {
      formatPercentage(worksheet, `${XLSX.utils.encode_col(progressCol)}${dataRowStart}:${XLSX.utils.encode_col(progressCol)}${range.e.r + 1}`);
    }
    if (budgetCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(budgetCol)}${dataRowStart}:${XLSX.utils.encode_col(budgetCol)}${range.e.r + 1}`);
    }
    if (actualCol >= 0) {
      formatCurrency(worksheet, `${XLSX.utils.encode_col(actualCol)}${dataRowStart}:${XLSX.utils.encode_col(actualCol)}${range.e.r + 1}`);
    }
    if (dateCol >= 0) {
      formatDate(worksheet, `${XLSX.utils.encode_col(dateCol)}${dataRowStart}:${XLSX.utils.encode_col(dateCol)}${range.e.r + 1}`);
    }
  }
}

/**
 * Exports table data to CSV format
 * @param tableData - Table data with headers and rows
 * @param filename - Custom filename (without extension)
 */
export function exportReportToCSV(
  tableData: TableData,
  filename: string
): void {
  try {
    // Validate inputs
    if (!tableData || !tableData.headers || !tableData.rows) {
      throw new Error('Valid table data with headers and rows is required');
    }
    if (!filename) {
      throw new Error('Filename is required');
    }

    // Create worksheet from table data
    const sheetData = [tableData.headers, ...tableData.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Convert worksheet to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      // Create download link
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } else {
      throw new Error('Browser does not support file downloads');
    }
  } catch (error) {
    console.error('Error generating CSV file:', error);
    throw new Error(`Failed to generate CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitizes sheet name for Excel compatibility
 * @param name - Original sheet name
 * @returns Sanitized sheet name
 */
function sanitizeSheetName(name: string): string {
  // Excel sheet names must be <= 31 characters and cannot contain: \ / ? * [ ]
  return name
    .replace(/[\\\/\?\*\[\]]/g, '')
    .substring(0, 31);
}

/**
 * Formats report type string for display
 * @param reportType - Report type identifier
 * @returns Formatted report type
 */
function formatReportType(reportType: string): string {
  return reportType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Report-specific export functions for convenience

/**
 * Exports Financial Performance report to Excel
 */
export async function exportFinancialPerformance(
  data: {
    metrics: { label: string; value: string | number }[];
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
  };

  await exportReportToExcel(reportData, 'financial-performance', firmInfo);
}

/**
 * Exports AR Aging report to Excel
 */
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

  await exportReportToExcel(reportData, 'ar-aging', firmInfo);
}

/**
 * Exports Client Profitability report to Excel
 */
export async function exportClientProfitability(
  data: {
    clientTable: { headers: string[]; rows: any[][] };
    metrics: { label: string; value: string | number }[];
  },
  firmInfo: FirmInfo,
  dateRange: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title: 'Client Profitability Report',
    dateRange,
    summary: data.metrics,
    tables: [data.clientTable],
  };

  await exportReportToExcel(reportData, 'client-profitability', firmInfo);
}

/**
 * Exports Time & Billing report to Excel
 */
export async function exportTimeBillingReport(
  data: {
    utilizationTable: { headers: string[]; rows: any[][] };
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
  };

  await exportReportToExcel(reportData, 'time-billing', firmInfo);
}

/**
 * Exports Project Status report to Excel
 */
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

  await exportReportToExcel(reportData, 'project-status', firmInfo);
}

/**
 * Generic table export to Excel (for any data)
 */
export async function exportGenericTable(
  tableData: TableData,
  title: string,
  firmInfo: FirmInfo,
  dateRange?: DateRange
): Promise<void> {
  const reportData: ReportData = {
    title,
    dateRange,
    tables: [tableData],
  };

  await exportReportToExcel(reportData, 'generic-table', firmInfo);
}
