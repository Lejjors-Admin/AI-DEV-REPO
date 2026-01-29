import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Filter,
  Eye,
  Settings,
  Target,
  Award,
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Share,
  Star,
  Zap,
  Brain,
  LineChart,
  Calculator,
  Briefcase,
  CreditCard,
  Building,
  Globe,
  Layers,
  Database,
  ChevronRight,
  ChevronDown,
  Info
} from "lucide-react";

interface ExecutiveKPI {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: "increase" | "decrease" | "stable";
  target: number;
  category: "revenue" | "clients" | "operations" | "growth";
}

interface FinancialReport {
  id: string;
  name: string;
  type: "profit_loss" | "cash_flow" | "balance_sheet" | "budget_variance";
  period: string;
  data: Record<string, number>;
  lastUpdated: string;
  status: "current" | "draft" | "archived";
}

interface PredictiveModel {
  id: string;
  name: string;
  type: "revenue_forecast" | "churn_prediction" | "capacity_forecast" | "market_trend";
  accuracy: number;
  prediction: number;
  confidence: number;
  timeframe: string;
  lastUpdated: string;
}

interface CustomReportConfig {
  name: string;
  dimensions: string[];
  metrics: string[];
  filters: Record<string, any>;
  dateRange: { from: Date; to: Date };
  groupBy: string;
  sortBy: string;
}

const reportConfigSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  metrics: z.array(z.string()).min(1, "At least one metric is required"),
  dimensions: z.array(z.string()).min(1, "At least one dimension is required"),
  groupBy: z.string(),
  sortBy: z.string(),
});

export default function BusinessIntelligenceReporting() {
  const [activeTab, setActiveTab] = useState("executive");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [showCustomReportDialog, setShowCustomReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);

  // Form for custom report builder
  const reportForm = useForm({
    resolver: zodResolver(reportConfigSchema),
    defaultValues: {
      name: "",
      metrics: [],
      dimensions: [],
      groupBy: "month",
      sortBy: "date_desc",
    },
  });

  // Mock data for demonstration - in production, these would come from APIs
  const executiveKPIs: ExecutiveKPI[] = [
    {
      name: "Total Revenue",
      value: 2450000,
      unit: "$",
      change: 12.5,
      changeType: "increase",
      target: 2500000,
      category: "revenue"
    },
    {
      name: "Active Clients",
      value: 347,
      unit: "",
      change: 8.2,
      changeType: "increase",
      target: 350,
      category: "clients"
    },
    {
      name: "Gross Profit Margin",
      value: 68.4,
      unit: "%",
      change: 2.1,
      changeType: "increase",
      target: 70,
      category: "revenue"
    },
    {
      name: "Client Retention Rate",
      value: 94.2,
      unit: "%",
      change: 1.8,
      changeType: "increase",
      target: 95,
      category: "clients"
    },
    {
      name: "Avg Revenue Per Client",
      value: 7061,
      unit: "$",
      change: 4.3,
      changeType: "increase",
      target: 7500,
      category: "revenue"
    },
    {
      name: "Team Utilization",
      value: 82.6,
      unit: "%",
      change: -1.2,
      changeType: "decrease",
      target: 85,
      category: "operations"
    },
    {
      name: "Client Acquisition Cost",
      value: 1250,
      unit: "$",
      change: -8.4,
      changeType: "decrease",
      target: 1000,
      category: "growth"
    },
    {
      name: "Service Delivery Time",
      value: 12.3,
      unit: "days",
      change: -5.2,
      changeType: "decrease",
      target: 10,
      category: "operations"
    }
  ];

  const financialReports: FinancialReport[] = [
    {
      id: "pl_2025_01",
      name: "Profit & Loss Statement",
      type: "profit_loss",
      period: "January 2025",
      data: {
        revenue: 245000,
        expenses: 156000,
        gross_profit: 89000,
        net_profit: 67500,
        tax_revenue: 145000,
        audit_revenue: 65000,
        consulting_revenue: 35000
      },
      lastUpdated: "2025-01-15T10:30:00Z",
      status: "current"
    },
    {
      id: "cf_2025_01", 
      name: "Cash Flow Statement",
      type: "cash_flow",
      period: "January 2025",
      data: {
        operating_cash_flow: 89000,
        investing_cash_flow: -12000,
        financing_cash_flow: -5000,
        net_cash_flow: 72000,
        beginning_balance: 145000,
        ending_balance: 217000
      },
      lastUpdated: "2025-01-15T10:30:00Z",
      status: "current"
    }
  ];

  const predictiveModels: PredictiveModel[] = [
    {
      id: "revenue_forecast_q1",
      name: "Q1 Revenue Forecast",
      type: "revenue_forecast",
      accuracy: 92.4,
      prediction: 780000,
      confidence: 87.2,
      timeframe: "Next 3 months",
      lastUpdated: "2025-01-15T08:00:00Z"
    },
    {
      id: "churn_risk_jan",
      name: "Client Churn Risk",
      type: "churn_prediction", 
      accuracy: 89.1,
      prediction: 3.2,
      confidence: 94.5,
      timeframe: "Next 30 days",
      lastUpdated: "2025-01-15T08:00:00Z"
    },
    {
      id: "capacity_forecast_q1",
      name: "Capacity Utilization Forecast",
      type: "capacity_forecast",
      accuracy: 85.7,
      prediction: 87.5,
      confidence: 82.1,
      timeframe: "Next 90 days", 
      lastUpdated: "2025-01-15T08:00:00Z"
    }
  ];

  const availableMetrics = [
    { id: "revenue", name: "Revenue", category: "Financial" },
    { id: "profit", name: "Profit", category: "Financial" },
    { id: "client_count", name: "Client Count", category: "Clients" },
    { id: "utilization", name: "Utilization Rate", category: "Operations" },
    { id: "billable_hours", name: "Billable Hours", category: "Operations" },
    { id: "completion_time", name: "Completion Time", category: "Quality" },
    { id: "client_satisfaction", name: "Client Satisfaction", category: "Quality" }
  ];

  const availableDimensions = [
    { id: "service_line", name: "Service Line" },
    { id: "client_segment", name: "Client Segment" },
    { id: "team_member", name: "Team Member" },
    { id: "department", name: "Department" },
    { id: "client_size", name: "Client Size" },
    { id: "geographic_region", name: "Geographic Region" }
  ];

  // Calculate key insights
  const totalRevenue = executiveKPIs.find(kpi => kpi.name === "Total Revenue")?.value || 0;
  const revenueGrowth = executiveKPIs.find(kpi => kpi.name === "Total Revenue")?.change || 0;
  const clientCount = executiveKPIs.find(kpi => kpi.name === "Active Clients")?.value || 0;
  const profitMargin = executiveKPIs.find(kpi => kpi.name === "Gross Profit Margin")?.value || 0;

  const handleExportReport = (reportId: string, format: "pdf" | "excel" | "csv") => {
    toast({
      title: "Export Started",
      description: `Exporting report in ${format.toUpperCase()} format...`
    });
  };

  const handleCreateCustomReport = (values: any) => {
    console.log("Creating custom report:", values);
    toast({
      title: "Success",
      description: "Custom report created successfully"
    });
    setShowCustomReportDialog(false);
    reportForm.reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Business Intelligence & Reporting</h2>
          <p className="text-gray-600">Advanced analytics, financial insights, and predictive intelligence</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period-bi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCustomReportDialog(true)} data-testid="button-custom-report">
            <Plus className="w-4 h-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Insights Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="flex items-center justify-center mt-1">
                <ArrowUp className="w-3 h-3 text-green-600 mr-1" />
                <span className="text-xs text-green-600">{revenueGrowth}%</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{profitMargin}%</div>
              <div className="text-sm text-gray-600">Profit Margin</div>
              <div className="text-xs text-gray-500">Target: 70%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{clientCount}</div>
              <div className="text-sm text-gray-600">Active Clients</div>
              <div className="text-xs text-gray-500">+8.2% growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">92.4%</div>
              <div className="text-sm text-gray-600">Forecast Accuracy</div>
              <div className="text-xs text-gray-500">AI Predictions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-bi">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="executive" data-testid="tab-executive">Executive</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
          <TabsTrigger value="operational" data-testid="tab-operational">Operational</TabsTrigger>
          <TabsTrigger value="predictive" data-testid="tab-predictive">Predictive</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
        </TabsList>

        {/* Executive Dashboard Tab */}
        <TabsContent value="executive" className="space-y-6" data-testid="content-executive">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {executiveKPIs.map((kpi, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`kpi-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-3 h-3 rounded-full ${
                      kpi.category === "revenue" ? "bg-green-500" :
                      kpi.category === "clients" ? "bg-blue-500" :
                      kpi.category === "operations" ? "bg-purple-500" : "bg-orange-500"
                    }`}></div>
                    <div className="flex items-center gap-1">
                      {kpi.changeType === "increase" ? (
                        <ArrowUp className="w-4 h-4 text-green-600" />
                      ) : kpi.changeType === "decrease" ? (
                        <ArrowDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        kpi.changeType === "increase" ? "text-green-600" :
                        kpi.changeType === "decrease" ? "text-red-600" : "text-gray-400"
                      }`}>
                        {Math.abs(kpi.change)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">{kpi.name}</h3>
                    <div className="text-2xl font-bold">
                      {kpi.unit === "$" && "$"}
                      {kpi.value.toLocaleString()}
                      {kpi.unit === "%" && "%"}
                      {kpi.unit !== "$" && kpi.unit !== "%" && ` ${kpi.unit}`}
                    </div>
                    
                    {/* Progress towards target */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Target</span>
                        <span>
                          {kpi.unit === "$" && "$"}{kpi.target.toLocaleString()}{kpi.unit === "%" && "%"}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((kpi.value / kpi.target) * 100, 100)} 
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500">
                        {((kpi.value / kpi.target) * 100).toFixed(1)}% of target
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Strategic Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Strategic Insights
              </CardTitle>
              <CardDescription>AI-powered business insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: "opportunity",
                    title: "Revenue Growth Opportunity",
                    insight: "Tax service revenue is 12.5% above target. Consider expanding tax preparation capacity for next season.",
                    impact: "Potential +$150k additional revenue",
                    action: "Schedule capacity planning meeting"
                  },
                  {
                    type: "risk",
                    title: "Utilization Rate Concern", 
                    insight: "Team utilization dropped 1.2% below optimal range. May indicate workflow inefficiencies.",
                    impact: "Risk of reduced profitability",
                    action: "Review workflow automation opportunities"
                  },
                  {
                    type: "success",
                    title: "Client Retention Excellence",
                    insight: "Client retention rate of 94.2% exceeds industry benchmark of 89%. Strong client satisfaction drives growth.",
                    impact: "Reduced acquisition costs",
                    action: "Document best practices for replication"
                  }
                ].map((insight, index) => (
                  <Card key={index} className={`p-4 ${
                    insight.type === "opportunity" ? "border-green-200 bg-green-50" :
                    insight.type === "risk" ? "border-red-200 bg-red-50" :
                    "border-blue-200 bg-blue-50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        insight.type === "opportunity" ? "bg-green-600" :
                        insight.type === "risk" ? "bg-red-600" : "bg-blue-600"
                      }`}></div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{insight.insight}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700">{insight.impact}</div>
                          <Button size="sm" variant="outline">
                            {insight.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+18.3%</div>
                    <div className="text-sm text-gray-600">YoY Growth</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">Q4 2024</div>
                      <div className="text-gray-600">$680k</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">Q1 2025 (Est)</div>
                      <div className="text-gray-600">$780k</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">Growth</div>
                      <div className="text-green-600">+14.7%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Client Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">347</div>
                    <div className="text-sm text-gray-600">Active Clients</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">New Clients</div>
                      <div className="text-green-600">+23 this quarter</div>
                    </div>
                    <div>
                      <div className="font-medium">Churn Rate</div>
                      <div className="text-green-600">2.8% (Low)</div>
                    </div>
                    <div>
                      <div className="font-medium">Avg Revenue</div>
                      <div className="text-gray-600">$7,061/client</div>
                    </div>
                    <div>
                      <div className="font-medium">LTV/CAC</div>
                      <div className="text-blue-600">5.6x</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="financial" className="space-y-6" data-testid="content-financial">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {financialReports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`financial-report-${report.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>{report.period}</CardDescription>
                    </div>
                    <Badge variant={report.status === "current" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Key Financial Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(report.data).slice(0, 6).map(([key, value]) => (
                        <div key={key}>
                          <div className="font-medium capitalize">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className={`${
                            key.includes("profit") || key.includes("revenue") ? "text-green-600" :
                            key.includes("expense") || key.includes("cost") ? "text-red-600" :
                            "text-gray-600"
                          }`}>
                            ${value.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Last Updated */}
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(report.lastUpdated).toLocaleDateString()}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View Full Report
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportReport(report.id, "pdf")}>
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportReport(report.id, "excel")}>
                        <Download className="w-3 h-3 mr-1" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget vs Actual Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Budget vs Actual Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { category: "Tax Services", budget: 150000, actual: 165000, variance: 10.0 },
                  { category: "Audit Services", budget: 80000, actual: 75000, variance: -6.25 },
                  { category: "Bookkeeping", budget: 45000, actual: 48000, variance: 6.67 },
                  { category: "Consulting", budget: 35000, actual: 42000, variance: 20.0 },
                  { category: "Operating Expenses", budget: 125000, actual: 118000, variance: -5.6 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.category}</h4>
                      <div className="text-sm text-gray-600">
                        Budget: ${item.budget.toLocaleString()} | Actual: ${item.actual.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        item.variance > 0 ? "text-green-600" : item.variance < 0 ? "text-red-600" : "text-gray-600"
                      }`}>
                        {item.variance > 0 ? "+" : ""}{item.variance.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Variance</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Reports Tab */}
        <TabsContent value="operational" className="space-y-6" data-testid="content-operational">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Process Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { process: "Tax Return Prep", efficiency: 87, benchmark: 85, trend: "up" },
                    { process: "Audit Completion", efficiency: 92, benchmark: 90, trend: "up" },
                    { process: "Bookkeeping Cycle", efficiency: 78, benchmark: 80, trend: "down" },
                    { process: "Client Onboarding", efficiency: 89, benchmark: 85, trend: "up" }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.process}</span>
                        <div className="flex items-center gap-1">
                          {item.trend === "up" ? (
                            <ArrowUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-red-600" />
                          )}
                          <span>{item.efficiency}%</span>
                        </div>
                      </div>
                      <Progress value={item.efficiency} className="h-2" />
                      <div className="text-xs text-gray-500">
                        Benchmark: {item.benchmark}% 
                        {item.efficiency > item.benchmark ? 
                          ` (+${item.efficiency - item.benchmark}% above)` : 
                          ` (${item.efficiency - item.benchmark}% below)`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">96.2%</div>
                    <div className="text-sm text-gray-600">Overall Quality Score</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { metric: "First-Time Accuracy", score: 94.5 },
                      { metric: "Client Satisfaction", score: 97.8 },
                      { metric: "Compliance Rate", score: 99.1 },
                      { metric: "Error Rate", score: 97.2 }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.metric}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={item.score} className="w-16 h-2" />
                          <span className="text-sm font-bold">{item.score}%</span>
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
                  <Clock className="w-5 h-5" />
                  Time Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">12.3</div>
                    <div className="text-sm text-gray-600">Avg Service Delivery (days)</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { service: "Individual Tax Return", time: 3.2, target: 3.0 },
                      { service: "Corporate Tax Return", time: 8.5, target: 7.0 },
                      { service: "Financial Statement", time: 12.1, target: 10.0 },
                      { service: "Business Advisory", time: 18.7, target: 15.0 }
                    ].map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.service}</span>
                          <span className={item.time > item.target ? "text-red-600" : "text-green-600"}>
                            {item.time}d
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((item.time / (item.target * 1.5)) * 100, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500">Target: {item.target} days</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictive Analytics Tab */}
        <TabsContent value="predictive" className="space-y-6" data-testid="content-predictive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictiveModels.map((model) => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow" data-testid={`predictive-model-${model.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        {model.name}
                      </CardTitle>
                      <CardDescription>AI-powered {model.type.replace("_", " ")} analysis</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {model.accuracy}% accuracy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Main Prediction */}
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {model.type === "revenue_forecast" && `$${model.prediction.toLocaleString()}`}
                        {model.type === "churn_prediction" && `${model.prediction}%`}
                        {model.type === "capacity_forecast" && `${model.prediction}%`}
                      </div>
                      <div className="text-sm text-gray-600">{model.timeframe}</div>
                    </div>
                    
                    {/* Model Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Confidence Level</div>
                        <div className="text-gray-600">{model.confidence}%</div>
                      </div>
                      <div>
                        <div className="font-medium">Model Accuracy</div>
                        <div className="text-gray-600">{model.accuracy}%</div>
                      </div>
                    </div>
                    
                    {/* Confidence Indicator */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Confidence</span>
                        <span className="font-medium">{model.confidence}%</span>
                      </div>
                      <Progress value={model.confidence} className="h-2" />
                    </div>
                    
                    {/* Last Updated */}
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Updated {new Date(model.lastUpdated).toLocaleDateString()}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Predictive Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Predictive Insights
              </CardTitle>
              <CardDescription>Machine learning insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: "forecast",
                    title: "Revenue Acceleration Opportunity", 
                    insight: "Q1 2025 revenue forecast shows 14.7% growth potential. Tax season preparation should focus on capacity expansion.",
                    confidence: 92.4,
                    action: "Plan resource allocation for tax season"
                  },
                  {
                    type: "risk",
                    title: "Client Churn Risk Alert",
                    insight: "3 high-value clients show churn risk indicators: reduced engagement and delayed payments.",
                    confidence: 89.1, 
                    action: "Schedule retention calls within 7 days"
                  },
                  {
                    type: "optimization",
                    title: "Capacity Optimization",
                    insight: "Current utilization trends suggest 5% capacity increase needed by March to handle projected demand.",
                    confidence: 85.7,
                    action: "Consider temporary staff or overtime authorization"
                  }
                ].map((insight, index) => (
                  <Card key={index} className={`p-4 ${
                    insight.type === "forecast" ? "border-green-200 bg-green-50" :
                    insight.type === "risk" ? "border-red-200 bg-red-50" :
                    "border-blue-200 bg-blue-50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        insight.type === "forecast" ? "bg-green-600" :
                        insight.type === "risk" ? "bg-red-600" : "bg-blue-600"
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {insight.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{insight.insight}</p>
                        <Button size="sm" variant="outline">
                          {insight.action}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-6" data-testid="content-custom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Custom Report Builder
              </CardTitle>
              <CardDescription>Create personalized reports with flexible dimensions and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Templates */}
                <div>
                  <h4 className="font-medium mb-3">Quick Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: "Client Profitability", desc: "Revenue and profit by client" },
                      { name: "Service Line Performance", desc: "Performance metrics by service" },
                      { name: "Team Productivity", desc: "Utilization and efficiency by team member" }
                    ].map((template, index) => (
                      <Card key={index} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <h5 className="font-medium mb-1">{template.name}</h5>
                        <p className="text-sm text-gray-600">{template.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Recent Custom Reports */}
                <div>
                  <h4 className="font-medium mb-3">Recent Reports</h4>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Q4 Service Line Analysis",
                        created: "2025-01-10",
                        lastRun: "2025-01-15",
                        metrics: ["Revenue", "Profit Margin", "Client Count"]
                      },
                      {
                        name: "Client Satisfaction by Team",
                        created: "2025-01-08", 
                        lastRun: "2025-01-14",
                        metrics: ["Satisfaction Score", "Response Time", "Resolution Rate"]
                      }
                    ].map((report, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{report.name}</h5>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Run
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Created: {new Date(report.created).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Last run: {new Date(report.lastRun).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {report.metrics.map((metric, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom Report Builder Dialog */}
      <Dialog open={showCustomReportDialog} onOpenChange={setShowCustomReportDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>
              Build a custom report with your preferred metrics and dimensions
            </DialogDescription>
          </DialogHeader>
          <Form {...reportForm}>
            <form onSubmit={reportForm.handleSubmit(handleCreateCustomReport)} className="space-y-4">
              <FormField
                control={reportForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter report name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reportForm.control}
                  name="metrics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metrics</FormLabel>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                        {availableMetrics.map((metric) => (
                          <div key={metric.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={metric.id}
                              checked={field.value?.includes(metric.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, metric.id]);
                                } else {
                                  field.onChange(field.value?.filter(id => id !== metric.id));
                                }
                              }}
                            />
                            <label htmlFor={metric.id} className="text-sm">
                              {metric.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reportForm.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions</FormLabel>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                        {availableDimensions.map((dimension) => (
                          <div key={dimension.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={dimension.id}
                              checked={field.value?.includes(dimension.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, dimension.id]);
                                } else {
                                  field.onChange(field.value?.filter(id => id !== dimension.id));
                                }
                              }}
                            />
                            <label htmlFor={dimension.id} className="text-sm">
                              {dimension.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reportForm.control}
                  name="groupBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group By</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grouping" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="quarter">Quarter</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                          <SelectItem value="service_line">Service Line</SelectItem>
                          <SelectItem value="team_member">Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={reportForm.control}
                  name="sortBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort By</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sorting" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="date_desc">Date (Newest)</SelectItem>
                          <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                          <SelectItem value="value_desc">Value (Highest)</SelectItem>
                          <SelectItem value="value_asc">Value (Lowest)</SelectItem>
                          <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCustomReportDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}