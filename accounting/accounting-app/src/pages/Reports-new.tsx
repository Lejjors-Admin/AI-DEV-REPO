import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, Download, Calendar, FileBox, Filter, ChevronDown, 
  PieChart, BarChart, TrendingUp, DollarSign, CreditCard, Clock, 
  ArrowDownUp, Filter as FilterIcon, Printer, BarChart2, RefreshCcw,
  Calculator, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export default function Reports() {
  // Report selection and filters
  const [activeTab, setActiveTab] = useState("generate");
  const [reportType, setReportType] = useState("balance-sheet");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  
  // Date range state
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: startOfMonth(new Date()),
    endDate: new Date()
  });
  
  // Date range preset option
  const [dateRangePreset, setDateRangePreset] = useState<string>("this-month");
  
  // Additional report options
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [includeSubaccounts, setIncludeSubaccounts] = useState(true);
  const [compareToPreviousPeriod, setCompareToPreviousPeriod] = useState(false);
  const [compareToYearToDate, setCompareToYearToDate] = useState(false);
  
  // Report state
  const [reportData, setReportData] = useState<any>(null);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  // Update date range when preset changes
  useEffect(() => {
    const now = new Date();
    
    switch (dateRangePreset) {
      case "today":
        setDateRange({
          startDate: now,
          endDate: now
        });
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        setDateRange({
          startDate: yesterday,
          endDate: yesterday
        });
        break;
      case "this-week":
        setDateRange({
          startDate: subDays(now, now.getDay()),
          endDate: now
        });
        break;
      case "this-month":
        setDateRange({
          startDate: startOfMonth(now),
          endDate: now
        });
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        setDateRange({
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        });
        break;
      case "this-quarter":
        setDateRange({
          startDate: startOfQuarter(now),
          endDate: now
        });
        break;
      case "this-year":
        setDateRange({
          startDate: startOfYear(now),
          endDate: now
        });
        break;
      case "last-year":
        const lastYear = subMonths(now, 12);
        setDateRange({
          startDate: startOfYear(lastYear),
          endDate: endOfYear(lastYear)
        });
        break;
      case "custom":
        // Don't change, let user define
        break;
    }
  }, [dateRangePreset]);
  
  const formatDateDisplay = (date: Date) => {
    return format(date, "MMM d, yyyy");
  };
  
  const handleGenerateReport = async () => {
    // Validation
    if (!selectedClient) {
      toast({
        title: "Client Required",
        description: "Please select a client for the report.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingReport(true);
    setReportData(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate.toISOString());
      params.append('endDate', dateRange.endDate.toISOString());
      params.append('format', selectedFormat);
      params.append('showZeroBalances', showZeroBalances.toString());
      params.append('includeSubaccounts', includeSubaccounts.toString());
      params.append('compareToPreviousPeriod', compareToPreviousPeriod.toString());
      params.append('compareToYearToDate', compareToYearToDate.toString());
      
      console.log(`Generating ${reportType} report for client ${selectedClient}`);
      
      // Request report generation
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `/api/reports/${reportType}/${selectedClient}?${params.toString()}`,
        {
          method: 'GET',
          headers,
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log("Report generated successfully:", result);
        setReportData(result);
        setGeneratedReportUrl('/'); // Just a placeholder for UI state
      } else {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Failed to generate report: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error generating report:", error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  const resetForm = () => {
    setReportType("balance-sheet");
    setSelectedClient("");
    setSelectedFormat("pdf");
    setDateRangePreset("this-month");
    setShowZeroBalances(false);
    setIncludeSubaccounts(true);
    setCompareToPreviousPeriod(false);
    setCompareToYearToDate(false);
    setReportData(null);
    setGeneratedReportUrl(null);
  };
  
  const downloadReport = () => {
    if (!generatedReportUrl) {
      toast({
        title: "No Report Available",
        description: "Please generate a report first.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real implementation, you would trigger a download here
    toast({
      title: "Download Initiated",
      description: "Your report download should begin shortly.",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  const renderBalanceSheet = () => {
    if (!reportData || !reportData.assets) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assets */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">ASSETS</h3>
            
            {/* Current Assets */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Current Assets</h4>
              {reportData.assets.currentAssets?.accounts?.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Current Assets</span>
                <span>{formatCurrency(reportData.assets.currentAssets?.total || 0)}</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Fixed Assets</h4>
              {reportData.assets.fixedAssets?.accounts?.length > 0 ? (
                reportData.assets.fixedAssets.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No fixed assets</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Fixed Assets</span>
                <span>{formatCurrency(reportData.assets.fixedAssets?.total || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>TOTAL ASSETS</span>
              <span>{formatCurrency(reportData.totals?.totalAssets || 0)}</span>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">LIABILITIES & EQUITY</h3>
            
            {/* Current Liabilities */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Current Liabilities</h4>
              {reportData.liabilities.currentLiabilities?.accounts?.length > 0 ? (
                reportData.liabilities.currentLiabilities.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No current liabilities</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Current Liabilities</span>
                <span>{formatCurrency(reportData.liabilities.currentLiabilities?.total || 0)}</span>
              </div>
            </div>

            {/* Long-term Liabilities */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Long-term Liabilities</h4>
              {reportData.liabilities.longTermLiabilities?.accounts?.length > 0 ? (
                reportData.liabilities.longTermLiabilities.accounts.map((account: any) => (
                  <div key={account.id} className="flex justify-between py-2 pl-4">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.accountNumber}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 pl-4">No long-term liabilities</div>
              )}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Long-term Liabilities</span>
                <span>{formatCurrency(reportData.liabilities.longTermLiabilities?.total || 0)}</span>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="flex justify-between py-2 border-t font-bold mb-6">
              <span>Total Liabilities</span>
              <span>{formatCurrency(reportData.liabilities?.total || 0)}</span>
            </div>

            {/* Equity */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3">Equity</h4>
              {reportData.equity.accounts?.map((account: any) => (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Total Equity</span>
                <span>{formatCurrency(reportData.equity?.total || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatCurrency(reportData.totals?.totalLiabilitiesAndEquity || 0)}</span>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className={`text-center p-4 rounded-lg ${reportData.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <h3 className="font-bold text-lg">
            {reportData.isBalanced ? '✓ Balance Sheet is BALANCED' : '✗ Balance Sheet is NOT BALANCED'}
          </h3>
          <p>Assets = Liabilities + Equity</p>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!reportData || !reportData.accounts) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Debits</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.summary?.totalDebits || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Credits</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.totalCredits || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Status</h3>
              <p className={`text-2xl font-bold ${reportData.summary?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.summary?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Account</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Account Number</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Debit</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.accounts).map(([type, accounts]: [string, any]) => {
                if (!accounts || accounts.length === 0) return null;
                
                const typeName = type === 'costOfSales' ? 'Cost of Sales' : 
                                type.charAt(0).toUpperCase() + type.slice(1);
                
                return [
                  <tr key={`${type}-header`} className="bg-gray-100">
                    <td colSpan={4} className="border border-gray-300 px-4 py-2 font-bold">{typeName}</td>
                  </tr>,
                  ...accounts.map((account: any) => (
                    <tr key={account.id}>
                      <td className="border border-gray-300 px-4 py-2">{account.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{account.accountNumber}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}
                      </td>
                    </tr>
                  ))
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.income?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.expenses?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold">Net Income</h3>
              <p className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.netIncome || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Income */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">REVENUE</h3>
          {reportData.income?.accounts?.map((account: any) => (
            account.balance > 0 && (
              <div key={account.id} className="flex justify-between py-2 pl-4">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.accountNumber}</div>
                </div>
                <div className="font-medium">{formatCurrency(account.balance)}</div>
              </div>
            )
          ))}
          <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
            <span>Total Revenue</span>
            <span>{formatCurrency(reportData.income?.total || 0)}</span>
          </div>
        </div>

        {/* Cost of Sales */}
        {reportData.costOfSales?.total > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">COST OF SALES</h3>
            {reportData.costOfSales.accounts?.map((account: any) => (
              account.balance > 0 && (
                <div key={account.id} className="flex justify-between py-2 pl-4">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.accountNumber}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
              )
            ))}
            <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
              <span>Total Cost of Sales</span>
              <span>{formatCurrency(reportData.costOfSales.total)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-black font-bold text-xl">
              <span>GROSS PROFIT</span>
              <span>{formatCurrency(reportData.grossProfit || 0)}</span>
            </div>
          </div>
        )}

        {/* Expenses */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b-2 pb-2">EXPENSES</h3>
          {reportData.expenses?.accounts?.map((account: any) => (
            account.balance > 0 && (
              <div key={account.id} className="flex justify-between py-2 pl-4">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.accountNumber}</div>
                </div>
                <div className="font-medium">{formatCurrency(account.balance)}</div>
              </div>
            )
          ))}
          <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
            <span>Total Expenses</span>
            <span>{formatCurrency(reportData.expenses?.total || 0)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="flex justify-between py-4 border-t-4 border-black font-bold text-2xl">
          <span>NET INCOME</span>
          <span className={reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(reportData.netIncome || 0)}
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage financial reports for clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" onClick={downloadReport} disabled={!generatedReportUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="generate">
            <BarChart className="h-4 w-4 mr-2" />
            Generate Reports
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FileText className="h-4 w-4 mr-2" />
            Saved Reports
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Report Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="client">Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingClients ? (
                          <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                        ) : (
                          clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger id="report-type">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                        <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                        <SelectItem value="cash-flow">Cash Flow Statement</SelectItem>
                        <SelectItem value="trial-balance">Trial Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="date-range">Date Range</Label>
                    <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                      <SelectTrigger id="date-range">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {dateRangePreset === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="start-date">From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {formatDateDisplay(dateRange.startDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.startDate}
                              onSelect={(date) => date && setDateRange({ ...dateRange, startDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="end-date">To</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {formatDateDisplay(dateRange.endDate)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.endDate}
                              onSelect={(date) => date && setDateRange({ ...dateRange, endDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label htmlFor="format">Format</Label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger id="format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4 pt-3">
                    <Label className="block mb-2">Additional Options</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="zero-balances"
                        checked={showZeroBalances}
                        onCheckedChange={(checked) => setShowZeroBalances(!!checked)}
                      />
                      <Label
                        htmlFor="zero-balances"
                        className="text-sm font-normal"
                      >
                        Show accounts with zero balances
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="subaccounts"
                        checked={includeSubaccounts}
                        onCheckedChange={(checked) => setIncludeSubaccounts(!!checked)}
                      />
                      <Label
                        htmlFor="subaccounts"
                        className="text-sm font-normal"
                      >
                        Include subaccounts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compare-period"
                        checked={compareToPreviousPeriod}
                        onCheckedChange={(checked) => setCompareToPreviousPeriod(!!checked)}
                      />
                      <Label
                        htmlFor="compare-period"
                        className="text-sm font-normal"
                      >
                        Compare to previous period
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compare-ytd"
                        checked={compareToYearToDate}
                        onCheckedChange={(checked) => setCompareToYearToDate(!!checked)}
                      />
                      <Label
                        htmlFor="compare-ytd"
                        className="text-sm font-normal"
                      >
                        Compare to year-to-date
                      </Label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                    {isGeneratingReport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Report Output</CardTitle>
                </CardHeader>
                <CardContent>
                  {isGeneratingReport ? (
                    <div className="flex flex-col items-center justify-center space-y-4 h-96">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-lg font-medium">Generating Report...</p>
                      <p className="text-sm text-muted-foreground">This may take a few moments.</p>
                    </div>
                  ) : !reportData ? (
                    <div className="flex flex-col items-center justify-center space-y-4 h-96 text-center">
                      <div className="p-4 rounded-full bg-muted">
                        <BarChart2 className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium">No Report Generated</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Select a client and report type, then click "Generate Report" to view your financial data.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[32rem]">
                      {/* Common Header for All Reports */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold">
                          {reportType === "balance-sheet" && "Balance Sheet"}
                          {reportType === "profit-loss" && "Profit & Loss Statement"}
                          {reportType === "cash-flow" && "Cash Flow Statement"}
                          {reportType === "trial-balance" && "Trial Balance"}
                        </h2>
                        <p className="text-muted-foreground">
                          {clients.find((c: any) => c.id.toString() === selectedClient)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}
                        </p>
                      </div>

                      {/* Render the financial report based on the selected type and available data */}
                      <div className="border rounded-md p-4 bg-white relative">
                        {/* Safety check for missing data */}
                        {!reportData || Object.keys(reportData).length === 0 ? (
                          <div className="py-8 text-center">
                            <p>No data available for the selected report type and parameters.</p>
                          </div>
                        ) : (
                          /* Render the actual financial reports */
                          <div>
                            {reportType === "trial-balance" && renderTrialBalance()}
                            {reportType === "balance-sheet" && renderBalanceSheet()}
                            {reportType === "profit-loss" && renderProfitLoss()}
                            {reportType === "cash-flow" && (
                              <div className="py-8 text-center">
                                <p>Cash Flow Statement not yet implemented</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-4 h-64 text-center">
                <div className="p-4 rounded-full bg-muted">
                  <FileBox className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">No Saved Reports</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Generate a report and save it to access it later from this screen.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}