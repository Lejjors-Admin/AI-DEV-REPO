import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Clock, 
  User, 
  Calendar as CalendarIcon,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Video,
  Phone
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface Staff {
  id: number;
  name: string;
  email: string;
  role: string;
  specialties?: string[];
}

interface AvailableSlot {
  staffUserId: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  isBookable: boolean;
}

interface AppointmentRequest {
  id?: number;
  clientId: number;
  staffUserId: number;
  startAt: Date;
  endAt: Date;
  timezone: string;
  subject: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

const appointmentSchema = z.object({
  staffUserId: z.number().min(1, "Please select a staff member"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time slot"),
  duration: z.number().min(15).max(480).default(60), // 15 minutes to 8 hours
  subject: z.string().min(1, "Please provide a subject").max(255),
  note: z.string().max(1000).optional(),
  preferredMeetingType: z.enum(["in_person", "video", "phone"]).default("in_person"),
  meetingRoomId: z.number().optional(),
  timezone: z.string().default("America/Toronto"),
}).refine((data) => {
  const selectedDate = new Date(data.date);
  const now = new Date();
  return selectedDate >= startOfDay(now);
}, {
  message: "Cannot book appointments in the past",
  path: ["date"],
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const generateAvailableSlots = (
  staffAvailability: any[],
  date: Date,
  existingEvents: any[] = [],
  duration: number = 60
): AvailableSlot[] => {
  const dayOfWeek = date.getDay();
  const dateString = format(date, 'yyyy-MM-dd');
  
  // Find availability for this day of week
  const dayAvailability = staffAvailability.filter(
    (availability) => availability.weekday === dayOfWeek && availability.isActive && availability.isBookable
  );

  if (dayAvailability.length === 0) {
    return [];
  }

  const slots: AvailableSlot[] = [];

  dayAvailability.forEach((availability) => {
    const startMinutes = availability.startMinutes;
    const endMinutes = availability.endMinutes;
    const bufferMinutes = availability.bufferMinutes || 0;

    // Generate time slots with buffer
    for (let time = startMinutes; time + duration <= endMinutes; time += duration + bufferMinutes) {
      // Check if this slot conflicts with existing events
      const slotStart = time;
      const slotEnd = time + duration;
      
      const hasConflict = existingEvents.some((event) => {
        if (!isSameDay(parseISO(event.startAt), date)) return false;
        
        const eventStart = new Date(event.startAt).getHours() * 60 + new Date(event.startAt).getMinutes();
        const eventEnd = new Date(event.endAt).getHours() * 60 + new Date(event.endAt).getMinutes();
        
        return (slotStart < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict) {
        slots.push({
          staffUserId: availability.userId,
          date: dateString,
          startMinutes: slotStart,
          endMinutes: slotEnd,
          isBookable: true,
        });
      }
    }
  });

  return slots;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AppointmentBookingFormProps {
  clientId?: number; // If not provided, uses current user's client
  onSuccess?: (appointment: AppointmentRequest) => void;
  preSelectedStaffId?: number;
  preSelectedDate?: Date;
}

export default function AppointmentBookingForm({ 
  clientId, 
  onSuccess,
  preSelectedStaffId,
  preSelectedDate 
}: AppointmentBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(preSelectedDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get available staff members
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['/api/users/staff'],
    staleTime: 300000, // 5 minutes
  });

  // Get staff availability
  const { data: staffAvailability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ['/api/schedule/availability/all'],
    staleTime: 60000,
  });

  // Get existing events for conflict checking
  const { data: existingEventsData } = useQuery({
    queryKey: ['/api/schedule/events', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''],
    enabled: !!selectedDate,
    staleTime: 30000,
  });
  const existingEvents = existingEventsData?.data || [];

  // Get meeting rooms
  const { data: meetingRoomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ['/api/schedule/meeting-rooms'],
    staleTime: 300000, // 5 minutes
  });
  const meetingRooms = meetingRoomsData?.data || [];

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      staffUserId: preSelectedStaffId || 0,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      timeSlot: '',
      duration: 60,
      subject: '',
      note: '',
      preferredMeetingType: 'in_person' as const,
      timezone: 'America/Toronto',
    },
  });

  // Create appointment request mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => {
      const [hours, minutes] = data.timeSlot.split(':').map(Number);
      const startAt = new Date(data.date);
      startAt.setHours(hours, minutes, 0, 0);
      
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + data.duration);

      return apiRequest("POST", "/api/schedule/appointment-requests", {
        clientId: clientId || undefined,
        staffUserId: data.staffUserId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        timezone: data.timezone,
        subject: data.subject,
        note: data.note,
        meetingRoomId: data.meetingRoomId || undefined,
        approvedMeetingDetails: {
          preferredType: data.preferredMeetingType,
        },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/appointment-requests'] });
      setShowSuccessMessage(true);
      form.reset();
      onSuccess?.(data);
      
      toast({
        title: "Appointment request sent",
        description: "Your appointment request has been sent to the staff member for approval.",
      });

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send appointment request.",
        variant: "destructive",
      });
    }
  });

  // Update available slots when dependencies change
  useEffect(() => {
    const watchedStaffId = form.watch('staffUserId');
    const watchedDuration = form.watch('duration');
    
    if (selectedDate && watchedStaffId && staffAvailability.length > 0) {
      const staffUserAvailability = staffAvailability.filter(
        (a: any) => a.userId === watchedStaffId
      );
      
      const staffEvents = existingEvents.filter(
        (e: any) => e.organizerUserId === watchedStaffId || e.staffUserIds?.includes(watchedStaffId)
      );

      const slots = generateAvailableSlots(
        staffUserAvailability,
        selectedDate,
        staffEvents,
        watchedDuration
      );
      
      setAvailableSlots(slots);
      
      // Reset time slot if current selection is no longer available
      const currentTimeSlot = form.getValues('timeSlot');
      if (currentTimeSlot && !slots.some(slot => minutesToTime(slot.startMinutes) === currentTimeSlot)) {
        form.setValue('timeSlot', '');
      }
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, form.watch('staffUserId'), form.watch('duration'), staffAvailability, existingEvents, form]);

  // Update form when date changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue('date', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate, form]);

  const handleSubmit = (data: any) => {
    createAppointmentMutation.mutate(data);
  };

  const getSelectedStaff = () => {
    const staffId = form.watch('staffUserId');
    return staff.find((s: Staff) => s.id === staffId);
  };

  const getTimeSlotDuration = () => {
    const timeSlot = form.watch('timeSlot');
    const duration = form.watch('duration');
    
    if (!timeSlot) return '';
    
    const startMinutes = timeToMinutes(timeSlot);
    const endMinutes = startMinutes + duration;
    
    return `${minutesToTime(startMinutes)} - ${minutesToTime(endMinutes)}`;
  };

  if (showSuccessMessage) {
    return (
      <Card className="w-full max-w-2xl mx-auto" data-testid="appointment-success-card">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Appointment Request Sent!</h3>
              <p className="text-muted-foreground">
                Your appointment request has been sent to the staff member. 
                You'll receive a notification once it's been reviewed.
              </p>
            </div>
            <Button onClick={() => setShowSuccessMessage(false)} data-testid="book-another-button">
              Book Another Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="appointment-booking-form">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" />
          Book an Appointment
        </CardTitle>
        <CardDescription>
          Schedule a meeting with our team. Your request will be reviewed and confirmed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Staff Selection */}
            <FormField
              control={form.control}
              name="staffUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="staff-select">
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingStaff ? (
                        <SelectItem value="loading" disabled>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading staff...
                        </SelectItem>
                      ) : (
                        staff.map((member: Staff) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">{member.role}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          data-testid="date-picker"
                        >
                          {selectedDate ? (
                            format(selectedDate, "PPPP")
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
                        disabled={(date) => date < new Date() || date > addDays(new Date(), 90)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select a date up to 90 days in advance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration Selection */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="duration-select">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Slot Selection */}
            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Time Slots</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {loadingAvailability ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground">
                          <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          <p>No available time slots</p>
                          <p className="text-sm">
                            {form.watch('staffUserId') ? 'Try selecting a different date' : 'Please select a staff member and date'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {availableSlots.map((slot, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={field.value === minutesToTime(slot.startMinutes) ? "default" : "outline"}
                              className="justify-start"
                              onClick={() => field.onChange(minutesToTime(slot.startMinutes))}
                              data-testid={`time-slot-${minutesToTime(slot.startMinutes)}`}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {minutesToTime(slot.startMinutes)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting Type */}
            <FormField
              control={form.control}
              name="preferredMeetingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Meeting Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="meeting-type-select">
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in_person">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          In Person
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center">
                          <Video className="mr-2 h-4 w-4" />
                          Video Call
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          Phone Call
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting Room - only show if in_person is selected */}
            {form.watch('preferredMeetingType') === 'in_person' && (
              <FormField
                control={form.control}
                name="meetingRoomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Room (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="meeting-room-select">
                          <SelectValue placeholder="Select a meeting room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {loadingRooms ? (
                          <div className="px-2 py-1 text-sm text-muted-foreground">Loading rooms...</div>
                        ) : (
                          meetingRooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>{room.name}</span>
                                {room.capacity && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Capacity: {room.capacity})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Reserve a specific meeting room for this appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What would you like to discuss?"
                      {...field}
                      data-testid="subject-input"
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of the purpose of this meeting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information or specific topics you'd like to cover..."
                      {...field}
                      rows={3}
                      data-testid="notes-textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Appointment Summary */}
            {form.watch('staffUserId') && form.watch('date') && form.watch('timeSlot') && (
              <div className="p-4 bg-muted rounded-lg" data-testid="appointment-summary">
                <h4 className="font-medium mb-2">Appointment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>With: {getSelectedStaff()?.name}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Date: {format(selectedDate!, "PPPP")}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Time: {getTimeSlotDuration()}</span>
                  </div>
                  {form.watch('subject') && (
                    <div className="flex items-center">
                      <span className="mr-2">📝</span>
                      <span>Subject: {form.watch('subject')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={createAppointmentMutation.isPending}
              data-testid="submit-appointment"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Appointment Request
                </>
              )}
            </Button>

            {/* Disclaimer */}
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Please note:</p>
                <p>
                  This is a request for an appointment. A staff member will review your request and 
                  confirm the appointment. You'll receive a notification with the confirmation details.
                </p>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}