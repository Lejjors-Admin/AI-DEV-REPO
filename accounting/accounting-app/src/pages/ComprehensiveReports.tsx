import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Mail, 
  Settings, 
  Edit, 
  Save, 
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  FileText,
  Printer,
  Share2,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { cn } from "@/lib/utils";

interface ReportTemplate {
  id: string;
  name: string;
  type: 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'cash-flow' | 'custom';
  customization: {
    showZeroBalances: boolean;
    includeSubaccounts: boolean;
    groupBy: 'type' | 'department' | 'location' | 'none';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    currency: 'USD' | 'CAD' | 'EUR' | 'GBP';
    columns: string[];
    filters: any[];
    sorting: { field: string; direction: 'asc' | 'desc' };
  };
  scheduling: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    recipients: string[];
    subject: string;
    message: string;
  };
  isDefault: boolean;
  lastModified: Date;
}

export default function ComprehensiveReports() {
  // State Management
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedClient, setSelectedClient] = useState<string>("2");
  const [reportType, setReportType] = useState<string>("balance-sheet");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  
  // Date Range
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [datePreset, setDatePreset] = useState("current-month");
  
  // Customization
  const [customization, setCustomization] = useState({
    showZeroBalances: false,
    includeSubaccounts: true,
    groupBy: 'type',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    columns: ['account', 'balance', 'percentage'],
    compareWith: 'none', // 'previous-period', 'previous-year', 'budget'
    showPercentages: true,
    showTotals: true,
    showSubtotals: true
  });
  
  // Email/Scheduling
  const [emailSettings, setEmailSettings] = useState({
    recipients: [''],
    subject: '',
    message: '',
    format: 'pdf',
    schedule: {
      enabled: false,
      frequency: 'monthly',
      dayOfMonth: 1,
      dayOfWeek: 'monday'
    }
  });

  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch report templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/report-templates'],
    queryFn: async () => {
      // For now, return mock data - in real app, this would fetch from backend
      return [
        {
          id: '1',
          name: 'Standard Balance Sheet',
          type: 'balance-sheet',
          customization: {
            showZeroBalances: false,
            includeSubaccounts: true,
            groupBy: 'type',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
            columns: ['account', 'balance'],
            filters: [],
            sorting: { field: 'account', direction: 'asc' }
          },
          scheduling: {
            enabled: false,
            frequency: 'monthly',
            recipients: [],
            subject: '',
            message: ''
          },
          isDefault: true,
          lastModified: new Date()
        },
        {
          id: '2',
          name: 'Detailed P&L',
          type: 'profit-loss',
          customization: {
            showZeroBalances: false,
            includeSubaccounts: true,
            groupBy: 'type',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
            columns: ['account', 'balance', 'percentage'],
            filters: [],
            sorting: { field: 'balance', direction: 'desc' }
          },
          scheduling: {
            enabled: true,
            frequency: 'monthly',
            recipients: ['admin@company.com'],
            subject: 'Monthly P&L Report',
            message: 'Please find attached the monthly Profit & Loss report.'
          },
          isDefault: false,
          lastModified: new Date()
        }
      ];
    }
  });

  // Date preset handling
  useEffect(() => {
    const now = new Date();
    switch (datePreset) {
      case 'current-month':
        setDateRange({
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        });
        break;
      case 'previous-month':
        const prevMonth = subMonths(now, 1);
        setDateRange({
          startDate: startOfMonth(prevMonth),
          endDate: endOfMonth(prevMonth)
        });
        break;
      case 'current-year':
        setDateRange({
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        });
        break;
      case 'previous-year':
        const prevYear = subYears(now, 1);
        setDateRange({
          startDate: startOfYear(prevYear),
          endDate: endOfYear(prevYear)
        });
        break;
    }
  }, [datePreset]);

  const formatCurrency = (amount: number) => {
    const currency = customization.currency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const fetchReport = async () => {
    if (!selectedClient) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      let url = `/api/reports/${reportType}/${selectedClient}`;
      
      if (reportType === 'profit-loss' || reportType === 'general-ledger') {
        url += `?startDate=${format(dateRange.startDate, 'yyyy-MM-dd')}&endDate=${format(dateRange.endDate, 'yyyy-MM-dd')}`;
      } else {
        url += `?date=${format(dateRange.endDate, 'yyyy-MM-dd')}`;
      }
      
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
          setError("Please log in to access reports");
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReportData(data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Partial<ReportTemplate>) => {
      // In real app, this would save to backend
      return { ...template, id: Date.now().toString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
    }
  });

  // Email report mutation
  const emailReportMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await fetch('/api/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    }
  });

  const handleEmailReport = () => {
    if (!reportData) return;
    
    emailReportMutation.mutate({
      clientId: selectedClient,
      reportType,
      reportData,
      recipients: emailSettings.recipients.filter(r => r.trim()),
      subject: emailSettings.subject || `${reportType} Report`,
      message: emailSettings.message,
      format: emailSettings.format,
      dateRange
    });
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData) return;
    
    // Create download link
    const data = {
      reportData,
      reportType,
      customization,
      dateRange,
      client: clients?.find(c => c.id.toString() === selectedClient)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-${format}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderAdvancedBalanceSheet = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center border-b-2 pb-4">
          <h1 className="text-3xl font-bold">{clients?.find(c => c.id.toString() === selectedClient)?.name || 'Client'}</h1>
          <h2 className="text-2xl font-semibold">Balance Sheet</h2>
          <p className="text-lg text-gray-600">
            As of {format(dateRange.endDate, customization.dateFormat.replace('DD', 'dd'))}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-sm">Total Assets</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totals?.totalAssets || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-sm">Total Liabilities</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totals?.totalLiabilities || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-sm">Total Equity</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totals?.totalEquity || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-sm">Balance Status</h3>
              <p className={`text-lg font-bold ${reportData?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {reportData?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Balance Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">ASSETS</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Current Assets */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-blue-600">Current Assets</h3>
                <div className="space-y-2">
                  {(reportData?.assets?.currentAssets?.accounts || []).map((account: any) => (
                    <div key={account.id} className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(account.balance)}</div>
                        {customization.showPercentages && (
                          <div className="text-xs text-gray-500">
                            {((account.balance / (reportData?.totals?.totalAssets || 1)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(reportData?.assets?.currentAssets?.accounts || []).length === 0 && (
                    <div className="text-gray-500 italic pl-2">No current assets</div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-blue-200">
                  <span>Total Current Assets</span>
                  <span>{formatCurrency(reportData?.assets?.currentAssets?.total || 0)}</span>
                </div>
              </div>

              {/* Fixed Assets */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-blue-600">Fixed Assets</h3>
                <div className="space-y-2">
                  {(reportData?.assets?.fixedAssets?.accounts || []).map((account: any) => (
                    <div key={account.id} className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(account.balance)}</div>
                        {customization.showPercentages && (
                          <div className="text-xs text-gray-500">
                            {((account.balance / (reportData?.totals?.totalAssets || 1)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(reportData?.assets?.fixedAssets?.accounts || []).length === 0 && (
                    <div className="text-gray-500 italic pl-2">No fixed assets</div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-blue-200">
                  <span>Total Fixed Assets</span>
                  <span>{formatCurrency(reportData?.assets?.fixedAssets?.total || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-2xl pt-4 border-t-4 border-black">
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(reportData.totals?.totalAssets || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">LIABILITIES & EQUITY</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Current Liabilities */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-red-600">Current Liabilities</h3>
                <div className="space-y-2">
                  {(reportData?.liabilities?.currentLiabilities?.accounts || []).map((account: any) => (
                    <div key={account.id} className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(account.balance)}</div>
                        {customization.showPercentages && (
                          <div className="text-xs text-gray-500">
                            {((account.balance / (reportData?.totals?.totalLiabilitiesAndEquity || 1)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(reportData?.liabilities?.currentLiabilities?.accounts || []).length === 0 && (
                    <div className="text-gray-500 italic pl-2">No current liabilities</div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-red-200">
                  <span>Total Current Liabilities</span>
                  <span>{formatCurrency(reportData.liabilities?.currentLiabilities?.total || 0)}</span>
                </div>
              </div>

              {/* Long-term Liabilities */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-red-600">Long-term Liabilities</h3>
                <div className="space-y-2">
                  {(reportData?.liabilities?.longTermLiabilities?.accounts || []).map((account: any) => (
                    <div key={account.id} className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(account.balance)}</div>
                        {customization.showPercentages && (
                          <div className="text-xs text-gray-500">
                            {((account.balance / (reportData?.totals?.totalLiabilitiesAndEquity || 1)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(reportData?.liabilities?.longTermLiabilities?.accounts || []).length === 0 && (
                    <div className="text-gray-500 italic pl-2">No long-term liabilities</div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-red-200">
                  <span>Total Long-term Liabilities</span>
                  <span>{formatCurrency(reportData.liabilities?.longTermLiabilities?.total || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-gray-400 mb-6">
                <span>Total Liabilities</span>
                <span>{formatCurrency(reportData.liabilities?.total || 0)}</span>
              </div>

              {/* Equity */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-green-600">Equity</h3>
                <div className="space-y-2">
                  {(reportData?.equity?.accounts || []).map((account: any) => (
                    <div key={account.id} className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(account.balance)}</div>
                        {customization.showPercentages && (
                          <div className="text-xs text-gray-500">
                            {((account.balance / (reportData?.totals?.totalLiabilitiesAndEquity || 1)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(reportData?.equity?.accounts || []).length === 0 && (
                    <div className="text-gray-500 italic pl-2">No equity accounts</div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-green-200">
                  <span>Total Equity</span>
                  <span>{formatCurrency(reportData.equity?.total || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-2xl pt-4 border-t-4 border-black">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatCurrency(reportData.totals?.totalLiabilitiesAndEquity || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Verification */}
        <Card className={`border-2 ${reportData?.isBalanced ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <CardContent className="p-6 text-center">
            <h3 className={`text-2xl font-bold ${reportData?.isBalanced ? 'text-green-700' : 'text-red-700'}`}>
              {reportData?.isBalanced ? '✓ Balance Sheet is BALANCED' : '✗ Balance Sheet is NOT BALANCED'}
            </h3>
            <p className="text-lg mt-2">
              Assets: {formatCurrency(reportData.totals?.totalAssets || 0)} = 
              Liabilities: {formatCurrency(reportData.totals?.totalLiabilities || 0)} + 
              Equity: {formatCurrency(reportData.totals?.totalEquity || 0)}
            </p>
            {!reportData?.isBalanced && (
              <p className="text-red-600 mt-2">
                Difference: {formatCurrency(Math.abs((reportData?.totals?.totalAssets || 0) - (reportData?.totals?.totalLiabilitiesAndEquity || 0)))}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Financial Reports</h1>
          <p className="text-gray-600">Professional reporting with customization and automation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="schedule">Schedule & Email</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Client</Label>
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
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                      <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                      <SelectItem value="trial-balance">Trial Balance</SelectItem>
                      <SelectItem value="cash-flow">Cash Flow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Preset</Label>
                  <Select value={datePreset} onValueChange={setDatePreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current-month">Current Month</SelectItem>
                      <SelectItem value="previous-month">Previous Month</SelectItem>
                      <SelectItem value="current-year">Current Year</SelectItem>
                      <SelectItem value="previous-year">Previous Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={fetchReport} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Date Range */}
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.startDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={dateRange.startDate} 
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, startDate: date }))} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.endDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={dateRange.endDate} 
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, endDate: date }))} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-500">
              <CardContent className="p-6">
                <div className="text-red-600">
                  <h3 className="font-bold">Error</h3>
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Display */}
          {reportData && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Report Results</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportReport('excel')}>
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportReport('csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Email Report</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Recipients</Label>
                            <Input 
                              placeholder="email@example.com"
                              value={emailSettings.recipients[0]}
                              onChange={(e) => setEmailSettings(prev => ({
                                ...prev,
                                recipients: [e.target.value]
                              }))}
                            />
                          </div>
                          <div>
                            <Label>Subject</Label>
                            <Input 
                              placeholder="Financial Report"
                              value={emailSettings.subject}
                              onChange={(e) => setEmailSettings(prev => ({
                                ...prev,
                                subject: e.target.value
                              }))}
                            />
                          </div>
                          <div>
                            <Label>Message</Label>
                            <Textarea 
                              placeholder="Please find the attached report..."
                              value={emailSettings.message}
                              onChange={(e) => setEmailSettings(prev => ({
                                ...prev,
                                message: e.target.value
                              }))}
                            />
                          </div>
                          <Button 
                            onClick={handleEmailReport} 
                            disabled={emailReportMutation.isPending}
                            className="w-full"
                          >
                            {emailReportMutation.isPending ? 'Sending...' : 'Send Email'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {reportType === 'balance-sheet' && renderAdvancedBalanceSheet()}
                {/* Add other report types here */}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="customize" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Options */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Display Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showZeroBalances"
                      checked={customization.showZeroBalances}
                      onCheckedChange={(checked) => setCustomization(prev => ({
                        ...prev,
                        showZeroBalances: checked as boolean
                      }))}
                    />
                    <Label htmlFor="showZeroBalances">Show zero balances</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeSubaccounts"
                      checked={customization.includeSubaccounts}
                      onCheckedChange={(checked) => setCustomization(prev => ({
                        ...prev,
                        includeSubaccounts: checked as boolean
                      }))}
                    />
                    <Label htmlFor="includeSubaccounts">Include sub-accounts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showPercentages"
                      checked={customization.showPercentages}
                      onCheckedChange={(checked) => setCustomization(prev => ({
                        ...prev,
                        showPercentages: checked as boolean
                      }))}
                    />
                    <Label htmlFor="showPercentages">Show percentages</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showTotals"
                      checked={customization.showTotals}
                      onCheckedChange={(checked) => setCustomization(prev => ({
                        ...prev,
                        showTotals: checked as boolean
                      }))}
                    />
                    <Label htmlFor="showTotals">Show totals</Label>
                  </div>
                </div>
              </div>

              {/* Format Options */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Format Options</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Date Format</Label>
                    <Select value={customization.dateFormat} onValueChange={(value) => setCustomization(prev => ({
                      ...prev,
                      dateFormat: value as any
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={customization.currency} onValueChange={(value) => setCustomization(prev => ({
                      ...prev,
                      currency: value as any
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Group By</Label>
                    <Select value={customization.groupBy} onValueChange={(value) => setCustomization(prev => ({
                      ...prev,
                      groupBy: value as any
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="type">Account Type</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="none">No Grouping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Comparison Options */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Comparison Options</h3>
                <Select value={customization.compareWith} onValueChange={(value) => setCustomization(prev => ({
                  ...prev,
                  compareWith: value as any
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select comparison..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Comparison</SelectItem>
                    <SelectItem value="previous-period">Previous Period</SelectItem>
                    <SelectItem value="previous-year">Previous Year</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => saveTemplateMutation.mutate({
                name: `Custom ${reportType} Template`,
                type: reportType as any,
                customization,
                scheduling: {
                  enabled: false,
                  frequency: 'monthly',
                  recipients: [],
                  subject: '',
                  message: ''
                },
                isDefault: false,
                lastModified: new Date()
              })}>
                <Save className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule & Email Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email & Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Email Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Recipients (one per line)</Label>
                    <Textarea 
                      placeholder="email1@example.com&#10;email2@example.com"
                      value={emailSettings.recipients.join('\n')}
                      onChange={(e) => setEmailSettings(prev => ({
                        ...prev,
                        recipients: e.target.value.split('\n').filter(email => email.trim())
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Subject Template</Label>
                    <Input 
                      placeholder="Monthly Financial Report - {client} - {date}"
                      value={emailSettings.subject}
                      onChange={(e) => setEmailSettings(prev => ({
                        ...prev,
                        subject: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Message Template</Label>
                    <Textarea 
                      placeholder="Dear Team,&#10;&#10;Please find attached the financial report for {period}.&#10;&#10;Best regards"
                      value={emailSettings.message}
                      onChange={(e) => setEmailSettings(prev => ({
                        ...prev,
                        message: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Format</Label>
                    <Select value={emailSettings.format} onValueChange={(value) => setEmailSettings(prev => ({
                      ...prev,
                      format: value as any
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Automated Scheduling</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch 
                    id="enableSchedule"
                    checked={emailSettings.schedule.enabled}
                    onCheckedChange={(checked) => setEmailSettings(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, enabled: checked }
                    }))}
                  />
                  <Label htmlFor="enableSchedule">Enable automatic email delivery</Label>
                </div>

                {emailSettings.schedule.enabled && (
                  <div className="space-y-4">
                    <div>
                      <Label>Frequency</Label>
                      <Select value={emailSettings.schedule.frequency} onValueChange={(value) => setEmailSettings(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, frequency: value as any }
                      }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {emailSettings.schedule.frequency === 'monthly' && (
                      <div>
                        <Label>Day of Month</Label>
                        <Select value={emailSettings.schedule.dayOfMonth.toString()} onValueChange={(value) => setEmailSettings(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, dayOfMonth: parseInt(value) }
                        }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {emailSettings.schedule.frequency === 'weekly' && (
                      <div>
                        <Label>Day of Week</Label>
                        <Select value={emailSettings.schedule.dayOfWeek} onValueChange={(value) => setEmailSettings(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, dayOfWeek: value }
                        }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button>
                <Clock className="h-4 w-4 mr-2" />
                Save Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Report Templates</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template: ReportTemplate) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.isDefault && <Badge variant="secondary">Default</Badge>}
                        {template.scheduling.enabled && <Badge variant="outline">Scheduled</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{template.type.replace('-', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        Last modified: {format(new Date(template.lastModified), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}