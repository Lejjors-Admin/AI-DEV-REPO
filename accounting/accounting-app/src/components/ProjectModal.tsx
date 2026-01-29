import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TaskModal } from "@/components/TaskModal";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import {
  FileText,
  Clock,
  DollarSign,
  CheckSquare,
  FileBarChart,
  Tag,
  Paperclip,
  Plus,
  Edit,
  Trash2,
  X
} from "lucide-react";

interface ProjectModalProps {
  project: any;
  open: boolean;
  onClose: () => void;
  clients?: any[];
}

export default function ProjectModal({ project, open, onClose, clients = [] }: ProjectModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  
  // Controlled form state
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "",
    budget_amount: "",
    start_date: "",
    end_date: ""
  });

  // Reset modal state when project changes or modal opens
  useEffect(() => {
    if (project && open) {
      setActiveTab("overview");
      setIsEditing(false);
      setNewNote("");
      setNewTag("");
      // Handle both camelCase and snake_case field names
      const startDate = project.startDate || project.start_date;
      const endDate = project.endDate || project.end_date;
      const budgetAmount = project.budgetAmount || project.budget_amount;
      
      setEditForm({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "not_started",
        budget_amount: budgetAmount || "",
        start_date: startDate ? (typeof startDate === 'string' ? startDate.split('T')[0] : new Date(startDate).toISOString().split('T')[0]) : "",
        end_date: endDate ? (typeof endDate === 'string' ? endDate.split('T')[0] : new Date(endDate).toISOString().split('T')[0]) : ""
      });
    }
  }, [project?.id, open]);

  // Fetch project tasks
  const { data: projectTasksResponse } = useQuery({
    queryKey: ['/api/tasks', project?.id],
    queryFn: async () => {
      if (!project?.id) return { success: true, data: [] };
      const response = await apiRequest('GET', `/api/tasks?projectId=${project.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project tasks');
      }
      return response.json();
    },
    enabled: !!project?.id && open,
  });
  const projectTasks = projectTasksResponse?.data || [];

  // Fetch time entries for this project
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['/api/time-entries', { projectId: project?.id }],
    enabled: !!project?.id && open,
  });

  // Mutation to update project
  const updateProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/projects/${project.id}`, {
        name: data.name,
        description: data.description,
        status: data.status,
        budgetAmount: data.budget_amount,
        startDate: data.start_date,
        endDate: data.end_date,
      });
    },
    onSuccess: async () => {
      // Invalidate and refetch projects to get updated data
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Refetch the specific project if there's a query for it
      await queryClient.refetchQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project updated",
        description: "Your changes have been saved successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating project",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update task status
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', { projectId: project?.id }] });
    },
  });

  // Calculate total time
  const totalHours = Array.isArray(timeEntries) 
    ? timeEntries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.hours) || 0), 0)
    : 0;

  // Calculate task completion
  const completedTasks = Array.isArray(projectTasks) 
    ? projectTasks.filter((task: any) => task.status === 'completed').length 
    : 0;
  const totalTasks = Array.isArray(projectTasks) ? projectTasks.length : 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get client name - use clientName from API response, or fallback to clients lookup
  const clientId = project?.clientId || project?.client_id;
  const clientName = project?.clientName || clients?.find((c: any) => c.id === clientId)?.name || clients?.find((c: any) => c.id === clientId)?.business_name || 'Unknown Client';
  const client = clients?.find((c: any) => c.id === clientId);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {project.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              <DollarSign className="w-4 h-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="time" data-testid="tab-time">
              <Clock className="w-4 h-4 mr-2" />
              Time
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">
              <Paperclip className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="tags" data-testid="tab-tags">
              <Tag className="w-4 h-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="metrics" data-testid="tab-metrics">
              <FileBarChart className="w-4 h-4 mr-2" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Information</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit-project"
                >
                  {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project Name</Label>
                    {isEditing ? (
                      <Input 
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        data-testid="input-project-name" 
                      />
                    ) : (
                      <p className="text-lg font-semibold mt-1">{project.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select 
                        value={editForm.status}
                        onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                      >
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className="mt-1" variant={
                        project.status === 'completed' ? 'default' :
                        project.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {project.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea 
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      data-testid="textarea-project-description"
                    />
                  ) : (
                    <p className="mt-1 text-gray-700">{project.description || 'No description provided'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client</Label>
                    <p className="mt-1 font-medium">{clientName}</p>
                  </div>
                  <div>
                    <Label>Budget Amount</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={editForm.budget_amount}
                        onChange={(e) => setEditForm({ ...editForm, budget_amount: e.target.value })}
                        data-testid="input-budget-amount"
                      />
                    ) : (
                      <p className="mt-1 text-lg font-bold text-green-600">
                        {(project.budgetAmount || project.budget_amount) ? `$${Number(project.budgetAmount || project.budget_amount).toLocaleString()}` : 'Not set'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    {isEditing ? (
                      <Input 
                        type="date" 
                        value={editForm.start_date}
                        onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                        data-testid="input-start-date"
                      />
                    ) : (
                      <p className="mt-1">{(project.startDate || project.start_date) ? (() => {
                        const date = project.startDate || project.start_date;
                        // Format date as YYYY-MM-DD to avoid timezone issues
                        if (typeof date === 'string') {
                          return date.split('T')[0];
                        }
                        const d = new Date(date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      })() : 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <Label>End Date</Label>
                    {isEditing ? (
                      <Input 
                        type="date" 
                        value={editForm.end_date}
                        onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                        data-testid="input-end-date"
                      />
                    ) : (
                      <p className="mt-1">{(project.endDate || project.end_date) ? (() => {
                        const date = project.endDate || project.end_date;
                        // Format date as YYYY-MM-DD to avoid timezone issues
                        if (typeof date === 'string') {
                          return date.split('T')[0];
                        }
                        const d = new Date(date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      })() : 'Not set'}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false);
                      // Handle both camelCase and snake_case field names
                      const startDate = project.startDate || project.start_date;
                      const endDate = project.endDate || project.end_date;
                      const budgetAmount = project.budgetAmount || project.budget_amount;
                      
                      setEditForm({
                        name: project.name || "",
                        description: project.description || "",
                        status: project.status || "not_started",
                        budget_amount: budgetAmount || "",
                        start_date: startDate ? (typeof startDate === 'string' ? startDate.split('T')[0] : new Date(startDate).toISOString().split('T')[0]) : "",
                        end_date: endDate ? (typeof endDate === 'string' ? endDate.split('T')[0] : new Date(endDate).toISOString().split('T')[0]) : ""
                      });
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      data-testid="button-save-project"
                      onClick={() => {
                        updateProjectMutation.mutate({
                          name: editForm.name,
                          description: editForm.description,
                          status: editForm.status,
                          budget_amount: editForm.budget_amount,
                          start_date: editForm.start_date,
                          end_date: editForm.end_date,
                        });
                      }}
                      disabled={updateProjectMutation.isPending}
                    >
                      {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Tasks ({totalTasks})</CardTitle>
                <Button 
                  size="sm" 
                  data-testid="button-add-task"
                  onClick={() => {
                    setSelectedTask({ projectId: project.id });
                    setShowTaskModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </CardHeader>
              <CardContent>
                {Array.isArray(projectTasks) && projectTasks.length > 0 ? (
                  <div className="space-y-2">
                    {projectTasks.map((task: any) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        data-testid={`task-item-${task.id}`}
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={task.status === 'completed'}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateTaskStatusMutation.mutate({
                                taskId: task.id,
                                status: e.target.checked ? 'completed' : 'in_progress'
                              });
                            }}
                            className="w-4 h-4"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div onClick={(e) => e.stopPropagation()}>
                            <p className="font-medium">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-sm text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No tasks yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Invoices</CardTitle>
                <Button size="sm" data-testid="button-add-invoice">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">No invoices yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Tracking Tab */}
          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Time Entries</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Hours</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(2)}h</p>
                  </div>
                  <Button 
                    size="sm" 
                    data-testid="button-add-time-entry"
                    onClick={() => setShowTimeEntryForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {Array.isArray(timeEntries) && timeEntries.length > 0 ? (
                  <div className="space-y-2">
                    {timeEntries.map((entry: any) => (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`time-entry-${entry.id}`}
                      >
                        <div>
                          <p className="font-medium">{entry.description || 'Time entry'}</p>
                          <p className="text-sm text-gray-500">
                            {entry.date ? new Date(entry.date).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{entry.hours}h</p>
                          {entry.isBillable && <Badge variant="default" className="text-xs">Billable</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No time entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Files</CardTitle>
                <Button size="sm" data-testid="button-upload-file">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">No files uploaded yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    data-testid="textarea-new-note"
                  />
                  <Button 
                    onClick={() => {
                      if (newNote.trim()) {
                        toast({ title: "Note added" });
                        setNewNote("");
                      }
                    }}
                    data-testid="button-add-note"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-center text-gray-500 py-8">No notes yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    data-testid="input-new-tag"
                  />
                  <Button 
                    onClick={() => {
                      if (newTag.trim()) {
                        toast({ title: "Tag added" });
                        setNewTag("");
                      }
                    }}
                    data-testid="button-add-tag"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <p className="text-center text-gray-500 py-8 w-full">No tags yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{completionPercentage}%</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {completedTasks} of {totalTasks} tasks completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Time Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{totalHours.toFixed(1)}h</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {timeEntries.length} time entries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Budget Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    ${project.budget_amount ? Number(project.budget_amount).toLocaleString() : 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Total budget</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Project Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={completionPercentage > 75 ? 'default' : completionPercentage > 50 ? 'secondary' : 'destructive'} className="text-lg px-4 py-2">
                    {completionPercentage > 75 ? 'On Track' : completionPercentage > 50 ? 'At Risk' : 'Behind'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
      />

      {/* Time Entry Form */}
      {showTimeEntryForm && (
        <TimeEntryForm
          initialData={{ projectId: project.id }}
          onSuccess={() => {
            setShowTimeEntryForm(false);
            queryClient.invalidateQueries({ queryKey: ['/api/time-entries', { projectId: project?.id }] });
          }}
          onCancel={() => setShowTimeEntryForm(false)}
        />
      )}
    </Dialog>
  );
}
