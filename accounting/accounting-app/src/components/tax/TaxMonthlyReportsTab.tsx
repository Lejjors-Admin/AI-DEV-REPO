/**
 * TAX MONTHLY REPORTS TAB
 * 
 * Detailed monthly tax liability breakdowns with interactive month selection,
 * trend analysis, drill-down capabilities, and export functionality.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  DollarSign,
  Users,
  Percent,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Legend,
  Area,
  AreaChart
} from "recharts";

// Color palette for tax type visualization
const TAX_COLORS = {
  federalTax: '#3B82F6',
  provincialTax: '#8B5CF6', 
  cppEmployee: '#10B981',
  cppEmployer: '#059669',
  eiEmployee: '#F59E0B',
  eiEmployer: '#D97706',
  totalLiability: '#1F2937'
};

interface TaxMonthlyReportsTabProps {
  clientId: number;
  refreshKey: number;
}

interface MonthlyTaxSummary {
  period: string;
  periodStart: string;
  periodEnd: string;
  totalFederalTax: number;
  totalProvincialTax: number;
  totalCppEmployee: number;
  totalCppEmployer: number;
  totalEiEmployee: number;
  totalEiEmployer: number;
  totalEmployeeDeductions: number;
  totalEmployerContributions: number;
  totalCppRemittance: number;
  totalEiRemittance: number;
  totalTaxRemittance: number;
  totalRemittanceRequired: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  penaltyAmount: number;
  interestAmount: number;
  employeeCount: number;
  isCompliant: boolean;
  complianceIssues: string[];
}

interface PayrollTaxBreakdown {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonusPay: number;
  federalTax: number;
  provincialTax: number;
  cppEmployee: number;
  eiEmployee: number;
  cppEmployer: number;
  eiEmployer: number;
  totalDeductions: number;
  netPay: number;
  ytdGrossPay: number;
  ytdFederalTax: number;
  ytdProvincialTax: number;
  ytdCppEmployee: number;
  ytdEiEmployee: number;
}

// Month selector component
function MonthSelector({ 
  selectedYear, 
  selectedMonth, 
  onYearChange, 
  onMonthChange 
}: {
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        onYearChange(selectedYear - 1);
        onMonthChange(12);
      } else {
        onMonthChange(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        onYearChange(selectedYear + 1);
        onMonthChange(1);
      } else {
        onMonthChange(selectedMonth + 1);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Select Reporting Period
        </CardTitle>
        <CardDescription>
          Choose the month and year for detailed tax liability analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4" data-testid="month-selector">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateMonth('prev')}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value))}>
              <SelectTrigger className="w-32" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
              <SelectTrigger className="w-24" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateMonth('next')}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Monthly summary card component
function MonthlySummaryCard({ summary }: { summary: MonthlyTaxSummary }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Monthly Tax Summary</span>
          <Badge variant={summary.isCompliant ? "default" : "destructive"} data-testid="compliance-badge">
            {summary.isCompliant ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Compliant
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                Issues Found
              </>
            )}
          </Badge>
        </CardTitle>
        <CardDescription>
          Tax liability breakdown for {summary.period}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="monthly-summary-metrics">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-liability">
              {formatCurrency(summary.totalRemittanceRequired)}
            </div>
            <p className="text-sm text-muted-foreground">Total Liability</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-paid">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-outstanding">
              {formatCurrency(summary.outstanding)}
            </div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="text-employee-count">
              {summary.employeeCount}
            </div>
            <p className="text-sm text-muted-foreground">Employees</p>
          </div>
        </div>

        {summary.complianceIssues.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="compliance-issues">
            <h4 className="font-semibold text-red-800 mb-2">Compliance Issues:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {summary.complianceIssues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tax breakdown chart component
function TaxBreakdownChart({ summary }: { summary: MonthlyTaxSummary }) {
  const data = [
    {
      name: 'Tax Breakdown',
      federalTax: summary.totalFederalTax,
      provincialTax: summary.totalProvincialTax,
      cppEmployee: summary.totalCppEmployee,
      cppEmployer: summary.totalCppEmployer,
      eiEmployee: summary.totalEiEmployee,
      eiEmployer: summary.totalEiEmployer
    }
  ];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Tax Liability Breakdown
        </CardTitle>
        <CardDescription>
          Detailed breakdown by tax type for {summary.period}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80" data-testid="tax-breakdown-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="federalTax" name="Federal Tax" fill={TAX_COLORS.federalTax} />
              <Bar dataKey="provincialTax" name="Provincial Tax" fill={TAX_COLORS.provincialTax} />
              <Bar dataKey="cppEmployee" name="CPP Employee" fill={TAX_COLORS.cppEmployee} />
              <Bar dataKey="cppEmployer" name="CPP Employer" fill={TAX_COLORS.cppEmployer} />
              <Bar dataKey="eiEmployee" name="EI Employee" fill={TAX_COLORS.eiEmployee} />
              <Bar dataKey="eiEmployer" name="EI Employer" fill={TAX_COLORS.eiEmployer} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Payroll breakdown table component
function PayrollBreakdownTable({ breakdownData }: { breakdownData: PayrollTaxBreakdown[] }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Employee Payroll Tax Breakdown
        </CardTitle>
        <CardDescription>
          Detailed tax deductions and contributions by employee
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" data-testid="payroll-breakdown-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Federal Tax</TableHead>
                <TableHead>Provincial Tax</TableHead>
                <TableHead>CPP Employee</TableHead>
                <TableHead>EI Employee</TableHead>
                <TableHead>Total Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdownData.map((employee) => (
                <TableRow key={employee.employeeId} data-testid={`row-employee-${employee.employeeId}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.employeeName}</div>
                      <div className="text-sm text-muted-foreground">#{employee.employeeNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(employee.grossPay)}</TableCell>
                  <TableCell>{formatCurrency(employee.federalTax)}</TableCell>
                  <TableCell>{formatCurrency(employee.provincialTax)}</TableCell>
                  <TableCell>{formatCurrency(employee.cppEmployee)}</TableCell>
                  <TableCell>{formatCurrency(employee.eiEmployee)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(employee.totalDeductions)}</TableCell>
                  <TableCell className="font-medium text-green-600">{formatCurrency(employee.netPay)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" data-testid={`button-view-employee-${employee.employeeId}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaxMonthlyReportsTab({ clientId, refreshKey }: TaxMonthlyReportsTabProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Fetch monthly tax summary
  const { 
    data: monthlySummary, 
    isLoading: isLoadingSummary, 
    error: summaryError 
  } = useQuery({
    queryKey: ["tax-monthly-summary", clientId, selectedYear, selectedMonth, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/reports/monthly/${clientId}/${selectedYear}/${selectedMonth}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // Fetch payroll breakdown
  const { 
    data: payrollBreakdown = [], 
    isLoading: isLoadingBreakdown 
  } = useQuery({
    queryKey: ["tax-payroll-breakdown", clientId, selectedYear, selectedMonth, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/reports/payroll/${clientId}/${selectedYear}/${selectedMonth}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await apiRequest('POST', '/api/tax/reports/export', {
        clientId,
        reportType: 'monthly',
        period: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
        format,
        includeDetails: true
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `monthly-tax-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="tax-monthly-reports">
      {/* Month Selection */}
      <MonthSelector
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Export Options</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('pdf')}
                data-testid="button-export-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('excel')}
                data-testid="button-export-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('csv')}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Export detailed monthly tax reports in your preferred format
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isLoadingSummary && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {/* Error State */}
      {summaryError && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Monthly Report</CardTitle>
            <CardDescription>
              {summaryError.message || "Unable to load monthly tax data"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Monthly Summary */}
      {monthlySummary && (
        <>
          <MonthlySummaryCard summary={monthlySummary} />
          <TaxBreakdownChart summary={monthlySummary} />
        </>
      )}

      {/* Payroll Breakdown */}
      {isLoadingBreakdown ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : payrollBreakdown.length > 0 ? (
        <PayrollBreakdownTable breakdownData={payrollBreakdown} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Payroll Data</CardTitle>
            <CardDescription>
              No payroll data found for {selectedYear}-{String(selectedMonth).padStart(2, '0')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}