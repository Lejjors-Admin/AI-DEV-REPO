import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Save, Bell, Mail, Smartphone, Volume2 } from "lucide-react";

interface NotificationPreferences {
  id?: number;
  userId: number;
  firmId: number;
  preferences: {
    [key: string]: {
      inApp: boolean;
      email: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  digestFrequency: string;
  maxNotificationsPerHour: number;
}

const notificationTypes = [
  {
    id: "mention",
    label: "Mentions",
    description: "When someone mentions you in a comment or message",
    icon: "💬",
    category: "Communication"
  },
  {
    id: "message",
    label: "Direct Messages",
    description: "When you receive a direct message",
    icon: "✉️",
    category: "Communication"
  },
  {
    id: "task_assigned",
    label: "Task Assignments",
    description: "When you are assigned a new task",
    icon: "📋",
    category: "Tasks"
  },
  {
    id: "task_due",
    label: "Task Due Dates",
    description: "Reminders for upcoming task deadlines",
    icon: "⏰",
    category: "Tasks"
  },
  {
    id: "task_completed",
    label: "Task Completions",
    description: "When tasks assigned by you are completed",
    icon: "✅",
    category: "Tasks"
  },
  {
    id: "client_message",
    label: "Client Messages",
    description: "When clients send messages or inquiries",
    icon: "👤",
    category: "Client Communication"
  },
  {
    id: "document_shared",
    label: "Document Sharing",
    description: "When documents are shared with you",
    icon: "📄",
    category: "Documents"
  },
  {
    id: "document_approved",
    label: "Document Approvals",
    description: "When documents you shared are approved",
    icon: "✅",
    category: "Documents"
  },
  {
    id: "invoice_sent",
    label: "Invoice Notifications",
    description: "When invoices are sent to clients",
    icon: "💰",
    category: "Financial"
  },
  {
    id: "payment_received",
    label: "Payment Received",
    description: "When payments are received from clients",
    icon: "💵",
    category: "Financial"
  },
  {
    id: "meeting_reminder",
    label: "Meeting Reminders",
    description: "Reminders for upcoming meetings",
    icon: "📅",
    category: "Calendar"
  },
  {
    id: "deadline_reminder",
    label: "Deadline Reminders",
    description: "General deadline and due date reminders",
    icon: "⚠️",
    category: "Important"
  },
  {
    id: "system_alert",
    label: "System Alerts",
    description: "Important system notifications and alerts",
    icon: "🔔",
    category: "System"
  },
  {
    id: "approval_request",
    label: "Approval Requests",
    description: "When your approval is requested for documents or actions",
    icon: "🔐",
    category: "Important"
  }
];

const timeZones = [
  "America/Toronto",
  "America/Vancouver", 
  "America/Montreal",
  "America/Halifax",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Regina",
  "America/St_Johns"
];

const digestFrequencies = [
  { value: "immediate", label: "Immediate" },
  { value: "hourly", label: "Hourly Digest" },
  { value: "daily", label: "Daily Digest" },
  { value: "weekly", label: "Weekly Digest" }
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Get current preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/notifications/preferences', { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch preferences');
        return await response.json();
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        // Return default preferences
        return {
          preferences: {},
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          timezone: "America/Toronto",
          digestFrequency: "immediate",
          maxNotificationsPerHour: 10
        };
      }
    },
  });

  // Initialize preferences when data loads
  useEffect(() => {
    if (preferencesData && !preferences) {
      setPreferences(preferencesData);
    }
  }, [preferencesData, preferences]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: NotificationPreferences) => {
      return await apiRequest('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updatedPreferences),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      setHasChanges(false);
      toast({ 
        title: "Preferences Saved", 
        description: "Your notification preferences have been updated successfully." 
      });
    },
    onError: (error) => {
      console.error('Error saving preferences:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateGlobalSetting = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setHasChanges(true);
  };

  const updateTypePreference = (type: string, channel: string, enabled: boolean) => {
    if (!preferences) return;

    const typePrefs = preferences.preferences[type] || {
      inApp: true,
      email: true,
      sms: false,
      push: true
    };

    const updated = {
      ...preferences,
      preferences: {
        ...preferences.preferences,
        [type]: {
          ...typePrefs,
          [channel]: enabled
        }
      }
    };
    
    setPreferences(updated);
    setHasChanges(true);
  };

  const getTypePreference = (type: string, channel: string): boolean => {
    if (!preferences) return true;
    return preferences.preferences[type]?.[channel] ?? true;
  };

  const handleSave = () => {
    if (preferences) {
      savePreferencesMutation.mutate(preferences);
    }
  };

  const groupedTypes = notificationTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, typeof notificationTypes>);

  if (isLoading || !preferences) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notification-preferences">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-gray-600">
            Customize how and when you receive notifications
          </p>
        </div>
        
        {hasChanges && (
          <Button 
            onClick={handleSave}
            disabled={savePreferencesMutation.isPending}
            data-testid="save-preferences"
          >
            <Save className="h-4 w-4 mr-2" />
            {savePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            Control overall notification behavior and delivery preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Channel Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-500" />
                <div>
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-gray-500">Show notifications in the application</p>
                </div>
              </div>
              <Switch
                checked={true} // Always enabled
                disabled={true}
                data-testid="in-app-toggle"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-500" />
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Send notifications via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => updateGlobalSetting('emailEnabled', checked)}
                data-testid="email-toggle"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-500" />
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Send urgent notifications via SMS</p>
                </div>
              </div>
              <Switch
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => updateGlobalSetting('smsEnabled', checked)}
                data-testid="sms-toggle"
              />
            </div>
          </div>

          <Separator />

          {/* Additional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Notification Frequency</Label>
              <Select 
                value={preferences.digestFrequency} 
                onValueChange={(value) => updateGlobalSetting('digestFrequency', value)}
              >
                <SelectTrigger data-testid="frequency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {digestFrequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                How often to receive notification summaries
              </p>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select 
                value={preferences.timezone} 
                onValueChange={(value) => updateGlobalSetting('timezone', value)}
              >
                <SelectTrigger data-testid="timezone-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeZones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('America/', '').replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quiet Hours Start</Label>
              <Input
                type="time"
                value={preferences.quietHoursStart || "22:00"}
                onChange={(e) => updateGlobalSetting('quietHoursStart', e.target.value)}
                data-testid="quiet-start-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Quiet Hours End</Label>
              <Input
                type="time"
                value={preferences.quietHoursEnd || "08:00"}
                onChange={(e) => updateGlobalSetting('quietHoursEnd', e.target.value)}
                data-testid="quiet-end-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Type Preferences */}
      {Object.entries(groupedTypes).map(([category, types]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              {category}
            </CardTitle>
            <CardDescription>
              Configure notifications for {category.toLowerCase()} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {types.map((type) => (
                <div key={type.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{type.label}</h4>
                        <Badge variant="outline" className="text-xs">
                          {type.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {type.description}
                      </p>
                      
                      {/* Channel Preferences for this type */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${type.id}-in-app`}
                            checked={getTypePreference(type.id, 'inApp')}
                            onCheckedChange={(checked) => updateTypePreference(type.id, 'inApp', checked)}
                            data-testid={`${type.id}-in-app-toggle`}
                          />
                          <Label htmlFor={`${type.id}-in-app`} className="text-sm">
                            In-App
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${type.id}-email`}
                            checked={getTypePreference(type.id, 'email') && preferences.emailEnabled}
                            onCheckedChange={(checked) => updateTypePreference(type.id, 'email', checked)}
                            disabled={!preferences.emailEnabled}
                            data-testid={`${type.id}-email-toggle`}
                          />
                          <Label htmlFor={`${type.id}-email`} className="text-sm">
                            Email
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${type.id}-sms`}
                            checked={getTypePreference(type.id, 'sms') && preferences.smsEnabled}
                            onCheckedChange={(checked) => updateTypePreference(type.id, 'sms', checked)}
                            disabled={!preferences.smsEnabled}
                            data-testid={`${type.id}-sms-toggle`}
                          />
                          <Label htmlFor={`${type.id}-sms`} className="text-sm">
                            SMS
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${type.id}-push`}
                            checked={getTypePreference(type.id, 'push') && preferences.pushEnabled}
                            onCheckedChange={(checked) => updateTypePreference(type.id, 'push', checked)}
                            disabled={!preferences.pushEnabled}
                            data-testid={`${type.id}-push-toggle`}
                          />
                          <Label htmlFor={`${type.id}-push`} className="text-sm">
                            Push
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save Button (Bottom) */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={savePreferencesMutation.isPending}
            size="lg"
            data-testid="save-preferences-bottom"
          >
            <Save className="h-4 w-4 mr-2" />
            {savePreferencesMutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}