import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { apiConfig } from '@/lib/api-config';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckSquare, 
  MessageSquare, 
  Repeat,
  Play,
  Pause,
  Trash2,
  Plus,
  X,
  Tag,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  statusId: z.number().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedTo: z.number().nullable().optional(),
  projectId: z.number().optional(), // Add projectId for new tasks
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  isBillable: z.boolean().optional(),
  hourlyRate: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.object({
    frequency: z.enum(['none', 'daily', 'weekly', '2weeks', 'monthly', '2months', '3months', '6months', 'yearly', 'custom']),
    interval: z.number().optional(),
    unit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
    endCondition: z.enum(['never', 'after', 'on_date']),
    endDate: z.string().optional(),
    totalOccurrences: z.number().optional(),
  }).optional(),
});

type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

interface TaskModalProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

export function TaskModal({ task, open, onClose }: TaskModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [newNote, setNewNote] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null);
  const [timeEntryEditForm, setTimeEntryEditForm] = useState({ duration: '', description: '' });
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<number>>(new Set());
  const [entryCommentsMap, setEntryCommentsMap] = useState<Record<number, any[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<number, boolean>>({});
  
  // Check if user is admin
  const isAdmin = user?.role === 'firm_admin' || user?.role === 'firm_owner' || user?.role === 'saas_owner' || user?.role === 'super_admin';
  
  // Helper to fetch comments for a specific entry
  const fetchEntryComments = async (entryId: number) => {
    if (loadingCommentsMap[entryId]) return;
    setLoadingCommentsMap(prev => ({ ...prev, [entryId]: true }));
    try {
      const response = await apiRequest('GET', `/api/time-tracking/entries/${entryId}/comments`);
      if (response.ok) {
        const comments = await response.json();
        const commentsArray = Array.isArray(comments) ? comments : (comments.data || []);
        setEntryCommentsMap(prev => ({ ...prev, [entryId]: commentsArray }));
      }
    } catch (error) {
      console.error(`Failed to fetch comments for entry ${entryId}:`, error);
      setEntryCommentsMap(prev => ({ ...prev, [entryId]: [] }));
    } finally {
      setLoadingCommentsMap(prev => ({ ...prev, [entryId]: false }));
    }
  };
  
  const handleToggleComments = (entryId: number) => {
    if (expandedEntryIds.has(entryId)) {
      setExpandedEntryIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(entryId);
        return newSet;
      });
    } else {
      setExpandedEntryIds(prev => new Set(prev).add(entryId));
      // Always refetch comments when expanding to get latest
      fetchEntryComments(entryId);
    }
  };
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // Multi-assignment states
  const [showAssignStaff, setShowAssignStaff] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [allocatedHours, setAllocatedHours] = useState<number>(0);
  
  // Recurring task states
  const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<string>(
    task?.recurrencePattern?.frequency || 'none'
  );
  const [customInterval, setCustomInterval] = useState<number>(
    task?.recurrencePattern?.interval || 1
  );
  const [customUnit, setCustomUnit] = useState<string>(
    task?.recurrencePattern?.unit || 'days'
  );
  const [endCondition, setEndCondition] = useState<string>(
    task?.recurrencePattern?.endCondition || 'never'
  );
  const [endDate, setEndDate] = useState<string>(
    task?.recurrencePattern?.endDate || ''
  );
  const [totalOccurrences, setTotalOccurrences] = useState<number>(
    task?.recurrencePattern?.totalOccurrences || 1
  );

  // Check if this is a new task (no id) or existing task
  const isNewTask = !task?.id;
  const projectId = task?.projectId || task?.project_id;
  
  // Fetch additional data
  const { data: users = [] } = useQuery({ queryKey: ['/api/users'] });
  const { data: taskStatusesResponse } = useQuery({ queryKey: ['/api/task-statuses'] });
  const taskStatuses = taskStatusesResponse?.data || [];
  
  // Fetch project data if projectId is provided
  const { data: projectData } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await apiRequest('GET', `/api/projects`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.find((p: any) => p.id === projectId);
    },
    enabled: !!projectId && open
  });
  const { data: timeEntriesResponse, isLoading: isLoadingTimeEntries } = useQuery({ 
    queryKey: [`/api/time-tracking/entries?taskId=${task?.id}`],
    queryFn: async () => {
      console.log('🔍 TaskModal: Fetching time entries for taskId:', task?.id);
      const response = await apiRequest('GET', `/api/time-tracking/entries?taskId=${task?.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ TaskModal: No time entries found (404)');
          return { data: [] };
        }
        throw new Error('Failed to fetch time entries');
      }
      const data = await response.json();
      console.log('✅ TaskModal: Time entries response:', data);
      console.log('📦 TaskModal: Response structure:', {
        isArray: Array.isArray(data),
        hasData: !!data.data,
        dataType: typeof data,
        keys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
        dataLength: Array.isArray(data) ? data.length : (data?.data ? data.data.length : 0),
        rawData: JSON.stringify(data).substring(0, 200)
      });
      // The backend returns { data: entries }, so return it as-is
      // The extraction logic below will handle it
      return data;
    },
    enabled: open && !!task?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });
  // Extract time entries - backend returns { data: [...] }
  const timeEntries = useMemo(() => {
    if (!timeEntriesResponse) return [];
    
    // Backend returns { data: entries } format
    if (timeEntriesResponse && typeof timeEntriesResponse === 'object' && 'data' in timeEntriesResponse) {
      const entries = timeEntriesResponse.data;
      if (Array.isArray(entries)) {
        console.log('✅ TaskModal: Extracted', entries.length, 'time entries from response.data');
        return entries;
      }
    }
    
    // Fallback: if response is already an array
    if (Array.isArray(timeEntriesResponse)) {
      console.log('✅ TaskModal: Response is already an array, using directly');
      return timeEntriesResponse;
    }
    
    console.warn('⚠️ TaskModal: Unexpected response format:', timeEntriesResponse);
    return [];
  }, [timeEntriesResponse]);

  const { data: taskNotesResponse } = useQuery({ 
    queryKey: ['/api/tasks', task?.id, 'notes'],
    queryFn: async () => {
      if (!task?.id) return [];
      const response = await apiRequest('GET', `/api/tasks/${task.id}/notes`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch notes');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
    enabled: open && !!task?.id
  });
  const taskNotes = Array.isArray(taskNotesResponse) ? taskNotesResponse : (taskNotesResponse?.data || []);

  const { data: checklistItemsResponse } = useQuery({ 
    queryKey: ['/api/tasks', task?.id, 'checklist'],
    queryFn: async () => {
      if (!task?.id) return [];
      const response = await apiRequest('GET', `/api/tasks/${task.id}/checklist`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch checklist items');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
    enabled: open && !!task?.id
  });
  const checklistItems = Array.isArray(checklistItemsResponse) ? checklistItemsResponse : (checklistItemsResponse?.data || []);
  
  // Fetch tags data
  const { data: allTags = [] } = useQuery({ 
    queryKey: ['/api/tags'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/tags'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    },
    enabled: open 
  });
  const { data: taskTags = [] } = useQuery({ 
    queryKey: ['/api/tags', task?.id, 'tags'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/tags?taskId=${task?.id}`), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch task tags');
      return response.json();
    },
    enabled: open && !!task
  });
  
  // Fetch task assignments
  const { data: taskAssignments = [] } = useQuery({ 
    queryKey: ['/api/tasks', task?.id, 'assignments'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/tasks/${task?.id}/assignments`), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch task assignments');
      return response.json();
    },
    enabled: open && !!task 
  });

  const form = useForm<TaskUpdateInput>({
    resolver: zodResolver(taskUpdateSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      statusId: task?.statusId,
      priority: task?.priority || 'medium',
      assignedTo: task?.assignedTo,
      startDate: task?.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task?.estimatedHours ? parseFloat(task.estimatedHours.toString()) : undefined,
      isBillable: task?.isBillable ?? true,
      hourlyRate: task?.hourlyRate ? parseFloat(task.hourlyRate.toString()) : undefined,
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (open) {
      if (task?.id) {
        // Existing task - load its data
        form.reset({
          title: task.title || '',
          description: task.description || '',
          statusId: task.statusId,
          priority: task.priority || 'medium',
          assignedTo: task?.assignedTo,
          startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: task.estimatedHours ? parseFloat(task.estimatedHours.toString()) : undefined,
          isBillable: task.isBillable ?? true,
          hourlyRate: task.hourlyRate ? parseFloat(task.hourlyRate.toString()) : undefined,
        });
      } else if (projectId) {
        // New task - set defaults
        form.reset({
          title: '',
          description: '',
          statusId: undefined,
          priority: 'medium',
          assignedTo: undefined,
          startDate: '',
          dueDate: '',
          estimatedHours: undefined,
          isBillable: true,
          hourlyRate: undefined,
        });
      }
    }
  }, [task?.id, projectId, open]);

  // Create task mutation (for new tasks)
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('Creating task with data:', taskData);
      const response = await apiRequest('POST', '/api/tasks', taskData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create task');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all task queries (including project-specific ones)
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Also invalidate the specific project's tasks query if we have projectId
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId] });
      }
      toast({ title: 'Task created successfully' });
      onClose();
    },
    onError: (error: any) => {
      console.error('Task creation error:', error);
      toast({ 
        title: 'Failed to create task', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Update task mutation (for existing tasks)
  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskUpdateInput) => {
      return await apiRequest('PATCH', `/api/tasks/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: 'Task updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update task', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!task?.id) throw new Error('Task must be saved before adding notes');
      console.log('📝 Frontend: Adding note to task', task.id, 'content:', note);
      try {
        const response = await apiRequest('POST', `/api/tasks/${task.id}/notes`, { content: note });
        console.log('📝 Frontend: Response status:', response.status, response.statusText);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Frontend: Error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to add note' };
          }
          throw new Error(errorData.error || errorData.message || 'Failed to add note');
        }
        const result = await response.json();
        console.log('✅ Frontend: Note added successfully:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Frontend: Error in addNoteMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id, 'notes'] });
      setNewNote('');
      toast({ title: 'Note added successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add note', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Add checklist item mutation
  const addChecklistMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!task?.id) throw new Error('Task must be saved before adding checklist items');
      console.log('✅ Frontend: Adding checklist item to task', task.id, 'title:', title);
      try {
        const response = await apiRequest('POST', `/api/tasks/${task.id}/checklist`, { title });
        console.log('✅ Frontend: Checklist response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Frontend: Checklist error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to add checklist item' };
          }
          throw new Error(errorData.error || errorData.message || 'Failed to add checklist item');
        }
        const result = await response.json();
        console.log('✅ Frontend: Checklist item added successfully:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Frontend: Error in addChecklistMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'checklist'] });
      setNewChecklistItem('');
      toast({ title: 'Checklist item added successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add checklist item', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Toggle checklist item
  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      if (!task?.id) throw new Error('Task must be saved before toggling checklist items');
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}/checklist/${itemId}`, { isCompleted: completed });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update checklist item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'checklist'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update checklist item', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Edit time entry mutation
  const editTimeEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: number; updates: any }) => {
      const response = await apiRequest('PUT', `/api/time-tracking/entries/${entryId}`, updates);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update time entry');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.startsWith('/api/time-entries') || key.startsWith('/api/time-tracking/entries'));
        }
      });
      // Invalidate comments for this entry
      if (variables.entryId) {
        setEntryCommentsMap(prev => ({ ...prev, [variables.entryId]: [] }));
        fetchEntryComments(variables.entryId);
      }
      setEditingTimeEntry(null);
      setTimeEntryEditForm({ duration: '', description: '' });
      toast({ title: 'Time entry updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update time entry', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Delete time entry mutation
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest('DELETE', `/api/time-tracking/entries/${entryId}`, {});
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete time entry');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.startsWith('/api/time-entries') || key.startsWith('/api/time-tracking/entries'));
        }
      });
      toast({ title: 'Time entry deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete time entry', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      if (!task?.id) throw new Error('Task must be saved before starting timer');
      const response = await apiRequest('POST', '/api/time-tracking/timer/start', { 
        taskId: task.id,
        projectId: task.projectId || projectId,
        clientId: task.clientId,
        description: `Working on: ${task.title || 'Task'}`,
        type: 'billable'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to start timer');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all time entries queries (including task-specific ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (key.startsWith('/api/time-entries') || key.startsWith('/api/time-tracking/entries'));
        }
      });
      // Refetch the task-specific time entries query
      if (task?.id) {
        queryClient.refetchQueries({ 
          queryKey: [`/api/time-tracking/entries?taskId=${task.id}`] 
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/timer/active'] });
      queryClient.refetchQueries({ queryKey: ['/api/time-tracking/timer/active'] });
      toast({ title: 'Timer started', description: 'Timer is now running for this task' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to start timer', 
        description: error.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Create new tag mutation
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      return await apiRequest('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      setNewTagName('');
      setNewTagColor('#6B7280');
      setShowNewTagForm(false);
      toast({ title: 'Tag created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create tag', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Add tags to task mutation
  const addTagsToTaskMutation = useMutation({
    mutationFn: async (tagIds: number[]) => {
      if (!task?.id) throw new Error('Task must be saved before adding tags');
      return await apiRequest(`/api/tags/${task.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags', task?.id, 'tags'] });
      setSelectedTagIds([]);
      toast({ title: 'Tags added to task' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add tags', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Remove tag from task mutation
  const removeTagFromTaskMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (!task?.id) throw new Error('Task must be saved before removing tags');
      return await apiRequest(`/api/tags/${task.id}/tags/${tagId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags', task?.id, 'tags'] });
      toast({ title: 'Tag removed from task' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to remove tag', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Add task assignment mutation
  const addAssignmentMutation = useMutation({
    mutationFn: async ({ userId, allocatedHours }: { userId: number; allocatedHours?: number }) => {
      if (!task?.id) throw new Error('Task must be saved before assigning staff');
      return await apiRequest(`/api/tasks/${task.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignments: [{ userId, allocatedHours }] 
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'assignments'] });
      setShowAssignStaff(false);
      setSelectedUserId(null);
      setAllocatedHours(0);
      toast({ title: 'Staff assigned successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to assign staff', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Remove task assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!task?.id) throw new Error('Task must be saved before removing assignments');
      return await apiRequest(`/api/tasks/${task.id}/assignments/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'assignments'] });
      toast({ title: 'Assignment removed' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to remove assignment', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleSubmit = (data: TaskUpdateInput) => {
    console.log('Form data before mutation:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Is new task:', isNewTask);
    console.log('Project ID:', projectId);
    
    // Use create mutation for new tasks, update mutation for existing tasks
    if (isNewTask) {
      // Build task data for creation - match API schema
      const taskData: any = {
        title: data.title,
        projectId: projectId || data.projectId,
        priority: data.priority || 'medium',
        description: data.description,
        statusId: data.statusId,
        assignedTo: data.assignedTo,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours.toString() : undefined,
        isBillable: data.isBillable,
        hourlyRate: data.hourlyRate,
        isRecurring: isRecurring,
      };
      
      // Add recurrence pattern if task is recurring
      if (isRecurring && recurrenceFrequency !== 'none') {
        taskData.recurrencePattern = {
          frequency: recurrenceFrequency as any,
          endCondition: endCondition as any,
          ...(recurrenceFrequency === 'custom' && {
            interval: customInterval,
            unit: customUnit as any,
          }),
          ...(endCondition === 'on_date' && { endDate }),
          ...(endCondition === 'after' && { totalOccurrences }),
        };
      }
      
      console.log('Creating task with data:', taskData);
      createTaskMutation.mutate(taskData);
    } else {
      // Build update data for existing tasks
      const updateData: any = {
        ...data,
        isRecurring,
        // Convert estimatedHours to string as server expects
        estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours.toString() : undefined,
      };

      // Add recurrence pattern if task is recurring
      if (isRecurring && recurrenceFrequency !== 'none') {
        updateData.recurrencePattern = {
          frequency: recurrenceFrequency as any,
          endCondition: endCondition as any,
          ...(recurrenceFrequency === 'custom' && {
            interval: customInterval,
            unit: customUnit as any,
          }),
          ...(endCondition === 'on_date' && { endDate }),
          ...(endCondition === 'after' && { totalOccurrences }),
        };
      }

      console.log('Updating task with data:', updateData);
      updateTaskMutation.mutate(updateData);
    }
  };

  const handleAddAssignment = () => {
    if (selectedUserId) {
      addAssignmentMutation.mutate({ 
        userId: selectedUserId, 
        allocatedHours: allocatedHours > 0 ? allocatedHours : undefined 
      });
    }
  };

  const handleAddTags = () => {
    if (selectedTagIds.length > 0) {
      addTagsToTaskMutation.mutate(selectedTagIds);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate({ name: newTagName, color: newTagColor });
    }
  };

  const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];

  const totalLoggedTime = safeArray(timeEntries).reduce((sum: number, entry: any) => {
    // Duration is in seconds, convert to hours
    const hours = entry.duration ? entry.duration / 3600 : (entry.hours || 0);
    return sum + hours;
  }, 0);

  const assignedUser = safeArray(users).find((u: any) => u.id === task?.assignedTo);
  const taskStatus = safeArray(taskStatuses).find((s: any) => s.id === task?.statusId);

  // Allow modal to open even for new tasks (task object with projectId but no id)
  if (!task && !projectId) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="task-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
          <div className="flex gap-2 mt-2">
            {taskStatus && (
              <Badge variant="outline" style={{ backgroundColor: taskStatus.color, color: '#fff' }}>
                {taskStatus.name}
              </Badge>
            )}
            <Badge variant={
              task?.priority === 'urgent' ? 'destructive' :
              task?.priority === 'high' ? 'default' :
              task?.priority === 'medium' ? 'secondary' :
              'outline'
            }>
              {task?.priority || 'Low'}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details" data-testid="tab-details">
              <Calendar className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="time" data-testid="tab-time">
              <Clock className="w-4 h-4 mr-2" />
              Time Logs
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <MessageSquare className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              <CheckSquare className="w-4 h-4 mr-2" />
              Checklist
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-task-title" />
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
                            <Textarea {...field} rows={4} data-testid="input-task-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Multi-Assignment Section */}
                    <div className="space-y-3">
                      <FormLabel>
                        <User className="w-4 h-4 inline mr-2" />
                        Assigned Staff
                      </FormLabel>
                      
                      {/* Display current assignments */}
                      <div className="flex flex-wrap gap-2" data-testid="task-assignments-display">
                        {safeArray(taskAssignments).length > 0 ? (
                          safeArray(taskAssignments).map((assignment: any) => {
                            const user = safeArray(users).find((u: any) => u.id === assignment.userId);
                            return (
                              <Badge 
                                key={assignment.id}
                                variant="secondary"
                                className="gap-1 pr-1"
                                data-testid={`assignment-badge-${assignment.userId}`}
                              >
                                {user?.name || 'Unknown User'}
                                {assignment.allocatedHours && (
                                  <span className="text-xs opacity-70">
                                    ({assignment.allocatedHours}h)
                                  </span>
                                )}
                                <X 
                                  className="w-3 h-3 cursor-pointer hover:opacity-70" 
                                  onClick={() => removeAssignmentMutation.mutate(assignment.userId)}
                                  data-testid={`remove-assignment-${assignment.userId}`}
                                />
                              </Badge>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">No staff assigned yet</p>
                        )}
                      </div>

                      {/* Add new assignment */}
                      <Popover open={showAssignStaff} onOpenChange={setShowAssignStaff}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            data-testid="button-assign-staff"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign Staff
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" data-testid="popover-assign-staff">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Assign Staff Member</h4>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Staff Member</label>
                              <Select
                                value={selectedUserId?.toString() || ''}
                                onValueChange={(value) => setSelectedUserId(parseInt(value))}
                              >
                                <SelectTrigger data-testid="select-staff-member">
                                  <SelectValue placeholder="Select staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeArray(users)
                                    .filter((user: any) => 
                                      !safeArray(taskAssignments).some((a: any) => a.userId === user.id)
                                    )
                                    .map((user: any) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Allocated Hours (Optional)</label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="0"
                                value={allocatedHours || ''}
                                onChange={(e) => setAllocatedHours(parseFloat(e.target.value) || 0)}
                                data-testid="input-allocated-hours"
                              />
                            </div>

                            <Button
                              onClick={handleAddAssignment}
                              disabled={!selectedUserId || addAssignmentMutation.isPending}
                              className="w-full"
                              data-testid="button-add-assignment"
                            >
                              {addAssignmentMutation.isPending ? 'Adding...' : 'Add Assignment'}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <FormField
                      control={form.control}
                      name="statusId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={field.value != null ? field.value.toString() : undefined}
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {safeArray(taskStatuses).map((status: any) => (
                                <SelectItem key={status.id} value={status.id.toString()}>
                                  {status.name}
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Project</span>
                            <span className="font-medium">
                              {task?.projectName || projectData?.name || (projectId ? 'Loading...' : 'No project')}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Created at</span>
                            <span>
                              {isNewTask 
                                ? new Date().toLocaleString() 
                                : (task?.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A')
                              }
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total logged time</span>
                            <span className="font-medium">{totalLoggedTime.toFixed(2)}h</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recurring Tasks Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is-recurring"
                          checked={isRecurring}
                          onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                          data-testid="checkbox-recurring-task"
                        />
                        <label
                          htmlFor="is-recurring"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                        >
                          <Repeat className="w-4 h-4" />
                          Make this a recurring task
                        </label>
                      </div>

                      {isRecurring && (
                        <Card>
                          <CardContent className="pt-4 space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Frequency</label>
                              <Select
                                value={recurrenceFrequency}
                                onValueChange={setRecurrenceFrequency}
                              >
                                <SelectTrigger data-testid="select-recurrence-frequency">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="2weeks">Every 2 Weeks</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="2months">Every 2 Months</SelectItem>
                                  <SelectItem value="3months">Every 3 Months</SelectItem>
                                  <SelectItem value="6months">Every 6 Months</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {recurrenceFrequency === 'custom' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Every</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={customInterval}
                                    onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                                    data-testid="input-custom-interval"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Unit</label>
                                  <Select value={customUnit} onValueChange={setCustomUnit}>
                                    <SelectTrigger data-testid="select-custom-unit">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="days">Days</SelectItem>
                                      <SelectItem value="weeks">Weeks</SelectItem>
                                      <SelectItem value="months">Months</SelectItem>
                                      <SelectItem value="years">Years</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            <Separator />

                            <div className="space-y-2">
                              <label className="text-sm font-medium">End Condition</label>
                              <Select value={endCondition} onValueChange={setEndCondition}>
                                <SelectTrigger data-testid="select-end-condition">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="never">Never</SelectItem>
                                  <SelectItem value="after">After X occurrences</SelectItem>
                                  <SelectItem value="on_date">On specific date</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {endCondition === 'after' && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Number of Occurrences</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={totalOccurrences}
                                  onChange={(e) => setTotalOccurrences(parseInt(e.target.value) || 1)}
                                  data-testid="input-total-occurrences"
                                />
                              </div>
                            )}

                            {endCondition === 'on_date' && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">End Date</label>
                                <Input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  data-testid="input-recurrence-end-date"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-estimated-hours"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isBillable"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-billable"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Billable</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hourly Rate</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-hourly-rate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tags Section */}
                    <div className="space-y-3">
                      <FormLabel>
                        <Tag className="w-4 h-4 inline mr-2" />
                        Tags
                      </FormLabel>
                      
                      {/* Display current tags */}
                      <div className="flex flex-wrap gap-2" data-testid="task-tags-display">
                        {Array.isArray(taskTags) && taskTags.length > 0 ? (
                          taskTags.map((tag: any) => (
                            <Badge 
                              key={tag.id}
                              style={{ backgroundColor: tag.color, color: '#fff' }}
                              className="gap-1 pr-1"
                              data-testid={`tag-badge-${tag.id}`}
                            >
                              {tag.name}
                              <X 
                                className="w-3 h-3 cursor-pointer hover:opacity-70" 
                                onClick={() => removeTagFromTaskMutation.mutate(tag.id)}
                                data-testid={`remove-tag-${tag.id}`}
                              />
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No tags added yet</p>
                        )}
                      </div>

                      {/* Add existing tags */}
                      <div className="space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start"
                              data-testid="button-add-existing-tags"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Existing Tags
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full" data-testid="popover-tag-select">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Select Tags</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {Array.isArray(allTags) && allTags.length > 0 ? (
                                  allTags
                                    .filter((tag: any) => !taskTags.some((t: any) => t.id === tag.id))
                                    .map((tag: any) => (
                                      <div key={tag.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`tag-${tag.id}`}
                                          checked={selectedTagIds.includes(tag.id)}
                                          onCheckedChange={(checked) => {
                                            setSelectedTagIds(prev =>
                                              checked
                                                ? [...prev, tag.id]
                                                : prev.filter(id => id !== tag.id)
                                            );
                                          }}
                                          data-testid={`checkbox-tag-${tag.id}`}
                                        />
                                        <label
                                          htmlFor={`tag-${tag.id}`}
                                          className="flex items-center gap-2 cursor-pointer flex-1"
                                        >
                                          <Badge
                                            style={{ backgroundColor: tag.color, color: '#fff' }}
                                            className="text-xs"
                                          >
                                            {tag.name}
                                          </Badge>
                                        </label>
                                      </div>
                                    ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No tags available</p>
                                )}
                              </div>
                              <Button
                                onClick={handleAddTags}
                                disabled={selectedTagIds.length === 0 || addTagsToTaskMutation.isPending || isNewTask}
                                className="w-full"
                                size="sm"
                                data-testid="button-confirm-add-tags"
                                title={isNewTask ? 'Save task before adding tags' : ''}
                              >
                                {addTagsToTaskMutation.isPending ? 'Adding...' : `Add ${selectedTagIds.length} Tag(s)`}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Create new tag */}
                        {!showNewTagForm ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowNewTagForm(true)}
                            data-testid="button-show-new-tag-form"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Tag
                          </Button>
                        ) : (
                          <Card>
                            <CardContent className="pt-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Create New Tag</h4>
                                <X
                                  className="w-4 h-4 cursor-pointer hover:opacity-70"
                                  onClick={() => {
                                    setShowNewTagForm(false);
                                    setNewTagName('');
                                    setNewTagColor('#6B7280');
                                  }}
                                  data-testid="button-close-new-tag-form"
                                />
                              </div>
                              <div className="space-y-2">
                                <Input
                                  placeholder="Tag name"
                                  value={newTagName}
                                  onChange={(e) => setNewTagName(e.target.value)}
                                  data-testid="input-new-tag-name"
                                />
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    className="w-20 h-10 cursor-pointer"
                                    data-testid="input-new-tag-color"
                                  />
                                  <Input
                                    type="text"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    placeholder="#6B7280"
                                    className="flex-1"
                                    data-testid="input-new-tag-color-text"
                                  />
                                </div>
                                <Button
                                  onClick={handleCreateTag}
                                  disabled={!newTagName.trim() || createTagMutation.isPending}
                                  className="w-full"
                                  size="sm"
                                  data-testid="button-create-tag"
                                >
                                  {createTagMutation.isPending ? 'Creating...' : 'Create Tag'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateTaskMutation.isPending}
                    data-testid="button-save-task"
                  >
                    {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Time Logs Tab */}
          <TabsContent value="time" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Time Entries</h3>
              <Button
                onClick={() => startTimerMutation.mutate()}
                disabled={startTimerMutation.isPending || isNewTask}
                data-testid="button-start-timer"
                title={isNewTask ? 'Save task before starting timer' : ''}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {Array.isArray(timeEntries) && timeEntries.length > 0 ? (
                    timeEntries.map((entry: any) => {
                      const hours = entry.duration ? (entry.duration / 3600).toFixed(2) : (entry.hours?.toFixed(2) || '0.00');
                      const isEditing = editingTimeEntry?.id === entry.id;
                      
                      return (
                        <div key={entry.id} className="p-3 border rounded-lg space-y-2">
                          {isEditing ? (
                            // Edit mode
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Hours"
                                  value={timeEntryEditForm.duration}
                                  onChange={(e) => setTimeEntryEditForm({ ...timeEntryEditForm, duration: e.target.value })}
                                  className="flex-1"
                                  min="0"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const durationSeconds = parseFloat(timeEntryEditForm.duration) * 3600;
                                    editTimeEntryMutation.mutate({
                                      entryId: entry.id,
                                      updates: { duration: durationSeconds, description: timeEntryEditForm.description }
                                    });
                                  }}
                                  disabled={editTimeEntryMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingTimeEntry(null);
                                    setTimeEntryEditForm({ duration: '', description: '' });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Description"
                                value={timeEntryEditForm.description}
                                onChange={(e) => setTimeEntryEditForm({ ...timeEntryEditForm, description: e.target.value })}
                                rows={2}
                              />
                            </div>
                          ) : (
                            // Display mode
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">
                                    {entry.startTime ? new Date(entry.startTime).toLocaleDateString() : 'N/A'}
                                  </p>
                                  <p className="font-semibold text-sm">{hours}h</p>
                                  {(entry.type === 'billable' || entry.isBillable) && (
                                    <Badge variant="secondary" className="text-xs">Billable</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {entry.description || 'No description'}
                                </p>
                                {/* Time entry notes/comments - expandable */}
                                {(() => {
                                  const isExpanded = expandedEntryIds.has(entry.id);
                                  const entryComments = entryCommentsMap[entry.id] || [];
                                  const loadingComments = loadingCommentsMap[entry.id] || false;
                                  
                                  return (
                                    <div className="mt-2">
                                      {(entry.notes || isExpanded) && (
                                        <div className="p-2 bg-muted rounded text-xs space-y-1">
                                          {entry.notes && (
                                            <div>
                                              <p className="font-medium mb-1">Notes:</p>
                                              <p className="text-muted-foreground">{entry.notes}</p>
                                            </div>
                                          )}
                                          {isExpanded && (
                                            <div>
                                              <p className="font-medium mb-1">Comments:</p>
                                              {loadingComments ? (
                                                <p className="text-muted-foreground">Loading...</p>
                                              ) : entryComments.length > 0 ? (
                                                entryComments.map((comment: any) => (
                                                  <div key={comment.id} className="mb-1">
                                                    <p className="text-muted-foreground">{comment.comment}</p>
                                                    <p className="text-xs text-muted-foreground/70">
                                                      {comment.userName || 'Unknown'} - {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                                                    </p>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-muted-foreground">No comments</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-1 text-xs h-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleComments(entry.id);
                                        }}
                                      >
                                        {isExpanded ? 'Hide' : 'Show'} Comments ({entryComments.length})
                                      </Button>
                                    </div>
                                  );
                                })()}
                              </div>
                              {isAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setEditingTimeEntry(entry);
                                        setTimeEntryEditForm({
                                          duration: parseFloat(hours).toString(),
                                          description: entry.description || ''
                                        });
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        if (confirm('Are you sure you want to delete this time entry?')) {
                                          deleteTimeEntryMutation.mutate(entry.id);
                                        }
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No time entries yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Time Logged</span>
                  <span className="text-2xl font-bold">{totalLoggedTime.toFixed(2)}h</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  data-testid="input-new-note"
                />
                <Button
                  onClick={() => newNote.trim() && addNoteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || addNoteMutation.isPending || isNewTask}
                  data-testid="button-add-note"
                  title={isNewTask ? 'Save task before adding notes' : ''}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {Array.isArray(taskNotes) && taskNotes.length > 0 ? (
                  taskNotes.map((note: any) => (
                    <Card key={note.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{note.userName || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">
                              {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No notes yet</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add checklist item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      addChecklistMutation.mutate(newChecklistItem);
                    }
                  }}
                  data-testid="input-new-checklist"
                />
                <Button
                  onClick={() => newChecklistItem.trim() && addChecklistMutation.mutate(newChecklistItem)}
                  disabled={!newChecklistItem.trim() || addChecklistMutation.isPending || isNewTask}
                  data-testid="button-add-checklist"
                  title={isNewTask ? 'Save task before adding checklist items' : ''}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {Array.isArray(checklistItems) && checklistItems.length > 0 ? (
                  checklistItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={item.isCompleted}
                        onCheckedChange={(checked) => 
                          toggleChecklistMutation.mutate({ 
                            itemId: item.id, 
                            completed: !!checked 
                          })
                        }
                        data-testid={`checkbox-checklist-${item.id}`}
                      />
                      <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                        {item.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No checklist items yet</p>
                )}
              </div>

              {Array.isArray(checklistItems) && checklistItems.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-semibold">
                        {checklistItems.filter((i: any) => i.isCompleted).length} / {checklistItems.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
