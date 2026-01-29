/**
 * WebSocket Hook for Real-time Communication
 * 
 * Provides WebSocket connection and real-time messaging functionality
 * for the comprehensive communication hub
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/hooks/use-toast';

// Types
interface WebSocketMessage {
  id: string;
  type: 'message' | 'typing' | 'presence' | 'notification' | 'reaction';
  payload: any;
  timestamp: string;
}

interface UserPresence {
  userId: number;
  username: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
  currentClientId?: number;
}

interface TypingIndicator {
  userId: number;
  username: string;
  conversationId: string;
  isTyping: boolean;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (conversationId: string, content: string, attachments?: File[]) => void;
  joinConversation: (conversationId: string, type?: 'thread' | 'room' | 'direct') => void;
  leaveConversation: (conversationId: string) => void;
  updatePresence: (status: UserPresence['status'], currentPage?: string, currentClientId?: number) => void;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  onlineUsers: UserPresence[];
  typingUsers: TypingIndicator[];
  lastMessage: any;
  notifications: any[];
}

// Custom hook for WebSocket functionality
export function useWebSocket(userId?: number, firmId?: number, username?: string): WebSocketContextType {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId || !firmId || !username) return;

    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Authenticate with the server
      newSocket.emit('authenticate', {
        userId,
        firmId,
        username,
        // TODO: Add token if needed
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setOnlineUsers([]);
      setTypingUsers([]);
    });

    newSocket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      if (data.success) {
        // Update presence to online
        newSocket.emit('presence_update', { 
          status: 'online',
          currentPage: window.location.pathname
        });
      }
    });

    newSocket.on('authentication_error', (error) => {
      console.error('WebSocket authentication failed:', error);
      toast({
        title: "Connection Error",
        description: "Failed to authenticate with chat server",
        variant: "destructive"
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection failed:', error);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast({
          title: "Connection Lost",
          description: "Unable to reconnect to chat server. Please refresh the page.",
          variant: "destructive"
        });
      }
    });

    // Message event handlers
    newSocket.on('new_message', (message) => {
      console.log('New message received:', message);
      setLastMessage(message);
      
      // Show notification for messages not from current user
      if (message.senderId !== userId) {
        toast({
          title: `New message from ${message.senderName}`,
          description: message.content.substring(0, 100) + 
            (message.content.length > 100 ? '...' : ''),
        });
      }
    });

    // Typing indicators
    newSocket.on('user_typing_start', (data) => {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId && u.conversationId === data.conversationId);
        if (existing) return prev;
        
        return [...prev, {
          userId: data.userId,
          username: data.username,
          conversationId: data.conversationId,
          isTyping: true
        }];
      });

      // Clear typing indicator after timeout
      const timeoutKey = `${data.userId}-${data.conversationId}`;
      const existingTimeout = typingTimeoutRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        setTypingUsers(prev => 
          prev.filter(u => !(u.userId === data.userId && u.conversationId === data.conversationId))
        );
        typingTimeoutRef.current.delete(timeoutKey);
      }, 3000);

      typingTimeoutRef.current.set(timeoutKey, timeout);
    });

    newSocket.on('user_typing_stop', (data) => {
      setTypingUsers(prev => 
        prev.filter(u => !(u.userId === data.userId && u.conversationId === data.conversationId))
      );

      const timeoutKey = `${data.userId}-${data.conversationId}`;
      const existingTimeout = typingTimeoutRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutRef.current.delete(timeoutKey);
      }
    });

    // Presence updates
    newSocket.on('user_presence_update', (data) => {
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        if (data.status === 'offline') {
          return filtered;
        }
        return [...filtered, {
          userId: data.userId,
          username: data.username,
          status: data.status,
          currentPage: data.currentPage,
          currentClientId: data.currentClientId
        }];
      });
    });

    // Conversation events
    newSocket.on('user_joined_conversation', (data) => {
      console.log('User joined conversation:', data);
    });

    newSocket.on('user_left_conversation', (data) => {
      console.log('User left conversation:', data);
    });

    // Message status updates
    newSocket.on('message_read_update', (data) => {
      console.log('Message read update:', data);
    });

    newSocket.on('message_reaction_update', (data) => {
      console.log('Message reaction update:', data);
    });

    // Notifications
    newSocket.on('notification', (notification) => {
      console.log('New notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
      
      // Show toast for important notifications
      if (notification.type === 'message' || notification.type === 'mention') {
        toast({
          title: notification.title,
          description: notification.message,
        });
      }
    });

    newSocket.on('firm_notification', (notification) => {
      console.log('Firm notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
    });

    // Error handling
    newSocket.on('message_error', (error) => {
      console.error('Message error:', error);
      toast({
        title: "Message Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      newSocket.close();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
      setTypingUsers([]);
    };
  }, [userId, firmId, username]);

  // Update presence when page changes
  useEffect(() => {
    if (socket && isConnected) {
      const handlePageChange = () => {
        socket.emit('presence_update', {
          status: 'online',
          currentPage: window.location.pathname
        });
      };

      window.addEventListener('popstate', handlePageChange);
      return () => window.removeEventListener('popstate', handlePageChange);
    }
  }, [socket, isConnected]);

  // Send message function
  const sendMessage = useCallback((conversationId: string, content: string, attachments?: File[]) => {
    if (!socket || !isConnected) {
      toast({
        title: "Connection Error",
        description: "Not connected to chat server",
        variant: "destructive"
      });
      return;
    }

    socket.emit('send_message', {
      conversationId,
      conversationType: 'room', // This could be dynamic based on conversation type
      content,
      attachments: attachments || []
    });
  }, [socket, isConnected]);

  // Join conversation function
  const joinConversation = useCallback((conversationId: string, type: 'thread' | 'room' | 'direct' = 'room') => {
    if (!socket || !isConnected) return;

    socket.emit('join_conversation', {
      conversationId,
      conversationType: type
    });
  }, [socket, isConnected]);

  // Leave conversation function
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('leave_conversation', {
      conversationId
    });
  }, [socket, isConnected]);

  // Update presence function
  const updatePresence = useCallback((status: UserPresence['status'], currentPage?: string, currentClientId?: number) => {
    if (!socket || !isConnected) return;

    socket.emit('presence_update', {
      status,
      currentPage: currentPage || window.location.pathname,
      currentClientId
    });
  }, [socket, isConnected]);

  // Typing indicators
  const sendTypingStart = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('typing_start', { conversationId });
  }, [socket, isConnected]);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('typing_stop', { conversationId });
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    sendMessage,
    joinConversation,
    leaveConversation,
    updatePresence,
    sendTypingStart,
    sendTypingStop,
    onlineUsers,
    typingUsers,
    lastMessage,
    notifications
  };
}