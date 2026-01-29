import { Eye } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface RecentClientsProps {
  isLoading: boolean;
  clients: any[];
}

export default function RecentClients({ isLoading, clients }: RecentClientsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-status-success/10 text-status-success";
      case "review":
        return "bg-status-warning/10 text-status-warning";
      case "inactive":
        return "bg-neutral-300 text-neutral-700";
      default:
        return "bg-neutral-300 text-neutral-700";
    }
  };

  const getColorClass = (index: number) => {
    const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-neutral-500"];
    return colors[index % colors.length];
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="px-6 py-5 border-b border-neutral-300 flex justify-between items-center">
        <h2 className="text-lg font-medium text-neutral-900">Recent Clients</h2>
        <Button variant="link" className="text-primary p-0 h-auto">View All</Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead>
              <tr>
                <th className="px-3 py-3 bg-neutral-100 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Client</th>
                <th className="px-3 py-3 bg-neutral-100 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 bg-neutral-100 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Update</th>
                <th className="px-3 py-3 bg-neutral-100"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-300">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="hover:bg-neutral-100">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4">
                          <Skeleton className="h-4 w-[140px] mb-1" />
                          <Skeleton className="h-3 w-[120px]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-[60px] rounded-full" />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-[80px]" />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <Skeleton className="h-4 w-[60px] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : clients?.map((client, index) => (
                <tr key={client.id} className="hover:bg-neutral-100">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full ${getColorClass(index)} text-white flex items-center justify-center`}>
                        <span>{getInitials(client.name)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">{client.name}</div>
                        <div className="text-sm text-neutral-500">{client.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <Badge variant="outline" className={getStatusBadgeClass(client.status)}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {formatDistanceToNow(new Date(client.lastUpdate), { addSuffix: true })}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" className="text-primary hover:text-secondary">
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
              
              {!isLoading && (!clients || clients.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
