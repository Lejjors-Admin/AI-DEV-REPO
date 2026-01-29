import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, X, Check, MoreVertical, Archive, Filter, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiConfig } from "@/lib/api-config";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  readAt?: string;
  createdAt: string;
  priority: number;
  senderName?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: any;
}

interface NotificationCenterProps {
  className?: string;
}

const notificationTypeLabels: Record<string, string> = {
  mention: "Mention",
  message: "Message", 
  task_assigned: "Task Assigned",
  task_due: "Task Due",
  task_completed: "Task Completed",
  invoice_sent: "Invoice Sent",
  payment_received: "Payment Received",
  document_shared: "Document Shared",
  document_approved: "Document Approved",
  client_message: "Client Message",
  system_alert: "System Alert",
  deadline_reminder: "Deadline Reminder",
  meeting_reminder: "Meeting Reminder",
  project_update: "Project Update",
  comment_reply: "Comment Reply",
  file_uploaded: "File Uploaded",
  approval_request: "Approval Request"
};

const notificationTypeColors: Record<string, string> = {
  mention: "bg-blue-100 text-blue-800",
  message: "bg-green-100 text-green-800",
  task_assigned: "bg-orange-100 text-orange-800",
  task_due: "bg-red-100 text-red-800",
  task_completed: "bg-green-100 text-green-800",
  invoice_sent: "bg-purple-100 text-purple-800",
  payment_received: "bg-green-100 text-green-800",
  document_shared: "bg-blue-100 text-blue-800",
  document_approved: "bg-green-100 text-green-800",
  client_message: "bg-yellow-100 text-yellow-800",
  system_alert: "bg-red-100 text-red-800",
  deadline_reminder: "bg-orange-100 text-orange-800",
  meeting_reminder: "bg-blue-100 text-blue-800",
  project_update: "bg-purple-100 text-purple-800",
  comment_reply: "bg-gray-100 text-gray-800",
  file_uploaded: "bg-blue-100 text-blue-800",
  approval_request: "bg-yellow-100 text-yellow-800"
};

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Get unread count for badge
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/count'],
    queryFn: async () => {
      try {
        const response = await fetch(apiConfig.buildUrl('/api/notifications/count'), { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch unread count');
        return await response.json();
      } catch (error) {
        console.error('Error fetching unread count:', error);
        return { count: 0 };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  // Get notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications', selectedType, showUnreadOnly],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          limit: '50',
          ...(selectedType !== 'all' && { type: selectedType }),
          ...(showUnreadOnly && { unread_only: 'true' })
        });
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(apiConfig.buildUrl(`/api/notifications?${params}`), { 
          headers,
          credentials: 'include' 
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            return { notifications: [] };
          }
          throw new Error('Failed to fetch notifications');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return { notifications: [] };
      }
    },
    enabled: isOpen,
    retry: false,
  });

  // Mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      return await apiRequest('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notificationIds }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      toast({ title: "Notifications marked as read" });
    },
    onError: (error) => {
      console.error('Error marking notifications as read:', error);
      toast({ 
        title: "Error", 
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      toast({ title: "All notifications marked as read" });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({ 
        title: "Error", 
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  // Dismiss notification
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
    onError: (error) => {
      console.error('Error dismissing notification:', error);
      toast({ 
        title: "Error", 
        description: "Failed to dismiss notification",
        variant: "destructive"
      });
    }
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.readAt) {
      markAsReadMutation.mutate([notification.id]);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    markAsReadMutation.mutate([notificationId]);
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'task_due':
        return '📋';
      case 'client_message':
      case 'message':
        return '💬';
      case 'document_shared':
      case 'file_uploaded':
        return '📄';
      case 'invoice_sent':
      case 'payment_received':
        return '💰';
      case 'meeting_reminder':
        return '📅';
      case 'approval_request':
        return '✅';
      case 'system_alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative ${className}`}
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        data-testid="notification-panel"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowUnreadOnly(!showUnreadOnly)}>
                      {showUnreadOnly ? 'Show All' : 'Show Unread Only'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => markAllAsReadMutation.mutate()}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark All as Read
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Type Filter */}
            <div className="mt-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task_assigned">Tasks</SelectItem>
                  <SelectItem value="client_message">Client Messages</SelectItem>
                  <SelectItem value="document_shared">Documents</SelectItem>
                  <SelectItem value="invoice_sent">Invoices</SelectItem>
                  <SelectItem value="meeting_reminder">Meetings</SelectItem>
                  <SelectItem value="system_alert">System Alerts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {showUnreadOnly ? "No unread notifications" : "No notifications"}
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.readAt ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${notificationTypeColors[notification.type] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {notificationTypeLabels[notification.type] || notification.type}
                            </Badge>
                            {notification.priority > 1 && (
                              <Badge variant="destructive" className="text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            
                            {notification.senderName && (
                              <span className="text-xs text-gray-500">
                                From: {notification.senderName}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.readAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              className="h-6 w-6 p-0"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDismiss(e, notification.id)}
                            className="h-6 w-6 p-0"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {notification.actionUrl && (
                        <div className="mt-2">
                          <span className="text-xs text-blue-600 hover:text-blue-800">
                            {notification.actionText || 'View Details'} →
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}