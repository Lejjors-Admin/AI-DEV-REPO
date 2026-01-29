import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountDropdown } from "@/components/ui/AccountDropdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, FileText, Calculator, Search, Filter, Calendar, ChevronDown, ChevronUp, Edit3, Trash2, DollarSign, Building, Users, TrendingUp, TrendingDown, X, AlertTriangle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";

// Utility function to format IDs to 5 digits
const formatIdToFiveDigits = (id: number | string): string => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return numericId.toString().padStart(5, '0');
};

interface Account {
  id: number;
  accountNumber: string;
  name: string;
  type: string;
  isDebitNormal: boolean;
}

interface Transaction {
  id: number;
  transactionGroupId: string;
  accountId: number;
  account?: Account;
  description: string;
  transactionDate: string;
  debitAmount: string;
  creditAmount: string;
  transactionType: string;
  category?: string;
  referenceNumber?: string;
  memo?: string;
  isReconciled: boolean;
  needsReview: boolean;
}

interface TransactionGroup {
  transactionGroupId: string;
  entryNumber: string;
  description: string;
  transactionDate: string;
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  transactions: Transaction[];
}

export default function TransactionLedger({ clientId, showAllEntries = false }: { clientId: number; showAllEntries?: boolean }) {
  const { user } = useAuth();
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showNewJournalEntry, setShowNewJournalEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editingTransactions, setEditingTransactions] = useState<{[key: number]: Transaction}>({});
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string>('');
  const [historyEntryId, setHistoryEntryId] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2024-01-01', // Set wider default range to capture all data
    end: '2026-12-31'
  });
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = showAllEntries ? 10000 : 50; // Show 10,000 entries when showAllEntries is true
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper functions for date filtering
  const getQuickFilterDates = (filter: 'all' | 'today' | 'week' | 'month') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      default:
        return {
          start: '',
          end: ''
        };
    }
  };

  // Update date range when quick filter changes
  useEffect(() => {
    if (quickFilter !== 'all') {
      setDateRange(getQuickFilterDates(quickFilter));
    }
  }, [quickFilter]);

  // Account type helpers
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Building className="h-4 w-4 text-blue-500" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'equity': return <DollarSign className="h-4 w-4 text-purple-500" />;
      case 'income': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'expense': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default: return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleEditEntry = (entryId: string, transactions: Transaction[]) => {
    setEditingEntry(entryId);
    // Store original transactions for editing
    const transactionMap: {[key: number]: Transaction} = {};
    transactions.forEach(t => {
      transactionMap[t.id] = { ...t };
    });
    setEditingTransactions(transactionMap);
    
    // Set initial description and date from the first transaction
    if (transactions.length > 0) {
      setEditingDescription(transactions[0].description || '');
      setEditingDate(transactions[0].transactionDate || '');
    }
    
    // Expand the entry to show edit interface
    const newExpanded = new Set(expandedEntries);
    newExpanded.add(entryId);
    setExpandedEntries(newExpanded);
    
    toast({
      title: "Edit Mode",
      description: "Modify accounts and amounts, then save or cancel.",
      variant: "default"
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm("Are you sure you want to delete this journal entry? This action cannot be undone.")) {
      const numericId = parseInt(entryId);
      deleteJournalEntry.mutate(numericId);
    }
    setEditingEntry(null);
    setEditingTransactions({});
    setEditingDescription('');
    setEditingDate('');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditingTransactions({});
    setEditingDescription('');
    setEditingDate('');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    
    const transactions = Object.values(editingTransactions);
    const totalDebit = transactions.reduce((sum, t) => sum + parseFloat(t.debitAmount || '0'), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + parseFloat(t.creditAmount || '0'), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({
        title: "Entry Not Balanced",
        description: `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`,
        variant: "destructive"
      });
      return;
    }

    // Check for transactions with both debit and credit amounts
    const invalidTransactions = transactions.filter(transaction => 
      parseFloat(transaction.debitAmount || '0') > 0 && parseFloat(transaction.creditAmount || '0') > 0
    );

    if (invalidTransactions.length > 0) {
      toast({
        title: "Invalid Entry",
        description: "Each line must have either a debit amount OR a credit amount, not both. Please clear one of the amounts.",
        variant: "destructive"
      });
      return;
    }
    
    // Save the edited journal entry
    try {
      // Find the journal entry group to get the original entry data
      const group = transactionGroups.find(g => g.transactionGroupId === editingEntry);
      if (!group) {
        console.error('Original entry not found');
        return;
      }

      // Convert editingTransactions to the format expected by the API
      const entriesArray = Object.values(editingTransactions).map(transaction => ({
        accountId: transaction.accountId,
        description: transaction.memo || '',
        debitAmount: transaction.debitAmount || '0.00',
        creditAmount: transaction.creditAmount || '0.00',
        memo: transaction.memo
      }));

      const entryData = {
        description: editingDescription || group.description,
        transactionDate: editingDate || group.transactionDate,
        entries: entriesArray
      };

      console.log('Saving entry:', entryData);
      console.log('editingTransactions:', editingTransactions);
      console.log('Entries array length:', entriesArray.length);
      
      // Validate entries have valid accountIds
      const invalidEntries = entriesArray.filter(entry => !entry.accountId || entry.accountId === 0);
      if (invalidEntries.length > 0) {
        console.error('Invalid entries with missing accountId:', invalidEntries);
        toast({
          title: "Error",
          description: "Please select accounts for all entries",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${editingEntry}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(entryData),
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Journal entry updated successfully",
        });
        
        // Clear edit mode
        setEditingEntry(null);
        setEditingTransactions({});
        setEditingDescription('');
        setEditingDate('');
        
        // Refresh the data
        await refetch();
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        let errorMessage = "Failed to update journal entry";
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Error",
        description: `Network error: ${error instanceof Error ? error.message : 'Failed to save journal entry changes'}`,
        variant: "destructive",
      });
    }
  };

  const updateTransaction = (transactionId: number, field: keyof Transaction, value: string | number) => {
    setEditingTransactions(prev => {
      const updated = {
        ...prev,
        [transactionId]: {
          ...prev[transactionId],
          [field]: value
        }
      };

      // Clear the opposite field when entering an amount
      if (field === 'debitAmount' && value && parseFloat(value.toString()) > 0) {
        updated[transactionId].creditAmount = '';
      } else if (field === 'creditAmount' && value && parseFloat(value.toString()) > 0) {
        updated[transactionId].debitAmount = '';
      }

      return updated;
    });
  };

  // Check if the editing entry is valid and balanced
  const isEditingEntryValid = () => {
    if (!editingEntry) return false;
    
    const transactions = Object.values(editingTransactions);
    
    // Check if we have at least 2 valid transactions
    const validTransactions = transactions.filter(t => 
      t.accountId > 0 && (parseFloat(t.debitAmount || '0') > 0 || parseFloat(t.creditAmount || '0') > 0)
    );
    
    if (validTransactions.length < 2) return false;
    
    // Check for transactions with both debit and credit amounts
    const invalidTransactions = transactions.filter(transaction => 
      parseFloat(transaction.debitAmount || '0') > 0 && parseFloat(transaction.creditAmount || '0') > 0
    );
    
    if (invalidTransactions.length > 0) return false;
    
    // Check if debits equal credits
    const totalDebit = transactions.reduce((sum, t) => sum + parseFloat(t.debitAmount || '0'), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + parseFloat(t.creditAmount || '0'), 0);
    
    return Math.abs(totalDebit - totalCredit) < 0.01;
  };

  const addTransactionLine = () => {
    if (!editingEntry) return;
    
    // Generate a temporary negative ID for new transactions
    const tempId = -(Date.now() + Math.random() * 1000);
    
    const newTransaction: Transaction = {
      id: tempId,
      transactionGroupId: editingEntry,
      accountId: 0,
      description: editingDescription || '',
      transactionDate: editingDate || new Date().toISOString().split('T')[0],
      debitAmount: '',
      creditAmount: '',
      transactionType: 'journal',
      memo: '',
      isReconciled: false,
      needsReview: false
    };
    
    setEditingTransactions(prev => ({
      ...prev,
      [tempId]: newTransaction
    }));
  };

  const removeTransactionLine = (transactionId: number) => {
    const currentTransactions = Object.values(editingTransactions);
    if (currentTransactions.length <= 2) {
      toast({
        title: "Cannot Remove Line",
        description: "Journal entries must have at least 2 lines",
        variant: "destructive"
      });
      return;
    }
    
    setEditingTransactions(prev => {
      const updated = { ...prev };
      delete updated[transactionId];
      return updated;
    });
  };

  // Fetch accounts for dropdowns
  const { data: accountsData } = useQuery({
    queryKey: [`/api/accounts`, clientId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/accounts?clientId=${clientId}`);
        return response.json();
      } catch (error) {
        console.error('Account fetch error:', error);
        throw error;
      }
    },
    enabled: !!clientId
  });

  const accounts = accountsData?.accounts || [];

  // Fetch audit history for selected journal entry
  const { data: historyData } = useQuery({
    queryKey: [`/api/journal-entries/${historyEntryId}/history`, historyEntryId],
    enabled: historyEntryId !== null,
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${historyEntryId}/history?clientId=${clientId}`), {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    }
  });

  // Fetch journal entries (the actual double-entry transactions)
  const { data: journalEntriesData, isLoading, error: journalError, refetch } = useQuery({
    queryKey: [`/api/journal-entries/${clientId}`, filterAccount, filterType, searchTerm],
    queryFn: async () => {
      try {
        // Debug: Check authentication status before making request
        console.log('🔐 AUTH DEBUG: Making journal entries request for clientId:', clientId);
        console.log('🔐 AUTH DEBUG: User authenticated:', !!user);
        console.log('🔐 AUTH DEBUG: User data:', user);
        
        const limit = showAllEntries ? 10000 : 100;
        const response = await apiRequest("GET", `/api/journal-entries/${clientId}?limit=${limit}`, {
          credentials: 'include',
        });
        return response.json();
      } catch (error) {
        console.error('Journal entries fetch error:', error);
        console.error('🔐 AUTH DEBUG: Request failed - user may not be authenticated');
        throw error;
      }
    },
    enabled: !!clientId && !!user, // Only make request if user is authenticated
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  
  // Transform journal entries to match the expected format
  const entries = Array.isArray(journalEntriesData) ? journalEntriesData : (journalEntriesData?.entries || []);
  
  // Show authentication error if user is not logged in
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to view journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be authenticated to access journal entries. Please log in and try again.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Process journal entries for display
  
  let transactionGroups = entries.map((entry: any) => {
    const lines = entry.lines || [];
    const totalDebit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.debitAmount || "0"), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.creditAmount || "0"), 0);
    
    return {
      transactionGroupId: formatIdToFiveDigits(entry.id),
      entryNumber: entry.entryNumber || `JE-${formatIdToFiveDigits(entry.id)}`,
      description: entry.description,
      transactionDate: entry.entryDate,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      transactions: lines.map((line: any) => ({
        id: line.id,
        transactionGroupId: formatIdToFiveDigits(entry.id),
        accountId: line.accountId,
        description: entry.description,
        transactionDate: entry.entryDate,
        debitAmount: line.debitAmount || "0",
        creditAmount: line.creditAmount || "0",
        transactionType: "journal_entry",
        isReconciled: false,
        needsReview: false,
        memo: line.memo || "",
        account: line.account || null
      }))
    };
  });
  
  // Date filtering logic - handle both quick filters and custom date ranges
  if (quickFilter !== 'all') {
    const filterDates = getQuickFilterDates(quickFilter);
    if (filterDates.start && filterDates.end) {
      transactionGroups = transactionGroups.filter(group => {
        const entryDate = new Date(group.transactionDate);
        const startDate = new Date(filterDates.start);
        const endDate = new Date(filterDates.end);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }
  } else if (dateRange.start && dateRange.end) {
    // Apply custom date range when 'all' is selected but user set custom dates
    transactionGroups = transactionGroups.filter(group => {
      const entryDate = new Date(group.transactionDate);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }
  
  // Apply text search filtering
  if (searchTerm) {
    transactionGroups = transactionGroups.filter(group => 
      group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.entryNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Pagination logic - only render current page
  const totalPages = Math.ceil(transactionGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = transactionGroups.slice(startIndex, endIndex);

  // Final processing complete

  // Create journal entry mutation
  const createJournalEntry = useMutation({
    mutationFn: async (journalEntry: {
      description: string;
      transactionDate: string;
      entries: Array<{
        accountId: number;
        debitAmount: string;
        creditAmount: string;
        memo?: string;
      }>;
    }) => {
      const response = await apiRequest("POST", `/api/journal-entries/${clientId}`, journalEntry, {
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${clientId}`] });
      setShowNewJournalEntry(false);
      toast({
        title: "Success",
        description: "Journal entry created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive"
      });
    }
  });

  // Delete journal entry mutation
  const deleteJournalEntry = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest("DELETE", `/api/journal-entries/${entryId}`, undefined, {
        credentials: 'include',
      });
      // 204 No Content response doesn't have a body to parse
      if (response.status === 204) {
        return { success: true };
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${clientId}`] });
      toast({
        title: "Entry Deleted",
        description: "Journal entry has been deleted successfully.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete journal entry.",
        variant: "destructive"
      });
    }
  });

  // Import transactions mutation
  const importTransactions = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(apiConfig.buildUrl(`/api/import-transactions/${clientId}`), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${clientId}`] });
      toast({
        title: "Success",
        description: "Transactions imported successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importTransactions.mutate(file);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(num);
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account ? account.name : `Account ${accountId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
          <p className="text-sm text-gray-600">Double-entry transaction management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewJournalEntry(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search entries or entry numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map((filter) => (
            <Button
              key={filter}
              variant={quickFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter(filter)}
              className="capitalize h-9"
            >
              {filter === 'all' ? 'All' : filter}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="w-32 h-9"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="w-32 h-9"
            placeholder="End date"
          />
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setFilterAccount("");
            setFilterType("");
            setSearchTerm("");
            setQuickFilter('all');
            setDateRange({ start: '', end: '' });
          }}
          className="h-9"
        >
          Clear
        </Button>
      </div>

      {/* Journal Book Style Entries */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        {journalError && (
          <div className="p-4 bg-red-50 border-b">
            <p className="text-red-600">Error loading journal entries: {journalError.message}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading journal entries...</p>
          </div>
        ) : paginatedGroups.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No journal entries found</h3>
            <p className="text-gray-600 mb-4">Start by creating your first journal entry or check your filter settings</p>
            <Button onClick={() => setShowNewJournalEntry(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create First Entry
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedGroups.map((group: TransactionGroup, index: number) => {
              const isExpanded = expandedEntries.has(group.transactionGroupId);
              
              return (
                <div key={group.transactionGroupId} className={`hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
                  {/* Journal Entry Line */}
                  <div 
                    className="flex items-center p-4 cursor-pointer"
                    onClick={() => {
                      if (editingEntry === group.transactionGroupId) {
                        handleCancelEdit();
                      } else {
                        toggleExpanded(group.transactionGroupId);
                      }
                    }}
                  >
                    <div className="w-20 text-sm text-gray-600 font-mono">
                      {(() => {
                        try {
                          // Handle YYYY-MM-DD format safely without timezone conversion
                          if (/^\d{4}-\d{2}-\d{2}$/.test(group.transactionDate)) {
                            const [year, month, day] = group.transactionDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit',
                              year: '2-digit'
                            });
                          }
                          
                          // For other formats, use standard parsing
                          const date = new Date(group.transactionDate);
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit',
                            year: '2-digit'
                          });
                        } catch (error) {
                          return group.transactionDate;
                        }
                      })()}
                    </div>
                    <div className="w-32 text-sm text-gray-500 font-mono">
                      {group.entryNumber}
                    </div>
                    <div className="flex-1 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          group.isBalanced ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium text-gray-900">{group.description}</span>
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-green-600">
                      {formatCurrency(group.totalDebit)}
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-red-600">
                      {formatCurrency(group.totalCredit)}
                    </div>
                    <div className="w-24 flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const numericId = parseInt(group.transactionGroupId);
                          setHistoryEntryId(numericId);
                        }}
                        title="View edit history"
                      >
                        <History className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEntry(group.transactionGroupId, group.transactions);
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-6">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t">
                      <div className="p-4">
                        {editingEntry === group.transactionGroupId ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Edit Journal Entry</h4>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={addTransactionLine}
                                  className="h-7 px-3"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Line
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-7 px-3"
                                >
                                  Cancel
                                </Button>
                                <div className="flex items-center gap-2">
                                  {!isEditingEntryValid() && (
                                    <div className="text-xs text-amber-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {(() => {
                                        const transactions = Object.values(editingTransactions);
                                        const validTransactions = transactions.filter(t => 
                                          t.accountId > 0 && (parseFloat(t.debitAmount || '0') > 0 || parseFloat(t.creditAmount || '0') > 0)
                                        );
                                        const totalDebit = transactions.reduce((sum, t) => sum + parseFloat(t.debitAmount || '0'), 0);
                                        const totalCredit = transactions.reduce((sum, t) => sum + parseFloat(t.creditAmount || '0'), 0);
                                        
                                        if (validTransactions.length < 2) {
                                          return "Complete at least 2 entries";
                                        } else if (Math.abs(totalDebit - totalCredit) > 0.01) {
                                          return `Unbalanced: $${totalDebit.toFixed(2)} ≠ $${totalCredit.toFixed(2)}`;
                                        } else {
                                          return "Complete all entries";
                                        }
                                      })()}
                                    </div>
                                  )}
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={!isEditingEntryValid()}
                                    className="h-7 px-3"
                                    title={!isEditingEntryValid() ? "Complete all entries and ensure debits equal credits to save" : "Save changes"}
                                  >
                                    Save
                                  </Button>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteEntry(group.transactionGroupId)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Description and Date Fields */}
                            <div className="bg-gray-50 p-4 rounded-lg border">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">
                                    Description *
                                  </Label>
                                  <Input
                                    id="edit-description"
                                    value={editingDescription}
                                    onChange={(e) => setEditingDescription(e.target.value)}
                                    placeholder="Enter journal entry description"
                                    className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="edit-date" className="text-sm font-medium text-gray-700">
                                    Entry Date *
                                  </Label>
                                  <Input
                                    id="edit-date"
                                    type="date"
                                    value={editingDate}
                                    onChange={(e) => setEditingDate(e.target.value)}
                                    className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Edit Table */}
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="text-left p-2 text-sm font-medium">Account</th>
                                    <th className="text-left p-2 text-sm font-medium">Memo</th>
                                    <th className="text-right p-2 text-sm font-medium">Debit</th>
                                    <th className="text-right p-2 text-sm font-medium">Credit</th>
                                    <th className="text-center p-2 text-sm font-medium w-16">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.values(editingTransactions).map((editTransaction: Transaction) => {
                                    return (
                                      <tr key={editTransaction.id} className="border-t">
                                        <td className="p-2">
                                          <AccountDropdown
                                            clientId={clientId}
                                            value={editTransaction.accountId && editTransaction.accountId > 0 ? editTransaction.accountId.toString() : ""}
                                            onValueChange={(value) => updateTransaction(editTransaction.id, 'accountId', parseInt(value))}
                                            placeholder="Select account"
                                            className="h-8 text-sm"
                                            compact={true}
                                            showAccountNumbers={true}
                                          />
                                        </td>
                                        <td className="p-2">
                                          <Input 
                                            value={editTransaction.memo || ''}
                                            onChange={(e) => updateTransaction(editTransaction.id, 'memo', e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="Memo"
                                          />
                                        </td>
                                        <td className="p-2">
                                          <Input 
                                            value={editTransaction.debitAmount || ''}
                                            onChange={(e) => updateTransaction(editTransaction.id, 'debitAmount', e.target.value)}
                                            className="h-8 text-sm text-right no-spinner"
                                            placeholder="0.00"
                                            type="number"
                                            step="0.01"
                                          />
                                        </td>
                                        <td className="p-2">
                                          <Input 
                                            value={editTransaction.creditAmount || ''}
                                            onChange={(e) => updateTransaction(editTransaction.id, 'creditAmount', e.target.value)}
                                            className="h-8 text-sm text-right no-spinner"
                                            placeholder="0.00"
                                            type="number"
                                            step="0.01"
                                          />
                                        </td>
                                        <td className="p-2 text-center">
                                          {Object.values(editingTransactions).length > 2 && (
                                            <Button
                                              onClick={() => removeTransactionLine(editTransaction.id)}
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-2">
                            {group.transactions.map((transaction: Transaction) => (
                              <div key={transaction.id} className="flex items-center text-sm">
                                <div className="w-20"></div>
                                <div className="flex-1 px-4">
                                  <div className="flex items-center gap-2">
                                    {getAccountIcon(transaction.account?.type || 'asset')}
                                    <span className="font-medium">
                                      {transaction.account?.name || getAccountName(transaction.accountId)}
                                    </span>
                                    {transaction.memo && (
                                      <span className="text-gray-600">- {transaction.memo}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="w-24 text-right font-mono">
                                  {parseFloat(transaction.debitAmount) > 0 ? (
                                    <span className="text-green-600">{formatCurrency(transaction.debitAmount)}</span>
                                  ) : '—'}
                                </div>
                                <div className="w-24 text-right font-mono">
                                  {parseFloat(transaction.creditAmount) > 0 ? (
                                    <span className="text-red-600">{formatCurrency(transaction.creditAmount)}</span>
                                  ) : '—'}
                                </div>
                                <div className="w-22"></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white border-t">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, transactionGroups.length)} of {transactionGroups.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Compact Bottom Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            {transactionGroups.length} entries
          </span>
          <span className="text-gray-600">
            {transactionGroups.filter(g => g.isBalanced).length} balanced
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span className="text-green-600">
            DR: {formatCurrency(transactionGroups.reduce((sum, group) => sum + parseFloat(group.totalDebit || "0"), 0).toString())}
          </span>
          <span className="text-red-600">
            CR: {formatCurrency(transactionGroups.reduce((sum, group) => sum + parseFloat(group.totalCredit || "0"), 0).toString())}
          </span>
        </div>
      </div>

      {/* Modern Journal Entry Side Panel */}
      {showNewJournalEntry && (
        <JournalEntryPanel
          clientId={clientId}
          accounts={accounts}
          onClose={() => setShowNewJournalEntry(false)}
          onSave={(entry) => createJournalEntry.mutate(entry)}
          isLoading={createJournalEntry.isPending}
        />
      )}
      
      {/* History Dialog */}
      <Dialog open={historyEntryId !== null} onOpenChange={() => setHistoryEntryId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Journal Entry Edit History</DialogTitle>
            <DialogDescription>
              View all changes made to this journal entry
            </DialogDescription>
          </DialogHeader>
          
          {historyData && historyData.history && historyData.history.length > 0 ? (
            <div className="space-y-4">
              {historyData.history.map((record: any, index: number) => (
                <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {index === historyData.history.length - 1 ? 'Original Entry' : `Edit #${historyData.history.length - index - 1}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.changedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} by {record.changedByUsername || 'System'}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-blue-600">
                      {record.changeType}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Entry Date</div>
                      <div className="font-mono">{record.entryDate}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Reference</div>
                      <div className="font-mono">{record.referenceNumber || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                    <div className="text-sm">{record.description}</div>
                  </div>
                  
                  {record.snapshotData && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">Entry Lines</div>
                      <div className="space-y-1">
                        {record.snapshotData.lines?.map((line: any, lineIdx: number) => (
                          <div key={lineIdx} className="flex justify-between text-xs font-mono bg-white px-3 py-2 rounded">
                            <span className="text-gray-700">{line.accountName || `Account ${line.accountId}`}</span>
                            <div className="flex gap-4">
                              <span className="text-green-600">DR: ${line.debitAmount || '0.00'}</span>
                              <span className="text-red-600">CR: ${line.creditAmount || '0.00'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No edit history available</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Modern Journal Entry Side Panel Component
function JournalEntryPanel({
  clientId,
  accounts,
  onClose,
  onSave,
  isLoading
}: {
  clientId: number;
  accounts: Account[];
  onClose: () => void;
  onSave: (entry: any) => void;
  isLoading: boolean;
}) {
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([
    { accountId: 0, debitAmount: "", creditAmount: "", memo: "", contactId: 0 },
    { accountId: 0, debitAmount: "", creditAmount: "", memo: "", contactId: 0 }
  ]);
  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);

  // Fetch contacts for AR/AP selection
  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/crm/contacts/${clientId}`],
    enabled: !!clientId,
  });

  // Debug log contacts and accounts
  console.log('🔍 Available contacts:', contacts);
  console.log('🔍 Available accounts:', accounts);
  
  // Extract contacts data from API response
  const contactsData = contacts?.data || [];

  const addEntry = () => {
    setEntries([...entries, { accountId: 0, debitAmount: "", creditAmount: "", memo: "", contactId: 0 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: string, value: string) => {
    const newEntries = [...entries];
    
    // Clear the opposite field when entering an amount
    if (field === 'debitAmount' && value && parseFloat(value) > 0) {
      newEntries[index].creditAmount = '';
    } else if (field === 'creditAmount' && value && parseFloat(value) > 0) {
      newEntries[index].debitAmount = '';
    }
    
    (newEntries[index] as any)[field] = value;
    setEntries(newEntries);
  };

  const getTotalDebits = () => {
    return entries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount || "0"), 0);
  };

  const getTotalCredits = () => {
    return entries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount || "0"), 0);
  };

  const isBalanced = () => {
    return Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;
  };

  const getDifference = () => {
    return getTotalDebits() - getTotalCredits();
  };

  const getFilteredAccounts = () => {
    if (!accountSearch.trim()) return accounts;
    return accounts.filter(account => 
      account.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
      (account.accountNumber && account.accountNumber.includes(accountSearch))
    );
  };

  const suggestAutoBalance = () => {
    const difference = getDifference();
    if (Math.abs(difference) < 0.01) return null;
    
    // Find the last empty entry
    const emptyEntryIndex = entries.findIndex(entry => 
      entry.accountId === 0 && !entry.debitAmount && !entry.creditAmount
    );
    
    if (emptyEntryIndex === -1) return null;
    
    return {
      index: emptyEntryIndex,
      amount: Math.abs(difference),
      type: difference > 0 ? 'credit' : 'debit'
    };
  };

  // Helper function to check if account is AR/AP
  const isARAPAccount = (accountId: number) => {
    const numericId = typeof accountId === 'string' ? parseInt(accountId) : accountId;
    const account = accounts.find(acc => acc.id === numericId);
    const isARAP = account && (account.subtype === 'accounts_receivable' || account.subtype === 'accounts_payable');
    console.log(`🔍 Checking account ${accountId} (${numericId}): name=${account?.name}, subtype=${account?.subtype}, isARAP=${isARAP}`);
    return isARAP;
  };

  const handleSave = () => {
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    if (!isBalanced()) {
      alert("Journal entry must be balanced (debits = credits)");
      return;
    }

    const validEntries = entries.filter(entry => 
      entry.accountId > 0 && (parseFloat(entry.debitAmount || "0") > 0 || parseFloat(entry.creditAmount || "0") > 0)
    );

    if (validEntries.length < 2) {
      alert("Please enter at least 2 valid entries");
      return;
    }

    // Check for entries with both debit and credit amounts
    const invalidEntries = validEntries.filter(entry => 
      parseFloat(entry.debitAmount || "0") > 0 && parseFloat(entry.creditAmount || "0") > 0
    );

    if (invalidEntries.length > 0) {
      alert("Each line must have either a debit amount OR a credit amount, not both. Please clear one of the amounts.");
      return;
    }

    // Validate AR/AP entries require contact selection
    for (const entry of validEntries) {
      if (isARAPAccount(entry.accountId) && !entry.contactId) {
        const account = accounts.find(acc => acc.id === entry.accountId);
        const contactType = account?.subtype === 'accounts_receivable' ? 'customer' : 'vendor';
        alert(`Please select a ${contactType} for ${account?.name} account`);
        return;
      }
    }

    onSave({
      description,
      transactionDate,
      entries: validEntries
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Simple Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">New Journal Entry</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter transaction description"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Journal Entry Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Journal Entries</h4>
                <div className="flex items-center gap-2">
                  {suggestAutoBalance() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const suggestion = suggestAutoBalance();
                        if (suggestion) {
                          updateEntry(suggestion.index, suggestion.type === 'debit' ? 'debitAmount' : 'creditAmount', suggestion.amount.toString());
                        }
                      }}
                      className="text-xs"
                    >
                      Auto-balance
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-48">Account</TableHead>
                    <TableHead className="w-40">Customer/Vendor</TableHead>
                    <TableHead className="w-56">Description</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm text-gray-500">{index + 1}</TableCell>
                      <TableCell>
                        <AccountDropdown
                          clientId={clientId}
                          value={entry.accountId.toString()}
                          onValueChange={(value) => updateEntry(index, 'accountId', value)}
                          placeholder="Select account"
                          className="h-8 w-44"
                          compact={true}
                          showAccountNumbers={true}
                        />
                      </TableCell>
                      <TableCell>
                        {isARAPAccount(entry.accountId) ? (
                          <Select
                            value={entry.contactId > 0 ? entry.contactId.toString() : ""}
                            onValueChange={(value) => updateEntry(index, 'contactId', value)}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue placeholder={
                                accounts.find(acc => acc.id === (typeof entry.accountId === 'string' ? parseInt(entry.accountId) : entry.accountId))?.subtype === 'accounts_receivable' 
                                  ? "Customer" 
                                  : "Vendor"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {contactsData
                                .filter((contact: any) => {
                                  const numericId = typeof entry.accountId === 'string' ? parseInt(entry.accountId) : entry.accountId;
                                  const account = accounts.find(acc => acc.id === numericId);
                                  const contactType = account?.subtype === 'accounts_receivable' ? 'customer' : 'vendor';
                                  return contact.contactType === contactType;
                                })
                                .map((contact: any) => (
                                  <SelectItem key={contact.id} value={contact.id.toString()}>
                                    {contact.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.memo}
                          onChange={(e) => updateEntry(index, 'memo', e.target.value)}
                          placeholder="Description"
                          className="h-8 w-52"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.debitAmount}
                          onChange={(e) => updateEntry(index, 'debitAmount', e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-right font-mono w-28 no-spinner"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.creditAmount}
                          onChange={(e) => updateEntry(index, 'creditAmount', e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-right font-mono w-28 no-spinner"
                        />
                      </TableCell>
                      <TableCell>
                        {entries.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-gray-50 border-t-2 font-medium">
                    <TableCell colSpan={4} className="text-right">Totals:</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={getTotalDebits() > 0 ? 'text-green-600' : 'text-gray-400'}>
                        ${getTotalDebits().toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={getTotalCredits() > 0 ? 'text-red-600' : 'text-gray-400'}>
                        ${getTotalCredits().toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={`w-3 h-3 rounded-full ${isBalanced() ? 'bg-green-500' : 'bg-red-500'}`} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {entries.filter(e => e.accountId > 0).length} entries • {isBalanced() ? 'Balanced' : 'Unbalanced'}
            {!isBalanced() && (
              <span className="text-red-600 ml-2">
                (Diff: ${Math.abs(getDifference()).toFixed(2)})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              disabled={isLoading || !isBalanced()}
            >
              {isLoading ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}