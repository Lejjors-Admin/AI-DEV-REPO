import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  X,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AppointmentRequest {
  id: number;
  clientId: number;
  staffUserId: number;
  startAt: string;
  endAt: string;
  subject: string;
  note?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  meetingRoomId?: number;
  staffName?: string;
  staffEmail?: string;
  meetingRoomName?: string;
}

interface ClientAppointmentManagerProps {
  clientId: number;
}

export default function ClientAppointmentManager({
  clientId,
}: ClientAppointmentManagerProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch client appointments
  const { data: appointments = [], isLoading } = useQuery<AppointmentRequest[]>({
    queryKey: ["/api/schedule/appointment-requests", clientId],
    enabled: !!clientId,
  });

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: (data: { appointmentId: number; reason: string }) =>
      apiRequest("POST", `/api/schedule/appointment-requests/${data.appointmentId}/cancel`, {
        reason: data.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/schedule/appointment-requests"],
      });
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedAppointment(null);
      toast({
        title: "Appointment cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel appointment.",
        variant: "destructive",
      });
    },
  });

  // Reschedule appointment mutation
  const rescheduleMutation = useMutation({
    mutationFn: (data: {
      appointmentId: number;
      newStartAt: string;
      newEndAt: string;
      reason: string;
    }) =>
      apiRequest(
        "POST",
        `/api/schedule/appointment-requests/${data.appointmentId}/reschedule`,
        {
          newStartAt: data.newStartAt,
          newEndAt: data.newEndAt,
          reason: data.reason,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/schedule/appointment-requests"],
      });
      setRescheduleDialogOpen(false);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
      setSelectedAppointment(null);
      toast({
        title: "Reschedule request sent",
        description:
          "Your reschedule request has been submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reschedule appointment.",
        variant: "destructive",
      });
    },
  });

  const handleCancelClick = (appointment: AppointmentRequest) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleRescheduleClick = (appointment: AppointmentRequest) => {
    setSelectedAppointment(appointment);
    // Pre-fill with current appointment time
    const startDate = new Date(appointment.startAt);
    setRescheduleDate(format(startDate, "yyyy-MM-dd"));
    setRescheduleTime(format(startDate, "HH:mm"));
    setRescheduleDialogOpen(true);
  };

  const handleCancelSubmit = () => {
    if (!selectedAppointment) return;
    cancelMutation.mutate({
      appointmentId: selectedAppointment.id,
      reason: cancelReason,
    });
  };

  const handleRescheduleSubmit = () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    const [hours, minutes] = rescheduleTime.split(":").map(Number);
    const newStartAt = new Date(rescheduleDate);
    newStartAt.setHours(hours, minutes, 0, 0);

    // Calculate duration based on original appointment
    const originalStart = new Date(selectedAppointment.startAt);
    const originalEnd = new Date(selectedAppointment.endAt);
    const duration = originalEnd.getTime() - originalStart.getTime();

    const newEndAt = new Date(newStartAt.getTime() + duration);

    rescheduleMutation.mutate({
      appointmentId: selectedAppointment.id,
      newStartAt: newStartAt.toISOString(),
      newEndAt: newEndAt.toISOString(),
      reason: rescheduleReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Appointments</h2>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You have no appointments scheduled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const startDate = new Date(appointment.startAt);
            const endDate = new Date(appointment.endAt);
            const isUpcoming = startDate > new Date();
            const canModify =
              appointment.status === "approved" && isUpcoming;

            return (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">
                        {appointment.subject}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(startDate, "EEEE, MMMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(startDate, "h:mm a")} -{" "}
                          {format(endDate, "h:mm a")}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appointment.staffName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">With:</span>{" "}
                        {appointment.staffName}
                      </span>
                    </div>
                  )}

                  {appointment.meetingRoomName && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="font-medium">Room:</span>{" "}
                        {appointment.meetingRoomName}
                      </span>
                    </div>
                  )}

                  {appointment.note && (
                    <div className="text-sm">
                      <span className="font-medium">Notes:</span>{" "}
                      {appointment.note}
                    </div>
                  )}

                  {canModify && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRescheduleClick(appointment)}
                        data-testid={`reschedule-btn-${appointment.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClick(appointment)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`cancel-btn-${appointment.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? The staff member
              will be notified.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="font-medium">{selectedAppointment.subject}</p>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(selectedAppointment.startAt),
                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason">
                  Reason for cancellation (optional)
                </Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Let us know why you need to cancel..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  data-testid="cancel-reason-textarea"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={cancelMutation.isPending}
              data-testid="confirm-cancel-btn"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Appointment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Request a new time for this appointment. The staff member will need
              to approve the new time.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="font-medium">{selectedAppointment.subject}</p>
                <p className="text-sm text-muted-foreground">
                  Current time:{" "}
                  {format(
                    new Date(selectedAppointment.startAt),
                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reschedule-date">New Date</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    data-testid="reschedule-date-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reschedule-time">New Time</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    data-testid="reschedule-time-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule-reason">
                  Reason for rescheduling (optional)
                </Label>
                <Textarea
                  id="reschedule-reason"
                  placeholder="Let us know why you need to reschedule..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={3}
                  data-testid="reschedule-reason-textarea"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
              disabled={rescheduleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={
                rescheduleMutation.isPending ||
                !rescheduleDate ||
                !rescheduleTime
              }
              data-testid="confirm-reschedule-btn"
            >
              {rescheduleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Request Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
