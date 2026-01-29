/**
 * Comprehensive Team Management Component
 * 
 * Features: Team Dashboard, Time Tracking, Performance Analytics, Staff Management,
 * Workload Planning, Collaboration Tools, HR Functions, and Team Reports
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isToday, isTomorrow, startOfWeek, endOfWeek } from "date-fns";
import { 
  Users, Clock, TrendingUp, BarChart3, Calendar, Settings, 
  Play, Pause, Square, Plus, Filter, Search, Eye, Edit, Trash2,
  UserPlus, Target, Award, Briefcase, MessageSquare, FileText,
  CheckCircle, AlertCircle, Timer, Activity, PieChart, 
  DollarSign, Star, User, UserCog, ChevronRight, Zap,
  Coffee, Home, MapPin, Phone, Mail, Book, GraduationCap,
  Calendar as CalendarIcon, ClipboardList, Bell, MoreHorizontal
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Form schemas
const timeEntrySchema = z.object({
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(0.1, "Duration must be at least 0.1 hours"),
  date: z.string(),
  isBillable: z.boolean().default(true),
  type: z.enum(["project", "task", "meeting", "admin", "training", "break"]).default("project"),
});

const leaveRequestSchema = z.object({
  type: z.enum(["vacation", "sick", "personal", "maternity", "paternity", "bereavement", "jury_duty", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  description: z.string().optional(),
});

const meetingSchema = z.object({
  title: z.string().min(1, "Meeting title is required"),
  description: z.string().optional(),
  type: z.enum(["team", "client", "project", "one_on_one", "training", "other"]).default("team"),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
});

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [showLeaveRequestDialog, setShowLeaveRequestDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState("week");

  // Fetch team data
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["/api/team/staff"],
  });

  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ["/api/team/time-entries", selectedDateRange],
    queryFn: () => {
      const today = new Date();
      let startDate, endDate;
      
      if (selectedDateRange === "week") {
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
      } else if (selectedDateRange === "month") {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
      }

      return apiRequest(
        "GET",
        `/api/team/time-entries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      ).then((res) => res.json());
    },
  });

  const { data: performance = [], isLoading: performanceLoading } = useQuery({
    queryKey: ["/api/team/performance", selectedDateRange],
  });

  const { data: dashboardOverview = {}, isLoading: overviewLoading } = useQuery({
    queryKey: ["/api/team/dashboard/overview"],
  });

  const { data: workloadData = [], isLoading: workloadLoading } = useQuery({
    queryKey: ["/api/team/workload"],
  });

  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({
    queryKey: ["/api/team/leave-requests"],
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["/api/team/meetings"],
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["/api/team/time-sessions/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Timer management
  useEffect(() => {
    if (timerStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - timerStartTime.getTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerStartTime]);

  // Mutations
  const startTimerMutation = useMutation({
    mutationFn: async (data: { projectId?: number; taskId?: number; description: string }) => {
      const response = await apiRequest("POST", "/api/team/time-sessions/start", data);
      return response.json();
    },
    onSuccess: (session) => {
      setActiveTimer(session);
      setTimerStartTime(new Date(session.startTime));
      queryClient.invalidateQueries({ queryKey: ["/api/team/time-sessions/active"] });
      toast({ title: "Timer started", description: "Time tracking started successfully" });
    },
  });

  const endTimerMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("POST", `/api/team/time-sessions/${sessionId}/end`, {});
      return response.json();
    },
    onSuccess: () => {
      setActiveTimer(null);
      setTimerStartTime(null);
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ["/api/team/time-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/time-entries"] });
      toast({ title: "Timer stopped", description: "Time entry saved successfully" });
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/team/time-entries", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/time-entries"] });
      setShowTimeEntryDialog(false);
      toast({ title: "Time entry created", description: "Time entry added successfully" });
    },
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/team/leave-requests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/leave-requests"] });
      setShowLeaveRequestDialog(false);
      toast({ title: "Leave request submitted", description: "Your leave request has been submitted for approval" });
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/team/meetings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/meetings"] });
      setShowMeetingDialog(false);
      toast({ title: "Meeting scheduled", description: "Meeting created successfully" });
    },
  });

  // Forms
  const timeEntryForm = useForm({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      description: "",
      duration: 1,
      date: format(new Date(), "yyyy-MM-dd"),
      isBillable: true,
      type: "project" as const,
    },
  });

  const leaveForm = useForm({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: "vacation" as const,
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      description: "",
    },
  });

  const meetingForm = useForm({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "team" as const,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"),
      location: "",
      meetingLink: "",
    },
  });

  // Helper functions
  const formatElapsedTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateUtilization = () => {
    const safeTimeEntries = Array.isArray(timeEntries) ? timeEntries : [];
    if (!safeTimeEntries.length) return 0;
    const totalHours = safeTimeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.duration || 0), 0);
    const billableHours = safeTimeEntries.filter((entry: any) => entry.isBillable).reduce((sum: number, entry: any) => sum + parseFloat(entry.duration || 0), 0);
    return totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  };

  // Timer Controls Component
  const TimerControls = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {activeTimer ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-mono">{formatElapsedTime(elapsedTime)}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{activeTimer.description || "Working on task"}</p>
              </div>
              <Button 
                onClick={() => endTimerMutation.mutate(activeTimer.id)}
                variant="destructive"
                disabled={endTimerMutation.isPending}
                data-testid="button-stop-timer"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => {
                  const description = prompt("What are you working on?");
                  if (description) {
                    startTimerMutation.mutate({ description });
                  }
                }}
                disabled={startTimerMutation.isPending}
                data-testid="button-start-timer"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
              <span className="text-gray-500">No active session</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Team Dashboard Tab
  const DashboardTab = () => (
    <div className="space-y-6">
      <TimerControls />
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">
              {Array.isArray(teamMembers) ? teamMembers.filter((m: any) => m.isActive).length : 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hours This Week</p>
                <p className="text-2xl font-bold">
                  {Array.isArray(timeEntries) ? timeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.duration || 0), 0).toFixed(1) : '0.0'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">
              {calculateUtilization()}% billable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{dashboardOverview.activeProjects || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {dashboardOverview.onTrackProjects || 0} on track
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Utilization</p>
                <p className="text-2xl font-bold">{dashboardOverview.teamUtilization || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={dashboardOverview.teamUtilization || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Active Team Status */}
      <Card>
        <CardHeader>
          <CardTitle>Team Status</CardTitle>
          <CardDescription>Current availability and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(teamMembers) ? teamMembers.map((member: any) => {
              const activeSession = Array.isArray(activeSessions) ? activeSessions.find((s: any) => s.userId === member.userId) : null;
              return (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name?.charAt(0) || member.email?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{member.name || member.email}</p>
                      <p className="text-sm text-gray-600">{member.position || member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSession ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600">Working</span>
                        <Badge variant="outline">{activeSession.description}</Badge>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-gray-500">Available</span>
                      </>
                    )}
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-center py-4">No team members available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Time Tracking Tab
  const TimeTrackingTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Time Tracking</h3>
          <p className="text-gray-600">Manage time entries and tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowTimeEntryDialog(true)} data-testid="button-add-time-entry">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <TimerControls />

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(timeEntries) ? timeEntries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "MMM d")}</TableCell>
                  <TableCell>{entry.projectName || "No Project"}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>{entry.duration}h</TableCell>
                  <TableCell>
                    <Badge variant={entry.isBillable ? "default" : "secondary"}>
                      {entry.isBillable ? "Billable" : "Non-billable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      entry.status === "approved" ? "default" : 
                      entry.status === "rejected" ? "destructive" : "secondary"
                    }>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-entry-${entry.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No time entries available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Performance Analytics Tab
  const PerformanceTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Performance Analytics</h3>
          <p className="text-gray-600">Team performance metrics and insights</p>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Productivity</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={87} className="mt-2" />
            <p className="text-xs text-green-600 mt-2">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Client Satisfaction</p>
                <p className="text-2xl font-bold">4.8/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-4 w-4 ${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <p className="text-xs text-green-600 mt-2">Excellent rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Goal Achievement</p>
                <p className="text-2xl font-bold">92%</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={92} className="mt-2" />
            <p className="text-xs text-blue-600 mt-2">11/12 goals met</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance</CardTitle>
          <CardDescription>Team member performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(teamMembers) ? teamMembers.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.name?.charAt(0) || member.email?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    <p className="text-sm text-gray-600">{member.position || member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Productivity</p>
                    <p className="font-semibold">{Math.floor(Math.random() * 20) + 80}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Hours</p>
                    <p className="font-semibold">{(Math.random() * 20 + 30).toFixed(1)}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Rating</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3 w-3 ${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid={`button-view-performance-${member.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No team members available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Staff Management Tab
  const StaffTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Staff Management</h3>
          <p className="text-gray-600">Manage team members and their development</p>
        </div>
        <Button data-testid="button-add-staff">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(teamMembers) ? teamMembers.map((member: any) => (
          <Card key={member.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {member.name?.charAt(0) || member.email?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{member.name || member.email}</h4>
                  <p className="text-sm text-gray-600">{member.position || member.role}</p>
                </div>
                <Button variant="ghost" size="sm" data-testid={`button-staff-menu-${member.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{member.department || "General"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Started {format(new Date(member.createdAt || Date.now()), "MMM yyyy")}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Performance</span>
                  <span className="font-semibold">{Math.floor(Math.random() * 20) + 80}%</span>
                </div>
                <Progress value={Math.floor(Math.random() * 20) + 80} className="mt-1" />
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-profile-${member.id}`}>
                  <User className="h-4 w-4 mr-1" />
                  Profile
                </Button>
                <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-staff-${member.id}`}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No staff members available</p>
          </div>
        )}
      </div>
    </div>
  );

  // HR Functions Tab
  const HRTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">HR & Administrative</h3>
          <p className="text-gray-600">Leave management, attendance, and HR functions</p>
        </div>
        <Button onClick={() => setShowLeaveRequestDialog(true)} data-testid="button-request-leave">
          <Plus className="h-4 w-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Pending and approved leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(leaveRequests) ? leaveRequests.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d")}
                  </TableCell>
                  <TableCell>{request.totalDays}</TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === "approved" ? "default" : 
                      request.status === "rejected" ? "destructive" : "secondary"
                    }>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" data-testid={`button-approve-leave-${request.id}`}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" data-testid={`button-reject-leave-${request.id}`}>
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    No leave requests available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Team Collaboration Tab
  const CollaborationTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Team Collaboration</h3>
          <p className="text-gray-600">Meetings, communication, and knowledge sharing</p>
        </div>
        <Button onClick={() => setShowMeetingDialog(true)} data-testid="button-schedule-meeting">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
          <CardDescription>Scheduled team meetings and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(meetings) ? meetings.map((meeting: any) => (
              <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">{meeting.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(meeting.startTime), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-sm text-gray-500">{meeting.location || "Virtual"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{meeting.type}</Badge>
                  <Button variant="outline" size="sm" data-testid={`button-join-meeting-${meeting.id}`}>
                    Join
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No meetings scheduled</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>Quick access to team resources and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <Book className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Procedures</p>
                <p className="text-sm text-gray-600">Company procedures</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <GraduationCap className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Training</p>
                <p className="text-sm text-gray-600">Training materials</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="font-medium">Templates</p>
                <p className="text-sm text-gray-600">Document templates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="team-management-container">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-gray-600">Comprehensive team management and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-team-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="team-management-tabs">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="time-tracking" data-testid="tab-time-tracking">Time Tracking</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="hr" data-testid="tab-hr">HR</TabsTrigger>
          <TabsTrigger value="collaboration" data-testid="tab-collaboration">Collaboration</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="time-tracking">
          <TimeTrackingTab />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>

        <TabsContent value="hr">
          <HRTab />
        </TabsContent>

        <TabsContent value="collaboration">
          <CollaborationTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showTimeEntryDialog} onOpenChange={setShowTimeEntryDialog}>
        <DialogContent data-testid="dialog-time-entry">
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
            <DialogDescription>Record time spent on projects and tasks</DialogDescription>
          </DialogHeader>
          <Form {...timeEntryForm}>
            <form onSubmit={timeEntryForm.handleSubmit((data) => createTimeEntryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={timeEntryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you work on?" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={timeEntryForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.25" 
                          min="0.25" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={timeEntryForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={timeEntryForm.control}
                name="isBillable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Billable Time</FormLabel>
                      <FormDescription>Mark this time as billable to client</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-billable" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTimeEntryDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTimeEntryMutation.isPending} data-testid="button-save-time-entry">
                  Save Entry
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaveRequestDialog} onOpenChange={setShowLeaveRequestDialog}>
        <DialogContent data-testid="dialog-leave-request">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a leave request for approval</DialogDescription>
          </DialogHeader>
          <Form {...leaveForm}>
            <form onSubmit={leaveForm.handleSubmit((data) => createLeaveRequestMutation.mutate(data))} className="space-y-4">
              <FormField
                control={leaveForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leave-type">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="maternity">Maternity Leave</SelectItem>
                        <SelectItem value="paternity">Paternity Leave</SelectItem>
                        <SelectItem value="bereavement">Bereavement</SelectItem>
                        <SelectItem value="jury_duty">Jury Duty</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leaveForm.control}
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
                  control={leaveForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={leaveForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reason for leave (optional)" {...field} data-testid="input-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowLeaveRequestDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeaveRequestMutation.isPending} data-testid="button-submit-leave-request">
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent data-testid="dialog-meeting">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a new team meeting</DialogDescription>
          </DialogHeader>
          <Form {...meetingForm}>
            <form onSubmit={meetingForm.handleSubmit((data) => createMeetingMutation.mutate(data))} className="space-y-4">
              <FormField
                control={meetingForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Meeting title" {...field} data-testid="input-meeting-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={meetingForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-meeting-type">
                          <SelectValue placeholder="Select meeting type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="team">Team Meeting</SelectItem>
                        <SelectItem value="client">Client Meeting</SelectItem>
                        <SelectItem value="project">Project Meeting</SelectItem>
                        <SelectItem value="one_on_one">One-on-One</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={meetingForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={meetingForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={meetingForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Meeting location or video link" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowMeetingDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMeetingMutation.isPending} data-testid="button-create-meeting">
                  Create Meeting
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}