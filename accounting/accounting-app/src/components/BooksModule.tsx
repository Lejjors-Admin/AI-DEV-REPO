/**
 * Books Module - Core Accounting Foundation
 * 
 * This module serves as the central hub for all accounting operations within AccountSync.
 * It provides comprehensive financial management capabilities and serves as the primary
 * data source for the TARS AI audit system.
 * 
 * Key Components:
 * - Trial Balance: Real-time view of account balances with debit/credit verification
 * - Chart of Accounts: Hierarchical account structure management
 * - Transaction Ledger: Complete transaction history with categorization
 * - Financial Reports: Standard and custom financial statement generation
 * 
 * Integration:
 * - Milton AI: Provides intelligent assistance for transaction categorization,
 *   account setup, and data processing
 * - TARS AI: Supplies real financial data for automated audit procedures
 * 
 * Features:
 * - Real-time financial metrics (Assets, Revenue, Expenses)
 * - Quick action buttons for common accounting tasks
 * - Data import/export capabilities
 * - Multi-client support with client-specific data isolation
 * 
 * @module BooksModule
 * @requires react
 * @requires @tanstack/react-query
 * @requires wouter
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiConfig } from "@/lib/api-config";
import { 
  BookOpen, Calculator, FileText, BarChart3, 
  Plus, Settings, Download, Upload, RefreshCw,
  TrendingUp, DollarSign, Receipt, Building2,
  Users, Calendar, Search, Filter
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrialBalanceViewer } from "@/components/TrialBalanceViewer";
import { ChartOfAccounts } from "@/components/ChartOfAccounts";
import TransactionLedger from "@/components/TransactionLedger";

interface BooksModuleProps {
  clientId: number;
}

export function BooksModule({ clientId }: BooksModuleProps) {
  const [activeTab, setActiveTab] = useState("trial-balance");

  // Fetch client data
  const { data: client } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    }
  });

  // Fetch summary metrics
  const { data: metrics } = useQuery({
    queryKey: ['/api/trial-balance-summary', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/trial-balance-summary/${clientId}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    }
  });

  // Fetch transaction count
  const { data: transactionCount } = useQuery({
    queryKey: ['/api/transactions', clientId, 'count'],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/transactions/${clientId}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const transactions = await response.json();
      return Array.isArray(transactions) ? transactions.length : 0;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  if (!client) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" role="main" aria-label="Books Module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" aria-hidden="true" />
            Books Module
          </h1>
          <p className="text-gray-600 mt-1">
            Complete accounting system for {client.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" aria-label="Import financial data">
            <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
            Import Data
          </Button>
          <Button variant="outline" size="sm" aria-label="Export financial reports">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export Reports
          </Button>
          <Button size="sm" aria-label="Create quick journal entry">
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Quick Entry
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Financial overview metrics">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600" aria-label={`Total assets: ${formatCurrency(metrics?.assets)}`}>
                  {formatCurrency(metrics?.assets)}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600" aria-label={`Total revenue: ${formatCurrency(metrics?.income)}`}>
                  {formatCurrency(metrics?.income)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600" aria-label={`Total expenses: ${formatCurrency(metrics?.expenses)}`}>
                  {formatCurrency(metrics?.expenses)}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-orange-500" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-purple-600" aria-label={`Total transactions: ${transactionCount || 0}`}>
                  {transactionCount || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common accounting tasks and functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="group" aria-label="Quick action buttons">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setActiveTab("transactions")}
              aria-label="Add new transaction"
            >
              <Receipt className="w-6 h-6" aria-hidden="true" />
              <span>Add Transaction</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setActiveTab("journal")}
              aria-label="Create journal entry"
            >
              <FileText className="w-6 h-6" aria-hidden="true" />
              <span>Journal Entry</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setActiveTab("chart-of-accounts")}
              aria-label="Manage chart of accounts"
            >
              <Building2 className="w-6 h-6" aria-hidden="true" />
              <span>Chart of Accounts</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setActiveTab("trial-balance")}
              aria-label="View trial balance"
            >
              <Calculator className="w-6 h-6" aria-hidden="true" />
              <span>Trial Balance</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="trial-balance" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="mt-6">
          <TrialBalanceViewer clientId={clientId} />
        </TabsContent>

        <TabsContent value="chart-of-accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your account structure and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartOfAccounts clientId={clientId.toString()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Ledger</CardTitle>
              <CardDescription>
                View and manage all financial transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionLedger clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Statements</CardTitle>
                <CardDescription>
                  Generate standard financial reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Balance Sheet
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Profit & Loss
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calculator className="w-4 h-4 mr-2" />
                  Trial Balance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cash Flow Statement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analysis Reports</CardTitle>
                <CardDescription>
                  Advanced financial analysis and insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Monthly Trends
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Customer Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Receipt className="w-4 h-4 mr-2" />
                  Expense Breakdown
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Period Comparison
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Source Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Real Accounting Data</h4>
              <p className="text-sm text-blue-700 mt-1">
                This Books module provides authentic financial data from your actual transactions and accounts. 
                TARS AI will analyze this real data when performing audit work, ensuring accurate and contextual insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Getting Started */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-green-900 mb-3">Getting Started with Books</h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">1.</span>
              <p>Set up your Chart of Accounts with all necessary account types (Assets, Liabilities, Equity, Income, Expenses)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">2.</span>
              <p>Import or manually enter your transactions - use Milton AI for automatic categorization</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">3.</span>
              <p>Review your Trial Balance to ensure debits equal credits and all accounts are properly classified</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">4.</span>
              <p>Generate financial reports for analysis, compliance, and decision-making</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}