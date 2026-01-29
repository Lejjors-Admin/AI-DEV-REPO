import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Paperclip,
  X,
  FileText,
  Download,
  Clock,
  CheckCheck,
  Bell
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Message {
  id: number;
  content: string;
  senderId: number | null;
  senderName: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  attachments: Array<{
    fileName: string;
    fileSize: number;
    fileUrl: string;
    mimeType: string;
  }> | null;
  createdAt: string;
}

interface ClientChatInterfaceProps {
  clientId: number;
  clientName: string;
}

export default function ClientChatInterface({ clientId, clientName }: ClientChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [updateRequested, setUpdateRequested] = useState(false);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/client-portal/messages/list"],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/client-portal/messages/send", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      setMessage("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/messages/list"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to your accounting team.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Request update mutation
  const requestUpdateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/client-portal/request-update", {
        method: "POST",
        body: JSON.stringify({ clientId }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      setUpdateRequested(true);
      toast({
        title: "Update requested",
        description: "Your accounting team has been notified.",
      });
      setTimeout(() => setUpdateRequested(false), 60000); // Reset after 1 minute
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) {
      toast({
        title: "Cannot send empty message",
        description: "Please enter a message or attach a file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("content", message);
    formData.append("clientId", clientId.toString());
    
    attachments.forEach(file => {
      formData.append("files", file);
    });

    await sendMessageMutation.mutateAsync(formData);
    setIsUploading(false);
  };

  // Handle Enter key to send
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Messages</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Chat with your accounting team</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestUpdateMutation.mutate()}
            disabled={updateRequested || requestUpdateMutation.isPending}
            data-testid="button-request-update"
          >
            <Bell className="h-4 w-4 mr-2" />
            {updateRequested ? "Update Requested" : "Request Update"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages List */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">Send a message to start the conversation</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isFromClient = msg.type === "client_chat";
                const isFromStaff = msg.type === "staff_chat";
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isFromClient ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    {!isFromClient && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {msg.senderName?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex-1 max-w-[70%] ${isFromClient ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {!isFromClient && (
                          <span className="text-sm font-medium text-gray-700">
                            {msg.senderName || "Staff"}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                        {msg.isRead && isFromClient && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      
                      <div
                        className={`rounded-lg p-3 ${
                          isFromClient
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.fileUrl}
                                download
                                className={`flex items-center gap-2 p-2 rounded ${
                                  isFromClient
                                    ? "bg-blue-700 hover:bg-blue-800"
                                    : "bg-white hover:bg-gray-50"
                                } transition-colors`}
                                data-testid={`attachment-${idx}`}
                              >
                                <FileText className="h-4 w-4" />
                                <div className="flex-1 text-left">
                                  <p className="text-xs font-medium">{file.fileName}</p>
                                  <p className="text-xs opacity-75">
                                    {formatFileSize(file.fileSize)}
                                  </p>
                                </div>
                                <Download className="h-4 w-4" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isFromClient && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-green-100 text-green-600 text-xs">
                          {clientName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message Input Area */}
        <div className="border-t p-4 bg-gray-50">
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 gap-2"
                  data-testid={`preview-attachment-${index}`}
                >
                  <FileText className="h-3 w-3" />
                  <span className="text-xs">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="hover:bg-gray-300 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || sendMessageMutation.isPending}
              data-testid="button-attach-file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Textarea
              placeholder="Type your message... (Shift+Enter for new line)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={isUploading || sendMessageMutation.isPending}
              data-testid="input-message"
            />
            
            <Button
              onClick={handleSend}
              disabled={
                (!message.trim() && attachments.length === 0) ||
                isUploading ||
                sendMessageMutation.isPending
              }
              className="self-end"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line. Max file size: 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
