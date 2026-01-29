import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Crown,
  Plus,
  Eye,
  Edit,
  Settings,
  BarChart3,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { apiConfig } from '@/lib/api-config';

export default function EnhancedSaasAdminPanel() {
  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/platform-stats'],
    queryFn: () => fetch(apiConfig.buildUrl('/api/platform-stats')).then(res => res.json())
  });

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: () => fetch(apiConfig.buildUrl('/api/subscription-plans')).then(res => res.json())
  });

  // Fetch firms data
  const { data: firms, isLoading: firmsLoading } = useQuery({
    queryKey: ['/api/firms'],
    queryFn: () => fetch(apiConfig.buildUrl('/api/firms')).then(res => res.json())
  });

  if (statsLoading || plansLoading || firmsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="w-8 h-8 text-blue-600" />
            SaaS Platform Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Monitor your AI accounting platform performance</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Firm
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Firms</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats?.totalFirms || 0}</div>
            <p className="text-xs text-blue-600">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Total Clients</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats?.totalClients || 0}</div>
            <p className="text-xs text-purple-600">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              ${(stats?.monthlyRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-orange-600">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +22% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Plans
            </CardTitle>
            <CardDescription>Active pricing plans and subscription metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans?.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{plan.name}</h4>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-lg font-bold text-green-600">
                      ${plan.price?.toFixed(2) || '0.00'}
                    </span>
                    <Badge variant="secondary">{plan.billingPeriod || 'monthly'}</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create New Plan
            </Button>
          </CardContent>
        </Card>

        {/* Recent Firms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Recent Firms
            </CardTitle>
            <CardDescription>Latest accounting firms on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {firms?.slice(0, 5).map((firm: any) => (
              <div key={firm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{firm.name}</h4>
                  <p className="text-sm text-gray-500">{firm.email}</p>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {firm.client_count || 0} clients
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {firm.user_count || 0} users
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(!firms || firms.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No firms registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health & Performance
          </CardTitle>
          <CardDescription>Real-time platform monitoring and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Performance</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Excellent
                </Badge>
              </div>
              <Progress value={95} className="h-2" />
              <p className="text-xs text-gray-500">Response time: 120ms avg</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  <Activity className="w-3 h-3 mr-1" />
                  Good
                </Badge>
              </div>
              <Progress value={87} className="h-2" />
              <p className="text-xs text-gray-500">Uptime: 99.9%</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Processing</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Monitoring
                </Badge>
              </div>
              <Progress value={78} className="h-2" />
              <p className="text-xs text-gray-500">Queue: 2 pending jobs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}