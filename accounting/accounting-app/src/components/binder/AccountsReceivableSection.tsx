import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, FileText, Bot, DollarSign, Users, AlertTriangle, CheckCircle } from "lucide-react";

interface AccountsReceivableData {
  tradeReceivables: number;
  otherReceivables: number;
  allowanceForDoubtfulAccounts: number;
  netReceivables: number;
  agingAnalysis: {
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyDays: number;
    overNinetyDays: number;
  };
  concentrationRisk: {
    topFiveCustomers: number;
    percentageOfTotal: number;
  };
}

interface AccountsReceivableAuditProcedures {
  confirmationsProcedure: {
    status: 'not_started' | 'in_progress' | 'completed';
    confirmationsSent: number;
    confirmationsReceived: number;
    alternativeProcedures: string[];
  };
  cutoffTesting: {
    status: 'not_started' | 'in_progress' | 'completed';
    sampleSize: number;
    exceptions: number;
    findings: string;
  };
  subsequentReceipts: {
    status: 'not_started' | 'in_progress' | 'completed';
    amountTested: number;
    percentageCollected: number;
    findings: string;
  };
  allowanceReview: {
    status: 'not_started' | 'in_progress' | 'completed';
    methodology: string;
    adequacy: 'adequate' | 'inadequate' | 'requires_adjustment';
    proposedAdjustment: number;
  };
}

interface Props {
  clientId: number;
  binderId: number;
}

export function AccountsReceivableSection({ clientId, binderId }: Props) {
  const [data, setData] = useState<AccountsReceivableData | null>(null);
  const [procedures, setProcedures] = useState<AccountsReceivableAuditProcedures | null>(null);
  const [loading, setLoading] = useState(true);
  const [tarsAnalysis, setTarsAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccountsReceivableData();
  }, [clientId]);

  const loadAccountsReceivableData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/binder/accounts-receivable/${clientId}`);
      const result = await response.json();
      setData(result.data);
      setProcedures(result.procedures);
    } catch (error) {
      console.error("Error loading accounts receivable data:", error);
      toast({
        title: "Error",
        description: "Failed to load accounts receivable data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runTarsAnalysis = async () => {
    if (!data || !procedures) return;
    
    try {
      setIsAnalyzing(true);
      const response = await apiRequest("POST", `/api/binder/accounts-receivable/${clientId}/tars-analysis`, {
        data,
        procedures
      });
      const result = await response.json();
      setTarsAnalysis(result.analysis);
      
      toast({
        title: "TARS Analysis Complete",
        description: "AI analysis has been generated for accounts receivable section",
      });
    } catch (error) {
      console.error("Error running TARS analysis:", error);
      toast({
        title: "Error",
        description: "Failed to run TARS analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateProcedureStatus = async (procedure: string, status: string) => {
    if (!procedures) return;
    
    const updatedProcedures = { ...procedures };
    (updatedProcedures as any)[procedure].status = status;
    setProcedures(updatedProcedures);
    
    try {
      await apiRequest("PUT", `/api/binder/accounts-receivable/${clientId}/procedures`, {
        procedures: updatedProcedures
      });
      toast({
        title: "Updated",
        description: "Procedure status updated successfully",
      });
    } catch (error) {
      console.error("Error updating procedure:", error);
      toast({
        title: "Error",
        description: "Failed to update procedure status",
        variant: "destructive",
      });
    }
  };

  const generateWorkingPaper = async (paperType: string) => {
    try {
      const response = await apiRequest("POST", `/api/binder/accounts-receivable/${clientId}/working-papers/${paperType}`, {
        data,
        procedures,
        analysis: tarsAnalysis
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AR_${paperType}_${new Date().toISOString().split('T')[0]}.${paperType.includes('confirmation') ? 'docx' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Working Paper Generated",
          description: `${paperType} working paper downloaded successfully`,
        });
      }
    } catch (error) {
      console.error("Error generating working paper:", error);
      toast({
        title: "Error",
        description: "Failed to generate working paper",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { variant: "secondary" as const, text: "Not Started" },
      in_progress: { variant: "default" as const, text: "In Progress" },
      completed: { variant: "success" as const, text: "Completed" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading Accounts Receivable Section...</p>
        </div>
      </div>
    );
  }

  if (!data || !procedures) {
    return (
      <div className="p-8 text-center">
        <p>No accounts receivable data available</p>
      </div>
    );
  }

  const completedProcedures = Object.values(procedures).filter(p => p.status === 'completed').length;
  const totalProcedures = Object.values(procedures).length;
  const progressPercentage = (completedProcedures / totalProcedures) * 100;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Section C: Accounts Receivable</h2>
          <p className="text-muted-foreground">Trade and other receivables audit procedures</p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progressPercentage} className="w-32" />
          <span className="text-sm font-medium">{completedProcedures}/{totalProcedures}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.netReceivables.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              After allowance of ${data.allowanceForDoubtfulAccounts.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.agingAnalysis.current.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((data.agingAnalysis.current / data.tradeReceivables) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concentration Risk</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.concentrationRisk.percentageOfTotal}%</div>
            <p className="text-xs text-muted-foreground">Top 5 customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue (&gt;60 days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.agingAnalysis.sixtyDays + data.agingAnalysis.ninetyDays + data.agingAnalysis.overNinetyDays).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(((data.agingAnalysis.sixtyDays + data.agingAnalysis.ninetyDays + data.agingAnalysis.overNinetyDays) / data.tradeReceivables) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="procedures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="procedures">Audit Procedures</TabsTrigger>
          <TabsTrigger value="analysis">Aging Analysis</TabsTrigger>
          <TabsTrigger value="tars">TARS Analysis</TabsTrigger>
          <TabsTrigger value="workpapers">Working Papers</TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confirmations Procedure */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Confirmations</CardTitle>
                  {getStatusBadge(procedures.confirmationsProcedure.status)}
                </div>
                <CardDescription>Customer balance confirmations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sent</Label>
                    <Input 
                      type="number" 
                      value={procedures.confirmationsProcedure.confirmationsSent}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.confirmationsProcedure.confirmationsSent = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Received</Label>
                    <Input 
                      type="number" 
                      value={procedures.confirmationsProcedure.confirmationsReceived}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.confirmationsProcedure.confirmationsReceived = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={procedures.confirmationsProcedure.status} 
                    onValueChange={(value) => updateProcedureStatus('confirmationsProcedure', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Cutoff Testing */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Cutoff Testing</CardTitle>
                  {getStatusBadge(procedures.cutoffTesting.status)}
                </div>
                <CardDescription>Sales cutoff procedures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sample Size</Label>
                    <Input 
                      type="number" 
                      value={procedures.cutoffTesting.sampleSize}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.cutoffTesting.sampleSize = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Exceptions</Label>
                    <Input 
                      type="number" 
                      value={procedures.cutoffTesting.exceptions}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.cutoffTesting.exceptions = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={procedures.cutoffTesting.status} 
                    onValueChange={(value) => updateProcedureStatus('cutoffTesting', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Subsequent Receipts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Subsequent Receipts</CardTitle>
                  {getStatusBadge(procedures.subsequentReceipts.status)}
                </div>
                <CardDescription>Post year-end collection testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount Tested</Label>
                    <Input 
                      type="number" 
                      value={procedures.subsequentReceipts.amountTested}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.subsequentReceipts.amountTested = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label>% Collected</Label>
                    <Input 
                      type="number" 
                      value={procedures.subsequentReceipts.percentageCollected}
                      onChange={(e) => {
                        const updated = { ...procedures };
                        updated.subsequentReceipts.percentageCollected = parseInt(e.target.value) || 0;
                        setProcedures(updated);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={procedures.subsequentReceipts.status} 
                    onValueChange={(value) => updateProcedureStatus('subsequentReceipts', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Allowance Review */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Allowance Review</CardTitle>
                  {getStatusBadge(procedures.allowanceReview.status)}
                </div>
                <CardDescription>Doubtful accounts assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Adequacy</Label>
                  <Select 
                    value={procedures.allowanceReview.adequacy} 
                    onValueChange={(value) => {
                      const updated = { ...procedures };
                      updated.allowanceReview.adequacy = value as any;
                      setProcedures(updated);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="inadequate">Inadequate</SelectItem>
                      <SelectItem value="requires_adjustment">Requires Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Proposed Adjustment</Label>
                  <Input 
                    type="number" 
                    value={procedures.allowanceReview.proposedAdjustment}
                    onChange={(e) => {
                      const updated = { ...procedures };
                      updated.allowanceReview.proposedAdjustment = parseInt(e.target.value) || 0;
                      setProcedures(updated);
                    }}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={procedures.allowanceReview.status} 
                    onValueChange={(value) => updateProcedureStatus('allowanceReview', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aging Analysis</CardTitle>
              <CardDescription>Breakdown of receivables by age</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Current</div>
                    <div className="text-lg font-bold">${data.agingAnalysis.current.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((data.agingAnalysis.current / data.tradeReceivables) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">31-60 days</div>
                    <div className="text-lg font-bold">${data.agingAnalysis.thirtyDays.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((data.agingAnalysis.thirtyDays / data.tradeReceivables) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">61-90 days</div>
                    <div className="text-lg font-bold">${data.agingAnalysis.sixtyDays.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((data.agingAnalysis.sixtyDays / data.tradeReceivables) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">91-120 days</div>
                    <div className="text-lg font-bold">${data.agingAnalysis.ninetyDays.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((data.agingAnalysis.ninetyDays / data.tradeReceivables) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Over 120 days</div>
                    <div className="text-lg font-bold">${data.agingAnalysis.overNinetyDays.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((data.agingAnalysis.overNinetyDays / data.tradeReceivables) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tars" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    TARS AI Analysis
                  </CardTitle>
                  <CardDescription>AI-powered audit analysis for accounts receivable</CardDescription>
                </div>
                <Button onClick={runTarsAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tarsAnalysis ? (
                <div className="space-y-4">
                  <Textarea 
                    value={tarsAnalysis} 
                    onChange={(e) => setTarsAnalysis(e.target.value)}
                    className="min-h-[300px]" 
                    placeholder="TARS analysis will appear here..."
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Run Analysis" to generate TARS AI analysis for this section
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workpapers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Working Papers
              </CardTitle>
              <CardDescription>Generate and download audit working papers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => generateWorkingPaper('confirmation-summary')}
                  className="h-16"
                >
                  <div className="text-center">
                    <Download className="h-4 w-4 mx-auto mb-1" />
                    <div className="text-sm">Confirmation Summary</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generateWorkingPaper('aging-analysis')}
                  className="h-16"
                >
                  <div className="text-center">
                    <Download className="h-4 w-4 mx-auto mb-1" />
                    <div className="text-sm">Aging Analysis</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generateWorkingPaper('cutoff-testing')}
                  className="h-16"
                >
                  <div className="text-center">
                    <Download className="h-4 w-4 mx-auto mb-1" />
                    <div className="text-sm">Cutoff Testing</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => generateWorkingPaper('allowance-review')}
                  className="h-16"
                >
                  <div className="text-center">
                    <Download className="h-4 w-4 mx-auto mb-1" />
                    <div className="text-sm">Allowance Review</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}