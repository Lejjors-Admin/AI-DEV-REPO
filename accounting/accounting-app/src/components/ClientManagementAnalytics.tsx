import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Star,
  Heart,
  Phone,
  Mail,
  Calendar,
  Clock,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Filter,
  Search,
  Eye,
  MessageSquare,
  FileText,
  Shield
} from "lucide-react";

interface ClientLifecycleStage {
  stage: string;
  clients: number;
  averageDuration: number;
  conversionRate: number;
}

interface ClientProfitability {
  clientId: number;
  name: string;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  lifetimeValue: number;
  riskLevel: "low" | "medium" | "high";
  satisfactionScore: number;
  engagementLevel: "high" | "medium" | "low";
}

interface ClientSatisfactionMetric {
  clientId: number;
  name: string;
  satisfactionScore: number;
  lastFeedback: string;
  communicationFrequency: number;
  responseTime: number;
  issueResolutionRate: number;
}

export default function ClientManagementAnalytics() {
  const [activeTab, setActiveTab] = useState("lifecycle");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch client profitability data
  const { data: clientProfitability = [], isLoading: profitabilityLoading } = useQuery({
    queryKey: ["/api/analytics/client-profitability", selectedPeriod]
  });

  // Mock data for demonstration (replace with actual API calls)
  const clientLifecycleStages: ClientLifecycleStage[] = [
    { stage: "Prospect", clients: 15, averageDuration: 14, conversionRate: 65 },
    { stage: "Onboarding", clients: 8, averageDuration: 7, conversionRate: 92 },
    { stage: "Active", clients: 127, averageDuration: 365, conversionRate: 98 },
    { stage: "Renewal", clients: 23, averageDuration: 21, conversionRate: 89 },
    { stage: "At Risk", clients: 5, averageDuration: 45, conversionRate: 35 }
  ];

  const topPerformingClients: ClientProfitability[] = clientProfitability?.slice(0, 10).map((client, index) => ({
    clientId: client.clientId,
    name: `Client ${client.clientId}`,
    totalRevenue: client.totalRevenue || Math.random() * 100000,
    totalCosts: (client.totalRevenue || 50000) * 0.6,
    profitMargin: client.grossProfitMargin || Math.random() * 0.4,
    lifetimeValue: client.lifetimeValue || Math.random() * 200000,
    riskLevel: client.retentionProbability > 0.8 ? "low" : client.retentionProbability > 0.6 ? "medium" : "high",
    satisfactionScore: 85 + Math.random() * 15,
    engagementLevel: Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low"
  })) || [];

  const clientSatisfactionData: ClientSatisfactionMetric[] = topPerformingClients.slice(0, 8).map(client => ({
    clientId: client.clientId,
    name: client.name,
    satisfactionScore: client.satisfactionScore,
    lastFeedback: ["Excellent service", "Very responsive", "Professional team", "Great communication"][Math.floor(Math.random() * 4)],
    communicationFrequency: Math.floor(Math.random() * 20) + 5,
    responseTime: Math.floor(Math.random() * 4) + 1,
    issueResolutionRate: 85 + Math.random() * 15
  }));

  // Calculate key metrics
  const totalClients = clientLifecycleStages.reduce((sum, stage) => sum + stage.clients, 0);
  const averageLifetimeValue = topPerformingClients.reduce((sum, client) => sum + client.lifetimeValue, 0) / Math.max(topPerformingClients.length, 1);
  const averageProfitMargin = topPerformingClients.reduce((sum, client) => sum + client.profitMargin, 0) / Math.max(topPerformingClients.length, 1) * 100;
  const clientRetentionRate = 94.2; // Mock percentage
  const averageSatisfactionScore = clientSatisfactionData.reduce((sum, client) => sum + client.satisfactionScore, 0) / Math.max(clientSatisfactionData.length, 1);

  if (profitabilityLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Client Management & Analytics</h2>
          <p className="text-gray-600">Comprehensive client lifecycle and performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period-clients">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-client-analytics">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Clients</div>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalClients}</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.2% vs last period
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-lifetime-value">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg Lifetime Value</div>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">${averageLifetimeValue.toLocaleString()}</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5% vs last period
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-retention-rate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Client Retention</div>
              <Heart className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{clientRetentionRate}%</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +1.8% vs last period
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-satisfaction-score">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Satisfaction Score</div>
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{averageSatisfactionScore.toFixed(1)}/100</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.3% vs last period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-client-analytics">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="lifecycle" data-testid="tab-lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="profitability" data-testid="tab-profitability">Profitability</TabsTrigger>
          <TabsTrigger value="risk" data-testid="tab-risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="satisfaction" data-testid="tab-satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="growth" data-testid="tab-growth">Growth</TabsTrigger>
        </TabsList>

        {/* Client Lifecycle Management Tab */}
        <TabsContent value="lifecycle" className="space-y-6" data-testid="content-lifecycle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Client Lifecycle Stages
              </CardTitle>
              <CardDescription>Track clients through each stage of their journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {clientLifecycleStages.map((stage, index) => (
                  <Card key={stage.stage} className={`text-center p-4 ${
                    stage.stage === "At Risk" ? "border-red-200 bg-red-50" : 
                    stage.stage === "Active" ? "border-green-200 bg-green-50" : ""
                  }`}>
                    <CardContent className="p-0">
                      <div className="text-2xl font-bold text-gray-900">{stage.clients}</div>
                      <div className="text-sm font-medium mb-2">{stage.stage}</div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Avg Duration: {stage.averageDuration}d</div>
                        <div className="flex items-center justify-center gap-1">
                          <div className="text-xs text-gray-500">Conversion:</div>
                          <Badge variant={stage.conversionRate > 80 ? "default" : stage.conversionRate > 60 ? "secondary" : "destructive"} className="text-xs">
                            {stage.conversionRate}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Client Onboarding Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { client: "Tech Solutions Ltd", progress: 85, stage: "Documentation Review", daysRemaining: 3 },
                  { client: "Green Energy Corp", progress: 60, stage: "System Setup", daysRemaining: 5 },
                  { client: "Metro Consulting", progress: 95, stage: "Final Review", daysRemaining: 1 },
                  { client: "Digital Innovations", progress: 40, stage: "Data Collection", daysRemaining: 8 }
                ].map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{client.client}</h4>
                      <p className="text-sm text-gray-600">{client.stage}</p>
                      <Progress value={client.progress} className="w-full mt-2" />
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-bold">{client.progress}%</div>
                      <div className="text-xs text-gray-500">{client.daysRemaining}d remaining</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Profitability Analysis Tab */}
        <TabsContent value="profitability" className="space-y-6" data-testid="content-profitability">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Top Performing Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformingClients.slice(0, 6).map((client, index) => (
                    <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-500">Revenue: ${client.totalRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{(client.profitMargin * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">Margin</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Client Revenue Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { segment: "Enterprise (>$50k)", clients: 12, revenue: 680000, color: "bg-blue-500" },
                    { segment: "Mid-Market ($10k-$50k)", clients: 35, revenue: 420000, color: "bg-green-500" },
                    { segment: "Small Business (<$10k)", clients: 89, revenue: 180000, color: "bg-yellow-500" }
                  ].map((segment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${segment.color}`}></div>
                          <span className="text-sm font-medium">{segment.segment}</span>
                        </div>
                        <span className="text-sm text-gray-600">{segment.clients} clients</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${segment.revenue.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">${(segment.revenue / segment.clients).toLocaleString()} avg/client</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profitability Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Profitability Analysis</CardTitle>
              <CardDescription>Complete profit and cost analysis by client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Client Name</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Costs</th>
                      <th className="text-right p-2">Profit</th>
                      <th className="text-right p-2">Margin</th>
                      <th className="text-right p-2">LTV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPerformingClients.slice(0, 8).map((client) => {
                      const profit = client.totalRevenue - client.totalCosts;
                      return (
                        <tr key={client.clientId} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="font-medium">{client.name}</div>
                          </td>
                          <td className="p-2 text-right">${client.totalRevenue.toLocaleString()}</td>
                          <td className="p-2 text-right">${client.totalCosts.toLocaleString()}</td>
                          <td className="p-2 text-right text-green-600 font-medium">${profit.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <Badge variant={(client.profitMargin * 100) > 25 ? "default" : (client.profitMargin * 100) > 15 ? "secondary" : "destructive"}>
                              {(client.profitMargin * 100).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-2 text-right">${client.lifetimeValue.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6" data-testid="content-risk">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {topPerformingClients.filter(c => c.riskLevel === "low").length}
                </div>
                <div className="text-sm font-medium">Low Risk</div>
                <div className="text-xs text-gray-500 mt-1">Stable, reliable clients</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {topPerformingClients.filter(c => c.riskLevel === "medium").length}
                </div>
                <div className="text-sm font-medium">Medium Risk</div>
                <div className="text-xs text-gray-500 mt-1">Require monitoring</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {topPerformingClients.filter(c => c.riskLevel === "high").length}
                </div>
                <div className="text-sm font-medium">High Risk</div>
                <div className="text-xs text-gray-500 mt-1">Immediate attention needed</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Client Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformingClients.map((client) => (
                  <div key={client.clientId} className={`p-4 border rounded-lg ${
                    client.riskLevel === "high" ? "border-red-200 bg-red-50" :
                    client.riskLevel === "medium" ? "border-yellow-200 bg-yellow-50" :
                    "border-green-200 bg-green-50"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-600">Revenue: ${client.totalRevenue.toLocaleString()}</p>
                      </div>
                      <Badge variant={
                        client.riskLevel === "high" ? "destructive" :
                        client.riskLevel === "medium" ? "secondary" : "default"
                      }>
                        {client.riskLevel} Risk
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Payment Score</div>
                        <div className="font-medium">{client.riskLevel === "high" ? "Poor" : client.riskLevel === "medium" ? "Fair" : "Excellent"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Engagement</div>
                        <div className="font-medium capitalize">{client.engagementLevel}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Satisfaction</div>
                        <div className="font-medium">{client.satisfactionScore.toFixed(1)}/100</div>
                      </div>
                    </div>
                    
                    {client.riskLevel === "high" && (
                      <div className="mt-3 p-2 bg-white rounded border border-red-200">
                        <p className="text-sm text-red-600">⚠️ Recommended actions: Schedule check-in call, review payment terms, assess service satisfaction</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-6" data-testid="content-satisfaction">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Satisfaction Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientSatisfactionData.map((client) => (
                    <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-600 italic">"{client.lastFeedback}"</p>
                        <div className="mt-2">
                          <Progress value={client.satisfactionScore} className="h-2" />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold">{client.satisfactionScore.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">out of 100</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Communication Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientSatisfactionData.map((client) => (
                    <div key={client.clientId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{client.name}</h4>
                        <Badge variant="secondary">{client.responseTime}h avg response</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Communications/Month</div>
                          <div className="font-medium">{client.communicationFrequency}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Resolution Rate</div>
                          <div className="font-medium">{client.issueResolutionRate.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Growth Opportunities Tab */}
        <TabsContent value="growth" className="space-y-6" data-testid="content-growth">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Upselling Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformingClients.slice(0, 6).map((client) => (
                    <div key={client.clientId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{client.name}</h4>
                        <Badge variant="outline">
                          ${(client.totalRevenue * 0.3).toLocaleString()} potential
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Current services: Tax prep, Bookkeeping
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">+ Audit Services</Badge>
                        <Badge variant="secondary" className="text-xs">+ Consulting</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Referral Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformingClients.slice(0, 5).map((client, index) => (
                    <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-600">Referral source</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{Math.floor(Math.random() * 5)} referrals</div>
                        <div className="text-xs text-gray-500">This year</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Expansion Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Service Expansion Analysis</CardTitle>
              <CardDescription>Identify opportunities to expand services with existing clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { service: "Audit Services", clients: 45, potential: "$180k", adoption: 35 },
                  { service: "Strategic Consulting", clients: 62, potential: "$250k", adoption: 48 },
                  { service: "Financial Planning", clients: 38, potential: "$150k", adoption: 28 }
                ].map((service, index) => (
                  <Card key={index} className="text-center">
                    <CardContent className="p-6">
                      <h4 className="font-medium mb-2">{service.service}</h4>
                      <div className="text-2xl font-bold text-green-600 mb-1">{service.potential}</div>
                      <div className="text-sm text-gray-600 mb-3">Revenue potential</div>
                      <div className="text-sm">
                        <div className="font-medium">{service.clients} eligible clients</div>
                        <div className="text-gray-500">{service.adoption}% adoption rate</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}