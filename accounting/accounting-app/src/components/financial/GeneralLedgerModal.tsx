import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiConfig } from '@/lib/api-config';

interface GeneralLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  clientId: string;
  startDate: string;
  endDate: string;
  isBalanceSheetDrillDown?: boolean; // NEW: Indicates if this is from Balance Sheet drill-down
}

interface JournalEntry {
  id: number;
  entryDate: string;
  description: string;
  referenceNumber: string;
  lines: JournalLine[];
}

interface JournalLine {
  id: number;
  accountId: number;
  description: string;
  debitAmount: string;
  creditAmount: string;
  memo: string;
}

export default function GeneralLedgerModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  accountNumber,
  accountType,
  clientId,
  startDate,
  endDate,
  isBalanceSheetDrillDown = false,
}: GeneralLedgerModalProps) {
  const [runningBalance, setRunningBalance] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50); // QuickBooks-style pagination

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  // Determine if account normally has debit balance (assets, expenses) or credit balance (liabilities, equity, income)
  const isDebitNormal = accountType === 'asset' || accountType === 'expense' || accountType === 'cost_of_sales';

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // For Balance Sheet drill-downs, fetch the opening balance (cumulative to startDate)
  const { data: openingBalanceData } = useQuery({
    queryKey: [`/api/accounts/${clientId}/${accountId}/balance`, { date: startDate, isBalanceSheetDrillDown }],
    queryFn: async () => {
      if (!isBalanceSheetDrillDown) return { balance: 0 };
      
      const response = await fetch(apiConfig.buildUrl(`/api/accounts/${clientId}/${accountId}/balance?date=${startDate}`), {
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch opening balance');
      return response.json();
    },
    enabled: isBalanceSheetDrillDown
  });

  // Fetch journal entries for this account with pagination and server-side filtering
  const { data: journalData, isLoading, error } = useQuery({
    queryKey: [`/api/journal-entries/${clientId}`, { accountId, startDate, endDate, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        startDate,
        endDate,
        accountId: accountId.toString(), // Server-side account filtering for performance
      });
      
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${clientId}?${params}`), {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to view journal entries.');
        }
        throw new Error(`Failed to fetch journal entries: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Server-side filtering means we don't need client-side filtering anymore
      return data;
    },
    enabled: isOpen && !!clientId && !!accountId,
    retry: (failureCount: number, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Authentication required')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Extract entries and metadata from paginated response
  const journalEntries = journalData?.entries || [];
  const totalEntries = journalData?.metadata?.total || 0;
  const hasNextPage = journalData?.metadata?.hasMore || false;

  // Calculate running balance
  const transactions = journalEntries?.flatMap((entry: JournalEntry) => 
    entry.lines
      .filter((line: JournalLine) => line.accountId === accountId)
      .map((line: JournalLine) => ({
        date: entry.entryDate,
        description: entry.description || line.description,
        reference: entry.referenceNumber,
        debit: parseFloat(line.debitAmount || '0'),
        credit: parseFloat(line.creditAmount || '0'),
        memo: line.memo,
        entryId: entry.id
      }))
  ) || [];

  // Calculate running balance for each transaction
  // For Balance Sheet drill-downs, start with the opening balance (cumulative to startDate)
  // For General Ledger, start with 0 (period calculation)
  let balance = isBalanceSheetDrillDown ? (openingBalanceData?.balance || 0) : 0;
  const transactionsWithBalance = transactions.map((transaction: any) => {
    // For debit-normal accounts: balance increases with debits, decreases with credits
    // For credit-normal accounts: balance increases with credits, decreases with debits
    if (isDebitNormal) {
      balance += transaction.debit - transaction.credit;
    } else {
      balance += transaction.credit - transaction.debit;
    }
    
    return {
      ...transaction,
      runningBalance: balance
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[90vh] overflow-hidden p-0" 
        data-testid="general-ledger-modal"
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">General Ledger</DialogTitle>
              <DialogDescription className="mt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{accountNumber}</span>
                    <span>-</span>
                    <span>{accountName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{accountType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {isBalanceSheetDrillDown 
                        ? `Balance Sheet Drill-down: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}` 
                        : `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`
                      }
                    </span>
                  </div>
                </div>
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-general-ledger">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 text-sm mb-2">Error loading journal entries</div>
              <div className="text-muted-foreground text-xs text-center max-w-md">
                {error.message}
              </div>
              {error.message.includes('Authentication required') && (
                <div className="text-xs text-muted-foreground mt-2">
                  Try refreshing the page or logging in again.
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[calc(90vh-200px)]">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[110px] px-4 py-3">Date</TableHead>
                    <TableHead className="w-[120px] px-4 py-3">Reference</TableHead>
                    <TableHead className="px-4 py-3">Description</TableHead>
                    <TableHead className="w-[120px] text-right px-4 py-3">Debit</TableHead>
                    <TableHead className="w-[120px] text-right px-4 py-3">Credit</TableHead>
                    <TableHead className="w-[140px] text-right px-4 py-3">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12 px-4">
                        No transactions found for this account in the selected date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionsWithBalance.map((transaction, index) => (
                      <TableRow 
                        key={`${transaction.entryId}-${index}`}
                        className="hover:bg-muted/50"
                        data-testid={`transaction-row-${index}`}
                      >
                        <TableCell className="font-mono text-sm px-2 py-3">
                          {(() => {
                            // Parse YYYY-MM-DD format directly to avoid timezone conversion issues
                            const [year, month, day] = transaction.date.split('-');
                            return `${month}/${day}/${year}`;
                          })()}
                        </TableCell>
                        <TableCell className="font-mono text-sm px-4 py-3">
                          {transaction.reference || '-'}
                        </TableCell>
                        <TableCell className="text-sm px-4 py-3">
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.memo && (
                              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{transaction.memo}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono px-4 py-3">
                          {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono px-4 py-3">
                          {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold px-4 py-3">
                          {formatCurrency(Math.abs(transaction.runningBalance))}
                          {!isDebitNormal && transaction.runningBalance < 0 && ' DR'}
                          {isDebitNormal && transaction.runningBalance < 0 && ' CR'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {transactionsWithBalance.length > 0 && (
                    <TableRow className="font-semibold border-t-2 bg-muted/30">
                      <TableCell colSpan={3} className="px-4 py-4 font-bold">Total</TableCell>
                      <TableCell className="text-right px-4 py-4 font-mono">
                        {formatCurrency(transactions.reduce((sum, t) => sum + t.debit, 0))}
                      </TableCell>
                      <TableCell className="text-right px-4 py-4 font-mono">
                        {formatCurrency(transactions.reduce((sum, t) => sum + t.credit, 0))}
                      </TableCell>
                      <TableCell className="text-right px-4 py-4 font-mono font-bold">
                        {formatCurrency(Math.abs(balance))}
                        {!isDebitNormal && balance < 0 && ' DR'}
                        {isDebitNormal && balance < 0 && ' CR'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              {!isLoading && !error && totalEntries > 0 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page * pageSize) + 1}-{Math.min((page + 1) * pageSize, totalEntries)} of {totalEntries} entries
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {journalData?.metadata?.queryTime || 'N/A'} response time
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      data-testid="prev-page"
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground px-2">
                      Page {page + 1} of {Math.ceil(totalEntries / pageSize)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!hasNextPage}
                      data-testid="next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}