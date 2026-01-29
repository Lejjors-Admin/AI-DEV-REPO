/**
 * JOURNAL ENTRIES HOOK - STRATEGIC REFACTOR
 * 
 * Centralized data management with React Query for efficient caching
 * and proper error handling. Eliminates state management complexity.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from "@/lib/api-config";

// Utility function to format IDs to 5 digits
const formatIdToFiveDigits = (id: number | string): string => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return numericId.toString().padStart(5, '0');
};

interface JournalEntry {
  id: number;
  clientId: number;
  entryNumber: string | null;
  description: string;
  entryDate: string;
  totalDebit: string;
  totalCredit: string;
  status: string;
  isBalanced: boolean;
  needsReview: boolean;
  referenceNumber: string | null;
  sourceDocument: string | null;
  createdAt: Date | null;
  lines: JournalEntryLine[];
  transactions?: JournalEntryLine[]; // Legacy compatibility
}

interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  account: {
    id: number;
    name: string;
    accountNumber: string | null;
    type: string;
    isDebitNormal: boolean;
  } | null;
  description: string | null;
  debitAmount: string;
  creditAmount: string;
  memo: string | null;
  // Legacy compatibility fields
  transactionGroupId?: string;
  transactionDate?: string;
  categoryId?: null;
  category?: null;
  isReconciled?: boolean;
}

interface JournalEntriesResponse {
  entries: JournalEntry[];
  metadata: {
    total: number;
    loaded: number;
    offset: number;
    limit: number;
    loadingMode: string;
    hasMore: boolean;
    dateRange?: { start: string; end: string } | null;
  };
}

interface UseJournalEntriesOptions {
  clientId: number;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

interface CreateJournalEntryData {
  description: string;
  transactionDate: string;
  entries: Array<{
    accountId: number;
    description?: string;
    debitAmount: string;
    creditAmount: string;
    memo?: string;
  }>;
  referenceNumber?: string;
}

export function useJournalEntries({
  clientId,
  limit = 50,
  offset = 0,
  startDate,
  endDate,
  enabled = true
}: UseJournalEntriesOptions) {
  const queryKey = ['journal-entries', clientId, { limit, offset, startDate, endDate }];
  
  return useQuery<JournalEntriesResponse>({
    queryKey,
    queryFn: async () => {
      console.log(`🚀 USEJOURNAL HOOK: Fetching entries for client ${clientId}, params:`, { limit, offset, startDate, endDate });
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const url = apiConfig.buildUrl(`/api/journal-entries/${clientId}?${params}`);
      console.log(`📡 FETCHING: ${url}`);
      
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`❌ FETCH FAILED: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch journal entries: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ RAW API RESPONSE:`, data);
      
      // Debug the first entry's date format
      if (data.entries && data.entries.length > 0) {
        const firstEntry = data.entries[0];
        console.log(`📅 First entry date debug:`, {
          entryDate: firstEntry.entryDate,
          entryDateType: typeof firstEntry.entryDate,
          // Safe parsing without timezone conversion for debugging
          safeParsedDate: /^\d{4}-\d{2}-\d{2}$/.test(firstEntry.entryDate) 
            ? (() => {
                const [year, month, day] = firstEntry.entryDate.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()
            : new Date(firstEntry.entryDate)
        });
      }
      
      // Transform for legacy compatibility if needed
      if (data.entries) {
        data.entries = data.entries.map((entry: JournalEntry) => ({
          ...entry,
          transactions: entry.lines?.map(line => ({
            ...line,
            transactionGroupId: formatIdToFiveDigits(entry.id),
            transactionDate: entry.entryDate,
            categoryId: null,
            category: null,
            isReconciled: false
          })) || []
        }));
        console.log(`🔄 TRANSFORMED DATA:`, { entriesCount: data.entries.length, firstEntry: data.entries[0] });
      }
      
      return data;
    },
    enabled: enabled && clientId > 0,
    retry: 1, // Only retry once on failure
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
}

export function useJournalEntriesCount(
  clientId: number, 
  startDate?: string, 
  endDate?: string
) {
  return useQuery({
    queryKey: ['journal-entries-count', clientId, { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${clientId}/count?${params}`));
      if (!response.ok) {
        throw new Error('Failed to fetch count');
      }
      
      const data = await response.json();
      return data.count;
    },
    enabled: clientId > 0,
    staleTime: 60000 // 1 minute
  });
}

export function useCreateJournalEntry(clientId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreateJournalEntryData) => {
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${clientId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create journal entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch journal entries
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', clientId]
      });
      queryClient.invalidateQueries({
        queryKey: ['journal-entries-count', clientId]
      });
      
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateJournalEntry(clientId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ entryId, data }: { entryId: number; data: CreateJournalEntryData }) => {
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${entryId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update journal entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch journal entries
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', clientId]
      });
      queryClient.invalidateQueries({
        queryKey: ['journal-entries-count', clientId]
      });
      
      // Force refetch to ensure fresh data
      queryClient.refetchQueries({
        queryKey: ['journal-entries', clientId]
      });
      
      toast({
        title: "Success",
        description: "Journal entry updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteJournalEntry(clientId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (entryId: number) => {
      const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${entryId}`), {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete journal entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch journal entries
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', clientId]
      });
      queryClient.invalidateQueries({
        queryKey: ['journal-entries-count', clientId]
      });
      
      // Also invalidate invoice queries since deleting payment entries updates invoice paid amounts
      // This ensures the Sales Invoices/Invoice Management table (TabsTrigger value="invoices") updates immediately
      
      // Explicitly invalidate the main invoice query used by InvoiceManagement component
      // which is rendered in the "Sales" tab (value="invoices") in IncomeManagement
      queryClient.invalidateQueries({
        queryKey: ['invoices', clientId]
      });
      
      // Invalidate other invoice-related queries
      queryClient.invalidateQueries({
        queryKey: ['all-invoices', clientId]
      });
      queryClient.invalidateQueries({
        queryKey: ['customer-invoices']
      });
      queryClient.invalidateQueries({
        queryKey: ['invoice-attachment-counts', clientId]
      });
      
      // Invalidate any invoice-related queries with broader pattern matching
      // This catches all variations of invoice query keys
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          
          // Check if any part of the key contains 'invoice' (case-insensitive)
          const hasInvoice = key.some(k => {
            if (typeof k === 'string') {
              const lower = k.toLowerCase();
              return lower.includes('invoice') || k.includes('/api/crm/invoices');
            }
            return false;
          });
          
          // Also check if the key starts with 'invoices' or contains clientId
          const startsWithInvoices = key[0] === 'invoices' || key[0] === 'all-invoices';
          const hasClientId = key.includes(clientId);
          
          return hasInvoice || (startsWithInvoices && hasClientId);
        }
      });
      
      toast({
        title: "Success",
        description: "Journal entry deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Utility hook for loading modes
export function useJournalEntriesLoadingModes(clientId: number) {
  const queryClient = useQueryClient();
  
  const loadAll = () => {
    return queryClient.fetchQuery({
      queryKey: ['journal-entries', clientId, { limit: 100000, offset: 0 }],
      queryFn: async () => {
        const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${clientId}?limit=100000&offset=0`));
        if (!response.ok) throw new Error('Failed to load all entries');
        return response.json();
      },
    });
  };
  
  const loadByDateRange = (startDate: string, endDate: string, limit: number = 1000) => {
    return queryClient.fetchQuery({
      queryKey: ['journal-entries', clientId, { startDate, endDate, limit }],
      queryFn: async () => {
        const params = new URLSearchParams({
          startDate,
          endDate,
          limit: limit.toString(),
          offset: '0'
        });
        
        const response = await fetch(apiConfig.buildUrl(`/api/journal-entries/${clientId}?${params}`));
        if (!response.ok) throw new Error('Failed to load entries by date range');
        return response.json();
      },
    });
  };
  
  return {
    loadAll,
    loadByDateRange
  };
}