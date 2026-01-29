import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BookOpen, 
  Plus, 
  Settings,
  Info,
  Filter,
  X as XIcon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import AppointmentBookingForm from "@/components/AppointmentBookingForm";
import EventDrawer from "@/components/EventDrawer";
import CalendarViewTab from "@/components/CalendarViewTab";
import CalendarSharingDialog from "@/components/CalendarSharingDialog";
import StaffAvailabilityManager from "@/components/StaffAvailabilityManager";
import TeamScheduleView from "@/components/TeamScheduleView";

export default function CalendarNew() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventDrawer, setShowEventDrawer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("calendar");

  const { user } = useAuth();
  const { toast } = useToast();

  // Role-based helper functions
  const isStaff = user?.role && ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(user.role);
  const isFirmAdmin = user?.role && ['firm_admin', 'firm_owner', 'super_admin', 'admin', 'system_admin'].includes(user.role);
  const isManagement = user?.role && ['firm_admin', 'firm_owner', 'manager', 'super_admin', 'admin', 'system_admin'].includes(user.role) || user?.isManager;
  const isClient = user?.role && ['client_admin', 'client_user'].includes(user.role);

  // Phase 3.5: Filter state
  // Default to personal view for regular staff, firm view for management
  const [showPersonalOnly, setShowPersonalOnly] = useState(true);
  const [filterStaffId, setFilterStaffId] = useState<string>("all");
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showStaffColors, setShowStaffColors] = useState(false);
  const [showSharingDialog, setShowSharingDialog] = useState(false);
  const [hasInitializedView, setHasInitializedView] = useState(false);

  // Initialize showPersonalOnly based on role once user loads (only once)
  useEffect(() => {
    if (user && !hasInitializedView) {
      setShowPersonalOnly(!isManagement);
      setHasInitializedView(true);
    }
  }, [user, isManagement, hasInitializedView]);

  // Debug logging
  console.log('CalendarNew - user:', user);
  console.log('CalendarNew - isStaff:', isStaff);
  console.log('CalendarNew - isFirmAdmin:', isFirmAdmin);
  console.log('CalendarNew - isManagement:', isManagement);

  // Get calendar events
  const { data: eventsResponse, isLoading = false } = useQuery({
    queryKey: ['/api/schedule/events'],
    staleTime: 30000,
  });
  const events = eventsResponse?.data || [];

  // Phase 3.5: Get users for staff filter
  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!isStaff,
    staleTime: 60000,
  });
  const users = usersData?.users || [];

  // Phase 3.5: Get clients for client filter
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!isStaff,
    staleTime: 60000,
  });

  // Phase 3.5: Filter events based on selections
  const filteredEvents = useMemo(() => {
    let filtered = [...(events as any[])];

    // Personal view filter
    if (showPersonalOnly && user?.id) {
      filtered = filtered.filter(event => {
        const isOrganizer = event.organizerUserId === user.id;
        const isStaffParticipant = event.staffUserIds?.includes(user.id);
        const isClientParticipant = event.clientUserIds?.includes(user.id);
        return isOrganizer || isStaffParticipant || isClientParticipant;
      });
    }

    // Staff filter
    if (filterStaffId && filterStaffId !== "all") {
      const staffId = parseInt(filterStaffId);
      filtered = filtered.filter(event => {
        const isOrganizer = event.organizerUserId === staffId;
        const isParticipant = event.staffUserIds?.includes(staffId);
        return isOrganizer || isParticipant;
      });
    }

    // Client filter
    if (filterClientId && filterClientId !== "all") {
      const clientId = parseInt(filterClientId);
      filtered = filtered.filter(event => {
        return event.clientId === clientId || event.clientUserIds?.includes(clientId);
      });
    }

    return filtered;
  }, [events, showPersonalOnly, filterStaffId, filterClientId, user?.id]);

  // Get the appropriate default tab based on user role
  const getDefaultTab = () => {
    if (isClient) return 'book-appointment';
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

  const handleAppointmentSuccess = () => {
    toast({
      title: "Appointment requested",
      description: "Your appointment request has been submitted for review.",
    });
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
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          {isStaff && (
            <Button 
              variant="outline"
              onClick={() => setShowSharingDialog(true)}
              data-testid="share-calendar-button"
            >
              <Users className="mr-2 h-4 w-4" />
              Share Calendar
            </Button>
          )}
          {isManagement && (
            <Button 
              variant="outline"
              onClick={() => setActiveTab('availability')}
              data-testid="manage-availability-button"
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage Availability
            </Button>
          )}
          {isStaff && (
            <Button 
              onClick={() => handleCreateNewEvent()}
              data-testid="create-event-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          )}
        </div>
      </div>

      {/* Role-based Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="calendar-tabs">
        <TabsList className={`grid w-full ${isManagement ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
          {/* Calendar tab - available to all users */}
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          
          {/* Appointment booking - for clients and staff */}
          <TabsTrigger value="book-appointment" data-testid="tab-book-appointment">
            <BookOpen className="mr-2 h-4 w-4" />
            {isClient ? "Book Appointment" : "Client Booking"}
          </TabsTrigger>
          
          {/* Availability management - management only */}
          {isManagement && (
            <TabsTrigger value="availability" data-testid="tab-availability">
              <Clock className="mr-2 h-4 w-4" />
              Availability
            </TabsTrigger>
          )}
          
          {/* Team Schedule - management only */}
          {isManagement && (
            <TabsTrigger value="team-schedule" data-testid="tab-team-schedule">
              <Users className="mr-2 h-4 w-4" />
              Team Schedule
            </TabsTrigger>
          )}
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Phase 3.5: Filters and Toggle */}
          {isStaff && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Personal/Firm Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="personal-view"
                      checked={showPersonalOnly}
                      onCheckedChange={setShowPersonalOnly}
                      data-testid="personal-view-toggle"
                    />
                    <Label htmlFor="personal-view" className="cursor-pointer">
                      {showPersonalOnly ? "Personal Calendar" : "All Events"}
                    </Label>
                  </div>

                  {/* Phase 3.5: Staff Colors Toggle (for admins/managers when viewing all events) */}
                  {isFirmAdmin && !showPersonalOnly && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="staff-colors"
                        checked={showStaffColors}
                        onCheckedChange={setShowStaffColors}
                        data-testid="staff-colors-toggle"
                      />
                      <Label htmlFor="staff-colors" className="cursor-pointer">
                        Color by Staff
                      </Label>
                    </div>
                  )}

                  {/* Filter Toggle Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="toggle-filters-button"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>

                  {/* Active Filter Count */}
                  {(filterStaffId !== "all" || filterClientId !== "all") && (
                    <Badge variant="secondary" data-testid="active-filters-badge">
                      {[filterStaffId !== "all", filterClientId !== "all"].filter(Boolean).length} active filter{[filterStaffId !== "all", filterClientId !== "all"].filter(Boolean).length !== 1 ? 's' : ''}
                    </Badge>
                  )}

                  {/* Clear Filters */}
                  {(filterStaffId !== "all" || filterClientId !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterStaffId("all");
                        setFilterClientId("all");
                      }}
                      data-testid="clear-filters-button"
                    >
                      <XIcon className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Filter Dropdowns */}
                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {/* Staff Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="staff-filter">Filter by Staff</Label>
                      <Select value={filterStaffId} onValueChange={setFilterStaffId}>
                        <SelectTrigger id="staff-filter" data-testid="staff-filter">
                          <SelectValue placeholder="All Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {users.filter((u: any) => ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(u.role)).map((u: any) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.name || u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Client Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="client-filter">Filter by Client</Label>
                      <Select value={filterClientId} onValueChange={setFilterClientId}>
                        <SelectTrigger id="client-filter" data-testid="client-filter">
                          <SelectValue placeholder="All Clients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clients</SelectItem>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <CalendarViewTab 
            view={view}
            setView={setView}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            events={filteredEvents as any[]}
            isLoading={isLoading as boolean}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateNewEvent}
            isStaff={!!isStaff}
            showStaffColors={showStaffColors}
            staffMembers={users.filter((u: any) => ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(u.role))}
          />
        </TabsContent>

        {/* Appointment Booking */}
        <TabsContent value="book-appointment" className="space-y-4">
          <Card data-testid="appointment-booking-card">
            <CardHeader>
              <CardTitle>
                {isClient ? "Book an Appointment" : "Client Appointment Booking"}
              </CardTitle>
              <CardDescription>
                {isClient ? 
                  "Schedule a meeting with our team. Your request will be reviewed and confirmed." :
                  "Use this form to book appointments on behalf of clients or test the client booking experience."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentBookingForm onSuccess={handleAppointmentSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Management - Management Only */}
        {isManagement && (
          <TabsContent value="availability" className="space-y-4">
            <Card data-testid="availability-management-card">
              <CardHeader>
                <CardTitle>Availability Management</CardTitle>
                <CardDescription>
                  Manage weekly availability and exceptions for all staff members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffAvailabilityManager />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Team Schedule - Management Only */}
        {isManagement && (
          <TabsContent value="team-schedule" className="space-y-4">
            <TeamScheduleView 
              users={users}
              events={events as any[]}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateNewEvent}
            />
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

      {/* Phase 3.5: Calendar Sharing Dialog */}
      <CalendarSharingDialog
        open={showSharingDialog}
        onOpenChange={setShowSharingDialog}
      />
    </div>
  );
}