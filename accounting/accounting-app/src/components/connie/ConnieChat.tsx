import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Message {
  id: string;
  type: 'user' | 'connie';
  content: string;
  timestamp: Date;
  actions?: ConnieAction[];
  status?: 'pending' | 'completed' | 'error';
}

interface ConnieAction {
  type: 'create_client' | 'edit_client' | 'add_task' | 'send_notification' | 'upload_access';
  description: string;
  data?: any;
  status: 'pending' | 'completed' | 'error';
}

interface ConnieCapability {
  name: string;
  description: string;
  examples: string[];
}

const CONNIE_CAPABILITIES: ConnieCapability[] = [
  {
    name: "Client Management",
    description: "Create, edit, and manage client information",
    examples: [
      "Create a new client for ABC Corporation",
      "Update contact information for existing client",
      "Add industry classification to client profile"
    ]
  },
  {
    name: "Task Management", 
    description: "Create and assign tasks for client engagements",
    examples: [
      "Add a task to review financial statements",
      "Create engagement timeline for audit",
      "Assign workpapers to team members"
    ]
  },
  {
    name: "Communication",
    description: "Send notifications and updates to clients",
    examples: [
      "Notify client about document requirements",
      "Send engagement status update",
      "Request additional information from client"
    ]
  },
  {
    name: "File Management",
    description: "Manage document uploads and file access",
    examples: [
      "Grant client upload access for tax documents",
      "Organize engagement binder files",
      "Set document deadlines and reminders"
    ]
  }
];

export default function ConnieChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'connie',
      content: "Hi! I'm Connie, your AI CRM and project management officer. I can help you manage clients, create tasks, send notifications, and handle file uploads. What would you like me to help you with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch AI settings to check if Connie is enabled
  const { data: aiSettings } = useQuery({
    queryKey: ["/api/ai-settings"],
    enabled: true
  });

  // Send message to Connie
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/connie/chat", {
        message,
        context: {
          page: 'clients',
          capabilities: CONNIE_CAPABILITIES.map(c => c.name)
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const connieResponse: Message = {
        id: Date.now().toString(),
        type: 'connie',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions || [],
        status: data.status || 'completed'
      };
      
      setMessages(prev => [...prev, connieResponse]);
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Chat Error",
        description: error.message || "Failed to communicate with Connie",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  });

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    sendMessageMutation.mutate(input.trim());
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const executeAction = async (action: ConnieAction) => {
    try {
      const response = await apiRequest("POST", "/api/connie/execute", {
        action: action.type,
        data: action.data
      });
      
      if (response.ok) {
        toast({
          title: "Action Completed",
          description: `Successfully executed: ${action.description}`
        });
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      }
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to execute action",
        variant: "destructive"
      });
    }
  };

  const isConnieEnabled = aiSettings?.connie?.enabled;

  if (!isConnieEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-pink-500" />
            Connie - AI CRM Officer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connie is Not Enabled</h3>
            <p className="text-gray-600 mb-4">
              Enable Connie in AI Settings to access AI-powered CRM and project management features.
            </p>
            <Button onClick={() => window.location.href = '/ai-settings'}>
              Go to AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connie Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-pink-500" />
              Connie - AI CRM Officer
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Interface */}
      <Card className="h-96">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chat with Connie</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col h-80">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'connie' && (
                          <Bot className="h-4 w-4 mt-0.5 text-pink-500" />
                        )}
                        {message.type === 'user' && (
                          <User className="h-4 w-4 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          
                          {/* Action buttons for Connie responses */}
                          {message.actions && message.actions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant="outline"
                                  className="mr-2 mb-1"
                                  onClick={() => executeAction(action)}
                                >
                                  {action.description}
                                  {action.status === 'pending' && (
                                    <Clock className="h-3 w-3 ml-1" />
                                  )}
                                  {action.status === 'completed' && (
                                    <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-pink-500" />
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Connie is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Connie to help with client management..."
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Connie Can Do</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {CONNIE_CAPABILITIES.map((capability, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-medium text-sm">{capability.name}</h4>
                <p className="text-xs text-gray-600">{capability.description}</p>
                <div className="space-y-1">
                  {capability.examples.map((example, exIndex) => (
                    <div
                      key={exIndex}
                      className="text-xs text-blue-600 cursor-pointer hover:underline"
                      onClick={() => setInput(example)}
                    >
                      "{example}"
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}