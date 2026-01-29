import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Users, Filter, User } from "lucide-react";
import CalendarViewTab from "./CalendarViewTab";

interface TeamScheduleViewProps {
  users: any[];
  events: any[];
  onEventClick: (event: any) => void;
  onCreateEvent: () => void;
}

// Color palette for staff members
const STAFF_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700" },
  { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-700" },
  { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-700" },
  { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-700" },
  { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300 dark:border-pink-700" },
  { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-300 dark:border-yellow-700" },
  { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-700" },
  { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-700" },
];

export default function TeamScheduleView({ users, events, onEventClick, onCreateEvent }: TeamScheduleViewProps) {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterStaffId, setFilterStaffId] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter to only staff users
  const staffMembers = users.filter((u: any) =>
    ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(u.role)
  );

  // Assign colors to staff members
  const staffColors = useMemo(() => {
    const colorMap: Record<number, typeof STAFF_COLORS[0]> = {};
    staffMembers.forEach((user: any, index: number) => {
      colorMap[user.id] = STAFF_COLORS[index % STAFF_COLORS.length];
    });
    return colorMap;
  }, [staffMembers]);

  // Filter events based on selected staff
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (filterStaffId && filterStaffId !== "all") {
      const staffId = parseInt(filterStaffId);
      filtered = filtered.filter(event => {
        const isOrganizer = event.organizerUserId === staffId;
        const isParticipant = event.staffUserIds?.includes(staffId);
        return isOrganizer || isParticipant;
      });
    }

    return filtered;
  }, [events, filterStaffId]);

  return (
    <div className="space-y-4" data-testid="team-schedule-view">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Schedule Overview
              </CardTitle>
              <CardDescription>
                View all staff calendars in a unified view
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-team-filters"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent className="border-t pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="staff-filter" className="text-sm font-medium mb-2 block">
                  Filter by Staff Member
                </Label>
                <Select
                  value={filterStaffId}
                  onValueChange={setFilterStaffId}
                >
                  <SelectTrigger id="staff-filter" data-testid="team-staff-filter">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterStaffId !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterStaffId("all")}
                  data-testid="clear-team-filters"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Staff Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {staffMembers.map((user: any) => {
              const colors = staffColors[user.id];
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border}`}
                  data-testid={`staff-legend-${user.id}`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-800 ${colors.text}`}>
                    <User className="h-3 w-3" />
                  </div>
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {user.name || user.username}
                  </span>
                  {user.isManager && (
                    <Badge variant="secondary" className="ml-1 text-xs">M</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <CalendarViewTab
        view={view}
        setView={setView}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        events={filteredEvents}
        isLoading={false}
        onEventClick={onEventClick}
        onCreateEvent={onCreateEvent}
        isStaff={true}
        showStaffColors={true}
        staffMembers={staffMembers}
      />
    </div>
  );
}
