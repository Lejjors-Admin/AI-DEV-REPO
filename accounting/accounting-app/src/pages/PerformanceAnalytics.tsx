import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Star, 
  Target,
  Eye,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface PerformanceMetrics {
  averageProductivity: number;
  productivityChange: number;
  clientSatisfaction: number;
  clientSatisfactionRating: string;
  goalAchievement: number;
  goalsCompleted: number;
  goalsTotal: number;
  rawData?: {
    billableHours: number;
    totalHours: number;
    completedProjects: number;
    totalProjects: number;
    completedTasks: number;
    totalTasks: number;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

interface IndividualPerformance {
  id: number;
  email: string;
  name: string;
  role: string;
  productivity: number;
  hours: string;
  rating: number;
}

export default function PerformanceAnalytics() {
  const [selectedStaff, setSelectedStaff] = useState<IndividualPerformance | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dateRange, setDateRange] = useState<string>("30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [, setLocation] = useLocation();

  const buildQueryParams = () => {
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return `?startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    return `?days=${dateRange}`;
  };

  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/analytics/performance", dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance${buildQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
  });

  const { data: individualPerformance, isLoading: performanceLoading, isError: performanceError} = useQuery<IndividualPerformance[]>({
    queryKey: ["/api/analytics/individual-performance", dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/individual-performance${buildQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch performance');
      return response.json();
    },
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleViewDetails = (staff: IndividualPerformance) => {
    setSelectedStaff(staff);
    setShowDetailsModal(true);
  };

  if (metricsLoading || performanceLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (metricsError || performanceError) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Performance Analytics</CardTitle>
            <CardDescription>
              Unable to load performance data. Please try again later or contact support if the issue persists.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="performance-title">Performance Analytics</h1>
              <p className="text-gray-600 mt-1">Team performance metrics and insights</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]" data-testid="select-date-range">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              {dateRange === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                    data-testid="input-start-date"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                    data-testid="input-end-date"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                data-testid="card-avg-productivity" 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation("/time-tracking")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    Average Productivity
                    <Clock className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold">{metrics?.averageProductivity}%</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics?.rawData?.billableHours}h billable / {metrics?.rawData?.totalHours}h total
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        {(metrics?.productivityChange ?? 0) >= 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">+{metrics?.productivityChange}% from last period</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">{metrics?.productivityChange}% from last period</span>
                          </>
                        )}
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  <Progress value={metrics?.averageProductivity ?? 0} className="mt-4" />
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">How it's calculated:</p>
              <p>({metrics?.rawData?.billableHours}h billable ÷ {metrics?.rawData?.totalHours}h total) × 100 = {metrics?.averageProductivity}%</p>
              <p className="text-xs mt-1 text-gray-400">Click to view time tracking details</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                data-testid="card-client-satisfaction" 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation("/projects")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    Client Satisfaction
                    <BarChart3 className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold">{metrics?.clientSatisfaction}/5</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics?.rawData?.completedProjects} completed / {metrics?.rawData?.totalProjects} total projects
                      </p>
                      <div className="mt-2">
                        {renderStars(Math.round(metrics?.clientSatisfaction ?? 0))}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{metrics?.clientSatisfactionRating}</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">How it's calculated:</p>
              <p>({metrics?.rawData?.completedProjects} completed ÷ {metrics?.rawData?.totalProjects} total) × 5 = {metrics?.clientSatisfaction}/5</p>
              <p className="text-xs mt-1 text-gray-400">Click to view projects</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                data-testid="card-goal-achievement" 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation("/tasks")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    Goal Achievement
                    <CheckCircle2 className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold">{metrics?.goalAchievement}%</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics?.goalsCompleted}/{metrics?.goalsTotal} goals met
                      </p>
                      <Progress value={metrics?.goalAchievement ?? 0} className="mt-2" />
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">How it's calculated:</p>
              <p>({metrics?.goalsCompleted} completed ÷ {metrics?.goalsTotal} total) × 100 = {metrics?.goalAchievement}%</p>
              <p className="text-xs mt-1 text-gray-400">Click to view tasks</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Individual Performance</CardTitle>
            <CardDescription>Team member performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {individualPerformance?.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`staff-performance-${staff.id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium" data-testid={`text-staff-name-${staff.id}`}>{staff.name}</h4>
                      <p className="text-sm text-gray-600">{staff.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Productivity</p>
                      <p className="font-semibold" data-testid={`text-productivity-${staff.id}`}>{staff.productivity}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Hours</p>
                      <p className="font-semibold" data-testid={`text-hours-${staff.id}`}>{staff.hours}h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Rating</p>
                      <div data-testid={`rating-${staff.id}`}>{renderStars(staff.rating)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(staff)}
                      data-testid={`button-view-details-${staff.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!individualPerformance || individualPerformance.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No performance data available. Time entries are needed to calculate metrics.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedStaff && (
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent data-testid="dialog-staff-details">
              <DialogHeader>
                <DialogTitle>Performance Details - {selectedStaff.name}</DialogTitle>
                <DialogDescription>{selectedStaff.role}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedStaff.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="font-medium">{selectedStaff.hours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Productivity Score</p>
                    <p className="font-medium">{selectedStaff.productivity}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Performance Rating</p>
                    <div className="mt-1">{renderStars(selectedStaff.rating)}</div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-2">Productivity Progress</p>
                  <Progress value={selectedStaff.productivity} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}