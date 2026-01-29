/**
 * JOURNAL ENTRY LIST - MODULAR COMPONENT
 * 
 * Clean, focused component for displaying journal entries with proper
 * performance optimization and responsive design
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Eye, Edit, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface JournalEntry {
  id: number;
  entryNumber: string | null;
  description: string;
  entryDate: string;
  totalDebit: string;
  totalCredit: string;
  status: string;
  isBalanced: boolean;
  needsReview: boolean;
  referenceNumber: string | null;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  accountId: number;
  account: {
    id: number;
    name: string;
    accountNumber: string | null;
    type: string;
    isDebitNormal: boolean;
  } | null;
  description: string | null;
  debitAmount: string;
  creditAmount: string;
  memo: string | null;
}

interface JournalEntryListProps {
  entries: JournalEntry[];
  isLoading?: boolean;
  onEdit?: (entry: JournalEntry) => void;
  onDelete?: (entryId: number) => void;
  onView?: (entry: JournalEntry) => void;
  expandedEntries?: Set<number>;
  onToggleExpanded?: (entryId: number) => void;
}

export function JournalEntryList({
  entries,
  isLoading = false,
  onEdit,
  onDelete,
  onView,
  expandedEntries = new Set(),
  onToggleExpanded
}: JournalEntryListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg mb-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-lg font-medium mb-2">No journal entries found</div>
            <div className="text-sm">Try adjusting your filters or create a new entry</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    // Use timezone-safe date formatting
    try {
      console.log(`📅 formatDate input:`, dateStr);
      
      // If it's already in YYYY-MM-DD format, parse it safely
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date in local timezone to avoid conversion issues
        const date = new Date(year, month - 1, day);
        const formatted = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        });
        console.log(`📅 formatDate YYYY-MM-DD: ${dateStr} → ${formatted}`);
        return formatted;
      }
      
      // For other formats, use standard parsing
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
      console.log(`📅 formatDate other: ${dateStr} → ${formatted}`);
      return formatted;
    } catch (error) {
      console.warn('Failed to format date:', dateStr, error);
      return dateStr;
    }
  };

  const getStatusBadge = (status: string, isBalanced: boolean, needsReview: boolean) => {
    if (needsReview) {
      return <Badge variant="destructive">Review</Badge>;
    }
    if (!isBalanced) {
      return <Badge variant="destructive">Unbalanced</Badge>;
    }
    if (status === 'posted') {
      return <Badge variant="default">Posted</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isExpanded = expandedEntries.has(entry.id);
        const totalDebits = entry.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
        const totalCredits = entry.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);
        const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

        return (
          <Card key={entry.id} className="overflow-hidden" data-testid={`journal-entry-card-${entry.id}`}>
            <Collapsible 
              open={isExpanded} 
              onOpenChange={() => onToggleExpanded?.(entry.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="font-medium text-gray-900 truncate">
                                {entry.entryNumber || `JE-${entry.id}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(entry.entryDate)}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {entry.description}
                              </div>
                              {entry.referenceNumber && (
                                <div className="text-xs text-gray-500">
                                  Ref: {entry.referenceNumber}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {getStatusBadge(entry.status, isBalanced, entry.needsReview)}
                            
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                DR: {formatCurrency(entry.totalDebit)}
                              </div>
                              <div className="text-sm font-medium text-red-600">
                                CR: {formatCurrency(entry.totalCredit)}
                              </div>
                            </div>
                            
                            <div className="flex space-x-1">
                              {onView && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onView(entry);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {onEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(entry);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {onDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(entry.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t bg-gray-50">
                  <div className="p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Journal Entry Lines ({entry.lines.length})
                    </div>
                    
                    <div className="overflow-x-auto" data-testid={`journal-entry-table-container-${entry.id}`}>
                      <Table className="w-full table-fixed" data-testid={`journal-entry-table-${entry.id}`}>
                        <TableHeader>
                          <TableRow data-testid={`journal-entry-table-header-${entry.id}`}>
                            <TableHead data-testid="journal-header-account" className="min-w-[200px]">Account</TableHead>
                            <TableHead data-testid="journal-header-description" className="min-w-[150px]">Description</TableHead>
                            <TableHead data-testid="journal-header-debit" className="text-right min-w-[100px] bg-green-50">Debit (DR)</TableHead>
                            <TableHead data-testid="journal-header-credit" className="text-right min-w-[100px] bg-red-50">Credit (CR)</TableHead>
                            <TableHead data-testid="journal-header-memo" className="min-w-[100px]">Memo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.lines.map((line) => (
                            <TableRow key={line.id} data-testid={`journal-line-row-${line.id}`}>
                              <TableCell data-testid={`journal-line-account-${line.id}`}>
                                <div className="font-medium text-sm">
                                  {(() => {
                                    // Debug account data structure
                                    if (!line.account) {
                                      console.warn(`🚨 Missing account data for line ${line.id}, accountId: ${line.accountId}`);
                                      return `Account ${line.accountId} (Missing Data)`;
                                    }
                                    
                                    // Robust account display with fallbacks
                                    const accountNumber = line.account.accountNumber?.trim();
                                    const accountName = line.account.name?.trim();
                                    
                                    if (accountNumber && accountName) {
                                      return `${accountNumber} - ${accountName}`;
                                    } else if (accountName) {
                                      return accountName;
                                    } else if (accountNumber) {
                                      return `${accountNumber} - Account ${line.accountId}`;
                                    } else {
                                      return `Account ${line.accountId} (No Name)`;
                                    }
                                  })()} 
                                </div>
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`journal-line-description-${line.id}`}>
                                {line.description || entry.description}
                              </TableCell>
                              <TableCell className="text-right text-sm" data-testid={`journal-line-debit-${line.id}`}>
                                {parseFloat(line.debitAmount) > 0 ? (
                                  <span className="text-green-600 font-medium">
                                    {formatCurrency(line.debitAmount)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm" data-testid={`journal-line-credit-${line.id}`}>
                                {parseFloat(line.creditAmount) > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {formatCurrency(line.creditAmount)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600" data-testid={`journal-line-memo-${line.id}`}>
                                {line.memo || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Balance Summary */}
                    <div className="mt-4 pt-4 border-t" data-testid={`journal-entry-balance-summary-${entry.id}`}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">Entry Balance:</span>
                        <div className="flex space-x-4">
                          <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded" data-testid={`journal-entry-total-debit-${entry.id}`}>
                            DR: {formatCurrency(totalDebits.toFixed(2))}
                          </span>
                          <span className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded" data-testid={`journal-entry-total-credit-${entry.id}`}>
                            CR: {formatCurrency(totalCredits.toFixed(2))}
                          </span>
                          <span className={`font-medium px-2 py-1 rounded ${isBalanced ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`} data-testid={`journal-entry-balance-status-${entry.id}`}>
                            {isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}