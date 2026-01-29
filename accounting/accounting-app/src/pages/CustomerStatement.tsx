/**
 * Customer Statement of Account
 * Displays all transactions and running balance for a customer
 */

import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { useSelectedClient } from '@/contexts/SelectedClientContext';
import { format } from 'date-fns';
import { apiConfig } from '@/lib/api-config';

interface StatementData {
  customer: {
    id: number;
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    businessNumber?: string;
    website?: string;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  transactions: Array<{
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    status: string;
    dueDate?: string;
  }>;
  summary: {
    totalDebits: number;
    totalCredits: number;
    currentBalance: number;
    transactionCount: number;
  };
}

export default function CustomerStatement() {
  const { customerId } = useParams();
  const [, setLocation] = useLocation();
  const { selectedClientId } = useSelectedClient();
  
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Fetch statement data
  const { data: statementResponse, isLoading, error } = useQuery({
    queryKey: ['customer-statement', customerId, selectedClientId, appliedStartDate, appliedEndDate],
    queryFn: async () => {
      let url = `/api/crm/customer/${customerId}/statement?clientId=${selectedClientId}`;
      if (appliedStartDate) url += `&startDate=${appliedStartDate}`;
      if (appliedEndDate) url += `&endDate=${appliedEndDate}`;
      
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["Content-Type"] = "application/json";
      }
      const response = await fetch(apiConfig.buildUrl(url), { headers, credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch statement');
      return response.json();
    },
    enabled: !!customerId && !!selectedClientId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0,    // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  const statement: StatementData | null = statementResponse?.data || null;

  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading statement...</p>
        </div>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">Failed to load customer statement</p>
              <Button onClick={() => setLocation('/customers')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Customers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/books/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Statement of Account</h1>
              <p className="text-gray-600">{statement.customer.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Date range filters */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Date Range Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleApplyFilters}>Apply</Button>
              <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* Statement Document */}
        <Card className="print:shadow-none">
          <CardContent className="p-8">
            {/* Header Section */}
            <div className="border-b pb-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">STATEMENT OF ACCOUNT</h2>
              <div className="grid grid-cols-2 gap-8">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{statement.customer.name}</p>
                    {statement.customer.companyName && (
                      <p>{statement.customer.companyName}</p>
                    )}
                    {statement.customer.address && <p>{statement.customer.address}</p>}
                    {(statement.customer.city || statement.customer.province || statement.customer.postalCode) && (
                      <p>
                        {[statement.customer.city, statement.customer.province, statement.customer.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {statement.customer.email && <p>Email: {statement.customer.email}</p>}
                    {statement.customer.phone && <p>Phone: {statement.customer.phone}</p>}
                    {statement.customer.businessNumber && (
                      <p>Business #: {statement.customer.businessNumber}</p>
                    )}
                  </div>
                </div>

                {/* Statement Info */}
                <div className="text-right">
                  <h3 className="font-semibold mb-2">Statement Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>Statement Date: {format(new Date(), 'MMMM d, yyyy')}</p>
                    {statement.dateRange.startDate && (
                      <p>Period From: {format(new Date(statement.dateRange.startDate), 'MMMM d, yyyy')}</p>
                    )}
                    {statement.dateRange.endDate && (
                      <p>Period To: {format(new Date(statement.dateRange.endDate), 'MMMM d, yyyy')}</p>
                    )}
                    <p className="font-semibold text-lg mt-4">
                      Current Balance: {formatCurrency(statement.summary.currentBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Transaction History</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-y">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Reference</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Charges</th>
                    <th className="text-right p-2">Payments</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-gray-500">
                        No transactions found for the selected period
                      </td>
                    </tr>
                  ) : (
                    statement.transactions.map((transaction, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{format(new Date(transaction.date), 'MMM d, yyyy')}</td>
                        <td className="p-2">{transaction.reference}</td>
                        <td className="p-2">{transaction.description}</td>
                        <td className="p-2 text-right">
                          {transaction.debit > 0 ? formatCurrency(transaction.debit) : '—'}
                        </td>
                        <td className="p-2 text-right">
                          {transaction.credit > 0 ? formatCurrency(transaction.credit) : '—'}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(transaction.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Charges:</span>
                    <span className="font-medium">{formatCurrency(statement.summary.totalDebits)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Payments:</span>
                    <span className="font-medium">{formatCurrency(statement.summary.totalCredits)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Current Balance:</span>
                    <span className={statement.summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(statement.summary.currentBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-xs text-gray-500 text-center print:mt-12">
              <p>Thank you for your business. Please remit payment by the due date.</p>
              {statement.summary.currentBalance > 0 && (
                <p className="mt-2 font-medium">Amount Due: {formatCurrency(statement.summary.currentBalance)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
