import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, BookOpen, Eye, Check, X } from 'lucide-react';
import GeneralLedgerImport from './GeneralLedgerImport';
import { useJournalEntries } from './hooks/useJournalEntries';
import { apiConfig } from '@/lib/api-config';

interface JournalEntriesTabProps {
  clientId: number;
  accounts: Array<{
    id: number;
    name: string;
    accountNumber?: string;
    type: string;
  }>;
}

interface UploadData {
  headers: string[];
  data: any[];
  totalRows: number;
  columnMappings: Record<string, string>;
  fileName: string;
  importType: 'journal' | 'general_ledger';
  file: File;
}

interface MappedEntry {
  date: string;
  description: string;
  debitAccountId?: number;
  creditAccountId?: number;
  accountCode?: string;
  accountName?: string;
  debit?: number;
  credit?: number;
  amount?: number;
  reference?: string;
}

export function JournalEntriesTab({ clientId, accounts }: JournalEntriesTabProps) {
  const { toast } = useToast();
  
  // PROPER DATA FETCHING WITH REACT QUERY HOOK
  const [customLimit, setCustomLimit] = useState(50);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loadingMode, setLoadingMode] = useState<'paginated' | 'all' | 'range'>('paginated');
  
  // Use the proper React Query hook for data fetching
  const { 
    data: journalData, 
    isLoading, 
    error,
    refetch 
  } = useJournalEntries({
    clientId,
    limit: loadingMode === 'all' ? 100000 : customLimit,
    offset: currentOffset,
    startDate: dateRange?.start,
    endDate: dateRange?.end,
    enabled: clientId > 0
  });
  
  // Extract data from hook response with debugging
  const journalEntries = journalData?.entries || [];
  const totalEntries = journalData?.metadata?.total || 0;
  const hasMoreEntries = journalData?.metadata?.hasMore || false;
  
  // DEBUG: Log data structure
  console.log(`📊 JOURNAL DATA DEBUG:`, {
    entriesCount: journalEntries.length,
    firstEntry: journalEntries[0],
    hasMetadata: !!journalData?.metadata,
    totalEntries
  });
  
  // Upload and mapping state
  const [isUploading, setIsUploading] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [mappedEntries, setMappedEntries] = useState<MappedEntry[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // SIMPLIFIED LOADING FUNCTIONS USING REACT QUERY
  const loadJournalEntries = (
    page: number = 0, 
    append: boolean = false,
    mode: 'paginated' | 'all' | 'range' = loadingMode,
    customOptions?: { limit?: number; dateRange?: { start: string; end: string } }
  ) => {
    setLoadingMode(mode);
    
    if (mode === 'all') {
      console.log(`🚀 LOADING ALL ENTRIES for client ${clientId}`);
      setCurrentOffset(0);
    } else if (mode === 'range' && customOptions?.dateRange) {
      console.log(`📅 LOADING BY DATE RANGE: ${customOptions.dateRange.start} to ${customOptions.dateRange.end}`);
      setDateRange(customOptions.dateRange);
      setCurrentOffset(0);
    } else {
      const offset = page * (customOptions?.limit || customLimit);
      console.log(`⚡ PAGINATED LOAD: page ${page}, limit ${customOptions?.limit || customLimit}, offset ${offset}`);
      setCurrentOffset(offset);
    }
    
    // Trigger refetch with new parameters
    refetch();
  };

  // Separate upload handlers for different import types
  const handleJournalEntriesUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('authToken');  
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      headers['Content-Type'] = 'application/json';

      const parseResponse = await fetch(apiConfig.buildUrl('/api/journal-entries/parse-file'), {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Failed to parse journal entries file');
      }

      const parseResult = await parseResponse.json();
      
      setUploadData({
        ...parseResult,
        importType: 'journal',
        file
      });
      
      setColumnMappings(parseResult.columnMappings || {});
      setShowMappingModal(true);
    } catch (error) {
      console.error('Journal entries upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload journal entries file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGeneralLedgerUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      // Use the dedicated general ledger file parsing endpoint
      const parseResponse = await fetch('/api/general-ledger/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Failed to parse general ledger file');
      }

      const parseResult = await parseResponse.json();
      
      setUploadData({
        ...parseResult,
        importType: 'general_ledger',
        file
      });
      
      // Different column mappings for general ledger
      const glMappings = {};
      const glColumns = ['accountCode', 'accountName', 'description', 'debit', 'credit'];
      
      glColumns.forEach(targetCol => {
        const bestMatch = parseResult.headers.find(header => {
          const headerLower = header.toLowerCase();
          if (targetCol === 'accountCode') {
            return headerLower.includes('account') && (headerLower.includes('code') || headerLower.includes('number'));
          } else if (targetCol === 'accountName') {
            return headerLower.includes('account') && headerLower.includes('name');
          } else if (targetCol === 'description') {
            return headerLower.includes('description') || headerLower.includes('memo');
          } else if (targetCol === 'debit') {
            return headerLower.includes('debit');
          } else if (targetCol === 'credit') {
            return headerLower.includes('credit');
          }
          return false;
        });
        
        if (bestMatch) {
          glMappings[targetCol] = bestMatch;
        }
      });
      
      setColumnMappings(glMappings);
      setShowMappingModal(true);
    } catch (error) {
      console.error('General ledger upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload general ledger file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, importType: 'journal' | 'general_ledger') => {
    const file = event.target.files?.[0];
    if (file) {
      if (importType === 'journal') {
        handleJournalEntriesUpload(file);
      } else {
        handleGeneralLedgerUpload(file);
      }
    }
    // Reset the input
    event.target.value = '';
  };

  const processMapping = () => {
    if (!uploadData) return;

    const processed = uploadData.data.map(row => {
      if (uploadData.importType === 'journal') {
        // Journal entries format: Date, Description, Debit Account, Credit Account, Amount, Reference
        return {
          date: row[columnMappings.date] || '',
          description: row[columnMappings.description] || '',
          debitAccountId: findAccountId(row[columnMappings.debitAccount]),
          creditAccountId: findAccountId(row[columnMappings.creditAccount]),
          amount: parseFloat(row[columnMappings.amount]) || 0,
          reference: row[columnMappings.reference] || ''
        };
      } else {
        // General ledger format: Account Code, Account Name, Description, Debit, Credit
        return {
          accountCode: row[columnMappings.accountCode] || '',
          accountName: row[columnMappings.accountName] || '',
          description: row[columnMappings.description] || '',
          debit: parseFloat(row[columnMappings.debit]) || 0,
          credit: parseFloat(row[columnMappings.credit]) || 0
        };
      }
    });

    setMappedEntries(processed);
    setShowMappingModal(false);
    setShowPreviewModal(true);
  };

  const findAccountId = (accountIdentifier: string): number | undefined => {
    if (!accountIdentifier) return undefined;
    
    // Try to find by ID first
    const byId = accounts.find(acc => acc.id.toString() === accountIdentifier.toString());
    if (byId) return byId.id;
    
    // Then by name
    const byName = accounts.find(acc => 
      acc.name.toLowerCase() === accountIdentifier.toLowerCase()
    );
    if (byName) return byName.id;
    
    // Then by account number
    const byNumber = accounts.find(acc => 
      acc.accountNumber === accountIdentifier
    );
    if (byNumber) return byNumber.id;
    
    return undefined;
  };

  const submitImport = async () => {
    try {
      setIsUploading(true);
      
      let importUrl = '';
      let importData = {};
      
      if (uploadData?.importType === 'journal') {
        importUrl = `/api/journal-entries/${clientId}/import`;
        importData = { entries: mappedEntries };
      } else {
        importUrl = `/api/general-ledger/${clientId}/import`;
        importData = { entries: mappedEntries };
      }

      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      
      toast({
        title: "Import Successful",
        description: result.message,
      });

      setShowPreviewModal(false);
      setUploadData(null);
      setMappedEntries([]);
      loadJournalEntries(); // Reload the journal entries
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import entries",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI-Powered General Ledger Import */}
      <GeneralLedgerImport 
        clientId={clientId} 
        onImportComplete={loadJournalEntries}
      />

      {/* Journal Entries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Journal Entries
              {totalEntries > 0 && (
                <Badge variant="outline" className="ml-2">
                  {totalEntries.toLocaleString()} total
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              Advanced Options
            </Button>
          </CardTitle>
          <CardDescription>
            View and manage your journal entries with flexible loading options
          </CardDescription>
        </CardHeader>

        {/* Quick Year Navigation */}
        <CardContent className="border-b bg-muted/10 py-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 mr-2">Jump to year:</span>
            {/* EXPANDED YEAR RANGE TO INCLUDE HISTORICAL DATES FROM SAGE IMPORTS */}
            {[1990, 1995, 2000, 2004, 2005, 2010, 2015, 2020, 2024, 2025].map((year) => (
              <Button
                key={year}
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateRange({ start: `${year}-01-01`, end: `${year}-12-31` });
                  setLoadingMode('range');
                  loadJournalEntries(0, false, 'range', { 
                    dateRange: { start: `${year}-01-01`, end: `${year}-12-31` },
                    limit: 1000 
                  });
                }}
                className="text-xs"
              >
                {year}
              </Button>
            ))}
            {/* ALL DATES BUTTON - NO FILTERING */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateRange(null);
                setLoadingMode('all');
                loadJournalEntries(0, false, 'all');
              }}
              className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              All Dates
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const currentYear = new Date().getFullYear();
                setDateRange({ start: `${currentYear}-01-01`, end: `${currentYear}-12-31` });
                setLoadingMode('range');
                loadJournalEntries(0, false, 'range', { 
                  dateRange: { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` },
                  limit: 1000 
                });
              }}
              className="text-xs ml-2"
            >
              Latest →
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange(null);
                setLoadingMode('paginated');
                setCurrentPage(0);
                loadJournalEntries(0, false, 'paginated');
              }}
              className="text-xs ml-2"
            >
              Reset
            </Button>
            <div className="ml-4 text-xs text-gray-500">
              {dateRange ? `Year ${new Date(dateRange.start).getFullYear()}` : 'All'} • 
              {totalEntries.toLocaleString()} total entries
            </div>
          </div>
        </CardContent>
        
        {/* Advanced Loading Controls */}
        {showAdvancedOptions && (
          <CardContent className="border-b bg-muted/20">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Loading Mode Selection */}
                <div className="space-y-2">
                  <Label>Loading Mode</Label>
                  <Select value={loadingMode} onValueChange={(value: 'paginated' | 'all' | 'range') => setLoadingMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paginated">📄 Paginated (Recommended)</SelectItem>
                      <SelectItem value="all">🚀 Load All Entries</SelectItem>
                      <SelectItem value="range">📅 Date Range Filter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Page Size */}
                <div className="space-y-2">
                  <Label>Entries Per Page</Label>
                  <Select value={customLimit.toString()} onValueChange={(value) => setCustomLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 entries</SelectItem>
                      <SelectItem value="50">50 entries (default)</SelectItem>
                      <SelectItem value="100">100 entries</SelectItem>
                      <SelectItem value="250">250 entries</SelectItem>
                      <SelectItem value="500">500 entries</SelectItem>
                      <SelectItem value="1000">1,000 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Action */}
                <div className="space-y-2">
                  <Label>Quick Actions</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => loadJournalEntries(0, false, 'all')}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Load All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => loadJournalEntries(0, false)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>

              {/* Date Range Controls (only show when range mode is selected) */}
              {loadingMode === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, end: prev?.end || '' }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={(e) => setDateRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apply Filter</Label>
                    <Button 
                      onClick={() => dateRange && loadJournalEntries(0, false, 'range', { dateRange })}
                      disabled={!dateRange?.start || !dateRange?.end || isLoading}
                      className="w-full"
                    >
                      Apply Date Filter
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Use "Load All" for complete data analysis, "Paginated" for fast browsing, or "Date Range" for specific periods.
                Your system can handle {totalEntries.toLocaleString()} entries without performance issues.
              </div>
            </div>
          </CardContent>
        )}

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading journal entries...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading journal entries: {error.message}
            </div>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No journal entries found. Import some entries to get started.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit Account</TableHead>
                  <TableHead>Credit Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.entryDate ? (() => {
                        try {
                          // Handle YYYY-MM-DD format safely without timezone conversion
                          if (/^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate)) {
                            const [year, month, day] = entry.entryDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: '2-digit'
                            });
                          }
                          
                          // For other formats, use standard parsing
                          const date = new Date(entry.entryDate);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        } catch (error) {
                          return 'Invalid Date';
                        }
                      })() : 'Invalid Date'}
                    </TableCell>
                    <TableCell>{entry.description || 'No description'}</TableCell>
                    <TableCell>
                      {entry.lines?.find((line: any) => parseFloat(line.debitAmount) > 0)?.account?.name || 
                       entry.debitAccountName || 'No debit account'}
                    </TableCell>
                    <TableCell>
                      {entry.lines?.find((line: any) => parseFloat(line.creditAmount) > 0)?.account?.name || 
                       entry.creditAccountName || 'No credit account'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const debit = parseFloat(entry.totalDebit || '0');
                        const credit = parseFloat(entry.totalCredit || '0');
                        const amount = parseFloat(entry.amount || '0');
                        const finalAmount = debit || credit || amount || 0;
                        console.log(`💰 AMOUNT DEBUG: entry=${entry.id}, totalDebit="${entry.totalDebit}", totalCredit="${entry.totalCredit}", finalAmount=${finalAmount}`);
                        return `$${finalAmount.toFixed(2)}`;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.sourceType === 'gl_import' ? 'secondary' : 'default'}>
                        {entry.sourceType === 'gl_import' ? 'GL Import' : 'Journal'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Map Columns</DialogTitle>
            <DialogDescription>
              Map the columns from your file to the required fields for {uploadData?.importType === 'journal' ? 'journal entries' : 'general ledger'} import
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {uploadData?.importType === 'journal' ? (
              // Journal entries mapping
              <>
                {['date', 'description', 'debitAccount', 'creditAccount', 'amount', 'reference'].map(field => (
                  <div key={field} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                    <Select
                      value={columnMappings[field] || ''}
                      onValueChange={(value) => setColumnMappings(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadData?.headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      {field === 'date' && 'Transaction date'}
                      {field === 'description' && 'Entry description'}
                      {field === 'debitAccount' && 'Account to debit'}
                      {field === 'creditAccount' && 'Account to credit'}
                      {field === 'amount' && 'Transaction amount'}
                      {field === 'reference' && 'Reference number (optional)'}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // General ledger mapping
              <>
                {['accountCode', 'accountName', 'description', 'debit', 'credit'].map(field => (
                  <div key={field} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                    <Select
                      value={columnMappings[field] || ''}
                      onValueChange={(value) => setColumnMappings(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadData?.headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      {field === 'accountCode' && 'Account code/number'}
                      {field === 'accountName' && 'Account name'}
                      {field === 'description' && 'Transaction description'}
                      {field === 'debit' && 'Debit amount'}
                      {field === 'credit' && 'Credit amount'}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingModal(false)}>
              Cancel
            </Button>
            <Button onClick={processMapping}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the {mappedEntries.length} entries before importing
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {uploadData?.importType === 'journal' ? (
                    <>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Debit Account</TableHead>
                      <TableHead>Credit Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedEntries.slice(0, 10).map((entry, index) => (
                  <TableRow key={index}>
                    {uploadData?.importType === 'journal' ? (
                      <>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          {entry.debitAccountId ? 
                            accounts.find(a => a.id === entry.debitAccountId)?.name || 'Unknown' 
                            : 'Not found'
                          }
                        </TableCell>
                        <TableCell>
                          {entry.creditAccountId ? 
                            accounts.find(a => a.id === entry.creditAccountId)?.name || 'Unknown'
                            : 'Not found'
                          }
                        </TableCell>
                        <TableCell>${entry.amount?.toFixed(2)}</TableCell>
                        <TableCell>{entry.reference}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{entry.accountCode}</TableCell>
                        <TableCell>{entry.accountName}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>${entry.debit?.toFixed(2)}</TableCell>
                        <TableCell>${entry.credit?.toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mappedEntries.length > 10 && (
              <div className="text-center text-sm text-muted-foreground mt-2">
                Showing first 10 of {mappedEntries.length} entries
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitImport} disabled={isUploading}>
              {isUploading ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import {mappedEntries.length} Entries
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JournalEntriesTab;