/**
 * Income Overview Dashboard Component
 * Provides interactive analytics and charts for income management
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiConfig } from "@/lib/api-config";
import { 

  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  date: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
}

interface CustomerData {
  id: number;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

interface IncomeOverviewProps {
  clientId: number;
}

export default function IncomeOverview({ clientId }: IncomeOverviewProps) {
  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoices/${clientId}`), {
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const result = await response.json();
      return result.data as InvoiceData[];
    }
  });

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contacts/${clientId}`), {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const result = await response.json();
      return result.data.filter((contact: any) => 
        contact.contactType === 'customer' || contact.contactType === 'both'
      ) as CustomerData[];
    }
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || '0'), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || '0'), 0);
    
    const invoicesByStatus = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
    const sentInvoices = invoices.filter(inv => inv.status === 'sent').length;

    // Recent invoices (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInvoices = invoices.filter(inv => 
      new Date(inv.createdAt) >= thirtyDaysAgo
    );

    const avgInvoiceAmount = invoices.length > 0 ? totalInvoiced / invoices.length : 0;
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // Customer metrics
    const customersWithInvoices = new Set(invoices.map(inv => inv.customerId)).size;
    const avgInvoicesPerCustomer = customersWithInvoices > 0 ? invoices.length / customersWithInvoices : 0;

    // Monthly trends (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const monthTotal = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
      const monthPaid = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || '0'), 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        invoiced: monthTotal,
        paid: monthPaid,
        count: monthInvoices.length
      });
    }

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoicesByStatus,
      paidInvoices,
      overdueInvoices,
      draftInvoices,
      sentInvoices,
      recentInvoices: recentInvoices.length,
      avgInvoiceAmount,
      collectionRate,
      customersWithInvoices,
      avgInvoicesPerCustomer,
      monthlyData
    };
  }, [invoices]);

  if (invoicesLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalInvoiced.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.length} total invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${analytics.totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.collectionRate.toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${analytics.totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overdueInvoices} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.customersWithInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.avgInvoicesPerCustomer.toFixed(1)} avg invoices/customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {analytics.paidInvoices}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {invoices.length > 0 ? ((analytics.paidInvoices / invoices.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <Progress value={invoices.length > 0 ? (analytics.paidInvoices / invoices.length) * 100 : 0} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Sent</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {analytics.sentInvoices}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {invoices.length > 0 ? ((analytics.sentInvoices / invoices.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <Progress value={invoices.length > 0 ? (analytics.sentInvoices / invoices.length) * 100 : 0} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm">Draft</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                  {analytics.draftInvoices}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {invoices.length > 0 ? ((analytics.draftInvoices / invoices.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <Progress value={invoices.length > 0 ? (analytics.draftInvoices / invoices.length) * 100 : 0} className="h-2" />

            {analytics.overdueInvoices > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Overdue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {analytics.overdueInvoices}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {((analytics.overdueInvoices / invoices.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={(analytics.overdueInvoices / invoices.length) * 100} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyData.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{month.month}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${month.invoiced.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {month.count} invoices, ${month.paid.toFixed(2)} collected
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Invoice Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${analytics.avgInvoiceAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{analytics.recentInvoices}</div>
            <p className="text-xs text-muted-foreground">new invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collection Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{analytics.collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">of invoices collected</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}