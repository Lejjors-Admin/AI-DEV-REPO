import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { 
  Plus, 
  Search, 
  ArrowLeft, 
  Edit, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  Check,
  Delete,
  PlusCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import BookkeepingSettingsTab from "@/components/financial/BookkeepingSettingsTab";
import MiltonBooksChat from "@/components/milton/MiltonBooksChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow, format, isToday, isTomorrow, addDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConnieChat from "@/components/connie/ConnieChat";
import { apiConfig } from "@/lib/api-config";

// Helper functions
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

const getInitials = (name?: string) => {
  if (!name) return 'C'; // Default to 'C' for client
  
  return name
    .split(' ')
    .map(part => part[0] || '')
    .join('')
    .toUpperCase();
};

const getColorClass = (index: number) => {
  const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-neutral-500"];
  return colors[index % colors.length];
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

function ClientTasksList({ clientId, setTaskCount }) {
  const { toast } = useToast();
  const { data: clients } = useQuery({ queryKey: [apiConfig.buildUrl('/api/clients')] });
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks/client', clientId],
    enabled: !!clientId,
  });
  
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isBatchTaskDialogOpen, setIsBatchTaskDialogOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [newTask, setNewTask] = useState({
    description: '',
    dueDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // tomorrow
    priority: 'normal',
    category: 'general',
    notes: '',
    clientId: parseInt(clientId),
    isRecurring: false,
    recurringPattern: 'monthly',
    recurringEndDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'), // 1 year from now
  });
  
  const [batchTask, setBatchTask] = useState({
    description: '',
    dueDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // tomorrow
    priority: 'normal',
    category: 'general',
    notes: '',
    clientIds: [],
    isRecurring: false,
    recurringPattern: 'monthly',
    recurringEndDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'), // 1 year from now
  });
  
  // Update task count for parent component
  if (tasks && setTaskCount) {
    setTaskCount(tasks.filter(task => !task.completed).length);
  }

  const filteredTasks = tasks?.filter(task => showCompletedTasks ? true : !task.completed);
  
  const completeTaskMutation = useMutation({
    mutationFn: async (data: { id: number, completed: boolean }) => {
      return apiRequest('PATCH', `/api/tasks/${data.id}`, { completed: data.completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task updated",
        description: "Task status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task: " + error.message,
      });
    }
  });
  
  const addTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      return apiRequest('POST', `/api/tasks`, taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsAddTaskDialogOpen(false);
      resetNewTaskForm();
      toast({
        title: "Task added",
        description: "New task created successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task: " + error.message,
      });
    }
  });
  
  const batchAddTaskMutation = useMutation({
    mutationFn: async (batchTaskData) => {
      return apiRequest('POST', `/api/tasks/batch`, batchTaskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // If current client is part of the batch
      if (batchTask.clientIds.includes(parseInt(clientId))) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/client', clientId] });
      }
      setIsBatchTaskDialogOpen(false);
      resetBatchTaskForm();
      toast({
        title: "Tasks created",
        description: `Created tasks for ${batchTask.clientIds.length} clients`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create batch tasks: " + error.message,
      });
    }
  });

  const resetNewTaskForm = () => {
    setNewTask({
      description: '',
      dueDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      priority: 'normal',
      category: 'general',
      notes: '',
      clientId: parseInt(clientId),
      isRecurring: false,
      recurringPattern: 'monthly',
      recurringEndDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    });
  };
  
  const resetBatchTaskForm = () => {
    setBatchTask({
      description: '',
      dueDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      priority: 'normal',
      category: 'general',
      notes: '',
      clientIds: [],
      isRecurring: false,
      recurringPattern: 'monthly',
      recurringEndDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    });
  };

  const handleCompleteTask = (id: number, completed: boolean) => {
    completeTaskMutation.mutate({ id, completed });
  };
  
  const handleAddTask = (e) => {
    e.preventDefault();
    
    const taskData = {
      ...newTask,
      dueDate: new Date(newTask.dueDate),
      clientId: parseInt(clientId)
    };
    
    // If recurring, add additional fields
    if (newTask.isRecurring) {
      taskData.recurringEndDate = new Date(newTask.recurringEndDate);
    } else {
      delete taskData.recurringPattern;
      delete taskData.recurringEndDate;
    }
    
    addTaskMutation.mutate(taskData);
  };
  
  const handleBatchAddTask = (e) => {
    e.preventDefault();
    
    if (batchTask.clientIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one client",
      });
      return;
    }
    
    const taskData = {
      ...batchTask,
      dueDate: new Date(batchTask.dueDate),
    };
    
    // If recurring, add additional fields
    if (batchTask.isRecurring) {
      taskData.recurringEndDate = new Date(batchTask.recurringEndDate);
    } else {
      delete taskData.recurringPattern;
      delete taskData.recurringEndDate;
    }
    
    batchAddTaskMutation.mutate(taskData);
  };
  
  const toggleClientInBatch = (id: number) => {
    const newClientIds = [...batchTask.clientIds];
    const index = newClientIds.indexOf(id);
    
    if (index > -1) {
      newClientIds.splice(index, 1);
    } else {
      newClientIds.push(id);
    }
    
    setBatchTask({...batchTask, clientIds: newClientIds});
  };
  
  const selectAllClients = () => {
    if (!clients) return;
    
    const allClientIds = clients.map(c => c.id);
    setBatchTask({...batchTask, clientIds: allClientIds});
  };
  
  const deselectAllClients = () => {
    setBatchTask({...batchTask, clientIds: []});
  };
  
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Client Tasks</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="show-completed" 
              checked={showCompletedTasks}
              onCheckedChange={(checked) => setShowCompletedTasks(!!checked)}
            />
            <label 
              htmlFor="show-completed" 
              className="text-sm text-neutral-600 cursor-pointer"
            >
              Show completed
            </label>
          </div>
          <Button onClick={() => setIsAddTaskDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button variant="outline" onClick={() => setIsBatchTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Batch Create
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-neutral-300">
            {tasksLoading ? (
              Array(3).fill(0).map((_, i) => (
                <li key={i} className="py-4 px-6 flex">
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
            ) : filteredTasks && filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <li key={task.id} className="py-4 px-6 flex">
                  <div className="flex-shrink-0 mr-2">
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={(checked) => handleCompleteTask(task.id, !!checked)}
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
                      {task.description}
                    </p>
                    <div className="flex items-center flex-wrap space-x-3 mt-1">
                      <p className="text-xs text-neutral-500">{getTaskDueText(task.dueDate)}</p>
                      {task.category && (
                        <Badge variant="outline" className="text-xs bg-neutral-100">
                          {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                        </Badge>
                      )}
                      {task.isRecurring && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                          Recurring ({task.recurringPattern})
                        </Badge>
                      )}
                      {task.notes && (
                        <span className="text-xs text-neutral-500">Has notes</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <Badge variant="outline" className={getPriorityBadgeClass(task.priority)}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-neutral-500">
                No {showCompletedTasks ? '' : 'pending'} tasks for this client
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
      
      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task for this client. Tasks help you keep track of work that needs to be done.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddTask}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Task Description</Label>
                <Input
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value) => setNewTask({...newTask, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newTask.category} 
                  onValueChange={(value) => setNewTask({...newTask, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="advisory">Advisory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRecurring" 
                    checked={newTask.isRecurring}
                    onCheckedChange={(checked) => setNewTask({...newTask, isRecurring: !!checked})}
                  />
                  <Label 
                    htmlFor="isRecurring" 
                    className="text-sm cursor-pointer"
                  >
                    This is a recurring task
                  </Label>
                </div>
              </div>
              
              {newTask.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="recurringPattern">Recurring Pattern</Label>
                    <Select 
                      value={newTask.recurringPattern} 
                      onValueChange={(value) => setNewTask({...newTask, recurringPattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="recurringEndDate">End Date</Label>
                    <Input
                      id="recurringEndDate"
                      type="date"
                      value={newTask.recurringEndDate}
                      onChange={(e) => setNewTask({...newTask, recurringEndDate: e.target.value})}
                      required={newTask.isRecurring}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newTask.notes}
                  onChange={(e) => setNewTask({...newTask, notes: e.target.value})}
                  placeholder="Add any additional details about this task"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addTaskMutation.isPending}>
                {addTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Batch Task Dialog */}
      <Dialog open={isBatchTaskDialogOpen} onOpenChange={setIsBatchTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Tasks for Multiple Clients</DialogTitle>
            <DialogDescription>
              Create the same task for multiple clients at once. Select the clients and task details below.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleBatchAddTask}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">Select Clients</Label>
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllClients}
                      className="h-8 px-2 text-xs"
                    >
                      Select All
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={deselectAllClients}
                      className="h-8 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  {clients ? (
                    clients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox 
                          id={`client-${client.id}`} 
                          checked={batchTask.clientIds.includes(client.id)}
                          onCheckedChange={() => toggleClientInBatch(client.id)}
                        />
                        <Label 
                          htmlFor={`client-${client.id}`} 
                          className="text-sm cursor-pointer"
                        >
                          {client.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-center text-neutral-500">
                      Loading clients...
                    </div>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Selected {batchTask.clientIds.length} clients
                </p>
              </div>
              
              <Separator />
              
              <div className="grid gap-2">
                <Label htmlFor="batch-description">Task Description</Label>
                <Input
                  id="batch-description"
                  value={batchTask.description}
                  onChange={(e) => setBatchTask({...batchTask, description: e.target.value})}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="batch-dueDate">Due Date</Label>
                  <Input
                    id="batch-dueDate"
                    type="date"
                    value={batchTask.dueDate}
                    onChange={(e) => setBatchTask({...batchTask, dueDate: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="batch-priority">Priority</Label>
                  <Select 
                    value={batchTask.priority} 
                    onValueChange={(value) => setBatchTask({...batchTask, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="batch-category">Category</Label>
                <Select 
                  value={batchTask.category} 
                  onValueChange={(value) => setBatchTask({...batchTask, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="advisory">Advisory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="batch-isRecurring" 
                    checked={batchTask.isRecurring}
                    onCheckedChange={(checked) => setBatchTask({...batchTask, isRecurring: !!checked})}
                  />
                  <Label 
                    htmlFor="batch-isRecurring" 
                    className="text-sm cursor-pointer"
                  >
                    These are recurring tasks
                  </Label>
                </div>
              </div>
              
              {batchTask.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batch-recurringPattern">Recurring Pattern</Label>
                    <Select 
                      value={batchTask.recurringPattern} 
                      onValueChange={(value) => setBatchTask({...batchTask, recurringPattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="batch-recurringEndDate">End Date</Label>
                    <Input
                      id="batch-recurringEndDate"
                      type="date"
                      value={batchTask.recurringEndDate}
                      onChange={(e) => setBatchTask({...batchTask, recurringEndDate: e.target.value})}
                      required={batchTask.isRecurring}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="batch-notes">Notes (Optional)</Label>
                <Textarea
                  id="batch-notes"
                  value={batchTask.notes}
                  onChange={(e) => setBatchTask({...batchTask, notes: e.target.value})}
                  placeholder="Add any additional details about these tasks"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsBatchTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={batchAddTaskMutation.isPending}>
                {batchAddTaskMutation.isPending ? "Creating..." : "Create Tasks"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientDetailView({ client, clientId, clientLoading }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [taskCount, setTaskCount] = useState(0);
  const [location, navigate] = useLocation();
  
  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Client not found</p>
      </div>
    );
  }
  
  // Ensure client.status exists with a default value if not
  const clientStatus = client.status || 'active';
  
  const statusColors = {
    active: "text-status-success",
    review: "text-status-warning",
    inactive: "text-neutral-500"
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Button variant="outline" onClick={() => navigate("/clients")} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <h1 className="text-2xl font-semibold text-neutral-900">{client.name}</h1>
            <Badge variant="outline" className={`ml-4 ${getStatusBadgeClass(clientStatus)}`}>
              {clientStatus.charAt(0).toUpperCase() + clientStatus.slice(1)}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Client Details Section */}
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Info Card */}
          <div className="w-full lg:w-1/3">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Client Information</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`h-16 w-16 bg-primary rounded-full flex items-center justify-center text-white font-medium text-xl`}>
                      {getInitials(client.name)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-medium text-neutral-900">{client.name}</h3>
                      <p className="text-sm text-neutral-500">
                        Last Updated: {client.lastUpdate ? formatDistanceToNow(new Date(client.lastUpdate), { addSuffix: true }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-neutral-900">Email</p>
                        <p className="text-sm text-neutral-600">{client.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-neutral-900">Phone</p>
                        <p className="text-sm text-neutral-600">{client.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    {client.address && (
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-neutral-900">Address</p>
                          <p className="text-sm text-neutral-600">{client.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {client.fiscalYearEnd && (
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-neutral-900">Fiscal Year End</p>
                          <p className="text-sm text-neutral-600">{client.fiscalYearEnd}</p>
                        </div>
                      </div>
                    )}
                    
                    {client.taxId && (
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-neutral-900">Tax ID</p>
                          <p className="text-sm text-neutral-600">{client.taxId}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Pending Tasks</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {taskCount}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Status</span>
                      <span className={`text-sm font-medium ${statusColors[clientStatus] || 'text-neutral-500'}`}>
                        {clientStatus.charAt(0).toUpperCase() + clientStatus.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Onboarding</span>
                      <span className="text-sm font-medium">
                        {client.onboardingPercentComplete || 0}% Complete
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs Section */}
          <div className="w-full lg:w-2/3">
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="bookkeeping-settings">Bookkeeping Settings</TabsTrigger>
                <TabsTrigger value="connie">Connie AI</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-600">
                      {client.description || 'No client summary available.'}
                    </p>
                  </CardContent>
                </Card>
                
                <ClientTasksList clientId={clientId} setTaskCount={setTaskCount} />
              </TabsContent>
              
              <TabsContent value="tasks">
                <ClientTasksList clientId={clientId} setTaskCount={setTaskCount} />
              </TabsContent>
              
              <TabsContent value="financials">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-500 text-center py-6">
                      Financial information will be displayed here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documents & Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-500 text-center py-6">
                      Client documents and files will be displayed here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bookkeeping-settings">
                {clientLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Milton AI Chat */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <div className="p-1 bg-blue-100 rounded-full mr-3">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
                            </svg>
                          </div>
                          Milton AI Assistant
                        </CardTitle>
                        <p className="text-sm text-neutral-600">
                          Set up Chart of Accounts, upload General Ledger data, and classify transactions automatically.
                        </p>
                      </CardHeader>
                      <CardContent className="p-0">
                        <MiltonBooksChat />
                      </CardContent>
                    </Card>

                    {/* Bookkeeping Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bookkeeping Settings</CardTitle>
                        <p className="text-sm text-neutral-600">
                          Configure tax rates, fiscal year, and accounting preferences.
                        </p>
                      </CardHeader>
                      <CardContent className="p-0">
                        <BookkeepingSettingsTab clientId={clientId} />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="connie" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connie AI Assistant</CardTitle>
                    <p className="text-sm text-neutral-600">
                      Chat with Connie to manage this client, create tasks, send notifications, and handle CRM activities.
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ConnieChat />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}

function ClientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, navigate] = useLocation();
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <>
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Clients</h1>
          <Button onClick={() => navigate("/client-registration")}>
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-500" />
          </div>
          <Input 
            className="pl-10" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Clients List */}
      <div className="py-2 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="ml-4 flex-1">
                      <Skeleton className="h-5 w-[140px] mb-1" />
                      <Skeleton className="h-4 w-[180px]" />
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-5 w-[60px] rounded-full" />
                    </div>
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-[90px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredClients?.map((client, index) => (
              <Card 
                key={client.id} 
                className="shadow-sm hover:shadow transition-shadow cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`h-12 w-12 ${getColorClass(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                      {getInitials(client.name)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-neutral-900">{client.name}</h3>
                      <p className="text-sm text-neutral-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-neutral-500">Status:</span>
                      <Badge variant="outline" className={getStatusBadgeClass(client.status)}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-neutral-500">Phone:</span>
                      <span className="text-sm">{client.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500">Last Update:</span>
                      <span className="text-sm">{formatDistanceToNow(new Date(client.lastUpdate), { addSuffix: true })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {!isLoading && filteredClients?.length === 0 && (
            <div className="col-span-full text-center py-8 text-neutral-500">
              No clients found matching your search criteria.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Clients() {
  const params = useParams();
  const clientId = params.id;
  
  // If we have a client ID, fetch that specific client
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId
  });
  
  if (clientId) {
    // Show client detail view
    return clientLoading ? (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    ) : (
      <ClientDetailView client={client} clientId={clientId} clientLoading={clientLoading} />
    );
  }
  
  // Show client list view
  return <ClientList />;
}
