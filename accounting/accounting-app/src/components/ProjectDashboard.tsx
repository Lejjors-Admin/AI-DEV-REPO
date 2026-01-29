/**
 * Project Dashboard Component
 * 
 * Comprehensive project analytics and dashboard integration with enhanced backend APIs.
 * Provides project overview, budget analysis, team performance, and real-time metrics.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Users, 
  Target,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Calendar as CalendarIcon,
  Download,
  RefreshCw
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DashboardFilters {
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  projectIds?: number[];
  clientIds?: number[];
  includeCompleted: boolean;
}

interface ProjectOverview {
  summary: {
    projects: {
      total: number;
      active: number;
      completed: number;
      onHold: number;
    };
    budget: {
      total: number;
      actual: number;
      variance: number;
      utilizationRate: number;
    };
    time: {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      billabilityRate: number;
      totalEntries: number;
    };
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      overdue: number;
      completionRate: number;
    };
  };
  healthMetrics: {
    budgetHealthScore: number;
    timeUtilization: number;
    projectVelocity: number;
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  topProjects: Array<{
    project: any;
    client: any;
    timeTracked: number;
    efficiency: number;
  }>;
}

interface BudgetAnalysis {
  project: {
    id: number;
    name: string;
    status: string;
  };
  budgetAnalysis: {
    summary: {
      budgetAmount: number;
      actualAmount: number;
      estimatedFinalCost: number;
      variance: number;
      percentComplete: number;
      projectedOverrun: number;
    };
    timeAnalysis: {
      totalHours: number;
      billableHours: number;
      estimatedCost: number;
      actualCost: number;
    };
    taskBreakdown: Array<{
      taskId: number;
      title: string;
      status: string;
      estimatedHours: number;
      actualHours: number;
      variance: number;
      variancePercentage: number;
    }>;
  };
}

interface TeamPerformance {
  teamMetrics: Array<{
    user: {
      id: number;
      name: string;
      username: string;
      position: string;
    };
    role: string;
    performance: {
      totalHours: number;
      billableHours: number;
      billabilityRate: number;
      tasksAssigned: number;
      tasksCompleted: number;
      completionRate: number;
      averageTaskDuration: number;
    };
  }>;
  overallStats: {
    totalTeamMembers: number;
    totalHours: number;
    totalBillableHours: number;
    averageBillabilityRate: number;
    averageCompletionRate: number;
  };
}

export function ProjectDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    timeframe: 'month',
    includeCompleted: true,
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);

  // Get project overview data
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<{ data: ProjectOverview }>({
    queryKey: ['/api/dashboards/projects/overview', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.projectIds?.length) {
        filters.projectIds.forEach(id => params.append('projectIds[]', id.toString()));
      }
      params.append('timeframe', filters.timeframe);
      params.append('includeCompleted', filters.includeCompleted.toString());

      const response = await apiRequest('GET', `/api/dashboards/projects/overview?${params}`);\n      return response.json();
    }
  });

  // Get project budget analysis for selected project
  const { data: budgetData, isLoading: budgetLoading } = useQuery<{ data: BudgetAnalysis }>({
    queryKey: ['/api/dashboards/projects', selectedProjectId, 'budget-analysis'],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboards/projects/${selectedProjectId}/budget-analysis`);
      return response.json();
    }
  });

  // Get team performance for selected project
  const { data: teamData, isLoading: teamLoading } = useQuery<{ data: TeamPerformance }>({
    queryKey: ['/api/dashboards/projects', selectedProjectId, 'team-performance'],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboards/projects/${selectedProjectId}/team-performance`);
      return response.json();
    }
  });

  // Get projects for dropdown
  const { data: projectsData } = useQuery<{ projects: any[] }>({
    queryKey: ['/api/projects']
  });

  const handleRefresh = () => {
    refetchOverview();
    queryClient.invalidateQueries({ queryKey: ['/api/dashboards'] });
    toast({ title: 'Dashboard refreshed' });
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(parseInt(projectId));
    setActiveTab('budget');
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'warning': return 'outline';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overview = overviewData?.data;
  const budget = budgetData?.data;
  const team = teamData?.data;
  const projects = projectsData?.projects || [];

  return (
    <div className="space-y-6" data-testid="project-dashboard">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Project Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive project analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFiltersDialog(true)}
            data-testid="filters-button"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            data-testid="refresh-button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="budget" data-testid="budget-tab">Budget Analysis</TabsTrigger>
          <TabsTrigger value="team" data-testid="team-tab">Team Performance</TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="portfolio-tab">Portfolio</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : overview ? (
            <>
              {/* Health Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Projects</p>
                        <p className="text-2xl font-bold">{overview.summary.projects.active}</p>
                        <p className="text-sm text-gray-500">
                          {overview.summary.projects.total} total
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Budget Health</p>
                        <p className={`text-2xl font-bold ${getHealthColor(overview.healthMetrics.budgetHealthScore)}`}>
                          {overview.healthMetrics.budgetHealthScore}%
                        </p>
                        <p className="text-sm text-gray-500">
                          ${overview.summary.budget.variance.toLocaleString()} variance
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Billability Rate</p>
                        <p className="text-2xl font-bold">{overview.summary.time.billabilityRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">
                          {overview.summary.time.billableHours.toFixed(1)} billable hrs
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Badge variant={getHealthBadgeVariant(overview.healthMetrics.overallHealth)} className="mr-2">
                        {overview.healthMetrics.overallHealth}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Overall Health</p>
                        <p className="text-2xl font-bold">{overview.summary.tasks.completionRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">task completion</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Budget Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Budget Utilization</span>
                        <span>{overview.summary.budget.utilizationRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={overview.summary.budget.utilizationRate} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Budget</p>
                        <p className="font-semibold">${overview.summary.budget.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Actual Spent</p>
                        <p className="font-semibold">${overview.summary.budget.actual.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Billable vs Non-Billable</span>
                        <span>{overview.summary.time.billabilityRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex gap-1 h-2 bg-gray-200 rounded">
                        <div 
                          className="bg-green-500 rounded-l"
                          style={{ width: `${overview.summary.time.billabilityRate}%` }}
                        ></div>
                        <div 
                          className="bg-gray-400 rounded-r"
                          style={{ width: `${100 - overview.summary.time.billabilityRate}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Hours</p>
                        <p className="font-semibold">{overview.summary.time.totalHours.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Time Entries</p>
                        <p className="font-semibold">{overview.summary.time.totalEntries}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Projects</CardTitle>
                  <CardDescription>
                    Projects ranked by efficiency and budget performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overview.topProjects.map((item, index) => (
                      <div 
                        key={item.project.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleProjectSelect(item.project.id.toString())}
                        data-testid={`top-project-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.project.name}</span>
                            <Badge variant="outline">{item.project.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{item.client?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.efficiency.toFixed(1)}% efficiency</p>
                          <p className="text-sm text-gray-500">{item.timeTracked.toFixed(1)} hrs tracked</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No overview data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Budget Analysis Tab */}
        <TabsContent value="budget" className="space-y-6">
          <div className="flex items-center gap-4">
            <Select onValueChange={handleProjectSelect}>
              <SelectTrigger className="w-64" data-testid="project-select">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {budgetLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : budget ? (
            <>
              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Budget Amount</p>
                        <p className="text-2xl font-bold">
                          ${budget.budgetAnalysis.summary.budgetAmount.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Actual Spent</p>
                        <p className="text-2xl font-bold">
                          ${budget.budgetAnalysis.summary.actualAmount.toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Variance</p>
                        <p className={`text-2xl font-bold ${
                          budget.budgetAnalysis.summary.variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${budget.budgetAnalysis.summary.variance.toLocaleString()}
                        </p>
                      </div>
                      {budget.budgetAnalysis.summary.variance >= 0 ? 
                        <TrendingUp className="h-8 w-8 text-green-600" /> :
                        <TrendingDown className="h-8 w-8 text-red-600" />
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Progress</p>
                        <p className="text-2xl font-bold">
                          {budget.budgetAnalysis.summary.percentComplete.toFixed(1)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Budget Breakdown</CardTitle>
                  <CardDescription>
                    Estimated vs actual hours for each task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {budget.budgetAnalysis.taskBreakdown.map((task) => (
                      <div key={task.taskId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              task.variancePercentage > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {task.variancePercentage > 0 ? '+' : ''}{task.variancePercentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Estimated</p>
                            <p className="font-semibold">{task.estimatedHours.toFixed(1)} hrs</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Actual</p>
                            <p className="font-semibold">{task.actualHours.toFixed(1)} hrs</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Variance</p>
                            <p className={`font-semibold ${
                              task.variance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {task.variance > 0 ? '+' : ''}{task.variance.toFixed(1)} hrs
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : selectedProjectId ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No budget data available for selected project</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Select a project to view budget analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent value="team" className="space-y-6">
          {selectedProjectId ? (
            teamLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : team ? (
              <>
                {/* Team Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Team Size</p>
                          <p className="text-2xl font-bold">{team.overallStats.totalTeamMembers}</p>
                        </div>
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Hours</p>
                          <p className="text-2xl font-bold">{team.overallStats.totalHours.toFixed(1)}</p>
                        </div>
                        <Clock className="h-8 w-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Billability</p>
                          <p className="text-2xl font-bold">
                            {team.overallStats.averageBillabilityRate.toFixed(1)}%
                          </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                          <p className="text-2xl font-bold">
                            {team.overallStats.averageCompletionRate.toFixed(1)}%
                          </p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Team Member Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Member Performance</CardTitle>
                    <CardDescription>
                      Individual performance metrics for project team members
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {team.teamMetrics.map((member) => (
                        <div key={member.user.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium">{member.user.name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{member.role}</Badge>
                                {member.user.position && (
                                  <span className="text-sm text-gray-500">{member.user.position}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Total Hours</p>
                              <p className="font-semibold">{member.performance.totalHours.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Billability</p>
                              <p className="font-semibold">{member.performance.billabilityRate.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Tasks Completed</p>
                              <p className="font-semibold">
                                {member.performance.tasksCompleted}/{member.performance.tasksAssigned}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Completion Rate</p>
                              <p className="font-semibold">{member.performance.completionRate.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No team data available for selected project</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Select a project to view team performance</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Portfolio analysis coming soon...</p>
              <p className="text-sm text-gray-500">
                Multi-project analytics and benchmarking will be available here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Filters Dialog */}
      <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dashboard Filters</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Timeframe</label>
              <Select 
                value={filters.timeframe} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeCompleted"
                checked={filters.includeCompleted}
                onChange={(e) => setFilters(prev => ({ ...prev, includeCompleted: e.target.checked }))}
              />
              <label htmlFor="includeCompleted" className="text-sm">
                Include completed projects
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFiltersDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowFiltersDialog(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}