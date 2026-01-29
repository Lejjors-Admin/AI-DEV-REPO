import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { apiConfig } from '@/lib/api-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, MessageSquare, Phone, CheckCircle, XCircle, AlertCircle, 
  RefreshCw, Send, Link as LinkIcon, Loader2, ExternalLink, Calendar
} from 'lucide-react';
import CalendarIntegrationPanel from '@/components/CalendarIntegrationPanel';

/**
 * Integration Settings Page (Phase 2.6 - Modernized UI)
 * Admin interface for managing Email, SMS, and WhatsApp integrations
 * Features: Accordion sections, inline status, auto-save, two-column layouts
 * Accessible to ADMIN and MANAGER roles only
 */

interface IntegrationSettings {
  id?: number;
  service: string;
  enabled: boolean;
  connectionStatus: string;
  credentials: any;
  configuration: any;
  usage: {
    messagesSent: number;
    messagesReceived: number;
  };
  lastActivityAt?: string;
  lastConnectionTest?: string;
  connectionError?: string;
  updatedAt?: string;
}

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export default function IntegrationSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('email');

  // Fetch Email Provider settings
  const { data: emailSettings, isLoading: emailLoading, refetch: refetchEmail } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations/email'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/settings/integrations/email'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch email settings');
      return response.json();
    },
    enabled: activeTab === 'email'
  });

  // Fetch Outlook settings
  const { data: outlookSettings, isLoading: outlookLoading, refetch: refetchOutlook } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations/outlook'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/settings/integrations/outlook'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch Outlook settings');
      return response.json();
    },
    enabled: activeTab === 'email'
  });

  // Fetch Twilio settings
  const { data: twilioSettings, isLoading: twilioLoading, refetch: refetchTwilio } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations/twilio'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/settings/integrations/twilio'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch Twilio settings');
      return response.json();
    },
    enabled: activeTab === 'sms'
  });

  // Fetch WhatsApp settings
  const { data: whatsappSettings, isLoading: whatsappLoading, refetch: refetchWhatsApp } = useQuery<IntegrationSettings>({
    queryKey: ['/api/settings/integrations/whatsapp'],
    queryFn: async () => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/settings/integrations/whatsapp'), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch WhatsApp settings');
      return response.json();
    },
    enabled: activeTab === 'whatsapp'
  });

  // Update settings mutation (for auto-save)
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ service, data }: { service: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/settings/integrations/${service}`, data);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to save settings' }));
        throw new Error(error.message || 'Failed to save settings');
      }
      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/settings/integrations/${variables.service}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Auto-save failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest('POST', `/api/settings/integrations/test-connection/${service}`);
      if (!response.ok) throw new Error('Connection test failed');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Connection successful' : 'Connection failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
      if (activeTab === 'email') {
        refetchEmail();
        refetchOutlook();
      }
      if (activeTab === 'sms') refetchTwilio();
      if (activeTab === 'whatsapp') refetchWhatsApp();
    }
  });

  // Sync Outlook mutation
  const syncOutlookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/settings/integrations/sync-outlook');
    },
    onSuccess: () => {
      toast({
        title: 'Sync triggered',
        description: 'Outlook email sync has been initiated'
      });
      refetchOutlook();
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="integration-settings-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integration Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage communication, calendar, and external service integrations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" data-testid="tab-sms">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Email Tab - Sending + Receiving */}
        <TabsContent value="email" className="mt-6">
          <Accordion type="multiple" defaultValue={['sending', 'receiving']} className="space-y-4">
            <AccordionItem value="sending" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Email Sending</div>
                    <div className="text-sm text-muted-foreground">Configure outbound email provider</div>
                  </div>
                  <StatusBadge status={emailSettings?.connectionStatus} className="ml-4" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <EmailProviderPanel
                  settings={emailSettings}
                  isLoading={emailLoading}
                  onUpdate={(data) => updateSettingsMutation.mutate({ service: 'email', data })}
                  onTestConnection={() => testConnectionMutation.mutate('email')}
                  isTesting={testConnectionMutation.isPending}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="receiving" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Email Receiving (Outlook)</div>
                    <div className="text-sm text-muted-foreground">Sync inbox to Communication Hub</div>
                  </div>
                  <StatusBadge status={outlookSettings?.connectionStatus} className="ml-4" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <OutlookSettingsPanel
                  settings={outlookSettings}
                  isLoading={outlookLoading}
                  onUpdate={(data) => updateSettingsMutation.mutate({ service: 'outlook', data })}
                  onTestConnection={() => testConnectionMutation.mutate('outlook')}
                  onSync={() => syncOutlookMutation.mutate()}
                  isTesting={testConnectionMutation.isPending}
                  isSyncing={syncOutlookMutation.isPending}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="mt-6">
          <Accordion type="single" collapsible defaultValue="sms-config" className="space-y-4">
            <AccordionItem value="sms-config" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">SMS / Twilio Configuration</div>
                    <div className="text-sm text-muted-foreground">Send and receive SMS messages</div>
                  </div>
                  <StatusBadge status={twilioSettings?.connectionStatus} className="ml-4" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TwilioSettingsPanel
                  settings={twilioSettings}
                  isLoading={twilioLoading}
                  onUpdate={(data) => updateSettingsMutation.mutate({ service: 'twilio', data })}
                  onTestConnection={() => testConnectionMutation.mutate('twilio')}
                  isTesting={testConnectionMutation.isPending}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-6">
          <Accordion type="single" collapsible defaultValue="whatsapp-config" className="space-y-4">
            <AccordionItem value="whatsapp-config" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">WhatsApp Configuration</div>
                    <div className="text-sm text-muted-foreground">Send and receive WhatsApp messages</div>
                  </div>
                  <StatusBadge status={whatsappSettings?.connectionStatus} className="ml-4" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <WhatsAppSettingsPanel
                  settings={whatsappSettings}
                  isLoading={whatsappLoading}
                  onUpdate={(data) => updateSettingsMutation.mutate({ service: 'whatsapp', data })}
                  onTestConnection={() => testConnectionMutation.mutate('whatsapp')}
                  isTesting={testConnectionMutation.isPending}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-6">
          <CalendarIntegrationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline Status Badge Component
function StatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  const isConnected = status === 'connected';
  const isPending = status === 'pending';
  
  return (
    <Badge 
      variant={isConnected ? 'default' : 'secondary'} 
      className={`${className} ${isConnected ? 'bg-green-500' : isPending ? 'bg-yellow-500' : 'bg-gray-400'}`}
      data-testid={`status-badge-${status || 'unknown'}`}
    >
      {isConnected && <CheckCircle className="w-3 h-3 mr-1" />}
      {!isConnected && <XCircle className="w-3 h-3 mr-1" />}
      {isConnected ? 'Connected' : isPending ? 'Pending' : 'Disconnected'}
    </Badge>
  );
}

// Email Provider Panel Component
function EmailProviderPanel({
  settings,
  isLoading,
  onUpdate,
  onTestConnection,
  isTesting
}: {
  settings?: IntegrationSettings;
  isLoading: boolean;
  onUpdate: (data: any) => void;
  onTestConnection: () => void;
  isTesting: boolean;
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [provider, setProvider] = useState(settings?.configuration?.provider ?? 'sendgrid');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState(settings?.configuration?.fromEmail ?? '');
  const [fromName, setFromName] = useState(settings?.configuration?.fromName ?? '');
  
  // SMTP fields
  const [smtpHost, setSmtpHost] = useState(settings?.configuration?.smtpHost ?? '');
  const [smtpPort, setSmtpPort] = useState(settings?.configuration?.smtpPort ?? 587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(settings?.configuration?.smtpSecure ?? true);

  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Track initial mount to prevent auto-save on load
  const isInitialMount = useRef(true);

  // Sync state with loaded settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled ?? false);
      setProvider(settings.configuration?.provider ?? 'sendgrid');
      setFromEmail(settings.configuration?.fromEmail ?? '');
      setFromName(settings.configuration?.fromName ?? '');
      setSmtpHost(settings.configuration?.smtpHost ?? '');
      setSmtpPort(settings.configuration?.smtpPort ?? 587);
      setSmtpSecure(settings.configuration?.smtpSecure ?? true);
    }
  }, [settings?.id]); // Only run when settings ID changes (loaded/updated)

  // Auto-save: debounce settings by 2 seconds
  const debouncedEnabled = useDebounce(enabled, 2000);
  const debouncedFromEmail = useDebounce(fromEmail, 2000);
  const debouncedFromName = useDebounce(fromName, 2000);
  const debouncedProvider = useDebounce(provider, 2000);
  const debouncedSmtpHost = useDebounce(smtpHost, 2000);
  const debouncedSmtpPort = useDebounce(smtpPort, 2000);
  const debouncedSmtpSecure = useDebounce(smtpSecure, 2000);

  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (settings) {
      const needsUpdate = 
        debouncedEnabled !== settings.enabled ||
        debouncedFromEmail !== settings.configuration?.fromEmail ||
        debouncedFromName !== settings.configuration?.fromName ||
        debouncedProvider !== settings.configuration?.provider ||
        debouncedSmtpHost !== settings.configuration?.smtpHost ||
        debouncedSmtpPort !== settings.configuration?.smtpPort ||
        debouncedSmtpSecure !== settings.configuration?.smtpSecure;
      
      if (needsUpdate) {
        // Prepare credentials based on provider
        let credentials: any = {};
        if (debouncedProvider === 'smtp') {
          if (smtpUsername && smtpPassword) {
            credentials = {
              username: smtpUsername,
              password: smtpPassword
            };
          }
        } else if (apiKey) {
          credentials = { apiKey };
        }
        
        onUpdate({
          enabled: debouncedEnabled,
          configuration: {
            provider: debouncedProvider,
            fromEmail: debouncedFromEmail,
            fromName: debouncedFromName,
            smtpHost: debouncedSmtpHost,
            smtpPort: debouncedSmtpPort,
            smtpSecure: debouncedSmtpSecure
          },
          credentials: Object.keys(credentials).length > 0 ? credentials : undefined
        });
      }
    }
  }, [debouncedEnabled, debouncedFromEmail, debouncedFromName, debouncedProvider, debouncedSmtpHost, debouncedSmtpPort, debouncedSmtpSecure, smtpUsername, smtpPassword, apiKey]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout for main settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Provider & Credentials */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Provider Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-enabled">Enable Email Sending</Label>
                <Switch
                  id="email-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  data-testid="switch-email-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Email Provider</Label>
                <Select value={provider} onValueChange={(newProvider) => {
                  setProvider(newProvider);
                  // Clear credentials when switching providers
                  setApiKey('');
                  setSmtpUsername('');
                  setSmtpPassword('');
                  // Save provider change immediately to avoid confusion
                  if (settings) {
                    onUpdate({
                      enabled,
                      configuration: {
                        provider: newProvider,
                        fromEmail,
                        fromName,
                        smtpHost,
                        smtpPort,
                        smtpSecure
                      }
                    });
                  }
                }}>
                  <SelectTrigger id="provider" data-testid="select-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="microsoft365">Microsoft 365</SelectItem>
                    <SelectItem value="smtp">SMTP Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {provider !== 'smtp' && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={settings?.credentials?.apiKey ? '••••••••' : 'Enter API Key'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    data-testid="input-api-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    {provider === 'sendgrid' && 'Get your API key from SendGrid dashboard'}
                    {provider === 'gmail' && 'Use Gmail App Password'}
                    {provider === 'microsoft365' && 'Use Microsoft Graph API key'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {provider === 'smtp' && (
            <div>
              <h3 className="font-semibold mb-3">SMTP Configuration</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.example.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    data-testid="input-smtp-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                    data-testid="input-smtp-port"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    data-testid="input-smtp-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    data-testid="input-smtp-password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                  <Switch
                    id="smtp-secure"
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                    data-testid="switch-smtp-secure"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: From Email & Configuration */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Sender Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from-email">From Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  placeholder="noreply@yourfirm.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  data-testid="input-from-email"
                />
                <p className="text-xs text-muted-foreground">
                  All outbound emails will be sent from this address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  placeholder="Your Firm Name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  data-testid="input-from-name"
                />
              </div>
            </div>
          </div>

          {settings?.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {/* Show context-appropriate error message based on current provider */}
                {provider === 'smtp' && settings.connectionError.includes('SendGrid')
                  ? 'SMTP credentials not configured. Please enter SMTP username and password.'
                  : provider === 'smtp' && settings.connectionError.includes('SMTP')
                  ? settings.connectionError
                  : provider !== 'sendgrid' && settings.connectionError.includes('SendGrid')
                  ? `Configuration error: ${provider} provider requires different credentials.`
                  : settings.connectionError}
              </AlertDescription>
            </Alert>
          )}
          
          {provider === 'smtp' && !smtpUsername && !smtpPassword && enabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please enter SMTP username and password to configure the SMTP server connection.
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4">
            <Button
              onClick={onTestConnection}
              disabled={isTesting || !enabled}
              variant="outline"
              className="w-full"
              data-testid="button-test-email"
            >
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      {settings?.usage && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Usage Statistics</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Sent:</span>{' '}
              <span className="font-medium">{settings.usage.messagesSent || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Activity:</span>{' '}
              <span className="font-medium">
                {settings.lastActivityAt ? new Date(settings.lastActivityAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Outlook Settings Panel Component
function OutlookSettingsPanel({
  settings,
  isLoading,
  onUpdate,
  onTestConnection,
  onSync,
  isTesting,
  isSyncing
}: {
  settings?: IntegrationSettings;
  isLoading: boolean;
  onUpdate: (data: any) => void;
  onTestConnection: () => void;
  onSync: () => void;
  isTesting: boolean;
  isSyncing: boolean;
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [syncFrequency, setSyncFrequency] = useState(settings?.configuration?.syncFrequency ?? 'manual');
  const [autoLink, setAutoLink] = useState(settings?.configuration?.autoLink ?? true);

  // Auto-save
  const debouncedEnabled = useDebounce(enabled, 2000);
  const debouncedAutoLink = useDebounce(autoLink, 2000);

  useEffect(() => {
    if (settings) {
      const needsUpdate = 
        debouncedEnabled !== settings.enabled ||
        debouncedAutoLink !== settings.configuration?.autoLink;
      
      if (needsUpdate) {
        onUpdate({
          enabled: debouncedEnabled,
          configuration: {
            syncFrequency,
            autoLink: debouncedAutoLink,
            emailFolders: ['INBOX']
          }
        });
      }
    }
  }, [debouncedEnabled, debouncedAutoLink, syncFrequency]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const isConnected = settings?.connectionStatus === 'connected';

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="outlook-enabled">Enable Email Sync</Label>
              <p className="text-sm text-muted-foreground">Sync emails to Communication Hub</p>
            </div>
            <Switch
              id="outlook-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-outlook-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-frequency">Sync Frequency</Label>
            <Select value={syncFrequency} onValueChange={setSyncFrequency}>
              <SelectTrigger id="sync-frequency" data-testid="select-sync-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Only</SelectItem>
                <SelectItem value="5min">Every 5 Minutes</SelectItem>
                <SelectItem value="15min">Every 15 Minutes</SelectItem>
                <SelectItem value="30min">Every 30 Minutes</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-link">Auto-link to Clients</Label>
              <p className="text-sm text-muted-foreground">Match emails by sender</p>
            </div>
            <Switch
              id="auto-link"
              checked={autoLink}
              onCheckedChange={setAutoLink}
              data-testid="switch-auto-link"
            />
          </div>

          {settings?.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{settings.connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onTestConnection}
              disabled={isTesting}
              variant="outline"
              className="flex-1"
              data-testid="button-test-outlook"
            >
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Test
            </Button>
            {isConnected && (
              <Button
                onClick={onSync}
                disabled={isSyncing}
                className="flex-1"
                data-testid="button-sync-outlook"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      {settings?.usage && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Usage Statistics</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Received:</span>{' '}
              <span className="font-medium">{settings.usage.messagesReceived || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Sync:</span>{' '}
              <span className="font-medium">
                {settings.lastActivityAt ? new Date(settings.lastActivityAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Twilio Settings Panel Component
function TwilioSettingsPanel({
  settings,
  isLoading,
  onUpdate,
  onTestConnection,
  isTesting
}: {
  settings?: IntegrationSettings;
  isLoading: boolean;
  onUpdate: (data: any) => void;
  onTestConnection: () => void;
  isTesting: boolean;
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(settings?.configuration?.phoneNumber ?? '');
  const [autoLink, setAutoLink] = useState(settings?.configuration?.autoLink ?? true);

  // Auto-save
  const debouncedEnabled = useDebounce(enabled, 2000);
  const debouncedPhoneNumber = useDebounce(phoneNumber, 2000);
  const debouncedAutoLink = useDebounce(autoLink, 2000);

  useEffect(() => {
    if (settings) {
      const needsUpdate = 
        debouncedEnabled !== settings.enabled ||
        debouncedPhoneNumber !== settings.configuration?.phoneNumber ||
        debouncedAutoLink !== settings.configuration?.autoLink;
      
      if (needsUpdate) {
        onUpdate({
          enabled: debouncedEnabled,
          configuration: {
            phoneNumber: debouncedPhoneNumber,
            autoLink: debouncedAutoLink
          }
        });
      }
    }
  }, [debouncedEnabled, debouncedPhoneNumber, debouncedAutoLink]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Credentials */}
        <div className="space-y-4">
          <h3 className="font-semibold mb-3">Twilio Credentials</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="twilio-enabled">Enable SMS</Label>
            <Switch
              id="twilio-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-twilio-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-sid">Account SID</Label>
            <Input
              id="account-sid"
              type="password"
              placeholder={settings?.credentials?.accountSid ? '••••••••' : 'Enter Account SID'}
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              data-testid="input-account-sid"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-token">Auth Token</Label>
            <Input
              id="auth-token"
              type="password"
              placeholder={settings?.credentials?.authToken ? '••••••••' : 'Enter Auth Token'}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              data-testid="input-auth-token"
            />
          </div>
        </div>

        {/* Right column: Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold mb-3">Configuration</h3>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Twilio Phone Number</Label>
            <Input
              id="phone-number"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone-number"
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio phone number (include country code)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-auto-link">Auto-link to Clients</Label>
              <p className="text-sm text-muted-foreground">Match by phone number</p>
            </div>
            <Switch
              id="sms-auto-link"
              checked={autoLink}
              onCheckedChange={setAutoLink}
              data-testid="switch-sms-auto-link"
            />
          </div>

          {settings?.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{settings.connectionError}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={onTestConnection}
            disabled={isTesting || !enabled}
            variant="outline"
            className="w-full"
            data-testid="button-test-twilio"
          >
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
        </div>
      </div>

      {/* Advanced Settings - Progressive Disclosure */}
      <Accordion type="single" collapsible className="border-t pt-4">
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="text-sm font-semibold">
            Advanced Settings
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/communication/sms/webhook`}
                    readOnly
                    className="bg-muted"
                    data-testid="input-webhook-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/communication/sms/webhook`);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in your Twilio console for incoming SMS
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status Callback URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/communication/sms/status`}
                    readOnly
                    className="bg-muted"
                    data-testid="input-status-callback-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/communication/sms/status`);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  For delivery status updates
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Usage Stats */}
      {settings?.usage && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Usage Statistics</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Sent:</span>{' '}
              <span className="font-medium">{settings.usage.messagesSent || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Received:</span>{' '}
              <span className="font-medium">{settings.usage.messagesReceived || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Activity:</span>{' '}
              <span className="font-medium">
                {settings.lastActivityAt ? new Date(settings.lastActivityAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// WhatsApp Settings Panel Component
function WhatsAppSettingsPanel({
  settings,
  isLoading,
  onUpdate,
  onTestConnection,
  isTesting
}: {
  settings?: IntegrationSettings;
  isLoading: boolean;
  onUpdate: (data: any) => void;
  onTestConnection: () => void;
  isTesting: boolean;
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [provider, setProvider] = useState(settings?.configuration?.provider ?? 'twilio');
  const [phoneNumber, setPhoneNumber] = useState(settings?.configuration?.phoneNumber ?? '');
  const [autoLink, setAutoLink] = useState(settings?.configuration?.autoLink ?? true);
  
  // Twilio WhatsApp (reuses SMS credentials)
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  
  // Cloud API
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState(settings?.configuration?.phoneNumberId ?? '');
  const [businessAccountId, setBusinessAccountId] = useState(settings?.configuration?.businessAccountId ?? '');

  // Auto-save
  const debouncedEnabled = useDebounce(enabled, 2000);
  const debouncedPhoneNumber = useDebounce(phoneNumber, 2000);
  const debouncedAutoLink = useDebounce(autoLink, 2000);

  useEffect(() => {
    if (settings) {
      const needsUpdate = 
        debouncedEnabled !== settings.enabled ||
        debouncedPhoneNumber !== settings.configuration?.phoneNumber ||
        debouncedAutoLink !== settings.configuration?.autoLink;
      
      if (needsUpdate) {
        onUpdate({
          enabled: debouncedEnabled,
          configuration: {
            provider,
            phoneNumber: debouncedPhoneNumber,
            autoLink: debouncedAutoLink,
            phoneNumberId,
            businessAccountId
          }
        });
      }
    }
  }, [debouncedEnabled, debouncedPhoneNumber, debouncedAutoLink, provider, phoneNumberId, businessAccountId]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Phone className="h-4 w-4" />
        <AlertDescription>
          {provider === 'twilio' 
            ? 'Using Twilio WhatsApp API. This will reuse your Twilio credentials from the SMS tab.' 
            : 'Using WhatsApp Cloud API. Requires Business account setup.'}
        </AlertDescription>
      </Alert>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Provider & Credentials */}
        <div className="space-y-4">
          <h3 className="font-semibold mb-3">WhatsApp Provider</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp-enabled">Enable WhatsApp</Label>
            <Switch
              id="whatsapp-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-whatsapp-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="whatsapp-provider" data-testid="select-whatsapp-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio WhatsApp API</SelectItem>
                <SelectItem value="cloud_api">WhatsApp Cloud API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {provider === 'twilio' ? 'Easiest setup - reuses Twilio SMS credentials' : 'Direct Meta integration - requires Business account'}
            </p>
          </div>

          {provider === 'twilio' && (
            <Alert>
              <AlertDescription className="text-sm">
                This uses your Twilio credentials from the SMS tab. Make sure SMS is configured first.
              </AlertDescription>
            </Alert>
          )}

          {provider === 'cloud_api' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder={settings?.credentials?.accessToken ? '••••••••' : 'Enter Access Token'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  data-testid="input-access-token"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number-id">Phone Number ID</Label>
                <Input
                  id="phone-number-id"
                  placeholder="123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  data-testid="input-phone-number-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-account-id">Business Account ID</Label>
                <Input
                  id="business-account-id"
                  placeholder="123456789012345"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  data-testid="input-business-account-id"
                />
              </div>
            </>
          )}
        </div>

        {/* Right column: Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold mb-3">Configuration</h3>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone-number">WhatsApp Phone Number</Label>
            <Input
              id="whatsapp-phone-number"
              placeholder="whatsapp:+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-whatsapp-phone-number"
            />
            <p className="text-xs text-muted-foreground">
              {provider === 'twilio' ? 'Format: whatsapp:+1234567890' : 'Your registered WhatsApp Business number'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="whatsapp-auto-link">Auto-link to Clients</Label>
              <p className="text-sm text-muted-foreground">Match by phone number</p>
            </div>
            <Switch
              id="whatsapp-auto-link"
              checked={autoLink}
              onCheckedChange={setAutoLink}
              data-testid="switch-whatsapp-auto-link"
            />
          </div>

          {settings?.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{settings.connectionError}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={onTestConnection}
            disabled={isTesting || !enabled}
            variant="outline"
            className="w-full"
            data-testid="button-test-whatsapp"
          >
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
        </div>
      </div>

      {/* Advanced Settings - Progressive Disclosure */}
      <Accordion type="single" collapsible className="border-t pt-4">
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="text-sm font-semibold">
            Advanced Settings
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/communication/whatsapp/webhook`}
                    readOnly
                    className="bg-muted"
                    data-testid="input-whatsapp-webhook-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/communication/whatsapp/webhook`);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure this URL in your {provider === 'twilio' ? 'Twilio console' : 'Meta developer console'} for incoming WhatsApp messages
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status Callback URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/communication/whatsapp/status`}
                    readOnly
                    className="bg-muted"
                    data-testid="input-whatsapp-status-callback-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/communication/whatsapp/status`);
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  For delivery status updates
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Usage Stats */}
      {settings?.usage && (
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Usage Statistics</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Sent:</span>{' '}
              <span className="font-medium">{settings.usage.messagesSent || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Received:</span>{' '}
              <span className="font-medium">{settings.usage.messagesReceived || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Activity:</span>{' '}
              <span className="font-medium">
                {settings.lastActivityAt ? new Date(settings.lastActivityAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
