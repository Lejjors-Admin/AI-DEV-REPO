/**
 * Canadian Payroll Management System
 * 
 * Comprehensive Canadian payroll with CPP, EI, federal/provincial tax calculations,
 * T4s, ROEs, and full compliance with Canadian regulations.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Users, 
  Calculator, 
  FileText, 
  Calendar, 
  DollarSign, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  UserPlus,
  Play,
  CheckCircle,
  AlertCircle,
  Building,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEmployeeSchema } from "@/lib/types";
import TaxSettings from "./TaxSettings";
import PayrollProcessor from "@/components/payroll/PayrollProcessor";
import { apiConfig } from "@/lib/api-config";

// Canadian provinces and territories
const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' }
];

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' }
];

// Use the canonical employee schema directly (no need to extend)
const employeeSchema = insertEmployeeSchema;

// Canadian Payroll Processing Schema
const payrollProcessSchema = z.object({
  employeeId: z.number().min(1, "Employee is required"),
  payPeriodStart: z.string().min(1, "Pay period start is required"),
  payPeriodEnd: z.string().min(1, "Pay period end is required"),
  payDate: z.string().min(1, "Pay date is required"),
  regularHours: z.number().min(0, "Regular hours cannot be negative").default(0),
  overtimeHours: z.number().min(0, "Overtime hours cannot be negative").default(0),
  vacationPay: z.number().min(0, "Vacation pay cannot be negative").default(0),
  bonus: z.number().min(0, "Bonus cannot be negative").default(0),
  commission: z.number().min(0, "Commission cannot be negative").default(0),
  reimbursements: z.number().min(0, "Reimbursements cannot be negative").default(0)
});

type Employee = z.infer<typeof employeeSchema> & {
  id: number;
  clientId: number;
  employeeNumber: string;
  status: 'active' | 'terminated' | 'on_leave';
  createdAt: string;
  updatedAt: string;
};

type PayrollProcess = z.infer<typeof payrollProcessSchema>;

interface PayrollProps {
  clientId: string;
}

export default function PayrollManagement({ clientId }: PayrollProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Fetch available clients if no client ID is provided - API returns array directly
  const { data: clientsResp = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    enabled: !clientId || clientId === "",
  });
  
  // API returns clients array directly, not wrapped in {success, data}
  const clients = Array.isArray(clientsResp) ? clientsResp : [];
  
  // Determine the client ID to use - always ensure we have a valid client
  const getActiveClientId = () => {
    if (clientId && clientId !== "") {
      return parseInt(clientId);
    }
    // Auto-select first available client if none provided
    if (clients && clients.length > 0) {
      return clients[0].id;
    }
    return null;
  };
  
  const selectedClientId = getActiveClientId();
  
  // Show error if no valid client selected
  useEffect(() => {
    if (!selectedClientId && !clientId) {
      toast({
        title: "No Client Selected",
        description: "Please select a client before managing payroll.",
        variant: "destructive"
      });
    }
  }, [selectedClientId, clientId, toast]);

  // Fetch employees
  const { data: employees = [], isLoading: isLoadingEmployees, refetch: refetchEmployees } = useQuery({
    queryKey: ["/api/payroll/employees", { clientId: selectedClientId }],
    enabled: !!selectedClientId && selectedClientId !== null,
    queryFn: async () => {
      console.log(`Fetching employees for client: ${selectedClientId}`);
      const response = await apiRequest('GET', `/api/payroll/employees?clientId=${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch payroll runs
  const { data: payrollRuns = [], refetch: refetchPayrollRuns } = useQuery({
    queryKey: ["/api/payroll/runs", { clientId: selectedClientId }],
    enabled: !!selectedClientId && selectedClientId !== null,
    queryFn: async () => {
      console.log(`Fetching payroll runs for client: ${selectedClientId}`);
      const response = await apiRequest('GET', `/api/payroll/runs?clientId=${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Fetch T4 records
  const { data: t4Records = [] } = useQuery({
    queryKey: ["/api/payroll/t4s", { clientId: selectedClientId }],
    enabled: !!selectedClientId && selectedClientId !== null,
    queryFn: async () => {
      console.log(`Fetching T4 records for client: ${selectedClientId}`);
      const response = await apiRequest('GET', `/api/payroll/t4s?clientId=${selectedClientId}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Calculate real payroll metrics from data
  const payrollMetrics = {
    totalPayroll: Array.isArray(payrollRuns) ? payrollRuns.reduce((sum: number, run: any) => sum + parseFloat(run.totalGrossPay || 0), 0) : 0,
    netPay: Array.isArray(payrollRuns) ? payrollRuns.reduce((sum: number, run: any) => sum + parseFloat(run.totalNetPay || 0), 0) : 0,
    taxWithholdings: Array.isArray(payrollRuns) ? payrollRuns.reduce((sum: number, run: any) => sum + parseFloat(run.totalDeductions || 0), 0) : 0,
    employerTaxes: Array.isArray(payrollRuns) ? payrollRuns.reduce((sum: number, run: any) => sum + parseFloat(run.totalEmployerContributions || 0), 0) : 0
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  // Employee form
  const employeeForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      clientId: selectedClientId || 0,
      employeeNumber: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "ON",
      postalCode: "",
      sinEncrypted: "",
      dateOfBirth: "",
      hireDate: new Date().toISOString().split('T')[0],
      terminationDate: "",
      jobTitle: "",
      department: "",
      payType: "salary",
      payRate: "",
      payFrequency: "biweekly",
      federalBasicPersonalAmount: "15000.00",
      provincialBasicPersonalAmount: "11865.00",
      federalClaimCode: "1",
      provincialClaimCode: "1",
      unionDues: "0.00",
      additionalTaxDeduction: "0.00",
      healthBenefits: "0.00",
      dentalBenefits: "0.00",
      lifeInsurance: "0.00",
      status: "active"
    },
  });

  // Payroll processing form
  const payrollForm = useForm<z.infer<typeof payrollProcessSchema>>({
    resolver: zodResolver(payrollProcessSchema),
    defaultValues: {
      employeeId: 0,
      payPeriodStart: "",
      payPeriodEnd: "",
      payDate: new Date().toISOString().split('T')[0],
      regularHours: 0,
      overtimeHours: 0,
      vacationPay: 0,
      bonus: 0,
      commission: 0,
      reimbursements: 0
    },
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof employeeSchema>) => {
      console.log("🔥 createEmployeeMutation.mutationFn called with:", data);
      if (!selectedClientId) {
        throw new Error('No client selected. Please select a client first.');
      }
      
      // Send data directly - backend handles string-to-decimal conversion
      const employeeData = {
        ...data,
        clientId: selectedClientId,
      };
      
      console.log("🚀 Sending employee data to API:", employeeData);
      const response = await apiRequest("POST", `/api/payroll/employees`, employeeData);
      console.log("📡 API response received:", response);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Employee created",
        description: "Employee has been successfully added to the payroll system.",
      });
      employeeForm.reset();
      setShowNewEmployeeDialog(false);
      // Properly invalidate React Query cache to refresh employee list
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating employee",
        description: error.message || "Failed to create employee.",
        variant: "destructive",
      });
    },
  });

  // Process Canadian payroll with tax calculations
  const processPayrollMutation = useMutation({
    mutationFn: async (data: z.infer<typeof payrollProcessSchema>) => {
      const response = await apiRequest("POST", `/api/payroll/process`, {
        ...data,
        clientId: selectedClientId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payroll processed",
        description: "Canadian payroll has been calculated and processed with all tax deductions.",
      });
      payrollForm.reset();
      setShowProcessPayrollDialog(false);
      refetchPayrollRuns();
    },
    onError: (error: any) => {
      toast({
        title: "Error processing payroll",
        description: error.message || "Failed to process payroll.",
        variant: "destructive",
      });
    },
  });

  // Generate T4 forms
  const generateT4Mutation = useMutation({
    mutationFn: async ({ employeeId, taxYear }: { employeeId: number; taxYear: number }) => {
      const response = await apiRequest("POST", `/api/payroll/t4/generate`, {
        employeeId,
        taxYear,
        clientId: selectedClientId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "T4 generated",
        description: "T4 form has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating T4",
        description: error.message || "Failed to generate T4.",
        variant: "destructive",
      });
    },
  });

  // Handle employee creation
  const handleCreateEmployee = async (values: z.infer<typeof employeeSchema>) => {
    console.log("🎯 handleCreateEmployee called with values:", values);
    console.log("🎯 selectedClientId:", selectedClientId);
    
    if (!selectedClientId) {
      toast({
        title: "No Client Selected",
        description: "Please select a client before creating an employee.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("🚀 Calling createEmployeeMutation.mutate");
    createEmployeeMutation.mutate(values);
  };

  // Handle payroll processing
  const handleProcessPayroll = async (values: z.infer<typeof payrollProcessSchema>) => {
    processPayrollMutation.mutate(values);
  };

  if (!selectedClientId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Select a Client</h4>
              <p className="text-gray-500 mt-2">
                Choose a client to manage their Canadian payroll system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Canadian Payroll Management</h2>
          <p className="text-muted-foreground">Comprehensive Canadian payroll with CPP, EI, and provincial tax compliance</p>
        </div>
        <PayrollProcessor 
          clientId={selectedClientId.toString()} 
          onComplete={() => {
            refetchEmployees();
            refetchPayrollRuns();
          }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="tax-settings">Tax Settings</TabsTrigger>
          <TabsTrigger value="tax-reports">Tax Reports</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollMetrics.totalPayroll)}</div>
                <p className="text-xs text-muted-foreground">Current month gross</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollMetrics.netPay)}</div>
                <p className="text-xs text-muted-foreground">After deductions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax Withholdings</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollMetrics.taxWithholdings)}</div>
                <p className="text-xs text-muted-foreground">CPP/EI, Income Tax</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employer Taxes</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollMetrics.employerTaxes)}</div>
                <p className="text-xs text-muted-foreground">EI, CPP contributions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payroll Transactions</CardTitle>
              <CardDescription>Latest payroll runs with Canadian tax calculations</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(payrollRuns) && payrollRuns.length > 0 ? (
                <div className="space-y-3">
                  {payrollRuns.slice(0, 5).map((run: any) => (
                    <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Pay Run #{run.payRunNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(run.payPeriodStart).toLocaleDateString()} - {new Date(run.payPeriodEnd).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                // First get paystubs for this pay run
                                const response = await fetch(apiConfig.buildUrl(`/api/payroll/runs/${run.id}/paystubs`), {
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                  }
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  
                                  if (data.success && data.data.length > 0) {
                                    // Download each paystub PDF
                                    for (const paystub of data.data) {
                                      const pdfResponse = await fetch(`/api/payroll/paystubs/${paystub.id}/pdf`);
                                      
                                      if (pdfResponse.ok) {
                                        const blob = await pdfResponse.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = url;
                                        a.download = `Paystub-${paystub.employeeId}-${run.payRunNumber}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                      }
                                    }
                                    
                                    toast({
                                      title: "PDFs Downloaded",
                                      description: `Downloaded ${data.data.length} paystub PDFs`,
                                    });
                                  } else {
                                    toast({
                                      title: "No Paystubs Found",
                                      description: "No paystubs available for this pay run",
                                      variant: "destructive",
                                    });
                                  }
                                } else {
                                  throw new Error('Failed to fetch paystubs');
                                }
                              } catch (error) {
                                toast({
                                  title: "Download Error",
                                  description: "Failed to download paystubs",
                                  variant: "destructive",
                                });
                              }
                            }}
                            data-testid={`download-paystubs-${run.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download PDFs
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              // Navigate to detailed payroll view
                              toast({
                                title: "View Details",
                                description: "Detailed payroll view coming soon",
                              });
                            }}
                            data-testid={`view-details-${run.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Gross: {formatCurrency(parseFloat(run.totalGrossPay))}</p>
                        <p className="text-sm text-muted-foreground">Net: {formatCurrency(parseFloat(run.totalNetPay))}</p>
                        <Badge 
                          variant={run.status === 'paid' ? 'default' : run.status === 'approved' ? 'secondary' : 'outline'}
                          className={run.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="mb-2">No payroll runs yet</p>
                  <p className="text-sm">Process your first payroll to see transactions here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Employee Management</h3>
              <p className="text-muted-foreground">Manage employee information and Canadian payroll settings</p>
            </div>
            <Button onClick={() => setShowNewEmployeeDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>

          {isLoadingEmployees ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading employees...</p>
            </div>
          ) : Array.isArray(employees) && employees.length > 0 ? (
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Pay Type</TableHead>
                      <TableHead>Pay Rate</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(employees) ? employees.map((employee: Employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{employee.jobTitle || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {CANADIAN_PROVINCES.find(p => p.value === employee.province)?.label || employee.province}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {employee.payType.charAt(0).toUpperCase() + employee.payType.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(parseFloat(employee.payRate))}
                          {employee.payType === 'hourly' ? '/hr' : '/year'}
                        </TableCell>
                        <TableCell>{PAY_FREQUENCIES.find(f => f.value === employee.payFrequency)?.label}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.status === 'active' ? 'default' : 'secondary'}
                            className={employee.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="mb-2">No employees yet</p>
                <p className="text-sm text-muted-foreground mb-4">Add your first employee to start managing payroll</p>
                <Button onClick={() => setShowNewEmployeeDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax-settings" className="space-y-6">
          <TaxSettings clientId={selectedClientId?.toString() || ""} />
        </TabsContent>

        {/* Tax Reports Tab */}
        <TabsContent value="tax-reports" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Canadian Tax Reports</h3>
            <p className="text-muted-foreground">Generate T4s, ROEs, and CRA compliance reports</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  T4 Tax Forms
                </CardTitle>
                <CardDescription>
                  Generate annual T4 slips for employment income reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>2024 Tax Year</span>
                  <Button size="sm" onClick={() => generateT4Mutation.mutate({ employeeId: 0, taxYear: 2024 })}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate All T4s
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {Array.isArray(t4Records) ? t4Records.length : 0} T4 forms generated this year
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Record of Employment (ROE)
                </CardTitle>
                <CardDescription>
                  Generate ROEs for terminated or laid-off employees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Service Canada Filing</span>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate ROE
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Electronic filing to Service Canada
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Employee Benefits</h3>
            <p className="text-muted-foreground">Manage health benefits, group insurance, and retirement plans</p>
          </div>
          
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="mb-2">Benefits management coming soon</p>
              <p className="text-sm text-muted-foreground">Configure employee benefits and deductions</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Canadian Compliance</h3>
            <p className="text-muted-foreground">CRA reporting, remittance tracking, and regulatory compliance</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  CRA Remittances
                </CardTitle>
                <CardDescription>
                  Track and manage payroll remittances to CRA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Next Remittance Due:</span>
                    <span className="text-sm font-medium">December 15, 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Amount Due:</span>
                    <span className="text-sm font-medium">{formatCurrency(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                  Provincial Requirements
                </CardTitle>
                <CardDescription>
                  Province-specific payroll compliance requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Multi-provincial compliance tracking and reporting
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Employee Dialog */}
      <Dialog open={showNewEmployeeDialog} onOpenChange={setShowNewEmployeeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter employee information for Canadian payroll processing
            </DialogDescription>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={(e) => {
              console.log("📝 Form submit event triggered");
              console.log("📝 Form errors:", employeeForm.formState.errors);
              console.log("📝 Form values:", employeeForm.getValues());
              employeeForm.handleSubmit(
                (data) => {
                  console.log("✅ Form validation passed, calling handler");
                  handleCreateEmployee(data);
                },
                (errors) => {
                  console.log("❌ Form validation failed:", errors);
                }
              )(e);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={employeeForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province *</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="select-province"
                        >
                          <option value="">Select province</option>
                          {CANADIAN_PROVINCES.map((province) => (
                            <option key={province.value} value={province.value}>
                              {province.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A1A 1A1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="sinEncrypted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Insurance Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123-456-789" maxLength={11} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="payType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Type *</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="select-pay-type"
                        >
                          <option value="">Select pay type</option>
                          <option value="salary">Salary</option>
                          <option value="hourly">Hourly</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="payRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Rate *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="payFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Frequency *</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="select-pay-frequency"
                        >
                          <option value="">Select pay frequency</option>
                          {PAY_FREQUENCIES.map((freq) => (
                            <option key={freq.value} value={freq.value}>
                              {freq.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Canadian Tax Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={employeeForm.control}
                    name="federalClaimCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Federal Claim Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={employeeForm.control}
                    name="provincialClaimCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincial Claim Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={employeeForm.control}
                    name="additionalTaxDeduction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Tax Deduction</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewEmployeeDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEmployeeMutation.isPending}
                  onClick={() => console.log("🔘 Submit button clicked")}
                >
                  {createEmployeeMutation.isPending ? 'Creating...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
