import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TrialBalanceSection } from "@/components/binder/TrialBalanceSection";
import { CashSection } from "@/components/binder/CashSection";
import { AccountsReceivableSection } from "@/components/binder/AccountsReceivableSection";
import { InventorySection } from "@/components/binder/InventorySection";
import { SectionManager } from "@/components/binder/SectionManager";
import { CasewareImport } from "@/components/binder/CasewareImport";
import { apiConfig } from "@/lib/api-config";
// import { TarsAutonomousWidget } from "@/components/binder/TarsAutonomousWidget";
import {
  FileText, 
  Calculator, 
  CheckSquare, 
  ClipboardCheck, 
  TrendingUp,
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  Download,
  Upload,
  Save,
  AlertCircle,
  CheckCircle2,
  Bot,
  Play,
  MessageSquare,
  BarChart3,
  Database,
  BrainCircuit,
  Zap,
  FileDown
} from "lucide-react";

interface WorkpaperSection {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'review' | 'completed';
  workpapers: Array<{
    id: string;
    name: string;
    type: 'schedule' | 'analysis' | 'confirmation' | 'procedure';
    status: 'not_started' | 'in_progress' | 'review' | 'completed';
    preparer?: string;
    reviewer?: string;
  }>;
}

const auditSections: WorkpaperSection[] = [
  {
    id: 'trial-balance',
    name: 'Trial Balance & Books Integration',
    description: 'Real-time trial balance analysis and Books module integration',
    status: 'in_progress',
    workpapers: [
      { id: 'tb-1', name: 'Trial Balance Review', type: 'schedule', status: 'in_progress', preparer: 'TARS AI' },
      { id: 'tb-2', name: 'Account Balance Analysis', type: 'analysis', status: 'not_started' },
      { id: 'tb-3', name: 'Chart of Accounts Validation', type: 'procedure', status: 'not_started' },
      { id: 'tb-4', name: 'TARS Autonomous Analysis', type: 'analysis', status: 'not_started', preparer: 'TARS AI' }
    ]
  },
  {
    id: 'cash',
    name: 'Cash & Cash Equivalents',
    description: 'Bank confirmations, reconciliations, and cash procedures',
    status: 'completed',
    workpapers: [
      { id: 'c-1', name: 'Bank Confirmations', type: 'confirmation', status: 'completed', preparer: 'J. Smith', reviewer: 'M. Jones' },
      { id: 'c-2', name: 'Bank Reconciliations', type: 'schedule', status: 'completed', preparer: 'J. Smith', reviewer: 'M. Jones' },
      { id: 'c-3', name: 'Cash Cutoff Testing', type: 'procedure', status: 'review', preparer: 'J. Smith' }
    ]
  },
  {
    id: 'receivables',
    name: 'Accounts Receivable',
    description: 'Receivables confirmations, aging analysis, and collectibility assessment',
    status: 'in_progress',
    workpapers: [
      { id: 'r-1', name: 'AR Confirmations', type: 'confirmation', status: 'in_progress', preparer: 'A. Wilson' },
      { id: 'r-2', name: 'Aging Analysis', type: 'analysis', status: 'completed', preparer: 'A. Wilson', reviewer: 'M. Jones' },
      { id: 'r-3', name: 'Allowance Review', type: 'analysis', status: 'not_started' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventory observations, costing, and valuation procedures',
    status: 'not_started',
    workpapers: [
      { id: 'i-1', name: 'Physical Count Observation', type: 'procedure', status: 'not_started' },
      { id: 'i-2', name: 'Costing Analysis', type: 'analysis', status: 'not_started' },
      { id: 'i-3', name: 'NRV Testing', type: 'procedure', status: 'not_started' }
    ]
  },
  {
    id: 'ppe',
    name: 'Property, Plant & Equipment',
    description: 'Fixed asset additions, disposals, and depreciation testing',
    status: 'review',
    workpapers: [
      { id: 'p-1', name: 'Fixed Asset Roll-forward', type: 'schedule', status: 'review', preparer: 'K. Brown' },
      { id: 'p-2', name: 'Depreciation Testing', type: 'analysis', status: 'completed', preparer: 'K. Brown', reviewer: 'M. Jones' }
    ]
  }
];

export default function AuditBinder() {
  const params = useParams();
  const binderId = params.binderId ? parseInt(params.binderId) : null;
  const [activeSection, setActiveSection] = useState('overview');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    role: string; 
    content: string; 
    timestamp: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    };
  }>>([]);
  const [sessionStats, setSessionStats] = useState<{
    totalTokens: number;
    totalCost: number;
    messageCount: number;
    sessionDuration: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // TARS queries and mutations
  const { data: tarsStatus } = useQuery({
    queryKey: ['/api/tars/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  }) as { data?: { status: string; activeSessions?: number; services?: any[] } };
  
  const tarsTestMutation = useMutation({
    mutationFn: () => apiRequest('GET', '/api/tars/test'),
    onSuccess: (data: any) => {
      toast({
        title: "TARS Test Complete",
        description: `${data?.results?.length || 0} tests passed successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "TARS Test Failed",
        description: error.message || "Failed to run TARS tests",
        variant: "destructive",
      });
    },
  });
  
  const tarsChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/tars/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      return response.json();
    },
    onSuccess: (data: any, variables) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('TARS Chat Success:', data);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: variables, timestamp },
        { 
          role: 'assistant', 
          content: data.response, 
          timestamp, 
          usage: data.usage 
        }
      ]);
      if (data.sessionStats) {
        setSessionStats(data.sessionStats);
      }
      setChatMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "TARS Chat Error",
        description: error.message || "Failed to send message to TARS",
        variant: "destructive",
      });
    },
  });
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      tarsChatMutation.mutate(chatMessage.trim());
    }
  };

  // Fetch binder data
  const { data: binderData, isLoading: binderLoading } = useQuery({
    queryKey: ["/api/binders", binderId],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl(`/api/binders/${binderId}`), { signal })
        .then(res => res.json()),
    enabled: !!binderId,
  });

  // Fetch clients for client name lookup
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  if (binderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!binderData) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Binder Not Found</h2>
          <p className="text-gray-600 mb-4">The requested audit binder could not be found.</p>
          <Link to="/binders">
            <Button>Back to Binders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const clientName = (clients as any[])?.find((c: any) => c.id === binderData.clientId)?.name || "Unknown Client";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'review': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/binders">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Binders
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{binderData.name}</h1>
                <p className="text-lg text-gray-600">{clientName} - {binderData.fiscalYearEnd}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(binderData.status)} variant="outline">
                {getStatusIcon(binderData.status)}
                <span className="ml-1">{binderData.status.replace(/_/g, ' ').toUpperCase()}</span>
              </Badge>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveSection('overview')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                  activeSection === 'overview' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Overview
              </button>
              
              {auditSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                    activeSection === section.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">{section.name}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(section.status)}`}>
                      {getStatusIcon(section.status)}
                      {section.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </button>
              ))}
              
              <button
                onClick={() => setActiveSection('financials')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                  activeSection === 'financials' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <Calculator className="w-4 h-4" />
                Financial Statements
              </button>
              
              <button
                onClick={() => setActiveSection('reviews')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                  activeSection === 'reviews' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                Review Notes
              </button>
              
              
              <div className="my-2 border-t border-gray-200"></div>
              
              <button
                onClick={() => setActiveSection('section-manager')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                  activeSection === 'section-manager' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                Section Manager
              </button>
              
              <button
                onClick={() => setActiveSection('caseware')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                  activeSection === 'caseware' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                }`}
              >
                <Database className="w-4 h-4" />
                Import Caseware
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Completion</span>
                        <span className="text-sm font-medium">{binderData.completionPercentage || 0}%</span>
                      </div>
                      <Progress value={binderData.completionPercentage || 0} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{binderData.engagementType}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Industry:</span>
                      <span className="ml-2 font-medium">{binderData.industry || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Year End:</span>
                      <span className="ml-2 font-medium">{binderData.fiscalYearEnd}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      New Workpaper
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Audit Sections Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auditSections.map((section) => (
                      <div key={section.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{section.name}</h4>
                          <Badge className={getStatusColor(section.status)} variant="outline">
                            {getStatusIcon(section.status)}
                            <span className="ml-1">{section.status.replace(/_/g, ' ')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                        <div className="text-xs text-gray-500">
                          {section.workpapers.length} workpapers • {section.workpapers.filter(w => w.status === 'completed').length} completed
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'cash' && (
            <div className="space-y-6">
              {binderData?.clientId && (
                <CashSection clientId={binderData.clientId} />
              )}
            </div>
          )}

          {activeSection === 'receivables' && (
            <div className="space-y-6">
              {binderData?.clientId && (
                <AccountsReceivableSection clientId={binderData.clientId} binderId={binderId!} />
              )}
            </div>
          )}

          {activeSection === 'inventory' && (
            <div className="space-y-6">
              {binderData?.clientId && (
                <InventorySection clientId={binderData.clientId} binderId={binderId!} sectionId="inventory" />
              )}
            </div>
          )}

          {activeSection === 'trial-balance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    Trial Balance & Books Integration
                  </h2>
                  <p className="text-gray-600">Real-time trial balance analysis and Books module integration for audit work</p>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Workpaper
                </Button>
              </div>

              {/* Trial Balance Section - Complete Integration */}
              {binderData?.clientId && (
                <TrialBalanceSection clientId={binderData.clientId} binderId={binderId!} />
              )}

            </div>
          )}

          {activeSection === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Financial Statement Preparation</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Statement Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 h-16 flex-col"
                      onClick={() => {
                        tarsChatMutation.mutate(`Analyze the trial balance for client ${binderData?.clientId} and identify any balance discrepancies or unusual account movements that require audit attention.`);
                      }}
                    >
                      <TrendingUp className="w-6 h-6" />
                      <span className="text-sm">Analyze Trial Balance</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 h-16 flex-col"
                      onClick={() => {
                        tarsChatMutation.mutate(`Generate audit leadsheets for all balance sheet accounts based on the current trial balance for client ${binderData?.clientId}.`);
                      }}
                    >
                      <FileText className="w-6 h-6" />
                      <span className="text-sm">Generate Leadsheets</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 h-16 flex-col"
                      onClick={() => {
                        tarsChatMutation.mutate(`Review the chart of accounts structure for client ${binderData?.clientId} and suggest any improvements or identify missing accounts for proper financial reporting.`);
                      }}
                    >
                      <Calculator className="w-6 h-6" />
                      <span className="text-sm">Review Chart of Accounts</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Standard Workpapers */}
              <div className="space-y-4">
                {auditSections.find(s => s.id === 'trial-balance')?.workpapers.map((workpaper) => (
                  <Card key={workpaper.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium">{workpaper.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>Type: {workpaper.type}</span>
                              {workpaper.preparer && <span>• Preparer: {workpaper.preparer}</span>}
                              {workpaper.reviewer && <span>• Reviewer: {workpaper.reviewer}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(workpaper.status)} variant="outline">
                            {getStatusIcon(workpaper.status)}
                            <span className="ml-1">{workpaper.status.replace(/_/g, ' ')}</span>
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {auditSections.find(s => s.id === activeSection && s.id !== 'trial-balance' && s.id !== 'cash') && (
            <div className="space-y-6">
              {(() => {
                const section = auditSections.find(s => s.id === activeSection)!;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{section.name}</h2>
                        <p className="text-gray-600">{section.description}</p>
                      </div>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Workpaper
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {section.workpapers.map((workpaper) => (
                        <Card key={workpaper.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <h4 className="font-medium">{workpaper.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>Type: {workpaper.type}</span>
                                    {workpaper.preparer && <span>• Preparer: {workpaper.preparer}</span>}
                                    {workpaper.reviewer && <span>• Reviewer: {workpaper.reviewer}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={getStatusColor(workpaper.status)} variant="outline">
                                  {getStatusIcon(workpaper.status)}
                                  <span className="ml-1">{workpaper.status.replace(/_/g, ' ')}</span>
                                </Badge>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeSection === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Financial Statements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Sheet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">Review and finalize balance sheet presentation.</p>
                    <Button className="w-full">Open Balance Sheet</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Income Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">Review and finalize income statement presentation.</p>
                    <Button className="w-full">Open Income Statement</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'reviews' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Review Notes</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Manager Review Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    placeholder="Add manager review notes and points requiring attention..."
                    className="min-h-[200px]"
                  />
                  <div className="flex justify-end mt-4">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'section-manager' && (
            <SectionManager binderId={binderData.id} />
          )}

          {activeSection === 'caseware' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Database className="w-8 h-8 text-purple-600" />
                    Caseware Import
                  </h2>
                  <p className="text-gray-600">Import audit sections and working papers from Caseware files</p>
                </div>
              </div>

              <CasewareImport 
                binderId={binderData.id} 
                onImportComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/binders', binderId] });
                  toast({
                    title: "Import Complete",
                    description: "Caseware file imported successfully with trial balance integration.",
                  });
                }}
              />
            </div>
          )}

          {activeSection === 'tars' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Bot className="w-8 h-8 text-blue-600" />
                    TARS AI System
                  </h2>
                  <p className="text-gray-600">AI-powered autonomous audit assistance</p>
                </div>
              </div>

              <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="status">System Status</TabsTrigger>
                  <TabsTrigger value="tests">Test Suite</TabsTrigger>
                </TabsList>
                
                <TabsContent value="status" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>TARS Service Status</CardTitle>
                      <CardDescription>
                        Real-time status of all TARS AI services
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tarsStatus?.services && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Service Status:</h4>
                          {Object.entries(tarsStatus.services).map(([service, status]) => (
                            <div key={service} className="flex items-center justify-between p-2 border rounded">
                              <span className="capitalize">{service.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <Badge variant={status ? 'default' : 'destructive'}>
                                {status ? 'Online' : 'Offline'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="tests" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>TARS Test Suite</CardTitle>
                      <CardDescription>
                        Comprehensive tests to verify TARS AI functionality
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-center">
                        <Button
                          onClick={() => tarsTestMutation.mutate()}
                          disabled={tarsTestMutation.isPending}
                          size="lg"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          {tarsTestMutation.isPending ? 'Running Tests...' : 'Run Full Test Suite'}
                        </Button>
                      </div>
                      
                      {tarsTestMutation.data && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Test Results:</h4>
                          {tarsTestMutation.data.results?.map((result: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded">
                              <span>{result.test}</span>
                              <div className="flex items-center gap-2">
                                {result.success ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-red-600" />
                                )}
                                <Badge variant={result.success ? 'default' : 'destructive'}>
                                  {result.success ? 'Pass' : 'Fail'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}