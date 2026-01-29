import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Calendar, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  DollarSign,
  Target,
  Mail,
  Phone,
  Building,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Bot,
  Briefcase,
  FileText,
  PieChart,
  Settings,
  Activity,
  CheckCircle2
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, isToday, isTomorrow } from "date-fns";

// Tars AI Chat Component
function TarsAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      sender: "tars",
      message: "Hello! I'm Tars, your AI office manager. I can help you manage clients, schedule tasks, track workflows, and analyze practice performance. What would you like me to help you with today?",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [showNewTimeEntryDialog, setShowNewTimeEntryDialog] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      message: message.trim(),
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage("");
    setIsTyping(true);

    try {
      const response = await apiRequest("POST", "/api/tars/chat", {
        message: userMessage.message,
        context: "practice_management"
      });
      const data = await response.json();

      const tarsResponse = {
        id: Date.now() + 1,
        sender: "tars",
        message: data.response,
        timestamp: new Date(),
        actions: data.actions || []
      };

      setChatHistory(prev => [...prev, tarsResponse]);
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        sender: "tars",
        message: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Tars Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-96 bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          <div className="p-4 border-b bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <span className="font-semibold">Tars AI Office Manager</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    chat.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{chat.message}</p>
                  {chat.actions && chat.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {chat.actions.map((action, index) => (
                        <Button key={index} size="sm" variant="outline" className="text-xs">
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {(() => {
                      try {
                        const date = new Date(chat.timestamp);
                        if (isNaN(date.getTime())) return "Invalid time";
                        return format(date, "HH:mm");
                      } catch (error) {
                        return "Invalid time";
                      }
                    })()}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Tars anything..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!message.trim() || isTyping}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Task form schema
const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
  assignedToId: z.number().optional(),
  clientId: z.number().optional(),
  category: z.string().min(1, "Category is required"),
});

// Client form schema
const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  fiscalYearEnd: z.string().min(1, "Fiscal year end is required"),
  status: z.enum(["pending", "active", "inactive", "suspended"]).default("active"),
  notes: z.string().optional(),
});

export default function Pages() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [showNewTimeEntryDialog, setShowNewTimeEntryDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showNewProspectDialog, setShowNewProspectDialog] = useState(false);
  const [showClientBillingDialog, setShowClientBillingDialog] = useState(false);
  const [selectedClientForBilling, setSelectedClientForBilling] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedClientForEmail, setSelectedClientForEmail] = useState(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [communicationGroups, setCommunicationGroups] = useState([
    { id: 1, name: "All Clients", members: 15, lastActivity: "2 hours ago" },
    { id: 2, name: "Q4 2024 Clients", members: 8, lastActivity: "1 day ago" },
    { id: 3, name: "Monthly Reviews", members: 12, lastActivity: "3 days ago" }
  ]);
  const [messages, setMessages] = useState([
    { id: 1, from: "John Smith", subject: "Tax document inquiry", time: "10:30 AM", unread: true, clientId: 1 },
    { id: 2, from: "ACME Corp", subject: "Q3 Financial review", time: "Yesterday", unread: false, clientId: 2 },
    { id: 3, from: "Sarah Johnson", subject: "Invoice question", time: "2 days ago", unread: true, clientId: 3 }
  ]);

  // Fetch real data from APIs
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/clients", { signal })
        .then(res => res.json()),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/tasks", { signal })
        .then(res => res.json()),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["/api/time-entries"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/time-entries", { signal })
        .then(res => res.json()),
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["/api/workflows"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/workflows", { signal })
        .then(res => res.json()),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl("/api/users", { signal })
        .then(res => res.json()),
  });

  // Calculate real metrics from data
  const practiceMetrics = {
    totalClients: clients.length,
    activeWorkflows: workflows.filter(w => w.status === "in_progress").length,
    totalRevenue: timeEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0),
    billableHours: timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0),
    teamUtilization: users.length > 0 ? Math.round(timeEntries.length / users.length * 100) : 0,
    pipelineValue: workflows.reduce((sum, w) => sum + (w.estimatedValue || 0), 0)
  };

  // Task form
  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      priority: "medium",
      assignedToId: undefined,
      clientId: undefined,
      category: "general",
    },
  });

  // Client form
  const clientForm = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      fiscalYearEnd: "12-31",
      status: "active",
      notes: "",
    },
  });

  // Mutations for data operations
  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          dueDate: new Date(data.dueDate).toISOString(),
        }),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNewTaskDialog(false);
      taskForm.reset();
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowNewClientDialog(false);
      clientForm.reset();
      toast({ title: "Success", description: "Client created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    },
  });

  // Role-based permissions (simulating admin settings)
  const [practiceSettings, setPracticeSettings] = useState({
    salesPipelineEnabled: true,
    marketingEnabled: true,
    billingEnabled: true,
    timeTrackingRequired: true,
    clientPortalEnabled: true,
    emailAutomationEnabled: true,
  });

  // Mock current user role for permissions
  const currentUserRole = "firm_admin"; // This would come from auth context

  const canAccessSales = currentUserRole === "firm_admin" || practiceSettings.salesPipelineEnabled;
  const canAccessMarketing = currentUserRole === "firm_admin" || practiceSettings.marketingEnabled;

  // Complete mutation handlers for all functionality
  const createWorkflowMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("/api/workflows", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setShowNewWorkflowDialog(false);
      toast({ title: "Success", description: "Workflow created successfully" });
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("/api/time-entries", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setShowNewTimeEntryDialog(false);
      toast({ title: "Success", description: "Time entry logged successfully" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ clientId, subject, message, template }) => {
      return await apiRequest("/api/send-email", {
        method: "POST",
        body: JSON.stringify({ clientId, subject, message, template }),
      });
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Client has been notified successfully" });
      setShowEmailDialog(false);
    },
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("/api/prospects", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setShowNewProspectDialog(false);
      toast({ title: "Success", description: "Prospect added to pipeline" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("/api/marketing-campaigns", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      setShowNewCampaignDialog(false);
      toast({ title: "Success", description: "Marketing campaign created" });
    },
  });

  // Email automation function
  const sendClientEmail = async (clientId, template, customData = {}) => {
    try {
      await sendEmailMutation.mutateAsync({ clientId, template, ...customData });
    } catch (error) {
      toast({ title: "Email failed", description: "Could not send email", variant: "destructive" });
    }
  };

  // Form submission handlers
  const handleCreateTask = (values) => {
    createTaskMutation.mutate({
      ...values,
      dueDate: new Date(values.dueDate).toISOString(),
    });
  };

  const handleCreateClient = (values) => {
    createClientMutation.mutate(values);
  };

  // Get upcoming tasks
  const upcomingTasks = tasks
    .filter(task => !task.completed && task.dueDate)
    .sort((a, b) => {
      try {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        return 0;
      }
    })
    .slice(0, 5);

  // Get recent activities from tasks, workflows, and time entries
  const recentActivities = [
    ...tasks.slice(0, 3).map(task => {
      let timeStr = "No date";
      try {
        const date = new Date(task.updatedAt || task.createdAt || new Date());
        if (!isNaN(date.getTime())) {
          timeStr = format(date, "MMM d, h:mm a");
        }
      } catch (error) {
        timeStr = "Invalid date";
      }
      return {
        id: `task-${task.id}`,
        type: "task",
        description: `Task ${task.completed ? "completed" : "created"}: ${task.title}`,
        time: timeStr,
        status: task.completed ? "completed" : "pending",
        sortTime: task.updatedAt || task.createdAt || new Date()
      };
    }),
    ...workflows.slice(0, 2).map(workflow => {
      let timeStr = "No date";
      try {
        const date = new Date(workflow.updatedAt || new Date());
        if (!isNaN(date.getTime())) {
          timeStr = format(date, "MMM d, h:mm a");
        }
      } catch (error) {
        timeStr = "Invalid date";
      }
      return {
        id: `workflow-${workflow.id}`,
        type: "workflow",
        description: `Workflow updated: ${workflow.name}`,
        time: timeStr,
        status: workflow.status,
        sortTime: workflow.updatedAt || new Date()
      };
    })
  ].sort((a, b) => {
    try {
      const dateA = new Date(a.sortTime);
      const dateB = new Date(b.sortTime);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      return 0;
    }
  }).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Practice Management</h1>
              <p className="text-lg text-gray-600">Complete practice management with Tars AI office manager</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowNewClientDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
              <Button onClick={() => setShowNewTaskDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </div>

        {/* Practice Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Team & Time
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communication
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Sales Pipeline
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Marketing
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{practiceMetrics.totalClients}</div>
                  <p className="text-xs text-muted-foreground">Active client base</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{practiceMetrics.activeWorkflows}</div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${practiceMetrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{practiceMetrics.billableHours}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{practiceMetrics.teamUtilization}%</div>
                  <p className="text-xs text-muted-foreground">Average across team</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${practiceMetrics.pipelineValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Potential revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities and Upcoming Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest updates across your practice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.status === "completed" ? "bg-green-500" : 
                          activity.status === "pending" ? "bg-yellow-500" : "bg-blue-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>
                        <Badge variant={
                          activity.status === "completed" ? "default" : 
                          activity.status === "pending" ? "secondary" : "outline"
                        }>
                          {activity.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No recent activities</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks requiring attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <p className="text-sm text-gray-500">
                            Due: {(() => {
                              if (!task.dueDate) return "No date set";
                              try {
                                const date = new Date(task.dueDate);
                                if (isNaN(date.getTime())) return "Invalid date";
                                return isToday(date) ? "Today" : 
                                       isTomorrow(date) ? "Tomorrow" : 
                                       format(date, "MMM d");
                              } catch (error) {
                                return "Invalid date";
                              }
                            })()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            task.priority === "high" ? "destructive" : 
                            task.priority === "medium" ? "default" : "secondary"
                          }>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No upcoming tasks</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Client Management</h2>
                <p className="text-gray-600">Manage your client relationships and engagements</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button onClick={() => setShowNewClientDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </div>
            </div>

            {clientsLoading ? (
              <div className="text-center py-8">Loading clients...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients
                  .filter(client => 
                    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((client) => (
                    <Card key={client.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                          <Badge variant={
                            client.status === "active" ? "default" : 
                            client.status === "pending" ? "secondary" : "outline"
                          }>
                            {client.status}
                          </Badge>
                        </div>
                        <CardDescription>{client.industry}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{client.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">FYE: {client.fiscalYearEnd}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1">
                            View Details
                          </Button>
                          <Button size="sm" className="flex-1">
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Workflow Management Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Workflow Management</h2>
                <p className="text-gray-600">Track and manage client engagement workflows</p>
              </div>
              <Button onClick={() => setShowNewWorkflowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </div>

            {/* Workflow Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                      <p className="text-2xl font-bold">{workflows?.length || 0}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed This Month</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Completion Time</p>
                      <p className="text-2xl font-bold">8.5d</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Efficiency Rate</p>
                      <p className="text-2xl font-bold">94%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Workflows */}
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows?.slice(0, 5).map((workflow) => (
                    <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-gray-600">{workflow.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                            {workflow.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Updated: {(() => {
                              try {
                                const date = new Date(workflow.updatedAt || new Date());
                                if (isNaN(date.getTime())) return "Invalid date";
                                return format(date, "MMM d, yyyy");
                              } catch (error) {
                                return "Invalid date";
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">View</Button>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No workflows found. Create your first workflow to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team & Time Management Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Team & Time Management</h2>
                <p className="text-gray-600">Track team performance and time allocation</p>
              </div>
              <Button onClick={() => setShowNewTimeEntryDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Log Time
              </Button>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Team Members</p>
                      <p className="text-2xl font-bold">{users?.length || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Hours This Week</p>
                      <p className="text-2xl font-bold">
                        {timeEntries?.reduce((total, entry) => total + (entry.hours || 0), 0).toFixed(1) || "0.0"}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                      <p className="text-2xl font-bold">
                        {timeEntries?.filter(entry => entry.billable).reduce((total, entry) => total + (entry.hours || 0), 0).toFixed(1) || "0.0"}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                      <p className="text-2xl font-bold">87%</p>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Performance & Time Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.role || 'Team Member'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">32.5h</p>
                          <p className="text-xs text-gray-500">This week</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-gray-500">
                        No team members found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Time Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timeEntries?.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-sm text-gray-600">
                            {(() => {
                              try {
                                const date = new Date(entry.date || new Date());
                                if (isNaN(date.getTime())) return "Invalid date";
                                return format(date, "MMM d, yyyy");
                              } catch (error) {
                                return "Invalid date";
                              }
                            })()} • {entry.hours}h
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.billable && <Badge variant="default" className="text-xs">Billable</Badge>}
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-gray-500">
                        No time entries found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Communication Hub</h2>
                <p className="text-gray-600">Manage client communications and messages</p>
              </div>
              <Button onClick={() => setShowNewMessageDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message Inbox */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          id: 1,
                          client: "Test Business Inc",
                          subject: "Q4 Financial Review Meeting",
                          preview: "Hi, I'd like to schedule a meeting to discuss our Q4 financials...",
                          time: "2 hours ago",
                          unread: true
                        },
                        {
                          id: 2,
                          client: "ACME Corporation",
                          subject: "Tax Document Submission",
                          preview: "Please find attached the requested tax documents for review...",
                          time: "1 day ago",
                          unread: false
                        },
                        {
                          id: 3,
                          client: "Second Test Client",
                          subject: "Audit Preparation Questions",
                          preview: "I have some questions about the upcoming audit preparation...",
                          time: "2 days ago",
                          unread: false
                        }
                      ].map((message) => (
                        <div key={message.id} className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${message.unread ? 'bg-blue-50 border-blue-200' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{message.client}</h4>
                                {message.unread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                              </div>
                              <p className="text-sm font-medium text-gray-900 mt-1">{message.subject}</p>
                              <p className="text-sm text-gray-600 mt-1">{message.preview}</p>
                            </div>
                            <span className="text-xs text-gray-500">{message.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Communication Statistics */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Unread Messages</span>
                        <Badge variant="destructive">3</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">This Week</span>
                        <span className="text-sm font-medium">12 messages</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Response Time</span>
                        <span className="text-sm font-medium">2.3 hours</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Newsletter
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Send Document
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sales Pipeline</h2>
                <p className="text-gray-600">Track prospects and revenue opportunities</p>
              </div>
              <Button onClick={() => setShowNewOpportunityDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Opportunity
              </Button>
            </div>

            {/* Pipeline Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Prospects</p>
                      <p className="text-2xl font-bold">8</p>
                      <p className="text-sm text-gray-500">$45,000</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Qualified</p>
                      <p className="text-2xl font-bold">5</p>
                      <p className="text-sm text-gray-500">$32,000</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Proposal</p>
                      <p className="text-2xl font-bold">3</p>
                      <p className="text-sm text-gray-500">$28,000</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Closed Won</p>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-sm text-gray-500">$89,500</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Table */}
            <Card>
              <CardHeader>
                <CardTitle>Active Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { company: "TechStart LLC", contact: "Sarah Johnson", value: "$15,000", stage: "Proposal", probability: "80%", closeDate: "2025-07-15" },
                    { company: "Green Solutions", contact: "Mike Chen", value: "$8,500", stage: "Qualified", probability: "45%", closeDate: "2025-08-01" },
                    { company: "Metro Consulting", contact: "Lisa Park", value: "$12,000", stage: "Prospect", probability: "25%", closeDate: "2025-09-15" }
                  ].map((opp, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1 grid grid-cols-6 gap-4">
                        <div>
                          <p className="font-medium">{opp.company}</p>
                          <p className="text-sm text-gray-500">{opp.contact}</p>
                        </div>
                        <div>
                          <p className="font-medium">{opp.value}</p>
                        </div>
                        <div>
                          <Badge variant={opp.stage === "Proposal" ? "default" : opp.stage === "Qualified" ? "secondary" : "outline"}>
                            {opp.stage}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm">{opp.probability}</p>
                        </div>
                        <div>
                          <p className="text-sm">{opp.closeDate}</p>
                        </div>
                        <div>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Marketing Automation</h2>
                <p className="text-gray-600">GoHighLevel-style marketing campaigns and automation</p>
              </div>
              <Button onClick={() => setShowNewCampaignDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            {/* Marketing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email Campaigns</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                    <Mail className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">SMS Campaigns</p>
                      <p className="text-2xl font-bold">8</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Landing Pages</p>
                      <p className="text-2xl font-bold">5</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Automation Workflows</p>
                      <p className="text-2xl font-bold">15</p>
                    </div>
                    <Settings className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Tax Season Reminder", type: "Email", status: "Active", sent: "1,247", opened: "398", clicked: "89" },
                      { name: "Year-End Planning", type: "SMS", status: "Active", sent: "856", opened: "654", clicked: "127" },
                      { name: "New Client Onboarding", type: "Automation", status: "Active", sent: "45", opened: "38", clicked: "22" }
                    ].map((campaign, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge variant={campaign.status === "Active" ? "default" : "secondary"}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{campaign.type} Campaign</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Sent</p>
                            <p className="font-medium">{campaign.sent}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Opened</p>
                            <p className="font-medium">{campaign.opened}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Clicked</p>
                            <p className="font-medium">{campaign.clicked}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Create Email Campaign
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send SMS Broadcast
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Build Landing Page
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Setup Automation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Create Lead Magnet
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <PieChart className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Task Dialog */}
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your practice management system
              </DialogDescription>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Task description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={taskForm.control}
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
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="tax">Tax</SelectItem>
                          <SelectItem value="audit">Audit</SelectItem>
                          <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* New Client Dialog */}
        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client for your practice
              </DialogDescription>
            </DialogHeader>
            <Form {...clientForm}>
              <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Company or individual name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="client@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="construction">Construction</SelectItem>
                            <SelectItem value="hospitality">Hospitality</SelectItem>
                            <SelectItem value="real_estate">Real Estate</SelectItem>
                            <SelectItem value="non_profit">Non-Profit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Business address..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="fiscalYearEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year End</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="01-31">January 31</SelectItem>
                            <SelectItem value="02-28">February 28</SelectItem>
                            <SelectItem value="03-31">March 31</SelectItem>
                            <SelectItem value="04-30">April 30</SelectItem>
                            <SelectItem value="05-31">May 31</SelectItem>
                            <SelectItem value="06-30">June 30</SelectItem>
                            <SelectItem value="07-31">July 31</SelectItem>
                            <SelectItem value="08-31">August 31</SelectItem>
                            <SelectItem value="09-30">September 30</SelectItem>
                            <SelectItem value="10-31">October 31</SelectItem>
                            <SelectItem value="11-30">November 30</SelectItem>
                            <SelectItem value="12-31">December 31</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={clientForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about the client..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewClientDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Creating..." : "Create Client"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tars AI Chat */}
      <TarsAIChat />
    </div>
  );
}