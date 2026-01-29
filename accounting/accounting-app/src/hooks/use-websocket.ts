/**
 * React Hook for WebSocket Real-time Communication
 * 
 * Provides real-time updates for notifications, document collaboration,
 * and team communication
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface WebSocketHook {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, payload: any) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHook {
  const { user } = useAuth();
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');

    try {
      // Get auth token for WebSocket connection
      const token = localStorage.getItem('auth_token') || '';
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectCountRef.current = 0;

        // Re-subscribe to previous channels
        if (subscribedChannelsRef.current.size > 0) {
          const channels = Array.from(subscribedChannelsRef.current);
          sendMessage('subscribe', { channels });
        }

        // Send presence update
        sendMessage('presence_update', {
          status: 'online',
          location: window.location.pathname
        });

        // Start heartbeat
        const heartbeat = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            sendMessage('ping', {});
          } else {
            clearInterval(heartbeat);
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionState('error');
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [user, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  }, []);

  const subscribe = useCallback((channels: string[]) => {
    // Add to local set
    channels.forEach(channel => subscribedChannelsRef.current.add(channel));
    
    // Send subscribe message if connected
    if (isConnected) {
      sendMessage('subscribe', { channels });
    }
  }, [isConnected, sendMessage]);

  const unsubscribe = useCallback((channels: string[]) => {
    // Remove from local set
    channels.forEach(channel => subscribedChannelsRef.current.delete(channel));
    
    // Send unsubscribe message if connected
    if (isConnected) {
      sendMessage('unsubscribe', { channels });
    }
  }, [isConnected, sendMessage]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'notification':
        // Invalidate notification queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
        
        // Show toast notification if it's a new notification
        if (message.payload.id) {
          // You could add toast notification here if needed
          console.log('New notification received:', message.payload);
        }
        break;

      case 'document_change':
        // Handle collaborative document editing
        const { documentId } = message.payload;
        queryClient.invalidateQueries({ queryKey: ['/api/documents', documentId] });
        break;

      case 'activity_update':
        // Refresh activity feeds
        queryClient.invalidateQueries({ queryKey: ['/api/client-portal/activity'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activity-feed'] });
        break;

      case 'presence_update':
        // Handle user presence updates
        console.log('User presence update:', message.payload);
        break;

      case 'typing_indicator':
        // Handle typing indicators in chat/comments
        console.log('Typing indicator:', message.payload);
        break;

      case 'connection_established':
        console.log('WebSocket connection established:', message.payload);
        break;

      case 'subscription_confirmed':
        console.log('Subscribed to channels:', message.payload.channels);
        break;

      case 'error':
        console.error('WebSocket error:', message.payload.message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (autoConnect && user && !isConnected && connectionState !== 'connecting') {
      connect();
    }
  }, [user, autoConnect, isConnected, connectionState, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-subscribe to user-specific channels
  useEffect(() => {
    if (isConnected && user) {
      const channels = [
        `user_${user.id}`,
        `firm_${user.firmId}`
      ];

      // Add client-specific channel for client users
      if (user.clientId) {
        channels.push(`client_${user.clientId}`);
      }

      subscribe(channels);
    }
  }, [isConnected, user, subscribe]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
}

// Helper hooks for specific use cases

export function useDocumentCollaboration(documentId: number) {
  const { isConnected, sendMessage, subscribe, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    if (isConnected) {
      subscribe([`document_${documentId}`]);
      return () => unsubscribe([`document_${documentId}`]);
    }
  }, [isConnected, documentId, subscribe, unsubscribe]);

  const sendDocumentEdit = useCallback((operation: string, content: any) => {
    sendMessage('document_edit', {
      documentId,
      operation,
      content
    });
  }, [sendMessage, documentId]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    sendMessage('typing_indicator', {
      channel: `document_${documentId}`,
      isTyping
    });
  }, [sendMessage, documentId]);

  return {
    sendDocumentEdit,
    sendTypingIndicator
  };
}

export function useProjectCollaboration(projectId: number) {
  const { isConnected, sendMessage, subscribe, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    if (isConnected) {
      subscribe([`project_${projectId}`]);
      return () => unsubscribe([`project_${projectId}`]);
    }
  }, [isConnected, projectId, subscribe, unsubscribe]);

  const sendProjectUpdate = useCallback((update: any) => {
    sendMessage('project_update', {
      projectId,
      ...update
    });
  }, [sendMessage, projectId]);

  return {
    sendProjectUpdate
  };
}

export function usePresence() {
  const { sendMessage } = useWebSocket();

  const updatePresence = useCallback((status: 'online' | 'away' | 'busy', location?: string) => {
    sendMessage('presence_update', {
      status,
      location: location || window.location.pathname
    });
  }, [sendMessage]);

  return {
    updatePresence
  };
}