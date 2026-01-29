import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Edit, Save, X } from 'lucide-react';

interface PreviewAccount {
  accountNumber: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales' | 'other_income' | 'other_expense';
  balance: number;
  isDebitNormal: boolean;
}

interface ImportPreviewScreenProps {
  accounts: PreviewAccount[];
  fileName: string;
  onConfirmImport: (accounts: PreviewAccount[]) => void;
  onCancel: () => void;
}

export default function ImportPreviewScreen({ 
  accounts: initialAccounts, 
  fileName, 
  onConfirmImport, 
  onCancel 
}: ImportPreviewScreenProps) {
  const [accounts, setAccounts] = useState<PreviewAccount[]>(initialAccounts);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedAccount, setEditedAccount] = useState<PreviewAccount | null>(null);

  // Calculate totals and validation
  const calculateTotals = () => {
    let totalDebits = 0;
    let totalCredits = 0;
    
    accounts.forEach(account => {
      const balance = account.balance;
      const absBalance = Math.abs(balance);
      
      // In trial balance format:
      // - Positive balances are debit balances
      // - Negative balances are credit balances (stored as negative for proper accounting)
      if (balance > 0) {
        totalDebits += balance;
      } else if (balance < 0) {
        totalCredits += absBalance; // Convert negative credit back to positive for trial balance display
      }
    });
    
    return {
      totalDebits,
      totalCredits,
      difference: totalDebits - totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
  };

  const totals = calculateTotals();

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedAccount({ ...accounts[index] });
  };

  const handleSave = () => {
    if (editingIndex !== null && editedAccount) {
      const newAccounts = [...accounts];
      newAccounts[editingIndex] = editedAccount;
      setAccounts(newAccounts);
      setEditingIndex(null);
      setEditedAccount(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedAccount(null);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Chart of Accounts Import Preview: {fileName}</h2>
            <Badge className="bg-blue-100 text-blue-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Structure Ready
            </Badge>
          </div>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-blue-600">{accounts.length}</div>
            <div className="text-sm text-gray-500">Accounts to Import</div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Chart of Accounts import focuses on account structure. Balance calculations are handled separately in the Transaction Ledger.
            </p>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Accounts to Import ({accounts.length})</h3>
          </div>
          <div className="overflow-auto max-h-96 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account #</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={editedAccount?.accountNumber || ''}
                          onChange={(e) => setEditedAccount(prev => prev ? { ...prev, accountNumber: e.target.value } : null)}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-mono">{account.accountNumber}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={editedAccount?.name || ''}
                          onChange={(e) => setEditedAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="min-w-48"
                        />
                      ) : (
                        account.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={editedAccount?.type}
                          onValueChange={(value) => setEditedAccount(prev => prev ? { 
                            ...prev, 
                            type: value as any,
                            isDebitNormal: value === 'asset' || value === 'expense'
                          } : null)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asset">Asset</SelectItem>
                            <SelectItem value="liability">Liability</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="cost_of_sales">Cost of Sales</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="other_income">Other Income</SelectItem>
                            <SelectItem value="other_expense">Other Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getAccountTypeColor(account.type)}>
                          {account.type === 'cost_of_sales' ? 'Cost of Sales' : 
                           account.type === 'other_income' ? 'Other Income' :
                           account.type === 'other_expense' ? 'Other Expense' :
                           account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {editingIndex === index ? (
                        <div className="flex space-x-2 justify-center">
                          <Button size="sm" onClick={handleSave} variant="outline">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={handleCancel} variant="outline">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => handleEdit(index)} variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <Button 
            onClick={() => onConfirmImport(accounts)}
          >
            Import Chart of Accounts
          </Button>
        </div>
      </div>
    </div>
  );
}