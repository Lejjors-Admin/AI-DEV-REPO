/**
 * JOURNAL ENTRY EDITOR - MODULAR COMPONENT
 * 
 * Professional journal entry creation/editing with proper validation
 * and double-entry enforcement
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountDropdown } from '@/components/ui/AccountDropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
// Textarea import removed - not used in this component
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Calculator, Save, AlertTriangle } from 'lucide-react';
import { getCurrentDateString, parseLocalDate, dateToLocalString } from '@/lib/date-utils';
import { useTimezoneAwareAPI } from '@/hooks/useTimezoneAwareAPI';

interface JournalEntry {
  id?: number;
  description: string;
  entryDate: string;
  referenceNumber?: string;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id?: number;
  accountId: number;
  account?: {
    id: number;
    name: string;
    accountNumber: string | null;
    type: string;
    isDebitNormal: boolean;
  } | null;
  description?: string;
  debitAmount: string;
  creditAmount: string;
  memo?: string;
}

interface Account {
  id: number;
  name: string;
  accountNumber?: string;
  type: string;
  isDebitNormal: boolean;
}

interface JournalEntryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  accounts: Account[];
  initialEntry?: JournalEntry;
  mode: 'create' | 'edit';
  clientId: number;
}

export function JournalEntryEditor({
  isOpen,
  onClose,
  onSave,
  accounts,
  initialEntry,
  mode,
  clientId
}: JournalEntryEditorProps) {
  const { toast } = useToast();
  const { prepareFormDataWithTimezone } = useTimezoneAwareAPI();
  const [entry, setEntry] = useState<JournalEntry>({
    description: '',
    entryDate: getCurrentDateString(),
    referenceNumber: '',
    lines: [
      { accountId: 0, debitAmount: '', creditAmount: '', description: '', memo: '' },
      { accountId: 0, debitAmount: '', creditAmount: '', description: '', memo: '' }
    ]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Helper function to format date for HTML date input
  const formatDateForInput = (dateString: string): string => {
    try {
      console.log(`📅 formatDateForInput input:`, dateString);
      
      // If it's already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.log(`📅 formatDateForInput YYYY-MM-DD: ${dateString} → ${dateString}`);
        return dateString;
      }
      
      // Parse the date safely without timezone conversion
      // Use timezone-aware parsing to avoid date shifting
      const { parseDateInUserTimezone, dateToUserTimezoneString } = require('@/lib/timezone-utils');
      const date = parseDateInUserTimezone(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return getCurrentDateString();
      }
      
      // Format as YYYY-MM-DD for HTML date input using timezone-aware formatting
      const formatted = dateToUserTimezoneString(date);
      console.log(`📅 formatDateForInput parsed: ${dateString} → ${formatted}`);
      return formatted;
    } catch (error) {
      console.warn('Failed to format date for input:', dateString, error);
      return getCurrentDateString();
    }
  };

  // Helper function to format date for display (MM/DD/YY format)
  const formatDateForDisplay = (dateString: string): string => {
    try {
      // Handle YYYY-MM-DD format safely without timezone conversion
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        // Create date in local timezone to avoid conversion issues
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        });
      }
      
      // For other formats, use standard parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // fallback to original if invalid
      }
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
    } catch (error) {
      return dateString; // fallback to original if error
    }
  };

  useEffect(() => {
    if (initialEntry) {
      console.log('📝 JournalEntryEditor received initialEntry:', {
        id: initialEntry.id,
        entryDate: initialEntry.entryDate,
        entryDateType: typeof initialEntry.entryDate,
        description: initialEntry.description
      });
      
      // Ensure the date is in the correct format for HTML date input (YYYY-MM-DD)
      const formattedEntry = {
        ...initialEntry,
        entryDate: initialEntry.entryDate ? formatDateForInput(initialEntry.entryDate) : getCurrentDateString()
      };
      
      console.log('📅 Formatted entry date:', {
        original: initialEntry.entryDate,
        formatted: formattedEntry.entryDate
      });
      
      setEntry(formattedEntry);
    } else {
      // Reset form for new entry
      setEntry({
        description: '',
        entryDate: getCurrentDateString(),
        referenceNumber: '',
        lines: [
          { accountId: 0, debitAmount: '', creditAmount: '', description: '', memo: '' },
          { accountId: 0, debitAmount: '', creditAmount: '', description: '', memo: '' }
        ]
      });
    }
    setErrors([]);
  }, [initialEntry, isOpen]);

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(num);
  };

  const calculateTotals = () => {
    const totalDebits = entry.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    return {
      totalDebits,
      totalCredits,
      difference,
      isBalanced
    };
  };

  const validateEntry = (): string[] => {
    const validationErrors: string[] = [];

    // Basic validation
    if (!entry.description.trim()) {
      validationErrors.push('Description is required');
    }

    if (!entry.entryDate) {
      validationErrors.push('Entry date is required');
    }

    // Line validation
    const validLines = entry.lines.filter(line => 
      line.accountId > 0 && (parseFloat(line.debitAmount || '0') > 0 || parseFloat(line.creditAmount || '0') > 0)
    );

    if (validLines.length < 2) {
      validationErrors.push('At least 2 lines with amounts are required');
    }

    // Check for lines with both debit and credit
    const invalidLines = entry.lines.filter(line => 
      parseFloat(line.debitAmount || '0') > 0 && parseFloat(line.creditAmount || '0') > 0
    );

    if (invalidLines.length > 0) {
      validationErrors.push('Lines cannot have both debit and credit amounts');
    }

    // Balance validation
    const { isBalanced } = calculateTotals();
    if (!isBalanced) {
      validationErrors.push('Journal entry must be balanced (debits must equal credits)');
    }

    return validationErrors;
  };

  const addLine = () => {
    setEntry({
      ...entry,
      lines: [...entry.lines, { accountId: 0, debitAmount: '', creditAmount: '', description: '', memo: '' }]
    });
  };

  const removeLine = (index: number) => {
    if (entry.lines.length <= 2) {
      toast({
        title: "Cannot Remove Line",
        description: "Journal entries must have at least 2 lines",
        variant: "destructive"
      });
      return;
    }

    setEntry({
      ...entry,
      lines: entry.lines.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: string | number) => {
    const updatedLines = [...entry.lines];
    
    if (field === 'debitAmount' || field === 'creditAmount') {
      // Clear the opposite field when entering an amount
      if (field === 'debitAmount' && value) {
        updatedLines[index].creditAmount = '';
      } else if (field === 'creditAmount' && value) {
        updatedLines[index].debitAmount = '';
      }
    }

    updatedLines[index] = {
      ...updatedLines[index],
      [field]: value
    };

    setEntry({ ...entry, lines: updatedLines });
  };

  const handleSave = async () => {
    const validationErrors = validateEntry();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors[0],
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Filter out empty lines
      const validLines = entry.lines.filter(line => 
        line.accountId > 0 && (parseFloat(line.debitAmount || '0') > 0 || parseFloat(line.creditAmount || '0') > 0)
      );

      // Prepare timezone-aware data for API
      const timezoneAwareEntry = prepareFormDataWithTimezone({
        description: entry.description,
        entryDate: entry.entryDate,
        referenceNumber: entry.referenceNumber,
        lines: validLines
      });

      console.log('📅 About to save entry with date:', {
        originalEntryDate: entry.entryDate,
        timezoneAwareEntryDate: timezoneAwareEntry.entryDate,
        timezoneAwareEntry: timezoneAwareEntry
      });

      await onSave(timezoneAwareEntry);

      toast({
        title: "Success",
        description: `Journal entry ${mode === 'create' ? 'created' : 'updated'} successfully`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || `Failed to ${mode} journal entry`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountDisplayName = (accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return '';
    return account.accountNumber ? `${account.accountNumber} - ${account.name}` : account.name;
  };

  const { totalDebits, totalCredits, difference, isBalanced } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus className="h-5 w-5" />
                Create New Journal Entry
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Edit Journal Entry
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Enter the journal entry details. All entries must be balanced (total debits = total credits).'
              : 'Modify the journal entry details below. You can edit the description, date, and all line items.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Journal Entry Header with Date and Reference */}
        {mode === 'edit' && initialEntry && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm font-medium text-blue-800">
                  {formatDateForDisplay(entry.entryDate)}
                </div>
                <div className="text-sm font-mono font-semibold text-blue-900">
                  {initialEntry.referenceNumber || `JE-${initialEntry.id}`}
                </div>
              </div>
              <div className="text-xs text-blue-600">
                Journal Entry #{initialEntry.id}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Header Information */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {mode === 'edit' ? 'Edit Journal Entry Details' : 'Journal Entry Details'}
              </h3>
              {mode === 'edit' && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                  All fields are editable
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description *
                </Label>
                <Input
                  id="description"
                  value={entry.description}
                  onChange={(e) => setEntry({ ...entry, description: e.target.value })}
                  placeholder="Enter journal entry description"
                  className={`${errors.includes('Description is required') ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.includes('Description is required') && (
                  <p className="text-sm text-red-600">Description is required</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryDate" className="text-sm font-medium text-gray-700">
                  Entry Date *
                </Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={entry.entryDate}
                  onChange={(e) => {
                    console.log('📅 Date input changed:', {
                      oldValue: entry.entryDate,
                      newValue: e.target.value,
                      oldValueType: typeof entry.entryDate,
                      newValueType: typeof e.target.value
                    });
                    setEntry({ ...entry, entryDate: e.target.value });
                  }}
                  className={`${errors.includes('Entry date is required') ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.includes('Entry date is required') && (
                  <p className="text-sm text-red-600">Entry date is required</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber" className="text-sm font-medium text-gray-700">
                  Reference Number
                </Label>
                <Input
                  id="referenceNumber"
                  value={entry.referenceNumber || ''}
                  onChange={(e) => setEntry({ ...entry, referenceNumber: e.target.value })}
                  placeholder="Optional reference"
                  className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Journal Entry Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Journal Entry Lines</Label>
                {mode === 'edit' && (
                  <Badge variant="secondary" className="text-xs">
                    Editable
                  </Badge>
                )}
              </div>
              <Button onClick={addLine} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Account</TableHead>
                    <TableHead className="w-[200px]">Description</TableHead>
                    <TableHead className="w-[120px] text-right">DR</TableHead>
                    <TableHead className="w-[120px] text-right">CR</TableHead>
                    <TableHead className="w-[150px]">Memo</TableHead>
                    <TableHead className="w-[60px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <AccountDropdown
                          clientId={clientId}
                          value={line.accountId && line.accountId > 0 ? line.accountId.toString() : ""}
                          onValueChange={(value) => updateLine(index, 'accountId', parseInt(value))}
                          placeholder="Select account"
                          compact={true}
                          showAccountNumbers={true}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          value={line.description || ''}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="Line description"
                          className="text-sm"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debitAmount}
                          onChange={(e) => updateLine(index, 'debitAmount', e.target.value)}
                          placeholder="0.00"
                          className="text-right text-sm no-spinner"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.creditAmount}
                          onChange={(e) => updateLine(index, 'creditAmount', e.target.value)}
                          placeholder="0.00"
                          className="text-right text-sm no-spinner"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          value={line.memo || ''}
                          onChange={(e) => updateLine(index, 'memo', e.target.value)}
                          placeholder="Optional memo"
                          className="text-sm"
                        />
                      </TableCell>
                      
                      <TableCell>
                        {entry.lines.length > 2 && (
                          <Button
                            onClick={() => removeLine(index)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Calculator className="h-5 w-5 text-gray-500" />
                <span className="font-semibold text-gray-700">Entry Balance:</span>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-sm">
                  <span className="font-medium text-green-600">
                    Total Debits: {formatCurrency(totalDebits.toFixed(2))}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium text-red-600">
                    Total Credits: {formatCurrency(totalCredits.toFixed(2))}
                  </span>
                </div>
                
                <div className="text-sm">
                  {isBalanced ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                      ✓ Balanced
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Out of Balance: {formatCurrency(difference.toFixed(2))}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Please fix the following errors:</h4>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isBalanced}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {mode === 'create' ? 'Create Entry' : 'Update Entry'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}