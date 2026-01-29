/**
 * JOURNAL ENTRIES CONTAINER - STRATEGIC REFACTOR
 * 
 * Modern, modular architecture replacing the 761-line monolithic component
 * Clean separation of concerns with proper error handling and performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, AlertCircle, CheckCircle } from 'lucide-react';

// Modular components
import { JournalEntryList } from './components/JournalEntryList';
import { JournalEntryFilters, FilterOptions } from './components/JournalEntryFilters';
import { JournalEntryEditor } from './components/JournalEntryEditor';
import GeneralLedgerImport from './GeneralLedgerImport';

// Optimized hooks
import { 
  useJournalEntries, 
  useJournalEntriesCount, 
  useCreateJournalEntry, 
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntriesLoadingModes
} from './hooks/useJournalEntries';

interface JournalEntriesContainerProps {
  clientId: number;
  accounts: Array<{
    id: number;
    name: string;
    accountNumber?: string;
    type: string;
  }>;
}

interface JournalEntry {
  id: number;
  entryNumber: string | null;
  description: string;
  entryDate: string;
  totalDebit: string;
  totalCredit: string;
  status: string;
  isBalanced: boolean;
  needsReview: boolean;
  referenceNumber: string | null;
  lines: any[];
}

export function JournalEntriesContainer({ clientId, accounts }: JournalEntriesContainerProps) {
  const { toast } = useToast();
  
  // State management  
  const [filters, setFilters] = useState<FilterOptions>({
    loadingMode: 'all',  // Show ALL entries by default
    pageSize: 10000  // Increased to show 10,000 entries per page
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Calculate offset based on current page and filters
  const offset = currentPage * filters.pageSize;

  // Data fetching with optimized hooks
  const {
    data: journalData,
    isLoading,
    error: fetchError,
    refetch
  } = useJournalEntries({
    clientId,
    limit: filters.pageSize,
    offset: offset,
    startDate: filters.startDate,
    endDate: filters.endDate,
    enabled: clientId > 0
  });

  const {
    data: totalCount = 0,
  } = useJournalEntriesCount(clientId, filters.startDate, filters.endDate);

  // Mutations
  const createJournalEntry = useCreateJournalEntry(clientId);
  const updateJournalEntry = useUpdateJournalEntry(clientId);
  const deleteJournalEntry = useDeleteJournalEntry(clientId);
  
  // Loading modes
  const { loadAll, loadByDateRange } = useJournalEntriesLoadingModes(clientId);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  const entries = journalData?.entries || [];
  const metadata = journalData?.metadata;

  // Handlers
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  const handleToggleExpanded = (entryId: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleEdit = (entry: JournalEntry) => {
    console.log('🔄 Editing journal entry:', {
      id: entry.id,
      entryDate: entry.entryDate,
      entryDateType: typeof entry.entryDate,
      description: entry.description
    });
    setEditingEntry(entry);
    setShowEditor(true);
  };

  const handleDelete = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
      try {
        await deleteJournalEntry.mutateAsync(entryId);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const handleSaveEntry = async (entryData: any) => {
    try {
      const entryPayload = {
        description: entryData.description,
        transactionDate: entryData.entryDate,
        entries: entryData.lines.map((line: any) => ({
          accountId: line.accountId,
          description: line.description,
          debitAmount: line.debitAmount || '0.00',
          creditAmount: line.creditAmount || '0.00',
          memo: line.memo
        })),
        referenceNumber: entryData.referenceNumber
      };

      if (editingEntry) {
        // Update existing entry
        console.log('🔄 Updating journal entry:', {
          entryId: editingEntry.id,
          payload: entryPayload,
          originalDate: editingEntry.entryDate,
          newDate: entryPayload.transactionDate
        });
        
        await updateJournalEntry.mutateAsync({
          entryId: editingEntry.id,
          data: entryPayload
        });
      } else {
        // Create new entry
        await createJournalEntry.mutateAsync(entryPayload);
      }
    } catch (error) {
      throw error; // Re-throw for editor to handle
    }
  };

  const handleLoadAll = async () => {
    try {
      await loadAll();
      toast({
        title: "Success",
        description: `Loaded all ${totalCount.toLocaleString()} journal entries`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load all entries",
        variant: "destructive"
      });
    }
  };

  const handleLoadByDateRange = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    try {
      await loadByDateRange(filters.startDate, filters.endDate, filters.pageSize);
      toast({
        title: "Success",
        description: `Loaded entries for ${filters.startDate} to ${filters.endDate}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load entries by date range",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: "Export",
      description: "Export functionality coming soon",
    });
  };

  const handleImportComplete = () => {
    // Refresh data after import
    refetch();
    setShowImport(false);
    toast({
      title: "Import Complete",
      description: "Journal entries imported successfully",
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Smart year navigation with date filtering
  const handleJumpToYear = (year: number) => {
    const newFilters = {
      ...filters,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      loadingMode: 'range' as const,
      pageSize: 1000 // Show more entries for year view
    };
    handleFiltersChange(newFilters);
    setCurrentPage(0); // Reset to first page
  };

  // Jump to latest entries (current year)
  const handleJumpToLatest = () => {
    const currentYear = new Date().getFullYear();
    const newFilters = {
      ...filters,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      loadingMode: 'range' as const,
      pageSize: 1000
    };
    handleFiltersChange(newFilters);
    setCurrentPage(0);
  };

  const totalPages = Math.ceil(totalCount / filters.pageSize);

  // Error state
  if (fetchError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <div className="font-medium">Error loading journal entries</div>
              <div className="text-sm text-gray-600 mt-1">
                {fetchError.message || 'An unexpected error occurred'}
              </div>
            </div>
          </div>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Journal Entries</span>
                {totalCount > 0 && (
                  <Badge variant="secondary">
                    {totalCount.toLocaleString()} total
                  </Badge>
                )}
                {metadata && 'queryTime' in metadata && (
                  <Badge variant="outline" className="text-xs">
                    Query: Fast
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                Double-entry transaction management
                {metadata && (
                  <span> • Showing {metadata.loaded} of {metadata.total} entries</span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => setShowImport(true)} variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button onClick={() => {
                setEditingEntry(null);
                setShowEditor(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                New Entry
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Year Navigation & Latest Entries */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">Jump to year:</span>
              {[2004, 2005, 2010, 2015, 2020, 2024, 2025].map((year) => (
                <Button
                  key={year}
                  variant="outline"
                  size="sm"
                  onClick={() => handleJumpToYear(year)}
                  className="text-xs"
              >
                {year}
              </Button>
            ))}
            <Button
              variant="default"
              size="sm"
              onClick={handleJumpToLatest}
              className="text-xs ml-2"
            >
              Latest →
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const loadAllFilters = {
                  loadingMode: 'all' as const,
                  pageSize: 10000,
                  startDate: undefined,
                  endDate: undefined
                };
                handleFiltersChange(loadAllFilters);
                setCurrentPage(0);
              }}
              className="text-xs ml-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              🔄 Load All ({totalCount?.toLocaleString()} entries)
            </Button>
            <div className="ml-4 text-xs text-gray-500">
              {filters.startDate ? `Year ${new Date(filters.startDate).getFullYear()}` : 'All'} • 
              Page {currentPage + 1} of {totalPages} • 
              Showing {offset + 1}-{Math.min(offset + filters.pageSize, totalCount)} of {totalCount.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <JournalEntryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalEntries={totalCount}
        isLoading={isLoading}
        accounts={accounts}
        onLoadAll={handleLoadAll}
        onLoadByDateRange={handleLoadByDateRange}
        onExport={handleExport}
      />

      {/* Journal Entries List */}
      <JournalEntryList
        entries={entries}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        expandedEntries={expandedEntries}
        onToggleExpanded={handleToggleExpanded}
      />

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages} 
                ({((currentPage * filters.pageSize) + 1)} - {Math.min((currentPage + 1) * filters.pageSize, totalCount)} of {totalCount})
              </div>
              
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(0)}
                  disabled={currentPage === 0}
                >
                  First
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages - 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journal Entry Editor Modal */}
      <JournalEntryEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        accounts={accounts.map(acc => ({ ...acc, isDebitNormal: true }))}
        initialEntry={editingEntry ? {
          ...editingEntry,
          referenceNumber: editingEntry.referenceNumber || undefined
        } : undefined}
        mode={editingEntry ? 'edit' : 'create'}
        clientId={clientId}
      />

      {/* Import Modal */}
      {showImport && (
        <GeneralLedgerImport
          clientId={clientId}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Status Messages */}
      {isLoading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Loading journal entries...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && entries.length === 0 && !fetchError && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <div className="text-lg font-medium mb-2">No journal entries found</div>
              <div className="text-sm mb-4">
                {totalCount === 0 
                  ? "Get started by creating your first journal entry or importing existing data"
                  : "Try adjusting your filters to see more entries"
                }
              </div>
              <div className="space-x-2">
                <Button onClick={() => setShowEditor(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Entry
                </Button>
                <Button onClick={() => setShowImport(true)} variant="outline">
                  <Upload className="h-4 w-4 mr-1" />
                  Import Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}