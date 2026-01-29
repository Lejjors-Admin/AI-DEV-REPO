import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon,
  Clock, 
  Users,
  Plus, 
  Settings,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import EventDrawer from "@/components/EventDrawer";
import CalendarViewTab from "@/components/CalendarViewTab";

export default function Calendar() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventDrawer, setShowEventDrawer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("calendar");

  const { user } = useAuth();
  const { toast } = useToast();

  // Role-based helper functions
  const isStaff = user?.role && ['firm_admin', 'firm_owner', 'staff', 'manager'].includes(user.role);
  const isFirmAdmin = user?.role && ['firm_admin', 'firm_owner'].includes(user.role);
  const isClient = user?.role && ['client_admin', 'client_user'].includes(user.role);

  // Get calendar events
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/schedule/events'],
    staleTime: 30000,
  });
  const events = eventsResponse?.data || [];

  // Get time entries for calendar display
  const { data: timeEntriesResponse, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['/api/time-tracking/entries'],
    staleTime: 30000,
  });
  const timeEntries = timeEntriesResponse?.data || [];

  // Transform time entries into calendar events format
  const timeEntryEvents = timeEntries
    .filter((entry: any) => entry.startTime && entry.endTime)
    .map((entry: any) => ({
      id: `time-${entry.id}`,
      title: `⏱️ ${entry.description || 'Time Entry'}`,
      startAt: entry.startTime,
      endAt: entry.endTime,
      status: 'time-entry',
      type: 'time-entry',
      organizerUserId: entry.userId,
      metadata: {
        timeEntryId: entry.id,
        projectId: entry.projectId,
        taskId: entry.taskId,
        billable: entry.type === 'billable',
        duration: entry.duration
      }
    }));

  // Merge calendar events and time entries
  const allEvents = [...events, ...timeEntryEvents];
  const isLoading = eventsLoading || timeEntriesLoading;

  // Get the appropriate default tab based on user role
  const getDefaultTab = () => {
    return 'calendar';
  };

  // Initialize activeTab with role-appropriate default
  useEffect(() => {
    if (!activeTab || activeTab === 'calendar') {
      setActiveTab(getDefaultTab());
    }
  }, [user?.role]);

  // Event handlers
  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventDrawer(true);
  };

  const handleCreateNewEvent = (date?: Date, time?: string) => {
    setSelectedEvent(null);
    setShowEventDrawer(true);
  };

  const handleEventSaved = () => {
    toast({
      title: "Event saved",
      description: "The calendar event has been successfully saved.",
    });
  };

  const handleEventDeleted = () => {
    toast({
      title: "Event deleted",
      description: "The calendar event has been deleted.",
    });
  };

  // Update event mutation (for drag-and-drop)
  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, updates }: { eventId: number; updates: { startAt: string; endAt: string } }) => {
      return apiRequest('PATCH', `/api/schedule/events/${eventId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/events'] });
      toast({
        title: "Event rescheduled",
        description: "The event has been moved and any linked tasks have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reschedule",
        description: error?.message || "Unable to update the event. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEventUpdate = (eventId: number, updates: { startAt: string; endAt: string }) => {
    updateEventMutation.mutate({ eventId, updates });
  };

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Scheduling</h1>
          <p className="text-muted-foreground">
            {isClient ? 
              "Book appointments and manage your schedule" : 
              "Manage calendar events, availability, and appointments"
            }
          </p>
        </div>
      </div>

      {/* Role-based Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="calendar-tabs">
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-3">
          {/* Calendar tab - available to all users */}
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          
          {/* Availability management - staff only */}
          {isStaff && (
            <TabsTrigger value="availability" data-testid="tab-availability">
              <Clock className="mr-2 h-4 w-4" />
              Availability
            </TabsTrigger>
          )}
          
          {/* Team management - firm admin only */}
          {isFirmAdmin && (
            <TabsTrigger value="team-schedule" data-testid="tab-team-schedule">
              <Users className="mr-2 h-4 w-4" />
              Team Schedule
            </TabsTrigger>
          )}
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <CalendarViewTab 
            view={view}
            setView={setView}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            events={allEvents}
            isLoading={isLoading}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateNewEvent}
            onEventUpdate={handleEventUpdate}
            isStaff={isStaff}
          />
        </TabsContent>

        {/* Availability Management - Staff Only */}
        {isStaff && (
          <TabsContent value="availability" className="space-y-4">
            <AvailabilityEditor readonly={false} />
          </TabsContent>
        )}

        {/* Team Schedule - Firm Admin Only */}
        {isFirmAdmin && (
          <TabsContent value="team-schedule" className="space-y-4">
            <Card data-testid="team-schedule-card">
              <CardHeader>
                <CardTitle>Team Schedule Overview</CardTitle>
                <CardDescription>
                  View and manage availability for all team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Team schedule management features are coming soon. This will include 
                    viewing all staff availability, managing team calendars, and scheduling 
                    coordination tools.
                  </AlertDescription>
                </Alert>
                
                {/* Preview of upcoming features */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">Upcoming Features:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>View all staff members' availability in a unified calendar</li>
                    <li>Manage team-wide calendar settings and policies</li>
                    <li>Coordinate scheduling across multiple team members</li>
                    <li>Generate team availability reports</li>
                    <li>Set firm-wide holiday and closure schedules</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Event Drawer */}
      <EventDrawer
        open={showEventDrawer}
        onOpenChange={setShowEventDrawer}
        event={selectedEvent}
        defaultDate={selectedDate}
        onEventSaved={handleEventSaved}
        onEventDeleted={handleEventDeleted}
      />
    </div>
  );
}