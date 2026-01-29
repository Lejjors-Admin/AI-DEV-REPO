import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Calendar, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  DollarSign,
  Target,
  Mail,
  Phone,
  Building,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Bot,
  Briefcase,
  FileText,
  PieChart,
  Settings,
  Activity,
  CheckCircle2
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import EnhancedClientCreation from "@/components/EnhancedClientCreation";
import CommunicationHub from "@/components/CommunicationHub";
import PagesSidebar from "@/components/PagesSidebar";

// Tars AI Chat Component (simplified)
function TarsAIChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Tars Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-96 bg-white rounded-lg shadow-xl border z-50 flex flex-col">
          <div className="p-4 border-b bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-medium">Tars AI Office Manager</h3>
            <p className="text-sm opacity-90">Your intelligent practice assistant</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function Pages() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

  // Practice metrics query
  const { data: practiceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"]
  });

  // Safe metrics with proper defaults
  const safeMetrics = {
    totalClients: practiceMetrics?.totalClients || 0,
    activeWorkflows: practiceMetrics?.activeWorkflows || 0,
    totalRevenue: practiceMetrics?.totalRevenue || 0,
    billableHours: practiceMetrics?.billableHours || 0,
    teamUtilization: practiceMetrics?.teamUtilization || 0,
    pipelineValue: practiceMetrics?.pipelineValue || 0
  };

  // Clients query
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"]
  });

  // Tasks query  
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"]
  });

  // Users query
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"]
  });

  // Task form
  const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: z.string().optional()
  });

  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      dueDate: ""
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNewTaskDialog(false);
      taskForm.reset();
      toast({ title: "Success", description: "Task created successfully!" });
    }
  });

  const handleCreateTask = (data: any) => {
    createTaskMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <PagesSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice Management</h1>
              <p className="text-gray-600">Complete practice management with Tars AI office manager</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowNewClientDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
              <Button onClick={() => setShowNewTaskDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Practice Management Content - Show different content based on active tab */}
          {activeTab === 'communication' ? (
            <CommunicationHub />
          ) : (
            <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.totalClients}</div>
                  <p className="text-xs text-muted-foreground">Active client base</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.activeWorkflows}</div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${safeMetrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.billableHours}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeMetrics.teamUtilization}%</div>
                  <p className="text-xs text-muted-foreground">Average across team</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${safeMetrics.pipelineValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Potential revenue</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates across your practice</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New client onboarding completed</p>
                        <p className="text-xs text-gray-500">Sarah's Business - 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Tax return filed</p>
                        <p className="text-xs text-gray-500">Johnson Corp - 4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Follow-up email sent</p>
                        <p className="text-xs text-gray-500">Mike's Startup - Yesterday</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>Tasks due soon</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(tasks) && tasks.length > 0 ? (
                    tasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-600">
                            {(() => {
                              try {
                                const date = new Date(task.dueDate || new Date());
                                if (isNaN(date.getTime())) return "No due date";
                                return isToday(date) ? "Today" : 
                                       isTomorrow(date) ? "Tomorrow" : 
                                       format(date, "MMM d");
                              } catch (error) {
                                return "Invalid date";
                              }
                            })()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            task.priority === "high" ? "destructive" : 
                            task.priority === "medium" ? "default" : "secondary"
                          }>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No upcoming tasks</p>
                  )}
                </CardContent>
              </Card>
            </div>
        
            {/* Tars AI Chat */}
            <TarsAIChat />
            </div>
          )}
        </div>
      </div>

        {/* New Task Dialog */}
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your practice management system
              </DialogDescription>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Task description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Enhanced Client Creation Dialog */}
        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <EnhancedClientCreation
              onComplete={(client) => {
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                setShowNewClientDialog(false);
                toast({ 
                  title: "Success", 
                  description: client.workflow ? 
                    "Client intake workflow created successfully! CONNIE AI will send the email shortly." :
                    "Client created successfully!"
                });
              }}
              onCancel={() => setShowNewClientDialog(false)}
            />
          </DialogContent>
        </Dialog>
    </div>
  );
}