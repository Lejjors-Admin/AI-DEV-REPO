/**
 * PerfexCRM Import Page
 * 
 * Comprehensive import wizard for migrating data from PerfexCRM to Pages CRM
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Settings,
  MapPin,
  Users,
  FolderOpen,
  CheckSquare,
  DollarSign,
  Timer
} from 'lucide-react';

// Import wizard components (to be created)
import { ImportFileUpload } from '@/components/import/ImportFileUpload';
import { DataMappingInterface } from '@/components/import/DataMappingInterface';
import { ImportProgressTracker } from '@/components/import/ImportProgressTracker';
import { ImportSummary } from '@/components/import/ImportSummary';
import { ErrorResolutionPanel } from '@/components/import/ErrorResolutionPanel';

// Types
interface ImportSession {
  id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
  entityTypes: string[];
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  progressPercentage: number;
  currentStep: string;
  startedAt?: string;
  completedAt?: string;
  errorSummary?: string;
}

interface ImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateReferences: boolean;
  createMissingReferences: boolean;
  batchSize: number;
  timeoutMinutes: number;
  preserveIds: boolean;
  notificationSettings: {
    emailOnCompletion: boolean;
    emailOnError: boolean;
    notificationEmails: string[];
  };
  dataTransformations: {
    trimWhitespace: boolean;
    capitalizeNames: boolean;
    standardizePhones: boolean;
    validateEmails: boolean;
  };
}

// Import step configuration
const IMPORT_STEPS = [
  { 
    id: 'configure', 
    title: 'Configure Import', 
    description: 'Select data types and settings',
    icon: Settings 
  },
  { 
    id: 'upload', 
    title: 'Upload Files', 
    description: 'Upload PerfexCRM export files',
    icon: Upload 
  },
  { 
    id: 'mapping', 
    title: 'Field Mapping', 
    description: 'Map data fields between systems',
    icon: MapPin 
  },
  { 
    id: 'preview', 
    title: 'Preview & Validate', 
    description: 'Review data before import',
    icon: CheckCircle2 
  },
  { 
    id: 'execute', 
    title: 'Execute Import', 
    description: 'Run the data import process',
    icon: Database 
  },
  { 
    id: 'summary', 
    title: 'Summary', 
    description: 'Review import results',
    icon: CheckSquare 
  }
];

// Entity type configuration
const ENTITY_TYPES = [
  { 
    id: 'clients', 
    label: 'Clients/Customers', 
    description: 'Import customer records and business information',
    icon: Users,
    color: 'bg-blue-500'
  },
  { 
    id: 'projects', 
    label: 'Projects', 
    description: 'Import project data with timelines and budgets',
    icon: FolderOpen,
    color: 'bg-green-500'
  },
  { 
    id: 'tasks', 
    label: 'Tasks', 
    description: 'Import task assignments and progress tracking',
    icon: CheckSquare,
    color: 'bg-orange-500'
  },
  { 
    id: 'contacts', 
    label: 'Contacts', 
    description: 'Import contact persons and relationships',
    icon: Users,
    color: 'bg-purple-500'
  },
  { 
    id: 'invoices', 
    label: 'Invoices', 
    description: 'Import billing data and invoice history',
    icon: DollarSign,
    color: 'bg-emerald-500'
  },
  { 
    id: 'time_entries', 
    label: 'Time Tracking', 
    description: 'Import logged hours and billable time',
    icon: Timer,
    color: 'bg-red-500'
  }
];

export default function PerfexImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>(['clients']);
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    skipDuplicates: true,
    updateExisting: false,
    validateReferences: true,
    createMissingReferences: false,
    batchSize: 100,
    timeoutMinutes: 30,
    preserveIds: false,
    notificationSettings: {
      emailOnCompletion: true,
      emailOnError: true,
      notificationEmails: []
    },
    dataTransformations: {
      trimWhitespace: true,
      capitalizeNames: true,
      standardizePhones: true,
      validateEmails: true
    }
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, any>>({});
  const [isExecutingImport, setIsExecutingImport] = useState(false);

  // Query for import sessions
  const { data: importSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/perfex-import/sessions'],
    enabled: !!user
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (data: { entityTypes: string[]; settings: ImportSettings }) => {
      return await apiRequest('/api/perfex-import/sessions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      setImportSession(data.data);
      toast({
        title: "Import Session Created",
        description: "Ready to upload PerfexCRM export files"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Session",
        description: error.message || "Failed to create import session",
        variant: "destructive"
      });
    }
  });

  const executeImportMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/perfex-import/sessions/${sessionId}/execute`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setIsExecutingImport(true);
      toast({
        title: "Import Started",
        description: "PerfexCRM data import is now running"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Starting Import",
        description: error.message || "Failed to start import execution",
        variant: "destructive"
      });
    }
  });

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < IMPORT_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // Initialize import session
  const initializeImport = async () => {
    if (selectedEntityTypes.length === 0) {
      toast({
        title: "Select Entity Types",
        description: "Please select at least one data type to import",
        variant: "destructive"
      });
      return;
    }

    await createSessionMutation.mutateAsync({
      entityTypes: selectedEntityTypes,
      settings: importSettings
    });
    
    nextStep();
  };

  // Execute import
  const executeImport = async () => {
    if (!importSession) return;
    
    await executeImportMutation.mutateAsync(importSession.id);
    nextStep();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="perfex-import-page">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PerfexCRM Import Wizard
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Import your data from PerfexCRM to Pages CRM with guided assistance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                Step {currentStep + 1} of {IMPORT_STEPS.length}
              </Badge>
              {importSession && (
                <Badge 
                  variant={importSession.status === 'completed' ? 'default' : 'secondary'}
                  data-testid={`status-${importSession.status}`}
                >
                  {importSession.status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {IMPORT_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isAccessible = index <= currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isAccessible && goToStep(index)}
                    disabled={!isAccessible}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                        : isAccessible
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                    data-testid={`step-${step.id}`}
                  >
                    <Icon 
                      className={`w-5 h-5 ${
                        isCompleted ? 'text-green-600 dark:text-green-400' : ''
                      }`} 
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {step.description}
                      </div>
                    </div>
                  </button>
                  {index < IMPORT_STEPS.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Import Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Entity Types */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Selected Data Types</h4>
                  <div className="space-y-2">
                    {selectedEntityTypes.map(entityId => {
                      const entity = ENTITY_TYPES.find(e => e.id === entityId);
                      if (!entity) return null;
                      const Icon = entity.icon;
                      return (
                        <div key={entityId} className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${entity.color}`} />
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{entity.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Import Statistics */}
                {importSession && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Import Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Records:</span>
                        <span>{importSession.totalRecords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Processed:</span>
                        <span>{importSession.processedRecords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Successful:</span>
                        <span>{importSession.successfulRecords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Failed:</span>
                        <span>{importSession.failedRecords.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      data-testid="button-download-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      data-testid="button-import-history"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Import History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Step Content */}
            <div className="space-y-6">
              {/* Step 1: Configure Import */}
              {currentStep === 0 && (
                <Card data-testid="step-configure">
                  <CardHeader>
                    <CardTitle>Configure Import Settings</CardTitle>
                    <CardDescription>
                      Select the data types you want to import and configure import settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Entity Type Selection */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Select Data Types to Import</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ENTITY_TYPES.map(entity => {
                          const Icon = entity.icon;
                          const isSelected = selectedEntityTypes.includes(entity.id);
                          
                          return (
                            <button
                              key={entity.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedEntityTypes(prev => prev.filter(id => id !== entity.id));
                                } else {
                                  setSelectedEntityTypes(prev => [...prev, entity.id]);
                                }
                              }}
                              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                              data-testid={`entity-${entity.id}`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${entity.color} text-white`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium">{entity.label}</h5>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {entity.description}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Import Settings */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Import Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Skip Duplicates</label>
                            <input
                              type="checkbox"
                              checked={importSettings.skipDuplicates}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                skipDuplicates: e.target.checked
                              }))}
                              className="rounded"
                              data-testid="setting-skip-duplicates"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Update Existing Records</label>
                            <input
                              type="checkbox"
                              checked={importSettings.updateExisting}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                updateExisting: e.target.checked
                              }))}
                              className="rounded"
                              data-testid="setting-update-existing"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Validate References</label>
                            <input
                              type="checkbox"
                              checked={importSettings.validateReferences}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                validateReferences: e.target.checked
                              }))}
                              className="rounded"
                              data-testid="setting-validate-references"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Trim Whitespace</label>
                            <input
                              type="checkbox"
                              checked={importSettings.dataTransformations.trimWhitespace}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                dataTransformations: {
                                  ...prev.dataTransformations,
                                  trimWhitespace: e.target.checked
                                }
                              }))}
                              className="rounded"
                              data-testid="setting-trim-whitespace"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Capitalize Names</label>
                            <input
                              type="checkbox"
                              checked={importSettings.dataTransformations.capitalizeNames}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                dataTransformations: {
                                  ...prev.dataTransformations,
                                  capitalizeNames: e.target.checked
                                }
                              }))}
                              className="rounded"
                              data-testid="setting-capitalize-names"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Validate Emails</label>
                            <input
                              type="checkbox"
                              checked={importSettings.dataTransformations.validateEmails}
                              onChange={(e) => setImportSettings(prev => ({
                                ...prev,
                                dataTransformations: {
                                  ...prev.dataTransformations,
                                  validateEmails: e.target.checked
                                }
                              }))}
                              className="rounded"
                              data-testid="setting-validate-emails"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Upload Files */}
              {currentStep === 1 && importSession && (
                <ImportFileUpload 
                  sessionId={importSession.id}
                  entityTypes={selectedEntityTypes}
                  onFilesUploaded={setUploadedFiles}
                />
              )}

              {/* Step 3: Field Mapping */}
              {currentStep === 2 && importSession && uploadedFiles.length > 0 && (
                <DataMappingInterface
                  sessionId={importSession.id}
                  uploadedFiles={uploadedFiles}
                  onMappingComplete={setFieldMappings}
                />
              )}

              {/* Step 4: Preview & Validate */}
              {currentStep === 3 && importSession && (
                <Card data-testid="step-preview">
                  <CardHeader>
                    <CardTitle>Preview & Validate Data</CardTitle>
                    <CardDescription>
                      Review your data and field mappings before executing the import
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Review the data preview carefully. Once you execute the import, 
                          changes will be applied to your database.
                        </AlertDescription>
                      </Alert>
                      
                      {/* Data preview would go here */}
                      <div className="text-center py-8 text-gray-500">
                        Data preview will be shown here based on uploaded files and mappings
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Execute Import */}
              {currentStep === 4 && importSession && (
                <ImportProgressTracker
                  sessionId={importSession.id}
                  isExecuting={isExecutingImport}
                  onImportComplete={() => nextStep()}
                />
              )}

              {/* Step 6: Summary */}
              {currentStep === 5 && importSession && (
                <ImportSummary
                  sessionId={importSession.id}
                  importSession={importSession}
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-2">
                {currentStep === 0 && (
                  <Button
                    onClick={initializeImport}
                    disabled={selectedEntityTypes.length === 0 || createSessionMutation.isPending}
                    data-testid="button-initialize"
                  >
                    {createSessionMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Initialize Import
                  </Button>
                )}
                
                {currentStep > 0 && currentStep < 3 && (
                  <Button
                    onClick={nextStep}
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                
                {currentStep === 3 && (
                  <Button
                    onClick={executeImport}
                    disabled={executeImportMutation.isPending}
                    data-testid="button-execute"
                  >
                    {executeImportMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Execute Import
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}