/**
 * Bulk Operation Preview Component
 * 
 * Shows a preview of changes before bulk operation execution
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  ArrowRight,
  Info,
  AlertCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PreviewChange {
  itemId: string;
  itemName: string;
  currentValues: Record<string, any>;
  newValues: Record<string, any>;
  changes: Record<string, any>;
  warnings?: string[];
  errors?: string[];
  status: 'valid' | 'warning' | 'error';
}

export interface BulkOperationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    affectedCount: number;
    previewData: any[];
  } | null;
  onConfirm: (action: string, changes: Record<string, any>) => void;
  onCancel: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkOperationPreview({
  open,
  onOpenChange,
  previewData,
  onConfirm,
  onCancel
}: BulkOperationPreviewProps) {
  const [selectedTab, setSelectedTab] = useState("overview");

  if (!previewData) return null;

  const { valid, errors, warnings, affectedCount, previewData: items } = previewData;

  // Categorize items by status
  const validItems = items.filter(item => !item._errors?.length && !item._warnings?.length);
  const warningItems = items.filter(item => item._warnings?.length && !item._errors?.length);
  const errorItems = items.filter(item => item._errors?.length);

  const getChangeIndicator = (item: any, field: string) => {
    const hasChange = item[`_${field}Changed`];
    if (!hasChange) return null;

    const oldValue = item[`_original_${field}`] || item[field];
    const newValue = item[field];

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{String(oldValue)}</span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium">{String(newValue)}</span>
      </div>
    );
  };

  const renderItemPreview = (item: any) => (
    <Card key={item.id} className={cn(
      "mb-3",
      item._errors?.length && "border-red-200 bg-red-50",
      item._warnings?.length && !item._errors?.length && "border-yellow-200 bg-yellow-50",
      !item._errors?.length && !item._warnings?.length && "border-green-200 bg-green-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {item._errors?.length ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : item._warnings?.length ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {item.name}
          </CardTitle>
          <Badge variant={
            item._errors?.length ? "destructive" : 
            item._warnings?.length ? "secondary" : 
            "default"
          }>
            {item._errors?.length ? "Error" : 
             item._warnings?.length ? "Warning" : 
             "Valid"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Show changes */}
        <div className="space-y-2">
          {item._statusChanged && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              {getChangeIndicator(item, 'status')}
            </div>
          )}
          
          {item._assignmentChanged && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Assignment</div>
              {getChangeIndicator(item, 'assigned_to')}
            </div>
          )}
          
          {item._priorityChanged && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Priority</div>
              {getChangeIndicator(item, 'priority')}
            </div>
          )}
          
          {item._groupChanged && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Group</div>
              {getChangeIndicator(item, 'client_group')}
            </div>
          )}
          
          {item._tagsAdded?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Tags Added</div>
              <div className="flex flex-wrap gap-1">
                {item._tagsAdded.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    +{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {item._tagsRemoved?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Tags Removed</div>
              <div className="flex flex-wrap gap-1">
                {item._tagsRemoved.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs bg-red-50 text-red-600">
                    -{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Show warnings */}
        {item._warnings?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <div className="text-xs font-medium text-yellow-800 mb-1">Warnings:</div>
            <ul className="text-xs text-yellow-700 space-y-1">
              {item._warnings.map((warning: string, index: number) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Show errors */}
        {item._errors?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <div className="text-xs font-medium text-red-800 mb-1">Errors:</div>
            <ul className="text-xs text-red-700 space-y-1">
              {item._errors.map((error: string, index: number) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Bulk Operation
          </DialogTitle>
          <DialogDescription>
            Review the changes that will be applied to {affectedCount} items
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{validItems.length}</div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{warningItems.length}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{errorItems.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{affectedCount}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
          </div>

          {/* Global errors/warnings */}
          {(errors.length > 0 || warnings.length > 0) && (
            <div className="space-y-3 mb-6">
              {errors.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Operation Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-red-700 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {warnings.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-yellow-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Operation Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Preview Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="valid" className="text-green-600">
                Valid ({validItems.length})
              </TabsTrigger>
              {warningItems.length > 0 && (
                <TabsTrigger value="warnings" className="text-yellow-600">
                  Warnings ({warningItems.length})
                </TabsTrigger>
              )}
              {errorItems.length > 0 && (
                <TabsTrigger value="errors" className="text-red-600">
                  Errors ({errorItems.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Operation Summary</CardTitle>
                      <CardDescription>
                        Overview of the bulk operation that will be performed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Items to Update</div>
                          <div className="text-2xl font-bold">{affectedCount}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Success Rate</div>
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round((validItems.length / affectedCount) * 100)}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Show sample of each category */}
                  {validItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">
                        Valid Changes (showing first 3)
                      </h4>
                      {validItems.slice(0, 3).map(renderItemPreview)}
                    </div>
                  )}

                  {warningItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2">
                        Items with Warnings (showing first 3)
                      </h4>
                      {warningItems.slice(0, 3).map(renderItemPreview)}
                    </div>
                  )}

                  {errorItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">
                        Items with Errors (showing first 3)
                      </h4>
                      {errorItems.slice(0, 3).map(renderItemPreview)}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="valid" className="mt-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {validItems.map(renderItemPreview)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="warnings" className="mt-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {warningItems.map(renderItemPreview)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="errors" className="mt-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {errorItems.map(renderItemPreview)}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Changes can be undone within 30 days
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            
            <Button 
              onClick={() => onConfirm("", {})} 
              disabled={!valid || errorItems.length > 0}
              className={cn(
                errorItems.length > 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4 mr-2" />
              {errorItems.length > 0 
                ? `Cannot Execute (${errorItems.length} errors)`
                : `Execute Operation (${validItems.length + warningItems.length} items)`
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}