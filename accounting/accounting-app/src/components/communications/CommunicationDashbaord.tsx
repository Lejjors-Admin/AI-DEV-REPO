/**
 * Comprehensive Communication Dashboard
 * 
 * A modern, feature-rich communication hub similar to Slack/Microsoft Teams
 * with real-time messaging, activity feeds, analytics, and team collaboration
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/use-auth";
import { 
  MessageSquare, 
  Users, 
  Activity, 
  Bell, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  Hash,
  UserPlus,
  Settings,
  Phone,
  Video,
  Archive,
  Star,
  Reply,
  Edit,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  MessageCircle,
  Mail,
  FileText,
  Image,
  File,
  X,
  AtSign,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Types
interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  contentHtml?: string;
  timestamp: string;
  isRead: boolean;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyToId?: number;
  isEdited?: boolean;
  editedAt?: string;
}

interface MessageAttachment {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  thumbnailPath?: string;
}

interface MessageReaction {
  emoji: string;
  count: number;
  userIds: number[];
  isUserReacted: boolean;
}

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'client' | 'channel';
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  lastActivity: string;
  description?: string;
  isPrivate?: boolean;
  clientId?: number;
  projectId?: number;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'admin' | 'moderator' | 'participant';
  lastSeen?: string;
}

interface ActivityItem {
  id: number;
  type: 'message' | 'file_share' | 'user_join' | 'user_leave' | 'call_start' | 'call_end';
  title: string;
  description: string;
  timestamp: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  conversationId?: string;
  conversationName?: string;
}

interface CommunicationStats {
  totalMessages: number;
  unreadMessages: number;
  activeConversations: number;
  onlineUsers: number;
  avgResponseTime: number;
  todayMessages: number;
  weeklyGrowth: number;
}

export default function CommunicationDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const firmId = user?.firmId ?? 1;
  const userId = user?.id ?? 1;
  const displayName = user?.name || user?.username || "User";

  // Real-time WebSocket connection
  const webSocket = useWebSocket(firmId, userId, displayName);
  const { 
    isConnected, 
    sendMessage: wsSendMessage, 
    joinConversation, 
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    onlineUsers: wsOnlineUsers,
    typingUsers: wsTypingUsers,
    lastMessage: wsLastMessage
  } = webSocket;

  // Data fetching
  const { data: stats } = useQuery({
    queryKey: ['/api/communications/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/communications/stats');
      return await response.json() as CommunicationStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!user?.id,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/communications/conversations', searchQuery, messageFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (messageFilter !== 'all') params.set('filter', messageFilter);
      
      const response = await apiRequest('GET', `/api/communications/conversations?${params}`);
      return await response.json() as Conversation[];
    },
    enabled: !!user?.id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['/api/communications/activities'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/communications/activities?limit=20');
      return await response.json() as ActivityItem[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !!user?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/communications/messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const response = await apiRequest(
        'GET',
        `/api/communications/conversations/${selectedConversation.id}/messages`
      );
      return await response.json() as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; conversationId: string; attachments?: File[] }) => {
      const formData = new FormData();
      formData.append('content', data.content);
      formData.append('conversationId', data.conversationId);
      
      if (data.attachments) {
        data.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const response = await apiRequest('POST', '/api/communications/messages', formData);
      return await response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['/api/communications/messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Utility functions
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handleSendMessage = () => {
    if (!selectedConversation || (!newMessage.trim() && attachments.length === 0)) return;

    // Send via WebSocket for real-time delivery
    if (isConnected && newMessage.trim()) {
      wsSendMessage(selectedConversation.id, newMessage, attachments.length > 0 ? attachments : undefined);
    }

    // Also send via HTTP API for persistence
    sendMessageMutation.mutate({
      content: newMessage,
      conversationId: selectedConversation.id,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  };

  // Handle WebSocket message updates
  useEffect(() => {
    if (wsLastMessage) {
      // Invalidate queries to refresh message list
      queryClient.invalidateQueries({ queryKey: ['/api/communications/messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/conversations'] });
    }
  }, [wsLastMessage, selectedConversation?.id]);

  // Join/leave conversations when selection changes
  useEffect(() => {
    if (selectedConversation && isConnected) {
      joinConversation(selectedConversation.id, 'room');
      
      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation?.id, isConnected, joinConversation, leaveConversation]);

  // Handle typing indicators
  useEffect(() => {
    if (!selectedConversation || !isConnected) return;

    let typingTimeout: NodeJS.Timeout;

    const handleTyping = () => {
      if (!isTyping) {
        setIsTyping(true);
        sendTypingStart(selectedConversation.id);
      }

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        sendTypingStop(selectedConversation.id);
      }, 1000);
    };

    const handleKeyPress = () => {
      if (newMessage.trim()) {
        handleTyping();
      }
    };

    const messageInput = document.querySelector('textarea[placeholder="Type a message..."]');
    if (messageInput) {
      messageInput.addEventListener('input', handleKeyPress);
      
      return () => {
        messageInput.removeEventListener('input', handleKeyPress);
        clearTimeout(typingTimeout);
        if (isTyping) {
          sendTypingStop(selectedConversation.id);
        }
      };
    }
  }, [selectedConversation?.id, isConnected, newMessage, isTyping, sendTypingStart, sendTypingStop]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communication Hub</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Bell className="h-4 w-4" />
                  {stats && stats.unreadMessages > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                      {stats.unreadMessages}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4">
                  <h4 className="font-semibold mb-2">Notifications</h4>
                  <div className="space-y-2">
                    {/* Notification items would be rendered here */}
                    <p className="text-sm text-gray-500">No new notifications</p>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowNewConversationDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Quick stats */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats?.unreadMessages || 0}</div>
                <div className="text-xs text-gray-500">Unread</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats?.onlineUsers || 0}</div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
            </div>
          </div>

          {/* Conversation filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Button
                variant={messageFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageFilter('all')}
              >
                All
              </Button>
              <Button
                variant={messageFilter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageFilter('unread')}
              >
                Unread
              </Button>
              <Button
                variant={messageFilter === 'mentions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageFilter('mentions')}
              >
                Mentions
              </Button>
            </div>
          </div>

          {/* Conversations list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {conversation.type === 'direct' && conversation.participants[0] ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.participants[0].avatar} />
                          <AvatarFallback>
                            {conversation.participants[0].name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                      )}
                      {conversation.type === 'direct' && conversation.participants[0]?.status === 'online' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {conversation.name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(conversation.lastActivity)}
                        </span>
                      </div>
                      
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {conversation.type === 'client' && (
                            <Badge variant="outline" className="text-xs">Client</Badge>
                          )}
                          {conversation.isPrivate && (
                            <Badge variant="secondary" className="text-xs">Private</Badge>
                          )}
                        </div>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {selectedConversation.type === 'direct' && selectedConversation.participants[0] ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedConversation.participants[0].avatar} />
                          <AvatarFallback>
                            {selectedConversation.participants[0].name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.participants.length} participants
                        {wsTypingUsers.filter(u => u.conversationId === selectedConversation.id).length > 0 && (
                          <span className="ml-2 text-blue-600">
                            {wsTypingUsers
                              .filter(u => u.conversationId === selectedConversation.id)
                              .map(u => u.username)
                              .join(', ')} {wsTypingUsers.filter(u => u.conversationId === selectedConversation.id).length === 1 ? 'is' : 'are'} typing...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Conversation Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Conversation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex items-start gap-3 group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderAvatar} />
                        <AvatarFallback>
                          {message.senderName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.timestamp), 'h:mm a')}
                          </span>
                          {message.isEdited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {message.contentHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: message.contentHtml }} />
                          ) : (
                            message.content
                          )}
                        </div>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded"
                              >
                                <File className="h-4 w-4" />
                                <span className="text-sm flex-1">{attachment.originalName}</span>
                                <span className="text-xs text-gray-500">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {message.reactions.map((reaction, index) => (
                              <Button
                                key={index}
                                variant={reaction.isUserReacted ? "default" : "outline"}
                                size="sm"
                                className="h-6 px-2"
                              >
                                {reaction.emoji} {reaction.count}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Smile className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Reply className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message composer */}
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                {attachments.length > 0 && (
                  <div className="mb-3 flex gap-2 flex-wrap">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded px-3 py-2"
                      >
                        <File className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[44px] max-h-32 resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() && attachments.length === 0 || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Activity feed and user list */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <Tabs defaultValue="activity" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h4 className="font-semibold mb-4">Recent Activity</h4>
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.userAvatar} />
                        <AvatarFallback>
                          {activity.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="users" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h4 className="font-semibold mb-4">Team Members ({wsOnlineUsers.length} online)</h4>
                  {wsOnlineUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.username.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} border-2 border-white rounded-full`} />
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.status}</p>
                        {user.currentPage && (
                          <p className="text-xs text-gray-400">Viewing: {user.currentPage}</p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* New conversation dialog */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              Choose conversation type and participants
            </DialogDescription>
          </DialogHeader>
          {/* New conversation form would go here */}
          <div className="p-4">
            <p className="text-sm text-gray-500">New conversation dialog content...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}