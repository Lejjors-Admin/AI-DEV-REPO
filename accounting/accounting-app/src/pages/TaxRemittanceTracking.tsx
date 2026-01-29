/**
 * CANADIAN TAX REMITTANCE TRACKING INTERFACE
 * 
 * Comprehensive tax remittance tracking interface for Canadian businesses
 * Integrates with 40+ backend tax API endpoints for complete CRA compliance
 * 
 * Features:
 * - Remittance Schedule Dashboard
 * - Payment Recording System  
 * - Due Date Tracking
 * - Compliance Monitoring
 * - Payment History & Audit Trail
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Shield,
  Building,
  RefreshCw,
  Download,
  Plus,
  Eye,
  Filter,
  Search,
  BarChart3,
  CreditCard,
  History,
  Settings,
  Info,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
// Import shared components
import { ClientSelector } from "@/components/ClientSelector";
import RemittanceOverviewTab from "@/components/remittance/RemittanceOverviewTab";
import RemittanceScheduleTab from "@/components/remittance/RemittanceScheduleTab";
import RemittanceHistoryTab from "@/components/remittance/RemittanceHistoryTab";
import RemittanceComplianceTab from "@/components/remittance/RemittanceComplianceTab";
import RemittancePaymentsTab from "@/components/remittance/RemittancePaymentsTab";
import { Remittance, RemittanceSchedule } from "@/lib/types";

// Loading and Error State Components
function TaxRemittanceLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="tax-remittance-loading">
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

function TaxRemittanceErrorState({ error, retry }: { error: any, retry: () => void }) {
  return (
    <Card className="border-destructive" data-testid="tax-remittance-error">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Error Loading Tax Remittance Data
        </CardTitle>
        <CardDescription>
          {error?.message || "Unable to load tax remittance data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={retry} className="flex items-center gap-2" data-testid="button-retry-tax-remittance">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

interface TaxRemittanceTrackingProps {
  clientId?: string;
}

export default function TaxRemittanceTracking({ clientId }: TaxRemittanceTrackingProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  // Fetch remittance schedules
  const { 
    data: remittanceSchedules = [], 
    isLoading: isLoadingSchedules, 
    error: schedulesError,
    refetch: refetchSchedules 
  } = useQuery({
    queryKey: ["tax-remittances", selectedClientId, selectedYear, refreshKey],
    enabled: !!selectedClientId,
    queryFn: async () => {
      console.log(`Fetching remittance schedules for client ${selectedClientId}, year ${selectedYear}`);
      const response = await apiRequest('GET', `/api/tax/remittance/schedules/${selectedClientId}?year=${selectedYear}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch remittance payments
  const { 
    data: remittancePayments = [], 
    isLoading: isLoadingPayments, 
    error: paymentsError,
    refetch: refetchPayments 
  } = useQuery({
    queryKey: ["tax-payments", selectedClientId, selectedYear, refreshKey],
    enabled: !!selectedClientId,
    queryFn: async () => {
      console.log(`Fetching remittance payments for client ${selectedClientId}, year ${selectedYear}`);
      const response = await apiRequest('GET', `/api/tax/remittance/payments/${selectedClientId}?year=${selectedYear}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch compliance status
  const { 
    data: complianceStatus, 
    isLoading: isLoadingCompliance, 
    error: complianceError,
    refetch: refetchCompliance 
  } = useQuery({
    queryKey: ["tax-compliance", selectedClientId, refreshKey],
    enabled: !!selectedClientId,
    queryFn: async () => {
      console.log(`Fetching compliance status for client ${selectedClientId}`);
      const response = await apiRequest('GET', `/api/tax/compliance/${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    }
  });

  // Fetch due dates for current year
  const { 
    data: dueDates = [], 
    isLoading: isLoadingDueDates, 
    error: dueDatesError,
    refetch: refetchDueDates 
  } = useQuery({
    queryKey: ["tax-due-dates", selectedClientId, selectedYear, refreshKey],
    enabled: !!selectedClientId,
    queryFn: async () => {
      console.log(`Fetching due dates for client ${selectedClientId}, year ${selectedYear}`);
      const response = await apiRequest('GET', `/api/tax/due-dates/${selectedClientId}/${selectedYear}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  const isLoading = isLoadingSchedules || isLoadingPayments || isLoadingCompliance || isLoadingDueDates;
  const hasErrors = schedulesError || paymentsError || complianceError || dueDatesError;

  // Refresh all data
  const refreshAllData = () => {
    setRefreshKey(prev => prev + 1);
    refetchSchedules();
    refetchPayments();
    refetchCompliance();
    refetchDueDates();
    toast({
      title: "Data Refreshed",
      description: "Tax remittance data has been updated successfully.",
      variant: "default"
    });
  };

  // Show error if no valid client selected
  useEffect(() => {
    if (!selectedClientId && !clientId) {
      toast({
        title: "No Client Selected", 
        description: "Please select a client to view tax remittance data.",
        variant: "destructive"
      });
    }
  }, [selectedClientId, clientId, toast]);

  // Show loading skeleton if data is loading
  if (isLoading) {
    return <TaxRemittanceLoadingSkeleton />;
  }

  // Show error state if there are errors
  if (hasErrors) {
    return (
      <TaxRemittanceErrorState
        error={schedulesError || paymentsError || complianceError || dueDatesError}
        retry={refreshAllData}
      />
    );
  }

  // Calculate summary metrics
  const totalOutstanding = remittanceSchedules
    .filter((schedule: RemittanceSchedule) => schedule.status === 'pending' || schedule.status === 'overdue')
    .reduce((sum: number, schedule: RemittanceSchedule) => sum + parseFloat(schedule.amount.toString()), 0);

  const ytdPayments = remittancePayments
    .reduce((sum: number, payment: Remittance) => sum + parseFloat(payment.amount.toString()), 0);

  const overdueCount = remittanceSchedules
    .filter((schedule: RemittanceSchedule) => schedule.status === 'overdue').length;

  const nextDueDate = dueDates
    .filter((date: any) => new Date(date.dueDate) > new Date())
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="space-y-6 p-6" data-testid="tax-remittance-tracking">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Tax Remittance Tracking
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Canadian tax remittance management with CRA compliance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={refreshAllData}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-refresh-data"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            onClick={() => setActiveTab("payments")}
            className="flex items-center gap-2"
            data-testid="button-record-payment"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Client Selection - only show if no clientId provided */}
      {(!clientId || clientId === "") && clients.length > 0 && (
        <Card data-testid="client-selection-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Select Client
            </CardTitle>
            <CardDescription>
              Choose a client to view their tax remittance data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientSelector 
              clients={clients}
              selectedClientId={selectedClientId}
              onClientChange={(client) => {
                // This would trigger a re-render with the new client
                window.location.href = `/tax-remittances/${client.id}`;
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Alert Banners */}
      {overdueCount > 0 && (
        <Alert variant="destructive" data-testid="overdue-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Overdue Remittances</AlertTitle>
          <AlertDescription>
            You have {overdueCount} overdue tax remittances requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {nextDueDate && (
        <Alert data-testid="upcoming-due-date-alert">
          <Clock className="h-4 w-4" />
          <AlertTitle>Next Due Date</AlertTitle>
          <AlertDescription>
            {nextDueDate.taxType} remittance of ${parseFloat(nextDueDate.amount).toLocaleString()} 
            due on {new Date(nextDueDate.dueDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Next Due Date</CardDescription>
            <CardTitle className="text-2xl">
              {nextDueDate ? new Date(nextDueDate.dueDate).toLocaleDateString() : "None"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {nextDueDate ? `${nextDueDate.taxType} - $${parseFloat(nextDueDate.amount).toLocaleString()}` : "No upcoming dues"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outstanding Amount</CardDescription>
            <CardTitle className="text-2xl">${totalOutstanding.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all tax types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>YTD Payments</CardDescription>
            <CardTitle className="text-2xl">${ytdPayments.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {remittancePayments.length} payments made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Compliance Status</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {complianceStatus?.overallStatus === 'compliant' ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Good
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  Issues
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {complianceStatus?.pendingActions || 0} items need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="main-tabs">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2" data-testid="tab-schedule">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2" data-testid="tab-payments">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2" data-testid="tab-compliance">
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <RemittanceOverviewTab
            clientId={selectedClientId}
            remittanceSchedules={remittanceSchedules}
            remittancePayments={remittancePayments}
            complianceStatus={complianceStatus}
            dueDates={dueDates}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <RemittanceScheduleTab
            clientId={selectedClientId}
            remittanceSchedules={remittanceSchedules}
            dueDates={dueDates}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <RemittancePaymentsTab
            clientId={selectedClientId}
            remittanceSchedules={remittanceSchedules}
            onPaymentRecorded={() => {
              refreshAllData();
              toast({
                title: "Payment Recorded",
                description: "Remittance payment has been recorded successfully.",
              });
            }}
          />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <RemittanceComplianceTab
            clientId={selectedClientId}
            complianceStatus={complianceStatus}
            remittanceSchedules={remittanceSchedules}
            remittancePayments={remittancePayments}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <RemittanceHistoryTab
            clientId={selectedClientId}
            remittancePayments={remittancePayments}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}