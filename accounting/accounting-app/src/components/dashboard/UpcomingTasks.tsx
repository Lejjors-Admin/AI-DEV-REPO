import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format, isToday, isTomorrow, addDays } from "date-fns";

interface UpcomingTasksProps {
  isLoading: boolean;
  tasks: any[];
}

export default function UpcomingTasks({ isLoading, tasks }: UpcomingTasksProps) {
  const { toast } = useToast();

  const getTaskDueText = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return "Due today";
    if (isTomorrow(date)) return "Due tomorrow";
    
    const now = new Date();
    const future = addDays(now, 3);
    
    if (date <= future) {
      const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Due in ${days} day${days > 1 ? 's' : ''}`;
    }
    
    return `Due on ${format(date, 'MMM d')}`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-status-error bg-opacity-10 text-status-error";
      case "important":
        return "bg-status-warning bg-opacity-10 text-status-warning";
      case "normal":
        return "bg-neutral-300 text-neutral-700";
      default:
        return "bg-neutral-300 text-neutral-700";
    }
  };

  const handleCompleteTask = async (taskId: number, completed: boolean) => {
    try {
      await apiRequest('PATCH', `/api/tasks/${taskId}`, { completed });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      toast({
        title: completed ? "Task completed" : "Task reopened",
        description: "The task has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="px-6 py-5 border-b border-neutral-300">
        <h2 className="text-lg font-medium text-neutral-900">Upcoming Tasks</h2>
      </CardHeader>
      <CardContent className="p-6">
        <ul className="divide-y divide-neutral-300">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <li key={i} className="py-4 flex">
                <div className="flex-shrink-0 mr-2">
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
                <div className="ml-3 flex-1">
                  <Skeleton className="h-4 w-full max-w-[240px] mb-1" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <div className="ml-2 flex-shrink-0">
                  <Skeleton className="h-5 w-[60px] rounded-full" />
                </div>
              </li>
            ))
          ) : (
            tasks?.filter(task => !task.completed).slice(0, 3).map((task) => (
              <li key={task.id} className="py-4 flex">
                <div className="flex-shrink-0 mr-2">
                  <Checkbox 
                    checked={task.completed}
                    onCheckedChange={(checked) => handleCompleteTask(task.id, !!checked)}
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-neutral-900">{task.description}</p>
                  <p className="text-sm text-neutral-500">{getTaskDueText(task.dueDate)}</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <Badge variant="outline" className={getPriorityBadgeClass(task.priority)}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                </div>
              </li>
            ))
          )}
          
          {!isLoading && (!tasks || tasks.filter(t => !t.completed).length === 0) && (
            <li className="py-4 text-center text-neutral-500">
              No upcoming tasks
            </li>
          )}
        </ul>
        <div className="mt-6">
          <Button variant="link" className="text-sm text-primary p-0 h-auto">
            View all tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
