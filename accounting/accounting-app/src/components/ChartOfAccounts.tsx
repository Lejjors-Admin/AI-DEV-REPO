import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  RefreshCw, Download, Info, 
  Plus, Edit, Trash2, 
  Upload, UploadCloud, FileUp, 
  Tag, AlertCircle, CheckCircle,
  FileOutput, Sparkles, 
  Calculator, Search, Link,
  BarChart, Lightbulb, Shield, 
  Merge, Hash, ChevronDown, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import { FileDropZone } from "./FileDropZone";
import { AccountNumberDialog } from "./financial/AccountNumberDialog";
import { AccountTypeEditor } from "./AccountTypeEditor";
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface ChartOfAccountsProps {
  clientId: string;
  showTitle?: boolean;
  compact?: boolean;
}

// Chart of Accounts now handles structure only - no balances

export function ChartOfAccounts({ clientId, showTitle = true, compact = false }: ChartOfAccountsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const accountsFileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showEditAccountDialog, setShowEditAccountDialog] = useState(false);
  const [showDeleteAccountConfirmDialog, setShowDeleteAccountConfirmDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAccountNumberDialog, setShowAccountNumberDialog] = useState(false);
  const [selectedAccountForNumberEdit, setSelectedAccountForNumberEdit] = useState<any>(null);
  const [showAccountTypeEditor, setShowAccountTypeEditor] = useState(false);
  const [isRunningAIAnalysis, setIsRunningAIAnalysis] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [showGenerateAccountsDialog, setShowGenerateAccountsDialog] = useState(false);
  const [generatingAccounts, setGeneratingAccounts] = useState(false);
  const [industryInput, setIndustryInput] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  
  // Inline type editing state
  const [editingAccountType, setEditingAccountType] = useState<number | null>(null);
  
  // Mass selection state
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Sorting and filtering state
  const [sortField, setSortField] = useState<'accountNumber' | 'name' | 'type' | 'subtype'>('accountNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubtype, setFilterSubtype] = useState<string>('all');

  const [newAccountFormData, setNewAccountFormData] = useState({
    name: '',
    type: 'asset',
    subtype: '',
    description: '',
    isActive: true,
    accountNumber: ''
  });

  // Fetch accounts data
  const { data: accountsData, isLoading: isLoadingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: [`/api/accounts`, clientId],
    queryFn: async ({ signal }) => {
      console.log(`🔍 Fetching accounts for client ${clientId}`);
      const res = await fetch(apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`), { 
        signal,
        cache: 'no-cache' // Force fresh data
      });
      if (!res.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await res.json();
      console.log(`✅ Received ${data.accounts?.length || 0} accounts for client ${clientId}`);
      return data;
    },
    enabled: !!clientId,
    staleTime: 0, // Always consider data stale
    cacheTime: 0  // Don't cache the data
  });

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const accounts = accountsData?.accounts || [];
  const accountsValidation = accountsData?.validation;

  // Sort and filter accounts
  const sortedAndFilteredAccounts = React.useMemo(() => {
    let filtered = accounts;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.type === filterType);
    }

    // Apply subtype filter
    if (filterSubtype !== 'all') {
      filtered = filtered.filter(account => account.subtype === filterSubtype);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortField) {
        case 'accountNumber':
          aValue = a.accountNumber || '';
          bValue = b.accountNumber || '';
          // Natural sorting for account numbers (handle numeric and alphanumeric)
          const aNum = parseInt(aValue.replace(/[^0-9]/g, '')) || 0;
          const bNum = parseInt(bValue.replace(/[^0-9]/g, '')) || 0;
          if (aNum !== bNum) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
          }
          // If numeric parts are equal, sort alphabetically
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'subtype':
          aValue = a.subtype || '';
          bValue = b.subtype || '';
          break;
      }

      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [accounts, sortField, sortDirection, filterType, filterSubtype]);

  // Get unique types and subtypes for filter options
  const uniqueTypes = React.useMemo(() => {
    const types = accounts.map((account: any) => account.type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  }, [accounts]);

  const uniqueSubtypes = React.useMemo(() => {
    const subtypes = accounts.map((account: any) => account.subtype).filter(Boolean);
    return Array.from(new Set(subtypes)).sort();
  }, [accounts]);

  // Handle sorting
  const handleSort = (field: 'accountNumber' | 'name' | 'type' | 'subtype') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fetch tax settings
  const { data: taxData, isLoading: isLoadingTaxSettings } = useQuery({
    queryKey: [`/api/tax-settings/${clientId}`],
    queryFn: async ({ signal }) => {
      const res = await fetch(apiConfig.buildUrl(`/api/tax-settings/${clientId}`), { signal });
      if (!res.ok) {
        throw new Error('Failed to fetch tax settings');
      }
      return res.json();
    },
    enabled: !!clientId
  });

  // Handle file upload for accounts
  const handleAccountsFileUpload = () => {
    accountsFileInputRef.current?.click();
  };

  // AI Analysis functions
  const runChartAIAnalysis = async (analysisType: string) => {
    if (!clientId) {
      toast({
        title: "Select a client",
        description: "Please select a client before running AI analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsRunningAIAnalysis(true);
    try {
      const response = await apiRequest('POST', `/api/ai-agents/categorizer`, {
        clientId: parseInt(clientId),
        analysisType,
        options: {
          includeRecommendations: true,
          includeCompliance: true,
          includeAccountNumbers: true
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAiAnalysisResult(result);
        
        toast({
          title: "AI Analysis Complete",
          description: `Successfully analyzed chart of accounts with ${analysisType}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to run AI analysis",
        variant: "destructive",
      });
    } finally {
      setIsRunningAIAnalysis(false);
    }
  };

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest('POST', '/api/accounts', accountData);
      if (!response.ok) {
        throw new Error('Failed to create account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
      console.log(`🔄 Invalidated cache for client ${clientId} after account creation`);
      setShowNewAccountDialog(false);
      setNewAccountFormData({
        name: '',
        type: 'asset',
        subtype: '',
        description: '',
        isActive: true,
        accountNumber: ''
      });
      toast({
        title: "Account created",
        description: "New account has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating account",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/accounts/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
      console.log(`🔄 Invalidated cache for client ${clientId} after account update`);
      setShowEditAccountDialog(false);
      setSelectedAccount(null);
      toast({
        title: "Account updated",
        description: "Account has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating account",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await apiRequest('DELETE', `/api/accounts/${id}`, { headers, credentials: 'include' }, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      // 204 No Content response doesn't have a body
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
      console.log(`🔄 Invalidated cache for client ${clientId} after account deletion`);
      setShowDeleteAccountConfirmDialog(false);
      setSelectedAccount(null);
      toast({
        title: "Account deleted",
        description: "Account has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  });
  // Batch delete accounts mutation
  const batchDeleteAccountsMutation = useMutation({
    mutationFn: async (accountIds: number[]) => {
      const response = await apiRequest('DELETE', `/api/accounts/batch/${clientId}`, { accountIds }, { headers, credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to batch delete accounts');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
      console.log(`🔄 Invalidated cache for client ${clientId} after batch deletion`);
      setShowBatchDeleteDialog(false);
      setSelectedAccountIds([]);
      setIsBatchDeleting(false);
      toast({
        title: "Accounts deleted",
        description: `Successfully deleted ${data.deletedCount} accounts.`,
      });
    },
    onError: (error: any) => {
      setIsBatchDeleting(false);
      toast({
        title: "Error deleting accounts",
        description: error.message || "Failed to delete accounts",
        variant: "destructive",
      });
    }
  });

  // Selection helper functions
  const handleSelectAccount = (accountId: number, checked: boolean) => {
    if (checked) {
      setSelectedAccountIds(prev => [...prev, accountId]);
    } else {
      setSelectedAccountIds(prev => prev.filter(id => id !== accountId));
    }
  };

  const handleBatchDelete = () => {
    setIsBatchDeleting(true);
    batchDeleteAccountsMutation.mutate(selectedAccountIds);
  };

  const handleCreateAccount = () => {
    const accountData = {
      ...newAccountFormData,
      clientId: parseInt(clientId)
    };
    createAccountMutation.mutate(accountData);
  };

  const handleGenerateAccounts = async () => {
    if (!industryInput.trim()) {
      toast({
        title: "Industry Required",
        description: "Please enter an industry to generate accounts for",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAccounts(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl('/api/ai/generate-coa'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId: parseInt(clientId),
          industry: industryInput.trim(),
          country: countryCode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chart of accounts');
      }

      const result = await response.json();
      
      if (result.success && result.accounts) {
        toast({
          title: "COA Generated Successfully",
          description: `Generated ${result.accounts.length} accounts for ${industryInput}`,
        });
        
        // Refresh accounts
        queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
        setShowGenerateAccountsDialog(false);
        setIndustryInput('');
        setCountryCode('US');
      } else {
        throw new Error(result.error || 'Failed to generate accounts');
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate chart of accounts",
        variant: "destructive",
      });
    } finally {
      setGeneratingAccounts(false);
    }
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;
    
    const accountData = {
      name: selectedAccount.name,
      type: selectedAccount.type,
      subtype: selectedAccount.subtype,
      description: selectedAccount.description,
      isActive: selectedAccount.isActive,

    };
    updateAccountMutation.mutate({ id: selectedAccount.id, data: accountData });
  };

  // Quick type change handler
  const handleQuickTypeChange = (accountId: number, newType: string, account: any) => {
    const accountData = {
      name: account.name,
      type: newType,
      subtype: account.subtype,
      description: account.description,
      isActive: account.isActive
    };
    updateAccountMutation.mutate({ id: accountId, data: accountData });
    setEditingAccountType(null);
  };

  const handleDeleteAccount = (account: any) => {
    setSelectedAccount(account);
    setShowDeleteAccountConfirmDialog(true);
  };

  const confirmDeleteAccount = () => {
    if (selectedAccount) {
      deleteAccountMutation.mutate(selectedAccount.id);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {showTitle && <h3 className="text-xl font-semibold">Chart of Accounts</h3>}
            <div className="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-800">
              Chart Structure ✓
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileDropZone
              selectedClient={clientId}
              fileType="chart-of-accounts"
              onFilesSelected={(files) => {
                console.log("Files selected for AI parsing:", files);
              }}
              onIntakeAnalysis={async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('clientId', clientId);

                try {
                  const token = localStorage.getItem('authToken');    
                  const headers: Record<string, string> = {};
                  if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                  }
                  headers['Content-Type'] = 'application/json';
                  const response = await fetch(apiConfig.buildUrl('/api/ai-intake/analyze-file'), {
                    method: 'POST',
                    body: formData,
                    headers,
                    credentials: 'include',
                  });

                  if (!response.ok) {
                    throw new Error('Failed to analyze file');
                  }

                  const result = await response.json();
                  
                  if (result.success && result.data.accounts.length > 0) {
                    const accountsToImport = result.data.accounts.map((account: any) => ({
                      name: account.name.replace(/\|/g, '').trim(),
                      type: account.type,
                      accountNumber: account.accountNumber,

                      isActive: account.isActive !== false,
                      clientId: parseInt(clientId)
                    }));

                    let successCount = 0;
                    let errorCount = 0;
                    
                    for (const account of accountsToImport) {
                      try {
                        const accountResponse = await apiRequest('POST', '/api/accounts', account);
                        if (accountResponse.ok) {
                          successCount++;
                        } else {
                          errorCount++;
                        }
                      } catch (error) {
                        errorCount++;
                      }
                    }
                    
                    toast({
                      title: "Intake Complete",
                      description: `Created ${successCount} accounts from ${result.data.accounts.length} analyzed`,
                    });
                  }

                  queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
                } catch (error: any) {
                  toast({
                    title: "Intake Failed",
                    description: error.message || "Failed to analyze file",
                    variant: "destructive",
                  });
                }
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[120px]"
              compact={true}
            />
            <Button variant="outline" onClick={() => setShowGenerateAccountsDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate COA
            </Button>
            <Button onClick={() => setShowNewAccountDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Account
            </Button>
            {selectedAccountIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setShowBatchDeleteDialog(true)}
                disabled={isBatchDeleting}
              >
                {isBatchDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedAccountIds.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Sorting Controls */}
      <div className="flex items-center justify-between gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSubtype} onValueChange={setFilterSubtype}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Subtypes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subtypes</SelectItem>
              {uniqueSubtypes.map(subtype => (
                <SelectItem key={subtype} value={subtype}>
                  {subtype.charAt(0).toUpperCase() + subtype.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {sortedAndFilteredAccounts.length} of {accounts.length} accounts</span>
        </div>
      </div>

      {/* Accounts Table */}
      {isLoadingAccounts ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding accounts to your chart of accounts.
            </p>
            <Button onClick={() => setShowNewAccountDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={sortedAndFilteredAccounts.length > 0 && selectedAccountIds.length === sortedAndFilteredAccounts.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAccountIds(sortedAndFilteredAccounts.map((acc: any) => acc.id));
                        } else {
                          setSelectedAccountIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('accountNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Account #
                      {sortField === 'accountNumber' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'accountNumber' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Account Name
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'name' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      Type
                      {sortField === 'type' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'type' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('subtype')}
                  >
                    <div className="flex items-center gap-2">
                      Subtype
                      {sortField === 'subtype' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'subtype' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredAccounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAccountIds.includes(account.id)}
                        onCheckedChange={(checked) => handleSelectAccount(account.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.accountNumber || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      {editingAccountType === account.id ? (
                        <Select 
                          value={account.type} 
                          onValueChange={(value) => handleQuickTypeChange(account.id, value, account)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asset">Asset</SelectItem>
                            <SelectItem value="liability">Liability</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="cost_of_sales">Cost of Sales</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="other_income">Other Income</SelectItem>
                            <SelectItem value="other_expense">Other Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant="secondary" 
                            className={`cursor-pointer hover:opacity-80 ${
                              account.type === 'asset' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                              account.type === 'liability' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                              account.type === 'equity' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                              account.type === 'income' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                              account.type === 'cost_of_sales' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                              account.type === 'expense' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                              account.type === 'other_income' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                              account.type === 'other_expense' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                              'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            onClick={() => setEditingAccountType(account.id)}
                          >
                            {account.type === 'cost_of_sales' ? 'Cost of Sales' : 
                             account.type === 'other_income' ? 'Other Income' :
                             account.type === 'other_expense' ? 'Other Expense' :
                             account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            onClick={() => setEditingAccountType(account.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={account.subtype || ''}
                        placeholder="Enter subtype..."
                        className="w-32 text-sm"
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value !== account.subtype) {
                            updateAccountMutation.mutate({
                              id: account.id,
                              data: { 
                                name: account.name,
                                type: account.type,
                                subtype: value,
                                description: account.description,
                                isActive: account.isActive
                              }
                            });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {account.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowEditAccountDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Account
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAccount(account)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={accountsFileInputRef}
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* New Account Dialog */}
      <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Add a new account to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-number">Account Number</Label>
              <Input
                id="account-number"
                value={newAccountFormData.accountNumber}
                onChange={(e) => setNewAccountFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="e.g. 1000, 101-000"
              />
            </div>
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                value={newAccountFormData.name}
                onChange={(e) => setNewAccountFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter account name"
              />
            </div>
            <div>
              <Label htmlFor="account-type">Account Type</Label>
              <select
                id="account-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newAccountFormData.type}
                onChange={(e) => {
                  console.log('Account type changed to:', e.target.value);
                  setNewAccountFormData(prev => ({ ...prev, type: e.target.value }));
                }}
              >
                <option value="">Select account type</option>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="income">Income</option>
                <option value="cost_of_sales">Cost of Sales</option>
                <option value="expense">Expense</option>
                <option value="other_income">Other Income</option>
                <option value="other_expense">Other Expense</option>
              </select>
            </div>
            <div>
              <Label htmlFor="account-subtype">Account Subtype</Label>
              <Input
                id="account-subtype"
                value={newAccountFormData.subtype}
                onChange={(e) => setNewAccountFormData(prev => ({ ...prev, subtype: e.target.value }))}
                placeholder="Enter subtype (e.g. bank, checking, savings)..."
              />
            </div>
            <div>
              <Label htmlFor="account-description">Description</Label>
              <Input
                id="account-description"
                value={newAccountFormData.description}
                onChange={(e) => setNewAccountFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description (optional)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-active"
                checked={newAccountFormData.isActive}
                onCheckedChange={(checked) => setNewAccountFormData(prev => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="is-active">Active account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditAccountDialog} onOpenChange={setShowEditAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account details
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-number">Account Number</Label>
                  <Input
                    id="edit-number"
                    value={selectedAccount.accountNumber || ''}
                    onChange={(e) => setSelectedAccount({...selectedAccount, accountNumber: e.target.value})}
                    placeholder="e.g. 1000, 101-000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-name">Account Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedAccount.name}
                    onChange={(e) => setSelectedAccount({...selectedAccount, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-type">Account Type</Label>
                  <select
                    id="edit-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedAccount.type}
                    onChange={(e) => {
                      console.log('Edit account type changed to:', e.target.value);
                      setSelectedAccount({...selectedAccount, type: e.target.value});
                    }}
                  >
                    <option value="">Select account type</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="cost_of_sales">Cost of Sales</option>
                    <option value="expense">Expense</option>
                    <option value="other_income">Other Income</option>
                    <option value="other_expense">Other Expense</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="edit-subtype">Account Subtype</Label>
                  <Input
                    id="edit-subtype"
                    value={selectedAccount.subtype || ''}
                    onChange={(e) => setSelectedAccount({...selectedAccount, subtype: e.target.value})}
                    placeholder="Enter subtype..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={selectedAccount.description || ''}
                    onChange={(e) => setSelectedAccount({...selectedAccount, description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-isActive" 
                    checked={selectedAccount.isActive}
                    onCheckedChange={(checked) => 
                      setSelectedAccount({...selectedAccount, isActive: !!checked})
                    }
                  />
                  <Label htmlFor="edit-isActive">Active Account</Label>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedAccount(null);
              setShowEditAccountDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedAccount) {
                updateAccountMutation.mutate({
                  id: selectedAccount.id,
                  data: {
                    name: selectedAccount.name,
                    type: selectedAccount.type,
                    subtype: selectedAccount.subtype,
                    description: selectedAccount.description,
                    isActive: selectedAccount.isActive,
                    accountNumber: selectedAccount.accountNumber
                  }
                });
              }
            }} disabled={updateAccountMutation.isPending}>
              {updateAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Number Dialog */}
      {selectedAccountForNumberEdit && (
        <AccountNumberDialog
          account={selectedAccountForNumberEdit}
          open={showAccountNumberDialog}
          onOpenChange={setShowAccountNumberDialog}
        />
      )}

      {/* Account Type Editor Dialog */}
      <Dialog open={showAccountTypeEditor} onOpenChange={setShowAccountTypeEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Type Editor</DialogTitle>
            <DialogDescription>
              Drag accounts between sections to change their type
            </DialogDescription>
          </DialogHeader>
          {accounts.length > 0 && (
            <AccountTypeEditor
              accounts={accounts.map((account: any) => ({
                id: account.id,
                name: account.name,
                type: account.type as 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales',
                accountNumber: account.accountNumber
              }))}
              clientId={parseInt(clientId)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountConfirmDialog} onOpenChange={setShowDeleteAccountConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Accounts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedAccountIds.length} selected accounts? This action cannot be undone and will permanently remove all selected accounts from your chart of accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchDelete} 
              disabled={isBatchDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBatchDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedAccountIds.length} Accounts`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate COA Dialog */}
      <Dialog open={showGenerateAccountsDialog} onOpenChange={setShowGenerateAccountsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Chart of Accounts</DialogTitle>
            <DialogDescription>
              Generate a complete chart of accounts based on your industry and country
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                placeholder="e.g. Construction, Restaurant, Retail"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="UK">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateAccountsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateAccounts} disabled={generatingAccounts || !industryInput.trim()}>
              {generatingAccounts ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate COA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}