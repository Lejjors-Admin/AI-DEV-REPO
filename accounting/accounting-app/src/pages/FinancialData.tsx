import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { 
  RefreshCw, Download, Info, 
  FileText, BarChart2, Users, 
  Plus, Edit, Trash2, 
  CreditCard, DollarSign, ShoppingBag,
  Wallet, Loader2, Upload, 
  UploadCloud, FileUp, Filter, 
  Tag, AlertCircle, CheckCircle,
  FileOutput, Sparkles, Settings,
  Calculator, Search, Link,
  BarChart, Lightbulb, Shield, 
  Merge, Hash, ChevronDown,
  Receipt, Building, UserCheck,
  TrendingUp, FileCheck, Clock,
  Banknote, PiggyBank, Calendar,
  Building2, ClipboardList, PieChart,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDateSafe, getTransactionDate } from "@/lib/date-utils";
import { useState, useEffect, useRef } from "react";
import ReportsTab from "@/components/financial/ReportsTab";
import { BankFeedsList } from "@/components/financial/BankFeedsList";
import { BankTransactionsList } from "@/components/financial/BankTransactionsList";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { AccountNumberDialog } from "@/components/financial/AccountNumberDialog";
import { AccountTypeEditor } from "@/components/AccountTypeEditor";
import { ChartOfAccounts } from "@/components/ChartOfAccounts";
import TransactionLedger from "@/components/TransactionLedger";
import MiltonBooksChat from "@/components/milton/MiltonBooksChat";
// DesignSwitcher removed - legacy component for backend access only
import { ModernSidebar } from "@/components/ModernSidebar";
import {
  Alert,
  AlertTitle,
  AlertDescription
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankReconciliation } from "@/components/financial/BankReconciliation";
import { AutomaticBookkeeping } from "@/components/financial/AutomaticBookkeeping";
import BookkeepingSettingsTab from "@/components/financial/BookkeepingSettingsTab";
import { Textarea } from "@/components/ui/textarea";
import { syncQBOData } from "@/lib/qbo";
import { SafeSelect, SafeCsvSelect } from "@/components/safe-select";
import { AutoCategorizeTransactions } from "@/components/financial/AutoCategorizeTransactions";
import { FileDropZone } from "@/components/FileDropZone";
import { ChartValidationScreen } from "@/components/ChartValidationScreen";
import TransactionManager from "./TransactionManager";
import { apiConfig } from "@/lib/api-config";
import { getCurrentDateString } from "@/lib/date-utils";

// Helper function to format dates from various formats into YYYY-MM-DD
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0]; // Default to today
  
  try {
    // Try various date formats
    let date;
    
    // Handle M/D/YYYY or MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Assume MM/DD/YYYY format
        date = new Date(
          parseInt(parts[2]), // Year
          parseInt(parts[0]) - 1, // Month (0-indexed)
          parseInt(parts[1]) // Day
        );
      }
    } 
    // Handle DD-MM-YYYY format
    else if (dateStr.includes('-') && dateStr.length <= 10) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        date = new Date(
          parseInt(parts[2]), // Year
          parseInt(parts[1]) - 1, // Month (0-indexed)
          parseInt(parts[0]) // Day
        );
      }
    }
    // If none of the above worked, try the default Date parser
    if (!date || isNaN(date.getTime())) {
      date = new Date(dateStr);
    }
    
    // If we have a valid date, format it as YYYY-MM-DD
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // If all else fails, return today's date
    return new Date().toISOString().split('T')[0];
  } catch (e) {
    console.warn("Error parsing date:", dateStr, e);
    return new Date().toISOString().split('T')[0];
  }
};
// Component imports should go at the top of the file

// Helper function to properly parse CSV rows, handling quoted values
const parseCSVRow = (row: string) => {
  const result = [];
  let insideQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // Toggle insideQuotes state
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      // End of current value, add to result and reset
      result.push(currentValue);
      currentValue = '';
    } else {
      // Add character to current value
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue);
  
  // Handle quoted values by removing the quotes
  return result.map(val => {
    const trimmed = val.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.substring(1, trimmed.length - 1).trim();
    }
    return trimmed;
  });
};

// Helper function to ensure consistent amount handling throughout the application
const processAmount = (amountInput: string | number | null): number => {
  // If input is null or undefined, return 0
  if (amountInput === null || amountInput === undefined) {
    return 0;
  }
  
  // If it's already a number, just return it
  if (typeof amountInput === 'number') {
    return amountInput;
  }
  
  // If it's a string, clean it (remove currency symbols, etc.) and convert to number
  const cleaned = amountInput.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  
  // Check if parsing resulted in NaN or 0 when the string wasn't "0"
  if (isNaN(parsed) || (parsed === 0 && cleaned !== '0')) {
    console.log(`Warning: Could not parse amount "${amountInput}", returning 0`);
    return 0;
  }
  
  return parsed;
};

// Helper function to format currency for display
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};



// Helper function to format account balances based on account type and display context
const formatAccountBalance = (amount: number, accountType: string, displayContext: 'journal' | 'dashboard' = 'journal'): string => {
  // Balance is already stored as dollars in database (decimal format)
  const dollars = amount;
  
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // In dashboard context, show actual balance (including negative values)
  if (displayContext === 'dashboard') {
    return currencyFormatter.format(dollars);
  }
  
  // In journal context, show accounting notation (credits in parentheses)
  if (accountType === 'liability' || accountType === 'equity' || accountType === 'income') {
    if (dollars > 0) {
      return `(${currencyFormatter.format(dollars)})`;
    }
    return currencyFormatter.format(Math.abs(dollars));
  }
  
  // For assets and expenses, display debits as positive
  return currencyFormatter.format(dollars);
};

export default function FinancialData() {
  const { toast } = useToast();
  const params = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountsFileInputRef = useRef<HTMLInputElement>(null);
  const { selectedClientId, setSelectedClientId } = useSelectedClient();
  
  // Convert clientId to string for legacy compatibility
  const selectedClient = selectedClientId ? selectedClientId.toString() : "";
  
  const [activeTab, setActiveTab] = useState(params.tab || "overview");
  const [selectedBankFeedId, setSelectedBankFeedId] = useState<number | null>(null);
  
  // CSV Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [accountsCsvData, setAccountsCsvData] = useState<any[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showAccountsMappingDialog, setShowAccountsMappingDialog] = useState(false);
  
  // Bookkeeping feature dialogs
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [showNewPayrollDialog, setShowNewPayrollDialog] = useState(false);
  const [showTaxReturnDialog, setShowTaxReturnDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    date: 'none',
    description: 'none',
    amount: 'none',
    debit: 'none',
    credit: 'none',
    type: 'none',
    category: 'none',
    taxAmount: 'none',
    reference: 'none',
    // Enhanced mappings for trial balance and general ledger
    accountName: 'none',
    accountNumber: 'none',
    accountType: 'none',
    period: 'none',
    debitBalance: 'none',
    creditBalance: 'none',
    openingBalance: 'none',
    closingBalance: 'none'
  });
  
  // Toggle for two-column amount (debit/credit) mode
  const [useTwoColumnAmount, setUseTwoColumnAmount] = useState(false);
  
  // Import type selection for enhanced CSV processing
  const [importType, setImportType] = useState<'transactions' | 'trial_balance' | 'general_ledger'>('transactions');
  
  // State for chart validation screen
  const [showChartValidation, setShowChartValidation] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // State for import results with validation
  const [importResults, setImportResults] = useState<{
    success: boolean;
    successful?: number;
    failed?: number;
    total?: number;
    error?: string;
    chartValidation?: {
      balanced: boolean;
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      difference: number;
      message: string;
    }
  } | null>(null);
  const [accountsColumnMapping, setAccountsColumnMapping] = useState({
    name: 'none',
    type: 'none',
    subtype: 'none',
    description: 'none'
  });
  
  // Transaction classification states
  const [showClassifyDialog, setShowClassifyDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: number;
    date: string;
    description: string;
    amount: string;
    reference: string;
    category: string;
    notes: string;
    type: string;
    accountId: number | null;
    categoryName: string | null;
    taxId?: number;
    taxSettingId?: string;
    taxRate: number;
    taxInclusive: boolean;
    taxName: string;
    taxStatus?: string;
    taxable?: boolean;
    status?: string;
    taxAmount?: number;
  } | null>(null);
  const [showRulesSheet, setShowRulesSheet] = useState(false);
  
  // New transaction states
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'journal'>('expense');
  const defaultTransactionFormState = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    reference: '',
    category: '',
    notes: '',
    accountId: null as number | null,
    taxId: undefined as number | undefined,
    taxSettingId: undefined as string | undefined,
    taxRate: 0,
    taxInclusive: false,
    taxName: '',
    taxStatus: 'exempt',
    taxable: false
  };

  const [newTransactionFormData, setNewTransactionFormData] = useState(defaultTransactionFormState);
  
  // Helper function to reset transaction form to default state
  const resetTransactionForm = () => {
    setNewTransactionFormData({
      ...defaultTransactionFormState,
      date: new Date().toISOString().split('T')[0]
    });
  };
  
  // AI categorization states
  const [isAICategorizing, setIsAICategorizing] = useState(false);
  const [aiCategorySuggestion, setAICategorySuggestion] = useState<{
    id: number;
    name: string;
    type: string;
    confidence: number;
  } | null>(null);
  
  // Journal entry states
  const [transactionItems, setTransactionItems] = useState<Array<{
    accountId: number | null;
    description: string;
    amount: string;
    isDebit: boolean;
  }>>([
    { accountId: null, description: '', amount: '', isDebit: true },
    { accountId: null, description: '', amount: '', isDebit: false }
  ]);
  
  // State to track if debits and credits are balanced
  const [isBalanced, setIsBalanced] = useState(false);
  
  // Calculate if debits and credits are balanced
  useEffect(() => {
    if (transactionType === 'journal') {
      let totalDebits = 0;
      let totalCredits = 0;
      
      transactionItems.forEach(item => {
        const amount = parseFloat(item.amount) || 0;
        if (item.isDebit) {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }
      });
      
      // Check if balanced within a small rounding error tolerance
      setIsBalanced(Math.abs(totalDebits - totalCredits) < 0.01);
    }
  }, [transactionItems, transactionType]);
  
  // New rule states
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false);
  const [newRuleFormData, setNewRuleFormData] = useState({
    name: '',
    pattern: '',
    matchType: 'contains',
    category: '',
    isActive: true
  });
  
  // Bank feeds integration is handled by the state at the top of the component
  
  // AI-generated chart of accounts states
  const [showGenerateAccountsDialog, setShowGenerateAccountsDialog] = useState(false);
  const [generatingAccounts, setGeneratingAccounts] = useState(false);
  const [industryInput, setIndustryInput] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  
  // New account states
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [newAccountFormData, setNewAccountFormData] = useState({
    name: '',
    type: 'asset',
    subtype: '',
    description: '',
    isActive: true
  });
  
  // Edit account states
  const [showEditAccountDialog, setShowEditAccountDialog] = useState(false);
  const [showDeleteAccountConfirmDialog, setShowDeleteAccountConfirmDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  
  // Account number edit states
  const [showAccountNumberDialog, setShowAccountNumberDialog] = useState(false);
  const [selectedAccountForNumberEdit, setSelectedAccountForNumberEdit] = useState<any>(null);
  
  // Account type editor state
  const [showAccountTypeEditor, setShowAccountTypeEditor] = useState(false);

  // Transaction editing state
  const [showEditTransactionDialog, setShowEditTransactionDialog] = useState(false);
  
  // AI Analysis states
  const [isRunningAIAnalysis, setIsRunningAIAnalysis] = useState(false);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any>(null);
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);
  
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: [`/api/qbo/integrations/${selectedClient}`],
    enabled: !!selectedClient,
  });
  
  // Fetch bookkeeping settings with tax information
  const { data: bookkeepingSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: [`/api/clients/${selectedClient}/bookkeeping-settings`],
    queryFn: () => apiRequest('GET', `/api/clients/${selectedClient}/bookkeeping-settings`).then(r => r.json()),
    enabled: !!selectedClient,
    onSuccess: (data) => {
      console.log("Bookkeeping settings loaded:", data);
      console.log("Tax settings available:", data?.taxSettings);
    }
  });
  
  const { data: financialSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: [`/api/bookkeeping-summary/${selectedClient}`],
    enabled: !!selectedClient,
  });
  
  const { data: accountsData, isLoading: isLoadingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: [`/api/accounts/${selectedClient}`],
    enabled: !!selectedClient, // Always load accounts when client is selected, regardless of tab
  });
  
  // Extract accounts array and validation from response
  const accounts = accountsData?.accounts || [];
  const accountsValidation = accountsData?.validation;
  
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: [`/api/transactions/${selectedClient}`],
    enabled: !!selectedClient && activeTab === "transactions",
  });
  
  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: [`/api/contacts/${selectedClient}`],
    enabled: !!selectedClient && activeTab === "contacts",
  });
  
  // Client bookkeeping settings are queried above
  
  // Query for bank feeds
  const { data: bankFeeds, isLoading: isLoadingBankFeeds } = useQuery({
    queryKey: [`/api/bank-feeds/${selectedClient}`],
    enabled: !!selectedClient && activeTab === "bank-feeds",
  });
  
  // Process amount for consistent display
  const processAmount = (amount: string | number | null | undefined): number => {
    // Handle null or undefined
    if (amount === null || amount === undefined) {
      return 0;
    }
    
    // If it's already a number, return it with 2 decimal places
    if (typeof amount === 'number') {
      // Check for NaN or invalid numbers
      if (isNaN(amount)) {
        return 0;
      }
      return parseFloat(amount.toFixed(2));
    }
    
    // If it's a string, clean it first (remove currency symbols, commas, etc.)
    if (typeof amount === 'string') {
      // Handle empty strings
      if (!amount.trim()) {
        return 0;
      }
      
      // Remove any non-numeric characters except decimal point and minus sign
      const cleanAmount = amount.replace(/[^\d.-]/g, '');
      
      // Parse the amount and preserve decimal precision
      return parseFloat(parseFloat(cleanAmount).toFixed(2));
    }
    
    return 0;
  };
  
  // Query for reconciliation rules - moved from inline render function
  const rulesQuery = useQuery({
    queryKey: [`/api/reconciliation-rules/${selectedClient}`],
    enabled: !!selectedClient && showRulesSheet,
  });
  
  const handleSyncData = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to sync bookkeeping data.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Syncing data",
        description: "Syncing bookkeeping data from QuickBooks Online...",
      });
      
      await syncQBOData(parseInt(selectedClient));
      
      // Invalidate queries to refresh all bookkeeping data
      queryClient.invalidateQueries({ queryKey: [`/api/qbo/integrations/${selectedClient}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping-summary/${selectedClient}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${selectedClient}`] });
      
      toast({
        title: "Data synced",
        description: "Bookkeeping data has been successfully synced.",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync bookkeeping data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // AI Analysis function to run different chart of accounts analysis
  const runChartAIAnalysis = async (analysisType: string) => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to run AI analysis",
        variant: "destructive",
      });
      return;
    }

    setIsRunningAIAnalysis(true);
    
    try {
      const response = await apiRequest('POST', '/api/ai-agents/categorizer', {
        clientId: parseInt(selectedClient),
        analysisType,
        options: {
          includeRecommendations: true,
          generateReport: true
        }
      });

      if (!response.ok) {
        throw new Error('Failed to run AI analysis');
      }

      const result = await response.json();
      setAiAnalysisResults(result);
      setShowAIAnalysisDialog(true);
      
      toast({
        title: "AI Analysis Complete",
        description: `Successfully completed ${analysisType.replace('_', ' ')} analysis`,
      });

      // Refresh accounts data and validation to show any updates
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}/validation`] });
    } catch (error: any) {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to run AI analysis",
        variant: "destructive",
      });
    } finally {
      setIsRunningAIAnalysis(false);
    }
  };
  
  // Handle AI intake analysis for chart of accounts
  const handleAIIntakeAnalysis = async (file: File) => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client before uploading files.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', selectedClient);

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch('/api/ai-intake/analyze-file', {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success && result.result) {
        // Show validation screen with parsed accounts
        setValidationResult(result.result);
        setShowChartValidation(true);
      } else {
        throw new Error(result.message || 'Failed to analyze file');
      }
    } catch (error: any) {
      toast({
        title: "File Analysis Failed",
        description: error.message || "Failed to analyze chart of accounts file",
        variant: "destructive",
      });
    }
  };

  // Handle chart validation approval
  const handleChartValidationApprove = async (selectedAccounts: any[], options: any) => {
    try {
      setIsImporting(true);
      
      // Create accounts individually since we don't have a bulk import endpoint yet
      let successCount = 0;
      let errorCount = 0;
      
      for (const account of selectedAccounts) {
        try {
          const accountData = {
            name: account.name,
            type: account.type,
            accountNumber: account.accountNumber,
            balance: account.balance !== undefined ? account.balance : 0,
            isDebitNormal: account.isDebitNormal,
            isActive: account.isActive !== false,
            clientId: parseInt(selectedClient)
          };
          
          console.log(`Creating account: ${account.name} with balance: ${account.balance}`);
          console.log(`Account data being sent:`, accountData);
          
          const response = await apiRequest('POST', '/api/accounts', accountData);
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      toast({
        title: "Accounts Imported",
        description: `Successfully imported ${successCount} accounts${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      // Refresh accounts data
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
      
      // Close validation screen
      setShowChartValidation(false);
      setValidationResult(null);
      
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import accounts",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = () => {
    console.log("handleFileUpload called");
    
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = '.csv,.xlsx,.xls';
    tempInput.style.display = 'none';
    
    // Add it to the document
    document.body.appendChild(tempInput);
    
    // Set up the change handler
    tempInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        console.log("File selected through temp input:", files[0].name);
        
        // Call the file processing function here
        handleFileChangeWithFile(files[0]);
        
        // Remove the temporary input
        document.body.removeChild(tempInput);
      }
    };
    
    // Trigger the file dialog
    tempInput.click();
  };
  
  // Helper function to process a file directly
  const handleFileChangeWithFile = async (file: File) => {
    console.log("Processing file:", file.name);
    
    // Check file extension to determine format
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isCSV = fileExt === 'csv';
    const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
    
    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload transactions.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset mapping values and set states
    setColumnMapping({
      date: 'none',
      description: 'none',
      amount: 'none',
      debit: 'none',
      credit: 'none',
      type: 'none',
      category: 'none',
      taxAmount: 'none',
      reference: 'none'
    });
    setUseTwoColumnAmount(false);
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      if (isCSV) {
        // Process CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            
            // Handle different line endings (Windows, Mac, Unix)
            const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
              throw new Error("File contains no data rows. Please ensure your CSV has headers and at least one data row.");
            }
            
            // Extract headers (assuming first row is headers)
            const headers = lines[0].split(',').map(header => header.trim());
            
            if (headers.length === 0) {
              throw new Error("Could not detect column headers in the CSV file.");
            }
            
            // Prepare data
            const data = [];
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue; // Skip empty lines
              
              const values = lines[i].split(',').map(value => value.trim());
              
              // Check if row has enough values
              if (values.length < headers.length) {
                // Try to handle the case where some values might be missing
                while (values.length < headers.length) {
                  values.push('');
                }
              }
              
              if (values.length !== headers.length) continue; // Skip malformed rows
              
              const row: Record<string, string> = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              data.push(row);
            }
            
            if (data.length === 0) {
              throw new Error("No valid data rows found in the CSV file.");
            }
            
            // Set state and show mapping dialog
            setImportProgress(50);
            setCsvData(data);
            setShowMappingDialog(true);
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "CSV Import failed",
              description: error.message || "Failed to process CSV file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsText(file);
      } else if (isExcel) {
        // Process Excel file using xlsx library
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Import xlsx dynamically to avoid issues with server-side rendering
            const XLSX = await import('xlsx');
            const fileData = e.target?.result;
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // First try with header option to get objects with keys
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              raw: false, // Convert everything to strings
              defval: ''  // Empty string for empty cells
            });
            
            // If that didn't work (no headers), try with explicit header row
            if (jsonData.length === 0) {
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,
                defval: ''
              });
            }
            
            if (jsonData.length < 2) {
              throw new Error("File contains no data rows. Please ensure your Excel file has headers and at least one data row.");
            }
            
            // Process the Excel data
            setImportProgress(50);
            setCsvData(jsonData);
            setShowMappingDialog(true);
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "Excel Import failed",
              description: error.message || "Failed to process Excel file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange called");
    console.log("Files:", event.target.files);
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    console.log("File selected:", file.name);
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
    
    // Check file extension to determine format
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isCSV = fileExt === 'csv';
    const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
    
    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload transactions.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset mapping values and set states
    setColumnMapping({
      date: 'none',
      description: 'none',
      amount: 'none',
      debit: 'none',
      credit: 'none',
      type: 'none',
      category: 'none',
      taxAmount: 'none',
      reference: 'none'
    });
    setUseTwoColumnAmount(false);
    setIsImporting(true);
    // Don't set setShowMappingDialog here as it will be set after data is processed
    setImportProgress(10);
    
    try {
      if (isCSV) {
        // Process CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            
            // Handle different line endings (Windows, Mac, Unix)
            const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
              throw new Error("File contains no data rows. Please ensure your CSV has headers and at least one data row.");
            }
            
            // Extract headers (assuming first row is headers)
            const headers = lines[0].split(',').map(header => header.trim());
            
            if (headers.length === 0) {
              throw new Error("Could not detect column headers in the CSV file.");
            }
            
            // Prepare data
            const data = [];
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue; // Skip empty lines
              
              const values = lines[i].split(',').map(value => value.trim());
              
              // Check if row has enough values
              if (values.length < headers.length) {
                // Try to handle the case where some values might be missing
                while (values.length < headers.length) {
                  values.push('');
                }
              }
              
              if (values.length !== headers.length) continue; // Skip malformed rows
              
              const row: Record<string, string> = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              data.push(row);
            }
            
            if (data.length === 0) {
              throw new Error("No valid data rows found in the CSV file.");
            }
            
            // Set state and show mapping dialog
            setImportProgress(50);
            setCsvData(data);
            setShowMappingDialog(true);
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "CSV Import failed",
              description: error.message || "Failed to process CSV file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsText(file);
      } else if (isExcel) {
        // Process Excel file using xlsx library
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Import xlsx dynamically to avoid issues with server-side rendering
            const XLSX = await import('xlsx');
            const fileData = e.target?.result;
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // First try with header option to get objects with keys
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              raw: false, // Convert everything to strings
              defval: ''  // Empty string for empty cells
            });
            
            // If that didn't work (no headers), try with explicit header row
            if (jsonData.length === 0) {
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,
                defval: ''
              });
            }
            
            if (jsonData.length < 2) {
              throw new Error("File contains no data rows. Please ensure your Excel file has headers and at least one data row.");
            }
            
            // Check if we have data in the proper format already (array of objects with keys)
            if (jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null && !Array.isArray(jsonData[0])) {
              // Data is already in the right format, so we just need to convert all values to strings
              const excelRows = jsonData.map((row: any) => {
                const stringRow: Record<string, string> = {};
                Object.keys(row).forEach(key => {
                  stringRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
                });
                return stringRow;
              });
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show mapping dialog
              setImportProgress(50);
              setCsvData(excelRows);
              setShowMappingDialog(true);
            } else if (Array.isArray(jsonData) && jsonData.length >= 2 && Array.isArray(jsonData[0])) {
              // Data is in array format [headers, ...data], convert to objects
              
              // Take first row as headers
              const headers = jsonData[0].map((header: any) => String(header));
              
              const excelRows = [];
              // Start from row 1 (skip headers)
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue; // Skip empty rows
                
                const rowObj: Record<string, string> = {};
                headers.forEach((header: string, j: number) => {
                  const value = j < row.length ? row[j] : '';
                  rowObj[header] = value !== null && value !== undefined ? String(value) : '';
                });
                excelRows.push(rowObj);
              }
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show mapping dialog
              setImportProgress(50);
              setCsvData(excelRows);
              setShowMappingDialog(true);
            } else {
              throw new Error("Could not parse Excel data format. Please ensure your Excel file has headers in the first row followed by data rows.");
            }
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "Excel Import failed",
              description: error.message || "Failed to process Excel file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        // Read as array buffer for Excel
        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "Failed to process file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleAccountsFileUpload = () => {
    console.log("handleAccountsFileUpload called");
    
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = '.csv,.xlsx,.xls';
    tempInput.style.display = 'none';
    
    // Add it to the document
    document.body.appendChild(tempInput);
    
    // Set up the change handler
    tempInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        console.log("Accounts file selected through temp input:", files[0].name);
        
        // Call the file processing function here
        handleAccountsFileChangeWithFile(files[0]);
        
        // Remove the temporary input
        document.body.removeChild(tempInput);
      }
    };
    
    // Trigger the file dialog
    tempInput.click();
  };
  
  // Helper function to process an accounts file directly
  const handleAccountsFileChangeWithFile = async (file: File) => {
    console.log("Processing accounts file:", file.name);
    
    // Check file extension to determine format
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isCSV = fileExt === 'csv';
    const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
    
    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload accounts.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset mapping values and set states
    setAccountsColumnMapping({
      name: 'none',
      type: 'none',
      subtype: 'none',
      description: 'none',
      balance: 'none'
    });
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      if (isCSV) {
        // Process CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            
            // Handle different line endings (Windows, Mac, Unix)
            const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
              throw new Error("File contains no data rows. Please ensure your CSV has headers and at least one data row.");
            }
            
            // Extract headers (assuming first row is headers)
            const headers = lines[0].split(',').map(header => header.trim());
            
            if (headers.length === 0) {
              throw new Error("Could not detect column headers in the CSV file.");
            }
            
            // Prepare data
            const data = [];
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue; // Skip empty lines
              
              const values = lines[i].split(',').map(value => value.trim());
              
              // Check if row has enough values
              if (values.length < headers.length) {
                // Try to handle the case where some values might be missing
                while (values.length < headers.length) {
                  values.push('');
                }
              }
              
              if (values.length !== headers.length) continue; // Skip malformed rows
              
              const row: Record<string, string> = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              data.push(row);
            }
            
            if (data.length === 0) {
              throw new Error("No valid data rows found in the CSV file.");
            }
            
            // Set state and show mapping dialog
            setImportProgress(50);
            setAccountsCsvData(data);
            setShowAccountsMappingDialog(true);
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "CSV Import failed",
              description: error.message || "Failed to process CSV file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsText(file);
      } else if (isExcel) {
        // Process Excel file using xlsx library
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Import xlsx dynamically to avoid issues with server-side rendering
            const XLSX = await import('xlsx');
            const fileData = e.target?.result;
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // First try with header option to get objects with keys
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              raw: false, // Convert everything to strings
              defval: ''  // Empty string for empty cells
            });
            
            // If that didn't work (no headers), try with explicit header row
            if (jsonData.length === 0) {
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,
                defval: ''
              });
            }
            
            if (jsonData.length < 2) {
              throw new Error("File contains no data rows. Please ensure your Excel file has headers and at least one data row.");
            }
            
            // Check if we have data in the proper format already (array of objects with keys)
            if (jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null && !Array.isArray(jsonData[0])) {
              // Data is already in the right format, so we just need to convert all values to strings
              const excelRows = jsonData.map((row: any) => {
                const stringRow: Record<string, string> = {};
                Object.keys(row).forEach(key => {
                  stringRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
                });
                return stringRow;
              });
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show mapping dialog
              setImportProgress(50);
              setAccountsCsvData(excelRows);
              setShowAccountsMappingDialog(true);
            } else if (Array.isArray(jsonData) && jsonData.length >= 2 && Array.isArray(jsonData[0])) {
              // Data is in array format [headers, ...data], convert to objects
              
              // Take first row as headers
              const headers = jsonData[0].map((header: any) => String(header));
              
              const excelRows = [];
              // Start from row 1 (skip headers)
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue; // Skip empty rows
                
                const rowObj: Record<string, string> = {};
                headers.forEach((header: string, j: number) => {
                  const value = j < row.length ? row[j] : '';
                  rowObj[header] = value !== null && value !== undefined ? String(value) : '';
                });
                excelRows.push(rowObj);
              }
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show mapping dialog
              setImportProgress(50);
              setAccountsCsvData(excelRows);
              setShowAccountsMappingDialog(true);
            } else {
              throw new Error("Could not parse Excel data format. Please ensure your Excel file has headers in the first row followed by data rows.");
            }
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "Excel Import failed",
              description: error.message || "Failed to process Excel file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        // Read as array buffer for Excel
        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  const handleAccountsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
    
    // Check file extension to determine format
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isCSV = fileExt === 'csv';
    const isExcel = fileExt === 'xlsx' || fileExt === 'xls';
    
    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload accounts.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset mapping values and set states
    setAccountsColumnMapping({
      name: 'none',
      type: 'none',
      subtype: 'none',
      description: 'none',
      balance: 'none'
    });
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      if (isCSV) {
        // Process CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            
            // Handle different line endings (Windows, Mac, Unix)
            const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
              throw new Error("File contains no data rows. Please ensure your CSV has headers and at least one data row.");
            }
            
            // Extract headers (assuming first row is headers)
            const headers = lines[0].split(',').map(header => header.trim());
            
            if (headers.length === 0) {
              throw new Error("Could not detect column headers in the CSV file.");
            }
            
            // Prepare data
            const data = [];
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue; // Skip empty lines
              
              const values = lines[i].split(',').map(value => value.trim());
              
              // Check if row has enough values
              if (values.length < headers.length) {
                // Try to handle the case where some values might be missing
                while (values.length < headers.length) {
                  values.push('');
                }
              }
              
              if (values.length !== headers.length) continue; // Skip malformed rows
              
              const row: Record<string, string> = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              data.push(row);
            }
            
            if (data.length === 0) {
              throw new Error("No valid data rows found in the CSV file.");
            }
            
            // Set state and show accounts mapping dialog
            setImportProgress(50);
            setCsvData(data);
            setShowAccountsMappingDialog(true);
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "CSV Import failed",
              description: error.message || "Failed to process CSV file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsText(file);
      } else if (isExcel) {
        // Process Excel file using xlsx library
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Import xlsx dynamically to avoid issues with server-side rendering
            const XLSX = await import('xlsx');
            const fileData = e.target?.result;
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // First try with header option to get objects with keys
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              raw: false, // Convert everything to strings
              defval: ''  // Empty string for empty cells
            });
            
            // If that didn't work (no headers), try with explicit header row
            if (jsonData.length === 0) {
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,
                defval: ''
              });
            }
            
            if (jsonData.length < 2) {
              throw new Error("File contains no data rows. Please ensure your Excel file has headers and at least one data row.");
            }
            
            // Check if we have data in the proper format already (array of objects with keys)
            if (jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null && !Array.isArray(jsonData[0])) {
              // Data is already in the right format, so we just need to convert all values to strings
              const excelRows = jsonData.map((row: any) => {
                const stringRow: Record<string, string> = {};
                Object.keys(row).forEach(key => {
                  stringRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
                });
                return stringRow;
              });
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show accounts mapping dialog
              setImportProgress(50);
              setCsvData(excelRows);
              setShowAccountsMappingDialog(true);
            } else if (Array.isArray(jsonData) && jsonData.length >= 2 && Array.isArray(jsonData[0])) {
              // Data is in array format [headers, ...data], convert to objects
              
              // Take first row as headers
              const headers = jsonData[0].map((header: any) => String(header));
              
              const excelRows = [];
              // Start from row 1 (skip headers)
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue; // Skip empty rows
                
                const rowObj: Record<string, string> = {};
                headers.forEach((header: string, j: number) => {
                  const value = j < row.length ? row[j] : '';
                  rowObj[header] = value !== null && value !== undefined ? String(value) : '';
                });
                excelRows.push(rowObj);
              }
              
              if (excelRows.length === 0) {
                throw new Error("No valid data rows found in the Excel file.");
              }
              
              // Set state and show accounts mapping dialog
              setImportProgress(50);
              setCsvData(excelRows);
              setShowAccountsMappingDialog(true);
            } else {
              throw new Error("Could not parse Excel data format. Please ensure your Excel file has headers in the first row followed by data rows.");
            }
          } catch (error: any) {
            setIsImporting(false);
            toast({
              title: "Excel Import failed",
              description: error.message || "Failed to process Excel file. Please check the format.",
              variant: "destructive",
            });
          }
        };
        
        // Read as array buffer for Excel
        reader.readAsArrayBuffer(file);
      }
    } catch (error: any) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "Failed to process file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle column mapping selection
  const handleColumnMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle accounts column mapping selection
  const handleAccountsColumnMappingChange = (field: string, value: string) => {
    setAccountsColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle accounts import after mapping is complete
  const handleImportAccountsMappedData = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload accounts.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that at least the required fields are mapped
    const requiredFields = ['name', 'type'];
      
    const missingFields = requiredFields.filter(field => 
      accountsColumnMapping[field as keyof typeof accountsColumnMapping] === 'none'
    );
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required mappings",
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(60);
    
    try {
      // Prepare accounts data
      const accounts = csvData.map(row => {
        const nameField = accountsColumnMapping.name;
        const typeField = accountsColumnMapping.type;
        const subtypeField = accountsColumnMapping.subtype;
        const descriptionField = accountsColumnMapping.description;
        const balanceField = accountsColumnMapping.balance;
        
        // Create account data
        return {
          name: nameField !== 'none' ? row[nameField] : '',
          accountType: typeField !== 'none' ? row[typeField] : 'other',
          accountSubtype: subtypeField !== 'none' ? row[subtypeField] : 'other',
          description: descriptionField !== 'none' ? row[descriptionField] : '',
          initialBalance: balanceField !== 'none' ? parseFloat(row[balanceField]) || 0 : 0,
          status: 'active'
        };
      });
      
      // Call API to batch create accounts
      setImportProgress(80);
      const response = await apiRequest('POST', '/api/accounts/batch', {
        clientId: parseInt(selectedClient),
        accounts
      });
      
      const result = await response.json();
      
      setImportProgress(100);
      setIsImporting(false);
      setShowAccountsMappingDialog(false);
      
      // Refresh accounts data
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', selectedClient] });
      
      // Check if the response includes chart validation status
      if (result.validation) {
        if (result.validation.balanced) {
          toast({
            title: "Accounts imported",
            description: `Successfully imported ${result.accounts.length} accounts. Chart of accounts is balanced.`,
          });
        } else {
          // Chart is unbalanced, show warning and set import results for alert display
          toast({
            title: "Accounts imported with warning",
            description: `Imported ${result.accounts.length} accounts, but chart of accounts is unbalanced.`,
            variant: "destructive",
          });
          
          // Set import results to display validation alert
          setImportResults({
            success: true,
            successful: result.accounts.length,
            total: result.accounts.length,
            chartValidation: result.validation
          });
          
          // Switch to accounts tab to show the issue
          setActiveTab("accounts");
        }
      } else {
        // No validation data, show normal success message
        toast({
          title: "Accounts imported",
          description: `Successfully imported ${result.accounts.length} accounts.`,
        });
      }
      
    } catch (error: any) {
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import accounts. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle transaction import after mapping is complete
  const handleImportMappedData = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to upload transactions.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that at least the required fields are mapped
    const requiredFields = useTwoColumnAmount 
      ? ['date', 'description', 'debit', 'credit']
      : ['date', 'description', 'amount'];
      
    const missingFields = requiredFields.filter(field => 
      columnMapping[field as keyof typeof columnMapping] === 'none'
    );
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required mappings",
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Prepare transactions from CSV data
    setImportProgress(70);
    
    try {
      // Transform the data to the format expected by the API
      const transformedData = csvData.map(row => {
        // Get the actual values from the mapped columns
        const dateValue = row[columnMapping.date];
        const descriptionValue = row[columnMapping.description];
        let amountValue = useTwoColumnAmount 
          ? "0" // Will be calculated from debit/credit later
          : row[columnMapping.amount];
        const debitValue = useTwoColumnAmount ? row[columnMapping.debit] : "0";
        const creditValue = useTwoColumnAmount ? row[columnMapping.credit] : "0";
        const typeValue = columnMapping.type !== 'none' ? row[columnMapping.type] : 'expense';
        const categoryValue = columnMapping.category !== 'none' ? row[columnMapping.category] : '';
        const taxAmountValue = columnMapping.taxAmount !== 'none' ? row[columnMapping.taxAmount] : '0';
        const referenceValue = columnMapping.reference !== 'none' ? row[columnMapping.reference] : '';
        
        // If using two-column amount, calculate the amount and determine if it's an income or expense
        let transactionType = typeValue;
        if (useTwoColumnAmount) {
          const debit = processAmount(debitValue);
          const credit = processAmount(creditValue);
          
          // If both debit and credit have values, this is unexpected
          if (debit > 0 && credit > 0) {
            // For simplicity, take the larger value
            amountValue = debit > credit ? debitValue : creditValue;
            transactionType = debit > credit ? 'expense' : 'income';
          } else if (debit > 0) {
            amountValue = debitValue;
            transactionType = 'expense';
          } else if (credit > 0) {
            amountValue = creditValue;
            transactionType = 'income';
          } else {
            // Both are zero, this is an edge case
            amountValue = "0";
            transactionType = 'expense';
          }
        }
        
        // Convert the date to YYYY-MM-DD format
        const formattedDate = formatDateString(dateValue);
        
        // Clean the amount - remove currency symbols, commas, etc.
        const cleanAmount = amountValue.replace(/[^\d.-]/g, '');
        
        // Parse the amount and ensure it's handled as dollars.decimal
        // This fixes issues where $10.00 was becoming $0.10
        // Use our standardized amount processing helper
        let amount = processAmount(cleanAmount);
        
        // Check if the amount might be in cents (large values without decimal points)
        // For most normal financial data, individual transactions are rarely over $1,000,000
        // If we see a value like 1000 without decimal, it's likely dollars (not cents)
        // If we see 100000 without decimal in a CSV from a bank, it might be $1,000.00
        
        // The amount in the database is stored as a decimal value (precision 10, scale 2)
        // Make sure we're handling dollars correctly, not cents
        // Fix the decimal place issue - ensure we're sending the correct dollar amount
        console.log(`Processing amount: ${amountValue} -> cleaned: ${cleanAmount} -> parsed: ${amount}`);
        
        return {
          clientId: parseInt(selectedClient),
          date: formattedDate,
          type: transactionType,
          amount: Math.abs(amount), // Store amount directly in dollars (not cents)
          description: descriptionValue,
          reference: referenceValue,
          status: 'pending',
          // Include category if mapped
          ...(categoryValue && { category: categoryValue }),
          // Include tax amount if mapped
          ...(taxAmountValue && { tax: processAmount(taxAmountValue) })
        };
      });
      
      // Upload transactions in batches to avoid timeout issues with large imports
      setImportProgress(80);
      
      const response = await apiRequest('POST', `/api/transactions/import`, {
        transactions: transformedData,
        clientId: parseInt(selectedClient)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Refresh transactions data
        queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping-summary/${selectedClient}`] });
        
        // Show success message with chart validation if available
        if (result.chartValidation) {
          if (result.chartValidation.balanced) {
            toast({
              title: "Import successful",
              description: `Successfully imported ${result.successful} transactions out of ${transformedData.length}. Chart of accounts remains balanced.`,
            });
          } else {
            toast({
              title: "Import successful but chart unbalanced",
              description: `Imported ${result.successful} transactions, but chart of accounts is now unbalanced. Please review accounts.`,
              variant: "destructive" as const,
            });
            
            // Refresh accounts data to show the updated validation status
            queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
            
            // Set import results to display validation alert
            setImportResults({
              success: true,
              successful: result.successful,
              failed: result.failed,
              total: transformedData.length,
              chartValidation: result.chartValidation
            });
            
            // Switch to accounts tab to show the issue if the difference is significant
            if (Math.abs(result.chartValidation.difference) > 10) {
              setActiveTab("accounts");
            }
          }
        } else {
          toast({
            title: "Import successful",
            description: `Successfully imported ${result.successful} transactions out of ${transformedData.length}. ${result.failed} failed.`,
          });
        }
        
        // Reset import state
        setImportProgress(100);
        setIsImporting(false);
        setShowMappingDialog(false);
        setCsvData([]);
        
        // Switch to transactions tab
        setActiveTab('transactions');
      } else {
        throw new Error("Failed to import transactions");
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import transactions. Please try again.",
        variant: "destructive",
      });
      setIsImporting(false);
      setShowMappingDialog(false);
    }
  };
  
  const handleCancelImport = () => {
    setIsImporting(false);
    setShowMappingDialog(false);
    setShowAccountsMappingDialog(false);
    setCsvData([]);
    setImportProgress(0);
  };
  


  // Handle AI-generated chart of accounts submission
  const handleGenerateAccountsSubmit = async () => {
    if (!selectedClient) {
      toast({
        title: "Select a client",
        description: "Please select a client before generating a chart of accounts.",
        variant: "destructive",
      });
      return;
    }

    if (!industryInput.trim()) {
      toast({
        title: "Industry required",
        description: "Please enter an industry to generate accounts for.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGeneratingAccounts(true);
      
      const response = await apiRequest('POST', '/api/accounts/generate-for-industry', {
        clientId: parseInt(selectedClient),
        industry: industryInput.trim(),
        countryCode
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate accounts');
      }
      
      const result = await response.json();
      
      // Close the dialog
      setShowGenerateAccountsDialog(false);
      
      // Reset form data
      setIndustryInput('');
      setCountryCode('US');
      
      // Show success toast
      toast({
        title: "Accounts Generated",
        description: `Successfully generated ${result.accounts.length} accounts for ${industryInput} industry.`,
      });
      
      // Refresh the accounts list
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
    } catch (error: any) {
      console.error("Error generating accounts:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while generating accounts.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAccounts(false);
    }
  };
  
  // Handle adding a new line item to a journal entry
  const handleAddTransactionItem = () => {
    setTransactionItems([
      ...transactionItems,
      { accountId: null, description: '', amount: '', isDebit: transactionItems.length % 2 === 0 }
    ]);
  };
  
  // Handle removing a line item from a journal entry
  const handleRemoveTransactionItem = (index: number) => {
    if (transactionItems.length <= 2) {
      toast({
        title: "Cannot remove item",
        description: "A journal entry must have at least two items.",
        variant: "destructive",
      });
      return;
    }
    
    const newItems = [...transactionItems];
    newItems.splice(index, 1);
    setTransactionItems(newItems);
  };
  
  // Handle updating a transaction item
  const handleTransactionItemChange = (index: number, field: string, value: any) => {
    const newItems = [...transactionItems];
    (newItems[index] as any)[field] = value;
    setTransactionItems(newItems);
  };
  // Handle AI categorization of transactions
  const handleAICategorize = async () => {
    if (!selectedClient || !newTransactionFormData.description || !newTransactionFormData.amount) {
      toast({
        title: "Missing information",
        description: "Please provide a description and amount to categorize.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAICategorizing(true);
    setAICategorySuggestion(null);
    
    try {
      const response = await fetch('/api/transactions/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          description: newTransactionFormData.description,
          amount: newTransactionFormData.amount,
          type: transactionType
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI categorization failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.suggestion) {
        setAICategorySuggestion(data.suggestion);
        
        // Auto-select the suggested account
        setNewTransactionFormData({
          ...newTransactionFormData,
          accountId: data.suggestion.id
        });
        
        toast({
          title: "Category suggested",
          description: `Recommended: ${data.suggestion.name} (${Math.round(data.suggestion.confidence * 100)}% confidence)`,
        });
      } else {
        toast({
          title: "No category suggestion",
          description: "Could not determine an appropriate category.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error categorizing transaction",
        description: error.message || "Failed to get category suggestion",
        variant: "destructive",
      });
    } finally {
      setIsAICategorizing(false);
    }
  };
  
  // Handle form submission for a new transaction
  const handleCreateTransaction = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client before creating a transaction.",
        variant: "destructive",
      });
      return;
    }
    
    // Debug log the form data to ensure tax fields are set correctly
    console.log("Creating transaction with form data:", {
      ...newTransactionFormData,
      transactionType,
      selectedClient
    });
    
    try {
      if (transactionType === 'journal') {
        // Validate journal entry balance
        if (!isBalanced) {
          toast({
            title: "Unbalanced journal entry",
            description: "Debits must equal credits in a journal entry.",
            variant: "destructive",
          });
          return;
        }
        
        // Validate that all items have an account and amount
        const invalidItems = transactionItems.filter(item => 
          !item.accountId || !item.amount || parseFloat(item.amount) <= 0
        );
        
        if (invalidItems.length > 0) {
          toast({
            title: "Incomplete journal entry",
            description: "All items must have an account and a positive amount.",
            variant: "destructive",
          });
          return;
        }
        
        // Create journal entry
        const journalResponse = await apiRequest('POST', '/api/transactions', {
          clientId: parseInt(selectedClient),
          date: newTransactionFormData.date,
          type: 'journal',
          description: newTransactionFormData.description,
          reference: newTransactionFormData.reference,
          amount: 0, // Will be calculated from items
          status: 'pending',
          items: transactionItems.map(item => ({
            accountId: item.accountId,
            description: item.description,
            // Use our standardized amount processing helper
            amount: processAmount(item.amount),
            isDebit: item.isDebit
          }))
        });
        
        if (journalResponse.ok) {
          // Refresh transactions
          queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping-summary/${selectedClient}`] });
          
          toast({
            title: "Transaction created",
            description: "Journal entry created successfully.",
          });
          
          // Reset form and close dialog
          resetTransactionForm();
          setTransactionItems([
            { accountId: null, description: '', amount: '', isDebit: true },
            { accountId: null, description: '', amount: '', isDebit: false }
          ]);
          setShowNewTransactionDialog(false);
        } else {
          throw new Error("Failed to create journal entry");
        }
      } else {
        // Validate for income/expense transactions
        if (!newTransactionFormData.amount || parseFloat(newTransactionFormData.amount) <= 0) {
          toast({
            title: "Invalid amount",
            description: "Please enter a valid positive amount.",
            variant: "destructive",
          });
          return;
        }

        // Validate that an account is selected
        if (!newTransactionFormData.accountId) {
          toast({
            title: "Account required",
            description: "Please select an account for this transaction.",
            variant: "destructive",
          });
          return;
        }
        
        // Create income or expense transaction with tax handling
        let amount = processAmount(newTransactionFormData.amount);
        let taxAmount = 0;
        
        // Calculate tax if a tax is selected
        if (newTransactionFormData.taxId && newTransactionFormData.taxRate > 0) {
          const taxRate = newTransactionFormData.taxRate;
          
          if (newTransactionFormData.taxInclusive) {
            // Tax inclusive - the amount already includes tax
            // Formula: tax = amount - (amount / (1 + taxRate))
            taxAmount = Math.round(amount - (amount / (1 + taxRate)));
          } else {
            // Tax exclusive - tax needs to be added to the amount
            // Formula: tax = amount * taxRate
            taxAmount = Math.round(amount * taxRate);
          }
        }
        
        // Get the selected tax settings for lookups
        const selectedTax = newTransactionFormData.taxId 
          ? bookkeepingSettings?.taxSettings?.find(tax => tax.id === newTransactionFormData.taxId)
          : null;
        
        const transactionResponse = await apiRequest('POST', '/api/transactions', {
          clientId: parseInt(selectedClient),
          date: newTransactionFormData.date,
          type: transactionType,
          description: newTransactionFormData.description,
          reference: newTransactionFormData.reference,
          amount: amount,
          status: 'pending',
          notes: newTransactionFormData.notes,
          category: newTransactionFormData.category,
          accountId: newTransactionFormData.accountId,
          taxId: newTransactionFormData.taxId,
          taxSettingId: newTransactionFormData.taxSettingId,
          taxRate: newTransactionFormData.taxRate,
          taxAmount: taxAmount,
          taxInclusive: newTransactionFormData.taxInclusive,
          taxName: selectedTax?.name || '',
          taxStatus: newTransactionFormData.taxId ? 'custom' : 'exempt',
          taxable: !!newTransactionFormData.taxId
        });
        
        if (transactionResponse.ok) {
          // Refresh transactions
          queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping-summary/${selectedClient}`] });
          
          toast({
            title: "Transaction created",
            description: `${transactionType ? transactionType.charAt(0).toUpperCase() + transactionType.slice(1) : 'Transaction'} transaction created successfully.`,
          });
          
          // Reset form and close dialog
          resetTransactionForm();
          setShowNewTransactionDialog(false);
        } else {
          throw new Error(`Failed to create ${transactionType} transaction`);
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed to create transaction",
        description: error.message || "An error occurred while creating the transaction.",
        variant: "destructive",
      });
    }
  };
  
  // Handle creating a new account
  const handleCreateAccount = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client before creating an account.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Validate account data
      if (!newAccountFormData.name || !newAccountFormData.type || !newAccountFormData.subtype) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields (Name, Type, and Subtype).",
          variant: "destructive",
        });
        return;
      }
      
      // Store the balance amount in cents for precision
      let balanceInCents = Math.round(newAccountFormData.initialBalance * 100);
      
      // Get account type and balance type selected by the user
      const accountType = newAccountFormData.type; // 'asset', 'liability', 'equity', 'income', 'expense'
      const isDebitBalance = newAccountFormData.isDebitBalance; // true for debit balance, false for credit balance
      
      // Determine if this account naturally has a debit balance
      const isDebitNormalAccount = accountType === 'asset' || accountType === 'expense' || accountType === 'cost_of_sales';
      
      // When the user enters a negative number, we assume they want to override the natural balance sign
      // So we respect the sign the user entered, regardless of account type
      
      console.log(`Creating account: ${newAccountFormData.name} (${accountType})`);
      console.log(`Balance type: ${isDebitBalance ? 'Debit' : 'Credit'}, Amount: $${(newAccountFormData.initialBalance).toFixed(2)}`);
      console.log(`Is debit normal account: ${isDebitNormalAccount}, Final balance in cents: ${balanceInCents}`);
      
      
      // Create new account
      const accountResponse = await apiRequest('POST', '/api/accounts', {
        clientId: parseInt(selectedClient),
        name: newAccountFormData.name,
        type: newAccountFormData.type,
        subtype: newAccountFormData.subtype,
        description: newAccountFormData.description,
        isActive: newAccountFormData.isActive,
        balance: balanceInCents,
        isDebitNormal: accountType === 'asset' || accountType === 'expense' || accountType === 'cost_of_sales'
      });
      
      if (accountResponse.ok) {
        // Refresh accounts
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
        
        toast({
          title: "Account created",
          description: "Account created successfully.",
        });
        
        // Reset form and close dialog
        setNewAccountFormData({
          name: '',
          type: 'asset',
          subtype: '',
          description: '',
          isActive: true,
          isDebitBalance: true,
          initialBalance: 0
        });
        setShowNewAccountDialog(false);
      } else {
        throw new Error("Failed to create account");
      }
    } catch (error: any) {
      toast({
        title: "Failed to create account",
        description: error.message || "An error occurred while creating the account.",
        variant: "destructive",
      });
    }
  };
  
  // Find the chart of accounts section to add the AI generate button

  // Handle updating a transaction
  const handleUpdateTransaction = async () => {
    if (!selectedClient || !selectedTransaction) {
      toast({
        title: "Invalid operation",
        description: "Cannot edit this transaction.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // For debugging - log the entire selectedTransaction object
      console.log('Updating transaction with data:', selectedTransaction);
      
      // Make sure taxSettingId is set to taxId for API compatibility
      const taxSettingId = selectedTransaction.taxId || selectedTransaction.taxSettingId;
      
      // Update transaction
      const response = await apiRequest('PATCH', `/api/transactions/${selectedTransaction.id}`, {
        date: selectedTransaction.date,
        type: selectedTransaction.type,
        amount: selectedTransaction.amount, 
        description: selectedTransaction.description,
        reference: selectedTransaction.reference,
        status: selectedTransaction.status,
        accountId: selectedTransaction.accountId,
        categoryName: selectedTransaction.categoryName,
        taxStatus: selectedTransaction.taxId ? 'custom' : (selectedTransaction.taxStatus || 'exempt'),
        taxSettingId: taxSettingId,
        taxAmount: selectedTransaction.taxAmount,
        taxable: selectedTransaction.taxId ? true : selectedTransaction.taxable,
        taxInclusive: selectedTransaction.taxInclusive,
        taxId: selectedTransaction.taxId,
        taxRate: selectedTransaction.taxRate,
        taxName: selectedTransaction.taxName
      });
      
      if (response.ok) {
        // Refresh transactions
        queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
        
        toast({
          title: "Transaction updated",
          description: "Transaction updated successfully.",
        });
        
        // Reset and close dialog
        setSelectedTransaction(null);
        setShowEditTransactionDialog(false);
      } else {
        throw new Error("Failed to update transaction");
      }
    } catch (error: any) {
      toast({
        title: "Failed to update transaction",
        description: error.message || "An error occurred while updating the transaction.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting an account
  const handleDeleteAccount = async () => {
    if (!selectedClient || !selectedAccount) {
      toast({
        title: "Invalid operation",
        description: "Cannot delete this account.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', `/api/accounts/${selectedAccount.id}`);
      
      if (response.ok) {
        // Refresh accounts
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
        
        toast({
          title: "Account deleted",
          description: `The account "${selectedAccount.name}" has been deleted.`,
        });
        
        // Close the edit dialog
        setSelectedAccount(null);
        setShowEditAccountDialog(false);
      } else {
        throw new Error("Failed to delete account");
      }
    } catch (error: any) {
      toast({
        title: "Failed to delete account",
        description: error.message || "An error occurred while deleting the account.",
        variant: "destructive",
      });
    }
  };
  
  // Handle editing an account
  const handleEditAccount = async () => {
    if (!selectedClient || !selectedAccount) {
      toast({
        title: "Invalid operation",
        description: "Cannot edit this account.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Chart of Accounts manages structure only - no balance operations
      const accountResponse = await fetch(apiConfig.buildUrl(`/api/accounts/${selectedAccount.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedAccount.name,
          type: selectedAccount.type,
          subtype: selectedAccount.subtype || '',
          description: selectedAccount.description || '',
          isActive: selectedAccount.isActive
        })
      });
      
      if (accountResponse.ok) {
        // Refresh accounts
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
        
        toast({
          title: "Account updated",
          description: "Account updated successfully.",
        });
        
        // Reset selected account and close dialog
        setSelectedAccount(null);
        setShowEditAccountDialog(false);
      } else {
        throw new Error("Failed to update account");
      }
    } catch (error: any) {
      toast({
        title: "Failed to update account",
        description: error.message || "An error occurred while updating the account.",
        variant: "destructive",
      });
    }
  };
  
  // Reset client-specific state when client changes
  useEffect(() => {
    if (selectedClientId) {
      setTransactionItems([
        { accountId: null, description: '', amount: '', isDebit: true },
        { accountId: null, description: '', amount: '', isDebit: false }
      ]);
      setNewAccountFormData({
        name: '',
        type: 'asset',
        subtype: '',
        description: '',
        isActive: true,
        isDebitBalance: true,
        initialBalance: 0
      });
      setSelectedAccount(null);
    }
  }, [selectedClientId]);
  
  return (
    <div className="flex h-screen bg-gray-50 w-full">
      {/* Modern Sidebar */}
      <div className="flex-shrink-0">
        <ModernSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          clients={clients}
          isLoadingClients={isLoadingClients}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 h-full overflow-y-auto">
      
      {/* Main Content */}
      {!selectedClient ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <Info className="h-12 w-12 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-neutral-500 max-w-md mb-4">
            Please select a client from the dropdown to view and manage their financial data.
          </p>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Use the client dropdown to switch between clients</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Manage chart of accounts, transactions, bank feeds, and contacts</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Import transactions from CSV or connect with QuickBooks Online</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="py-4 px-2 sm:py-6 sm:px-4 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6 border-b pb-2 sm:pb-4 overflow-x-auto min-h-[44px] w-full relative z-50 block !important">
              {/* Overview Tab */}
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                onClick={() => setActiveTab("overview")}
                className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
              >
                <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Overview
              </Button>

              {/* Accounting Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["accounts", "transaction-manager", "journal-entries", "reporting"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Accounting <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("accounts")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Chart of Accounts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("transaction-manager")}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Transaction Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("journal-entries")}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Journal Entries
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("reporting")}>
                    <FileOutput className="h-4 w-4 mr-2" />
                    Reporting
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Income Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["invoices", "customers", "accounts-receivable", "credit-notes"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Income <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("invoices")}>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Invoices
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("customers")}>
                    <Users className="h-4 w-4 mr-2" />
                    Customers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("accounts-receivable")}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Accounts Receivable
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("credit-notes")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Credit Notes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Expenses Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["expenses", "bills", "vendors", "accounts-payable"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Expenses <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("expenses")}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Expenses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("bills")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Bills
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("vendors")}>
                    <Building className="h-4 w-4 mr-2" />
                    Vendors
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("accounts-payable")}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Accounts Payable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Payroll Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["employees", "payroll-runs", "time-tracking", "payroll-reports", "tax-forms"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Payroll <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("employees")}>
                    <Users className="h-4 w-4 mr-2" />
                    Employees
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("payroll-runs")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Payroll Runs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("time-tracking")}>
                    <Clock className="h-4 w-4 mr-2" />
                    Time Tracking
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("payroll-reports")}>
                    <BarChart className="h-4 w-4 mr-2" />
                    Payroll Reports
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("tax-forms")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Tax Forms
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Taxes Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["sales-tax", "tax-returns", "tax-payments", "tax-settings"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <PieChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Taxes <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("sales-tax")}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Sales Tax
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("tax-returns")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Tax Returns
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("tax-payments")}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Tax Payments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("tax-settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Tax Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={["ai-automation", "company-profile", "bookkeeping-settings", "contacts", "settings"].includes(activeTab) ? "default" : "ghost"}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Settings <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[9999] bg-white border shadow-lg">
                  <DropdownMenuItem onClick={() => setActiveTab("ai-automation")}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Automation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("company-profile")}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Company Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("bookkeeping-settings")}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Bookkeeping Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("contacts")}>
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    General Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>



              {/* Milton AI Tab */}
              <Button
                variant={activeTab === "milton-ai" ? "default" : "ghost"}
                onClick={() => setActiveTab("milton-ai")}
                className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
              >
                <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
                </svg>
                Milton AI
              </Button>
            </div>
            
            {/* Overview Tab - Financial Summary */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingSummary ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatAccountBalance(
                          financialSummary?.revenue ? parseInt(financialSummary.revenue) : 0,
                          'income',
                          'dashboard'
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +20.1% from last month
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Expenses
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingSummary ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatAccountBalance(
                          financialSummary?.expenses ? parseInt(financialSummary.expenses) : 0,
                          'expense',
                          'dashboard'
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +5.2% from last month
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Net Income
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingSummary ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatAccountBalance(
                          financialSummary?.netIncome ? parseInt(financialSummary.netIncome) : 0,
                          'income',
                          'dashboard'
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +15.3% from last month
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-between items-center mt-10 mb-6">
                <h3 className="text-xl font-semibold">Integration Status</h3>
                <Button onClick={handleSyncData} disabled={isLoadingIntegration}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Sync Data
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <h3 className="text-lg font-medium">QuickBooks Online</h3>
                  </CardHeader>
                  <CardContent>
                    {isLoadingIntegration ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-[250px]" />
                        <Skeleton className="h-6 w-[200px]" />
                        <Skeleton className="h-6 w-[150px]" />
                      </div>
                    ) : integration ? (
                      <>
                        <div className="flex items-center mb-2">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>
                        </div>
                        <div className="text-sm text-neutral-500 space-y-1">
                          <p>Last synced: {integration.lastSynced ? new Date(integration.lastSynced).toLocaleString() : 'Never'}</p>
                          <p>Company: {integration.companyName || 'Unknown'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center mb-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50">Not Connected</Badge>
                        </div>
                        <p className="text-sm text-neutral-500 mb-2">
                          Connect your QuickBooks Online account to automatically sync transactions and financial data.
                        </p>
                        <Button variant="outline" className="w-full">
                          Connect QuickBooks
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <h3 className="text-lg font-medium">Import Data</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-neutral-500 mb-2">
                          Import transactions from CSV or Excel files
                        </p>
                        <Button onClick={handleFileUpload} variant="outline" className="w-full">
                          <Upload className="h-4 w-4 mr-2" /> Import Transactions
                        </Button>
                        <div className="mt-2">
                          <Button 
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.csv,.xlsx,.xls';
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files;
                                if (files && files.length > 0) {
                                  console.log("File selected via direct input:", files[0].name);
                                  // You could call your file processing function here
                                }
                              };
                              input.click();
                            }}
                            variant="outline" 
                            size="sm"
                          >
                            Test Import
                          </Button>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".csv,.xlsx,.xls"
                          style={{ display: 'none' }}
                        />
                      </div>
                      
                      <div>
                        <p className="text-sm text-neutral-500 mb-2">
                          AI-powered chart of accounts import
                        </p>
                        <FileDropZone
                          selectedClient={selectedClient}
                          fileType="chart-of-accounts"
                          onFilesSelected={(files) => {
                            console.log("Files selected for AI parsing:", files);
                          }}
                          onIntakeAnalysis={async (file) => {
                            if (!selectedClient) {
                              toast({
                                title: "Select a client",
                                description: "Please select a client before importing accounts.",
                                variant: "destructive",
                              });
                              return;
                            }

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('clientId', selectedClient);

                            try {
                              const response = await fetch('/api/ai-intake/analyze-file', {
                                method: 'POST',
                                body: formData,
                              });

                              if (!response.ok) {
                                throw new Error('Failed to analyze file');
                              }

                              const result = await response.json();
                              
                              toast({
                                title: "AI Analysis Complete",
                                description: `Found ${result.accounts.length} accounts with ${Math.round(result.metadata.confidence * 100)}% confidence using ${result.metadata.parsingMethod}`,
                              });

                              // Refresh accounts list
                              queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
                            } catch (error: any) {
                              toast({
                                title: "AI Analysis Failed",
                                description: error.message || "Failed to analyze file with AI",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="w-full min-h-[120px]"
                        />
                        <p className="text-xs text-neutral-400 mt-2">
                          Drop PDF or Excel files here for intelligent parsing with AI analysis and rule-based fallbacks
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Accounts Tab - Chart of Accounts */}
            <TabsContent value="accounts">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">Chart of Accounts</h3>
                    {accountsValidation && (
                      <div className={`text-sm px-3 py-1 rounded-md ${
                        accountsValidation.balanced 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {accountsValidation.balanced 
                          ? 'Balanced ✓' 
                          : 'Unbalanced ✗'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileDropZone
                      selectedClient={selectedClient}
                      onFilesSelected={(files) => {
                        console.log("Files selected for AI parsing:", files);
                      }}
                      onIntakeAnalysis={async (file) => {
                        if (!selectedClient) {
                          toast({
                            title: "Select a client",
                            description: "Please select a client before importing accounts.",
                            variant: "destructive",
                          });
                          return;
                        }

                        console.log('Processing file for AI intake:', {
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          lastModified: file.lastModified
                        });

                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('clientId', selectedClient);

                        console.log('FormData created:', formData);
                        console.log('File in FormData:', formData.get('file'));
                        console.log('ClientId in FormData:', formData.get('clientId'));

                        try {
                          const response = await fetch('/api/ai-intake/analyze-file', {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) {
                            throw new Error('Failed to analyze file');
                          }

                          const result = await response.json();
                          
                          if (result.success && result.data.accounts.length > 0) {
                            // Import the analyzed accounts automatically
                            const accountsToImport = result.data.accounts.map((account: any) => ({
                              name: account.name.replace(/\|/g, '').trim(), // Clean up parsed names
                              type: account.type,
                              accountNumber: account.accountNumber,
                              balance: Math.round((account.balance || 0) * 100), // Convert dollars to cents
                              isDebitNormal: account.isDebitNormal,
                              isActive: account.isActive !== false,
                              clientId: parseInt(selectedClient)
                            }));

                            // Create accounts via API
                            let successCount = 0;
                            let errorCount = 0;
                            
                            for (const account of accountsToImport) {
                              try {
                                console.log('Creating account:', account);
                                const accountResponse = await apiRequest('POST', '/api/accounts', account);
                                if (accountResponse.ok) {
                                  successCount++;
                                  console.log(`✓ Created account: ${account.name}`);
                                } else {
                                  errorCount++;
                                  const errorData = await accountResponse.json();
                                  console.error(`Failed to create account ${account.name}:`, errorData);
                                }
                              } catch (error) {
                                errorCount++;
                                console.error(`Failed to create account ${account.name}:`, error);
                              }
                            }
                            
                            console.log(`Account creation summary: ${successCount} created, ${errorCount} failed`);
                            
                            toast({
                              title: "AI Import Complete",
                              description: `Created ${successCount} accounts from ${result.data.accounts.length} analyzed with ${Math.round(result.data.metadata.confidence * 100)}% confidence`,
                            });
                          } else {
                            toast({
                              title: "AI Analysis Complete",
                              description: `Analyzed file but no accounts found to import`,
                              variant: "destructive",
                            });
                          }

                          // Refresh accounts list and validation
                          queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}`] });
                          queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClient}/validation`] });
                        } catch (error: any) {
                          toast({
                            title: "AI Analysis Failed",
                            description: error.message || "Failed to analyze file with AI",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[120px]"
                      compact={true}
                    />
                    <Button variant="outline" onClick={handleAccountsFileUpload}>
                      <Upload className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Sparkles className="h-4 w-4 mr-2" /> AI Analyzer
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Chart of Accounts AI</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => runChartAIAnalysis('chart_analysis')}>
                          <BarChart className="h-4 w-4 mr-2" />
                          Comprehensive Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runChartAIAnalysis('account_recommendations')}>
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Account Recommendations
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runChartAIAnalysis('compliance_check')}>
                          <Shield className="h-4 w-4 mr-2" />
                          GAAP Compliance Check
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runChartAIAnalysis('consolidation_analysis')}>
                          <Merge className="h-4 w-4 mr-2" />
                          Consolidation Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runChartAIAnalysis('account_numbering')}>
                          <Hash className="h-4 w-4 mr-2" />
                          Smart Account Numbering
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowGenerateAccountsDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Generate New Accounts
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => setShowNewAccountDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Account
                    </Button>
                  </div>
                </div>
                
                {accountsValidation && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 mb-4 rounded-md text-sm">
                    <p><strong>Chart of Accounts Structure </strong><CheckCircle className="h-4 w-4 inline" /></p>
                    <div className="mt-2 text-center">
                      <span className="font-medium">{accounts.length} accounts configured</span>
                    </div>
                    <p className="text-xs mt-1 text-blue-700">
                      <Info className="h-3 w-3 inline mr-1" />
                      Chart of Accounts structure is ready. Use Transaction Ledger for balance management.
                    </p>
                  </div>
                )}
              </div>

              {/* Account Type Editor - Drag and Drop Interface */}
              {accounts && accounts.length > 0 && selectedClient && (
                <div className="mb-4">
                  <Button 
                    onClick={() => setShowAccountTypeEditor(true)}
                    variant="outline"
                    className="mb-4"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Account Types
                  </Button>
                  
                  {showAccountTypeEditor && (
                    <div className="mb-8 border rounded-lg p-4 bg-slate-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Account Type Editor</h3>
                        <Button 
                          onClick={() => setShowAccountTypeEditor(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Close
                        </Button>
                      </div>
                      <AccountTypeEditor 
                        accounts={accounts.map(account => ({
                          id: account.id,
                          name: account.name,
                          type: account.type as 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales',
                          balance: parseFloat(account.currentBalance || account.openingBalance || '0'),
                          accountNumber: account.accountNumber
                        }))}
                        clientId={parseInt(selectedClient)}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {isLoadingAccounts ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !accounts?.length ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <FileText className="h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No accounts found</h3>
                    <p className="text-neutral-500 text-center mb-4">
                      Get started by adding accounts to your chart of accounts.
                    </p>
                    <Button onClick={() => setShowNewAccountDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Account
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ChartOfAccounts clientId={selectedClient} showTitle={false} />
              )}
            </TabsContent>
            
            {/* Transaction Manager Tab - Milton AI-Powered */}
            <TabsContent value="transaction-manager">
              {selectedClient ? (
                <TransactionManager clientId={selectedClient} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Please select a client to access Transaction Manager.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Journal Entries Tab - Client-Isolated Ledger System */}
            <TabsContent value="journal-entries">
              {selectedClient ? (
                <TransactionLedger clientId={parseInt(selectedClient)} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Please select a client to access the Journal Entries ledger system.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Keep old transactions tab for backward compatibility */}
            <TabsContent value="transactions" className="hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Transactions</h3>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setShowRulesSheet(true)}>
                    <Tag className="h-4 w-4 mr-2" /> Classification Rules
                  </Button>
                  <Button variant="outline" onClick={handleFileUpload}>
                    <Upload className="h-4 w-4 mr-2" /> Import
                  </Button>
                  <Button onClick={() => setShowNewTransactionDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Transaction
                  </Button>
                </div>
              </div>
              
              {/* Transactions Section */}
              {selectedClient && !isLoadingAccounts && accounts && (
                <div className="mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Transactions</CardTitle>
                          <CardDescription>
                            View and manage your financial transactions
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => refetchTransactions()}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingTransactions ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : transactions?.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.slice(0, 5).map((transaction: any) => (
                              <TableRow key={transaction.id}>
                                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                                <TableCell>
                                  ${parseFloat(transaction.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={transaction.status === 'confirmed' ? 'default' : 'outline'}>
                                    {transaction.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {transaction.accountId ? (
                                    accounts.find((a: any) => a.id === transaction.accountId)?.name || 'Unknown'
                                  ) : (
                                    'Uncategorized'
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="mb-2">No transactions yet</p>
                          <p className="text-sm">
                            Create a new transaction or import transactions from a file
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Import results notification with chart validation */}
              {importResults && importResults.chartValidation && !importResults.chartValidation.balanced && (
                <div className="mb-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Chart of Accounts Unbalanced</AlertTitle>
                    <AlertDescription>
                      <p>After importing transactions, your chart of accounts is now unbalanced:</p>
                      <p className="mt-2">
                        <span className="font-medium">Assets:</span> ${importResults.chartValidation.totalAssets.toFixed(2)}<br />
                        <span className="font-medium">Liabilities:</span> ${importResults.chartValidation.totalLiabilities.toFixed(2)}<br />
                        <span className="font-medium">Equity:</span> ${importResults.chartValidation.totalEquity.toFixed(2)}<br />
                        <span className="font-medium">Difference:</span> ${importResults.chartValidation.difference.toFixed(2)}
                      </p>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setActiveTab("accounts");
                            setImportResults(null);
                          }}
                        >
                          Review Accounts
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              {/* Auto-categorize Transactions Section */}
              {selectedClient && !isLoadingTransactions && transactions && transactions.length > 0 && (
                <div className="mb-6">
                  <AutoCategorizeTransactions 
                    clientId={selectedClient} 
                    transactions={transactions}
                  />
                </div>
              )}
              
              {isLoadingTransactions ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !transactions?.length ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <CreditCard className="h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                    <p className="text-neutral-500 text-center mb-4">
                      Get started by adding transactions or importing them from a file.
                    </p>
                    <div className="flex space-x-4">
                      <Button variant="outline" onClick={handleFileUpload}>
                        <Upload className="h-4 w-4 mr-2" /> Import
                      </Button>
                      <Button onClick={() => setShowNewTransactionDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New Transaction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {formatDateSafe(getTransactionDate(transaction))}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                (transaction.creditAmount && parseFloat(transaction.creditAmount) > 0)
                                  ? 'bg-green-50 text-green-600' 
                                  : (transaction.debitAmount && parseFloat(transaction.debitAmount) > 0)
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-50 text-gray-600'
                              }
                            >
                              {(transaction.creditAmount && parseFloat(transaction.creditAmount) > 0) 
                                ? 'Credit' 
                                : (transaction.debitAmount && parseFloat(transaction.debitAmount) > 0)
                                ? 'Debit'
                                : 'Bank Entry'
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell>{transaction.reference || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              {transaction.debitAmount && parseFloat(transaction.debitAmount) > 0 && (
                                <span className="text-red-600 font-mono text-sm">
                                  -{formatCurrency(parseFloat(transaction.debitAmount))}
                                </span>
                              )}
                              {transaction.creditAmount && parseFloat(transaction.creditAmount) > 0 && (
                                <span className="text-green-600 font-mono text-sm">
                                  +{formatCurrency(parseFloat(transaction.creditAmount))}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {transaction.categoryName || (transaction.accountId && accounts ? 
                              accounts.find(account => account.id === transaction.accountId)?.name : 
                              <Badge variant="outline" className="bg-amber-50 text-amber-600 hover:bg-amber-50">
                                Uncategorized
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.taxName ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600">
                                {transaction.taxName}
                                {transaction.taxAmount > 0 && ` (${formatCurrency(processAmount(transaction.taxAmount))})`}
                              </Badge>
                            ) : transaction.taxStatus ? (
                              <Badge variant="outline" className={
                                transaction.taxStatus === 'exempt' 
                                  ? 'bg-blue-50 text-blue-600'
                                  : transaction.taxStatus === 'custom'
                                  ? 'bg-purple-50 text-purple-600'
                                  : 'bg-green-50 text-green-600'
                              }>
                                {transaction.taxStatus ? transaction.taxStatus.charAt(0).toUpperCase() + transaction.taxStatus.slice(1) : 'Unknown'}
                                {transaction.taxAmount && ` (${formatCurrency(processAmount(transaction.taxAmount))})`}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Badge variant={transaction.status === 'reconciled' ? 'outline' : 'secondary'}>
                                {transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : 'Unknown'}
                              </Badge>
                              {!transaction.accountId && !transaction.categoryName && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 hover:bg-amber-50">
                                  Uncategorized
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      setSelectedTransaction(transaction);
                                      setShowClassifyDialog(true);
                                    }}>
                                      <Tag className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{transaction.accountId ? 'Change account categorization' : 'Categorize transaction'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button variant="ghost" size="icon" onClick={() => {
                                console.log('Transaction for editing:', transaction);
                                
                                // Find tax setting ID from the name if it exists
                                let taxSettingId = transaction.taxSettingId;
                                
                                // If we have a tax name but no taxSettingId, try to find it from settings
                                if (transaction.taxName && !taxSettingId && bookkeepingSettings?.taxSettings) {
                                  const matchingTax = bookkeepingSettings.taxSettings.find(
                                    tax => tax.name === transaction.taxName
                                  );
                                  if (matchingTax) {
                                    taxSettingId = matchingTax.id?.toString();
                                    console.log(`Found matching tax setting ${matchingTax.name} with ID ${taxSettingId}`);
                                  }
                                }
                                
                                // Create a modified transaction with proper tax fields if they don't exist
                                const enhancedTransaction = {
                                  ...transaction,
                                  // Use null-coalescing to preserve falsy but defined values
                                  taxId: transaction.taxId ?? undefined,
                                  taxRate: transaction.taxRate ?? 0,
                                  taxName: transaction.taxName ?? '',
                                  taxStatus: transaction.taxStatus ?? 'exempt',
                                  taxInclusive: !!transaction.taxInclusive,
                                  taxable: transaction.taxId ? true : !!transaction.taxable, // Set taxable to true if there's a taxId
                                  taxSettingId: taxSettingId || (transaction.taxId?.toString()) // Use found taxSettingId or taxId as a string
                                };
                                
                                console.log('Enhanced transaction:', enhancedTransaction);
                                setSelectedTransaction(enhancedTransaction);
                                setShowEditTransactionDialog(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
            
            {/* Bank Feeds Tab */}
            <TabsContent value="bank-feeds">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Bank Feeds</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Connect Bank
                </Button>
              </div>

              {selectedClient && (
                <div className="mb-6">
                  <BankReconciliation 
                    clientId={selectedClient}
                  />
                </div>
              )}
              
              {isLoadingBankFeeds ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !bankFeeds?.length ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <Wallet className="h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No bank feeds connected</h3>
                    <p className="text-neutral-500 text-center mb-4">
                      Connect your bank accounts to automatically import transactions.
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" /> Connect Bank
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Last Sync</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankFeeds.map((feed: any) => (
                        <TableRow key={feed.id}>
                          <TableCell className="font-medium">{feed.name}</TableCell>
                          <TableCell>{feed.accountName}</TableCell>
                          <TableCell>{feed.accountType}</TableCell>
                          <TableCell>
                            {formatAccountBalance(feed.balance, feed.accountType ? feed.accountType.toLowerCase() : 'asset', 'dashboard')}
                          </TableCell>
                          <TableCell>
                            {feed.lastSynced ? new Date(feed.lastSynced).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            {feed.status === 'active' ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                // Sync now logic
                              }}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => {
                                // View/edit bank feed
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
            
            {/* Bank Feeds Tab */}
            <TabsContent value="bank-feeds">
              <div className="grid grid-cols-1 gap-6">
                {!selectedClient ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        Please select a client to view bank feeds.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bank Accounts Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Bank Account Connections</CardTitle>
                        <CardDescription>Connect your bank accounts to automatically import transactions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Show bank accounts from Chart of Accounts that can be connected */}
                        {accounts && Array.isArray(accounts) && accounts.filter((account: any) => account.subtype === 'bank').length > 0 ? (
                          <div className="space-y-3">
                            {accounts.filter((account: any) => account.subtype === 'bank').map((account: any) => (
                              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <CreditCard className="h-5 w-5 text-blue-500" />
                                  <div>
                                    <p className="font-medium">{account.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Balance: ${(account.balance / 100).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">Ready to Connect</Badge>
                                  <PlaidLinkButton
                                    accountId={account.id}
                                    accountName={account.name}
                                    clientId={parseInt(selectedClient)}
                                    onSuccess={() => {
                                      // Refresh the bank feeds data
                                      queryClient.invalidateQueries({ queryKey: ['/api/bank-feeds', selectedClient] });
                                      toast({
                                        title: "Success!",
                                        description: `${account.name} has been connected successfully.`,
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="mb-2">No bank accounts available for connection</p>
                            <p className="text-sm">
                              Create bank accounts in the Chart of Accounts tab with "Bank" subtype first
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bank Transactions Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>Bank Transactions</CardTitle>
                            <CardDescription>
                              Transactions imported from your connected bank accounts
                            </CardDescription>
                          </div>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Transactions
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="mb-2">No bank transactions yet</p>
                          <p className="text-sm">
                            Connect a bank account to start importing transactions automatically
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
            
            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Contacts</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Add Contact
                </Button>
              </div>
              
              {isLoadingContacts ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !contacts?.length ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <Users className="h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No contacts found</h3>
                    <p className="text-neutral-500 text-center mb-4">
                      Get started by adding customers, vendors, or other contacts.
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" /> Add Contact
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Balance Due</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact: any) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.phone || '-'}</TableCell>
                          <TableCell>
                            {formatAccountBalance(contact.balanceDue, 'liability', 'dashboard')}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => {
                              // View/edit contact
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
            
            {/* Reporting Tab */}
            <TabsContent value="reporting">
              <ReportsTab clientId={selectedClient} />
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Bookkeeping Settings</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {selectedClient && (
                      <div>
                        {/* Tax Settings */}
                        <div className="mb-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Calculator className="h-5 w-5 mr-2 text-primary" />
                                Tax Settings
                              </CardTitle>
                              <CardDescription>
                                Configure tax rates and handling for this client.
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <BookkeepingSettingsTab clientId={selectedClient} />
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Automated Processing */}
                        <div className="mb-6">
                          <h4 className="text-lg font-medium mb-4">Automated Processing</h4>
                          <AutomaticBookkeeping 
                            clientId={selectedClient}
                            onComplete={() => {
                              // Refresh relevant data
                              refetchTransactions();
                              refetchAccounts();
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Income Management Tabs */}
            <TabsContent value="invoices">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Invoice Management</h3>
                    <p className="text-muted-foreground">Create and manage invoices with automatic double-entry accounting</p>
                  </div>
                  <Button onClick={() => setShowNewInvoiceDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Total unpaid</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Invoice total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Past due</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>Track invoice status and payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="mb-2">No invoices created yet</p>
                      <p className="text-sm">Create your first invoice to start tracking income</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="expenses">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Expense Management</h3>
                    <p className="text-muted-foreground">Track and categorize business expenses with automatic journal entries</p>
                  </div>
                  <Button onClick={() => setShowNewExpenseDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Expense
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Total expenses</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Unpaid bills</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Reimbursements</CardTitle>
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Employee expenses</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Deductible amount</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                    <CardDescription>View and categorize your business expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="mb-2">No expenses recorded yet</p>
                      <p className="text-sm">Add your first expense to start tracking costs</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payroll-runs">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Payroll Management</h3>
                    <p className="text-muted-foreground">Process payroll with automated tax calculations and journal entries</p>
                  </div>
                  <Button onClick={() => setShowNewPayrollDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Run Payroll
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Active employees</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Gross payroll</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tax Liabilities</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Payroll taxes</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Payroll History</CardTitle>
                    <CardDescription>View past payroll runs and calculations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="mb-2">No payroll runs yet</p>
                      <p className="text-sm">Add employees and run your first payroll</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sales-tax">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Sales Tax Management</h3>
                    <p className="text-muted-foreground">Track sales tax collection and prepare tax returns</p>
                  </div>
                  <Button onClick={() => setShowTaxReturnDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    File Return
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">This quarter</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tax Due</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-muted-foreground">Next payment</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Due Date</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">--</div>
                      <p className="text-xs text-muted-foreground">No returns due</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tax Returns</CardTitle>
                    <CardDescription>Sales tax filing history and upcoming obligations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <PieChart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="mb-2">No tax returns filed yet</p>
                      <p className="text-sm">Configure tax settings to start tracking obligations</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Automation Tab */}
            <TabsContent value="ai-automation">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">AI Automation</h3>
                  <p className="text-muted-foreground mb-6">
                    Automate your bookkeeping workflow with AI-powered transaction categorization and bank reconciliation.
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Transaction Categorizer Agent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Tag className="h-5 w-5 mr-2 text-primary" />
                          Transaction Categorizer
                        </CardTitle>
                        <CardDescription>
                          Automatically categorize transactions using AI-powered analysis based on description, amount, and patterns.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">Auto-categorization</p>
                              <p className="text-sm text-muted-foreground">Process uncategorized transactions</p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={async () => {
                                if (!selectedClient) {
                                  toast({
                                    title: "No client selected",
                                    description: "Please select a client to run categorization.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                try {
                                  const response = await apiRequest("POST", "/api/ai-agents/categorizer/run", {
                                    clientId: parseInt(selectedClient),
                                    firmId: 1
                                  });
                                  const result = await response.json();
                                  
                                  toast({
                                    title: "Transaction categorization started",
                                    description: `Task ID: ${result.taskId}`,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to start categorization",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Run Categorizer
                            </Button>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p>• Analyzes transaction descriptions and amounts</p>
                            <p>• Uses your chart of accounts for categorization</p>
                            <p>• Learns from your existing transaction patterns</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Bank Reconciler Agent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                          Bank Reconciler
                        </CardTitle>
                        <CardDescription>
                          Automatically reconcile bank transactions with your recorded transactions using intelligent matching.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">Auto-reconciliation</p>
                              <p className="text-sm text-muted-foreground">Match bank feeds with transactions</p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={async () => {
                                if (!selectedClient) {
                                  toast({
                                    title: "No client selected",
                                    description: "Please select a client to run reconciliation.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                try {
                                  const response = await apiRequest("POST", "/api/ai-agents/reconciler/run", {
                                    clientId: parseInt(selectedClient),
                                    firmId: 1,
                                    reconciliationDate: new Date()
                                  });
                                  const result = await response.json();
                                  
                                  toast({
                                    title: "Bank reconciliation started",
                                    description: `Task ID: ${result.taskId}`,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to start reconciliation",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Run Reconciler
                            </Button>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p>• Matches bank transactions with recorded entries</p>
                            <p>• Identifies discrepancies and missing transactions</p>
                            <p>• Suggests corrections and adjustments</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* AI Task Status */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Loader2 className="h-5 w-5 mr-2 text-primary" />
                        Automation Status
                      </CardTitle>
                      <CardDescription>
                        Monitor the progress of your AI automation tasks.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Recent AI tasks will appear here</span>
                          <Badge variant="outline">Ready</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>



            {/* Milton AI Tab */}
            <TabsContent value="milton-ai">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Milton AI Assistant
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      Your intelligent bookkeeping companion for automated Chart of Accounts setup and transaction processing
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>AI Online</span>
                    </div>
                  </div>
                </div>

                {selectedClient ? (
                  <Card className="border-2 border-gradient-to-r from-blue-200 to-purple-200">
                    <CardContent className="p-0">
                      <MiltonBooksChat clientId={selectedClient} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Select a Client</h4>
                          <p className="text-gray-500 mt-2">
                            Choose a client from the dropdown above to start chatting with Milton AI about their bookkeeping needs.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Milton AI Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">Chart of Accounts</h4>
                      <p className="text-sm text-gray-500">Auto-setup from uploaded data</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">File Processing</h4>
                      <p className="text-sm text-gray-500">Excel & CSV uploads</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">AI Classification</h4>
                      <p className="text-sm text-gray-500">Smart transaction categorization</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">Live Reporting</h4>
                      <p className="text-sm text-gray-500">Real-time financial insights</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {/* New Account Dialog */}
      <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Add a new account to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={newAccountFormData.name}
                  onChange={(e) => setNewAccountFormData({...newAccountFormData, name: e.target.value})}
                  placeholder="e.g., Checking Account"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Account Type</Label>
                <Select 
                  value={newAccountFormData.type} 
                  onValueChange={(value) => {
                    // Automatically set the default debit/credit balance type based on account type
                    const isDebitBalance = value === 'asset' || value === 'expense' || value === 'cost_of_sales';
                    // Clear the subtype when changing account type
                    setNewAccountFormData({
                      ...newAccountFormData, 
                      type: value,
                      subtype: '',
                      isDebitBalance
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="cost_of_sales">Cost of Sales</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="other_income">Other Income</SelectItem>
                    <SelectItem value="other_expense">Other Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subtype">Account Subtype</Label>
                <Input
                  id="subtype"
                  value={newAccountFormData.subtype}
                  onChange={(e) => setNewAccountFormData({
                    ...newAccountFormData, 
                    subtype: e.target.value
                  })}
                  placeholder="Enter custom subtype (e.g., bank, cash, inventory)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use "bank" as subtype for accounts that will connect to bank feeds via Plaid API.
                  This subtype will be used for trial balance leadsheets in binder engagements.
                </p>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newAccountFormData.description}
                  onChange={(e) => setNewAccountFormData({...newAccountFormData, description: e.target.value})}
                  placeholder="Add a description for this account"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-sm text-blue-800 font-medium">Chart of Accounts Structure Only</p>
                <p className="text-xs text-blue-600 mt-1">
                  This creates the account structure. Use Transaction Ledger for balance management.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isActive" 
                  checked={newAccountFormData.isActive}
                  onCheckedChange={(checked) => 
                    setNewAccountFormData({...newAccountFormData, isActive: !!checked})
                  }
                />
                <Label htmlFor="isActive">Active Account</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Account Dialog */}
      <Dialog open={showEditAccountDialog} onOpenChange={setShowEditAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-account-number">Account Number</Label>
                  <Input
                    id="edit-account-number"
                    value={selectedAccount.accountNumber || ''}
                    onChange={(e) => setSelectedAccount({...selectedAccount, accountNumber: e.target.value})}
                    placeholder="e.g., 1000, 1100-01, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="edit-name">Account Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedAccount.name}
                    onChange={(e) => setSelectedAccount({...selectedAccount, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-type">Account Type</Label>
                  <Select 
                    value={selectedAccount.type}
                    onValueChange={(value) => setSelectedAccount({...selectedAccount, type: value})}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="cost_of_sales">Cost of Sales</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="other_income">Other Income</SelectItem>
                      <SelectItem value="other_expense">Other Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-subtype">Account Subtype</Label>
                  <Input
                    id="edit-subtype"
                    value={selectedAccount.subtype}
                    onChange={(e) => setSelectedAccount({...selectedAccount, subtype: e.target.value})}
                    placeholder="Enter custom subtype (e.g., bank, cash, inventory)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use "bank" as subtype for accounts that will connect to bank feeds via Plaid API.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedAccount.description || ''}
                    onChange={(e) => setSelectedAccount({...selectedAccount, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-balance">Current Balance (Read-only)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                    <Input
                      id="edit-balance"
                      type="text"
                      className="pl-8 bg-gray-50 cursor-not-allowed"
                      value={(selectedAccount.balance / 100).toFixed(2)}
                      readOnly
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance is calculated from transactions. Use Transaction Manager to modify balances.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                  <p className="text-sm text-blue-800 font-medium">Chart of Accounts Structure Only</p>
                  <p className="text-xs text-blue-600 mt-1">
                    This manages account structure. Use Transaction Ledger for balance operations.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-isActive" 
                    checked={selectedAccount.isActive}
                    onCheckedChange={(checked) => 
                      setSelectedAccount({...selectedAccount, isActive: !!checked})
                    }
                  />
                  <Label htmlFor="edit-isActive">Active Account</Label>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            <div>
              <Button variant="destructive" onClick={() => setShowDeleteAccountConfirmDialog(true)}>
                Delete Account
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setSelectedAccount(null);
                setShowEditAccountDialog(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleEditAccount}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Transaction Dialog */}
      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Create a new financial transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex space-x-2 border-b pb-4">
              <Button
                variant={transactionType === 'expense' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTransactionType('expense')}
              >
                <ShoppingBag className="h-4 w-4 mr-2" /> Expense
              </Button>
              <Button
                variant={transactionType === 'income' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTransactionType('income')}
              >
                <DollarSign className="h-4 w-4 mr-2" /> Income
              </Button>
              <Button
                variant={transactionType === 'journal' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTransactionType('journal')}
              >
                <FileText className="h-4 w-4 mr-2" /> Journal Entry
              </Button>
            </div>
            
            {transactionType === 'journal' ? (
              /* Journal Entry Form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="journal-date">Date</Label>
                    <Input
                      id="journal-date"
                      type="date"
                      value={newTransactionFormData.date}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="journal-reference">Reference Number (Optional)</Label>
                    <Input
                      id="journal-reference"
                      value={newTransactionFormData.reference}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, reference: e.target.value})}
                      placeholder="e.g., JE-001"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="journal-description">Description</Label>
                  <Input
                    id="journal-description"
                    value={newTransactionFormData.description}
                    onChange={(e) => setNewTransactionFormData({...newTransactionFormData, description: e.target.value})}
                    placeholder="e.g., Monthly adjustment entries"
                  />
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Journal Entry Lines</h4>
                    <div className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {isBalanced ? 'Balanced ✓' : 'Unbalanced ✗'}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {transactionItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 sm:col-span-5">
                          <Label htmlFor={`account-${index}`} className="sr-only">Account</Label>
                          <Select 
                            value={item.accountId?.toString() || ''} 
                            onValueChange={(value) => handleTransactionItemChange(index, 'accountId', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-3 sm:col-span-3">
                          <Label htmlFor={`description-${index}`} className="sr-only">Description</Label>
                          <Input
                            id={`description-${index}`}
                            value={item.description}
                            onChange={(e) => handleTransactionItemChange(index, 'description', e.target.value)}
                            placeholder="Description"
                          />
                        </div>
                        
                        <div className="col-span-2 sm:col-span-2">
                          <Label htmlFor={`amount-${index}`} className="sr-only">Amount</Label>
                          <Input
                            id={`amount-${index}`}
                            value={item.amount}
                            onChange={(e) => handleTransactionItemChange(index, 'amount', e.target.value)}
                            placeholder="Amount"
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Label htmlFor={`type-${index}`} className="sr-only">Type</Label>
                          <Select 
                            value={item.isDebit ? 'debit' : 'credit'} 
                            onValueChange={(value) => handleTransactionItemChange(index, 'isDebit', value === 'debit')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debit">DR</SelectItem>
                              <SelectItem value="credit">CR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTransactionItem(index)}
                            disabled={transactionItems.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={handleAddTransactionItem}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Line
                  </Button>
                </div>
              </div>
            ) : (
              /* Income/Expense Form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transaction-date">Date</Label>
                    <Input
                      id="transaction-date"
                      type="date"
                      value={newTransactionFormData.date}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transaction-amount">Amount</Label>
                    <Input
                      id="transaction-amount"
                      value={newTransactionFormData.amount}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="transaction-description">Description</Label>
                  <Input
                    id="transaction-description"
                    value={newTransactionFormData.description}
                    onChange={(e) => setNewTransactionFormData({...newTransactionFormData, description: e.target.value})}
                    placeholder={transactionType === 'income' ? 'e.g., Client payment' : 'e.g., Office supplies'}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="transaction-tax">Tax</Label>
                    <div className="text-xs text-muted-foreground">
                      {newTransactionFormData.taxInclusive ? "Tax Inclusive" : "Tax Exclusive"}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8">
                      <Select 
                        value={newTransactionFormData.taxId?.toString() || 'none'} 
                        onValueChange={(value) => {
                          // Handle "none" value (no tax)
                          if (value === "none") {
                            setNewTransactionFormData({
                              ...newTransactionFormData, 
                              taxId: undefined,
                              taxSettingId: undefined,
                              taxRate: 0,
                              taxName: '',
                              taxStatus: 'exempt',
                              taxable: false
                            });
                            return;
                          }
                          
                          // Handle tax selection
                          // Handle both numeric and string IDs
                          const taxId = value;
                          const selectedTax = bookkeepingSettings?.taxSettings?.find(tax => 
                            tax.id?.toString() === taxId
                          );
                          
                          if (selectedTax) {
                            console.log("Selected tax:", selectedTax);
                            setNewTransactionFormData({
                              ...newTransactionFormData, 
                              // Fix the type by storing original string ID in taxSettingId
                              // and using a numeric taxId if possible, or undefined if not
                              taxId: selectedTax.id ? 
                                (typeof selectedTax.id === 'number' ? selectedTax.id : undefined) : 
                                undefined,
                              taxSettingId: taxId,
                              taxRate: selectedTax.rate,
                              taxName: selectedTax.name,
                              taxStatus: 'custom',
                              taxable: true
                            });
                          } else {
                            console.log("Tax not found with ID:", taxId);
                            console.log("Available taxes:", bookkeepingSettings?.taxSettings);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax</SelectItem>
                          {bookkeepingSettings?.taxSettings ? 
                            bookkeepingSettings.taxSettings.map(tax => (
                              <SelectItem key={tax.id} value={tax.id?.toString()}>
                                {tax.name} ({(tax.rate * 100).toFixed(1)}%)
                              </SelectItem>
                            )) 
                            : 
                            <SelectItem value="none-configured">No tax settings found</SelectItem>
                          }
                          {console.log("New transaction tax dropdown rendering, settings:", bookkeepingSettings?.taxSettings)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center h-full">
                        <Switch 
                          id="tax-inclusive"
                          checked={newTransactionFormData.taxInclusive}
                          onCheckedChange={(checked) => 
                            setNewTransactionFormData({...newTransactionFormData, taxInclusive: checked})
                          }
                        />
                        <Label htmlFor="tax-inclusive" className="ml-2">Inclusive</Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="transaction-account">
                      Account <span className="text-red-500">*</span>
                    </Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs flex items-center gap-1"
                      onClick={handleAICategorize}
                      disabled={!newTransactionFormData.description || !newTransactionFormData.amount || !selectedClient || isAICategorizing}
                    >
                      {isAICategorizing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> 
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> 
                          Suggest Category
                        </>
                      )}
                    </Button>
                  </div>
                  <Select 
                    value={newTransactionFormData.accountId?.toString() || ''}
                    onValueChange={(value) => setNewTransactionFormData({
                      ...newTransactionFormData, 
                      accountId: parseInt(value)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Select an account --</SelectItem>
                      {accounts?.filter(account => 
                        transactionType === 'income' 
                          ? account.type === 'income'
                          : account.type === 'expense'
                      ).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aiCategorySuggestion && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>
                        AI suggested: <span className="font-medium">{aiCategorySuggestion.name}</span> 
                        <span className="ml-1">({Math.round(aiCategorySuggestion.confidence * 100)}% confidence)</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Tax UI is now in the section above */}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transaction-reference">Reference (Optional)</Label>
                    <Input
                      id="transaction-reference"
                      value={newTransactionFormData.reference}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, reference: e.target.value})}
                      placeholder={transactionType === 'income' ? 'e.g., INV-001' : 'e.g., Receipt #123'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transaction-category">Category (Optional)</Label>
                    <Input
                      id="transaction-category"
                      value={newTransactionFormData.category}
                      onChange={(e) => setNewTransactionFormData({...newTransactionFormData, category: e.target.value})}
                      placeholder="e.g., Rent, Consulting"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="transaction-notes">Notes (Optional)</Label>
                  <Textarea
                    id="transaction-notes"
                    value={newTransactionFormData.notes}
                    onChange={(e) => setNewTransactionFormData({...newTransactionFormData, notes: e.target.value})}
                    placeholder="Add any additional details"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTransactionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransaction}>
              Create Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transaction Classification Dialog */}
      <Dialog open={showClassifyDialog} onOpenChange={setShowClassifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classify Transaction</DialogTitle>
            <DialogDescription>
              Assign this transaction to an account in your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Transaction Details</h3>
                  <div className="bg-neutral-50 p-3 rounded-md mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-500">Type:</span>
                      <span className="text-sm font-medium">
                        {selectedTransaction.type === 'income' 
                          ? 'Income' 
                          : selectedTransaction.type === 'expense' 
                          ? 'Expense' 
                          : 'Journal'}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-500">Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedTransaction.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-500">Amount:</span>
                      <span className={`text-sm font-medium ${
                        selectedTransaction.type === 'income' 
                          ? 'text-green-600' 
                          : selectedTransaction.type === 'expense'
                          ? 'text-red-600'
                          : ''
                      }`}>
                        {formatCurrency(processAmount(selectedTransaction.amount))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500">Description:</span>
                      <span className="text-sm font-medium">{selectedTransaction.description}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="transaction-account" className="mb-1">
                    Assign to Account <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={selectedTransaction.accountId?.toString() || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setSelectedTransaction({
                          ...selectedTransaction,
                          accountId: undefined
                        });
                      } else {
                        setSelectedTransaction({
                          ...selectedTransaction, 
                          accountId: parseInt(value)
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Select an account --</SelectItem>
                      {accounts?.filter(account => 
                        selectedTransaction.type === 'income' 
                          ? account.type === 'income'
                          : selectedTransaction.type === 'expense'
                          ? account.type === 'expense'
                          : true
                      ).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedTransaction(null);
              setShowClassifyDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedTransaction || !selectedTransaction.accountId) {
                  toast({
                    title: "Account required",
                    description: "Please select an account for this transaction.",
                    variant: "destructive",
                  });
                  return;
                }
                
                try {
                  const response = await apiRequest('PATCH', `/api/transactions/${selectedTransaction.id}`, {
                    accountId: selectedTransaction.accountId
                  });
                  
                  if (response.ok) {
                    // Refresh transactions
                    queryClient.invalidateQueries({ queryKey: [`/api/transactions/${selectedClient}`] });
                    queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping-summary/${selectedClient}`] });
                    
                    toast({
                      title: "Transaction classified",
                      description: "Transaction has been successfully assigned to an account.",
                    });
                    
                    setSelectedTransaction(null);
                    setShowClassifyDialog(false);
                  } else {
                    throw new Error("Failed to update transaction");
                  }
                } catch (error: any) {
                  toast({
                    title: "Classification failed",
                    description: error.message || "An error occurred while classifying the transaction.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Save Classification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Transaction Dialog */}
      <Dialog open={showEditTransactionDialog} onOpenChange={setShowEditTransactionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={selectedTransaction.date ? new Date(selectedTransaction.date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedTransaction({
                      ...selectedTransaction,
                      date: e.target.value
                    })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select 
                    value={selectedTransaction.type} 
                    onValueChange={(value) => setSelectedTransaction({
                      ...selectedTransaction,
                      type: value
                    })}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="journal">Journal Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      className="pl-8"
                      value={selectedTransaction.amount}
                      onChange={(e) => setSelectedTransaction({
                        ...selectedTransaction,
                        // Use our standardized amount processing helper
                        amount: processAmount(e.target.value)
                      })}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={selectedTransaction.description || ''}
                    onChange={(e) => setSelectedTransaction({
                      ...selectedTransaction,
                      description: e.target.value
                    })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-reference">Reference</Label>
                  <Input
                    id="edit-reference"
                    value={selectedTransaction.reference || ''}
                    onChange={(e) => setSelectedTransaction({
                      ...selectedTransaction,
                      reference: e.target.value
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-account">Account</Label>
                  <Select 
                    value={selectedTransaction.accountId?.toString() || 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setSelectedTransaction({
                          ...selectedTransaction,
                          accountId: undefined,
                          categoryName: null
                        });
                      } else {
                        setSelectedTransaction({
                          ...selectedTransaction, 
                          accountId: parseInt(value),
                          categoryName: accounts?.find(account => account.id === parseInt(value))?.name || null
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="edit-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Select an account --</SelectItem>
                      {accounts?.filter(account => 
                        selectedTransaction.type === 'income' 
                          ? account.type === 'income'
                          : selectedTransaction.type === 'expense'
                          ? account.type === 'expense'
                          : true
                      ).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category Name</Label>
                  <Input
                    id="edit-category"
                    value={selectedTransaction.categoryName || ''}
                    onChange={(e) => setSelectedTransaction({
                      ...selectedTransaction,
                      categoryName: e.target.value
                    })}
                    placeholder="Optional custom category name"
                  />
                </div>

                {/* Tax Selection Section */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="edit-tax">Tax</Label>
                    <div className="text-xs text-muted-foreground">
                      {selectedTransaction.taxInclusive ? "Tax Inclusive" : "Tax Exclusive"}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8">
                      <Select 
                        value={selectedTransaction.taxSettingId || selectedTransaction.taxId?.toString() || 'none'} 
                        onValueChange={(value) => {
                          console.log("Edit transaction form - selected tax value:", value);
                          console.log("Edit transaction form - current transaction state:", selectedTransaction);
                          
                          // Handle "none" value (no tax)
                          if (value === "none") {
                            setSelectedTransaction({
                              ...selectedTransaction, 
                              taxId: undefined,
                              taxSettingId: undefined,
                              taxRate: 0,
                              taxName: '',
                              taxStatus: 'exempt'
                            });
                            return;
                          }
                          
                          // Handle tax selection
                          // Handle both numeric and string IDs
                          const taxId = value;
                          const selectedTax = bookkeepingSettings?.taxSettings?.find(tax => 
                            tax.id?.toString() === taxId
                          );
                          
                          if (selectedTax) {
                            console.log("Edit dialog - Selected tax:", selectedTax);
                            setSelectedTransaction({
                              ...selectedTransaction, 
                              // Fix the type by storing original string ID in taxSettingId
                              // and using a numeric taxId if possible, or undefined if not
                              taxId: selectedTax.id ? 
                                (typeof selectedTax.id === 'number' ? selectedTax.id : undefined) : 
                                undefined,
                              taxSettingId: taxId,
                              taxRate: selectedTax.rate,
                              taxName: selectedTax.name,
                              taxStatus: 'custom',
                              taxable: true
                            });
                          } else {
                            console.log("Edit dialog - Tax not found with ID:", taxId);
                            console.log("Edit dialog - Available taxes:", bookkeepingSettings?.taxSettings);
                          }
                        }}
                      >
                        <SelectTrigger id="edit-tax">
                          <SelectValue placeholder="Select tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax</SelectItem>
                          {bookkeepingSettings?.taxSettings ? 
                            bookkeepingSettings.taxSettings.map(tax => (
                              <SelectItem key={tax.id} value={tax.id?.toString()}>
                                {tax.name} ({(tax.rate * 100).toFixed(1)}%)
                              </SelectItem>
                            )) 
                            : 
                            <SelectItem value="none-configured">No tax settings found</SelectItem>
                          }
                          {console.log("Edit transaction tax dropdown rendering, settings:", bookkeepingSettings?.taxSettings)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center h-full">
                        <Switch 
                          id="edit-tax-inclusive"
                          checked={!!selectedTransaction.taxInclusive}
                          onCheckedChange={(checked) => 
                            setSelectedTransaction({...selectedTransaction, taxInclusive: checked})
                          }
                        />
                        <Label htmlFor="edit-tax-inclusive" className="ml-2">Inclusive</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTransactionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTransaction}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* CSV Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map CSV Columns</DialogTitle>
            <DialogDescription>
              Match your file columns to transaction fields.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="use-two-column" 
                checked={useTwoColumnAmount}
                onCheckedChange={(checked) => setUseTwoColumnAmount(!!checked)}
              />
              <Label htmlFor="use-two-column">Use separate debit and credit columns</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-column">Date Column</Label>
                <SafeCsvSelect
                  id="date-column"
                  value={columnMapping.date}
                  onValueChange={(value) => handleColumnMappingChange('date', value)}
                  placeholder="Select date column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              <div>
                <Label htmlFor="description-column">Description Column</Label>
                <SafeCsvSelect
                  id="description-column"
                  value={columnMapping.description}
                  onValueChange={(value) => handleColumnMappingChange('description', value)}
                  placeholder="Select description column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              {!useTwoColumnAmount ? (
                <div>
                  <Label htmlFor="amount-column">Amount Column</Label>
                  <SafeCsvSelect
                    id="amount-column"
                    value={columnMapping.amount}
                    onValueChange={(value) => handleColumnMappingChange('amount', value)}
                    placeholder="Select amount column"
                    headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="debit-column">Debit Column</Label>
                    <SafeCsvSelect
                      id="debit-column"
                      value={columnMapping.debit}
                      onValueChange={(value) => handleColumnMappingChange('debit', value)}
                      placeholder="Select debit column"
                      headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="credit-column">Credit Column</Label>
                    <SafeCsvSelect
                      id="credit-column"
                      value={columnMapping.credit}
                      onValueChange={(value) => handleColumnMappingChange('credit', value)}
                      placeholder="Select credit column"
                      headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="type-column">Type Column (Optional)</Label>
                <SafeCsvSelect
                  id="type-column"
                  value={columnMapping.type}
                  onValueChange={(value) => handleColumnMappingChange('type', value)}
                  placeholder="Select type column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              <div>
                <Label htmlFor="category-column">Category Column (Optional)</Label>
                <SafeCsvSelect
                  id="category-column"
                  value={columnMapping.category}
                  onValueChange={(value) => handleColumnMappingChange('category', value)}
                  placeholder="Select category column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              <div>
                <Label htmlFor="tax-column">Tax Amount Column (Optional)</Label>
                <SafeCsvSelect
                  id="tax-column"
                  value={columnMapping.taxAmount}
                  onValueChange={(value) => handleColumnMappingChange('taxAmount', value)}
                  placeholder="Select tax amount column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              <div>
                <Label htmlFor="reference-column">Reference Column (Optional)</Label>
                <SafeCsvSelect
                  id="reference-column"
                  value={columnMapping.reference}
                  onValueChange={(value) => handleColumnMappingChange('reference', value)}
                  placeholder="Select reference column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
            </div>
            
            {csvData?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Preview Data</h4>
                <div className="border rounded overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(csvData[0]).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((value, j) => (
                            <TableCell key={j}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  Showing {Math.min(5, csvData.length)} of {csvData.length} rows
                </p>
              </div>
            )}
            
            {isImporting && (
              <div className="mt-4">
                <Label className="text-sm">Import Progress</Label>
                <Progress value={importProgress} className="h-2 mt-1" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelImport} disabled={isImporting && importProgress > 70}>
              Cancel
            </Button>
            <Button onClick={handleImportMappedData} disabled={isImporting && importProgress > 70}>
              {isImporting && importProgress > 70 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
                </>
              ) : (
                'Import Data'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Accounts Mapping Dialog */}
      <Dialog open={showAccountsMappingDialog} onOpenChange={setShowAccountsMappingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Account Columns</DialogTitle>
            <DialogDescription>
              Match columns from your file to the corresponding account fields. 
              <span className="font-medium text-primary">* Required fields</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-base font-medium">Column Mapping</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-neutral-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Map columns from your spreadsheet to the corresponding account fields.</p>
                      <p className="mt-2">Required fields: Account Name, Account Type</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div>
                <Label htmlFor="name-column" className="after:content-['*'] after:ml-0.5 after:text-red-500">Account Name Column</Label>
                <SafeCsvSelect
                  id="name-column"
                  value={accountsColumnMapping.name}
                  onValueChange={(value) => handleAccountsColumnMappingChange('name', value)}
                  placeholder="Select account name column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              
              <div>
                <Label htmlFor="type-column" className="after:content-['*'] after:ml-0.5 after:text-red-500">Account Type Column</Label>
                <SafeCsvSelect
                  id="type-column"
                  value={accountsColumnMapping.type}
                  onValueChange={(value) => handleAccountsColumnMappingChange('type', value)}
                  placeholder="Select account type column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Common values: asset, liability, equity, income, expense
                </p>
              </div>
              
              <div>
                <Label htmlFor="subtype-column">Account Subtype Column (Optional)</Label>
                <SafeCsvSelect
                  id="subtype-column"
                  value={accountsColumnMapping.subtype}
                  onValueChange={(value) => handleAccountsColumnMappingChange('subtype', value)}
                  placeholder="Select account subtype column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Examples: checking, savings, credit card, accounts receivable
                </p>
              </div>
              
              <div>
                <Label htmlFor="description-column">Description Column (Optional)</Label>
                <SafeCsvSelect
                  id="description-column"
                  value={accountsColumnMapping.description}
                  onValueChange={(value) => handleAccountsColumnMappingChange('description', value)}
                  placeholder="Select description column"
                  headers={csvData?.length > 0 ? Object.keys(csvData[0]) : []}
                />
              </div>
              

            </div>
            
            {csvData?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Preview Data</h4>
                <div className="border rounded overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(csvData[0]).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((value, j) => (
                            <TableCell key={j}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  Showing {Math.min(5, csvData.length)} of {csvData.length} rows
                </p>
              </div>
            )}
            
            {isImporting && (
              <div className="mt-4">
                <Label className="text-sm">Import Progress</Label>
                <Progress value={importProgress} className="h-2 mt-1" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImporting(false);
                setShowAccountsMappingDialog(false);
              }} 
              disabled={isImporting && importProgress > 70}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportAccountsMappedData} 
              disabled={isImporting && importProgress > 70}
            >
              {isImporting && importProgress > 70 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
                </>
              ) : (
                'Import Accounts'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generated Chart of Accounts Dialog */}
      <Dialog open={showGenerateAccountsDialog} onOpenChange={setShowGenerateAccountsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Chart of Accounts with AI</DialogTitle>
            <DialogDescription>
              Use AI to generate a complete chart of accounts tailored for a specific industry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={industryInput}
                  onChange={(e) => setIndustryInput(e.target.value)}
                  placeholder="e.g. Restaurant, Medical Practice, Construction, etc."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the specific industry for which to generate accounts
                </p>
              </div>
              
              <div>
                <Label htmlFor="countryCode">Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the country to ensure accounts comply with local standards
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateAccountsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateAccountsSubmit} disabled={generatingAccounts}>
              {generatingAccounts ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Accounts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Classification Rules Sheet */}
      <Sheet open={showRulesSheet} onOpenChange={setShowRulesSheet}>
        <SheetContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          <SheetHeader>
            <SheetTitle>Transaction Classification Rules</SheetTitle>
            <SheetDescription>
              Set up rules to automatically categorize transactions based on patterns in their descriptions or other properties.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Active Rules</h3>
              <Button onClick={() => setShowNewRuleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Rule
              </Button>
            </div>
            
            {/* Rules listing */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {!selectedClient ? (
                <p className="text-sm text-neutral-500 italic">Select a client to view classification rules.</p>
              ) : (
                <div>
                  {rulesQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">No rules have been created. Create a rule to automatically categorize transactions.</p>
                  ) : (
                    <div className="space-y-3">
                      {rulesQuery.data.map((rule: any) => (
                          <Card key={rule.id} className={!rule.active ? "opacity-60" : ""}>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">{rule.name}</CardTitle>
                                  <CardDescription className="text-xs">
                                    {rule.description || 'No description'}
                                  </CardDescription>
                                </div>
                                <div className="flex space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                          // Edit rule logic
                                        }}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit rule</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={async () => {
                                          // Toggle rule active state
                                          try {
                                            await apiRequest('PATCH', `/api/reconciliation-rules/${rule.id}`, {
                                              active: !rule.active
                                            });
                                            
                                            // Refetch rules
                                            queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-rules/${selectedClient}`] });
                                            
                                            toast({
                                              title: rule.active ? "Rule disabled" : "Rule enabled",
                                              description: `The rule "${rule.name}" has been ${rule.active ? "disabled" : "enabled"}.`,
                                            });
                                          } catch (error: any) {
                                            toast({
                                              title: "Failed to update rule",
                                              description: error.message || "An error occurred while updating the rule.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}>
                                          {rule.active ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <AlertCircle className="h-4 w-4 text-neutral-400" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{rule.active ? "Disable rule" : "Enable rule"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={async () => {
                                          // Delete rule logic
                                          if (confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
                                            try {
                                              await apiRequest('DELETE', `/api/reconciliation-rules/${rule.id}`);
                                              
                                              // Refetch rules
                                              queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-rules/${selectedClient}`] });
                                              
                                              toast({
                                                title: "Rule deleted",
                                                description: `The rule "${rule.name}" has been deleted.`,
                                              });
                                            } catch (error: any) {
                                              toast({
                                                title: "Failed to delete rule",
                                                description: error.message || "An error occurred while deleting the rule.",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}>
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete rule</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div>
                                  <span className="font-medium text-xs text-neutral-500">Conditions:</span>
                                  <div className="mt-1">
                                    {rule.conditions && rule.conditions.map((condition: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                        {condition.field} {condition.operator} {
                                          typeof condition.value === 'object' 
                                            ? JSON.stringify(condition.value) 
                                            : String(condition.value)
                                        }
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium text-xs text-neutral-500">Actions:</span>
                                  <div className="mt-1">
                                    {rule.actions && rule.actions.map((action: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                        {action.type}: {
                                          typeof action.value === 'object' 
                                            ? JSON.stringify(action.value) 
                                            : String(action.value)
                                        }
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Classification Rule Dialog */}
      <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create Classification Rule</DialogTitle>
            <DialogDescription>
              Create a rule to automatically categorize transactions based on their properties.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g., Categorize Office Expenses"
                  value={newRuleFormData.name}
                  onChange={(e) => setNewRuleFormData({...newRuleFormData, name: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="rule-pattern">Match Pattern</Label>
                <Input
                  id="rule-pattern"
                  placeholder="e.g., office supplies"
                  value={newRuleFormData.pattern}
                  onChange={(e) => setNewRuleFormData({...newRuleFormData, pattern: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="rule-match-type">Match Type</Label>
                <Select 
                  value={newRuleFormData.matchType} 
                  onValueChange={(value) => setNewRuleFormData({...newRuleFormData, matchType: value})}
                >
                  <SelectTrigger id="rule-match-type">
                    <SelectValue placeholder="Select match type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="startsWith">Starts with</SelectItem>
                    <SelectItem value="endsWith">Ends with</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="rule-category">Assign to Category</Label>
                <Select 
                  value={newRuleFormData.category} 
                  onValueChange={(value) => setNewRuleFormData({...newRuleFormData, category: value})}
                >
                  <SelectTrigger id="rule-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts && accounts
                      .filter((account: any) => account.isActive)
                      .map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rule-active" 
                  checked={newRuleFormData.isActive}
                  onCheckedChange={(checked) => 
                    setNewRuleFormData({...newRuleFormData, isActive: checked as boolean})
                  }
                />
                <Label htmlFor="rule-active">Rule is active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              // Validate form data
              if (!newRuleFormData.name) {
                toast({
                  title: "Rule name required",
                  description: "Please enter a name for this rule.",
                  variant: "destructive",
                });
                return;
              }
              
              if (!newRuleFormData.pattern) {
                toast({
                  title: "Match pattern required",
                  description: "Please enter a pattern to match transactions.",
                  variant: "destructive",
                });
                return;
              }
              
              if (!newRuleFormData.category) {
                toast({
                  title: "Category required",
                  description: "Please select a category to assign transactions to.",
                  variant: "destructive",
                });
                return;
              }
              
              // Create the rule
              try {
                const userId = (queryClient.getQueryData(['/api/current-user']) as any)?.id;
                if (!userId) {
                  throw new Error("User not authenticated");
                }
                
                // Create rule data from form
                const ruleData = {
                  clientId: parseInt(selectedClient),
                  name: newRuleFormData.name,
                  description: `Matches transactions where description ${newRuleFormData.matchType} "${newRuleFormData.pattern}"`,
                  active: newRuleFormData.isActive,
                  createdBy: userId,
                  priority: 0,
                  conditions: [{
                    id: crypto.randomUUID(),
                    field: "description",
                    operator: newRuleFormData.matchType as any,
                    value: newRuleFormData.pattern
                  }],
                  actions: [{
                    id: crypto.randomUUID(),
                    type: "setAccount",
                    value: parseInt(newRuleFormData.category)
                  }]
                };
                
                const response = await apiRequest('POST', '/api/reconciliation-rules', ruleData);
                
                if (response.ok) {
                  // Reset form data
                  setNewRuleFormData({
                    name: '',
                    pattern: '',
                    matchType: 'contains',
                    category: '',
                    isActive: true
                  });
                  
                  // Close dialog
                  setShowNewRuleDialog(false);
                  
                  // Refetch rules
                  queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-rules/${selectedClient}`] });
                  
                  toast({
                    title: "Rule created",
                    description: "The classification rule has been created successfully.",
                  });
                } else {
                  throw new Error("Failed to create rule");
                }
              } catch (error: any) {
                toast({
                  title: "Failed to create rule",
                  description: error.message || "An error occurred while creating the rule.",
                  variant: "destructive",
                });
              }
            }}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Confirmation Dialog */}
      <AlertDialog
        open={showDeleteAccountConfirmDialog}
        onOpenChange={setShowDeleteAccountConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account 
              {selectedAccount ? <strong> "{selectedAccount.name}" </strong> : ""}
              and may affect any transactions or financial reports that reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Analysis Results Dialog */}
      <Dialog open={showAIAnalysisDialog} onOpenChange={setShowAIAnalysisDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Chart of Accounts Analysis</DialogTitle>
            <DialogDescription>
              Comprehensive analysis results from the AI Categorizer Agent
            </DialogDescription>
          </DialogHeader>
          
          {aiAnalysisResults && (
            <div className="space-y-6 py-4">
              {/* Analysis Summary */}
              {aiAnalysisResults.summary && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Analysis Summary</h4>
                  <p className="text-sm text-muted-foreground">{aiAnalysisResults.summary}</p>
                </div>
              )}

              {/* Recommendations */}
              {aiAnalysisResults.recommendations && aiAnalysisResults.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Recommendations</h4>
                  <div className="space-y-2">
                    {aiAnalysisResults.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">{rec.title || rec.recommendation}</p>
                            {rec.description && (
                              <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                            )}
                            {rec.priority && (
                              <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'} className="mt-2">
                                {rec.priority} priority
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Issues */}
              {aiAnalysisResults.complianceIssues && aiAnalysisResults.complianceIssues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Compliance Issues</h4>
                  <div className="space-y-2">
                    {aiAnalysisResults.complianceIssues.map((issue: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-900">{issue.issue || issue.title}</p>
                            {issue.description && (
                              <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                            )}
                            {issue.suggestion && (
                              <p className="text-sm text-red-600 mt-2 italic">Suggestion: {issue.suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Suggestions */}
              {aiAnalysisResults.accountSuggestions && aiAnalysisResults.accountSuggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Suggested Accounts</h4>
                  <div className="space-y-2">
                    {aiAnalysisResults.accountSuggestions.map((account: any, index: number) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <Plus className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-green-900">{account.name}</p>
                            <p className="text-sm text-green-700">{account.type} - {account.number}</p>
                            {account.description && (
                              <p className="text-sm text-green-600 mt-1">{account.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consolidation Opportunities */}
              {aiAnalysisResults.consolidationOpportunities && aiAnalysisResults.consolidationOpportunities.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Consolidation Opportunities</h4>
                  <div className="space-y-2">
                    {aiAnalysisResults.consolidationOpportunities.map((opp: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <Merge className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900">{opp.title || 'Consolidation Opportunity'}</p>
                            <p className="text-sm text-yellow-700 mt-1">{opp.description}</p>
                            {opp.accounts && (
                              <div className="mt-2">
                                <p className="text-xs text-yellow-600">Accounts to consolidate:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {opp.accounts.map((acc: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{acc}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {aiAnalysisResults.performanceMetrics && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(aiAnalysisResults.performanceMetrics).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm font-medium text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-lg font-bold text-gray-700">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Information */}
              {aiAnalysisResults.task && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Analysis Details</h4>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Status:</span> 
                        <Badge variant={aiAnalysisResults.task.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                          {aiAnalysisResults.task.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span> {aiAnalysisResults.task.completedAt ? new Date(aiAnalysisResults.task.completedAt).toLocaleString() : 'In progress'}
                      </div>
                      <div>
                        <span className="font-medium">Provider:</span> {aiAnalysisResults.task.agentProvider || 'AI Agent'}
                      </div>
                      <div>
                        <span className="font-medium">Model:</span> {aiAnalysisResults.task.modelUsed || 'Default'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIAnalysisDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoiceDialog} onOpenChange={setShowNewInvoiceDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice with automatic double-entry accounting (Debit: Accounts Receivable, Credit: Sales Revenue)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-customer">Customer</Label>
                <Input id="invoice-customer" placeholder="Customer name" />
              </div>
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input id="invoice-date" type="date" defaultValue={getCurrentDateString()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <Input id="invoice-amount" type="number" step="0.01" className="pl-8" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label htmlFor="invoice-tax">Sales Tax</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <Input id="invoice-tax" type="number" step="0.01" className="pl-8" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-description">Description</Label>
              <Textarea id="invoice-description" placeholder="Products or services provided" />
            </div>
            <div>
              <Label htmlFor="invoice-terms">Payment Terms</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net-30">Net 30</SelectItem>
                  <SelectItem value="net-15">Net 15</SelectItem>
                  <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                  <SelectItem value="net-60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInvoiceDialog(false)}>Cancel</Button>
            <Button>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Expense Dialog */}
      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
            <DialogDescription>
              Record a business expense with automatic double-entry accounting (Debit: Expense Account, Credit: Cash/Accounts Payable)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-vendor">Vendor/Payee</Label>
                <Input id="expense-vendor" placeholder="Vendor name" />
              </div>
              <div>
                <Label htmlFor="expense-date">Expense Date</Label>
                <Input id="expense-date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <Input id="expense-amount" type="number" step="0.01" className="pl-8" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label htmlFor="expense-category">Expense Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-supplies">Office Supplies</SelectItem>
                    <SelectItem value="travel">Travel & Entertainment</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="rent">Rent/Lease</SelectItem>
                    <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                    <SelectItem value="professional-services">Professional Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="expense-description">Description</Label>
              <Textarea id="expense-description" placeholder="Expense details" />
            </div>
            <div>
              <Label htmlFor="expense-payment-method">Payment Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="How was this paid?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="on-account">On Account (Bill)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="expense-reimbursable" />
              <Label htmlFor="expense-reimbursable">Employee reimbursable expense</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewExpenseDialog(false)}>Cancel</Button>
            <Button>Record Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Payroll Run Dialog */}
      <Dialog open={showNewPayrollDialog} onOpenChange={setShowNewPayrollDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Process payroll with automatic tax calculations and journal entries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payroll-period-start">Pay Period Start</Label>
                <Input id="payroll-period-start" type="date" />
              </div>
              <div>
                <Label htmlFor="payroll-period-end">Pay Period End</Label>
                <Input id="payroll-period-end" type="date" />
              </div>
            </div>
            <div>
              <Label htmlFor="payroll-pay-date">Pay Date</Label>
              <Input id="payroll-pay-date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            
            {/* Employee Selection */}
            <div>
              <Label>Employees to Include</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                <div className="text-sm text-muted-foreground text-center py-4">
                  No employees found. Add employees first to run payroll.
                </div>
              </div>
            </div>

            {/* Payroll Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Payroll Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Gross Pay:</span>
                  <div className="font-medium">$0.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Deductions:</span>
                  <div className="font-medium">$0.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Pay:</span>
                  <div className="font-medium">$0.00</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPayrollDialog(false)}>Cancel</Button>
            <Button disabled>Process Payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Return Filing Dialog */}
      <Dialog open={showTaxReturnDialog} onOpenChange={setShowTaxReturnDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>File Tax Return</DialogTitle>
            <DialogDescription>
              Prepare and file sales tax returns based on collected tax data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-period-type">Tax Period</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tax-jurisdiction">Jurisdiction</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="federal">Federal</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-period-start">Period Start</Label>
                <Input id="tax-period-start" type="date" />
              </div>
              <div>
                <Label htmlFor="tax-period-end">Period End</Label>
                <Input id="tax-period-end" type="date" />
              </div>
            </div>
            
            {/* Tax Summary */}
            <div className="border rounded-md p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Tax Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Taxable Sales:</span>
                  <div className="font-medium">$0.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax Collected:</span>
                  <div className="font-medium">$0.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax Due:</span>
                  <div className="font-medium">$0.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount Owed:</span>
                  <div className="font-medium text-red-600">$0.00</div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="tax-notes">Additional Notes</Label>
              <Textarea id="tax-notes" placeholder="Any additional information for this return" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaxReturnDialog(false)}>Cancel</Button>
            <Button disabled>File Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chart Validation Screen */}
      {showChartValidation && validationResult && (
        <ChartValidationScreen
          validationResult={validationResult}
          onApprove={handleChartValidationApprove}
          onCancel={() => {
            setShowChartValidation(false);
            setValidationResult(null);
          }}
        />
      )}

        </div>
      </div>
    </div>
  );
}