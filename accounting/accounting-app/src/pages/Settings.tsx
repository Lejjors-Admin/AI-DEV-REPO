import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { 
  Save, 
  User, 
  Key, 
  Globe, 
  Bell, 
  CreditCard, 
  Shield,
  CheckCircle,
  Users,
  Lock,
  PlusCircle,
  TrashIcon,
  UserCog,
  UserPlus,
  Brain,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import UserManagementPanel from "@/components/settings/UserManagementPanel";
import AIProviderSettings from "@/components/settings/AIProviderSettings";
import { apiConfig, apiRequest } from "@/lib/api-config";

interface UserData {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  position?: string;
  firmId?: number;
  accountId?: number;
  clientId?: number;
  isManager?: boolean;
  isAccountOwner?: boolean;
}

interface AccountFormData {
  name: string;
  email: string;
  username: string;
  department?: string;
  position?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account");
  
  // Fetch user data
  const { data: user, isLoading: isLoadingUser } = useQuery<UserData>({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      const res = await apiRequest("/api/users/me", {
        method: "GET",
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch user information");
      }
      
      return res.json();
    },
    retry: false,
  });

  // Initialize form with user data
  const form = useForm<AccountFormData>({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      department: user?.department || "",
      position: user?.position || "",
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        username: user.username || "",
        department: user.department || "",
        position: user.position || "",
      });
    }
  }, [user, form]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const res = await apiRequest("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update user" }));
        throw new Error(errorData.message || "Failed to update user information");
      }

      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/users/me'], updatedUser);
      toast({
        title: "Settings saved",
        description: "Your account information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSettings = () => {
    form.handleSubmit((data) => {
      updateUserMutation.mutate(data);
    })();
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Settings Content */}
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-8 w-full max-w-4xl mb-6">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="access-control" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Access</span>
            </TabsTrigger>
            <TabsTrigger value="ai-settings" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Settings</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Account Settings */}
          <TabsContent value="account">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Account Information</h2>
                <p className="text-sm text-neutral-500">Update your account details and preferences</p>
              </CardHeader>
              <CardContent>
                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(handleSaveSettings)}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            {...form.register("name", { required: "Name is required" })}
                            className="mt-1"
                            disabled={updateUserMutation.isPending}
                          />
                          {form.formState.errors.name && (
                            <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            {...form.register("email", { 
                              required: "Email is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address"
                              }
                            })}
                            className="mt-1"
                            disabled={updateUserMutation.isPending}
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            {...form.register("username", { required: "Username is required" })}
                            className="mt-1"
                            disabled={updateUserMutation.isPending}
                          />
                          {form.formState.errors.username && (
                            <p className="text-sm text-red-500 mt-1">{form.formState.errors.username.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Input
                            id="role"
                            value={user?.role || ""}
                            className="mt-1"
                            disabled
                          />
                          <p className="text-xs text-neutral-500 mt-1">Role cannot be changed</p>
                        </div>
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            {...form.register("department")}
                            className="mt-1"
                            disabled={updateUserMutation.isPending}
                          />
                        </div>
                        <div>
                          <Label htmlFor="position">Position</Label>
                          <Input
                            id="position"
                            {...form.register("position")}
                            className="mt-1"
                            disabled={updateUserMutation.isPending}
                          />
                        </div>
                      </div>
                  
                      <Separator />
                      
                      <div>
                        <h3 className="text-base font-medium mb-4">Profile Picture</h3>
                        <div className="flex items-center gap-6">
                          <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-xl font-medium">
                            {user?.name ? user.name.charAt(0).toUpperCase() + (user.name.split(' ')[1]?.charAt(0).toUpperCase() || '') : 'U'}
                          </div>
                          <div>
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              className="mb-2"
                              disabled={updateUserMutation.isPending}
                            >
                              Upload New Picture
                            </Button>
                            <p className="text-xs text-neutral-500">JPG, GIF or PNG. 1MB max.</p>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-base font-medium mb-4">Preferences</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="theme" className="text-base">Theme</Label>
                              <p className="text-sm text-neutral-500">Choose your interface theme</p>
                            </div>
                            <Select defaultValue="light">
                              <SelectTrigger id="theme" className="w-[180px]">
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System Default</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="language" className="text-base">Language</Label>
                              <p className="text-sm text-neutral-500">Select your preferred language</p>
                            </div>
                            <Select defaultValue="en">
                              <SelectTrigger id="language" className="w-[180px]">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit"
                          disabled={updateUserMutation.isPending}
                        >
                          {updateUserMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Settings */}
          <TabsContent value="security">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Security Settings</h2>
                <p className="text-sm text-neutral-500">Manage your password and security preferences</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Change Password</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Button className="mt-2">
                          Update Password
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Enable two-factor authentication for added security</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          We'll send you a verification code when you sign in on a new device.
                        </p>
                      </div>
                      <Switch id="2fa" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Session Management</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-neutral-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-neutral-500">Windows 10 • Chrome • Los Angeles, CA</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-status-success" />
                      </div>
                      <Button variant="outline" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                        Sign Out All Other Devices
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Access Control Settings */}
          <TabsContent value="ai-settings">
            <AIProviderSettings />
          </TabsContent>

          <TabsContent value="access-control">
            <div className="space-y-6">
              {/* User Management Panel */}
              <UserManagementPanel />
              
              {/* Staff-Client Assignments & User Permissions */}
              <Card className="max-w-4xl">
                <CardHeader>
                  <h2 className="text-lg font-medium">Permissions & Assignments</h2>
                  <p className="text-sm text-neutral-500">Manage staff-client assignments and user permissions</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <Tabs defaultValue="staff-assignments" className="w-full">
                      <TabsList className="grid grid-cols-2 w-full mb-6">
                        <TabsTrigger value="staff-assignments" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Staff-Client Assignments</span>
                        </TabsTrigger>
                        <TabsTrigger value="user-permissions" className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>User Permissions</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="staff-assignments">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-medium">Staff-Client Assignments</h3>
                          <Button size="sm">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            New Assignment
                          </Button>
                        </div>
                        
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>View Financials</TableHead>
                                <TableHead>Edit Transactions</TableHead>
                                <TableHead>Manage Audit Files</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>Jane Smith</TableCell>
                                <TableCell>Acme Corporation</TableCell>
                                <TableCell>
                                  <Checkbox checked disabled />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked disabled />
                                </TableCell>
                                <TableCell>
                                  <Checkbox disabled />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon">
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Mike Johnson</TableCell>
                                <TableCell>NexTech Industries</TableCell>
                                <TableCell>
                                  <Checkbox checked disabled />
                                </TableCell>
                                <TableCell>
                                  <Checkbox disabled />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked disabled />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon">
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="user-permissions">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-medium">User Permissions</h3>
                          <Button size="sm">
                            <UserCog className="h-4 w-4 mr-2" />
                            Add Permission
                          </Button>
                        </div>
                        
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Access All Clients</TableHead>
                                <TableHead>Manage Users</TableHead>
                                <TableHead>Create Invoices</TableHead>
                                <TableHead>View Reports</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>Sarah Davis</TableCell>
                                <TableCell>Firm Admin</TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Robert Wilson</TableCell>
                                <TableCell>Staff</TableCell>
                                <TableCell>
                                  <Checkbox />
                                </TableCell>
                                <TableCell>
                                  <Checkbox />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                                <TableCell>
                                  <Checkbox checked />
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Integrations Settings */}
          <TabsContent value="integrations">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Integration Settings</h2>
                <p className="text-sm text-neutral-500">Manage your connections to external services</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border border-neutral-300 rounded-lg p-5 flex items-center bg-neutral-100">
                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-primary rounded-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-medium text-neutral-900">QuickBooks Online</h4>
                          <p className="text-sm text-neutral-500">Connected • Last synced: Today, 10:45 AM</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">Settings</Button>
                          <Button variant="outline" size="sm" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-neutral-300 rounded-lg p-5 flex items-center bg-neutral-100">
                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-neutral-400 rounded-lg">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-medium text-neutral-900">Xero</h4>
                          <p className="text-sm text-neutral-500">Not connected</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-neutral-300 rounded-lg p-5 flex items-center bg-neutral-100">
                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-neutral-400 rounded-lg">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-medium text-neutral-900">Salesforce</h4>
                          <p className="text-sm text-neutral-500">Not connected</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">API Access</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Enable API access for custom integrations</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          Allow third-party applications to connect to your AccountSync account
                        </p>
                      </div>
                      <Switch id="api-access" defaultChecked />
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm">
                        Manage API Keys
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Notification Preferences</h2>
                <p className="text-sm text-neutral-500">Control how and when you receive notifications</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Client Updates</p>
                          <p className="text-xs text-neutral-500">Receive notifications when client details change</p>
                        </div>
                        <Switch id="client-updates" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Bookkeeping Data Sync</p>
                          <p className="text-xs text-neutral-500">Get notified about QBO sync status</p>
                        </div>
                        <Switch id="financial-sync" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Audit File Updates</p>
                          <p className="text-xs text-neutral-500">Be alerted when audit files need attention</p>
                        </div>
                        <Switch id="audit-updates" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Task Reminders</p>
                          <p className="text-xs text-neutral-500">Receive reminders for upcoming tasks</p>
                        </div>
                        <Switch id="task-reminders" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">In-App Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">System Alerts</p>
                          <p className="text-xs text-neutral-500">Important system notifications and updates</p>
                        </div>
                        <Switch id="system-alerts" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Task Assignments</p>
                          <p className="text-xs text-neutral-500">Get notified when you're assigned a task</p>
                        </div>
                        <Switch id="task-assignments" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Notification Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quiet-hours-start">Quiet Hours Start</Label>
                        <Select defaultValue="18">
                          <SelectTrigger id="quiet-hours-start" className="mt-1">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quiet-hours-end">Quiet Hours End</Label>
                        <Select defaultValue="8">
                          <SelectTrigger id="quiet-hours-end" className="mt-1">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Billing Settings */}
          <TabsContent value="billing">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Billing and Subscription</h2>
                <p className="text-sm text-neutral-500">Manage your subscription plan and payment method</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Current Plan</h3>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-medium text-primary">Professional Plan</p>
                          <p className="text-sm text-neutral-700">$99/month • Renews on June 15, 2023</p>
                          <p className="text-xs text-neutral-500 mt-1">Includes unlimited clients, QBO integration, and audit file generation</p>
                        </div>
                        <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white">
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Payment Method</h3>
                    <div className="border border-neutral-300 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="h-8 w-8 text-neutral-700 mr-3" />
                        <div>
                          <p className="text-sm font-medium">Visa ending in 4242</p>
                          <p className="text-xs text-neutral-500">Expires 06/2025</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Billing History</h3>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-neutral-300">
                        <thead>
                          <tr className="bg-neutral-100">
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-300">
                          <tr>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">May 15, 2023</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">Professional Plan - Monthly</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">$99.00</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-status-success/10 text-status-success">Paid</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <Button variant="link" size="sm" className="p-0 h-auto">Download</Button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">Apr 15, 2023</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">Professional Plan - Monthly</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700">$99.00</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-status-success/10 text-status-success">Paid</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <Button variant="link" size="sm" className="p-0 h-auto">Download</Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card className="max-w-4xl">
              <CardHeader>
                <h2 className="text-lg font-medium">Privacy Settings</h2>
                <p className="text-sm text-neutral-500">Manage your data privacy preferences</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-4">Data Collection</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Usage Analytics</p>
                          <p className="text-xs text-neutral-500">Allow us to collect anonymous usage data to improve the application</p>
                        </div>
                        <Switch id="usage-analytics" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Personalization</p>
                          <p className="text-xs text-neutral-500">Allow us to personalize your experience based on your usage patterns</p>
                        </div>
                        <Switch id="personalization" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Cookie Preferences</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Essential Cookies</p>
                          <p className="text-xs text-neutral-500">Required for the application to function properly</p>
                        </div>
                        <Switch id="essential-cookies" defaultChecked disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Performance Cookies</p>
                          <p className="text-xs text-neutral-500">Help us understand how visitors interact with our application</p>
                        </div>
                        <Switch id="performance-cookies" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Marketing Cookies</p>
                          <p className="text-xs text-neutral-500">Used to track visitors across websites for marketing purposes</p>
                        </div>
                        <Switch id="marketing-cookies" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="pt-2">
                    <Button variant="outline" className="mr-4">
                      Download My Data
                    </Button>
                    <Button variant="outline" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
