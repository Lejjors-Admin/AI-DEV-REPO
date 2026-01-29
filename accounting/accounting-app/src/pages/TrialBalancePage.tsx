import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface TrialBalanceEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  subtype: string;
  balance: number;
  isDebitNormal: boolean;
}

interface FinancialStatements {
  balanceSheet: {
    assets: { totalAssets: number };
    liabilities: { totalLiabilities: number };
    equity: { totalEquity: number };
  };
  incomeStatement: {
    revenue: number;
    costOfGoodsSold: number;
    operatingExpenses: number;
    netIncome: number;
  };
  sectionMappings: Record<string, {
    name: string;
    accounts: Array<{
      accountName: string;
      balance: number;
    }>;
    totalBalance: number;
  }>;
}

export default function TrialBalancePage() {
  const [, params] = useRoute("/trial-balance/:clientId");
  const clientId = params?.clientId ? parseInt(params.clientId) : null;

  const { data: trialBalance, isLoading: tbLoading } = useQuery({
    queryKey: ["/api/trial-balance", clientId],
    enabled: !!clientId,
  });

  const { data: statements, isLoading: stLoading } = useQuery({
    queryKey: ["/api/financial-statements", clientId],
    enabled: !!clientId,
  });

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["/api/trial-balance-summary", clientId],
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold">Invalid Client ID</h2>
          <p className="text-muted-foreground">Please select a valid client to view trial balance.</p>
        </div>
      </div>
    );
  }

  if (tbLoading || stLoading || sumLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading trial balance data...</p>
        </div>
      </div>
    );
  }

  const entries: TrialBalanceEntry[] = trialBalance?.data || [];
  const financialStatements: FinancialStatements = statements || {
    balanceSheet: { assets: { totalAssets: 0 }, liabilities: { totalLiabilities: 0 }, equity: { totalEquity: 0 } },
    incomeStatement: { revenue: 0, costOfGoodsSold: 0, operatingExpenses: 0, netIncome: 0 },
    sectionMappings: {}
  };
  const balanceSummary = summary || { 
    totalAssets: 0, 
    totalLiabilities: 0, 
    totalEquity: 0, 
    netIncome: 0, 
    balanceDifference: 0 
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-gray-600";
  };

  const isBalanced = Math.abs(balanceSummary.balanceDifference || 0) < 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground">Client ID: {clientId}</p>
        </div>
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <Badge variant="default" className="flex items-center gap-2 bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              Balanced
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Imbalanced
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(balanceSummary.totalAssets || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Liabilities</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(balanceSummary.totalLiabilities || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Equity</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(balanceSummary.totalEquity || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={`text-lg font-semibold ${getBalanceColor(balanceSummary.netIncome || 0)}`}>
                  {formatCurrency(balanceSummary.netIncome || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trial-balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="financial-statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="section-mapping">Section Mapping</TabsTrigger>
        </TabsList>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subtype</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.accountId}>
                      <TableCell className="font-mono">
                        {entry.accountNumber || entry.accountId}
                      </TableCell>
                      <TableCell className="font-medium">{entry.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.accountType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.subtype || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getBalanceColor(entry.balance)}`}>
                        {formatCurrency(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Statements Tab */}
        <TabsContent value="financial-statements">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Assets</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.balanceSheet?.assets?.totalAssets || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Liabilities</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.balanceSheet?.liabilities?.totalLiabilities || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Equity</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.balanceSheet?.equity?.totalEquity || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Income Statement */}
            <Card>
              <CardHeader>
                <CardTitle>Income Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Revenue</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.incomeStatement?.revenue || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-orange-600 mb-2">Cost of Goods Sold</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.incomeStatement?.costOfGoodsSold || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Operating Expenses</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialStatements.incomeStatement?.operatingExpenses || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">Net Income</h4>
                  <p className={`text-2xl font-bold ${getBalanceColor(financialStatements.incomeStatement?.netIncome || 0)}`}>
                    {formatCurrency(financialStatements.incomeStatement?.netIncome || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Section Mapping Tab */}
        <TabsContent value="section-mapping">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(financialStatements.sectionMappings || {}).map(([sectionId, section]) => (
              <Card key={sectionId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {section.name}
                    <Badge variant="outline">{section.accounts?.length || 0} accounts</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className={`text-lg font-semibold ${getBalanceColor(section.totalBalance)}`}>
                      {formatCurrency(section.totalBalance)}
                    </p>
                  </div>
                  {section.accounts && section.accounts.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Mapped Accounts:</h5>
                      {section.accounts.map((account, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{account.accountName}</span>
                          <span className={getBalanceColor(account.balance)}>
                            {formatCurrency(account.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}