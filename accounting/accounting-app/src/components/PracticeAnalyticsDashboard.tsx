import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Calendar,
  FileText,
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  Settings,
  Star,
  ThumbsUp,
  UserCheck,
  BookOpen,
  Gauge,
  Filter
} from "lucide-react";

interface PracticeMetric {
  name: string;
  value: number | string;
  change: number;
  trend: "up" | "down" | "stable";
  target?: number;
}

interface ClientAnalytics {
  clientId: number;
  name: string;
  totalRevenue: number;
  profitability: number;
  satisfactionScore: number;
  riskLevel: "low" | "medium" | "high";
  engagementScore: number;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  category: string;
  completionRate: number;
  averageDuration: number;
  status: "active" | "draft" | "archived";
}

export default function PracticeAnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch practice analytics data
  const { data: practiceAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/practice", selectedPeriod]
  });

  // Fetch client profitability data
  const { data: clientProfitability, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/analytics/client-profitability"]
  });

  // Fetch compliance data
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["/api/compliance"]
  });

  // Fetch resource allocation data
  const { data: resourceData, isLoading: resourceLoading } = useQuery({
    queryKey: ["/api/resource-allocation"]
  });

  // Practice Health Score calculation
  const practiceHealthScore = practiceAnalytics?.overallPerformance === "excellent" ? 95 :
                               practiceAnalytics?.overallPerformance === "good" ? 85 :
                               practiceAnalytics?.overallPerformance === "average" ? 75 :
                               practiceAnalytics?.overallPerformance === "below_average" ? 65 : 55;

  // Key Practice Metrics
  const practiceMetrics: PracticeMetric[] = [
    {
      name: "Total Revenue",
      value: `$${(practiceAnalytics?.totalRevenue || 0).toLocaleString()}`,
      change: 12.5,
      trend: "up"
    },
    {
      name: "Active Clients",
      value: clientProfitability?.length || 0,
      change: 8.2,
      trend: "up"
    },
    {
      name: "Billable Hours",
      value: `${(practiceAnalytics?.billableHours || 0).toFixed(1)}h`,
      change: -2.1,
      trend: "down"
    },
    {
      name: "Team Utilization",
      value: `${(practiceAnalytics?.billableUtilization || 0.75 * 100).toFixed(1)}%`,
      change: 5.3,
      trend: "up",
      target: 80
    },
    {
      name: "Client Satisfaction",
      value: `${(practiceAnalytics?.clientSatisfactionScore || 0.92 * 100).toFixed(1)}%`,
      change: 3.7,
      trend: "up",
      target: 90
    },
    {
      name: "Avg Revenue/Client",
      value: `$${((practiceAnalytics?.totalRevenue || 120000) / Math.max(clientProfitability?.length || 15, 1)).toFixed(0)}`,
      change: 15.8,
      trend: "up"
    }
  ];

  if (analyticsLoading || clientLoading || complianceLoading || resourceLoading) {
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
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Practice Analytics</h2>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Practice Health Scorecard */}
      <Card data-testid="card-practice-health">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            Practice Health Scorecard
          </CardTitle>
          <CardDescription>Overall practice performance and health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">{practiceHealthScore}/100</div>
              <p className="text-sm text-gray-600">Overall Health Score</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              practiceHealthScore >= 90 ? "bg-green-100 text-green-800" :
              practiceHealthScore >= 80 ? "bg-blue-100 text-blue-800" :
              practiceHealthScore >= 70 ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            }`}>
              {practiceHealthScore >= 90 ? "Excellent" :
               practiceHealthScore >= 80 ? "Good" :
               practiceHealthScore >= 70 ? "Average" : "Needs Improvement"}
            </div>
          </div>
          <Progress value={practiceHealthScore} className="mb-4" data-testid="progress-health-score" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">92%</div>
              <div className="text-xs text-gray-600">Client Retention</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">87%</div>
              <div className="text-xs text-gray-600">Staff Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">94%</div>
              <div className="text-xs text-gray-600">On-time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">89%</div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {practiceMetrics.map((metric, index) => (
          <Card key={index} data-testid={`metric-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">{metric.name}</div>
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : metric.trend === "down" ? (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-600" />
                )}
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              
              <div className="flex items-center justify-between">
                <div className={`text-sm font-medium flex items-center ${
                  metric.trend === "up" ? "text-green-600" : 
                  metric.trend === "down" ? "text-red-600" : "text-gray-600"
                }`}>
                  {metric.trend === "up" ? "+" : metric.trend === "down" ? "-" : ""}
                  {Math.abs(metric.change)}%
                  <span className="text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              
              {metric.target && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Target: {metric.target}%</div>
                  <Progress 
                    value={Math.min((parseFloat(metric.value.toString().replace(/[^\d.]/g, '')) / metric.target) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-analytics">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-clients">Clients</TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">Resources</TabsTrigger>
          <TabsTrigger value="reporting" data-testid="tab-reporting">Reports</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-lg font-bold">${((practiceAnalytics?.totalRevenue || 0) / 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Month</span>
                    <span className="text-lg font-bold">${(((practiceAnalytics?.totalRevenue || 0) / 12) * 0.89).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">YTD Total</span>
                    <span className="text-lg font-bold text-green-600">${(practiceAnalytics?.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Billable Utilization</span>
                    <div className="flex items-center gap-2">
                      <Progress value={75} className="w-20 h-2" />
                      <span className="text-sm font-bold">75%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Capacity Used</span>
                    <div className="flex items-center gap-2">
                      <Progress value={82} className="w-20 h-2" />
                      <span className="text-sm font-bold">82%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Productivity Score</span>
                    <span className="text-sm font-bold text-green-600">8.7/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Practice Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: "workflow", message: "Tax preparation workflow completed for ACME Corp", time: "2 hours ago", status: "completed" },
                  { type: "client", message: "New client onboarding started: Tech Solutions Ltd", time: "4 hours ago", status: "in_progress" },
                  { type: "compliance", message: "HST filing deadline approaching for 3 clients", time: "6 hours ago", status: "warning" },
                  { type: "resource", message: "Senior staff utilization reached 85%", time: "1 day ago", status: "info" },
                  { type: "goal", message: "Monthly revenue target 95% achieved", time: "2 days ago", status: "success" }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === "completed" ? "bg-green-100 text-green-600" :
                      activity.status === "in_progress" ? "bg-blue-100 text-blue-600" :
                      activity.status === "warning" ? "bg-yellow-100 text-yellow-600" :
                      activity.status === "success" ? "bg-green-100 text-green-600" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {activity.type === "workflow" ? <Settings className="w-4 h-4" /> :
                       activity.type === "client" ? <Users className="w-4 h-4" /> :
                       activity.type === "compliance" ? <Shield className="w-4 h-4" /> :
                       activity.type === "resource" ? <Briefcase className="w-4 h-4" /> :
                       <Target className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <Badge variant={
                      activity.status === "completed" || activity.status === "success" ? "default" :
                      activity.status === "warning" ? "destructive" :
                      "secondary"
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Analytics Tab */}
        <TabsContent value="clients" className="space-y-6" data-testid="content-clients">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Client Portfolio Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: "Small Business", count: 12, percentage: 45, color: "bg-blue-500" },
                    { category: "Corporate", count: 8, percentage: 30, color: "bg-green-500" },
                    { category: "Individual", count: 5, percentage: 19, color: "bg-yellow-500" },
                    { category: "Non-Profit", count: 2, percentage: 6, color: "bg-purple-500" }
                  ].map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${category.color}`}></div>
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{category.count} clients</div>
                        <div className="text-xs text-gray-500">{category.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Top Performing Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientProfitability?.slice(0, 5).map((client, index) => (
                    <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{client.name || `Client ${client.clientId}`}</p>
                          <p className="text-sm text-gray-500">Revenue: ${(client.totalRevenue || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{((client.grossProfitMargin || 0.25) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">Margin</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No client data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Risk Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Client Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">18</div>
                  <div className="text-sm font-medium">Low Risk</div>
                  <div className="text-xs text-gray-500">Stable payment, good compliance</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50">
                  <div className="text-2xl font-bold text-yellow-600">7</div>
                  <div className="text-sm font-medium">Medium Risk</div>
                  <div className="text-xs text-gray-500">Monitor payment patterns</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">2</div>
                  <div className="text-sm font-medium">High Risk</div>
                  <div className="text-xs text-gray-500">Immediate attention needed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6" data-testid="content-workflows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Workflow Performance
              </CardTitle>
              <CardDescription>Monitor and optimize your practice workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Tax Preparation", completion: 94, avgDays: 12, status: "active", category: "tax" },
                  { name: "Audit Review", completion: 87, avgDays: 25, status: "active", category: "audit" },
                  { name: "Bookkeeping Setup", completion: 91, avgDays: 8, status: "active", category: "bookkeeping" },
                  { name: "Consultation", completion: 96, avgDays: 3, status: "active", category: "consultation" },
                  { name: "Compliance Check", completion: 89, avgDays: 15, status: "active", category: "compliance" }
                ].map((workflow, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500">Avg: {workflow.avgDays} days</span>
                          <Badge variant="secondary">{workflow.category}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{workflow.completion}%</div>
                      <div className="text-sm text-gray-500">Completion Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6" data-testid="content-resources">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceData?.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{resource.userName || `Staff ${index + 1}`}</p>
                          <p className="text-sm text-gray-500">{resource.role || "Team Member"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{((resource.utilizationRate || 0.75) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">Utilization</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No resource data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Capacity Planning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Capacity</span>
                    <span className="text-lg font-bold">85%</span>
                  </div>
                  <Progress value={85} className="mb-4" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Available Hours</div>
                      <div className="text-gray-500">320h/week</div>
                    </div>
                    <div>
                      <div className="font-medium">Allocated Hours</div>
                      <div className="text-gray-500">272h/week</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reporting Tab */}
        <TabsContent value="reporting" className="space-y-6" data-testid="content-reporting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Business Intelligence Reports
              </CardTitle>
              <CardDescription>Generate and customize practice reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Financial Performance", description: "Revenue, profitability, and financial trends", icon: DollarSign },
                  { name: "Client Analysis", description: "Client portfolio and profitability analysis", icon: Users },
                  { name: "Operational Efficiency", description: "Workflow performance and productivity metrics", icon: Zap },
                  { name: "Compliance Status", description: "Regulatory compliance and risk assessment", icon: Shield },
                  { name: "Team Performance", description: "Staff utilization and capacity analysis", icon: Target },
                  { name: "Executive Summary", description: "High-level KPIs and strategic insights", icon: BarChart3 }
                ].map((report, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <report.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{report.name}</h4>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                      <Button size="sm" variant="outline" className="w-full">
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6" data-testid="content-compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {complianceData?.filter(c => c.status === "compliant").length || 15}
                  </div>
                  <div className="text-sm font-medium">Compliant</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50">
                  <div className="text-2xl font-bold text-yellow-600">
                    {complianceData?.filter(c => c.status === "warning").length || 3}
                  </div>
                  <div className="text-sm font-medium">Warnings</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">
                    {complianceData?.filter(c => c.status === "non_compliant").length || 1}
                  </div>
                  <div className="text-sm font-medium">Non-Compliant</div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { type: "HST Filing", client: "ACME Corp", dueDate: "2025-01-31", status: "compliant" },
                  { type: "T4 Slips", client: "Tech Solutions", dueDate: "2025-02-28", status: "warning" },
                  { type: "Corporate Tax", client: "Green Energy Ltd", dueDate: "2025-03-15", status: "compliant" },
                  { type: "Audit Documentation", client: "Metro Consulting", dueDate: "2025-01-15", status: "non_compliant" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === "compliant" ? "bg-green-500" :
                        item.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                      }`}></div>
                      <div>
                        <p className="font-medium">{item.type}</p>
                        <p className="text-sm text-gray-500">{item.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Due: {item.dueDate}</p>
                      <Badge variant={
                        item.status === "compliant" ? "default" :
                        item.status === "warning" ? "secondary" : "destructive"
                      }>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6" data-testid="content-goals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Practice Goals & Targets
              </CardTitle>
              <CardDescription>Track progress toward strategic objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { 
                    name: "Annual Revenue Target", 
                    target: 500000, 
                    current: 425000, 
                    unit: "$", 
                    period: "2025",
                    category: "financial"
                  },
                  { 
                    name: "Client Acquisition", 
                    target: 50, 
                    current: 38, 
                    unit: "", 
                    period: "2025",
                    category: "growth"
                  },
                  { 
                    name: "Team Utilization Rate", 
                    target: 80, 
                    current: 75, 
                    unit: "%", 
                    period: "Q1 2025",
                    category: "efficiency"
                  },
                  { 
                    name: "Client Satisfaction Score", 
                    target: 95, 
                    current: 92, 
                    unit: "%", 
                    period: "Ongoing",
                    category: "quality"
                  }
                ].map((goal, index) => {
                  const progress = (goal.current / goal.target) * 100;
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{goal.name}</h4>
                          <p className="text-sm text-gray-500">{goal.period}</p>
                        </div>
                        <Badge variant="secondary">{goal.category}</Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Progress</span>
                        <span className="text-sm font-medium">
                          {goal.unit}{goal.current.toLocaleString()} / {goal.unit}{goal.target.toLocaleString()}
                        </span>
                      </div>
                      
                      <Progress value={Math.min(progress, 100)} className="mb-2" />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{progress.toFixed(1)}% complete</span>
                        <span className={progress >= 100 ? "text-green-600" : progress >= 80 ? "text-blue-600" : "text-yellow-600"}>
                          {progress >= 100 ? "Goal Achieved!" : 
                           progress >= 80 ? "On Track" : "Needs Focus"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}