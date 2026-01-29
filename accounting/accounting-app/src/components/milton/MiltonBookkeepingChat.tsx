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
import { apiConfig } from "@/lib/api-config";

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
  const selectedClientId = clientId || user?.clientId;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'milton',
      content: user ? `Hi! I'm Milton, your AI bookkeeping assistant. I can help you:

• Set up your Chart of Accounts automatically
• Upload and process General Ledger data  
• Classify transactions using AI
• Generate financial reports

What would you like to work on today?` : `Hi! I'm Milton, your AI bookkeeping assistant.

⚠️ Please log in to access file upload and Chart of Accounts processing features. 

I can still answer general bookkeeping questions, but you'll need to be authenticated to upload files or process financial data.`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get client's current accounting data
  const { data: chartOfAccounts } = useQuery({
    queryKey: [apiConfig.buildUrl(`/api/clients/${selectedClientId}/chart-of-accounts`)],
    enabled: !!selectedClientId
  });

  const { data: transactions } = useQuery({
    queryKey: [apiConfig.buildUrl(`/api/clients/${selectedClientId}/transactions`)],
    enabled: !!selectedClientId
  });

  // Milton AI chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(apiConfig.buildUrl(`/api/milton/bookkeeping-chat`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          message,
          context: {
            hasChartOfAccounts: chartOfAccounts && Array.isArray(chartOfAccounts) && chartOfAccounts.length > 0,
            transactionCount: transactions && Array.isArray(transactions) ? transactions.length : 0,
            currentAccounts: chartOfAccounts || []
          }
        })
      });
      return await response.json();
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
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: "I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', selectedClientId?.toString() || '');
      
      const response = await fetch(apiConfig.buildUrl(`/api/milton/upload-gl`), {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include session cookies for authentication
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      // Create comprehensive Milton response with automatic import summary
      let miltonContent = response.message;
      
      if (response.accountSummary) {
        const summary = response.accountSummary;
        miltonContent += `\n\n📊 Account Summary Created:\n`;
        if (summary.assets > 0) miltonContent += `• ${summary.assets} Asset accounts\n`;
        if (summary.liabilities > 0) miltonContent += `• ${summary.liabilities} Liability accounts\n`;
        if (summary.equity > 0) miltonContent += `• ${summary.equity} Equity accounts\n`;
        if (summary.income > 0) miltonContent += `• ${summary.income} Income accounts\n`;
        if (summary.expenses > 0) miltonContent += `• ${summary.expenses} Expense accounts\n`;
        if (response.costOfSales > 0) miltonContent += `• ${summary.costOfSales} Cost of Sales accounts\n`;
        
        miltonContent += `\nYour Chart of Accounts is now ready for transaction processing!`;
      }

      const miltonMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: miltonContent,
        timestamp: new Date(),
        actions: response.actions || [],
        bankAccountSelection: response.requiresBankAccountSelection ? {
          tempTransactionId: response.tempTransactionId,
          bankAccounts: response.bankAccounts || []
        } : undefined
      };
      setMessages(prev => [...prev, miltonMessage]);
      
      // Refresh data to show new accounts or transactions
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/chart-of-accounts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${selectedClientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/transactions`] });
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: error.message.includes('authenticated') 
          ? "I need you to be logged in to process file uploads. Please log in and try again."
          : `Upload failed: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  // Bank account selection mutation
  const bankAccountMutation = useMutation({
    mutationFn: async ({ tempTransactionId, bankAccountId }: { tempTransactionId: string; bankAccountId: number }) => {
      const response = await fetch(apiConfig.buildUrl('/api/milton/complete-transaction-import'), {
        method: 'POST',
        body: JSON.stringify({ tempTransactionId, bankAccountId }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete transaction import');
      }
      
      return await response.json();
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
      
      // Refresh transaction data
      queryClient.invalidateQueries({ queryKey: [apiConfig.buildUrl(`/api/clients/${selectedClientId}/transactions`)] });
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'milton',
        content: `Failed to complete transaction import: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleBankAccountSelection = (tempTransactionId: string, bankAccountId: number) => {
    bankAccountMutation.mutate({ tempTransactionId, bankAccountId });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      await chatMutation.mutateAsync(inputValue);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Uploaded: ${file.name}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    uploadMutation.mutate(file);
  };

  // Milton AI automatically works with user's authenticated session

  const executeAction = async (action: MiltonAction) => {
    // Handle Milton actions like setting up COA, classifying transactions, etc.
    const actionMessage: Message = {
      id: Date.now().toString(),
      type: 'milton',
      content: `Executing ${action.type}...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, actionMessage]);
  };

  return (
    <div className="h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
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
                        disabled={bankAccountMutation.isPending}
                        className="w-full text-left justify-start hover:bg-blue-100"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-gray-500">{account.type}</span>
                        </div>
                        {bankAccountMutation.isPending && (
                          <div className="ml-auto">
                            <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg rounded-bl-sm shadow-sm p-3">
              <div className="flex items-center">
                <Bot className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Milton</span>
              </div>
              <div className="flex items-center mt-2">
                <div className="animate-spin h-4 w-4 border border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || !user}
            title={!user ? "Please log in to upload files" : "Upload Excel/CSV files"}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Milton about your bookkeeping..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {user 
            ? "Upload Excel/CSV files or ask Milton to set up your Chart of Accounts"
            : "Please log in to upload files. You can still ask bookkeeping questions."
          }
        </p>
      </div>
    </div>
  );
}