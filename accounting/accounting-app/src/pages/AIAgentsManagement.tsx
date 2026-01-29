import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Bot, 
  Activity, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  Settings
} from "lucide-react";

interface AgentTask {
  id: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  clientName?: string;
  error?: string;
  result?: any;
}

interface AgentStats {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  totalTasks: number;
  successRate: number;
  avgProcessingTime: number;
  lastUsed?: string;
  currentTasks: number;
  costToday: number;
}

export default function AIAgentsManagement() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>('milton');

  // Fetch Milton status and statistics
  const { data: miltonStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/milton/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch agent statistics (legacy compatibility)
  const { data: agentStats, isLoading: statsLoading } = useQuery<AgentStats[]>({
    queryKey: ['/api/ai-agents/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch active tasks
  const { data: activeTasks, isLoading: tasksLoading } = useQuery<AgentTask[]>({
    queryKey: ['/api/ai-agents/tasks'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch agent logs
  const { data: agentLogs } = useQuery<any[]>({
    queryKey: ['/api/ai-agents/logs'],
    refetchInterval: 10000,
  });

  // Control mutations
  const pauseAgentMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const res = await apiRequest('POST', `/api/ai-agents/${agentType}/pause`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/stats'] });
      toast({ title: "Agent paused successfully" });
    }
  });

  const resumeAgentMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const res = await apiRequest('POST', `/api/ai-agents/${agentType}/resume`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/stats'] });
      toast({ title: "Agent resumed successfully" });
    }
  });

  const retryTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest('POST', `/api/ai-agents/tasks/${taskId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
      toast({ title: "Task queued for retry" });
    }
  });

  // Milton-specific mutations
  const runMiltonCategorizationMutation = useMutation({
    mutationFn: async (params: { firmId: number; clientId: number; userId: number }) => {
      const res = await apiRequest('POST', '/api/milton/categorize', params);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/milton/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
      toast({ 
        title: "Milton Categorization Started",
        description: `Processing ${data.results?.processed || 0} transactions`
      });
    }
  });

  const runMiltonReconciliationMutation = useMutation({
    mutationFn: async (params: { firmId: number; clientId: number; userId: number; bankTransactions: any[] }) => {
      const res = await apiRequest('POST', '/api/milton/reconcile', params);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/milton/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
      toast({ 
        title: "Milton Reconciliation Complete",
        description: `Matched ${data.results?.matched || 0} transactions`
      });
    }
  });

  const runMiltonFullBookkeepingMutation = useMutation({
    mutationFn: async (params: { firmId: number; clientId: number; userId: number }) => {
      const res = await apiRequest('POST', '/api/milton/full-bookkeeping', params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milton/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents/tasks'] });
      toast({ 
        title: "Milton Full Bookkeeping Started",
        description: "Complete workflow initiated - categorization, reconciliation, and analysis"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-500';
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agents Management</h1>
          <p className="text-muted-foreground">Monitor and manage your AI automation agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Logs
          </Button>
        </div>
      </div>

      {/* Milton AI Status - Primary Focus */}
      {miltonStatus && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <Bot className="h-6 w-6 text-blue-600" />
                Milton - Unified AI Bookkeeper
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(miltonStatus.status || 'active')}`}></div>
                <Badge variant={miltonStatus.status === 'active' ? 'default' : 'secondary'}>
                  {miltonStatus.status || 'Active'}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Consolidated AI system handling transaction categorization, bank reconciliation, and financial analysis
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">{miltonStatus.totalProcessed || 0}</div>
                <div className="text-xs text-muted-foreground">Transactions Processed</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{miltonStatus.successRate || 95}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{miltonStatus.activeTasks || 0}</div>
                <div className="text-xs text-muted-foreground">Active Tasks</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${(miltonStatus.costToday || 0).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Cost Today</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm"
                onClick={() => runMiltonCategorizationMutation.mutate({ firmId: 1, clientId: 1, userId: 1 })}
                disabled={runMiltonCategorizationMutation.isPending}
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                {runMiltonCategorizationMutation.isPending ? 'Processing...' : 'Run Categorization'}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => runMiltonReconciliationMutation.mutate({ 
                  firmId: 1, 
                  clientId: 1, 
                  userId: 1, 
                  bankTransactions: [] 
                })}
                disabled={runMiltonReconciliationMutation.isPending}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                {runMiltonReconciliationMutation.isPending ? 'Processing...' : 'Bank Reconciliation'}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => runMiltonFullBookkeepingMutation.mutate({ firmId: 1, clientId: 1, userId: 1 })}
                disabled={runMiltonFullBookkeepingMutation.isPending}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                {runMiltonFullBookkeepingMutation.isPending ? 'Processing...' : 'Full Bookkeeping'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {agentStats?.map((agent) => (
          <Card key={agent.name} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  {agent.name}
                </CardTitle>
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {agent.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">{agent.successRate}%</span>
              </div>
              <Progress value={agent.successRate} className="h-2" />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Tasks Today</span>
                  <div className="font-medium">{agent.totalTasks}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Active</span>
                  <div className="font-medium">{agent.currentTasks}</div>
                </div>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Time</span>
                <span className="font-medium">{formatDuration(agent.avgProcessingTime)}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cost Today</span>
                <span className="font-medium">${agent.costToday.toFixed(3)}</span>
              </div>

              <div className="flex gap-1 pt-2">
                {agent.status === 'active' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => pauseAgentMutation.mutate(agent.type)}
                    disabled={pauseAgentMutation.isPending}
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resumeAgentMutation.mutate(agent.type)}
                    disabled={resumeAgentMutation.isPending}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Management Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Tasks ({activeTasks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {activeTasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{task.type}</Badge>
                          <span className="text-sm font-medium">{task.clientName}</span>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                        </div>
                        
                        {task.status === 'processing' && (
                          <Progress value={task.progress} className="h-2 mb-2" />
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Started: {new Date(task.createdAt).toLocaleTimeString()}
                          {task.completedAt && ` • Completed: ${new Date(task.completedAt).toLocaleTimeString()}`}
                        </div>
                        
                        {task.error && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {task.error}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {task.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryTaskMutation.mutate(task.id)}
                            disabled={retryTaskMutation.isPending}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {!activeTasks?.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active tasks
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Task History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Task history will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tasks This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStats?.reduce((sum, agent) => sum + agent.totalTasks, 0) || 0}</div>
                <p className="text-xs text-muted-foreground">+12% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  AI Costs Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(agentStats?.reduce((sum, agent) => sum + agent.costToday, 0) || 0).toFixed(3)}
                </div>
                <p className="text-xs text-muted-foreground">Across all agents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Average Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentStats?.length 
                    ? Math.round(agentStats.reduce((sum, agent) => sum + agent.successRate, 0) / agentStats.length)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Across all agents</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Agent settings and configuration options will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}