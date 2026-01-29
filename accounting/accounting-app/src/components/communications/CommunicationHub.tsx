/**
 * Communication Hub with Option B Privacy Model
 * 
 * Features:
 * - Staff messages private by default
 * - Managers can view all without notification
 * - Staff can share messages with team
 * - Privacy indicators and audit trail
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Lock,
  Unlock,
  Share2,
  Eye,
  EyeOff,
  Shield,
  Users,
  Filter,
  Search,
  Mail,
  FileText,
  Bell,
  Send,
  MoreHorizontal,
  RefreshCw,
  Reply,
  Smile,
  MessageCircle,
  Paperclip,
  Download,
  Phone
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useRef } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  type: string;
  isInternal: boolean;
  isSharedWithTeam: boolean;
  sharedAt?: string;
  viewedByManagers?: number[];
  priority: string;
  createdAt: string;
  clientId?: number;
  reactions?: Array<{ emoji: string; userId: number; userName: string }>;
  threadCount?: number;
  replyToId?: number;
  attachments?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
  }>;
  readBy?: number[];
  isRead?: boolean;
  phoneNumber?: string;
  smsStatus?: string;
  smsDirection?: string;
  twilioMessageSid?: string;
  whatsappMessageId?: string;
  whatsappStatus?: string;
  whatsappMediaUrl?: string;
}

interface InboxData {
  messages: Message[];
  userRole: 'STAFF' | 'ADMIN' | 'MANAGER';
  canViewAll: boolean;
  currentUserId: number;
}

export default function CommunicationHub() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  
  // Hooks
  const { toast } = useToast();
  
  // WebSocket connection for real-time updates
  const { isConnected, newMessageCount, notifications, clearNotifications } = useWebSocket();

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch projects for dropdown
  const { data: projectsResponse } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  const projects = projectsResponse?.data || [];

  // Fetch inbox messages with privacy filtering
  const { data: inboxData, isLoading} = useQuery<InboxData>({
    queryKey: [`/api/communication/messages/inbox?filter=${activeFilter}`]
  });

  // Share message with team mutation
  const shareMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/share-with-team`, {});
      if (!response.ok) {
        throw new Error('Failed to share message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      toast({
        title: "Success",
        description: "Message shared with team!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create new message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: { content: string; subject?: string; clientId?: number; projectId?: number; priority?: string }) => {
      const response = await apiRequest('POST', '/api/communication/messages/create', data);
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setShowNewMessageDialog(false);
      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Outlook email sync mutation
  const syncOutlookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/outlook/sync', {});
      if (!response.ok) {
        throw new Error('Failed to sync Outlook emails');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      toast({
        title: "Email Sync Complete",
        description: `Synced ${data.syncedCount} new emails from Outlook`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // SMS send mutation
  const sendSmsMutation = useMutation({
    mutationFn: async (data: { to: string; body: string; clientId?: number; projectId?: number }) => {
      const response = await apiRequest('POST', '/api/communication/sms/send', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setShowSmsDialog(false);
      toast({
        title: "SMS Sent",
        description: "Your text message was sent successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // WhatsApp send mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: { to: string; body: string; clientId?: number; projectId?: number; mediaUrl?: string }) => {
      const response = await apiRequest('POST', '/api/communication/whatsapp/send', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send WhatsApp message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setShowWhatsAppDialog(false);
      toast({
        title: "WhatsApp Sent",
        description: "Your WhatsApp message was sent successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "WhatsApp Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add reaction to message mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: number; emoji: string }) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/reactions`, { emoji });
      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reply to message mutation
  const replyToMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/reply`, { content });
      if (!response.ok) {
        throw new Error('Failed to send reply');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      toast({
        title: "Success",
        description: "Reply sent successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Manager view tracking mutation (silent, no toast)
  const trackManagerViewMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/track-manager-view`, {});
      if (!response.ok) {
        throw new Error('Failed to track view');
      }
      return response.json();
    },
    onSuccess: () => {
      // Silently update cache without refetch
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
    }
  });

  // Track manager view when message is selected
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    
    // If user is manager and this is not their own message and not shared, track the view
    if (canViewAll && message.senderId !== currentUserId && !message.isSharedWithTeam) {
      trackManagerViewMutation.mutate(message.id);
    }
  };

  const userRole = inboxData?.userRole || 'STAFF';
  const canViewAll = inboxData?.canViewAll || false;
  const currentUserId = inboxData?.currentUserId || 0;

  // Auto-refresh inbox when new notifications arrive
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
    }
  }, [notifications]);

  const getPrivacyIcon = (message: Message) => {
    if (message.isSharedWithTeam) {
      return <Unlock className="h-4 w-4 text-green-500" data-testid={`icon-shared-${message.id}`} />;
    }
    return <Lock className="h-4 w-4 text-gray-400" data-testid={`icon-private-${message.id}`} />;
  };

  const getPrivacyBadge = (message: Message) => {
    if (message.isSharedWithTeam) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Users className="h-3 w-3 mr-1" />
          Shared with Team
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
        <Lock className="h-3 w-3 mr-1" />
        Private
      </Badge>
    );
  };

  const getManagerViewBadge = (message: Message) => {
    if (message.viewedByManagers && message.viewedByManagers.length > 0) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Viewed by {message.viewedByManagers.length} manager{message.viewedByManagers.length > 1 ? 's' : ''}
        </Badge>
      );
    }
    return null;
  };

  // Render content with highlighted mentions
  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // Add highlighted mention
      parts.push(
        <span key={match.index} className="bg-blue-100 text-blue-700 px-1 rounded font-medium">
          @{match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Get read receipts badge
  const getReadReceiptsBadge = (message: Message) => {
    if (!message.readBy || message.readBy.length === 0) {
      return null;
    }

    const readCount = message.readBy.length;
    const isReadByCurrentUser = message.readBy.includes(currentUserId);

    return (
      <div className="flex items-center gap-1 text-xs text-gray-500" data-testid={`read-receipts-${message.id}`}>
        <Eye className="h-3 w-3" />
        <span>Read by {readCount} {readCount === 1 ? 'person' : 'people'}</span>
        {isReadByCurrentUser && <span className="text-blue-600">(including you)</span>}
      </div>
    );
  };

  const messages = inboxData?.messages || [];
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClient = !filterClientId || msg.clientId?.toString() === filterClientId;
    const matchesProject = !filterProjectId || (msg as any).projectId?.toString() === filterProjectId;
    
    return matchesSearch && matchesClient && matchesProject;
  });

  return (
    <div className="h-full flex flex-col" data-testid="communication-hub">
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
              {newMessageCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {newMessageCount > 9 ? '9+' : newMessageCount}
                </Badge>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Communication Hub</h2>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {canViewAll ? (
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-purple-500" />
                    Manager View - Can see all messages
                  </span>
                ) : (
                  <span>Option B Privacy - Your messages are private by default</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Outlook Button */}
            <Button
              onClick={() => syncOutlookMutation.mutate()}
              size="sm"
              variant="outline"
              disabled={syncOutlookMutation.isPending}
              data-testid="button-sync-outlook"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncOutlookMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Outlook
            </Button>

            {/* New Message Button */}
            <Button
              onClick={() => setShowNewMessageDialog(true)}
              size="sm"
              data-testid="button-new-message"
            >
              <Send className="h-4 w-4 mr-1" />
              New Message
            </Button>

            {/* Send SMS Button */}
            <Button
              onClick={() => setShowSmsDialog(true)}
              size="sm"
              variant="outline"
              data-testid="button-send-sms"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Send SMS
            </Button>

            {/* Send WhatsApp Button */}
            <Button
              onClick={() => setShowWhatsAppDialog(true)}
              size="sm"
              variant="outline"
              data-testid="button-send-whatsapp"
            >
              <Phone className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>

            {/* User Role Badge */}
            <Badge 
              variant={userRole === 'MANAGER' ? 'default' : 'secondary'}
              className={userRole === 'MANAGER' ? 'bg-purple-600' : ''}
            >
              {userRole}
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-messages"
              />
            </div>

            <Tabs value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all" data-testid="filter-all">
                  All {canViewAll && '(Manager)'}
                </TabsTrigger>
                <TabsTrigger value="mine" data-testid="filter-mine">
                  My Messages
                </TabsTrigger>
                <TabsTrigger value="shared" data-testid="filter-shared">
                  Shared
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Client/Project Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="flex-1 border rounded-md p-2 text-sm"
                data-testid="select-filter-client"
              >
                <option value="">All Clients</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="flex-1 border rounded-md p-2 text-sm"
              data-testid="select-filter-project"
            >
              <option value="">All Projects</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {(filterClientId || filterProjectId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterClientId("");
                  setFilterProjectId("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No messages found</p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleMessageSelect(message)}
                data-testid={`message-card-${message.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {message.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{message.senderName}</span>
                          {getPrivacyIcon(message)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {renderContentWithMentions(message.content)}
                      </p>

                      {/* Reactions Display */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                          {Object.entries(
                            message.reactions.reduce((acc: any, r: any) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addReactionMutation.mutate({ messageId: message.id, emoji });
                              }}
                            >
                              <span>{emoji}</span>
                              <span className="text-xs text-gray-600">{count as number}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Attachments Display */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment: any) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded border text-sm"
                              data-testid={`attachment-${attachment.id}`}
                            >
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <span className="flex-1 truncate">{attachment.originalName}</span>
                              <span className="text-xs text-gray-500">
                                {(attachment.fileSize / 1024).toFixed(1)} KB
                              </span>
                              <a
                                href={`/${attachment.filePath}`}
                                download={attachment.originalName}
                                className="text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {getPrivacyBadge(message)}
                        {getManagerViewBadge(message)}
                        
                        {message.clientId && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Users className="h-3 w-3 mr-1" />
                            Client
                          </Badge>
                        )}
                        
                        {message.type === 'email_inbound' && (
                          <Badge variant="outline" className="bg-blue-50">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Badge>
                        )}
                        
                        {(message.type === 'sms_inbound' || message.type === 'sms_outbound') && (
                          <Badge variant="outline" className="bg-green-50">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            SMS {message.smsDirection === 'inbound' ? 'In' : 'Out'}
                          </Badge>
                        )}
                        
                        {(message.type === 'whatsapp_inbound' || message.type === 'whatsapp_outbound') && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Phone className="h-3 w-3 mr-1" />
                            WhatsApp {message.smsDirection === 'inbound' ? 'In' : 'Out'}
                          </Badge>
                        )}
                        
                        {message.phoneNumber && (
                          <span className="text-xs text-gray-500">{message.phoneNumber}</span>
                        )}

                        {message.priority === 'high' && (
                          <Badge variant="destructive">High Priority</Badge>
                        )}

                        {message.threadCount > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingTo(message.id);
                            }}
                            data-testid={`button-reply-${message.id}`}
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>

                          {/* Quick reactions */}
                          <div className="flex items-center gap-1">
                            {['👍', '❤️', '😂', '🎉'].map(emoji => (
                              <button
                                key={emoji}
                                className="text-lg hover:scale-125 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addReactionMutation.mutate({ messageId: message.id, emoji });
                                }}
                                data-testid={`button-react-${emoji}-${message.id}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Read Receipts */}
                        {getReadReceiptsBadge(message)}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === message.id && (
                        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-2">
                            <MentionTextarea
                              value={replyContent}
                              onChange={setReplyContent}
                              placeholder="Type your reply... Use @ to mention team members"
                              className="w-full border rounded-md p-2 min-h-[60px]"
                              testId={`input-reply-${message.id}`}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (replyContent.trim()) {
                                    replyToMessageMutation.mutate({
                                      messageId: message.id,
                                      content: replyContent
                                    });
                                    setReplyContent("");
                                    setReplyingTo(null);
                                  }
                                }}
                                disabled={!replyContent.trim() || replyToMessageMutation.isPending}
                                data-testid={`button-send-reply-${message.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Send Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent("");
                                }}
                                data-testid={`button-cancel-reply-${message.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!message.isSharedWithTeam && message.senderId === currentUserId && userRole !== 'MANAGER' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareMessageMutation.mutate(message.id);
                          }}
                          disabled={shareMessageMutation.isPending}
                          data-testid={`button-share-${message.id}`}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share with Team
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Privacy Info Footer */}
      {userRole !== 'MANAGER' && (
        <div className="border-t p-3 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>
              Your messages are private by default. Click "Share with Team" to make them visible to others.
            </span>
          </div>
        </div>
      )}

      {canViewAll && (
        <div className="border-t p-3 bg-purple-50">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <Shield className="h-4 w-4" />
            <span>
              As a manager, you can view all staff messages. Your views are tracked for audit purposes.
            </span>
          </div>
        </div>
      )}

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-new-message">
          <DialogHeader>
            <DialogTitle>Create New Message</DialogTitle>
          </DialogHeader>
          <NewMessageForm 
            clients={clients}
            projects={projects}
            onSubmit={(data) => createMessageMutation.mutate(data)}
            isPending={createMessageMutation.isPending}
            onCancel={() => setShowNewMessageDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-send-sms">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
          </DialogHeader>
          <SmsForm 
            clients={clients}
            projects={projects}
            onSubmit={(data) => sendSmsMutation.mutate(data)}
            isPending={sendSmsMutation.isPending}
            onCancel={() => setShowSmsDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-send-whatsapp">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Message</DialogTitle>
          </DialogHeader>
          <WhatsAppForm 
            clients={clients}
            projects={projects}
            onSubmit={(data) => sendWhatsAppMutation.mutate(data)}
            isPending={sendWhatsAppMutation.isPending}
            onCancel={() => setShowWhatsAppDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mention Textarea Component with Autocomplete
function MentionTextarea({ 
  value, 
  onChange, 
  placeholder, 
  required = false,
  className = "",
  testId = ""
}: { 
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  testId?: string;
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users for mentions
  const { data: userSuggestions = [] } = useQuery({
    queryKey: ['/api/communication/users/search', mentionSearch],
    enabled: showMentions && mentionSearch.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/communication/users/search?q=${encodeURIComponent(mentionSearch)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    }
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if user is typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Replace the partial mention with the complete one
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newValue = `${beforeMention}@${username} ${textAfterCursor}`;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionSearch("");

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + username.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        required={required}
        className={className}
        data-testid={testId}
      />
      
      {/* Mention Autocomplete Dropdown */}
      {showMentions && userSuggestions.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {userSuggestions.map((user: any) => (
            <button
              key={user.id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => insertMention(user.username)}
              data-testid={`mention-suggestion-${user.username}`}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {user.name?.charAt(0) || user.username?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{user.name || user.username}</div>
                <div className="text-xs text-gray-500">@{user.username}</div>
              </div>
              <Badge variant="outline" className="text-xs">{user.role}</Badge>
            </button>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-1">
        Type @ to mention a team member
      </div>
    </div>
  );
}

// New Message Form Component
function NewMessageForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel 
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    clientId: '',
    projectId: '',
    priority: 'normal'
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/communication/attachments/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachments');
      }

      const data = await response.json();
      setUploadedAttachments(data.attachments);
      return data.attachments;
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload attachments",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload attachments first if any
    let attachments = uploadedAttachments;
    if (selectedFiles.length > 0 && uploadedAttachments.length === 0) {
      attachments = await uploadAttachments();
    }

    const submitData: any = {
      content: formData.content,
      priority: formData.priority
    };
    
    if (formData.subject) submitData.subject = formData.subject;
    if (formData.clientId) submitData.clientId = Number(formData.clientId);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    if (attachments.length > 0) submitData.attachments = attachments;
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject (Optional)</label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Enter subject..."
          data-testid="input-message-subject"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Client (Optional)</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-message-client"
          >
            <option value="">No client</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Project (Optional)</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-message-project"
          >
            <option value="">No project</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          className="w-full border rounded-md p-2"
          data-testid="select-message-priority"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <MentionTextarea
          value={formData.content}
          onChange={(value) => setFormData({ ...formData, content: value })}
          placeholder="Type your message... Use @ to mention team members"
          required={true}
          className="w-full border rounded-md p-2 min-h-[120px]"
          testId="textarea-message-content"
        />
      </div>

      {/* File Attachments */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Attachments (Optional)</label>
        <div className="border-2 border-dashed rounded-md p-4">
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
            disabled={selectedFiles.length >= 5}
            data-testid="input-file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <Paperclip className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Max 5 files, 10MB each (Images, PDF, Word, Excel)
            </p>
          </label>
        </div>

        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 mt-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                data-testid={`file-item-${index}`}
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(index)}
                  data-testid={`button-remove-file-${index}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-message"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploading || !formData.content.trim()}
          data-testid="button-submit-message"
        >
          {isUploading ? 'Uploading...' : isPending ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}

// SMS Form Component
function SmsForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel 
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: { to: string; body: string; clientId?: number; projectId?: number }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    to: '',
    body: '',
    clientId: '',
    projectId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      to: formData.to,
      body: formData.body
    };
    
    if (formData.clientId) submitData.clientId = Number(formData.clientId);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone Number *</label>
        <Input
          type="tel"
          value={formData.to}
          onChange={(e) => setFormData({ ...formData, to: e.target.value })}
          placeholder="+1234567890"
          required
          data-testid="input-sms-phone"
        />
        <p className="text-xs text-gray-500">Include country code (e.g., +1 for US/Canada)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Client (Optional)</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-sms-client"
          >
            <option value="">No client</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Project (Optional)</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-sms-project"
          >
            <option value="">No project</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Type your SMS message..."
          required
          className="w-full border rounded-md p-2 min-h-[100px]"
          maxLength={160}
          data-testid="textarea-sms-body"
        />
        <p className="text-xs text-gray-500">{formData.body.length}/160 characters</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-sms"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !formData.to.trim() || !formData.body.trim()}
          data-testid="button-send-sms"
        >
          {isPending ? 'Sending...' : 'Send SMS'}
        </Button>
      </div>
    </form>
  );
}

// WhatsApp Form Component
function WhatsAppForm({ 
  clients, 
  projects, 
  onSubmit, 
  isPending,
  onCancel 
}: { 
  clients: any[];
  projects: any[];
  onSubmit: (data: { to: string; body: string; clientId?: number; projectId?: number; mediaUrl?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    to: '',
    body: '',
    clientId: '',
    projectId: '',
    mediaUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      to: formData.to,
      body: formData.body
    };
    
    if (formData.clientId) submitData.clientId = Number(formData.clientId);
    if (formData.projectId) submitData.projectId = Number(formData.projectId);
    if (formData.mediaUrl) submitData.mediaUrl = formData.mediaUrl;
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">WhatsApp Number *</label>
        <Input
          type="tel"
          value={formData.to}
          onChange={(e) => setFormData({ ...formData, to: e.target.value })}
          placeholder="whatsapp:+1234567890"
          required
          data-testid="input-whatsapp-phone"
        />
        <p className="text-xs text-gray-500">Format: whatsapp:+1234567890 (include whatsapp: prefix)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Client (Optional)</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-whatsapp-client"
          >
            <option value="">No client</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Project (Optional)</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full border rounded-md p-2"
            data-testid="select-whatsapp-project"
          >
            <option value="">No project</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message *</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Type your WhatsApp message..."
          required
          className="w-full border rounded-md p-2 min-h-[100px]"
          data-testid="textarea-whatsapp-body"
        />
        <p className="text-xs text-gray-500">{formData.body.length} characters</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Media URL (Optional)</label>
        <Input
          type="url"
          value={formData.mediaUrl}
          onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
          data-testid="input-whatsapp-media"
        />
        <p className="text-xs text-gray-500">Attach an image or document URL</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-whatsapp"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !formData.to.trim() || !formData.body.trim()}
          data-testid="button-send-whatsapp"
        >
          {isPending ? 'Sending...' : 'Send WhatsApp'}
        </Button>
      </div>
    </form>
  );
}
