/**
 * REMITTANCE COMPLIANCE TAB COMPONENT
 * 
 * Real-time compliance monitoring, penalty calculations, and CRA correspondence tracking
 * for Canadian tax remittances
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calculator,
  Mail,
  Plus,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Remittance, RemittanceSchedule, TaxCompliance } from "@/lib/types";
import { RemittanceStatusBadge } from "./RemittanceStatusBadge";

interface RemittanceComplianceTabProps {
  clientId: number | null;
  complianceStatus: TaxCompliance | null;
  remittanceSchedules: RemittanceSchedule[];
  remittancePayments: Remittance[];
}

export default function RemittanceComplianceTab({
  clientId,
  complianceStatus,
  remittanceSchedules,
  remittancePayments
}: RemittanceComplianceTabProps) {
  const { toast } = useToast();
  const [selectedTaxType, setSelectedTaxType] = useState("all");
  const [showPenaltyCalculator, setShowPenaltyCalculator] = useState(false);
  const [showCorrespondenceDialog, setShowCorrespondenceDialog] = useState(false);

  // Fetch penalty calculations
  const { data: penaltyData, refetch: refetchPenalties } = useQuery({
    queryKey: ["tax-penalties", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/tax/penalty-calculations', {
        clientId,
        schedules: remittanceSchedules
      });
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Calculate compliance metrics
  const complianceMetrics = useMemo(() => {
    const totalRemittances = remittanceSchedules.length;
    const paidOnTime = remittanceSchedules.filter(s => s.status === 'paid' && new Date(s.dueDate) >= new Date()).length;
    const overdue = remittanceSchedules.filter(s => s.status === 'overdue').length;
    const pending = remittanceSchedules.filter(s => s.status === 'pending').length;
    
    const complianceScore = totalRemittances > 0 ? Math.round(((paidOnTime + pending) / totalRemittances) * 100) : 100;
    
    const totalPenalties = penaltyData?.reduce((sum: number, p: any) => sum + (p.penaltyAmount || 0), 0) || 0;
    const totalInterest = penaltyData?.reduce((sum: number, p: any) => sum + (p.interestAmount || 0), 0) || 0;
    
    return {
      complianceScore,
      totalRemittances,
      paidOnTime,
      overdue,
      pending,
      totalPenalties,
      totalInterest,
      riskLevel: complianceScore >= 90 ? 'low' : complianceScore >= 75 ? 'medium' : 'high'
    };
  }, [remittanceSchedules, penaltyData]);

  // Get compliance status color
  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  // Get risk level badge
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Tax type compliance breakdown
  const taxTypeCompliance = useMemo(() => {
    const types = ['cpp', 'ei', 'income_tax', 'gst_hst'];
    return types.map(type => {
      const typeSchedules = remittanceSchedules.filter(s => s.taxType === type);
      const typePaid = typeSchedules.filter(s => s.status === 'paid').length;
      const typeOverdue = typeSchedules.filter(s => s.status === 'overdue').length;
      const typeCompliance = typeSchedules.length > 0 ? Math.round((typePaid / typeSchedules.length) * 100) : 100;
      
      return {
        type,
        total: typeSchedules.length,
        paid: typePaid,
        overdue: typeOverdue,
        compliance: typeCompliance
      };
    });
  }, [remittanceSchedules]);

  // Upcoming compliance deadlines
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    return remittanceSchedules
      .filter(s => {
        const dueDate = new Date(s.dueDate);
        return dueDate >= today && dueDate <= thirtyDaysFromNow && s.status === 'pending';
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [remittanceSchedules]);

  return (
    <div className="space-y-6" data-testid="remittance-compliance-tab">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Compliance Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time tax compliance status and penalty tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPenaltyCalculator(true)}
            className="flex items-center gap-2"
            data-testid="button-penalty-calculator"
          >
            <Calculator className="h-4 w-4" />
            Penalty Calculator
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refetchPenalties()}
            className="flex items-center gap-2"
            data-testid="button-refresh-compliance"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compliance Status Alert */}
      {complianceMetrics.overdue > 0 && (
        <Alert variant="destructive" data-testid="compliance-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Compliance Issues Detected</AlertTitle>
          <AlertDescription>
            You have {complianceMetrics.overdue} overdue remittances that may result in penalties and interest charges.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Score Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="compliance-metrics">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance Score
            </CardDescription>
            <CardTitle className={`text-3xl font-bold ${getComplianceColor(complianceMetrics.complianceScore)}`}>
              {complianceMetrics.complianceScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceMetrics.complianceScore} className="h-2 mb-2" />
            {getRiskBadge(complianceMetrics.riskLevel)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              On-Time Payments
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">
              {complianceMetrics.paidOnTime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Out of {complianceMetrics.totalRemittances} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Remittances
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-red-600">
              {complianceMetrics.overdue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Penalties & Interest
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-red-600">
              ${(complianceMetrics.totalPenalties + complianceMetrics.totalInterest).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Penalties: ${complianceMetrics.totalPenalties.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Type Compliance Breakdown */}
      <Card data-testid="tax-type-compliance">
        <CardHeader>
          <CardTitle>Compliance by Tax Type</CardTitle>
          <CardDescription>
            Compliance status breakdown by individual tax types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxTypeCompliance.map(type => (
              <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-20 font-semibold">
                    {type.type.toUpperCase().replace('_', ' ')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {type.compliance}% Compliance
                      </span>
                      {type.overdue > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {type.overdue} overdue
                        </Badge>
                      )}
                    </div>
                    <Progress value={type.compliance} className="h-2 w-48" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{type.paid}/{type.total}</div>
                  <div className="text-xs text-muted-foreground">paid on time</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card data-testid="upcoming-deadlines">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Deadlines (30 days)
          </CardTitle>
          <CardDescription>
            Tax remittances due in the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div>
                      <div className="font-medium">{deadline.taxType?.toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        Due: {new Date(deadline.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${parseFloat(deadline.amount.toString()).toLocaleString()}
                    </div>
                    <RemittanceStatusBadge status={deadline.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Deadlines</h3>
              <p>No tax remittances due in the next 30 days.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Penalty and Interest Details */}
      {penaltyData && penaltyData.length > 0 && (
        <Card data-testid="penalty-details">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Penalty and Interest Calculations
            </CardTitle>
            <CardDescription>
              CRA penalties and interest charges for overdue remittances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Principal Amount</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Days Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penaltyData.map((penalty: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {penalty.taxType?.toUpperCase() || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(penalty.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(penalty.principalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-600">
                      ${parseFloat(penalty.penaltyAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-600">
                      ${parseFloat(penalty.interestAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      ${parseFloat(penalty.totalOwed || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={penalty.daysLate > 30 ? "destructive" : "secondary"}>
                        {penalty.daysLate} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CRA Correspondence Tracking */}
      <Card data-testid="cra-correspondence">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            CRA Correspondence
          </CardTitle>
          <CardDescription>
            Track communication and notices from the Canada Revenue Agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Button
              variant="outline"
              onClick={() => setShowCorrespondenceDialog(true)}
              className="flex items-center gap-2"
              data-testid="button-add-correspondence"
            >
              <Plus className="h-4 w-4" />
              Add CRA Communication
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Penalty Calculator Dialog */}
      <Dialog open={showPenaltyCalculator} onOpenChange={setShowPenaltyCalculator}>
        <DialogContent className="sm:max-w-md" data-testid="penalty-calculator-dialog">
          <DialogHeader>
            <DialogTitle>CRA Penalty Calculator</DialogTitle>
            <DialogDescription>
              Calculate penalties and interest for late tax remittances
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Principal Amount</Label>
                <Input type="number" placeholder="0.00" data-testid="input-penalty-amount" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" data-testid="input-penalty-due-date" />
              </div>
            </div>
            
            <div>
              <Label>Tax Type</Label>
              <select className="w-full p-2 border rounded" data-testid="select-penalty-tax-type">
                <option value="cpp">CPP</option>
                <option value="ei">EI</option>
                <option value="income_tax">Income Tax</option>
                <option value="gst_hst">GST/HST</option>
              </select>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Penalty Amount</Label>
                  <div className="text-lg font-semibold text-red-600">$0.00</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Interest Amount</Label>
                  <div className="text-lg font-semibold text-red-600">$0.00</div>
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Total Amount Owed</Label>
                <div className="text-xl font-bold text-red-600">$0.00</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPenaltyCalculator(false)}
                data-testid="button-close-penalty-calculator"
              >
                Close
              </Button>
              <Button data-testid="button-calculate-penalty">
                Calculate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}