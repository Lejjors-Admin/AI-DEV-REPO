import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, TrashIcon, UserCog } from "lucide-react";
import { apiConfig } from "@/lib/api-config";

export default function AccessControl() {
  const [activeTab, setActiveTab] = useState("staff-assignments");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const { toast } = useToast();
  const MODULE_OPTIONS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "clients", label: "Clients" },
    { key: "contact-management", label: "Contacts" },
    { key: "projects", label: "Projects" },
    { key: "tasks", label: "Tasks" },
    { key: "calendar", label: "Calendar" },
    { key: "communication", label: "Communication" },
    { key: "notifications", label: "Notifications" },
    { key: "team", label: "Team" },
    { key: "reports", label: "Reports" },
    { key: "time-expenses", label: "Time & Expenses" },
    { key: "billing", label: "Billing" },
    { key: "settings", label: "Settings" },
    { key: "practice", label: "Practice" },
  ];
  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: staffMembers, isLoading: staffLoading } = useQuery({
    queryKey: ["/api/users/role/staff"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  useEffect(() => {
    if (currentUser?.firmId) {
      setNewPermission((prev) => ({
        ...prev,
        firmId: currentUser.firmId,
      }));
    }
  }, [currentUser?.firmId]);

  // Get permissions for the current user's firm
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["/api/user-permissions"],
    enabled: !!currentUser?.firmId,
  });

  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    staffId: 0,
    clientId: 0,
    canViewFinancials: true,
    canEditTransactions: false,
    canManageAuditFiles: false,
    canViewInvoices: true,
    canCreateInvoices: false,
    isClientManager: false,
  });

  const [newPermission, setNewPermission] = useState({
    userId: 0,
    firmId: (currentUser as any)?.firmId || 0,
    role: "staff",
    modules: [] as string[],
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: any) => {
      const res = await fetch(apiConfig.buildUrl("/api/staff-assignments"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(assignment),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to create assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      toast({
        title: "Assignment created",
        description: "Staff member has been assigned to client",
      });
      setAssignmentDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiConfig.buildUrl(`/api/staff-assignments/${id}`), {
        method: "DELETE",
        headers: {
          ...authHeaders(),
        },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to delete assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      toast({
        title: "Assignment deleted",
        description: "Staff member has been unassigned from client",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: async (permission: any) => {
      const res = await fetch(apiConfig.buildUrl("/api/user-permissions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(permission),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to create permission");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-permissions"] });
      toast({
        title: "Permission created",
        description: "User permissions have been updated",
      });
      setPermissionDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create permission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: any }) => {
      const res = await fetch(apiConfig.buildUrl(`/api/user-permissions/${userId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to update permission");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-permissions"] });
      toast({
        title: "Permission updated",
        description: "User permissions have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update permission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAssignment = () => {
    createAssignmentMutation.mutate({
      ...newAssignment,
      assignedBy: (currentUser as any)?.id,
    });
  };

  const handleCreatePermission = () => {
    createPermissionMutation.mutate(newPermission);
  };

  const handlePermissionChange = (userId: number, moduleKey: string, value: boolean) => {
    const current = permissionsData.find((perm: any) => perm.userId === userId);
    const existingModules = Array.isArray(current?.modules) ? current.modules : [];
    const updatedModules = value
      ? Array.from(new Set([...existingModules, moduleKey]))
      : existingModules.filter((key: string) => key !== moduleKey);

    updatePermissionMutation.mutate({
      userId,
      updates: {
        modules: updatedModules,
      },
    });
  };

  // Loading state
  if (clientsLoading || staffLoading || assignmentsLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle empty data
  const clientsData = clients || [];
  const staffData = staffMembers || [];
  const assignmentsData = assignments || [];
  const permissionsData = permissions || [];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Access Control</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff-assignments">Staff-Client Assignments</TabsTrigger>
          <TabsTrigger value="user-permissions">User Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="staff-assignments" className="py-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Staff-Client Assignments</CardTitle>
                  <CardDescription>
                    Manage which staff members have access to which clients and their permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setAssignmentDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Staff-Client Assignments</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Financial Access</TableHead>
                    <TableHead>Transaction Edit</TableHead>
                    <TableHead>Audit Files</TableHead>
                    <TableHead>View Invoices</TableHead>
                    <TableHead>Create Invoices</TableHead>
                    <TableHead>Client Manager</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentsData.map((assignment: any) => {
                    const staff = staffData.find((s: any) => s.id === assignment.staffId);
                    const client = clientsData.find((c: any) => c.id === assignment.clientId);
                    
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>{staff?.name || 'Unknown'}</TableCell>
                        <TableCell>{client?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.canViewFinancials} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.canEditTransactions} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.canManageAuditFiles} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.canViewInvoices} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.canCreateInvoices} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={assignment.isClientManager} 
                            disabled 
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {assignmentsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        No assignments found. Create a new assignment to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-permissions" className="py-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Permissions</CardTitle>
                  <CardDescription>
                    Manage firm-wide permissions for users
                  </CardDescription>
                </div>
                <Button onClick={() => setPermissionDialog(true)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Add User Permission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>User Permissions</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Module Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionsData.map((perm: any) => {
                    const user = staffData.find((s: any) => s.id === perm.userId);
                    
                    return (
                      <TableRow key={perm.id}>
                        <TableCell>{user?.name || 'Unknown'}</TableCell>
                        <TableCell>{perm.role}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {MODULE_OPTIONS.map((module) => (
                              <label key={module.key} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={Array.isArray(perm.modules) && perm.modules.includes(module.key)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(perm.userId, module.key, !!checked)
                                  }
                                />
                                <span>{module.label}</span>
                              </label>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {permissionsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No user permissions found. Add a new permission to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for creating staff-client assignment */}
      <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Staff-Client Assignment</DialogTitle>
            <DialogDescription>
              Assign a staff member to a client and set their access permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="staff" className="text-right">
                Staff Member
              </label>
              <Select 
                onValueChange={(value) => 
                  setNewAssignment({ ...newAssignment, staffId: parseInt(value) })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Staff</SelectLabel>
                    {staffData
                      .filter((staff: any) => staff.role === 'staff')
                      .map((staff: any) => (
                        <SelectItem key={staff.id} value={staff.id.toString()}>
                          {staff.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="client" className="text-right">
                Client
              </label>
              <Select 
                onValueChange={(value) => 
                  setNewAssignment({ ...newAssignment, clientId: parseInt(value) })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Clients</SelectLabel>
                    {clientsData.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Permission Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="viewFinancials" 
                    checked={newAssignment.canViewFinancials}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, canViewFinancials: !!checked })
                    }
                  />
                  <label htmlFor="viewFinancials">View Financials</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="editTransactions" 
                    checked={newAssignment.canEditTransactions}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, canEditTransactions: !!checked })
                    }
                  />
                  <label htmlFor="editTransactions">Edit Transactions</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="manageAuditFiles" 
                    checked={newAssignment.canManageAuditFiles}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, canManageAuditFiles: !!checked })
                    }
                  />
                  <label htmlFor="manageAuditFiles">Manage Audit Files</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="viewInvoices" 
                    checked={newAssignment.canViewInvoices}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, canViewInvoices: !!checked })
                    }
                  />
                  <label htmlFor="viewInvoices">View Invoices</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="createInvoices" 
                    checked={newAssignment.canCreateInvoices}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, canCreateInvoices: !!checked })
                    }
                  />
                  <label htmlFor="createInvoices">Create Invoices</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isClientManager" 
                    checked={newAssignment.isClientManager}
                    onCheckedChange={(checked) => 
                      setNewAssignment({ ...newAssignment, isClientManager: !!checked })
                    }
                  />
                  <label htmlFor="isClientManager">Client Manager</label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleCreateAssignment}
              disabled={!newAssignment.staffId || !newAssignment.clientId}
            >
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding user permissions */}
      <Dialog open={permissionDialog} onOpenChange={setPermissionDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add User Permission</DialogTitle>
            <DialogDescription>
              Set permissions for a user within your firm
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="user" className="text-right">
                User
              </label>
              <Select 
                onValueChange={(value) => 
                  setNewPermission({ ...newPermission, userId: parseInt(value) })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Users</SelectLabel>
                    {staffData
                      .filter((user: any) => user.firmId === currentUser?.firmId)
                      .map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right">
                Role
              </label>
              <Select 
                onValueChange={(value) => 
                  setNewPermission({ ...newPermission, role: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firm_admin">Firm Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Module Access</h3>
              <div className="flex flex-wrap gap-3">
                {MODULE_OPTIONS.map((module) => (
                  <label key={module.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newPermission.modules.includes(module.key)}
                      onCheckedChange={(checked) => {
                        const modules = checked
                          ? Array.from(new Set([...newPermission.modules, module.key]))
                          : newPermission.modules.filter((key) => key !== module.key);
                        setNewPermission({ ...newPermission, modules });
                      }}
                    />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleCreatePermission}
              disabled={!newPermission.userId}
            >
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}