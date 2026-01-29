/**
 * Bulk Selection Interface Component
 * 
 * Advanced selection interface with multi-select, filtering, and smart selection
 */

import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Users, 
  Briefcase,
  Clock,
  Tag,
  Calendar,
  ChevronDown,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SelectionFilter {
  type: 'clients' | 'projects' | 'tasks';
  status?: string[];
  assignedTo?: string[];
  clientId?: string[];
  projectId?: string[];
  tags?: string[];
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  customFields?: Record<string, any>;
}

export interface BulkSelectionItem {
  id: string;
  name: string;
  status: string;
  type: string;
  [key: string]: any;
}

export interface BulkSelectionInterfaceProps {
  type: 'clients' | 'projects' | 'tasks';
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onFilterChange?: (filters: SelectionFilter) => void;
  className?: string;
  maxHeight?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkSelectionInterface({
  type,
  selectedItems,
  onSelectionChange,
  onFilterChange,
  className,
  maxHeight = "600px"
}: BulkSelectionInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SelectionFilter>({ type });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectMode, setSelectMode] = useState<'manual' | 'filtered' | 'all'>('manual');

  // Fetch items based on current filters
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/bulk/select', type, filters, searchTerm],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/bulk/select', {
        type,
        filters: {
          ...filters,
          search: searchTerm
        },
        limit: 1000
      });
      const data = await response.json();
      return data.success ? data.items : [];
    },
  });

  // Update parent filters when internal filters change
  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  // Handle individual item selection
  const handleItemSelect = useCallback((itemId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedItems, itemId]
      : selectedItems.filter(id => id !== itemId);
    onSelectionChange(newSelection);
  }, [selectedItems, onSelectionChange]);

  // Handle select all/none
  const handleSelectAll = useCallback((checked: boolean) => {
    const newSelection = checked ? items.map(item => item.id) : [];
    onSelectionChange(newSelection);
    setSelectMode(checked ? 'all' : 'manual');
  }, [items, onSelectionChange]);

  // Handle filtered selection
  const handleSelectFiltered = useCallback(() => {
    const filteredIds = items.map(item => item.id);
    onSelectionChange(filteredIds);
    setSelectMode('filtered');
  }, [items, onSelectionChange]);

  // Handle smart selection by criteria
  const handleSmartSelect = useCallback((criteria: any) => {
    // This would be implemented to select items matching specific criteria
    const matchingItems = items.filter(item => {
      // Implement criteria matching logic
      return true; // Placeholder
    });
    const matchingIds = matchingItems.map(item => item.id);
    onSelectionChange([...new Set([...selectedItems, ...matchingIds])]);
  }, [items, selectedItems, onSelectionChange]);

  // Filter update handlers
  const updateFilter = (key: keyof SelectionFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addFilterValue = (key: keyof SelectionFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: [...(prev[key] as string[] || []), value]
    }));
  };

  const removeFilterValue = (key: keyof SelectionFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as string[] || []).filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({ type });
    setSearchTerm("");
    setShowAdvancedFilters(false);
  };

  // Get filter options based on type
  const getFilterOptions = () => {
    switch (type) {
      case 'clients':
        return {
          statusOptions: ['active', 'inactive', 'suspended', 'pending'],
          assignableUsers: [], // Would be fetched from API
          groupOptions: [], // Would be fetched from API
        };
      case 'projects':
        return {
          statusOptions: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
          clientOptions: [], // Would be fetched from API
        };
      case 'tasks':
        return {
          statusOptions: ['not_started', 'in_progress', 'completed', 'cancelled'],
          priorityOptions: ['low', 'medium', 'high', 'urgent'],
          assignableUsers: [], // Would be fetched from API
        };
      default:
        return {};
    }
  };

  const filterOptions = getFilterOptions();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {type === 'clients' && <Users className="h-5 w-5" />}
              {type === 'projects' && <Briefcase className="h-5 w-5" />}
              {type === 'tasks' && <Clock className="h-5 w-5" />}
              Select {type.charAt(0).toUpperCase() + type.slice(1)}
            </CardTitle>
            <CardDescription>
              Select items for bulk operations. {selectedItems.length} of {items.length} selected.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-selection"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Quick Actions */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${type}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-items"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showAdvancedFilters && "rotate-180")} />
            </Button>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.length > 0 && selectedItems.length === items.length}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <Label className="text-sm font-medium">
                Select All ({items.length})
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectFiltered}
                disabled={items.length === 0}
                data-testid="button-select-filtered"
              >
                Select Filtered ({items.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange([])}
                disabled={selectedItems.length === 0}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              <CardDescription>
                Apply filters to narrow down your selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              {filterOptions.statusOptions && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.statusOptions.map(status => (
                      <Badge
                        key={status}
                        variant={filters.status?.includes(status) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (filters.status?.includes(status)) {
                            removeFilterValue('status', status);
                          } else {
                            addFilterValue('status', status);
                          }
                        }}
                        data-testid={`filter-status-${status}`}
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Filter (Tasks only) */}
              {type === 'tasks' && filterOptions.priorityOptions && (
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.priorityOptions.map(priority => (
                      <Badge
                        key={priority}
                        variant={filters.priority?.includes(priority) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (filters.priority?.includes(priority)) {
                            removeFilterValue('priority' as keyof SelectionFilter, priority);
                          } else {
                            addFilterValue('priority' as keyof SelectionFilter, priority);
                          }
                        }}
                        data-testid={`filter-priority-${priority}`}
                      >
                        {priority.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={filters.dateRange?.field || ""}
                    onValueChange={(value) => updateFilter('dateRange', { ...filters.dateRange, field: value })}
                  >
                    <SelectTrigger data-testid="select-date-field">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created</SelectItem>
                      <SelectItem value="updated_at">Updated</SelectItem>
                      {type === 'tasks' && <SelectItem value="due_date">Due Date</SelectItem>}
                      {type === 'projects' && (
                        <>
                          <SelectItem value="start_date">Start Date</SelectItem>
                          <SelectItem value="end_date">End Date</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    placeholder="From"
                    value={filters.dateRange?.from || ""}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                    data-testid="input-date-from"
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={filters.dateRange?.to || ""}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                    data-testid="input-date-to"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Filters Display */}
        {(filters.status?.length || filters.tags?.length || filters.dateRange?.field) && (
          <div className="flex flex-wrap gap-2">
            <Label className="text-sm">Active Filters:</Label>
            {filters.status?.map(status => (
              <Badge key={status} variant="secondary" className="gap-1">
                Status: {status}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilterValue('status', status)}
                />
              </Badge>
            ))}
            {filters.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                Tag: {tag}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilterValue('tags', tag)}
                />
              </Badge>
            ))}
            {filters.dateRange?.field && (
              <Badge variant="secondary" className="gap-1">
                Date: {filters.dateRange.field}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('dateRange', undefined)}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Items List */}
        <ScrollArea 
          className="border rounded-md" 
          style={{ maxHeight }}
          data-testid="scroll-area-items"
        >
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading {type}...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {type} found matching your filters
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: BulkSelectionItem) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50",
                      selectedItems.includes(item.id) && "bg-muted border-primary"
                    )}
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleItemSelect(item.id, !!checked)}
                      data-testid={`checkbox-item-${item.id}`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <Badge 
                          variant={item.status === 'active' ? 'default' : 'secondary'}
                          data-testid={`badge-status-${item.id}`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      
                      {/* Additional item details based on type */}
                      <div className="text-sm text-muted-foreground mt-1">
                        {type === 'clients' && (
                          <span>{item.email} • {item.industry || 'No industry'}</span>
                        )}
                        {type === 'projects' && (
                          <span>{item.client_name} • {item.budget_amount ? `$${item.budget_amount}` : 'No budget'}</span>
                        )}
                        {type === 'tasks' && (
                          <span>
                            {item.project_name} • 
                            <Badge variant="outline" className="ml-1">
                              {item.priority}
                            </Badge>
                            {item.due_date && (
                              <>
                                <Calendar className="h-3 w-3 inline mx-1" />
                                {new Date(item.due_date).toLocaleDateString()}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selection Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {selectedItems.length} {type} selected
              </div>
              <div className="text-sm text-muted-foreground">
                {selectMode === 'all' && "All items selected"}
                {selectMode === 'filtered' && "All filtered items selected"}
                {selectMode === 'manual' && "Manual selection"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}