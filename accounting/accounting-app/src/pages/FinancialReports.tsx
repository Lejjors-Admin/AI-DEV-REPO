import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, FileText, TrendingUp, DollarSign, Type, Calendar as CalendarIconAlt } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import AccountsReceivableAging from "@/components/crm/AccountsReceivableAging";
import AccountsPayableAging from "@/components/vendor/AccountsPayableAging";
import { apiConfig } from "@/lib/api-config";

interface TrialBalanceAccount {
  id: number;
  name: string;
  accountNumber: string;
  balance: number;
  debitBalance: number;
  creditBalance: number;
  totalDebits: number;
  totalCredits: number;
}

interface TrialBalanceData {
  accounts: {
    assets: TrialBalanceAccount[];
    liabilities: TrialBalanceAccount[];
    equity: TrialBalanceAccount[];
    income: TrialBalanceAccount[];
    expenses: TrialBalanceAccount[];
    costOfSales: TrialBalanceAccount[];
  };
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalIncome: number;
    totalExpenses: number;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  };
}

interface BalanceSheetData {
  assets: {
    currentAssets: { accounts: any[]; total: number };
    fixedAssets: { accounts: any[]; total: number };
    total: number;
  };
  liabilities: {
    currentLiabilities: { accounts: any[]; total: number };
    longTermLiabilities: { accounts: any[]; total: number };
    total: number;
  };
  equity: {
    accounts: any[];
    total: number;
  };
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  isBalanced: boolean;
  netIncome: number;
}

interface ProfitLossData {
  income: { accounts: any[]; total: number };
  expenses: { accounts: any[]; total: number };
  costOfSales: { accounts: any[]; total: number };
  grossProfit: number;
  netIncome: number;
}

export default function FinancialReports() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [reportType, setReportType] = useState<"trial-balance" | "balance-sheet" | "profit-loss" | "journal-entries" | "general-ledger" | "accounts-receivable" | "accounts-payable">("trial-balance");
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Text input states for manual date entry
  const [asOfDateText, setAsOfDateText] = useState<string>("");
  const [startDateText, setStartDateText] = useState<string>("");
  const [endDateText, setEndDateText] = useState<string>("");
  
  // Error states for date validation
  const [asOfDateError, setAsOfDateError] = useState<string>("");
  const [startDateError, setStartDateError] = useState<string>("");
  const [endDateError, setEndDateError] = useState<string>("");

  // Dimension filter states
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  // Fetch clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch dimension data (projects, locations, classes)
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedClient],
    enabled: !!selectedClient,
  });

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: [`/api/locations/${selectedClient}`],
    enabled: !!selectedClient,
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/locations/${selectedClient}`), { credentials: 'include', headers });
      const json = await res.json();
      return json.data || [];
    }
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: [`/api/classes/${selectedClient}`],
    enabled: !!selectedClient,
    queryFn: async () => {
      const res = await fetch(apiConfig.buildUrl(`/api/classes/${selectedClient}`), { credentials: 'include', headers });
      const json = await res.json();
      return json.data || [];
    }
  });

  // Fetch report data (skip for aging reports as they fetch their own data)
  const { data: reportData, isLoading: isLoadingReport, refetch: refetchReport, error } = useQuery<any>({
    queryKey: [`/api/reports/${reportType}/${selectedClient}`, reportType, selectedClient, asOfDate, startDate, endDate, selectedProjectId, selectedLocationId, selectedClassId],
    enabled: !!selectedClient && reportType !== 'accounts-receivable' && reportType !== 'accounts-payable',
    queryFn: async () => {
      if (!selectedClient) return null;
      
      let url = `/api/reports/${reportType}/${selectedClient}`;
      
      if (reportType === 'profit-loss' || reportType === 'journal-entries' || reportType === 'general-ledger') {
        url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
        // Add dimension filters for P&L (skip "all" which means no filter)
        if (reportType === 'profit-loss') {
          if (selectedProjectId && selectedProjectId !== 'all') url += `&projectId=${selectedProjectId}`;
          if (selectedLocationId && selectedLocationId !== 'all') url += `&locationId=${selectedLocationId}`;
          if (selectedClassId && selectedClassId !== 'all') url += `&classId=${selectedClassId}`;
        }
      } else if (reportType === 'accounts-receivable') {
        url += `?asOfDate=${asOfDate.toISOString().split('T')[0]}`;
      } else {
        url += `?date=${asOfDate.toISOString().split('T')[0]}`;
      }
      
      console.log('🔍 Fetching report from URL:', url);
      
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to access reports.');
        }
        throw new Error(`Failed to fetch ${reportType} report: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Report data received:', data);
      return data;
    }
  });

  // Set first client as default
  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id.toString());
    }
  }, [clients, selectedClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Date parsing utility to handle common formats
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
      'MMMM dd, yyyy'
    ];
    
    for (const formatStr of formats) {
      try {
        const date = parse(cleanStr, formatStr, new Date());
        if (isValid(date)) return date;
      } catch {
        continue;
      }
    }
    
    // Try native Date parsing as last resort
    try {
      const date = new Date(cleanStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  // Handle manual date input changes
  const handleAsOfDateChange = (value: string) => {
    setAsOfDateText(value);
    setAsOfDateError("");
    
    if (!value.trim()) {
      // If empty, keep current date
      return;
    }
    
    const parsedDate = parseDate(value);
    if (parsedDate) {
      setAsOfDate(parsedDate);
    } else {
      setAsOfDateError("Invalid date format. Try: 2023-12-31, 12/31/2023, or Dec 31, 2023");
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDateText(value);
    setStartDateError("");
    
    if (!value.trim()) {
      return;
    }
    
    const parsedDate = parseDate(value);
    if (parsedDate) {
      setStartDate(parsedDate);
    } else {
      setStartDateError("Invalid date format. Try: 2023-12-31, 12/31/2023, or Dec 31, 2023");
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDateText(value);
    setEndDateError("");
    
    if (!value.trim()) {
      return;
    }
    
    const parsedDate = parseDate(value);
    if (parsedDate) {
      setEndDate(parsedDate);
    } else {
      setEndDateError("Invalid date format. Try: 2023-12-31, 12/31/2023, or Dec 31, 2023");
    }
  };

  const renderTrialBalance = (data: TrialBalanceData) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Debits</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.totalDebits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Credits</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.totalCredits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className={`h-4 w-4 ${data.summary.isBalanced ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className={`text-lg font-bold ${data.summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {data.summary.isBalanced ? 'Balanced' : 'Unbalanced'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(data.accounts).map(([type, accounts]) => (
          accounts.length > 0 && (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize">{type.replace(/([A-Z])/g, ' $1')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accounts.map((account: TrialBalanceAccount) => (
                    <div key={account.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.accountNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(account.balance)}</p>
                        <p className="text-xs text-gray-500">
                          Dr: {formatCurrency(account.totalDebits)} Cr: {formatCurrency(account.totalCredits)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </div>
  );

  const renderBalanceSheet = (data: BalanceSheetData) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.totals.totalAssets)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totals.totalLiabilities)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Equity</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.totalEquity)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Assets</h4>
                {data.assets.currentAssets.accounts.length > 0 ? (
                  data.assets.currentAssets.accounts.map((account: any) => (
                    <div key={account.id} className="flex justify-between py-1">
                      <span className="pl-4">{account.name}</span>
                      <span>{formatCurrency(account.balance)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="pl-4">No current assets</span>
                    <span>$0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Current Assets</span>
                  <span>{formatCurrency(data.assets.currentAssets.total)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Fixed Assets</h4>
                {data.assets.fixedAssets.accounts.length > 0 ? (
                  data.assets.fixedAssets.accounts.map((account: any) => (
                    <div key={account.id} className="flex justify-between py-1">
                      <span className="pl-4">{account.name}</span>
                      <span>{formatCurrency(account.balance)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="pl-4">No fixed assets</span>
                    <span>$0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Fixed Assets</span>
                  <span>{formatCurrency(data.assets.fixedAssets.total)}</span>
                </div>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(data.assets.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Liabilities</h4>
                {data.liabilities.currentLiabilities.accounts.length > 0 ? (
                  data.liabilities.currentLiabilities.accounts.map((account: any) => (
                    <div key={`current-liability-${account.id}`} className="flex justify-between py-1">
                      <span className="pl-4">{account.name}</span>
                      <span>{formatCurrency(account.balance)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="pl-4">No current liabilities</span>
                    <span>$0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Current Liabilities</span>
                  <span>{formatCurrency(data.liabilities.currentLiabilities.total)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Long-term Liabilities</h4>
                {data.liabilities.longTermLiabilities.accounts.length > 0 ? (
                  data.liabilities.longTermLiabilities.accounts.map((account: any) => (
                    <div key={`longterm-liability-${account.id}`} className="flex justify-between py-1">
                      <span className="pl-4">{account.name}</span>
                      <span>{formatCurrency(account.balance)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="pl-4">No long-term liabilities</span>
                    <span>$0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Long-term Liabilities</span>
                  <span>{formatCurrency(data.liabilities.longTermLiabilities.total)}</span>
                </div>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                <span>TOTAL LIABILITIES</span>
                <span>{formatCurrency(data.liabilities.total)}</span>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Equity</h4>
                {data.equity.accounts.length > 0 ? (
                  data.equity.accounts.map((account: any) => (
                    <div key={`equity-${account.id}`} className="flex justify-between py-1">
                      <span className="pl-4">{account.name}</span>
                      <span>{formatCurrency(account.balance)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="pl-4">No equity accounts</span>
                    <span>$0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Equity</span>
                  <span>{formatCurrency(data.equity.total)}</span>
                </div>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatCurrency(data.totals.totalLiabilities + data.totals.totalEquity)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className={`${data.isBalanced ? 'border-green-500' : 'border-red-500'}`}>
        <CardContent className="p-4">
          <div className="text-center">
            <p className={`text-lg font-bold ${data.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {data.isBalanced ? '✓ Balance Sheet is Balanced' : '✗ Balance Sheet is Not Balanced'}
            </p>
            <p className="text-sm text-gray-600">Assets = Liabilities + Equity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderJournalEntries = (data: any) => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Journal Entry Report</h2>
        <p className="text-gray-600">{format(startDate, "PPP")} to {format(endDate, "PPP")}</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.entries && data.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Account</th>
                    <th className="text-right p-2">Debit</th>
                    <th className="text-right p-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{(() => {
                        try {
                          // Handle YYYY-MM-DD format safely without timezone conversion
                          if (/^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate)) {
                            const [year, month, day] = entry.entryDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: '2-digit'
                            });
                          }
                          
                          // For other formats, use standard parsing
                          const date = new Date(entry.entryDate);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        } catch (error) {
                          return 'Invalid Date';
                        }
                      })()}</td>
                      <td className="p-2">{entry.description}</td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{entry.accountName}</p>
                          <p className="text-gray-500">{entry.accountNumber}</p>
                        </div>
                      </td>
                      <td className="text-right p-2">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : ''}
                      </td>
                      <td className="text-right p-2">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No journal entries found for the selected date range.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderGeneralLedger = (data: any) => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">General Ledger</h2>
        <p className="text-gray-600">{format(startDate, "PPP")} to {format(endDate, "PPP")}</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.accounts && data.accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Account</th>
                    <th className="text-right p-2">Opening Balance</th>
                    <th className="text-right p-2">Debits</th>
                    <th className="text-right p-2">Credits</th>
                    <th className="text-right p-2">Ending Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((account: any) => (
                    <tr key={account.id} className="border-b">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-gray-500">{account.accountNumber}</p>
                        </div>
                      </td>
                      <td className="text-right p-2">{formatCurrency(account.openingBalance || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(account.totalDebits || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(account.totalCredits || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(account.endingBalance || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No account activity found for the selected date range.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProfitLoss = (data: ProfitLossData) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.income.total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.expenses.total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Net Income</p>
              <p className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netIncome)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Income Section */}
            <div>
              <h3 className="font-bold text-lg mb-3">REVENUE</h3>
              {data.income.accounts.map((account: any) => (
                <div key={account.id} className="flex justify-between py-1">
                  <span className="pl-4">{account.name}</span>
                  <span>{formatCurrency(account.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total Revenue</span>
                <span>{formatCurrency(data.income.total)}</span>
              </div>
            </div>

            {/* Cost of Sales */}
            {data.costOfSales.total > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3">COST OF SALES</h3>
                {data.costOfSales.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-1">
                    <span className="pl-4">{account.name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total Cost of Sales</span>
                  <span>{formatCurrency(data.costOfSales.total)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                  <span>GROSS PROFIT</span>
                  <span>{formatCurrency(data.grossProfit)}</span>
                </div>
              </div>
            )}

            {/* Expenses Section */}
            <div>
              <h3 className="font-bold text-lg mb-3">EXPENSES</h3>
              {data.expenses.accounts.map((account: any) => (
                <div key={account.id} className="flex justify-between py-1">
                  <span className="pl-4">{account.name}</span>
                  <span>{formatCurrency(account.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total Expenses</span>
                <span>{formatCurrency(data.expenses.total)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className="flex justify-between font-bold text-xl pt-4 border-t-2">
              <span>NET INCOME</span>
              <span className={data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(data.netIncome)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccountsReceivable = (data: any) => {
    if (!data) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Accounts Receivable</h2>
            <p className="text-gray-600">As of {format(asOfDate, "PPP")}</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                <p>Loading accounts receivable data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Accounts Receivable</h2>
          <p className="text-gray-600">As of {format(asOfDate, "PPP")}</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalOutstanding)}</p>
                <p className="text-sm text-gray-600">Total Outstanding</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{data.summary.customerCount}</p>
                <p className="text-sm text-gray-600">Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.aging.over90)}</p>
                <p className="text-sm text-gray-600">Over 90 Days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.aging.current)}</p>
                <p className="text-sm text-gray-600">Current (0-30 days)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {data.customers && data.customers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-right p-2">Total Invoiced</th>
                      <th className="text-right p-2">Total Paid</th>
                      <th className="text-right p-2">Balance</th>
                      <th className="text-center p-2">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((customer: any) => (
                      <tr key={customer.customerId} className="border-b">
                        <td className="p-2 font-medium">{customer.customerName}</td>
                        <td className="text-right p-2">{formatCurrency(customer.totalInvoiced)}</td>
                        <td className="text-right p-2">{formatCurrency(customer.totalPaid)}</td>
                        <td className="text-right p-2 font-bold">{formatCurrency(customer.balance)}</td>
                        <td className="text-center p-2">{customer.invoices.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No outstanding receivables found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aging Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold">{formatCurrency(data.aging.current)}</p>
                <p className="text-sm text-gray-600">Current (0-30 days)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatCurrency(data.aging.days31to60)}</p>
                <p className="text-sm text-gray-600">31-60 Days</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatCurrency(data.aging.days61to90)}</p>
                <p className="text-sm text-gray-600">61-90 Days</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-red-600">{formatCurrency(data.aging.over90)}</p>
                <p className="text-sm text-gray-600">Over 90 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Please select a client to view reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Generate and view comprehensive financial reports</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial-balance">Trial Balance</SelectItem>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                  <SelectItem value="journal-entries">Journal Entry Report</SelectItem>
                  <SelectItem value="general-ledger">General Ledger</SelectItem>
                  <SelectItem value="accounts-receivable">Accounts Receivable</SelectItem>
                  <SelectItem value="accounts-payable">Accounts Payable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                <p>You can select dates using the calendar picker or type them directly in formats like:</p>
                <p className="text-xs mt-1">2023-12-31 • 12/31/2023 • Dec 31, 2023</p>
              </div>
              
              {(reportType === 'profit-loss' || reportType === 'journal-entries' || reportType === 'general-ledger') ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Start Date</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          data-testid="input-start-date"
                          placeholder="Type date or use calendar"
                          value={startDateText}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className={cn(startDateError && "border-red-500")}
                        />
                        {startDateError && (
                          <p className="text-red-500 text-xs mt-1">{startDateError}</p>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button data-testid="button-start-date-calendar" variant="outline" size="icon">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar 
                            mode="single" 
                            selected={startDate} 
                            onSelect={(date) => {
                              if (date) {
                                setStartDate(date);
                                setStartDateText(format(date, "yyyy-MM-dd"));
                                setStartDateError("");
                              }
                            }} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected: {format(startDate, "PPP")}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>End Date</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          data-testid="input-end-date"
                          placeholder="Type date or use calendar"
                          value={endDateText}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className={cn(endDateError && "border-red-500")}
                        />
                        {endDateError && (
                          <p className="text-red-500 text-xs mt-1">{endDateError}</p>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button data-testid="button-end-date-calendar" variant="outline" size="icon">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar 
                            mode="single" 
                            selected={endDate} 
                            onSelect={(date) => {
                              if (date) {
                                setEndDate(date);
                                setEndDateText(format(date, "yyyy-MM-dd"));
                                setEndDateError("");
                              }
                            }} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected: {format(endDate, "PPP")}
                    </p>
                  </div>
                </div>
                
                {/* Dimension Filters for P&L */}
                {reportType === 'profit-loss' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                    <div>
                      <Label htmlFor="projectFilter">Project Filter</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger data-testid="select-project-filter">
                          <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="locationFilter">Location Filter</Label>
                      <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                        <SelectTrigger data-testid="select-location-filter">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="classFilter">Class Filter</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger data-testid="select-class-filter">
                          <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              ) : (
                <div className="max-w-md space-y-3">
                  <Label>As of Date</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        data-testid="input-as-of-date"
                        placeholder="Type date or use calendar"
                        value={asOfDateText}
                        onChange={(e) => handleAsOfDateChange(e.target.value)}
                        className={cn(asOfDateError && "border-red-500")}
                      />
                      {asOfDateError && (
                        <p className="text-red-500 text-xs mt-1">{asOfDateError}</p>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button data-testid="button-as-of-date-calendar" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={asOfDate} 
                          onSelect={(date) => {
                            if (date) {
                              setAsOfDate(date);
                              setAsOfDateText(format(date, "yyyy-MM-dd"));
                              setAsOfDateError("");
                            }
                          }} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-gray-500">
                    Selected: {format(asOfDate, "PPP")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <h3 className="font-bold">Error Loading Report</h3>
              <p>{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isLoadingReport ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <p>Loading report...</p>
            </div>
          </CardContent>
        </Card>
      ) : (reportData || reportType === 'accounts-receivable' || reportType === 'accounts-payable') ? (
        <div>
          {/* Show data status for non-aging reports */}
          {reportData && reportType !== 'accounts-receivable' && reportType !== 'accounts-payable' && (
            <Card className="mb-4 border-2 border-green-500">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-2 text-green-600">✅ Data Status: LOADED</h3>
                <p className="mb-2">Report Type: {reportType}</p>
                <p className="mb-2">Client: {selectedClient}</p>
                <p className="mb-2">Data Keys: {Object.keys(reportData || {}).join(', ')}</p>
                
                {/* Balance Sheet specific debug */}
                {reportType === 'balance-sheet' && reportData.assets && (
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <h4 className="font-semibold">Balance Sheet Debug:</h4>
                    <p>Current Assets: {reportData.assets.currentAssets?.accounts?.length || 0} accounts</p>
                    <p>First Account: {reportData.assets.currentAssets?.accounts?.[0]?.name || 'None'}</p>
                    <p>Balance: ${reportData.assets.currentAssets?.accounts?.[0]?.balance || 0}</p>
                  </div>
                )}
                
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">Raw JSON Data</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
          
          {reportType === 'trial-balance' && renderTrialBalance(reportData)}
          {reportType === 'balance-sheet' && renderBalanceSheet(reportData)}
          {reportType === 'profit-loss' && renderProfitLoss(reportData)}
          {reportType === 'journal-entries' && renderJournalEntries(reportData)}
          {reportType === 'general-ledger' && renderGeneralLedger(reportData)}
          {reportType === 'accounts-receivable' && (
            <AccountsReceivableAging clientId={selectedClient ? parseInt(selectedClient) : null} />
          )}
          {reportType === 'accounts-payable' && (
            <AccountsPayableAging clientId={selectedClient ? parseInt(selectedClient) : null} />
          )}
        </div>
      ) : (
        <Card className="border-yellow-500">
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-bold text-yellow-600">No Data Available</h3>
              <p>Selected Client: {selectedClient || 'None'}</p>
              <p>Report Type: {reportType}</p>
              <p>Loading: {isLoadingReport ? 'Yes' : 'No'}</p>
              <p>Error: {error ? error.message : 'None'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}