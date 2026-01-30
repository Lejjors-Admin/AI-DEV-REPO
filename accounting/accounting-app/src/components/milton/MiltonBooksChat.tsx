import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, 
  Send, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  TrendingUp,
  DollarSign,
  FileText,
  LogIn
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  type: 'user' | 'milton';
  content: string;
  timestamp: Date;
  actions?: MiltonAction[];
  bankAccountSelection?: {
    tempTransactionId: string;
    bankAccounts: Array<{
      id: number;
      name: string;
      type: string;
    }>;
  };
}

interface MiltonAction {
  type: 'setup_coa' | 'classify_transactions' | 'upload_gl' | 'generate_reports';
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
}

interface MiltonBooksChat {
  clientId?: number | null;
}

export default function MiltonBooksChat({ clientId }: MiltonBooksChat) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'milton',
      content: "Hello! I'm Milton, your AI Books assistant. I'm here to make your accounting easier and more accurate.\n\n**I can help you with:**\n\n• **Chart of Accounts Setup** - Create a comprehensive account structure tailored to your business\n• **Transaction Classification** - Automatically categorize transactions using AI\n• **Data Import** - Upload Excel or CSV files with your financial data\n• **Financial Reporting** - Generate balance sheets, P&L statements, and custom reports\n• **Reconciliation** - Help match and reconcile bank transactions\n• **Compliance** - Ensure your books meet accounting standards\n\n**Pro Tips:**\n- Upload your bank statements or general ledger files for quick setup\n- Ask me specific questions about your accounts or transactions\n- Request reports for any time period\n\nWhat would you like to work on today?",
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query for Chart of Accounts
  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ['/api/chart-of-accounts', clientId],
    enabled: !!clientId,
  });

  // Query for Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions', clientId],
    enabled: !!clientId,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', `/api/milton/chat`, { message, clientId });
    },
    onSuccess: (response) => {
      const miltonMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions || []
      };
      
      setMessages(prev => [...prev, miltonMessage]);
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (clientId) {
        formData.append('clientId', clientId.toString());
      }
      
      return apiRequest('POST', `/api/milton/upload`, formData);
    },
    onSuccess: (response) => {
      const miltonMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions || [],
        bankAccountSelection: response.bankAccountSelection
      };
      
      setMessages(prev => [...prev, miltonMessage]);
      queryClient.invalidateQueries({ queryKey: ['/api/chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: `I had trouble processing your file: ${error.message}. Please make sure it's a valid Excel or CSV file and try again.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    chatMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `Uploading file: ${file.name}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      uploadMutation.mutate(file);
    }
  };

  const executeAction = async (action: MiltonAction) => {
    const actionMessage: Message = {
      id: Date.now().toString(),
      type: 'milton',
      content: `Executing: ${action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}...`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, actionMessage]);
    
    // Execute the action via API
    try {
      const response = await apiRequest('POST', `/api/milton/action`, { action, clientId });
      
      const resultMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: response.message,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, resultMessage]);
      
      // Refresh relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: `Action failed: ${error.message}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleBankAccountSelection = async (tempTransactionId: string, bankAccountId: number) => {
    try {
      const response = await apiRequest('POST', `/api/milton/select-bank-account`, { tempTransactionId, bankAccountId, clientId });
      
      const resultMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: response.message,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, resultMessage]);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: `Bank account selection failed: ${error.message}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Login Required</CardTitle>
          <p className="text-gray-600">Please log in to access Milton AI Books Assistant</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Bot className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Milton AI</h3>
            <p className="text-sm text-gray-500">Books Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={user ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200"}>
            {user ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
            {user ? "Ready" : "Please Log In"}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <BookOpen className="h-5 w-5 text-blue-600 mb-1" />
            <span className="text-sm font-medium">{Array.isArray(chartOfAccounts) ? chartOfAccounts.length : 0}</span>
            <span className="text-xs text-gray-500">Accounts</span>
          </div>
          <div className="flex flex-col items-center">
            <TrendingUp className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-sm font-medium">{Array.isArray(transactions) ? transactions.length : 0}</span>
            <span className="text-xs text-gray-500">Transactions</span>
          </div>
          <div className="flex flex-col items-center">
            <DollarSign className="h-5 w-5 text-purple-600 mb-1" />
            <span className="text-sm font-medium">
              {Array.isArray(transactions) ? transactions.filter((t: any) => t.status === 'classified').length : 0}
            </span>
            <span className="text-xs text-gray-500">Classified</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-lg rounded-br-sm' 
                : 'bg-white border rounded-lg rounded-bl-sm shadow-sm'
            } p-3`}>
              {message.type === 'milton' && (
                <div className="flex items-center mb-2">
                  <Bot className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Milton</span>
                </div>
              )}
              <p className={`text-sm whitespace-pre-wrap ${
                message.type === 'user' ? 'text-white' : 'text-gray-800'
              }`}>
                {message.content}
              </p>
              
              {/* Milton Actions */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => executeAction(action)}
                      className="w-full text-left justify-start"
                    >
                      {action.type === 'setup_coa' && <BookOpen className="h-4 w-4 mr-2" />}
                      {action.type === 'classify_transactions' && <TrendingUp className="h-4 w-4 mr-2" />}
                      {action.type === 'upload_gl' && <FileSpreadsheet className="h-4 w-4 mr-2" />}
                      {action.type === 'generate_reports' && <FileText className="h-4 w-4 mr-2" />}
                      
                      {action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      
                      {action.status === 'processing' && (
                        <div className="ml-auto">
                          <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
                        </div>
                      )}
                      {action.status === 'completed' && (
                        <CheckCircle className="h-3 w-3 ml-auto text-green-600" />
                      )}
                      {action.status === 'error' && (
                        <AlertCircle className="h-3 w-3 ml-auto text-red-600" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Bank Account Selection */}
              {message.bankAccountSelection && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 mb-3">Select which bank account these transactions belong to:</p>
                  <div className="space-y-2">
                    {message.bankAccountSelection.bankAccounts.map((account) => (
                      <Button
                        key={account.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBankAccountSelection(message.bankAccountSelection!.tempTransactionId, account.id)}
                        className="w-full text-left justify-start"
                      >
                        {account.name} ({account.type})
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-400">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg rounded-bl-sm shadow-sm p-3">
              <div className="flex items-center">
                <Bot className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Milton</span>
              </div>
              <div className="flex items-center mt-2">
                <div className="animate-spin h-4 w-4 border border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <div className="flex-1 flex items-center space-x-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Milton about your books, upload files, or request reports..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}