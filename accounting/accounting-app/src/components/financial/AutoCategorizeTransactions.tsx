import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface AutoCategorizeTransactionsProps {
  clientId: string;
  transactions: any[]; // Replace with proper type when available
  onComplete?: () => void;
}

export function AutoCategorizeTransactions({ 
  clientId, 
  transactions, 
  onComplete 
}: AutoCategorizeTransactionsProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoUpdateTransactions, setAutoUpdateTransactions] = useState(true);
  const [progress, setProgress] = useState<{
    total: number;
    processed: number;
    success: number;
  }>({ total: 0, processed: 0, success: 0 });

  // Filter only uncategorized transactions (those without an accountId)
  const uncategorizedTransactions = transactions.filter(tx => !tx.accountId);

  const handleAutoCategorize = async () => {
    if (!clientId || uncategorizedTransactions.length === 0) {
      toast({
        title: "No transactions to categorize",
        description: "All transactions already have categories assigned.",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProgress({
        total: uncategorizedTransactions.length,
        processed: 0,
        success: 0
      });

      const transactionIds = uncategorizedTransactions.map(tx => tx.id);
      
      const response = await apiRequest("POST", "/api/transactions/categorize-batch", {
        transactionIds,
        clientId: parseInt(clientId),
        updateTransactions: autoUpdateTransactions
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to categorize transactions");
      }

      const result = await response.json();
      
      // Update the count of successfully categorized transactions
      const successCount = result.categorizedTransactions.filter(
        (item: any) => item.suggestion !== null
      ).length;

      setProgress({
        total: uncategorizedTransactions.length,
        processed: uncategorizedTransactions.length,
        success: successCount
      });

      // Show success message
      toast({
        title: "AI Categorization Complete",
        description: `Successfully categorized ${successCount} of ${uncategorizedTransactions.length} transactions.`,
      });

      // Refresh the transactions list
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${clientId}`] });
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: "Categorization Failed",
        description: error.message || "An error occurred during automatic categorization.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Auto-Categorize Transactions
        </CardTitle>
        <CardDescription>
          Use AI to automatically categorize {uncategorizedTransactions.length} uncategorized transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="auto-update"
            checked={autoUpdateTransactions}
            onCheckedChange={setAutoUpdateTransactions}
          />
          <Label htmlFor="auto-update">
            Automatically apply suggested categories
          </Label>
        </div>
        
        {isProcessing && (
          <div className="bg-muted p-3 rounded-md mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Processing transactions...</span>
              <span className="text-sm">{progress.processed} of {progress.total}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-in-out"
                style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAutoCategorize} 
          disabled={isProcessing || uncategorizedTransactions.length === 0}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {uncategorizedTransactions.length === 0 
                ? "All Transactions Categorized" 
                : `Auto-Categorize ${uncategorizedTransactions.length} Transactions`}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}