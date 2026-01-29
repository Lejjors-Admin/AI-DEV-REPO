import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FileDropZone } from '@/components/FileDropZone';
import { apiConfig } from "@/lib/api-config";
import { 

  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  FileText,
  CreditCard,
  Zap,
  Bot,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Eye
} from 'lucide-react';

interface ReconciliationTabProps {
  clientId: number;
}

interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'bank' | 'transaction' | 'both';
  matchConfidence?: number;
  suggestedMatch?: string;
  status: 'unmatched' | 'matched' | 'ignored';
}

export default function ReconciliationTab({ clientId }: ReconciliationTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [reconciliationPeriod, setReconciliationPeriod] = useState('current-month');
  const [statementBalance, setStatementBalance] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState<'excel' | 'pdf' | 'csv'>('excel');

  // Fetch accounts for reconciliation
  const { data: accountsData } = useQuery({
    queryKey: ['/api/accounts', clientId],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`)).then(res => res.json()),
  });

  // Fetch reconciliation data
  const { data: reconciliationData, isLoading: reconciliationLoading, refetch: refetchReconciliation } = useQuery({
    queryKey: ['/api/reconciliation', clientId, selectedAccount, reconciliationPeriod],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/reconciliation/data?clientId=${clientId}&accountId=${selectedAccount}&period=${reconciliationPeriod}`)).then(res => res.json()),
    enabled: !!selectedAccount,
  });

  // Fetch reconciliation statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/reconciliation/stats', clientId],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/reconciliation/stats?clientId=${clientId}`)).then(res => res.json()),
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: () => fetch('/api/reconciliation/auto-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, accountId: selectedAccount, period: reconciliationPeriod })
    }).then(res => res.json()),
    onSuccess: (data) => {
      toast({ 
        title: `Auto-matched ${data.matchedCount} transactions`,
        description: "Review and approve the suggested matches"
      });
      refetchReconciliation();
    },
    onError: () => {
      toast({ title: "Failed to auto-match transactions", variant: "destructive" });
    }
  });

  // Complete reconciliation mutation
  const completeReconciliationMutation = useMutation({
    mutationFn: () => fetch(apiConfig.buildUrl('/api/reconciliation/complete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        clientId, 
        accountId: selectedAccount, 
        period: reconciliationPeriod,
        statementBalance: parseFloat(statementBalance),
        matchedItems: selectedItems
      })
    }).then(res => res.json()),
    onSuccess: () => {
      toast({ 
        title: "Reconciliation completed successfully!",
        description: "All transactions have been reconciled"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation'] });
      setSelectedItems([]);
      setStatementBalance('');
    },
    onError: () => {
      toast({ title: "Failed to complete reconciliation", variant: "destructive" });
    }
  });

  // Import statement mutation
  const importStatementMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId.toString());
      formData.append('accountId', selectedAccount);
      formData.append('type', uploadType);
      
      return fetch('/api/reconciliation/import', {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      toast({ 
        title: `Imported ${data.importedCount} statement entries`,
        description: "Statement data has been processed and is ready for reconciliation"
      });
      refetchReconciliation();
      setShowUploadDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to import statement", variant: "destructive" });
    }
  });

  const accounts = accountsData?.accounts?.filter((acc: any) => 
    acc.type === 'asset' && (acc.subtype === 'bank' || acc.subtype === 'cash')
  ) || [];
  
  const reconciliationItems: ReconciliationItem[] = reconciliationData?.items || [];
  const stats = statsData?.stats || {
    totalUnmatched: 0,
    totalMatched: 0,
    lastReconciliation: null,
    averageMatchTime: 0
  };

  const handleItemSelect = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(reconciliationItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const calculateReconciliationSummary = () => {
    const selectedTransactions = reconciliationItems.filter(item => 
      selectedItems.includes(item.id) && item.type !== 'bank'
    );
    const bankBalance = parseFloat(statementBalance) || 0;
    const transactionTotal = selectedTransactions.reduce((sum, item) => sum + item.amount, 0);
    const difference = bankBalance - transactionTotal;
    
    return {
      bankBalance,
      transactionTotal,
      difference,
      isBalanced: Math.abs(difference) < 0.01
    };
  };

  const summary = calculateReconciliationSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h2>
          <p className="text-muted-foreground">
            Match bank statements with recorded transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} disabled={!selectedAccount}>
            <Upload className="w-4 h-4 mr-2" />
            Import Statement
          </Button>
          <Button 
            onClick={() => autoMatchMutation.mutate()} 
            disabled={autoMatchMutation.isPending || !selectedAccount}
          >
            <Bot className="w-4 h-4 mr-2" />
            Auto-Match
          </Button>
          <Button 
            onClick={() => completeReconciliationMutation.mutate()} 
            disabled={completeReconciliationMutation.isPending || !summary.isBalanced}
            variant={summary.isBalanced ? "default" : "secondary"}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Reconciliation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unmatched Items</p>
                <p className="text-2xl font-bold">{stats.totalUnmatched}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Matched Items</p>
                <p className="text-2xl font-bold">{stats.totalMatched}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Reconciliation</p>
                <p className="text-lg font-bold">
                  {stats.lastReconciliation ? 
                    new Date(stats.lastReconciliation).toLocaleDateString() : 
                    'Never'
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Difference</p>
                <p className={`text-2xl font-bold ${Math.abs(summary.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.difference.toFixed(2)}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account and Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={reconciliationPeriod} onValueChange={setReconciliationPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Statement Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter ending balance"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary */}
      {selectedAccount && statementBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Statement Balance</p>
                <p className="text-lg font-bold">${summary.bankBalance.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Transaction Total</p>
                <p className="text-lg font-bold">${summary.transactionTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-lg font-bold ${Math.abs(summary.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.difference.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={summary.isBalanced ? "default" : "destructive"}>
                  {summary.isBalanced ? 'Balanced' : 'Unbalanced'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Items */}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Items</CardTitle>
            <CardDescription>
              Match bank statement items with recorded transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reconciliationLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </div>
            ) : reconciliationItems.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    checked={selectedItems.length === reconciliationItems.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">Select All ({reconciliationItems.length} items)</span>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Match Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.suggestedMatch && (
                                <p className="text-sm text-muted-foreground">
                                  Suggested match: {item.suggestedMatch}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${Math.abs(item.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.type === 'bank' ? 'secondary' : 
                              item.type === 'transaction' ? 'outline' : 'default'
                            }>
                              {item.type === 'bank' ? 'Bank Statement' : 
                               item.type === 'transaction' ? 'Transaction' : 'Both'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.matchConfidence ? (
                              <div className="flex items-center gap-2">
                                <Progress value={item.matchConfidence} className="w-16" />
                                <span className="text-sm">{item.matchConfidence}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.status === 'matched' ? 'default' :
                              item.status === 'ignored' ? 'secondary' : 'outline'
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No reconciliation data</h3>
                <p className="text-muted-foreground mb-4">
                  Import a bank statement or select a different account to begin reconciliation
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Statement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Statement Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Bank Statement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Statement Format</Label>
              <Select value={uploadType} onValueChange={(value: any) => setUploadType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel/CSV File</SelectItem>
                  <SelectItem value="pdf">PDF Statement</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Upload Statement File</Label>
              <FileDropZone
                onFileSelect={(files) => {
                  if (files.length > 0) {
                    importStatementMutation.mutate(files[0]);
                  }
                }}
                acceptedFileTypes={uploadType === 'pdf' ? '.pdf' : '.xlsx,.xls,.csv'}
                maxFiles={1}
                disabled={importStatementMutation.isPending}
              />
            </div>

            {uploadType === 'excel' && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Excel/CSV Format Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Date column (first column)</li>
                  <li>• Description column (second column)</li>
                  <li>• Amount column (third column)</li>
                  <li>• Use negative amounts for withdrawals</li>
                </ul>
              </div>
            )}

            {uploadType === 'pdf' && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">PDF Statement Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AI will automatically extract transaction data</li>
                  <li>• Works best with standard bank statement formats</li>
                  <li>• Review extracted data before completing reconciliation</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}