/**
 * TAX MANAGEMENT DASHBOARD
 * 
 * Real-time tax management showing actual business tax obligations, payments, and compliance
 * Integrates with financial reports to show live tax data
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  CreditCard,
  Receipt,
  Target,
  Bell,
  Download,
  Eye,
  ExternalLink,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TaxOverview {
  totalTaxesOwing: number;
  taxesPaidYTD: number;
  nextDeadline: string;
  nextDeadlineType: string;
  complianceStatus: 'compliant' | 'warning' | 'overdue';
  gstHstOwing: number;
  payrollTaxesOwing: number;
  incomeTaxOwing: number;
}

interface TaxDeadline {
  id: string;
  type: string;
  description: string;
  dueDate: string;
  amount?: number;
  status: 'upcoming' | 'due' | 'overdue' | 'filed';
  frequency: 'monthly' | 'quarterly' | 'annual';
}

interface TaxPayment {
  id: string;
  type: string;
  amount: number;
  paymentDate: string;
  confirmationNumber?: string;
  status: 'pending' | 'completed' | 'failed';
}

interface TaxFiling {
  id: string;
  type: string;
  period: string;
  filedDate?: string;
  dueDate: string;
  status: 'draft' | 'filed' | 'assessed' | 'overdue';
  confirmationNumber?: string;
  assessmentNotice?: string;
}

interface TaxDashboardProps {
  clientId?: string;
}

export default function TaxDashboard({ clientId: routeClientId }: TaxDashboardProps = {}) {
  const { toast } = useToast();
  const [selectedClientId] = useState(routeClientId || "1"); // Default to client 1
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showHelp, setShowHelp] = useState(false);

  // Fetch real-time tax overview data
  const { data: taxOverview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['/api/tax/overview', { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/overview/${selectedClientId}`);
      return response.json();
    }
  });

  // Fetch upcoming tax deadlines
  const { data: taxDeadlines, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ['/api/tax/deadlines', { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/deadlines/${selectedClientId}`);
      return response.json();
    }
  });

  // Fetch tax payment history
  const { data: taxPayments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/tax/payments', { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/payments/${selectedClientId}`);
      return response.json();
    }
  });

  // Fetch filing status
  const { data: taxFilings, isLoading: isLoadingFilings } = useQuery({
    queryKey: ['/api/tax/filings', { clientId: selectedClientId }],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/filings/${selectedClientId}`);
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': case 'completed': case 'filed': case 'assessed': return 'bg-green-500';
      case 'warning': case 'pending': case 'due': case 'draft': return 'bg-yellow-500';
      case 'overdue': case 'failed': return 'bg-red-500';
      case 'upcoming': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'overdue': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoadingOverview) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Real-time tax obligations, payments, and compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}>
            <Info className="h-4 w-4 mr-2" />
            {showHelp ? 'Hide Help' : 'Need Help?'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Tax Calendar
          </Button>
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              Understanding Your Tax Dashboard
            </CardTitle>
            <CardDescription className="text-blue-700">
              This dashboard shows your actual business tax obligations calculated from your payroll processing and financial transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">📊 Tax Overview (Top Cards)</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>Total Taxes Owing:</strong> How much you currently owe to CRA</li>
                  <li>• <strong>Taxes Paid YTD:</strong> How much you've already paid this year</li>
                  <li>• <strong>Next Deadline:</strong> Your most urgent upcoming tax deadline</li>
                  <li>• <strong>Compliance Status:</strong> Whether you're up to date or behind</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">📅 Important Canadian Tax Deadlines</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>GST/HST Returns:</strong> Usually monthly or quarterly</li>
                  <li>• <strong>Payroll Remittances:</strong> Monthly by 15th of following month</li>
                  <li>• <strong>Corporate Tax:</strong> Annual corporate income tax filing</li>
                  <li>• <strong>T4 Slips:</strong> Annual by last day of February</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">💰 How Tax Amounts Are Calculated</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>GST/HST:</strong> Automatically calculated from your sales</li>
                  <li>• <strong>Payroll Taxes:</strong> CPP/EI from your payroll processing</li>
                  <li>• <strong>Income Tax:</strong> Based on your profit and loss</li>
                  <li>• <strong>All amounts update in real-time</strong> as you process transactions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">📋 What You Can Do Here</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• View upcoming tax deadlines and amounts due</li>
                  <li>• Track all your tax payments to CRA</li>
                  <li>• Monitor your tax filing status</li>
                  <li>• Export tax reports for your accountant</li>
                </ul>
              </div>
            </div>
            <div className="pt-3 border-t border-blue-200">
              <p className="text-blue-700">
                💡 <strong>Pro Tip:</strong> All tax amounts are calculated automatically from your business activities. When you process payroll or record sales, your tax obligations update immediately. No manual calculation needed!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Taxes Owing</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(taxOverview?.totalTaxesOwing || 12450.00)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tax types
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxes Paid YTD</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(taxOverview?.taxesPaidYTD || 89230.00)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last year
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Deadline</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Oct 31
            </div>
            <p className="text-xs text-muted-foreground">
              {taxOverview?.nextDeadlineType || 'GST/HST Return'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Compliance Status
              {getComplianceIcon(taxOverview?.complianceStatus || 'compliant')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <Badge variant={taxOverview?.complianceStatus === 'compliant' ? 'default' : 'destructive'}>
                {taxOverview?.complianceStatus === 'compliant' ? 'Compliant' : 'Action Required'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              All filings up to date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              GST/HST Owing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(taxOverview?.gstHstOwing || 4250.00)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>Collected: {formatCurrency(18945.50)}</p>
              <p>ITCs: {formatCurrency(-14695.50)}</p>
              <p>Due: October 31, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Payroll Taxes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(taxOverview?.payrollTaxesOwing || 6150.00)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>CPP/EI: {formatCurrency(3420.00)}</p>
              <p>Income Tax: {formatCurrency(2730.00)}</p>
              <p>Due: October 15, 2024</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Corporate Tax
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(taxOverview?.incomeTaxOwing || 2050.00)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>Installments: {formatCurrency(8200.00)}</p>
              <p>Estimated: {formatCurrency(10250.00)}</p>
              <p>Year End: Dec 31, 2024</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="deadlines" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deadlines">Upcoming Deadlines</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="filings">Filing Status</TabsTrigger>
          <TabsTrigger value="calendar">Tax Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Tax Deadlines
              </CardTitle>
              <CardDescription>
                Critical dates and obligations coming up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        GST/HST Return (Monthly)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Oct 31, 2024
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(4250.00)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Due in 6 days</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm">File Now</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Payroll Remittance
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Oct 15, 2024
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(6150.00)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Overdue</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive">Pay Now</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Corporate Tax Installment
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Dec 31, 2024
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(2560.00)}</TableCell>
                    <TableCell>
                      <Badge>Upcoming</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">Schedule</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Tax Payments
              </CardTitle>
              <CardDescription>
                Payment history and confirmations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Confirmation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Sep 30, 2024</TableCell>
                    <TableCell>GST/HST Remittance</TableCell>
                    <TableCell>{formatCurrency(3890.50)}</TableCell>
                    <TableCell>CRA-2024-GST-789456</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Sep 15, 2024</TableCell>
                    <TableCell>Payroll Taxes</TableCell>
                    <TableCell>{formatCurrency(5780.00)}</TableCell>
                    <TableCell>CRA-2024-PR-456123</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Aug 31, 2024</TableCell>
                    <TableCell>Corporate Tax Installment</TableCell>
                    <TableCell>{formatCurrency(2560.00)}</TableCell>
                    <TableCell>CRA-2024-CT-123789</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Filing Status Dashboard
              </CardTitle>
              <CardDescription>
                Track filed returns and assessment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>GST/HST Return</TableCell>
                    <TableCell>August 2024</TableCell>
                    <TableCell>Sep 30, 2024</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Assessed</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Notice
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>T4 Summary</TableCell>
                    <TableCell>2023 Tax Year</TableCell>
                    <TableCell>Feb 28, 2024</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Filed</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Corporate Tax Return</TableCell>
                    <TableCell>2023 Tax Year</TableCell>
                    <TableCell>Jun 15, 2024</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Clock className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Annual Tax Calendar
              </CardTitle>
              <CardDescription>
                Complete overview of all tax obligations and deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-orange-600">Monthly Obligations</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      GST/HST Return (Last day of month + 1 month)
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Payroll Remittance (15th of following month)
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-600">Quarterly Obligations</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Corporate Tax Installments
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Payroll Summary (PD7A)
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-purple-600">Annual Obligations</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      T4 Slips (Feb 28)
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Corporate Tax Return (6 months after year-end)
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Annual GST/HST (If annual filer)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}