// TARS Autonomous Agent Control Panel
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download,
  Play,
  BarChart3,
  FileSpreadsheet,
  Eye,
  Users
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  tasks: Array<{
    id: string;
    type: string;
    status: string;
    priority: string;
    clientId: number;
  }>;
}

interface GeneratedDocument {
  fileName: string;
  filePath: string;
  type: 'excel' | 'word' | 'pdf';
  url: string;
  size: number;
}

export default function TarsAutonomous() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<number>(1);

  // Queue status query
  const { data: queueStatus, isLoading: isLoadingQueue } = useQuery<QueueStatus>({
    queryKey: ['/api/tars/autonomous/queue-status'],
    refetchInterval: 2000 // Poll every 2 seconds
  });

  // Documents query
  const { data: documentsData, isLoading: isLoadingDocs } = useQuery<{ documents: GeneratedDocument[] }>({
    queryKey: ['/api/tars/documents', selectedClientId],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Task execution mutations
  const executeTaskMutation = useMutation({
    mutationFn: async (params: { type: string; clientId: number; input?: any; binderId?: number; priority?: string }) => {
      return await apiRequest('/api/tars/autonomous/start-task', 'POST', { 
        type: params.type, 
        clientId: params.clientId, 
        input: params.input || {}, 
        binderId: params.binderId, 
        priority: params.priority || 'medium' 
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Task Started",
        description: `TARS autonomous task started: ${data.taskId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tars/autonomous/queue-status'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start autonomous task",
        variant: "destructive"
      });
    }
  });

  // Test workflow mutations
  const testWorkflowMutation = useMutation({
    mutationFn: async (params: { workflow: string; clientId: number; binderId?: number }) => {
      const endpoint = `/api/tars/test/${params.workflow}`;
      const body = params.binderId ? { clientId: params.clientId, binderId: params.binderId } : { clientId: params.clientId };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Started",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tars/autonomous/queue-status'] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to start test workflow",
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'requires_human': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'caseware_rollforward': return <FileSpreadsheet className="h-4 w-4" />;
      case 'cpa_checklist': return <CheckCircle className="h-4 w-4" />;
      case 'gl_review': return <BarChart3 className="h-4 w-4" />;
      case 'planning_analytics': return <BarChart3 className="h-4 w-4" />;
      case 'working_papers': return <FileText className="h-4 w-4" />;
      case 'financial_statements': return <FileSpreadsheet className="h-4 w-4" />;
      case 'quality_inspection': return <Eye className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">TARS Autonomous Agent</h1>
          <p className="text-gray-600">AI-powered audit workflows running independently</p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Selection
          </CardTitle>
          <CardDescription>
            Select client for autonomous audit workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value={1}>Demo Client 1</option>
              <option value={2}>Demo Client 2</option>
              <option value={3}>Demo Client 3</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Autonomous Queue Status
            {queueStatus?.isProcessing && <Badge variant="secondary">Processing</Badge>}
          </CardTitle>
          <CardDescription>
            Real-time status of TARS autonomous workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQueue ? (
            <div className="text-center py-4">Loading queue status...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueStatus?.queueLength || 0}</div>
                  <div className="text-sm text-gray-600">Tasks Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {queueStatus?.tasks?.filter(t => t.status === 'completed').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {queueStatus?.tasks?.filter(t => t.status === 'in_progress').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
              
              {queueStatus?.tasks && queueStatus.tasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Current Tasks</h4>
                  {queueStatus.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getTaskIcon(task.type)}
                      <div className="flex-1">
                        <div className="font-medium">{task.type.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="text-sm text-gray-600">Client {task.clientId}</div>
                      </div>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Autonomous Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Autonomous Workflows
          </CardTitle>
          <CardDescription>
            Start autonomous audit workflows for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'caseware-rollforward', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-xs">Caseware Rollforward</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'cpa-checklist', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-xs">CPA Checklist</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'gl-review', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">GL Review</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'planning-analytics', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Planning Analytics</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'working-papers', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Working Papers</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'financial-statements', 
                clientId: selectedClientId 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-xs">Financial Statements</span>
            </Button>

            <Button
              onClick={() => testWorkflowMutation.mutate({ 
                workflow: 'quality-inspection', 
                clientId: selectedClientId,
                binderId: 1 
              })}
              disabled={testWorkflowMutation.isPending}
              className="h-20 flex flex-col gap-2"
            >
              <Eye className="h-5 w-5" />
              <span className="text-xs">Quality Inspection</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Generated Documents
          </CardTitle>
          <CardDescription>
            Documents created by TARS autonomous workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="text-center py-4">Loading documents...</div>
          ) : documentsData?.documents && documentsData.documents.length > 0 ? (
            <div className="space-y-2">
              {documentsData.documents.map((doc) => (
                <div key={doc.fileName} className="flex items-center gap-3 p-3 border rounded-lg">
                  {doc.type === 'excel' && <FileSpreadsheet className="h-5 w-5 text-green-600" />}
                  {doc.type === 'word' && <FileText className="h-5 w-5 text-blue-600" />}
                  {doc.type === 'pdf' && <FileText className="h-5 w-5 text-red-600" />}
                  
                  <div className="flex-1">
                    <div className="font-medium">{doc.fileName}</div>
                    <div className="text-sm text-gray-600">{formatFileSize(doc.size)}</div>
                  </div>
                  
                  <Badge variant="outline">{doc.type.toUpperCase()}</Badge>
                  
                  <Button
                    size="sm"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No documents generated yet. Start an autonomous workflow to create documents.
            </div>
          )}
        </CardContent>
      </Card>

      {/* TARS Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            TARS Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">Online</div>
              <div className="text-sm text-gray-600">Agent Status</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Azure OpenAI</div>
              <div className="text-sm text-gray-600">AI Provider</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">6 Workflows</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Ready</div>
              <div className="text-sm text-gray-600">Queue Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autonomous Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Capabilities</CardTitle>
          <CardDescription>
            What TARS can do without human intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Document Generation</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Excel working papers with formulas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Word CPA checklists and memos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  PDF quality inspection reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Financial statements with proof links
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Audit Analysis</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Caseware file analysis and rollforward
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  General ledger anomaly detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Financial ratio analysis and risk assessment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Quality control and compliance checks
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use TARS Autonomous Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">1. Select Client</h4>
              <p className="text-sm text-gray-600">
                Choose which client's data TARS should work with for the autonomous audit workflows.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Start Workflow</h4>
              <p className="text-sm text-gray-600">
                Click any workflow button to start an autonomous audit process. TARS will work independently.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Monitor Progress</h4>
              <p className="text-sm text-gray-600">
                Watch the queue status update in real-time as TARS completes each step of the audit.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">4. Download Results</h4>
              <p className="text-sm text-gray-600">
                TARS generates real Excel, Word, and PDF files that you can download and use immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}