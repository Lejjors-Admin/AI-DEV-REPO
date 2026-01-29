import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Invitation } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function InvitationsList() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to get the status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Accepted</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">Expired</Badge>;
      case "revoked":
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Query to fetch all invitations
  const { data: invitations, isLoading, isError, refetch } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/invitations");
      if (!res.ok) {
        throw new Error("Failed to fetch invitations");
      }
      return res.json();
    },
  });

  // Mutation to resend an invitation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/invitations/${invitationId}/resend`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Resent",
        description: "The invitation has been resent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to revoke an invitation
  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("DELETE", `/api/invitations/${invitationId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to revoke invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Revoked",
        description: "The invitation has been revoked successfully.",
      });
      setSelectedInvitation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter invitations based on active tab
  const filteredInvitations = invitations?.filter((invitation) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return invitation.status === "pending";
    if (activeTab === "staff") return invitation.inviteType === "staff";
    if (activeTab === "client") return invitation.inviteType === "client";
    return true;
  });

  if (isError) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive">Error loading invitations</p>
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>User Invitations</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="client">Client</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredInvitations && filteredInvitations.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell className="capitalize">{invitation.role.replace('_', ' ')}</TableCell>
                        <TableCell className="capitalize">{invitation.inviteType}</TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>{format(new Date(invitation.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(invitation.expiresAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {invitation.status === "pending" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  onClick={() => resendInvitationMutation.mutate(invitation.id)}
                                  disabled={resendInvitationMutation.isPending}
                                >
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setSelectedInvitation(invitation)}
                                  className="text-destructive"
                                >
                                  Revoke Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No invitations found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Revoke confirmation dialog */}
      <AlertDialog open={!!selectedInvitation} onOpenChange={(open) => !open && setSelectedInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for {selectedInvitation?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedInvitation && revokeInvitationMutation.mutate(selectedInvitation.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revokeInvitationMutation.isPending}
            >
              {revokeInvitationMutation.isPending ? "Revoking..." : "Revoke Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}