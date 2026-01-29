import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Play, Pause, Square, Timer } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

const timerSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  taskId: z.string().min(1, 'Task is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['billable', 'non_billable', 'internal']).default('billable')
});

type TimerFormData = z.infer<typeof timerSchema>;

interface ActiveSession {
  id: number;
  projectId?: number;
  taskId?: number;
  description: string;
  startTime: string;
  duration: number;
  isActive: boolean;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface Task {
  id: number;
  title: string;
  projectId: number;
  status: string;
}

export function SmartTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);

  const form = useForm<TimerFormData>({
    resolver: zodResolver(timerSchema),
    defaultValues: {
      type: 'billable',
      description: ''
    }
  });

  // Check for active session on component mount - always enabled to show navbar status
  const { data: activeSessionData, refetch: refetchActiveSession } = useQuery({
    queryKey: ['/api/time-tracking/sessions/active'],
    refetchInterval: 30000, // Refresh every 30 seconds to stay in sync
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Get projects for dropdown
  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ['/api/projects'],
    enabled: isOpen
  });

  // Get tasks for selected project
  const selectedProjectId = form.watch('projectId');
  const { data: tasksData } = useQuery<Task[]>({
    queryKey: ['/api/projects', selectedProjectId, 'tasks'],
    enabled: isOpen && !!selectedProjectId
  });

  // Start timer session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (sessionData: TimerFormData) => {
      const response = await apiRequest('POST', '/api/time-tracking/sessions/start', {
        projectId: sessionData.projectId ? parseInt(sessionData.projectId) : undefined,
        taskId: sessionData.taskId ? parseInt(sessionData.taskId) : undefined,
        description: sessionData.description,
        type: sessionData.type
      });
      return response.json();
    },
    onSuccess: (data) => {
      setActiveSession(data.data.session);
      setElapsedTime(0);
      setShowNewSessionDialog(false);
      form.reset();
      toast({ title: 'Timer started successfully' });
      refetchActiveSession();
    },
    onError: () => {
      toast({ title: 'Failed to start timer', variant: 'destructive' });
    }
  });

  // Stop timer session mutation
  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/time-tracking/sessions/stop', {});
      return response.json();
    },
    onSuccess: () => {
      setActiveSession(null);
      setElapsedTime(0);
      toast({ title: 'Timer stopped and time entry created' });
      refetchActiveSession();
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/entries'] });
    },
    onError: () => {
      toast({ title: 'Failed to stop timer', variant: 'destructive' });
    }
  });

  // Update active session from API data
  useEffect(() => {
    if (activeSessionData?.data?.session) {
      setActiveSession(activeSessionData.data.session);
      // Calculate elapsed time
      const startTime = new Date(activeSessionData.data.session.startTime);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    } else {
      setActiveSession(null);
      setElapsedTime(0);
    }
  }, [activeSessionData]);

  // Update elapsed time every second for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession?.isActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.isActive]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = (data: TimerFormData) => {
    startSessionMutation.mutate(data);
  };

  const handleStopTimer = () => {
    stopSessionMutation.mutate();
  };

  const projects = projectsData?.projects || [];
  const tasks = tasksData || [];

  return (
    <>
      {/* Timer Button with Status */}
      <Button
        variant={activeSession ? "default" : "ghost"}
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`h-10 w-10 rounded-full relative hover:bg-gray-100 ${
          activeSession ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : ''
        }`}
        data-testid="timer-button"
      >
        {activeSession ? <Timer className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        {activeSession && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        )}
      </Button>

      {/* Timer Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Smart Timer
              {activeSession && (
                <Badge variant="secondary" className="ml-2">
                  Running
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Active Session Display */}
            {activeSession ? (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Active Session</h4>
                    <p className="text-sm text-gray-600">{activeSession.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-green-600">
                      {formatTime(elapsedTime)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Started {format(new Date(activeSession.startTime), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleStopTimer}
                    variant="destructive"
                    size="sm"
                    disabled={stopSessionMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="stop-timer-button"
                  >
                    <Square className="h-4 w-4" />
                    {stopSessionMutation.isPending ? 'Stopping...' : 'Stop Timer'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No active timer session</p>
                <Button
                  onClick={() => setShowNewSessionDialog(true)}
                  className="flex items-center gap-2"
                  data-testid="start-new-timer-button"
                >
                  <Play className="h-4 w-4" />
                  Start New Timer
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start New Timer Session</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleStartTimer)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What are you working on?"
                        {...field}
                        data-testid="timer-description-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="timer-project-select">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}>
                        <FormControl>
                          <SelectTrigger data-testid="timer-task-select">
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="timer-type-select">
                          <SelectValue placeholder="Select time type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="billable">Billable</SelectItem>
                        <SelectItem value="non_billable">Non-Billable</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSessionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={startSessionMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="start-timer-submit"
                >
                  <Play className="h-4 w-4" />
                  {startSessionMutation.isPending ? 'Starting...' : 'Start Timer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}