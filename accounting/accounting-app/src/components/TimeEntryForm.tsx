/**
 * Time Entry Form - Phase 4.2
 * 
 * Create/edit time entries with:
 * - Task/project selection
 * - Duration input
 * - Billable toggle
 * - Description field
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const timeEntrySchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 second'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['billable', 'non_billable', 'internal']),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeEntryFormProps {
  initialData?: Partial<TimeEntryFormData>;
  timeEntryId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TimeEntryForm({ initialData, timeEntryId, onSuccess, onCancel }: TimeEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients for dropdown
  const { data: clientsResponse } = useQuery<any>({
    queryKey: ['/api/clients'],
  });
  const clients = clientsResponse?.data || [];

  // Fetch projects for dropdown
  const { data: projectsResponse } = useQuery<any>({
    queryKey: ['/api/projects'],
  });
  const projects = projectsResponse?.data || [];

  // Fetch tasks for dropdown
  const { data: tasksResponse } = useQuery<any>({
    queryKey: ['/api/tasks'],
  });
  const tasks = tasksResponse?.data || [];

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      type: 'billable',
      description: '',
      ...initialData,
    },
  });

  // Watch selected values for cascading
  const selectedClientId = form.watch('clientId');
  const selectedProjectId = form.watch('projectId');

  // Filter projects by client
  const filteredProjects = selectedClientId
    ? projects.filter((p: any) => p.clientId === selectedClientId)
    : projects;

  // Filter tasks by project
  const filteredTasks = selectedProjectId
    ? tasks.filter((t: any) => t.projectId === selectedProjectId)
    : tasks;

  // Calculate duration from start/end times
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  const calculateDuration = () => {
    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const durationSeconds = Math.floor((end - start) / 1000);
      if (durationSeconds > 0) {
        form.setValue('duration', durationSeconds);
      }
    }
  };

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: (data: TimeEntryFormData) => {
      const url = timeEntryId 
        ? `/api/time-tracking/entries/${timeEntryId}`
        : '/api/time-tracking/entries';
      
      return apiRequest(url, {
        method: timeEntryId ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Time entry ${timeEntryId ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/entries'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save time entry',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: TimeEntryFormData) => {
    saveMutation.mutate(data);
  };

  // Convert seconds to hours:minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
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
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                  disabled={!selectedClientId}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredProjects.map((project: any) => (
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
        </div>

        <FormField
          control={form.control}
          name="taskId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task (Optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
                disabled={!selectedProjectId}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-task">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredTasks.map((task: any) => (
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field} 
                    onBlur={calculateDuration}
                    data-testid="input-start-time"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field} 
                    onBlur={calculateDuration}
                    data-testid="input-end-time"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (seconds) - {field.value ? formatDuration(field.value) : '0h 0m'}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-duration"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="What did you work on?"
                  rows={3}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Billable</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Track as billable time
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === 'billable'}
                  onCheckedChange={(checked) => 
                    field.onChange(checked ? 'billable' : 'non_billable')
                  }
                  data-testid="switch-billable"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            data-testid="button-save-time-entry"
          >
            {saveMutation.isPending ? 'Saving...' : (timeEntryId ? 'Update' : 'Create')} Entry
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
