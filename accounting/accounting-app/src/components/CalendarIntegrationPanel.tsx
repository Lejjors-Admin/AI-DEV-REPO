/**
 * Calendar Integration Panel
 * 
 * Comprehensive UI for managing Google Calendar and Outlook integrations
 * with OAuth authentication, sync status, and settings management
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { apiConfig } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  RefreshCw, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Clock,
  Users,
  Shield,
  Trash2,
  Plus
} from 'lucide-react';
import { SiGoogle } from 'react-icons/si';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CalendarIntegration {
  id: number;
  provider: 'google' | 'outlook';
  accountEmail: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | 'partial';
  lastSyncError: string | null;
  syncDirection: 'read_only' | 'write_only' | 'bidirectional';
  autoSyncEnabled: boolean;
  syncFrequencyMinutes: number;
  defaultEventVisibility: 'firm' | 'client' | 'private';
  includePrivateEvents: boolean;
  eventTitlePrefix: string | null;
  syncStats: {
    eventsImported: number;
    eventsExported: number;
    eventsUpdated: number;
    eventsDeleted: number;
    lastSyncDuration: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarProvider {
  id: 'google' | 'outlook';
  name: string;
  configured: boolean;
  description: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CalendarIntegrationPanel() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ===== DATA FETCHING =====

  const { data: integrations = [], isLoading: integrationsLoading, refetch: refetchIntegrations } = useQuery({
    queryKey: ['/api/schedule/integrations'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/schedule/integrations'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch calendar integrations');
      const data = await response.json();
      return data?.data || data || [];
    },
    staleTime: 30000,
  });

  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['/api/schedule/providers'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/schedule/providers'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch calendar providers');
      return response.json();
    },
    staleTime: 300000, // 5 minutes
  });

  const providers: CalendarProvider[] = providersData?.data || [];

  // OAuth Configuration (Admin only)
  const { data: firmSettingsData, isLoading: firmSettingsLoading, refetch: refetchFirmSettings } = useQuery({
    queryKey: ['/api/firm/calendar-settings'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/firm/calendar-settings'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch calendar settings');
      return response.json();
    },
    staleTime: 30000,
  });

  const firmSettings = firmSettingsData?.data || null;

  // ===== MUTATIONS =====

  const connectMutation = useMutation({
    mutationFn: async (provider: 'google' | 'outlook') => {
      const response = await apiRequest(`/api/schedule/oauth/${provider}/auth`);
      if (response.success && response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    },
    onError: (error) => {
      toast({
        title: 'Connection Failed',
        description: `Failed to start OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      return apiRequest(`/api/schedule/integrations/${integrationId}/sync`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Sync Completed',
          description: `Calendar sync completed successfully. ${data.data?.eventsImported || 0} events imported, ${data.data?.eventsExported || 0} events exported.`,
        });
      } else {
        toast({
          title: 'Sync Issues',
          description: data.message || 'Sync completed with some issues.',
          variant: 'destructive',
        });
      }
      refetchIntegrations();
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: `Manual sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return apiRequest(`/api/schedule/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings Updated',
        description: 'Integration settings have been updated successfully.',
      });
      refetchIntegrations();
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      return apiRequest(`/api/schedule/integrations/${integrationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Integration Removed',
        description: 'Calendar integration has been disconnected successfully.',
      });
      refetchIntegrations();
    },
    onError: (error) => {
      toast({
        title: 'Removal Failed',
        description: `Failed to remove integration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const updateFirmSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest('/api/firm/calendar-settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings Updated',
        description: 'OAuth configuration has been saved successfully.',
      });
      refetchFirmSettings();
      refetchProviders();
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: `Failed to update OAuth settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const testGoogleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/firm/calendar-settings/test-google', { method: 'POST' });
    },
    onSuccess: (data) => {
      toast({
        title: 'Test Successful',
        description: data.message || 'Google OAuth configuration is valid.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: `${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const testOutlookMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/firm/calendar-settings/test-outlook', { method: 'POST' });
    },
    onSuccess: (data) => {
      toast({
        title: 'Test Successful',
        description: data.message || 'Outlook OAuth configuration is valid.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: `${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const refetchProviders = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/schedule/providers'] });
  };

  // ===== EVENT HANDLERS =====

  const handleConnect = (provider: 'google' | 'outlook') => {
    connectMutation.mutate(provider);
  };

  const handleSync = (integrationId: number) => {
    syncMutation.mutate(integrationId);
  };

  const handleUpdateIntegration = (id: number, updates: any) => {
    updateIntegrationMutation.mutate({ id, updates });
  };

  const handleDeleteIntegration = (integrationId: number) => {
    if (confirm('Are you sure you want to disconnect this calendar integration? This will stop syncing events.')) {
      deleteIntegrationMutation.mutate(integrationId);
    }
  };

  // ===== URL PARAMETER HANDLING =====

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const provider = urlParams.get('provider');

    if (success === 'integration_connected' && provider) {
      toast({
        title: 'Integration Connected',
        description: `Successfully connected to ${provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'}!`,
      });
      refetchIntegrations();
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Authorization was cancelled or denied.',
        oauth_failed: 'OAuth authentication failed. Please try again.',
        invalid_callback: 'Invalid callback parameters.',
        invalid_state: 'Invalid OAuth state. Please try again.',
        state_expired: 'OAuth session expired. Please try again.',
      };
      
      toast({
        title: 'Connection Failed',
        description: errorMessages[error] || 'An unknown error occurred.',
        variant: 'destructive',
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast, refetchIntegrations]);

  // ===== LOADING STATE =====

  if (integrationsLoading || providersLoading || firmSettingsLoading) {
    return (
      <Card data-testid="calendar-integration-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading integrations...
          </div>
        </CardContent>
      </Card>
    );
  }

  // ===== RENDER =====

  return (
    <div className="space-y-6" data-testid="calendar-integration-panel">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Calendar className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="oauth-config" data-testid="tab-oauth-config">
            <Shield className="mr-2 h-4 w-4" />
            OAuth Setup
          </TabsTrigger>
          <TabsTrigger value="connect" data-testid="tab-connect">
            <Plus className="mr-2 h-4 w-4" />
            Connect
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <IntegrationOverview 
            integrations={integrations}
            onSync={handleSync}
            onDelete={handleDeleteIntegration}
            syncMutation={syncMutation}
          />
        </TabsContent>

        {/* OAuth Configuration Tab (Admin only) */}
        <TabsContent value="oauth-config" className="space-y-4">
          <OAuthConfiguration 
            firmSettings={firmSettings}
            onUpdate={updateFirmSettingsMutation.mutate}
            onTestGoogle={testGoogleMutation.mutate}
            onTestOutlook={testOutlookMutation.mutate}
            isUpdating={updateFirmSettingsMutation.isPending}
            isTestingGoogle={testGoogleMutation.isPending}
            isTestingOutlook={testOutlookMutation.isPending}
          />
        </TabsContent>

        {/* Connect Tab */}
        <TabsContent value="connect" className="space-y-4">
          <ConnectProviders 
            providers={providers}
            integrations={integrations}
            onConnect={handleConnect}
            connectMutation={connectMutation}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <IntegrationSettings 
            integrations={integrations}
            onUpdate={handleUpdateIntegration}
            updateMutation={updateIntegrationMutation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// OVERVIEW COMPONENT
// ============================================================================

function IntegrationOverview({ 
  integrations, 
  onSync, 
  onDelete, 
  syncMutation 
}: { 
  integrations: CalendarIntegration[];
  onSync: (id: number) => void;
  onDelete: (id: number) => void;
  syncMutation: any;
}) {
  if (integrations.length === 0) {
    return (
      <Card data-testid="no-integrations">
        <CardContent className="p-6 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Calendar Integrations</h3>
          <p className="text-muted-foreground mb-4">
            Connect your Google Calendar or Outlook to sync events automatically.
          </p>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          onSync={onSync}
          onDelete={onDelete}
          isSyncing={syncMutation.isPending}
        />
      ))}
    </div>
  );
}

// ============================================================================
// INTEGRATION CARD COMPONENT
// ============================================================================

function IntegrationCard({ 
  integration, 
  onSync, 
  onDelete, 
  isSyncing 
}: { 
  integration: CalendarIntegration;
  onSync: (id: number) => void;
  onDelete: (id: number) => void;
  isSyncing: boolean;
}) {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <SiGoogle className="h-5 w-5 text-blue-600" />;
      case 'outlook':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Error</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Issues</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card data-testid={`integration-card-${integration.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getProviderIcon(integration.provider)}
            <div>
              <CardTitle className="text-lg">
                {integration.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'}
              </CardTitle>
              <CardDescription>{integration.accountEmail}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(integration.lastSyncStatus)}
            {!integration.isActive && (
              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sync Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Last Sync</div>
            <div className="font-medium">{formatLastSync(integration.lastSyncAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Direction</div>
            <div className="font-medium capitalize">{integration.syncDirection.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Auto Sync</div>
            <div className="font-medium">{integration.autoSyncEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Frequency</div>
            <div className="font-medium">{integration.syncFrequencyMinutes}m</div>
          </div>
        </div>

        {/* Sync Stats */}
        {integration.syncStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Imported</div>
              <div className="font-medium">{integration.syncStats.eventsImported}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Exported</div>
              <div className="font-medium">{integration.syncStats.eventsExported}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Updated</div>
              <div className="font-medium">{integration.syncStats.eventsUpdated}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">{Math.round(integration.syncStats.lastSyncDuration / 1000)}s</div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {integration.lastSyncError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{integration.lastSyncError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onSync(integration.id)}
              disabled={isSyncing || !integration.isActive}
              data-testid={`sync-button-${integration.id}`}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(integration.id)}
            className="text-destructive hover:text-destructive"
            data-testid={`delete-button-${integration.id}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONNECT PROVIDERS COMPONENT
// ============================================================================

function ConnectProviders({ 
  providers, 
  integrations, 
  onConnect, 
  connectMutation 
}: { 
  providers: CalendarProvider[];
  integrations: CalendarIntegration[];
  onConnect: (provider: 'google' | 'outlook') => void;
  connectMutation: any;
}) {
  const isConnected = (providerId: string) => {
    return integrations.some(int => int.provider === providerId && int.isActive);
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return <SiGoogle className="h-8 w-8 text-blue-600" />;
      case 'outlook':
        return <Calendar className="h-8 w-8 text-blue-600" />;
      default:
        return <Calendar className="h-8 w-8" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Available Providers</h3>
        <p className="text-muted-foreground">
          Connect your external calendar services to enable automatic event synchronization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id} data-testid={`provider-card-${provider.id}`}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                {getProviderIcon(provider.id)}
                <div>
                  <CardTitle>{provider.name}</CardTitle>
                  <CardDescription>{provider.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {!provider.configured ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This provider is not configured. Contact your administrator to set up OAuth credentials.
                  </AlertDescription>
                </Alert>
              ) : isConnected(provider.id) ? (
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Button variant="outline" size="sm" disabled>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Already Connected
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => onConnect(provider.id as 'google' | 'outlook')}
                  disabled={connectMutation.isPending}
                  className="w-full"
                  data-testid={`connect-button-${provider.id}`}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect to {provider.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {providers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No calendar providers are configured. Contact your administrator to set up OAuth integrations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// INTEGRATION SETTINGS COMPONENT
// ============================================================================

function IntegrationSettings({ 
  integrations, 
  onUpdate, 
  updateMutation 
}: { 
  integrations: CalendarIntegration[];
  onUpdate: (id: number, updates: any) => void;
  updateMutation: any;
}) {
  if (integrations.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No integrations found. Connect a calendar provider first to configure settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {integrations.map((integration) => (
        <IntegrationSettingsCard
          key={integration.id}
          integration={integration}
          onUpdate={onUpdate}
          isUpdating={updateMutation.isPending}
        />
      ))}
    </div>
  );
}

// ============================================================================
// INTEGRATION SETTINGS CARD COMPONENT
// ============================================================================

function IntegrationSettingsCard({ 
  integration, 
  onUpdate, 
  isUpdating 
}: { 
  integration: CalendarIntegration;
  onUpdate: (id: number, updates: any) => void;
  isUpdating: boolean;
}) {
  const [settings, setSettings] = useState({
    isActive: integration.isActive,
    syncDirection: integration.syncDirection,
    autoSyncEnabled: integration.autoSyncEnabled,
    syncFrequencyMinutes: integration.syncFrequencyMinutes,
    defaultEventVisibility: integration.defaultEventVisibility,
    includePrivateEvents: integration.includePrivateEvents,
    eventTitlePrefix: integration.eventTitlePrefix || '',
  });

  const hasChanges = JSON.stringify(settings) !== JSON.stringify({
    isActive: integration.isActive,
    syncDirection: integration.syncDirection,
    autoSyncEnabled: integration.autoSyncEnabled,
    syncFrequencyMinutes: integration.syncFrequencyMinutes,
    defaultEventVisibility: integration.defaultEventVisibility,
    includePrivateEvents: integration.includePrivateEvents,
    eventTitlePrefix: integration.eventTitlePrefix || '',
  });

  const handleSave = () => {
    const updates: any = {};
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== (integration as any)[key]) {
        updates[key] = value === '' ? null : value;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      onUpdate(integration.id, updates);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <SiGoogle className="h-5 w-5 text-blue-600" />;
      case 'outlook':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  return (
    <Card data-testid={`settings-card-${integration.id}`}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          {getProviderIcon(integration.provider)}
          <div>
            <CardTitle>
              {integration.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} Settings
            </CardTitle>
            <CardDescription>{integration.accountEmail}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`active-${integration.id}`}>Integration Active</Label>
              <div className="text-sm text-muted-foreground">Enable or disable this calendar integration</div>
            </div>
            <Switch
              id={`active-${integration.id}`}
              checked={settings.isActive}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isActive: checked }))}
              data-testid={`switch-active-${integration.id}`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`auto-sync-${integration.id}`}>Automatic Sync</Label>
              <div className="text-sm text-muted-foreground">Automatically sync events at regular intervals</div>
            </div>
            <Switch
              id={`auto-sync-${integration.id}`}
              checked={settings.autoSyncEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSyncEnabled: checked }))}
              data-testid={`switch-auto-sync-${integration.id}`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`private-events-${integration.id}`}>Include Private Events</Label>
              <div className="text-sm text-muted-foreground">Import private events from external calendar</div>
            </div>
            <Switch
              id={`private-events-${integration.id}`}
              checked={settings.includePrivateEvents}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includePrivateEvents: checked }))}
              data-testid={`switch-private-events-${integration.id}`}
            />
          </div>
        </div>

        <Separator />

        {/* Sync Settings */}
        <div className="space-y-4">
          <div>
            <Label htmlFor={`sync-direction-${integration.id}`}>Sync Direction</Label>
            <Select 
              value={settings.syncDirection} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, syncDirection: value as any }))}
            >
              <SelectTrigger data-testid={`select-sync-direction-${integration.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Import Only (Read-only)</SelectItem>
                <SelectItem value="write_only">Export Only (Write-only)</SelectItem>
                <SelectItem value="bidirectional">Two-way Sync (Bidirectional)</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-1">
              Choose how events should be synchronized between calendars
            </div>
          </div>

          <div>
            <Label htmlFor={`sync-frequency-${integration.id}`}>Sync Frequency (minutes)</Label>
            <Select 
              value={settings.syncFrequencyMinutes.toString()} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, syncFrequencyMinutes: parseInt(value) }))}
            >
              <SelectTrigger data-testid={`select-sync-frequency-${integration.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="240">Every 4 hours</SelectItem>
                <SelectItem value="1440">Daily</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-1">
              How often to automatically sync when auto-sync is enabled
            </div>
          </div>

          <div>
            <Label htmlFor={`event-visibility-${integration.id}`}>Default Event Visibility</Label>
            <Select 
              value={settings.defaultEventVisibility} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, defaultEventVisibility: value as any }))}
            >
              <SelectTrigger data-testid={`select-event-visibility-${integration.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firm">Firm (Visible to all firm staff)</SelectItem>
                <SelectItem value="client">Client (Visible to assigned clients)</SelectItem>
                <SelectItem value="private">Private (Visible only to you)</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-1">
              Default visibility for imported events
            </div>
          </div>

          <div>
            <Label htmlFor={`title-prefix-${integration.id}`}>Event Title Prefix</Label>
            <Input
              id={`title-prefix-${integration.id}`}
              value={settings.eventTitlePrefix}
              onChange={(e) => setSettings(prev => ({ ...prev, eventTitlePrefix: e.target.value }))}
              placeholder="e.g., [Work] or [External]"
              data-testid={`input-title-prefix-${integration.id}`}
            />
            <div className="text-sm text-muted-foreground mt-1">
              Optional prefix to add to imported event titles
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            data-testid={`save-settings-${integration.id}`}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// OAUTH CONFIGURATION COMPONENT (ADMIN ONLY)
// ============================================================================

function OAuthConfiguration({
  firmSettings,
  onUpdate,
  onTestGoogle,
  onTestOutlook,
  isUpdating,
  isTestingGoogle,
  isTestingOutlook
}: {
  firmSettings: any;
  onUpdate: (updates: any) => void;
  onTestGoogle: () => void;
  onTestOutlook: () => void;
  isUpdating: boolean;
  isTestingGoogle: boolean;
  isTestingOutlook: boolean;
}) {
  const [googleSettings, setGoogleSettings] = useState({
    clientId: firmSettings?.googleClientId || '',
    clientSecret: '',
    enabled: firmSettings?.googleEnabled || false,
  });

  const [outlookSettings, setOutlookSettings] = useState({
    clientId: firmSettings?.outlookClientId || '',
    clientSecret: '',
    enabled: firmSettings?.outlookEnabled || false,
  });

  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showOutlookSecret, setShowOutlookSecret] = useState(false);

  const hasGoogleChanges = 
    googleSettings.clientId !== (firmSettings?.googleClientId || '') ||
    googleSettings.clientSecret !== '' ||
    googleSettings.enabled !== (firmSettings?.googleEnabled || false);

  const hasOutlookChanges = 
    outlookSettings.clientId !== (firmSettings?.outlookClientId || '') ||
    outlookSettings.clientSecret !== '' ||
    outlookSettings.enabled !== (firmSettings?.outlookEnabled || false);

  const handleSaveGoogle = () => {
    const updates: any = {
      googleClientId: googleSettings.clientId,
      googleEnabled: googleSettings.enabled,
    };
    if (googleSettings.clientSecret) {
      updates.googleClientSecret = googleSettings.clientSecret;
    }
    onUpdate(updates);
    setGoogleSettings(prev => ({ ...prev, clientSecret: '' }));
  };

  const handleSaveOutlook = () => {
    const updates: any = {
      outlookClientId: outlookSettings.clientId,
      outlookEnabled: outlookSettings.enabled,
    };
    if (outlookSettings.clientSecret) {
      updates.outlookClientSecret = outlookSettings.clientSecret;
    }
    onUpdate(updates);
    setOutlookSettings(prev => ({ ...prev, clientSecret: '' }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">OAuth Configuration</h3>
        <p className="text-muted-foreground">
          Configure OAuth credentials for Google Calendar and Outlook integration. These settings apply to your entire firm.
        </p>
      </div>

      {/* Google Calendar OAuth */}
      <Card data-testid="oauth-google-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SiGoogle className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Google Calendar OAuth</CardTitle>
                <CardDescription>Configure Google Cloud OAuth 2.0 credentials</CardDescription>
              </div>
            </div>
            <Badge variant={googleSettings.enabled ? "default" : "outline"}>
              {googleSettings.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Instructions:</strong><br />
              1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a><br />
              2. Create OAuth 2.0 Client ID (Web application)<br />
              3. Add this redirect URI: <code className="bg-muted px-2 py-1 rounded text-sm">{firmSettings?.redirectUris?.google || 'Loading...'}</code><br />
              4. Copy Client ID and Client Secret below
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="google-client-id">Client ID</Label>
              <Input
                id="google-client-id"
                value={googleSettings.clientId}
                onChange={(e) => setGoogleSettings(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Enter Google OAuth Client ID"
                data-testid="input-google-client-id"
              />
            </div>

            <div>
              <Label htmlFor="google-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="google-client-secret"
                  type={showGoogleSecret ? "text" : "password"}
                  value={googleSettings.clientSecret}
                  onChange={(e) => setGoogleSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder={firmSettings?.googleClientId ? "Enter to update (optional)" : "Enter Google OAuth Client Secret"}
                  data-testid="input-google-client-secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                >
                  {showGoogleSecret ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {firmSettings?.googleClientId ? "Leave blank to keep existing secret" : "Required for first-time setup"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="google-enabled">Enable Google Calendar</Label>
                <div className="text-sm text-muted-foreground">Allow users to connect their Google calendars</div>
              </div>
              <Switch
                id="google-enabled"
                checked={googleSettings.enabled}
                onCheckedChange={(checked) => setGoogleSettings(prev => ({ ...prev, enabled: checked }))}
                data-testid="switch-google-enabled"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={onTestGoogle}
              disabled={isTestingGoogle || !firmSettings?.googleClientId}
              data-testid="test-google-button"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isTestingGoogle ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
            
            <Button
              onClick={handleSaveGoogle}
              disabled={!hasGoogleChanges || isUpdating}
              data-testid="save-google-button"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Google Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outlook Calendar OAuth */}
      <Card data-testid="oauth-outlook-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Outlook Calendar OAuth</CardTitle>
                <CardDescription>Configure Microsoft Azure OAuth 2.0 credentials</CardDescription>
              </div>
            </div>
            <Badge variant={outlookSettings.enabled ? "default" : "outline"}>
              {outlookSettings.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Instructions:</strong><br />
              1. Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Azure Portal</a><br />
              2. Register a new application (Web platform)<br />
              3. Add this redirect URI: <code className="bg-muted px-2 py-1 rounded text-sm">{firmSettings?.redirectUris?.outlook || 'Loading...'}</code><br />
              4. Copy Application (client) ID and create a Client Secret
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="outlook-client-id">Application (Client) ID</Label>
              <Input
                id="outlook-client-id"
                value={outlookSettings.clientId}
                onChange={(e) => setOutlookSettings(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Enter Microsoft Application ID"
                data-testid="input-outlook-client-id"
              />
            </div>

            <div>
              <Label htmlFor="outlook-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="outlook-client-secret"
                  type={showOutlookSecret ? "text" : "password"}
                  value={outlookSettings.clientSecret}
                  onChange={(e) => setOutlookSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder={firmSettings?.outlookClientId ? "Enter to update (optional)" : "Enter Microsoft Client Secret"}
                  data-testid="input-outlook-client-secret"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowOutlookSecret(!showOutlookSecret)}
                >
                  {showOutlookSecret ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {firmSettings?.outlookClientId ? "Leave blank to keep existing secret" : "Required for first-time setup"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="outlook-enabled">Enable Outlook Calendar</Label>
                <div className="text-sm text-muted-foreground">Allow users to connect their Outlook calendars</div>
              </div>
              <Switch
                id="outlook-enabled"
                checked={outlookSettings.enabled}
                onCheckedChange={(checked) => setOutlookSettings(prev => ({ ...prev, enabled: checked }))}
                data-testid="switch-outlook-enabled"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={onTestOutlook}
              disabled={isTestingOutlook || !firmSettings?.outlookClientId}
              data-testid="test-outlook-button"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isTestingOutlook ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
            
            <Button
              onClick={handleSaveOutlook}
              disabled={!hasOutlookChanges || isUpdating}
              data-testid="save-outlook-button"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Outlook Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}