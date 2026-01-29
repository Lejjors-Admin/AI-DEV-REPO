/**
 * Executive Dashboard - Phase 7 Reporting & Analytics
 * 
 * Comprehensive real-time executive dashboard with KPIs, analytics, and business intelligence.
 * Provides accounting firm leadership with key insights for data-driven decision making.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, Users, Clock, Target,
  AlertTriangle, CheckCircle, Calendar as CalendarIcon, RefreshCw,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  Filter, Download, Share, Settings, Bell, Info
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface KPI {
  id: string;
  name: string;
  category: string;
  value: number;
  target?: number;
  change?: number;
  trend: 'up' | 'down' | 'stable';
  rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  description?: string;
  displayOrder: number;
}

interface DashboardFilters {
  periodStart: Date;
  periodEnd: Date;
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  forceRefresh: boolean;
}

export default function ExecutiveDashboard() {
  // State management
  const [filters, setFilters] = useState<DashboardFilters>({
    periodStart: startOfMonth(new Date()),
    periodEnd: new Date(),
    granularity: 'monthly',
    forceRefresh: false
  });
  
  const [selectedKpiCategory, setSelectedKpiCategory] = useState<string>('all');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Fetch executive dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: [
      '/api/dashboard/executive/overview',
      filters.periodStart.toISOString().split('T')[0],
      filters.periodEnd.toISOString().split('T')[0],
      filters.granularity
    ],
    queryFn: () => fetch(
      `/api/dashboard/executive/overview?` + new URLSearchParams({
        periodStart: filters.periodStart.toISOString().split('T')[0],
        periodEnd: filters.periodEnd.toISOString().split('T')[0],
        granularity: filters.granularity,
        forceRefresh: filters.forceRefresh.toString()
      })
    ).then(res => {
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    }),
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });

  // Handle date range changes
  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    let newStart: Date, newEnd: Date;

    switch (preset) {
      case 'today':
        newStart = newEnd = now;
        break;
      case 'yesterday':
        newStart = newEnd = subDays(now, 1);
        break;
      case 'this-week':
        newStart = subDays(now, now.getDay());
        newEnd = now;
        break;
      case 'this-month':
        newStart = startOfMonth(now);
        newEnd = now;
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        newStart = startOfMonth(lastMonth);
        newEnd = endOfMonth(lastMonth);
        break;
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        newStart = new Date(now.getFullYear(), quarter * 3, 1);
        newEnd = now;
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      periodStart: newStart,
      periodEnd: newEnd
    }));
  };

  // Handle force refresh
  const handleForceRefresh = async () => {
    setFilters(prev => ({ ...prev, forceRefresh: true }));
    await refetch();
    setFilters(prev => ({ ...prev, forceRefresh: false }));
    toast({
      title: "Dashboard Refreshed",
      description: "All KPIs have been recalculated with the latest data."
    });
  };

  // Render KPI card
  const renderKpiCard = (kpi: KPI) => {
    const getTrendIcon = () => {
      switch (kpi.trend) {
        case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
        case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
        default: return <Minus className="h-4 w-4 text-gray-600" />;
      }
    };

    const getRatingColor = () => {
      switch (kpi.rating) {
        case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
        case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'average': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'below_average': return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'poor': return 'text-red-600 bg-red-50 border-red-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    const formatValue = (value: number) => {
      if (kpi.name.toLowerCase().includes('revenue') || kpi.name.toLowerCase().includes('profit')) {
        return new Intl.NumberFormat('en-CA', { 
          style: 'currency', 
          currency: 'CAD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      }
      if (kpi.name.toLowerCase().includes('rate') || kpi.name.toLowerCase().includes('margin')) {
        return `${value.toFixed(1)}%`;
      }
      if (kpi.name.toLowerCase().includes('period')) {
        return `${value.toFixed(0)} days`;
      }
      return new Intl.NumberFormat('en-CA').format(value);
    };

    return (
      <Card key={kpi.id} className={cn("cursor-pointer transition-all hover:shadow-md", getRatingColor())}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
            {getTrendIcon()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatValue(kpi.value)}
            </div>
            
            {kpi.target && (
              <div className="text-xs text-muted-foreground">
                Target: {formatValue(kpi.target)}
              </div>
            )}
            
            {kpi.change !== undefined && (
              <div className="flex items-center text-xs">
                {kpi.change > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : kpi.change < 0 ? (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                ) : null}
                <span className={cn(
                  kpi.change > 0 ? 'text-green-600' : 
                  kpi.change < 0 ? 'text-red-600' : 'text-gray-600'
                )}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change?.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last period</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Dashboard Error
            </CardTitle>
            <CardDescription className="text-red-600">
              Failed to load executive dashboard data. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="executive-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time analytics and key performance indicators for your practice
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleForceRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dashboard Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Presets */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Period:</label>
              <Select onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Custom Range:</label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-64 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(filters.periodStart, "MMM d")} - {format(filters.periodEnd, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.periodStart,
                      to: filters.periodEnd
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setFilters(prev => ({
                          ...prev,
                          periodStart: range.from!,
                          periodEnd: range.to!
                        }));
                        setIsDatePickerOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Granularity */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">View:</label>
              <Select 
                value={filters.granularity} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, granularity: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Freshness */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                Last updated: {dashboardData?.summary?.refreshedAt 
                  ? format(new Date(dashboardData.summary.refreshedAt), "MMM d, h:mm a")
                  : "Loading..."
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Dashboard */}
      <Tabs value={selectedKpiCategory} onValueChange={setSelectedKpiCategory}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All KPIs</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key Financial KPIs */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'financial')?.map(renderKpiCard)}
                </div>
              </div>

              {/* Operational KPIs */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Operational Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'operational')?.map(renderKpiCard)}
                </div>
              </div>

              {/* Staff Performance */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Staff Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'staff')?.map(renderKpiCard)}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Individual category tabs would render filtered KPIs */}
        <TabsContent value="financial">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'financial')?.map(renderKpiCard)}
          </div>
        </TabsContent>

        <TabsContent value="operational">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'operational')?.map(renderKpiCard)}
          </div>
        </TabsContent>

        <TabsContent value="client">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'client')?.map(renderKpiCard)}
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData?.kpis?.filter((kpi: KPI) => kpi.category === 'staff')?.map(renderKpiCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Insights and Alerts */}
      {dashboardData?.insights?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Insights & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.insights.map((insight: any, index: number) => (
                <div key={index} className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg",
                  insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                  insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                )}>
                  <Info className={cn(
                    "h-5 w-5 mt-0.5",
                    insight.type === 'positive' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  )} />
                  <div>
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}