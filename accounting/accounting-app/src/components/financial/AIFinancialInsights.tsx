
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LineChart, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

interface InsightProps {
  clientId: string;
  onInsightGenerated?: () => void;
}

export function AIFinancialInsights({ clientId, onInsightGenerated }: InsightProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const { toast } = useToast();

  const generateInsights = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(apiConfig.buildUrl(`/api/insights/${clientId}/analyze`), {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      setInsights(data);
      
      if (onInsightGenerated) {
        onInsightGenerated();
      }

      toast({
        title: "Insights Generated",
        description: "Financial analysis has been completed"
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChart className="h-5 w-5 mr-2 text-primary" />
            AI Financial Analysis
          </CardTitle>
          <CardDescription>
            Get AI-powered insights about your business performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Growth Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insights.growthRate}%</div>
                    <p className="text-xs text-muted-foreground">{insights.growthInsight}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Industry Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insights.industryPercentile}th</div>
                    <p className="text-xs text-muted-foreground">Percentile in your industry</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insights.healthScore}/100</div>
                    <p className="text-xs text-muted-foreground">{insights.healthInsight}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Key Recommendations</h3>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {insights.anomalies.length > 0 && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                    Anomalies Detected
                  </h3>
                  <ul className="space-y-2">
                    {insights.anomalies.map((anomaly: string, i: number) => (
                      <li key={i} className="text-sm text-yellow-800">{anomaly}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click generate to analyze your financial data
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={generateInsights} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Generate Insights'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
