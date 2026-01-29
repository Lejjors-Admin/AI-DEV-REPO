/**
 * TAX REPORTS DASHBOARD - CANADIAN TAX REPORTING SYSTEM
 * 
 * Executive-level financial dashboard with comprehensive tax liability summaries,
 * export capabilities, and visual analytics for strategic tax planning and CRA compliance.
 * 
 * Features:
 * - Overview Tab: Executive summary with key metrics and alerts
 * - Monthly Reports: Detailed monthly breakdowns with trends
 * - Quarterly Reports: CRA-compliant quarterly summaries
 * - Annual Summary: Year-end reporting with T4 integration
 * - Export Center: Multi-format export capabilities
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  FileBarChart, 
  TrendingUp, 
  Calendar, 
  Building2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Download,
  RefreshCw,
  Filter,
  Settings,
  Bell,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Eye,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";


// Import shared components
import { ClientSelector } from "@/components/ClientSelector";
import TaxReportsOverviewTab from "@/components/tax/TaxReportsOverviewTab";
import TaxQuarterlyReportsTab from "@/components/tax/TaxQuarterlyReportsTab";
import TaxExportCenterTab from "@/components/tax/TaxExportCenterTab";
import TaxAnnualSummaryTab from "@/components/tax/TaxAnnualSummaryTab";
import TaxMonthlyReportsTab from "@/components/tax/TaxMonthlyReportsTab";

// Types
interface TaxDashboardSummary {
  currentPeriod: {
    totalLiability: number;
    totalPaid: number;
    outstanding: number;
    upcomingDue: number;
  };
  ytd: {
    totalPayroll: number;
    totalTaxes: number;
    totalRemittances: number;
    complianceRate: number;
  };
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    message: string;
    actionRequired: boolean;
  }>;
}

// Loading State Component
function TaxDashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="tax-dashboard-loading">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Error State Component
function TaxDashboardErrorState({ error, retry }: { error: any, retry: () => void }) {
  return (
    <Card className="border-destructive" data-testid="tax-dashboard-error">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Error Loading Tax Dashboard
        </CardTitle>
        <CardDescription>
          {error?.message || "Unable to load tax dashboard data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={retry} className="flex items-center gap-2" data-testid="button-retry-tax-dashboard">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// Summary Cards Component
function TaxSummaryCards({ summary }: { summary: TaxDashboardSummary }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const formatPercentage = (rate: number) => `${rate.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="tax-summary-cards">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Liability</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-current-liability">
            {formatCurrency(summary.currentPeriod.totalLiability)}
          </div>
          <p className="text-xs text-muted-foreground">
            This month's total tax liability
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600" data-testid="text-outstanding-balance">
            {formatCurrency(summary.currentPeriod.outstanding)}
          </div>
          <p className="text-xs text-muted-foreground">
            Amount pending payment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">YTD Remittances</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="text-ytd-remittances">
            {formatCurrency(summary.ytd.totalRemittances)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total payments made this year
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="text-compliance-score">
            {formatPercentage(summary.ytd.complianceRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            Overall compliance rating
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Alerts Component
function ComplianceAlerts({ alerts }: { alerts: TaxDashboardSummary['alerts'] }) {
  if (alerts.length === 0) {
    return (
      <Card data-testid="no-alerts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            No Active Alerts
          </CardTitle>
          <CardDescription>All tax obligations are current</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card data-testid="compliance-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Active Alerts ({alerts.length})
        </CardTitle>
        <CardDescription>Tax compliance notifications requiring attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert key={index} data-testid={`alert-${alert.type}`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              {alert.message}
              <Badge variant={getSeverityColor(alert.severity) as any}>
                {alert.severity.toUpperCase()}
              </Badge>
            </AlertTitle>
            {alert.actionRequired && (
              <AlertDescription>
                Immediate action required to maintain compliance
              </AlertDescription>
            )}
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

interface TaxReportsDashboardProps {
  clientId?: string;
}

export default function TaxReportsDashboard({ clientId }: TaxReportsDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch available clients
  const { data: clientsResp = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: !clientId || clientId === "",
  });
  
  const clients = Array.isArray(clientsResp) ? clientsResp : [];
  
  // Determine the client ID to use
  const getActiveClientId = () => {
    if (clientId && clientId !== "") {
      return parseInt(clientId);
    }
    if (clients && clients.length > 0) {
      return clients[0].id;
    }
    return null;
  };
  
  const selectedClientId = getActiveClientId();
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Fetch dashboard summary data
  const { 
    data: dashboardSummary, 
    isLoading: isLoadingSummary, 
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ["tax-dashboard", selectedClientId, refreshKey],
    enabled: !!selectedClientId,
    queryFn: async () => {
      console.log(`Fetching tax dashboard for client ${selectedClientId}`);
      const response = await apiRequest('GET', `/api/tax/reports/dashboard/${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // Refresh function
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Refreshing Data",
      description: "Tax reports data is being updated...",
    });
  };

  // Loading state
  if (isLoadingSummary) {
    return <TaxDashboardLoadingSkeleton />;
  }

  // Error state
  if (summaryError) {
    return <TaxDashboardErrorState error={summaryError} retry={refetchSummary} />;
  }

  return (
    <div className="space-y-6" data-testid="tax-reports-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-tax-reports">
            Tax Reports Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive Canadian tax reporting and compliance analytics
            {selectedClient && (
              <span className="font-medium text-foreground ml-2">
                • {selectedClient.businessName}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            className="flex items-center gap-2"
            data-testid="button-generate-report"
          >
            <Download className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Client Selector */}
      {(!clientId || clientId === "") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Client
            </CardTitle>
            <CardDescription>Choose a client to view their tax reports and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientSelector 
              updateClientId={(clientId: number | null) => {
                // Handle client selection - could use navigation or state management
                console.log('Selected client ID:', clientId);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {selectedClientId && dashboardSummary && (
        <>
          {/* Summary Cards */}
          <TaxSummaryCards summary={dashboardSummary} />

          {/* Alerts */}
          <ComplianceAlerts alerts={dashboardSummary.alerts} />

          {/* Main Dashboard Tabs */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tax Reports & Analytics</CardTitle>
                    <CardDescription>
                      Detailed tax liability summaries, compliance tracking, and export capabilities
                    </CardDescription>
                  </div>
                  <TabsList className="grid w-auto grid-cols-5">
                    <TabsTrigger value="overview" data-testid="tab-overview">
                      <Eye className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="monthly" data-testid="tab-monthly">
                      <Calendar className="h-4 w-4 mr-2" />
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="quarterly" data-testid="tab-quarterly">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Quarterly
                    </TabsTrigger>
                    <TabsTrigger value="annual" data-testid="tab-annual">
                      <PieChart className="h-4 w-4 mr-2" />
                      Annual
                    </TabsTrigger>
                    <TabsTrigger value="export" data-testid="tab-export">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <CardContent>
                <TabsContent value="overview">
                  <TaxReportsOverviewTab 
                    clientId={selectedClientId} 
                    dashboardData={dashboardSummary}
                    refreshKey={refreshKey}
                  />
                </TabsContent>

                <TabsContent value="monthly">
                  <TaxMonthlyReportsTab 
                    clientId={selectedClientId}
                    refreshKey={refreshKey}
                  />
                </TabsContent>

                <TabsContent value="quarterly">
                  <TaxQuarterlyReportsTab 
                    clientId={selectedClientId}
                    refreshKey={refreshKey}
                  />
                </TabsContent>

                <TabsContent value="annual">
                  <TaxAnnualSummaryTab 
                    clientId={selectedClientId}
                    refreshKey={refreshKey}
                  />
                </TabsContent>

                <TabsContent value="export">
                  <TaxExportCenterTab 
                    clientId={selectedClientId}
                    refreshKey={refreshKey}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}

      {/* No Client Selected State */}
      {!selectedClientId && (
        <Card data-testid="no-client-selected">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              No Client Selected
            </CardTitle>
            <CardDescription>
              Please select a client to view tax reports and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Generate Tax Reports</h3>
              <p className="text-muted-foreground max-w-md">
                Select a client above to view comprehensive tax liability summaries, 
                compliance analytics, and export professional reports for CRA filing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}