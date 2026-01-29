import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfWeek, endOfWeek, addDays } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar as CalendarIcon,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface UserAvailability {
  id?: number;
  userId: number;
  firmId: number;
  weekday: number; // 0=Sunday, 1=Monday, etc.
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  isBookable: boolean;
  bufferMinutes: number;
  notes?: string;
}

interface AvailabilityException {
  id?: number;
  userId: number;
  firmId: number;
  date: string; // YYYY-MM-DD format
  startMinutes?: number;
  endMinutes?: number;
  isAvailable: boolean;
  reason?: string;
  notes?: string;
  isBookable: boolean;
}

const availabilitySchema = z.object({
  startMinutes: z.number().min(0).max(1440),
  endMinutes: z.number().min(0).max(1440),
  isActive: z.boolean(),
  isBookable: z.boolean(),
  bufferMinutes: z.number().min(0).max(120),
  notes: z.string().optional(),
}).refine((data) => data.endMinutes > data.startMinutes, {
  message: "End time must be after start time",
  path: ["endMinutes"],
});

const exceptionSchema = z.object({
  date: z.string(),
  startMinutes: z.number().optional(),
  endMinutes: z.number().optional(),
  isAvailable: z.boolean(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  isBookable: z.boolean(),
}).refine((data) => {
  if (data.startMinutes !== undefined && data.endMinutes !== undefined) {
    return data.endMinutes > data.startMinutes;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endMinutes"],
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const WEEKDAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AvailabilityEditorProps {
  userId?: number; // If not provided, uses current user
  readonly?: boolean; // View-only mode for other users
}

export default function AvailabilityEditor({ userId, readonly = false }: AvailabilityEditorProps) {
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityException | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user's availability
  const { data: availabilityResponse, isLoading: loadingAvailability } = useQuery({
    queryKey: ['/api/schedule/availability', userId],
    staleTime: 60000,
  });
  const availability = availabilityResponse?.data || [];

  // Get user's availability exceptions
  const { data: exceptionsResponse, isLoading: loadingExceptions } = useQuery({
    queryKey: ['/api/schedule/exceptions', userId],
    staleTime: 60000,
  });
  const exceptions = exceptionsResponse?.data || [];

  // Create/update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: { weekday: number; availability: Partial<UserAvailability> }) =>
      apiRequest("POST", "/api/schedule/availability", {
        ...data.availability,
        weekday: data.weekday,
        userId: userId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/availability'] });
      toast({
        title: "Availability updated",
        description: "Your availability has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability.",
        variant: "destructive",
      });
    }
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: (availabilityId: number) =>
      apiRequest("DELETE", `/api/schedule/availability/${availabilityId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/availability'] });
      toast({
        title: "Availability removed",
        description: "The availability slot has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove availability.",
        variant: "destructive",
      });
    }
  });

  // Create/update exception mutation
  const updateExceptionMutation = useMutation({
    mutationFn: (exceptionData: Partial<AvailabilityException>) =>
      apiRequest("POST", "/api/schedule/exceptions", {
        ...exceptionData,
        userId: userId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/exceptions'] });
      setShowExceptionDialog(false);
      setEditingException(null);
      setSelectedDate(null);
      toast({
        title: "Exception updated",
        description: "Your availability exception has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability exception.",
        variant: "destructive",
      });
    }
  });

  // Delete exception mutation
  const deleteExceptionMutation = useMutation({
    mutationFn: (exceptionId: number) =>
      apiRequest("DELETE", `/api/schedule/exceptions/${exceptionId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/exceptions'] });
      toast({
        title: "Exception removed",
        description: "The availability exception has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove exception.",
        variant: "destructive",
      });
    }
  });

  // Get availability for a specific weekday
  const getAvailabilityForWeekday = (weekday: number): UserAvailability | null => {
    return availability.find((a: UserAvailability) => a.weekday === weekday) || null;
  };

  // Handle saving availability for a weekday
  const handleSaveAvailability = (weekday: number, data: any) => {
    updateAvailabilityMutation.mutate({ weekday, availability: data });
  };

  // Handle exception creation/editing
  const handleSaveException = (data: any) => {
    const exceptionData = {
      ...data,
      id: editingException?.id,
    };
    updateExceptionMutation.mutate(exceptionData);
  };

  // Get exceptions for a specific date
  const getExceptionsForDate = (date: Date): AvailabilityException[] => {
    const dateString = format(date, 'yyyy-MM-dd');
    return exceptions.filter((e: AvailabilityException) => e.date === dateString);
  };

  return (
    <div className="space-y-6" data-testid="availability-editor">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Availability Management</h2>
          <p className="text-muted-foreground">
            {readonly ? "View availability schedule" : "Manage your weekly availability and exceptions"}
          </p>
        </div>
        {!readonly && (
          <Button 
            onClick={() => {
              setEditingException(null);
              setShowExceptionDialog(true);
            }}
            data-testid="add-exception-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Exception
          </Button>
        )}
      </div>

      {/* Weekly Availability */}
      <Card data-testid="weekly-availability-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Set your regular weekly working hours. Clients can book appointments during these times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAvailability ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {WEEKDAYS.map((day) => (
                <WeekdayAvailability
                  key={day.value}
                  weekday={day}
                  availability={getAvailabilityForWeekday(day.value)}
                  onSave={(data) => handleSaveAvailability(day.value, data)}
                  onDelete={(id) => deleteAvailabilityMutation.mutate(id)}
                  readonly={readonly}
                  isLoading={updateAvailabilityMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Exceptions */}
      <Card data-testid="availability-exceptions-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Availability Exceptions
          </CardTitle>
          <CardDescription>
            Manage vacation days, sick leave, and other schedule exceptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExceptions ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarIcon className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No availability exceptions set</p>
              {!readonly && (
                <p className="text-sm">Click "Add Exception" to create schedule exceptions</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exception: AvailabilityException) => (
                <ExceptionCard
                  key={exception.id}
                  exception={exception}
                  onEdit={() => {
                    setEditingException(exception);
                    setShowExceptionDialog(true);
                  }}
                  onDelete={() => deleteExceptionMutation.mutate(exception.id!)}
                  readonly={readonly}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exception Dialog */}
      <ExceptionDialog
        open={showExceptionDialog}
        onClose={() => {
          setShowExceptionDialog(false);
          setEditingException(null);
          setSelectedDate(null);
        }}
        exception={editingException}
        onSave={handleSaveException}
        isLoading={updateExceptionMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// WEEKDAY AVAILABILITY COMPONENT
// ============================================================================

interface WeekdayAvailabilityProps {
  weekday: { label: string; value: number };
  availability: UserAvailability | null;
  onSave: (data: any) => void;
  onDelete: (id: number) => void;
  readonly: boolean;
  isLoading: boolean;
}

function WeekdayAvailability({ 
  weekday, 
  availability, 
  onSave, 
  onDelete, 
  readonly,
  isLoading 
}: WeekdayAvailabilityProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      startMinutes: availability?.startMinutes || 540, // 9:00 AM
      endMinutes: availability?.endMinutes || 1020, // 5:00 PM
      isActive: availability?.isActive ?? true,
      isBookable: availability?.isBookable ?? true,
      bufferMinutes: availability?.bufferMinutes || 0,
      notes: availability?.notes || "",
    },
  });

  useEffect(() => {
    if (availability) {
      form.reset({
        startMinutes: availability.startMinutes,
        endMinutes: availability.endMinutes,
        isActive: availability.isActive,
        isBookable: availability.isBookable,
        bufferMinutes: availability.bufferMinutes,
        notes: availability.notes || "",
      });
    }
  }, [availability, form]);

  const handleSave = () => {
    const values = form.getValues();
    onSave(values);
    setIsEditing(false);
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg"
      data-testid={`weekday-availability-${weekday.value}`}
    >
      <div className="flex items-center space-x-4">
        <div className="w-20">
          <Label className="font-medium">{weekday.label}</Label>
        </div>
        
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Select
              value={minutesToTime(form.watch('startMinutes'))}
              onValueChange={(value) => form.setValue('startMinutes', timeToMinutes(value))}
            >
              <SelectTrigger className="w-24" data-testid={`start-time-${weekday.value}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-muted-foreground">to</span>
            
            <Select
              value={minutesToTime(form.watch('endMinutes'))}
              onValueChange={(value) => form.setValue('endMinutes', timeToMinutes(value))}
            >
              <SelectTrigger className="w-24" data-testid={`end-time-${weekday.value}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch('isBookable')}
                onCheckedChange={(value) => form.setValue('isBookable', value)}
                data-testid={`bookable-${weekday.value}`}
              />
              <Label className="text-sm">Bookable</Label>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            {availability?.isActive ? (
              <>
                <span className="text-sm">
                  {minutesToTime(availability.startMinutes)} - {minutesToTime(availability.endMinutes)}
                </span>
                {availability.isBookable && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Bookable
                  </Badge>
                )}
                {availability.bufferMinutes > 0 && (
                  <Badge variant="outline">
                    {availability.bufferMinutes}m buffer
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Not available</span>
            )}
          </div>
        )}
      </div>

      {!readonly && (
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isLoading}
                data-testid={`save-${weekday.value}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancel}
                data-testid={`cancel-${weekday.value}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsEditing(true)}
                data-testid={`edit-${weekday.value}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {availability && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onDelete(availability.id!)}
                  data-testid={`delete-${weekday.value}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXCEPTION CARD COMPONENT
// ============================================================================

interface ExceptionCardProps {
  exception: AvailabilityException;
  onEdit: () => void;
  onDelete: () => void;
  readonly: boolean;
}

function ExceptionCard({ exception, onEdit, onDelete, readonly }: ExceptionCardProps) {
  const getExceptionTypeIcon = () => {
    if (!exception.isAvailable) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getExceptionTypeText = () => {
    if (!exception.isAvailable) {
      return "Unavailable";
    }
    return "Available Override";
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg"
      data-testid={`exception-${exception.id}`}
    >
      <div className="flex items-center space-x-3">
        {getExceptionTypeIcon()}
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">
              {format(parseISO(exception.date), "EEEE, MMMM d, yyyy")}
            </span>
            <Badge variant={exception.isAvailable ? "default" : "destructive"}>
              {getExceptionTypeText()}
            </Badge>
          </div>
          {(exception.startMinutes !== undefined && exception.endMinutes !== undefined) && (
            <span className="text-sm text-muted-foreground">
              {minutesToTime(exception.startMinutes)} - {minutesToTime(exception.endMinutes)}
            </span>
          )}
          {exception.reason && (
            <span className="text-sm text-muted-foreground block">
              Reason: {exception.reason}
            </span>
          )}
        </div>
      </div>

      {!readonly && (
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onEdit}
            data-testid={`edit-exception-${exception.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={onDelete}
            data-testid={`delete-exception-${exception.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXCEPTION DIALOG COMPONENT
// ============================================================================

interface ExceptionDialogProps {
  open: boolean;
  onClose: () => void;
  exception: AvailabilityException | null;
  onSave: (data: any) => void;
  isLoading: boolean;
}

function ExceptionDialog({ open, onClose, exception, onSave, isLoading }: ExceptionDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    exception ? parseISO(exception.date) : new Date()
  );

  const form = useForm({
    resolver: zodResolver(exceptionSchema),
    defaultValues: {
      date: exception?.date || format(new Date(), 'yyyy-MM-dd'),
      startMinutes: exception?.startMinutes,
      endMinutes: exception?.endMinutes,
      isAvailable: exception?.isAvailable ?? false,
      reason: exception?.reason || "",
      notes: exception?.notes || "",
      isBookable: exception?.isBookable ?? false,
    },
  });

  useEffect(() => {
    if (selectedDate) {
      form.setValue('date', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  useEffect(() => {
    if (exception) {
      form.reset({
        date: exception.date,
        startMinutes: exception.startMinutes,
        endMinutes: exception.endMinutes,
        isAvailable: exception.isAvailable,
        reason: exception.reason || "",
        notes: exception.notes || "",
        isBookable: exception.isBookable,
      });
      setSelectedDate(parseISO(exception.date));
    } else if (open) {
      // Reset for new exception
      const today = new Date();
      form.reset({
        date: format(today, 'yyyy-MM-dd'),
        startMinutes: undefined,
        endMinutes: undefined,
        isAvailable: false,
        reason: "",
        notes: "",
        isBookable: false,
      });
      setSelectedDate(today);
    }
  }, [exception, open, form]);

  const handleSubmit = (data: any) => {
    onSave(data);
  };

  const isFullDayException = form.watch('startMinutes') === undefined || form.watch('endMinutes') === undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="exception-dialog">
        <DialogHeader>
          <DialogTitle>
            {exception ? "Edit" : "Add"} Availability Exception
          </DialogTitle>
          <DialogDescription>
            Set availability exceptions for specific dates (vacation, sick days, extended hours, etc.)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                          data-testid="exception-date-picker"
                        >
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Available/Unavailable Toggle */}
            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Available</FormLabel>
                    <FormDescription>
                      Toggle whether you're available or unavailable on this date
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="exception-available-toggle"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Time Range (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (Optional)</FormLabel>
                    <Select
                      value={field.value !== undefined ? minutesToTime(field.value) : ""}
                      onValueChange={(value) => field.onChange(value ? timeToMinutes(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="exception-start-time">
                          <SelectValue placeholder="Full day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Full day</SelectItem>
                        {generateTimeOptions().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
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
                name="endMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time (Optional)</FormLabel>
                    <Select
                      value={field.value !== undefined ? minutesToTime(field.value) : ""}
                      onValueChange={(value) => field.onChange(value ? timeToMinutes(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="exception-end-time">
                          <SelectValue placeholder="Full day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Full day</SelectItem>
                        {generateTimeOptions().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bookable Toggle */}
            {form.watch('isAvailable') && (
              <FormField
                control={form.control}
                name="isBookable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Allow Client Bookings</FormLabel>
                      <FormDescription>
                        Allow clients to book appointments during this exception time
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="exception-bookable-toggle"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="exception-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="extended_hours">Extended Hours</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this exception..."
                      {...field}
                      data-testid="exception-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="exception-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="exception-save"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Exception"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}