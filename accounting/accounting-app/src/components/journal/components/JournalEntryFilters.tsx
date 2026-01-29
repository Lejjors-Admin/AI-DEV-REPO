/**
 * JOURNAL ENTRY FILTERS - MODULAR COMPONENT
 * 
 * Advanced filtering capabilities with date ranges, search, and loading modes
 * Matches SAGE/QuickBooks functionality with better UX
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Filter, X, Settings, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface FilterOptions {
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  accountId?: number;
  loadingMode: 'paginated' | 'all' | 'range';
  pageSize: number;
  showUnbalanced?: boolean;
  showNeedsReview?: boolean;
}

interface JournalEntryFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  totalEntries?: number;
  isLoading?: boolean;
  accounts?: Array<{
    id: number;
    name: string;
    accountNumber?: string;
  }>;
  onLoadAll?: () => void;
  onLoadByDateRange?: () => void;
  onExport?: () => void;
  onClearFilters?: () => void;
}

const QUICK_DATE_RANGES = [
  { label: 'Today', start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
  { label: 'This Week', start: getStartOfWeek(), end: new Date().toISOString().split('T')[0] },
  { label: 'This Month', start: getStartOfMonth(), end: new Date().toISOString().split('T')[0] },
  { label: 'Last Month', start: getStartOfLastMonth(), end: getEndOfLastMonth() },
  { label: 'This Year', start: `${new Date().getFullYear()}-01-01`, end: new Date().toISOString().split('T')[0] },
  { label: 'Last Year', start: `${new Date().getFullYear() - 1}-01-01`, end: `${new Date().getFullYear() - 1}-12-31` },
];

const PAGE_SIZE_OPTIONS = [100, 500, 1000, 2500, 5000, 10000];

function getStartOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
}

function getStartOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

function getStartOfLastMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().split('T')[0];
}

function getEndOfLastMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 0).toISOString().split('T')[0];
}

export function JournalEntryFilters({
  filters,
  onFiltersChange,
  totalEntries = 0,
  isLoading = false,
  accounts = [],
  onLoadAll,
  onLoadByDateRange,
  onExport,
  onClearFilters
}: JournalEntryFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const hasActiveFilters = !!(
    filters.searchQuery || 
    filters.startDate || 
    filters.endDate || 
    filters.status !== 'all' || 
    filters.accountId ||
    filters.showUnbalanced ||
    filters.showNeedsReview
  );

  const applyFilters = () => {
    onFiltersChange(tempFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      loadingMode: 'paginated',
      pageSize: 50
    };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters?.();
  };

  const applyQuickDateRange = (range: typeof QUICK_DATE_RANGES[0]) => {
    const updatedFilters = {
      ...tempFilters,
      startDate: range.start,
      endDate: range.end,
      loadingMode: 'range' as const
    };
    setTempFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleLoadingModeChange = (mode: FilterOptions['loadingMode']) => {
    const updatedFilters = { ...tempFilters, loadingMode: mode };
    setTempFilters(updatedFilters);
    onFiltersChange(updatedFilters);

    if (mode === 'all' && onLoadAll) {
      onLoadAll();
    } else if (mode === 'range' && onLoadByDateRange) {
      onLoadByDateRange();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Journal Entry Filters
            {totalEntries > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalEntries.toLocaleString()} entries
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex space-x-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search entries, descriptions, references..."
            value={tempFilters.searchQuery || ''}
            onChange={(e) => setTempFilters({ ...tempFilters, searchQuery: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
            className="pl-10"
          />
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">View:</Label>
            <div className="flex rounded-md border overflow-hidden">
              {(['paginated', 'range', 'all'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={filters.loadingMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleLoadingModeChange(mode)}
                  className="rounded-none border-r last:border-r-0"
                >
                  {mode === 'paginated' && 'Paginated'}
                  {mode === 'range' && 'Date Range'}
                  {mode === 'all' && 'All Entries'}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Page Size:</Label>
            <Select
              value={tempFilters.pageSize.toString()}
              onValueChange={(value) => {
                const updatedFilters = { ...tempFilters, pageSize: parseInt(value) };
                setTempFilters(updatedFilters);
                onFiltersChange(updatedFilters);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Date Ranges */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Date Ranges:</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_DATE_RANGES.map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                onClick={() => applyQuickDateRange(range)}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showAdvanced}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={tempFilters.startDate || ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={tempFilters.endDate || ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={tempFilters.status || 'all'}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, status: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Filter */}
              <div className="space-y-2">
                <Label>Account</Label>
                <Select
                  value={tempFilters.accountId?.toString() || 'all'}
                  onValueChange={(value) => setTempFilters({ 
                    ...tempFilters, 
                    accountId: value === 'all' ? undefined : parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.accountNumber ? `${account.accountNumber} - ` : ''}{account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Special Filters */}
              <div className="space-y-3">
                <Label>Special Filters</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={tempFilters.showUnbalanced || false}
                      onChange={(e) => setTempFilters({ ...tempFilters, showUnbalanced: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Unbalanced Only</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={tempFilters.showNeedsReview || false}
                      onChange={(e) => setTempFilters({ ...tempFilters, showNeedsReview: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Needs Review</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setTempFilters(filters)}>
                Reset
              </Button>
              <Button onClick={applyFilters} disabled={isLoading}>
                <Filter className="h-4 w-4 mr-1" />
                Apply Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Label className="text-sm font-medium self-center">Active Filters:</Label>
            
            {filters.searchQuery && (
              <Badge variant="secondary">
                Search: {filters.searchQuery}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, searchQuery: undefined })} />
              </Badge>
            )}
            
            {filters.startDate && filters.endDate && (
              <Badge variant="secondary">
                Date: {filters.startDate} to {filters.endDate}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, startDate: undefined, endDate: undefined })} />
              </Badge>
            )}
            
            {filters.status && (
              <Badge variant="secondary">
                Status: {filters.status}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, status: undefined })} />
              </Badge>
            )}

            {filters.showUnbalanced && (
              <Badge variant="destructive">
                Unbalanced Only
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, showUnbalanced: false })} />
              </Badge>
            )}

            {filters.showNeedsReview && (
              <Badge variant="destructive">
                Needs Review
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, showNeedsReview: false })} />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}