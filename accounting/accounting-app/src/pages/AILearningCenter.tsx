
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Upload, 
  Database, 
  TrendingUp, 
  FileText, 
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  Target,
  BookOpen,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";

interface AIKnowledgeBase {
  id: number;
  agentType: string;
  clientId?: number;
  datasetType: string;
  recordCount: number;
  accuracy: number;
  lastTrained: string;
  status: 'learning' | 'active' | 'needs_update';
}

interface TrainingDataset {
  id: number;
  name: string;
  type: string;
  format: string;
  size: number;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'training' | 'completed';
  agentTypes: string[];
}

interface LearningProgress {
  agentType: string;
  totalSamples: number;
  processedSamples: number;
  accuracy: number;
  improvementRate: number;
  lastUpdate: string;
}

export default function AILearningCenter() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<string>("all");

  // Fetch AI knowledge bases
  const { data: knowledgeBases, isLoading: loadingKnowledge } = useQuery<AIKnowledgeBase[]>({
    queryKey: ["/api/ai-learning/knowledge-bases"],
    enabled: true
  });

  // Fetch training datasets
  const { data: datasets, isLoading: loadingDatasets } = useQuery<TrainingDataset[]>({
    queryKey: ["/api/ai-learning/datasets"],
    enabled: true
  });

  // Fetch learning progress
  const { data: learningProgress, isLoading: loadingProgress } = useQuery<LearningProgress[]>({
    queryKey: ["/api/ai-learning/progress"],
    enabled: true
  });

  // Upload training data mutation
  const uploadDataMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(apiConfig.buildUrl("/api/ai-learning/upload"), {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-learning/datasets"] });
      toast({
        title: "Upload Successful",
        description: "Training data uploaded and processing started."
      });
      setUploadingFile(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload training data",
        variant: "destructive"
      });
      setUploadingFile(false);
    }
  });

  // Start training mutation
  const startTrainingMutation = useMutation({
    mutationFn: async (config: { datasetId: number; agentType: string; clientId?: number }) => {
      const response = await apiRequest("POST", "/api/ai-learning/train", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-learning/progress"] });
      toast({
        title: "Training Started",
        description: "AI agent training initiated successfully."
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('datasetType', 'transactions'); // Default type
    formData.append('agentType', selectedAgentType);

    setUploadingFile(true);
    uploadDataMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'learning': return 'bg-blue-500';
      case 'needs_update': return 'bg-orange-500';
      case 'processing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'training': return 'bg-purple-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const aiAgents = [
    { 
      key: 'milton', 
      name: 'Milton - Unified AI Bookkeeper', 
      icon: Brain,
      description: 'Consolidates transaction categorization, bank reconciliation, and financial analysis',
      capabilities: ['Transaction Categorization', 'Bank Reconciliation', 'Financial Analysis', 'Compliance Validation']
    },
    { 
      key: 'connie', 
      name: 'Connie - CRM Assistant', 
      icon: Lightbulb,
      description: 'Client relationship management and communication automation',
      capabilities: ['Client Communication', 'Task Management', 'Document Generation']
    }
  ];

  if (loadingKnowledge || loadingDatasets || loadingProgress) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Learning Center
          </h1>
          <p className="text-muted-foreground">
            Train your AI agents and monitor their learning progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Documentation
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Learning Overview</TabsTrigger>
          <TabsTrigger value="knowledge">AI Knowledge Base</TabsTrigger>
          <TabsTrigger value="training">Training Center</TabsTrigger>
          <TabsTrigger value="datasets">Data Management</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Learning Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active AI Agents</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Sessions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{learningProgress?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Currently training</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Training Datasets</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datasets?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Ready for training</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {knowledgeBases ? Math.round(knowledgeBases.reduce((sum, kb) => sum + kb.accuracy, 0) / knowledgeBases.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Across all agents</p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Learning Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Learning Progress
              </CardTitle>
              <CardDescription>Real-time learning status for each AI agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiAgents.map((agent) => {
                  const progress = learningProgress?.find(p => p.agentType === agent.key);
                  const Icon = agent.icon;
                  const progressPercent = progress ? (progress.processedSamples / progress.totalSamples) * 100 : 0;
                  
                  return (
                    <div key={agent.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {progress ? `${progress.processedSamples}/${progress.totalSamples} samples` : 'No active training'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32">
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                        <Badge variant={progress ? "default" : "secondary"}>
                          {progress ? `${progress.accuracy}% accuracy` : 'Idle'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                AI Knowledge Bases
              </CardTitle>
              <CardDescription>Current knowledge stored for each AI agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {knowledgeBases?.map((kb) => (
                  <div key={kb.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(kb.status)}`} />
                      <div>
                        <p className="font-medium capitalize">{kb.agentType.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {kb.datasetType} • {kb.recordCount.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{kb.accuracy}% accuracy</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(kb.lastTrained).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={kb.status === 'active' ? 'default' : 'secondary'}>
                        {kb.status}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No knowledge bases found. Start by uploading training data.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Training Center
              </CardTitle>
              <CardDescription>Upload data and train your AI agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">Upload Training Data</p>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: CSV, Excel (.xlsx, .xls), JSON, PDF, TXT
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="agent-select">Target Agent:</Label>
                      <Select value={selectedAgentType} onValueChange={setSelectedAgentType}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Agents</SelectItem>
                          {aiAgents.map(agent => (
                            <SelectItem key={agent.key} value={agent.key}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json,.pdf,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="max-w-sm mx-auto"
                    />
                    
                    {uploadingFile && (
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing upload...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Training Queue */}
              <div>
                <h3 className="text-lg font-medium mb-4">Active Training Sessions</h3>
                <div className="space-y-3">
                  {learningProgress?.filter(p => p.processedSamples < p.totalSamples).map((progress, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <div>
                          <p className="font-medium capitalize">{progress.agentType.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            Processing {progress.processedSamples}/{progress.totalSamples} samples
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Progress 
                          value={(progress.processedSamples / progress.totalSamples) * 100} 
                          className="w-32" 
                        />
                        <Badge variant="secondary">{progress.accuracy}% accuracy</Badge>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-6">
                      No active training sessions. Upload data to start training.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Training Datasets
              </CardTitle>
              <CardDescription>Manage your uploaded training data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {datasets?.map((dataset) => (
                  <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{dataset.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dataset.type} • {dataset.format.toUpperCase()} • {(dataset.size / 1024).toFixed(1)}KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex flex-wrap gap-1">
                          {dataset.agentTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(dataset.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={dataset.status === 'completed' ? 'default' : 'secondary'}>
                        {dataset.status}
                      </Badge>
                      {dataset.status === 'ready' && (
                        <Button size="sm" onClick={() => startTrainingMutation.mutate({ 
                          datasetId: dataset.id, 
                          agentType: dataset.agentTypes[0] 
                        })}>
                          Start Training
                        </Button>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    No datasets uploaded yet. Use the Training Center to upload your first dataset.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Learning Insights & Analytics
              </CardTitle>
              <CardDescription>Performance metrics and improvement recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Accuracy Trends</h3>
                  {learningProgress?.map((progress) => (
                    <div key={progress.agentType} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{progress.agentType.replace('_', ' ')}</span>
                        <span>{progress.accuracy}%</span>
                      </div>
                      <Progress value={progress.accuracy} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {progress.improvementRate > 0 ? '+' : ''}{progress.improvementRate}% improvement
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Recommendations</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Upload More Transaction Data</p>
                          <p className="text-xs text-muted-foreground">
                            Categorizer accuracy could improve with more diverse transaction examples
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Milton Performance Excellent</p>
                          <p className="text-xs text-muted-foreground">
                            No additional training needed at this time
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Update Compliance Rules</p>
                          <p className="text-xs text-muted-foreground">
                            PEG Validator needs updated CRA guidelines for 2024
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
