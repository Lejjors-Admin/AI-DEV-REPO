/**
 * Enhanced Bulk Actions Bar Component
 * 
 * Context-sensitive bulk actions with operation wizard and advanced features
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Trash2, 
  UserCheck, 
  Tag, 
  FileText, 
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X,
  ChevronDown,
  Play,
  Settings,
  History,
  Undo2,
  Eye,
  AlertTriangle,
  Zap
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BulkOperationWizard } from "./BulkOperationWizard";
import { BulkOperationPreview } from "./BulkOperationPreview";
import { BulkOperationProgress } from "./BulkOperationProgress";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BulkAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  category: 'status' | 'assignment' | 'fields' | 'tags' | 'advanced';
  requiresInput?: boolean;
  requiresConfirmation?: boolean;
  options?: Array<{ value: string; label: string; }>;
}

export interface EnhancedBulkActionsBarProps {
  selectedItems: string[];
  onClearSelection: () => void;
  onBulkAction: (action: string, changes: Record<string, any>) => Promise<void>;
  itemType: "clients" | "projects" | "tasks";
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedBulkActionsBar({ 
  selectedItems, 
  onClearSelection, 
  onBulkAction,
  itemType,
  className
}: EnhancedBulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch available actions for the current item type
  const { data: availableActions = [] } = useQuery({
    queryKey: ['/api/bulk/actions', itemType],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/bulk/actions/${itemType}`);
      const data = await response.json();
      return data.success ? data.actions : [];
    },
  });

  // Bulk operation mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ action, changes, options }: any) => {
      const response = await apiRequest('POST', '/api/bulk/execute', {
        type: itemType,
        action,
        targetIds: selectedItems,
        changes,
        options
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Bulk Operation Complete",
          description: `Successfully updated ${data.operation.affected} ${itemType}`,
        });
        onClearSelection();
        queryClient.invalidateQueries({ queryKey: [`/api/${itemType}`] });
      } else {
        throw new Error(data.errors?.[0] || 'Operation failed');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Operation Failed",
        description: error.message || "Failed to complete bulk operation",
        variant: "destructive",
      });
    },
  });

  // Preview operation mutation
  const previewMutation = useMutation({
    mutationFn: async ({ action, changes }: any) => {
      const response = await apiRequest('POST', '/api/bulk/validate', {
        type: itemType,
        action,
        targetIds: selectedItems,
        changes
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.validation.valid) {
        setPreviewData(data.validation);
        setShowPreview(true);
      } else {
        toast({
          title: "Validation Failed",
          description: data.validation?.errors?.[0] || "Cannot preview this operation",
          variant: "destructive",
        });
      }
    },
  });

  // Handle quick actions
  const handleQuickAction = useCallback(async (action: string, value?: string) => {
    setIsLoading(true);
    try {
      const changes = value ? { [getChangeKey(action)]: value } : {};
      await onBulkAction(action, changes);
      toast({
        title: "Bulk Action Complete",
        description: `Successfully updated ${selectedItems.length} ${itemType}`,
      });
      onClearSelection();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete bulk action",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedItems, itemType, onBulkAction, onClearSelection]);

  // Handle advanced operations
  const handleAdvancedOperation = useCallback((operation: any) => {
    setCurrentOperation(operation);
    setShowWizard(true);
  }, []);

  // Handle preview operation
  const handlePreviewOperation = useCallback((action: string, changes: Record<string, any>) => {
    previewMutation.mutate({ action, changes });
  }, [previewMutation]);

  // Execute operation from wizard or preview
  const executeOperation = useCallback(async (action: string, changes: Record<string, any>, options?: any) => {
    setShowWizard(false);
    setShowPreview(false);
    setShowProgress(true);
    
    try {
      await bulkOperationMutation.mutateAsync({ action, changes, options });
    } finally {
      setShowProgress(false);
    }
  }, [bulkOperationMutation]);

  // Get change key for action
  const getChangeKey = (action: string): string => {
    const keyMap: Record<string, string> = {
      'status': 'status',
      'assign_manager': 'assignedTo',
      'assign_to': 'assignedTo',
      'assign_group': 'groupId',
      'assign_client': 'clientId',
      'assign_project': 'projectId',
      'priority': 'priority',
      'update_budget': 'budgetAmount',
    };
    return keyMap[action] || action;
  };

  // Get actions by category
  const getActionsByCategory = () => {
    const categorized: Record<string, BulkAction[]> = {
      status: [],
      assignment: [],
      fields: [],
      tags: [],
      advanced: []
    };

    availableActions.forEach((action: BulkAction) => {
      categorized[action.category]?.push(action);
    });

    return categorized;
  };

  const actionsByCategory = getActionsByCategory();

  if (selectedItems.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[600px] max-w-4xl">
          <div className="flex items-center gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {selectedItems.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-6 w-6 p-0"
                data-testid="button-clear-selection"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Quick Status Actions */}
            {actionsByCategory.status.length > 0 && (
              <>
                <Select onValueChange={(value) => handleQuickAction("status", value)}>
                  <SelectTrigger className="w-[140px] h-8" data-testid="select-status">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionsByCategory.status[0]?.options?.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.value === 'active' && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {option.value === 'inactive' && <XCircle className="w-3 h-3 text-red-500" />}
                          {option.value === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Quick Assignment Actions */}
            {actionsByCategory.assignment.length > 0 && (
              <Select onValueChange={(value) => handleQuickAction("assign", value)}>
                <SelectTrigger className="w-[140px] h-8" data-testid="select-assignment">
                  <SelectValue placeholder="Assign To" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">John Smith</SelectItem>
                  <SelectItem value="2">Jane Doe</SelectItem>
                  <SelectItem value="3">Mike Johnson</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Quick Priority Actions (Tasks only) */}
            {itemType === "tasks" && (
              <Select onValueChange={(value) => handleQuickAction("priority", value)}>
                <SelectTrigger className="w-[130px] h-8" data-testid="select-priority">
                  <SelectValue placeholder="Set Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </SelectContent>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Advanced Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8" data-testid="button-advanced-actions">
                  <Settings className="w-3 h-3 mr-1" />
                  More Actions
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Bulk Operations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setShowWizard(true)} data-testid="menu-bulk-wizard">
                  <Zap className="w-4 h-4 mr-2" />
                  Bulk Operation Wizard
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => handlePreviewOperation("status", { status: "active" })}
                  data-testid="menu-preview-changes"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Changes
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Field Updates</DropdownMenuLabel>

                {actionsByCategory.fields.map(action => (
                  <DropdownMenuItem 
                    key={action.id}
                    onClick={() => handleAdvancedOperation(action)}
                    data-testid={`menu-${action.id}`}
                  >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tags & Categories</DropdownMenuLabel>

                {actionsByCategory.tags.map(action => (
                  <DropdownMenuItem 
                    key={action.id}
                    onClick={() => handleAdvancedOperation(action)}
                    data-testid={`menu-${action.id}`}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => handleQuickAction("delete")}
                  data-testid="menu-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* History and Undo */}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              data-testid="button-history"
            >
              <History className="w-3 h-3 mr-1" />
              History
            </Button>
          </div>

          {/* Operation Status */}
          {isLoading && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-3 w-3 border border-gray-300 rounded-full border-t-blue-600"></div>
                Processing bulk operation...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Operation Wizard */}
      <BulkOperationWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        itemType={itemType}
        selectedItems={selectedItems}
        initialOperation={currentOperation}
        onExecute={executeOperation}
        onPreview={handlePreviewOperation}
      />

      {/* Bulk Operation Preview */}
      <BulkOperationPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        previewData={previewData}
        onConfirm={(action, changes) => executeOperation(action, changes)}
        onCancel={() => setShowPreview(false)}
      />

      {/* Progress Dialog */}
      <BulkOperationProgress
        open={showProgress}
        onOpenChange={setShowProgress}
        operationId={currentOperation?.id}
        itemType={itemType}
      />
    </>
  );
}