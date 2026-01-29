/**
 * Data Mapping Interface Component
 * 
 * Visual interface for mapping PerfexCRM fields to Pages CRM fields
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Settings,
  MapPin,
  Zap
} from 'lucide-react';

interface DataMappingInterfaceProps {
  sessionId: number;
  uploadedFiles: any[];
  onMappingComplete: (mappings: Record<string, any>) => void;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required: boolean;
  defaultValue?: any;
  transformation?: 'trim' | 'uppercase' | 'lowercase' | 'capitalize' | 'phone_format' | 'date_format';
  validationRules?: ValidationRule[];
}

interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'date' | 'number' | 'length' | 'pattern';
  value?: any;
  message: string;
}

interface MappingTemplate {
  name: string;
  description: string;
  mappings: Record<string, FieldMapping>;
}

// Target field definitions for each entity type
const TARGET_FIELDS = {
  clients: [
    { field: 'name', label: 'Company Name', type: 'string', required: true },
    { field: 'email', label: 'Email Address', type: 'email', required: false },
    { field: 'phone', label: 'Phone Number', type: 'phone', required: false },
    { field: 'addressStreet', label: 'Street Address', type: 'string', required: false },
    { field: 'addressCity', label: 'City', type: 'string', required: false },
    { field: 'addressStateProvince', label: 'State/Province', type: 'string', required: false },
    { field: 'addressPostalCode', label: 'Postal Code', type: 'string', required: false },
    { field: 'addressCountry', label: 'Country', type: 'string', required: false },
    { field: 'website', label: 'Website', type: 'string', required: false },
    { field: 'taxId', label: 'Tax ID/VAT Number', type: 'string', required: false },
    { field: 'industry', label: 'Industry', type: 'string', required: false },
  ],
  projects: [
    { field: 'name', label: 'Project Name', type: 'string', required: true },
    { field: 'description', label: 'Description', type: 'string', required: false },
    { field: 'clientId', label: 'Client ID', type: 'number', required: true },
    { field: 'startDate', label: 'Start Date', type: 'date', required: false },
    { field: 'endDate', label: 'End Date', type: 'date', required: false },
    { field: 'budgetAmount', label: 'Budget Amount', type: 'number', required: false },
    { field: 'estimatedHours', label: 'Estimated Hours', type: 'number', required: false },
    { field: 'status', label: 'Status', type: 'string', required: false },
  ],
  tasks: [
    { field: 'title', label: 'Task Title', type: 'string', required: true },
    { field: 'description', label: 'Description', type: 'string', required: false },
    { field: 'projectId', label: 'Project ID', type: 'number', required: false },
    { field: 'clientId', label: 'Client ID', type: 'number', required: true },
    { field: 'assignedTo', label: 'Assigned To', type: 'number', required: false },
    { field: 'dueDate', label: 'Due Date', type: 'date', required: false },
    { field: 'priority', label: 'Priority', type: 'string', required: false },
    { field: 'status', label: 'Status', type: 'string', required: false },
  ],
  contacts: [
    { field: 'name', label: 'Contact Name', type: 'string', required: true },
    { field: 'email', label: 'Email Address', type: 'email', required: false },
    { field: 'phone', label: 'Phone Number', type: 'phone', required: false },
    { field: 'companyName', label: 'Company Name', type: 'string', required: false },
    { field: 'contactType', label: 'Contact Type', type: 'string', required: true },
    { field: 'address', label: 'Address', type: 'string', required: false },
    { field: 'city', label: 'City', type: 'string', required: false },
    { field: 'province', label: 'Province/State', type: 'string', required: false },
  ],
  invoices: [
    { field: 'invoiceNumber', label: 'Invoice Number', type: 'string', required: true },
    { field: 'clientId', label: 'Client ID', type: 'number', required: true },
    { field: 'contactId', label: 'Contact ID', type: 'number', required: false },
    { field: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
    { field: 'dueDate', label: 'Due Date', type: 'date', required: true },
    { field: 'subtotal', label: 'Subtotal', type: 'number', required: true },
    { field: 'taxAmount', label: 'Tax Amount', type: 'number', required: false },
    { field: 'totalAmount', label: 'Total Amount', type: 'number', required: true },
    { field: 'status', label: 'Status', type: 'string', required: false },
  ]
};

export function DataMappingInterface({ sessionId, uploadedFiles, onMappingComplete }: DataMappingInterfaceProps) {
  const { toast } = useToast();
  const [fieldMappings, setFieldMappings] = useState<Record<string, Record<string, FieldMapping>>>({});
  const [selectedEntityType, setSelectedEntityType] = useState<string>('clients');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>({});

  // Get mapping templates
  const { data: mappingTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/perfex-import/mappings/templates'],
    select: (data) => data?.data || {}
  });

  // Update field mappings mutation
  const updateMappingsMutation = useMutation({
    mutationFn: async (mappings: Record<string, FieldMapping>) => {
      return await apiRequest(`/api/perfex-import/sessions/${sessionId}/mappings`, {
        method: 'PUT',
        body: JSON.stringify({ mappings })
      });
    },
    onSuccess: () => {
      toast({
        title: "Mappings Updated",
        description: "Field mappings have been saved successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update field mappings",
        variant: "destructive"
      });
    }
  });

  // Initialize mappings from uploaded files
  useEffect(() => {
    const initialMappings: Record<string, Record<string, FieldMapping>> = {};
    
    uploadedFiles.forEach(file => {
      if (file.suggestedMappings) {
        initialMappings[file.entityType] = {};
        
        Object.entries(file.suggestedMappings).forEach(([targetField, sourceIndex]) => {
          const sourceField = file.headers[sourceIndex as number];
          if (sourceField && targetField) {
            initialMappings[file.entityType][targetField] = {
              sourceField,
              targetField,
              dataType: getDataTypeForField(targetField),
              required: isRequiredField(file.entityType, targetField)
            };
          }
        });
      }
    });
    
    setFieldMappings(initialMappings);
  }, [uploadedFiles]);

  // Get current file for selected entity type
  const getCurrentFile = () => {
    return uploadedFiles.find(file => file.entityType === selectedEntityType);
  };

  // Apply mapping template
  const applyTemplate = (template: MappingTemplate) => {
    const currentFile = getCurrentFile();
    if (!currentFile) return;

    const newMappings = { ...fieldMappings };
    if (!newMappings[selectedEntityType]) {
      newMappings[selectedEntityType] = {};
    }

    Object.entries(template.mappings).forEach(([key, mapping]) => {
      // Find matching header in current file
      const headerIndex = currentFile.headers.findIndex((header: string) => 
        header.toLowerCase().includes(mapping.sourceField.toLowerCase()) ||
        mapping.sourceField.toLowerCase().includes(header.toLowerCase())
      );
      
      if (headerIndex !== -1) {
        newMappings[selectedEntityType][key] = {
          ...mapping,
          sourceField: currentFile.headers[headerIndex]
        };
      }
    });

    setFieldMappings(newMappings);
    
    toast({
      title: "Template Applied",
      description: `Applied ${template.name} mapping template`
    });
  };

  // Update individual field mapping
  const updateFieldMapping = (targetField: string, updates: Partial<FieldMapping>) => {
    const newMappings = { ...fieldMappings };
    if (!newMappings[selectedEntityType]) {
      newMappings[selectedEntityType] = {};
    }
    
    newMappings[selectedEntityType][targetField] = {
      ...newMappings[selectedEntityType][targetField],
      ...updates
    };
    
    setFieldMappings(newMappings);
  };

  // Validate mappings
  const validateMappings = () => {
    const currentFile = getCurrentFile();
    if (!currentFile) return;

    const currentMappings = fieldMappings[selectedEntityType] || {};
    const targetFields = TARGET_FIELDS[selectedEntityType as keyof typeof TARGET_FIELDS] || [];
    
    const validationResults: any = {
      missingRequired: [],
      duplicateSources: [],
      invalidTypes: [],
      warnings: []
    };

    // Check for missing required fields
    targetFields.forEach(field => {
      if (field.required && !currentMappings[field.field]) {
        validationResults.missingRequired.push(field.field);
      }
    });

    // Check for duplicate source fields
    const sourceCounts: Record<string, string[]> = {};
    Object.entries(currentMappings).forEach(([targetField, mapping]) => {
      if (mapping.sourceField) {
        if (!sourceCounts[mapping.sourceField]) {
          sourceCounts[mapping.sourceField] = [];
        }
        sourceCounts[mapping.sourceField].push(targetField);
      }
    });
    
    Object.entries(sourceCounts).forEach(([sourceField, targets]) => {
      if (targets.length > 1) {
        validationResults.duplicateSources.push({ sourceField, targets });
      }
    });

    setValidationResults(validationResults);
    return validationResults;
  };

  // Save mappings
  const saveMappings = async () => {
    const validation = validateMappings();
    
    if (validation.missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map the following required fields: ${validation.missingRequired.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    await updateMappingsMutation.mutateAsync(fieldMappings[selectedEntityType] || {});
    onMappingComplete(fieldMappings);
  };

  // Generate preview data
  const generatePreview = () => {
    const currentFile = getCurrentFile();
    if (!currentFile) return;

    const currentMappings = fieldMappings[selectedEntityType] || {};
    const preview = currentFile.preview.slice(0, 5).map((row: any[], index: number) => {
      const mappedRow: any = { _originalRowIndex: index };
      
      Object.entries(currentMappings).forEach(([targetField, mapping]) => {
        const sourceIndex = currentFile.headers.indexOf(mapping.sourceField);
        if (sourceIndex !== -1 && row[sourceIndex] !== undefined) {
          mappedRow[targetField] = row[sourceIndex];
        }
      });
      
      return mappedRow;
    });
    
    setPreviewData(preview);
  };

  const getDataTypeForField = (fieldName: string): 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' => {
    if (fieldName.includes('email') || fieldName.includes('Email')) return 'email';
    if (fieldName.includes('phone') || fieldName.includes('Phone')) return 'phone';
    if (fieldName.includes('date') || fieldName.includes('Date')) return 'date';
    if (fieldName.includes('amount') || fieldName.includes('Amount') || fieldName.includes('budget') || fieldName.includes('Budget')) return 'number';
    if (fieldName.includes('id') || fieldName.includes('Id') || fieldName.includes('ID')) return 'number';
    return 'string';
  };

  const isRequiredField = (entityType: string, fieldName: string): boolean => {
    const targetField = TARGET_FIELDS[entityType as keyof typeof TARGET_FIELDS]?.find(f => f.field === fieldName);
    return targetField?.required || false;
  };

  const currentFile = getCurrentFile();
  const currentMappings = fieldMappings[selectedEntityType] || {};
  const targetFields = TARGET_FIELDS[selectedEntityType as keyof typeof TARGET_FIELDS] || [];

  if (!currentFile) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No file uploaded for the selected entity type. Please upload files first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card data-testid="data-mapping-interface">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Field Mapping</span>
        </CardTitle>
        <CardDescription>
          Map fields from your PerfexCRM export to Pages CRM fields. 
          Required fields must be mapped to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Entity Type Selector */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger className="w-48 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uploadedFiles.map(file => (
                    <SelectItem key={file.entityType} value={file.entityType}>
                      {file.entityType.charAt(0).toUpperCase() + file.entityType.slice(1)} 
                      ({file.totalRecords} records)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selector */}
            {mappingTemplates && mappingTemplates[selectedEntityType] && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(mappingTemplates[selectedEntityType])}
                  data-testid="apply-template"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Apply Template
                </Button>
              </div>
            )}
          </div>

          {/* Mapping Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium">
                <div className="col-span-3">Pages CRM Field</div>
                <div className="col-span-1"></div>
                <div className="col-span-3">PerfexCRM Field</div>
                <div className="col-span-2">Data Type</div>
                <div className="col-span-2">Transformation</div>
                <div className="col-span-1">Preview</div>
              </div>
            </div>

            <div className="divide-y max-h-96 overflow-y-auto">
              {targetFields.map((targetField) => {
                const mapping = currentMappings[targetField.field];
                const isRequired = targetField.required;
                const isMapped = !!mapping?.sourceField;

                return (
                  <div
                    key={targetField.field}
                    className={`px-4 py-3 grid grid-cols-12 gap-4 items-center ${
                      isRequired && !isMapped ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    data-testid={`mapping-${targetField.field}`}
                  >
                    {/* Target Field */}
                    <div className="col-span-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{targetField.label}</span>
                        {isRequired && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{targetField.field}</div>
                    </div>

                    {/* Arrow */}
                    <div className="col-span-1 flex justify-center">
                      <ArrowRight className={`w-4 h-4 ${isMapped ? 'text-green-500' : 'text-gray-300'}`} />
                    </div>

                    {/* Source Field Selector */}
                    <div className="col-span-3">
                      <Select
                        value={mapping?.sourceField || ''}
                        onValueChange={(value) => updateFieldMapping(targetField.field, { 
                          sourceField: value,
                          targetField: targetField.field,
                          dataType: targetField.type as any,
                          required: isRequired
                        })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select source field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- None --</SelectItem>
                          {currentFile.headers.map((header: string, index: number) => (
                            <SelectItem key={index} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data Type */}
                    <div className="col-span-2">
                      <Select
                        value={mapping?.dataType || targetField.type}
                        onValueChange={(value) => updateFieldMapping(targetField.field, { 
                          dataType: value as any
                        })}
                        disabled={!isMapped}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transformation */}
                    <div className="col-span-2">
                      <Select
                        value={mapping?.transformation || ''}
                        onValueChange={(value) => updateFieldMapping(targetField.field, { 
                          transformation: value as any || undefined
                        })}
                        disabled={!isMapped}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="trim">Trim Whitespace</SelectItem>
                          <SelectItem value="uppercase">UPPERCASE</SelectItem>
                          <SelectItem value="lowercase">lowercase</SelectItem>
                          <SelectItem value="capitalize">Capitalize</SelectItem>
                          {mapping?.dataType === 'phone' && (
                            <SelectItem value="phone_format">Format Phone</SelectItem>
                          )}
                          {mapping?.dataType === 'date' && (
                            <SelectItem value="date_format">Format Date</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview */}
                    <div className="col-span-1">
                      {isMapped && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const sourceIndex = currentFile.headers.indexOf(mapping.sourceField);
                            const sampleValue = currentFile.preview[0]?.[sourceIndex];
                            toast({
                              title: "Sample Value",
                              description: sampleValue ? String(sampleValue) : "No sample data available"
                            });
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Results */}
          {validationResults.missingRequired?.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing required fields:</strong> {validationResults.missingRequired.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {validationResults.duplicateSources?.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Duplicate mappings detected:</strong> Some source fields are mapped to multiple target fields.
              </AlertDescription>
            </Alert>
          )}

          {/* Data Preview */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList>
              <TabsTrigger value="preview">Data Preview</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Mapped Data Preview</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePreview}
                  data-testid="generate-preview"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Preview
                </Button>
              </div>
              
              {previewData.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {Object.keys(previewData[0])
                          .filter(key => key !== '_originalRowIndex')
                          .map(key => (
                            <th key={key} className="px-4 py-2 text-left font-medium">
                              {targetFields.find(f => f.field === key)?.label || key}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.entries(row)
                            .filter(([key]) => key !== '_originalRowIndex')
                            .map(([key, value]) => (
                              <td key={key} className="px-4 py-2">
                                {value ? String(value) : <span className="text-gray-400">--</span>}
                              </td>
                            ))
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Refresh Preview" to see how your data will be mapped
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="raw" className="space-y-4">
              <h4 className="text-sm font-medium">Raw Source Data</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {currentFile.headers.map((header: string, index: number) => (
                        <th key={index} className="px-4 py-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentFile.preview.slice(0, 5).map((row: any[], index: number) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2">
                            {cell ? String(cell) : <span className="text-gray-400">--</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={validateMappings}
              data-testid="validate-mappings"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Validate Mappings
            </Button>
            
            <Button
              onClick={saveMappings}
              disabled={updateMappingsMutation.isPending}
              data-testid="save-mappings"
            >
              {updateMappingsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Mappings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}