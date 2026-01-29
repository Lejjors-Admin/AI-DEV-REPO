import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Settings,
  Crown,
  Shield,
  BarChart3
} from "lucide-react";
import { apiConfig } from "@/lib/api-config";

export default function SaasAdminPanel() {
  const { user } = useAuth();
  
  // Redirect if not super admin
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This panel is only accessible to super administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: platformStats } = useQuery({
    queryKey: ['/api/platform-stats'],
    queryFn: () => fetch(apiConfig.buildUrl('/api/platform-stats')).then(res => res.json()),
    retry: false
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: () => fetch('/api/subscription-plans').then(res => res.json()),
    retry: false
  });

  const { data: firms = [] } = useQuery({
    queryKey: ['/api/firms'],
    queryFn: () => fetch(apiConfig.buildUrl('/api/firms')).then(res => res.json()),
    retry: false
  });

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            SaaS Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage subscriptions, pricing, and platform settings
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          Super Admin
        </Badge>
      </div>

      {/* Platform Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Firms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalFirms || 0}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${platformStats?.monthlyRevenue || 0}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+15.2%</div>
            <p className="text-xs text-muted-foreground">
              Quarter over quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="firms">Firms</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New firm registered</p>
                      <p className="text-sm text-muted-foreground">Invitation Test Firm</p>
                    </div>
                    <Badge variant="secondary">Today</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Subscription upgraded</p>
                      <p className="text-sm text-muted-foreground">Test Accounting Firm → Pro Plan</p>
                    </div>
                    <Badge variant="secondary">2 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Transactions Processed</span>
                    <span className="font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Used</span>
                    <span className="font-bold">2.4 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Calls</span>
                    <span className="font-bold">15,693</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Subscription Management</h2>
            <Button>Create New Plan</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans?.map((plan: any) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-2xl font-bold">${plan.price}/{plan.billing_period}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="space-y-1">
                      <p className="text-xs">Max Firms: {plan.max_firms || 'Unlimited'}</p>
                      <p className="text-xs">Max Clients: {plan.max_clients || 'Unlimited'}</p>
                      <p className="text-xs">Max Users: {plan.max_users || 'Unlimited'}</p>
                    </div>
                    <div className="pt-4 space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="firms" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Firm Management</h2>
            <Button>Add New Firm</Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>All Firms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {firms?.map((firm: any) => (
                  <div key={firm.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{firm.name}</h3>
                      <p className="text-sm text-muted-foreground">{firm.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        {firm.client_count || 0} clients
                      </Badge>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Pricing Management Dashboard</h2>
            <div className="flex gap-2">
              <Button variant="outline">Export Pricing</Button>
              <Button>+ New Plan</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Pricing Plans Grid */}
            <div className="xl:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold">Current Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptionPlans?.map((plan: any) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <div className="text-2xl font-bold text-primary mt-1">
                            ${plan.price}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{plan.billing_period}
                            </span>
                          </div>
                        </div>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Firms:</span>
                          <span className="font-medium">{plan.max_firms || '∞'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clients:</span>
                          <span className="font-medium">{plan.max_clients || '∞'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Users:</span>
                          <span className="font-medium">{plan.max_users || '∞'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transactions:</span>
                          <span className="font-medium">{plan.max_transactions?.toLocaleString() || '∞'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit Plan
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Pricing Management Forms */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Price Update</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Plan</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>Starter Plan</option>
                      <option>Professional Plan</option>
                      <option>Enterprise Plan</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="29.99"
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Billing</label>
                      <select className="w-full px-3 py-2 border rounded-md">
                        <option>monthly</option>
                        <option>yearly</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button className="w-full" size="sm">
                    Update Price
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">$12,847</div>
                      <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">67</div>
                      <div className="text-xs text-muted-foreground">Active Subscriptions</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Starter</span>
                      <span className="font-medium">32 subs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Professional</span>
                      <span className="font-medium">28 subs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Enterprise</span>
                      <span className="font-medium">7 subs</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    View Full Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Platform Settings</h2>
            <Button>Save Changes</Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Name</label>
                  <input 
                    type="text" 
                    defaultValue="AccountSync"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <input 
                    type="email" 
                    defaultValue="support@accountsync.com"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trial Period (days)</label>
                  <input 
                    type="number" 
                    defaultValue="14"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">AI Features Enabled</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bank Integrations</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Custom Branding</span>
                    <input type="checkbox" className="rounded" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Access</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}