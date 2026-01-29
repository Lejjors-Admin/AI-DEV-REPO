/**
 * Trial Balance Section for BINDER
 * 
 * Complete trial balance management with:
 * 1. Live Books integration
 * 2. Manual editing
 * 3. Excel import
 * 4. AI grouping
 * 5. Financial statements
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";
import { 
  Calculator, 
  Database, 
  Edit3, 
  Upload, 
  Bot, 
  FileSpreadsheet, 
  Save,
  Zap,
  TrendingUp,
  BarChart3,
  Settings
} from "lucide-react";

interface TrialBalanceSectionProps {
  clientId: number;
  binderId: number;
}

interface TrialBalanceEntry {
  accountId: number;
  accountNumber: string | null;
  accountName: string;
  accountType: string;
  subtype: string | null;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  balance: number;
  isDebitNormal: boolean;
  grouping?: string;
  isEdited?: boolean;
}

export function TrialBalanceSection({ clientId, binderId }: TrialBalanceSectionProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dataSource, setDataSource] = useState<'live' | 'manual' | 'excel'>('live');
  const [editingAccount, setEditingAccount] = useState<number | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [showGroupingDialog, setShowGroupingDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Trial balance data
  const { data: trialBalanceData, isLoading } = useQuery({
    queryKey: ['/api/trial-balance', clientId, selectedDate],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/trial-balance/${clientId}?asOfDate=${selectedDate}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trial balance');
      return response.json();
    }
  });

  // Financial statements
  const { data: statements } = useQuery({
    queryKey: ['/api/financial-statements', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/financial-statements/${clientId}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch statements');
      return response.json();
    }
  });

  // AI Grouping mutation
  const aiGroupingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/ai-grouping/suggest', { 
        clientId, 
        trialBalance: trialBalanceData?.data || [] 
      });
    },
    onSuccess: (data) => {
      toast({ 
        title: "AI Grouping Applied", 
        description: `Successfully grouped ${data.groupingsApplied} of ${data.totalAccounts} accounts` 
      });
      // Update the trial balance data in the cache with the grouped accounts
      queryClient.setQueryData(['/api/trial-balance', clientId, selectedDate], (oldData: any) => ({
        ...oldData,
        data: data.groupedAccounts
      }));
    },
    onError: (error) => {
      toast({ 
        title: "AI Grouping Failed", 
        description: "Unable to generate AI groupings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Manual balance edit
  const editBalanceMutation = useMutation({
    mutationFn: async ({ accountId, newBalance }: { accountId: number; newBalance: number }) => {
      return apiRequest('PUT', '/api/trial-balance/edit-balance', { 
        accountId, 
        newBalance, 
        clientId,
        binderId 
      });
    },
    onSuccess: () => {
      toast({ title: "Balance Updated", description: "Account balance manually updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/trial-balance', clientId] });
      setEditingAccount(null);
    }
  });

  const handleEditBalance = (accountId: number, currentBalance: number) => {
    setEditingAccount(accountId);
    setEditBalance(currentBalance.toString());
  };

  const handleSaveBalance = () => {
    if (editingAccount && editBalance) {
      editBalanceMutation.mutate({
        accountId: editingAccount,
        newBalance: parseFloat(editBalance)
      });
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle Excel upload - will implement the backend endpoint
      toast({ title: "Excel Import", description: "Excel import functionality will process the file" });
    }
  };

  const trialBalance = trialBalanceData?.data || [];

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "$0.00";
    }
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

  // Calculate trial balance totals
  const totalDebits = trialBalance.reduce((sum: number, entry: TrialBalanceEntry) => {
    const debitAmount = entry.debitBalance || (entry.balance > 0 ? entry.balance : 0) || 0;
    return sum + debitAmount;
  }, 0);
  const totalCredits = trialBalance.reduce((sum: number, entry: TrialBalanceEntry) => {
    const creditAmount = entry.creditBalance || (entry.balance < 0 ? Math.abs(entry.balance) : 0) || 0;
    return sum + creditAmount;
  }, 0);
  const balanceDifference = totalDebits - totalCredits;

  return (
    <div className="space-y-6">
      {/* Header with Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Trial Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Data Source Selection */}
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(value) => setDataSource(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Live from Books
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Manual Entry
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel Import
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label>AI Grouping</Label>
              <Button 
                onClick={() => aiGroupingMutation.mutate()}
                disabled={aiGroupingMutation.isPending}
                className="w-full"
                variant="outline"
              >
                <Bot className="h-4 w-4 mr-2" />
                {aiGroupingMutation.isPending ? 'Processing...' : 'Auto Group'}
              </Button>
            </div>

            {/* Excel Upload */}
            <div className="space-y-2">
              <Label>Import Excel</Label>
              <label className="w-full">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Excel
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data">Trial Balance Data</TabsTrigger>
          <TabsTrigger value="grouping">Grouping Rules</TabsTrigger>
          <TabsTrigger value="statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="analysis">TARS Analysis</TabsTrigger>
        </TabsList>

        {/* Trial Balance Data Tab */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Account Balances
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                    <Zap className="h-3 w-3 mr-1" />
                    {trialBalance.length} accounts
                  </Badge>
                  <Badge 
                    variant={Math.abs(balanceDifference) < 0.01 ? "default" : "destructive"}
                    className={Math.abs(balanceDifference) < 0.01 ? "bg-green-100 text-green-800" : ""}
                  >
                    Balance: {formatCurrency(balanceDifference)}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Grouping</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.map((entry: TrialBalanceEntry) => {
                      const displayBalance = entry.balance || entry.netBalance || 0;
                      return (
                        <TableRow key={entry.accountId} className={entry.isEdited ? 'bg-blue-50' : ''}>
                          <TableCell className="font-mono text-sm">
                            {entry.accountNumber || entry.accountId}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.accountName}
                            {entry.isEdited && (
                              <Badge variant="secondary" className="ml-2 text-xs">Edited</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {entry.accountType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                              {entry.grouping || 'Ungrouped'}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${getBalanceColor(displayBalance)}`}>
                            {editingAccount === entry.accountId ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editBalance}
                                  onChange={(e) => setEditBalance(e.target.value)}
                                  className="w-24 h-8 text-right"
                                  step="0.01"
                                />
                                <Button size="sm" onClick={handleSaveBalance}>
                                  <Save className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              formatCurrency(displayBalance)
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditBalance(entry.accountId, displayBalance)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Trial Balance Totals Row */}
                    <TableRow className="border-t-2 font-bold bg-gray-50">
                      <TableCell colSpan={4} className="text-right">TOTALS:</TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="space-y-1">
                          <div className="text-green-600">Debits: {formatCurrency(totalDebits)}</div>
                          <div className="text-red-600">Credits: {formatCurrency(totalCredits)}</div>
                          <div className={`font-bold ${Math.abs(balanceDifference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                            Difference: {formatCurrency(balanceDifference)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grouping Rules Tab */}
        <TabsContent value="grouping">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Grouping Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">AI-Suggested Groupings</h4>
                    <p className="text-sm text-yellow-700">
                      The AI system analyzes account types, names, and patterns to suggest optimal groupings for financial statement presentation.
                    </p>
                  </div>
                  
                  <Button onClick={() => aiGroupingMutation.mutate()} disabled={aiGroupingMutation.isPending}>
                    <Bot className="h-4 w-4 mr-2" />
                    {aiGroupingMutation.isPending ? 'Generating Rules...' : 'Generate AI Grouping Rules'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Display Current Groupings */}
            <Card>
              <CardHeader>
                <CardTitle>Current Account Groupings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Assets */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-green-600 mb-3">Current Assets</h4>
                    {trialBalance
                      .filter(account => account.accountType === 'asset' && 
                        (account.subtype === 'current_asset' || 
                         account.accountName.toLowerCase().includes('cash') ||
                         account.accountName.toLowerCase().includes('receivable')))
                      .map(account => (
                        <div key={account.accountId} className="flex justify-between text-sm py-1">
                          <span>{account.accountName}</span>
                          <span className="font-mono">{formatCurrency(account.balance || account.netBalance || 0)}</span>
                        </div>
                      ))}
                  </div>

                  {/* Current Liabilities */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-red-600 mb-3">Current Liabilities</h4>
                    {trialBalance
                      .filter(account => account.accountType === 'liability' && 
                        (account.subtype === 'current_liability' || 
                         account.accountName.toLowerCase().includes('payable') ||
                         account.accountName.toLowerCase().includes('tax')))
                      .map(account => (
                        <div key={account.accountId} className="flex justify-between text-sm py-1">
                          <span>{account.accountName}</span>
                          <span className="font-mono">{formatCurrency(account.balance || account.netBalance || 0)}</span>
                        </div>
                      ))}
                  </div>

                  {/* Revenue */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-blue-600 mb-3">Revenue</h4>
                    {trialBalance
                      .filter(account => account.accountType === 'income')
                      .map(account => (
                        <div key={account.accountId} className="flex justify-between text-sm py-1">
                          <span>{account.accountName}</span>
                          <span className="font-mono">{formatCurrency(Math.abs(account.balance || account.netBalance || 0))}</span>
                        </div>
                      ))}
                  </div>

                  {/* Expenses */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-purple-600 mb-3">Expenses</h4>
                    {trialBalance
                      .filter(account => account.accountType === 'expense')
                      .map(account => (
                        <div key={account.accountId} className="flex justify-between text-sm py-1">
                          <span>{account.accountName}</span>
                          <span className="font-mono">{formatCurrency(account.balance || account.netBalance || 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Statements Tab */}
        <TabsContent value="statements">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Balance Sheet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Assets</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statements?.balanceSheet?.assets?.totalAssets || 0)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Liabilities</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statements?.balanceSheet?.liabilities?.totalLiabilities || 0)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Equity</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statements?.balanceSheet?.equity?.totalEquity || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Income Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Income Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Revenue</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statements?.incomeStatement?.revenue || 0)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Expenses</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statements?.incomeStatement?.operatingExpenses || 0)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">Net Income</h4>
                  <p className={`text-2xl font-bold ${getBalanceColor(statements?.incomeStatement?.netIncome || 0)}`}>
                    {formatCurrency(statements?.incomeStatement?.netIncome || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TARS Analysis Tab */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                TARS AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  TARS AI will analyze the trial balance data and provide insights on account classifications, 
                  potential misstatements, and audit procedures.
                </p>
                <Button className="mt-4" variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Start TARS Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}