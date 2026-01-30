/**
 * QuickBooks-Style Payroll Processor
 * 
 * Comprehensive payroll processing interface similar to QuickBooks Online
 * with staff selection, hours/salary input, preview, and processing
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Calculator, 
  Eye, 
  CheckCircle,
  AlertCircle,
  DollarSign,
  Clock,
  Calendar,
  Download,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PaystubPDFGenerator, type PaystubData } from "@/lib/paystub-pdf-generator";

interface Employee {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  payType: 'hourly' | 'salary';
  payRate: string;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  province: string;
  status: 'active' | 'terminated' | 'on_leave';
}

interface EmployeePayrollData {
  employeeId: number;
  employee: Employee;
  isSelected: boolean;
  regularHours: number;
  overtimeHours: number;
  bonus: number;
  commission: number;
  calculatedGrossPay: number;
  calculatedNetPay: number;
  calculatedTaxes: number;
}

interface PayrollProcessorProps {
  clientId: string;
  onComplete?: () => void;
}

export default function PayrollProcessor({ clientId, onComplete }: PayrollProcessorProps) {
  const { toast } = useToast();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'staff' | 'preview' | 'processing' | 'complete'>('setup');
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');
  const [employeePayrollData, setEmployeePayrollData] = useState<EmployeePayrollData[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Fetch employees
  const { data: employeesResponse, isLoading: loadingEmployees } = useQuery({
    queryKey: ['/api/payroll/employees/active', clientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/payroll/employees/active?clientId=${clientId}`, {
        headers,
        credentials: 'include'
      });
      return response.json();
    },
    enabled: !!clientId && isOpen
  });

  const employees = employeesResponse?.data || [];

  // Initialize employee payroll data when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && employeePayrollData.length === 0) {
      const initialData = employees.map((emp: Employee) => ({
        employeeId: emp.id,
        employee: emp,
        isSelected: true, // Default to selected
        regularHours: emp.payType === 'hourly' ? 40 : 0, // Default 40 hours for hourly
        overtimeHours: 0,
        bonus: 0,
        commission: 0,
        calculatedGrossPay: 0,
        calculatedNetPay: 0,
        calculatedTaxes: 0
      }));
      setEmployeePayrollData(initialData);
    }
  }, [employees, employeePayrollData.length]);

  // Calculate preview for selected employees
  const calculatePreviewMutation = useMutation({
    mutationFn: async () => {
      const selectedEmployees = employeePayrollData.filter(emp => emp.isSelected);
      
      if (selectedEmployees.length === 0) {
        throw new Error('Please select at least one employee');
      }

      // Calculate each employee's pay
      const calculations = await Promise.all(
        selectedEmployees.map(async (empData) => {
          const response = await apiRequest('POST', '/api/payroll/calculate-preview', {
            clientId: parseInt(clientId),
            employeeId: empData.employeeId,
            regularHours: empData.regularHours,
            overtimeHours: empData.overtimeHours,
            bonus: empData.bonus,
            commission: empData.commission,
            payPeriodStart,
            payPeriodEnd
          });
          const result = await response.json();
          return {
            ...empData,
            calculatedGrossPay: result.grossPay || 0,
            calculatedNetPay: result.netPay || 0,
            calculatedTaxes: result.totalTaxes || 0
          };
        })
      );

      return calculations;
    },
    onSuccess: (calculations) => {
      setEmployeePayrollData(prev => 
        prev.map(emp => 
          calculations.find(calc => calc.employeeId === emp.employeeId) || emp
        )
      );
      setCurrentStep('preview');
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate payroll preview",
        variant: "destructive",
      });
    }
  });


  // Process payroll
  const processPayrollMutation = useMutation({
    mutationFn: async () => {
      const selectedEmployees = employeePayrollData.filter(emp => emp.isSelected);
      
      const response = await apiRequest('POST', '/api/payroll/runs', {
        clientId: parseInt(clientId),
        payPeriodStart,
        payPeriodEnd,
        payDate,
        employees: selectedEmployees.map(emp => ({
          employeeId: emp.employeeId,
          regularHours: emp.regularHours,
          overtimeHours: emp.overtimeHours,
          bonusPay: emp.bonus,
          commissionPay: emp.commission
        }))
      });
      
      const result = await response.json();
      
      // Approve the pay run to create journal entries
      if (result.success && result.data?.payRun?.id) {
          try {
            const approveResponse = await apiRequest('POST', `/api/payroll/runs/${result.data.payRun.id}/approve`);
          result.journalEntriesCreated = approveResponse.success;
        } catch (error) {
          console.warn('Failed to approve pay run:', error);
          result.journalEntriesCreated = false;
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      setPayrollSummary(result.data);
      setCurrentStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      
      const journalMessage = result.journalEntriesCreated ? ' Journal entries created.' : ' Warning: Journal entries not created.';
      
      toast({
        title: "Payroll Processed",
        description: `Successfully processed payroll for ${result.data.totalEmployees} employees.${journalMessage}`,
      });
      
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process payroll",
        variant: "destructive",
      });
    }
  });

  // Update employee data
  const updateEmployeeData = (employeeId: number, field: string, value: any) => {
    setEmployeePayrollData(prev =>
      prev.map(emp =>
        emp.employeeId === employeeId
          ? { ...emp, [field]: value }
          : emp
      )
    );
  };

  // Calculate gross pay estimate for display
  const calculateGrossPayEstimate = (empData: EmployeePayrollData): number => {
    const { employee, regularHours, overtimeHours, bonus, commission } = empData;
    
    if (employee.payType === 'hourly') {
      const payRate = parseFloat(employee.payRate);
      const regularPay = regularHours * payRate;
      const overtimePay = overtimeHours * payRate * 1.5;
      return regularPay + overtimePay + bonus + commission;
    } else if (employee.payType === 'salary') {
      // For salary, calculate based on pay frequency
      const annualSalary = parseFloat(employee.payRate);
      let payPeriods = 26; // Default biweekly
      
      switch (employee.payFrequency) {
        case 'weekly': payPeriods = 52; break;
        case 'biweekly': payPeriods = 26; break;
        case 'semimonthly': payPeriods = 24; break;
        case 'monthly': payPeriods = 12; break;
      }
      
      return (annualSalary / payPeriods) + bonus + commission;
    }
    
    return 0;
  };

  // Get selected employees totals
  const selectedEmployees = employeePayrollData.filter(emp => emp.isSelected);
  const totalGrossPay = selectedEmployees.reduce((sum, emp) => sum + calculateGrossPayEstimate(emp), 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Users className="h-4 w-4 mr-2" />
          Run Payroll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Process Payroll - {currentStep === 'setup' ? 'Setup' : 
                              currentStep === 'staff' ? 'Select Staff' : 
                              currentStep === 'preview' ? 'Preview' : 
                              currentStep === 'processing' ? 'Processing' : 'Complete'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'setup' && 'Set up the pay period dates'}
            {currentStep === 'staff' && 'Select employees and enter hours/adjustments'}
            {currentStep === 'preview' && 'Review calculations before processing'}
            {currentStep === 'processing' && 'Processing payroll...'}
            {currentStep === 'complete' && 'Payroll completed successfully'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Setup */}
        {currentStep === 'setup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                <Input
                  id="payPeriodStart"
                  type="date"
                  value={payPeriodStart}
                  onChange={(e) => setPayPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                <Input
                  id="payPeriodEnd"
                  type="date"
                  value={payPeriodEnd}
                  onChange={(e) => setPayPeriodEnd(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="payDate">Pay Date</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={() => setCurrentStep('staff')}
                disabled={!payPeriodStart || !payPeriodEnd || !payDate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next: Select Staff
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Staff Selection */}
        {currentStep === 'staff' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Pay Period: {payPeriodStart} to {payPeriodEnd}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Estimated Total: ${totalGrossPay.toFixed(2)}</span>
              </div>
            </div>

            {loadingEmployees ? (
              <div className="text-center py-8">Loading employees...</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Pay Type</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Regular Hours</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Est. Gross</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeePayrollData.map((empData) => (
                      <TableRow key={empData.employeeId}>
                        <TableCell>
                          <Checkbox
                            checked={empData.isSelected}
                            onCheckedChange={(checked) => 
                              updateEmployeeData(empData.employeeId, 'isSelected', checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {empData.employee.firstName} {empData.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{empData.employee.employeeNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={empData.employee.payType === 'hourly' ? 'default' : 'secondary'}>
                            {empData.employee.payType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${parseFloat(empData.employee.payRate).toFixed(2)}
                          {empData.employee.payType === 'salary' ? '/year' : '/hour'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={empData.regularHours}
                            onChange={(e) => 
                              updateEmployeeData(empData.employeeId, 'regularHours', parseFloat(e.target.value) || 0)
                            }
                            disabled={!empData.isSelected || empData.employee.payType === 'salary'}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={empData.overtimeHours}
                            onChange={(e) => 
                              updateEmployeeData(empData.employeeId, 'overtimeHours', parseFloat(e.target.value) || 0)
                            }
                            disabled={!empData.isSelected || empData.employee.payType === 'salary'}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={empData.bonus}
                            onChange={(e) => 
                              updateEmployeeData(empData.employeeId, 'bonus', parseFloat(e.target.value) || 0)
                            }
                            disabled={!empData.isSelected}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={empData.commission}
                            onChange={(e) => 
                              updateEmployeeData(empData.employeeId, 'commission', parseFloat(e.target.value) || 0)
                            }
                            disabled={!empData.isSelected}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ${calculateGrossPayEstimate(empData).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('setup')}>
                Back
              </Button>
              <Button 
                onClick={() => calculatePreviewMutation.mutate()}
                disabled={selectedEmployees.length === 0 || calculatePreviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {calculatePreviewMutation.isPending ? 'Calculating...' : 'Preview Payroll'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Payroll Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Employees:</span>
                  <span className="ml-2 font-medium">{selectedEmployees.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Gross:</span>
                  <span className="ml-2 font-medium">${totalGrossPay.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Pay Date:</span>
                  <span className="ml-2 font-medium">{payDate}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Taxes</TableHead>
                    <TableHead>Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployees.map((empData) => (
                    <TableRow key={empData.employeeId}>
                      <TableCell>
                        {empData.employee.firstName} {empData.employee.lastName}
                      </TableCell>
                      <TableCell>
                        {empData.employee.payType === 'hourly' 
                          ? `${empData.regularHours}h + ${empData.overtimeHours}h OT`
                          : 'Salary'
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        ${empData.calculatedGrossPay.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ${empData.calculatedTaxes.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${empData.calculatedNetPay.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('staff')}>
                Back to Staff
              </Button>
              <Button 
                onClick={() => {
                  setCurrentStep('processing');
                  processPayrollMutation.mutate();
                }}
                disabled={processPayrollMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                Process Payroll
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 'processing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Processing Payroll</h3>
            <p className="text-gray-600">Calculating taxes, creating journal entries, and generating paystubs...</p>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && payrollSummary && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payroll Completed Successfully!</h3>
              <p className="text-gray-600">Pay run {payrollSummary.payRun.payRunNumber} has been processed</p>
              <p className="text-sm text-green-600 mt-2">✅ Journal entries created automatically</p>
            </div>

            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{payrollSummary.totalEmployees}</div>
                <div className="text-sm text-gray-600">Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${payrollSummary.totalGrossPay.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Gross Pay</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">${payrollSummary.totalDeductions.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Deductions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${payrollSummary.totalNetPay.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Net Pay</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Accounting Integration
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Journal entries created</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Tax liabilities recorded</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Payroll expenses posted</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Paystubs generated</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Available Actions:</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        // Fetch paystub data for bulk PDF generation
                        const response = await apiRequest('GET', `/api/payroll/runs/${payrollSummary.payRun.id}/paystubs/bulk-pdf`);
                        const result = await response.json();
                        
                        if (result.success && result.data) {
                          // Generate and download PDFs
                          PaystubPDFGenerator.downloadBulkPaystubPDFs(result.data as PaystubData[]);
                          
                          toast({
                            title: "PDFs Generated",
                            description: `Downloading ${result.data.length} paystub PDFs`,
                          });
                        } else {
                          throw new Error('Failed to fetch paystub data');
                        }
                      } catch (error) {
                        console.error('Error generating PDFs:', error);
                        toast({
                          title: "Error",
                          description: "Failed to generate paystub PDFs",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All Paystubs
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement email distribution
                      toast({
                        title: "Email Distribution",
                        description: "Email distribution will be implemented shortly",
                      });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Email Paystubs
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => {
                  setIsOpen(false);
                  setCurrentStep('setup');
                  setEmployeePayrollData([]);
                  setPayrollSummary(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}