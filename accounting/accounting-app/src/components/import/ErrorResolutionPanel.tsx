/**
 * Error Resolution Panel Component
 * 
 * Interface for reviewing and resolving import errors with guided assistance
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  XCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  RotateCcw,
  Lightbulb,
  FileText,
  Eye,
  Settings
} from 'lucide-react';

interface ErrorResolutionPanelProps {
  sessionId: number;
  importSession: any;
}

interface ImportError {
  id: number;
  entityType: string;
  sourceRowNumber: number;
  sourceData: any;
  errorMessage: string;
  errorType: 'validation' | 'reference' | 'duplicate' | 'format' | 'required' | 'system';
  field?: string;
  suggestedFix?: string;
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Error type configuration
const ERROR_TYPES = {
  validation: {
    label: 'Validation Error',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: AlertCircle,
    description: 'Data does not meet validation requirements'
  },
  reference: {
    label: 'Reference Error',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle,
    description: 'Referenced record does not exist'
  },
  duplicate: {
    label: 'Duplicate Record',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: AlertCircle,
    description: 'Record already exists in the system'
  },
  format: {
    label: 'Format Error',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: FileText,
    description: 'Data format is invalid or unsupported'
  },
  required: {
    label: 'Required Field',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: XCircle,
    description: 'Required field is missing or empty'
  },
  system: {
    label: 'System Error',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    icon: Settings,
    description: 'Internal system error occurred'
  }
};

// Error severity configuration
const SEVERITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' }
};

export function ErrorResolutionPanel({ sessionId, importSession }: ErrorResolutionPanelProps) {
  const { toast } = useToast();
  const [selectedErrorType, setSelectedErrorType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<ImportError | null>(null);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Mock error data - in a real implementation, this would come from the API
  const mockErrors: ImportError[] = [
    {
      id: 1,
      entityType: 'clients',
      sourceRowNumber: 15,
      sourceData: { company: 'ACME Corp', email: 'invalid-email', phone: '555-1234' },
      errorMessage: 'Invalid email format: "invalid-email"',
      errorType: 'validation',
      field: 'email',
      suggestedFix: 'Use format: user@example.com',
      canRetry: true,
      severity: 'medium'
    },
    {
      id: 2,
      entityType: 'projects',
      sourceRowNumber: 8,
      sourceData: { name: 'Website Redesign', clientid: '999' },
      errorMessage: 'Referenced client ID 999 does not exist',
      errorType: 'reference',
      field: 'clientId',
      suggestedFix: 'Import clients first or use valid client ID',
      canRetry: true,
      severity: 'high'
    },
    {
      id: 3,
      entityType: 'tasks',
      sourceRowNumber: 42,
      sourceData: { name: '', description: 'Task without name', priority: '5' },
      errorMessage: 'Task name is required but missing',
      errorType: 'required',
      field: 'name',
      suggestedFix: 'Provide a task name',
      canRetry: true,
      severity: 'high'
    },
    {
      id: 4,
      entityType: 'invoices',
      sourceRowNumber: 23,
      sourceData: { number: 'INV-001', date: '2024-13-45', total: 'abc' },
      errorMessage: 'Invalid date format: "2024-13-45"',
      errorType: 'format',
      field: 'date',
      suggestedFix: 'Use YYYY-MM-DD format',
      canRetry: true,
      severity: 'medium'
    },
    {
      id: 5,
      entityType: 'clients',
      sourceRowNumber: 67,
      sourceData: { company: 'TechStart Inc', email: 'contact@techstart.com' },
      errorMessage: 'Client with email "contact@techstart.com" already exists',
      errorType: 'duplicate',
      field: 'email',
      suggestedFix: 'Skip duplicate or update existing record',
      canRetry: true,
      severity: 'low'
    }
  ];

  // Query for actual errors (commented out for demo)
  // const { data: errors, isLoading, refetch } = useQuery({
  //   queryKey: [`/api/perfex-import/sessions/${sessionId}/records`, 'failed'],
  //   select: (data) => data?.data || []
  // });

  // Filter errors based on search and filters
  const filteredErrors = mockErrors.filter(error => {
    if (selectedErrorType !== 'all' && error.errorType !== selectedErrorType) return false;
    if (selectedSeverity !== 'all' && error.severity !== selectedSeverity) return false;
    if (searchQuery && !error.errorMessage.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group errors by type
  const errorsByType = filteredErrors.reduce((acc, error) => {
    if (!acc[error.errorType]) acc[error.errorType] = [];
    acc[error.errorType].push(error);
    return acc;
  }, {} as Record<string, ImportError[]>);

  // Generate fix suggestions
  const generateFixSuggestions = (error: ImportError): string[] => {
    const suggestions = [];
    
    switch (error.errorType) {
      case 'validation':
        suggestions.push('Check data format and constraints');
        suggestions.push('Verify field length requirements');
        suggestions.push('Ensure data matches expected pattern');
        break;
      case 'reference':
        suggestions.push('Import referenced records first');
        suggestions.push('Verify ID mapping is correct');
        suggestions.push('Check for missing relationships');
        break;
      case 'duplicate':
        suggestions.push('Skip duplicate records');
        suggestions.push('Update existing records instead');
        suggestions.push('Use different unique identifiers');
        break;
      case 'format':
        suggestions.push('Convert data to expected format');
        suggestions.push('Check date/time formatting');
        suggestions.push('Verify number formatting');
        break;
      case 'required':
        suggestions.push('Provide missing required data');
        suggestions.push('Use default values where appropriate');
        suggestions.push('Review field mapping requirements');
        break;
    }
    
    return suggestions;
  };

  // Handle fix attempt
  const handleFixError = async (error: ImportError, fixAction: string) => {
    try {
      // In a real implementation, this would call the API to retry the record
      toast({
        title: "Fix Applied",
        description: `Applied fix for ${error.entityType} record at row ${error.sourceRowNumber}`
      });
      setFixDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Fix Failed",
        description: error.message || "Failed to apply fix",
        variant: "destructive"
      });
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (!action) return;

    try {
      const errorCount = filteredErrors.length;
      // In a real implementation, this would call the API for bulk operations
      
      toast({
        title: "Bulk Action Applied",
        description: `Applied ${action} to ${errorCount} errors`
      });
      setBulkAction('');
    } catch (error: any) {
      toast({
        title: "Bulk Action Failed",
        description: error.message || "Failed to apply bulk action",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="error-resolution-panel">
      {/* Error Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <CardTitle>Import Errors</CardTitle>
            </div>
            <Badge variant="destructive">
              {filteredErrors.length} Error{filteredErrors.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <CardDescription>
            Review and resolve errors encountered during the import process
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error Type Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(errorsByType).map(([type, errors]) => {
              const config = ERROR_TYPES[type as keyof typeof ERROR_TYPES];
              const Icon = config.icon;
              
              return (
                <div key={type} className="text-center p-3 border rounded-lg">
                  <Icon className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {errors.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {config.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                data-testid="refresh-errors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Download error report
                  const blob = new Blob([JSON.stringify(filteredErrors, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `import-errors-${sessionId}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                data-testid="download-errors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Errors
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center space-x-2">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Bulk actions..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Select Action --</SelectItem>
                  <SelectItem value="skip_all">Skip All Errors</SelectItem>
                  <SelectItem value="retry_all">Retry All Fixable</SelectItem>
                  <SelectItem value="mark_reviewed">Mark as Reviewed</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => handleBulkAction(bulkAction)}
                disabled={!bulkAction}
                size="sm"
                data-testid="apply-bulk-action"
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search errors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-errors"
                />
              </div>
            </div>

            {/* Error Type Filter */}
            <Select value={selectedErrorType} onValueChange={setSelectedErrorType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Error Types</SelectItem>
                {Object.entries(ERROR_TYPES).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => (
                  <SelectItem key={severity} value={severity}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Details</CardTitle>
          <CardDescription>
            Click on any error to view details and suggested fixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">No errors found</h3>
              <p>All import records processed successfully or no errors match your filters.</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredErrors.map((error) => {
                  const errorConfig = ERROR_TYPES[error.errorType as keyof typeof ERROR_TYPES];
                  const severityConfig = SEVERITY_CONFIG[error.severity as keyof typeof SEVERITY_CONFIG];
                  const Icon = errorConfig.icon;

                  return (
                    <div
                      key={error.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => setSelectedError(error)}
                      data-testid={`error-${error.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Icon className="w-5 h-5 text-red-500 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={errorConfig.color}>
                                {errorConfig.label}
                              </Badge>
                              <Badge className={severityConfig.color}>
                                {severityConfig.label}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {error.entityType} • Row {error.sourceRowNumber}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {error.errorMessage}
                            </p>
                            
                            {error.field && (
                              <p className="text-xs text-gray-500">
                                Field: {error.field}
                              </p>
                            )}
                            
                            {error.suggestedFix && (
                              <div className="flex items-center space-x-1 mt-2">
                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-gray-600">
                                  {error.suggestedFix}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {error.canRetry && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedError(error);
                                setFixDialogOpen(true);
                              }}
                              data-testid={`fix-error-${error.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedError(error);
                            }}
                            data-testid={`view-error-${error.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Error Fix Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fix Import Error</DialogTitle>
            <DialogDescription>
              Review the error details and apply a fix to retry the import
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              {/* Error Details */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Error Details</span>
                </div>
                <p className="text-sm mb-2">{selectedError.errorMessage}</p>
                <div className="text-xs text-gray-600">
                  <div>Entity: {selectedError.entityType}</div>
                  <div>Row: {selectedError.sourceRowNumber}</div>
                  {selectedError.field && <div>Field: {selectedError.field}</div>}
                </div>
              </div>

              {/* Source Data */}
              <div>
                <h4 className="text-sm font-medium mb-2">Source Data</h4>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                  {JSON.stringify(selectedError.sourceData, null, 2)}
                </div>
              </div>

              {/* Fix Suggestions */}
              <div>
                <h4 className="text-sm font-medium mb-2">Suggested Fixes</h4>
                <div className="space-y-2">
                  {generateFixSuggestions(selectedError).map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFixDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedError && handleFixError(selectedError, 'manual_fix')}
              data-testid="apply-fix"
            >
              Apply Fix & Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}