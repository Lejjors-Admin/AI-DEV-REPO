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
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, FunnelChart, Funnel, LabelList 
} from "recharts";
import { 
  Mail, Send, Users, TrendingUp, DollarSign, Target, Calendar as CalendarIcon,
  Plus, Filter, Search, MoreHorizontal, Edit, Trash2, Eye, Play, Pause, Copy,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, 
  Globe, Facebook, Twitter, Instagram, Youtube, Linkedin, 
  FileText, Image, Video, Download, Upload, Share, Settings,
  Clock, CheckCircle, AlertCircle, XCircle, Zap, Crown,
  Megaphone, Bullhorn, Speaker, Rocket, Star, Award, Gift,
  MousePointer, Activity, Layers, Workflow, Database, Shield,
  Calendar as CalendarIconSolid, ChevronDown, ChevronRight,
  ArrowRight, ArrowUp, ArrowDown, TrendingDown, RefreshCw,
  Hash, AtSign, Link, Phone, MapPin, Calendar as CalIcon
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  type: z.enum(["email", "social_media", "content", "ppc", "webinar", "event", "direct_mail", "seo"]),
  status: z.enum(["draft", "scheduled", "active", "paused", "completed", "cancelled"]).default("draft"),
  budget: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  targetAudience: z.object({
    segments: z.array(z.string()).optional(),
    demographics: z.object({
      ageRange: z.string().optional(),
      gender: z.string().optional(),
      income: z.string().optional(),
      location: z.string().optional()
    }).optional(),
    interests: z.array(z.string()).optional()
  }).optional(),
  goals: z.object({
    primary: z.string().min(1, "Primary goal is required"),
    secondary: z.array(z.string()).optional(),
    leadTarget: z.number().optional(),
    revenueTarget: z.number().optional(),
    conversionTarget: z.number().optional()
  }),
  channels: z.array(z.string()).min(1, "At least one channel is required")
});

const emailCampaignSchema = z.object({
  name: z.string().min(1, "Email campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  preheader: z.string().optional(),
  templateId: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  segmentIds: z.array(z.string()).min(1, "At least one audience segment is required"),
  scheduledAt: z.string().optional(),
  fromName: z.string().min(1, "From name is required"),
  fromEmail: z.string().email("Valid email is required"),
  replyTo: z.string().email("Valid reply-to email is required").optional(),
  trackingEnabled: z.boolean().default(true),
  personalizedSubject: z.boolean().default(false),
  abTestEnabled: z.boolean().default(false),
  abTestSubject: z.string().optional()
});

const leadSourceSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  type: z.enum(["website", "social_media", "email", "referral", "advertising", "event", "cold_outreach", "content", "seo", "other"]),
  url: z.string().url().optional(),
  description: z.string().optional(),
  costPerLead: z.number().optional(),
  active: z.boolean().default(true),
  trackingCode: z.string().optional()
});

const automationWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["form_submission", "email_open", "email_click", "page_visit", "lead_score", "date_based", "manual"]),
  triggerConditions: z.object({
    formId: z.string().optional(),
    emailCampaignId: z.string().optional(),
    pageUrl: z.string().optional(),
    scoreThreshold: z.number().optional(),
    delay: z.number().optional()
  }).optional(),
  actions: z.array(z.object({
    type: z.enum(["send_email", "assign_lead", "update_score", "add_to_segment", "create_task", "send_notification"]),
    parameters: z.record(z.any()),
    delay: z.number().default(0),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than"]),
      value: z.string()
    })).optional()
  })),
  active: z.boolean().default(true)
});

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

const CAMPAIGN_TYPES = [
  { value: "email", label: "Email Marketing", icon: Mail, color: "bg-blue-500" },
  { value: "social_media", label: "Social Media", icon: Share, color: "bg-purple-500" },
  { value: "content", label: "Content Marketing", icon: FileText, color: "bg-green-500" },
  { value: "ppc", label: "Paid Advertising", icon: Target, color: "bg-red-500" },
  { value: "webinar", label: "Webinars", icon: Video, color: "bg-indigo-500" },
  { value: "event", label: "Events", icon: CalendarIcon, color: "bg-orange-500" },
  { value: "direct_mail", label: "Direct Mail", icon: Send, color: "bg-gray-500" },
  { value: "seo", label: "SEO", icon: Search, color: "bg-yellow-500" }
];

const MARKETING_CHANNELS = [
  { id: "email", name: "Email", icon: Mail },
  { id: "website", name: "Website", icon: Globe },
  { id: "social", name: "Social Media", icon: Share },
  { id: "ppc", name: "Paid Ads", icon: Target },
  { id: "content", name: "Content", icon: FileText },
  { id: "referral", name: "Referrals", icon: Users },
  { id: "events", name: "Events", icon: CalendarIcon },
  { id: "seo", name: "SEO", icon: Search }
];

const EMAIL_TEMPLATES = [
  { id: "welcome", name: "Welcome Series", category: "Onboarding" },
  { id: "newsletter", name: "Monthly Newsletter", category: "Nurturing" },
  { id: "service_intro", name: "Service Introduction", category: "Sales" },
  { id: "tax_season", name: "Tax Season Reminder", category: "Seasonal" },
  { id: "follow_up", name: "Follow-up Sequence", category: "Sales" },
  { id: "event_invite", name: "Event Invitation", category: "Events" },
  { id: "case_study", name: "Success Story", category: "Social Proof" },
  { id: "survey", name: "Client Survey", category: "Feedback" }
];

// ============================================================================
// MOCK DATA (will be replaced with real API calls)
// ============================================================================

const mockMarketingMetrics = {
  totalCampaigns: 12,
  activeCampaigns: 5,
  totalLeads: 342,
  qualifiedLeads: 89,
  conversionRate: 26.0,
  costPerLead: 45.50,
  customerAcquisitionCost: 180.00,
  marketingROI: 340,
  emailOpenRate: 24.5,
  emailClickRate: 3.2,
  websiteTraffic: 2150,
  socialEngagement: 1840
};

const mockCampaignData = [
  { id: 1, name: "Q4 Tax Planning Campaign", type: "email", status: "active", budget: 5000, spent: 3200, leads: 45, conversions: 12, roi: 240, startDate: "2024-01-15", endDate: "2024-02-15" },
  { id: 2, name: "Small Business Webinar Series", type: "webinar", status: "active", budget: 3000, spent: 2100, leads: 32, conversions: 8, roi: 150, startDate: "2024-01-10", endDate: "2024-02-28" },
  { id: 3, name: "LinkedIn Thought Leadership", type: "social_media", status: "scheduled", budget: 2000, spent: 0, leads: 0, conversions: 0, roi: 0, startDate: "2024-02-01", endDate: "2024-03-01" },
  { id: 4, name: "Year-End Financial Review", type: "email", status: "completed", budget: 4000, spent: 3800, leads: 67, conversions: 18, roi: 320, startDate: "2023-11-01", endDate: "2023-12-31" },
  { id: 5, name: "Google Ads - Bookkeeping Services", type: "ppc", status: "active", budget: 8000, spent: 5600, leads: 78, conversions: 19, roi: 180, startDate: "2024-01-01", endDate: "2024-03-31" }
];

const mockEmailCampaigns = [
  { id: 1, name: "Welcome New Clients", subject: "Welcome to [Company Name] - Your Financial Success Starts Here", sentCount: 156, openRate: 28.5, clickRate: 4.2, status: "active", lastSent: "2024-01-20" },
  { id: 2, name: "Monthly Newsletter", subject: "January Tax Tips & Business Insights", sentCount: 892, openRate: 22.1, clickRate: 2.8, status: "sent", lastSent: "2024-01-15" },
  { id: 3, name: "Tax Season Reminder", subject: "Important: Tax Season Deadlines Approaching", sentCount: 0, openRate: 0, clickRate: 0, status: "draft", lastSent: null },
  { id: 4, name: "Webinar Invitation", subject: "Free Webinar: Small Business Financial Planning for 2024", sentCount: 445, openRate: 31.2, clickRate: 5.7, status: "sent", lastSent: "2024-01-12" }
];

const mockLeadSources = [
  { id: 1, name: "Website Contact Form", type: "website", leads: 89, conversionRate: 18.5, costPerLead: 0, active: true },
  { id: 2, name: "Google Ads", type: "advertising", leads: 156, conversionRate: 12.3, costPerLead: 35.50, active: true },
  { id: 3, name: "LinkedIn Posts", type: "social_media", leads: 67, conversionRate: 22.1, costPerLead: 12.80, active: true },
  { id: 4, name: "Referral Program", type: "referral", leads: 23, conversionRate: 45.2, costPerLead: 0, active: true },
  { id: 5, name: "Industry Events", type: "event", leads: 34, conversionRate: 28.7, costPerLead: 89.50, active: true }
];

const mockAutomationWorkflows = [
  { id: 1, name: "New Lead Nurturing", triggerType: "form_submission", totalEntered: 234, completed: 156, active: true, conversionRate: 18.5 },
  { id: 2, name: "Email Engagement Follow-up", triggerType: "email_open", totalEntered: 445, completed: 289, active: true, conversionRate: 12.3 },
  { id: 3, name: "Abandoned Form Recovery", triggerType: "page_visit", totalEntered: 89, completed: 23, active: false, conversionRate: 5.2 },
  { id: 4, name: "High-Value Lead Alert", triggerType: "lead_score", totalEntered: 67, completed: 45, active: true, conversionRate: 34.8 }
];

// Chart data
const leadGenerationData = [
  { month: 'Sep', leads: 45, conversions: 12, cost: 1580 },
  { month: 'Oct', leads: 67, conversions: 18, cost: 2340 },
  { month: 'Nov', leads: 89, conversions: 24, cost: 3120 },
  { month: 'Dec', leads: 156, conversions: 42, cost: 4560 },
  { month: 'Jan', leads: 134, conversions: 38, cost: 3890 }
];

const campaignPerformanceData = [
  { name: 'Email', campaigns: 8, leads: 234, conversions: 62, roi: 340 },
  { name: 'Social', campaigns: 3, leads: 89, conversions: 19, roi: 180 },
  { name: 'PPC', campaigns: 2, leads: 156, conversions: 23, roi: 150 },
  { name: 'Content', campaigns: 5, leads: 167, conversions: 45, roi: 290 },
  { name: 'Events', campaigns: 1, leads: 45, conversions: 18, roi: 420 }
];

const conversionFunnelData = [
  { name: 'Website Visitors', value: 5420, fill: '#3b82f6' },
  { name: 'Leads Generated', value: 892, fill: '#10b981' },
  { name: 'Qualified Leads', value: 234, fill: '#f59e0b' },
  { name: 'Proposals Sent', value: 89, fill: '#ef4444' },
  { name: 'Clients Won', value: 23, fill: '#8b5cf6' }
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showNewEmailDialog, setShowNewEmailDialog] = useState(false);
  const [showNewLeadSourceDialog, setShowNewLeadSourceDialog] = useState(false);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showCampaignAnalytics, setShowCampaignAnalytics] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [dateRange, setDateRange] = useState("30d");

  // Fetch marketing data
  const { data: campaigns = mockCampaignData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/marketing/campaigns"],
    queryFn: () => Promise.resolve(mockCampaignData),
  });

  const { data: emailCampaigns = mockEmailCampaigns, isLoading: emailsLoading } = useQuery({
    queryKey: ["/api/marketing/emails"],
    queryFn: () => Promise.resolve(mockEmailCampaigns),
  });

  const { data: leadSources = mockLeadSources } = useQuery({
    queryKey: ["/api/marketing/lead-sources"],
    queryFn: () => Promise.resolve(mockLeadSources),
  });

  const { data: automationWorkflows = mockAutomationWorkflows } = useQuery({
    queryKey: ["/api/marketing/automation"],
    queryFn: () => Promise.resolve(mockAutomationWorkflows),
  });

  const { data: marketingAnalytics = mockMarketingMetrics } = useQuery({
    queryKey: ["/api/marketing/analytics", dateRange],
    queryFn: () => Promise.resolve(mockMarketingMetrics),
  });

  // Form instances
  const campaignForm = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "email",
      status: "draft",
      budget: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      targetAudience: {
        segments: [],
        demographics: {},
        interests: []
      },
      goals: {
        primary: "",
        secondary: [],
        leadTarget: 50,
        revenueTarget: 10000,
        conversionTarget: 15
      },
      channels: []
    },
  });

  const emailForm = useForm({
    resolver: zodResolver(emailCampaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      preheader: "",
      segmentIds: [],
      fromName: "Your Accounting Firm",
      fromEmail: "",
      trackingEnabled: true,
      personalizedSubject: false,
      abTestEnabled: false
    },
  });

  const leadSourceForm = useForm({
    resolver: zodResolver(leadSourceSchema),
    defaultValues: {
      name: "",
      type: "website",
      description: "",
      active: true
    },
  });

  const workflowForm = useForm({
    resolver: zodResolver(automationWorkflowSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "form_submission",
      actions: [],
      active: true
    },
  });

  // Mock mutations (will be replaced with real API calls)
  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Campaign created successfully" });
      setShowNewCampaignDialog(false);
      campaignForm.reset();
    },
  });

  const createEmailMutation = useMutation({
    mutationFn: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Email campaign created successfully" });
      setShowNewEmailDialog(false);
      emailForm.reset();
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-marketing-title">Marketing Hub</h1>
            <p className="text-gray-600">Comprehensive marketing automation and campaign management</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowNewCampaignDialog(true)} data-testid="button-new-campaign">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <Button onClick={() => setShowNewEmailDialog(true)} variant="outline" data-testid="button-new-email">
              <Mail className="h-4 w-4 mr-2" />
              Create Email
            </Button>
            <Button variant="outline" data-testid="button-marketing-reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="emails" data-testid="tab-emails">Email Marketing</TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">Lead Generation</TabsTrigger>
            <TabsTrigger value="automation" data-testid="tab-automation">Automation</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-total-campaigns">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-campaigns">{marketingAnalytics.totalCampaigns}</div>
                  <p className="text-xs text-muted-foreground">
                    {marketingAnalytics.activeCampaigns} active
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-leads">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-leads">{marketingAnalytics.totalLeads}</div>
                  <p className="text-xs text-muted-foreground">
                    {marketingAnalytics.qualifiedLeads} qualified ({marketingAnalytics.conversionRate}%)
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-marketing-roi">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Marketing ROI</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-marketing-roi">{marketingAnalytics.marketingROI}%</div>
                  <p className="text-xs text-muted-foreground">
                    Cost per lead: ${marketingAnalytics.costPerLead}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-email-performance">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Performance</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-email-open-rate">{marketingAnalytics.emailOpenRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {marketingAnalytics.emailClickRate}% click rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Generation Trend */}
              <Card data-testid="card-lead-generation-trend">
                <CardHeader>
                  <CardTitle>Lead Generation Trend</CardTitle>
                  <CardDescription>Monthly lead generation and conversion performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={leadGenerationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'cost' ? `$${value}` : value,
                        name === 'leads' ? 'Leads' : name === 'conversions' ? 'Conversions' : 'Cost'
                      ]} />
                      <Area type="monotone" dataKey="leads" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="conversions" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Campaign Performance by Type */}
              <Card data-testid="card-campaign-performance">
                <CardHeader>
                  <CardTitle>Campaign Performance by Type</CardTitle>
                  <CardDescription>ROI comparison across different campaign types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={campaignPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'roi' ? `${value}%` : value,
                        name === 'leads' ? 'Leads' : name === 'conversions' ? 'Conversions' : 'ROI'
                      ]} />
                      <Bar dataKey="roi" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card data-testid="card-conversion-funnel">
              <CardHeader>
                <CardTitle>Marketing Conversion Funnel</CardTitle>
                <CardDescription>Complete customer journey from awareness to conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                    <Funnel
                      dataKey="value"
                      data={conversionFunnelData}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Campaign Activity */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>Recent Campaign Activity</CardTitle>
                <CardDescription>Latest marketing activities and performance updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 4).map((campaign) => (
                    <div key={campaign.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0">
                        {CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.icon && (
                          <div className={cn("p-2 rounded-lg", CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.color)}>
                            {(() => {
                              const Icon = CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.icon;
                              return Icon ? <Icon className="h-4 w-4 text-white" /> : null;
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {campaign.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {campaign.leads} leads • {campaign.conversions} conversions • {campaign.roi}% ROI
                        </p>
                      </div>
                      <Badge 
                        variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}
                        data-testid={`badge-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                  data-testid="input-search-campaigns"
                />
                <Button variant="outline" size="sm" data-testid="button-filter-campaigns">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setShowNewCampaignDialog(true)} data-testid="button-add-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {campaigns.filter(campaign => 
                campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow" data-testid={`card-campaign-${campaign.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const campaignType = CAMPAIGN_TYPES.find(t => t.value === campaign.type);
                          const Icon = campaignType?.icon;
                          return Icon ? (
                            <div className={cn("p-2 rounded-lg", campaignType.color)}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                          ) : null;
                        })()}
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {campaign.type.replace('_', ' ')} Campaign
                          </CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}
                        data-testid={`badge-campaign-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Budget</p>
                        <p className="font-semibold">${campaign.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Spent</p>
                        <p className="font-semibold">${campaign.spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Leads</p>
                        <p className="font-semibold text-green-600">{campaign.leads}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">ROI</p>
                        <p className={cn("font-semibold", campaign.roi > 200 ? "text-green-600" : campaign.roi > 100 ? "text-yellow-600" : "text-red-600")}>
                          {campaign.roi}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Budget Used</span>
                        <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                      </div>
                      <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">
                        {format(new Date(campaign.startDate), 'MMM d')} - {format(new Date(campaign.endDate), 'MMM d, yyyy')}
                      </p>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" data-testid={`button-view-campaign-${campaign.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-campaign-${campaign.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`button-more-campaign-${campaign.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Email Marketing Tab */}
          <TabsContent value="emails" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search email campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                  data-testid="input-search-emails"
                />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowNewEmailDialog(true)} data-testid="button-create-email">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Email
                </Button>
                <Button variant="outline" data-testid="button-email-templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </div>
            </div>

            <Card data-testid="card-email-campaigns-table">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Open Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Click Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {emailCampaigns.filter(email => 
                        email.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        email.subject.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((email) => (
                        <tr key={email.id} className="hover:bg-gray-50" data-testid={`row-email-${email.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {email.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {email.lastSent ? format(new Date(email.lastSent), 'MMM d, yyyy') : 'Not sent'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {email.subject}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {email.sentCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <span className={cn(
                                email.openRate > 25 ? "text-green-600" : email.openRate > 15 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {email.openRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={cn(
                              email.clickRate > 3 ? "text-green-600" : email.clickRate > 1 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {email.clickRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={email.status === 'sent' ? 'default' : email.status === 'active' ? 'secondary' : 'outline'}
                              data-testid={`badge-email-status-${email.id}`}
                            >
                              {email.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-email-${email.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-email-${email.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-duplicate-email-${email.id}`}>
                                <Copy className="h-4 w-4" />
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

          {/* Lead Generation Tab */}
          <TabsContent value="leads" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Lead Sources</h3>
                <p className="text-sm text-gray-600">Track and manage your lead generation channels</p>
              </div>
              <Button onClick={() => setShowNewLeadSourceDialog(true)} data-testid="button-add-lead-source">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead Source
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {leadSources.map((source) => (
                <Card key={source.id} className="hover:shadow-md transition-shadow" data-testid={`card-lead-source-${source.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "p-2 rounded-lg",
                          source.type === 'website' ? 'bg-blue-500' :
                          source.type === 'advertising' ? 'bg-red-500' :
                          source.type === 'social_media' ? 'bg-purple-500' :
                          source.type === 'referral' ? 'bg-green-500' :
                          source.type === 'event' ? 'bg-orange-500' : 'bg-gray-500'
                        )}>
                          {source.type === 'website' && <Globe className="h-4 w-4 text-white" />}
                          {source.type === 'advertising' && <Target className="h-4 w-4 text-white" />}
                          {source.type === 'social_media' && <Share className="h-4 w-4 text-white" />}
                          {source.type === 'referral' && <Users className="h-4 w-4 text-white" />}
                          {source.type === 'event' && <CalendarIcon className="h-4 w-4 text-white" />}
                        </div>
                        <div>
                          <CardTitle className="text-base">{source.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {source.type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch 
                        checked={source.active} 
                        data-testid={`switch-active-${source.id}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Leads</p>
                        <p className="text-xl font-bold text-blue-600">{source.leads}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Conversion Rate</p>
                        <p className={cn(
                          "text-xl font-bold",
                          source.conversionRate > 20 ? "text-green-600" : 
                          source.conversionRate > 10 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {source.conversionRate}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Cost per Lead</p>
                      <p className="text-lg font-semibold">
                        {source.costPerLead === 0 ? 'Free' : `$${source.costPerLead}`}
                      </p>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" size="sm" data-testid={`button-view-source-${source.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-source-${source.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-analytics-source-${source.id}`}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Marketing Automation</h3>
                <p className="text-sm text-gray-600">Automated workflows to nurture leads and engage prospects</p>
              </div>
              <Button onClick={() => setShowNewWorkflowDialog(true)} data-testid="button-create-workflow">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {automationWorkflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow" data-testid={`card-workflow-${workflow.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "p-2 rounded-lg",
                          workflow.active ? "bg-green-500" : "bg-gray-400"
                        )}>
                          <Workflow className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <CardDescription className="capitalize">
                            {workflow.triggerType.replace('_', ' ')} trigger
                          </CardDescription>
                        </div>
                      </div>
                      <Switch 
                        checked={workflow.active} 
                        data-testid={`switch-workflow-active-${workflow.id}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Entered</p>
                        <p className="text-lg font-bold text-blue-600">{workflow.totalEntered}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="text-lg font-bold text-green-600">{workflow.completed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Conv. Rate</p>
                        <p className={cn(
                          "text-lg font-bold",
                          workflow.conversionRate > 20 ? "text-green-600" : 
                          workflow.conversionRate > 10 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {workflow.conversionRate}%
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span>{Math.round((workflow.completed / workflow.totalEntered) * 100)}%</span>
                      </div>
                      <Progress value={(workflow.completed / workflow.totalEntered) * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" size="sm" data-testid={`button-view-workflow-${workflow.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-workflow-${workflow.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-analytics-workflow-${workflow.id}`}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Marketing Analytics</h3>
                <p className="text-sm text-gray-600">Comprehensive performance metrics and insights</p>
              </div>
              <div className="flex gap-2">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="button-export-analytics">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Advanced Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-customer-acquisition-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customer Acquisition Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${marketingAnalytics.customerAcquisitionCost}</div>
                  <p className="text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3 inline text-green-500" /> 12% vs last month
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-website-traffic">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Website Traffic</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketingAnalytics.websiteTraffic.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 inline text-green-500" /> 18% vs last month
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-social-engagement">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Social Engagement</CardTitle>
                  <Share className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketingAnalytics.socialEngagement.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 inline text-green-500" /> 24% vs last month
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-lead-velocity">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lead Velocity</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.3x</div>
                  <p className="text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 inline text-green-500" /> vs industry avg
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-lead-source-performance">
                <CardHeader>
                  <CardTitle>Lead Source Performance</CardTitle>
                  <CardDescription>Quality and quantity analysis by source</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={leadSources}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
                      <Bar dataKey="conversionRate" fill="#10b981" name="Conversion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card data-testid="card-monthly-trends">
                <CardHeader>
                  <CardTitle>Monthly Marketing Trends</CardTitle>
                  <CardDescription>Lead generation and cost trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={leadGenerationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
                      <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
                      <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} name="Cost ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Campaign Creation Dialog */}
        <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Marketing Campaign</DialogTitle>
              <DialogDescription>
                Set up a comprehensive marketing campaign with targeting, goals, and budget allocation.
              </DialogDescription>
            </DialogHeader>
            <Form {...campaignForm}>
              <form onSubmit={campaignForm.handleSubmit((data) => createCampaignMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={campaignForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Q1 Lead Generation Campaign" {...field} data-testid="input-campaign-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={campaignForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign-type">
                              <SelectValue placeholder="Select campaign type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CAMPAIGN_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                  control={campaignForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your campaign objectives and strategy..." {...field} data-testid="input-campaign-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={campaignForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} data-testid="input-campaign-budget" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={campaignForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-campaign-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={campaignForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-campaign-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={campaignForm.control}
                  name="goals.primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Goal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-primary-goal">
                            <SelectValue placeholder="Select primary campaign goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead_generation">Lead Generation</SelectItem>
                          <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                          <SelectItem value="customer_acquisition">Customer Acquisition</SelectItem>
                          <SelectItem value="customer_retention">Customer Retention</SelectItem>
                          <SelectItem value="revenue_growth">Revenue Growth</SelectItem>
                          <SelectItem value="market_expansion">Market Expansion</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Marketing Channels</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {MARKETING_CHANNELS.map((channel) => (
                      <div key={channel.id} className="flex items-center space-x-2">
                        <Checkbox id={channel.id} data-testid={`checkbox-channel-${channel.id}`} />
                        <label htmlFor={channel.id} className="flex items-center space-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          <channel.icon className="h-4 w-4" />
                          <span>{channel.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCampaignMutation.isPending} data-testid="button-create-campaign-submit">
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Email Campaign Creation Dialog */}
        <Dialog open={showNewEmailDialog} onOpenChange={setShowNewEmailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Design and schedule an email marketing campaign with advanced targeting and automation.
              </DialogDescription>
            </DialogHeader>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit((data) => createEmailMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Monthly Newsletter - January 2024" {...field} data-testid="input-email-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Accounting Firm" {...field} data-testid="input-from-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={emailForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Line</FormLabel>
                      <FormControl>
                        <Input placeholder="Your January Tax Tips & Business Insights" {...field} data-testid="input-email-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="preheader"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preheader Text</FormLabel>
                      <FormControl>
                        <Input placeholder="Important updates and tips for your business..." {...field} data-testid="input-email-preheader" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="hello@yourfirm.com" {...field} data-testid="input-from-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="replyTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reply To</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="support@yourfirm.com" {...field} data-testid="input-reply-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>Email Template</FormLabel>
                  <Select>
                    <SelectTrigger className="mt-2" data-testid="select-email-template">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <FormField
                    control={emailForm.control}
                    name="trackingEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Email Tracking</FormLabel>
                          <p className="text-sm text-muted-foreground">Track opens, clicks, and engagement metrics</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-tracking-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="personalizedSubject"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Personalized Subject Lines</FormLabel>
                          <p className="text-sm text-muted-foreground">Use recipient's name in subject line</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-personalized-subject"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="abTestEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>A/B Testing</FormLabel>
                          <p className="text-sm text-muted-foreground">Test different subject lines or content</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-ab-test-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewEmailDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createEmailMutation.isPending} data-testid="button-create-email-submit">
                    {createEmailMutation.isPending ? "Creating..." : "Create Email Campaign"}
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