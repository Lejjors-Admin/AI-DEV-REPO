/**
 * Transaction Manager - AI-First Transaction Management System
 * Comprehensive interface for managing all transaction workflows with Milton AI
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateSafe, getTransactionDate } from "@/lib/date-utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Custom Components
import { FileDropZone } from "@/components/FileDropZone";
import TransactionUploadSystem from "@/components/TransactionUploadSystem";
import TransactionClassificationCard from "@/components/TransactionClassificationCard";
import ReceiptManager from "@/components/ReceiptManager";
import RulesManagementTab from "@/components/RulesManagementTab";
import Reconcile from "@/pages/Reconcile";
import ChequeUploadManager from "@/components/cheque/ChequeUploadManager";
import JournalEntriesTab from "@/components/journal/JournalEntriesTab";
import RuleCreationDialog from "@/components/RuleCreationDialog";
import { apiConfig } from "@/lib/api-config";

// Helper function to add JWT token to fetch calls
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
};

// Icons
import {
  Upload,
  Download,
  FileText,
  Search,
  Filter,
  Settings,
  RefreshCw,
  Building2,
  CreditCard,
  ShoppingCart,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Bot,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Save,
  Tag,
  X,
  Plus,
  ArrowRight,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Check,
  ChevronRight,
  ChevronDown,
  Home,
  MessageSquare,
  Calculator,
  PieChart,
  Sparkles,
  RotateCcw,
  Brain,
  Receipt,
  Link,
} from "lucide-react";

interface TransactionManagerProps {
  clientId: number;
}

export default function TransactionManager({
  clientId,
}: TransactionManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState("bank-transactions");
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCategorizationPanel, setShowCategorizationPanel] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [miltonSuggestion, setMiltonSuggestion] = useState<any>(null);
  const [isBankAccountsCollapsed, setIsBankAccountsCollapsed] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Mass Actions State
  const [showMassActionsDialog, setShowMassActionsDialog] = useState(false);
  const [showMiltonAutoClassifyDialog, setShowMiltonAutoClassifyDialog] =
    useState(false);
  const [excludedTransactions, setExcludedTransactions] = useState<number[]>(
    []
  );
  const [massActionAccount, setMassActionAccount] = useState<string>("");
  const [massActionTaxCode, setMassActionTaxCode] = useState<string>("");
  const [massActionVendor, setMassActionVendor] = useState<string>("");
  const [selectedRule, setSelectedRule] = useState<string>("");
  const [massNote, setMassNote] = useState<string>("");

  // Tax settings for rule-based tax mapping
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [defaultTaxSetting, setDefaultTaxSetting] = useState<any>(null);

  // Rule creation dialog state
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [ruleDialogTransaction, setRuleDialogTransaction] = useState<any>(null);

  // Load tax settings for rule-based tax mapping
  const loadTaxSettings = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/tax-settings/${clientId}`),
        {
          headers,
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Set tax settings from data.data when available (matches TransactionClassificationCard pattern)
        if (data.data?.options) {
          setTaxSettings(data.data.options);
          setDefaultTaxSetting(data.data.default);
        }
      }
    } catch (error) {
      console.error("Error loading tax settings for rules:", error);
    }
  };

  // Data fetching - Core data (always needed)
  const {
    data: transactionsData = [],
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: [`/api/transactions`, clientId],
    queryFn: async () => {
      const response = await fetchWithAuth(
        apiConfig.buildUrl(`/api/transactions?clientId=${clientId}`)
      );
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!clientId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];

  // Fetch all transactions (including excluded ones for excluded tab)
  const {
    data: allTransactionsData = [],
    isLoading: isLoadingAllTransactions,
    refetch: refetchAllTransactions,
  } = useQuery({
    queryKey: [`/api/transactions`, clientId, 'all'],
    queryFn: async () => {
      const response = await fetchWithAuth(
        apiConfig.buildUrl(`/api/transactions?clientId=${clientId}&includeExcluded=true`)
      );
      if (!response.ok) throw new Error("Failed to fetch all transactions");
      return response.json();
    },
    enabled: !!clientId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const allTransactions = Array.isArray(allTransactionsData) ? allTransactionsData : [];

  // Helper function to refetch both transaction queries
  const refetchAllTransactionQueries = () => {
    refetchTransactions();
    refetchAllTransactions();
  };

  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: [`/api/accounts`, clientId],
    queryFn: async () => {
      console.log(`🔍 Fetching accounts for client ${clientId}`);
      const response = await fetchWithAuth(
        apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`)
      );
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      console.log(
        `✅ Received ${
          data.accounts
            ? data.accounts.length
            : Array.isArray(data)
            ? data.length
            : 0
        } accounts for client ${clientId}`
      );
      return data;
    },
    enabled: !!clientId,
    staleTime: 5000, // Reduced cache time to 5 seconds for faster updates
  });

  const accounts = (() => {
    try {
      if (Array.isArray(accountsData)) {
        return accountsData;
      }
      if (
        accountsData &&
        typeof accountsData === "object" &&
        "accounts" in accountsData
      ) {
        const accountsArray = (accountsData as any).accounts;
        if (Array.isArray(accountsArray)) {
          return accountsArray;
        }
      }
      return [];
    } catch (error) {
      console.error("Error processing accounts data:", error);
      return [];
    }
  })();

  // Secondary data - only load when needed
  const { data: bankFeeds = [], isLoading: isLoadingBankFeeds } = useQuery({
    queryKey: [`/api/bank-feeds`, clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/bank-feeds?clientId=${clientId}`),
        {
          headers,
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch bank feeds");
      return response.json();
    },
    enabled: !!clientId && activeTab === "bank-feeds", // Only load when tab is active
    staleTime: 60000,
  });

  

   // Fetch transaction rules for AI/Rule column indicators
   const { data: rulesData = [], isLoading: isLoadingRules } = useQuery({
    queryKey: [`/api/rules`, clientId],
    queryFn: async () => {
      console.log(`🔍 Fetching rules for client ${clientId}`);
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/rules?clientId=${clientId}`), {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      console.log(`✅ Received ${data.rules ? data.rules.length : 0} rules for client ${clientId}`);
      return data.rules || [];
    },
    enabled: !!clientId && activeTab === 'bank-transactions', // Only load when transactions tab is active
    staleTime: 60000, // Cache for 1 minute
  });

  const rules = Array.isArray(rulesData) ? rulesData : [];

  // Fetch bills for bill matching
  const { data: billsData = [], isLoading: isLoadingBills } = useQuery({
    queryKey: ["bills", clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/bills/${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) throw new Error("Failed to fetch bills");
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId && activeTab === "bank-transactions",
    staleTime: 60000, // Cache for 1 minute
  });

  const bills = Array.isArray(billsData) ? billsData : [];

  // Fetch invoices for invoice matching (for positive transactions/income)
  const { data: invoicesData = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices", clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/invoices/${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId && activeTab === "bank-transactions",
    staleTime: 60000, // Cache for 1 minute
  });

  const invoices = Array.isArray(invoicesData) ? invoicesData : [];

  // Debug: Log bills, invoices and transactions for troubleshooting
  useEffect(() => {
    if (bills.length > 0) {
      console.log(`📋 Loaded ${bills.length} bills for matching:`, bills);
    }
    if (invoices.length > 0) {
      console.log(`📄 Loaded ${invoices.length} invoices for matching:`, invoices);
    }
    if (transactions.length > 0) {
      console.log(`💳 Loaded ${transactions.length} transactions for matching`);
    }
  }, [bills.length, invoices.length, transactions.length]);

  // Fetch contacts (vendors and customers) for bill and invoice matching
  const { data: contactsData = [] } = useQuery({
    queryKey: ["contacts", clientId],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch all contacts (both vendors and customers)
      const response = await fetch(
        apiConfig.buildUrl(`/api/crm/contacts/${clientId}`),
        {
          credentials: "include",
          headers,
        }
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId && activeTab === "bank-transactions",
    staleTime: 60000,
  });

  const contacts = Array.isArray(contactsData) ? contactsData : [];

  // Load tax settings on component mount
  useEffect(() => {
    if (clientId) {
      loadTaxSettings();
    }
  }, [clientId]);

  // Auto-fetch Milton suggestions when transaction is selected (debounced)
  useEffect(() => {
    if (selectedTransaction && selectedTransaction.description) {
      const debitAmount = parseFloat(selectedTransaction.debitAmount || 0);
      const creditAmount = parseFloat(selectedTransaction.creditAmount || 0);
      const amount = Math.max(debitAmount, creditAmount);

      // Debounce AI suggestions to avoid excessive API calls
      const timer = setTimeout(() => {
        fetchMiltonSuggestion(selectedTransaction.description, amount);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [selectedTransaction]);

  const fetchMiltonSuggestion = async (description: string, amount: number) => {
    try {
      if (!clientId || !description || !selectedTransaction) {
        setMiltonSuggestion(null);
        return;
      }

      // Extract debit/credit amounts from the selected transaction
      const debitAmount = selectedTransaction.debitAmount || 0;
      const creditAmount = selectedTransaction.creditAmount || 0;
      const sourceAccountId = selectedTransaction.accountId;

      console.log(`🤖 Milton analyzing: "${description}" - Debit: $${debitAmount}, Credit: $${creditAmount}`);
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl('/api/milton/categorize-smart'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ 
          description,
          amount,
          clientId
        })
      });
      
      if (response.ok) {
        const suggestion = await response.json();
        console.log('🎯 Enhanced analysis received:', suggestion);
        setMiltonSuggestion(suggestion);
      } else {
        const error = await response.text();
        console.error('Milton suggestion failed:', error);
        setMiltonSuggestion(null);
      }
    } catch (error) {
      console.warn('Milton suggestion error:', error);
      setMiltonSuggestion(null);
    }
  };

  // Save transaction handler with double-entry accounting
  const handleSaveTransaction = async (transaction: any) => {
    try {
      if (!transaction.accountId) {
        toast({
          title: "Please select an account",
          description: "An account is required for categorization",
          variant: "destructive",
        });
        return;
      }

      console.log("🔍 Saving transaction:", transaction);

      // Use the classification save endpoint which handles HST properly
      const classificationData = {
        transactionId: transaction.id,
        clientId: clientId,
        classification: {
          accountId: transaction.accountId,
          category: transaction.category || "General",
          taxCode: transaction.taxCode || "HST",
          contactId: transaction.contactId || null,
          contactType: transaction.contactType || null,
          projectId: transaction.projectId || null,
          locationId: transaction.locationId || null,
          classId: transaction.classId || null,
          memo: transaction.memo || "Manual categorization",
          hstCalculation: transaction.hstCalculation || null,
        },
      };

      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl("/api/transactions/classification/save"),
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(classificationData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Transaction saved successfully:", result);

        queryClient.invalidateQueries({
          queryKey: [`/api/transactions`, clientId],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/journal-entries`, clientId],
        });
        queryClient.invalidateQueries({
          queryKey: ["bills", clientId],
        });
        queryClient.invalidateQueries({
          queryKey: ["invoices", clientId],
        });
        setSelectedTransaction(null);

        toast({
          title: "Success",
          description: "Transaction categorized and journal entry created",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save transaction");
      }
    } catch (error) {
      console.error("Save transaction failed:", error);
      toast({
        title: "Save failed",
        description: "Could not save transaction changes",
        variant: "destructive",
      });
    }
  };

  // Categorize transaction handler
  const handleCategorizeTransaction = async (transaction: any) => {
    console.log("Categorize button clicked for transaction:", transaction.id);

    if (!transaction.accountId) {
      toast({
        title: "Account required",
        description: "Please select an account before categorizing",
        variant: "destructive",
      });
      return;
    }

    try {
      const accountId =
        typeof transaction.accountId === "string"
          ? parseInt(transaction.accountId)
          : transaction.accountId;
      const targetAccount = accounts.find((acc: any) => acc.id === accountId);

      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/transactions/${transaction.id}`),
        {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            ...transaction,
            accountId: accountId,
            status: "categorized",
            category: targetAccount?.name || "Categorized",
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Transaction categorized",
          description: `Assigned to ${
            targetAccount?.name || "Selected account"
          }`,
        });
        refetchAllTransactionQueries();
        setShowTransactionDetail(false);
        setSelectedTransaction(null);
      } else {
        throw new Error("Failed to categorize transaction");
      }
    } catch (error) {
      console.error("Categorization error:", error);
      toast({
        title: "Categorization failed",
        description: "Could not categorize transaction",
        variant: "destructive",
      });
    }
  };

  // Add rule handler - Opens dialog for user to configure rule
  const handleAddRule = async (transaction: any) => {
    console.log("Add Rule button clicked for transaction:", transaction.id);
    setRuleDialogTransaction(transaction);
    setIsRuleDialogOpen(true);
  };

  // Submit rule from dialog
  const handleSubmitRule = async (ruleData: {
    pattern: string;
    accountId: number;
    taxSettingId: string | null;
    confidence: number;
  }) => {
    try {
      const targetAccount = accounts.find((acc: any) => acc.id === ruleData.accountId);
      
      // Find the tax setting name for display
      const taxSetting = ruleData.taxSettingId 
        ? taxSettings.find(t => t.id === ruleData.taxSettingId)
        : null;
      
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/transaction-rules", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          clientId,
          pattern: ruleData.pattern,
          accountId: ruleData.accountId,
          taxSettingId: ruleData.taxSettingId,
          confidence: ruleData.confidence,
          isActive: true,
        }),
      });

      if (response.ok) {
        const taxInfo = taxSetting 
          ? ` with ${taxSetting.name} tax (${(taxSetting.rate * 100).toFixed(1)}%)`
          : "";
        toast({
          title: "Rule created",
          description: `Future transactions matching "${ruleData.pattern}" will automatically be assigned to ${targetAccount?.name}${taxInfo}`,
        });
      } else {
        throw new Error("Failed to create rule");
      }
    } catch (error) {
      console.error("Add rule error:", error);
      toast({
        title: "Rule creation failed",
        description: "Could not create automatic categorization rule",
        variant: "destructive",
      });
    }
  };

  // Exclude transaction handler
  const handleExcludeTransaction = async (transaction: any) => {
    console.log("Exclude button clicked for transaction:", transaction.id);

    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/transactions/${transaction.id}`),
        {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            ...transaction,
            classificationStatus: "excluded",
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Transaction excluded",
          description: "Transaction will not appear in reports",
        });
        // Invalidate and refetch all transaction queries
        queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId] });
        queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId, 'all'] });
        refetchAllTransactionQueries();
        setShowTransactionDetail(false);
        setSelectedTransaction(null);
      } else {
        throw new Error("Failed to exclude transaction");
      }
    } catch (error) {
      console.error("Exclude error:", error);
      toast({
        title: "Exclude failed",
        description: "Could not exclude transaction",
        variant: "destructive",
      });
    }
  };

  // Mutations
  const categorizeMutation = useMutation({
    mutationFn: async (transactionData: any[]) => {
      const response = await apiRequest("POST", `/api/milton/categorize`, {
        clientId,
        transactions: transactionData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const { summary } = data;
      toast({
        title: "Milton categorization complete",
        description: `Processed ${summary.total} transactions: ${summary.ruleBasedCount} rule-based, ${summary.aiVerifiedCount} AI-verified`,
      });
      refetchAllTransactionQueries();
      setSelectedTransactions([]);
    },
    onError: (error) => {
      toast({
        title: "Categorization failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    },
  });

  // Bulk exclude mutation
  const bulkExcludeMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const promises = transactionIds.map(async (id) => {
        const response = await fetch(apiConfig.buildUrl(`/api/transactions/${id}`), {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({ classificationStatus: "excluded" }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to exclude transaction ${id}: ${response.status} ${response.statusText}`);
        }
        
        return response;
      });
      
      return Promise.all(promises);
    },
    onSuccess: (_, transactionIds) => {
      toast({
        title: "Bulk Exclude Complete",
        description: `${transactionIds.length} transactions excluded`,
      });
      // Invalidate and refetch all transaction queries
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId, 'all'] });
      refetchAllTransactionQueries();
      setSelectedTransactions([]);
    },
    onError: (error: any) => {
      console.error("Bulk exclude error:", error);
      toast({
        title: "Bulk exclude failed",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Bulk apply rule mutation
  const bulkApplyRuleMutation = useMutation({
    mutationFn: async (data: { transactionIds: number[]; ruleId: string }) => {
      const response = await apiRequest("POST", `/api/rules/apply-bulk`, {
        clientId,
        transactionIds: data.transactionIds,
        ruleId: data.ruleId,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Rule Applied",
        description: `Applied rule to ${variables.transactionIds.length} transactions`,
      });
      refetchAllTransactionQueries();
      setSelectedTransactions([]);
    },
    onError: () => {
      toast({
        title: "Rule application failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Mass note addition mutation
  const addMassNoteMutation = useMutation({
    mutationFn: async (data: { transactionIds: number[]; note: string }) => {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const promises = data.transactionIds.map((id) =>
        fetch(apiConfig.buildUrl(`/api/transactions/${id}`), {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            memo: data.note,
            notes: data.note,
          }),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Notes Added",
        description: `Added note to ${variables.transactionIds.length} transactions`,
      });
      refetchAllTransactionQueries();
      setSelectedTransactions([]);
    },
    onError: () => {
      toast({
        title: "Failed to add notes",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Restore transaction mutation (single)
  const restoreTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        apiConfig.buildUrl(`/api/transactions/${transactionId}`),
        {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({ classificationStatus: "unclassified" }), // Change from 'excluded' back to 'unclassified'
        }
      );
      if (!response.ok) throw new Error("Failed to restore transaction");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction Restored",
        description: "Transaction is now back in your transaction list",
      });
      // Invalidate and refetch all transaction queries
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId, 'all'] });
      refetchAllTransactionQueries();
    },
    onError: () => {
      toast({
        title: "Restore failed",
        description: "Could not restore transaction",
        variant: "destructive",
      });
    },
  });

  // Bulk restore mutation
  const bulkRestoreMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const promises = transactionIds.map(async (id) => {
        const response = await fetch(apiConfig.buildUrl(`/api/transactions/${id}`), {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({ classificationStatus: "unclassified" }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to restore transaction ${id}: ${response.status} ${response.statusText}`);
        }
        
        return response;
      });
      
      return Promise.all(promises);
    },
    onSuccess: (_, transactionIds) => {
      toast({
        title: "Bulk Restore Complete",
        description: `${transactionIds.length} transactions restored`,
      });
      // Invalidate and refetch all transaction queries
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions`, clientId, 'all'] });
      refetchAllTransactionQueries();
      setSelectedTransactions([]);
    },
    onError: (error: any) => {
      console.error("Bulk restore error:", error);
      toast({
        title: "Bulk restore failed",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(balance);
  };

  const formatAmount = (transaction: any) => {
    const debitAmount = parseFloat(transaction.debitAmount || 0);
    const creditAmount = parseFloat(transaction.creditAmount || 0);
    const amount = Math.max(debitAmount, creditAmount);

    // CORRECTED: For bank account perspective in double-entry bookkeeping:
    // Debit to bank account = money coming IN (asset increase) = green/positive
    // Credit to bank account = money going OUT (asset decrease) = red/negative
    const isMoneyIn = debitAmount > 0; // Debit to bank means money coming in

    return {
      value: new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(amount),
      color: isMoneyIn ? "text-green-600" : "text-red-600",
      sign: isMoneyIn ? "+" : "-",
    };
  };

  // Filter transactions based on search, status, and selected account with error handling
  const filteredTransactions = (() => {
    try {
      if (!Array.isArray(transactions)) {
        console.warn("Transactions data is not an array:", transactions);
        return [];
      }

      return transactions.filter((transaction: any) => {
        try {
          // Ensure transaction object exists
          if (!transaction || typeof transaction !== "object") {
            return false;
          }

          // Exclude transactions with classificationStatus='excluded' from main view
          if (transaction.classificationStatus === "excluded") {
            return false;
          }

          // Filter out zero-amount transactions
          const debitAmount = parseFloat(transaction.debitAmount || 0);
          const creditAmount = parseFloat(transaction.creditAmount || 0);
          const hasAmount = debitAmount > 0 || creditAmount > 0;

          if (!hasAmount) return false;

          // Safe string matching
          const description = transaction.description || "";
          const matchesSearch =
            !searchQuery ||
            description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            debitAmount.toString().includes(searchQuery) ||
            creditAmount.toString().includes(searchQuery);

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "uncategorized" &&
              !transaction.category &&
              transaction.status !== "completed" &&
              transaction.status !== "categorized") ||
            (statusFilter === "categorized" &&
              (transaction.category ||
                transaction.status === "completed" ||
                transaction.status === "categorized"));

          // When filtering by bank account, show all transactions that:
          // 1. Currently have that bank account as accountId (uncategorized)
          // 2. Were originally imported from that bank account but now categorized to other accounts (sourceAccountId)
          const matchesAccount =
            !selectedAccount ||
            transaction.accountId === selectedAccount.id ||
            transaction.sourceAccountId === selectedAccount.id;

          return matchesSearch && matchesStatus && matchesAccount;
        } catch (filterError) {
          console.error(
            "Error filtering transaction:",
            filterError,
            transaction
          );
          return false;
        }
      });
    } catch (error) {
      console.error("Error in transaction filtering:", error);
      return [];
    }
  })();

  // Filter excluded transactions for the excluded tab
  const filteredExcludedTransactions = (() => {
    try {
      if (!Array.isArray(allTransactions)) {
        console.warn("All transactions data is not an array:", allTransactions);
        return [];
      }

      return allTransactions.filter((transaction: any) => {
        try {
          // Ensure transaction object exists
          if (!transaction || typeof transaction !== "object") {
            return false;
          }

          // Only show transactions with classificationStatus='excluded'
          if (transaction.classificationStatus !== "excluded") {
            return false;
          }

          // Filter out zero-amount transactions
          const debitAmount = parseFloat(transaction.debitAmount || 0);
          const creditAmount = parseFloat(transaction.creditAmount || 0);
          const hasAmount = debitAmount > 0 || creditAmount > 0;

          if (!hasAmount) return false;

          // Safe string matching
          const description = transaction.description || "";
          const matchesSearch =
            !searchQuery ||
            description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            debitAmount.toString().includes(searchQuery) ||
            creditAmount.toString().includes(searchQuery);

          // When filtering by bank account, show all transactions that:
          // 1. Currently have that bank account as accountId (uncategorized)
          // 2. Were originally imported from that bank account but now categorized to other accounts (sourceAccountId)
          const matchesAccount =
            !selectedAccount ||
            transaction.accountId === selectedAccount.id ||
            transaction.sourceAccountId === selectedAccount.id;

          return matchesSearch && matchesAccount;
        } catch (filterError) {
          console.error(
            "Error filtering excluded transaction:",
            filterError,
            transaction
          );
          return false;
        }
      });
    } catch (error) {
      console.error("Error in excluded transaction filtering:", error);
      return [];
    }
  })();

  const normalizeDate = (dateValue: any): string => {
    if (!dateValue && dateValue !== 0) return '';
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      // Convert to local timezone to avoid timezone conversion issues
      const localDate = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 12, 0, 0, 0);
      return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    
    // Handle numbers (Excel serial dates)
    if (typeof dateValue === 'number') {
      if (dateValue > 25569 && dateValue < 100000) { // Excel serial date range
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        // Convert to local timezone to avoid timezone conversion issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      // Could be a timestamp
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        // Convert to local timezone to avoid timezone conversion issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        return localDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }
    
    // Handle strings
    const dateString = String(dateValue).trim();
    if (!dateString) return '';
    
    // Check if it's already in YYYY-MM-DD format (like your CSV data)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Already in correct format, return as-is to avoid timezone conversion
      return dateString;
    }
    
    // If in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ), extract just the date part
    // This prevents timezone conversion issues when deployed on AWS (UTC timezone)
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
      return dateString.split('T')[0]; // Extract YYYY-MM-DD
    }
    
    // If it's a numeric string, treat as Excel serial
    if (!isNaN(Number(dateString))) {
      const serial = Number(dateString);
      if (serial > 25569 && serial < 100000) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        // Extract date components in UTC to avoid timezone shifts
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      }
    }
    
    // Try parsing various string formats
    const formats = [
      dateString,
      // Handle MM/DD/YYYY to YYYY-MM-DD
      dateString.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'),
      dateString.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'),
      // Handle DD-MM-YYYY to YYYY-MM-DD  
      dateString.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$1-$2'),
      dateString.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$2-$1')
    ];
    
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        // Extract date components in UTC to avoid timezone shifts (critical for AWS deployment)
        // This ensures the date stays the same regardless of server/client timezone
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      }
    }
    
    return '';
  };

  // Rule matching utility function
  const matchTransactionToRule = (transaction: any, rule: any): boolean => {
    if (!rule.is_active || !transaction.description) return false;

    const description = transaction.description.toLowerCase();
    const pattern = (rule.pattern || "").toLowerCase();

    if (!pattern) return false;

    switch (rule.match_type || "contains") {
      case "exact":
        return description === pattern;
      case "starts_with":
        return description.startsWith(pattern);
      case "ends_with":
        return description.endsWith(pattern);
      case "contains":
      default:
        return description.includes(pattern);
    }
  };

  // Bill matching utility function
  const matchTransactionToBill = (transaction: any, bill: any, contact: any): number => {
    let matchScore = 0;
    const maxScore = 100;

    // Get transaction amount (use absolute value for comparison)
    const transactionAmount = Math.abs(
      parseFloat(transaction.debitAmount || 0) || 
      parseFloat(transaction.creditAmount || 0)
    );
    
    // Get bill amount
    const billAmount = parseFloat(bill.totalAmount || 0);

    // Amount matching (50 points) - allow 1% tolerance for exact match, more for close matches
    if (transactionAmount > 0 && billAmount > 0) {
      const amountDiff = Math.abs(transactionAmount - billAmount);
      const tolerance = billAmount * 0.01; // 1% tolerance
      if (amountDiff <= tolerance) {
        matchScore += 50; // Exact amount match gets 50 points (enough to show)
      } else if (amountDiff <= billAmount * 0.05) {
        matchScore += 35; // Partial match for 5% tolerance
      } else if (amountDiff <= billAmount * 0.10) {
        matchScore += 20; // Close match for 10% tolerance
      }
    }

    // Date matching (30 points) - within 30 days
    try {
      const transactionDateValue = getTransactionDate(transaction);
      const billDateValue = bill.billDate;
      
      if (transactionDateValue && billDateValue && billDateValue !== null) {
        const transactionDate = new Date(transactionDateValue);
        const billDateStr = String(billDateValue);
        const billDate = new Date(billDateStr);
        
        if (!isNaN(transactionDate.getTime()) && !isNaN(billDate.getTime())) {
          const daysDiff = Math.abs(
            (transactionDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff <= 7) {
            matchScore += 30; // Within 7 days
          } else if (daysDiff <= 14) {
            matchScore += 20; // Within 14 days
          } else if (daysDiff <= 30) {
            matchScore += 10; // Within 30 days
          }
        }
      }
    } catch (e) {
      // Date parsing error, skip date matching
    }

    // Vendor/Description matching (30 points)
    if (contact && transaction.description) {
      const description = transaction.description.toLowerCase();
      const vendorName = (contact.name || "").toLowerCase();
      const companyName = (contact.companyName || "").toLowerCase();
      
      let vendorMatchPoints = 0;
      if (vendorName && description.includes(vendorName)) {
        vendorMatchPoints += 20;
      }
      if (companyName && description.includes(companyName)) {
        vendorMatchPoints += 20;
      }
      // Cap vendor matching at 30 points
      matchScore += Math.min(vendorMatchPoints, 30);
    }

    return matchScore;
  };

  // Invoice matching utility function (similar to bill matching)
  const matchTransactionToInvoice = (transaction: any, invoice: any, contact: any): number => {
    let matchScore = 0;
    const maxScore = 100;

    // Get transaction amount (use absolute value for comparison)
    const transactionAmount = Math.abs(
      parseFloat(transaction.debitAmount || 0) || 
      parseFloat(transaction.creditAmount || 0)
    );
    
    // Get invoice amount
    const invoiceAmount = parseFloat(invoice.totalAmount || 0);

    // Amount matching (50 points) - allow 1% tolerance for exact match, more for close matches
    if (transactionAmount > 0 && invoiceAmount > 0) {
      const amountDiff = Math.abs(transactionAmount - invoiceAmount);
      const tolerance = invoiceAmount * 0.01; // 1% tolerance
      if (amountDiff <= tolerance) {
        matchScore += 50; // Exact amount match gets 50 points (enough to show)
      } else if (amountDiff <= invoiceAmount * 0.05) {
        matchScore += 35; // Partial match for 5% tolerance
      } else if (amountDiff <= invoiceAmount * 0.10) {
        matchScore += 20; // Close match for 10% tolerance
      }
    }

    // Date matching (30 points) - within 30 days
    try {
      const transactionDateValue = getTransactionDate(transaction);
      const invoiceDateValue = invoice.invoiceDate;
      
      if (transactionDateValue && invoiceDateValue && invoiceDateValue !== null && invoiceDateValue !== undefined) {
        const transactionDate = new Date(transactionDateValue);
        const invoiceDateStr = String(invoiceDateValue);
        const invoiceDate = new Date(invoiceDateStr);
        
        if (!isNaN(transactionDate.getTime()) && !isNaN(invoiceDate.getTime())) {
          const daysDiff = Math.abs(
            (transactionDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff <= 7) {
            matchScore += 30; // Within 7 days
          } else if (daysDiff <= 14) {
            matchScore += 20; // Within 14 days
          } else if (daysDiff <= 30) {
            matchScore += 10; // Within 30 days
          }
        }
      }
    } catch (e) {
      // Date parsing error, skip date matching
    }

    // Customer/Description matching (30 points)
    if (contact && transaction.description) {
      const description = transaction.description.toLowerCase();
      const customerName = (contact.name || "").toLowerCase();
      const companyName = (contact.companyName || "").toLowerCase();
      
      let customerMatchPoints = 0;
      if (customerName && description.includes(customerName)) {
        customerMatchPoints += 20;
      }
      if (companyName && description.includes(companyName)) {
        customerMatchPoints += 20;
      }
      // Cap customer matching at 30 points
      matchScore += Math.min(customerMatchPoints, 30);
    }

    return matchScore;
  };

  // Enhanced transactions with rule matching and AI suggestions
  const enhancedTransactions = filteredTransactions.map((transaction: any) => {
    const enhancedTransaction = { ...transaction };

    // Find matching rules for this transaction
    const matchingRules = rules.filter((rule) =>
      matchTransactionToRule(transaction, rule)
    );

    if (matchingRules.length > 0) {
      // Use the first matching rule (highest priority) but keep all matches
      const bestRule = matchingRules[0];
      const account = accounts.find((acc) => acc.id === bestRule.account_id);

      enhancedTransaction.ruleMatched = {
        id: bestRule.id,
        name: bestRule.name,
        pattern: bestRule.pattern,
        matchType: bestRule.match_type,
        confidence: 0.85, // Rule-based confidence
        accountId: bestRule.account_id,
        accountName: account?.name || "Unknown Account",
        taxAccountId: bestRule.tax_account_id, // Include tax account for proper tax code detection
      };

      // Add all matching rules for detailed view (normalize to camelCase for consistency)
      enhancedTransaction.allMatchingRules = matchingRules.map((rule) => {
        const ruleAccount = accounts.find((acc) => acc.id === rule.account_id);
        return {
          id: rule.id,
          name: rule.name,
          pattern: rule.pattern,
          matchType: rule.match_type,
          accountId: rule.account_id,
          accountName: ruleAccount?.name || "Unknown Account",
          taxAccountId: rule.tax_account_id,
          isActive: rule.is_active,
        };
      });
      enhancedTransaction.ruleMatchCount = matchingRules.length;
    }

    // Find matching bills for negative transactions (expenses)
    // Find matching invoices for positive transactions (income)
    const debitAmount = parseFloat(transaction.debitAmount || 0);
    const creditAmount = parseFloat(transaction.creditAmount || 0);
    const transactionAmount = Math.abs(debitAmount || creditAmount);
    
    // Check if this is an expense (money going out) or income (money coming in)
    // In this system: creditAmount > 0 means money going OUT (expense/negative display)
    // debitAmount > 0 means money coming IN (income/positive display)
    const isExpense = creditAmount > 0 && debitAmount === 0;
    const isIncome = debitAmount > 0 && creditAmount === 0;

    // Match bills for expenses (negative transactions)
    if (transactionAmount > 0 && isExpense && bills.length > 0) {
      const billMatches = bills
        .map((bill: any) => {
          const contact = contacts.find((c: any) => c.id === bill.contactId);
          const score = matchTransactionToBill(transaction, bill, contact);
          // Debug logging for troubleshooting
          if (score > 0) {
            console.log(`🔍 Bill Match Check:`, {
              transaction: transaction.description,
              transactionAmount,
              billNumber: bill.billNumber,
              billAmount: parseFloat(bill.totalAmount || 0),
              contactName: contact?.name || contact?.companyName || 'No contact',
              score
            });
          }
          return { bill, contact, score };
        })
        .filter((match) => match.score >= 40) // Only show matches with 40%+ confidence (amount match alone is enough)
        .sort((a, b) => b.score - a.score); // Sort by score descending

      if (billMatches.length > 0) {
        const bestMatch = billMatches[0];
        console.log(`✅ Bill Match Found:`, {
          transaction: transaction.description,
          totalMatches: billMatches.length,
          bestMatch: bestMatch.bill.billNumber,
          score: bestMatch.score
        });
        enhancedTransaction.billMatch = {
          bill: bestMatch.bill,
          contact: bestMatch.contact,
          score: bestMatch.score,
          allMatches: billMatches, // Keep all matches for user selection
        };
      }
    }

    // Find matching invoices for positive transactions (income)
    if (transactionAmount > 0 && isIncome && invoices.length > 0) {
      const invoiceMatches = invoices
        .map((invoice: any) => {
          const contact = contacts.find((c: any) => c.id === invoice.contactId);
          const score = matchTransactionToInvoice(transaction, invoice, contact);
          // Debug logging for troubleshooting
          if (score > 0) {
            console.log(`🔍 Invoice Match Check:`, {
              transaction: transaction.description,
              transactionAmount,
              invoiceNumber: invoice.invoiceNumber,
              invoiceAmount: parseFloat(invoice.totalAmount || 0),
              contactName: contact?.name || contact?.companyName || 'No contact',
              score
            });
          }
          return { invoice, contact, score };
        })
        .filter((match: any) => match.score >= 40) // Only show matches with 40%+ confidence
        .sort((a: any, b: any) => b.score - a.score); // Sort by score descending

      if (invoiceMatches.length > 0) {
        const bestMatch = invoiceMatches[0];
        console.log(`✅ Invoice Match Found:`, {
          transaction: transaction.description,
          totalMatches: invoiceMatches.length,
          bestMatch: bestMatch.invoice.invoiceNumber,
          score: bestMatch.score
        });
        enhancedTransaction.invoiceMatch = {
          invoice: bestMatch.invoice,
          contact: bestMatch.contact,
          score: bestMatch.score,
          allMatches: invoiceMatches, // Keep all matches for user selection
        };
      }
    }

    // Add AI suggestion for uncategorized transactions without rule matches
    if (
      !enhancedTransaction.ruleMatched &&
      (!transaction.category || transaction.category === "Uncategorized") &&
      transaction.status !== "categorized"
    ) {
      // Placeholder AI suggestion - in production this would be fetched from Milton API
      // For now, we'll mark it as available for AI analysis
      enhancedTransaction.aiSuggestion = {
        available: true,
        confidence: null,
        accountId: null,
        accountName: "AI Analysis Available",
      };
    }

    return enhancedTransaction;
  });

  // Add loading state and error handling
  if (isLoadingTransactions || isLoadingAccounts) {
    return (
      <div className="flex-1 min-h-0 w-full bg-background flex flex-col lg:flex-row">
        {/* Loading Skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-muted/50 rounded animate-pulse"></div>
              <div className="w-32 h-10 bg-muted/50 rounded animate-pulse"></div>
              <div className="w-24 h-10 bg-muted/50 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-3">
            {/* Transaction rows skeleton */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="w-4 h-4 bg-muted/50 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-muted/50 rounded animate-pulse w-1/2"></div>
                </div>
                <div className="w-24 h-4 bg-muted/50 rounded animate-pulse"></div>
                <div className="w-20 h-6 bg-muted/50 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="w-80 border-l bg-muted/30 p-4 space-y-4">
          <div className="h-6 bg-muted/50 rounded animate-pulse"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-4 bg-muted/50 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full max-w-none bg-background flex flex-col lg:flex-row">
      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          showTransactionDetail
            ? "hidden lg:block lg:flex-1"
            : "w-full max-w-none"
        } flex-1 min-h-0 flex flex-col min-w-0`}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col w-full max-w-none min-w-0"
        >
          <div className="flex-shrink-0 border-b bg-background">
            <TabsList className="grid w-full grid-cols-6 h-6 sm:h-7">
              <TabsTrigger
                value="bank-transactions"
                className="text-xs px-1 py-0.5"
              >
                <span className="hidden sm:inline">Bank</span>
                <span className="sm:hidden">💳</span>
              </TabsTrigger>
              <TabsTrigger
                value="journal-entries"
                className="text-xs px-1 py-0.5"
              >
                <span className="hidden sm:inline">Journal</span>
                <span className="sm:hidden">📋</span>
              </TabsTrigger>
              <TabsTrigger value="receipts" className="text-xs px-1 py-0.5">
                <span className="hidden sm:inline">Receipts</span>
                <span className="sm:hidden">📄</span>
              </TabsTrigger>
              <TabsTrigger
                value="excluded"
                className="text-xs px-1 py-0.5 relative"
              >
                <span className="hidden sm:inline">Excluded</span>
                <span className="sm:hidden">🚫</span>
                {filteredExcludedTransactions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {filteredExcludedTransactions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs px-1 py-0.5">
                <span className="hidden sm:inline">Rules</span>
                <span className="sm:hidden">⚙️</span>
              </TabsTrigger>
              <TabsTrigger value="reconcile" className="text-xs px-1 py-0.5">
                <span className="hidden sm:inline">Reconcile</span>
                <span className="sm:hidden">✅</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Bank Transactions Tab */}
          <TabsContent value="bank-transactions" className="p-3">
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Header Controls */}
              <div className="p-2 sm:p-4 border-b space-y-3 sm:space-y-4">
                {/* Prominent Milton Auto-Classification Banner */}
                {filteredTransactions.filter(
                  (t: any) => !t.accountId || t.status === "uncategorized"
                ).length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">
                            Auto-Categorize with Milton AI
                          </h3>
                          <p className="text-sm text-blue-700">
                            {
                              filteredTransactions.filter(
                                (t: any) =>
                                  !t.accountId || t.status === "uncategorized"
                              ).length
                            }{" "}
                            uncategorized transactions ready for AI processing
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const uncategorized = filteredTransactions.filter(
                            (t: any) =>
                              !t.accountId || t.status === "uncategorized"
                          );
                          categorizeMutation.mutate(uncategorized);
                        }}
                        disabled={categorizeMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        {categorizeMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing{" "}
                            {
                              filteredTransactions.filter(
                                (t: any) =>
                                  !t.accountId || t.status === "uncategorized"
                              ).length
                            }{" "}
                            transactions...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Auto-Categorize All
                          </>
                        )}
                      </Button>
                    </div>
                    {categorizeMutation.isPending && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-blue-600 mb-1">
                          <span>Processing transactions</span>
                          <span>Please wait...</span>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Mobile Bank Account Selector */}
                    <Select
                      value={selectedAccount?.id?.toString() || "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedAccount(null);
                        } else {
                          const account = accounts.find(
                            (acc) => acc.id.toString() === value
                          );
                          setSelectedAccount(account);
                        }
                      }}
                    >
                      <SelectTrigger className="w-32 sm:w-40 md:hidden">
                        <SelectValue placeholder="All Accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts
                          .filter((acc) => acc.type === "bank")
                          .map((account) => (
                            <SelectItem
                              key={account.id}
                              value={account.id.toString()}
                            >
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-32 sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="categorized">Categorized</SelectItem>
                        <SelectItem value="uncategorized">
                          Uncategorized
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                          <Upload className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Import</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Intelligent Transaction Import
                          </DialogTitle>
                        </DialogHeader>
                        <TransactionUploadSystem
                          clientId={clientId.toString()}
                          accounts={accounts}
                          onUploadComplete={() => {
                            refetchAllTransactionQueries();
                            setShowImportModal(false); // Close the modal after successful import
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Horizontal Bank Accounts Selector */}
                <div className="border-b bg-muted/20 p-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Bank Account:</span>
                    </div>

                    {isLoadingAccounts ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Loading...
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant={!selectedAccount ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAccount(null)}
                          className="h-8 text-xs"
                        >
                          All Accounts
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {transactions.length}
                          </Badge>
                        </Button>

                        {accounts
                          .filter((account: any) => account.subtype === "bank")
                          .map((account: any) => (
                            <Button
                              key={account.id}
                              variant={
                                selectedAccount?.id === account.id
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedAccount(account)}
                              className="h-8 text-xs max-w-[200px]"
                            >
                              <span className="truncate">{account.name}</span>
                              <span className="ml-2 text-xs font-mono">
                                {formatBalance(account.balance || 0)}
                              </span>
                              {account.unreconciled && (
                                <div
                                  className="ml-1 h-2 w-2 bg-yellow-500 rounded-full"
                                  title="Unreconciled"
                                />
                              )}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Transactions Table */}
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  <div className="flex-1 min-w-0 overflow-auto">
                    <div className="w-full min-w-0 overflow-x-auto">
                      <Table className="min-w-[1200px]">
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-8 sm:w-12">
                              <Checkbox
                                checked={
                                  selectedTransactions.length ===
                                    enhancedTransactions.length &&
                                  enhancedTransactions.length > 0
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTransactions(
                                      enhancedTransactions.map((t: any) => t.id)
                                    );
                                  } else {
                                    setSelectedTransactions([]);
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">
                              Date
                            </TableHead>
                            <TableHead className="text-xs">
                              Description
                            </TableHead>
                            <TableHead className="text-xs text-right">
                              Amount
                            </TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">
                              Category
                            </TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">
                              AI/Rules
                            </TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">
                              Bill/Invoice Match
                            </TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingTransactions ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-8"
                              >
                                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                Loading transactions...
                              </TableCell>
                            </TableRow>
                          ) : enhancedTransactions.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-8 text-muted-foreground"
                              >
                                <div className="space-y-2">
                                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                                  <p className="text-sm">
                                    No transactions found
                                  </p>
                                  <p className="text-xs">
                                    Try adding transactions or importing data
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            enhancedTransactions.map((transaction: any) => (
                              <TableRow
                                key={transaction.id}
                                className={`cursor-pointer hover:bg-muted/50 ${
                                  selectedTransactions.includes(transaction.id)
                                    ? "bg-muted/30"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setShowTransactionDetail(true);
                                }}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedTransactions.includes(
                                      transaction.id
                                    )}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedTransactions([
                                          ...selectedTransactions,
                                          transaction.id,
                                        ]);
                                      } else {
                                        setSelectedTransactions(
                                          selectedTransactions.filter(
                                            (id) => id !== transaction.id
                                          )
                                        );
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell className="text-xs hidden sm:table-cell">
                                  {normalizeDate(getTransactionDate(transaction))}
                                </TableCell>
                                <TableCell className="text-xs max-w-32 sm:max-w-48 truncate">
                                  <div className="flex flex-col">
                                    <span>
                                      {transaction.description ||
                                        "No description"}
                                    </span>
                                    <span className="text-xs text-muted-foreground sm:hidden">
                                      {formatDateSafe(getTransactionDate(transaction))}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono">
                                  {(() => {
                                    const amountInfo =
                                      formatAmount(transaction);
                                    return (
                                      <span className={amountInfo.color}>
                                        {amountInfo.sign}
                                        {amountInfo.value}
                                      </span>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-xs hidden sm:table-cell">
                                  {transaction.category ? (
                                    <Badge variant="secondary">
                                      {transaction.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Uncategorized
                                    </span>
                                  )}
                                </TableCell>

                                {/* AI/Rules Indicators Column */}
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex items-center gap-1">
                                    {transaction.aiSuggestion && (
                                      <div className="relative group">
                                        <Badge
                                          variant="outline"
                                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-help"
                                        >
                                          <Sparkles className="h-3 w-3" />
                                        </Badge>
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                          AI Recommendation:{" "}
                                          {transaction.aiSuggestion.accountName}
                                        </div>
                                      </div>
                                    )}
                                    {transaction.ruleMatched && (
                                      <div className="relative group">
                                        <Badge
                                          variant="outline"
                                          className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer"
                                          onClick={() => {
                                            // Auto-recommend the account and tax from the best matching rule
                                            const bestRule =
                                              transaction.ruleMatched;
                                            setSelectedTransaction(transaction);

                                            // Dynamic tax code mapping using fetched tax settings
                                            let mappedTaxCode = "exempt";
                                            const ruleAccountId =
                                              bestRule.tax_account_id ||
                                              bestRule.taxAccountId;

                                            if (
                                              ruleAccountId &&
                                              taxSettings.length > 0
                                            ) {
                                              const matchingTaxSetting =
                                                taxSettings.find(
                                                  (option: any) =>
                                                    option.accountId ===
                                                    ruleAccountId
                                                );

                                              if (matchingTaxSetting) {
                                                mappedTaxCode =
                                                  matchingTaxSetting.id;
                                              } else {
                                                // Fallback to HST setting (force HST for rules with tax_account_id)
                                                const hstSetting =
                                                  taxSettings.find(
                                                    (option: any) =>
                                                      option.name
                                                        ?.toLowerCase()
                                                        .includes("hst") ||
                                                      option.id?.includes("hst")
                                                  );
                                                if (hstSetting) {
                                                  mappedTaxCode = hstSetting.id;
                                                } else {
                                                  mappedTaxCode =
                                                    defaultTaxSetting?.id ||
                                                    "exempt";
                                                }
                                              }
                                            }

                                            setMiltonSuggestion({
                                              accountId:
                                                bestRule.accountId ||
                                                bestRule.account_id,
                                              accountName: bestRule.accountName,
                                              taxCode: mappedTaxCode,
                                              taxAccountId: ruleAccountId,
                                              confidence: bestRule.confidence,
                                              reasoning: `Rule-based match: "${bestRule.name}" (pattern: "${bestRule.pattern}")`,
                                            });
                                            setShowTransactionDetail(true);
                                            toast({
                                              title: "Rule Applied",
                                              description: `Applied rule "${bestRule.name}" - recommending ${bestRule.accountName}`,
                                            });
                                          }}
                                          data-testid={`button-apply-rule-${transaction.id}`}
                                        >
                                          <span className="text-xs font-bold">
                                            R{transaction.ruleMatchCount || 1}
                                          </span>
                                        </Badge>
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                          {transaction.ruleMatchCount || 1} Rule
                                          Match
                                          {transaction.ruleMatchCount > 1
                                            ? "es"
                                            : ""}
                                          : {transaction.ruleMatched.name}
                                          {transaction.ruleMatchCount > 1 &&
                                            " + more..."}
                                          <br />
                                          Click to apply recommendation
                                        </div>
                                      </div>
                                    )}
                                    {!transaction.aiSuggestion &&
                                      !transaction.ruleMatched &&
                                      transaction.status ===
                                        "uncategorized" && (
                                        <div className="relative group">
                                          <Badge
                                            variant="outline"
                                            className="bg-gray-50 border-gray-200 text-gray-500"
                                          >
                                            <span className="text-xs">—</span>
                                          </Badge>
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                            No AI or rule suggestions yet
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </TableCell>
                                
                                {/* Bill/Invoice Match Indicator Column */}
                                <TableCell className="hidden sm:table-cell">
                                  {transaction.billMatch ? (
                                    <div className="relative group">
                                      <Badge
                                        variant="outline"
                                        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTransaction(transaction);
                                          setShowTransactionDetail(true);
                                        }}
                                      >
                                        <Receipt className="h-3 w-3 mr-1" />
                                        <span className="text-xs">
                                          {transaction.billMatch.bill.billNumber}
                                        </span>
                                      </Badge>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 max-w-xs">
                                        <div className="font-semibold mb-1">
                                          Bill Match ({transaction.billMatch.score}% match)
                                        </div>
                                        <div>
                                          Bill: {transaction.billMatch.bill.billNumber}
                                        </div>
                                        {transaction.billMatch.contact && (
                                          <div>
                                            Vendor: {transaction.billMatch.contact.name || transaction.billMatch.contact.companyName}
                                          </div>
                                        )}
                                        <div>
                                          Amount: ${parseFloat(transaction.billMatch.bill.totalAmount || 0).toFixed(2)}
                                        </div>
                                        <div>
                                          Date: {new Date(transaction.billMatch.bill.billDate).toLocaleDateString()}
                                        </div>
                                        {transaction.billMatch.allMatches && transaction.billMatch.allMatches.length > 1 && (
                                          <div className="mt-1 pt-1 border-t border-gray-700">
                                            +{transaction.billMatch.allMatches.length - 1} more match{transaction.billMatch.allMatches.length - 1 > 1 ? 'es' : ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : transaction.invoiceMatch ? (
                                    <div className="relative group">
                                      <Badge
                                        variant="outline"
                                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTransaction(transaction);
                                          setShowTransactionDetail(true);
                                        }}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        <span className="text-xs">
                                          {transaction.invoiceMatch.invoice.invoiceNumber}
                                        </span>
                                      </Badge>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 max-w-xs">
                                        <div className="font-semibold mb-1">
                                          Invoice Match ({transaction.invoiceMatch.score}% match)
                                        </div>
                                        <div>
                                          Invoice: {transaction.invoiceMatch.invoice.invoiceNumber}
                                        </div>
                                        {transaction.invoiceMatch.contact && (
                                          <div>
                                            Customer: {transaction.invoiceMatch.contact.name || transaction.invoiceMatch.contact.companyName}
                                          </div>
                                        )}
                                        <div>
                                          Amount: ${parseFloat(transaction.invoiceMatch.invoice.totalAmount || 0).toFixed(2)}
                                        </div>
                                        <div>
                                          Date: {new Date(transaction.invoiceMatch.invoice.invoiceDate).toLocaleDateString()}
                                        </div>
                                        {transaction.invoiceMatch.allMatches && transaction.invoiceMatch.allMatches.length > 1 && (
                                          <div className="mt-1 pt-1 border-t border-gray-700">
                                            +{transaction.invoiceMatch.allMatches.length - 1} more match{transaction.invoiceMatch.allMatches.length - 1 > 1 ? 'es' : ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {(() => {
                                    const hasCategory =
                                      transaction.category ||
                                      transaction.status === "completed" ||
                                      transaction.status === "categorized";
                                    const hasAccount =
                                      transaction.accountId &&
                                      transaction.accountId > 0;

                                    if (hasCategory && hasAccount) {
                                      return (
                                        <Badge
                                          variant="default"
                                          className="bg-green-100 text-green-800"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Categorized
                                        </Badge>
                                      );
                                    } else if (hasCategory) {
                                      return (
                                        <Badge
                                          variant="secondary"
                                          className="bg-yellow-100 text-yellow-800"
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          Partial
                                        </Badge>
                                      );
                                    } else {
                                      return (
                                        <Badge
                                          variant="outline"
                                          className="bg-red-50 text-red-600"
                                        >
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Uncategorized
                                        </Badge>
                                      );
                                    }
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Journal Entries Tab */}
          <TabsContent value="journal-entries" className="p-3">
            <JournalEntriesTab clientId={clientId} accounts={accounts} />
          </TabsContent>

          {/* Enhanced Receipt Management */}
          <TabsContent value="receipts" className="p-3">
            <ReceiptManager
              clientId={clientId}
              onReceiptMatched={(receiptId, transactionId) => {
                toast({
                  title: "Receipt Matched",
                  description: "Receipt successfully matched to transaction",
                });
                refetchAllTransactionQueries();
              }}
            />
          </TabsContent>

          {/* Excluded Transactions Tab */}
          <TabsContent value="excluded" className="p-3">
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="p-2 sm:p-4 border-b space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search excluded transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-excluded-search"
                      />
                    </div>
                  </div>

                  {selectedTransactions.length > 0 && (
                    <Button
                      onClick={() =>
                        bulkRestoreMutation.mutate(selectedTransactions)
                      }
                      disabled={bulkRestoreMutation.isPending}
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      data-testid="button-bulk-restore"
                    >
                      {bulkRestoreMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore {selectedTransactions.length} Selected
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {filteredExcludedTransactions.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <EyeOff className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h3 className="font-semibold text-yellow-900">
                          Excluded Transactions
                        </h3>
                        <p className="text-sm text-yellow-700">
                          {filteredExcludedTransactions.length} transactions
                          have been excluded from reports and categorization.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Excluded Transactions List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 sm:p-4 space-y-2">
                  {filteredExcludedTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                        No Excluded Transactions
                      </h3>
                      <p className="text-muted-foreground">
                        Transactions you exclude will appear here for easy
                        management.
                      </p>
                    </div>
                  ) : (
                    filteredExcludedTransactions.map((transaction: any) => {
                      const amount = formatAmount(transaction);
                      return (
                        <Card
                          key={transaction.id}
                          className="border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedTransactions.includes(
                                    transaction.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTransactions([
                                        ...selectedTransactions,
                                        transaction.id,
                                      ]);
                                    } else {
                                      setSelectedTransactions(
                                        selectedTransactions.filter(
                                          (id) => id !== transaction.id
                                        )
                                      );
                                    }
                                  }}
                                  data-testid={`checkbox-transaction-${transaction.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm">
                                      {transaction.description ||
                                        "No description"}
                                    </h3>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Excluded
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>
                                      {formatDateSafe(getTransactionDate(transaction))}
                                    </span>
                                    <span className={amount.color}>
                                      {amount.sign}
                                      {amount.value}
                                    </span>
                                    {transaction.bankAccount && (
                                      <span>{transaction.bankAccount}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() =>
                                    restoreTransactionMutation.mutate(
                                      transaction.id
                                    )
                                  }
                                  disabled={
                                    restoreTransactionMutation.isPending
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  data-testid={`button-restore-${transaction.id}`}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Restore
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowTransactionDetail(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-view-${transaction.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="p-3">
            <RulesManagementTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="reconcile" className="p-0">
            <Reconcile />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Enhanced Transaction Classification */}
      {showTransactionDetail && selectedTransaction && (
        <div className="lg:w-96 lg:border-l bg-background overflow-auto fixed inset-0 lg:relative z-50 lg:z-auto">
          <div className="p-3 lg:p-4 h-full">
            <TransactionClassificationCard
              transaction={selectedTransaction}
              onSave={handleSaveTransaction}
              onClose={() => {
                setShowTransactionDetail(false);
                setSelectedTransaction(null);
                setMiltonSuggestion(null);
              }}
              accounts={accounts}
              clientId={clientId}
              billMatch={selectedTransaction?.billMatch}
              invoiceMatch={selectedTransaction?.invoiceMatch}
            />
          </div>
        </div>
      )}

      {/* Mass Actions Dialog */}
      <Dialog
        open={showMassActionsDialog}
        onOpenChange={setShowMassActionsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Mass Actions ({selectedTransactions.length} transactions selected)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account</Label>
                <select
                  value={massActionAccount}
                  onChange={(e) => setMassActionAccount(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="select-mass-account"
                >
                  <option value="">Select account for all</option>
                  {["income", "expense", "asset", "liability", "equity", "cost_of_sales", "other_income", "other_expense"].map(
                    (type) => {
                      const typeAccounts = accounts.filter(
                        (acc) => acc.type === type
                      );
                      if (typeAccounts.length === 0) return null;

                      return (
                        <optgroup
                          key={type}
                          label={`${
                            type.charAt(0).toUpperCase() + type.slice(1)
                          } Accounts`}
                        >
                          {typeAccounts.map((account) => (
                            <option
                              key={account.id}
                              value={account.id.toString()}
                            >
                              {account.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    }
                  )}
                </select>
              </div>
              <div>
                <Label>Tax Code</Label>
                <select
                  value={massActionTaxCode}
                  onChange={(e) => setMassActionTaxCode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="select-mass-tax"
                >
                  <option value="">Select tax code</option>
                  <option value="HST">HST</option>
                  <option value="EXEMPT">Tax Exempt</option>
                  <option value="ZERO">Zero Rated</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (massActionAccount) {
                    setIsProcessingAI(true);
                    let successCount = 0;
                    let errorCount = 0;
                    
                    try {
                      const token = localStorage.getItem("authToken");
                      const headers: HeadersInit = {
                        "Content-Type": "application/json",
                      };
                      if (token) {
                        headers["Authorization"] = `Bearer ${token}`;
                      }

                      // Get the selected account details
                      const targetAccount = accounts.find((acc: any) => acc.id === parseInt(massActionAccount));
                      
                      for (const transactionId of selectedTransactions) {
                        try {
                          // First, get the transaction details for AI analysis
                          const transactionResponse = await fetch(
                            apiConfig.buildUrl(`/api/transactions/${transactionId}`),
                            {
                              method: "GET",
                              headers,
                              credentials: "include",
                            }
                          );
                          
                          if (!transactionResponse.ok) {
                            throw new Error(`Failed to fetch transaction ${transactionId}`);
                          }
                          
                          const transaction = await transactionResponse.json();
                          
                          // Perform AI categorization for this transaction
                          const aiResponse = await fetch(
                            apiConfig.buildUrl('/api/transactions/categorize'),
                            {
                              method: "POST",
                              headers,
                              credentials: "include",
                              body: JSON.stringify({
                                description: transaction.description,
                                amount: parseFloat(transaction.debitAmount || transaction.creditAmount || '0'),
                                clientId: clientId
                              })
                            }
                          );
                          
                          let aiSuggestion = null;
                          if (aiResponse.ok) {
                            const aiResult = await aiResponse.json();
                            if (aiResult.success && aiResult.categorization) {
                              aiSuggestion = aiResult.categorization;
                            }
                          }
                          
                          // Prepare the update data with comprehensive categorization
                          const updateData: any = {
                            accountId: parseInt(massActionAccount),
                            status: "categorized",
                            category: targetAccount?.name || "Categorized"
                          };
                          
                          // Apply AI suggestions if available, otherwise use manual selections
                          if (aiSuggestion) {
                            // Use AI-suggested tax code if available, otherwise use manual selection
                            const taxCodeName = aiSuggestion.taxCode || massActionTaxCode || 'HST';
                            const taxSetting = taxSettings.find(tax => tax.name === taxCodeName) || defaultTaxSetting;
                            const taxCodeId = taxSetting?.id || defaultTaxSetting?.id || massActionTaxCode || 'HST';
                            
                            updateData.taxCode = taxCodeId;
                            updateData.contactId = aiSuggestion.contactId || null;
                            updateData.projectId = aiSuggestion.projectId || null;
                            updateData.category = aiSuggestion.category || targetAccount?.name || "Categorized";
                            
                            // Calculate HST if applicable
                            if (taxCodeId && taxCodeId !== 'exempt' && taxCodeId !== 'ZERO') {
                              const amount = parseFloat(transaction.debitAmount || transaction.creditAmount || '0');
                              const hstRate = taxSettings.find(tax => tax.id === taxCodeId)?.rate || 0.13;
                              updateData.hstAmount = (amount * hstRate).toFixed(2);
                            }
                          } else {
                            // Fallback to manual selections
                            updateData.taxCode = massActionTaxCode || "HST";
                            updateData.contactId = null;
                            updateData.projectId = null;
                            
                            // Calculate HST for manual tax code
                            if (massActionTaxCode && massActionTaxCode !== 'exempt' && massActionTaxCode !== 'ZERO') {
                              const amount = parseFloat(transaction.debitAmount || transaction.creditAmount || '0');
                              const hstRate = taxSettings.find(tax => tax.id === massActionTaxCode)?.rate || 0.13;
                              updateData.hstAmount = (amount * hstRate).toFixed(2);
                            }
                          }
                          
                          // Use the classification save endpoint to create journal entries
                          const classificationData = {
                            transactionId: transactionId,
                            clientId: clientId,
                            classification: {
                              accountId: parseInt(massActionAccount),
                              category: updateData.category,
                              taxCode: updateData.taxCode,
                              contactId: updateData.contactId,
                              contactType: null,
                              projectId: updateData.projectId,
                              memo: "Mass categorization",
                              hstCalculation: updateData.hstAmount ? {
                                hstAmount: updateData.hstAmount,
                                netAmount: (parseFloat(transaction.debitAmount || transaction.creditAmount || '0') - parseFloat(updateData.hstAmount || '0')).toFixed(2)
                              } : null,
                            },
                          };

                          const updateResponse = await fetch(
                            apiConfig.buildUrl("/api/transactions/classification/save"),
                            {
                              method: "POST",
                              headers,
                              credentials: "include",
                              body: JSON.stringify(classificationData),
                            }
                          );
                          
                          if (updateResponse.ok) {
                            successCount++;
                          } else {
                            errorCount++;
                            console.error(`Failed to update transaction ${transactionId}`);
                          }
                          
                        } catch (transactionError) {
                          errorCount++;
                          console.error(`Error processing transaction ${transactionId}:`, transactionError);
                        }
                      }
                      
                      refetchAllTransactionQueries();
                      // Also invalidate journal entries queries to refresh the journal entries list
                      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries`, clientId] });
                      setSelectedTransactions([]);
                      setShowMassActionsDialog(false);
                      
                      // Show detailed success message
                      if (successCount > 0) {
                        toast({
                          title: "Mass Categorization Complete",
                          description: `Successfully categorized ${successCount} transactions${errorCount > 0 ? ` (${errorCount} failed)` : ''} with AI analysis, comprehensive categorization, and journal entries created.`,
                          duration: 5000,
                        });
                      } else {
                        toast({
                          title: "Mass Categorization Failed",
                          description: `Failed to categorize all ${selectedTransactions.length} transactions`,
                          variant: "destructive",
                        });
                      }
                      
                    } catch (error) {
                      console.error("Mass categorization error:", error);
                      toast({
                        title: "Error",
                        description: "Failed to process mass categorization",
                        variant: "destructive",
                      });
                    } finally {
                      setIsProcessingAI(false);
                    }
                  }
                }}
                disabled={!massActionAccount || isProcessingAI}
                className="flex-1"
                data-testid="button-apply-mass-action"
              >
                {isProcessingAI ? "Processing..." : "Apply to All Selected"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setExcludedTransactions([
                    ...excludedTransactions,
                    ...selectedTransactions,
                  ]);
                  setSelectedTransactions([]);
                  setShowMassActionsDialog(false);
                  toast({
                    title: "Transactions Excluded",
                    description: `${selectedTransactions.length} transactions moved to excluded list`,
                  });
                }}
                className="flex-1"
                data-testid="button-exclude-transactions"
              >
                <X className="h-4 w-4 mr-2" />
                Exclude Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rule Creation Dialog with Tax Allocation */}
      <RuleCreationDialog
        isOpen={isRuleDialogOpen}
        onClose={() => {
          setIsRuleDialogOpen(false);
          setRuleDialogTransaction(null);
        }}
        onSubmit={handleSubmitRule}
        accounts={accounts}
        taxSettings={taxSettings}
        defaultTaxSetting={defaultTaxSetting}
        initialPattern={ruleDialogTransaction?.description || ""}
        initialAccountId={
          typeof ruleDialogTransaction?.accountId === "string"
            ? parseInt(ruleDialogTransaction.accountId)
            : ruleDialogTransaction?.accountId
        }
      />

      {/* Milton Auto-Classification Dialog */}
      <Dialog
        open={showMiltonAutoClassifyDialog}
        onOpenChange={setShowMiltonAutoClassifyDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Milton Auto-Classification
              <Zap className="h-4 w-4 text-yellow-500" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  AI Auto-Classification Preview
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Milton will analyze{" "}
                {filteredTransactions.filter((t) => !t.category).length}{" "}
                uncategorized transactions and suggest classifications based on
                transaction descriptions, amounts, and historical patterns.
              </p>
            </div>

            <div className="flex gap-2">
            <Button 
                onClick={async () => {
                  setIsProcessingAI(true);
                  try {
                    const uncategorizedTransactions = filteredTransactions.filter(t => !t.category);
                    let processedCount = 0;
                    const token = localStorage.getItem('authToken');
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json',
                    };
                    if (token) {
                      headers["Authorization"] = `Bearer ${token}`;
                    }
                    for (const transaction of uncategorizedTransactions) {
                      try {
                        
                        const response = await fetch(apiConfig.buildUrl('/api/milton/categorize-smart'), {
                          method: 'POST',
                          headers,
                          credentials: 'include',
                          body: JSON.stringify({
                            description: transaction.description,
                            amount: Math.abs(transaction.debitAmount || transaction.creditAmount || transaction.amount || 0),
                            clientId
                          })
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          if (result.success && result.categorization.accountId) {
                            await fetch(`/api/transactions/${transaction.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                accountId: result.categorization.accountId,
                                category: result.categorization.accountName,
                                taxCode: result.categorization.taxCode || 'HST',
                                status: 'categorized'
                              })
                            });
                            processedCount++;
                          }
                        }
                      } catch (error) {
                        console.error(`Failed to process transaction ${transaction.id}:`, error);
                      }
                    }
                    refetchAllTransactionQueries();
                    setShowMiltonAutoClassifyDialog(false);
                    toast({
                      title: "Auto-Classification Complete",
                      description: `Milton successfully classified ${processedCount} out of ${uncategorizedTransactions.length} transactions`
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to auto-classify transactions",
                      variant: "destructive"
                    });
                  } finally {
                    setIsProcessingAI(false);
                  }
                }}
                disabled={isProcessingAI}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-auto-classify"
              >
                {isProcessingAI ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing with Milton AI...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Start Auto-Classification
                    <Zap className="h-3 w-3" />
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMiltonAutoClassifyDialog(false)}
                disabled={isProcessingAI}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Old transaction detail panel - keeping for reference but replacing with new card */}
      {false && showTransactionDetail && selectedTransaction && (
        <div className="w-1/3 border-l bg-background overflow-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Transaction Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTransactionDetail(false);
                  setSelectedTransaction(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Milton AI Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Milton's Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {miltonSuggestion ? (
                  <div className="p-3 bg-blue-50 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-900">
                        Recommended:
                      </span>
                      <Button
                        size="sm"
                        className="h-6 text-xs"
                        onClick={async () => {
                          const updatedTransaction = {
                            ...selectedTransaction,
                            category: miltonSuggestion.accountName,
                            taxCode: miltonSuggestion.taxCode,
                            accountId: accounts.find(
                              (acc) => acc.name === miltonSuggestion.accountName
                            )?.id,
                            status: "categorized",
                          };
                          setSelectedTransaction(updatedTransaction);

                          // Save the categorization immediately
                          try {
                            const token = localStorage.getItem("authToken");
                            const headers: HeadersInit = {
                              "Content-Type": "application/json",
                            };
                            if (token) {
                              headers["Authorization"] = `Bearer ${token}`;
                            }

                            await fetch(
                              apiConfig.buildUrl(
                                `/api/transactions/${updatedTransaction.id}`
                              ),
                              {
                                method: "PATCH",
                                headers,
                                credentials: "include",
                                body: JSON.stringify({
                                  category: updatedTransaction.category,
                                  taxCode: updatedTransaction.taxCode,
                                  accountId: updatedTransaction.accountId,
                                  status: "categorized",
                                }),
                              }
                            );

                            // Refresh transactions list
                            refetchAllTransactionQueries();
                            setMiltonSuggestion(null);
                          } catch (error) {
                            console.error(
                              "Failed to apply Milton suggestion:",
                              error
                            );
                          }
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Double-Entry Explanation */}
                      {miltonSuggestion.doubleEntryExplanation && (
                        <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                          <div className="font-medium text-blue-800 mb-1">
                            Double-Entry Bookkeeping:
                          </div>
                          <div className="text-blue-700">
                            {miltonSuggestion.doubleEntryExplanation}
                          </div>
                        </div>
                      )}

                      {/* Simplified Account Details */}
                      <div className="space-y-1">
                        <div>
                          <strong>Account:</strong>{" "}
                          {miltonSuggestion.accountName}
                        </div>
                        <div>
                          <strong>Tax Code:</strong> {miltonSuggestion.taxCode}
                        </div>
                        <div>
                          <strong>Confidence:</strong>{" "}
                          {Math.round(miltonSuggestion.confidence * 100)}%
                        </div>
                      </div>
                    </div>

                    {miltonSuggestion.hstDetails && (
                      <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-200 text-xs">
                        <div className="font-medium text-green-800 mb-1">
                          HST Tax Breakdown:
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-green-700">
                          <div>
                            Total: ${miltonSuggestion.hstDetails.totalAmount}
                          </div>
                          <div>
                            Net: ${miltonSuggestion.hstDetails.netAmount}
                          </div>
                          <div>
                            HST: ${miltonSuggestion.hstDetails.hstAmount}
                          </div>
                        </div>
                        {miltonSuggestion.hstDetails.hstAccountName && (
                          <div className="mt-1 text-green-600">
                            HST Account:{" "}
                            {miltonSuggestion.hstDetails.hstAccountName}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-600 italic">
                      {miltonSuggestion.reasoning}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    Getting Milton's suggestion...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Edit Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={selectedTransaction.description || ""}
                    className="text-xs"
                    onChange={(e) =>
                      setSelectedTransaction({
                        ...selectedTransaction,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      value={Math.abs(
                        selectedTransaction.debitAmount ||
                          selectedTransaction.creditAmount ||
                          selectedTransaction.amount ||
                          0
                      )}
                      className="text-xs"
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value) || 0;
                        const isIncome = selectedTransaction.debitAmount > 0; // Debit to bank = money in
                        const finalAmount = isIncome ? newAmount : -newAmount;
                        setSelectedTransaction({
                          ...selectedTransaction,
                          amount: finalAmount,
                          debitAmount: isIncome ? newAmount : 0,
                          creditAmount: !isIncome ? newAmount : 0,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={
                        selectedTransaction.debitAmount > 0
                          ? "income"
                          : "expense"
                      }
                      onValueChange={(value) => {
                        const absAmount = Math.abs(
                          selectedTransaction.debitAmount ||
                            selectedTransaction.creditAmount ||
                            selectedTransaction.amount ||
                            0
                        );
                        const newAmount =
                          value === "income" ? absAmount : -absAmount;
                        setSelectedTransaction({
                          ...selectedTransaction,
                          amount: newAmount,
                          debitAmount: value === "income" ? absAmount : 0,
                          creditAmount: value === "expense" ? absAmount : 0,
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Money In</SelectItem>
                        <SelectItem value="expense">Money Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Account</Label>
                  <Select
                    value={selectedTransaction.accountId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedTransaction({
                        ...selectedTransaction,
                        accountId: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account: any) => (
                        <SelectItem
                          key={account.id}
                          value={account.id.toString()}
                        >
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Customer/Supplier</Label>
                  <Select>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select or add new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add-customer">
                        + Add New Customer
                      </SelectItem>
                      <SelectItem value="add-supplier">
                        + Add New Supplier
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Tax Code</Label>
                  <Select
                    value={selectedTransaction.taxCode || "HST"}
                    onValueChange={(value) =>
                      setSelectedTransaction({
                        ...selectedTransaction,
                        taxCode: value,
                      })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HST">HST 13%</SelectItem>
                      <SelectItem value="ZERO">Zero-Rated</SelectItem>
                      <SelectItem value="EXEMPT">Exempt</SelectItem>
                      <SelectItem value="OUT_OF_SCOPE">Out of Scope</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <textarea
                    className="w-full text-xs p-2 border rounded resize-none h-16"
                    placeholder="Add notes..."
                    value={selectedTransaction.memo || ""}
                    onChange={(e) =>
                      setSelectedTransaction({
                        ...selectedTransaction,
                        memo: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={async () => {
                      // Save manual categorization
                      if (!selectedTransaction.accountId) {
                        toast({
                          title: "Account required",
                          description:
                            "Please select an account to save categorization",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        const accountId =
                          typeof selectedTransaction.accountId === "string"
                            ? parseInt(selectedTransaction.accountId)
                            : selectedTransaction.accountId;
                        const targetAccount = accounts.find(
                          (acc: any) => acc.id === accountId
                        );

                        const token = localStorage.getItem("authToken");
                        const headers: HeadersInit = {
                          "Content-Type": "application/json",
                        };
                        if (token) {
                          headers["Authorization"] = `Bearer ${token}`;
                        }

                        const response = await fetch(
                          apiConfig.buildUrl(
                            `/api/transactions/${selectedTransaction.id}`
                          ),
                          {
                            method: "PATCH",
                            headers,
                            credentials: "include",
                            body: JSON.stringify({
                              accountId: accountId,
                              category: targetAccount?.name || "Categorized",
                              taxCode: selectedTransaction.taxCode || "HST",
                              status: "categorized",
                              memo: selectedTransaction.memo || "",
                            }),
                          }
                        );

                        if (response.ok) {
                          toast({
                            title: "Transaction saved",
                            description: `Categorized to ${targetAccount?.name}`,
                          });
                          refetchAllTransactionQueries();
                          setShowTransactionDetail(false);
                          setSelectedTransaction(null);
                        } else {
                          throw new Error("Failed to save transaction");
                        }
                      } catch (error) {
                        console.error("Save error:", error);
                        toast({
                          title: "Save failed",
                          description:
                            "Could not save transaction categorization",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() =>
                      handleExcludeTransaction(selectedTransaction)
                    }
                  >
                    Exclude
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      {selectedTransactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 shadow-lg z-50">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedTransactions.length} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Only show Categorize and Exclude buttons when NOT on excluded tab */}
              {activeTab !== "excluded" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMassActionsDialog(true)}
                    data-testid="button-mass-categorize"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    Categorize
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      bulkExcludeMutation.mutate(selectedTransactions);
                    }}
                    disabled={bulkExcludeMutation.isPending}
                    data-testid="button-bulk-exclude"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {bulkExcludeMutation.isPending ? "Excluding..." : "Exclude"}
                  </Button>
                </>
              )}
              
              {/* Show Restore button only when on excluded tab */}
              {activeTab === "excluded" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    bulkRestoreMutation.mutate(selectedTransactions);
                  }}
                  disabled={bulkRestoreMutation.isPending}
                  data-testid="button-bulk-restore"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {bulkRestoreMutation.isPending ? "Restoring..." : "Restore"}
                </Button>
              )}
              {/* Only show Apply Rule button when NOT on excluded tab */}
              {activeTab !== "excluded" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="button-apply-rule"
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Apply Rule
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Apply Rule to {selectedTransactions.length} Transactions
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Rule</Label>
                      <Select
                        value={selectedRule}
                        onValueChange={setSelectedRule}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a rule to apply" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-expense">
                            Auto-categorize Expenses
                          </SelectItem>
                          <SelectItem value="auto-income">
                            Auto-categorize Income
                          </SelectItem>
                          <SelectItem value="mark-reviewed">
                            Mark as Reviewed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (selectedRule) {
                            bulkApplyRuleMutation.mutate({
                              transactionIds: selectedTransactions,
                              ruleId: selectedRule,
                            });
                          }
                        }}
                        disabled={
                          !selectedRule || bulkApplyRuleMutation.isPending
                        }
                        className="flex-1"
                      >
                        {bulkApplyRuleMutation.isPending
                          ? "Applying..."
                          : "Apply Rule"}
                      </Button>
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogTrigger>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="button-add-note"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Add Note to {selectedTransactions.length} Transactions
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Note</Label>
                      <Input
                        placeholder="Enter note for selected transactions"
                        value={massNote}
                        onChange={(e) => setMassNote(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (massNote.trim()) {
                            addMassNoteMutation.mutate({
                              transactionIds: selectedTransactions,
                              note: massNote,
                            });
                            setMassNote("");
                          }
                        }}
                        disabled={
                          !massNote.trim() || addMassNoteMutation.isPending
                        }
                        className="flex-1"
                      >
                        {addMassNoteMutation.isPending
                          ? "Adding..."
                          : "Add Note"}
                      </Button>
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogTrigger>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {/* Only show AI Categorize button when NOT on excluded tab */}
              {activeTab !== "excluded" && (
                <Button
                  size="sm"
                  onClick={() => {
                    const selectedTxns = transactions.filter((t: any) =>
                      selectedTransactions.includes(t.id)
                    );
                    categorizeMutation.mutate(selectedTxns);
                  }}
                  disabled={categorizeMutation.isPending}
                  data-testid="button-milton-ai-bulk"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {categorizeMutation.isPending ? (
                    <>
                      <Brain className="h-3 w-3 mr-1 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      🤖 AI Categorize All
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
