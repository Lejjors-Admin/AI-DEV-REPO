import { useState } from "react";
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, GripVertical, Check, X as XIcon, ArrowRight, Printer } from "lucide-react";
import { generateMonthCalendarPDF, generateWeekCalendarPDF, generateEventListPDF } from "@/utils/calendar-pdf";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CalendarViewTabProps {
  view: "day" | "week" | "month";
  setView: (view: "day" | "week" | "month") => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: any[];
  isLoading: boolean;
  onEventClick: (event: any) => void;
  onCreateEvent: (date?: Date, time?: string) => void;
  onEventUpdate?: (eventId: number, updates: { startAt: string; endAt: string }) => void;
  isStaff: boolean;
  showStaffColors?: boolean; // Phase 3.5: Color code by staff member
  staffMembers?: any[]; // Phase 3.5: List of staff for color legend
}

// Phase 3.5: Staff color palette (15 distinct colors)
const STAFF_COLORS = [
  "bg-blue-500 hover:bg-blue-600",
  "bg-purple-500 hover:bg-purple-600",
  "bg-pink-500 hover:bg-pink-600",
  "bg-rose-500 hover:bg-rose-600",
  "bg-orange-500 hover:bg-orange-600",
  "bg-amber-500 hover:bg-amber-600",
  "bg-lime-500 hover:bg-lime-600",
  "bg-emerald-500 hover:bg-emerald-600",
  "bg-teal-500 hover:bg-teal-600",
  "bg-cyan-500 hover:bg-cyan-600",
  "bg-sky-500 hover:bg-sky-600",
  "bg-indigo-500 hover:bg-indigo-600",
  "bg-violet-500 hover:bg-violet-600",
  "bg-fuchsia-500 hover:bg-fuchsia-600",
  "bg-red-500 hover:bg-red-600",
];

// Helper function to get color for staff member
const getStaffColor = (userId: number) => {
  return STAFF_COLORS[userId % STAFF_COLORS.length];
};

// Helper function to determine event color
const getEventColor = (status: string, organizerUserId?: number, useStaffColors?: boolean) => {
  // Time entry events - always green
  if (status === 'time-entry') {
    return "bg-green-500 hover:bg-green-600";
  }
  
  // Phase 3.5: Use staff colors if enabled
  if (useStaffColors && organizerUserId !== undefined) {
    return getStaffColor(organizerUserId);
  }
  
  // Default color by status
  switch (status) {
    case "confirmed":
      return "bg-blue-500 hover:bg-blue-600";
    case "tentative":
      return "bg-amber-500 hover:bg-amber-600";
    case "cancelled":
      return "bg-gray-500 hover:bg-gray-600";
    default:
      return "bg-blue-500 hover:bg-blue-600";
  }
};

// Helper function to format time
const formatTime = (date: Date) => {
  return format(date, "h:mm a");
};

export default function CalendarViewTab({
  view,
  setView,
  selectedDate,
  setSelectedDate,
  events,
  isLoading,
  onEventClick,
  onCreateEvent,
  onEventUpdate,
  isStaff,
  showStaffColors = false,
  staffMembers = []
}: CalendarViewTabProps) {
  // Drag-and-drop state
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  
  // Multi-select state for bulk operations (Phase 3.4)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [showBulkRescheduleDialog, setShowBulkRescheduleDialog] = useState(false);
  const [shiftDays, setShiftDays] = useState<number>(0);
  const [shiftHours, setShiftHours] = useState<number>(0);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Handle multi-select event click
  const handleEventClickWithSelect = (event: any, e?: React.MouseEvent) => {
    // Time entries are read-only - just show info toast
    if (event.status === 'time-entry' || event.type === 'time-entry') {
      e?.stopPropagation();
      toast({
        title: "Time Entry",
        description: `${event.title} - Duration: ${event.metadata?.duration || 'N/A'}. Edit this entry in the Time & Expenses tab.`,
      });
      return;
    }

    if (!isStaff) {
      onEventClick(event);
      return;
    }

    // If Ctrl/Cmd or Shift is pressed, toggle selection (only for schedule events)
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.stopPropagation();
      const newSelection = new Set(selectedEventIds);
      if (newSelection.has(event.id)) {
        newSelection.delete(event.id);
      } else {
        newSelection.add(event.id);
      }
      setSelectedEventIds(newSelection);
    } else if (selectedEventIds.size > 0) {
      // If events are selected, clicking without modifier deselects all
      setSelectedEventIds(new Set());
      onEventClick(event);
    } else {
      // Normal click - open event drawer
      onEventClick(event);
    }
  };
  
  // Bulk reschedule mutation
  const bulkRescheduleMutation = useMutation({
    mutationFn: async (shiftMinutes: number) => {
      const response = await apiRequest('POST', '/api/schedule/events/bulk-reschedule', {
        eventIds: Array.from(selectedEventIds),
        shiftMinutes
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/events'] });
      setSelectedEventIds(new Set());
      setShowBulkRescheduleDialog(false);
      setShiftDays(0);
      setShiftHours(0);
      
      toast({
        title: "Events rescheduled",
        description: data.message || `Successfully rescheduled ${data.summary?.succeeded} event(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reschedule events.",
        variant: "destructive",
      });
    }
  });
  
  const handleBulkReschedule = () => {
    const totalMinutes = (shiftDays * 24 * 60) + (shiftHours * 60);
    if (totalMinutes === 0) {
      toast({
        title: "Invalid time shift",
        description: "Please specify a time shift amount",
        variant: "destructive",
      });
      return;
    }
    bulkRescheduleMutation.mutate(totalMinutes);
  };

  // Calculate date range based on current view
  const getDateRange = () => {
    if (view === "day") {
      return { start: selectedDate, end: selectedDate };
    } else if (view === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return { start, end };
    } else {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      return { start, end };
    }
  };

  // Filter events for current view
  const filteredEvents = events.filter(event => {
    const eventStart = new Date(event.startAt);
    const { start, end } = getDateRange();
    
    return isWithinInterval(eventStart, { start, end });
  });

  // Generate hours for day view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generate days for week view
  const weekDays = () => {
    const { start } = getDateRange();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Generate calendar grid for month view
  const getMonthGrid = () => {
    const firstDay = startOfMonth(selectedDate);
    const startWeekday = firstDay.getDay() || 7; // Convert Sunday (0) to 7
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    
    const grid = [];
    let dayCount = 1;
    
    // Create 6 weeks (42 days) to ensure all months fit
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 1; day <= 7; day++) {
        if (week === 0 && day < startWeekday) {
          // Previous month days
          weekDays.push({ date: null, events: [] });
        } else if (dayCount > daysInMonth) {
          // Next month days
          weekDays.push({ date: null, events: [] });
        } else {
          // Current month days
          const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayCount);
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.startAt);
            return eventDate.getDate() === dayCount && 
                   eventDate.getMonth() === selectedDate.getMonth() && 
                   eventDate.getFullYear() === selectedDate.getFullYear();
          });
          weekDays.push({ date, events: dayEvents });
          dayCount++;
        }
      }
      grid.push(weekDays);
    }
    return grid;
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, event: any) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", event.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetHour?: number) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedEvent || !onEventUpdate) return;

    // Calculate new start and end times
    const oldStart = new Date(draggedEvent.startAt);
    const oldEnd = new Date(draggedEvent.endAt);
    const duration = oldEnd.getTime() - oldStart.getTime();

    // For day/week view with hour, use the specific hour; otherwise use original time
    const newStartHour = targetHour !== undefined ? targetHour : oldStart.getHours();
    const newStartMinute = targetHour !== undefined ? 0 : oldStart.getMinutes();

    const newStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      newStartHour,
      newStartMinute,
      0
    );
    const newEnd = new Date(newStart.getTime() + duration);

    // Call the update handler
    onEventUpdate(draggedEvent.id, {
      startAt: newStart.toISOString(),
      endAt: newEnd.toISOString(),
    });

    setDraggedEvent(null);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverCell(null);
  };

  // Phase 3.5: Print calendar handler
  const handlePrintCalendar = () => {
    try {
      const userName = user?.name || user?.username || "User";
      let doc;

      if (view === "month") {
        doc = generateMonthCalendarPDF(selectedDate, filteredEvents, userName);
        doc.save(`calendar-${format(selectedDate, "yyyy-MM")}.pdf`);
      } else if (view === "week") {
        const weekStart = startOfWeek(selectedDate);
        doc = generateWeekCalendarPDF(weekStart, filteredEvents, userName);
        doc.save(`calendar-week-${format(weekStart, "yyyy-MM-dd")}.pdf`);
      } else {
        // Day view - use event list format (clone date to avoid mutation)
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        doc = generateEventListPDF(dayStart, dayEnd, filteredEvents, userName);
        doc.save(`calendar-${format(selectedDate, "yyyy-MM-dd")}.pdf`);
      }

      toast({
        title: "Calendar printed",
        description: "Your calendar has been exported as a PDF",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Print failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with view controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {view === "day" && format(selectedDate, "EEEE, MMMM d, yyyy")}
            {view === "week" && `${format(getDateRange().start, "MMMM d")} - ${format(getDateRange().end, "MMMM d, yyyy")}`}
            {view === "month" && format(selectedDate, "MMMM yyyy")}
          </h2>
          <p className="text-muted-foreground">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} scheduled
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                if (view === "month") {
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
                } else if (view === "week") {
                  setSelectedDate(addDays(selectedDate, -7));
                } else {
                  setSelectedDate(addDays(selectedDate, -1));
                }
              }}
              data-testid="prev-period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedDate(new Date())}
              data-testid="today-button"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                if (view === "month") {
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
                } else if (view === "week") {
                  setSelectedDate(addDays(selectedDate, 7));
                } else {
                  setSelectedDate(addDays(selectedDate, 1));
                }
              }}
              data-testid="next-period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* View selector */}
          <Select value={view} onValueChange={(value: "day" | "week" | "month") => setView(value)}>
            <SelectTrigger className="w-[120px]" data-testid="view-selector">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Phase 3.5: Print calendar button */}
          <Button 
            variant="outline"
            onClick={handlePrintCalendar} 
            data-testid="print-calendar-button"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          
          {/* Create event button - Staff only */}
          {isStaff && (
            <Button onClick={() => onCreateEvent()} data-testid="create-event-quick">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar - Phase 3.4 */}
      {isStaff && selectedEventIds.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''} selected</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEventIds(new Set())}
                  data-testid="clear-selection-button"
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowBulkRescheduleDialog(true)}
                  data-testid="bulk-reschedule-button"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Reschedule Events
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3.5: Staff Color Legend */}
      {showStaffColors && staffMembers && staffMembers.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Staff:</span>
              {staffMembers.map((staff: any) => (
                <div key={staff.id} className="flex items-center gap-1.5" data-testid={`staff-legend-${staff.id}`}>
                  <div className={`w-3 h-3 rounded ${getStaffColor(staff.id)}`} />
                  <span className="text-sm">{staff.name || staff.username}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View Content */}
      <Card data-testid="calendar-view-card">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Day View */}
              {view === "day" && (
                <div className="space-y-4" data-testid="day-view">
                  {hours.map((hour) => {
                    const hourEvents = filteredEvents.filter(event => {
                      const eventDate = new Date(event.startAt);
                      return eventDate.getHours() === hour;
                    });
                    
                    return (
                      <div key={hour} className="grid grid-cols-12 gap-2">
                        <div className="col-span-1 text-sm text-muted-foreground py-2">
                          {format(new Date().setHours(hour, 0, 0), "h a")}
                        </div>
                        <div 
                          className={`col-span-11 min-h-[60px] border-t py-1 ${
                            dragOverCell === `day-${hour}` ? 'ring-2 ring-blue-500 ring-inset' : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, `day-${hour}`)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, selectedDate, hour)}
                        >
                          {hourEvents.map((event) => {
                            const isTimeEntry = event.status === 'time-entry' || event.type === 'time-entry';
                            return (
                              <div 
                                key={event.id}
                                draggable={isStaff && !isTimeEntry}
                                onDragStart={(e) => !isTimeEntry && handleDragStart(e, event)}
                                onDragEnd={handleDragEnd}
                                className={`p-2 mb-1 rounded text-white ${getEventColor(event.status, event.organizerUserId, showStaffColors)} cursor-pointer flex items-center gap-1 ${
                                  draggedEvent?.id === event.id ? 'opacity-50' : ''
                                } ${selectedEventIds.has(event.id) ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
                                onClick={(e) => handleEventClickWithSelect(event, e)}
                                data-testid={`event-${event.id}`}
                              >
                                {isStaff && !isTimeEntry && <GripVertical className="h-4 w-4 opacity-60" />}
                                <div className="flex-1">
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-sm flex items-center">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {formatTime(new Date(event.startAt))} - {formatTime(new Date(event.endAt))}
                                  </div>
                                  {event.location && (
                                    <div className="text-sm flex items-center">
                                      <MapPin className="mr-1 h-3 w-3" />
                                      {event.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Week View */}
              {view === "week" && (
                <div className="overflow-hidden rounded-lg border" data-testid="week-view">
                  <div className="grid grid-cols-7 bg-muted">
                    {weekDays().map((day, index) => (
                      <div 
                        key={index} 
                        className={`px-2 py-3 text-center ${
                          format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                            ? 'bg-blue-50 font-bold' 
                            : ''
                        }`}
                      >
                        <div className="text-sm font-medium">{format(day, "EEE")}</div>
                        <div className="text-lg">{format(day, "d")}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-muted">
                    {weekDays().map((day, dayIndex) => {
                      const dayEvents = filteredEvents.filter(event => {
                        const eventDate = new Date(event.startAt);
                        return format(eventDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                      });
                      
                      return (
                        <div 
                          key={dayIndex} 
                          className={`bg-card p-2 min-h-[240px] ${
                            format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                              ? 'bg-blue-50' 
                              : ''
                          } ${dragOverCell === `week-${dayIndex}` ? 'ring-2 ring-blue-500' : ''}`}
                          data-testid={`week-day-${dayIndex}`}
                          onDragOver={(e) => handleDragOver(e, `week-${dayIndex}`)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                        >
                          {dayEvents.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-4">
                              No events
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {dayEvents.map((event) => {
                                const isTimeEntry = event.status === 'time-entry' || event.type === 'time-entry';
                                return (
                                  <div 
                                    key={event.id}
                                    draggable={isStaff && !isTimeEntry}
                                    onDragStart={(e) => !isTimeEntry && handleDragStart(e, event)}
                                    onDragEnd={handleDragEnd}
                                    className={`p-2 rounded text-white ${getEventColor(event.status, event.organizerUserId, showStaffColors)} cursor-pointer flex items-center gap-1 ${
                                      draggedEvent?.id === event.id ? 'opacity-50' : ''
                                    } ${selectedEventIds.has(event.id) ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
                                    onClick={(e) => handleEventClickWithSelect(event, e)}
                                    data-testid={`event-${event.id}`}
                                  >
                                    {isStaff && !isTimeEntry && <GripVertical className="h-3 w-3 opacity-60 flex-shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{event.title}</div>
                                      <div className="text-xs">
                                        {formatTime(new Date(event.startAt))} - {formatTime(new Date(event.endAt))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Month View */}
              {view === "month" && (
                <div className="overflow-hidden rounded-lg border" data-testid="month-view">
                  <div className="grid grid-cols-7 bg-muted">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted">
                    {getMonthGrid().map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-px">
                        {week.map((day, dayIndex) => {
                          if (!day.date) {
                            return <div key={`${weekIndex}-${dayIndex}`} className="bg-muted-foreground/10 p-2 min-h-[100px]" />;
                          }
                          
                          return (
                            <div 
                              key={`${weekIndex}-${dayIndex}`} 
                              className={`bg-card p-2 min-h-[100px] ${
                                format(day.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                                  ? 'bg-blue-50' 
                                  : ''
                              } ${dragOverCell === `month-${format(day.date, "yyyy-MM-dd")}` ? 'ring-2 ring-blue-500' : ''}`}
                              data-testid={`month-day-${format(day.date, "d")}`}
                              onDragOver={(e) => handleDragOver(e, `month-${format(day.date, "yyyy-MM-dd")}`)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day.date)}
                            >
                              <div className="text-sm font-medium mb-1">
                                {format(day.date, "d")}
                              </div>
                              <div className="space-y-1">
                                {day.events.slice(0, 3).map((event) => {
                                  const isTimeEntry = event.status === 'time-entry' || event.type === 'time-entry';
                                  return (
                                    <div 
                                      key={event.id}
                                      draggable={isStaff && !isTimeEntry}
                                      onDragStart={(e) => !isTimeEntry && handleDragStart(e, event)}
                                      onDragEnd={handleDragEnd}
                                      className={`px-2 py-1 text-xs rounded text-white ${getEventColor(event.status, event.organizerUserId, showStaffColors)} truncate cursor-pointer ${
                                        draggedEvent?.id === event.id ? 'opacity-50' : ''
                                      } ${selectedEventIds.has(event.id) ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                                      onClick={(e) => handleEventClickWithSelect(event, e)}
                                      data-testid={`event-${event.id}`}
                                    >
                                      {event.title}
                                    </div>
                                  );
                                })}
                                {day.events.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{day.events.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Reschedule Dialog - Phase 3.4 */}
      <Dialog open={showBulkRescheduleDialog} onOpenChange={setShowBulkRescheduleDialog}>
        <DialogContent data-testid="bulk-reschedule-dialog">
          <DialogHeader>
            <DialogTitle>Reschedule Selected Events</DialogTitle>
            <DialogDescription>
              Move {selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''} forward or backward in time.
              Enter positive numbers to move forward, negative to move backward.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-days">Days</Label>
                <Input
                  id="shift-days"
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  data-testid="shift-days-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-hours">Hours</Label>
                <Input
                  id="shift-hours"
                  type="number"
                  value={shiftHours}
                  onChange={(e) => setShiftHours(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  data-testid="shift-hours-input"
                />
              </div>
            </div>
            
            {(shiftDays !== 0 || shiftHours !== 0) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground">
                  Events will be moved <strong>
                    {shiftDays > 0 ? `${shiftDays} day${shiftDays > 1 ? 's' : ''} forward` : shiftDays < 0 ? `${Math.abs(shiftDays)} day${Math.abs(shiftDays) > 1 ? 's' : ''} backward` : ''}
                    {shiftDays !== 0 && shiftHours !== 0 ? ' and ' : ''}
                    {shiftHours > 0 ? `${shiftHours} hour${shiftHours > 1 ? 's' : ''} forward` : shiftHours < 0 ? `${Math.abs(shiftHours)} hour${Math.abs(shiftHours) > 1 ? 's' : ''} backward` : ''}
                  </strong>
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkRescheduleDialog(false);
                setShiftDays(0);
                setShiftHours(0);
              }}
              data-testid="cancel-bulk-reschedule"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkReschedule}
              disabled={bulkRescheduleMutation.isPending || (shiftDays === 0 && shiftHours === 0)}
              data-testid="confirm-bulk-reschedule"
            >
              {bulkRescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reschedule Events
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}