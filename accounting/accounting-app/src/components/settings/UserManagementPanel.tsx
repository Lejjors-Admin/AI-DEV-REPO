import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InviteUserForm from "./InviteUserForm";
import InvitationsList from "./InvitationsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UserPlus, Mails } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// This component serves as the parent container for all user management functionality
export default function UserManagementPanel() {
  const [activeTab, setActiveTab] = useState("staff-invites");
  const { user } = useAuth();
  
  // Determine if the current user has permission to invite staff
  const canInviteStaff = user?.role === "firm_owner" || user?.role === "firm_admin";
  
  // Determine if the current user has permission to invite clients
  const canInviteClients = user?.role === "firm_owner" || user?.role === "firm_admin" || user?.role === "manager";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>User Management</CardTitle>
          </div>
          <CardDescription>
            Manage users, send invitations, and control access to your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="staff-invites" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Team Invites</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger value="client-invites" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Client Invites</span>
                <span className="sm:hidden">Clients</span>
              </TabsTrigger>
              <TabsTrigger value="all-invitations" className="flex items-center gap-2">
                <Mails className="h-4 w-4" />
                <span className="hidden sm:inline">Manage Invitations</span>
                <span className="sm:hidden">Invitations</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="staff-invites" className="mt-6">
              {canInviteStaff ? (
                <InviteUserForm type="staff" />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      You don't have permission to invite team members.
                      Contact your administrator for assistance.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="client-invites" className="mt-6">
              {canInviteClients ? (
                <InviteUserForm type="client" />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      You don't have permission to invite client users.
                      Contact your administrator for assistance.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="all-invitations" className="mt-6">
              <InvitationsList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}