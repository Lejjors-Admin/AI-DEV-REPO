/**
 * Intelligent Transaction Upload System
 * Account-specific CSV/Excel upload with automatic field detection and mapping
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Edit3, Download, Zap } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from '@/lib/api-config';

interface TransactionUploadSystemProps {
  clientId: string;
  accounts: any[];
  onUploadComplete: () => void;
}

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  description2?: string;
  amount: number;
  debitAmount?: number;
  creditAmount?: number;
  originalData: any;
  isValid: boolean;
  errors: string[];
}

interface ColumnMapping {
  date: number | null;
  description: number | null;
  description2: number | null;
  amount: number | null;
  debitAmount: number | null;
  creditAmount: number | null;
}

export default function TransactionUploadSystem({ clientId, accounts, onUploadComplete }: TransactionUploadSystemProps) {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    description: null,
    description2: null,
    amount: null,
    debitAmount: null,
    creditAmount: null
  });
  const [amountDirection, setAmountDirection] = useState<'positive-in' | 'positive-out'>('positive-out');
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  // All transactions are treated as bank statements by default
  const isBankStatement = true;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Intelligent file parsing mutation
  const parseFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/transactions/parse-file'), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to parse file');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('File parse response:', data);
      setHeaders(data.headers || []);
      setParsedData(data.rows);
      
      // Use server's mapping suggestions instead of client-side detection
      const serverMapping: ColumnMapping = {
        date: data.suggestions?.date ?? null,
        description: data.suggestions?.description ?? null,
        description2: data.suggestions?.description2 ?? null,
        amount: data.suggestions?.amount ?? null,
        debitAmount: data.suggestions?.debitAmount ?? null,
        creditAmount: data.suggestions?.creditAmount ?? null
      };
      
      console.log('Applied server mapping suggestions:', serverMapping);
      setColumnMapping(serverMapping);
      setShowMappingDialog(true);
    },
    onError: (error) => {
      toast({
        title: "File parsing failed",
        description: "Please check your file format and try again",
        variant: "destructive"
      });
    }
  });



  // Transaction import mutation
  const importTransactionsMutation = useMutation({
    mutationFn: async (transactions: ParsedTransaction[]) => {
      const response = await apiRequest('POST', '/api/simple/bulk-import', {
        clientId,
        accountId: selectedAccount.id,
        isBankStatement,
        transactions: transactions.map(t => ({
          date: t.date,
          description: t.description + (t.description2 ? ` ${t.description2}` : ''),
          debitAmount: t.debitAmount || 0,
          creditAmount: t.creditAmount || 0,
          category: 'Uncategorized',
          accountId: selectedAccount.id,
          importedFrom: uploadFile?.name
        }))
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transactions imported successfully",
        description: `Imported ${parsedTransactions.length} transactions to ${selectedAccount.name}`
      });
      resetUploadState();
      onUploadComplete();
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: "Please review the transactions and try again",
        variant: "destructive"
      });
    }
  });

  // Enhanced intelligent column detection
  const detectColumns = (headers: string[], rows: any[][]): ColumnMapping => {
    const mapping: ColumnMapping = {
      date: null,
      description: null,
      description2: null,
      amount: null,
      debitAmount: null,
      creditAmount: null
    };

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Enhanced date detection
      if (lowerHeader.includes('date') || 
          lowerHeader.includes('transaction date') ||
          lowerHeader.includes('posted date') ||
          lowerHeader.includes('effective date') ||
          lowerHeader === 'dt' ||
          lowerHeader === 'trans date') {
        mapping.date = index;
      }
      
      // Enhanced description detection
      if (lowerHeader.includes('description') || 
          lowerHeader.includes('memo') || 
          lowerHeader.includes('reference') ||
          lowerHeader.includes('payee') ||
          lowerHeader.includes('vendor') ||
          lowerHeader.includes('details') ||
          lowerHeader.includes('narrative') ||
          lowerHeader.includes('memo/description') ||
          lowerHeader.includes('memo/desc')) {
        if (!mapping.description) {
          mapping.description = index;
        } else if (!mapping.description2) {
          mapping.description2 = index;
        }
      }
      
      // Enhanced amount detection (single column)
      if ((lowerHeader.includes('amount') && 
           !lowerHeader.includes('debit') && 
           !lowerHeader.includes('credit')) ||
          lowerHeader === 'amt' ||
          lowerHeader === 'transaction amount' ||
          lowerHeader === 'net amount') {
        mapping.amount = index;
      }
      
      // Enhanced debit detection
      if (lowerHeader.includes('debit') || 
          lowerHeader === 'dr' || 
          lowerHeader === 'debit amount' ||
          lowerHeader.includes('withdrawal') ||
          lowerHeader.includes('out') ||
          lowerHeader.includes('payment')) {
        mapping.debitAmount = index;
      }
      
      // Enhanced credit detection
      if (lowerHeader.includes('credit') || 
          lowerHeader === 'cr' || 
          lowerHeader === 'credit amount' ||
          lowerHeader.includes('deposit') ||
          lowerHeader.includes('in') ||
          lowerHeader.includes('receipt')) {
        mapping.creditAmount = index;
      }
    });

    // Auto-detect if we have clear debit/credit columns but no amount
    if (mapping.debitAmount !== null && mapping.creditAmount !== null && mapping.amount === null) {
      // Perfect - we have separate debit/credit columns
      console.log('Detected separate debit/credit columns');
    }

    return mapping;
  };

  // Process transactions with mapping
  const processTransactions = () => {
    if (!parsedData.length || !selectedAccount) return;

    const transactions: ParsedTransaction[] = parsedData.map((row, index) => {
      const errors: string[] = [];
      
      // Extract date
      let date = '';
      if (columnMapping.date !== null) {
        const rawDate = row[columnMapping.date];
        date = normalizeDate(rawDate);
        if (!date) {
          errors.push('Invalid date format');
        }
      } else {
        errors.push('Date column not mapped');
      }

      // Extract description
      let description = '';
      let description2 = '';
      if (columnMapping.description !== null) {
        description = row[columnMapping.description] || '';
      }
      if (columnMapping.description2 !== null) {
        description2 = row[columnMapping.description2] || '';
      }

      // Enhanced amount extraction with proper debit/credit handling
      let amount = 0;
      let debitAmount = 0;
      let creditAmount = 0;
      
      if (columnMapping.debitAmount !== null && columnMapping.creditAmount !== null) {
        // We have separate debit/credit columns - this is the preferred format
        const debitValue = row[columnMapping.debitAmount];
        const creditValue = row[columnMapping.creditAmount];
        
        let rawDebit = debitValue && debitValue !== '' ? parseFloat(debitValue.toString().replace(/[,$]/g, '')) || 0 : 0;
        let rawCredit = creditValue && creditValue !== '' ? parseFloat(creditValue.toString().replace(/[,$]/g, '')) || 0 : 0;
        
        // Handle bank statement reversal if checkbox is checked
        if (isBankStatement) {
          // In bank statements: Credit = money in (debit in accounting), Debit = money out (credit in accounting)
          debitAmount = rawCredit; // Bank credit becomes accounting debit
          creditAmount = rawDebit; // Bank debit becomes accounting credit
        } else {
          // Standard accounting entries
          debitAmount = rawDebit;
          creditAmount = rawCredit;
        }
        
        // Net amount for display (debit is positive, credit is negative)
        amount = debitAmount > 0 ? debitAmount : -creditAmount;
      } else if (columnMapping.amount !== null) {
        // Single amount column - use amountDirection setting
        amount = parseFloat(row[columnMapping.amount].toString().replace(/[,$]/g, '')) || 0;
        
        if (amountDirection === 'positive-out') {
          // Bank statement logic: Positive = Money Out (expenses/debits)
          if (amount > 0) {
            debitAmount = amount;  // Money out = debit
            creditAmount = 0;
          } else {
            creditAmount = Math.abs(amount);  // Money in = credit
            debitAmount = 0;
          }
        } else {
          // Credit card logic: Positive = Money In (income/credits)
          if (amount > 0) {
            creditAmount = amount;  // Money in = credit
            debitAmount = 0;
          } else {
            debitAmount = Math.abs(amount);  // Money out = debit
            creditAmount = 0;
          }
        }
      } else {
        errors.push('No amount columns mapped');
      }

      return {
        id: `temp-${index}`,
        date,
        description,
        description2,
        amount,
        debitAmount,
        creditAmount,
        originalData: row,
        isValid: errors.length === 0,
        errors
      };
    });

    setParsedTransactions(transactions);
    setShowMappingDialog(false);
    setShowReviewDialog(true);
  };

  const normalizeDate = (dateValue: any): string => {
    if (!dateValue && dateValue !== 0) return '';
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      // Convert to local timezone to avoid timezone conversion issues
      const localDate = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 12, 0, 0, 0);
      return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    
    // Handle numbers (Excel serial dates)
    if (typeof dateValue === 'number') {
      if (dateValue > 25569 && dateValue < 100000) { // Excel serial date range
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        // Convert to local timezone to avoid timezone conversion issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      // Could be a timestamp
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        // Convert to local timezone to avoid timezone conversion issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }
    
    // Handle strings
    const dateString = String(dateValue).trim();
    if (!dateString) return '';
    
    // Check if it's already in YYYY-MM-DD format (like your CSV data)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Already in correct format, return as-is to avoid timezone conversion
      return dateString;
    }
    
    // If it's a numeric string, treat as Excel serial
    if (!isNaN(Number(dateString))) {
      const serial = Number(dateString);
      if (serial > 25569 && serial < 100000) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }
    
    // Try parsing various string formats
    const formats = [
      dateString,
      // Handle MM/DD/YYYY to YYYY-MM-DD
      dateString.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'),
      dateString.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'),
      // Handle DD-MM-YYYY to YYYY-MM-DD  
      dateString.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$1-$2'),
      dateString.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$2-$1')
    ];
    
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        // Convert to local timezone to avoid timezone conversion issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }
    
    return '';
  };

  const isValidDate = (dateValue: any): boolean => {
    const normalized = normalizeDate(dateValue);
    return normalized !== '';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAccount) return;

    setUploadFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    
    parseFileMutation.mutate(formData);
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setParsedData([]);
    setParsedTransactions([]);
    setColumnMapping({
      date: null,
      description: null,
      description2: null,
      amount: null,
      debitAmount: null,
      creditAmount: null
    });
    setShowMappingDialog(false);
    setShowReviewDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Transaction Upload System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Bank Account for Transaction Import
            </label>
            <select 
              value={selectedAccount?.id?.toString() || ''} 
              onChange={(e) => {
                const account = accounts.find(acc => acc.id.toString() === e.target.value);
                setSelectedAccount(account);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a bank account for transaction import</option>
              {accounts
                .filter((account) => account.subtype === 'bank')
                .map((account) => (
                  <option key={account.id} value={account.id.toString()}>
                    {account.name} ({account.type} - Bank)
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Only bank accounts are shown for transaction import. This account will be used for double-entry accounting.
            </p>
          </div>

          {selectedAccount && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Transactions will be imported to <strong>{selectedAccount.name}</strong> ({selectedAccount.accountType})
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedAccount || parseFileMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {parseFileMutation.isPending ? 'Processing...' : 'Upload CSV/Excel File'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="text-sm text-muted-foreground">
              Supports CSV, Excel (.xlsx, .xls) with intelligent field detection
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Map Transaction Fields</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review and adjust the automatically detected column mapping:
            </p>
            
            {/* Bank Statement Info */}
            <div className="p-3 bg-blue-50 rounded-lg border">
              <div className="text-sm font-medium text-blue-800">
                Bank Statement Processing Enabled
              </div>
              <div className="text-xs text-blue-600 mt-1">
                All transactions use bank statement logic: Credits = money in, Debits = money out
              </div>
            </div>
            
            {parsedData.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date Column</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.date?.toString() || ''} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, date: e.target.value ? parseInt(e.target.value) : null }))}
                    >
                      <option value="">Select date column</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description Column</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.description?.toString() || ''} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, description: e.target.value ? parseInt(e.target.value) : null }))}
                    >
                      <option value="">Select description column</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Money Out Column</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.debitAmount?.toString() || 'none'} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, debitAmount: e.target.value !== "none" ? parseInt(e.target.value) : null }))}
                    >
                      <option value="none">None</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Money In Column</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.creditAmount?.toString() || 'none'} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, creditAmount: e.target.value !== "none" ? parseInt(e.target.value) : null }))}
                    >
                      <option value="none">None</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Single Amount Column (if no debit/credit)</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.amount?.toString() || 'none'} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, amount: e.target.value !== "none" ? parseInt(e.target.value) : null }))}
                    >
                      <option value="none">None</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Show amount direction selector when single amount column is selected */}
                  {columnMapping.amount !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <label className="text-sm font-medium text-blue-900 mb-2 block">
                        What do positive amounts represent?
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="amountDirection"
                            value="positive-out"
                            checked={amountDirection === 'positive-out'}
                            onChange={(e) => setAmountDirection(e.target.value as 'positive-in' | 'positive-out')}
                            className="text-blue-600"
                          />
                          <span className="text-sm">Positive = Money Out (Bank Statement / Debit Card)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="amountDirection"
                            value="positive-in"
                            checked={amountDirection === 'positive-in'}
                            onChange={(e) => setAmountDirection(e.target.value as 'positive-in' | 'positive-out')}
                            className="text-blue-600"
                          />
                          <span className="text-sm">Positive = Money In (Credit Card Statement)</span>
                        </label>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Bank statements typically show withdrawals as positive. Credit card statements show charges as positive.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Second Description (Optional)</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={columnMapping.description2?.toString() || 'none'} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, description2: e.target.value !== "none" ? parseInt(e.target.value) : null }))}
                    >
                      <option value="none">None</option>
                      {headers.map((header: string, index: number) => (
                        <option key={index} value={index.toString()}>
                          Column {index + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-2">Preview (First 3 rows)</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header: string, index: number) => (
                          <TableHead key={index} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 3).map((row: any, rowIndex: number) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell: any, cellIndex: number) => (
                            <TableCell key={cellIndex} className="text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={processTransactions}>
                    Process Transactions
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Simplified Transaction Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Import Transactions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Ready to Import</p>
                <p className="text-sm text-muted-foreground">
                  {parsedTransactions.filter(t => t.isValid).length} transactions will be imported to {selectedAccount?.name || 'Selected Account'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => importTransactionsMutation.mutate(parsedTransactions.filter(t => t.isValid))}
                  disabled={parsedTransactions.filter(t => t.isValid).length === 0 || importTransactionsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {importTransactionsMutation.isPending ? 'Importing...' : `Import ${parsedTransactions.filter(t => t.isValid).length} Transactions`}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedTransactions.filter(t => t.isValid).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">{transaction.date}</TableCell>
                    <TableCell className="text-sm max-w-96">
                      <div className="truncate">{transaction.description}</div>
                      {transaction.description2 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {transaction.description2}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-right">
                      {transaction.debitAmount && transaction.debitAmount > 0 ? (
                        <span>${transaction.debitAmount.toFixed(2)}</span>
                      ) : transaction.creditAmount && transaction.creditAmount > 0 ? (
                        <span>${transaction.creditAmount.toFixed(2)}</span>
                      ) : transaction.amount ? (
                        <span>${transaction.amount.toFixed(2)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.debitAmount && transaction.debitAmount > 0 ? (
                        <Badge variant="outline">Debit</Badge>
                      ) : transaction.creditAmount && transaction.creditAmount > 0 ? (
                        <Badge variant="outline">Credit</Badge>
                      ) : (
                        <Badge variant="secondary">Amount</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}