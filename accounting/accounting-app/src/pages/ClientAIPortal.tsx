import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Brain, TrendingUp, DollarSign, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ClientAIUsage {
  clientId: number;
  period: string;
  operations: Array<{
    type: string;
    count: number;
    tokens: number;
  }>;
  totalTokens: number;
  estimatedCost: number;
}

interface ClientContext {
  clientId: number;
  userId: number;
  firmId: number;
  permissions: string[];
}

export default function ClientAIPortal() {
  const { toast } = useToast();
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [currentClientId] = useState(8); // This would come from user context in real app

  // Check AI access permissions
  const { data: aiAccess, isLoading: accessLoading } = useQuery({
    queryKey: [`/api/clients/${currentClientId}/ai/health`],
    retry: false
  });

  // Get client's AI usage statistics
  const { data: aiUsage } = useQuery<{ usage: ClientAIUsage }>({
    queryKey: [`/api/clients/${currentClientId}/ai/usage`],
    enabled: !!aiAccess?.success
  });

  // Get client's transactions for categorization
  const { data: transactions = [] } = useQuery({
    queryKey: [`/api/transactions/${currentClientId}`],
    enabled: !!aiAccess?.success
  });

  // Get account recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: [`/api/clients/${currentClientId}/ai/account-recommendations`],
    enabled: !!aiAccess?.success
  });

  // Transaction categorization mutation
  const categorizeMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const response = await apiRequest("POST", `/api/clients/${currentClientId}/ai/categorize-transactions`, {
        transactionIds
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Categorization Complete",
        description: `Successfully categorized ${data.processedTransactions} transactions`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentClientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentClientId}/ai/usage`] });
      setSelectedTransactions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Categorization Failed",
        description: error.message || "Unable to categorize transactions",
        variant: "destructive",
      });
    }
  });

  if (accessLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p>Checking AI access permissions...</p>
        </div>
      </div>
    );
  }

  if (!aiAccess?.success) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              AI Access Denied
            </CardTitle>
            <CardDescription className="text-red-600">
              You don't have permission to access AI features for this client.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const uncategorizedTransactions = transactions.filter((tx: any) => !tx.accountId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Assistant Portal</h1>
          <p className="text-muted-foreground">
            AI-powered bookkeeping assistance for Client {currentClientId}
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle className="w-4 h-4 mr-1" />
          Secure Access Verified
        </Badge>
      </div>

      {/* AI Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your AI Usage This Month
          </CardTitle>
          <CardDescription>
            Track your AI assistance usage and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiUsage ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {aiUsage.usage.operations.reduce((sum, op) => sum + op.count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">AI Operations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {aiUsage.usage.totalTokens.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tokens Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${aiUsage.usage.estimatedCost.toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">Estimated Cost</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No AI usage data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Categorization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Transaction Categorization
            </CardTitle>
            <CardDescription>
              Let AI automatically categorize your transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Uncategorized Transactions:</span>
              <Badge variant="secondary">
                {uncategorizedTransactions.length}
              </Badge>
            </div>
            
            {uncategorizedTransactions.length > 0 ? (
              <>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uncategorizedTransactions.slice(0, 5).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{tx.description}</div>
                        <div className="text-xs text-muted-foreground">
                          ${Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions([...selectedTransactions, tx.id]);
                          } else {
                            setSelectedTransactions(selectedTransactions.filter(id => id !== tx.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                  {uncategorizedTransactions.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{uncategorizedTransactions.length - 5} more transactions
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedTransactions(uncategorizedTransactions.map((tx: any) => tx.id))}
                    variant="outline"
                    size="sm"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={() => setSelectedTransactions([])}
                    variant="outline"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
                
                <Button
                  onClick={() => categorizeMutation.mutate(selectedTransactions.length > 0 ? selectedTransactions : uncategorizedTransactions.map((tx: any) => tx.id))}
                  disabled={categorizeMutation.isPending}
                  className="w-full"
                >
                  {categorizeMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Categorizing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Categorize {selectedTransactions.length > 0 ? selectedTransactions.length : uncategorizedTransactions.length} Transactions
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All transactions are categorized!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Chart of Accounts Optimization
            </CardTitle>
            <CardDescription>
              AI-powered recommendations for your chart of accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recommendationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2">Generating recommendations...</span>
              </div>
            ) : recommendations?.success ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Based on your business type and transaction patterns:
                </div>
                {/* Recommendations would be displayed here */}
                <div className="p-3 border rounded bg-blue-50">
                  <div className="text-sm font-medium text-blue-800">
                    AI recommendations generated successfully
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Check your account settings for detailed suggestions
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentClientId}/ai/account-recommendations`] })}
                variant="outline"
                className="w-full"
              >
                Generate Account Recommendations
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Privacy Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-green-800">Privacy Protected</div>
              <div className="text-sm text-green-700">
                All AI processing is isolated to your business data only. 
                Your information is never shared with other clients or used for training.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}