import { Users, CheckSquare, BarChart2, FileText, ArrowUp, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KeyMetricsProps {
  isLoading: boolean;
  metrics: any;
}

export default function KeyMetrics({ isLoading, metrics }: KeyMetricsProps) {
  const metricsData = [
    {
      id: 1,
      title: "Active Clients",
      value: metrics?.activeClients || 0,
      icon: Users,
      iconBg: "bg-primary bg-opacity-10",
      iconColor: "text-primary",
      trend: { 
        text: "12% increase", 
        color: "text-status-success", 
        icon: ArrowUp 
      }
    },
    {
      id: 2,
      title: "Pending Tasks",
      value: metrics?.pendingTasks || 0,
      icon: CheckSquare,
      iconBg: "bg-accent bg-opacity-10",
      iconColor: "text-accent",
      trend: { 
        text: `${metrics?.tasksDueToday || 0} due today`, 
        color: "text-status-error", 
        icon: ArrowUp 
      }
    },
    {
      id: 3,
      title: "Monthly Revenue",
      value: metrics?.monthlyRevenue ? `$${metrics.monthlyRevenue.toLocaleString()}` : "$0",
      icon: BarChart2,
      iconBg: "bg-secondary bg-opacity-10",
      iconColor: "text-secondary",
      trend: { 
        text: "8.2% growth", 
        color: "text-status-success", 
        icon: ArrowUp 
      }
    },
    {
      id: 4,
      title: "Audit Files",
      value: metrics?.auditFilesCount || 0,
      icon: FileText,
      iconBg: "bg-status-warning bg-opacity-10",
      iconColor: "text-status-warning",
      trend: { 
        text: `${metrics?.auditFilesNeedingUpdate || 0} need updates`, 
        color: "text-status-warning", 
        icon: AlertTriangle 
      }
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-neutral-900 mb-4">Key Metrics</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array(4).fill(0).map((_, i) => (
              <Card key={i} className="shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="ml-5 w-0 flex-1">
                      <Skeleton className="h-4 w-[80px] mb-2" />
                      <Skeleton className="h-6 w-[100px]" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </CardContent>
              </Card>
            ))
          : metricsData.map((metric) => {
              const Icon = metric.icon;
              const TrendIcon = metric.trend.icon;
              
              return (
                <Card key={metric.id} className="shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${metric.iconBg} rounded-full p-3`}>
                        <Icon className={`${metric.iconColor}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-neutral-500 truncate">
                            {metric.title}
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-neutral-900">
                              {metric.value}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className={`flex items-center text-sm font-medium ${metric.trend.color}`}>
                        <TrendIcon className="mr-1.5 h-4 w-4" />
                        <span>{metric.trend.text}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        }
      </div>
    </div>
  );
}
