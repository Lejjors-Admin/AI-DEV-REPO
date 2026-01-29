import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears, parse, parseISO, isValid } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Download,
  FileText,
  Loader2,
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Building,
  RefreshCw,
  FileBox,
  BarChart,
  Activity,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table as DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GeneralLedgerModal from "./GeneralLedgerModal";
import AccountsPayableAging from "../vendor/AccountsPayableAging";
import AccountsReceivableAging from "../crm/AccountsReceivableAging";
import { apiConfig } from "@/lib/api-config";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

interface ReportsTabProps {
  clientId: string | null;
}

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  frequency: string[];
  customizable: boolean;
  dataSource: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  // Financial Statements
  { id: 'balance-sheet', name: 'Balance Sheet', category: 'Financial Statements', description: 'Assets, liabilities, and equity at a point in time', icon: BarChart3, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'accounts' },
  { id: 'profit-loss', name: 'Profit & Loss', category: 'Financial Statements', description: 'Revenue and expenses over time', icon: TrendingUp, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'transactions' },
  { id: 'cash-flow', name: 'Cash Flow Statement', category: 'Financial Statements', description: 'Cash receipts and payments', icon: DollarSign, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'transactions' },
  { id: 'trial-balance', name: 'Trial Balance', category: 'Financial Statements', description: 'Account balances for verification', icon: PieChart, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'accounts' },
  
  // Transaction Reports
  { id: 'general-ledger', name: 'General Ledger', category: 'Transaction Reports', description: 'Detailed account transactions', icon: Building, frequency: ['Daily', 'Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'accounts-receivable', name: 'Accounts Receivable', category: 'Transaction Reports', description: 'Outstanding customer invoices', icon: FileText, frequency: ['Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'accounts-payable', name: 'Accounts Payable', category: 'Transaction Reports', description: 'Outstanding vendor bills', icon: FileText, frequency: ['Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  
  // Analytics Reports
  { id: 'revenue-analysis', name: 'Revenue Analysis', category: 'Analytics', description: 'Revenue trends and breakdowns', icon: BarChart, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  { id: 'expense-analysis', name: 'Expense Analysis', category: 'Analytics', description: 'Expense categorization and trends', icon: Activity, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
];

export default function ReportsTab({ clientId }: ReportsTabProps) {

  const { selectedClientName } = useSelectedClient();

  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("balance-sheet");
  const [datePreset, setDatePreset] = useState<string>("current-fiscal-year");
  const [includePriorPeriod, setIncludePriorPeriod] = useState<boolean>(true);
  const [priorPeriodData, setPriorPeriodData] = useState<any>(null);
  const [customDateRange, setCustomDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClosingBooks, setIsClosingBooks] = useState(false);
  const [lastClosingEntry, setLastClosingEntry] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [periodType, setPeriodType] = useState<'single' | 'monthly' | 'quarterly' | 'yearly'>('single');
  const [columnarData, setColumnarData] = useState<any>(null);
  const [cashFlowMethod, setCashFlowMethod] = useState<'direct' | 'indirect'>('indirect');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today
  );

  // State for General Ledger drill-down
  const [selectedAccount, setSelectedAccount] = useState<{
    id: number;
    name: string;
    accountNumber: string;
    type: string;
  } | null>(null);
  const [isGeneralLedgerOpen, setIsGeneralLedgerOpen] = useState(false);

  // Text input states for manual date entry
  const [fromDateText, setFromDateText] = useState<string>("");
  const [toDateText, setToDateText] = useState<string>("");
  const [fromDateError, setFromDateError] = useState<string>("");
  const [toDateError, setToDateError] = useState<string>("");

  // Dimension filter states for P&L
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [dimensionType, setDimensionType] = useState<string>("all"); // 'all', 'project', 'location', 'class'
  const [dimensionValue, setDimensionValue] = useState<string>("all");

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Fetch bookkeeping settings for fiscal year information
  const { data: bookkeepingSettings } = useQuery({
    queryKey: [`/api/clients/${clientId}/bookkeeping-settings`],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/clients/${clientId}/bookkeeping-settings`), { credentials: 'include', headers }).then(res => res.json()),
    enabled: !!clientId
  });

  // Fetch dimension data for P&L filtering
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', clientId],
    enabled: !!clientId && selectedTemplate === 'profit-loss',
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`), { credentials: 'include', headers });
      const json = await res.json();
      return json.data || [];
    }
  });

  const { data: locations = [] } = useQuery<any[]>({
    queryKey: [`/api/locations/${clientId}`],
    enabled: !!clientId && selectedTemplate === 'profit-loss',
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/locations/${clientId}`), { credentials: 'include', headers });
      const json = await res.json();
      return json.data || [];
    }
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: [`/api/classes/${clientId}`],
    enabled: !!clientId && selectedTemplate === 'profit-loss',
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/classes/${clientId}`), { credentials: 'include', headers });
      const json = await res.json();
      return json.data || [];
    }
  });

  // Reset dimension filters when switching away from P&L
  useEffect(() => {
    if (selectedTemplate !== 'profit-loss') {
      setSelectedProjectId("all");
      setSelectedLocationId("all");
      setSelectedClassId("all");
      setDimensionType("all");
      setDimensionValue("all");
    }
  }, [selectedTemplate]);

  // Sync unified dimension filter with individual states
  useEffect(() => {
    if (dimensionType === 'all') {
      setSelectedProjectId("all");
      setSelectedLocationId("all");
      setSelectedClassId("all");
    } else if (dimensionType === 'project') {
      setSelectedProjectId(dimensionValue);
      setSelectedLocationId("all");
      setSelectedClassId("all");
    } else if (dimensionType === 'location') {
      setSelectedProjectId("all");
      setSelectedLocationId(dimensionValue);
      setSelectedClassId("all");
    } else if (dimensionType === 'class') {
      setSelectedProjectId("all");
      setSelectedLocationId("all");
      setSelectedClassId(dimensionValue);
    }
  }, [dimensionType, dimensionValue]);

  // Reset dimension value when type changes
  useEffect(() => {
    setDimensionValue("all");
  }, [dimensionType]);

  // Helper function to get fiscal year dates
  const getFiscalYearDates = (yearOffset: number = 0, specificFiscalYear?: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get fiscal year end from bookkeeping settings
    // Defaults to December 31st if no specific fiscal year is configured
    const fiscalYearEndMonth = bookkeepingSettings?.fiscalYearEndMonth || 12; // December
    const fiscalYearEndDay = bookkeepingSettings?.fiscalYearEndDay || 31; // 31st
    
    let fiscalYearEnd: Date;
    
    if (specificFiscalYear) {
      // When a specific fiscal year is requested (e.g., 2005)
      // Fiscal year 2005 ends on Aug 31, 2005 and starts Sep 1, 2004
      fiscalYearEnd = new Date(specificFiscalYear, fiscalYearEndMonth - 1, fiscalYearEndDay);
    } else {
      // Calculate the fiscal year end date for the current fiscal year
      // Start with the fiscal year end date in the current calendar year
      fiscalYearEnd = new Date(currentYear, fiscalYearEndMonth - 1, fiscalYearEndDay);
      
      // Determine which fiscal year we're currently in
      // If we're past the fiscal year end date, we're in the next fiscal year
      if (now > fiscalYearEnd) {
        // We're past this year's fiscal end, so current fiscal year ends next calendar year
        fiscalYearEnd = new Date(currentYear + 1, fiscalYearEndMonth - 1, fiscalYearEndDay);
      }
      
      // Apply the year offset to get the requested fiscal year
      if (yearOffset !== 0) {
        fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + yearOffset);
      }
    }
    
    // Fiscal year start is the day after the previous year's fiscal year end
    // Create a date one year before the fiscal year end
    const fiscalYearStart = new Date(fiscalYearEnd);
    fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
    // Then add one day to get the day after
    fiscalYearStart.setDate(fiscalYearStart.getDate() + 1);
    
    return { from: fiscalYearStart, to: fiscalYearEnd };
  };

  // Enhanced date range presets with fiscal year support
  const getDateRange = (preset: string) => {
    const now = new Date();
    
    // Handle specific fiscal year presets (e.g., "fiscal-2005")
    if (preset.startsWith('fiscal-')) {
      const yearStr = preset.replace('fiscal-', '');
      const year = parseInt(yearStr);
      if (!isNaN(year)) {
        return getFiscalYearDates(0, year);
      }
    }
    
    switch (preset) {
      case 'current-month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'current-quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
      case 'q1-current':
        const q1Start = new Date(now.getFullYear(), 0, 1);
        const q1End = new Date(now.getFullYear(), 2, 31);
        return { from: q1Start, to: q1End };
      case 'q2-current':
        const q2Start = new Date(now.getFullYear(), 3, 1);
        const q2End = new Date(now.getFullYear(), 5, 30);
        return { from: q2Start, to: q2End };
      case 'q3-current':
        const q3Start = new Date(now.getFullYear(), 6, 1);
        const q3End = new Date(now.getFullYear(), 8, 30);
        return { from: q3Start, to: q3End };
      case 'q4-current':
        const q4Start = new Date(now.getFullYear(), 9, 1);
        const q4End = new Date(now.getFullYear(), 11, 31);
        return { from: q4Start, to: q4End };
      case 'current-year':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'last-year':
        const lastYear = subYears(now, 1);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      case 'year-to-date':
        return { from: startOfYear(now), to: now };
      case 'current-fiscal-year':
        return getFiscalYearDates(0);
      case 'last-fiscal-year':
        return getFiscalYearDates(-1);
      case 'fiscal-year-to-date':
        const fiscalYearDates = getFiscalYearDates(0);
        return { from: fiscalYearDates.from, to: now };
      default:
        return customDateRange;
    }
  };

  // Get effective date range
  const effectiveDateRange = showCustomDate ? customDateRange : getDateRange(datePreset);

  // Parse date from text input with multiple format support
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr.trim()) return null;
    
    const cleanStr = dateStr.trim();
    
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const date = parseISO(cleanStr);
      return isValid(date) ? date : null;
    }
    
    // Handle MM/DD/YYYY and DD/MM/YYYY formats with smart disambiguation
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanStr)) {
      const [, month, day, year] = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || [];
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Smart disambiguation: if first number > 12, it must be DD/MM/YYYY
      if (monthNum > 12) {
        const date = parse(cleanStr, 'd/M/yyyy', new Date());
        return isValid(date) ? date : null;
      }
      // If second number > 12, it must be MM/DD/YYYY
      else if (dayNum > 12) {
        const date = parse(cleanStr, 'M/d/yyyy', new Date());
        return isValid(date) ? date : null;
      }
      // Both numbers <= 12, try MM/DD/YYYY first, then DD/MM/YYYY as fallback
      else {
        const mmddDate = parse(cleanStr, 'M/d/yyyy', new Date());
        if (isValid(mmddDate)) {
          return mmddDate;
        }
        const ddmmDate = parse(cleanStr, 'd/M/yyyy', new Date());
        return isValid(ddmmDate) ? ddmmDate : null;
      }
    }
    
    // Try parsing various other formats
    const formats = [
      'yyyy-M-d',
      'M-d-yyyy',
      'd-M-yyyy',
      'MMM d, yyyy',
      'MMM dd, yyyy',
      'd MMM yyyy',
      'dd MMM yyyy',
      'MMMM d, yyyy',
      'd MMMM yyyy'
    ];
    
    for (const format of formats) {
      try {
        const date = parse(cleanStr, format, new Date());
        if (isValid(date)) {
          return date;
        }
      } catch (e) {
        // Continue to next format
      }
    }
    
    return null;
  };

  // Handle from date text change
  const handleFromDateChange = (value: string) => {
    setFromDateText(value);
    
    if (!value.trim()) {
      setFromDateError("");
      return;
    }
    
    const parsedDate = parseDate(value);
    if (parsedDate) {
      setCustomDateRange(prev => ({ ...prev, from: parsedDate }));
      setFromDateError("");
    } else {
      setFromDateError("Invalid date format. Try: 2023-12-31, 12/31/2023, or Dec 31, 2023");
    }
  };

  // Handle to date text change
  const handleToDateChange = (value: string) => {
    setToDateText(value);
    
    if (!value.trim()) {
      setToDateError("");
      return;
    }
    
    const parsedDate = parseDate(value);
    if (parsedDate) {
      setCustomDateRange(prev => ({ ...prev, to: parsedDate }));
      setToDateError("");
    } else {
      setToDateError("Invalid date format. Try: 2023-12-31, 12/31/2023, or Dec 31, 2023");
    }
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Update date range when preset changes
  useEffect(() => {
    if (!showCustomDate) {
      const range = getDateRange(datePreset);
      setCustomDateRange(range);
    }
  }, [datePreset, showCustomDate]);

  // Get prior period date range
  const getPriorPeriodRange = () => {
    const currentRange = effectiveDateRange;
    
    // For balance sheet (point-in-time reports), subtract 1 year from the date
    if (selectedTemplate === 'balance-sheet') {
      const priorDate = new Date(currentRange.to);
      priorDate.setFullYear(priorDate.getFullYear() - 1);
      return { from: priorDate, to: priorDate };
    }
    
    // For specific fiscal year selections (e.g., "fiscal-2005")
    if (datePreset.startsWith('fiscal-')) {
      const yearStr = datePreset.replace('fiscal-', '');
      const year = parseInt(yearStr);
      if (!isNaN(year)) {
        // Get the prior fiscal year (year - 1)
        return getFiscalYearDates(0, year - 1);
      }
    }
    
    // For relative fiscal year comparisons
    if (datePreset.includes('fiscal-year')) {
      if (datePreset === 'current-fiscal-year') {
        return getFiscalYearDates(-1);
      } else if (datePreset === 'last-fiscal-year') {
        return getFiscalYearDates(-2);
      }
    }
    
    // For period reports (P&L, etc.), calculate equivalent prior period
    const duration = currentRange.to.getTime() - currentRange.from.getTime();
    const priorFrom = new Date(currentRange.from.getTime() - duration);
    const priorTo = new Date(currentRange.to.getTime() - duration);
    
    return { from: priorFrom, to: priorTo };
  };

  // Generate report with optional prior period comparison
  const generateReport = async () => {
    if (!clientId || !selectedTemplate) {
      toast({
        title: "Missing Information",
        description: "Please select a client and report template.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setReportData(null);
    setPriorPeriodData(null);

    try {
      const formattedStartDate = format(effectiveDateRange.from, 'yyyy-MM-dd');
      const formattedEndDate = format(effectiveDateRange.to, 'yyyy-MM-dd');

      // Skip fetching for aging reports - they're handled by dedicated components
      if (selectedTemplate === 'accounts-receivable' || selectedTemplate === 'accounts-payable') {
        setReportData({ type: selectedTemplate }); // Set minimal data to trigger render
        setIsGenerating(false);
        toast({
          title: "Report Ready",
          description: `${REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name} report is ready to view.`,
        });
        return;
      }

      let endpoint = "";
      switch (selectedTemplate) {
        case 'balance-sheet':
          endpoint = `/api/reports/balance-sheet/${clientId}?date=${formattedEndDate}`;
          break;
        case 'profit-loss':
          endpoint = `/api/reports/profit-loss/${clientId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
          if (periodType !== 'single') {
            endpoint += `&periodType=${periodType}`;
          }
          // Add dimension filters (skip "all" which means no filter)
          if (selectedProjectId && selectedProjectId !== 'all') endpoint += `&projectId=${selectedProjectId}`;
          if (selectedLocationId && selectedLocationId !== 'all') endpoint += `&locationId=${selectedLocationId}`;
          if (selectedClassId && selectedClassId !== 'all') endpoint += `&classId=${selectedClassId}`;
          break;
        case 'cash-flow':
          endpoint = `/api/reports/cash-flow/${clientId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}&method=${cashFlowMethod}`;
          break;
        case 'trial-balance':
          endpoint = `/api/reports/trial-balance/${clientId}?date=${formattedEndDate}`;
          break;
        case 'general-ledger':
          endpoint = `/api/reports/general-ledger/${clientId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
          break;
        default:
          throw new Error("Unsupported report type");
      }

      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Generate current period report
      const response = await fetch(apiConfig.buildUrl(endpoint), {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in to generate reports.");
        }
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const data = await response.json();
      setReportData(data);

      // Generate prior period comparison if requested
      if (includePriorPeriod && selectedTemplate !== 'general-ledger') {
        const priorRange = getPriorPeriodRange();
        const priorStartDate = format(priorRange.from, 'yyyy-MM-dd');
        const priorEndDate = format(priorRange.to, 'yyyy-MM-dd');

        let priorEndpoint = "";
        switch (selectedTemplate) {
          case 'balance-sheet':
            priorEndpoint = `/api/reports/balance-sheet/${clientId}?date=${priorEndDate}`;
            break;
          case 'profit-loss':
            priorEndpoint = `/api/reports/profit-loss/${clientId}?startDate=${priorStartDate}&endDate=${priorEndDate}`;
            // Add dimension filters to prior period (skip "all" which means no filter)
            if (selectedProjectId && selectedProjectId !== 'all') priorEndpoint += `&projectId=${selectedProjectId}`;
            if (selectedLocationId && selectedLocationId !== 'all') priorEndpoint += `&locationId=${selectedLocationId}`;
            if (selectedClassId && selectedClassId !== 'all') priorEndpoint += `&classId=${selectedClassId}`;
            break;
          case 'trial-balance':
            priorEndpoint = `/api/reports/trial-balance/${clientId}?date=${priorEndDate}`;
            break;
        }

        if (priorEndpoint) {
          try {
            const priorResponse = await fetch(apiConfig.buildUrl(priorEndpoint), {
              credentials: 'include',
              headers
            });
            if (priorResponse.ok) {
              const priorData = await priorResponse.json();
              setPriorPeriodData(priorData);
            }
          } catch (priorError) {
            console.warn('Could not fetch prior period data:', priorError);
          }
        }
      }

      toast({
        title: "Report Generated",
        description: `${REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name} has been generated successfully.`,
      });

    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Download CSV
  const downloadCSV = () => {
    if (!reportData) return;

    let csvData: string[][] = [];
    const reportName = REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || "Report";

    if (selectedTemplate === 'balance-sheet' && reportData.assets) {
      csvData = [
        [reportName, reportData.clientName],
        ['As of', format(effectiveDateRange.to, 'MMM d, yyyy')],
        [''],
        ['ASSETS'],
        ['Current Assets'],
        ...(reportData.assets.currentAssets?.accounts || reportData.assets.current || []).map((asset: any) => [asset.name, asset.balance || 0]),
        ['Total Current Assets', reportData.assets.currentAssets?.total || reportData.assets.totalCurrent || 0],
        [''],
        ['Fixed Assets'],
        ...(reportData.assets.fixedAssets?.accounts || reportData.assets.fixed || []).map((asset: any) => [asset.name, asset.balance || 0]),
        ['Total Fixed Assets', reportData.assets.fixedAssets?.total || reportData.assets.totalFixed || 0],
        [''],
        ['TOTAL ASSETS', reportData.assets.total || 0],
        [''],
        ['LIABILITIES & EQUITY'],
        ['Current Liabilities'],
        ...(reportData.liabilities.currentLiabilities?.accounts || reportData.liabilities.current || []).map((liability: any) => [liability.name, liability.balance || 0]),
        ['Total Current Liabilities', reportData.liabilities.currentLiabilities?.total || reportData.liabilities.totalCurrent || 0],
      ];
      
      // Add long-term liabilities if they exist
      if (reportData.liabilities.longTermLiabilities?.accounts && reportData.liabilities.longTermLiabilities.accounts.length > 0) {
        csvData.push(['']);
        csvData.push(['Long-Term Liabilities']);
        csvData.push(...reportData.liabilities.longTermLiabilities.accounts.map((liability: any) => [liability.name, liability.balance || 0]));
        csvData.push(['Total Long-Term Liabilities', reportData.liabilities.longTermLiabilities.total || 0]);
      }
      
      csvData.push(['']);
      csvData.push(['TOTAL LIABILITIES', reportData.liabilities.total || 0]);
      csvData.push(['']);
      csvData.push(['Equity']);
      csvData.push(...(reportData.equity.accounts || []).map((equity: any) => [equity.name, equity.balance || 0]));
      csvData.push(['TOTAL EQUITY', reportData.equity.total || 0]);
    } else if (selectedTemplate === 'profit-loss' && reportData.income) {
      csvData = [
        [reportName, reportData.clientName],
        [`${format(effectiveDateRange.from, 'MMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMM d, yyyy')}`],
        [''],
        ['INCOME'],
        ...reportData.income.accounts.map((income: any) => [income.name, income.balance]),
        ['Total Income', reportData.income.total],
        [''],
        ['EXPENSES'],
        ...reportData.expenses.accounts.map((expense: any) => [expense.name, expense.balance]),
        ['Total Expenses', reportData.expenses.total],
        [''],
        ['NET INCOME', reportData.netIncome]
      ];
    } else if (selectedTemplate === 'trial-balance' && reportData.accounts) {
      // Trial Balance CSV Export
      csvData = [
        [reportName, reportData.clientName],
        [`As of ${format(effectiveDateRange.to, 'MMM d, yyyy')}`],
        [''],
        ['Account', 'Debit', 'Credit']
      ];
      
      reportData.accounts.forEach((account: any) => {
        const debit = parseFloat(account.debitBalance || '0') > 0 ? account.debitBalance : '';
        const credit = parseFloat(account.creditBalance || '0') > 0 ? account.creditBalance : '';
        csvData.push([account.name, debit, credit]);
      });
      
      csvData.push(['']);
      csvData.push(['Total', reportData.totalDebits || 0, reportData.totalCredits || 0]);
    } else if (selectedTemplate === 'cash-flow' && reportData.operatingActivities) {
      // Cash Flow Statement CSV Export
      csvData = [
        [reportName, reportData.clientName],
        [`${format(effectiveDateRange.from, 'MMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMM d, yyyy')}`],
        [''],
        ['CASH FLOWS FROM OPERATING ACTIVITIES']
      ];
      
      if (reportData.operatingActivities.activities) {
        reportData.operatingActivities.activities.forEach((activity: any) => {
          csvData.push([activity.description, activity.amount]);
        });
      }
      csvData.push(['Net Cash from Operating Activities', reportData.operatingActivities.total]);
      csvData.push(['']);
      
      if (reportData.investingActivities) {
        csvData.push(['CASH FLOWS FROM INVESTING ACTIVITIES']);
        if (reportData.investingActivities.activities) {
          reportData.investingActivities.activities.forEach((activity: any) => {
            csvData.push([activity.description, activity.amount]);
          });
        }
        csvData.push(['Net Cash from Investing Activities', reportData.investingActivities.total]);
        csvData.push(['']);
      }
      
      if (reportData.financingActivities) {
        csvData.push(['CASH FLOWS FROM FINANCING ACTIVITIES']);
        if (reportData.financingActivities.activities) {
          reportData.financingActivities.activities.forEach((activity: any) => {
            csvData.push([activity.description, activity.amount]);
          });
        }
        csvData.push(['Net Cash from Financing Activities', reportData.financingActivities.total]);
        csvData.push(['']);
      }
      
      csvData.push(['NET CHANGE IN CASH', reportData.netCashChange || 0]);
      csvData.push(['Cash at Beginning of Period', reportData.beginningCash || 0]);
      csvData.push(['Cash at End of Period', reportData.endingCash || 0]);
    } else if (selectedTemplate === 'general-ledger' && reportData.accounts) {
      csvData = [
        [reportName, reportData.clientName],
        [`${format(effectiveDateRange.from, 'MMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMM d, yyyy')}`],
        ['']
      ];
      
      reportData.accounts.forEach((account: any) => {
        csvData.push([`Account: ${account.name} (${account.accountNumber})`]);
        csvData.push(['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']);
        csvData.push(['Opening Balance', '', '', '', '', account.openingBalance || 0]);
        
        if (account.transactions && account.transactions.length > 0) {
          account.transactions.forEach((txn: any) => {
            csvData.push([
              format(new Date(txn.date), 'MMM d, yyyy'),
              txn.description,
              txn.reference || '',
              txn.debitAmount || '',
              txn.creditAmount || '',
              txn.runningBalance
            ]);
          });
        }
        
        csvData.push(['Ending Balance', '', '', account.totalDebits || 0, account.totalCredits || 0, account.endingBalance || 0]);
        csvData.push(['']); // Empty row between accounts
      });
    }

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download PDF - Professional formatting for all reports
  const downloadPDF = () => {
    if (!reportData) {
      toast({
        title: "No report data",
        description: "Please generate the report first before downloading.",
        variant: "destructive"
      });
      return;
    }

    try {

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const reportName = REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name || "Report";
    const companyName: string = selectedClientName || reportData.clientName || "Company";
    
    // Clean minimalist header - no colors
    const headerHeight = 35;
    
    // Company name in header (centered)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, 15, { align: 'center' });
    
    // Report name in header (centered for Trial Balance, Balance Sheet, Profit & Loss, and Cash Flow, left-aligned for others)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (selectedTemplate === 'trial-balance' || selectedTemplate === 'balance-sheet' || selectedTemplate === 'profit-loss' || selectedTemplate === 'cash-flow') {
      doc.text(reportName, pageWidth / 2, 25, { align: 'center' });
    } else {
      doc.text(reportName, margin, 25);
    }
    
    // Date range in header (centered)
    doc.setFontSize(9);
    doc.text(`${format(effectiveDateRange.from, 'MMMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMMM d, yyyy')}`, pageWidth / 2, 32, { align: 'center' });
    
    // Top horizontal line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, headerHeight + 5, pageWidth - margin, headerHeight + 5);
    
    // Add page number function
    const addPageNumber = (pageNum: number, totalPages: number, contentEndY?: number) => {
      // Bottom horizontal line before footer
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      // If contentEndY is provided, draw line at end of content, otherwise at very bottom of page
      const lineY = contentEndY ? contentEndY + 5 : pageHeight - 8;
      doc.line(margin, lineY, pageWidth - margin, lineY);
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      
      // Generate current date/time string in the format: "Accrual Basis Monday, December 8, 2025 12:08 PM GMT-05:00"
      const now = new Date();
      const dayName = format(now, 'EEEE'); // Full day name (Monday, Tuesday, etc.)
      const dateStr = format(now, 'MMMM d, yyyy'); // December 8, 2025
      const timeStr = format(now, 'h:mm a'); // 12:08 PM
      
      // Calculate timezone offset
      // getTimezoneOffset() returns minutes behind UTC (positive for timezones behind UTC like EST)
      // For GMT-05:00 (EST), getTimezoneOffset() returns 300, so we negate and divide by 60
      const offsetTotalMinutes = -now.getTimezoneOffset();
      const offsetHours = Math.floor(offsetTotalMinutes / 60);
      const offsetMins = Math.abs(offsetTotalMinutes % 60);
      const offsetSign = offsetHours >= 0 ? '+' : '-';
      const timezoneStr = `GMT${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      
      const basisType = 'Accrual Basis'; // Default to Accrual Basis
      const footerText = `${basisType} ${dayName}, ${dateStr} ${timeStr} ${timezoneStr}`;
      
      // Always position footer text and page number at the very bottom of the page
      const footerY = pageHeight - 2;
      
      // Footer text (centered)
      doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
      
      // Page number (right-aligned)
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
    };

    let startY = headerHeight + 10;

    // Check if reportData exists and has content
    if (!reportData || Object.keys(reportData).length === 0) {
      doc.setFontSize(12);
      doc.text('Report data not available for PDF export.', margin, startY);
      doc.setFontSize(10);
      doc.text('Please generate the report first before downloading.', margin, startY + 10);
      addPageNumber(1, 1, startY + 20);
      doc.save(`${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      return;
    }

    if (selectedTemplate === 'balance-sheet' && reportData.assets) {
      // Balance Sheet PDF - following trial balance pattern
      const tableData: any[] = [];
      
      // Assets Section
      tableData.push([
        { content: 'ASSETS', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        ''
      ]);
      tableData.push([
        { content: 'Current Assets', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        ''
      ]);
      (reportData.assets.currentAssets?.accounts || reportData.assets.current || []).forEach((asset: any) => {
        tableData.push([
          { content: '  ' + asset.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(asset.balance || 0), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      const totalCurrentAssets = reportData.assets.currentAssets?.total || reportData.assets.totalCurrent || 0;
      tableData.push([
        { content: 'Total Current Assets', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(totalCurrentAssets), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      
      tableData.push([
        { content: 'Fixed Assets', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        ''
      ]);
      (reportData.assets.fixedAssets?.accounts || reportData.assets.fixed || []).forEach((asset: any) => {
        tableData.push([
          { content: '  ' + asset.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(asset.balance || 0), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      const totalFixedAssets = reportData.assets.fixedAssets?.total || reportData.assets.totalFixed || 0;
      tableData.push([
        { content: 'Total Fixed Assets', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(totalFixedAssets), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      tableData.push([
        { content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.assets.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ]);
      
      // Liabilities & Equity Section
      tableData.push(['', '', '']);
      tableData.push([
        { content: 'LIABILITIES & EQUITY', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        ''
      ]);
      tableData.push([
        { content: 'Current Liabilities', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        ''
      ]);
      (reportData.liabilities.currentLiabilities?.accounts || reportData.liabilities.current || []).forEach((liability: any) => {
        tableData.push([
          { content: '  ' + liability.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(liability.balance || 0), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      const totalCurrentLiabilities = reportData.liabilities.currentLiabilities?.total || reportData.liabilities.totalCurrent || 0;
      tableData.push([
        { content: 'Total Current Liabilities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(totalCurrentLiabilities), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      
      // Long-term liabilities if they exist
      if (reportData.liabilities.longTermLiabilities?.accounts && reportData.liabilities.longTermLiabilities.accounts.length > 0) {
        tableData.push(['', '', '']);
        tableData.push([
          { content: 'Long-Term Liabilities', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
          '',
          ''
        ]);
        reportData.liabilities.longTermLiabilities.accounts.forEach((liability: any) => {
          tableData.push([
            { content: '  ' + liability.name, styles: { fontSize: 9 } },
            '',
            { content: formatCurrency(liability.balance || 0), styles: { halign: 'right', fontSize: 9 } }
          ]);
        });
        tableData.push([
          { content: 'Total Long-Term Liabilities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
          '',
          { content: formatCurrency(reportData.liabilities.longTermLiabilities.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]);
      }
      
      tableData.push(['', '', '']);
      tableData.push([
        { content: 'Total Liabilities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.liabilities.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      
      tableData.push([
        { content: 'Equity', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        ''
      ]);
      (reportData.equity.accounts || []).forEach((equity: any) => {
        tableData.push([
          { content: '  ' + equity.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(equity.balance || 0), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      tableData.push([
        { content: 'TOTAL EQUITY', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.equity.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ]);

      autoTable(doc, {
        head: [],
        body: tableData,
        startY: startY,
        theme: 'plain',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          lineColor: [255, 255, 255],
          lineWidth: 0,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableLineColor: [255, 255, 255],
        tableLineWidth: 0
      });

      const finalY = (doc as any).lastAutoTable?.finalY;
      addPageNumber(1, 1, finalY);

    } else if (selectedTemplate === 'profit-loss' && reportData.income) {
      // Profit & Loss PDF - following trial balance pattern
      const tableData: any[] = [];
      
      tableData.push([
        { content: 'INCOME', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        ''
      ]);
      reportData.income.accounts.forEach((income: any) => {
        tableData.push([
          { content: '  ' + income.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(income.balance), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      tableData.push([
        { content: 'Total Income', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.income.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      
      if (reportData.costOfSales && reportData.costOfSales.accounts) {
        tableData.push([
          { content: 'COST OF GOODS SOLD', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
          '',
          ''
        ]);
        reportData.costOfSales.accounts.forEach((cos: any) => {
          tableData.push([
            { content: '  ' + cos.name, styles: { fontSize: 9 } },
            '',
            { content: formatCurrency(cos.balance), styles: { halign: 'right', fontSize: 9 } }
          ]);
        });
        tableData.push([
          { content: 'Total Cost of Goods Sold', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
          '',
          { content: formatCurrency(reportData.costOfSales.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]);
        tableData.push(['', '', '']);
        const grossProfit = reportData.grossProfit || (parseFloat(reportData.income.total) - parseFloat(reportData.costOfSales.total));
        tableData.push([
          { content: 'GROSS PROFIT', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
          '',
          { content: formatCurrency(grossProfit), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
        ]);
        tableData.push(['', '', '']);
      }
      
      tableData.push([
        { content: 'EXPENSES', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        ''
      ]);
      reportData.expenses.accounts.forEach((expense: any) => {
        tableData.push([
          { content: '  ' + expense.name, styles: { fontSize: 9 } },
          '',
          { content: formatCurrency(expense.balance), styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      tableData.push([
        { content: 'Total Expenses', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.expenses.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      tableData.push([
        { content: 'PROFIT', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.netIncome), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } }
      ]);

      autoTable(doc, {
        head: [],
        body: tableData,
        startY: startY,
        theme: 'plain',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          lineColor: [255, 255, 255],
          lineWidth: 0,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableLineColor: [255, 255, 255],
        tableLineWidth: 0
      });

      const finalY = (doc as any).lastAutoTable?.finalY;
      addPageNumber(1, 1, finalY);

    } else if (selectedTemplate === 'trial-balance' && reportData.accounts) {
      // Trial Balance PDF
      const tableData: any[] = [];
      
      reportData.accounts.forEach((account: any) => {
        const debit = parseFloat(account.debitBalance || '0') > 0 ? formatCurrency(account.debitBalance) : '';
        const credit = parseFloat(account.creditBalance || '0') > 0 ? formatCurrency(account.creditBalance) : '';
        tableData.push([
          { content: account.name, styles: { fontSize: 9 } },
          { content: debit, styles: { halign: 'right', fontSize: 9 } },
          { content: credit, styles: { halign: 'right', fontSize: 9 } }
        ]);
      });
      
      tableData.push(['', '', '']);
      tableData.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fontSize: 10, halign: 'center' } },
        { content: formatCurrency(reportData.totalDebits || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
        { content: formatCurrency(reportData.totalCredits || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ]);

      autoTable(doc, {
        head: [],
        body: tableData,
        startY: startY,
        theme: 'plain',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          lineColor: [255, 255, 255],
          lineWidth: 0,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableLineColor: [255, 255, 255],
        tableLineWidth: 0
      });

      const finalY = (doc as any).lastAutoTable?.finalY;
      addPageNumber(1, 1, finalY);

    } else if (selectedTemplate === 'cash-flow' && reportData.operatingActivities) {
      // Cash Flow Statement PDF - following trial balance pattern
      const tableData: any[] = [];
      
      tableData.push([
        { content: 'CASH FLOWS FROM OPERATING ACTIVITIES', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
        '',
        ''
      ]);
      if (reportData.operatingActivities.activities) {
        reportData.operatingActivities.activities.forEach((activity: any) => {
          if (activity.amount !== 0) {
            tableData.push([
              { content: '  ' + activity.description, styles: { fontSize: 9 } },
              '',
              { content: formatCurrency(activity.amount), styles: { halign: 'right', fontSize: 9 } }
            ]);
          }
        });
      }
      tableData.push([
        { content: 'Net Cash from Operating Activities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.operatingActivities.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
      ]);
      tableData.push(['', '', '']);
      
      if (reportData.investingActivities) {
        tableData.push([
          { content: 'CASH FLOWS FROM INVESTING ACTIVITIES', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
          '',
          ''
        ]);
        if (reportData.investingActivities.activities) {
          reportData.investingActivities.activities.forEach((activity: any) => {
            if (activity.amount !== 0) {
              tableData.push([
                { content: '  ' + activity.description, styles: { fontSize: 9 } },
                '',
                { content: formatCurrency(activity.amount), styles: { halign: 'right', fontSize: 9 } }
              ]);
            }
          });
        }
        tableData.push([
          { content: 'Net Cash from Investing Activities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
          '',
          { content: formatCurrency(reportData.investingActivities.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]);
        tableData.push(['', '', '']);
      }
      
      if (reportData.financingActivities) {
        tableData.push([
          { content: 'CASH FLOWS FROM FINANCING ACTIVITIES', styles: { fontStyle: 'bold', fontSize: 11, halign: 'left' } },
          '',
          ''
        ]);
        if (reportData.financingActivities.activities) {
          reportData.financingActivities.activities.forEach((activity: any) => {
            if (activity.amount !== 0) {
              tableData.push([
                { content: '  ' + activity.description, styles: { fontSize: 9 } },
                '',
                { content: formatCurrency(activity.amount), styles: { halign: 'right', fontSize: 9 } }
              ]);
            }
          });
        }
        tableData.push([
          { content: 'Net Cash from Financing Activities', styles: { fontStyle: 'bold', fontSize: 9, halign: 'left' } },
          '',
          { content: formatCurrency(reportData.financingActivities.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }
        ]);
        tableData.push(['', '', '']);
      }
      
      tableData.push([
        { content: 'NET CHANGE IN CASH', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.netCashChange || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ]);
      tableData.push([
        { content: 'Cash at Beginning of Period', styles: { fontSize: 9 } },
        '',
        { content: formatCurrency(reportData.beginningCash || 0), styles: { halign: 'right', fontSize: 9 } }
      ]);
      tableData.push([
        { content: 'CASH AT END OF PERIOD', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
        '',
        { content: formatCurrency(reportData.endingCash || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
      ]);

      autoTable(doc, {
        head: [],
        body: tableData,
        startY: startY,
        theme: 'plain',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          lineColor: [255, 255, 255],
          lineWidth: 0,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableLineColor: [255, 255, 255],
        tableLineWidth: 0
      });

      const finalY = (doc as any).lastAutoTable?.finalY;
      addPageNumber(1, 1, finalY);

    } else if (selectedTemplate === 'general-ledger' && reportData.accounts) {
      // General Ledger PDF - Use custom page size matching reference (21.21 x 29.99 inches)
      // Convert inches to mm: 21.21" = 538.734mm, 29.99" = 761.346mm
      const customPageWidth = 21.21 * 25.4; // Convert inches to mm
      const customPageHeight = 29.99 * 25.4;
      
      // Create new PDF with custom page size for general ledger
      const glDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [customPageWidth, customPageHeight]
      });
      
      const glPageWidth = glDoc.internal.pageSize.getWidth();
      const glPageHeight = glDoc.internal.pageSize.getHeight();
      const glMargin = 15; // Slightly smaller margin for more content space
      const glHeaderHeight = 35;
      
      // Create addPageNumber function for general ledger document
      const addGLPageNumber = (pageNum: number, totalPages: number, contentEndY?: number) => {
        // Bottom horizontal line before footer
        glDoc.setDrawColor(0, 0, 0);
        glDoc.setLineWidth(0.5);
        // If contentEndY is provided, draw line at end of content, otherwise at very bottom of page
        const lineY = contentEndY ? contentEndY + 5 : glPageHeight - 8;
        glDoc.line(glMargin, lineY, glPageWidth - glMargin, lineY);
        
        glDoc.setFontSize(9);
        glDoc.setTextColor(128, 128, 128);
        
        // Generate current date/time string
        const now = new Date();
        const dayName = format(now, 'EEEE');
        const dateStr = format(now, 'MMMM d, yyyy');
        const timeStr = format(now, 'h:mm a');
        const offsetTotalMinutes = -now.getTimezoneOffset();
        const offsetHours = Math.floor(offsetTotalMinutes / 60);
        const offsetMins = Math.abs(offsetTotalMinutes % 60);
        const offsetSign = offsetHours >= 0 ? '+' : '-';
        const timezoneStr = `GMT${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
        
        const basisType = 'Accrual Basis';
        const footerText = `${basisType} ${dayName}, ${dateStr} ${timeStr} ${timezoneStr}`;
        
        // Always position footer text and page number at the very bottom of the page
        const footerY = glPageHeight - 2;
        
        // Footer text (centered)
        glDoc.text(footerText, glPageWidth / 2, footerY, { align: 'center' });
        
        // Page number (right-aligned)
        glDoc.text(`Page ${pageNum} of ${totalPages}`, glPageWidth - glMargin, footerY, { align: 'right' });
        
        glDoc.setTextColor(0, 0, 0);
      };
      
      // Set up header for first page
      glDoc.setTextColor(0, 0, 0);
      glDoc.setFontSize(18);
      glDoc.setFont('helvetica', 'bold');
      glDoc.text(companyName, glPageWidth / 2, 15, { align: 'center' });
      glDoc.setFontSize(14);
      glDoc.setFont('helvetica', 'normal');
      glDoc.text(reportName, glMargin, 25);
      glDoc.setFontSize(10);
      glDoc.text(`${format(effectiveDateRange.from, 'MMMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMMM d, yyyy')}`, glPageWidth / 2, 32, { align: 'center' });
      glDoc.setDrawColor(0, 0, 0);
      glDoc.setLineWidth(0.5);
      glDoc.line(glMargin, glHeaderHeight + 5, glPageWidth - glMargin, glHeaderHeight + 5);
      
      let currentY = glHeaderHeight + 10;
      let pageNum = 1;
      const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
      
      if (accounts.length === 0) {
        glDoc.setFontSize(12);
        glDoc.text('No general ledger accounts found for the selected date range.', glMargin, currentY);
        glDoc.setFontSize(10);
        glDoc.text('Please ensure the report has been generated and contains data.', glMargin, currentY + 10);
        addGLPageNumber(1, 1, currentY + 20);
      } else {
      
      accounts.forEach((account: any, accountIndex: number) => {
        // Add spacing between accounts if not the first account
        if (accountIndex > 0) {
          currentY += 10; // Add spacing between accounts
        }
        
        // Check if we need a new page (only if there's not enough space)
        const estimatedRowHeight = 8; // Approximate height per row with larger font
        const accountRows = (account.transactions?.length || 0) + 7; // transactions + header rows + spacing
        const estimatedHeight = accountRows * estimatedRowHeight;
        const spaceNeeded = estimatedHeight + 50; // Add buffer for footer
        
        // Only create new page if current account won't fit
        if (currentY + spaceNeeded > glPageHeight - 40) {
          glDoc.addPage();
          pageNum++;
          currentY = glMargin;
          
          // Add header to new page (consistent with first page style)
          glDoc.setTextColor(0, 0, 0);
          glDoc.setFontSize(18);
          glDoc.setFont('helvetica', 'bold');
          glDoc.text(companyName, glPageWidth / 2, 15, { align: 'center' });
          glDoc.setFontSize(14);
          glDoc.setFont('helvetica', 'normal');
          glDoc.text(reportName, glMargin, 25);
          glDoc.setFontSize(10);
          glDoc.text(`${format(effectiveDateRange.from, 'MMMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMMM d, yyyy')}`, glPageWidth / 2, 32, { align: 'center' });
          // Top horizontal line
          glDoc.setDrawColor(0, 0, 0);
          glDoc.setLineWidth(0.5);
          glDoc.line(glMargin, glHeaderHeight + 5, glPageWidth - glMargin, glHeaderHeight + 5);
          currentY = glHeaderHeight + 10;
        }
        
        const tableData: any[] = [];
        
        // Account header
        tableData.push([
          { content: `${account.name} (${account.accountNumber})`, styles: { fontStyle: 'bold', fontSize: 13, halign: 'left' } },
          '', '', '', '', ''
        ]);
        tableData.push([
          { content: `Type: ${account.type}`, styles: { fontSize: 11, halign: 'left' } },
          '', '', '', '', ''
        ]);
        tableData.push([
          { content: 'Opening Balance:', styles: { fontSize: 11 } },
          '', '', '', '',
          { content: formatCurrency(account.openingBalance || 0), styles: { halign: 'right', fontSize: 11, fontStyle: 'bold' } },
          ''
        ]);
        tableData.push(['', '', '', '', '', '']);
        
        // Opening balance row
        tableData.push([
          { content: 'Opening Balance', styles: { fontSize: 11 } },
          { content: 'Beginning of period', styles: { fontSize: 11 } },
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: formatCurrency(account.openingBalance || 0), styles: { halign: 'right', fontSize: 11, fontStyle: 'bold' } }
        ]);
        
        // Transactions
        if (account.transactions && Array.isArray(account.transactions)) {
          account.transactions.forEach((transaction: any) => {
            // Format YYYY-MM-DD directly to MMM d, yyyy without Date object to avoid timezone issues
            let dateStr = '';
            if (transaction.date) {
              const [year, month, day] = transaction.date.split('-');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthName = monthNames[parseInt(month) - 1];
              const dayNum = parseInt(day);
              dateStr = `${monthName} ${dayNum}, ${year}`;
            }
            const debit = transaction.debitAmount && parseFloat(transaction.debitAmount) > 0 ? formatCurrency(transaction.debitAmount) : '';
            const credit = transaction.creditAmount && parseFloat(transaction.creditAmount) > 0 ? formatCurrency(transaction.creditAmount) : '';
            tableData.push([
              { content: dateStr, styles: { fontSize: 11 } },
              { content: transaction.description || transaction.narration || '', styles: { fontSize: 11 } },
              { content: transaction.reference || transaction.transactionNumber || '', styles: { fontSize: 11 } },
              { content: debit, styles: { halign: 'right', fontSize: 11 } },
              { content: credit, styles: { halign: 'right', fontSize: 11 } },
              { content: formatCurrency(transaction.runningBalance || 0), styles: { halign: 'right', fontSize: 11 } }
            ]);
          });
        }
        
        // Add summary row (Ending Balance)
        tableData.push(['', '', '', '', '', '']); // Empty row for spacing
        tableData.push([
          { content: 'Ending Balance', styles: { fontSize: 11, fontStyle: 'bold' } },
          { content: `Period: ${reportData.startDate} to ${reportData.endDate}`, styles: { fontSize: 11 } },
          { content: '', styles: {} },
          { content: formatCurrency(account.totalDebits || 0), styles: { halign: 'right', fontSize: 11, fontStyle: 'bold' } },
          { content: formatCurrency(account.totalCredits || 0), styles: { halign: 'right', fontSize: 11, fontStyle: 'bold' } },
          { content: formatCurrency(account.endingBalance || 0), styles: { halign: 'right', fontSize: 11, fontStyle: 'bold' } }
        ]);
        
        // Calculate available width and distribute columns proportionally
        const availableWidth = glPageWidth - (2 * glMargin);
        autoTable(glDoc, {
          head: [['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']],
          body: tableData,
          startY: currentY,
          theme: 'plain',
          styles: { 
            fontSize: 11,
            cellPadding: 3,
            lineColor: [255, 255, 255],
            lineWidth: 0,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            textColor: [0, 0, 0]
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 11,
            fontStyle: 'bold' as const
          },
          columnStyles: {
            0: { cellWidth: availableWidth * 0.12, halign: 'left' }, // Date
            1: { cellWidth: availableWidth * 0.35, halign: 'left' }, // Description
            2: { cellWidth: availableWidth * 0.15, halign: 'left' }, // Reference
            3: { cellWidth: availableWidth * 0.13, halign: 'right' }, // Debit
            4: { cellWidth: availableWidth * 0.13, halign: 'right' }, // Credit
            5: { cellWidth: availableWidth * 0.12, halign: 'right' } // Balance
          } as any,
          margin: { left: glMargin, right: glMargin, bottom: 40 },
          tableLineColor: [255, 255, 255],
          tableLineWidth: 0,
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
          didDrawPage: (data: any) => {
            // If a new page was created by autoTable, add header to it
            if (data.pageNumber > 1 && data.pageCount > 1) {
              glDoc.setTextColor(0, 0, 0);
              glDoc.setFontSize(18);
              glDoc.setFont('helvetica', 'bold');
              glDoc.text(companyName, glPageWidth / 2, 15, { align: 'center' });
              glDoc.setFontSize(14);
              glDoc.setFont('helvetica', 'normal');
              glDoc.text(reportName, glMargin, 25);
              glDoc.setFontSize(10);
              glDoc.text(`${format(effectiveDateRange.from, 'MMMM d, yyyy')} - ${format(effectiveDateRange.to, 'MMMM d, yyyy')}`, glPageWidth / 2, 32, { align: 'center' });
              glDoc.setDrawColor(0, 0, 0);
              glDoc.setLineWidth(0.5);
              glDoc.line(glMargin, glHeaderHeight + 5, glPageWidth - glMargin, glHeaderHeight + 5);
            }
          }
        });
        
        const finalY = (glDoc as any).lastAutoTable?.finalY;
        currentY = finalY ? finalY + 5 : currentY;
      });
      
      // Add page numbers to all pages
      const totalPages = glDoc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        glDoc.setPage(i);
        addGLPageNumber(i, totalPages);
      }
      }
      
      // Replace the main doc with glDoc for saving
      const glPdfBlob = glDoc.output('blob');
      const glPdfUrl = URL.createObjectURL(glPdfBlob);
      const glLink = document.createElement('a');
      glLink.href = glPdfUrl;
      glLink.download = `${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      glLink.click();
      URL.revokeObjectURL(glPdfUrl);
      return; // Exit early since we've already saved the PDF
    } else if ((selectedTemplate === 'accounts-receivable' || selectedTemplate === 'accounts-payable') && reportData) {
      // Accounts Receivable/Payable PDF
      // These reports use aging data, so we'll create a simple summary table
      const tableData: any[] = [];
      
      if (reportData.summary && reportData.summary.agingData && Array.isArray(reportData.summary.agingData) && reportData.summary.agingData.length > 0) {
        if (reportData.summary.agingData.forEach) {
          reportData.summary.agingData.forEach((item: any) => {
            tableData.push([
              { content: item.name || item.customerName || item.vendorName || 'N/A', styles: { fontSize: 9 } },
              { content: formatCurrency(item.total || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.current || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days30 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days60 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days90 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.over90 || 0), styles: { halign: 'right', fontSize: 9 } }
            ]);
          });
          
          // Totals row
          if (reportData.summary.totals) {
            tableData.push(['', '', '', '', '', '', '']);
            tableData.push([
              { content: 'TOTAL', styles: { fontStyle: 'bold', fontSize: 10, halign: 'left' } },
              { content: formatCurrency(reportData.summary.totals.total || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
              { content: formatCurrency(reportData.summary.totals.current || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
              { content: formatCurrency(reportData.summary.totals.days30 || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
              { content: formatCurrency(reportData.summary.totals.days60 || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
              { content: formatCurrency(reportData.summary.totals.days90 || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
              { content: formatCurrency(reportData.summary.totals.over90 || 0), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
            ]);
          }
        }
      }
      
      // If no data, show message
      if (tableData.length === 0) {
        tableData.push([
          { content: 'Aging data is managed by separate components. Please use the export feature within the Accounts Receivable/Payable sections.', styles: { fontSize: 9, halign: 'left' } },
          '', '', '', '', '', ''
        ]);
      }

      autoTable(doc, {
        head: [['Customer/Vendor', 'Total Outstanding', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', 'Over 90 Days']],
        body: tableData,
        startY: startY,
        theme: 'plain',
        headStyles: {
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          textColor: [0, 0, 0]
        },
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          lineColor: [255, 255, 255],
          lineWidth: 0,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 50, halign: 'left' },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableLineColor: [255, 255, 255],
        tableLineWidth: 0
      });

      const finalY = (doc as any).lastAutoTable?.finalY;
      addPageNumber(1, 1, finalY);
    } else {
      // Generic fallback for any report type with data - following trial balance pattern
      // Try to extract and display data in a table format
      const tableData: any[] = [];
      let hasData = false;

      // Check for common data structures and convert to table format
      if (reportData.accounts && Array.isArray(reportData.accounts)) {
        // Handle accounts array (similar to trial balance)
        reportData.accounts.forEach((account: any) => {
          const row: any[] = [];
          if (account.name) row.push({ content: account.name, styles: { fontSize: 9 } });
          if (account.balance !== undefined) row.push({ content: formatCurrency(account.balance), styles: { halign: 'right', fontSize: 9 } });
          if (account.debitBalance !== undefined) row.push({ content: formatCurrency(account.debitBalance || 0), styles: { halign: 'right', fontSize: 9 } });
          if (account.creditBalance !== undefined) row.push({ content: formatCurrency(account.creditBalance || 0), styles: { halign: 'right', fontSize: 9 } });
          if (account.amount !== undefined) row.push({ content: formatCurrency(account.amount), styles: { halign: 'right', fontSize: 9 } });
          if (row.length > 0) {
            tableData.push(row);
            hasData = true;
          }
        });
      } else if (reportData.data && Array.isArray(reportData.data)) {
        // Handle generic data array
        reportData.data.forEach((item: any) => {
          const row: any[] = [];
          Object.keys(item).forEach((key) => {
            if (key !== 'id' && item[key] !== null && item[key] !== undefined) {
              const value = typeof item[key] === 'number' ? formatCurrency(item[key]) : String(item[key]);
              row.push({ content: value, styles: { fontSize: 9 } });
            }
          });
          if (row.length > 0) {
            tableData.push(row);
            hasData = true;
          }
        });
      } else if (reportData.summary) {
        // Handle summary data
        const summary = reportData.summary;
        if (summary.agingData && Array.isArray(summary.agingData)) {
          summary.agingData.forEach((item: any) => {
            tableData.push([
              { content: item.name || item.customerName || item.vendorName || 'N/A', styles: { fontSize: 9 } },
              { content: formatCurrency(item.total || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.current || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days30 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days60 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.days90 || 0), styles: { halign: 'right', fontSize: 9 } },
              { content: formatCurrency(item.over90 || 0), styles: { halign: 'right', fontSize: 9 } }
            ]);
            hasData = true;
          });
        }
      } else {
        // Try to convert reportData object to a simple key-value table
        const keys = Object.keys(reportData).filter(key => 
          key !== 'clientName' && 
          key !== 'type' && 
          reportData[key] !== null && 
          reportData[key] !== undefined &&
          typeof reportData[key] !== 'object'
        );
        if (keys.length > 0) {
          keys.forEach((key) => {
            const value = typeof reportData[key] === 'number' ? formatCurrency(reportData[key]) : String(reportData[key]);
            tableData.push([
              { content: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), styles: { fontSize: 9, fontStyle: 'bold' } },
              { content: value, styles: { fontSize: 9, halign: 'right' } }
            ]);
            hasData = true;
          });
        }
      }

      if (hasData && tableData.length > 0) {
        // Determine number of columns from first row
        const numColumns = tableData[0]?.length || 2;
        const availableWidth = pageWidth - (2 * margin);
        
        // Generate PDF table with available data - following trial balance pattern
        autoTable(doc, {
          head: [],
          body: tableData,
          startY: startY,
          theme: 'plain',
          styles: { 
            fontSize: 9,
            cellPadding: 2,
            lineColor: [255, 255, 255],
            lineWidth: 0,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            textColor: [0, 0, 0]
          },
          columnStyles: (() => {
            // Create dynamic column styles based on number of columns
            const styles: any = {};
            for (let i = 0; i < numColumns; i++) {
              if (i === 0) {
                styles[i] = { cellWidth: Math.max(80, availableWidth * 0.5), halign: 'left' };
              } else {
                styles[i] = { cellWidth: Math.max(30, availableWidth / numColumns), halign: 'right' };
              }
            }
            return styles;
          })(),
          margin: { left: margin, right: margin },
          tableLineColor: [255, 255, 255],
          tableLineWidth: 0
        });

        const finalY = (doc as any).lastAutoTable?.finalY;
        addPageNumber(1, 1, finalY);
      } else {
        // Final fallback - show message if no data can be extracted
        doc.setFontSize(12);
        doc.text('Report data not available for PDF export.', margin, startY);
        doc.setFontSize(10);
        doc.text('Please ensure the report has been generated and contains data.', margin, startY + 10);
        addPageNumber(1, 1, startY + 20);
      }
    }

    // Save the PDF
    doc.save(`${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Download Failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Download Excel
  const downloadExcel = async () => {
    if (!reportData || !clientId) return;

    try {
      const queryParams = new URLSearchParams({
        format: 'xlsx',
        startDate: format(effectiveDateRange.from, 'yyyy-MM-dd'),
        endDate: format(effectiveDateRange.to, 'yyyy-MM-dd')
      });

      const response = await fetch(`/api/reports/${selectedTemplate}/${clientId}/download?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      toast({
        title: "Download failed",
        description: "Failed to download Excel file. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Close books for fiscal year end
  const closeBooks = async () => {
    if (!clientId) {
      toast({
        title: "Cannot Close Books",
        description: "Client ID is required for book closing.",
        variant: "destructive"
      });
      return;
    }

    setIsClosingBooks(true);

    try {
      // Get fiscal year settings with defaults
      const fiscalYearEndMonth = bookkeepingSettings?.fiscalYearEndMonth || 12; // Default to December
      const fiscalYearEndDay = bookkeepingSettings?.fiscalYearEndDay || 31;      // Default to 31st
      
      // Calculate last complete fiscal year end date based on settings
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Determine the fiscal year end to close (last complete fiscal year)
      // Start with the fiscal year end date in the current calendar year
      let fiscalYearEnd = new Date(currentYear, fiscalYearEndMonth - 1, fiscalYearEndDay);
      
      // If we haven't passed this year's fiscal end yet, close the previous fiscal year
      // If we have passed it, this is the fiscal year to close
      if (now <= fiscalYearEnd) {
        // We haven't reached this year's fiscal end, so close the previous fiscal year
        fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() - 1);
      }
      // Otherwise, fiscalYearEnd is already correct (close the fiscal year that just ended)

      const response = await fetch(`/api/reports/close-books/${clientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          fiscalYearEnd: format(fiscalYearEnd, 'yyyy-MM-dd')
        })
      });

      const result = await response.json();

      if (result.success) {
        setLastClosingEntry(result);
        toast({
          title: "Books Closed Successfully",
          description: `Net income of ${formatCurrency(result.netIncome)} transferred to Retained Earnings. Closing entry #${result.closingEntry.id} created.`,
        });
        
        // Refresh any current report data to reflect the closing entries
        if (reportData) {
          generateReport();
        }
      } else {
        throw new Error(result.message || "Failed to close books");
      }

    } catch (error) {
      console.error("Book closing error:", error);
      toast({
        title: "Book Closing Failed",
        description: error instanceof Error ? error.message : "An error occurred while closing books.",
        variant: "destructive"
      });
    } finally {
      setIsClosingBooks(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">Generate comprehensive financial reports with export capabilities and fiscal year management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setReportData(null)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {reportData && (
            <>
              <Button variant="outline" size="sm" onClick={downloadCSV} data-testid="download-csv">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF} data-testid="download-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadExcel} data-testid="download-excel">
                <FileBox className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Date Range Controls - Moved to Top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Configuration</CardTitle>
          <CardDescription>Select date range and report options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 items-end ${(selectedTemplate === 'accounts-receivable' || selectedTemplate === 'accounts-payable') ? 'md:grid-cols-4' : 'md:grid-cols-4'}`}>
            {/* Report Type */}
            <div>
              <Label className="text-sm font-medium">Report Type</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range - Hide for aging reports */}
            {selectedTemplate !== 'accounts-receivable' && selectedTemplate !== 'accounts-payable' && (
              <div>
                <Label className="text-sm font-medium">Date Range</Label>
                <Select 
                  value={showCustomDate ? 'custom' : datePreset} 
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setShowCustomDate(true);
                    } else {
                      setShowCustomDate(false);
                      setDatePreset(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="current-quarter">Current Quarter</SelectItem>
                    <SelectItem value="last-quarter">Last Quarter</SelectItem>
                    <SelectItem value="current-year">Current Year</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                    <SelectItem value="year-to-date">Year to Date</SelectItem>
                    <SelectItem value="current-fiscal-year">Current Fiscal Year</SelectItem>
                    <SelectItem value="last-fiscal-year">Last Fiscal Year</SelectItem>
                    <SelectItem value="fiscal-year-to-date">Fiscal Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* As of Date - Show only for aging reports */}
            {(selectedTemplate === 'accounts-receivable' || selectedTemplate === 'accounts-payable') && (
              <div>
                <Label htmlFor="aging-as-of-date" className="text-sm font-medium">As of Date</Label>
                <Input
                  id="aging-as-of-date"
                  type="date"
                  value={agingAsOfDate}
                  onChange={(e) => setAgingAsOfDate(e.target.value)}
                  data-testid="input-aging-as-of-date"
                />
              </div>
            )}

            {/* Period Type for P&L or Method for Cash Flow */}
            {selectedTemplate === 'profit-loss' ? (
              <>
                <div>
                  <Label className="text-sm font-medium">Period Type</Label>
                  <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Period</SelectItem>
                      <SelectItem value="monthly">Monthly Columns</SelectItem>
                      <SelectItem value="quarterly">Quarterly Columns</SelectItem>
                      <SelectItem value="yearly">Yearly Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Unified Dimension Filter */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Dimension Type</Label>
                    <Select value={dimensionType} onValueChange={setDimensionType}>
                      <SelectTrigger data-testid="select-dimension-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All (No Filter)</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="class">Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dimensionType !== 'all' && (
                    <div>
                      <Label className="text-sm font-medium">
                        {dimensionType === 'project' ? 'Select Project' : 
                         dimensionType === 'location' ? 'Select Location' : 
                         'Select Class'}
                      </Label>
                      <Select value={dimensionValue} onValueChange={setDimensionValue}>
                        <SelectTrigger data-testid={`select-dimension-value-${dimensionType}`}>
                          <SelectValue placeholder={`Select ${dimensionType}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            All {dimensionType === 'project' ? 'Projects' : 
                                dimensionType === 'location' ? 'Locations' : 
                                'Classes'}
                          </SelectItem>
                          {dimensionType === 'project' && projects?.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                          {dimensionType === 'location' && locations?.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                          {dimensionType === 'class' && classes?.map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            ) : selectedTemplate === 'cash-flow' ? (
              <div>
                <Label className="text-sm font-medium">Cash Flow Method</Label>
                <Select value={cashFlowMethod} onValueChange={(value: any) => setCashFlowMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indirect">Indirect Method</SelectItem>
                    <SelectItem value="direct">Direct Method</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* Prior Period Comparison for other reports */
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includePriorPeriod"
                  checked={includePriorPeriod}
                  onChange={(e) => setIncludePriorPeriod(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="includePriorPeriod" className="text-sm font-medium">
                  Include Prior Period
                </Label>
              </div>
            )}

            {/* Generate Button */}
            <Button 
              onClick={generateReport}
              disabled={!clientId || !selectedTemplate || isGenerating}
              className="min-w-[120px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {/* Custom Date Range */}
          {showCustomDate && (
            <div className="mt-4 space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                <p>You can select dates using the calendar picker or type them directly in formats like:</p>
                <p className="text-xs mt-1">2004-01-01 • 1/1/2004 • Jan 1, 2004</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">From Date</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        data-testid="input-from-date"
                        placeholder="Type date or use calendar"
                        value={fromDateText}
                        onChange={(e) => handleFromDateChange(e.target.value)}
                        className={cn(fromDateError && "border-red-500")}
                      />
                      {fromDateError && (
                        <p className="text-red-500 text-xs mt-1">{fromDateError}</p>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button data-testid="button-from-date-calendar" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={customDateRange.from} 
                          onSelect={(date) => {
                            if (date) {
                              setCustomDateRange(prev => ({ ...prev, from: date }));
                              setFromDateText(format(date, "yyyy-MM-dd"));
                              setFromDateError("");
                            }
                          }} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-gray-500">
                    Selected: {format(customDateRange.from, "PPP")}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">To Date</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        data-testid="input-to-date"
                        placeholder="Type date or use calendar"
                        value={toDateText}
                        onChange={(e) => handleToDateChange(e.target.value)}
                        className={cn(toDateError && "border-red-500")}
                      />
                      {toDateError && (
                        <p className="text-red-500 text-xs mt-1">{toDateError}</p>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button data-testid="button-to-date-calendar" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={customDateRange.to} 
                          onSelect={(date) => {
                            if (date) {
                              setCustomDateRange(prev => ({ ...prev, to: date }));
                              setToDateText(format(date, "yyyy-MM-dd"));
                              setToDateError("");
                            }
                          }} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-gray-500">
                    Selected: {format(customDateRange.to, "PPP")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Display */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-blue-800">
                Current Period: {format(effectiveDateRange.from, "MMM d, yyyy")} - {format(effectiveDateRange.to, "MMM d, yyyy")}
              </span>
              {includePriorPeriod && (
                <span className="text-blue-600">
                  Prior Period: {format(getPriorPeriodRange().from, "MMM d, yyyy")} - {format(getPriorPeriodRange().to, "MMM d, yyyy")}
                </span>
              )}
            </div>
            {bookkeepingSettings?.fiscalYearEndMonth && (
              <div className="text-xs text-blue-600 mt-1 space-y-1">
                <div>
                  Fiscal Year End: {new Date(new Date().getFullYear(), bookkeepingSettings.fiscalYearEndMonth - 1, bookkeepingSettings.fiscalYearEndDay || 31).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </div>
                {lastClosingEntry && (
                  <div className="text-green-600">
                    Last Closing: FY {new Date(lastClosingEntry.fiscalYearEnd).getFullYear()} | Net Income: {formatCurrency(lastClosingEntry.netIncome)}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      <div>
          {reportData ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                  </CardTitle>
                  <CardDescription>
                    {reportData.clientName} • {format(effectiveDateRange.from, "MMM d")} - {format(effectiveDateRange.to, "MMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Live Data</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Balance Sheet Display */}
                {selectedTemplate === 'balance-sheet' && reportData && reportData.assets && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Assets</h3>
                      <DataTable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">
                              {priorPeriodData ? 'Current Period' : 'Amount'}
                            </TableHead>
                            {priorPeriodData && (
                              <TableHead className="text-right">Prior Period</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Current Assets</TableCell>
                            <TableCell></TableCell>
                            {priorPeriodData && <TableCell></TableCell>}
                          </TableRow>
                          {(reportData.assets.currentAssets?.accounts || []).map((asset: any) => {
                            const priorAsset = priorPeriodData?.assets?.currentAssets?.accounts?.find((a: any) => a.id === asset.id);
                            return (
                              <TableRow key={asset.id}>
                                <TableCell className="pl-6">{asset.name}</TableCell>
                                <TableCell 
                                  className="text-right cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => {
                                    setSelectedAccount({
                                      id: asset.id,
                                      name: asset.name,
                                      accountNumber: asset.accountNumber || '',
                                      type: 'asset'
                                    });
                                    setIsGeneralLedgerOpen(true);
                                  }}
                                  data-testid={`account-balance-${asset.id}`}
                                >
                                  <span className="group-hover:underline">{formatCurrency(asset.balance || 0)}</span>
                                  <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </TableCell>
                                {priorPeriodData && (
                                  <TableCell className="text-right">{formatCurrency(priorAsset?.balance || 0)}</TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-medium">
                            <TableCell>Total Current Assets</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.assets.currentAssets?.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.assets?.currentAssets?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Fixed Assets</TableCell>
                            <TableCell></TableCell>
                            {priorPeriodData && <TableCell></TableCell>}
                          </TableRow>
                          {(reportData.assets.fixedAssets?.accounts || []).map((asset: any) => {
                            const priorAsset = priorPeriodData?.assets?.fixedAssets?.accounts?.find((a: any) => a.id === asset.id);
                            return (
                              <TableRow key={asset.id}>
                                <TableCell className="pl-6">{asset.name}</TableCell>
                                <TableCell 
                                  className="text-right cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => {
                                    setSelectedAccount({
                                      id: asset.id,
                                      name: asset.name,
                                      accountNumber: asset.accountNumber || '',
                                      type: 'asset'
                                    });
                                    setIsGeneralLedgerOpen(true);
                                  }}
                                  data-testid={`account-balance-${asset.id}`}
                                >
                                  <span className="group-hover:underline">{formatCurrency(asset.balance || 0)}</span>
                                  <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </TableCell>
                                {priorPeriodData && (
                                  <TableCell className="text-right">{formatCurrency(priorAsset?.balance || 0)}</TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-medium">
                            <TableCell>Total Fixed Assets</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.assets.fixedAssets?.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.assets?.fixedAssets?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow className="font-bold border-t">
                            <TableCell>TOTAL ASSETS</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.assets.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.assets?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                        </TableBody>
                      </DataTable>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Liabilities & Equity</h3>
                      <DataTable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">
                              {priorPeriodData ? 'Current Period' : 'Amount'}
                            </TableHead>
                            {priorPeriodData && (
                              <TableHead className="text-right">Prior Period</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Current Liabilities</TableCell>
                            <TableCell></TableCell>
                            {priorPeriodData && <TableCell></TableCell>}
                          </TableRow>
                          {(reportData.liabilities.currentLiabilities?.accounts || []).map((liability: any) => {
                            const priorLiability = priorPeriodData?.liabilities?.currentLiabilities?.accounts?.find((l: any) => l.id === liability.id);
                            return (
                              <TableRow key={`current-liability-${liability.id}`}>
                                <TableCell className="pl-6">{liability.name}</TableCell>
                                <TableCell 
                                  className="text-right cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => {
                                    setSelectedAccount({
                                      id: liability.id,
                                      name: liability.name,
                                      accountNumber: liability.accountNumber || '',
                                      type: 'liability'
                                    });
                                    setIsGeneralLedgerOpen(true);
                                  }}
                                  data-testid={`account-balance-${liability.id}`}
                                >
                                  <span className="group-hover:underline">{formatCurrency(liability.balance || 0)}</span>
                                  <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </TableCell>
                                {priorPeriodData && (
                                  <TableCell className="text-right">{formatCurrency(priorLiability?.balance || 0)}</TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-medium">
                            <TableCell>Total Current Liabilities</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.liabilities.currentLiabilities?.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.liabilities?.currentLiabilities?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Long-term Liabilities</TableCell>
                            <TableCell></TableCell>
                            {priorPeriodData && <TableCell></TableCell>}
                          </TableRow>
                          {(reportData.liabilities.longTermLiabilities?.accounts || []).map((liability: any) => {
                            const priorLiability = priorPeriodData?.liabilities?.longTermLiabilities?.accounts?.find((l: any) => l.id === liability.id);
                            return (
                              <TableRow key={`longterm-liability-${liability.id}`}>
                                <TableCell className="pl-6">{liability.name}</TableCell>
                                <TableCell 
                                  className="text-right cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => {
                                    setSelectedAccount({
                                      id: liability.id,
                                      name: liability.name,
                                      accountNumber: liability.accountNumber || '',
                                      type: 'liability'
                                    });
                                    setIsGeneralLedgerOpen(true);
                                  }}
                                  data-testid={`account-balance-${liability.id}`}
                                >
                                  <span className="group-hover:underline">{formatCurrency(liability.balance || 0)}</span>
                                  <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </TableCell>
                                {priorPeriodData && (
                                  <TableCell className="text-right">{formatCurrency(priorLiability?.balance || 0)}</TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-medium">
                            <TableCell>Total Long-term Liabilities</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.liabilities.longTermLiabilities?.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.liabilities?.longTermLiabilities?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow className="font-bold">
                            <TableCell>TOTAL LIABILITIES</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.liabilities.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.liabilities?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Equity</TableCell>
                            <TableCell></TableCell>
                            {priorPeriodData && <TableCell></TableCell>}
                          </TableRow>
                          {(reportData.equity.accounts || []).map((equity: any) => {
                            // Smart matching for equity accounts across periods
                            let priorEquity = priorPeriodData?.equity?.accounts?.find((e: any) => e.id === equity.id);
                            
                            // If no direct match by ID, try matching by account name/number (for retained earnings)
                            if (!priorEquity && equity.name?.toLowerCase().includes('retained earnings')) {
                              priorEquity = priorPeriodData?.equity?.accounts?.find((e: any) => 
                                e.name?.toLowerCase().includes('retained earnings') || 
                                (e.accountNumber && equity.accountNumber && e.accountNumber === equity.accountNumber)
                              );
                            }
                            
                            // If no direct match and this is net income, look for retained earnings in prior period  
                            if (!priorEquity && (equity.name?.toLowerCase().includes('net income') || equity.id === 'net-income')) {
                              priorEquity = priorPeriodData?.equity?.accounts?.find((e: any) => 
                                e.name?.toLowerCase().includes('retained earnings')
                              );
                            }
                            
                            return (
                              <TableRow key={`equity-${equity.id}`}>
                                <TableCell className="pl-6">{equity.name}</TableCell>
                                <TableCell 
                                  className="text-right cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => {
                                    setSelectedAccount({
                                      id: equity.id,
                                      name: equity.name,
                                      accountNumber: equity.accountNumber || '',
                                      type: 'equity'
                                    });
                                    setIsGeneralLedgerOpen(true);
                                  }}
                                  data-testid={`account-balance-${equity.id}`}
                                >
                                  <span className="group-hover:underline">{formatCurrency(equity.balance || 0)}</span>
                                  <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </TableCell>
                                {priorPeriodData && (
                                  <TableCell className="text-right">{formatCurrency(priorEquity?.balance || 0)}</TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          <TableRow className="font-medium">
                            <TableCell>Total Equity</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.equity.total || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.equity?.total || 0)}</TableCell>
                            )}
                          </TableRow>
                          <TableRow className="font-bold border-t">
                            <TableCell>TOTAL LIABILITIES AND EQUITY</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.totals?.totalLiabilitiesAndEquity || 0)}</TableCell>
                            {priorPeriodData && (
                              <TableCell className="text-right">{formatCurrency(priorPeriodData?.totals?.totalLiabilitiesAndEquity || 0)}</TableCell>
                            )}
                          </TableRow>
                        </TableBody>
                      </DataTable>
                    </div>
                  </div>
                )}

                {/* Profit & Loss Display */}
                {selectedTemplate === 'profit-loss' && reportData && (
                  <div className="space-y-6">
                    {/* Check if it's columnar data */}
                    {reportData.isColumnar ? (
                      /* Columnar P&L Display */
                      <DataTable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            {reportData.periods?.map((period: string, index: number) => (
                              <TableHead key={index} className="text-right min-w-[100px]">
                                {period}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* INCOME Section */}
                          <TableRow>
                            <TableCell className="font-medium">INCOME</TableCell>
                            {reportData.periods?.map((_: string, index: number) => (
                              <TableCell key={index}></TableCell>
                            ))}
                          </TableRow>
                          {reportData.income?.accounts?.map((income: any) => (
                            <TableRow key={income.id}>
                              <TableCell className="pl-6">{income.name}</TableCell>
                              {income.amounts?.map((amount: number, index: number) => (
                                <TableCell key={index} className="text-right">
                                  {formatCurrency(amount || 0)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          <TableRow className="font-medium">
                            <TableCell>Total Income</TableCell>
                            {reportData.income?.totals?.map((total: number, index: number) => (
                              <TableCell key={index} className="text-right">
                                {formatCurrency(total || 0)}
                              </TableCell>
                            ))}
                          </TableRow>
                          
                          {/* COST OF SALES Section */}
                          {reportData.costOfSales?.accounts?.length > 0 && (
                            <>
                              <TableRow>
                                <TableCell></TableCell>
                                {reportData.periods?.map((_: string, index: number) => (
                                  <TableCell key={index}></TableCell>
                                ))}
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">COST OF SALES</TableCell>
                                {reportData.periods?.map((_: string, index: number) => (
                                  <TableCell key={index}></TableCell>
                                ))}
                              </TableRow>
                              {reportData.costOfSales?.accounts?.map((cos: any) => (
                                <TableRow key={cos.id}>
                                  <TableCell className="pl-6">{cos.name}</TableCell>
                                  {cos.amounts?.map((amount: number, index: number) => (
                                    <TableCell key={index} className="text-right">
                                      {formatCurrency(amount || 0)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              <TableRow className="font-medium">
                                <TableCell>Total Cost of Sales</TableCell>
                                {reportData.costOfSales?.totals?.map((total: number, index: number) => (
                                  <TableCell key={index} className="text-right">
                                    {formatCurrency(total || 0)}
                                  </TableCell>
                                ))}
                              </TableRow>
                              <TableRow className="font-medium bg-muted/50">
                                <TableCell>GROSS PROFIT</TableCell>
                                {reportData.grossProfits?.map((profit: number, index: number) => (
                                  <TableCell key={index} className="text-right">
                                    {formatCurrency(profit || 0)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </>
                          )}
                          
                          {/* EXPENSES Section */}
                          <TableRow>
                            <TableCell></TableCell>
                            {reportData.periods?.map((_: string, index: number) => (
                              <TableCell key={index}></TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">EXPENSES</TableCell>
                            {reportData.periods?.map((_: string, index: number) => (
                              <TableCell key={index}></TableCell>
                            ))}
                          </TableRow>
                          {reportData.expenses?.accounts?.map((expense: any) => (
                            <TableRow key={expense.id}>
                              <TableCell className="pl-6">{expense.name}</TableCell>
                              {expense.amounts?.map((amount: number, index: number) => (
                                <TableCell key={index} className="text-right">
                                  {formatCurrency(amount || 0)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          <TableRow className="font-medium">
                            <TableCell>Total Expenses</TableCell>
                            {reportData.expenses?.totals?.map((total: number, index: number) => (
                              <TableCell key={index} className="text-right">
                                {formatCurrency(total || 0)}
                              </TableCell>
                            ))}
                          </TableRow>
                          
                          {/* NET INCOME */}
                          <TableRow className="font-bold border-t bg-muted/30">
                            <TableCell>NET INCOME</TableCell>
                            {reportData.netIncomes?.map((netIncome: number, index: number) => (
                              <TableCell key={index} className="text-right">
                                {formatCurrency(netIncome || 0)}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </DataTable>
                    ) : (
                      /* Standard Single Period P&L Display */
                      reportData.income && (
                        <DataTable>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">
                                {priorPeriodData ? 'Current Period' : 'Amount'}
                              </TableHead>
                              {priorPeriodData && (
                                <TableHead className="text-right">Prior Period</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">INCOME</TableCell>
                          <TableCell></TableCell>
                          {priorPeriodData && <TableCell></TableCell>}
                        </TableRow>
                        {(reportData.income.accounts || []).map((income: any) => {
                          const priorIncome = priorPeriodData?.income?.accounts?.find((i: any) => i.id === income.id);
                          return (
                            <TableRow key={income.id}>
                              <TableCell className="pl-6">{income.name}</TableCell>
                              <TableCell 
                                className="text-right cursor-pointer hover:bg-muted/50 group"
                                onClick={() => {
                                  setSelectedAccount({
                                    id: income.id,
                                    name: income.name,
                                    accountNumber: income.accountNumber || '',
                                    type: 'income'
                                  });
                                  setIsGeneralLedgerOpen(true);
                                }}
                                data-testid={`account-balance-${income.id}`}
                              >
                                <span className="group-hover:underline">{formatCurrency(income.balance || 0)}</span>
                                <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </TableCell>
                              {priorPeriodData && (
                                <TableCell className="text-right">{formatCurrency(priorIncome?.balance || 0)}</TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-medium">
                          <TableCell>Total Income</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.income.total || 0)}</TableCell>
                          {priorPeriodData && (
                            <TableCell className="text-right">{formatCurrency(priorPeriodData?.income?.total || 0)}</TableCell>
                          )}
                        </TableRow>
                        
                        {/* Cost of Sales Section */}
                        <TableRow>
                          <TableCell className="font-medium">COST OF SALES</TableCell>
                          <TableCell></TableCell>
                          {priorPeriodData && <TableCell></TableCell>}
                        </TableRow>
                        {(reportData.costOfSales?.accounts || []).map((cost: any) => {
                          const priorCost = priorPeriodData?.costOfSales?.accounts?.find((c: any) => c.id === cost.id);
                          return (
                            <TableRow key={cost.id}>
                              <TableCell className="pl-6">{cost.name}</TableCell>
                              <TableCell 
                                className="text-right cursor-pointer hover:bg-muted/50 group"
                                onClick={() => {
                                  setSelectedAccount({
                                    id: cost.id,
                                    name: cost.name,
                                    accountNumber: cost.accountNumber || '',
                                    type: 'cost_of_sales'
                                  });
                                  setIsGeneralLedgerOpen(true);
                                }}
                                data-testid={`account-balance-${cost.id}`}
                              >
                                <span className="group-hover:underline">{formatCurrency(cost.balance || 0)}</span>
                                <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </TableCell>
                              {priorPeriodData && (
                                <TableCell className="text-right">{formatCurrency(priorCost?.balance || 0)}</TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-medium">
                          <TableCell>Total Cost of Sales</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.costOfSales?.total || 0)}</TableCell>
                          {priorPeriodData && (
                            <TableCell className="text-right">{formatCurrency(priorPeriodData?.costOfSales?.total || 0)}</TableCell>
                          )}
                        </TableRow>
                        
                        {/* Gross Profit */}
                        <TableRow className="font-bold border-t border-b bg-muted/50">
                          <TableCell>GROSS PROFIT</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.grossProfit || 0)}</TableCell>
                          {priorPeriodData && (
                            <TableCell className="text-right">{formatCurrency(priorPeriodData?.grossProfit || 0)}</TableCell>
                          )}
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">OPERATING EXPENSES</TableCell>
                          <TableCell></TableCell>
                          {priorPeriodData && <TableCell></TableCell>}
                        </TableRow>
                        {(reportData.expenses.accounts || []).map((expense: any) => {
                          const priorExpense = priorPeriodData?.expenses?.accounts?.find((e: any) => e.id === expense.id);
                          return (
                            <TableRow key={expense.id}>
                              <TableCell className="pl-6">{expense.name}</TableCell>
                              <TableCell 
                                className="text-right cursor-pointer hover:bg-muted/50 group"
                                onClick={() => {
                                  setSelectedAccount({
                                    id: expense.id,
                                    name: expense.name,
                                    accountNumber: expense.accountNumber || '',
                                    type: 'expense'
                                  });
                                  setIsGeneralLedgerOpen(true);
                                }}
                                data-testid={`account-balance-${expense.id}`}
                              >
                                <span className="group-hover:underline">{formatCurrency(expense.balance || 0)}</span>
                                <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </TableCell>
                              {priorPeriodData && (
                                <TableCell className="text-right">{formatCurrency(priorExpense?.balance || 0)}</TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-medium">
                          <TableCell>Total Expenses</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.expenses.total || 0)}</TableCell>
                          {priorPeriodData && (
                            <TableCell className="text-right">{formatCurrency(priorPeriodData?.expenses?.total || 0)}</TableCell>
                          )}
                        </TableRow>
                        <TableRow className="font-bold border-t">
                          <TableCell>NET INCOME</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.netIncome || 0)}</TableCell>
                          {priorPeriodData && (
                            <TableCell className="text-right">{formatCurrency(priorPeriodData?.netIncome || 0)}</TableCell>
                          )}
                        </TableRow>
                      </TableBody>
                    </DataTable>
                      )
                    )}
                  </div>
                )}

                {/* Trial Balance Display */}
                {selectedTemplate === 'trial-balance' && reportData && reportData.accounts && Array.isArray(reportData.accounts) && (
                  <div className="space-y-4">
                    <DataTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Account Number</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.accounts.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell>{account.name}</TableCell>
                            <TableCell>{account.accountNumber}</TableCell>
                            <TableCell className="text-right">
                              {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : ''}
                            </TableCell>
                            <TableCell className="text-right">
                              {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t">
                          <TableCell colSpan={2}>TOTALS</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.totalDebits || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.totalCredits || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </DataTable>
                  </div>
                )}

                {/* Cash Flow Statement Display */}
                {selectedTemplate === 'cash-flow' && reportData && reportData.operatingActivities && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Cash Flow Statement</h3>
                      <div className="text-sm text-muted-foreground">
                        Method: {reportData.method === 'direct' ? 'Direct' : 'Indirect'}
                      </div>
                    </div>
                    
                    <DataTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cash Flow Activity</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Operating Activities */}
                        <TableRow>
                          <TableCell className="font-medium">CASH FLOWS FROM OPERATING ACTIVITIES</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        {reportData.operatingActivities.activities?.map((activity: any, index: number) => (
                          <TableRow key={`operating-${index}`}>
                            <TableCell className="pl-6">{activity.description}</TableCell>
                            <TableCell className="text-right">
                              {activity.amount !== 0 ? formatCurrency(activity.amount) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium">
                          <TableCell>Net Cash from Operating Activities</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.operatingActivities.total)}</TableCell>
                        </TableRow>
                        
                        {/* Investing Activities */}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">CASH FLOWS FROM INVESTING ACTIVITIES</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        {reportData.investingActivities?.activities?.map((activity: any, index: number) => (
                          <TableRow key={`investing-${index}`}>
                            <TableCell className="pl-6">{activity.description}</TableCell>
                            <TableCell className="text-right">
                              {activity.amount !== 0 ? formatCurrency(activity.amount) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium">
                          <TableCell>Net Cash from Investing Activities</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.investingActivities?.total || 0)}</TableCell>
                        </TableRow>
                        
                        {/* Financing Activities */}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">CASH FLOWS FROM FINANCING ACTIVITIES</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        {reportData.financingActivities?.activities?.map((activity: any, index: number) => (
                          <TableRow key={`financing-${index}`}>
                            <TableCell className="pl-6">{activity.description}</TableCell>
                            <TableCell className="text-right">
                              {activity.amount !== 0 ? formatCurrency(activity.amount) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium">
                          <TableCell>Net Cash from Financing Activities</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.financingActivities?.total || 0)}</TableCell>
                        </TableRow>
                        
                        {/* Summary */}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow className="font-bold border-t">
                          <TableCell>NET CHANGE IN CASH</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.netCashChange || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Cash at Beginning of Period</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.beginningCash || 0)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold border-t">
                          <TableCell>CASH AT END OF PERIOD</TableCell>
                          <TableCell className="text-right">{formatCurrency(reportData.endingCash || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </DataTable>
                  </div>
                )}

                {/* General Ledger Display */}
                {selectedTemplate === 'general-ledger' && reportData && reportData.accounts && Array.isArray(reportData.accounts) && (
                  <div className="space-y-6">
                    {reportData.accounts && reportData.accounts.length > 0 ? (
                      <>
                        {reportData.accounts.map((account: any) => (
                          <Card key={account.id}>
                            <CardHeader className="pb-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <CardTitle className="text-lg">{account.name}</CardTitle>
                                  <CardDescription>Account #{account.accountNumber} • {account.type}</CardDescription>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">Opening Balance</div>
                                  <div className="font-medium">{formatCurrency(account.openingBalance || 0)}</div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {account.transactions && account.transactions.length > 0 ? (
                                <div className="space-y-4">
                                  <DataTable>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {/* Opening Balance Row */}
                                      <TableRow className="bg-muted/50">
                                        <TableCell className="font-medium">Opening Balance</TableCell>
                                        <TableCell colSpan={2}>Beginning of period</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(account.openingBalance || 0)}
                                        </TableCell>
                                      </TableRow>
                                      {/* Transaction Rows */}
                                      {account.transactions.map((transaction: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell>
                                            {(() => {
                                              // Format YYYY-MM-DD directly to MMM d, yyyy without Date object to avoid timezone issues
                                              const [year, month, day] = transaction.date.split('-');
                                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                              const monthName = monthNames[parseInt(month) - 1];
                                              const dayNum = parseInt(day);
                                              return `${monthName} ${dayNum}, ${year}`;
                                            })()}
                                          </TableCell>
                                          <TableCell>{transaction.description}</TableCell>
                                          <TableCell className="text-muted-foreground">{transaction.reference}</TableCell>
                                          <TableCell className="text-right">
                                            {transaction.debitAmount ? formatCurrency(transaction.debitAmount) : ''}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {transaction.creditAmount ? formatCurrency(transaction.creditAmount) : ''}
                                          </TableCell>
                                          <TableCell className="text-right font-medium">
                                            {formatCurrency(transaction.runningBalance)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {/* Summary Row */}
                                      <TableRow className="border-t-2 font-medium bg-muted/30">
                                        <TableCell>Ending Balance</TableCell>
                                        <TableCell colSpan={2}>
                                          Period: {reportData.startDate} to {reportData.endDate}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(account.totalDebits || 0)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(account.totalCredits || 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                          {formatCurrency(account.endingBalance || 0)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </DataTable>
                                </div>
                              ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                  <p>No transactions in this period</p>
                                  <p className="text-sm mt-1">
                                    Ending Balance: {formatCurrency(account.endingBalance || 0)}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        {/* Ending Report Balances Summary */}
                        {(() => {
                          const totalDebits = reportData.accounts.reduce((sum: number, account: any) => sum + (account.totalDebits || 0), 0);
                          const totalCredits = reportData.accounts.reduce((sum: number, account: any) => sum + (account.totalCredits || 0), 0);
                          const totalBalance = reportData.accounts.reduce((sum: number, account: any) => sum + (account.endingBalance || 0), 0);
                          
                          return (
                            <Card className="border-2 border-primary/20">
                              <CardHeader className="bg-muted/50">
                                <CardTitle className="text-xl">Ending Report Balances</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <DataTable>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[200px]">Totals</TableHead>
                                      <TableHead className="text-right">Debit</TableHead>
                                      <TableHead className="text-right">Credit</TableHead>
                                      <TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="font-bold text-lg">
                                      <TableCell>Total</TableCell>
                                      <TableCell className="text-right font-mono">
                                        {formatCurrency(totalDebits)}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                        {formatCurrency(totalCredits)}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                        {formatCurrency(totalBalance)}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </DataTable>
                              </CardContent>
                            </Card>
                          );
                        })()}
                      </>
                    ) : (
                      <Card>
                        <CardContent className="py-12">
                          <div className="text-center text-muted-foreground">
                            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No general ledger accounts found for the selected date range.</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Aging Reports */}
                {selectedTemplate === 'accounts-receivable' && reportData && (
                  <AccountsReceivableAging 
                    clientId={clientId ? parseInt(clientId) : null} 
                    asOfDate={agingAsOfDate}
                  />
                )}
                
                {selectedTemplate === 'accounts-payable' && reportData && (
                  <AccountsPayableAging 
                    clientId={clientId ? parseInt(clientId) : null} 
                    asOfDate={agingAsOfDate}
                  />
                )}

                {/* Default message for other unsupported reports */}
                {!['balance-sheet', 'profit-loss', 'trial-balance', 'general-ledger', 'cash-flow', 'accounts-receivable', 'accounts-payable'].includes(selectedTemplate) && reportData && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Report display for {REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name} is coming soon.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select Report and Generate</CardTitle>
                <CardDescription>
                  Choose a report type and date range from the settings panel, then click "Generate Report" to view live data.
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure your report settings and click Generate Report to begin.</p>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
      
      {/* General Ledger Modal for drill-down */}
      {selectedAccount && clientId && (
        <GeneralLedgerModal
          isOpen={isGeneralLedgerOpen}
          onClose={() => {
            setIsGeneralLedgerOpen(false);
            setSelectedAccount(null);
          }}
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountNumber={selectedAccount.accountNumber}
          accountType={selectedAccount.type}
          clientId={clientId}
          startDate={format(effectiveDateRange.from, 'yyyy-MM-dd')}
          endDate={format(effectiveDateRange.to, 'yyyy-MM-dd')}
          isBalanceSheetDrillDown={selectedTemplate === 'balance-sheet'}
        />
      )}
    </div>
  );
}