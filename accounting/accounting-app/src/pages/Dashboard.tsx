import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, FileText, DollarSign, TrendingUp, AlertTriangle, Calculator, FolderOpen, ArrowRight, Bot } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { NavigationVariations } from "../components/NavigationVariations";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  firmId?: number;
  clientId?: number;
}

interface Client {
  id: number;
  name: string;
  email: string;
  status: string;
  firmId: number;
}

interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  pendingTasks: number;
  completedTasks: number;
  overdueItems: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  
  // Temporary logo preview - remove after selection
  const showLogoPreview = false;
  
  const logoVariants = [
    { name: "Mint Corporate Green", bg: "bg-green-600", text: "text-green-50", iconBg: "bg-green-500" },
    { name: "Light Sage Professional", bg: "bg-green-700", text: "text-green-50", iconBg: "bg-green-600" },
    { name: "Emerald Business", bg: "bg-emerald-600", text: "text-emerald-50", iconBg: "bg-emerald-500" },
    { name: "Seafoam Professional", bg: "bg-teal-700", text: "text-teal-50", iconBg: "bg-teal-600" },
    { name: "Hunter Green Modern", bg: "bg-green-800", text: "text-green-100", iconBg: "bg-green-700" },
    { name: "Jade Professional", bg: "bg-emerald-700", text: "text-emerald-100", iconBg: "bg-emerald-600" },
    { name: "Pine Fresh", bg: "bg-green-900", text: "text-green-200", iconBg: "bg-green-800" },
    { name: "Teal Corporate", bg: "bg-teal-800", text: "text-teal-100", iconBg: "bg-teal-700" },
    { name: "Lime Professional", bg: "bg-lime-700", text: "text-lime-50", iconBg: "bg-lime-600" },
    { name: "Moss Green Elite", bg: "bg-green-950", text: "text-green-100", iconBg: "bg-green-800" }
  ];

  const handleLogoSelect = (index: number) => {
    setSelectedLogo(index);
    toast({
      title: "Logo Selected!",
      description: `You selected Option ${index + 1}: ${logoVariants[index].name}`,
    });
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/current-user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/current-user");
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      return response.json();
    },
    retry: false
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/clients");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
    enabled: !!user
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/metrics");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      return response.json();
    },
    enabled: !!user
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout request fails, remove token locally
      localStorage.removeItem('authToken');
      setLocation("/login");
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow w-full max-w-full">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 w-full max-w-full">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{user.role}</Badge>
              <Button onClick={handleLogout} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-full">
        
        {/* Temporary Logo Preview Section */}
        {showLogoPreview && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">🎨 Green Logo Alternatives (Avoiding TD Bank & QuickBooks)</CardTitle>
              <CardDescription className="text-blue-600">
                10 distinct green variations that avoid TD Bank and QuickBooks branding conflicts. Click "Use This" on your favorite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {logoVariants.map((variant, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedLogo === index ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                    }`}
                    data-testid={`card-logo-option-${index}`}
                  >
                    <div className="text-center mb-3">
                      <span className="text-xs font-medium text-gray-600" data-testid={`text-logo-name-${index}`}>
                        Option {index + 1}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{variant.name}</div>
                    </div>
                    
                    <div className={`${variant.bg} rounded-lg p-3 flex items-center justify-center space-x-2 mb-3`}>
                      <div className={`${variant.iconBg} w-8 h-6 rounded-md flex items-center justify-center`}>
                        <span className={`font-bold text-sm ${variant.iconText || variant.text}`}>L</span>
                      </div>
                      <span className={`font-bold text-lg ${variant.text} tracking-wide`}>Lejjors</span>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      variant={selectedLogo === index ? "default" : "outline"}
                      onClick={() => handleLogoSelect(index)}
                      data-testid={`button-select-logo-${index}`}
                      aria-label={`Select logo option ${index + 1} – ${variant.name}`}
                    >
                      {selectedLogo === index ? "Selected!" : "Use This"}
                    </Button>
                  </div>
                ))}
              </div>
              
              {selectedLogo !== null && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center text-green-800 font-medium">
                    Great choice! You selected <strong>Option {selectedLogo + 1}: {logoVariants[selectedLogo].name}</strong>
                  </div>
                  <div className="text-center text-green-600 text-sm mt-1">
                    Tell me to implement this logo and I'll update your application branding!
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-8 w-full max-w-full">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/pages")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pages</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">CRM</div>
              <p className="text-xs text-muted-foreground">
                Client management, tasks & workflows
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Go to Pages</span>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/books")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Books</CardTitle>
              <Calculator className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Accounting</div>
              <p className="text-xs text-muted-foreground">
                Transactions, accounts & financial data
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Go to Books</span>
                <ArrowRight className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/binder")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Binders</CardTitle>
              <FolderOpen className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">Audit</div>
              <p className="text-xs text-muted-foreground">
                Working papers & audit files
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Go to Binders</span>
                <ArrowRight className="h-4 w-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-orange-200" onClick={() => window.open('/api/ui', '_blank')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
              <Bot className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">Agentic</div>
              <p className="text-xs text-muted-foreground">
                Multi-agent interface & automation
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Open AI Interface</span>
                <ArrowRight className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mb-8 w-full max-w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "..." : metrics?.totalClients || clients.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active client accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metricsLoading ? "..." : (metrics?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "..." : metrics?.pendingTasks || 12}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">
                From last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-full">
          <Card>
            <CardHeader>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>
                Your most recently added clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : clients.length > 0 ? (
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client: Client) => (
                    <div key={client.id} className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {client.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {client.email}
                        </p>
                      </div>
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No clients found</p>
                  <Button
                    onClick={() => setLocation("/clients")}
                    className="mt-4"
                    variant="outline"
                  >
                    Add First Client
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setLocation("/clients")}
                className="w-full justify-start"
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Clients
              </Button>
              
              <Button
                onClick={() => setLocation("/accounts")}
                className="w-full justify-start"
                variant="outline"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Chart of Accounts
              </Button>
              
              <Button
                onClick={() => setLocation("/transactions")}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Transactions
              </Button>
              
              <Button
                onClick={() => setLocation("/reports")}
                className="w-full justify-start"
                variant="outline"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Financial Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Design Variations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <span>Navigation Design Selection</span>
            </CardTitle>
            <CardDescription>
              Choose your preferred navigation style for Pages, Books & Binders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NavigationVariations />
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-green-600" />
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-full">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Database: Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">API: Operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">AI Services: Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}