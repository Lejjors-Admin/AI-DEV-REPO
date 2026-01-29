/**
 * CANADIAN TAX SETTINGS UI
 * 
 * Comprehensive tax configuration interface for Canadian federal and provincial tax management
 * Integrates with 40+ backend tax API endpoints for complete CRA compliance
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Settings, 
  Calculator, 
  FileText, 
  Shield, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Building,
  Users,
  Eye,
  Download,
  TrendingUp,
  Info,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  insertPayrollTaxSettingSchema,
  insertTaxJurisdictionSchema,
  insertTaxBracketSchema,
  insertRemittanceScheduleSchema,
  type TaxJurisdiction,
  type TaxBracket,
  type PayrollTaxSetting,
  type RemittanceSchedule
} from "@/lib/types";

// Canadian provinces and territories with full details
const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta', fullName: 'Alberta' },
  { value: 'BC', label: 'British Columbia', fullName: 'British Columbia' },
  { value: 'MB', label: 'Manitoba', fullName: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick', fullName: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador', fullName: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories', fullName: 'Northwest Territories' },
  { value: 'NS', label: 'Nova Scotia', fullName: 'Nova Scotia' },
  { value: 'NU', label: 'Nunavut', fullName: 'Nunavut' },
  { value: 'ON', label: 'Ontario', fullName: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island', fullName: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec', fullName: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan', fullName: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon', fullName: 'Yukon' }
];

const TAX_YEARS = [2024, 2023, 2022, 2021, 2020];

const REMITTANCE_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', description: 'Due 15th of following month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Due 15th of month following quarter' },
  { value: 'annually', label: 'Annually', description: 'Due April 30th' }
];

// Loading and Error State Components
function TaxSettingsLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="tax-settings-loading">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function TaxSettingsErrorState({ error, retry }: { error: any, retry: () => void }) {
  return (
    <Card className="border-destructive" data-testid="tax-settings-error">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Error Loading Tax Settings
        </CardTitle>
        <CardDescription>
          {error?.message || "Unable to load tax configuration data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={retry} className="flex items-center gap-2" data-testid="button-retry-tax-settings">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDataState({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

interface TaxSettingsProps {
  clientId?: string;
}

export default function TaxSettings({ clientId }: TaxSettingsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedProvince, setSelectedProvince] = useState("ON");
  const [showJurisdictionDialog, setShowJurisdictionDialog] = useState(false);
  const [showBracketDialog, setShowBracketDialog] = useState(false);
  const [showPayrollTaxDialog, setShowPayrollTaxDialog] = useState(false);
  const [showRemittanceDialog, setShowRemittanceDialog] = useState(false);
  const [calculatorIncome, setCalculatorIncome] = useState(75000);

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
  

  // Fetch tax jurisdictions with error handling
  const { data: jurisdictionsData, isLoading: isLoadingJurisdictions, error: jurisdictionsError, refetch: refetchJurisdictions } = useQuery({
    queryKey: ["/api/tax/jurisdictions"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tax/jurisdictions');
      const result = await response.json();
      return result.success ? result.jurisdictions : [];
    }
  });

  // Fetch tax brackets for selected year and jurisdiction with error handling
  const { data: taxBracketsData, isLoading: isLoadingBrackets, error: bracketsError, refetch: refetchBrackets } = useQuery({
    queryKey: ["/api/tax/brackets", { year: selectedYear }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/brackets?year=${selectedYear}`);
      const result = await response.json();
      return result.success ? result.brackets : [];
    }
  });

  // Fetch payroll tax settings for client with error handling
  const { data: payrollTaxData, isLoading: isLoadingPayrollTax, error: payrollTaxError, refetch: refetchPayrollTax } = useQuery({
    queryKey: ["/api/tax/payroll-settings", { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/payroll-settings/${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.settings : null;
    }
  });

  // Fetch remittance schedules with error handling
  const { data: remittanceData, isLoading: isLoadingRemittance, error: remittanceError, refetch: refetchRemittance } = useQuery({
    queryKey: ["/api/tax/remittance-schedules", { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/remittance-schedules?clientId=${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.schedules : [];
    }
  });

  // Fetch compliance status with error handling
  const { data: complianceData, isLoading: isLoadingCompliance, error: complianceError, refetch: refetchCompliance } = useQuery({
    queryKey: ["/api/tax/compliance-status", { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/compliance-status/${selectedClientId}`);
      const result = await response.json();
      return result.success ? result : { compliant: false, issues: [] };
    }
  });

  // Tax calculation for the calculator widget with error handling
  const { data: taxCalculation, isLoading: isLoadingCalculation, error: calculationError, refetch: refetchCalculation } = useQuery({
    queryKey: ["/api/tax/calculate", { income: calculatorIncome, province: selectedProvince, year: selectedYear }],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/tax/calculate', {
        grossIncome: calculatorIncome,
        province: selectedProvince,
        year: selectedYear,
        payFrequency: 'annually'
      });
      const result = await response.json();
      return result.success ? result.calculation : null;
    }
  });

  // Fetch backend-driven tax constants to replace hardcoded values
  const { data: taxConstants, isLoading: isLoadingTaxConstants, error: taxConstantsError, refetch: refetchTaxConstants } = useQuery({
    queryKey: ["/api/tax/constants", { year: selectedYear, province: selectedProvince }],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await apiRequest('GET', `/api/tax/constants/${selectedYear}/${selectedProvince}`, {
        headers,
        credentials: 'include'
      });
      const result = await response.json();
      return result.success ? result.constants : {
        federalBrackets: [],
        provincialBrackets: [],
        cppRates: { employeeRate: 0.0595, employerRate: 0.0595, maxEarnings: 68500, basicExemption: 3500 },
        eiRates: { employeeRate: 0.0229, employerRate: 0.0321, maxEarnings: 65700 }
      };
    }
  });

  // Payroll Tax Settings Form - MUST be before any conditional returns
  const payrollTaxForm = useForm<z.infer<typeof insertPayrollTaxSettingSchema>>({
    resolver: zodResolver(insertPayrollTaxSettingSchema),
    defaultValues: {
      clientId: selectedClientId || 0,
      province: selectedProvince as any,
      remittanceFrequency: "monthly",
      remitterType: "regular",
      averageMonthlyRemittance: "0.00",
      federalBasicPersonalAmount: "15000.00",
      provincialBasicPersonalAmount: "11865.00",
      cppEnabled: true,
      cppRate: "0.0595",
      cppMaxEarnings: "68500.00",
      cppBasicExemption: "3500.00",
      eiEnabled: true,
      eiRate: "0.0229",
      eiMaxEarnings: "65700.00",
      employerEiMultiplier: "1.4",
      workersCompEnabled: false,
      workersCompRate: "0.0000",
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (payrollTaxData) {
      payrollTaxForm.reset({
        ...payrollTaxData,
        clientId: selectedClientId || 0,
      });
    }
  }, [payrollTaxData, selectedClientId, payrollTaxForm]);

  // Save payroll tax settings mutation
  const savePayrollTaxMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertPayrollTaxSettingSchema>) => {
      const response = await apiRequest("PUT", `/api/tax/payroll-settings/${selectedClientId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tax Settings Saved",
        description: "Canadian tax configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tax/payroll-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving tax settings",
        description: error.message || "Failed to save tax configuration.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  // Tax calculation summary component
  const TaxCalculatorWidget = () => (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Interactive Tax Calculator
        </CardTitle>
        <CardDescription>
          Real-time Canadian tax calculation preview for {selectedYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calculator-income">Annual Income</Label>
            <Input
              id="calculator-income"
              type="number"
              value={calculatorIncome}
              onChange={(e) => setCalculatorIncome(Number(e.target.value))}
              min="0"
              max="1000000"
              step="1000"
              data-testid="input-calculator-income"
            />
          </div>
          <div>
            <Label htmlFor="calculator-province">Province</Label>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger data-testid="select-calculator-province">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANADIAN_PROVINCES.map((province) => (
                  <SelectItem key={province.value} value={province.value}>
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {taxCalculation && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-blue-600" data-testid="text-federal-tax">
                {formatCurrency(taxCalculation.federalTax || 0)}
              </div>
              <div className="text-sm text-gray-600">Federal Tax</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-green-600" data-testid="text-provincial-tax">
                {formatCurrency(taxCalculation.provincialTax || 0)}
              </div>
              <div className="text-sm text-gray-600">Provincial Tax</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-purple-600" data-testid="text-cpp-ei">
                {formatCurrency((taxCalculation.cpp || 0) + (taxCalculation.ei || 0))}
              </div>
              <div className="text-sm text-gray-600">CPP + EI</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-orange-600" data-testid="text-total-tax">
                {formatCurrency(taxCalculation.totalTax || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Tax</div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Tax Breakdown by Income Level</div>
          <Progress 
            value={taxCalculation?.effectiveRate ? taxCalculation.effectiveRate * 100 : 0} 
            className="h-3"
            data-testid="progress-effective-rate" 
          />
          <div className="text-xs text-gray-500 mt-1">
            Effective Rate: {formatPercentage(taxCalculation?.effectiveRate || 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Compliance Status Card
  const ComplianceStatusCard = () => (
    <Card className={`${complianceData?.compliant ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          CRA Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {complianceData?.compliant ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <span className={`font-semibold ${complianceData?.compliant ? 'text-green-700' : 'text-red-700'}`}>
            {complianceData?.compliant ? 'Compliant' : 'Issues Found'}
          </span>
        </div>
        
        {complianceData?.issues && complianceData.issues.length > 0 && (
          <div className="space-y-2">
            {complianceData.issues.map((issue: any, index: number) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{issue.type}</AlertTitle>
                <AlertDescription>{issue.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!selectedClientId) {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Client Selected</AlertTitle>
          <AlertDescription>
            Please select a client from the payroll management section to configure tax settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="page-tax-settings">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Canadian Tax Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure federal and provincial tax rates, remittance schedules, and CRA compliance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-32" data-testid="select-tax-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Simplified Tax Information Cards - Ontario Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-blue-700">Province</div>
                <div className="text-lg font-semibold text-blue-800">Ontario</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-green-700">Payroll Remittance</div>
                <div className="text-lg font-semibold text-green-800">Monthly (15th)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-sm text-orange-700">2024 CPP Max</div>
                <div className="text-lg font-semibold text-orange-800">$68,500</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Tax Settings</TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll Tax Rates</TabsTrigger>
          <TabsTrigger value="remittance" data-testid="tab-remittance">Remittance Schedules</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaxCalculatorWidget />
            <ComplianceStatusCard />
          </div>
          
          {/* Current Tax Configuration Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Tax Configuration Summary</CardTitle>
              <CardDescription>
                Overview of tax settings for {clients.find(c => c.id === selectedClientId)?.name || 'selected client'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Federal Tax Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Basic Personal Amount:</span>
                      <span className="font-mono" data-testid="text-federal-bpa">
                        {formatCurrency(parseFloat(payrollTaxData?.federalBasicPersonalAmount || '15000'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>CPP Rate (Employee):</span>
                      <span className="font-mono" data-testid="text-cpp-rate">
                        {formatPercentage(parseFloat(payrollTaxData?.cppRate || '0.0595'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>EI Rate (Employee):</span>
                      <span className="font-mono" data-testid="text-ei-rate">
                        {formatPercentage(parseFloat(payrollTaxData?.eiRate || '0.0229'))}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Provincial Tax Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Province:</span>
                      <span className="font-mono" data-testid="text-province">
                        {CANADIAN_PROVINCES.find(p => p.value === payrollTaxData?.province)?.fullName || 'Ontario'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Basic Personal Amount:</span>
                      <span className="font-mono" data-testid="text-provincial-bpa">
                        {formatCurrency(parseFloat(payrollTaxData?.provincialBasicPersonalAmount || '11865'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remittance Frequency:</span>
                      <span className="font-mono capitalize" data-testid="text-remittance-freq">
                        {payrollTaxData?.remittanceFrequency || 'Monthly'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Jurisdictions Tab */}
        <TabsContent value="jurisdictions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Jurisdictions</CardTitle>
                <CardDescription>
                  Manage federal and provincial tax authorities
                </CardDescription>
              </div>
              <Button onClick={() => setShowJurisdictionDialog(true)} data-testid="button-add-jurisdiction">
                <Plus className="h-4 w-4 mr-2" />
                Add Jurisdiction
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jurisdictionsData?.map((jurisdiction: TaxJurisdiction) => (
                    <TableRow key={jurisdiction.id}>
                      <TableCell>
                        <Badge variant={jurisdiction.type === 'federal' ? 'default' : 'secondary'}>
                          {jurisdiction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{jurisdiction.code}</TableCell>
                      <TableCell>{jurisdiction.name}</TableCell>
                      <TableCell>
                        <Badge variant={jurisdiction.isActive ? 'default' : 'destructive'}>
                          {jurisdiction.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-jurisdiction-${jurisdiction.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-jurisdiction-${jurisdiction.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Brackets Tab */}
        <TabsContent value="brackets" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Brackets for {selectedYear}</CardTitle>
                <CardDescription>
                  Configure income tax brackets for federal and provincial jurisdictions
                </CardDescription>
              </div>
              <Button onClick={() => setShowBracketDialog(true)} data-testid="button-add-bracket">
                <Plus className="h-4 w-4 mr-2" />
                Add Bracket
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Federal Brackets */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" data-testid="heading-federal-tax-brackets">
                    <Building className="h-4 w-4" />
                    Federal Tax Brackets
                  </h4>
                  <div className="grid gap-2" data-testid="container-federal-brackets">
                    {isLoadingTaxConstants ? (
                      [...Array(5)].map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" data-testid={`skeleton-federal-bracket-${index}`} />
                      ))
                    ) : taxConstants?.federalBrackets?.length ? (
                      taxConstants.federalBrackets.map((bracket: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg" data-testid={`card-federal-bracket-${index}`}>
                          <div className="flex-1">
                            <div className="font-mono text-sm" data-testid={`text-federal-bracket-range-${index}`}>
                              {formatCurrency(bracket.from)} - {bracket.to ? formatCurrency(bracket.to) : 'No limit'}
                            </div>
                            <div className="text-xs text-gray-600" data-testid={`text-federal-bracket-description-${index}`}>
                              {bracket.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`badge-federal-rate-${index}`}>
                              {formatPercentage(bracket.rate)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyDataState
                        title="No Federal Tax Brackets Available"
                        description="Unable to load federal tax bracket information for the selected year."
                        icon={Building}
                      />
                    )}
                  </div>
                </div>

                {/* Provincial Brackets */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" data-testid="heading-provincial-tax-brackets">
                    <MapPin className="h-4 w-4" />
                    {CANADIAN_PROVINCES.find(p => p.value === selectedProvince)?.fullName} Tax Brackets
                  </h4>
                  <div className="grid gap-2" data-testid="container-provincial-brackets">
                    {isLoadingTaxConstants ? (
                      [...Array(5)].map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" data-testid={`skeleton-provincial-bracket-${index}`} />
                      ))
                    ) : taxConstants?.provincialBrackets?.length ? (
                      taxConstants.provincialBrackets.map((bracket: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg" data-testid={`card-provincial-bracket-${index}`}>
                          <div className="flex-1">
                            <div className="font-mono text-sm" data-testid={`text-provincial-bracket-range-${index}`}>
                              {formatCurrency(bracket.from)} - {bracket.to ? formatCurrency(bracket.to) : 'No limit'}
                            </div>
                            <div className="text-xs text-gray-600" data-testid={`text-provincial-bracket-description-${index}`}>
                              {bracket.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-provincial-rate-${index}`}>
                              {formatPercentage(bracket.rate)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyDataState
                        title="No Provincial Tax Brackets Available"
                        description={`Unable to load ${selectedProvince} tax bracket information for the selected year.`}
                        icon={MapPin}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tax Settings Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Tax Configuration</CardTitle>
              <CardDescription>
                Configure CPP, EI, and other payroll tax settings for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...payrollTaxForm}>
                <form onSubmit={payrollTaxForm.handleSubmit((data) => savePayrollTaxMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Province Selection */}
                    <FormField
                      control={payrollTaxForm.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province/Territory</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payroll-province">
                                <SelectValue placeholder="Select province" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CANADIAN_PROVINCES.map((province) => (
                                <SelectItem key={province.value} value={province.value}>
                                  {province.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Remittance Frequency */}
                    <FormField
                      control={payrollTaxForm.control}
                      name="remittanceFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remittance Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-remittance-frequency">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REMITTANCE_FREQUENCIES.map((freq) => (
                                <SelectItem key={freq.value} value={freq.value}>
                                  <div>
                                    <div>{freq.label}</div>
                                    <div className="text-xs text-gray-500">{freq.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Basic Personal Amounts */}
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-semibold">Basic Personal Amounts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={payrollTaxForm.control}
                        name="federalBasicPersonalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Federal Basic Personal Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                data-testid="input-federal-bpa"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={payrollTaxForm.control}
                        name="provincialBasicPersonalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincial Basic Personal Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                data-testid="input-provincial-bpa"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* CPP Settings */}
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-semibold">Canada Pension Plan (CPP) Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={payrollTaxForm.control}
                        name="cppRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPP Rate (Decimal)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.0001" 
                                {...field} 
                                data-testid="input-cpp-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={payrollTaxForm.control}
                        name="cppMaxEarnings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPP Maximum Earnings</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                value={field.value ?? ""}
                                data-testid="input-cpp-max"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={payrollTaxForm.control}
                        name="cppBasicExemption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPP Basic Exemption</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                value={field.value ?? ""}
                                data-testid="input-cpp-exemption"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* EI Settings */}
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-semibold">Employment Insurance (EI) Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={payrollTaxForm.control}
                        name="eiRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EI Rate (Decimal)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.0001" 
                                {...field} 
                                data-testid="input-ei-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={payrollTaxForm.control}
                        name="eiMaxEarnings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EI Maximum Earnings</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                value={field.value ?? ""}
                                data-testid="input-ei-max"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={payrollTaxForm.control}
                        name="employerEiMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer EI Multiplier</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                {...field}
                                value={field.value ?? ""}
                                data-testid="input-ei-multiplier"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => payrollTaxForm.reset()}>
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={savePayrollTaxMutation.isPending}
                      data-testid="button-save-payroll-tax"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savePayrollTaxMutation.isPending ? 'Saving...' : 'Save Tax Settings'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remittance Tab */}
        <TabsContent value="remittance" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Remittance Schedules</CardTitle>
                <CardDescription>
                  Manage tax remittance schedules and due dates
                </CardDescription>
              </div>
              <Button onClick={() => setShowRemittanceDialog(true)} data-testid="button-add-remittance">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Due Rule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remittanceData?.map((schedule: RemittanceSchedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {schedule.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{schedule.frequency}</TableCell>
                      <TableCell className="font-mono text-sm">{schedule.dueRule}</TableCell>
                      <TableCell>
                        <Badge variant={schedule.isActive ? 'default' : 'destructive'}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-schedule-${schedule.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-schedule-${schedule.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}