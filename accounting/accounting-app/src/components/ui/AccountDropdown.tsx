import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Building, CreditCard, DollarSign, TrendingUp, TrendingDown, Users, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Account type definitions
export interface Account {
  id: number;
  name: string;
  accountNumber?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales';
  subtype?: string;
  isActive?: boolean;
  balance?: number;
  isDebitNormal?: boolean;
}

// Account type icons mapping
const accountTypeIcons = {
  asset: Building,
  liability: CreditCard,
  equity: Users,
  income: TrendingUp,
  expense: TrendingDown,
  cost_of_sales: DollarSign,
};

// Account type colors
const accountTypeColors = {
  asset: 'bg-blue-100 text-blue-800 border-blue-200',
  liability: 'bg-red-100 text-red-800 border-red-200',
  equity: 'bg-green-100 text-green-800 border-green-200',
  income: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  expense: 'bg-orange-100 text-orange-800 border-orange-200',
  cost_of_sales: 'bg-purple-100 text-purple-800 border-purple-200',
};

export interface AccountDropdownProps {
  // Required props
  clientId: number;
  value?: string | number;
  onValueChange: (value: string) => void;
  
  // Optional props
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  // Filtering options
  accountTypes?: Array<'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales'>;
  excludeInactive?: boolean;
  showAccountNumbers?: boolean;
  showAccountTypes?: boolean;
  showBalances?: boolean;
  
  // Display options
  searchable?: boolean;
  groupByType?: boolean;
  compact?: boolean;
  
  // Custom rendering
  customDisplay?: (account: Account) => React.ReactNode;
  
  // Error handling
  error?: string;
  required?: boolean;
  
  // Z-index control for modal contexts
  zIndex?: number;
  
  // Expose refetch function for external use
  onRefetch?: (refetchFn: () => void) => void;
}

export function AccountDropdown({
  clientId,
  value,
  onValueChange,
  placeholder = "Select account",
  className = "",
  disabled = false,
  accountTypes,
  excludeInactive = true,
  showAccountNumbers = true,
  showAccountTypes = false,
  showBalances = false,
  searchable = true,
  groupByType = false,
  compact = false,
  customDisplay,
  error,
  required = false,
  zIndex = 9999,
  onRefetch,
}: AccountDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch accounts data
  const { data: accountsData, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: [`/api/accounts`, clientId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/accounts?clientId=${clientId}`);
        const data = await response.json();
        console.log(`🔍 AccountDropdown: Fetched ${data.accounts?.length || 0} accounts for client ${clientId}`);
        return data;
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
        throw new Error('Failed to fetch accounts');
      }
    },
    enabled: !!clientId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const accounts: Account[] = accountsData?.accounts || [];
  
  // Debug logging
  React.useEffect(() => {
    if (accounts.length > 0) {
      console.log(`🔍 AccountDropdown: Loaded ${accounts.length} accounts for client ${clientId}`);
      console.log('📋 AccountDropdown: Sample accounts:', accounts.slice(0, 3).map((acc: Account) => ({
        id: acc.id,
        name: acc.name,
        accountNumber: acc.accountNumber,
        type: acc.type,
        isActive: acc.isActive
      })));
    }
  }, [accounts, clientId]);

  // Expose refetch function
  React.useEffect(() => {
    if (onRefetch) {
      onRefetch(refetch);
    }
  }, [refetch, onRefetch]);

  // Filter and process accounts
  const processedAccounts = useMemo(() => {
    let filtered = accounts;

    // Filter by account types
    if (accountTypes && accountTypes.length > 0) {
      filtered = filtered.filter((account: Account) => accountTypes.includes(account.type));
    }

    // Exclude inactive accounts (only exclude if explicitly set to false)
    if (excludeInactive) {
      filtered = filtered.filter((account: Account) => account.isActive !== false);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((account: Account) => 
        account.name.toLowerCase().includes(query) ||
        (account.accountNumber && account.accountNumber.toLowerCase().includes(query)) ||
        account.type.toLowerCase().includes(query)
      );
    }

    // Sort accounts
    filtered.sort((a: Account, b: Account) => {
      // First by account number if available
      if (a.accountNumber && b.accountNumber) {
        return a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true });
      }
      // If only one has account number, prioritize it
      if (a.accountNumber && !b.accountNumber) {
        return -1;
      }
      if (!a.accountNumber && b.accountNumber) {
        return 1;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });

    // Debug logging for processed accounts
    if (filtered.length !== accounts.length) {
      console.log(`🔍 AccountDropdown: Filtered ${accounts.length} accounts to ${filtered.length} accounts`);
      const excluded = accounts.filter((acc: Account) => !filtered.includes(acc));
      console.log('🚫 AccountDropdown: Excluded accounts:', excluded.map((acc: Account) => ({
        id: acc.id,
        name: acc.name,
        accountNumber: acc.accountNumber,
        type: acc.type,
        isActive: acc.isActive
      })));
    }
    
    return filtered;
  }, [accounts, accountTypes, excludeInactive, searchQuery]);

  // Group accounts by type if requested
  const groupedAccounts = useMemo(() => {
    if (!groupByType) return { all: processedAccounts };

    const groups: Record<string, Account[]> = {};
    processedAccounts.forEach((account: Account) => {
      if (!groups[account.type]) {
        groups[account.type] = [];
      }
      groups[account.type].push(account);
    });

    return groups;
  }, [processedAccounts, groupByType]);

  // Get account display name
  const getAccountDisplayName = (account: Account): string => {
    if (showAccountNumbers && account.accountNumber) {
      return `${account.accountNumber} - ${account.name}`;
    }
    return account.name;
  };

  // Get account type icon
  const getAccountTypeIcon = (type: string) => {
    const IconComponent = accountTypeIcons[type as keyof typeof accountTypeIcons] || Building;
    return <IconComponent className="h-3 w-3" />;
  };

  // Get account type color
  const getAccountTypeColor = (type: string) => {
    return accountTypeColors[type as keyof typeof accountTypeColors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Render account item
  const renderAccountItem = (account: Account) => {
    if (customDisplay) {
      return customDisplay(account);
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showAccountTypes && (
            <div className="flex items-center gap-1">
              {getAccountTypeIcon(account.type)}
              <Badge 
                variant="outline" 
                className={`text-xs ${getAccountTypeColor(account.type)}`}
              >
                {account.type}
              </Badge>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {getAccountDisplayName(account)}
            </div>
            {compact && account.accountNumber && (
              <div className="text-xs text-muted-foreground">
                {account.accountNumber}
              </div>
            )}
          </div>
        </div>
        {showBalances && account.balance !== undefined && (
          <div className="text-sm font-mono text-muted-foreground ml-2">
            ${account.balance.toFixed(2)}
          </div>
        )}
      </div>
    );
  };

  // Render grouped accounts
  const renderGroupedAccounts = () => {
    if (!groupByType) {
      return processedAccounts.map((account: Account) => (
        <SelectItem key={account.id} value={account.id.toString()}>
          {renderAccountItem(account)}
        </SelectItem>
      ));
    }

    return Object.entries(groupedAccounts).map(([type, accounts]) => (
      <div key={type}>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
          {type.charAt(0).toUpperCase() + type.slice(1)} Accounts
        </div>
        {accounts.map((account: Account) => (
          <SelectItem key={account.id} value={account.id.toString()}>
            {renderAccountItem(account)}
          </SelectItem>
        ))}
      </div>
    ));
  };

  // Get selected account
  const selectedAccount = accounts.find((account: Account) => account.id.toString() === value?.toString());

  return (
    <div className={`w-full ${className}`}>
      <Select
        value={value?.toString() || ""}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={compact ? "h-8" : ""}>
          <SelectValue placeholder={isLoading ? "Loading accounts..." : placeholder}>
            {selectedAccount && renderAccountItem(selectedAccount)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]" style={{ zIndex }}>
          {searchable && (
            <div className="p-2 border-b">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-8 w-8 p-0"
                  title="Refresh accounts"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading accounts...
            </SelectItem>
          ) : fetchError ? (
            <SelectItem value="error" disabled>
              Error loading accounts
            </SelectItem>
          ) : processedAccounts.length === 0 ? (
            <SelectItem value="empty" disabled>
              {searchQuery ? 'No accounts match your search' : 'No accounts found'}
            </SelectItem>
          ) : (
            renderGroupedAccounts()
          )}
        </SelectContent>
      </Select>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      
      {required && !value && (
        <p className="text-sm text-muted-foreground mt-1">This field is required</p>
      )}
    </div>
  );
}

// Convenience components for common use cases
export function AssetAccountDropdown(props: Omit<AccountDropdownProps, 'accountTypes'>) {
  return <AccountDropdown {...props} accountTypes={['asset']} />;
}

export function LiabilityAccountDropdown(props: Omit<AccountDropdownProps, 'accountTypes'>) {
  return <AccountDropdown {...props} accountTypes={['liability']} />;
}

export function IncomeAccountDropdown(props: Omit<AccountDropdownProps, 'accountTypes'>) {
  return <AccountDropdown {...props} accountTypes={['income']} />;
}

export function ExpenseAccountDropdown(props: Omit<AccountDropdownProps, 'accountTypes'>) {
  return <AccountDropdown {...props} accountTypes={['expense']} />;
}

export function AllAccountDropdown(props: AccountDropdownProps) {
  return <AccountDropdown {...props} />;
}
