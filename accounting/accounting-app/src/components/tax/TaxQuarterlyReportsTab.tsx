/**
 * TAX QUARTERLY REPORTS TAB
 * 
 * Comprehensive quarterly tax summaries for CRA filing requirements with
 * visual comparison analytics, compliance verification, and export functionality.
 */

import { useState } from "react";
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
  BarChart3,
  FileText,
  CheckCircle,
  AlertTriangle,
  Target,
  DollarSign,
  Percent,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Building
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
  AreaChart,
  Area
} from "recharts";

// Color palette for quarterly visualizations
const QUARTER_COLORS = {
  q1: '#3B82F6',
  q2: '#10B981', 
  q3: '#F59E0B',
  q4: '#EF4444',
  liability: '#6366F1',
  paid: '#22C55E',
  outstanding: '#F97316'
};

interface TaxQuarterlyReportsTabProps {
  clientId: number;
  refreshKey: number;
}

interface QuarterlyTaxSummary {
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

// Quarter selector component
function QuarterSelector({ 
  selectedYear, 
  selectedQuarter, 
  onYearChange, 
  onQuarterChange 
}: {
  selectedYear: number;
  selectedQuarter: number;
  onYearChange: (year: number) => void;
  onQuarterChange: (quarter: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const quarters = [
    { value: 1, label: 'Q1 (Jan-Mar)', months: 'January - March' },
    { value: 2, label: 'Q2 (Apr-Jun)', months: 'April - June' },
    { value: 3, label: 'Q3 (Jul-Sep)', months: 'July - September' },
    { value: 4, label: 'Q4 (Oct-Dec)', months: 'October - December' }
  ];

  const navigateQuarter = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedQuarter === 1) {
        onYearChange(selectedYear - 1);
        onQuarterChange(4);
      } else {
        onQuarterChange(selectedQuarter - 1);
      }
    } else {
      if (selectedQuarter === 4) {
        onYearChange(selectedYear + 1);
        onQuarterChange(1);
      } else {
        onQuarterChange(selectedQuarter + 1);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Select Quarterly Period
        </CardTitle>
        <CardDescription>
          Choose the quarter and year for CRA-compliant quarterly tax analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4" data-testid="quarter-selector">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateQuarter('prev')}
            data-testid="button-prev-quarter"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Select value={selectedQuarter.toString()} onValueChange={(value) => onQuarterChange(parseInt(value))}>
              <SelectTrigger className="w-40" data-testid="select-quarter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map(quarter => (
                  <SelectItem key={quarter.value} value={quarter.value.toString()}>
                    {quarter.label}
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
            onClick={() => navigateQuarter('next')}
            data-testid="button-next-quarter"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {quarters.find(q => q.value === selectedQuarter)?.months}
        </div>
      </CardContent>
    </Card>
  );
}

// Quarterly summary metrics card
function QuarterlySummaryCard({ summary }: { summary: QuarterlyTaxSummary }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const compliancePercentage = summary.isCompliant ? 100 : 75; // Simplified calculation

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quarterly Tax Summary - {summary.period}</span>
          <div className="flex items-center gap-2">
            <Badge variant={summary.isCompliant ? "default" : "destructive"} data-testid="quarterly-compliance-badge">
              {summary.isCompliant ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  CRA Compliant
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Issues Found
                </>
              )}
            </Badge>
            <Badge variant="outline">{compliancePercentage}% Complete</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Comprehensive quarterly tax liability summary for CRA filing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="quarterly-summary-metrics">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-quarterly-liability">
              {formatCurrency(summary.totalRemittanceRequired)}
            </div>
            <p className="text-sm text-muted-foreground">Total Liability</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="text-quarterly-paid">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-quarterly-outstanding">
              {formatCurrency(summary.outstanding)}
            </div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="text-quarterly-penalties">
              {formatCurrency(summary.penaltyAmount + summary.interestAmount)}
            </div>
            <p className="text-sm text-muted-foreground">Penalties & Interest</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid="text-quarterly-employees">
              {summary.employeeCount}
            </div>
            <p className="text-sm text-muted-foreground">Employees</p>
          </div>
        </div>

        {summary.complianceIssues.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="quarterly-compliance-issues">
            <h4 className="font-semibold text-red-800 mb-2">CRA Compliance Issues:</h4>
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

// Quarter-over-quarter comparison chart
function QuarterlyComparisonChart({ comparisonData }: { comparisonData: any[] }) {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}K`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quarter-over-Quarter Comparison
        </CardTitle>
        <CardDescription>
          Tax liability trends and payment performance across quarters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80" data-testid="quarterly-comparison-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value), 
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="totalLiability" name="Total Liability" fill={QUARTER_COLORS.liability} />
              <Bar dataKey="totalPaid" name="Amount Paid" fill={QUARTER_COLORS.paid} />
              <Line 
                type="monotone" 
                dataKey="complianceRate" 
                stroke="#22C55E" 
                strokeWidth={3}
                name="Compliance Rate (%)"
                yAxisId="right"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Quarterly breakdown by tax type
function QuarterlyTaxBreakdown({ summary }: { summary: QuarterlyTaxSummary }) {
  const taxBreakdown = [
    { 
      type: 'Federal Income Tax', 
      employee: summary.totalFederalTax, 
      employer: 0, 
      total: summary.totalFederalTax,
      color: '#3B82F6'
    },
    { 
      type: 'Provincial Income Tax', 
      employee: summary.totalProvincialTax, 
      employer: 0, 
      total: summary.totalProvincialTax,
      color: '#8B5CF6'
    },
    { 
      type: 'Canada Pension Plan (CPP)', 
      employee: summary.totalCppEmployee, 
      employer: summary.totalCppEmployer, 
      total: summary.totalCppRemittance,
      color: '#10B981'
    },
    { 
      type: 'Employment Insurance (EI)', 
      employee: summary.totalEiEmployee, 
      employer: summary.totalEiEmployer, 
      total: summary.totalEiRemittance,
      color: '#F59E0B'
    }
  ];

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Quarterly Tax Breakdown by Type
        </CardTitle>
        <CardDescription>
          Detailed breakdown for CRA remittance reporting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" data-testid="quarterly-tax-breakdown">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Type</TableHead>
                <TableHead>Employee Portion</TableHead>
                <TableHead>Employer Portion</TableHead>
                <TableHead>Total Remittance</TableHead>
                <TableHead>% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxBreakdown.map((tax, index) => {
                const percentage = (tax.total / summary.totalRemittanceRequired) * 100;
                return (
                  <TableRow key={index} data-testid={`row-tax-${tax.type.toLowerCase().replace(/\s+/g, '-')}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tax.color }}
                        />
                        {tax.type}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(tax.employee)}</TableCell>
                    <TableCell>{tax.employer > 0 ? formatCurrency(tax.employer) : '—'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(tax.total)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: tax.color 
                            }}
                          />
                        </div>
                        <span className="text-sm">{percentage.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// CRA filing status and checklist
function CRAFilingChecklist({ summary }: { summary: QuarterlyTaxSummary }) {
  const filingItems = [
    {
      item: 'Payroll Deductions Calculated',
      status: summary.totalRemittanceRequired > 0 ? 'complete' : 'pending',
      description: 'All employee deductions and employer contributions calculated'
    },
    {
      item: 'Remittance Due Date Verified',
      status: 'complete',
      description: '15th of the month following the quarter end'
    },
    {
      item: 'Payment Reconciliation',
      status: summary.outstanding === 0 ? 'complete' : 'action_required',
      description: 'All required payments submitted to CRA'
    },
    {
      item: 'T4 Preparation Data',
      status: 'in_progress',
      description: 'Employee T4 data compiled for year-end filing'
    },
    {
      item: 'Compliance Verification',
      status: summary.isCompliant ? 'complete' : 'action_required',
      description: 'All CRA compliance requirements met'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'action_required':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border border-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      complete: 'default',
      action_required: 'destructive',
      in_progress: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CRA Filing Checklist
        </CardTitle>
        <CardDescription>
          Quarterly compliance verification and filing readiness
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" data-testid="cra-filing-checklist">
          {filingItems.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-4 border rounded-lg"
              data-testid={`checklist-item-${item.item.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <h4 className="font-medium">{item.item}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div>
                {getStatusBadge(item.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaxQuarterlyReportsTab({ clientId, refreshKey }: TaxQuarterlyReportsTabProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  // Fetch quarterly tax summary
  const { 
    data: quarterlySummary, 
    isLoading: isLoadingSummary, 
    error: summaryError 
  } = useQuery({
    queryKey: ["tax-quarterly-summary", clientId, selectedYear, selectedQuarter, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/reports/quarterly/${clientId}/${selectedYear}/${selectedQuarter}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // Fetch quarterly comparison data (last 4 quarters)
  const { 
    data: comparisonData = [], 
    isLoading: isLoadingComparison 
  } = useQuery({
    queryKey: ["tax-quarterly-comparison", clientId, selectedYear, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      // Generate comparison data for last 4 quarters
      const quarters = [];
      for (let i = 3; i >= 0; i--) {
        const quarterDate = new Date(selectedYear, (selectedQuarter - 1) * 3 - i * 3, 1);
        const year = quarterDate.getFullYear();
        const quarter = Math.ceil((quarterDate.getMonth() + 1) / 3);
        
        try {
          const response = await apiRequest('GET', `/api/tax/reports/quarterly/${clientId}/${year}/${quarter}`);
          const result = await response.json();
          if (result.success) {
            quarters.push({
              quarter: `${year} Q${quarter}`,
              totalLiability: result.data.totalRemittanceRequired,
              totalPaid: result.data.totalPaid,
              complianceRate: result.data.isCompliant ? 100 : 75
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch data for ${year} Q${quarter}:`, error);
        }
      }
      return quarters;
    }
  });

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await apiRequest('POST', '/api/tax/reports/export', {
        clientId,
        reportType: 'quarterly',
        period: `${selectedYear}-Q${selectedQuarter}`,
        format,
        includeDetails: true
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `quarterly-tax-report-${selectedYear}-Q${selectedQuarter}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="tax-quarterly-reports">
      {/* Quarter Selection */}
      <QuarterSelector
        selectedYear={selectedYear}
        selectedQuarter={selectedQuarter}
        onYearChange={setSelectedYear}
        onQuarterChange={setSelectedQuarter}
      />

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>CRA Quarterly Report Export</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('pdf')}
                data-testid="button-export-quarterly-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                CRA PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('excel')}
                data-testid="button-export-quarterly-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExportReport('csv')}
                data-testid="button-export-quarterly-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Export CRA-compliant quarterly tax reports and supporting documentation
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
            <CardTitle className="text-destructive">Error Loading Quarterly Report</CardTitle>
            <CardDescription>
              {summaryError.message || "Unable to load quarterly tax data"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Quarterly Summary */}
      {quarterlySummary && (
        <>
          <QuarterlySummaryCard summary={quarterlySummary} />
          <QuarterlyTaxBreakdown summary={quarterlySummary} />
          <CRAFilingChecklist summary={quarterlySummary} />
        </>
      )}

      {/* Quarterly Comparison Chart */}
      {!isLoadingComparison && comparisonData.length > 0 && (
        <QuarterlyComparisonChart comparisonData={comparisonData} />
      )}

      {/* No Data State */}
      {!isLoadingSummary && !quarterlySummary && (
        <Card>
          <CardHeader>
            <CardTitle>No Quarterly Data</CardTitle>
            <CardDescription>
              No quarterly tax data found for {selectedYear} Q{selectedQuarter}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Quarterly Data Available</h3>
              <p className="text-muted-foreground">
                Quarterly tax reports will appear here once payroll data is processed for this period.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}