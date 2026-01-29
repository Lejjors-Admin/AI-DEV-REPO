/**
 * Receipt Classification Panel
 * 
 * Similar to Transaction Manager classification workflow - displays extracted
 * receipt data and provides AI-powered classification suggestions for account
 * categorization, tax calculations, and project assignment.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from "@/lib/api-config";
import { 

  Bot, 
  Receipt, 
  DollarSign, 
  Calendar, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Calculator,
  Building
} from 'lucide-react';

interface ReceiptData {
  id: string;
  filename: string;
  extractedData: {
    vendor?: string;
    amount?: number;
    date?: string;
    invoiceNumber?: string;
    taxAmount?: number;
    taxRate?: number;
    netAmount?: number;
    currency?: string;
    paymentMethod?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    confidence: number;
    category?: string;
    notes?: string;
  };
  processingStatus: string;
  confidenceScore: number;
}

interface ReceiptClassificationPanelProps {
  receipt: ReceiptData;
  clientId: number;
  onTransactionCreated?: (transactionId: number) => void;
  onClose?: () => void;
}

export default function ReceiptClassificationPanel({
  receipt,
  clientId,
  onTransactionCreated,
  onClose
}: ReceiptClassificationPanelProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedTax, setSelectedTax] = useState<string>('');
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [netAmount, setNetAmount] = useState<number>(0);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [miltonAnalysis, setMiltonAnalysis] = useState<any>(null);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form with extracted data
  useEffect(() => {
    if (receipt.extractedData) {
      setDescription(receipt.extractedData.vendor || '');
      setAmount(receipt.extractedData.amount || 0);
      setDate(receipt.extractedData.date ? receipt.extractedData.date.split('T')[0] : '');
      setNotes(receipt.extractedData.notes || '');
      
      // Initialize OCR extracted tax amounts
      setTaxAmount(receipt.extractedData.taxAmount || 0);
      setNetAmount(receipt.extractedData.netAmount || receipt.extractedData.amount || 0);
      
      // Load potential matches
      loadPotentialMatches();
    }
  }, [receipt.extractedData]);

  // Load potential matches
  const loadPotentialMatches = async () => {
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/potential-matches?clientId=${clientId}`));
      if (response.ok) {
        const data = await response.json();
        setPotentialMatches(data.matches || []);
        setShowMatches(data.matches?.length > 0);
      }
    } catch (error) {
      console.error('Error loading potential matches:', error);
    }
  };

  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`));
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      return data.accounts || [];
    }
  });

  // Fetch tax settings
  const { data: taxSettings = [] } = useQuery({
    queryKey: ['tax-settings', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/tax-settings/${clientId}`));
      if (!response.ok) throw new Error('Failed to fetch tax settings');
      const data = await response.json();
      return data.data?.options || [];
    }
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`));
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects || [];
    }
  });

  // Classify receipt using Milton AI
  const classifyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/classify`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });
      if (!response.ok) throw new Error('Failed to classify receipt');
      return response.json();
    },
    onSuccess: (data) => {
      setMiltonAnalysis(data.classification);
      
      // Auto-select Milton's suggestions
      if (data.classification.suggestedAccount) {
        setSelectedAccount(data.classification.suggestedAccount.id.toString());
      }
      if (data.classification.suggestedTax) {
        setSelectedTax(data.classification.suggestedTax.id);
        // Use OCR extracted tax amount if available
        if (data.classification.suggestedTax.amount) {
          setTaxAmount(data.classification.suggestedTax.amount);
        }
      }
      if (data.classification.suggestedProject) {
        setSelectedProject(data.classification.suggestedProject.id.toString());
      }
      
      toast({
        title: "🤖 Milton AI Analysis Complete",
        description: "Receipt classified with AI suggestions applied"
      });
    },
    onError: (error) => {
      console.error('Classification error:', error);
      toast({
        title: "Classification Error",
        description: "Failed to analyze receipt with AI",
        variant: "destructive"
      });
    }
  });

  // Create transaction from receipt
  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/create-transaction`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          accountId: parseInt(selectedAccount),
          taxId: selectedTax,
          paymentAccountId: selectedPaymentAccount ? parseInt(selectedPaymentAccount) : undefined,
          projectId: selectedProject ? parseInt(selectedProject) : undefined,
          description,
          amount,
          taxAmount,
          netAmount,
          date
        })
      });
      if (!response.ok) throw new Error('Failed to create transaction');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Transaction Created",
        description: `Receipt processed and journal entry created successfully`,
        duration: 3000
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      if (onTransactionCreated) {
        onTransactionCreated(data.transactionId);
      }
      
      // Close the classification panel after successful creation
      if (onClose) {
        onClose();
      }
    },
    onError: (error) => {
      console.error('Create transaction error:', error);
      toast({
        title: "Transaction Creation Failed",
        description: "Failed to create transaction from receipt",
        variant: "destructive"
      });
    }
  });

  // Reprocess receipt
  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/reprocess`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to reprocess receipt');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "🔄 Receipt Reprocessing",
        description: "Receipt is being reprocessed with AI"
      });
      
      // Refresh receipt data
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
    onError: (error) => {
      console.error('Reprocess error:', error);
      toast({
        title: "Reprocessing Failed",
        description: "Failed to reprocess receipt",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async () => {
    if (!selectedAccount || !selectedTax || !amount || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Auto-calculate total if needed
    if (netAmount > 0 && taxAmount > 0 && amount === 0) {
      setAmount(netAmount + taxAmount);
    }

    setIsProcessing(true);
    await createTransactionMutation.mutateAsync();
    setIsProcessing(false);
  };

  const expenseAccounts = accounts.filter(acc => acc.type === 'expense');
  const confidenceColor = receipt.confidenceScore > 0.8 ? 'green' : 
                         receipt.confidenceScore > 0.6 ? 'yellow' : 'red';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">Receipt Classification</h2>
            <p className="text-sm text-gray-600">{receipt.filename}</p>
          </div>
        </div>
        <Badge variant={confidenceColor === 'green' ? 'default' : 'secondary'}>
          {(receipt.confidenceScore * 100).toFixed(0)}% Confidence
        </Badge>
      </div>

      {/* AI Analysis Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => classifyMutation.mutate()}
          disabled={classifyMutation.isPending}
          className="flex items-center gap-2"
          variant="outline"
        >
          {classifyMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          Milton AI Analysis
        </Button>
        
        <Button
          onClick={() => reprocessMutation.mutate()}
          disabled={reprocessMutation.isPending}
          variant="outline"
          className="flex items-center gap-2"
        >
          {reprocessMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Reprocess
        </Button>
      </div>

      {/* Extracted Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Extracted Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor</Label>
              <p className="font-medium">{receipt.extractedData?.vendor || 'Unknown'}</p>
            </div>
            <div>
              <Label>Total Amount</Label>
              <p className="font-medium">${receipt.extractedData?.amount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label>Tax Amount</Label>
              <p className="font-medium text-green-600">${receipt.extractedData?.taxAmount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label>Net Amount</Label>
              <p className="font-medium">${receipt.extractedData?.netAmount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label>Date</Label>
              <p className="font-medium">{receipt.extractedData?.date || 'Unknown'}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <p className="font-medium">{receipt.extractedData?.paymentMethod || 'Unknown'}</p>
            </div>
          </div>
          
          {receipt.extractedData?.items && receipt.extractedData.items.length > 0 && (
            <div>
              <Label>Items</Label>
              <div className="space-y-1 mt-2">
                {receipt.extractedData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.description} (x{item.quantity})</span>
                    <span>${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milton AI Analysis */}
      {miltonAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Milton AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {(miltonAnalysis.miltonAnalysis?.categoryConfidence * 100).toFixed(0)}% Confidence
                </Badge>
              </div>
              
              {miltonAnalysis.miltonAnalysis?.businessContext && (
                <div>
                  <Label>Business Context</Label>
                  <p className="text-sm mt-1">{miltonAnalysis.miltonAnalysis.businessContext}</p>
                </div>
              )}
              
              {miltonAnalysis.miltonAnalysis?.recommendations && (
                <div>
                  <Label>Recommendations</Label>
                  <ul className="text-sm mt-1 space-y-1">
                    {miltonAnalysis.miltonAnalysis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Potential Matches */}
      {showMatches && potentialMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Potential Matches Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {potentialMatches.map((match, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-1">
                    <div className="font-medium">{match.description}</div>
                    <div className="text-sm text-gray-600">
                      ${match.amount} • {new Date(match.date).toLocaleDateString()} • {match.confidence}% match
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{match.type}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Match Accepted",
                          description: `Matched with ${match.description}`,
                        });
                        setShowMatches(false);
                      }}
                    >
                      Accept Match
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Account</Label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select account</option>
                {expenseAccounts.map(account => (
                  <option key={account.id} value={account.id.toString()}>
                    {account.name} ({account.accountNumber})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Tax</Label>
              <select
                value={selectedTax}
                onChange={(e) => setSelectedTax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select tax</option>
                {taxSettings.map(tax => (
                  <option key={tax.id} value={tax.id}>
                    {tax.displayText}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Payment Method *</Label>
              <select
                value={selectedPaymentAccount}
                onChange={(e) => setSelectedPaymentAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select payment method</option>
                {accounts.filter(account => 
                  account.subtype === 'bank' || 
                  account.subtype === 'cash' ||
                  account.name.toLowerCase().includes('cash') ||
                  account.name.toLowerCase().includes('bank')
                ).map(account => (
                  <option key={account.id} value={account.id.toString()}>
                    {account.name} ({account.accountNumber})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Project (Optional)</Label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Net Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={netAmount}
                onChange={(e) => setNetAmount(parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label>Tax Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value))}
                placeholder="0.00"
                className="border-green-300 focus:border-green-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                placeholder="0.00"
                className="bg-gray-50"
                readOnly
              />
            </div>
            
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(netAmount + taxAmount)}
                className="w-full"
              >
                Calculate Total
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
            />
          </div>
          
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !selectedAccount || !selectedTax || !selectedPaymentAccount}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Create Transaction
        </Button>
        
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}