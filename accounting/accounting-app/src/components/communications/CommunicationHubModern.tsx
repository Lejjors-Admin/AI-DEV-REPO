/**
 * Modern Communication Hub - Split Panel Design
 * 
 * Features:
 * - Split-panel layout (conversation list + thread view)
 * - Smart message parsing with visual chips
 * - Message grouping for consecutive senders
 * - Advanced filters and search
 * - Modern UI with hover states
 */

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Lock,
  Share2,
  Eye,
  Users,
  UserCircle,
  Search,
  Mail,
  Send,
  RefreshCw,
  Reply,
  Paperclip,
  Download,
  Phone,
  Star,
  Filter,
  Plus,
  ChevronRight,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Building2,
  FolderKanban,
  X,
  Pin
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { NewMessageForm, SmsForm, WhatsAppForm } from "./CommunicationHubModern-forms";

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
  projectId?: number;
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
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: number;
}

interface InboxData {
  messages: Message[];
  userRole: 'STAFF' | 'ADMIN' | 'MANAGER';
  canViewAll: boolean;
  currentUserId: number;
}

interface ParsedContent {
  text: string;
  clientName?: string;
  projectName?: string;
  status?: string;
  documents?: string[];
}

export default function CommunicationHubModern() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'sms' | 'whatsapp' | 'internal'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStarred, setFilterStarred] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  
  const { toast } = useToast();
  const { isConnected } = useWebSocket();

  // Fetch clients and projects
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  const { data: projectsResponse } = useQuery({
    queryKey: ['/api/projects'],
  });
  const projects = projectsResponse?.data || [];

  // Fetch inbox messages
  const { data: inboxData, isLoading } = useQuery<InboxData>({
    queryKey: [`/api/communication/messages/inbox?filter=${activeFilter}`]
  });

  const messages = inboxData?.messages || [];
  const currentUserId = inboxData?.currentUserId || 0;

  // Parse message content to extract structured data
  const parseMessageContent = (message: Message): ParsedContent => {
    const content = message.content;
    
    // Extract client info
    const clientMatch = content.match(/📋\s*Client:\s*([^\n📋]*)/);
    const projectMatch = content.match(/📂\s*Project:\s*([^\n📋]*)/);
    const statusMatch = content.match(/📊\s*Status:\s*([^\n📋]*)/);
    const docsMatch = content.match(/Required Documents:([^]*?)(?=\n\n|$)/);
    
    let cleanText = content;
    if (clientMatch || projectMatch || statusMatch) {
      cleanText = content
        .replace(/📋\s*Client:.*?\n/g, '')
        .replace(/📂\s*Project:.*?\n/g, '')
        .replace(/📊\s*Status:.*?\n/g, '')
        .replace(/Required Documents:.*?(?=\n\n|$)/gs, '')
        .trim();
    }
    
    const documents = docsMatch ? 
      docsMatch[1].split('•').map(d => d.trim()).filter(d => d) : 
      undefined;

    return {
      text: cleanText,
      clientName: clientMatch?.[1]?.trim(),
      projectName: projectMatch?.[1]?.trim(),
      status: statusMatch?.[1]?.trim(),
      documents
    };
  };

  // Group messages into conversations
  const conversations = useMemo(() => {
    const grouped = new Map<string, Message[]>();
    
    messages.forEach(msg => {
      // Create conversation ID based on client/project or internal thread
      let convId = 'internal';
      if (msg.clientId) {
        convId = `client-${msg.clientId}${msg.projectId ? `-project-${msg.projectId}` : ''}`;
      } else if (msg.type === 'email_inbound' || msg.type === 'email_outbound') {
        convId = `email-${msg.senderId || 'external'}`;
      } else if (msg.phoneNumber) {
        convId = `phone-${msg.phoneNumber}`;
      }
      
      if (!grouped.has(convId)) {
        grouped.set(convId, []);
      }
      grouped.get(convId)!.push(msg);
    });
    
    // Sort messages within each conversation by date
    grouped.forEach(msgs => msgs.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
    
    return Array.from(grouped.entries()).map(([id, msgs]) => ({
      id,
      messages: msgs,
      lastMessage: msgs[msgs.length - 1],
      unreadCount: msgs.filter(m => !m.isRead).length
    })).sort((a, b) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const hasMatch = conv.messages.some(msg => 
          msg.content.toLowerCase().includes(query) ||
          msg.senderName.toLowerCase().includes(query) ||
          msg.phoneNumber?.toLowerCase().includes(query)
        );
        if (!hasMatch) return false;
      }
      
      // Unread filter
      if (filterUnread && conv.unreadCount === 0) return false;
      
      // Type filter
      if (typeFilter !== 'all') {
        const firstMsg = conv.messages[0];
        const messageType = firstMsg.type;
        
        if (typeFilter === 'email' && !messageType.includes('email')) return false;
        if (typeFilter === 'sms' && !messageType.includes('sms')) return false;
        if (typeFilter === 'whatsapp' && !messageType.includes('whatsapp')) return false;
        if (typeFilter === 'internal' && (messageType.includes('email') || messageType.includes('sms') || messageType.includes('whatsapp'))) return false;
      }
      
      return true;
    });
  }, [conversations, searchQuery, filterUnread, typeFilter]);

  // Get selected conversation
  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId)
    : null;

  // Group consecutive messages from same sender
  const groupedMessages = useMemo(() => {
    if (!selectedConversation) return [];
    
    const groups: { sender: string; messages: Message[] }[] = [];
    let currentGroup: Message[] = [];
    let currentSender = '';
    
    selectedConversation.messages.forEach(msg => {
      if (msg.senderId !== parseInt(currentSender)) {
        if (currentGroup.length > 0) {
          groups.push({ sender: currentSender, messages: currentGroup });
        }
        currentGroup = [msg];
        currentSender = msg.senderId.toString();
      } else {
        currentGroup.push(msg);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({ sender: currentSender, messages: currentGroup });
    }
    
    return groups;
  }, [selectedConversation]);

  // Format date for conversation list
  const formatConversationDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  // Get conversation title
  const getConversationTitle = (conv: { id: string; messages: Message[] }) => {
    const firstMsg = conv.messages[0];
    if (firstMsg.clientId) {
      const client = clients.find((c: any) => c.id === firstMsg.clientId);
      return client?.name || 'Unknown Client';
    }
    if (firstMsg.phoneNumber) {
      return firstMsg.phoneNumber;
    }
    if (firstMsg.type.includes('email')) {
      return firstMsg.senderName;
    }
    return 'Internal';
  };

  // Get message type icon
  const getMessageTypeIcon = (type: string) => {
    if (type.includes('email')) return <Mail className="h-3 w-3" />;
    if (type.includes('sms')) return <MessageSquare className="h-3 w-3" />;
    if (type.includes('whatsapp')) return <Phone className="h-3 w-3" />;
    if (type === 'client_chat') return <UserCircle className="h-3 w-3 text-indigo-600" />;
    return <MessageSquare className="h-3 w-3" />;
  };

  // Get message type colors
  const getMessageTypeColors = (type: string, isCurrentUser: boolean = false) => {
    if (type === 'client_chat') {
      return 'bg-indigo-50 text-indigo-900 border border-indigo-200';
    }
    if (type.includes('email')) {
      return isCurrentUser 
        ? 'bg-purple-500 text-white' 
        : 'bg-purple-100 text-purple-900 border border-purple-200';
    }
    if (type.includes('sms')) {
      return isCurrentUser 
        ? 'bg-green-500 text-white' 
        : 'bg-green-100 text-green-900 border border-green-200';
    }
    if (type.includes('whatsapp')) {
      return isCurrentUser 
        ? 'bg-emerald-500 text-white' 
        : 'bg-emerald-100 text-emerald-900 border border-emerald-200';
    }
    // Internal messages
    return isCurrentUser 
      ? 'bg-blue-500 text-white' 
      : 'bg-gray-100 text-gray-900';
  };

  // Get conversation accent color
  const getConversationAccentColor = (messages: Message[]) => {
    const type = messages[0]?.type || 'internal';
    if (type.includes('email')) return 'border-purple-500';
    if (type.includes('sms')) return 'border-green-500';
    if (type.includes('whatsapp')) return 'border-emerald-500';
    return 'border-blue-500';
  };

  // Mutations
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: number; emoji: string }) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/react`, { emoji });
      if (!response.ok) throw new Error('Failed to add reaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
    }
  });

  const replyToMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/reply`, { content });
      if (!response.ok) throw new Error('Failed to send reply');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setReplyContent("");
      toast({ title: "Reply sent successfully" });
    }
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: { content: string; subject?: string; clientId?: number; projectId?: number; priority?: string }) => {
      const response = await apiRequest('POST', '/api/communication/messages/create', data);
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setShowNewMessageDialog(false);
      toast({ title: "Success", description: "Message sent successfully!" });
    }
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { to: string; body: string; clientId?: number; projectId?: number; templateId?: number; variables?: any }) => {
      // Use template endpoint if templateId is provided
      const endpoint = data.templateId 
        ? '/api/communication/sms/send-from-template' 
        : '/api/communication/sms/send';
      
      const response = await apiRequest('POST', endpoint, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/messages/inbox'] });
      setShowSmsDialog(false);
      toast({ title: "SMS Sent", description: "Your text message was sent successfully!" });
    }
  });

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
      toast({ title: "WhatsApp Sent", description: "Your WhatsApp message was sent successfully!" });
    }
  });

  // Pin/unpin message mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: number; isPinned: boolean }) => {
      const endpoint = `/api/communication/messages/${messageId}/pin`;
      const method = isPinned ? 'DELETE' : 'POST';
      
      const response = await apiRequest(method, endpoint, {});
      if (!response.ok) throw new Error(`Failed to ${isPinned ? 'unpin' : 'pin'} message`);
      return response.json();
    },
    onSuccess: (_, { isPinned }) => {
      // Invalidate all inbox queries regardless of filter param
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/communication/messages/inbox');
        }
      });
      toast({ 
        title: isPinned ? "Message unpinned" : "Message pinned", 
        description: isPinned ? "Message has been unpinned" : "Message has been pinned to the top" 
      });
    }
  });

  // Share with team mutation (Option B Privacy Model - Sprint 2 Task s2-3)
  const shareWithTeamMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('POST', `/api/communication/messages/${messageId}/share-with-team`, {});
      if (!response.ok) throw new Error('Failed to share message with team');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/communication/messages/inbox');
        }
      });
      toast({ 
        title: "Message shared with team", 
        description: "Your message is now visible to all team members" 
      });
    }
  });

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-white">
      {/* Left Sidebar - Conversation List */}
      <div className="w-80 border-r flex flex-col bg-gray-50">
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="default" className="gap-1">
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowNewMessageDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Internal Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSmsDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                    Send SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowWhatsAppDialog(true)}>
                    <Phone className="h-4 w-4 mr-2 text-emerald-600" />
                    Send WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={filterUnread ? "default" : "outline"}
                onClick={() => setFilterUnread(!filterUnread)}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Unread
              </Button>
              <Button
                size="sm"
                variant={filterStarred ? "default" : "outline"}
                onClick={() => setFilterStarred(!filterStarred)}
                className="text-xs"
              >
                <Star className="h-3 w-3 mr-1" />
                Starred
              </Button>
            </div>
          )}

          {/* Privacy Tabs */}
          <div className="mt-3 flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeFilter === 'all' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('mine')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeFilter === 'mine' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Messages
            </button>
            <button
              onClick={() => setActiveFilter('shared')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeFilter === 'shared' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Shared
            </button>
          </div>

          {/* Type Filters */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500 mb-2">Message Type</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={typeFilter === 'all' ? "default" : "outline"}
                onClick={() => setTypeFilter('all')}
                className="text-xs h-7"
              >
                All Types
              </Button>
              <Button
                size="sm"
                variant={typeFilter === 'email' ? "default" : "outline"}
                onClick={() => setTypeFilter('email')}
                className="text-xs h-7 bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                variant={typeFilter === 'sms' ? "default" : "outline"}
                onClick={() => setTypeFilter('sms')}
                className="text-xs h-7 bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                SMS
              </Button>
              <Button
                size="sm"
                variant={typeFilter === 'whatsapp' ? "default" : "outline"}
                onClick={() => setTypeFilter('whatsapp')}
                className="text-xs h-7 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300"
              >
                <Phone className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant={typeFilter === 'internal' ? "default" : "outline"}
                onClick={() => setTypeFilter('internal')}
                className="text-xs h-7 bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
              >
                <Users className="h-3 w-3 mr-1" />
                Internal
              </Button>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No conversations</div>
            ) : (
              filteredConversations.map((conv) => {
                const lastMsg = conv.lastMessage;
                const parsed = parseMessageContent(lastMsg);
                const isSelected = selectedConversationId === conv.id;
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-gray-100 ${
                      isSelected ? `bg-blue-50 border-l-4 ${getConversationAccentColor(conv.messages)}` : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm">
                          {getConversationTitle(conv).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm truncate">
                            {getConversationTitle(conv)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">
                            {formatConversationDate(lastMsg.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {parsed.text}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          {getMessageTypeIcon(lastMsg.type)}
                          {conv.unreadCount > 0 && (
                            <Badge className="h-5 px-1.5 text-xs bg-blue-600">
                              {conv.unreadCount}
                            </Badge>
                          )}
                          {lastMsg.priority === 'high' && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          {!lastMsg.isSharedWithTeam && lastMsg.isInternal && (
                            <Lock className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Conversation Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {getConversationTitle(selectedConversation)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedConversation.messages[0].clientId && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        Client
                      </Badge>
                    )}
                    {selectedConversation.messages[0].projectId && (
                      <Badge variant="outline" className="text-xs">
                        <FolderKanban className="h-3 w-3 mr-1" />
                        Project
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedConversationId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Thread */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {groupedMessages.map((group, groupIdx) => {
                  const firstMsg = group.messages[0];
                  const isCurrentUser = firstMsg.senderId === currentUserId;
                  
                  return (
                    <div key={groupIdx} className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar - only show for first message in group */}
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className={`text-sm ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                          {firstMsg.senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex-1 max-w-2xl space-y-2 ${isCurrentUser ? 'items-end' : ''}`}>
                        {/* Sender name - only for first message */}
                        <div className={`text-xs text-gray-500 ${isCurrentUser ? 'text-right' : ''}`}>
                          {firstMsg.senderName}
                        </div>
                        
                        {/* Messages */}
                        {group.messages.map((msg, msgIdx) => {
                          const parsed = parseMessageContent(msg);
                          // Option B Privacy Model - Color coding
                          const isPrivate = msg.isInternal && !msg.isSharedWithTeam;
                          const borderClass = isPrivate && isCurrentUser 
                            ? 'border-2 border-amber-300' // Private messages have amber border
                            : msg.isSharedWithTeam && msg.isInternal 
                              ? 'border-2 border-green-300' // Shared messages have green border
                              : '';
                          
                          return (
                            <div key={msg.id} className="group">
                              <div className={`rounded-lg p-3 ${getMessageTypeColors(msg.type, isCurrentUser)} ${borderClass} ${isCurrentUser ? 'ml-auto' : ''}`}>
                                {/* Privacy indicator badge */}
                                {msg.isInternal && (
                                  <div className="mb-2 flex items-center gap-1">
                                    {!msg.isSharedWithTeam ? (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Private
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                        <Share2 className="h-3 w-3 mr-1" />
                                        Shared with Team
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {/* Parsed structured data */}
                                {(parsed.clientName || parsed.projectName || parsed.status) && (
                                  <div className={`mb-2 pb-2 border-b ${isCurrentUser ? 'border-blue-400' : 'border-gray-300'}`}>
                                    {parsed.clientName && (
                                      <div className="flex items-center gap-1 text-xs mb-1">
                                        <Building2 className="h-3 w-3" />
                                        {parsed.clientName}
                                      </div>
                                    )}
                                    {parsed.projectName && (
                                      <div className="flex items-center gap-1 text-xs mb-1">
                                        <FolderKanban className="h-3 w-3" />
                                        {parsed.projectName}
                                      </div>
                                    )}
                                    {parsed.status && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <Clock className="h-3 w-3" />
                                        {parsed.status}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Message content */}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {parsed.text}
                                </p>
                                
                                {/* Documents list */}
                                {parsed.documents && parsed.documents.length > 0 && (
                                  <div className={`mt-2 pt-2 border-t ${isCurrentUser ? 'border-blue-400' : 'border-gray-300'}`}>
                                    <div className="text-xs font-semibold mb-1">Required Documents:</div>
                                    <ul className="text-xs space-y-1">
                                      {parsed.documents.map((doc, i) => (
                                        <li key={i} className="flex items-start gap-1">
                                          <span>•</span>
                                          <span>{doc}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {msg.attachments.map(att => (
                                      <a
                                        key={att.id}
                                        href={`/${att.filePath}`}
                                        download={att.originalName}
                                        className={`flex items-center gap-2 p-2 rounded text-xs ${
                                          isCurrentUser ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        <span className="flex-1 truncate">{att.originalName}</span>
                                        <Download className="h-3 w-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Timestamp */}
                                <div className={`text-xs mt-2 flex items-center gap-1 ${
                                  isCurrentUser ? 'justify-end text-blue-100' : 'text-gray-500'
                                }`}>
                                  {msg.isPinned && (
                                    <Pin className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-1" />
                                  )}
                                  {format(new Date(msg.createdAt), 'HH:mm')}
                                  {isCurrentUser && (
                                    msg.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Quick actions on hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs"
                                  onClick={() => {}}
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  Reply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`h-6 text-xs ${msg.isPinned ? 'text-yellow-600' : ''}`}
                                  onClick={() => togglePinMutation.mutate({ messageId: msg.id, isPinned: !!msg.isPinned })}
                                  data-testid={`button-pin-${msg.id}`}
                                >
                                  <Pin className={`h-3 w-3 mr-1 ${msg.isPinned ? 'fill-yellow-600' : ''}`} />
                                  {msg.isPinned ? 'Unpin' : 'Pin'}
                                </Button>
                                {/* Share with Team button - Option B Privacy Model */}
                                {isCurrentUser && msg.isInternal && !msg.isSharedWithTeam && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-blue-600"
                                    onClick={() => shareWithTeamMutation.mutate(msg.id)}
                                    data-testid={`button-share-${msg.id}`}
                                  >
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Share with Team
                                  </Button>
                                )}
                                {['👍', '❤️', '😂', '🎉'].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                    className="hover:scale-125 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              
                              {/* Reactions */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {Object.entries(
                                    msg.reactions.reduce((acc: any, r: any) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <button
                                      key={emoji}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 hover:bg-gray-300 text-xs"
                                      onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-xs text-gray-600">{count as number}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Reply Box */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <MentionTextarea
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[60px] resize-none"
                />
                <Button
                  onClick={() => {
                    if (selectedConversation && replyContent.trim()) {
                      const lastMsg = selectedConversation.messages[selectedConversation.messages.length - 1];
                      replyToMessageMutation.mutate({
                        messageId: lastMsg.id,
                        content: replyContent
                      });
                    }
                  }}
                  disabled={!replyContent.trim() || replyToMessageMutation.isPending}
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Internal Message</DialogTitle>
          </DialogHeader>
          <NewMessageForm 
            clients={clients}
            projects={projects}
            onSubmit={(data) => createMessageMutation.mutate(data)}
            isPending={createMessageMutation.isPending}
            onCancel={() => setShowNewMessageDialog(false)}
            MentionTextarea={MentionTextarea}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="max-w-md">
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

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md">
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
