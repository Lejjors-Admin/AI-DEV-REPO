import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Brain, Shield, Zap, Clock, DollarSign, BarChart3, CheckCircle, History, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AgentConfig {
  enabled: boolean;
  processingMode: 'external' | 'local' | 'rule_based';
  provider?: string;
  model?: string;
  localModelPath?: string;
}

interface AISettings {
  id: number;
  firmId: number;
  enabled: boolean;
  maxTokensPerDay: number;
  tokensUsedToday: number;
  lastResetDate: Date;
  privacyConsent: boolean;
  costProtectionEnabled: boolean;
  jurisdiction: string;
  createdAt: Date;
  updatedAt: Date;
  // Per-agent configurations
  categorizer: AgentConfig;
  reconciler: AgentConfig;
  pegValidator: AgentConfig;
  binderGenerator: AgentConfig;
  connie: AgentConfig & {
    personality?: string;
    capabilities?: string[];
  };
  // Global defaults
  defaultProvider: string;
  defaultModel: string;
  defaultLocalModelPath: string | null;
}

interface AITask {
  id: number;
  taskType: string;
  status: string;
  processingMode: string;
  agentProvider: string;
  tokensUsed: number | null;
  processingTime: number | null;
  confidence: number | null;
  createdAt: Date;
}

interface UsageMetric {
  id: number;
  metricType: string;
  value: string;
  timestamp: Date;
  billingPeriod: string;
}

export default function AISettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch AI settings
  const { data: settings, isLoading: settingsLoading } = useQuery<AISettings>({
    queryKey: ["/api/ai-settings"],
    enabled: true
  });

  // Fetch AI tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/ai-settings/tasks"],
    enabled: true
  });
  
  // Ensure tasks is always an array
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  // Fetch usage metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/ai-settings/usage"],
    enabled: true
  });
  
  // Ensure metrics is always an array
  const metrics = Array.isArray(metricsData) ? metricsData : [];

  // Define AI agents with their details
  const aiAgents = [
    {
      key: 'milton',
      name: 'Milton - AI Bookkeeper',
      description: 'Unified AI agent for transaction processing, categorization, OCR, and bank feeds',
      icon: Calculator,
      color: 'bg-emerald-500'
    },
    {
      key: 'categorizer',
      name: 'Transaction Categorizer',
      description: 'Automatically categorizes transactions using 6 analysis modes',
      icon: Brain,
      color: 'bg-blue-500'
    },
    {
      key: 'reconciler', 
      name: 'Bank Reconciler',
      description: 'Reconciles bank statements with accounting records',
      icon: Shield,
      color: 'bg-green-500'
    },
    {
      key: 'pegValidator',
      name: 'PEG Compliance Validator', 
      description: 'Validates compliance with accounting standards',
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    {
      key: 'binderGenerator',
      name: 'Binder Generator',
      description: 'Generates audit binders and working papers',
      icon: Zap,
      color: 'bg-purple-500'
    },
    {
      key: 'connie',
      name: 'Connie - CRM Officer',
      description: 'AI-powered CRM and project management for client relationships',
      icon: Brain,
      color: 'bg-pink-500'
    }
  ];

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AISettings>) => {
      const response = await apiRequest("PUT", "/api/ai-settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings"] });
      toast({
        title: "Settings Updated",
        description: "AI settings have been successfully updated."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update AI settings",
        variant: "destructive"
      });
    }
  });

  // Test AI system mutation
  const testAIMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai-settings/test", {
        taskType: "transaction_categorization",
        inputData: { sample: true }
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings/tasks"] });
      toast({
        title: "AI Test Completed",
        description: `Test completed successfully. Confidence: ${(result.confidence * 100).toFixed(1)}%`
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Test Failed",
        description: error.message || "Failed to test AI system",
        variant: "destructive"
      });
    }
  });

  // Test agent configuration mutation
  const testAgentMutation = useMutation({
    mutationFn: async (config: { agentType: string; processingMode: string; provider?: string; model?: string }) => {
      return await apiRequest("POST", "/api/ai-settings/test", config)
        .then(res => res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Agent Test",
        description: data.success ? `${data.message}` : "Test failed",
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Run agent mutation
  const runAgentMutation = useMutation({
    mutationFn: async (config: { agentType: string; clientId?: number; options?: any }) => {
      return await apiRequest("POST", "/api/ai-settings/run-agent", config)
        .then(res => res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Agent Started",
        description: data.message,
      });
      // Refresh tasks after running agent
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings/tasks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Agent",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (settingsLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const tokensUsedPercentage = settings ? (settings.tokensUsedToday / settings.maxTokensPerDay) * 100 : 0;
  const recentTasks = tasks.slice(0, 5);
  const todaysMetrics = metrics.filter(m => 
    new Date(m.timestamp).toDateString() === new Date().toDateString()
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Settings</h1>
          <p className="text-muted-foreground">
            Configure your multi-tier AI processing system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => testAIMutation.mutate()}
            disabled={testAIMutation.isPending}
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            Test AI System
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Active Tasks & Analytics</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Compliance</TabsTrigger>
          <TabsTrigger value="monitoring">Task History & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI System Status</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={settings?.enabled ? "default" : "secondary"}>
                    {settings?.enabled ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {settings?.processingMode === 'external' ? 'External AI' :
                     settings?.processingMode === 'local' ? 'Local AI' : 'Rule-based'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Token Usage & Costs</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {settings?.tokensUsedToday || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {settings?.maxTokensPerDay || 0} daily limit ({tokensUsedPercentage.toFixed(1)}%)
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(tokensUsedPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Daily Cost Est.</span>
                      <span className="font-medium">
                        ${((settings?.tokensUsedToday || 0) * 0.04 / 1000).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Binder Generation</span>
                      <span className="font-medium">~$0.15 each</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Tasks</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {tasks.filter(t => t.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active & Recent AI Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Tasks
                </CardTitle>
                <CardDescription>Currently running AI processes</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : tasks.filter(t => t.status === 'in_progress').length > 0 ? (
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === 'in_progress').slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <div>
                            <p className="font-medium">{task.taskType.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.agentProvider} • {task.processingMode}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <Badge variant="secondary">Processing</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-6">
                    No active tasks running.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recent Completions
                </CardTitle>
                <CardDescription>Latest completed AI tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {task.status}
                          </Badge>
                          <div>
                            <p className="font-medium">{task.taskType.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.agentProvider} • {task.processingMode}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>
                            {task.tokensUsed ? `${task.tokensUsed} tokens` : 'N/A'}
                          </div>
                          <div>
                            {task.processingTime ? `${task.processingTime}ms` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-6">
                    No completed tasks yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Dashboard
              </CardTitle>
              <CardDescription>AI performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {tasks.filter(t => t.status === 'completed' && new Date(t.createdAt).toDateString() === new Date().toDateString()).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Tasks Today</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((tasks.filter(t => t.status === 'completed').length / Math.max(tasks.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {tasks.reduce((avg, t) => avg + (t.processingTime || 0), 0) / Math.max(tasks.length, 1) | 0}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {tasks.filter(t => t.confidence && t.confidence > 0.8).length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Confidence Results</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiAgents.map((agent) => {
              const Icon = agent.icon;
              const agentConfig = settings?.[agent.key as keyof AISettings] as AgentConfig;
              
              return (
                <Card key={agent.key} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${agent.color}`} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${agent.color.replace('bg-', 'text-')}`} />
                      {agent.name}
                      <Badge variant={agentConfig?.enabled ? "default" : "secondary"}>
                        {agentConfig?.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {agent.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${agent.key}-enabled`}>Enabled</Label>
                      <Switch
                        id={`${agent.key}-enabled`}
                        checked={agentConfig?.enabled || false}
                        onCheckedChange={(checked) => {
                          const updates = {
                            [agent.key]: {
                              ...agentConfig,
                              enabled: checked
                            }
                          };
                          updateSettingsMutation.mutate(updates);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label>Processing Mode</Label>
                      <Select
                        value={agentConfig?.processingMode || 'rule_based'}
                        onValueChange={(value) => {
                          const updates = {
                            [agent.key]: {
                              ...agentConfig,
                              processingMode: value as 'external' | 'local' | 'rule_based'
                            }
                          };
                          updateSettingsMutation.mutate(updates);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              External AI
                            </div>
                          </SelectItem>
                          <SelectItem value="local">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              Local AI
                            </div>
                          </SelectItem>
                          <SelectItem value="rule_based">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full" />
                              Rule-based
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {agentConfig?.processingMode === 'external' && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <Label>AI Provider</Label>
                          <Select
                            value={agentConfig?.provider || settings?.defaultProvider || 'anthropic'}
                            onValueChange={(value) => {
                              const updates = {
                                [agent.key]: {
                                  ...agentConfig,
                                  provider: value
                                }
                              };
                              updateSettingsMutation.mutate(updates);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                              <SelectItem value="gemini">Google (Gemini)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Model</Label>
                          <Select
                            value={agentConfig?.model || settings?.defaultModel || 'claude-sonnet-4-20250514'}
                            onValueChange={(value) => {
                              const updates = {
                                [agent.key]: {
                                  ...agentConfig,
                                  model: value
                                }
                              };
                              updateSettingsMutation.mutate(updates);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {agentConfig?.processingMode === 'local' && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <Label>Local Model Path</Label>
                          <Input
                            value={agentConfig?.localModelPath || settings?.defaultLocalModelPath || ''}
                            onChange={(e) => {
                              const updates = {
                                [agent.key]: {
                                  ...agentConfig,
                                  localModelPath: e.target.value
                                }
                              };
                              updateSettingsMutation.mutate(updates);
                            }}
                            placeholder="/path/to/local/model"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          testAgentMutation.mutate({
                            agentType: agent.key,
                            processingMode: agentConfig?.processingMode || 'rule_based',
                            provider: agentConfig?.provider || settings?.defaultProvider,
                            model: agentConfig?.model || settings?.defaultModel
                          });
                        }}
                        disabled={testAgentMutation.isPending}
                      >
                        Test Configuration
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          runAgentMutation.mutate({
                            agentType: agent.key,
                            clientId: 1,
                            options: {}
                          });
                        }}
                        disabled={!agentConfig?.enabled || runAgentMutation.isPending}
                      >
                        Run Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          {/* Processing Mode Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Mode</CardTitle>
              <CardDescription>
                Choose how AI tasks are processed in your system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    settings?.processingMode === 'external' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleSettingChange('processingMode', 'external')}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <input 
                      type="radio" 
                      checked={settings?.processingMode === 'external'}
                      readOnly
                    />
                    <h3 className="font-medium">External AI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use cloud-based AI providers (OpenAI, Anthropic) for maximum accuracy and capabilities.
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    High accuracy • Requires internet • Usage costs apply
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    settings?.processingMode === 'local' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleSettingChange('processingMode', 'local')}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <input 
                      type="radio" 
                      checked={settings?.processingMode === 'local'}
                      readOnly
                    />
                    <h3 className="font-medium">Local AI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Run AI models locally on your device for complete privacy and data control.
                  </p>
                  <div className="mt-2 text-xs text-green-600">
                    Complete privacy • No internet required • Free to use
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    settings?.processingMode === 'rule_based' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleSettingChange('processingMode', 'rule_based')}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <input 
                      type="radio" 
                      checked={settings?.processingMode === 'rule_based'}
                      readOnly
                    />
                    <h3 className="font-medium">Rule-based</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use deterministic rules based on GAAP, CRA standards, and audit requirements.
                  </p>
                  <div className="mt-2 text-xs text-purple-600">
                    Compliance focused • Fast processing • Deterministic results
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          {settings?.processingMode === 'external' && (
            <Card>
              <CardHeader>
                <CardTitle>AI Provider Settings</CardTitle>
                <CardDescription>
                  Configure your external AI provider and model settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select 
                      value={settings?.provider || ''} 
                      onValueChange={(value) => handleSettingChange('provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select 
                      value={settings?.model || ''} 
                      onValueChange={(value) => handleSettingChange('model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings?.provider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </>
                        )}
                        {settings?.provider === 'anthropic' && (
                          <>
                            <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                            <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
                          </>
                        )}
                        {settings?.provider === 'gemini' && (
                          <>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Daily Token Limit</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={settings?.maxTokensPerDay || 5000}
                    onChange={(e) => handleSettingChange('maxTokensPerDay', parseInt(e.target.value))}
                    min="1000"
                    max="100000"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum tokens to use per day for cost protection
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>AI Features</CardTitle>
              <CardDescription>
                Enable or disable specific AI-powered features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoCategorization">Automatic Transaction Categorization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically categorize bank transactions using AI
                  </p>
                </div>
                <Switch
                  id="autoCategorization"
                  checked={settings?.autoCategorizationEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange('autoCategorizationEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoReconciliation">Automatic Bank Reconciliation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically match bank transactions with accounting records
                  </p>
                </div>
                <Switch
                  id="autoReconciliation"
                  checked={settings?.autoReconciliationEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange('autoReconciliationEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="complianceValidation">Compliance Validation</Label>
                  <p className="text-sm text-muted-foreground">
                    Validate transactions and reports against accounting standards
                  </p>
                </div>
                <Switch
                  id="complianceValidation"
                  checked={settings?.complianceValidationEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange('complianceValidationEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="binderGeneration">AI Binder Generation</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate audit binders and working papers using AI
                  </p>
                </div>
                <Switch
                  id="binderGeneration"
                  checked={settings?.binderGenerationEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange('binderGenerationEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          {/* Privacy Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Privacy & Data Protection</span>
              </CardTitle>
              <CardDescription>
                Control how your data is processed and ensure compliance with privacy regulations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Privacy Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      When using external AI providers, your data may be processed by third-party services. 
                      Review their privacy policies and ensure compliance with your local regulations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacyConsent">Privacy Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    I consent to processing financial data with external AI providers
                  </p>
                </div>
                <Switch
                  id="privacyConsent"
                  checked={settings?.privacyConsent || false}
                  onCheckedChange={(checked) => handleSettingChange('privacyConsent', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="costProtection">Cost Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent unexpected charges by enforcing daily limits
                  </p>
                </div>
                <Switch
                  id="costProtection"
                  checked={settings?.costProtectionEnabled || false}
                  onCheckedChange={(checked) => handleSettingChange('costProtectionEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Select 
                  value={settings?.jurisdiction || 'CA'} 
                  onValueChange={(value) => handleSettingChange('jurisdiction', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">Canada (GAAP, CRA)</SelectItem>
                    <SelectItem value="US">United States (US GAAP)</SelectItem>
                    <SelectItem value="UK">United Kingdom (UK GAAP)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select your jurisdiction for compliance rules and tax standards
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Processing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Data Processing Modes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600 mb-2">Local Processing</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Data never leaves your device</li>
                    <li>• Complete privacy control</li>
                    <li>• No internet required</li>
                    <li>• GDPR/PIPEDA compliant</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-blue-600 mb-2">Rule-based Processing</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Uses predefined accounting rules</li>
                    <li>• No external data transmission</li>
                    <li>• Compliant with standards</li>
                    <li>• Deterministic results</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-orange-600 mb-2">External AI</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Data sent to AI providers</li>
                    <li>• Highest accuracy</li>
                    <li>• Requires privacy consent</li>
                    <li>• Subject to provider policies</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Token Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Token Usage Analytics
              </CardTitle>
              <CardDescription>Detailed cost tracking and usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Today's Usage</div>
                  <div className="text-2xl font-bold">{settings?.tokensUsedToday || 0}</div>
                  <div className="text-xs text-muted-foreground">
                    ${((settings?.tokensUsedToday || 0) * 0.04 / 1000).toFixed(4)} cost
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Binder Generations</div>
                  <div className="text-2xl font-bold">
                    {tasks.filter(t => t.taskType === 'binder_generation').length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~${(tasks.filter(t => t.taskType === 'binder_generation').length * 0.15).toFixed(2)} total
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Avg. per Binder</div>
                  <div className="text-2xl font-bold">~2,500</div>
                  <div className="text-xs text-muted-foreground">tokens (~$0.15)</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Daily Limit</div>
                  <div className="text-2xl font-bold">{tokensUsedPercentage.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {settings?.maxTokensPerDay || 0} max
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Recent Token Usage by Feature</h4>
                <div className="space-y-2">
                  {['binder_generation', 'categorizer', 'pegValidator'].map(feature => {
                    const featureTasks = tasks.filter(t => t.taskType === feature);
                    const estimatedTokens = feature === 'binder_generation' ? featureTasks.length * 2500 : featureTasks.length * 100;
                    const estimatedCost = estimatedTokens * 0.04 / 1000;
                    
                    return (
                      <div key={feature} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium capitalize">{feature.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({featureTasks.length} runs)
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">~{estimatedTokens.toLocaleString()} tokens</div>
                          <div className="text-sm text-muted-foreground">${estimatedCost.toFixed(4)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Complete Task History
              </CardTitle>
              <CardDescription>All AI processing tasks with detailed logs</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'failed' ? 'destructive' :
                          task.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {task.status}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{task.taskType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.agentProvider} • {task.processingMode}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(task.createdAt).toLocaleString()}
                          </p>
                          {task.confidence && (
                            <p className="text-xs text-green-600 mt-1">
                              Confidence: {(task.confidence * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{task.tokensUsed ? `${task.tokensUsed} tokens` : 'N/A'}</div>
                        <div>{task.processingTime ? `${task.processingTime}ms` : 'N/A'}</div>
                        {task.status === 'failed' && task.errorMessage && (
                          <div className="text-red-600 text-xs mt-1 max-w-40 truncate">
                            {task.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No tasks have been executed yet. Start by testing or running an AI agent.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Statistics & Performance
              </CardTitle>
              <CardDescription>Monitor AI system performance and costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics.find(m => m.metricType === 'ai_calls')?.value || '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total API Calls</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {tasks.filter(t => t.status === 'completed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Completed Tasks</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {metrics.find(m => m.metricType === 'tokens_used')?.value || '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Tokens Used</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(parseInt(metrics.find(m => m.metricType === 'processing_time')?.value || '0') / 1000)}s
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                    </div>
                  </div>

                  {/* Agent Performance Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Agent Performance</h4>
                      <div className="space-y-2">
                        {['categorizer', 'reconciler', 'pegValidator', 'binderGenerator'].map(agent => {
                          const agentTasks = tasks.filter(t => t.taskType.includes(agent));
                          const successRate = agentTasks.length > 0 ? 
                            (agentTasks.filter(t => t.status === 'completed').length / agentTasks.length) * 100 : 0;
                          
                          return (
                            <div key={agent} className="flex justify-between items-center">
                              <span className="text-sm capitalize">{agent.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{agentTasks.length} tasks</span>
                                <Badge variant={successRate > 80 ? 'default' : successRate > 60 ? 'secondary' : 'destructive'}>
                                  {successRate.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Processing Modes</h4>
                      <div className="space-y-2">
                        {['external', 'local', 'rule_based'].map(mode => {
                          const modeTasks = tasks.filter(t => t.processingMode === mode);
                          const avgTime = modeTasks.length > 0 ? 
                            modeTasks.reduce((sum, t) => sum + (t.processingTime || 0), 0) / modeTasks.length : 0;
                          
                          return (
                            <div key={mode} className="flex justify-between items-center">
                              <span className="text-sm capitalize">{mode.replace('_', ' ')}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{modeTasks.length} tasks</span>
                                <span className="text-xs text-blue-600">{Math.round(avgTime)}ms avg</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>
      </Tabs>
    </div>
  );
}