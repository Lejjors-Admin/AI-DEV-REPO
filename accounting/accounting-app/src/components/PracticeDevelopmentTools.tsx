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
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Lightbulb,
  Rocket,
  Star,
  Building,
  Handshake,
  Mail,
  Phone,
  Globe,
  Filter,
  Search,
  Download,
  RefreshCw,
  Settings,
  Zap,
  Brain,
  Flag,
  Compass,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Share,
  FileText,
  Briefcase,
  Heart,
  ThumbsUp,
  Link
} from "lucide-react";

interface PracticeGoal {
  id: number;
  title: string;
  description: string;
  category: "revenue" | "growth" | "efficiency" | "quality" | "innovation";
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  status: "on_track" | "at_risk" | "behind" | "completed";
  owner: string;
  priority: "low" | "medium" | "high" | "critical";
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
  completedDate?: string;
}

interface StrategicInitiative {
  id: number;
  name: string;
  description: string;
  type: "market_expansion" | "service_development" | "technology" | "partnership" | "talent";
  status: "planning" | "in_progress" | "on_hold" | "completed";
  budget: number;
  spentBudget: number;
  startDate: string;
  endDate: string;
  expectedROI: number;
  actualROI?: number;
  keyMetrics: string[];
  riskLevel: "low" | "medium" | "high";
}

interface MarketingCampaign {
  id: number;
  name: string;
  type: "digital" | "print" | "event" | "referral" | "content";
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  leads: number;
  conversions: number;
  revenue: number;
  channels: string[];
  targetAudience: string;
}

interface Partner {
  id: number;
  name: string;
  type: "referral" | "strategic" | "vendor" | "alliance";
  relationship: "active" | "inactive" | "developing" | "terminated";
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  referralsReceived: number;
  referralsSent: number;
  revenueGenerated: number;
  lastContact: string;
  contractEnd?: string;
  satisfactionScore: number;
}

interface ImprovementProject {
  id: number;
  title: string;
  category: "process" | "technology" | "training" | "quality" | "client_experience";
  description: string;
  status: "idea" | "planning" | "implementation" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  estimatedBenefit: string;
  estimatedCost: number;
  timeframe: string;
  assignee: string;
  progress: number;
  createdDate: string;
  completedDate?: string;
}

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["revenue", "growth", "efficiency", "quality", "innovation"]),
  targetValue: z.number().min(0, "Target value must be positive"),
  unit: z.string().min(1, "Unit is required"),
  targetDate: z.string().min(1, "Target date is required"),
  owner: z.string().min(1, "Owner is required"),
  priority: z.enum(["low", "medium", "high", "critical"])
});

export default function PracticeDevelopmentTools() {
  const [activeTab, setActiveTab] = useState("goals");
  const [selectedPeriod, setSelectedPeriod] = useState("quarterly");
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PracticeGoal | null>(null);

  // Form for creating goals
  const goalForm = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "revenue" as const,
      targetValue: 0,
      unit: "$",
      targetDate: "",
      owner: "",
      priority: "medium" as const
    },
  });

  // Mock data for demonstration
  const practiceGoals: PracticeGoal[] = [
    {
      id: 1,
      title: "Increase Annual Revenue",
      description: "Grow firm revenue by 15% through new client acquisition and service expansion",
      category: "revenue",
      targetValue: 3000000,
      currentValue: 2450000,
      unit: "$",
      targetDate: "2025-12-31",
      status: "on_track",
      owner: "Managing Partner",
      priority: "critical",
      milestones: [
        { id: 1, title: "Q1 Revenue Target", dueDate: "2025-03-31", completed: true, completedDate: "2025-03-28" },
        { id: 2, title: "Q2 Revenue Target", dueDate: "2025-06-30", completed: false },
        { id: 3, title: "Q3 Revenue Target", dueDate: "2025-09-30", completed: false },
        { id: 4, title: "Q4 Revenue Target", dueDate: "2025-12-31", completed: false }
      ],
      createdAt: "2025-01-01",
      updatedAt: "2025-01-15"
    },
    {
      id: 2,
      title: "Improve Client Retention Rate",
      description: "Achieve 96% client retention rate through enhanced service quality and communication",
      category: "quality",
      targetValue: 96,
      currentValue: 94.2,
      unit: "%",
      targetDate: "2025-06-30",
      status: "on_track",
      owner: "Client Services Manager",
      priority: "high",
      milestones: [
        { id: 5, title: "Implement Client Feedback System", dueDate: "2025-02-15", completed: true, completedDate: "2025-02-10" },
        { id: 6, title: "Launch Client Success Program", dueDate: "2025-04-01", completed: false },
        { id: 7, title: "Achieve 95% Retention", dueDate: "2025-05-31", completed: false }
      ],
      createdAt: "2025-01-05",
      updatedAt: "2025-01-14"
    },
    {
      id: 3,
      title: "Digital Transformation Initiative",
      description: "Implement comprehensive digital solutions to improve efficiency by 25%",
      category: "efficiency",
      targetValue: 25,
      currentValue: 12,
      unit: "%",
      targetDate: "2025-08-31",
      status: "behind",
      owner: "Operations Director",
      priority: "high",
      milestones: [
        { id: 8, title: "Software Selection", dueDate: "2025-02-28", completed: true, completedDate: "2025-02-25" },
        { id: 9, title: "Staff Training", dueDate: "2025-05-15", completed: false },
        { id: 10, title: "Full Implementation", dueDate: "2025-08-31", completed: false }
      ],
      createdAt: "2025-01-10",
      updatedAt: "2025-01-15"
    }
  ];

  const strategicInitiatives: StrategicInitiative[] = [
    {
      id: 1,
      name: "SMB Market Expansion",
      description: "Expand services to small and medium businesses in the region",
      type: "market_expansion",
      status: "in_progress",
      budget: 150000,
      spentBudget: 87000,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      expectedROI: 3.2,
      actualROI: 2.8,
      keyMetrics: ["New client acquisition", "Revenue growth", "Market share"],
      riskLevel: "medium"
    },
    {
      id: 2,
      name: "Advisory Services Launch",
      description: "Launch comprehensive business advisory services division",
      type: "service_development",
      status: "planning",
      budget: 200000,
      spentBudget: 25000,
      startDate: "2025-03-01",
      endDate: "2025-10-31",
      expectedROI: 4.1,
      keyMetrics: ["Service utilization", "Client satisfaction", "Revenue contribution"],
      riskLevel: "high"
    }
  ];

  const marketingCampaigns: MarketingCampaign[] = [
    {
      id: 1,
      name: "Tax Season 2025 Campaign",
      type: "digital",
      status: "active",
      budget: 25000,
      spent: 18500,
      startDate: "2025-01-01",
      endDate: "2025-04-15",
      leads: 247,
      conversions: 89,
      revenue: 125000,
      channels: ["Google Ads", "Facebook", "LinkedIn", "Email"],
      targetAudience: "Small business owners and individuals"
    },
    {
      id: 2,
      name: "Professional Referral Program",
      type: "referral",
      status: "active",
      budget: 15000,
      spent: 8200,
      startDate: "2024-10-01",
      endDate: "2025-09-30",
      leads: 156,
      conversions: 67,
      revenue: 89000,
      channels: ["Lawyer partnerships", "Banker referrals", "Insurance agents"],
      targetAudience: "Professional service networks"
    }
  ];

  const partners: Partner[] = [
    {
      id: 1,
      name: "City Law Group",
      type: "referral",
      relationship: "active",
      contactPerson: "Sarah Mitchell",
      email: "sarah@citylawgroup.com",
      phone: "(555) 123-4567",
      website: "www.citylawgroup.com",
      referralsReceived: 23,
      referralsSent: 18,
      revenueGenerated: 67500,
      lastContact: "2025-01-10",
      satisfactionScore: 4.7
    },
    {
      id: 2,
      name: "Regional Bank Partners",
      type: "strategic",
      relationship: "active",
      contactPerson: "Michael Chen",
      email: "m.chen@regionalbank.com",
      phone: "(555) 987-6543",
      website: "www.regionalbank.com",
      referralsReceived: 41,
      referralsSent: 5,
      revenueGenerated: 156000,
      lastContact: "2025-01-08",
      contractEnd: "2025-12-31",
      satisfactionScore: 4.9
    }
  ];

  const improvementProjects: ImprovementProject[] = [
    {
      id: 1,
      title: "Client Portal Enhancement",
      category: "client_experience",
      description: "Upgrade client portal with mobile app and real-time document sharing",
      status: "implementation",
      priority: "high",
      estimatedBenefit: "30% reduction in client communication time",
      estimatedCost: 35000,
      timeframe: "3 months",
      assignee: "Technology Team",
      progress: 65,
      createdDate: "2024-12-01",
      completedDate: undefined
    },
    {
      id: 2,
      title: "Automated Workflow System",
      category: "process",
      description: "Implement automated workflow system for tax preparation and review processes",
      status: "planning",
      priority: "critical",
      estimatedBenefit: "40% efficiency improvement in tax preparation",
      estimatedCost: 75000,
      timeframe: "6 months",
      assignee: "Operations Team",
      progress: 15,
      createdDate: "2025-01-05",
      completedDate: undefined
    }
  ];

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/goals"] });
      setShowGoalDialog(false);
      goalForm.reset();
      toast({ title: "Success", description: "Practice goal created successfully" });
    },
  });

  const handleCreateGoal = (values: any) => {
    createGoalMutation.mutate(values);
  };

  // Calculate summary metrics
  const totalGoals = practiceGoals.length;
  const completedGoals = practiceGoals.filter(g => g.status === "completed").length;
  const onTrackGoals = practiceGoals.filter(g => g.status === "on_track").length;
  const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const totalMarketingROI = marketingCampaigns.reduce((sum, campaign) => {
    const roi = campaign.spent > 0 ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100 : 0;
    return sum + roi;
  }, 0) / marketingCampaigns.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Practice Development Tools</h2>
          <p className="text-gray-600">Strategic planning, goal tracking, and continuous improvement initiatives</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period-development">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowGoalDialog(true)} data-testid="button-new-goal">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-goal-completion">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Goal Completion</div>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{goalCompletionRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-600">{onTrackGoals}/{totalGoals} on track</div>
          </CardContent>
        </Card>

        <Card data-testid="card-marketing-roi">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Marketing ROI</div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalMarketingROI.toFixed(1)}%</div>
            <div className="text-sm text-green-600">Avg campaign return</div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-initiatives">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Active Initiatives</div>
              <Rocket className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{strategicInitiatives.filter(i => i.status === "in_progress").length}</div>
            <div className="text-sm text-purple-600">Strategic projects</div>
          </CardContent>
        </Card>

        <Card data-testid="card-partner-value">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Partner Value</div>
              <Handshake className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">${partners.reduce((sum, p) => sum + p.revenueGenerated, 0).toLocaleString()}</div>
            <div className="text-sm text-orange-600">Revenue generated</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-development">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          <TabsTrigger value="strategic" data-testid="tab-strategic">Strategic</TabsTrigger>
          <TabsTrigger value="marketing" data-testid="tab-marketing">Marketing</TabsTrigger>
          <TabsTrigger value="partnerships" data-testid="tab-partnerships">Partners</TabsTrigger>
          <TabsTrigger value="improvement" data-testid="tab-improvement">Improvement</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-dev-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Goals & Tracking Tab */}
        <TabsContent value="goals" className="space-y-6" data-testid="content-goals">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {practiceGoals.map((goal) => (
              <Card key={goal.id} className={`hover:shadow-lg transition-shadow ${
                goal.status === "behind" ? "border-red-200 bg-red-50" :
                goal.status === "at_risk" ? "border-yellow-200 bg-yellow-50" :
                goal.status === "completed" ? "border-green-200 bg-green-50" : ""
              }`} data-testid={`goal-card-${goal.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <CardDescription className="mt-1">{goal.description}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={
                        goal.status === "completed" ? "default" :
                        goal.status === "on_track" ? "secondary" :
                        goal.status === "at_risk" ? "secondary" : "destructive"
                      }>
                        {goal.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {goal.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {goal.unit === "$" && "$"}{goal.currentValue.toLocaleString()}{goal.unit === "%" && "%"} / 
                          {goal.unit === "$" && "$"}{goal.targetValue.toLocaleString()}{goal.unit === "%" && "%"}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((goal.currentValue / goal.targetValue) * 100, 100)} 
                        className="h-3"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{((goal.currentValue / goal.targetValue) * 100).toFixed(1)}% complete</span>
                        <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Category and Owner */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="font-medium">Category</div>
                        <div className="text-gray-600 capitalize">{goal.category}</div>
                      </div>
                      <div>
                        <div className="font-medium">Owner</div>
                        <div className="text-gray-600">{goal.owner}</div>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div>
                      <div className="text-sm font-medium mb-2">Milestones</div>
                      <div className="space-y-2">
                        {goal.milestones.slice(0, 3).map((milestone) => (
                          <div key={milestone.id} className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${
                              milestone.completed ? "bg-green-500" : "bg-gray-300"
                            }`}></div>
                            <span className={milestone.completed ? "line-through text-gray-500" : ""}>
                              {milestone.title}
                            </span>
                          </div>
                        ))}
                        {goal.milestones.length > 3 && (
                          <div className="text-xs text-gray-500">+{goal.milestones.length - 3} more milestones</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Activity className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Strategic Planning Tab */}
        <TabsContent value="strategic" className="space-y-6" data-testid="content-strategic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Strategic Initiatives
              </CardTitle>
              <CardDescription>Major strategic projects and investments driving practice growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategicInitiatives.map((initiative) => (
                  <Card key={initiative.id} className="p-4" data-testid={`initiative-card-${initiative.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{initiative.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{initiative.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={
                          initiative.status === "in_progress" ? "default" :
                          initiative.status === "completed" ? "secondary" :
                          initiative.status === "on_hold" ? "secondary" : "outline"
                        }>
                          {initiative.status.replace("_", " ")}
                        </Badge>
                        <Badge variant={
                          initiative.riskLevel === "high" ? "destructive" :
                          initiative.riskLevel === "medium" ? "secondary" : "default"
                        } className="text-xs">
                          {initiative.riskLevel} risk
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium">Budget</div>
                        <div className="text-gray-600">${initiative.budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Spent</div>
                        <div className="text-gray-600">${initiative.spentBudget.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Expected ROI</div>
                        <div className="text-green-600">{initiative.expectedROI}x</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Timeline</div>
                        <div className="text-gray-600">
                          {new Date(initiative.startDate).toLocaleDateString()} - 
                          {new Date(initiative.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Budget Utilization</span>
                        <span className="font-medium">
                          {((initiative.spentBudget / initiative.budget) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={(initiative.spentBudget / initiative.budget) * 100} className="h-2" />
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Key Metrics</div>
                      <div className="flex gap-2">
                        {initiative.keyMetrics.map((metric, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t mt-4">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Performance Tab */}
        <TabsContent value="marketing" className="space-y-6" data-testid="content-marketing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {marketingCampaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow" data-testid={`campaign-card-${campaign.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1 capitalize">{campaign.type} campaign</CardDescription>
                    </div>
                    <Badge variant={
                      campaign.status === "active" ? "default" :
                      campaign.status === "completed" ? "secondary" :
                      campaign.status === "paused" ? "secondary" : "outline"
                    }>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{campaign.leads}</div>
                        <div className="text-xs text-gray-600">Leads</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{campaign.conversions}</div>
                        <div className="text-xs text-gray-600">Conversions</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {((campaign.conversions / campaign.leads) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Conversion Rate</div>
                      </div>
                    </div>

                    {/* Budget and ROI */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Budget</div>
                        <div className="text-gray-600">${campaign.budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Spent</div>
                        <div className="text-gray-600">${campaign.spent.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Revenue</div>
                        <div className="text-green-600">${campaign.revenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">ROI</div>
                        <div className="text-green-600">
                          {campaign.spent > 0 ? (((campaign.revenue - campaign.spent) / campaign.spent) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>

                    {/* Budget Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Budget Used</span>
                        <span className="font-medium">{((campaign.spent / campaign.budget) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                    </div>

                    {/* Timeline */}
                    <div className="text-sm">
                      <div className="font-medium mb-1">Campaign Period</div>
                      <div className="text-gray-600">
                        {new Date(campaign.startDate).toLocaleDateString()} - 
                        {new Date(campaign.endDate).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Channels */}
                    <div>
                      <div className="text-sm font-medium mb-2">Channels</div>
                      <div className="flex flex-wrap gap-1">
                        {campaign.channels.map((channel, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Marketing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Marketing Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {marketingCampaigns.reduce((sum, c) => sum + c.leads, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {marketingCampaigns.reduce((sum, c) => sum + c.conversions, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Conversions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${marketingCampaigns.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Revenue Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalMarketingROI.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Average ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partnership Management Tab */}
        <TabsContent value="partnerships" className="space-y-6" data-testid="content-partnerships">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {partners.map((partner) => (
              <Card key={partner.id} className="hover:shadow-lg transition-shadow" data-testid={`partner-card-${partner.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{partner.name}</CardTitle>
                      <CardDescription className="mt-1 capitalize">{partner.type} partner</CardDescription>
                    </div>
                    <Badge variant={
                      partner.relationship === "active" ? "default" :
                      partner.relationship === "developing" ? "secondary" :
                      partner.relationship === "terminated" ? "destructive" : "outline"
                    }>
                      {partner.relationship}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Contact Information */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{partner.contactPerson}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{partner.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{partner.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span>{partner.website}</span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Referrals Received</div>
                        <div className="text-blue-600 font-bold">{partner.referralsReceived}</div>
                      </div>
                      <div>
                        <div className="font-medium">Referrals Sent</div>
                        <div className="text-purple-600 font-bold">{partner.referralsSent}</div>
                      </div>
                      <div>
                        <div className="font-medium">Revenue Generated</div>
                        <div className="text-green-600 font-bold">${partner.revenueGenerated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Satisfaction</div>
                        <div className="text-orange-600 font-bold">{partner.satisfactionScore}/5.0</div>
                      </div>
                    </div>

                    {/* Satisfaction Score */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Partnership Satisfaction</span>
                        <span className="font-medium">{partner.satisfactionScore}/5.0</span>
                      </div>
                      <Progress value={(partner.satisfactionScore / 5) * 100} className="h-2" />
                    </div>

                    {/* Last Contact */}
                    <div className="text-sm">
                      <div className="font-medium mb-1">Last Contact</div>
                      <div className="text-gray-600">
                        {new Date(partner.lastContact).toLocaleDateString()}
                        {partner.contractEnd && (
                          <span className="ml-2">• Contract ends: {new Date(partner.contractEnd).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View Profile
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-3 h-3 mr-1" />
                        Contact
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Continuous Improvement Tab */}
        <TabsContent value="improvement" className="space-y-6" data-testid="content-improvement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Improvement Projects
              </CardTitle>
              <CardDescription>Ongoing initiatives to enhance practice operations and service delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {improvementProjects.map((project) => (
                  <Card key={project.id} className="p-4" data-testid={`improvement-card-${project.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{project.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={
                          project.status === "implementation" ? "default" :
                          project.status === "completed" ? "secondary" :
                          project.status === "planning" ? "outline" :
                          project.status === "cancelled" ? "destructive" : "outline"
                        }>
                          {project.status}
                        </Badge>
                        <Badge variant={
                          project.priority === "critical" ? "destructive" :
                          project.priority === "high" ? "secondary" : "outline"
                        } className="text-xs">
                          {project.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <div className="font-medium">Category</div>
                        <div className="text-gray-600 capitalize">{project.category.replace("_", " ")}</div>
                      </div>
                      <div>
                        <div className="font-medium">Assignee</div>
                        <div className="text-gray-600">{project.assignee}</div>
                      </div>
                      <div>
                        <div className="font-medium">Timeframe</div>
                        <div className="text-gray-600">{project.timeframe}</div>
                      </div>
                      <div>
                        <div className="font-medium">Est. Cost</div>
                        <div className="text-gray-600">${project.estimatedCost.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Expected Benefit</div>
                      <div className="text-sm text-green-600">{project.estimatedBenefit}</div>
                    </div>

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
                        <Activity className="w-3 h-3 mr-1" />
                        Timeline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Improvement Ideas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Improvement Opportunities
              </CardTitle>
              <CardDescription>AI-suggested improvements based on practice performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Client Communication Automation",
                    description: "Implement automated client update emails to reduce manual communication time by 40%",
                    impact: "High",
                    effort: "Medium",
                    category: "client_experience"
                  },
                  {
                    title: "Document Template Standardization",
                    description: "Create standardized templates for common documents to improve consistency and speed",
                    impact: "Medium",
                    effort: "Low",
                    category: "process"
                  },
                  {
                    title: "Staff Cross-Training Program",
                    description: "Cross-train staff across service lines to improve flexibility and utilization",
                    impact: "High",
                    effort: "High",
                    category: "training"
                  }
                ].map((idea, index) => (
                  <Card key={index} className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{idea.title}</h4>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {idea.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {idea.effort} effort
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{idea.description}</p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-xs capitalize">
                        {idea.category.replace("_", " ")}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" />
                        Create Project
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Development Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6" data-testid="content-dev-analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Goal Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{goalCompletionRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Overall Success Rate</div>
                  </div>
                  <div className="space-y-3">
                    {["revenue", "growth", "efficiency", "quality"].map((category) => {
                      const categoryGoals = practiceGoals.filter(g => g.category === category);
                      const completed = categoryGoals.filter(g => g.status === "completed").length;
                      const rate = categoryGoals.length > 0 ? (completed / categoryGoals.length) * 100 : 0;
                      
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{category}</span>
                            <span>{rate.toFixed(0)}%</span>
                          </div>
                          <Progress value={rate} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Investment Returns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">3.2x</div>
                    <div className="text-sm text-gray-600">Average ROI</div>
                  </div>
                  <div className="space-y-3">
                    {strategicInitiatives.map((initiative) => (
                      <div key={initiative.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{initiative.name}</span>
                        <span className="text-green-600">
                          {initiative.actualROI ? `${initiative.actualROI}x` : `${initiative.expectedROI}x (est)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Development Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">8.4</div>
                    <div className="text-sm text-gray-600">Projects per Quarter</div>
                  </div>
                  <div className="space-y-3">
                    {["idea", "planning", "implementation", "completed"].map((status) => {
                      const count = improvementProjects.filter(p => p.status === status).length;
                      return (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="font-medium capitalize">{status}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Practice Goal</DialogTitle>
            <DialogDescription>
              Set a new strategic goal for practice development and growth
            </DialogDescription>
          </DialogHeader>
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(handleCreateGoal)} className="space-y-4">
              <FormField
                control={goalForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter goal title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={goalForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the goal and its importance..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={goalForm.control}
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
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="efficiency">Efficiency</SelectItem>
                          <SelectItem value="quality">Quality</SelectItem>
                          <SelectItem value="innovation">Innovation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
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
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={goalForm.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter target value"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="$">Dollars ($)</SelectItem>
                          <SelectItem value="%">Percentage (%)</SelectItem>
                          <SelectItem value="clients">Clients</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={goalForm.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalForm.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Owner</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter responsible person" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowGoalDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createGoalMutation.isPending}>
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}