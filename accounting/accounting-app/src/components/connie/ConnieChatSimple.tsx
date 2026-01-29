import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: string;
  type: 'user' | 'connie';
  content: string;
  timestamp: Date;
}

export default function ConnieChatSimple() {
  const { user } = useAuth();
  
  const getInitialMessage = () => {
    const userRole = user?.role || 'unknown';
    
    if (userRole.includes('client')) {
      return 'Hello! I\'m Connie, your privacy-safe business assistant. I help with financial questions, document organization, and business guidance using secure rule-based processing. No data leaves your system. How can I assist you today?';
    } else if (userRole === 'firm_admin' || userRole === 'staff') {
      return 'Hello! I\'m Connie, your CRM and client management assistant. I help with client relationships, task management, and engagement tracking using privacy-safe processing. How can I help you manage your practice today?';
    } else {
      return 'Hello! I\'m Connie, your privacy-safe AI assistant. I use rule-based processing to help with your questions without sharing any data externally. How can I help you today?';
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'connie',
      content: getInitialMessage(),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Simple rule-based response
    setTimeout(() => {
      const response = generateRuleBasedResponse(inputValue);
      const connieMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'connie',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, connieMessage]);
    }, 1000);

    setInputValue('');
  };

  const generateRuleBasedResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    const userRole = user?.role || 'unknown';
    
    // Role-aware responses
    if (userRole.includes('client')) {
      // Business client responses
      if (lowerInput.includes('financial') || lowerInput.includes('report')) {
        return 'I can help you understand your financial reports. Your financial data is processed securely using privacy-safe rules without external AI services. What specific financial information would you like to discuss?';
      }
      
      if (lowerInput.includes('transaction') || lowerInput.includes('expense')) {
        return 'For transaction and expense management, I can guide you through categorization and record-keeping best practices. All processing happens locally to protect your sensitive financial data.';
      }
      
      if (lowerInput.includes('tax') || lowerInput.includes('deduction')) {
        return 'I can provide general tax guidance based on standard accounting rules. For specific tax advice, I recommend consulting with your accounting firm. Your tax information remains completely private.';
      }
      
      if (lowerInput.includes('document') || lowerInput.includes('upload')) {
        return 'You can upload documents in the Documents tab. I can help you organize and categorize them using secure, rule-based processing without any external data sharing.';
      }
      
      if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
        return 'I can help with:\n• Financial report explanations\n• Transaction categorization guidance\n• Document organization\n• General accounting questions\n• Business workflow suggestions\n\nAll assistance uses privacy-safe, rule-based processing to protect your data.';
      }
      
      return 'I understand your question about "' + input + '". As your privacy-safe business assistant, I use rule-based processing to provide helpful guidance while keeping your business data completely secure. Could you provide more specific details about what you\'d like to know?';
      
    } else if (userRole === 'firm_admin' || userRole === 'staff') {
      // Accounting firm responses
      if (lowerInput.includes('client') || lowerInput.includes('crm')) {
        return 'I can help you manage client relationships, track engagement progress, and organize client communications. All client data is processed using privacy-safe rules. What specific client management task can I assist with?';
      }
      
      if (lowerInput.includes('task') || lowerInput.includes('engagement')) {
        return 'I can help you create tasks, track engagement timelines, and manage workpaper assignments. All processing happens securely without external data sharing. What engagement management support do you need?';
      }
      
      if (lowerInput.includes('audit') || lowerInput.includes('compliance')) {
        return 'I can guide you through audit procedures, compliance checklists, and engagement binder organization using standard accounting practices. What audit or compliance assistance do you need?';
      }
      
      if (lowerInput.includes('document') || lowerInput.includes('file')) {
        return 'I can help you organize client documents, manage engagement files, and track document review status using privacy-safe processing. What document management task can I assist with?';
      }
      
      if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
        return 'I can help with:\n• Client relationship management\n• Task and engagement tracking\n• Document organization\n• Audit and compliance guidance\n• Practice management workflows\n\nAll assistance uses privacy-safe, rule-based processing to protect client data.';
      }
      
      return 'I understand your question about "' + input + '". As your CRM assistant, I use rule-based processing to help manage your practice while keeping all client data completely secure. Could you provide more specific details about what you\'d like to accomplish?';
    }
    
    // Default response for other roles
    return 'I understand your question about "' + input + '". As your privacy-safe assistant, I use rule-based processing to provide helpful guidance while keeping your data completely secure. Could you provide more specific details about what you\'d like to know?';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h3 className="font-semibold">Connie AI Assistant</h3>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Privacy-Safe</span>
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Rule-based processing • No external data sharing • Complete privacy protection
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`p-2 rounded-full ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about your business..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}