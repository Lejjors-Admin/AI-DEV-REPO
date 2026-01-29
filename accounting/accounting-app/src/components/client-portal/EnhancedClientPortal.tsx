import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  FileText, 
  Upload, 
  Download,
  DollarSign,
  TrendingUp,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  CreditCard,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Eye,
  FileIcon,
  FolderOpen,
  Star,
  Heart,
  ThumbsUp,
  BookOpen,
  HelpCircle,
  Shield,
  Lock,
  Key,
  Zap,
  TrendingDown,
  Users,
  Activity
} from "lucide-react";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import ClientFinancialAI from "./ClientFinancialAI";
import ClientChatInterface from "./ClientChatInterface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ClientData {
  id: number;
  name: string;
  operatingName?: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  businessNumber?: string;
  taxId?: string;
  industry?: string;
  fiscalYearEnd?: string;
  status: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  accountManager?: string;
  subscription?: {
    plan: string;
    status: string;
    nextBilling?: string;
  };
}

interface ProjectData {
  id: number;
  title: string;
  description?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  assignedTo?: string;
  budget?: number;
  timeSpent?: number;
  tasksTotal?: number;
  tasksCompleted?: number;
}

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  issuedDate: string;
  paidDate?: string;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

interface DocumentData {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  documentType: string;
  status: string;
  isClientVisible: boolean;
  downloadCount: number;
  uploadedAt: string;
  description?: string;
}

interface ActivityData {
  id: number;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800", 
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800"
};

export default function EnhancedClientPortal() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  // Get client data
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: [`/api/client-portal/profile`],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client-portal/profile', { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch client data');
        return await response.json();
      } catch (error) {
        console.error('Error fetching client data:', error);
        return null;
      }
    },
    enabled: !!user?.clientId,
    retry: false,
  });

  // Get projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: [`/api/client-portal/projects`],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client-portal/projects', { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch projects');
        return await response.json();
      } catch (error) {
        console.error('Error fetching projects:', error);
        return { projects: [] };
      }
    },
    enabled: !!user?.clientId,
    retry: false,
  });

  // Get invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: [`/api/client-portal/invoices`, selectedPeriod],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/client-portal/invoices?period=${selectedPeriod}`, { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch invoices');
        return await response.json();
      } catch (error) {
        console.error('Error fetching invoices:', error);
        return { invoices: [], summary: {} };
      }
    },
    enabled: !!user?.clientId,
    retry: false,
  });

  // Get documents
  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/client-portal/documents`],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client-portal/documents', { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch documents');
        return await response.json();
      } catch (error) {
        console.error('Error fetching documents:', error);
        return { documents: [] };
      }
    },
    enabled: !!user?.clientId,
    retry: false,
  });

  // Get activity feed
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: [`/api/client-portal/activity`],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client-portal/activity', { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch activity');
        return await response.json();
      } catch (error) {
        console.error('Error fetching activity:', error);
        return { activities: [] };
      }
    },
    enabled: !!user?.clientId,
    retry: false,
  });

  const client = clientData?.client;
  const projects = projectsData?.projects || [];
  const invoices = invoicesData?.invoices || [];
  const invoiceSummary = invoicesData?.summary || {};
  const documents = documentsData?.documents || [];
  const activities = activityData?.activities || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'on_hold': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_upload': return '📄';
      case 'invoice_sent': return '💰';
      case 'project_update': return '📊';
      case 'message_sent': return '💬';
      case 'payment_received': return '✅';
      case 'deadline_reminder': return '⏰';
      default: return '📋';
    }
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have access to the client portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="client-portal">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {client.operatingName || client.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Client Portal • Account: {client.businessNumber || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {user?.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy & Security
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter((p: ProjectData) => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(invoiceSummary.outstanding || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Next Deadline</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.find((p: ProjectData) => p.dueDate && new Date(p.dueDate) > new Date())
                      ? format(
                          new Date(
                            projects
                              .filter((p: ProjectData) => p.dueDate && new Date(p.dueDate) > new Date())
                              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0].dueDate!
                          ),
                          'MMM d'
                        )
                      : 'None'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">
              <BarChart3 className="h-4 w-4 mr-1" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="projects">
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="billing">
              Billing
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="communication">
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile">
              Profile
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Recent Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects.slice(0, 3).map((project: ProjectData) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getProjectStatusIcon(project.status)}
                          <div>
                            <h4 className="font-medium">{project.title}</h4>
                            <p className="text-sm text-gray-500">
                              {project.dueDate && format(new Date(project.dueDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{project.progress}% Complete</div>
                          <Progress value={project.progress} className="w-20 mt-1" />
                        </div>
                      </div>
                    ))}
                    
                    {projects.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No projects available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.slice(0, 5).map((activity: ActivityData) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <span className="text-lg">{getActivityIcon(activity.type)}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {activities.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Invoiced</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(invoiceSummary.total || 0)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(invoiceSummary.paid || 0)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {formatCurrency(invoiceSummary.outstanding || 0)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(invoiceSummary.overdue || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Financial Overview
                  </CardTitle>
                  <CardDescription>
                    Quick snapshot of your financial position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Assets</p>
                        <p className="text-2xl font-bold text-blue-600">$0.00</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">$0.00</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Expenses</p>
                        <p className="text-2xl font-bold text-orange-600">$0.00</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Net Income</p>
                        <p className="text-2xl font-bold text-purple-600">$0.00</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download Statement
                      </Button>
                      <Button className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        Request Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Financial Assistant */}
              <ClientFinancialAI clientId={client.id} />
            </div>
          </TabsContent>
          
          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>
                  Track progress and details of your ongoing projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="text-center py-8">Loading projects...</div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Projects</h3>
                    <p>You don't have any projects assigned yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project: ProjectData) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                              {getProjectStatusIcon(project.status)}
                              <div>
                                <h3 className="font-semibold">{project.title}</h3>
                                {project.description && (
                                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                                )}
                              </div>
                            </div>
                            <Badge className={statusColors[project.status]}>
                              {project.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Progress</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={project.progress} className="flex-1" />
                                <span className="text-sm font-medium">{project.progress}%</span>
                              </div>
                            </div>
                            {project.dueDate && (
                              <div>
                                <p className="text-sm text-gray-500">Due Date</p>
                                <p className="font-medium">{format(new Date(project.dueDate), 'MMM d, yyyy')}</p>
                              </div>
                            )}
                            {project.assignedTo && (
                              <div>
                                <p className="text-sm text-gray-500">Assigned To</p>
                                <p className="font-medium">{project.assignedTo}</p>
                              </div>
                            )}
                          </div>
                          
                          {(project.tasksTotal || project.timeSpent || project.budget) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                              {project.tasksTotal && (
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Tasks</p>
                                  <p className="font-bold">
                                    {project.tasksCompleted || 0} / {project.tasksTotal}
                                  </p>
                                </div>
                              )}
                              {project.timeSpent && (
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Time Spent</p>
                                  <p className="font-bold">{project.timeSpent}h</p>
                                </div>
                              )}
                              {project.budget && (
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Budget</p>
                                  <p className="font-bold">{formatCurrency(project.budget)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Billing & Invoices</CardTitle>
                    <CardDescription>
                      View and manage your invoices and payment history
                    </CardDescription>
                  </div>
                  
                  <select 
                    value={selectedPeriod} 
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="current_month">Current Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="current_year">Current Year</option>
                    <option value="last_year">Last Year</option>
                    <option value="all_time">All Time</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="text-center py-8">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Invoices</h3>
                    <p>No invoices found for the selected period.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice: InvoiceData) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {invoice.description || 'Professional Services'}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[invoice.status]}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                {invoice.status === 'sent' && (
                                  <DropdownMenuItem>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pay Online
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      Access and download shared documents
                    </CardDescription>
                  </div>
                  
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Documents</h3>
                    <p>No documents have been shared with you yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((document: DocumentData) => (
                      <Card key={document.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <FileIcon className="h-8 w-8 text-blue-500" />
                            <Badge variant="outline" className="text-xs">
                              {document.documentType}
                            </Badge>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-2 truncate">
                            {document.originalName}
                          </h4>
                          
                          {document.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {document.description}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>{document.downloadCount} downloads</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" className="flex-1">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Uploaded {formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <ClientChatInterface 
              clientId={client.id} 
              clientName={client.name}
            />
          </TabsContent>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>
                  View and update your company information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Business Information</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Legal Name:</span>
                        <p>{client.name}</p>
                      </div>
                      {client.operatingName && (
                        <div>
                          <span className="font-medium text-gray-500">Operating Name:</span>
                          <p>{client.operatingName}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-500">Business Number:</span>
                        <p>{client.businessNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Tax ID:</span>
                        <p>{client.taxId || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Industry:</span>
                        <p>{client.industry || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Fiscal Year End:</span>
                        <p>{client.fiscalYearEnd || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Contact Information</h4>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {client.website}
                          </a>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span>{client.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {client.subscription && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-4">Subscription & Services</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Current Plan</p>
                        <p className="font-bold text-blue-600">{client.subscription.plan}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-bold text-green-600">{client.subscription.status}</p>
                      </div>
                      {client.subscription.nextBilling && (
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <p className="text-sm text-gray-600">Next Billing</p>
                          <p className="font-bold text-orange-600">
                            {format(new Date(client.subscription.nextBilling), 'MMM d, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}