import { RefreshCw, FileText, UserPlus, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  isLoading: boolean;
  activities: any[];
}

export default function RecentActivity({ isLoading, activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "qbo_sync":
        return { icon: RefreshCw, bgColor: "bg-primary" };
      case "audit_file":
        return { icon: FileText, bgColor: "bg-accent" };
      case "client_add":
        return { icon: UserPlus, bgColor: "bg-secondary" };
      case "audit_warning":
        return { icon: AlertTriangle, bgColor: "bg-status-warning" };
      default:
        return { icon: RefreshCw, bgColor: "bg-neutral-500" };
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="px-6 py-5 border-b border-neutral-300">
        <h2 className="text-lg font-medium text-neutral-900">Recent Activity</h2>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <li key={i}>
                  <div className="relative pb-8">
                    {i < 3 && (
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-neutral-300" aria-hidden="true"></span>
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div>
                        <div className="relative px-1">
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 py-0">
                        <Skeleton className="h-4 w-[200px] mb-1" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              activities?.map((activity, index) => {
                const { icon: Icon, bgColor } = getActivityIcon(activity.activityType);
                
                return (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {index < activities.length - 1 && (
                        <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-neutral-300" aria-hidden="true"></span>
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div>
                          <div className="relative px-1">
                            <div className={`h-8 w-8 ${bgColor} rounded-full flex items-center justify-center ring-8 ring-white`}>
                              <Icon className="text-white text-sm" />
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 py-0">
                          <div className="text-sm leading-8 text-neutral-900">
                            {activity.description}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
            
            {!isLoading && (!activities || activities.length === 0) && (
              <li className="py-4 text-center text-neutral-500">
                No recent activity
              </li>
            )}
          </ul>
        </div>
        <div className="mt-6">
          <Button variant="link" className="text-sm text-primary p-0 h-auto">
            View all activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
