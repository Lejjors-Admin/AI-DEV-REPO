import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  XCircle, 
  Filter, 
  AlertCircle, 
  ArrowDown, 
  ArrowUp,
  CreditCard,
  Search,
  Link as LinkIcon,
  DollarSign,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  CopyPlus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface BankTransactionsListProps {
  clientId: string;
  selectedBankFeedId: number | null;
  accounts: any[];
  regularTransactions: any[];
  isLoadingRegularTransactions: boolean;
  refetchRegularTransactions: () => void;
}

export function BankTransactionsList({ 
  clientId, 
  selectedBankFeedId,
  accounts,
  regularTransactions = [],
  isLoadingRegularTransactions,
  refetchRegularTransactions
}: BankTransactionsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"combined" | "bank" | "regular">("combined");
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [createTransactionMode, setCreateTransactionMode] = useState(false);

  // Fetch bank transactions
  const { 
    data: bankTransactions = [], 
    isLoading: isLoadingBankTransactions,
    refetch: refetchBankTransactions
  } = useQuery<any[]>({
    queryKey: [`/api/bank-transactions/${clientId}`],
    enabled: !!clientId,
  });

  // Fetch bank feeds for reference
  const { 
    data: bankFeeds = [], 
    isLoading: isLoadingBankFeeds
  } = useQuery<any[]>({
    queryKey: [`/api/bank-feeds/${clientId}`],
    enabled: !!clientId,
  });
  
  // Format amount for display with currency symbol
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Categorize a bank transaction
  const categorizeMutation = useMutation({
    mutationFn: async ({ transactionId, accountId }: { transactionId: number, accountId: number }) => {
      const response = await apiRequest(
        'POST', 
        `/api/bank-transactions/${transactionId}/categorize`, 
        { accountId }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction categorized",
        description: "The transaction has been successfully categorized.",
      });
      
      // Clear selection and close dialog
      setSelectedTransaction(null);
      setSelectedAccountId(null);
      setShowMatchDialog(false);
      
      // Refetch bank transactions
      refetchBankTransactions();
      
      // Also refetch regular transactions in case a new one was created
      refetchRegularTransactions();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to categorize transaction. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create a regular transaction from a bank transaction
  const createRegularTransaction = useMutation({
    mutationFn: async (bankTransaction: any) => {
      // Extract and format relevant data from bank transaction
      const newTransaction = {
        clientId: bankTransaction.clientId,
        date: bankTransaction.date,
        description: bankTransaction.description,
        amount: Math.abs(bankTransaction.amount),
        type: bankTransaction.type === 'credit' ? 'income' : 'expense',
        status: 'confirmed',
        bankTransactionId: bankTransaction.id,
        accountId: selectedAccountId,
      };
      
      const response = await apiRequest(
        'POST',
        `/api/transactions`,
        newTransaction
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction created",
        description: "A new transaction has been created from the bank transaction.",
      });
      
      // Also update the bank transaction status
      if (selectedTransaction) {
        categorizeMutation.mutate({
          transactionId: selectedTransaction.id,
          accountId: selectedAccountId!
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Auto-reconcile transactions
  const autoReconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/bank-transactions/auto-reconcile`,
        { clientId }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Auto-reconciliation complete",
        description: `${data.matchedCount} transactions were automatically reconciled.`,
      });
      
      // Refetch both transaction lists
      refetchBankTransactions();
      refetchRegularTransactions();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to auto-reconcile transactions. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle categorize/match button click
  const handleCategorize = (transaction: any) => {
    setSelectedTransaction(transaction);
    setSelectedAccountId(null);
    setCreateTransactionMode(false);
    setShowMatchDialog(true);
  };

  // Handle create transaction button click
  const handleCreateTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setSelectedAccountId(null);
    setCreateTransactionMode(true);
    setShowMatchDialog(true);
  };

  // Handle submitting categorization
  const submitCategorization = () => {
    if (!selectedTransaction || !selectedAccountId) return;
    
    if (createTransactionMode) {
      createRegularTransaction.mutate(selectedTransaction);
    } else {
      categorizeMutation.mutate({ 
        transactionId: selectedTransaction.id,
        accountId: selectedAccountId
      });
    }
  };

  // Group accounts by type for the dropdown
  const accountsByType: Record<string, any[]> = {};
  accounts.forEach(account => {
    if (!accountsByType[account.type]) {
      accountsByType[account.type] = [];
    }
    accountsByType[account.type].push(account);
  });

  // Get bank feed name by ID
  const getBankFeedName = (bankFeedId: number) => {
    const feed = bankFeeds.find((feed: any) => feed.id === bankFeedId);
    return feed ? feed.name : 'Unknown Bank';
  };
  
  // Helper function to safely check if description contains search query
  const descriptionContainsQuery = (description: any, query: string): boolean => {
    if (!description || typeof description !== 'string') {
      return false;
    }
    return description.toLowerCase().includes(query.toLowerCase());
  };

  // Filter and combine transactions
  const getFilteredTransactions = () => {
    // Filter bank transactions
    const filteredBankTransactions = bankTransactions
      .filter((tx: any) => {
        // Apply bank feed filter if one is selected
        if (selectedBankFeedId !== null && tx.bankFeedId !== selectedBankFeedId) {
          return false;
        }
        
        // Apply status filter
        if (statusFilter !== "all" && tx.status !== statusFilter) {
          return false;
        }
        
        // Apply search filter to description using safe helper
        if (searchQuery && !descriptionContainsQuery(tx.description, searchQuery)) {
          return false;
        }
        
        return true;
      })
      .map((tx: any) => ({
        ...tx,
        source: 'bank',
      }));
      
    // Filter regular transactions
    const filteredRegularTransactions = regularTransactions
      .filter((tx: any) => {
        // Apply search filter to description using safe helper
        if (searchQuery && !descriptionContainsQuery(tx.description, searchQuery)) {
          return false;
        }
        
        return true;
      })
      .map((tx: any) => ({
        ...tx,
        source: 'manual',
      }));
      
    // Return appropriate set based on view mode
    switch (viewMode) {
      case 'bank':
        return filteredBankTransactions;
      case 'regular':
        return filteredRegularTransactions;
      case 'combined':
      default:
        return [...filteredBankTransactions, ...filteredRegularTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  };
  
  const filteredTransactions = getFilteredTransactions();
  const isLoading = isLoadingBankTransactions || isLoadingRegularTransactions;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Loading transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {selectedBankFeedId 
                ? `Filtered by bank account: ${getBankFeedName(selectedBankFeedId)}` 
                : "All transactions"}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search transactions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            
            <Tabs defaultValue="combined" onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="combined">All</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="regular">Manual</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unreconciled">Uncategorized</SelectItem>
                <SelectItem value="reconciled">Categorized</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => autoReconcileMutation.mutate()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoReconcileMutation.isPending ? 'animate-spin' : ''}`} /> 
              Auto-Reconcile
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || statusFilter !== "all" ? (
              <>
                <p className="mb-2">No transactions match your filters</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>No transactions found</p>
                <p className="text-sm">
                  Add transactions manually or import them from a bank feed
                </p>
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction: any) => {
                const isCredit = transaction.type === "credit";
                
                // Get linked account - different paths depending on source
                let linkedAccount = null;
                if (transaction.source === 'bank') {
                  linkedAccount = transaction.accountId 
                    ? accounts.find((a: any) => a.id === transaction.accountId) 
                    : null;
                } else {
                  linkedAccount = accounts.find((a: any) => a.id === transaction.accountId);
                }
                
                return (
                  <TableRow key={`${transaction.source}-${transaction.id}`}
                    className={transaction.source === 'bank' ? 'bg-sky-50/30' : ''}
                  >
                    <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                    <TableCell>
                      <span className={isCredit ? "text-green-600" : "text-red-600"}>
                        {isCredit ? "+" : "-"} {formatAmount(Math.abs(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.source === 'bank' ? (
                        <Badge className="bg-sky-100 text-sky-800">
                          <CreditCard className="h-3 w-3 mr-1" /> 
                          {getBankFeedName(transaction.bankFeedId)}
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800">
                          <DollarSign className="h-3 w-3 mr-1" /> Manual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.source === 'bank' && (
                        transaction.status === "reconciled" ? (
                          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" /> Reconciled
                          </Badge>
                        ) : transaction.status === "ignored" ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-100">
                            <XCircle className="h-3 w-3 mr-1" /> Ignored
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            <AlertCircle className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )
                      )}
                      
                      {transaction.source === 'manual' && (
                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" /> Processed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {linkedAccount ? (
                        <div className="flex items-center">
                          <LinkIcon className="h-3 w-3 mr-1 text-blue-600" />
                          <span>{linkedAccount.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not categorized</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.source === 'bank' && transaction.status === "unreconciled" && (
                        <div className="flex justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCategorize(transaction)}
                          >
                            <ArrowUpDown className="h-4 w-4 mr-1" /> 
                            Reconcile
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCreateTransactionClick(transaction)}
                          >
                            <CopyPlus className="h-4 w-4 mr-1" /> 
                            Create Entry
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog for categorizing/creating transactions */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createTransactionMode ? "Create Transaction" : "Reconcile Bank Transaction"}
            </DialogTitle>
            <DialogDescription>
              {createTransactionMode 
                ? "Create an accounting entry from this bank transaction" 
                : "Match this bank transaction to an account category"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Transaction Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Date:</div>
                  <div>{format(new Date(selectedTransaction.date), 'MMM d, yyyy')}</div>
                  <div className="text-muted-foreground">Description:</div>
                  <div className="font-medium">{selectedTransaction.description}</div>
                  <div className="text-muted-foreground">Amount:</div>
                  <div className={selectedTransaction.type === "credit" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {selectedTransaction.type === "credit" ? "+" : "-"} 
                    {formatAmount(Math.abs(selectedTransaction.amount))}
                  </div>
                  <div className="text-muted-foreground">Bank:</div>
                  <div>{getBankFeedName(selectedTransaction.bankFeedId)}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-select">Select Account Category</Label>
                <select 
                  value={selectedAccountId?.toString() || ''} 
                  onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an account category</option>
                  {Object.entries(accountsByType).map(([type, accounts]) => (
                    <optgroup key={type} label={type.toUpperCase()}>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id.toString()}>
                          {account.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowMatchDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={!selectedAccountId || categorizeMutation.isPending || createRegularTransaction.isPending}
              onClick={submitCategorization}
            >
              {categorizeMutation.isPending || createRegularTransaction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {createTransactionMode ? "Creating..." : "Reconciling..."}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" /> 
                  {createTransactionMode ? "Create Entry" : "Reconcile"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Label component for the select field
function Label({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  );
}