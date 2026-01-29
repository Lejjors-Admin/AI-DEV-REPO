import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  User, 
  Edit,
  Calendar,
  Plus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AvailabilityEditor from "./AvailabilityEditor";

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
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

export default function StaffAvailabilityManager() {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Fetch all staff users
  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 60000,
  });
  const users = (usersData?.users || []).filter((u: any) => 
    ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(u.role)
  );

  // Fetch all availability data
  const { data: availabilityResponse } = useQuery({
    queryKey: ['/api/schedule/availability/all'],
    enabled: users.length > 0,
  });
  const allAvailability = availabilityResponse?.data || [];

  const handleEditStaff = (userId: number) => {
    setSelectedStaffId(userId.toString());
    setShowEditDialog(true);
  };

  const handleCloseDialog = () => {
    setShowEditDialog(false);
    setSelectedStaffId(null);
  };

  return (
    <div className="space-y-6" data-testid="staff-availability-manager">
      {/* Staff List */}
      <div className="grid gap-4">
        {users.map((user: any) => {
          const userAvailability = allAvailability.filter((a: any) => a.userId === user.id);
          const activeAvailability = userAvailability.filter((a: any) => a.isActive);
          
          return (
            <Card key={user.id} data-testid={`staff-availability-${user.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.name || user.username}</CardTitle>
                      <CardDescription className="text-sm">
                        {user.email}
                        {user.isManager && <Badge variant="secondary" className="ml-2">Manager</Badge>}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditStaff(user.id)}
                    data-testid={`edit-availability-${user.id}`}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Availability
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeAvailability.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Weekly Availability
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {WEEKDAYS.map((day) => {
                        const dayAvailability = activeAvailability.filter(
                          (a: any) => a.weekday === day.value
                        );
                        
                        if (dayAvailability.length === 0) {
                          return (
                            <div
                              key={day.value}
                              className="flex items-center justify-between rounded-lg border p-3 bg-muted/30"
                              data-testid={`availability-${user.id}-${day.label.toLowerCase()}`}
                            >
                              <span className="text-sm font-medium text-muted-foreground">
                                {day.label}
                              </span>
                              <span className="text-xs text-muted-foreground">Not available</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={day.value}
                            className="flex flex-col gap-1 rounded-lg border p-3 bg-background"
                            data-testid={`availability-${user.id}-${day.label.toLowerCase()}`}
                          >
                            <span className="text-sm font-medium">{day.label}</span>
                            {dayAvailability.map((avail: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {minutesToTime(avail.startMinutes)} - {minutesToTime(avail.endMinutes)}
                                </span>
                                {avail.isBookable && (
                                  <Badge variant="outline" className="ml-auto text-xs">Bookable</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No availability set for this staff member
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleEditStaff(user.id)}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Availability
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Availability</DialogTitle>
            <DialogDescription>
              Manage weekly hours and exceptions for{" "}
              {selectedStaffId && users.find((u: any) => u.id === parseInt(selectedStaffId))?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStaffId && (
            <AvailabilityEditor
              userId={parseInt(selectedStaffId)}
              readonly={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
