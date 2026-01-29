import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  BarChart3,
  Zap,
  Target,
  Calendar,
  ArrowRight,
  Plus,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Search,
  Eye,
  PlayCircle,
  StopCircle,
  Shield,
  BookOpen,
  ClipboardCheck,
  Timer,
  TrendingUp,
  Award,
  Briefcase
} from "lucide-react";

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  category: "tax" | "audit" | "bookkeeping" | "consulting" | "compliance";
  steps: WorkflowStep[];
  estimatedDuration: number;
  complexity: "low" | "medium" | "high";
  automationLevel: number;
  status: "active" | "draft" | "archived";
  usageCount: number;
  successRate: number;
  averageCompletionTime: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  assigneeRole: string;
  estimatedHours: number;
  isAutomated: boolean;
  dependencies: number[];
  checklist: string[];
  documents: string[];
  status: "pending" | "in_progress" | "completed" | "blocked";
}

interface ActiveWorkflow {
  id: number;
  templateId: number;
  templateName: string;
  clientId: number;
  clientName: string;
  assignedTo: string[];
  status: "not_started" | "in_progress" | "review" | "completed" | "cancelled";
  progress: number;
  startDate: string;
  dueDate: string;
  actualHours: number;
  estimatedHours: number;
  currentStep: number;
  priority: "low" | "medium" | "high" | "urgent";
  completedSteps: number;
  totalSteps: number;
}

interface QualityMetric {
  workflowId: number;
  workflowName: string;
  completionRate: number;
  errorRate: number;
  clientSatisfaction: number;
  onTimeDelivery: number;
  reworkRequired: boolean;
}

const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["tax", "audit", "bookkeeping", "consulting", "compliance"]),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 day"),
});

export default function WorkflowProcessManagement() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);

  // Queries
  const { data: workflowTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/workflows/templates"]
  });

  const { data: activeWorkflows = [], isLoading: activeLoading } = useQuery({
    queryKey: ["/api/workflows/active"]
  });

  const { data: qualityMetrics = [], isLoading: qualityLoading } = useQuery({
    queryKey: ["/api/workflows/quality-metrics"]
  });

  // Form for creating new workflow templates
  const workflowForm = useForm({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "tax" as const,
      estimatedDuration: 7,
    },
  });

  // Mock data for demonstration
  const mockWorkflowTemplates: WorkflowTemplate[] = [
    {
      id: 1,
      name: "Individual Tax Return Preparation",
      description: "Complete process for preparing individual tax returns including review and filing",
      category: "tax",
      steps: [
        {
          id: 1,
          name: "Client Document Collection",
          description: "Gather all necessary tax documents from client",
          assigneeRole: "Tax Preparer",
          estimatedHours: 2,
          isAutomated: true,
          dependencies: [],
          checklist: ["T4 slips", "T5 slips", "Receipts", "Previous year return"],
          documents: ["client_checklist.pdf", "document_request_email.html"],
          status: "completed"
        },
        {
          id: 2,
          name: "Data Entry and Preparation",
          description: "Enter client information and prepare tax return",
          assigneeRole: "Tax Preparer",
          estimatedHours: 4,
          isAutomated: false,
          dependencies: [1],
          checklist: ["Verify client info", "Enter income data", "Apply deductions", "Calculate taxes"],
          documents: ["tax_return_draft.pdf"],
          status: "in_progress"
        }
      ],
      estimatedDuration: 5,
      complexity: "medium",
      automationLevel: 60,
      status: "active",
      usageCount: 127,
      successRate: 96.5,
      averageCompletionTime: 4.2,
      createdAt: "2024-01-15",
      updatedAt: "2024-12-01"
    },
    {
      id: 2,
      name: "Corporate Audit Process",
      description: "Comprehensive audit workflow for corporate clients",
      category: "audit",
      steps: [
        {
          id: 3,
          name: "Planning and Risk Assessment",
          description: "Initial planning and risk assessment phase",
          assigneeRole: "Audit Manager",
          estimatedHours: 8,
          isAutomated: false,
          dependencies: [],
          checklist: ["Risk assessment", "Materiality calculation", "Audit plan", "Team assignment"],
          documents: ["audit_plan.pdf", "risk_assessment.xlsx"],
          status: "pending"
        }
      ],
      estimatedDuration: 30,
      complexity: "high",
      automationLevel: 25,
      status: "active",
      usageCount: 23,
      successRate: 91.3,
      averageCompletionTime: 28.5,
      createdAt: "2024-02-10",
      updatedAt: "2024-11-20"
    },
    {
      id: 3,
      name: "Monthly Bookkeeping Reconciliation",
      description: "Standard monthly bookkeeping and reconciliation process",
      category: "bookkeeping",
      steps: [],
      estimatedDuration: 3,
      complexity: "low",
      automationLevel: 80,
      status: "active",
      usageCount: 89,
      successRate: 98.9,
      averageCompletionTime: 2.8,
      createdAt: "2024-01-20",
      updatedAt: "2024-12-05"
    }
  ];

  const mockActiveWorkflows: ActiveWorkflow[] = [
    {
      id: 101,
      templateId: 1,
      templateName: "Individual Tax Return Preparation",
      clientId: 1001,
      clientName: "ACME Corporation",
      assignedTo: ["John Smith", "Sarah Johnson"],
      status: "in_progress",
      progress: 65,
      startDate: "2025-01-10",
      dueDate: "2025-01-20",
      actualHours: 8.5,
      estimatedHours: 12,
      currentStep: 2,
      priority: "high",
      completedSteps: 2,
      totalSteps: 4
    },
    {
      id: 102,
      templateId: 2,
      templateName: "Corporate Audit Process",
      clientId: 1002,
      clientName: "Tech Solutions Ltd",
      assignedTo: ["Michael Brown", "Lisa Wong"],
      status: "review",
      progress: 90,
      startDate: "2024-12-01",
      dueDate: "2025-01-15",
      actualHours: 45,
      estimatedHours: 48,
      currentStep: 5,
      priority: "urgent",
      completedSteps: 5,
      totalSteps: 6
    }
  ];

  const mockQualityMetrics: QualityMetric[] = [
    {
      workflowId: 101,
      workflowName: "Individual Tax Return Preparation",
      completionRate: 96.5,
      errorRate: 2.1,
      clientSatisfaction: 4.7,
      onTimeDelivery: 94.2,
      reworkRequired: false
    },
    {
      workflowId: 102,
      workflowName: "Corporate Audit Process",
      workflowName: "Corporate Audit Process",
      completionRate: 91.3,
      errorRate: 4.2,
      clientSatisfaction: 4.5,
      onTimeDelivery: 89.1,
      reworkRequired: true
    }
  ];

  // Filter workflows based on category and search term
  const filteredTemplates = mockWorkflowTemplates.filter(template => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call - replace with actual API
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates"] });
      setShowNewWorkflowDialog(false);
      workflowForm.reset();
      toast({ title: "Success", description: "Workflow template created successfully" });
    },
  });

  const handleCreateWorkflow = (values: any) => {
    createWorkflowMutation.mutate(values);
  };

  if (templatesLoading || activeLoading || qualityLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Workflow & Process Management</h2>
          <p className="text-gray-600">Streamline operations with automated workflows and quality control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-import-workflows">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowNewWorkflowDialog(true)} data-testid="button-new-workflow">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-active-workflows">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Active Workflows</div>
              <PlayCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockActiveWorkflows.length}</div>
            <div className="text-sm text-blue-600">Currently running</div>
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Completion Rate</div>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">94.2%</div>
            <div className="text-sm text-green-600">+2.1% this month</div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-cycle-time">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg Cycle Time</div>
              <Timer className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">8.4 days</div>
            <div className="text-sm text-orange-600">-0.8 days improved</div>
          </CardContent>
        </Card>

        <Card data-testid="card-automation-rate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Automation Rate</div>
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">67%</div>
            <div className="text-sm text-purple-600">+5% automated tasks</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-workflow">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">Automation</TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">Quality</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Workflow Templates Tab */}
        <TabsContent value="templates" className="space-y-6" data-testid="content-templates">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search workflow templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-workflows"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48" data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workflow Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`workflow-template-${template.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Badge variant={template.status === "active" ? "default" : "secondary"}>
                      {template.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Category and Complexity */}
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Complexity:</span>
                        <Badge variant={
                          template.complexity === "high" ? "destructive" :
                          template.complexity === "medium" ? "secondary" : "default"
                        }>
                          {template.complexity}
                        </Badge>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{template.usageCount}</div>
                        <div className="text-gray-500">Times Used</div>
                      </div>
                      <div>
                        <div className="font-medium">{template.successRate}%</div>
                        <div className="text-gray-500">Success Rate</div>
                      </div>
                      <div>
                        <div className="font-medium">{template.estimatedDuration}d</div>
                        <div className="text-gray-500">Est. Duration</div>
                      </div>
                      <div>
                        <div className="font-medium">{template.automationLevel}%</div>
                        <div className="text-gray-500">Automated</div>
                      </div>
                    </div>

                    {/* Automation Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Automation Level</span>
                        <span className="font-medium">{template.automationLevel}%</span>
                      </div>
                      <Progress value={template.automationLevel} className="h-2" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Workflows Tab */}
        <TabsContent value="active" className="space-y-6" data-testid="content-active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Active Workflows
              </CardTitle>
              <CardDescription>Monitor and manage currently running workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActiveWorkflows.map((workflow) => (
                  <Card key={workflow.id} className={`p-4 ${
                    workflow.priority === "urgent" ? "border-red-200 bg-red-50" :
                    workflow.priority === "high" ? "border-orange-200 bg-orange-50" : ""
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{workflow.templateName}</h4>
                          <Badge variant={
                            workflow.status === "in_progress" ? "default" :
                            workflow.status === "review" ? "secondary" :
                            workflow.status === "completed" ? "default" : "outline"
                          }>
                            {workflow.status.replace("_", " ")}
                          </Badge>
                          <Badge variant={
                            workflow.priority === "urgent" ? "destructive" :
                            workflow.priority === "high" ? "secondary" : "outline"
                          }>
                            {workflow.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {workflow.clientName} • Assigned to: {workflow.assignedTo.join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{workflow.progress}%</div>
                        <div className="text-sm text-gray-500">Complete</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Step {workflow.currentStep} of {workflow.totalSteps}</span>
                          <span>{workflow.completedSteps}/{workflow.totalSteps} steps completed</span>
                        </div>
                        <Progress value={workflow.progress} className="h-3" />
                      </div>

                      {/* Timeline and Hours */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Started</div>
                          <div className="text-gray-500">{new Date(workflow.startDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Due Date</div>
                          <div className={`${
                            new Date(workflow.dueDate) < new Date() ? "text-red-600" : "text-gray-500"
                          }`}>
                            {new Date(workflow.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Hours</div>
                          <div className="text-gray-500">{workflow.actualHours}/{workflow.estimatedHours}h</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3 mr-1" />
                          Update
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Comment
                        </Button>
                        {workflow.status === "in_progress" && (
                          <Button size="sm" variant="outline">
                            <StopCircle className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6" data-testid="content-automation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Automation Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      name: "Auto-assign Tax Returns",
                      description: "Automatically assign individual tax returns to available preparers",
                      trigger: "New tax return uploaded",
                      action: "Assign to preparer with lowest workload",
                      status: "active"
                    },
                    {
                      name: "Deadline Reminders",
                      description: "Send automated reminders 3 days before workflow deadlines",
                      trigger: "3 days before due date",
                      action: "Send email reminder to assignee",
                      status: "active"
                    },
                    {
                      name: "Quality Check Trigger",
                      description: "Automatically trigger quality review for high-value clients",
                      trigger: "Client value > $50,000",
                      action: "Add quality review step",
                      status: "active"
                    }
                  ].map((rule, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <Badge variant={rule.status === "active" ? "default" : "secondary"}>
                          {rule.status}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Trigger:</span> {rule.trigger}</div>
                        <div><span className="font-medium">Action:</span> {rule.action}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Automation Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">67%</div>
                    <div className="text-sm text-gray-600">Overall Automation Rate</div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { process: "Document Collection", automation: 85, hours_saved: 24 },
                      { process: "Task Assignment", automation: 92, hours_saved: 18 },
                      { process: "Status Updates", automation: 78, hours_saved: 12 },
                      { process: "Deadline Monitoring", automation: 95, hours_saved: 30 },
                      { process: "Quality Checks", automation: 45, hours_saved: 8 }
                    ].map((process, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{process.process}</span>
                          <span className="text-gray-600">{process.hours_saved}h saved/month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={process.automation} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{process.automation}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quality Control Tab */}
        <TabsContent value="quality" className="space-y-6" data-testid="content-quality">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Quality Control Dashboard
              </CardTitle>
              <CardDescription>Monitor quality metrics and compliance across all workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quality Metrics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">96.2%</div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">2.8%</div>
                    <div className="text-sm text-gray-600">Error Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">1.2%</div>
                    <div className="text-sm text-gray-600">Rework Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">4.8/5</div>
                    <div className="text-sm text-gray-600">Client Rating</div>
                  </div>
                </div>

                {/* Quality Metrics by Workflow */}
                <div className="space-y-4">
                  <h4 className="font-medium">Quality Metrics by Workflow</h4>
                  {mockQualityMetrics.map((metric) => (
                    <Card key={metric.workflowId} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium">{metric.workflowName}</h5>
                        {metric.reworkRequired && (
                          <Badge variant="destructive">Rework Required</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Completion Rate</div>
                          <div className="text-green-600">{metric.completionRate}%</div>
                        </div>
                        <div>
                          <div className="font-medium">Error Rate</div>
                          <div className={metric.errorRate > 5 ? "text-red-600" : "text-orange-600"}>
                            {metric.errorRate}%
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Client Satisfaction</div>
                          <div className="text-blue-600">{metric.clientSatisfaction}/5</div>
                        </div>
                        <div>
                          <div className="font-medium">On-Time Delivery</div>
                          <div className="text-purple-600">{metric.onTimeDelivery}%</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6" data-testid="content-analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">Overall Efficiency: 87.3%</div>
                    <div className="text-sm text-gray-600">+5.2% vs last quarter</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { metric: "Cycle Time Reduction", value: "15%", trend: "up" },
                      { metric: "First-Time Quality", value: "92%", trend: "up" },
                      { metric: "Resource Utilization", value: "84%", trend: "stable" },
                      { metric: "Customer Satisfaction", value: "4.6/5", trend: "up" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{item.metric}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.value}</span>
                          {item.trend === "up" ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Process Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Optimization Opportunities</h4>
                    <div className="space-y-3">
                      {[
                        {
                          process: "Corporate Tax Prep",
                          opportunity: "Reduce review cycles",
                          impact: "Save 3.2 days",
                          difficulty: "Medium"
                        },
                        {
                          process: "Audit Documentation",
                          opportunity: "Automate data entry",
                          impact: "Save 12 hours",
                          difficulty: "High"
                        },
                        {
                          process: "Client Communication",
                          opportunity: "Template automation",
                          impact: "Save 8 hours/week",
                          difficulty: "Low"
                        }
                      ].map((opp, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-sm">{opp.process}</h5>
                            <Badge variant={
                              opp.difficulty === "Low" ? "default" :
                              opp.difficulty === "Medium" ? "secondary" : "destructive"
                            } className="text-xs">
                              {opp.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{opp.opportunity}</p>
                          <p className="text-sm font-medium text-green-600">{opp.impact}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Workflow Dialog */}
      <Dialog open={showNewWorkflowDialog} onOpenChange={setShowNewWorkflowDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Workflow Template</DialogTitle>
            <DialogDescription>
              Create a new workflow template that can be reused across multiple projects
            </DialogDescription>
          </DialogHeader>
          <Form {...workflowForm}>
            <form onSubmit={workflowForm.handleSubmit(handleCreateWorkflow)} className="space-y-4">
              <FormField
                control={workflowForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter workflow template name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={workflowForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the workflow purpose and steps..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={workflowForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tax">Tax Preparation</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                        <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={workflowForm.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="7"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewWorkflowDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createWorkflowMutation.isPending}>
                  {createWorkflowMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}