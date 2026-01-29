import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Zap, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Trash2,
  Plus
} from "lucide-react";

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  features: string[];
  authType: "oauth" | "api_key";
}

interface IntegrationConnection {
  id: number;
  clientId: number;
  provider: string;
  companyName?: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus: "connected" | "syncing" | "error" | "disconnected";
  errorMessage?: string;
  autoSyncEnabled: boolean;
  syncFrequency: "real_time" | "hourly" | "daily" | "weekly";
}

interface SyncLog {
  id: number;
  serviceName: string;
  operation: string;
  status: "success" | "partial" | "failed";
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

const STATUS_COLORS = {
  connected: "bg-green-100 text-green-800",
  syncing: "bg-blue-100 text-blue-800", 
  error: "bg-red-100 text-red-800",
  disconnected: "bg-gray-100 text-gray-800"
};

const STATUS_ICONS = {
  connected: CheckCircle,
  syncing: Clock,
  error: AlertCircle,
  disconnected: AlertCircle
};

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [selectedClientId] = useState(5); // Using test client
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [apiCredentials, setApiCredentials] = useState({ apiKey: "", apiSecret: "", businessId: "" });

  // Fetch available providers
  const { data: providers = [] } = useQuery<IntegrationProvider[]>({
    queryKey: ["/api/integrations/providers"],
  });

  // Fetch client integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery<IntegrationConnection[]>({
    queryKey: ["/api/integrations", selectedClientId],
    enabled: !!selectedClientId,
  });

  // Fetch sync history
  const { data: syncHistory = [] } = useQuery<SyncLog[]>({
    queryKey: ["/api/integrations", selectedClientId, "sync-history"],
    enabled: !!selectedClientId,
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async ({ clientId, provider }: { clientId: number; provider: string }) => {
      const res = await apiRequest("POST", `/api/integrations/${clientId}/${provider}/test`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Test Successful", description: data.message });
      } else {
        toast({ title: "Connection Test Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Test Failed", description: "Failed to test connection", variant: "destructive" });
    }
  });

  // Sync data mutation
  const syncDataMutation = useMutation({
    mutationFn: async ({ clientId, provider }: { clientId: number; provider: string }) => {
      const res = await apiRequest("POST", `/api/integrations/${clientId}/${provider}/sync`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ 
          title: "Sync Completed", 
          description: `Processed ${data.recordsProcessed} records, ${data.recordsSucceeded} successful` 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      } else {
        toast({ title: "Sync Failed", description: data.errorMessage, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Sync Failed", description: "Failed to sync data", variant: "destructive" });
    }
  });

  // Connect integration mutation
  const connectMutation = useMutation({
    mutationFn: async ({ clientId, provider, credentials }: { 
      clientId: number; 
      provider: string; 
      credentials?: any 
    }) => {
      if (provider === "sage" || provider === "wave") {
        const res = await apiRequest("POST", `/api/integrations/${clientId}/${provider}/connect`, credentials);
        return await res.json();
      } else {
        const res = await apiRequest("POST", `/api/integrations/${clientId}/${provider}/connect`);
        const data = await res.json();
        if (data.authUrl) {
          window.open(data.authUrl, "_blank");
        }
        return data;
      }
    },
    onSuccess: (data) => {
      toast({ title: "Connection Initiated", description: data.message });
      setConnectDialogOpen(false);
      setApiCredentials({ apiKey: "", apiSecret: "", businessId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: () => {
      toast({ title: "Connection Failed", description: "Failed to initiate connection", variant: "destructive" });
    }
  });

  // Disconnect integration mutation
  const disconnectMutation = useMutation({
    mutationFn: async ({ clientId, provider }: { clientId: number; provider: string }) => {
      const res = await apiRequest("DELETE", `/api/integrations/${clientId}/${provider}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Integration Disconnected", description: "Successfully disconnected integration" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: () => {
      toast({ title: "Disconnect Failed", description: "Failed to disconnect integration", variant: "destructive" });
    }
  });

  const handleConnect = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    if (provider.authType === "oauth") {
      // Initiate OAuth flow directly
      connectMutation.mutate({ clientId: selectedClientId, provider: provider.id });
    } else {
      // Show credentials dialog
      setConnectDialogOpen(true);
    }
  };

  const handleCredentialsSubmit = () => {
    if (!selectedProvider) return;
    
    connectMutation.mutate({ 
      clientId: selectedClientId, 
      provider: selectedProvider.id, 
      credentials: apiCredentials 
    });
  };

  const getProviderLogo = (providerId: string) => {
    switch (providerId) {
      case "quickbooks": return "🔷";
      case "zoho": return "🟠";
      case "xero": return "🔵";
      case "sage": return "🟢";
      case "freshbooks": return "🔷";
      case "wave": return "🌊";
      default: return "🔗";
    }
  };

  const getConnectionForProvider = (providerId: string) => {
    return integrations.find(conn => conn.provider === providerId);
  };

  if (integrationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounting Integrations</h1>
          <p className="text-gray-600 mt-2">Connect and manage your accounting software integrations</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/integrations"] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="available">Available Integrations</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const provider = providers.find(p => p.id === integration.provider);
              const StatusIcon = STATUS_ICONS[integration.syncStatus];
              
              return (
                <Card key={integration.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getProviderLogo(integration.provider)}</span>
                        <div>
                          <CardTitle className="text-lg">{provider?.name || integration.provider}</CardTitle>
                          <CardDescription>{integration.companyName}</CardDescription>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[integration.syncStatus]}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {integration.syncStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {integration.lastSyncAt && (
                      <div className="text-sm text-gray-600">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                      </div>
                    )}
                    
                    {integration.errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {integration.errorMessage}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={integration.autoSyncEnabled}
                          disabled
                        />
                        <span className="text-sm">Auto-sync</span>
                      </div>
                      <span className="text-sm text-gray-500">{integration.syncFrequency}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testConnectionMutation.mutate({ 
                          clientId: selectedClientId, 
                          provider: integration.provider 
                        })}
                        disabled={testConnectionMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => syncDataMutation.mutate({ 
                          clientId: selectedClientId, 
                          provider: integration.provider 
                        })}
                        disabled={syncDataMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => disconnectMutation.mutate({ 
                          clientId: selectedClientId, 
                          provider: integration.provider 
                        })}
                        disabled={disconnectMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {integrations.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations Connected</h3>
                <p className="text-gray-600 mb-4">Connect your accounting software to sync data automatically</p>
                <Button onClick={() => {
                  const tabElement = document.querySelector('[value="available"]') as HTMLElement;
                  tabElement?.click();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Integrations
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => {
              const existingConnection = getConnectionForProvider(provider.id);
              
              return (
                <Card key={provider.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getProviderLogo(provider.id)}</span>
                      <div>
                        <CardTitle>{provider.name}</CardTitle>
                        <CardDescription>{provider.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {provider.features.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Auth: {provider.authType === "oauth" ? "OAuth 2.0" : "API Key"}
                      </span>
                      {provider.authType === "oauth" && (
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {existingConnection ? (
                      <Button variant="outline" disabled className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Connected
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleConnect(provider)}
                        disabled={connectMutation.isPending}
                        className="w-full"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent synchronization activities across all integrations</CardDescription>
            </CardHeader>
            <CardContent>
              {syncHistory.length > 0 ? (
                <div className="space-y-4">
                  {syncHistory.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getProviderLogo(log.serviceName)}</span>
                        <div>
                          <div className="font-medium">{log.serviceName} - {log.operation}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(log.startedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={log.status === "success" ? "bg-green-100 text-green-800" : 
                                         log.status === "partial" ? "bg-yellow-100 text-yellow-800" :
                                         "bg-red-100 text-red-800"}>
                          {log.status}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">
                          {log.recordsSucceeded}/{log.recordsProcessed} records
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sync History</h3>
                  <p className="text-gray-600">Sync activities will appear here once you start syncing data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Credentials Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect to {selectedProvider?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={apiCredentials.apiKey}
                onChange={(e) => setApiCredentials({ ...apiCredentials, apiKey: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>
            {selectedProvider?.id === "sage" && (
              <div>
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiCredentials.apiSecret}
                  onChange={(e) => setApiCredentials({ ...apiCredentials, apiSecret: e.target.value })}
                  placeholder="Enter your API secret"
                />
              </div>
            )}
            <div>
              <Label htmlFor="businessId">Business ID</Label>
              <Input
                id="businessId"
                value={apiCredentials.businessId}
                onChange={(e) => setApiCredentials({ ...apiCredentials, businessId: e.target.value })}
                placeholder="Enter your business ID"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCredentialsSubmit}
                disabled={!apiCredentials.apiKey || !apiCredentials.businessId || connectMutation.isPending}
              >
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}