/**
 * Expense Overview Dashboard Component
 * Provides interactive analytics and charts for expense management
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiConfig } from "@/lib/api-config";
import { 

  DollarSign, 
  TrendingDown, 
  Users, 
  FileText, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Building
} from 'lucide-react';

interface BillData {
  id: number;
  billNumber: string;
  vendorId: number;
  vendorName: string;
  date: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
}

interface VendorData {
  id: number;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

interface ExpenseOverviewProps {
  clientId: number;
}

export default function ExpenseOverview({ clientId }: ExpenseOverviewProps) {

 
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Fetch bills
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['bills', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/bills/${clientId}`), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch bills');
      const result = await response.json();
      return result.data as BillData[];
    }
  });

  // Fetch vendors
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contacts/${clientId}`), {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const result = await response.json();
      return result.data.filter((contact: any) => 
        contact.contactType === 'vendor' || contact.contactType === 'both'
      ) as VendorData[];
    }
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalExpenses = bills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);
    const totalOutstanding = bills
      .filter(bill => bill.status !== 'paid')
      .reduce((sum, bill) => sum + parseFloat(bill.balanceDue || '0'), 0);
    const totalPaid = bills
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);
    
    const overdueBills = bills.filter(bill => 
      bill.status === 'overdue' || 
      (bill.status === 'sent' && new Date(bill.dueDate) < new Date())
    );

    // Monthly expenses (last 12 months)
    const monthlyExpenses = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthBills = bills.filter(bill => {
        const billDate = new Date(bill.date);
        return billDate.getMonth() === month.getMonth() && 
               billDate.getFullYear() === month.getFullYear();
      });
      const monthTotal = monthBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);
      monthlyExpenses.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthTotal
      });
    }

    // Status distribution
    const statusCounts = {
      draft: bills.filter(bill => bill.status === 'draft').length,
      sent: bills.filter(bill => bill.status === 'sent').length,
      paid: bills.filter(bill => bill.status === 'paid').length,
      overdue: overdueBills.length,
      cancelled: bills.filter(bill => bill.status === 'cancelled').length
    };

    // Top vendors by amount
    const vendorExpenses = {};
    bills.forEach(bill => {
      if (!vendorExpenses[bill.vendorId]) {
        vendorExpenses[bill.vendorId] = {
          vendorName: bill.vendorName,
          totalAmount: 0,
          billCount: 0
        };
      }
      vendorExpenses[bill.vendorId].totalAmount += parseFloat(bill.totalAmount || '0');
      vendorExpenses[bill.vendorId].billCount++;
    });

    const topVendors = Object.values(vendorExpenses)
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    return {
      totalExpenses,
      totalOutstanding,
      totalPaid,
      overdueBills: overdueBills.length,
      totalBills: bills.length,
      totalVendors: vendors.length,
      monthlyExpenses,
      statusCounts,
      topVendors,
      paymentRatio: totalExpenses > 0 ? (totalPaid / totalExpenses) * 100 : 0
    };
  }, [bills, vendors]);

  const isLoading = billsLoading || vendorsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalBills} bills total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${analytics.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overdueBills} overdue bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${analytics.totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.paymentRatio.toFixed(1)}% payment ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVendors}</div>
            <p className="text-xs text-muted-foreground">
              Active vendor relationships
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bill Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bill Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Draft</Badge>
                <span className="text-sm">{analytics.statusCounts.draft}</span>
              </div>
              <div className="text-sm font-medium">
                {analytics.totalBills > 0 ? ((analytics.statusCounts.draft / analytics.totalBills) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <Progress 
              value={analytics.totalBills > 0 ? (analytics.statusCounts.draft / analytics.totalBills) * 100 : 0} 
              className="h-2"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="default">Sent</Badge>
                <span className="text-sm">{analytics.statusCounts.sent}</span>
              </div>
              <div className="text-sm font-medium">
                {analytics.totalBills > 0 ? ((analytics.statusCounts.sent / analytics.totalBills) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <Progress 
              value={analytics.totalBills > 0 ? (analytics.statusCounts.sent / analytics.totalBills) * 100 : 0} 
              className="h-2"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-500">Paid</Badge>
                <span className="text-sm">{analytics.statusCounts.paid}</span>
              </div>
              <div className="text-sm font-medium">
                {analytics.totalBills > 0 ? ((analytics.statusCounts.paid / analytics.totalBills) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <Progress 
              value={analytics.totalBills > 0 ? (analytics.statusCounts.paid / analytics.totalBills) * 100 : 0} 
              className="h-2"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className="bg-red-500">Overdue</Badge>
                <span className="text-sm">{analytics.statusCounts.overdue}</span>
              </div>
              <div className="text-sm font-medium">
                {analytics.totalBills > 0 ? ((analytics.statusCounts.overdue / analytics.totalBills) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <Progress 
              value={analytics.totalBills > 0 ? (analytics.statusCounts.overdue / analytics.totalBills) * 100 : 0} 
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topVendors.map((vendor: any, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{vendor.vendorName}</p>
                      <p className="text-sm text-muted-foreground">{vendor.billCount} bills</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${vendor.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {analytics.totalExpenses > 0 ? ((vendor.totalAmount / analytics.totalExpenses) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              ))}
              {analytics.topVendors.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No vendor data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bills.slice(0, 5).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{bill.billNumber}</p>
                    <p className="text-sm text-muted-foreground">{bill.vendorName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(bill.totalAmount).toLocaleString()}</p>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      bill.status === 'paid' ? 'bg-green-500' :
                      bill.status === 'overdue' ? 'bg-red-500' :
                      bill.status === 'sent' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }>
                      {bill.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(bill.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {bills.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No bills found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}