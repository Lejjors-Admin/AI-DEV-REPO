import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Battery,
  Zap,
  User,
  UserCheck,
  UserX,
  Settings,
  Monitor,
  Smartphone,
  Laptop,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Activity,
  DollarSign,
  Briefcase,
  FileText,
  Award,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Bell
} from "lucide-react";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: string;
  utilizationRate: number;
  billableHours: number;
  totalHours: number;
  currentProjects: number;
  capacity: number;
  status: "available" | "busy" | "overloaded" | "vacation";
  skills: string[];
  hourlyRate: number;
  efficiency: number;
}

interface ResourceAllocation {
  id: number;
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  clientName: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
  priority: "low" | "medium" | "high" | "urgent";
  status: "planned" | "active" | "completed" | "paused";
}

interface ProjectResource {
  id: number;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "on_hold" | "completed";
  requiredSkills: string[];
  assignedStaff: number[];
  estimatedHours: number;
  actualHours: number;
  budget: number;
  utilizationTarget: number;
  priority: "low" | "medium" | "high" | "urgent";
}

interface TechnologyResource {
  id: number;
  name: string;
  type: "software" | "hardware" | "license" | "subscription";
  status: "active" | "inactive" | "needs_renewal" | "expired";
  users: number;
  maxUsers: number;
  cost: number;
  renewalDate: string;
  vendor: string;
  criticality: "low" | "medium" | "high" | "critical";
}

export default function ResourceCapacityPlanning() {
  const [activeTab, setActiveTab] = useState("utilization");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Fetch resource allocation data
  const { data: resourceAllocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ["/api/resource-allocation", selectedPeriod]
  });

  // Mock data for demonstration
  const staffMembers: StaffMember[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Senior Tax Manager",
      department: "Tax",
      utilizationRate: 87,
      billableHours: 35,
      totalHours: 40,
      currentProjects: 3,
      capacity: 40,
      status: "busy",
      skills: ["Tax Preparation", "Tax Planning", "Corporate Tax"],
      hourlyRate: 125,
      efficiency: 92
    },
    {
      id: 2,
      name: "Michael Brown",
      role: "Audit Senior",
      department: "Audit",
      utilizationRate: 95,
      billableHours: 38,
      totalHours: 40,
      currentProjects: 2,
      capacity: 40,
      status: "overloaded",
      skills: ["Financial Auditing", "Risk Assessment", "Compliance"],
      hourlyRate: 95,
      efficiency: 89
    },
    {
      id: 3,
      name: "Lisa Wong",
      role: "Bookkeeping Specialist",
      department: "Bookkeeping",
      utilizationRate: 72,
      billableHours: 29,
      totalHours: 40,
      currentProjects: 4,
      capacity: 40,
      status: "available",
      skills: ["QuickBooks", "Financial Statements", "Payroll"],
      hourlyRate: 65,
      efficiency: 88
    },
    {
      id: 4,
      name: "David Kim",
      role: "Tax Associate",
      department: "Tax",
      utilizationRate: 68,
      billableHours: 27,
      totalHours: 40,
      currentProjects: 2,
      capacity: 40,
      status: "available",
      skills: ["Individual Tax", "Small Business Tax"],
      hourlyRate: 75,
      efficiency: 85
    },
    {
      id: 5,
      name: "Jennifer Adams",
      role: "Consulting Manager",
      department: "Advisory",
      utilizationRate: 82,
      billableHours: 33,
      totalHours: 40,
      currentProjects: 3,
      capacity: 40,
      status: "busy",
      skills: ["Business Consulting", "Financial Planning", "Strategy"],
      hourlyRate: 150,
      efficiency: 94
    }
  ];

  const mockResourceAllocations: ResourceAllocation[] = [
    {
      id: 1,
      employeeId: 1,
      employeeName: "Sarah Johnson",
      projectId: 101,
      projectName: "ACME Corp Tax Return",
      clientName: "ACME Corporation",
      allocationPercentage: 60,
      startDate: "2025-01-15",
      endDate: "2025-02-28",
      hoursPerWeek: 24,
      priority: "high",
      status: "active"
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: "Michael Brown",
      projectId: 102,
      projectName: "Tech Solutions Audit",
      clientName: "Tech Solutions Ltd",
      allocationPercentage: 80,
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      hoursPerWeek: 32,
      priority: "urgent",
      status: "active"
    }
  ];

  const technologyResources: TechnologyResource[] = [
    {
      id: 1,
      name: "QuickBooks Enterprise",
      type: "software",
      status: "active",
      users: 12,
      maxUsers: 15,
      cost: 2400,
      renewalDate: "2025-06-30",
      vendor: "Intuit",
      criticality: "critical"
    },
    {
      id: 2,
      name: "CaseWare IDEA",
      type: "software",
      status: "active",
      users: 8,
      maxUsers: 10,
      cost: 5600,
      renewalDate: "2025-08-15",
      vendor: "CaseWare",
      criticality: "high"
    },
    {
      id: 3,
      name: "Microsoft 365 Business Premium",
      type: "subscription",
      status: "active",
      users: 25,
      maxUsers: 30,
      cost: 5400,
      renewalDate: "2025-12-31",
      vendor: "Microsoft",
      criticality: "critical"
    },
    {
      id: 4,
      name: "Dell OptiPlex Workstations",
      type: "hardware",
      status: "active",
      users: 18,
      maxUsers: 20,
      cost: 36000,
      renewalDate: "2027-01-01",
      vendor: "Dell",
      criticality: "medium"
    }
  ];

  // Calculate key metrics
  const averageUtilization = staffMembers.reduce((sum, staff) => sum + staff.utilizationRate, 0) / staffMembers.length;
  const totalBillableHours = staffMembers.reduce((sum, staff) => sum + staff.billableHours, 0);
  const totalCapacity = staffMembers.reduce((sum, staff) => sum + staff.capacity, 0);
  const overloadedStaff = staffMembers.filter(staff => staff.status === "overloaded").length;
  const availableStaff = staffMembers.filter(staff => staff.status === "available").length;

  // Filter staff based on department
  const filteredStaff = selectedDepartment === "all" 
    ? staffMembers 
    : staffMembers.filter(staff => staff.department === selectedDepartment);

  if (allocationsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Resource & Capacity Planning</h2>
          <p className="text-gray-600">Optimize resource allocation and capacity management across the practice</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period-resources">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-resources">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-avg-utilization">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg Utilization</div>
              <Battery className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{averageUtilization.toFixed(1)}%</div>
            <div className="text-sm text-blue-600">Target: 80-85%</div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-capacity">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Capacity</div>
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalBillableHours}/{totalCapacity}h</div>
            <div className="text-sm text-green-600">{((totalBillableHours / totalCapacity) * 100).toFixed(1)}% utilized</div>
          </CardContent>
        </Card>

        <Card data-testid="card-overloaded-staff">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Overloaded Staff</div>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{overloadedStaff}</div>
            <div className="text-sm text-red-600">Need rebalancing</div>
          </CardContent>
        </Card>

        <Card data-testid="card-available-staff">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Available Staff</div>
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{availableStaff}</div>
            <div className="text-sm text-green-600">Ready for assignment</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-resources">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="utilization" data-testid="tab-utilization">Staff Utilization</TabsTrigger>
          <TabsTrigger value="capacity" data-testid="tab-capacity">Capacity Analysis</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Project Planning</TabsTrigger>
          <TabsTrigger value="seasonal" data-testid="tab-seasonal">Seasonal Planning</TabsTrigger>
          <TabsTrigger value="technology" data-testid="tab-technology">Technology</TabsTrigger>
        </TabsList>

        {/* Staff Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6" data-testid="content-utilization">
          <div className="flex items-center gap-4 mb-6">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48" data-testid="select-department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Tax">Tax</SelectItem>
                <SelectItem value="Audit">Audit</SelectItem>
                <SelectItem value="Bookkeeping">Bookkeeping</SelectItem>
                <SelectItem value="Advisory">Advisory</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Staff Utilization Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staff) => (
              <Card key={staff.id} className={`${
                staff.status === "overloaded" ? "border-red-200 bg-red-50" :
                staff.status === "available" ? "border-green-200 bg-green-50" :
                staff.status === "vacation" ? "border-blue-200 bg-blue-50" : ""
              }`} data-testid={`staff-card-${staff.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{staff.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{staff.name}</CardTitle>
                        <CardDescription>{staff.role}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={
                      staff.status === "available" ? "default" :
                      staff.status === "busy" ? "secondary" :
                      staff.status === "overloaded" ? "destructive" : "outline"
                    }>
                      {staff.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Utilization Rate */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Utilization Rate</span>
                        <span className="font-medium">{staff.utilizationRate}%</span>
                      </div>
                      <Progress 
                        value={staff.utilizationRate} 
                        className={`h-2 ${
                          staff.utilizationRate > 90 ? "text-red-600" :
                          staff.utilizationRate > 80 ? "text-green-600" : "text-yellow-600"
                        }`} 
                      />
                    </div>

                    {/* Hours Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Billable Hours</div>
                        <div className="text-gray-600">{staff.billableHours}h / week</div>
                      </div>
                      <div>
                        <div className="font-medium">Total Hours</div>
                        <div className="text-gray-600">{staff.totalHours}h / week</div>
                      </div>
                      <div>
                        <div className="font-medium">Projects</div>
                        <div className="text-gray-600">{staff.currentProjects} active</div>
                      </div>
                      <div>
                        <div className="font-medium">Efficiency</div>
                        <div className="text-gray-600">{staff.efficiency}%</div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div>
                      <div className="text-sm font-medium mb-2">Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {staff.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {staff.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{staff.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Schedule
                      </Button>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Utilization Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Utilization Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{averageUtilization.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Average Utilization Rate</div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => {
                    const dayUtil = 75 + Math.random() * 20;
                    return (
                      <div key={day} className="text-center">
                        <div className="text-sm font-medium mb-1">{day}</div>
                        <div className="h-20 bg-gray-100 rounded flex items-end">
                          <div 
                            className={`w-full rounded ${dayUtil > 85 ? 'bg-red-500' : dayUtil > 75 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ height: `${dayUtil}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{dayUtil.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Analysis Tab */}
        <TabsContent value="capacity" className="space-y-6" data-testid="content-capacity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Capacity vs Demand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalCapacity}h</div>
                    <div className="text-sm text-gray-600">Total Weekly Capacity</div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { department: "Tax", capacity: 120, demand: 135, utilization: 112 },
                      { department: "Audit", capacity: 80, demand: 75, utilization: 68 },
                      { department: "Bookkeeping", capacity: 60, demand: 55, utilization: 52 },
                      { department: "Advisory", capacity: 40, demand: 45, utilization: 42 }
                    ].map((dept, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{dept.department}</span>
                          <span className="text-gray-600">{dept.utilization}h/{dept.capacity}h</span>
                        </div>
                        <div className="relative">
                          <Progress value={(dept.utilization / dept.capacity) * 100} className="h-3" />
                          {dept.demand > dept.capacity && (
                            <div className="absolute top-0 right-0 h-3 bg-red-200 rounded" 
                                 style={{ width: `${((dept.demand - dept.capacity) / dept.capacity) * 100}%` }}>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Utilization: {((dept.utilization / dept.capacity) * 100).toFixed(0)}%</span>
                          {dept.demand > dept.capacity && (
                            <span className="text-red-600">Overdemand: {dept.demand - dept.capacity}h</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Resource Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockResourceAllocations.map((allocation) => (
                    <Card key={allocation.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{allocation.employeeName}</h4>
                          <p className="text-sm text-gray-600">{allocation.projectName}</p>
                        </div>
                        <Badge variant={
                          allocation.priority === "urgent" ? "destructive" :
                          allocation.priority === "high" ? "secondary" : "default"
                        }>
                          {allocation.priority}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Allocation</div>
                          <div className="text-gray-600">{allocation.allocationPercentage}%</div>
                        </div>
                        <div>
                          <div className="font-medium">Hours/Week</div>
                          <div className="text-gray-600">{allocation.hoursPerWeek}h</div>
                        </div>
                        <div>
                          <div className="font-medium">Start Date</div>
                          <div className="text-gray-600">{new Date(allocation.startDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">End Date</div>
                          <div className="text-gray-600">{new Date(allocation.endDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Planning Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Capacity Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: "urgent",
                    title: "Tax Department Overloaded",
                    description: "Tax department is 12% over capacity. Consider redistributing workload or hiring additional staff.",
                    action: "Redistribute 15 hours to available Advisory team members"
                  },
                  {
                    type: "opportunity",
                    title: "Audit Team Underutilized",
                    description: "Audit team has 15% unused capacity that could be allocated to other projects.",
                    action: "Cross-train audit staff for tax preparation work"
                  },
                  {
                    type: "planning",
                    title: "Seasonal Surge Approaching",
                    description: "Tax season will increase demand by 40%. Plan resource reallocation or temporary staffing.",
                    action: "Schedule capacity planning meeting for next week"
                  }
                ].map((rec, index) => (
                  <Card key={index} className={`p-4 ${
                    rec.type === "urgent" ? "border-red-200 bg-red-50" :
                    rec.type === "opportunity" ? "border-green-200 bg-green-50" :
                    "border-blue-200 bg-blue-50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        rec.type === "urgent" ? "bg-red-600" :
                        rec.type === "opportunity" ? "bg-green-600" : "bg-blue-600"
                      }`}></div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                        <Button size="sm" variant="outline">
                          {rec.action}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Planning Tab */}
        <TabsContent value="projects" className="space-y-6" data-testid="content-projects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Active Projects Resource Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    name: "ACME Corp Year-End Tax",
                    client: "ACME Corporation",
                    status: "active",
                    progress: 65,
                    assignedStaff: 3,
                    estimatedHours: 120,
                    actualHours: 78,
                    dueDate: "2025-02-28",
                    priority: "high"
                  },
                  {
                    id: 2,
                    name: "Tech Solutions Audit",
                    client: "Tech Solutions Ltd",
                    status: "active",
                    progress: 45,
                    assignedStaff: 2,
                    estimatedHours: 200,
                    actualHours: 90,
                    dueDate: "2025-03-31",
                    priority: "urgent"
                  },
                  {
                    id: 3,
                    name: "Small Business Monthly Books",
                    client: "Local Restaurant Group",
                    status: "planning",
                    progress: 10,
                    assignedStaff: 1,
                    estimatedHours: 40,
                    actualHours: 4,
                    dueDate: "2025-01-31",
                    priority: "medium"
                  }
                ].map((project) => (
                  <Card key={project.id} className={`p-4 ${
                    project.priority === "urgent" ? "border-red-200 bg-red-50" :
                    project.priority === "high" ? "border-orange-200 bg-orange-50" : ""
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-gray-600">{project.client}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={
                          project.status === "active" ? "default" :
                          project.status === "planning" ? "secondary" : "outline"
                        }>
                          {project.status}
                        </Badge>
                        <Badge variant={
                          project.priority === "urgent" ? "destructive" :
                          project.priority === "high" ? "secondary" : "outline"
                        }>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Staff Assigned</div>
                          <div className="text-gray-600">{project.assignedStaff} people</div>
                        </div>
                        <div>
                          <div className="font-medium">Hours Used</div>
                          <div className="text-gray-600">{project.actualHours}/{project.estimatedHours}</div>
                        </div>
                        <div>
                          <div className="font-medium">Due Date</div>
                          <div className="text-gray-600">{new Date(project.dueDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Efficiency</div>
                          <div className="text-gray-600">{((project.progress / (project.actualHours / project.estimatedHours)) * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline">View Details</Button>
                        <Button size="sm" variant="outline">Adjust Resources</Button>
                        <Button size="sm" variant="outline">Timeline</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Planning Tab */}
        <TabsContent value="seasonal" className="space-y-6" data-testid="content-seasonal">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Seasonal Workload Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { period: "Jan-Feb (Tax Season Peak)", demand: 180, capacity: 150, status: "high" },
                    { period: "Mar-Apr (Tax Season End)", demand: 140, capacity: 150, status: "medium" },
                    { period: "May-Aug (Regular Operations)", demand: 100, capacity: 150, status: "low" },
                    { period: "Sep-Dec (Year-End Prep)", demand: 130, capacity: 150, status: "medium" }
                  ].map((period, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{period.period}</span>
                        <span className="text-gray-600">{period.demand}% of capacity</span>
                      </div>
                      <Progress 
                        value={Math.min((period.demand / period.capacity) * 100, 100)} 
                        className={`h-3 ${
                          period.status === "high" ? "text-red-500" :
                          period.status === "medium" ? "text-yellow-500" : "text-green-500"
                        }`}
                      />
                      <div className="text-xs text-gray-500">
                        {period.demand > period.capacity 
                          ? `Overdemand: ${period.demand - period.capacity}% need additional resources`
                          : `Available capacity: ${period.capacity - period.demand}%`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staffing Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Recommended staffing adjustments for optimal resource allocation
                  </div>
                  
                  {[
                    {
                      action: "Hire 2 Temp Tax Preparers",
                      period: "January - April",
                      impact: "Handle 40% capacity increase",
                      cost: "$24,000",
                      status: "recommended"
                    },
                    {
                      action: "Cross-train Bookkeeping Staff",
                      period: "December preparation",
                      impact: "Add 20% tax capacity",
                      cost: "$2,000 training",
                      status: "planned"
                    },
                    {
                      action: "Overtime Authorization",
                      period: "Peak weeks (Feb 15-Apr 15)",
                      impact: "15% capacity increase",
                      cost: "$8,000",
                      status: "approved"
                    }
                  ].map((adjustment, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{adjustment.action}</h4>
                        <Badge variant={
                          adjustment.status === "approved" ? "default" :
                          adjustment.status === "recommended" ? "secondary" : "outline"
                        }>
                          {adjustment.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><span className="font-medium">Period:</span> {adjustment.period}</div>
                        <div><span className="font-medium">Impact:</span> {adjustment.impact}</div>
                        <div><span className="font-medium">Cost:</span> {adjustment.cost}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technology Resources Tab */}
        <TabsContent value="technology" className="space-y-6" data-testid="content-technology">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technologyResources.map((resource) => (
              <Card key={resource.id} className={`${
                resource.status === "needs_renewal" ? "border-yellow-200 bg-yellow-50" :
                resource.status === "expired" ? "border-red-200 bg-red-50" : ""
              }`} data-testid={`tech-resource-${resource.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resource.type === "software" && <Monitor className="w-5 h-5" />}
                      {resource.type === "hardware" && <Laptop className="w-5 h-5" />}
                      {resource.type === "subscription" && <Wifi className="w-5 h-5" />}
                      {resource.type === "license" && <FileText className="w-5 h-5" />}
                      <CardTitle className="text-lg">{resource.name}</CardTitle>
                    </div>
                    <Badge variant={
                      resource.status === "active" ? "default" :
                      resource.status === "needs_renewal" ? "secondary" :
                      resource.status === "expired" ? "destructive" : "outline"
                    }>
                      {resource.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Type</div>
                        <div className="text-gray-600 capitalize">{resource.type}</div>
                      </div>
                      <div>
                        <div className="font-medium">Vendor</div>
                        <div className="text-gray-600">{resource.vendor}</div>
                      </div>
                      <div>
                        <div className="font-medium">Users</div>
                        <div className="text-gray-600">{resource.users}/{resource.maxUsers}</div>
                      </div>
                      <div>
                        <div className="font-medium">Annual Cost</div>
                        <div className="text-gray-600">${resource.cost.toLocaleString()}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">License Utilization</span>
                        <span className="font-medium">{((resource.users / resource.maxUsers) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={(resource.users / resource.maxUsers) * 100} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">Renewal Date</div>
                        <div className="text-gray-600">{new Date(resource.renewalDate).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={
                        resource.criticality === "critical" ? "destructive" :
                        resource.criticality === "high" ? "secondary" : "outline"
                      } className="text-xs">
                        {resource.criticality}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Manage
                      </Button>
                      <Button size="sm" variant="outline">
                        Renew
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Technology Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Technology Resource Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">${technologyResources.reduce((sum, r) => sum + r.cost, 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Annual Tech Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{technologyResources.filter(r => r.status === "active").length}</div>
                  <div className="text-sm text-gray-600">Active Resources</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{technologyResources.filter(r => r.status === "needs_renewal").length}</div>
                  <div className="text-sm text-gray-600">Need Renewal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(technologyResources.reduce((sum, r) => sum + (r.users / r.maxUsers), 0) / technologyResources.length * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Utilization</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}