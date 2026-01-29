import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  CheckCircle2,
  CheckSquare,
  Eye,
  Edit3,
  Download,
  Bell,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Timer,
  Play,
  Pause,
  Square,
  CalendarDays,
  Grid3X3,
  List,
  Move,
  Video,
  MapPin,
  User,
  RefreshCw,
  Link,
  ExternalLink,
  Send,
  BarChart3,
  CreditCard,
  Smartphone,
  Zap,
  Star,
  Megaphone,
  Database,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Columns,
  Image,
  Upload
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import EnhancedClientCreation from "@/components/EnhancedClientCreation";
import EditClientForm from "@/components/EditClientForm";
import ClientDetailView from "@/components/ClientDetailView";
import { ContactPersonManagement } from "@/components/ContactPersonManagement";
import TeamManagement from "@/components/team/TeamManagement";
import CommunicationDashboard from "./communications/CommunicationDashbaord";
import PerfexImport from "@/pages/PerfexImport";


// Notification Bell Component for Client Approvals
function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Query for pending client approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ["/api/pending-client-approvals"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const approveClientMutation = useMutation({
    mutationFn: async ({ approvalId, action }: { approvalId: number; action: 'approve' | 'reject' }) => {
      const response = await apiRequest('POST', `/api/pending-client-approvals/${approvalId}/${action}`, {});
      if (!response.ok) {
        throw new Error('Failed to process approval');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-client-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Client approval processed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingCount = pendingApprovals?.length || 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Pending Client Approvals</h3>
            {pendingCount === 0 && (
              <p className="text-sm text-gray-500 mt-1">No pending approvals</p>
            )}
          </div>
          
          {pendingApprovals?.map((approval: any) => (
            <div key={approval.id} className="p-4 border-b">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{approval.clientName}</h4>
                    <p className="text-sm text-gray-600">{approval.industry}</p>
                    <p className="text-sm text-gray-500">Work Type: {approval.workType}</p>
                    <p className="text-sm text-gray-500">
                      Projects: {approval.proposedProjects?.length || 0} | Tasks: {approval.proposedTasks?.length || 0}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => approveClientMutation.mutate({ approvalId: approval.id, action: 'approve' })}
                    disabled={approveClientMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approveClientMutation.mutate({ approvalId: approval.id, action: 'reject' })}
                    disabled={approveClientMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tars AI Chat Component (simplified)
function TarsAIChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Tars Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat Dialog */}
      {isOpen && (
        <div className="fixed bottom-20 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-96 h-[calc(100vh-8rem)] sm:h-96 bg-white rounded-lg shadow-2xl border">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Tars AI Assistant</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>×</Button>
          </div>
          <div className="p-4 h-80 flex items-center justify-center text-gray-500">
            Ask me anything about your practice!
          </div>
        </div>
      )}
    </>
  );
}

// Task creation schema
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  assignedUserId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

// Pending Approval Detail Card Component
interface PendingApprovalDetailCardProps {
  approval: any;
  onApprove: (approvalId: number, updatedData: any) => void;
  onReject: (approvalId: number) => void;
  isProcessing: boolean;
}

function PendingApprovalDetailCard({ approval, onApprove, onReject, isProcessing }: PendingApprovalDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProjects, setEditedProjects] = useState(approval.proposedProjects || []);
  const [editedTasks, setEditedTasks] = useState(approval.proposedTasks || []);

  const handleProjectChange = (index: number, field: string, value: string) => {
    const updated = [...editedProjects];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProjects(updated);
  };

  const handleTaskChange = (index: number, field: string, value: string) => {
    const updated = [...editedTasks];
    updated[index] = { ...updated[index], [field]: value };
    setEditedTasks(updated);
  };

  const addProject = () => {
    setEditedProjects([...editedProjects, {
      name: "",
      description: "",
      status: "pending"
    }]);
  };

  const addTask = () => {
    setEditedTasks([...editedTasks, {
      title: "",
      description: "",
      priority: "medium"
    }]);
  };

  const removeProject = (index: number) => {
    setEditedProjects(editedProjects.filter((_, i) => i !== index));
  };

  const removeTask = (index: number) => {
    setEditedTasks(editedTasks.filter((_, i) => i !== index));
  };

  const handleApprove = () => {
    onApprove(approval.id, {
      proposedProjects: editedProjects,
      proposedTasks: editedTasks
    });
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{approval.clientName}</CardTitle>
            <CardDescription className="mt-1">
              {approval.industry} • {approval.workType}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1"
            >
              <Edit3 className="h-3 w-3" />
              {isEditing ? 'View Mode' : 'Edit Mode'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Proposed Projects ({editedProjects.length})</h4>
            {isEditing && (
              <Button size="sm" onClick={addProject} className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Add Project
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {editedProjects.map((project: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Project name"
                        value={project.name}
                        onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeProject(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Project description"
                      value={project.description}
                      onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                ) : (
                  <div>
                    <h5 className="font-medium">{project.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Proposed Tasks ({editedTasks.length})</h4>
            {isEditing && (
              <Button size="sm" onClick={addTask} className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Add Task
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {editedTasks.map((task: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Task title"
                        value={task.title}
                        onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={task.priority}
                        onValueChange={(value) => handleTaskChange(index, 'priority', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Task description"
                      value={task.description}
                      onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{task.title}</h5>
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Approve & Create'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onReject(approval.id)}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Pages() {
  console.log('🚀 COMPREHENSIVE PAGES COMPONENT LOADED - Pages-fixed.tsx');
  const [match, params] = useRoute('/pages/:tab');
  const [activeTab, setActiveTab] = useState(params?.tab || "practice");
  const [settingsTab, setSettingsTab] = useState("general");
  // Update activeTab when URL parameter changes
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab);
    }
  }, [params?.tab]);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSortBy, setClientSortBy] = useState("name");
  const [clientSortDirection, setClientSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleColumns, setVisibleColumns] = useState({
    clientName: true,
    contactPerson: true,
    industry: true,
    businessNumber: true,
    yearEnd: true,
    workType: true,
    status: true,
    actions: true
  });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [showClientEdit, setShowClientEdit] = useState(false);
  const [clientFilterBy, setClientFilterBy] = useState("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [showClientDetailsDialog, setShowClientDetailsDialog] = useState(false);
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [showLogoUploadDialog, setShowLogoUploadDialog] = useState(false);
  const [logoUploadClientId, setLogoUploadClientId] = useState<number | null>(null);
  
  // Calendar state
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'kanban'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [calendarFilter, setCalendarFilter] = useState('all');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  
  // Timer state
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimeEntry, setShowTimeEntry] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<any>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Practice metrics query
  const { data: practiceMetrics } = useQuery({
    queryKey: ["/api/practice/metrics"],
    enabled: false, // Disable for now
  });

  // Dashboard metrics query
  const { data: dashboardMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Debug dashboard metrics query
  console.log('📊 Dashboard Metrics Query State:', {
    data: dashboardMetrics,
    loading: metricsLoading,
    error: metricsError
  });

  // Activities query for Recent Activity feed
  const { data: recentActivities, isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ["/api/activities"],
  });

  // Debug activities query
  console.log('🔍 Activities Query State:', {
    data: recentActivities,
    loading: activitiesLoading,
    error: activitiesError,
    hasData: recentActivities && recentActivities.length > 0
  });

  // Tasks query
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Query for pending client approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ["/api/pending-client-approvals"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mutation for approving clients
  const approveClientMutation = useMutation({
    mutationFn: async ({ approvalId, action, updatedData }: { approvalId: number; action: 'approve' | 'reject'; updatedData?: any }) => {
      const response = await apiRequest('POST', `/api/pending-client-approvals/${approvalId}/${action}`, updatedData || {});
      if (!response.ok) {
        throw new Error('Failed to process approval');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-client-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Client approval processed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Users query
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/users"],
  });
  const users = usersResponse?.users || [];

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Time tracking queries
  const { data: timeEntries } = useQuery({
    queryKey: ["/api/time-entries"],
  });

  const { data: timeBudgets } = useQuery({
    queryKey: ["/api/time-budgets"],
  });

  // Helper function to safely extract data arrays
  const safeArray = (data: any) => data?.data || data || [];

  // Safe metrics with defaults - now uses real data from clients
  const safeMetrics = {
    totalClients: safeArray(clients).length || 0,
    activeWorkflows: safeArray(projects).length || 0,
    totalRevenue: (practiceMetrics as any)?.totalRevenue || 0,
    billableHours: (practiceMetrics as any)?.billableHours || 0,
    teamUtilization: (practiceMetrics as any)?.teamUtilization || 0,
    pipelineValue: (practiceMetrics as any)?.pipelineValue || 0,
  };

  // Task form
  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      assignedUserId: "",
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNewTaskDialog(false);
      taskForm.reset();
      toast({ title: "Success", description: "Task created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const handleCreateTask = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  // Time entry mutation
  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setShowTimeEntry(false);
      setElapsedTime(0);
      setCurrentTimeEntry(null);
      toast({ title: "Success", description: "Time entry logged successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log time entry", variant: "destructive" });
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async ({ clientId, file }: { clientId: number; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}/logo`), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowLogoUploadDialog(false);
      setLogoUploadClientId(null);
      toast({ 
        title: "Success", 
        description: "Logo uploaded successfully!" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload logo", 
        variant: "destructive" 
      });
    },
  });

  // Handle timer stop with time entry
  const handleStopTimer = () => {
    if (elapsedTime > 0) {
      setCurrentTimeEntry({
        duration: elapsedTime,
        startTime: new Date(Date.now() - elapsedTime * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });
      setIsTimerRunning(false);
      setIsTimerOpen(false);
      setShowTimeEntry(true);
    } else {
      setIsTimerRunning(false);
      setElapsedTime(0);
    }
  };

  // Filtering and sorting functions
  const getFilteredAndSortedClients = () => {
    let filtered = safeArray(clients);
    
    // Apply search filter
    if (clientSearchTerm) {
      filtered = filtered.filter((client: any) => 
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (clientFilterBy !== 'all') {
      if (clientFilterBy === 'active') {
        filtered = filtered.filter((client: any) => client.status === 'active');
      } else if (clientFilterBy === 'inactive') {
        filtered = filtered.filter((client: any) => client.status === 'inactive');
      } else if (clientFilterBy === 'recent') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter((client: any) => 
          new Date(client.createdAt || client.created_at || Date.now()) >= thirtyDaysAgo
        );
      }
    }
    
    // Sort clients with direction support
    filtered.sort((a: any, b: any) => {
      let compareResult = 0;
      
      switch (clientSortBy) {
        case 'name':
          compareResult = a.name.localeCompare(b.name);
          break;
        case 'email':
          compareResult = (a.email || '').localeCompare(b.email || '');
          break;
        case 'contactPerson':
          compareResult = (a.contactPersonName || '').localeCompare(b.contactPersonName || '');
          break;
        case 'industry':
          compareResult = (a.industry || 'General').localeCompare(b.industry || 'General');
          break;
        case 'businessNumber':
          compareResult = (a.businessNumber || '').localeCompare(b.businessNumber || '');
          break;
        case 'yearEnd':
          compareResult = (a.fiscalYearEnd || '').localeCompare(b.fiscalYearEnd || '');
          break;
        case 'workType':
          const aWorkType = Array.isArray(a.workType) ? a.workType[0] || '' : a.workType || '';
          const bWorkType = Array.isArray(b.workType) ? b.workType[0] || '' : b.workType || '';
          compareResult = aWorkType.localeCompare(bWorkType);
          break;
        case 'status':
          compareResult = (a.status || 'active').localeCompare(b.status || 'active');
          break;
        case 'created':
          compareResult = new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
          break;
        default:
          return 0;
      }
      
      // Apply sort direction
      return clientSortDirection === 'asc' ? compareResult : -compareResult;
    });
    
    return filtered;
  };

  // Sorting handler
  const handleSort = (field: string) => {
    if (clientSortBy === field) {
      // Toggle direction if same field
      setClientSortDirection(clientSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setClientSortBy(field);
      setClientSortDirection('asc');
    }
  };

  // Column visibility toggle
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (clientSortBy !== field) {
      return null;
    }
    return clientSortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  // Export functions
  const exportClientsToExcel = () => {
    const data = getFilteredAndSortedClients().map((client: any) => ({
      'Client Name': client.name,
      'Email': client.email,
      'Contact Person': client.contactPersonName || 'Not specified',
      'Industry': client.industry || 'General',
      'Business Number': client.businessNumber || 'Not provided',
      'Year End': client.fiscalYearEnd || 'December 31',
      'Status': client.status
    }));
    
    // Create CSV content
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Client data has been exported to Excel successfully.",
    });
  };

  const exportClientsToPDF = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality would be implemented here.",
    });
  };

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pending-approvals':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Pending Client Approvals</h2>
                <p className="text-sm sm:text-base text-gray-600">Review and approve new client submissions</p>
              </div>
            </div>
            
            {/* Pending Client Approvals Section */}
            {pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="space-y-6">
                {pendingApprovals.map((approval: any) => (
                  <PendingApprovalDetailCard
                    key={approval.id}
                    approval={approval}
                    onApprove={(approvalId, updatedData) => 
                      approveClientMutation.mutate({ approvalId, action: 'approve', updatedData })
                    }
                    onReject={(approvalId) => 
                      approveClientMutation.mutate({ approvalId, action: 'reject' })
                    }
                    isProcessing={approveClientMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Pending Approvals</h3>
                  <p className="text-gray-500">All client submissions have been processed</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'communication':
        return (
          <div className="h-full">
            <CommunicationDashboard />
          </div>
        );
      

      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Clients</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardMetrics?.totalClients ?? 'Loading...'}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Tasks</p>
                    <p className="text-3xl font-bold text-gray-900">{dashboardMetrics?.pendingTasks ?? 'Loading...'}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Running Workflows</p>
                    <p className="text-3xl font-bold text-gray-900">{safeArray(projects).length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Team Members</p>
                    <p className="text-3xl font-bold text-gray-900">{users?.users?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your practice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities && recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((activity: any) => {
                    const getActivityIcon = (type: string) => {
                      switch (type) {
                        case 'client_created':
                        case 'client_updated':
                          return <Plus className="w-4 h-4 text-green-600" />;
                        case 'task_completed':
                        case 'task_created':
                          return <CheckCircle className="w-4 h-4 text-blue-600" />;
                        case 'workflow_started':
                        case 'workflow_completed':
                          return <Activity className="w-4 h-4 text-purple-600" />;
                        case 'document_uploaded':
                        case 'document_reviewed':
                          return <FileText className="w-4 h-4 text-orange-600" />;
                        case 'client_meeting_scheduled':
                        case 'client_meeting_completed':
                          return <Calendar className="w-4 h-4 text-indigo-600" />;
                        case 'email_sent':
                        case 'phone_call_made':
                          return <Mail className="w-4 h-4 text-cyan-600" />;
                        default:
                          return <Activity className="w-4 h-4 text-gray-600" />;
                      }
                    };

                    const getActivityStyle = (type: string) => {
                      switch (type) {
                        case 'client_created':
                        case 'client_updated':
                          return 'bg-green-50';
                        case 'task_completed':
                        case 'task_created':
                          return 'bg-blue-50';
                        case 'workflow_started':
                        case 'workflow_completed':
                          return 'bg-purple-50';
                        case 'document_uploaded':
                        case 'document_reviewed':
                          return 'bg-orange-50';
                        case 'client_meeting_scheduled':
                        case 'client_meeting_completed':
                          return 'bg-indigo-50';
                        case 'email_sent':
                        case 'phone_call_made':
                          return 'bg-cyan-50';
                        default:
                          return 'bg-gray-50';
                      }
                    };

                    const getIconBackgroundStyle = (type: string) => {
                      switch (type) {
                        case 'client_created':
                        case 'client_updated':
                          return 'bg-green-100';
                        case 'task_completed':
                        case 'task_created':
                          return 'bg-blue-100';
                        case 'workflow_started':
                        case 'workflow_completed':
                          return 'bg-purple-100';
                        case 'document_uploaded':
                        case 'document_reviewed':
                          return 'bg-orange-100';
                        case 'client_meeting_scheduled':
                        case 'client_meeting_completed':
                          return 'bg-indigo-100';
                        case 'email_sent':
                        case 'phone_call_made':
                          return 'bg-cyan-100';
                        default:
                          return 'bg-gray-100';
                      }
                    };

                    const formatTimeAgo = (dateString: string) => {
                      const now = new Date();
                      const activityDate = new Date(dateString);
                      const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
                      
                      if (diffInMinutes < 60) {
                        return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes} minutes ago`;
                      } else if (diffInMinutes < 1440) { // Less than a day
                        const hours = Math.floor(diffInMinutes / 60);
                        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                      } else {
                        const days = Math.floor(diffInMinutes / 1440);
                        return `${days} day${days > 1 ? 's' : ''} ago`;
                      }
                    };

                    return (
                      <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg ${getActivityStyle(activity.type)}`}>
                        <div className={`w-8 h-8 ${getIconBackgroundStyle(activity.type)} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">
                            {activity.description}
                            {activity.clientName && ` • ${activity.clientName}`}
                            {' • ' + formatTimeAgo(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Recent Activity</h3>
                    <p className="text-gray-500">Start working with clients to see activity here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      case 'clients':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Client Management</h2>
                <p className="text-sm sm:text-base text-gray-600">Manage your client relationships and information</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Sort Dropdown */}
                <select 
                  value={clientSortBy} 
                  onChange={(e) => setClientSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:flex-initial min-w-[140px]"
                >
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="industry">Sort by Industry</option>
                  <option value="status">Sort by Status</option>
                  <option value="created">Sort by Date Created</option>
                </select>

                <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>

                {/* Filter & Export Dropdown */}
                <select 
                  value={clientFilterBy} 
                  onChange={(e) => setClientFilterBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:flex-initial min-w-[140px]"
                >
                  <option value="all">All Clients</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="recent">Recent (30 days)</option>
                </select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 sm:flex-initial">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportClientsToExcel()}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportClientsToPDF()}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => {
                  setShowClientEdit(false);
                  setShowNewClientDialog(true);
                }} className="flex-1 sm:flex-initial">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{safeArray(clients).length || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-green-600">{clients?.filter((c: any) => c.status === 'active').length || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Industries Served</p>
                      <p className="text-2xl font-bold text-purple-600">1</p>
                    </div>
                    <Building className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                      <p className="text-2xl font-bold text-orange-600">0</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bulk Actions */}
            {selectedClients.length > 0 && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to deactivate ${selectedClients.length} client(s)?`)) {
                            try {
                              const results = await Promise.allSettled(
                                selectedClients.map(clientId => 
                                  apiRequest('PATCH', `/api/clients/${clientId}`, { status: 'inactive' })
                                )
                              );
                              
                              const failures = results.filter(r => r.status === 'rejected').length;
                              const successes = results.filter(r => r.status === 'fulfilled').length;
                              
                              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                              setSelectedClients([]);
                              
                              if (failures === 0) {
                                toast({
                                  title: "Clients Deactivated",
                                  description: `${successes} client(s) have been deactivated`,
                                });
                              } else {
                                toast({
                                  title: "Partial Success",
                                  description: `${successes} succeeded, ${failures} failed`,
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error("Bulk deactivate error:", error);
                              toast({
                                title: "Error",
                                description: "Failed to deactivate clients",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Deactivate Selected
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${selectedClients.length} client(s)? This action cannot be undone and will delete all associated data.`)) {
                            try {
                              const results = await Promise.allSettled(
                                selectedClients.map(clientId => 
                                  apiRequest('DELETE', `/api/clients/${clientId}`)
                                )
                              );
                              
                              const failures = results.filter(r => r.status === 'rejected').length;
                              const successes = results.filter(r => r.status === 'fulfilled').length;
                              
                              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                              setSelectedClients([]);
                              
                              if (failures === 0) {
                                toast({
                                  title: "Clients Deleted",
                                  description: `${successes} client(s) have been permanently deleted`,
                                  variant: "destructive"
                                });
                              } else {
                                toast({
                                  title: "Partial Success",
                                  description: `${successes} deleted, ${failures} failed`,
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error("Bulk delete error:", error);
                              toast({
                                title: "Error",
                                description: "Failed to delete clients",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClients([])}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Clients</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Columns className="w-4 h-4 mr-2" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="p-2">
                        <div className="text-sm font-medium mb-2">Show/Hide Columns</div>
                        {Object.entries({
                          clientName: 'Client Name',
                          contactPerson: 'Contact Person',
                          industry: 'Industry',
                          businessNumber: 'Business Number',
                          yearEnd: 'Year End',
                          workType: 'Work Type',
                          status: 'Status',
                          actions: 'Actions'
                        }).map(([key, label]) => (
                          <div key={key} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              checked={visibleColumns[key as keyof typeof visibleColumns]}
                              onChange={() => toggleColumnVisibility(key)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-sm">{label}</span>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedClients.length === getFilteredAndSortedClients().length && getFilteredAndSortedClients().length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients(getFilteredAndSortedClients().map((client: any) => client.id));
                            } else {
                              setSelectedClients([]);
                            }
                          }}
                        />
                      </TableHead>
                      {visibleColumns.clientName && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('name')}
                          >
                            Client Name
                            {renderSortIcon('name')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.contactPerson && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('contactPerson')}
                          >
                            Contact Person
                            {renderSortIcon('contactPerson')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.industry && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('industry')}
                          >
                            Industry
                            {renderSortIcon('industry')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.businessNumber && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('businessNumber')}
                          >
                            Business Number
                            {renderSortIcon('businessNumber')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.yearEnd && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('yearEnd')}
                          >
                            Year End
                            {renderSortIcon('yearEnd')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.workType && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('workType')}
                          >
                            Work Type
                            {renderSortIcon('workType')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.status && (
                        <TableHead>
                          <button 
                            className="flex items-center hover:text-blue-600 font-medium"
                            onClick={() => handleSort('status')}
                          >
                            Status
                            {renderSortIcon('status')}
                          </button>
                        </TableHead>
                      )}
                      {visibleColumns.actions && (
                        <TableHead>Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAndSortedClients().map((client: any) => (
                      <TableRow 
                        key={client.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger row click if clicking on checkbox
                          if ((e.target as HTMLElement).type === 'checkbox') return;
                          setSelectedClientId(client.id.toString());
                          setShowClientDetail(true);
                        }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedClients.includes(client.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedClients([...selectedClients, client.id]);
                              } else {
                                setSelectedClients(selectedClients.filter(id => id !== client.id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        {visibleColumns.clientName && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Building className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium hover:text-blue-600">{client.name}</div>
                                <div className="text-sm text-gray-500">{client.email}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.contactPerson && (
                          <TableCell>
                            <div>
                              <div className="font-medium">{client.contactPersonName || "Not specified"}</div>
                              <div className="text-sm text-gray-500">{client.contactPersonEmail || ""}</div>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.industry && (
                          <TableCell>{client.industry || "General"}</TableCell>
                        )}
                        {visibleColumns.businessNumber && (
                          <TableCell>{client.businessNumber || "Not provided"}</TableCell>
                        )}
                        {visibleColumns.yearEnd && (
                          <TableCell>{client.fiscalYearEnd || "December 31"}</TableCell>
                        )}
                        {visibleColumns.workType && (
                          <TableCell>
                            <Badge variant="outline">
                              {Array.isArray(client.workType) ? client.workType[0] : "Bookkeeping"}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell>
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                              {client.status}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.actions && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClientId(client.id.toString());
                                setShowClientDetail(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNewClientDialog(false);
                                setSelectedClientId(client.id.toString());
                                setShowClientEdit(true);
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  console.log('🔍 View Details clicked for client:', client.id, client.name);
                                  e.stopPropagation();
                                  setSelectedClientId(client.id.toString());
                                  setShowClientDetail(true);
                                }}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  console.log('✏️ Edit Client clicked for client:', client.id, client.name);
                                  e.stopPropagation();
                                  setShowNewClientDialog(false);
                                  setSelectedClientId(client.id.toString());
                                  setShowClientEdit(true);
                                }}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Edit Client
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  console.log('📄 View Documents clicked for client:', client.id, client.name);
                                  e.stopPropagation();
                                  toast({
                                    title: "Documents",
                                    description: `Opening document manager for ${client.name}`,
                                  });
                                }}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Documents
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  console.log('📧 Send Email clicked for client:', client.id, client.name);
                                  e.stopPropagation();
                                  const emailUrl = `mailto:${client.email || client.contactPersonEmail}?subject=Message from Accounting Firm`;
                                  window.open(emailUrl, '_blank');
                                  toast({
                                    title: "Email Client",
                                    description: `Opening email to ${client.name}`,
                                  });
                                }}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  console.log('🖼️ Upload Logo clicked for client:', client.id, client.name);
                                  e.stopPropagation();
                                  setLogoUploadClientId(client.id);
                                  setShowLogoUploadDialog(true);
                                }}>
                                  <Image className="w-4 h-4 mr-2" />
                                  Upload Logo
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-orange-600" 
                                  onClick={async (e) => {
                                    console.log('❌ Deactivate clicked for client:', client.id, client.name);
                                    e.stopPropagation();
                                    if (confirm(`Are you sure you want to deactivate ${client.name}?`)) {
                                      try {
                                        await apiRequest('PATCH', `/api/clients/${client.id}`, { status: 'inactive' });
                                        
                                        // Invalidate clients query to refresh the list
                                        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                                        
                                        toast({
                                          title: "Client Deactivated",
                                          description: `${client.name} has been deactivated`,
                                          variant: "destructive"
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: `Failed to deactivate ${client.name}`,
                                          variant: "destructive"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Deactivate Client
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600" 
                                  onClick={async (e) => {
                                    console.log('🗑️ Delete clicked for client:', client.id, client.name);
                                    e.stopPropagation();
                                    if (confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${client.name}? This action cannot be undone and will delete all associated data including transactions, projects, and documents.`)) {
                                      try {
                                        await apiRequest('DELETE', `/api/clients/${client.id}`);
                                        
                                        // Invalidate clients query to refresh the list
                                        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                                        
                                        toast({
                                          title: "Client Deleted",
                                          description: `${client.name} has been permanently deleted`,
                                          variant: "destructive"
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: `Failed to delete ${client.name}`,
                                          variant: "destructive"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Client
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'projects':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Project Management</h2>
                <p className="text-sm sm:text-base text-gray-600">Organize work by projects with tasks underneath</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Sort Dropdown */}
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue="name"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                  <option value="date">Sort by Date</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-9 w-full sm:w-64"
                  />
                </div>

                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue="all"
                >
                  <option value="all">All Projects</option>
                  <option value="active">Active Only</option>
                  <option value="completed">Completed Only</option>
                </select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Not Started</p>
                      <p className="text-3xl font-bold text-red-600">
                        {safeArray(projects).filter((p: any) => p.status === 'not_started').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {safeArray(projects).filter((p: any) => p.status === 'in_progress').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-3xl font-bold text-green-600">
                        {safeArray(projects).filter((p: any) => p.status === 'completed').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Projects Section */}
            <Card>
              <CardHeader>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>Projects organized by client with status indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {safeArray(projects).length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {safeArray(projects).map((project: any) => {
                            const client = clients?.find((c: any) => c.id === project.client_id);
                            return (
                              <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.name}</TableCell>
                                <TableCell>{client?.business_name || 'Unknown Client'}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    project.status === 'completed' ? 'default' :
                                    project.status === 'in_progress' ? 'secondary' :
                                    project.status === 'not_started' ? 'outline' : 'outline'
                                  }>
                                    {project.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not Started'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</TableCell>
                                <TableCell>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</TableCell>
                                <TableCell>{project.budget_amount ? `$${Number(project.budget_amount).toLocaleString()}` : '-'}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">View</Button>
                                    <Button variant="outline" size="sm">Edit</Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                    <p className="text-gray-500 mb-6">Get started by creating your first project</p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      case 'tasks':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Task Management</h2>
                <p className="text-sm sm:text-base text-gray-600">Track and manage tasks across your practice (including CONNIE AI generated tasks)</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Sort Dropdown */}
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue="title"
                >
                  <option value="title">Sort by Title</option>
                  <option value="priority">Sort by Priority</option>
                  <option value="date">Sort by Date</option>
                </select>

                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue="all"
                >
                  <option value="all">All Tasks</option>
                  <option value="todo">To Do</option>
                  <option value="progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button onClick={() => setShowNewTaskDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>

            {/* Task Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* To Do Column */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-lg">To Do (0)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No pending tasks</p>
                  </div>
                </CardContent>
              </Card>

              {/* In Progress Column */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-lg">In Progress (0)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No active tasks</p>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Column */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-lg">Completed (0)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-16">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No completed tasks</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Smart Calendar System</h2>
                <p className="text-gray-600">Automated scheduling and task allocation for optimal firm operations</p>
              </div>
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={calendarView === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('day')}
                    className="px-3 py-1 text-xs"
                  >
                    Day
                  </Button>
                  <Button
                    variant={calendarView === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('week')}
                    className="px-3 py-1 text-xs"
                  >
                    Week
                  </Button>
                  <Button
                    variant={calendarView === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('month')}
                    className="px-3 py-1 text-xs"
                  >
                    Month
                  </Button>
                  <Button
                    variant={calendarView === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('kanban')}
                    className="px-3 py-1 text-xs"
                  >
                    <Grid3X3 className="w-3 h-3 mr-1" />
                    Kanban
                  </Button>
                </div>

                {/* Calendar Filter */}
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={calendarFilter}
                  onChange={(e) => setCalendarFilter(e.target.value)}
                >
                  <option value="all">All Items</option>
                  <option value="meetings">Meetings</option>
                  <option value="tasks">Tasks</option>
                  <option value="deadlines">Deadlines</option>
                  <option value="my-work">My Work</option>
                </select>

                {/* Sync Button */}
                <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync
                </Button>

                {/* Integration Status */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Google</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Outlook</span>
                  </div>
                </div>

                <Button onClick={() => setShowNewEventDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (calendarView === 'day') newDate.setDate(newDate.getDate() - 1);
                      else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
                      else newDate.setMonth(newDate.getMonth() - 1);
                      setCurrentDate(newDate);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (calendarView === 'day') newDate.setDate(newDate.getDate() + 1);
                      else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
                      else newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentDate(newDate);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-lg font-semibold">
                  {format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : 
                    calendarView === 'week' ? "'Week of' MMM d, yyyy" : 
                    'EEEE, MMM d, yyyy')}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Smart Scheduling Active
                </Badge>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google Calendar
                </Button>
              </div>
            </div>

            {/* Calendar Content */}
            {calendarView === 'kanban' ? (
              /* Kanban Board View */
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Today Column */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-lg">Today</CardTitle>
                      <Badge variant="secondary">3</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { time: '9:00 AM', title: 'Client Review Meeting', client: 'ABC Corp', type: 'meeting', priority: 'high' },
                      { time: '2:00 PM', title: 'Tax Return Review', client: 'Smith & Co', type: 'task', priority: 'medium' },
                      { time: '4:30 PM', title: 'Team Standup', client: 'Internal', type: 'meeting', priority: 'low' }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => setDraggedItem(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Move className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">{item.time}</span>
                          <Badge 
                            variant={item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.client}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {item.type === 'meeting' ? (
                              <Video className="w-3 h-3 text-blue-500" />
                            ) : (
                              <CheckSquare className="w-3 h-3 text-green-500" />
                            )}
                            <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Tomorrow Column */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <CardTitle className="text-lg">Tomorrow</CardTitle>
                      <Badge variant="secondary">2</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { time: '10:00 AM', title: 'Financial Statements Review', client: 'XYZ Ltd', type: 'task', priority: 'high' },
                      { time: '3:00 PM', title: 'New Client Consultation', client: 'Johnson Family', type: 'meeting', priority: 'medium' }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => setDraggedItem(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Move className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">{item.time}</span>
                          <Badge 
                            variant={item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.client}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {item.type === 'meeting' ? (
                              <Video className="w-3 h-3 text-blue-500" />
                            ) : (
                              <CheckSquare className="w-3 h-3 text-green-500" />
                            )}
                            <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* This Week Column */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <CardTitle className="text-lg">This Week</CardTitle>
                      <Badge variant="secondary">4</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { time: 'Thu 2:00 PM', title: 'Board Meeting Prep', client: 'DEF Corp', type: 'task', priority: 'medium' },
                      { time: 'Fri 11:00 AM', title: 'Quarterly Review', client: 'GHI Inc', type: 'meeting', priority: 'high' },
                      { time: 'Fri 4:00 PM', title: 'Client Check-in', client: 'JKL LLC', type: 'meeting', priority: 'low' }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => setDraggedItem(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Move className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">{item.time}</span>
                          <Badge 
                            variant={item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.client}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {item.type === 'meeting' ? (
                              <Video className="w-3 h-3 text-blue-500" />
                            ) : (
                              <CheckSquare className="w-3 h-3 text-green-500" />
                            )}
                            <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Later Column */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-500" />
                      <CardTitle className="text-lg">Later</CardTitle>
                      <Badge variant="secondary">5</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { time: 'Next Week', title: 'Annual Planning Session', client: 'Internal', type: 'meeting', priority: 'medium' },
                      { time: 'TBD', title: 'Client Onboarding', client: 'New Client', type: 'task', priority: 'low' }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => setDraggedItem(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Move className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">{item.time}</span>
                          <Badge 
                            variant={item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.client}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {item.type === 'meeting' ? (
                              <Video className="w-3 h-3 text-blue-500" />
                            ) : (
                              <CheckSquare className="w-3 h-3 text-green-500" />
                            )}
                            <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Traditional Calendar Views */
              <Card className="p-6">
                <div className="text-center py-32">
                  <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {calendarView.charAt(0).toUpperCase() + calendarView.slice(1)} View
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {calendarView === 'month' && 'Monthly calendar view with all appointments and deadlines'}
                    {calendarView === 'week' && 'Weekly calendar view with detailed daily scheduling'}
                    {calendarView === 'day' && 'Daily calendar view with hour-by-hour planning'}
                  </p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule New Event
                  </Button>
                </div>
              </Card>
            )}

            {/* Smart Insights Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Smart Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Optimal Meeting Time</p>
                    <p className="text-xs text-blue-700">Best slot for ABC Corp meeting: Tomorrow 10-11 AM</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Workload Balance</p>
                    <p className="text-xs text-green-700">Consider moving Friday tasks to Thursday for better distribution</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">Deadline Alert</p>
                    <p className="text-xs text-orange-700">Tax filing deadline approaching for 3 clients</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    Team Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {users?.slice(0, 4).map((user: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">{user.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Available</span>
                      </div>
                    </div>
                  )) || [1,2,3,4].map((index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">Team Member {index}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Available</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Client Meetings</span>
                    <Badge variant="secondary">4 today</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tax Reviews</span>
                    <Badge variant="secondary">2 pending</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Follow-ups</span>
                    <Badge variant="secondary">6 due</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Admin Tasks</span>
                    <Badge variant="secondary">3 scheduled</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Timer Management Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Timer className="w-4 h-4 text-green-500" />
                    Timer Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Timer Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <div className="text-xs text-gray-600">Today</div>
                      <div className="font-mono text-sm font-medium">
                        {Array.isArray(timeEntries) ? 
                          Math.floor(timeEntries
                            .filter((entry: any) => new Date(entry.startTime).toDateString() === new Date().toDateString())
                            .reduce((total: number, entry: any) => total + entry.duration, 0) / 3600) : 0
                        }:{String(Math.floor((Array.isArray(timeEntries) ? 
                          timeEntries
                            .filter((entry: any) => new Date(entry.startTime).toDateString() === new Date().toDateString())
                            .reduce((total: number, entry: any) => total + entry.duration, 0) % 3600 : 0) / 60)).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-xs text-gray-600">Billable</div>
                      <div className="font-mono text-sm font-medium">
                        {Array.isArray(timeEntries) ? 
                          Math.floor(timeEntries
                            .filter((entry: any) => entry.billable && new Date(entry.startTime).toDateString() === new Date().toDateString())
                            .reduce((total: number, entry: any) => total + entry.duration, 0) / 3600) : 0
                        }:{String(Math.floor((Array.isArray(timeEntries) ? 
                          timeEntries
                            .filter((entry: any) => entry.billable && new Date(entry.startTime).toDateString() === new Date().toDateString())
                            .reduce((total: number, entry: any) => total + entry.duration, 0) % 3600 : 0) / 60)).padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Recent Entries */}
                  <div>
                    <div className="text-xs font-medium mb-2">Recent Entries</div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {Array.isArray(timeEntries) && timeEntries.length > 0 ? timeEntries.slice(0, 3).map((entry: any) => (
                        <div key={entry.id} className="text-xs p-2 bg-gray-50 rounded flex justify-between">
                          <div className="truncate flex-1">
                            <div className="font-medium truncate">{entry.description}</div>
                            <div className="text-gray-600">{entry.category}</div>
                          </div>
                          <div className="font-mono text-right ml-2">
                            {Math.floor(entry.duration / 3600)}:{String(Math.floor((entry.duration % 3600) / 60)).padStart(2, '0')}
                          </div>
                        </div>
                      )) : (
                        <div className="text-center text-gray-500 text-xs py-2">
                          No entries yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsTimerOpen(true)}
                      className="flex-1 text-xs h-7"
                    >
                      <Timer className="w-3 h-3 mr-1" />
                      Timer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs h-7"
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            {/* Billing Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Smart Billing & Payments</h2>
                <p className="text-gray-600">Automate billing workflows with time tracking, invoice management, and payment processing</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Revenue Tracking Active
                </Badge>
                <Button onClick={() => setShowNewInvoiceDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$24,500</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">WIP Value</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$18,200</div>
                  <p className="text-xs text-muted-foreground">Work in progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Realization Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">Time to billing ratio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Collection Days</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">28</div>
                  <p className="text-xs text-muted-foreground">Days to collect payment</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Billing Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Time Tracking Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-blue-500" />
                    Time Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active Timer */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Currently Tracking</span>
                      </div>
                      <span className="text-lg font-mono">02:45:32</span>
                    </div>
                    <p className="text-sm text-blue-700 font-medium">ABC Corp - Tax Return Review</p>
                    <p className="text-xs text-blue-600">Started 2:45 PM</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7">
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                      <Button size="sm" variant="outline" className="h-7">
                        <Square className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>

                  {/* Recent Time Entries */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Entries</h4>
                    <div className="space-y-2">
                      {[
                        { client: 'XYZ Ltd', task: 'Financial Review', time: '1.5h', rate: '$150/h', amount: '$225' },
                        { client: 'Smith & Co', task: 'Bookkeeping', time: '2.25h', rate: '$120/h', amount: '$270' },
                        { client: 'Johnson Corp', task: 'Tax Planning', time: '0.75h', rate: '$180/h', amount: '$135' }
                      ].map((entry, index) => (
                        <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{entry.client}</p>
                              <p className="text-xs text-gray-600">{entry.task}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">{entry.amount}</p>
                              <p className="text-xs text-gray-600">{entry.time} @ {entry.rate}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Button variant="ghost" size="sm" className="h-6 text-xs">Edit</Button>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">Bill</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    New Time Entry
                  </Button>
                </CardContent>
              </Card>

              {/* Invoice Management */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-500" />
                      Invoice Management
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                        <option value="all">All Invoices</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { 
                        id: 'INV-2024-001', 
                        client: 'ABC Corporation', 
                        amount: '$2,450', 
                        status: 'paid', 
                        dueDate: '2024-01-15',
                        type: 'Time & Materials'
                      },
                      { 
                        id: 'INV-2024-002', 
                        client: 'XYZ Limited', 
                        amount: '$1,800', 
                        status: 'sent', 
                        dueDate: '2024-02-01',
                        type: 'Fixed Fee'
                      },
                      { 
                        id: 'INV-2024-003', 
                        client: 'Smith & Associates', 
                        amount: '$3,200', 
                        status: 'overdue', 
                        dueDate: '2024-01-20',
                        type: 'Time & Materials'
                      },
                      { 
                        id: 'INV-2024-004', 
                        client: 'Johnson Family Trust', 
                        amount: '$950', 
                        status: 'draft', 
                        dueDate: '2024-02-10',
                        type: 'Recurring'
                      }
                    ].map((invoice, index) => (
                      <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium">{invoice.id}</span>
                              <Badge 
                                variant={
                                  invoice.status === 'paid' ? 'default' :
                                  invoice.status === 'sent' ? 'secondary' :
                                  invoice.status === 'overdue' ? 'destructive' : 'outline'
                                }
                                className="text-xs"
                              >
                                {invoice.status.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">{invoice.type}</span>
                            </div>
                            <p className="font-medium mt-1">{invoice.client}</p>
                            <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{invoice.amount}</p>
                            <div className="flex gap-1 mt-2">
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <Send className="w-3 h-3 mr-1" />
                                Send
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* WIP & Realization Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    WIP Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { client: 'ABC Corporation', wip: '$4,200', hours: '28h', lastBilled: '2 weeks ago' },
                      { client: 'XYZ Limited', wip: '$2,800', hours: '18h', lastBilled: '1 week ago' },
                      { client: 'Smith & Associates', wip: '$6,500', hours: '45h', lastBilled: '3 weeks ago' },
                      { client: 'Johnson Family', wip: '$1,200', hours: '8h', lastBilled: '1 week ago' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.client}</p>
                          <p className="text-sm text-gray-600">{item.hours} • Last billed {item.lastBilled}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">{item.wip}</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Bill Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    Payment Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Payment Status */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">15</p>
                        <p className="text-xs text-green-700">Paid On Time</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">3</p>
                        <p className="text-xs text-yellow-700">Pending</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">2</p>
                        <p className="text-xs text-red-700">Overdue</p>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div>
                      <h4 className="font-medium mb-3">Payment Options</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Credit Card</span>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Direct Debit</span>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-purple-500" />
                            <span className="text-sm">Digital Wallet</span>
                          </div>
                          <Badge variant="outline">Configure</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Payment Setup */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Auto-Payment</span>
                      </div>
                      <p className="text-xs text-blue-700 mb-2">Enable automatic payment collection for recurring clients</p>
                      <Button size="sm" variant="outline" className="w-full">
                        Setup Auto-Payment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Aged Receivables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Aged Receivables Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">$12,500</p>
                    <p className="text-sm text-gray-600">Current (0-30 days)</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">$8,200</p>
                    <p className="text-sm text-gray-600">31-60 days</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">$3,100</p>
                    <p className="text-sm text-gray-600">61-90 days</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-red-600">$700</p>
                    <p className="text-sm text-gray-600">90+ days</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Outstanding Invoices</h4>
                  {[
                    { client: 'ABC Corp', amount: '$2,450', days: 45, status: 'follow-up' },
                    { client: 'XYZ Ltd', amount: '$1,800', days: 15, status: 'current' },
                    { client: 'Smith & Co', amount: '$3,200', days: 75, status: 'urgent' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.client}</p>
                        <p className="text-sm text-gray-600">{item.days} days outstanding</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{item.amount}</span>
                        <Badge 
                          variant={
                            item.status === 'current' ? 'secondary' :
                            item.status === 'follow-up' ? 'default' : 'destructive'
                          }
                        >
                          {item.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Send className="w-3 h-3 mr-1" />
                          Remind
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'team':
        return <TeamManagement />;

      case 'contact-management':
        return <ContactPersonManagement />;
      
      case 'sales':
        return (
          <div className="space-y-6" data-testid="content-sales">
            {/* Sales Overview Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$485,200</div>
                  <p className="text-xs text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">142</div>
                  <p className="text-xs text-muted-foreground">+12 new this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24.8%</div>
                  <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$8,500</div>
                  <p className="text-xs text-muted-foreground">+$450 from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Sales Pipeline
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <Button size="sm" data-testid="button-add-opportunity">
                        <Plus className="w-4 h-4 mr-2" />
                        New Opportunity
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        company: 'TechStart Inc', 
                        contact: 'Sarah Johnson', 
                        value: '$45,000', 
                        stage: 'Proposal', 
                        probability: 75,
                        closeDate: '2024-01-15'
                      },
                      { 
                        company: 'GrowthCorp Ltd', 
                        contact: 'Mike Chen', 
                        value: '$32,000', 
                        stage: 'Discovery', 
                        probability: 45,
                        closeDate: '2024-01-30'
                      },
                      { 
                        company: 'Startup Ventures', 
                        contact: 'Lisa Park', 
                        value: '$28,500', 
                        stage: 'Negotiation', 
                        probability: 85,
                        closeDate: '2024-01-12'
                      },
                    ].map((opp, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50" data-testid={`opportunity-${index}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{opp.company}</h4>
                            <p className="text-sm text-gray-600">{opp.contact}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{opp.value}</p>
                            <Badge variant={
                              opp.stage === 'Proposal' ? 'default' :
                              opp.stage === 'Discovery' ? 'secondary' :
                              opp.stage === 'Negotiation' ? 'outline' : 'default'
                            }>
                              {opp.stage}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Probability: {opp.probability}%</span>
                          <span className="text-gray-600">Close: {opp.closeDate}</span>
                        </div>
                        <div className="mt-2">
                          <Progress value={opp.probability} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest sales activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: 'call', description: 'Called TechStart Inc - Sarah Johnson', time: '2 hours ago', status: 'completed' },
                      { type: 'email', description: 'Sent proposal to GrowthCorp Ltd', time: '1 day ago', status: 'sent' },
                      { type: 'meeting', description: 'Discovery call with NextGen Solutions', time: '2 days ago', status: 'completed' },
                      { type: 'follow-up', description: 'Follow up with Startup Ventures', time: 'Tomorrow', status: 'scheduled' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded" data-testid={`activity-${index}`}>
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-500' :
                          activity.status === 'sent' ? 'bg-blue-500' :
                          activity.status === 'scheduled' ? 'bg-orange-500' : 'bg-gray-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full mt-4" variant="outline" data-testid="button-log-activity">
                    <Plus className="w-4 h-4 mr-2" />
                    Log Activity
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'marketing':
        return (
          <div className="space-y-6" data-testid="content-marketing">
            {/* Marketing Overview Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">248</div>
                  <p className="text-xs text-muted-foreground">+22% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Campaign ROI</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">340%</div>
                  <p className="text-xs text-muted-foreground">+45% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Marketing Spend</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$8,450</div>
                  <p className="text-xs text-muted-foreground">-12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lead Quality</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8.2/10</div>
                  <p className="text-xs text-muted-foreground">+0.3 from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-blue-500" />
                      Active Campaigns
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </Button>
                      <Button size="sm" data-testid="button-create-campaign">
                        <Plus className="w-4 h-4 mr-2" />
                        New Campaign
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        name: 'Q4 Tax Season Campaign', 
                        status: 'Active', 
                        budget: '$2,500', 
                        spent: '$1,850',
                        leads: 45,
                        conversions: 12,
                        startDate: 'Oct 1, 2024'
                      },
                      { 
                        name: 'Small Business Outreach', 
                        status: 'Active', 
                        budget: '$1,800', 
                        spent: '$1,200',
                        leads: 32,
                        conversions: 8,
                        startDate: 'Sep 15, 2024'
                      },
                      { 
                        name: 'LinkedIn Professional Services', 
                        status: 'Paused', 
                        budget: '$3,000', 
                        spent: '$2,100',
                        leads: 28,
                        conversions: 6,
                        startDate: 'Aug 20, 2024'
                      }
                    ].map((campaign, index) => (
                      <div key={index} className="border rounded-lg p-4" data-testid={`campaign-${index}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                            <p className="text-xs text-gray-500 mb-2">Started: {campaign.startDate}</p>
                            <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Budget: {campaign.budget}</p>
                            <p className="text-sm font-medium">Spent: {campaign.spent}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Leads Generated</p>
                            <p className="font-bold text-lg">{campaign.leads}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Conversions</p>
                            <p className="font-bold text-lg">{campaign.conversions}</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Budget Usage</span>
                            <span>{Math.round((parseFloat(campaign.spent.replace('$', '').replace(',', '')) / parseFloat(campaign.budget.replace('$', '').replace(',', ''))) * 100)}%</span>
                          </div>
                          <Progress 
                            value={Math.round((parseFloat(campaign.spent.replace('$', '').replace(',', '')) / parseFloat(campaign.budget.replace('$', '').replace(',', ''))) * 100)} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Marketing KPIs */}
              <Card>
                <CardHeader>
                  <CardTitle>Marketing KPIs</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Cost Per Lead', current: 28, target: 35, unit: '$', color: 'green' },
                      { name: 'Lead-to-Client Rate', current: 18, target: 15, unit: '%', color: 'blue' },
                      { name: 'Email Open Rate', current: 24, target: 22, unit: '%', color: 'purple' },
                      { name: 'Social Engagement', current: 156, target: 180, unit: '', color: 'orange' }
                    ].map((kpi, index) => (
                      <div key={index} className="space-y-2" data-testid={`kpi-${index}`}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{kpi.name}</span>
                          <span>{kpi.current}{kpi.unit} / {kpi.target}{kpi.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              kpi.color === 'green' ? 'bg-green-600' :
                              kpi.color === 'blue' ? 'bg-blue-600' :
                              kpi.color === 'purple' ? 'bg-purple-600' : 'bg-orange-600'
                            }`}
                            style={{ 
                              width: `${Math.min((kpi.current / kpi.target) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Progress</span>
                          <span>{Math.round((kpi.current / kpi.target) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" data-testid="button-update-goals">
                        <Settings className="w-4 h-4 mr-2" />
                        Update Goals
                      </Button>
                      <Button className="flex-1" variant="outline" data-testid="button-export-report">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-6" data-testid="content-settings">
            {/* Settings Navigation Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Practice Settings & Configuration
                </CardTitle>
                <CardDescription>Manage firm settings, user permissions, and system configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button 
                    variant={settingsTab === 'general' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('general')}
                    data-testid="tab-general"
                  >
                    ⚙️ General
                  </Button>
                  <Button 
                    variant={settingsTab === 'users' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('users')}
                    data-testid="tab-users"
                  >
                    👥 User Management
                  </Button>
                  <Button 
                    variant={settingsTab === 'billing' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('billing')}
                    data-testid="tab-billing"
                  >
                    💳 Billing Settings
                  </Button>
                  <Button 
                    variant={settingsTab === 'integrations' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('integrations')}
                    data-testid="tab-integrations"
                  >
                    🔗 Integrations
                  </Button>
                  <Button 
                    variant={settingsTab === 'security' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('security')}
                    data-testid="tab-security"
                  >
                    🔒 Security
                  </Button>
                  <Button 
                    variant={settingsTab === 'perfex-import' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('perfex-import')}
                    data-testid="tab-perfex-import"
                  >
                    📥 PerfexCRM Import
                  </Button>
                  <Button 
                    variant={settingsTab === 'notifications' ? "default" : "outline"} 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => setSettingsTab('notifications')}
                    data-testid="tab-notifications"
                  >
                    🔔 Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Settings Content Based on Selected Tab */}
            <div className="space-y-6">
              {settingsTab === 'perfex-import' ? (
                <PerfexImport />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Firm Profile Settings - Show for General tab */}
                  {settingsTab === 'general' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-green-500" />
                          Firm Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Firm Name</label>
                            <input 
                              type="text" 
                              defaultValue="Wilson & Associates CPA" 
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              data-testid="input-firm-name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Business Address</label>
                            <textarea 
                              defaultValue="123 Business District
Toronto, ON M5H 2N2
Canada"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20"
                              data-testid="input-firm-address"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Phone</label>
                              <input 
                                type="tel" 
                                defaultValue="(416) 555-0123" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                data-testid="input-firm-phone"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Email</label>
                              <input 
                                type="email" 
                                defaultValue="contact@wilsonaccounting.ca" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                data-testid="input-firm-email"
                              />
                            </div>
                          </div>
                        </div>
                        <Button className="w-full" data-testid="button-save-profile">
                          <Settings className="w-4 h-4 mr-2" />
                          Save Profile Changes
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* System Management - Show for General tab */}
                  {settingsTab === 'general' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-blue-500" />
                          System Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* System Status */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-3">System Status</h4>
                            <div className="space-y-2 text-sm">
                              {[
                                { metric: 'Database Status', status: 'Healthy', color: 'bg-green-500' },
                                { metric: 'API Performance', status: 'Good', color: 'bg-green-500' },
                                { metric: 'Storage Usage', status: '78% Used', color: 'bg-yellow-500' },
                                { metric: 'Last Backup', status: '2 hours ago', color: 'bg-green-500' }
                              ].map((item, index) => (
                                <div key={index} className="flex items-center justify-between" data-testid={`status-${index}`}>
                                  <span>{item.metric}</span>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                    <span className="text-xs">{item.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div>
                            <h4 className="font-medium mb-3">Quick Actions</h4>
                            <div className="space-y-2">
                              <Button className="w-full" variant="outline" data-testid="button-backup-now">
                                <Database className="w-4 h-4 mr-2" />
                                Backup Now
                              </Button>
                              <Button className="w-full" variant="outline" data-testid="button-system-logs">
                                <FileText className="w-4 h-4 mr-2" />
                                View System Logs
                              </Button>
                              <Button className="w-full" variant="destructive" data-testid="button-reset-warning">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                System Reset
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Placeholder cards for other tabs */}
                  {settingsTab === 'users' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-500" />
                          User Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">User management settings will be implemented here.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsTab === 'billing' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-green-500" />
                          Billing Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">Billing configuration settings will be implemented here.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsTab === 'integrations' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          Integrations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">Third-party integrations will be managed here.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsTab === 'security' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-red-500" />
                          Security Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">Security and access control settings will be implemented here.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsTab === 'notifications' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-blue-500" />
                          Notification Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">Notification preferences will be configured here.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'practice':
        return (
          <div className="space-y-6" data-testid="content-practice">
            {/* Practice Management Overview Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$425,680</div>
                  <p className="text-xs text-muted-foreground">+15% from last quarter</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">67</div>
                  <p className="text-xs text-muted-foreground">+3 new this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">84%</div>
                  <p className="text-xs text-muted-foreground">+2% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">32.5%</div>
                  <p className="text-xs text-muted-foreground">+1.8% from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Practice Analytics & Resource Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Financial Performance */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Financial Performance
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <select className="px-3 py-1 border border-gray-300 rounded-md text-sm" data-testid="select-performance-period">
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <Button variant="outline" size="sm" data-testid="button-export-financials">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Revenue Breakdown */}
                    <div>
                      <h4 className="font-medium mb-3">Revenue by Service Line</h4>
                      <div className="space-y-3">
                        {[
                          { service: 'Tax Preparation', revenue: '$185,400', percentage: 44, color: 'bg-blue-600' },
                          { service: 'Bookkeeping Services', revenue: '$128,200', percentage: 30, color: 'bg-green-600' },
                          { service: 'Business Consulting', revenue: '$76,800', percentage: 18, color: 'bg-purple-600' },
                          { service: 'Audit & Assurance', revenue: '$35,280', percentage: 8, color: 'bg-orange-600' }
                        ].map((item, index) => (
                          <div key={index} className="space-y-1" data-testid={`revenue-service-${index}`}>
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{item.service}</span>
                              <span>{item.revenue} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${item.color}`}
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Trends */}
                    <div>
                      <h4 className="font-medium mb-3">Monthly Performance Trends</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        {[
                          { month: 'Last Month', value: '$38,200', change: '+12%', color: 'text-green-600' },
                          { month: 'This Month', value: '$42,800', change: '+18%', color: 'text-green-600' },
                          { month: 'Projected', value: '$45,500', change: '+6%', color: 'text-blue-600' }
                        ].map((trend, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg" data-testid={`trend-${index}`}>
                            <p className="text-xs text-gray-600">{trend.month}</p>
                            <p className="font-bold text-lg">{trend.value}</p>
                            <p className={`text-xs ${trend.color}`}>{trend.change}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resource Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Resource Management</CardTitle>
                  <CardDescription>Team capacity and utilization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Staff Capacity */}
                    <div>
                      <h4 className="font-medium mb-3">Staff Capacity</h4>
                      <div className="space-y-2">
                        {[
                          { name: 'John Smith (Partner)', utilization: 92, capacity: '40h/week', color: 'bg-red-500' },
                          { name: 'Sarah Wilson (Senior)', utilization: 87, capacity: '40h/week', color: 'bg-orange-500' },
                          { name: 'Mike Chen (Staff)', utilization: 78, capacity: '40h/week', color: 'bg-green-500' },
                          { name: 'Lisa Park (Junior)', utilization: 65, capacity: '35h/week', color: 'bg-blue-500' }
                        ].map((staff, index) => (
                          <div key={index} className="p-2 border rounded" data-testid={`staff-capacity-${index}`}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium" data-testid={`text-staff-name-${index}`}>{staff.name}</span>
                              <span>{staff.utilization}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${staff.color}`}
                                style={{ width: `${staff.utilization}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{staff.capacity}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Practice Goals */}
                    <div>
                      <h4 className="font-medium mb-3">Practice Goals</h4>
                      <div className="space-y-2">
                        {[
                          { goal: 'Annual Revenue Target', progress: 68, target: '$500K' },
                          { goal: 'New Client Acquisition', progress: 45, target: '15 clients' },
                          { goal: 'Team Expansion', progress: 75, target: '2 new hires' }
                        ].map((goal, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded" data-testid={`practice-goal-${index}`}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium" data-testid={`text-goal-${index}`}>{goal.goal}</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Target: {goal.target}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default: // practice-management
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.totalClients}</div>
                  <p className="text-xs text-muted-foreground">Active client base</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.activeWorkflows}</div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${safeMetrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.billableHours}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.teamUtilization}%</div>
                  <p className="text-xs text-muted-foreground">Average across team</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${safeMetrics.pipelineValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Potential revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates across your practice</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New client onboarding completed</p>
                        <p className="text-xs text-gray-600">Sarah's Business - 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Tax return filed</p>
                        <p className="text-xs text-gray-600">Johnson Corp - 4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Follow-up email sent</p>
                        <p className="text-xs text-gray-600">Mike's Startup - Yesterday</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks due soon</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(tasks) && tasks.length > 0 ? (
                    tasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-600">
                            {(() => {
                              try {
                                const date = new Date(task.dueDate || new Date());
                                if (isNaN(date.getTime())) return "No due date";
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

            {/* Tars AI Chat */}
            <TarsAIChat />
          </div>
        );
    }
  };

  // Show client detail view if selected
  if (showClientDetail && selectedClientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex">

        {/* Client Detail Content */}
        <div className="flex-1 overflow-auto">
          <ClientDetailView 
            clientId={selectedClientId}
            onBack={() => {
              setShowClientDetail(false);
              setSelectedClientId(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="comprehensive-pages-component" className="min-h-screen bg-gray-50 flex flex-col lg:flex-row w-full overflow-hidden">

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full min-w-0">
        <div className="px-4 sm:px-6 py-4 max-w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {activeTab === 'practice-management' && 'DASHBOARD'}
                {activeTab === 'clients' && 'CLIENTS'}
                {activeTab === 'projects' && 'PROJECTS'}
                {activeTab === 'tasks' && 'TASKS'}
                {activeTab === 'calendar' && 'CALENDAR'}
                {activeTab === 'billing' && 'BILLING'}
                {activeTab === 'team' && 'TEAM'}
                {activeTab === 'sales' && 'SALES'}
                {activeTab === 'marketing' && 'MARKETING'}
                {activeTab === 'communication' && 'COMMUNICATION'}
                {activeTab === 'practice' && 'PRACTICE'}
                {activeTab === 'settings' && 'SETTINGS'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm"
                className={`relative ${isTimerRunning ? 'text-green-600' : 'text-gray-500'}`}
                onClick={() => setIsTimerOpen(true)}
              >
                <Clock className="h-5 w-5" />
                {isTimerRunning && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </Button>
              <NotificationBell />
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Render tab content */}
          {renderTabContent()}
        </div>
      </div>

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

              <FormField
                control={taskForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={taskForm.control}
                name="assignedUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
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

      {/* New Client Dialog - Only show when NOT editing */}
      {showNewClientDialog && !showClientEdit && (
        <EnhancedClientCreation
          isOpen={showNewClientDialog}
          onComplete={(client) => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            setShowNewClientDialog(false);
            toast({ 
              title: "Success", 
              description: client.workflow ? 
                "Client intake workflow created successfully! CONNIE AI will send the email shortly." :
                "Client created successfully!"
            });
          }}
          onCancel={() => setShowNewClientDialog(false)}
        />
      )}

      {/* Edit Client Dialog - Only show when NOT creating new */}
      {showClientEdit && !showNewClientDialog && (
        <EditClientForm
          isOpen={showClientEdit}
          clientId={selectedClientId}
          onComplete={(client) => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            setShowClientEdit(false);
            toast({
              title: "Client Updated",
              description: `${client.name} has been successfully updated.`,
            });
          }}
          onCancel={() => setShowClientEdit(false)}
        />
      )}

      {/* Smart Timer Dialog */}
      <Dialog open={isTimerOpen} onOpenChange={setIsTimerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Smart Timer
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-mono mb-4">
                {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:
                {Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')}:
                {(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
              
              <div className="flex justify-center gap-2">
                {!isTimerRunning ? (
                  <Button
                    onClick={() => setIsTimerRunning(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsTimerRunning(false)}
                      variant="outline"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      onClick={handleStopTimer}
                      variant="destructive"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              <p>Task-based time tracking for PAGES, BOOKS, and BINDERS.</p>
              <p className="mt-2">Advanced timer features coming soon...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      <Dialog open={showTimeEntry} onOpenChange={setShowTimeEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Log Time Entry
            </DialogTitle>
          </DialogHeader>
          
          {currentTimeEntry && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Time Logged</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-mono text-lg">
                      {Math.floor(currentTimeEntry.duration / 3600).toString().padStart(2, '0')}:
                      {Math.floor((currentTimeEntry.duration % 3600) / 60).toString().padStart(2, '0')}:
                      {(currentTimeEntry.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <div>
                      {new Date(currentTimeEntry.startTime).toLocaleTimeString()} - 
                      {new Date(currentTimeEntry.endTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createTimeEntryMutation.mutate({
                  ...currentTimeEntry,
                  projectId: formData.get('projectId'),
                  taskId: formData.get('taskId'),
                  description: formData.get('description'),
                  billable: formData.get('billable') === 'true',
                  category: formData.get('category'),
                });
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Project</label>
                    <select name="projectId" className="w-full border rounded px-3 py-2" required>
                      <option value="">Select Project</option>
                      {Array.isArray(projects) && projects.map((project: any) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Task</label>
                    <select name="taskId" className="w-full border rounded px-3 py-2">
                      <option value="">Select Task (Optional)</option>
                      {Array.isArray(tasks) && tasks.map((task: any) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select name="category" className="w-full border rounded px-3 py-2" required>
                      <option value="">Select Category</option>
                      <option value="pages">PAGES</option>
                      <option value="books">BOOKS</option>
                      <option value="binders">BINDERS</option>
                      <option value="admin">Administrative</option>
                      <option value="meeting">Meeting</option>
                      <option value="research">Research</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name="billable" value="true" defaultChecked />
                      Billable
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea 
                    name="description" 
                    rows={3} 
                    className="w-full border rounded px-3 py-2"
                    placeholder="What did you work on?"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowTimeEntry(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTimeEntryMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createTimeEntryMutation.isPending ? "Saving..." : "Save Time Entry"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Logo Upload Dialog */}
      <Dialog open={showLogoUploadDialog} onOpenChange={setShowLogoUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Upload Client Logo
            </DialogTitle>
            <DialogDescription>
              Upload a logo image for this client. Supported formats: JPEG, PNG, GIF, WebP, SVG (max 5MB)
            </DialogDescription>
          </DialogHeader>
          
          <LogoUploadForm
            clientId={logoUploadClientId}
            onUpload={(file) => {
              if (logoUploadClientId) {
                uploadLogoMutation.mutate({ clientId: logoUploadClientId, file });
              }
            }}
            onCancel={() => {
              setShowLogoUploadDialog(false);
              setLogoUploadClientId(null);
            }}
            isUploading={uploadLogoMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Logo Upload Form Component
function LogoUploadForm({ 
  clientId, 
  onUpload, 
  onCancel, 
  isUploading 
}: { 
  clientId: number | null; 
  onUpload: (file: File) => void; 
  onCancel: () => void;
  isUploading: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPEG, PNG, GIF, WebP, or SVG)",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile && clientId) {
      onUpload(selectedFile);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Logo Image</label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload-input"
            disabled={isUploading}
          />
          <label
            htmlFor="logo-upload-input"
            className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span className="text-sm">Choose File</span>
          </label>
          {selectedFile && (
            <span className="text-sm text-gray-600">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
      </div>

      {preview && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Preview</label>
          <div className="relative border border-gray-200 rounded-md p-4 bg-gray-50 flex items-center justify-center min-h-[200px]">
            <img
              src={preview}
              alt="Logo preview"
              className="max-w-full max-h-[200px] object-contain"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="absolute top-2 right-2"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Logo"}
        </Button>
      </DialogFooter>
    </div>
  );
}