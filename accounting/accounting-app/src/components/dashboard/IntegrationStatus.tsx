import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface IntegrationStatusProps {
  isLoading: boolean;
  metrics: any;
}

export default function IntegrationStatus({ isLoading, metrics }: IntegrationStatusProps) {
  const mockIntegrations = [
    {
      id: 1,
      name: "QuickBooks Online",
      status: "connected",
      lastSynced: "Today, 10:45 AM",
      syncPercentage: 100,
      icon: "check",
    },
    {
      id: 2,
      name: "CRM Data",
      status: "connected",
      stats: "42 active",
      completeness: 92,
      icon: "check",
    },
    {
      id: 3,
      name: "Audit Files",
      status: "warning",
      stats: "5 pending updates",
      completeness: 75,
      icon: "warning",
    },
  ];

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">Integration Status</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {isLoading 
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-neutral-100 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-[120px]" />
                    <Skeleton className="h-6 w-[60px]" />
                  </div>
                  <Skeleton className="h-4 w-[150px] mt-2" />
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <Skeleton className="h-3 w-[80px]" />
                      <Skeleton className="h-3 w-[30px]" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              ))
            : mockIntegrations.map((integration) => (
                <div key={integration.id} className="bg-neutral-100 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {integration.icon === "check" ? (
                        <CheckCircle className="text-status-success text-lg mr-2" />
                      ) : (
                        <AlertCircle className="text-status-warning text-lg mr-2" />
                      )}
                      <h3 className="text-base font-medium text-neutral-900">{integration.name}</h3>
                    </div>
                    <Button variant="link" className="text-primary text-sm p-0 h-auto">
                      Settings
                    </Button>
                  </div>
                  
                  <p className="mt-2 text-sm text-neutral-500">
                    {integration.lastSynced ? `Last synced: ${integration.lastSynced}` : integration.stats}
                  </p>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-neutral-700 mb-1">
                      <span>
                        {integration.name === "QuickBooks Online" 
                          ? "Sync Status" 
                          : integration.name === "CRM Data" 
                            ? "Data Completeness" 
                            : "Completion Rate"}
                      </span>
                      <span>
                        {integration.syncPercentage || integration.completeness}%
                      </span>
                    </div>
                    <Progress 
                      value={integration.syncPercentage || integration.completeness} 
                      className="h-2 bg-neutral-300"
                      indicatorClassName={
                        integration.icon === "check" 
                          ? "bg-status-success" 
                          : "bg-status-warning"
                      }
                    />
                  </div>
                </div>
              ))
          }
        </div>
      </CardContent>
    </Card>
  );
}
