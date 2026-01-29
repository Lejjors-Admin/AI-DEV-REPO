import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeftRight } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BankTransactionProps {
  id: string;
  date: string;
  description: string;
  amount: string;
  reconciled: boolean;
  ignored: boolean;
}

interface AccountProps {
  id: number;
  name: string;
  type: string;
  subtype: string;
  balance: string;
}

interface BankReconciliationProps {
  clientId: string;
  bankFeedId?: string | null;
  onComplete?: () => void;
}

export function BankReconciliation({ 
  clientId, 
  bankFeedId = null,
  onComplete 
}: BankReconciliationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [bankTransactions, setBankTransactions] = useState<BankTransactionProps[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<AccountProps[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [statementBalance, setStatementBalance] = useState("");
  const [reconcileSummary, setReconcileSummary] = useState<{
    openingBalance: string;
    closingBalance: string;
    clearedTransactions: number;
    difference: string;
  } | null>(null);

  // Load unreconciled transactions
  const fetchUnreconciledTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Load accounts first
      const accountsResponse = await apiRequest("GET", `/api/accounts/${clientId}`);
      if (!accountsResponse.ok) {
        throw new Error("Failed to load accounts");
      }
      
      const accountsData = await accountsResponse.json();
      
      // Filter for bank accounts only
      const bankAccounts = accountsData.filter(
        (acc: any) => acc.type === "asset" && (acc.subtype === "bank" || acc.subtype === "cash")
      );
      setAccounts(bankAccounts);
      
      // Fetch unreconciled transactions
      const endpoint = bankFeedId 
        ? `/api/bank-transactions/feed/${bankFeedId}` 
        : `/api/bank-transactions/unreconciled/${clientId}`;
      
      const response = await apiRequest("GET", endpoint);
      if (!response.ok) {
        throw new Error("Failed to load unreconciled transactions");
      }
      
      const data = await response.json();
      setBankTransactions(data);
    } catch (error: any) {
      toast({
        title: "Error Loading Transactions",
        description: error.message || "Could not load unreconciled transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle transaction selection
  const toggleTransactionSelection = (id: string) => {
    if (selectedTransactions.includes(id)) {
      setSelectedTransactions(selectedTransactions.filter(txId => txId !== id));
    } else {
      setSelectedTransactions([...selectedTransactions, id]);
    }
  };
  
  // Handle reconciliation
  const handleReconcile = async () => {
    if (selectedTransactions.length === 0 || !selectedAccount) {
      toast({
        title: "Selection Required",
        description: "Please select transactions and an account to reconcile.",
        variant: "destructive",
      });
      return;
    }
    
    // Open the reconciliation dialog
    setShowReconcileDialog(true);
  };
  
  // Complete reconciliation process
  const completeReconciliation = async () => {
    if (!statementBalance) {
      toast({
        title: "Statement Balance Required",
        description: "Please enter the ending balance from your bank statement.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Process each selected transaction for reconciliation
      for (const transactionId of selectedTransactions) {
        await apiRequest("POST", `/api/bank-transactions/${transactionId}/reconcile`, {
          accountId: parseInt(selectedAccount),
          statementBalance: parseFloat(statementBalance)
        });
      }
      
      // Calculate reconciliation summary
      const selectedAccount = accounts.find(acc => acc.id.toString() === selectedAccount);
      const totalReconciled = bankTransactions
        .filter(tx => selectedTransactions.includes(tx.id))
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
      const openingBalance = selectedAccount ? selectedAccount.balance : "0.00";
      const closingBalance = selectedAccount 
        ? (parseFloat(selectedAccount.balance) + totalReconciled).toFixed(2)
        : totalReconciled.toFixed(2);
      
      const difference = (parseFloat(statementBalance) - parseFloat(closingBalance)).toFixed(2);
      
      setReconcileSummary({
        openingBalance,
        closingBalance,
        clearedTransactions: selectedTransactions.length,
        difference
      });
      
      // Show success message
      toast({
        title: "Reconciliation Complete",
        description: `Successfully reconciled ${selectedTransactions.length} transactions.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/bank-transactions/unreconciled/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${clientId}`] });
      
      // Reset selection
      setSelectedTransactions([]);
      
      // If onComplete callback is provided, call it
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: "Reconciliation Failed",
        description: error.message || "An error occurred during reconciliation.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Ignore selected transactions
  const handleIgnoreTransactions = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "No Transactions Selected",
        description: "Please select transactions to ignore.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Process each selected transaction to ignore
      for (const transactionId of selectedTransactions) {
        await apiRequest("POST", `/api/bank-transactions/${transactionId}/ignore`, {});
      }
      
      // Show success message
      toast({
        title: "Transactions Ignored",
        description: `Successfully ignored ${selectedTransactions.length} transactions.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/bank-transactions/unreconciled/${clientId}`] });
      
      // Reset selection
      setSelectedTransactions([]);
      
      // If onComplete callback is provided, call it
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message || "An error occurred while ignoring transactions.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Effect to load data on component mount
  useState(() => {
    fetchUnreconciledTransactions();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowLeftRight className="h-5 w-5 mr-2 text-primary" />
          Bank Reconciliation
        </CardTitle>
        <CardDescription>
          Match and reconcile your bank transactions with your accounts.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bankTransactions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No unreconciled transactions</h3>
            <p className="text-muted-foreground mb-4">
              All bank transactions have been reconciled or there are no bank transactions to process.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account">Select Account to Reconcile</Label>
                <select
                  id="account"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  <option value="">-- Select a bank account --</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} (Balance: ${account.balance})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTransactions.includes(transaction.id)}
                            onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                            disabled={transaction.reconciled || transaction.ignored}
                          />
                        </TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right">
                          ${parseFloat(transaction.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {transaction.reconciled ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Reconciled
                            </span>
                          ) : transaction.ignored ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Ignored
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline"
          onClick={handleIgnoreTransactions}
          disabled={isProcessing || selectedTransactions.length === 0 || isLoading}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Ignore Selected"
          )}
        </Button>
        
        <Button 
          onClick={handleReconcile}
          disabled={isProcessing || selectedTransactions.length === 0 || !selectedAccount || isLoading}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Reconcile Selected"
          )}
        </Button>
      </CardFooter>
      
      {/* Reconciliation Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Bank Reconciliation</DialogTitle>
            <DialogDescription>
              Enter the ending balance from your bank statement to complete the reconciliation process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="statementBalance">Statement Ending Balance</Label>
              <Input
                id="statementBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
              />
            </div>
            
            <div className="border rounded p-4 bg-muted/20">
              <h4 className="font-medium mb-2">Reconciliation Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Selected Account:</span>
                  <span className="font-medium">
                    {accounts.find(acc => acc.id.toString() === selectedAccount)?.name || ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions to Reconcile:</span>
                  <span className="font-medium">{selectedTransactions.length}</span>
                </div>
                {reconcileSummary && (
                  <>
                    <div className="flex justify-between">
                      <span>Opening Balance:</span>
                      <span className="font-medium">${reconcileSummary.openingBalance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cleared Transactions:</span>
                      <span className="font-medium">{reconcileSummary.clearedTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Closing Balance:</span>
                      <span className="font-medium">${reconcileSummary.closingBalance}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span>Difference:</span>
                      <span className={reconcileSummary.difference === "0.00" 
                        ? "font-medium text-green-600" 
                        : "font-medium text-red-600"
                      }>
                        ${reconcileSummary.difference}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReconcileDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={completeReconciliation}
              disabled={isProcessing || !statementBalance}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Complete Reconciliation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}