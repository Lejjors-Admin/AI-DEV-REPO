/**
 * Enhanced Transaction Detail Panel - QBO-Style Transaction Management
 * Includes transaction type, supplier/customer, account, taxes, attachments
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, X, Check, AlertCircle, Bot, User } from "lucide-react";

interface TransactionDetailPanelProps {
  transaction: any;
  accounts: any[];
  onSave: (transaction: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function TransactionDetailPanel({ 
  transaction, 
  accounts, 
  onSave, 
  onClose, 
  isOpen 
}: TransactionDetailPanelProps) {
  const [editedTransaction, setEditedTransaction] = useState(transaction || {});
  const [miltonSuggestion, setMiltonSuggestion] = useState<any>(null);

  const handleMiltonSuggestion = async () => {
    try {
      const response = await fetch('/api/milton/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editedTransaction.description,
          amount: editedTransaction.amount
        })
      });
      
      if (response.ok) {
        const suggestion = await response.json();
        setMiltonSuggestion(suggestion);
      }
    } catch (error) {
      console.error('Milton suggestion failed:', error);
    }
  };

  const applyMiltonSuggestion = () => {
    if (miltonSuggestion) {
      // Find the account that matches Milton's suggestion
      const suggestedAccount = accounts.find((acc: any) => 
        acc.name.toLowerCase().includes(miltonSuggestion.accountName.toLowerCase()) ||
        miltonSuggestion.accountName.toLowerCase().includes(acc.name.toLowerCase())
      );

      setEditedTransaction({
        ...editedTransaction,
        category: miltonSuggestion.category,
        taxCode: miltonSuggestion.taxCode,
        accountId: suggestedAccount?.id || null
      });

      setMiltonSuggestion(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Transaction Details</span>
            {editedTransaction.id && (
              <Badge variant="outline">#{editedTransaction.id}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Transaction Type</Label>
                  <Select 
                    value={editedTransaction.transactionType} 
                    onValueChange={(value) => setEditedTransaction({...editedTransaction, transactionType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input 
                    type="date" 
                    value={editedTransaction.date}
                    onChange={(e) => setEditedTransaction({...editedTransaction, date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Input 
                  value={editedTransaction.description || ''}
                  onChange={(e) => setEditedTransaction({...editedTransaction, description: e.target.value})}
                  placeholder="Enter transaction description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={editedTransaction.amount || ''}
                    onChange={(e) => setEditedTransaction({...editedTransaction, amount: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Reference Number</Label>
                  <Input 
                    value={editedTransaction.referenceNumber || ''}
                    onChange={(e) => setEditedTransaction({...editedTransaction, referenceNumber: e.target.value})}
                    placeholder="Invoice #, Check #, etc."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account & Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Other Side of Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Account</Label>
                  <Select 
                    value={editedTransaction.accountId?.toString()} 
                    onValueChange={(value) => {
                      const selectedAccount = accounts.find(acc => acc.id === parseInt(value));
                      setEditedTransaction({
                        ...editedTransaction, 
                        accountId: parseInt(value),
                        category: selectedAccount?.name || '',
                        status: 'categorized'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select other account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(account => account.subtype !== 'bank').map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
                    <span className="text-sm text-gray-600">
                      {editedTransaction.category || editedTransaction.status === 'categorized' ? editedTransaction.category : 'Uncategorized'}
                    </span>
                    {editedTransaction.status === 'categorized' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                        Categorized
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Customer/Supplier</Label>
                  <Input 
                    value={editedTransaction.customerSupplier || ''}
                    onChange={(e) => setEditedTransaction({...editedTransaction, customerSupplier: e.target.value})}
                    placeholder="Enter name..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Tax Rate</Label>
                  <Select 
                    value={editedTransaction.taxCode} 
                    onValueChange={(value) => setEditedTransaction({...editedTransaction, taxCode: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HST">HST 13%</SelectItem>
                      <SelectItem value="ZR">Zero-rated 0%</SelectItem>
                      <SelectItem value="EX">Exempt 0%</SelectItem>
                      <SelectItem value="OS">Out of Scope 0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">HST Treatment</Label>
                  <Select 
                    value={editedTransaction.hstTreatment || 'inclusive'} 
                    onValueChange={(value) => setEditedTransaction({...editedTransaction, hstTreatment: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">HST Inclusive</SelectItem>
                      <SelectItem value="exclusive">HST Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milton AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Milton AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!miltonSuggestion ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMiltonSuggestion}
                  className="w-full"
                >
                  <Bot className="h-3 w-3 mr-2" />
                  Get Milton Suggestion
                </Button>
              ) : (
                <div className="p-3 bg-blue-50 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-900">Milton suggests:</span>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={applyMiltonSuggestion} className="h-6 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setMiltonSuggestion(null)} className="h-6 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><strong>Account:</strong> {miltonSuggestion.accountName}</p>
                    <p><strong>Category:</strong> {miltonSuggestion.category}</p>
                    <p><strong>Tax:</strong> {miltonSuggestion.taxCode}</p>
                    <p><strong>Confidence:</strong> {Math.round(miltonSuggestion.confidence * 100)}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-2">Upload receipt or document</p>
                <input type="file" className="hidden" accept="image/*,.pdf" />
                <Button size="sm" variant="outline">
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(editedTransaction)}>
              <Check className="h-3 w-3 mr-1" />
              Save Transaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}