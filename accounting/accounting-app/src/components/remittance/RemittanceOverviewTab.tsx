/**
 * REMITTANCE OVERVIEW TAB COMPONENT
 * 
 * Dashboard view showing summary cards, quick actions, and key metrics
 * for tax remittance tracking
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  Eye,
  Plus
} from "lucide-react";
import type { RemittanceSchedule, Remittance, TaxCompliance } from "@shared/database/tax-entities";
import { RemittanceStatusBadge } from "./RemittanceStatusBadge";

interface RemittanceOverviewTabProps {
  clientId: number | null;
  remittanceSchedules: RemittanceSchedule[];
  remittancePayments: Remittance[];
  complianceStatus: TaxCompliance | null;
  dueDates: any[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export default function RemittanceOverviewTab({
  clientId,
  remittanceSchedules,
  remittancePayments,
  complianceStatus,
  dueDates,
  selectedYear,
  onYearChange
}: RemittanceOverviewTabProps) {
  const [selectedTaxType, setSelectedTaxType] = useState<string>("all");

  // Calculate summary metrics
  // Note: RemittanceSchedules don't have amounts, calculate from related remittances
  const totalOutstanding = remittancePayments
    .filter(payment => payment.status === 'pending' || payment.status === 'overdue')
    .reduce((sum, payment) => sum + (parseFloat(payment.liability.toString()) - parseFloat(payment.paidAmount.toString())), 0);

  const ytdPayments = remittancePayments
    .reduce((sum, payment) => sum + parseFloat(payment.paidAmount.toString()), 0);

  const overdueCount = remittancePayments
    .filter(payment => payment.status === 'overdue').length;

  const upcomingCount = remittancePayments
    .filter(payment => {
      const dueDate = new Date(payment.dueDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      return dueDate >= today && dueDate <= thirtyDaysFromNow && payment.status === 'pending';
    }).length;

  // Get upcoming remittances (next 5)
  const upcomingRemittances = remittancePayments
    .filter(payment => {
      const dueDate = new Date(payment.dueDate);
      const today = new Date();
      return dueDate >= today && (payment.status === 'pending' || payment.status === 'overdue');
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Calculate compliance score
  const calculateComplianceScore = () => {
    if (!complianceStatus) return 0;
    
    const totalItems = overdueCount + upcomingCount + remittancePayments.length;
    const compliantItems = remittancePayments.length;
    
    return totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100;
  };

  const complianceScore = calculateComplianceScore();

  // Tax type options for filtering
  const taxTypeOptions = [
    { value: "all", label: "All Tax Types" },
    { value: "cpp", label: "CPP" },
    { value: "ei", label: "EI" },
    { value: "income_tax", label: "Income Tax" },
    { value: "gst_hst", label: "GST/HST" }
  ];

  return (
    <div className="space-y-6" data-testid="remittance-overview-tab">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2023, 2022, 2021].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTaxType} onValueChange={setSelectedTaxType}>
            <SelectTrigger className="w-48" data-testid="select-tax-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taxTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2" data-testid="button-generate-report">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" className="flex items-center gap-2" data-testid="button-export-data">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="metrics-cards">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Outstanding Amount
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              ${totalOutstanding.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} overdue
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {remittancePayments.filter(s => s.status === 'pending' || s.status === 'overdue').length} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              YTD Payments
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              ${ytdPayments.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">
              {remittancePayments.length} payments made
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming (30 days)
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {upcomingCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">
              Due in next 30 days
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Compliance Score
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {complianceScore}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceScore} className="h-2" />
            <span className="text-sm text-muted-foreground mt-1">
              {complianceScore >= 90 ? "Excellent" : complianceScore >= 75 ? "Good" : "Needs attention"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-testid="quick-actions-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common remittance management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button className="justify-start" data-testid="button-record-payment">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
            <Button variant="outline" className="justify-start" data-testid="button-view-schedule">
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Button>
            <Button variant="outline" className="justify-start" data-testid="button-compliance-check">
              <CheckCircle className="h-4 w-4 mr-2" />
              Compliance Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Remittances Table */}
      <Card data-testid="upcoming-remittances-card">
        <CardHeader>
          <CardTitle>Upcoming Remittances</CardTitle>
          <CardDescription>
            Next {upcomingRemittances.length} remittances requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingRemittances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingRemittances.map((remittance, index) => (
                  <TableRow key={index} data-testid={`upcoming-remittance-${index}`}>
                    <TableCell className="font-medium">
                      {remittance.type?.toUpperCase() || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(remittance.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(remittance.liability.toString()).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <RemittanceStatusBadge status={remittance.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" data-testid={`button-view-${index}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" data-testid={`button-pay-${index}`}>
                          Pay Now
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming remittances found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}