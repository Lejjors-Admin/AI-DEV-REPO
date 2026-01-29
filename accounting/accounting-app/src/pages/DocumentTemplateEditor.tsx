/**
 * Universal Document Template Editor
 * Multi-section visual editor for cheques, invoices, binders, etc.
 * Supports 3-part cheque layout with independent section editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Loader2, ZoomIn, ZoomOut, Grid3x3, Eye, XCircle, Copy, Clipboard, Trash2, Layers, Ungroup } from 'lucide-react';
import {
  getDocumentTemplate,
  getDefaultDocumentTemplate,
  createDocumentTemplate,
  updateDocumentTemplate,
  getDocumentTypeRegistry,
  type DocumentTemplate,
  type TemplateSection,
  type FieldPosition,
} from '@/lib/api/document-templates';
import { SectionCanvas, SectionField } from '@/components/template-editor/SectionCanvas';
import { FieldPalette, CHEQUE_FIELD_DEFINITIONS, INVOICE_FIELD_DEFINITIONS, type FieldDefinition } from '@/components/template-editor/FieldPalette';
import { useSelectedClient } from '@/contexts/SelectedClientContext';
import { FieldPropertiesPanel } from '@/components/template-editor/FieldPropertiesPanel';
import { ChequePreviewModal } from '@/components/template-editor/ChequePreviewModal';
import { TemplateField } from '@/components/template-editor/TemplateCanvas';

export default function DocumentTemplateEditor() {
  const { id, documentType } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedClientId } = useSelectedClient();

  const [templateName, setTemplateName] = useState('New Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [selectedFields, setSelectedFields] = useState<Array<{ fieldId: string; sectionId: string }>>([]);
  const [zoom, setZoom] = useState(0.8);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [copiedFields, setCopiedFields] = useState<Array<{ fieldKey: string; position: FieldPosition }> | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [sectionToClear, setSectionToClear] = useState<{ id: string; name: string } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Groups: Map of groupId to array of { fieldId, sectionId }
  const [fieldGroups, setFieldGroups] = useState<Map<string, Array<{ fieldId: string; sectionId: string }>>>(new Map());
  const [nextGroupId, setNextGroupId] = useState(1);

  // Load document type registry
  const { data: registry } = useQuery({
    queryKey: ['document-type-registry'],
    queryFn: getDocumentTypeRegistry,
  });

  // Load template from backend
  const { data: template, isLoading, error: templateError } = useQuery({
    queryKey: ['document-template', id, documentType],
    queryFn: async () => {
      if (!id || id === 'new') {
        if (!documentType) {
          throw new Error('Document type is required for new templates');
        }
        // Pass clientId when loading default template
        return getDefaultDocumentTemplate(documentType, selectedClientId || undefined);
      }
      const templateId = parseInt(id);
      if (isNaN(templateId)) {
        throw new Error('Invalid template ID');
      }
      // Pass clientId when loading template
      const loadedTemplate = await getDocumentTemplate(templateId, selectedClientId || undefined);
      
      // If documentType is missing from URL but template has it, redirect to correct URL
      if (!documentType && loadedTemplate.documentType) {
        // Redirect to the correct URL with documentType
        setTimeout(() => {
          setLocation(`/document-templates/${loadedTemplate.documentType}/${templateId}`);
        }, 0);
        return loadedTemplate;
      }
      
      return loadedTemplate;
    },
    enabled: true,
    retry: 1,
  });

  // Initialize state from loaded template (only on initial load, not after saves)
  useEffect(() => {
    if (template && isInitialLoad) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setSections(template.sections || []);
      
      // Clear selected fields when template loads (to avoid stale references)
      setSelectedFields([]);
      
      // Restore UI preferences if available
      if (template.uiPreferences) {
        const prefs = template.uiPreferences;
        if (prefs.zoom !== undefined) setZoom(prefs.zoom);
        if (prefs.showGrid !== undefined) setShowGrid(prefs.showGrid);
        if (prefs.snapToGrid !== undefined) setSnapToGrid(prefs.snapToGrid);
        if (prefs.activeSectionId !== undefined && prefs.activeSectionId !== null) {
          // Verify the section still exists before setting it
          const sectionExists = template.sections?.some(s => s.id === prefs.activeSectionId);
          if (sectionExists) {
            setActiveSectionId(prefs.activeSectionId);
          } else if (template.sections && template.sections.length > 0) {
            setActiveSectionId(template.sections[0].id);
          }
        } else if (template.sections && template.sections.length > 0) {
          // Fallback to first section if no preference
          setActiveSectionId(template.sections[0].id);
        }
      } else {
        // Set first section as active by default if no preferences
        if (template.sections && template.sections.length > 0) {
          setActiveSectionId(template.sections[0].id);
        }
      }
      setIsInitialLoad(false);
    }
  }, [template, isInitialLoad]);

  // Update active section when sections change
  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  // Clean up invalid selected fields when sections change
  useEffect(() => {
    // Remove any selected fields that no longer exist
    setSelectedFields(prev => prev.filter(({ fieldId, sectionId }) => {
      const section = sections.find(s => s.id === sectionId);
      return section && section.fieldPositions[fieldId] !== undefined;
    }));
  }, [sections]);

  // Get current document type info
  const currentDocType = documentType || template?.documentType;
  const docTypeInfo = registry && currentDocType ? registry[currentDocType] : null;

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentDocType) {
        throw new Error('Document type is required');
      }

      // Deep clone sections to ensure all nested data is preserved
      const sectionsToSave = JSON.parse(JSON.stringify(sections));

      const templateData = {
        documentType: currentDocType,
        name: templateName,
        description: templateDescription,
        isDefault: template?.isDefault || false,
        isActive: true,
        sections: sectionsToSave, // Use cloned sections to ensure all data is preserved
        pageWidth: 612,
        pageHeight: 792,
        // Save UI preferences to preserve template board state
        uiPreferences: {
          zoom: zoom,
          showGrid: showGrid,
          snapToGrid: snapToGrid,
          activeSectionId: activeSectionId,
        },
      };
      
      // Debug: Log sections being saved
      console.log('💾 Saving template with sections:', JSON.stringify(sectionsToSave, null, 2));

      if (id && id !== 'new') {
        if (!template) {
          throw new Error('Template not found. Please reload the page.');
        }
        // Pass clientId when updating template
        return updateDocumentTemplate(template.id, {
          name: templateData.name,
          description: templateData.description,
          sections: templateData.sections,
          uiPreferences: templateData.uiPreferences,
        }, selectedClientId || undefined);
      } else {
        // Pass clientId when creating template
        return createDocumentTemplate(templateData, selectedClientId || undefined);
      }
    },
    onSuccess: (data) => {
      // Update local state with saved data to prevent loss during refetch
      // This ensures the UI shows the saved data even if refetch happens
      if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        console.log('✅ Updating sections from saved data:', data.sections.length, 'sections');
        setSections(data.sections);
      } else {
        console.warn('⚠️ Saved template has no sections or invalid sections:', data);
      }
      if (data.name) {
        setTemplateName(data.name);
      }
      if (data.description !== undefined) {
        setTemplateDescription(data.description || '');
      }
      
      // Prevent useEffect from overwriting sections after save
      setIsInitialLoad(false);
      
      // Invalidate all document template queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      queryClient.invalidateQueries({ queryKey: ['document-template', id, documentType] });
      // Don't refetch immediately - let the invalidation handle it
      // This prevents race conditions where refetch might overwrite our state update
      
      toast({
        title: 'Template Saved',
        description: 'Your document template has been saved successfully',
      });
      if (id === 'new') {
        // Navigate to edit mode after creating
        setLocation(`/document-templates/${data.documentType}/${data.id}`);
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

  // Helper to extract base field ID from keys like "date-1" -> "date"
  const getBaseFieldId = (fieldKey: string): string => {
    const match = fieldKey.match(/^(.+?)(-\d+)?$/);
    return match ? match[1] : fieldKey;
  };

  const handleFieldAdd = (fieldDef: FieldDefinition) => {
    if (sections.length === 0) {
      toast({
        title: 'No Sections',
        description: 'Cannot add fields without sections',
        variant: 'destructive',
      });
      return;
    }

    // Use active section, or fall back to first section
    const targetSectionId = activeSectionId || sections[0].id;
    const targetSection = sections.find(s => s.id === targetSectionId);
    
    if (!targetSection) {
      toast({
        title: 'No Active Section',
        description: 'Please select a section to add fields to',
        variant: 'destructive',
      });
      return;
    }

    // Allow duplicate fields by creating unique IDs
    // Check if field already exists - if so, create a unique ID with a counter
    let fieldKey = fieldDef.id;
    
    // Find all existing fields with the same base ID in this section
    const existingFieldKeys = Object.keys(targetSection.fieldPositions);
    const matchingKeys = existingFieldKeys.filter(key => {
      const baseId = getBaseFieldId(key);
      return baseId === fieldDef.id;
    });
    
    if (matchingKeys.length > 0) {
      // Find the highest counter number
      const counters = matchingKeys
        .map(key => {
          if (key === fieldDef.id) return 0; // Original field has no counter
          const numMatch = key.match(/-(\d+)$/);
          return numMatch ? parseInt(numMatch[1], 10) : 0;
        })
        .filter(num => !isNaN(num));
      
      const counter = counters.length > 0 ? Math.max(...counters) + 1 : 1;
      fieldKey = `${fieldDef.id}-${counter}`;
    }

    // Calculate Y position based on existing fields in the section
    const existingFields = Object.values(targetSection.fieldPositions);
    const maxY = existingFields.length > 0 
      ? Math.max(...existingFields.map(f => f.y || 0)) 
      : 0;
    const nextY = maxY + 40; // Place below existing fields

    // Add field to target section with unique key
    const newFieldPosition: FieldPosition = {
      x: 50,
      y: nextY,
      width: fieldDef.defaultWidth || 100,
      height: fieldDef.defaultHeight || 30,
      fontSize: 12,
      fontFamily: 'Helvetica',
      alignment: 'left',
      format: fieldDef.format,
      ...(fieldDef.fieldType && { fieldType: fieldDef.fieldType }),
      ...(fieldDef.fieldType === 'line' || fieldDef.fieldType === 'box' ? { lineWidth: 0.5, lineColor: '#000000', lineStyle: 'solid' as const } : {}),
      ...(fieldDef.isStatic ? { textContent: fieldDef.label } : {}), // Initialize static text with label
    };

    setSections(sections.map(section =>
      section.id === targetSectionId
        ? {
            ...section,
            fieldPositions: {
              ...section.fieldPositions,
              [fieldKey]: newFieldPosition,
            },
          }
        : section
    ));

    setSelectedFields([{ fieldId: fieldKey, sectionId: targetSectionId }]);
  };

  const handleFieldMove = (fieldId: string, sectionId: string, x: number, y: number) => {
    // Find if this field belongs to a group
    let groupFields: Array<{ fieldId: string; sectionId: string }> = [];
    let groupId: string | null = null;
    
    fieldGroups.forEach((fields, gId) => {
      const fieldIndex = fields.findIndex((f: { fieldId: string; sectionId: string }) => f.fieldId === fieldId && f.sectionId === sectionId);
      if (fieldIndex >= 0 && !groupId) {
        groupFields = fields;
        groupId = gId;
      }
    });
    
    // Calculate the offset from the original position
    const section = sections.find(s => s.id === sectionId);
    const originalPosition = section?.fieldPositions[fieldId];
    if (!originalPosition) return;
    
    const deltaX = x - originalPosition.x;
    const deltaY = y - originalPosition.y;
    
    // If field is in a group, move all fields in the group by the same offset
    if (groupId && groupFields.length > 1) {
      setSections(sections.map(section => {
        const updatedPositions = { ...section.fieldPositions };
        let hasChanges = false;
        
        groupFields.forEach(({ fieldId: groupFieldId, sectionId: groupSectionId }) => {
          if (section.id === groupSectionId && section.fieldPositions[groupFieldId]) {
            const currentPos = section.fieldPositions[groupFieldId];
            updatedPositions[groupFieldId] = {
              ...currentPos,
              x: currentPos.x + deltaX,
              y: currentPos.y + deltaY,
            };
            hasChanges = true;
          }
        });
        
        return hasChanges ? { ...section, fieldPositions: updatedPositions } : section;
      }));
    } else {
      // Single field move
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            fieldPositions: {
              ...section.fieldPositions,
              [fieldId]: {
                ...section.fieldPositions[fieldId],
                x,
                y,
              },
            },
          }
        : section
    ));
    }
  };

  const handleFieldResize = (fieldId: string, sectionId: string, width: number, height: number, x?: number, y?: number) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            fieldPositions: {
              ...section.fieldPositions,
              [fieldId]: {
                ...section.fieldPositions[fieldId],
                width: Math.max(20, width), // Minimum width
                height: Math.max(20, height), // Minimum height
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y }),
              },
            },
          }
        : section
    ));
  };

  const handleFieldSelect = (fieldId: string | null, sectionId: string, multiSelect: boolean = false) => {
    if (!fieldId) {
      // Click on canvas - clear selection
      setSelectedFields([]);
      return;
    }

    if (multiSelect) {
      // Ctrl/Cmd+Click - toggle selection
      setSelectedFields(prev => {
        const existingIndex = prev.findIndex(
          f => f.fieldId === fieldId && f.sectionId === sectionId
        );
        if (existingIndex >= 0) {
          // Deselect if already selected
          return prev.filter((_, i) => i !== existingIndex);
        } else {
          // Add to selection
          return [...prev, { fieldId, sectionId }];
        }
      });
    } else {
      // Regular click - single select
      setSelectedFields([{ fieldId, sectionId }]);
    }
  };

  const handleFieldUpdate = (fieldId: string, updates: any) => {
    if (selectedFields.length === 0) return;

    // Update all selected fields with the same updates
    setSections(sections.map(section => {
      const updatedPositions = { ...section.fieldPositions };
      let hasChanges = false;

      selectedFields.forEach(({ fieldId: selectedFieldId, sectionId }) => {
        if (section.id === sectionId && section.fieldPositions[selectedFieldId]) {
          updatedPositions[selectedFieldId] = {
            ...section.fieldPositions[selectedFieldId],
            ...updates.position,
          };
          hasChanges = true;
        }
      });

      return hasChanges ? { ...section, fieldPositions: updatedPositions } : section;
    }));
  };

  const handleFieldDelete = (fieldId?: string) => {
    // If fieldId is provided, delete that specific field
    // Otherwise, delete all selected fields
    const fieldsToDelete = fieldId 
      ? [{ fieldId, sectionId: sections.find(s => Object.keys(s.fieldPositions).includes(fieldId))?.id || '' }]
      : selectedFields;

    if (fieldsToDelete.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select fields to delete',
        variant: 'destructive',
      });
      return;
    }

    setSections(sections.map(section => {
      const updatedPositions = { ...section.fieldPositions };
      let hasChanges = false;

      fieldsToDelete.forEach(({ fieldId: deleteFieldId, sectionId }) => {
        if (section.id === sectionId && updatedPositions[deleteFieldId]) {
          delete updatedPositions[deleteFieldId];
          hasChanges = true;
        }
      });

      return hasChanges ? { ...section, fieldPositions: updatedPositions } : section;
    }));

    // Clear selected fields if any were deleted
    setSelectedFields(prev => prev.filter(
      f => !fieldsToDelete.some(d => d.fieldId === f.fieldId && d.sectionId === f.sectionId)
    ));
    
    // Remove deleted fields from groups
    setFieldGroups(prev => {
      const newGroups = new Map(prev);
      newGroups.forEach((fields, groupId) => {
        const remainingFields = fields.filter(
          (f: { fieldId: string; sectionId: string }) => !fieldsToDelete.some(d => d.fieldId === f.fieldId && d.sectionId === f.sectionId)
        );
        if (remainingFields.length === 0) {
          newGroups.delete(groupId);
        } else if (remainingFields.length < fields.length) {
          newGroups.set(groupId, remainingFields);
        }
      });
      return newGroups;
    });

    toast({
      title: 'Fields Deleted',
      description: `Deleted ${fieldsToDelete.length} field(s).`,
    });
  };

  const handleGroupFields = () => {
    if (selectedFields.length < 2) {
      toast({
        title: 'Not Enough Fields',
        description: 'Please select at least 2 fields to group',
        variant: 'destructive',
      });
      return;
    }

    const groupId = `group-${nextGroupId}`;
    setFieldGroups(prev => {
      const newGroups = new Map(prev);
      newGroups.set(groupId, [...selectedFields]);
      return newGroups;
    });
    setNextGroupId(prev => prev + 1);
    
    toast({
      title: 'Fields Grouped',
      description: `Grouped ${selectedFields.length} field(s). They will now move together.`,
    });
  };

  const handleUngroupFields = () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select fields to ungroup',
        variant: 'destructive',
      });
      return;
    }

    // Find and remove groups containing any selected fields
    let ungroupedCount = 0;
    setFieldGroups(prev => {
      const newGroups = new Map(prev);
      newGroups.forEach((fields, groupId) => {
        const hasSelectedField = fields.some((f: { fieldId: string; sectionId: string }) => 
          selectedFields.some(sf => sf.fieldId === f.fieldId && sf.sectionId === f.sectionId)
        );
        if (hasSelectedField) {
          const remainingFields = fields.filter((f: { fieldId: string; sectionId: string }) => 
            !selectedFields.some(sf => sf.fieldId === f.fieldId && sf.sectionId === f.sectionId)
          );
          if (remainingFields.length === 0) {
            newGroups.delete(groupId);
          } else if (remainingFields.length < fields.length) {
            newGroups.set(groupId, remainingFields);
          }
          ungroupedCount += fields.length - remainingFields.length;
        }
      });
      return newGroups;
    });
    
    if (ungroupedCount > 0) {
      toast({
        title: 'Fields Ungrouped',
        description: `Ungrouped ${ungroupedCount} field(s).`,
      });
    } else {
      toast({
        title: 'No Groups Found',
        description: 'Selected fields are not part of any group',
        variant: 'destructive',
      });
    }
  };

  // Helper to check if a field is in a group
  const isFieldInGroup = useCallback((fieldId: string, sectionId: string): boolean => {
    let found = false;
    fieldGroups.forEach((fields) => {
      if (fields.some((f: { fieldId: string; sectionId: string }) => f.fieldId === fieldId && f.sectionId === sectionId)) {
        found = true;
      }
    });
    return found;
  }, [fieldGroups]);

  const handleCopy = useCallback(() => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select one or more fields to copy',
        variant: 'destructive',
      });
      return;
    }

    // Copy all selected fields
    const fieldsToCopy: Array<{ fieldKey: string; position: FieldPosition }> = [];
    
    selectedFields.forEach(({ fieldId, sectionId }) => {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const fieldPosition = section.fieldPositions[fieldId];
      if (!fieldPosition) return;

      const baseFieldId = getBaseFieldId(fieldId);
      
      fieldsToCopy.push({
        fieldKey: baseFieldId,
        position: { ...fieldPosition },
      });
    });

    if (fieldsToCopy.length === 0) {
      toast({
        title: 'No Fields to Copy',
        description: 'Selected fields could not be found',
        variant: 'destructive',
      });
      return;
    }

    setCopiedFields(fieldsToCopy);

    toast({
      title: 'Fields Copied',
      description: `Copied ${fieldsToCopy.length} field(s) to clipboard. Select a section and paste (Ctrl+V / Cmd+V)`,
    });
  }, [selectedFields, sections, toast]);

  const handleCopyAllFromSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const fieldsToCopy = Object.entries(section.fieldPositions).map(([key, position]) => ({
      fieldKey: getBaseFieldId(key),
      position: { ...position },
    }));

    if (fieldsToCopy.length === 0) {
      toast({
        title: 'No Fields to Copy',
        description: 'This section has no fields to copy',
        variant: 'destructive',
      });
      return;
    }

    setCopiedFields(fieldsToCopy);

    toast({
      title: 'All Fields Copied',
      description: `Copied ${fieldsToCopy.length} field(s) from "${section.name}". Select a section and paste (Ctrl+V / Cmd+V)`,
    });
  }, [sections, toast]);

  const handlePaste = useCallback(() => {
    if (!copiedFields || copiedFields.length === 0) {
      toast({
        title: 'Nothing to Paste',
        description: 'Copy a field first (Ctrl+C / Cmd+C)',
        variant: 'destructive',
      });
      return;
    }

    if (!activeSectionId) {
      toast({
        title: 'No Active Section',
        description: 'Please select a section to paste into',
        variant: 'destructive',
      });
      return;
    }

    setSections(prevSections => {
      const targetSection = prevSections.find(s => s.id === activeSectionId);
      if (!targetSection) return prevSections;

      // Paste all copied fields
      const newFieldPositions: Record<string, FieldPosition> = { ...targetSection.fieldPositions };

      copiedFields.forEach((copiedField) => {
        // Generate unique field key
        let fieldKey = copiedField.fieldKey;
        
        // Check if field already exists - if so, create a unique ID with a counter
        const existingFieldKeys = Object.keys(targetSection.fieldPositions);
        const matchingKeys = existingFieldKeys.filter(key => {
          const baseId = getBaseFieldId(key);
          return baseId === copiedField.fieldKey;
        });
        
        if (matchingKeys.length > 0) {
          // Find the highest counter number
          const counters = matchingKeys
            .map(key => {
              if (key === copiedField.fieldKey) return 0; // Original field has no counter
              const numMatch = key.match(/-(\d+)$/);
              return numMatch ? parseInt(numMatch[1], 10) : 0;
            })
            .filter(num => !isNaN(num));
          
          const counter = counters.length > 0 ? Math.max(...counters) + 1 : 1;
          fieldKey = `${copiedField.fieldKey}-${counter}`;
        }

        // Calculate Y position - place below existing fields or use original position
        const existingFields = Object.values(targetSection.fieldPositions);
        const maxY = existingFields.length > 0 
          ? Math.max(...existingFields.map(f => f.y || 0)) 
          : 0;
        
        // Use original Y position if it fits, otherwise place below existing fields
        const pasteY = copiedField.position.y || maxY + 40;

        // Create new field position with copied styling
        newFieldPositions[fieldKey] = {
          ...copiedField.position,
          x: copiedField.position.x || 50,
          y: pasteY,
        };
      });

      return prevSections.map(section =>
        section.id === activeSectionId
          ? {
              ...section,
              fieldPositions: newFieldPositions,
            }
          : section
      );
    });

    const targetSection = sections.find(s => s.id === activeSectionId);
    toast({
      title: 'Fields Pasted',
      description: `Pasted ${copiedFields.length} field(s) into "${targetSection?.name || 'section'}"`,
    });
  }, [copiedFields, activeSectionId, sections, toast]);

  const handleClearBoard = useCallback(() => {
    // Clear all fields from all sections
    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        fieldPositions: {},
      }))
    );
    
    // Clear selected fields
    setSelectedFields([]);
    
    // Clear copied fields
    setCopiedFields(null);
    
    toast({
      title: 'Board Cleared',
      description: 'All fields have been removed from all sections',
    });
    
    setShowClearDialog(false);
  }, [toast]);

  const handleClearSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Clear fields from the specific section
    setSections(prevSections =>
      prevSections.map(s =>
        s.id === sectionId
          ? { ...s, fieldPositions: {} }
          : s
      )
    );

    // Clear selected fields if they were in this section
    setSelectedFields(prev => prev.filter(f => f.sectionId !== sectionId));

    toast({
      title: 'Section Cleared',
      description: `All fields have been removed from "${section.name}"`,
    });

    setSectionToClear(null);
  }, [sections, toast]);

  // Keyboard shortcuts for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+C (Windows/Linux) or Cmd+C (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Check for Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFields.length > 0) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleFieldDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, selectedFields]);

  // Convert section fields to format expected by FieldPropertiesPanel
  // Show properties for the first selected field (or null if none selected)
  const selectedFieldData = selectedFields.length > 0 ? (() => {
    const firstSelected = selectedFields[0];
    const section = sections.find(s => s.id === firstSelected.sectionId);
    if (!section) return null;

    const position = section.fieldPositions[firstSelected.fieldId];
    if (!position) return null;

    const baseFieldId = getBaseFieldId(firstSelected.fieldId);
    const fieldDef = CHEQUE_FIELD_DEFINITIONS.find(f => f.id === baseFieldId);
    
    return {
      id: firstSelected.fieldId,
      fieldKey: baseFieldId, // Use base ID for data mapping
      label: fieldDef?.label || baseFieldId,
      fieldType: baseFieldId,
      position: position,
      value: `{${fieldDef?.label || baseFieldId}}`,
      isRequired: false, // No fields are required - users can customize freely
    };
  })() : null;

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

  if (templateError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-600 mb-4">
            <XCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Error Loading Template</h2>
          <p className="text-gray-600">
            {(templateError as any)?.message || 'Failed to load template. Please try again.'}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => setLocation('/document-templates')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
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
              <h1 className="text-3xl font-bold">Document Template Editor</h1>
              <p className="text-gray-600">
                Design your {currentDocType || 'document'} template with drag-and-drop
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopy}
              disabled={selectedFields.length === 0}
              title={`Copy ${selectedFields.length || 0} selected field(s) (Ctrl+C / Cmd+C)`}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy {selectedFields.length > 0 ? `(${selectedFields.length})` : ''}
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePaste}
              disabled={!copiedFields || copiedFields.length === 0 || !activeSectionId}
              title="Paste field into active section (Ctrl+V / Cmd+V)"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Paste
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGroupFields}
              disabled={selectedFields.length < 2}
              title="Group selected fields (Ctrl+G / Cmd+G)"
            >
              <Layers className="h-4 w-4 mr-2" />
              Group
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUngroupFields}
              disabled={selectedFields.length === 0}
              title="Ungroup selected fields"
            >
              <Ungroup className="h-4 w-4 mr-2" />
              Ungroup
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setPreviewOpen(true)}
              disabled={sections.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowClearDialog(true)}
              disabled={sections.length === 0 || sections.every(s => Object.keys(s.fieldPositions).length === 0)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Clear all fields from all sections"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Board
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
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
              availableFields={currentDocType === 'invoice' ? INVOICE_FIELD_DEFINITIONS : CHEQUE_FIELD_DEFINITIONS}
              onFieldAdd={handleFieldAdd}
            />
          </div>

          <div className="col-span-7 space-y-6">
            <div className="flex items-center gap-2 p-2 bg-white rounded border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-gray-300 mx-2" />
              <Button
                variant={showGrid ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3x3 className="h-4 w-4" />
                Grid {snapToGrid ? 'Snap On' : 'Off'}
              </Button>
            </div>

            {sections.map((section) => {
              const sectionFields: SectionField[] = Object.entries(section.fieldPositions).map(
                ([key, position]) => {
                  const baseFieldId = getBaseFieldId(key);
                  const availableFields = currentDocType === 'invoice' ? INVOICE_FIELD_DEFINITIONS : CHEQUE_FIELD_DEFINITIONS;
                  const fieldDef = availableFields.find(f => f.id === baseFieldId);
                  // For static text fields, use the textContent; otherwise use placeholder
                  const pos = position as FieldPosition & { fieldType?: string; textContent?: string };
                  const isStatic = pos.fieldType === 'static' || fieldDef?.isStatic;
                  const value = isStatic && pos.textContent 
                    ? pos.textContent 
                    : `{${fieldDef?.label || baseFieldId}}`;
                  return {
                    id: key,
                    fieldKey: baseFieldId, // Use base ID for data mapping
                    label: fieldDef?.label || baseFieldId,
                    position: position as any, // Type compatibility - both interfaces are compatible
                    value: value,
                  };
                }
              );

              const isActiveSection = activeSectionId === section.id;

              return (
                <div key={section.id} className="relative">
                  <div 
                    className={`absolute -left-2 top-0 bottom-0 w-1 rounded transition-colors cursor-pointer ${
                      isActiveSection ? 'bg-blue-500' : 'bg-transparent hover:bg-gray-300'
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                    title={`Click to make "${section.name}" the active section`}
                  />
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAllFromSection(section.id);
                      }}
                      title={`Copy all fields from "${section.name}"`}
                      className="h-7 text-xs"
                      disabled={Object.keys(section.fieldPositions).length === 0}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSectionToClear({ id: section.id, name: section.name });
                      }}
                      title={`Clear all fields from "${section.name}"`}
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={Object.keys(section.fieldPositions).length === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div 
                    className={`border-2 rounded-lg p-2 transition-colors ${
                      isActiveSection ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                <SectionCanvas
                  sectionId={section.id}
                  sectionName={section.name}
                  heightInches={section.heightInches}
                  widthInches={8.5}
                  fields={sectionFields}
                      selectedFields={
                        selectedFields
                          .filter(f => f.sectionId === section.id)
                          .map(f => f.fieldId)
                      }
                      onFieldSelect={(fieldId, sectionId, multiSelect) => {
                        handleFieldSelect(fieldId, sectionId, multiSelect);
                        // Set section as active when a field is selected
                        if (fieldId) {
                        setActiveSectionId(sectionId);
                        }
                      }}
                  onFieldMove={handleFieldMove}
                      onFieldResize={handleFieldResize}
                      onFieldDelete={handleFieldDelete}
                  showGrid={showGrid}
                  gridSize={10}
                  snapToGrid={snapToGrid}
                  zoom={zoom}
                  isFieldInGroup={isFieldInGroup}
                />
                  </div>
                  {isActiveSection && (
                    <div className="mt-2 text-xs text-blue-600 font-medium text-center">
                      ✓ Active Section - Fields will be added here
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="col-span-3">
            <FieldPropertiesPanel
              selectedField={selectedFieldData}
              onFieldUpdate={handleFieldUpdate}
              onFieldDelete={handleFieldDelete}
            />
          </div>
        </div>

        {/* Clear Board Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Fields?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove all fields from all sections? This action cannot be undone. 
                You will need to add fields back manually.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearBoard}
                className="bg-red-600 hover:bg-red-700"
              >
                Clear All Fields
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Section Confirmation Dialog */}
        <AlertDialog open={!!sectionToClear} onOpenChange={(open) => !open && setSectionToClear(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Section Fields?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove all fields from "{sectionToClear?.name}"? This action cannot be undone. 
                You will need to add fields back manually.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => sectionToClear && handleClearSection(sectionToClear.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Clear Section
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Modal */}
        {(currentDocType === 'cheque' || currentDocType === 'invoice') && (
          <ChequePreviewModal
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            fields={(() => {
              // Convert all sections' fields to TemplateField format with proper Y offsets
              const allFields: TemplateField[] = [];
              let currentYOffset = 0;
              
              sections.forEach(section => {
                const sectionHeightPoints = (section.heightInches || 0) * 72; // Convert to points
                
                Object.entries(section.fieldPositions).forEach(([key, position]) => {
                  const baseFieldId = getBaseFieldId(key);
                  const availableFields = currentDocType === 'invoice' ? INVOICE_FIELD_DEFINITIONS : CHEQUE_FIELD_DEFINITIONS;
                  const fieldDef = availableFields.find(f => f.id === baseFieldId);
                  const pos = position as FieldPosition & { fieldType?: string; textContent?: string };
                  const isStatic = pos.fieldType === 'static' || fieldDef?.isStatic;
                  const value = isStatic && pos.textContent 
                    ? pos.textContent 
                    : `{${fieldDef?.label || baseFieldId}}`;
                  allFields.push({
                    id: `${section.id}-${key}`, // Unique ID per section
                    fieldKey: baseFieldId, // Use base ID for data mapping in preview/PDF
                    label: fieldDef?.label || baseFieldId,
                    fieldType: baseFieldId,
                    position: {
                      ...position,
                      y: position.y + currentYOffset, // Add section Y offset
                    },
                    value: value,
                    isRequired: false, // No fields are required - users can customize freely
                  });
                });
                
                // Move to next section
                currentYOffset += sectionHeightPoints;
              });
              
              return allFields;
            })()}
            width={612} // 8.5 inches at 72 DPI
            height={(() => {
              // Calculate total height from sections
              const totalHeightInches = sections.reduce((sum, section) => sum + (section.heightInches || 0), 0);
              return totalHeightInches * 72; // Convert to points
            })()}
            templateName={templateName}
            sections={sections.map(s => ({ id: s.id, name: s.name, heightInches: s.heightInches || 0 }))}
            documentType={currentDocType}
          />
        )}
      </div>
    </div>
  );
}
