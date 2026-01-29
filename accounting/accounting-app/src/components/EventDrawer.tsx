import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addMinutes } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Clock,
  Users,
  MapPin,
  Video,
  Link,
  Plus,
  X,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  Repeat,
  User,
  Building,
  Eye,
  EyeOff
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiConfig } from "@/lib/api-config";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface CalendarEvent {
  id?: number;
  firmId: number;
  clientId?: number;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  organizerUserId: number;
  staffUserIds: number[];
  clientUserIds: number[];
  location?: string;
  videoLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'firm' | 'client' | 'private';
  source: 'internal' | 'google' | 'outlook';
  notes?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
    occurrences?: number;
  };
}

const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional(),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  timezone: z.string().default("America/Toronto"),
  clientId: z.number().optional(),
  staffUserIds: z.array(z.number()).default([]),
  clientUserIds: z.array(z.number()).default([]),
  location: z.string().max(500).optional(),
  videoLink: z.string().url().optional().or(z.literal("")),
  status: z.enum(["confirmed", "tentative", "cancelled"]).default("confirmed"),
  visibility: z.enum(["firm", "client", "private"]).default("firm"),
  notes: z.string().max(1000).optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().min(1).max(99),
    daysOfWeek: z.array(z.number()).optional(),
    endDate: z.string().optional(),
    occurrences: z.number().min(1).max(999).optional(),
  }).optional(),
}).refine((data) => {
  const start = new Date(data.startAt);
  const end = new Date(data.endAt);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endAt"],
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateTimeOptions = (): string[] => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  return options;
};

const formatDateTimeLocal = (dateTime: string): string => {
  const date = new Date(dateTime);
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

const getDefaultEndTime = (startTime: string): string => {
  const start = new Date(startTime);
  const end = addMinutes(start, 60); // Default 1-hour duration
  return end.toISOString();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface EventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
  defaultTime?: string;
  trigger?: React.ReactNode;
  onEventSaved?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: number) => void;
}

export default function EventDrawer({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultTime,
  trigger,
  onEventSaved,
  onEventDeleted,
}: EventDrawerProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [pendingEventData, setPendingEventData] = useState<any>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get clients for selection
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    staleTime: 300000,
  });

  // Get staff members for participant selection
  const { data: staff = [] } = useQuery({
    queryKey: ['/api/users/staff'],
    staleTime: 300000,
  });

  // Get client users for participant selection
  const { data: clientUsers = [] } = useQuery({
    queryKey: ['/api/users/clients'],
    staleTime: 300000,
  });

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startAt: defaultDate ? 
        (defaultTime ? 
          format(new Date(`${format(defaultDate, 'yyyy-MM-dd')}T${defaultTime}`), "yyyy-MM-dd'T'HH:mm") :
          format(defaultDate, "yyyy-MM-dd'T'09:00")
        ) : 
        format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endAt: "",
      timezone: "America/Toronto",
      clientId: undefined,
      staffUserIds: [],
      clientUserIds: [],
      location: "",
      videoLink: "",
      status: "confirmed" as const,
      visibility: "firm" as const,
      notes: "",
      isRecurring: false,
      recurringPattern: undefined,
    },
  });

  // Auto-generate end time when start time changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'startAt' && value.startAt && !event) {
        const endTime = getDefaultEndTime(value.startAt);
        form.setValue('endAt', formatDateTimeLocal(endTime));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, event]);

  // Load event data when editing
  useEffect(() => {
    if (event && open) {
      form.reset({
        title: event.title,
        description: event.description || "",
        startAt: formatDateTimeLocal(event.startAt),
        endAt: formatDateTimeLocal(event.endAt),
        timezone: event.timezone,
        clientId: event.clientId,
        staffUserIds: event.staffUserIds || [],
        clientUserIds: event.clientUserIds || [],
        location: event.location || "",
        videoLink: event.videoLink || "",
        status: event.status,
        visibility: event.visibility,
        notes: event.notes || "",
        isRecurring: event.isRecurring || false,
        recurringPattern: event.recurringPattern,
      });
      setShowRecurringOptions(event.isRecurring || false);
    } else if (!event && open) {
      // Reset form for new event
      const startTime = defaultDate ? 
        (defaultTime ? 
          format(new Date(`${format(defaultDate, 'yyyy-MM-dd')}T${defaultTime}`), "yyyy-MM-dd'T'HH:mm") :
          format(defaultDate, "yyyy-MM-dd'T'09:00")
        ) : 
        format(new Date(), "yyyy-MM-dd'T'HH:mm");
      
      form.reset({
        title: "",
        description: "",
        startAt: startTime,
        endAt: formatDateTimeLocal(getDefaultEndTime(startTime)),
        timezone: "America/Toronto",
        clientId: undefined,
        staffUserIds: [],
        clientUserIds: [],
        location: "",
        videoLink: "",
        status: "confirmed",
        visibility: "firm",
        notes: "",
        isRecurring: false,
        recurringPattern: undefined,
      });
      setShowRecurringOptions(false);
    }
  }, [event, open, form, defaultDate, defaultTime]);

  // Create/Update event mutation
  const saveEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = event?.id ? `/api/schedule/events/${event.id}` : '/api/schedule/events';
      const method = event?.id ? 'PATCH' : 'POST';
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      try {
        // Prepare request body - only send fields that match the schema
        // Convert empty strings to undefined to avoid validation issues
        const requestBody: any = {
          title: data.title,
          startAt: new Date(data.startAt).toISOString(),
          endAt: new Date(data.endAt).toISOString(),
          timezone: data.timezone || "America/Toronto",
          status: data.status || "confirmed",
          visibility: data.visibility || "firm",
          isRecurring: data.isRecurring || false,
        };
        
        // Add optional fields only if they have values
        if (data.description?.trim()) {
          requestBody.description = data.description.trim();
        }
        if (data.clientId) {
          requestBody.clientId = data.clientId;
        }
        // Always include arrays (even if empty) as schema expects them
        requestBody.staffUserIds = Array.isArray(data.staffUserIds) ? data.staffUserIds : [];
        requestBody.clientUserIds = Array.isArray(data.clientUserIds) ? data.clientUserIds : [];
        if (data.location?.trim()) {
          requestBody.location = data.location.trim();
        }
        if (data.videoLink?.trim()) {
          requestBody.videoLink = data.videoLink.trim();
        }
        if (data.notes?.trim()) {
          requestBody.notes = data.notes.trim();
        }
        if (data.recurringPattern) {
          requestBody.recurringPattern = data.recurringPattern;
        }
        
        // Don't send organizerUserId - backend sets it from user context
        // Don't send ignoreConflicts - it's handled as a query param if needed
        
        console.log('📅 Frontend: Sending event data:', requestBody);
        
        const response = await fetch(apiConfig.buildUrl(endpoint), {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        // Handle conflict response (409)
        if (response.status === 409) {
          throw {
            status: 409,
            conflicts: result.conflicts,
            blockedTime: result.blockedTime,
            eventData: result.eventData,
            message: result.message
          };
        }

        if (!response.ok) {
          // Log detailed error information
          console.error('❌ Frontend: Event creation failed:', {
            status: response.status,
            statusText: response.statusText,
            result: result
          });
          
          // If validation errors are provided, show them
          if (result.errors && Array.isArray(result.errors)) {
            const errorMessages = result.errors.map((err: any) => 
              `${err.path?.join('.') || 'field'}: ${err.message}`
            ).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
          }
          
          throw new Error(result.message || 'Failed to save event');
        }

        return result.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (eventData) => {
      // No conflicts - proceed normally
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/events'] });
      onOpenChange(false);
      onEventSaved?.(eventData);
      
      toast({
        title: event?.id ? "Event updated" : "Event created",
        description: event?.id ? 
          "The event has been successfully updated." :
          "The event has been successfully created.",
      });
    },
    onError: (error: any) => {
      // Phase 3.4: Handle conflict errors (409)
      if (error?.status === 409) {
        setConflictInfo(error.conflicts);
        setPendingEventData(error.eventData);
        setShowConflictDialog(true);
        return;
      }

      toast({
        title: "Error",
        description: error?.message || "Failed to save event.",
        variant: "destructive",
      });
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/schedule/events/${event!.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/events'] });
      onOpenChange(false);
      onEventDeleted?.(event!.id!);
      setShowDeleteDialog(false);
      
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete event.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: any) => {
    saveEventMutation.mutate(data);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteEventMutation.mutate();
  };

  const isStaff = user?.role && ['firm_admin', 'firm_staff', 'super_admin'].includes(user.role);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger && (
          <SheetTrigger asChild>
            {trigger}
          </SheetTrigger>
        )}
        
        <SheetContent className="sm:max-w-[600px] overflow-y-auto" data-testid="event-drawer">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              {event?.id ? "Edit Event" : "Create New Event"}
            </SheetTitle>
            <SheetDescription>
              {event?.id ? 
                "Update the event details below." :
                "Fill in the details to create a new calendar event."
              }
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter event title..."
                        {...field}
                        data-testid="event-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Event description..."
                        rows={3}
                        {...field}
                        data-testid="event-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="event-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="event-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Timezone */}
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="event-timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="America/Toronto">Eastern Time (Toronto)</SelectItem>
                        <SelectItem value="America/Vancouver">Pacific Time (Vancouver)</SelectItem>
                        <SelectItem value="America/Edmonton">Mountain Time (Edmonton)</SelectItem>
                        <SelectItem value="America/Winnipeg">Central Time (Winnipeg)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Client Association (Staff Only) */}
              {isStaff && (
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Client (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="event-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No client</SelectItem>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Associate this event with a specific client for tracking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Participants */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Participants</span>
                </div>

                {/* Staff Participants */}
                {isStaff && (
                  <FormField
                    control={form.control}
                    name="staffUserIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Members</FormLabel>
                        <div className="space-y-2">
                          {staff.map((member: any) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`staff-${member.id}`}
                                checked={field.value.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, member.id]);
                                  } else {
                                    field.onChange(field.value.filter((id: number) => id !== member.id));
                                  }
                                }}
                                data-testid={`staff-checkbox-${member.id}`}
                              />
                              <label htmlFor={`staff-${member.id}`} className="text-sm">
                                {member.name} ({member.role})
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Client Participants */}
                <FormField
                  control={form.control}
                  name="clientUserIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Users</FormLabel>
                      <div className="space-y-2">
                        {clientUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No client users available</p>
                        ) : (
                          clientUsers.map((clientUser: any) => (
                            <div key={clientUser.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`client-${clientUser.id}`}
                                checked={field.value.includes(clientUser.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, clientUser.id]);
                                  } else {
                                    field.onChange(field.value.filter((id: number) => id !== clientUser.id));
                                  }
                                }}
                                data-testid={`client-checkbox-${clientUser.id}`}
                              />
                              <label htmlFor={`client-${clientUser.id}`} className="text-sm">
                                {clientUser.name} ({clientUser.email})
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Location & Meeting Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Meeting Details</span>
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Meeting room, address, or 'Online'"
                          {...field}
                          data-testid="event-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Meeting Link (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://zoom.us/j/... or Teams meeting link"
                          {...field}
                          data-testid="event-video-link"
                        />
                      </FormControl>
                      <FormDescription>
                        Zoom, Teams, Google Meet, or other video conferencing link
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Status & Visibility */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="event-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="tentative">Tentative</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="event-visibility">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="firm">
                            <div className="flex items-center">
                              <Building className="mr-2 h-4 w-4" />
                              Firm Internal
                            </div>
                          </SelectItem>
                          <SelectItem value="client">
                            <div className="flex items-center">
                              <Eye className="mr-2 h-4 w-4" />
                              Client Visible
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center">
                              <EyeOff className="mr-2 h-4 w-4" />
                              Private
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Recurring Events */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center">
                          <Repeat className="mr-2 h-4 w-4" />
                          Recurring Event
                        </FormLabel>
                        <FormDescription>
                          Create a repeating event series
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setShowRecurringOptions(checked);
                          }}
                          data-testid="event-recurring-toggle"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {showRecurringOptions && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurringPattern.frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="recurring-frequency">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurringPattern.interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interval</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                data-testid="recurring-interval"
                              />
                            </FormControl>
                            <FormDescription>
                              Every {field.value || 1} {form.watch('recurringPattern.frequency') || 'day'}(s)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurringPattern.endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="recurring-end-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurringPattern.occurrences"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occurrences (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="999"
                                placeholder="No limit"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="recurring-occurrences"
                              />
                            </FormControl>
                            <FormDescription>
                              Number of times to repeat
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal notes for staff reference..."
                        rows={3}
                        {...field}
                        data-testid="event-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      These notes are only visible to staff members
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="flex justify-between">
                <div className="flex space-x-2">
                  {event?.id && isStaff && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteEventMutation.isPending}
                      data-testid="event-delete"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="event-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveEventMutation.isPending}
                    data-testid="event-save"
                  >
                    {saveEventMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {event?.id ? "Update Event" : "Create Event"}
                      </>
                    )}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
              Delete Event
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
              {form.watch('isRecurring') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Note:</strong> This will delete the entire recurring event series.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteEventMutation.isPending}
              data-testid="delete-confirm"
            >
              {deleteEventMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Event"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Warning Dialog - Phase 3.4 */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent data-testid="conflict-warning-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
              Scheduling Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This event overlaps with existing appointments:</p>
              {conflictInfo?.conflicts && conflictInfo.conflicts.length > 0 && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {conflictInfo.conflicts.map((conflict: any) => (
                    <div key={conflict.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="font-medium">{conflict.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(conflict.startAt), 'MMM d, yyyy h:mm a')} - 
                        {format(new Date(conflict.endAt), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm">Do you want to proceed with this scheduling anyway?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              data-testid="conflict-cancel"
              onClick={() => {
                setShowConflictDialog(false);
                setConflictInfo(null);
                setPendingEventData(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Proceed with the event despite conflicts - retry with ignoreConflicts flag
                setShowConflictDialog(false);
                if (pendingEventData) {
                  saveEventMutation.mutate({ 
                    ...pendingEventData, 
                    ignoreConflicts: true 
                  });
                }
              }}
              className="bg-yellow-500 hover:bg-yellow-600"
              data-testid="conflict-proceed-button"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}