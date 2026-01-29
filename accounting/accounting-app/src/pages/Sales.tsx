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
  User,
  Briefcase,
  FileText,
  Settings,
  Activity,
  CheckCircle2,
  Star,
  ArrowRight,
  PhoneCall,
  Video,
  HandShake,
  Trophy,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Zap,
  BarChart3,
  Award
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, isToday, isTomorrow, subDays, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

// Lead form schema
const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  source: z.enum(["website", "referral", "social_media", "email_campaign", "cold_call", "event", "partner", "organic_search", "paid_ads", "other"]),
  budget: z.string().optional(),
  need: z.string().optional(),
  timeline: z.string().optional(),
  assignedToId: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

// Opportunity form schema
const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  estimatedValue: z.string().min(1, "Estimated value is required"),
  probability: z.number().min(0).max(100),
  expectedCloseDate: z.string().min(1, "Expected close date is required"),
  stage: z.enum(["prospect", "qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"]),
  assignedToId: z.number(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

// Sales activity form schema
const activitySchema = z.object({
  type: z.enum(["call", "email", "meeting", "task", "note", "proposal", "follow_up", "demo"]),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  leadId: z.number().optional(),
  opportunityId: z.number().optional(),
  contactMethod: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const STAGE_COLORS = {
  prospect: '#64748b',
  qualification: '#3b82f6',
  needs_analysis: '#8b5cf6',
  proposal: '#f59e0b',
  negotiation: '#ef4444',
  closed_won: '#10b981',
  closed_lost: '#6b7280'
};

export default function Sales() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false);
  const [showNewActivityDialog, setShowNewActivityDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [kanbanFilter, setKanbanFilter] = useState("all");

  // Fetch sales data
  const { data: leads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: ({ signal }) => 
      fetch("/api/leads", { signal })
        .then(res => res.json()),
  });

  const { data: opportunities = [], isLoading: opportunitiesLoading, refetch: refetchOpportunities } = useQuery({
    queryKey: ["/api/opportunities"],
    queryFn: ({ signal }) => 
      fetch("/api/opportunities", { signal })
        .then(res => res.json()),
  });

  const { data: salesActivities = [], refetch: refetchActivities } = useQuery({
    queryKey: ["/api/sales-activities"],
    queryFn: ({ signal }) => 
      fetch("/api/sales-activities", { signal })
        .then(res => res.json()),
  });

  const { data: salesAnalytics = {}, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/sales-analytics"],
    queryFn: ({ signal }) => 
      fetch("/api/sales-analytics", { signal })
        .then(res => res.json()),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: ({ signal }) => 
      fetch("/api/users", { signal })
        .then(res => res.json()),
  });

  // Form instances
  const leadForm = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      jobTitle: "",
      industry: "",
      companySize: "",
      source: "website",
      budget: "",
      need: "",
      timeline: "",
      description: "",
      notes: "",
    },
  });

  const opportunityForm = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedValue: "",
      probability: 10,
      expectedCloseDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      stage: "prospect",
      priority: "medium",
    },
  });

  const activityForm = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: "call",
      subject: "",
      description: "",
      scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      contactMethod: "phone",
      priority: "medium",
    },
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/leads", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Lead created successfully" });
      setShowNewLeadDialog(false);
      leadForm.reset();
      refetchLeads();
      refetchAnalytics();
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create lead", variant: "destructive" });
    },
  });

  const createOpportunityMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/opportunities", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Opportunity created successfully" });
      setShowNewOpportunityDialog(false);
      opportunityForm.reset();
      refetchOpportunities();
      refetchAnalytics();
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/sales-activities", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Activity created successfully" });
      setShowNewActivityDialog(false);
      activityForm.reset();
      refetchActivities();
    },
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PATCH", `/api/opportunities/${id}/stage`, data);
      return response.json();
    },
    onSuccess: () => {
      refetchOpportunities();
      refetchAnalytics();
    },
  });

  // Handle opportunity stage change
  const handleStageChange = (opportunityId, newStage) => {
    const stageProbabilities = {
      prospect: 10,
      qualification: 25,
      needs_analysis: 50,
      proposal: 75,
      negotiation: 90,
      closed_won: 100,
      closed_lost: 0
    };

    updateOpportunityMutation.mutate({
      id: opportunityId,
      data: { stage: newStage, probability: stageProbabilities[newStage] }
    });
  };

  // Filter opportunities by stage for Kanban
  const getOpportunitiesByStage = (stage) => {
    return opportunities.filter(opp => opp.stage === stage);
  };

  // Calculate metrics
  const metrics = {
    totalLeads: leads.length,
    qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
    totalOpportunities: opportunities.length,
    pipelineValue: opportunities.reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0),
    closedDeals: opportunities.filter(opp => opp.stage === 'closed_won').length,
    winRate: opportunities.filter(opp => ['closed_won', 'closed_lost'].includes(opp.stage)).length > 0 
      ? (opportunities.filter(opp => opp.stage === 'closed_won').length / 
         opportunities.filter(opp => ['closed_won', 'closed_lost'].includes(opp.stage)).length * 100).toFixed(1)
      : 0,
    avgDealSize: opportunities.filter(opp => opp.stage === 'closed_won').length > 0
      ? (opportunities.filter(opp => opp.stage === 'closed_won').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) / 
         opportunities.filter(opp => opp.stage === 'closed_won').length).toFixed(0)
      : 0
  };

  // Pipeline data for charts
  const pipelineData = [
    { stage: 'Prospect', count: getOpportunitiesByStage('prospect').length, value: getOpportunitiesByStage('prospect').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) },
    { stage: 'Qualification', count: getOpportunitiesByStage('qualification').length, value: getOpportunitiesByStage('qualification').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) },
    { stage: 'Needs Analysis', count: getOpportunitiesByStage('needs_analysis').length, value: getOpportunitiesByStage('needs_analysis').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) },
    { stage: 'Proposal', count: getOpportunitiesByStage('proposal').length, value: getOpportunitiesByStage('proposal').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) },
    { stage: 'Negotiation', count: getOpportunitiesByStage('negotiation').length, value: getOpportunitiesByStage('negotiation').reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0) }
  ];

  const leadSourceData = leads.reduce((acc, lead) => {
    const source = lead.source || 'other';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const leadSourceChartData = Object.entries(leadSourceData).map(([source, count]) => ({
    name: source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
            <p className="text-gray-600">Manage your sales process from lead to close</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowNewLeadDialog(true)} data-testid="button-new-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
            <Button onClick={() => setShowNewOpportunityDialog(true)} variant="outline" data-testid="button-new-opportunity">
              <Target className="h-4 w-4 mr-2" />
              Add Opportunity
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">Activities</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-total-leads">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-leads">{metrics.totalLeads}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.qualifiedLeads} qualified
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-pipeline-value">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-pipeline-value">
                    ${metrics.pipelineValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalOpportunities} opportunities
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-closed-deals">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-closed-deals">{metrics.closedDeals}</div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-win-rate">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-win-rate">{metrics.winRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Avg deal: ${metrics.avgDealSize}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-pipeline-chart">
                <CardHeader>
                  <CardTitle>Pipeline by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pipelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card data-testid="card-lead-sources">
                <CardHeader>
                  <CardTitle>Lead Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leadSourceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leadSourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card data-testid="card-recent-activities">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {activity.type === 'call' && <PhoneCall className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                        {activity.type === 'meeting' && <Video className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'task' && <CheckCircle className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.subject}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.assignedToName} • {format(new Date(activity.scheduledAt || activity.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                  data-testid="input-search-leads"
                />
                <Button variant="outline" size="sm" data-testid="button-filter-leads">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setShowNewLeadDialog(true)} data-testid="button-add-lead">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>

            <Card data-testid="card-leads-table">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leads.filter(lead => 
                        `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.companyName}`
                          .toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50" data-testid={`row-lead-${lead.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lead.firstName} {lead.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{lead.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lead.companyName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" data-testid={`badge-source-${lead.id}`}>
                              {lead.source?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Progress value={lead.leadScore || 0} className="w-16 mr-2" />
                              <span className="text-sm text-gray-600">{lead.leadScore || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={lead.status === 'qualified' ? 'default' : lead.status === 'converted' ? 'success' : 'secondary'}
                              data-testid={`badge-status-${lead.id}`}
                            >
                              {lead.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lead.assignedToName || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="ghost" data-testid={`button-view-${lead.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" data-testid={`button-edit-${lead.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Tab - Kanban Board */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sales Pipeline</h2>
              <Button onClick={() => setShowNewOpportunityDialog(true)} data-testid="button-add-opportunity">
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {['prospect', 'qualification', 'needs_analysis', 'proposal', 'negotiation'].map((stage) => (
                <Card key={stage} className="min-h-96" data-testid={`column-${stage}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium capitalize">
                        {stage.replace('_', ' ')}
                      </CardTitle>
                      <Badge variant="secondary" data-testid={`badge-count-${stage}`}>
                        {getOpportunitiesByStage(stage).length}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      ${getOpportunitiesByStage(stage).reduce((sum, opp) => sum + parseFloat(opp.estimatedValue || 0), 0).toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getOpportunitiesByStage(stage).map((opportunity) => (
                      <Card 
                        key={opportunity.id} 
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedOpportunity(opportunity)}
                        data-testid={`card-opportunity-${opportunity.id}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-medium line-clamp-2">{opportunity.title}</h4>
                            <Badge 
                              size="sm" 
                              variant={opportunity.priority === 'high' ? 'destructive' : opportunity.priority === 'medium' ? 'default' : 'secondary'}
                            >
                              {opportunity.priority}
                            </Badge>
                          </div>
                          <div className="text-lg font-bold text-green-600">
                            ${parseFloat(opportunity.estimatedValue || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{opportunity.probability}% probability</span>
                            <span>{format(new Date(opportunity.expectedCloseDate), 'MMM d')}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <User className="h-3 w-3 mr-1" />
                            {opportunity.assignedToName || 'Unassigned'}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sales Activities</h2>
              <Button onClick={() => setShowNewActivityDialog(true)} data-testid="button-add-activity">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2" data-testid="card-activity-timeline">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                        <div className="flex-shrink-0 mt-1">
                          {activity.type === 'call' && <PhoneCall className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4 text-green-600" />}
                          {activity.type === 'meeting' && <Video className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'task' && <CheckCircle className="h-4 w-4 text-orange-600" />}
                          {activity.type === 'note' && <FileText className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{activity.subject}</h4>
                            <Badge variant="outline" size="sm">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>{activity.assignedToName}</span>
                            <span>{format(new Date(activity.scheduledAt || activity.createdAt), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-activity-summary">
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Calls</span>
                      <Badge>{salesActivities.filter(a => a.type === 'call').length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Emails</span>
                      <Badge>{salesActivities.filter(a => a.type === 'email').length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Meetings</span>
                      <Badge>{salesActivities.filter(a => a.type === 'meeting').length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tasks</span>
                      <Badge>{salesActivities.filter(a => a.type === 'task').length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Sales Analytics</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-conversion-funnel">
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Leads</span>
                      <span className="font-bold">{metrics.totalLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Qualified Leads</span>
                      <span className="font-bold">{metrics.qualifiedLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Opportunities</span>
                      <span className="font-bold">{metrics.totalOpportunities}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Closed Won</span>
                      <span className="font-bold text-green-600">{metrics.closedDeals}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-performance-metrics">
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Win Rate</span>
                        <span className="text-sm font-medium">{metrics.winRate}%</span>
                      </div>
                      <Progress value={parseFloat(metrics.winRate)} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Lead Conversion</span>
                        <span className="text-sm font-medium">
                          {metrics.totalLeads > 0 ? ((metrics.qualifiedLeads / metrics.totalLeads) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Progress value={metrics.totalLeads > 0 ? (metrics.qualifiedLeads / metrics.totalLeads) * 100 : 0} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Pipeline Coverage</span>
                        <span className="text-sm font-medium">125%</span>
                      </div>
                      <Progress value={125} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Lead Dialog */}
        <Dialog open={showNewLeadDialog} onOpenChange={setShowNewLeadDialog}>
          <DialogContent className="max-w-2xl" data-testid="dialog-new-lead">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Create a new lead in your sales pipeline
              </DialogDescription>
            </DialogHeader>
            <Form {...leadForm}>
              <form onSubmit={leadForm.handleSubmit((data) => createLeadMutation.mutate(data))}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={leadForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leadForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={leadForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leadForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={leadForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Inc." {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leadForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="CEO" {...field} data-testid="input-job-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={leadForm.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="email_campaign">Email Campaign</SelectItem>
                            <SelectItem value="cold_call">Cold Call</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="organic_search">Organic Search</SelectItem>
                            <SelectItem value="paid_ads">Paid Ads</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leadForm.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assigned-to">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={leadForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this lead..." {...field} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowNewLeadDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-submit-lead">
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* New Opportunity Dialog */}
        <Dialog open={showNewOpportunityDialog} onOpenChange={setShowNewOpportunityDialog}>
          <DialogContent className="max-w-2xl" data-testid="dialog-new-opportunity">
            <DialogHeader>
              <DialogTitle>Add New Opportunity</DialogTitle>
              <DialogDescription>
                Create a new opportunity in your sales pipeline
              </DialogDescription>
            </DialogHeader>
            <Form {...opportunityForm}>
              <form onSubmit={opportunityForm.handleSubmit((data) => createOpportunityMutation.mutate(data))}>
                <div className="space-y-4 mb-4">
                  <FormField
                    control={opportunityForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opportunity Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Accounting services for Q1" {...field} data-testid="input-opportunity-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={opportunityForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Details about this opportunity..." {...field} data-testid="textarea-opportunity-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={opportunityForm.control}
                      name="estimatedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Value</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} data-testid="input-estimated-value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={opportunityForm.control}
                      name="probability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probability (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-probability" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={opportunityForm.control}
                      name="expectedCloseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Close Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-close-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={opportunityForm.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger data-testid="select-opportunity-assigned-to">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.firstName} {user.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewOpportunityDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOpportunityMutation.isPending} data-testid="button-submit-opportunity">
                    {createOpportunityMutation.isPending ? "Creating..." : "Create Opportunity"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* New Activity Dialog */}
        <Dialog open={showNewActivityDialog} onOpenChange={setShowNewActivityDialog}>
          <DialogContent data-testid="dialog-new-activity">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
              <DialogDescription>
                Log a new sales activity
              </DialogDescription>
            </DialogHeader>
            <Form {...activityForm}>
              <form onSubmit={activityForm.handleSubmit((data) => createActivityMutation.mutate(data))}>
                <div className="space-y-4 mb-4">
                  <FormField
                    control={activityForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-activity-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                            <SelectItem value="demo">Demo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={activityForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Initial discovery call" {...field} data-testid="input-activity-subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={activityForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Activity details..." {...field} data-testid="textarea-activity-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={activityForm.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-scheduled-at" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewActivityDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createActivityMutation.isPending} data-testid="button-submit-activity">
                    {createActivityMutation.isPending ? "Creating..." : "Create Activity"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}