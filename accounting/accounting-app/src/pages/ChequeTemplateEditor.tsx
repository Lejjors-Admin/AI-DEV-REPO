/**
 * Cheque Template Editor - Visual Drag & Drop Template Designer
 * Create and customize cheque templates with precise field positioning
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import {
  getChequeTemplate,
  getDefaultChequeTemplate,
  createChequeTemplate,
  updateChequeTemplate,
  type ChequeFieldPositions,
  type FieldPosition,
} from '@/lib/api/cheque-templates';
import {
  TemplateCanvas,
  TemplateField,
  FieldPosition as CanvasFieldPosition,
} from '@/components/template-editor/TemplateCanvas';
import {
  FieldPalette,
  CHEQUE_FIELD_DEFINITIONS,
} from '@/components/template-editor/FieldPalette';
import { FieldPropertiesPanel } from '@/components/template-editor/FieldPropertiesPanel';
import { ChequePreviewModal } from '@/components/template-editor/ChequePreviewModal';

// Standard cheque dimensions (8.5" x 3.5" at 72 DPI)
const CHEQUE_WIDTH = 612;
const CHEQUE_HEIGHT = 252;

export default function ChequeTemplateEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [templateName, setTemplateName] = useState('New Cheque Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load template from backend
  const { data: template, isLoading } = useQuery({
    queryKey: ['cheque-template', id],
    queryFn: async () => {
      if (!id || id === 'new') {
        return getDefaultChequeTemplate();
      }
      return getChequeTemplate(parseInt(id));
    },
    enabled: true,
  });

  // Initialize fields from loaded template
  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      
      // Convert backend field positions to frontend format
      const convertedFields = convertBackendToFrontendFields(template.fieldPositions);
      setFields(convertedFields);
    }
  }, [template]);

  // Required fields that cannot be deleted
  const REQUIRED_FIELDS = ['date', 'payeeName', 'amountNumeric', 'amountWords', 'memo', 'signature'];

  // Convert backend field positions to frontend TemplateField format
  const convertBackendToFrontendFields = (fieldPositions: ChequeFieldPositions): TemplateField[] => {
    const fields: TemplateField[] = [];
    
    Object.entries(fieldPositions).forEach(([key, position]) => {
      if (position) {
        const fieldDef = CHEQUE_FIELD_DEFINITIONS.find(f => f.id === key);
        fields.push({
          id: key,                            // Use canonical key as ID
          fieldKey: key,                      // Store canonical backend key
          label: fieldDef?.label || key,
          fieldType: key,
          position: position as CanvasFieldPosition,
          value: `{${fieldDef?.label || key}}`,
          isRequired: REQUIRED_FIELDS.includes(key),
        });
      }
    });
    
    return fields;
  };

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields are present
      const missingRequired = REQUIRED_FIELDS.filter(
        reqField => !fields.some(f => f.fieldKey === reqField)
      );

      if (missingRequired.length > 0) {
        throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
      }

      // Convert fields to backend format using canonical fieldKey
      const fieldPositions = fields.reduce((acc, field) => {
        const fieldKey = field.fieldKey as keyof ChequeFieldPositions;
        acc[fieldKey] = {
          x: field.position.x,
          y: field.position.y,
          width: field.position.width,
          height: field.position.height,
          fontSize: field.position.fontSize,
          fontFamily: field.position.fontFamily,
          alignment: field.position.alignment,
          format: field.position.format,
        } as FieldPosition;
        return acc;
      }, {} as Partial<ChequeFieldPositions>);

      const templateData = {
        name: templateName,
        description: templateDescription,
        fieldPositions: fieldPositions as ChequeFieldPositions,
        pageWidth: CHEQUE_WIDTH,
        pageHeight: CHEQUE_HEIGHT,
      };

      if (id && id !== 'new' && template) {
        return updateChequeTemplate(template.id, templateData);
      } else {
        return createChequeTemplate(templateData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cheque-templates'] });
      toast({
        title: 'Template Saved',
        description: 'Your cheque template has been saved successfully',
      });
      // Navigate to the saved template if we created a new one
      if (id === 'new') {
        setLocation(`/cheque-templates/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    },
  });

  const handleFieldAdd = (fieldDef: any) => {
    // Check if this field already exists (prevent duplicates for canonical fields)
    const existingField = fields.find(f => f.fieldKey === fieldDef.id);
    if (existingField) {
      toast({
        title: 'Field Already Exists',
        description: `The field "${fieldDef.label}" is already on the canvas`,
        variant: 'destructive',
      });
      return;
    }

    const newField: TemplateField = {
      id: fieldDef.id,                    // Use canonical key as ID
      fieldKey: fieldDef.id,              // Store canonical backend key
      label: fieldDef.label,
      fieldType: fieldDef.id,
      position: {
        x: 50,
        y: 50,
        width: fieldDef.defaultWidth || 100,
        height: fieldDef.defaultHeight || 30,
        fontSize: 12,
        fontFamily: 'Helvetica',
        alignment: 'left',
        format: fieldDef.format,
      },
      value: `{${fieldDef.label}}`,
      isRequired: REQUIRED_FIELDS.includes(fieldDef.id),
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const handleFieldMove = (fieldId: string, x: number, y: number) => {
    setFields(fields.map((f) =>
      f.id === fieldId
        ? { ...f, position: { ...f.position, x, y } }
        : f
    ));
  };

  const handleFieldResize = (fieldId: string, width: number, height: number) => {
    setFields(fields.map((f) =>
      f.id === fieldId
        ? { ...f, position: { ...f.position, width, height } }
        : f
    ));
  };

  const handleFieldUpdate = (fieldId: string, updates: Partial<TemplateField>) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  };

  const handleFieldDelete = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    
    // Prevent deleting required fields (use server-truth, not state flag)
    if (field && REQUIRED_FIELDS.includes(field.fieldKey)) {
      toast({
        title: 'Cannot Delete Required Field',
        description: `The field "${field.label}" is required for cheque templates`,
        variant: 'destructive',
      });
      return;
    }

    setFields(fields.filter((f) => f.id !== fieldId));
    setSelectedField(null);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const selectedFieldData = fields.find((f) => f.id === selectedField) || null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/books')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Cheque Template Editor</h1>
              <p className="text-gray-600">
                Design your custom cheque template with drag-and-drop
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-2">
            <FieldPalette
              availableFields={CHEQUE_FIELD_DEFINITIONS}
              onFieldAdd={handleFieldAdd}
            />
          </div>

          <div className="col-span-7">
            <TemplateCanvas
              width={CHEQUE_WIDTH}
              height={CHEQUE_HEIGHT}
              fields={fields}
              selectedField={selectedField}
              onFieldSelect={setSelectedField}
              onFieldMove={handleFieldMove}
              onFieldResize={handleFieldResize}
              showGrid={true}
              gridSize={10}
              snapToGrid={true}
            />
          </div>

          <div className="col-span-3">
            <FieldPropertiesPanel
              selectedField={selectedFieldData}
              onFieldUpdate={handleFieldUpdate}
              onFieldDelete={handleFieldDelete}
            />
          </div>
        </div>

        <ChequePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          fields={fields}
          width={CHEQUE_WIDTH}
          height={CHEQUE_HEIGHT}
          templateName={templateName}
        />
      </div>
    </div>
  );
}
