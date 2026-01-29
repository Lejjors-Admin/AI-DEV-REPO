/**
 * REMITTANCE SCHEDULE TAB COMPONENT
 * 
 * Calendar and list views for remittance due dates with filtering
 * and interactive date selection
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { 
  Calendar as CalendarIcon, 
  List, 
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus
} from "lucide-react";
import { RemittanceStatusBadge } from "./RemittanceStatusBadge";
import { RemittanceSchedule } from "@/lib/types";

interface RemittanceScheduleTabProps {
  clientId: number | null;
  remittanceSchedules: RemittanceSchedule[];
  dueDates: any[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export default function RemittanceScheduleTab({
  clientId,
  remittanceSchedules,
  dueDates,
  selectedYear,
  onYearChange
}: RemittanceScheduleTabProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [filterTaxType, setFilterTaxType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Filter schedules based on current filters
  const filteredSchedules = useMemo(() => {
    return remittanceSchedules.filter(schedule => {
      // Year filter
      const scheduleYear = new Date(schedule.dueDate).getFullYear();
      if (scheduleYear !== selectedYear) return false;

      // Month filter (for calendar view)
      if (viewMode === "calendar") {
        const scheduleMonth = new Date(schedule.dueDate).getMonth();
        if (scheduleMonth !== selectedMonth) return false;
      }

      // Tax type filter
      if (filterTaxType !== "all" && schedule.type !== filterTaxType) return false;

      // Status filter
      if (filterStatus !== "all" && schedule.status !== filterStatus) return false;

      // Search filter
      if (searchTerm && !schedule.type?.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [remittanceSchedules, selectedYear, selectedMonth, filterTaxType, filterStatus, searchTerm, viewMode]);

  // Group schedules by date for calendar view
  const schedulesByDate = useMemo(() => {
    const grouped: { [key: string]: RemittanceSchedule[] } = {};
    filteredSchedules.forEach(schedule => {
      const dateKey = new Date(schedule.dueDate).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(schedule);
    });
    return grouped;
  }, [filteredSchedules]);

  // Get schedules for selected date
  const schedulesForSelectedDate = selectedDate 
    ? schedulesByDate[selectedDate.toDateString()] || []
    : [];

  // Tax type and status options
  const taxTypeOptions = [
    { value: "all", label: "All Tax Types" },
    { value: "cpp", label: "CPP" },
    { value: "ei", label: "EI" },
    { value: "income_tax", label: "Income Tax" },
    { value: "gst_hst", label: "GST/HST" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "overdue", label: "Overdue" },
    { value: "paid", label: "Paid" }
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Navigate months for calendar view
  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        onYearChange(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        onYearChange(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Check if a date has remittances
  const dateHasRemittances = (date: Date): boolean => {
    return !!schedulesByDate[date.toDateString()];
  };

  // Get status color for calendar dates
  const getDateStatusColor = (date: Date): string => {
    const daySchedules = schedulesByDate[date.toDateString()] || [];
    if (daySchedules.length === 0) return "";
    
    const hasOverdue = daySchedules.some(s => s.status === 'overdue');
    const hasPending = daySchedules.some(s => s.status === 'pending');
    
    if (hasOverdue) return "bg-red-100 text-red-800";
    if (hasPending) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-6" data-testid="remittance-schedule-tab">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
            <SelectTrigger className="w-32" data-testid="select-schedule-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2023, 2022, 2021].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterTaxType} onValueChange={setFilterTaxType}>
              <SelectTrigger className="w-40" data-testid="filter-tax-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36" data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tax types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
              data-testid="search-tax-types"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "calendar" | "list")}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="view-list">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2" data-testid="view-calendar">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="schedule-stats">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scheduled</CardDescription>
            <CardTitle className="text-2xl">{filteredSchedules.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {filteredSchedules.filter(s => s.status === 'overdue').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due This Month</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {filteredSchedules.filter(s => {
                const scheduleMonth = new Date(s.dueDate).getMonth();
                const currentMonth = new Date().getMonth();
                return scheduleMonth === currentMonth && s.status === 'pending';
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {filteredSchedules.filter(s => s.status === 'paid').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Calendar or List View */}
      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2" data-testid="schedule-calendar">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {months[selectedMonth]} {selectedYear}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={new Date(selectedYear, selectedMonth)}
                onMonthChange={(date) => {
                  setSelectedMonth(date.getMonth());
                  onYearChange(date.getFullYear());
                }}
                modifiers={{
                  hasRemittances: dateHasRemittances
                }}
                modifiersClassNames={{
                  hasRemittances: "font-bold border-2 border-primary"
                }}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card data-testid="selected-date-details">
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString() : "Select a date"}
              </CardTitle>
              <CardDescription>
                {schedulesForSelectedDate.length} remittance{schedulesForSelectedDate.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesForSelectedDate.length > 0 ? (
                <div className="space-y-3">
                  {schedulesForSelectedDate.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{schedule.taxType?.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          ${parseFloat(schedule.amount.toString()).toLocaleString()}
                        </div>
                      </div>
                      <RemittanceStatusBadge status={schedule.status} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No remittances scheduled for this date</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card data-testid="schedule-list">
          <CardHeader>
            <CardTitle>Remittance Schedule</CardTitle>
            <CardDescription>
              {filteredSchedules.length} scheduled remittance{filteredSchedules.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule, index) => (
                    <TableRow key={index} data-testid={`schedule-row-${index}`}>
                      <TableCell className="font-medium">
                        {schedule.taxType?.toUpperCase() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.dueDate).toLocaleDateString()}
                        {new Date(schedule.dueDate) < new Date() && schedule.status !== 'paid' && (
                          <Badge variant="destructive" className="ml-2 text-xs">Late</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        ${parseFloat(schedule.amount.toString()).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {schedule.frequency || 'Monthly'}
                      </TableCell>
                      <TableCell>
                        <RemittanceStatusBadge status={schedule.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" data-testid={`button-view-schedule-${index}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" data-testid={`button-pay-schedule-${index}`}>
                            Pay
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Scheduled Remittances</h3>
                <p>No remittances found matching your current filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}