/**
 * Enhanced Transaction Detail Panel with HST Classification and Receipt Management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { apiConfig } from "@/lib/api-config";
import { AlertCircle, CheckCircle, Download, FileText, Upload } from 'lucide-react';

interface EnhancedTransactionDetailProps {
  transaction: any;
  clientId: number;
  accounts: any[];
  onSave: (transaction: any) => void;
  onClose: () => void;
}

export function EnhancedTransactionDetail({
  transaction,
  clientId,
  accounts,
  onSave,
  onClose
}: EnhancedTransactionDetailProps) {
  const [selectedAccount, setSelectedAccount] = useState(transaction.accountId || '');
  const [taxCode, setTaxCode] = useState(transaction.taxSettingId || transaction.tax_setting_id || transaction.taxCode || 'HST');
  const [category, setCategory] = useState(transaction.category || '');
  const [memo, setMemo] = useState(transaction.memo || '');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get enhanced analysis for transaction
  const { data: enhancedAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['enhanced-analysis', transaction.id],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/transactions/categorize-enhanced', {
        transaction,
        clientId
      });
      return response.json();
    },
    enabled: !!transaction.id
  });

  // Get receipts for transaction
  const { data: receipts = [], refetch: refetchReceipts } = useQuery({
    queryKey: ['receipts', transaction.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/transactions/receipts/${transaction.id}`);
      return response.json();
    }
  });

  // Upload receipt mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('clientId', clientId.toString());
      
      const response = await fetch(apiConfig.buildUrl(`/api/transactions/receipts/${transaction.id}/upload`), {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload receipt');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Receipt uploaded",
        description: "Receipt processed successfully"
      });
      refetchReceipts();
      setUploadedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/transactions/reconciliation-rules', {
        transaction,
        categorization: analysis,
        clientId,
        userId: 1 // Get from auth context
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rule created",
        description: "Reconciliation rule created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Rule creation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update state when transaction changes
  useEffect(() => {
    setSelectedAccount(transaction.accountId || '');
    setTaxCode(transaction.taxSettingId || transaction.tax_setting_id || transaction.taxCode || 'HST');
    setCategory(transaction.category || '');
    setMemo(transaction.memo || '');
  }, [transaction]);

  // Fetch tax settings from backend
  useEffect(() => {
    async function fetchTaxSettings() {
      try {
        const response = await fetch(apiConfig.buildUrl(`/clients/${clientId}/bookkeeping-settings`));
        const data = await response.json();
        console.log("tax keeping settings", data.taxSettings)
        // API returns bookkeeping settings directly (not wrapped in success object)
        if (data.taxSettings && Array.isArray(data.taxSettings)) {
          setTaxSettings(data.taxSettings);
        } else {
          // If no tax settings configured, set empty array
          setTaxSettings([]);
        }
      } catch (error) {
        console.error('Error loading tax settings:', error);
        toast({ title: 'Error loading tax settings', description: (error as Error).message, variant: 'destructive' });
      }
    }

    fetchTaxSettings();
  }, [clientId, toast]);

  // Update analysis when enhanced analysis is available
  useEffect(() => {
    if (enhancedAnalysis) {
      setAnalysis(enhancedAnalysis);
      setSelectedAccount(enhancedAnalysis.accountId?.toString() || '');
      setTaxCode(enhancedAnalysis.taxCode || 'HST');
      setCategory(enhancedAnalysis.category || '');
    }
  }, [enhancedAnalysis]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  // Handle save transaction
  const handleSaveTransaction = () => {
    const updatedTransaction = {
      ...transaction,
      accountId: parseInt(selectedAccount),
      taxSettingId: taxCode, // Save as taxSettingId (new field)
      taxCode, // Keep for backward compatibility
      category,
      memo,
      status: 'categorized'
    };
    onSave(updatedTransaction);
  };

  // Get tax information display
  const getTaxInfo = () => {
    if (!analysis) return null;
    
    const taxAmount = analysis.taxAmount || 0;
    const netAmount = analysis.netAmount || transaction.amount;
    
    return {
      taxAmount: taxAmount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      taxRate: ((analysis.taxRate || 0) * 100).toFixed(1)
    };
  };

  const taxInfo = getTaxInfo();

  return (
    <div className="space-y-6">
      {/* Enhanced Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Suggested Account</Label>
                <p className="font-medium">{analysis.accountName}</p>
              </div>
              <div>
                <Label>Confidence</Label>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${analysis.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm">{Math.round(analysis.confidence * 100)}%</span>
                </div>
              </div>
            </div>
            
            {taxInfo && (
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <Label>Net Amount</Label>
                  <p className="font-medium text-green-600">${taxInfo.netAmount}</p>
                </div>
                <div>
                  <Label>Tax Amount ({taxInfo.taxRate}%)</Label>
                  <p className="font-medium text-blue-600">${taxInfo.taxAmount}</p>
                </div>
                <div>
                  <Label>Tax Code</Label>
                  <Badge variant="outline">{analysis.taxCode}</Badge>
                </div>
              </div>
            )}
            
            <div>
              <Label>AI Reasoning</Label>
              <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
            </div>
            
            {analysis.needsReceipt && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Receipt required for this transaction</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Categorization */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Categorization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tax Code</Label>
              <Select value={taxCode} onValueChange={setTaxCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxSettings.map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} ({(tax.rate * 100).toFixed(1)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Category</Label>
            <Input 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Transaction category"
            />
          </div>
          
          <div>
            <Label>Memo</Label>
            <Input 
              value={memo} 
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Additional notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Management */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Receipt */}
          <div>
            <Label>Upload Receipt</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Button 
                onClick={() => uploadedFile && uploadReceiptMutation.mutate(uploadedFile)}
                disabled={!uploadedFile || uploadReceiptMutation.isPending}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
          
          {/* Existing Receipts */}
          {receipts.length > 0 && (
            <div>
              <Label>Existing Receipts</Label>
              <div className="space-y-2 mt-2">
                {receipts.map((receipt: any) => (
                  <div key={receipt.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{receipt.originalName}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/api/transactions/receipts/${receipt.id}/download`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Rules */}
      {analysis?.suggestedRules && analysis.suggestedRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Reconciliation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.suggestedRules.map((rule: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{rule}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createRuleMutation.mutate()}
                    disabled={createRuleMutation.isPending}
                  >
                    Create Rule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSaveTransaction}
          disabled={!selectedAccount}
        >
          Save Transaction
        </Button>
      </div>
    </div>
  );
}