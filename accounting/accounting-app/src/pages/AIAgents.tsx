import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Calculator, 
  CheckCircle, 
  FileText, 
  Play, 
  Clock, 
  AlertCircle,
  Settings,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AIAgentTask {
  id: number;
  agentType: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  parameters: any;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  firmId: number;
}

export default function AIAgents() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedEngagement, setSelectedEngagement] = useState<string>("");
  const [selectedBankFeed, setSelectedBankFeed] = useState<string>("");

  // Fetch AI agent tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<AIAgentTask[]>({
    queryKey: ['/api/ai-agents/tasks'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch engagements for selected client
  const { data: engagements } = useQuery({
    queryKey: ['/api/engagements', selectedClient],
    enabled: !!selectedClient,
  });

  // Fetch bank feeds for selected client
  const { data: bankFeeds } = useQuery({
    queryKey: ['/api/bank-feeds', selectedClient],
    enabled: !!selectedClient,
  });

  // Run Categorizer Agent
  const categorizerMutation = useMutation({
    mutationFn: async (params: { clientId: number; batchSize?: number }) => {
      const res = await apiRequest("POST", "/api/ai-agents/categorizer/run", params);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Categorizer Agent Started",
        description: "Transaction categorization is now running in the background.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Categorizer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Run Reconciler Agent
  const reconcilerMutation = useMutation({
    mutationFn: async (params: { clientId: number; bankFeedId: number; reconciliationDate: string }) => {
      const res = await apiRequest("POST", "/api/ai-agents/reconciler/run", params);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reconciler Agent Started",
        description: "Bank reconciliation is now running in the background.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Reconciler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Run PEG Validator Agent
  const pegValidatorMutation = useMutation({
    mutationFn: async (params: { engagementId: number }) => {
      const res = await apiRequest("POST", "/api/ai-agents/peg-validator/run", params);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "PEG Validator Started",
        description: "Professional Engagement Guide validation is now running.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start PEG Validator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Run Binder Generator Agent
  const binderGeneratorMutation = useMutation({
    mutationFn: async (params: { clientId: number; engagementType: string; fiscalYearEnd: string }) => {
      const res = await apiRequest("POST", "/api/ai-agents/binder-generator/run", params);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Binder Generator Started",
        description: "Engagement binder generation is now running.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Binder Generator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500"><Play className="w-3 h-3 mr-1" />Running</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'categorizer':
        return <Brain className="w-5 h-5" />;
      case 'reconciler':
        return <Calculator className="w-5 h-5" />;
      case 'peg-validator':
        return <CheckCircle className="w-5 h-5" />;
      case 'binder-generator':
        return <FileText className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Core AI Agents</h1>
          <p className="text-muted-foreground mt-2">
            Automated compliance and workflow management for accounting professionals
          </p>
        </div>
        <Zap className="w-8 h-8 text-primary" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categorizer">Transaction Categorizer</TabsTrigger>
          <TabsTrigger value="reconciler">Bank Reconciler</TabsTrigger>
          <TabsTrigger value="peg-validator">PEG Validator</TabsTrigger>
          <TabsTrigger value="binder-generator">Binder Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaction Categorizer</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  AI-powered transaction categorization with 95% accuracy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bank Reconciler</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Automated bank reconciliation with exception handling
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PEG Validator</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Professional Engagement Guide compliance validation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Binder Generator</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  AI-generated engagement binders with smart content
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Tasks</CardTitle>
              <CardDescription>
                Monitor the status of your automated compliance workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading agent tasks...</p>
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getAgentIcon(task.agentType)}
                        <div>
                          <p className="font-medium capitalize">{task.agentType.replace('-', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            Started {new Date(task.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No agent tasks yet</p>
                  <p className="text-sm text-muted-foreground">Start an agent from the tabs above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorizer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Transaction Categorizer Agent
              </CardTitle>
              <CardDescription>
                Automatically categorize transactions using AI with industry-specific rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-select">Select Client</Label>
                <Select onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-size">Batch Size (transactions per batch)</Label>
                <Input
                  id="batch-size"
                  type="number"
                  placeholder="50"
                  defaultValue="50"
                />
              </div>

              <Button
                onClick={() => categorizerMutation.mutate({ 
                  clientId: parseInt(selectedClient),
                  batchSize: 50
                })}
                disabled={!selectedClient || categorizerMutation.isPending}
                className="w-full"
              >
                {categorizerMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Starting Categorizer...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Transaction Categorization
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Bank Reconciler Agent
              </CardTitle>
              <CardDescription>
                Automated bank reconciliation with intelligent matching algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-select-reconciler">Select Client</Label>
                <Select onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-feed-select">Select Bank Feed</Label>
                <Select onValueChange={setSelectedBankFeed}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank feed..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankFeeds?.map((feed: any) => (
                      <SelectItem key={feed.id} value={feed.id.toString()}>
                        {feed.name} - {feed.institutionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reconciliation-date">Reconciliation Date</Label>
                <Input
                  id="reconciliation-date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button
                onClick={() => reconcilerMutation.mutate({ 
                  clientId: parseInt(selectedClient),
                  bankFeedId: parseInt(selectedBankFeed),
                  reconciliationDate: new Date().toISOString()
                })}
                disabled={!selectedClient || !selectedBankFeed || reconcilerMutation.isPending}
                className="w-full"
              >
                {reconcilerMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Starting Reconciliation...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Bank Reconciliation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peg-validator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                PEG Validator Agent
              </CardTitle>
              <CardDescription>
                Professional Engagement Guide compliance validation for 2024 standards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-select-peg">Select Client</Label>
                <Select onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engagement-select">Select Engagement</Label>
                <Select onValueChange={setSelectedEngagement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an engagement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements?.map((engagement: any) => (
                      <SelectItem key={engagement.id} value={engagement.id.toString()}>
                        {engagement.name} ({engagement.engagementType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => pegValidatorMutation.mutate({ 
                  engagementId: parseInt(selectedEngagement)
                })}
                disabled={!selectedEngagement || pegValidatorMutation.isPending}
                className="w-full"
              >
                {pegValidatorMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Validating Compliance...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start PEG Validation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binder-generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Binder Generator Agent
              </CardTitle>
              <CardDescription>
                AI-generated engagement binders with industry-specific content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-select-binder">Select Client</Label>
                <Select onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engagement-type">Engagement Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose engagement type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compilation">Compilation</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscal-year-end">Fiscal Year End</Label>
                <Input
                  id="fiscal-year-end"
                  type="date"
                  defaultValue="2024-12-31"
                />
              </div>

              <Button
                onClick={() => binderGeneratorMutation.mutate({ 
                  clientId: parseInt(selectedClient),
                  engagementType: "review",
                  fiscalYearEnd: "2024-12-31"
                })}
                disabled={!selectedClient || binderGeneratorMutation.isPending}
                className="w-full"
              >
                {binderGeneratorMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generating Binder...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Engagement Binder
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}