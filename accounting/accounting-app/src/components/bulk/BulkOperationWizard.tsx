/**
 * Bulk Operation Wizard Component
 * 
 * Multi-step wizard for complex bulk operations with validation and preview
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Settings,
  Tag,
  Users,
  FileText,
  Calendar,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation?: (data: any) => { valid: boolean; errors: string[] };
}

export interface BulkOperationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'clients' | 'projects' | 'tasks';
  selectedItems: string[];
  initialOperation?: any;
  onExecute: (action: string, changes: Record<string, any>, options?: any) => Promise<void>;
  onPreview: (action: string, changes: Record<string, any>) => void;
}

// ============================================================================
// WIZARD STEPS COMPONENTS
// ============================================================================

function ActionSelectionStep({ data, onChange, itemType }: any) {
  const { data: availableActions = [] } = useQuery({
    queryKey: ['/api/bulk/actions', itemType],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/bulk/actions/${itemType}`);
      const result = await response.json();
      return result.success ? result.actions : [];
    },
  });

  const actionsByCategory = availableActions.reduce((acc: any, action: any) => {
    acc[action.category] = acc[action.category] || [];
    acc[action.category].push(action);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose Bulk Operation</h3>
        <p className="text-muted-foreground">
          Select the type of bulk operation to perform on {data.selectedCount} {itemType}
        </p>
      </div>

      <Tabs value={data.category || "status"} onValueChange={(value) => onChange({ category: value, action: "" })}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        {Object.entries(actionsByCategory).map(([category, actions]: [string, any]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid gap-3">
              {actions.map((action: any) => (
                <Card 
                  key={action.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    data.action === action.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => onChange({ ...data, action: action.id, actionData: action })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {action.icon && <action.icon className="h-5 w-5 text-primary" />}
                      <div>
                        <CardTitle className="text-base">{action.label}</CardTitle>
                        {action.description && (
                          <CardDescription>{action.description}</CardDescription>
                        )}
                      </div>
                      {data.action === action.id && <CheckCircle className="h-5 w-5 text-primary ml-auto" />}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ConfigurationStep({ data, onChange, itemType }: any) {
  const action = data.actionData;
  
  if (!action) return <div>No action selected</div>;

  const renderConfigForAction = () => {
    switch (action.id) {
      case 'status':
        return (
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={data.newStatus || ""} onValueChange={(value) => onChange({ ...data, newStatus: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {action.options?.map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'assign_manager':
      case 'assign_to':
        return (
          <div className="space-y-4">
            <div>
              <Label>Assign To</Label>
              <Select value={data.assignTo || ""} onValueChange={(value) => onChange({ ...data, assignTo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">John Smith</SelectItem>
                  <SelectItem value="2">Jane Doe</SelectItem>
                  <SelectItem value="3">Mike Johnson</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'update_budget':
        return (
          <div className="space-y-4">
            <div>
              <Label>Budget Action</Label>
              <Select value={data.budgetAction || ""} onValueChange={(value) => onChange({ ...data, budgetAction: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set Budget</SelectItem>
                  <SelectItem value="increase">Increase Budget</SelectItem>
                  <SelectItem value="decrease">Decrease Budget</SelectItem>
                  <SelectItem value="percentage">Percentage Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={data.budgetAmount || ""}
                  onChange={(e) => onChange({ ...data, budgetAmount: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        );

      case 'update_dates':
        return (
          <div className="space-y-4">
            <div>
              <Label>Date Field</Label>
              <Select value={data.dateField || ""} onValueChange={(value) => onChange({ ...data, dateField: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date field" />
                </SelectTrigger>
                <SelectContent>
                  {itemType === 'tasks' && <SelectItem value="due_date">Due Date</SelectItem>}
                  {itemType === 'projects' && (
                    <>
                      <SelectItem value="start_date">Start Date</SelectItem>
                      <SelectItem value="end_date">End Date</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>New Date</Label>
              <Input
                type="date"
                value={data.newDate || ""}
                onChange={(e) => onChange({ ...data, newDate: e.target.value })}
              />
            </div>
          </div>
        );

      case 'add_tags':
      case 'remove_tags':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tags</Label>
              <Input
                placeholder="Enter tags (comma separated)"
                value={data.tags || ""}
                onChange={(e) => onChange({ ...data, tags: e.target.value })}
              />
            </div>
          </div>
        );

      case 'update_fields':
        return (
          <div className="space-y-4">
            <div>
              <Label>Custom Fields</Label>
              <p className="text-sm text-muted-foreground">
                Add custom field updates as key-value pairs
              </p>
            </div>
            {/* This would be a dynamic form for custom fields */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">Custom field editor would go here</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Enter any additional notes or comments"
                value={data.notes || ""}
                onChange={(e) => onChange({ ...data, notes: e.target.value })}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Configure {action.label}</h3>
        <p className="text-muted-foreground">
          Set the parameters for your bulk operation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {action.icon && <action.icon className="h-5 w-5" />}
            {action.label} Configuration
          </CardTitle>
          <CardDescription>
            This operation will be applied to {data.selectedCount} {itemType}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderConfigForAction()}
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipValidation"
              checked={data.skipValidation || false}
              onCheckedChange={(checked) => onChange({ ...data, skipValidation: checked })}
            />
            <Label htmlFor="skipValidation" className="text-sm">
              Skip individual item validation (faster but riskier)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="continueOnError"
              checked={data.continueOnError !== false}
              onCheckedChange={(checked) => onChange({ ...data, continueOnError: checked })}
            />
            <Label htmlFor="continueOnError" className="text-sm">
              Continue processing if some items fail
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createBackup"
              checked={data.createBackup !== false}
              onCheckedChange={(checked) => onChange({ ...data, createBackup: checked })}
            />
            <Label htmlFor="createBackup" className="text-sm">
              Create rollback backup (enables undo)
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({ data, itemType }: any) {
  const changes = generateChangesFromData(data);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review & Confirm</h3>
        <p className="text-muted-foreground">
          Review the changes that will be applied to {data.selectedCount} {itemType}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Operation</Label>
              <p className="text-sm text-muted-foreground">{data.actionData?.label}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Items Affected</Label>
              <p className="text-sm text-muted-foreground">{data.selectedCount} {itemType}</p>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Changes to Apply</Label>
            <div className="mt-2 space-y-2">
              {Object.entries(changes).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm font-medium">{formatFieldName(key)}</span>
                  <Badge variant="outline">{String(value)}</Badge>
                </div>
              ))}
            </div>
          </div>

          {data.notes && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <p className="text-sm text-muted-foreground mt-1">{data.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {(!data.createBackup || data.skipValidation) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Important Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-yellow-700">
              {!data.createBackup && (
                <li>• Rollback backup is disabled - changes cannot be undone</li>
              )}
              {data.skipValidation && (
                <li>• Validation is disabled - some items may fail to update</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export function BulkOperationWizard({
  open,
  onOpenChange,
  itemType,
  selectedItems,
  initialOperation,
  onExecute,
  onPreview
}: BulkOperationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({
    selectedCount: selectedItems.length,
    category: initialOperation?.category || "status",
    action: initialOperation?.id || "",
    actionData: initialOperation || null,
  });

  const steps: WizardStep[] = [
    {
      id: 'action',
      title: 'Select Action',
      description: 'Choose the bulk operation to perform',
      component: ActionSelectionStep,
      validation: (data) => ({
        valid: !!data.action,
        errors: !data.action ? ['Please select an action'] : []
      })
    },
    {
      id: 'configure',
      title: 'Configure',
      description: 'Set operation parameters',
      component: ConfigurationStep,
      validation: (data) => {
        const errors: string[] = [];
        
        if (data.action === 'status' && !data.newStatus) {
          errors.push('Please select a status');
        }
        
        if ((data.action === 'assign_manager' || data.action === 'assign_to') && !data.assignTo) {
          errors.push('Please select who to assign to');
        }
        
        if (data.action === 'update_budget' && (!data.budgetAction || !data.budgetAmount)) {
          errors.push('Please configure budget settings');
        }
        
        if (data.action === 'update_dates' && (!data.dateField || !data.newDate)) {
          errors.push('Please configure date settings');
        }
        
        return { valid: errors.length === 0, errors };
      }
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm changes before applying',
      component: ReviewStep,
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const validateCurrentStep = () => {
    if (currentStepData.validation) {
      return currentStepData.validation(wizardData);
    }
    return { valid: true, errors: [] };
  };

  const handleNext = () => {
    const validation = validateCurrentStep();
    if (validation.valid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handlePreview = () => {
    const changes = generateChangesFromData(wizardData);
    onPreview(wizardData.action, changes);
  };

  const handleExecute = () => {
    const changes = generateChangesFromData(wizardData);
    const options = {
      skipValidation: wizardData.skipValidation,
      continueOnError: wizardData.continueOnError,
      createBackup: wizardData.createBackup,
    };
    
    onExecute(wizardData.action, changes, options);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk Operation Wizard</DialogTitle>
          <DialogDescription>
            Configure and execute bulk operations on selected {itemType}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  index < currentStep && "bg-primary text-primary-foreground",
                  index === currentStep && "bg-primary/20 text-primary border-2 border-primary",
                  index > currentStep && "bg-muted text-muted-foreground"
                )}>
                  {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className="font-medium">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6">
            <currentStepData.component
              data={wizardData}
              onChange={setWizardData}
              itemType={itemType}
            />
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isLastStep && (
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
            
            {isLastStep ? (
              <Button onClick={handleExecute}>
                <Play className="w-4 h-4 mr-2" />
                Execute Operation
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!validateCurrentStep().valid}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateChangesFromData(data: any): Record<string, any> {
  const changes: Record<string, any> = {};

  switch (data.action) {
    case 'status':
      changes.status = data.newStatus;
      break;
    case 'assign_manager':
    case 'assign_to':
      changes.assignedTo = data.assignTo;
      break;
    case 'update_budget':
      changes.budgetAction = data.budgetAction;
      changes.budgetAmount = parseFloat(data.budgetAmount || '0');
      break;
    case 'update_dates':
      changes[data.dateField] = data.newDate;
      break;
    case 'add_tags':
    case 'remove_tags':
      changes.tags = data.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean) || [];
      break;
    case 'priority':
      changes.priority = data.priority;
      break;
    default:
      if (data.customFields) {
        Object.assign(changes, data.customFields);
      }
  }

  return changes;
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}