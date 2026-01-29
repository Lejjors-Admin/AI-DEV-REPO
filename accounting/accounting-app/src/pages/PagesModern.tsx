import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PagesSidebar from "@/components/PagesSidebar";
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
  Search,
  Eye,
  MoreHorizontal,
  ArrowLeft,
  User,
  Briefcase,
  Key,
  Settings,
  FileText,
  Filter,
  Bot,
  PieChart,
  Activity,
  CheckCircle2,
  CheckSquare,
  GitBranch,
  UserCog,
  Upload,
  Edit3,
  Trash2,
  Image,
  X,
  Star,
  ArrowRight,
  Send,
  Download,
  Calendar as CalendarIcon,
  Clock4,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import { apiConfig } from "@/lib/api-config";

// Form schemas
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
  clientId: z.number().optional(),
  assignedTo: z.number().optional(),
  estimatedHours: z.number().min(0.5).max(100),
});

const clientSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  businessNumber: z.string().optional(),
  industry: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  website: z.string().optional(),
  contactPersonName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  title: z.string().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Canada"),
  billingAddress: z.string().optional(),
  workType: z.enum(["bookkeeping", "tax_preparation", "financial_planning", "audit", "payroll", "consulting"]).default("bookkeeping"),
  status: z.enum(["active", "inactive", "prospect"]).default("active"),
  clientType: z.enum(["individual", "corporation", "partnership", "nonprofit"]).default("corporation"),
  notes: z.string().optional(),
});

export default function Pages() {
  const params = useParams();
  const binderId = params.binderId ? parseInt(params.binderId) : null;
  const tabFromUrl = params.tab;
  
  // Initialize activeTab based on URL parameters
  const [activeTab, setActiveTab] = useState(() => {
    if (binderId) {
      return "binder-engagement"; // Show binder engagement when binderId is present
    }
    return tabFromUrl || "dashboard";
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientView, setClientView] = useState<"list" | "detail">("list");
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [showNewTimeEntryDialog, setShowNewTimeEntryDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showNewProspectDialog, setShowNewProspectDialog] = useState(false);
  const [showClientBillingDialog, setShowClientBillingDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showLogoUploadDialog, setShowLogoUploadDialog] = useState(false);
  const [logoUploadClientId, setLogoUploadClientId] = useState<number | null>(null);
  
  // Selected items
  const [selectedClientForBilling, setSelectedClientForBilling] = useState(null);
  const [selectedClientForEmail, setSelectedClientForEmail] = useState(null);

  // Practice settings for role-based permissions
  const [practiceSettings, setPracticeSettings] = useState({
    salesPipelineEnabled: true,
    marketingEnabled: true,
    billingEnabled: true,
    timeTrackingRequired: true,
    clientPortalEnabled: true,
    emailAutomationEnabled: true,
  });

  // Current user state
  const { data: currentUser } = useQuery({
    queryKey: ["/api/current-user"],
    retry: false,
  });

  // Data queries
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!currentUser,
  });

  // Binder data query - fetch specific binder when binderId is present
  const { data: binderData, isLoading: binderLoading } = useQuery({
    queryKey: ["/api/binders", binderId],
    queryFn: ({ signal }) => 
      fetch(apiConfig.buildUrl(`/api/binders/${binderId}`), { signal })
        .then(res => res.json()),
    enabled: !!binderId && !!currentUser,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !!currentUser,
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ["/api/workflows"],
    enabled: !!currentUser,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!currentUser,
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ["/api/time-entries"],
    enabled: !!currentUser,
  });

  // Form definitions
  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      priority: "medium" as const,
      estimatedHours: 1,
    },
  });

  const clientForm = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      businessNumber: "",
      industry: "",
      fiscalYearEnd: "",
      website: "",
      contactPersonName: "",
      email: "",
      phone: "",
      title: "",
      businessAddress: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      billingAddress: "",
      workType: "bookkeeping" as const,
      status: "active" as const,
      clientType: "corporation" as const,
      notes: "",
    },
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiConfig.buildUrl("/api/tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNewTaskDialog(false);
      taskForm.reset();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiConfig.buildUrl("/api/clients"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create client");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowNewClientDialog(false);
      clientForm.reset();
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
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

  // Handlers
  const handleCreateTask = (data: any) => {
    createTaskMutation.mutate(data);
  };

  const handleCreateClient = (data: any) => {
    createClientMutation.mutate(data);
  };

  // Role-based access
  const canAccessSales = currentUser?.role && ["firm_admin", "admin"].includes(currentUser.role) && practiceSettings.salesPipelineEnabled;
  const canAccessMarketing = currentUser?.role && ["firm_admin", "admin"].includes(currentUser.role) && practiceSettings.marketingEnabled;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <PagesSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice Management</h1>
              <p className="text-gray-600">Comprehensive client relationship and workflow management</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFileUploadDialog(true)}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Files
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Practice Settings
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-6">

            {/* Binder Engagement View */}
            {activeTab === "binder-engagement" && binderId && (
              <div className="space-y-6">
                {binderLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : binderData ? (
                  <>
                    {/* Binder Header */}
                    <div className="bg-white rounded-lg border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900">{binderData.name}</h1>
                          <p className="text-gray-600">
                            {clients?.find((c: any) => c.id === binderData.clientId)?.name || "Unknown Client"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            binderData.status === "completed" ? "default" : 
                            binderData.status === "review" ? "secondary" : 
                            "outline"
                          }>
                            {binderData.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Engagement Type</p>
                          <p className="font-medium">{binderData.engagementType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Industry</p>
                          <p className="font-medium">{binderData.industry || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Year End</p>
                          <p className="font-medium">{binderData.fiscalYearEnd}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Progress</p>
                          <div className="flex items-center gap-2">
                            <Progress value={binderData.completionPercentage || 0} className="flex-1" />
                            <span className="text-sm font-medium">{binderData.completionPercentage || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Engagement Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Workpapers
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4">Manage engagement workpapers and supporting documents.</p>
                          <Button className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Workpaper
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5" />
                            Tasks
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4">Track tasks specific to this engagement.</p>
                          <Button className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Time Tracking
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4">Record time spent on this engagement.</p>
                          <Button className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Log Time
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Notes Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Engagement Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea 
                          placeholder="Add notes about this engagement..."
                          defaultValue={binderData.notes || ""}
                          className="min-h-[100px]"
                        />
                        <div className="flex justify-end mt-4">
                          <Button>Save Notes</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Binder not found</p>
                  </div>
                )}
              </div>
            )}

            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Clients</p>
                          <p className="text-2xl font-bold text-gray-900">{clients?.length || 0}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                          <p className="text-2xl font-bold text-gray-900">{tasks?.filter((t: any) => t.status === 'in_progress').length || 0}</p>
                        </div>
                        <CheckSquare className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Running Workflows</p>
                          <p className="text-2xl font-bold text-gray-900">{workflows?.filter((w: any) => w.status === 'in_progress').length || 0}</p>
                        </div>
                        <GitBranch className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Team Members</p>
                          <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
                        </div>
                        <UserCog className="w-8 h-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates from your practice</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Task completed</p>
                          <p className="text-xs text-gray-500">Tax preparation for ACME Corp - 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Users className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">New client added</p>
                          <p className="text-xs text-gray-500">Sarah Johnson - 4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <GitBranch className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Workflow started</p>
                          <p className="text-xs text-gray-500">Monthly review process - 6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clients */}
            {activeTab === "clients" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Client Management</h2>
                    <p className="text-gray-600">Manage your client relationships and information</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button onClick={() => setShowNewClientDialog(true)}>
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
                          <p className="text-2xl font-bold text-gray-900">{clients?.length || 0}</p>
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

                {/* Client Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Industry</TableHead>
                          <TableHead>Business Number</TableHead>
                          <TableHead>Year End</TableHead>
                          <TableHead>Work Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients?.filter((client: any) => 
                          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((client: any) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Building className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-sm text-gray-500">{client.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{client.contactPersonName || "Not specified"}</div>
                                <div className="text-sm text-gray-500">{client.contactPersonEmail || ""}</div>
                              </div>
                            </TableCell>
                            <TableCell>{client.industry || "General"}</TableCell>
                            <TableCell>{client.businessNumber || "Not provided"}</TableCell>
                            <TableCell>{client.fiscalYearEnd || "December 31"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {Array.isArray(client.workType) ? client.workType[0] : "Bookkeeping"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.location.href = `/clients/${client.id}`}
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.location.href = `/clients/${client.id}/edit`}
                                  title="Edit Client"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => window.location.href = `/clients/${client.id}`}>
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.location.href = `/clients/${client.id}/edit`}>
                                      Edit Client
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.location.href = `/clients/${client.id}/documents`}>
                                      View Documents
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Send Email</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      setLogoUploadClientId(client.id);
                                      setShowLogoUploadDialog(true);
                                    }}>
                                      <Image className="w-4 h-4 mr-2" />
                                      Upload Logo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      Deactivate Client
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tasks */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Task Management</h2>
                    <p className="text-gray-600">Track and manage tasks across your practice</p>
                  </div>
                  <Button onClick={() => setShowNewTaskDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        To Do
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium">Prepare tax documents</h4>
                          <p className="text-sm text-gray-500">Due: Tomorrow</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium">Client review meeting</h4>
                          <p className="text-sm text-gray-500">Due: Today</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        In Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium">Financial analysis</h4>
                          <p className="text-sm text-gray-500">Started 2 days ago</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium">Tax filing complete</h4>
                          <p className="text-sm text-gray-500">Completed yesterday</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium">Audit preparation</h4>
                          <p className="text-sm text-gray-500">Completed 3 days ago</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Other tabs (workflows, team, communication, sales, marketing, practice, settings) can be added here */}
            {activeTab === "workflows" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Workflow Management</h2>
                <p className="text-gray-600">Automate and track your practice workflows</p>
                {/* Workflow content */}
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Team Management</h2>
                <p className="text-gray-600">Manage staff and team members</p>
                {/* Team content */}
              </div>
            )}

            {activeTab === "communication" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Communication</h2>
                <p className="text-gray-600">Messages and client communication</p>
                {/* Communication content */}
              </div>
            )}

            {activeTab === "sales" && canAccessSales && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sales Pipeline</h2>
                <p className="text-gray-600">Manage prospects and sales opportunities</p>
                {/* Sales content */}
              </div>
            )}

            {activeTab === "marketing" && canAccessMarketing && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
                <p className="text-gray-600">Create and manage marketing campaigns</p>
                {/* Marketing content */}
              </div>
            )}

            {activeTab === "practice" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Practice Management</h2>
                <p className="text-gray-600">Configure practice settings and permissions</p>
                {/* Practice content */}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">System Settings</h2>
                <p className="text-gray-600">Configure system preferences and integrations</p>
                {/* Settings content */}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Dialogs */}
      
      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to track work and deadlines</DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
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
                      <Textarea placeholder="Task description" {...field} />
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
              </div>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a comprehensive client record with all business details</DialogDescription>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleCreateClient)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Corporation Ltd." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="businessNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Number</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789RC0001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturing, Retail, Services..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="fiscalYearEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={clientForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Person Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Primary Contact Person</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="contactPersonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="CEO, CFO, Owner..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>
              </div>

              {/* Business Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Address</h3>
                <FormField
                  control={clientForm.control}
                  name="businessAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Toronto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input placeholder="ON" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="M1A 1A1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Service Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Service Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="workType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select work type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                            <SelectItem value="tax_preparation">Tax Preparation</SelectItem>
                            <SelectItem value="financial_planning">Financial Planning</SelectItem>
                            <SelectItem value="audit">Audit</SelectItem>
                            <SelectItem value="payroll">Payroll</SelectItem>
                            <SelectItem value="consulting">Consulting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="clientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Notes</h3>
                <FormField
                  control={clientForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional information about this client..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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