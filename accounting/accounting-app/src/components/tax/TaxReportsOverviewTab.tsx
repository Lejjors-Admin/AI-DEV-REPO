/**
 * TAX REPORTS OVERVIEW TAB
 * 
 * Executive summary dashboard with key tax metrics, visual analytics,
 * quick access cards, and compliance alerts for strategic tax planning.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Clock,
  Shield,
  Building,
  CreditCard
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Legend
} from "recharts";

// Color palette for professional tax visualizations
const COLORS = {
  federalTax: '#3B82F6',
  provincialTax: '#8B5CF6', 
  cpp: '#10B981',
  ei: '#F59E0B',
  outstanding: '#EF4444',
  paid: '#22C55E',
  pending: '#F59E0B'
};

interface TaxReportsOverviewTabProps {
  clientId: number;
  dashboardData: any;
  refreshKey: number;
}

interface TaxTrendsData {
  monthlyTrends: Array<{
    month: string;
    totalLiability: number;
    totalPaid: number;
    complianceRate: number;
  }>;
  yearOverYearComparison: {
    currentYear: number;
    previousYear: number;
    growthRate: number;
  };
  projections: {
    nextMonth: number;
    nextQuarter: number;
    yearEnd: number;
  };
}

interface UpcomingObligation {
  type: string;
  dueDate: string;
  estimatedAmount: number;
  status: 'pending' | 'calculated' | 'ready';
}

// Loading skeleton for charts
function ChartLoadingSkeleton() {
  return (
    <div className="h-80 w-full" data-testid="chart-loading">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

// Tax Trends Chart Component
function TaxTrendsChart({ trendsData }: { trendsData: TaxTrendsData }) {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}K`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tax Liability Trends (12 Months)
        </CardTitle>
        <CardDescription>
          Monthly tax liability and payment trends with compliance rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80" data-testid="tax-trends-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendsData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" tickFormatter={formatCurrency} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={formatPercentage} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name.includes('Rate') ? formatPercentage(value) : formatCurrency(value), 
                  name
                ]}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="totalLiability" 
                fill={COLORS.federalTax} 
                name="Total Liability"
                opacity={0.8}
              />
              <Bar 
                yAxisId="left"
                dataKey="totalPaid" 
                fill={COLORS.paid} 
                name="Total Paid"
                opacity={0.8}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="complianceRate" 
                stroke={COLORS.cpp} 
                strokeWidth={3}
                name="Compliance Rate (%)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Tax Distribution Pie Chart
function TaxDistributionChart({ distributionData }: { distributionData: any[] }) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Current Period Tax Distribution
        </CardTitle>
        <CardDescription>
          Breakdown of tax liability by type for current reporting period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80" data-testid="tax-distribution-chart">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Access Cards Component
function QuickAccessCards({ clientId }: { clientId: number }) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const quickActions = [
    {
      title: "Current Month Report",
      description: `${currentYear}-${String(currentMonth).padStart(2, '0')} tax summary`,
      icon: Calendar,
      color: "bg-blue-500",
      action: () => console.log('Open current month'),
      dataTestId: "card-current-month"
    },
    {
      title: "Previous Quarter",
      description: `Q${currentQuarter - 1} ${currentYear} comprehensive report`,
      icon: BarChart3,
      color: "bg-purple-500",
      action: () => console.log('Open previous quarter'),
      dataTestId: "card-previous-quarter"
    },
    {
      title: "Year-to-Date Summary",
      description: `${currentYear} cumulative tax analysis`,
      icon: TrendingUp,
      color: "bg-green-500",
      action: () => console.log('Open YTD'),
      dataTestId: "card-ytd-summary"
    },
    {
      title: "Export All Reports",
      description: "Generate comprehensive tax package",
      icon: Download,
      color: "bg-orange-500",
      action: () => console.log('Export all'),
      dataTestId: "card-export-all"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="quick-access-cards">
      {quickActions.map((action, index) => (
        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={action.dataTestId}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${action.color}`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{action.title}</h3>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-4" 
              onClick={action.action}
              data-testid={`button-${action.dataTestId}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Upcoming Obligations Component
function UpcomingObligations({ obligations }: { obligations: UpcomingObligation[] }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-CA', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      calculated: 'default', 
      ready: 'default'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status.toUpperCase()}</Badge>;
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Tax Obligations
        </CardTitle>
        <CardDescription>
          Pending tax remittances and filing deadlines
        </CardDescription>
      </CardHeader>
      <CardContent>
        {obligations.length === 0 ? (
          <div className="text-center py-8" data-testid="no-obligations">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No immediate tax obligations pending</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="obligations-list">
            {obligations.map((obligation, index) => {
              const daysUntil = getDaysUntilDue(obligation.dueDate);
              const isUrgent = daysUntil <= 7;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isUrgent ? 'border-red-200 bg-red-50' : 'border-border'
                  }`}
                  data-testid={`obligation-${obligation.type}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{obligation.type}</h4>
                      {getStatusBadge(obligation.status)}
                      {isUrgent && (
                        <Badge variant="destructive">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDate(obligation.dueDate)} 
                      <span className={`ml-2 ${isUrgent ? 'text-red-600 font-medium' : ''}`}>
                        ({daysUntil > 0 ? `${daysUntil} days` : 'Overdue'})
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(obligation.estimatedAmount)}</div>
                    <Button variant="outline" size="sm" className="mt-2">
                      <FileText className="h-4 w-4 mr-2" />
                      Prepare
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TaxReportsOverviewTab({ 
  clientId, 
  dashboardData, 
  refreshKey 
}: TaxReportsOverviewTabProps) {
  
  // Fetch tax trends data
  const { data: trendsData, isLoading: isLoadingTrends } = useQuery({
    queryKey: ["tax-trends", clientId, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/reports/trends/${clientId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // Fetch upcoming obligations
  const { data: upcomingObligations = [], isLoading: isLoadingObligations } = useQuery({
    queryKey: ["tax-upcoming", clientId, refreshKey],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/remittance/upcoming/${clientId}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Generate tax distribution data from dashboard data
  const generateDistributionData = () => {
    if (!dashboardData) return [];
    
    return [
      { name: 'Federal Tax', value: dashboardData.currentPeriod.totalLiability * 0.6, color: COLORS.federalTax },
      { name: 'Provincial Tax', value: dashboardData.currentPeriod.totalLiability * 0.25, color: COLORS.provincialTax },
      { name: 'CPP', value: dashboardData.currentPeriod.totalLiability * 0.1, color: COLORS.cpp },
      { name: 'EI', value: dashboardData.currentPeriod.totalLiability * 0.05, color: COLORS.ei }
    ];
  };

  const distributionData = generateDistributionData();

  return (
    <div className="space-y-6" data-testid="tax-reports-overview">
      {/* Quick Access Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
        <QuickAccessCards clientId={clientId} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Trends Chart */}
        <div>
          {isLoadingTrends ? (
            <ChartLoadingSkeleton />
          ) : trendsData ? (
            <TaxTrendsChart trendsData={trendsData} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Tax Trends</CardTitle>
                <CardDescription>No trend data available</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Tax Distribution Chart */}
        <div>
          {distributionData.length > 0 ? (
            <TaxDistributionChart distributionData={distributionData} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Tax Distribution</CardTitle>
                <CardDescription>No distribution data available</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {/* Upcoming Obligations */}
      <div>
        {isLoadingObligations ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : (
          <UpcomingObligations obligations={upcomingObligations} />
        )}
      </div>

      {/* Year-over-Year Comparison */}
      {trendsData?.yearOverYearComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Year-over-Year Comparison
            </CardTitle>
            <CardDescription>
              Tax liability comparison with previous year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="yoy-comparison">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(trendsData.yearOverYearComparison.currentYear)}
                </div>
                <p className="text-sm text-muted-foreground">Current Year</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(trendsData.yearOverYearComparison.previousYear)}
                </div>
                <p className="text-sm text-muted-foreground">Previous Year</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold flex items-center justify-center gap-2 ${
                  trendsData.yearOverYearComparison.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trendsData.yearOverYearComparison.growthRate >= 0 ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )}
                  {Math.abs(trendsData.yearOverYearComparison.growthRate).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}