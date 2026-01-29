/**
 * Trial Balance BINDER Section Component
 * 
 * Comprehensive trial balance management for audit engagements with:
 * 1. Live data from Books module (date-specific)
 * 2. Manual account balance editing 
 * 3. Excel import with standard columns
 * 4. Caseware/QBO import (future)
 * 5. AI-powered grouping and section mapping
 * 6. Financial statement generation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Download, RefreshCw, AlertCircle, CheckCircle, TrendingUp, Calculator, Upload, Edit3, Save, Bot, FileSpreadsheet, Database, Zap } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
import { apiConfig } from "@/lib/api-config";
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  grouping?: string; // AI-suggested or manual grouping
  isEdited?: boolean; // Track manual edits
}

interface GroupingRule {
  id: string;
  name: string;
  criteria: {
    accountType?: string[];
    subtype?: string[];
    namePattern?: string;
  };
  fsSection: string; // Financial statement section
  aiSuggested: boolean;
}

interface TrialBalanceSource {
  type: 'live' | 'manual' | 'excel' | 'caseware' | 'qbo';
  date?: string;
  lastUpdated: string;
  filename?: string;
}

interface TrialBalanceViewerProps {
  clientId: number;
  binderId?: number;
}

export function TrialBalanceViewer({ clientId, binderId }: TrialBalanceViewerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dataSource, setDataSource] = useState<TrialBalanceSource>({ type: 'live', lastUpdated: new Date().toISOString() });
  const [editingAccount, setEditingAccount] = useState<number | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [showGroupingRules, setShowGroupingRules] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Main trial balance data query
  const { data: trialBalanceResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/trial-balance', clientId, selectedDate],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/trial-balance/${clientId}?asOfDate=${selectedDate}`), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trial balance');
      }
      return response.json();
    }
  });

  // Financial statements data
  const { data: financialStatements } = useQuery({
    queryKey: ['/api/financial-statements', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/financial-statements/${clientId}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch statements');
      return response.json();
    }
  });

  // AI grouping suggestions
  const aiGroupingMutation = useMutation({
    mutationFn: async (trialBalanceData: TrialBalanceEntry[]) => {
      return apiRequest('POST', '/api/ai-grouping/suggest', { trialBalance: trialBalanceData });
    },
    onSuccess: (groupingRules) => {
      toast({ title: "AI Grouping Complete", description: "Smart grouping rules generated successfully" });
      // Apply grouping rules to trial balance data
    }
  });

  // Manual balance edit mutation
  const editBalanceMutation = useMutation({
    mutationFn: async ({ accountId, newBalance }: { accountId: number; newBalance: number }) => {
      return apiRequest('PUT', `/api/trial-balance/edit-balance`, { accountId, newBalance, clientId });
    },
    onSuccess: () => {
      toast({ title: "Balance Updated", description: "Account balance has been manually updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/trial-balance', clientId] });
      setEditingAccount(null);
    }
  });

  const trialBalance = trialBalanceResponse?.data || [];

  const { data: summary } = useQuery({
    queryKey: ['/api/trial-balance-summary', clientId, selectedDate],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/trial-balance-summary/${clientId}?asOfDate=${selectedDate}`));
      if (!response.ok) {
        throw new Error('Failed to fetch trial balance summary');
      }
      return response.json();
    }
  });

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-green-100 text-green-800';
      case 'income': return 'bg-purple-100 text-purple-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      case 'cost_of_sales': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Trial Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Trial Balance Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load trial balance data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!trialBalance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No trial balance data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Trial Balance - {trialBalance.clientName}
              </CardTitle>
              <CardDescription>
                As of {new Date(selectedDate).toLocaleDateString('en-CA')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1 border rounded"
              />
            </div>
            <Badge 
              variant={trialBalance.isBalanced ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {trialBalance.isBalanced ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {trialBalance.isBalanced ? "Balanced" : "Out of Balance"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Assets</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(summary.assets)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Liabilities</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(summary.liabilities)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Equity</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(summary.equity)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
          <CardDescription>
            Showing {trialBalance.entries.length} accounts with balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.map((entry: TrialBalanceEntry) => (
                <TableRow key={entry.accountId}>
                  <TableCell className="font-mono text-sm">
                    {entry.accountNumber || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.accountName}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getAccountTypeColor(entry.accountType)}
                    >
                      {entry.accountType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.debitBalance > 0 ? formatCurrency(entry.debitBalance) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.creditBalance > 0 ? formatCurrency(entry.creditBalance) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Totals Row */}
              <TableRow className="border-t-2 border-gray-300 font-bold">
                <TableCell colSpan={3} className="text-right">
                  <strong>TOTALS:</strong>
                </TableCell>
                <TableCell className="text-right font-mono">
                  <strong>{formatCurrency(trialBalance.totalDebits)}</strong>
                </TableCell>
                <TableCell className="text-right font-mono">
                  <strong>{formatCurrency(trialBalance.totalCredits)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Balance Check */}
      {!trialBalance.isBalanced && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Trial Balance is Out of Balance!</strong>
            <br />
            Difference: {formatCurrency(Math.abs(trialBalance.totalDebits - trialBalance.totalCredits))}
            <br />
            This indicates potential data entry errors that need to be corrected.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}