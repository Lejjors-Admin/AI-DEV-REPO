/**
 * Calendar Sharing Dialog (Phase 3.5)
 * 
 * Allows staff to share their calendar with team members and manage sharing permissions
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, Trash2, Users, Calendar } from "lucide-react";

interface CalendarSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalendarSharingDialog({
  open,
  onOpenChange,
}: CalendarSharingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch staff members
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: open,
  });

  // Fetch calendars I've shared
  const { data: myShares = [], isLoading: loadingMyShares } = useQuery<any[]>({
    queryKey: ["/api/schedule/calendar-shares/my-shares"],
    enabled: open,
  });

  // Fetch calendars shared with me
  const { data: sharedWithMe = [], isLoading: loadingSharedWithMe } = useQuery<any[]>({
    queryKey: ["/api/schedule/calendar-shares/shared-with-me"],
    enabled: open,
  });

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: async (sharedWithUserId: number) => {
      return apiRequest("POST", "/api/schedule/calendar-shares", {
        sharedWithUserId,
        canView: true,
        canEdit: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/calendar-shares/my-shares"] });
      setSelectedUserId("");
      toast({
        title: "Calendar shared",
        description: "Calendar shared successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sharing calendar",
        description: error.message || "Failed to share calendar",
        variant: "destructive",
      });
    },
  });

  // Revoke share mutation
  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      return apiRequest("DELETE", `/api/schedule/calendar-shares/${shareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/calendar-shares/my-shares"] });
      toast({
        title: "Access revoked",
        description: "Calendar access revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error revoking access",
        description: error.message || "Failed to revoke access",
        variant: "destructive",
      });
    },
  });

  const handleShareCalendar = () => {
    if (!selectedUserId) {
      toast({
        title: "No user selected",
        description: "Please select a team member to share with",
        variant: "destructive",
      });
      return;
    }

    createShareMutation.mutate(parseInt(selectedUserId));
  };

  const handleRevokeShare = (shareId: number) => {
    revokeShareMutation.mutate(shareId);
  };

  // Filter out current user and already shared users
  const availableUsers = users.filter(
    (u: any) =>
      u.id !== user?.id &&
      ['firm_admin', 'firm_owner', 'staff', 'manager', 'super_admin', 'admin', 'system_admin'].includes(u.role) &&
      !myShares.some((share: any) => share.sharedWithUserId === u.id)
  );

  const isLoading = loadingMyShares || loadingSharedWithMe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Calendar Sharing
          </DialogTitle>
          <DialogDescription>
            Share your calendar with team members and manage access permissions
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Share with new user */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Share My Calendar
              </h3>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-user-to-share">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No team members available
                      </div>
                    ) : (
                      availableUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name || u.username} ({u.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleShareCalendar}
                  disabled={!selectedUserId || createShareMutation.isPending}
                  data-testid="button-share-calendar"
                >
                  {createShareMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Share
                </Button>
              </div>
            </div>

            <Separator />

            {/* Calendars I've shared */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Shared With ({myShares.length})
              </h3>
              {myShares.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground text-center">
                      You haven't shared your calendar with anyone yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {myShares.map((share: any) => (
                    <Card key={share.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {share.sharedWithName || share.sharedWithUsername}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Can view your events
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeShare(share.id)}
                            disabled={revokeShareMutation.isPending}
                            data-testid={`button-revoke-${share.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Calendars shared with me */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Shared With Me ({sharedWithMe.length})
              </h3>
              {sharedWithMe.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-sm text-muted-foreground text-center">
                      No calendars have been shared with you yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {sharedWithMe.map((share: any) => (
                    <Card key={share.id}>
                      <CardContent className="py-3">
                        <div>
                          <p className="font-medium">
                            {share.ownerName || share.ownerUsername}'s Calendar
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You can view their events
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
