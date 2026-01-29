/**
 * Milton AI Chat Interface - DOS-style terminal UI
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Terminal, Bot, Zap, Settings, TrendingUp } from "lucide-react";

interface ChatMessage {
  role: 'user' | 'milton' | 'system';
  content: string;
  timestamp: Date;
  action?: any;
}

interface MiltonChatProps {
  clientId: number;
  context?: 'intake' | 'classification' | 'analysis' | 'anomaly' | 'general';
  className?: string;
}

export function MiltonChat({ clientId, context = 'general', className }: MiltonChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, [clientId, context]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, [isConnected]);

  const startConversation = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(
        'POST',
        '/api/milton/chat/start',
        {
          clientId,
          context,
          initialMessage: context === 'general' ? undefined : `Starting ${context} mode`
        }
      );

      const data = await response.json();
      setConversationId(data.conversationId);
      setIsConnected(true);

      // Add initial system message
      setMessages([{
        role: 'system',
        content: 'CONNECTING TO MILTON v2.1...\nINITIALIZING SECURE CONNECTION...\nLOADING CLIENT DATA...\nREADY',
        timestamp: new Date()
      }]);

      // Fetch initial greeting from conversation
      await sendMessage('STATUS');

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setMessages([{
        role: 'system',
        content: 'ERROR: CONNECTION FAILED\nUNABLE TO ESTABLISH SECURE LINK TO MILTON\nPLEASE RETRY OR CONTACT SUPPORT',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message?: string) => {
    const messageToSend = message || input;
    if (!messageToSend.trim() || !conversationId || isLoading) return;

    try {
      setIsLoading(true);
      
      // Add user message immediately
      if (!message) {
        setMessages(prev => [...prev, {
          role: 'user',
          content: input,
          timestamp: new Date()
        }]);
        setInput('');
      }

      const response = await apiRequest(
        'POST',
        '/api/milton/chat/message',
        {
          conversationId,
          message: messageToSend
        }
      );

      // Add Milton's response
      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'milton',
        content: data.response,
        timestamp: new Date(),
        action: data.action
      }]);

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'ERROR: MESSAGE TRANSMISSION FAILED\nRETRYING...',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickCommands = [
    { cmd: 'ANALYZE', icon: TrendingUp, desc: 'Financial Analysis' },
    { cmd: 'CATEGORIZE', icon: Zap, desc: 'Transaction Categorization' },
    { cmd: 'ANOMALIES', icon: Bot, desc: 'Detect Irregularities' },
    { cmd: 'HELP', icon: Settings, desc: 'Command Reference' },
  ];

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className={`flex flex-col h-full bg-black text-green-400 font-mono ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-green-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-bold">MILTON AI v2.1 TERMINAL</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {messages.map((message, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-green-300">
              <span>{formatTimestamp(message.timestamp)}</span>
              <span className="text-yellow-400">
                {message.role === 'user' ? 'USER>' : 
                 message.role === 'milton' ? 'MILTON>' : 'SYSTEM>'}
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed pl-4">
              {message.content}
            </div>
            {message.action && (
              <div className="ml-4 p-2 bg-gray-900 border border-green-600 rounded text-xs">
                <span className="text-cyan-400">ACTION:</span> {message.action.type}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <span className="animate-pulse">PROCESSING...</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping" />
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      <div className="p-2 border-t border-green-600 bg-gray-900">
        <div className="flex flex-wrap gap-1 mb-2">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd.cmd}
              variant="outline"
              size="sm"
              className="text-xs bg-black border-green-600 text-green-400 hover:bg-green-900"
              onClick={() => sendMessage(cmd.cmd)}
              disabled={isLoading || !isConnected}
            >
              <cmd.icon className="w-3 h-3 mr-1" />
              {cmd.cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-green-400">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-400 font-bold">C:\MILTON&gt;</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type command or message..."
            className="flex-1 bg-black border-green-600 text-green-400 focus:border-green-300 placeholder-green-700"
            disabled={isLoading || !isConnected}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !isConnected || !input.trim()}
            className="bg-green-700 hover:bg-green-600 text-black"
          >
            SEND
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-green-600">
          {isConnected ? 
            `Connected to client ${clientId} | Mode: ${context.toUpperCase()} | Press ENTER to send` :
            'Establishing connection...'
          }
        </div>
      </div>
    </div>
  );
}