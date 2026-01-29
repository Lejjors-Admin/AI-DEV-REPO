/**
 * Field Properties Panel - Edit Selected Field Settings
 * Allows users to customize field appearance and behavior
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { TemplateField } from './TemplateCanvas';

interface FieldPropertiesPanelProps {
  selectedField: TemplateField | null;
  onFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
  onFieldDelete: (fieldId: string) => void;
}

export const FieldPropertiesPanel: React.FC<FieldPropertiesPanelProps> = ({
  selectedField,
  onFieldUpdate,
  onFieldDelete,
}) => {
  if (!selectedField) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Field Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Select a field to edit its properties
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Field Properties</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onFieldDelete(selectedField.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
        <p className="text-sm text-gray-600">{selectedField.label}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Position</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">X (points)</Label>
              <Input
                type="number"
                value={selectedField.position.x}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      x: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Y (points)</Label>
              <Input
                type="number"
                value={selectedField.position.y}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      y: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">Width (points)</Label>
              <Input
                type="number"
                value={selectedField.position.width || 100}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      width: parseFloat(e.target.value) || 100,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Height (points)</Label>
              <Input
                type="number"
                value={selectedField.position.height || 30}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      height: parseFloat(e.target.value) || 30,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Font Size</Label>
          <Input
            type="number"
            value={selectedField.position.fontSize || 12}
            onChange={(e) =>
              onFieldUpdate(selectedField.id, {
                position: {
                  ...selectedField.position,
                  fontSize: parseFloat(e.target.value) || 12,
                },
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select
            value={selectedField.position.fontFamily || 'Helvetica'}
            onValueChange={(value) =>
              onFieldUpdate(selectedField.id, {
                position: {
                  ...selectedField.position,
                  fontFamily: value,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times-Roman">Times New Roman</SelectItem>
              <SelectItem value="Courier">Courier</SelectItem>
              <SelectItem value="Arial">Arial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Text Alignment</Label>
          <Select
            value={selectedField.position.alignment || 'left'}
            onValueChange={(value: 'left' | 'center' | 'right') =>
              onFieldUpdate(selectedField.id, {
                position: {
                  ...selectedField.position,
                  alignment: value,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedField.position.format && (
          <div className="space-y-2">
            <Label>Format</Label>
            <Input
              value={selectedField.position.format}
              disabled
              className="bg-gray-50"
            />
          </div>
        )}

        {/* Static Text Content Editor */}
        {selectedField.position.fieldType === 'static' && (
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Input
              type="text"
              value={selectedField.position.textContent || ''}
              onChange={(e) =>
                onFieldUpdate(selectedField.id, {
                  position: {
                    ...selectedField.position,
                    textContent: e.target.value,
                  },
                })
              }
              placeholder="Enter static text (e.g., 'PAY TO THE ORDER OF')"
            />
            <p className="text-xs text-gray-500">
              This text will appear as-is on the cheque
            </p>
          </div>
        )}

        {/* Text Field Visual Options (underline, border) */}
        {(!selectedField.position.fieldType || selectedField.position.fieldType === 'text' || selectedField.position.fieldType === 'static') && (
          <>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="underline"
                  checked={selectedField.position.underline || false}
                  onChange={(e) =>
                    onFieldUpdate(selectedField.id, {
                      position: {
                        ...selectedField.position,
                        underline: e.target.checked,
                      },
                    })
                  }
                  className="rounded"
                />
                <Label htmlFor="underline" className="cursor-pointer">
                  Underline
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="border"
                  checked={selectedField.position.border || false}
                  onChange={(e) =>
                    onFieldUpdate(selectedField.id, {
                      position: {
                        ...selectedField.position,
                        border: e.target.checked,
                      },
                    })
                  }
                  className="rounded"
                />
                <Label htmlFor="border" className="cursor-pointer">
                  Border / Box
                </Label>
              </div>
            </div>

            {selectedField.position.border && (
              <div className="space-y-2">
                <Label>Border Width (points)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={selectedField.position.borderWidth || 0.5}
                  onChange={(e) =>
                    onFieldUpdate(selectedField.id, {
                      position: {
                        ...selectedField.position,
                        borderWidth: parseFloat(e.target.value) || 0.5,
                      },
                    })
                  }
                />
              </div>
            )}
          </>
        )}

        {/* Visual Element Properties (for lines, boxes) */}
        {(selectedField.position.fieldType === 'line' || 
          selectedField.position.fieldType === 'box' || 
          selectedField.position.fieldType === 'micr') && (
          <>
            <div className="space-y-2">
              <Label>Line Width (points)</Label>
              <Input
                type="number"
                step="0.1"
                value={selectedField.position.lineWidth || 0.5}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      lineWidth: parseFloat(e.target.value) || 0.5,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Line Color</Label>
              <Input
                type="color"
                value={selectedField.position.lineColor || '#000000'}
                onChange={(e) =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      lineColor: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Line Style</Label>
              <Select
                value={selectedField.position.lineStyle || 'solid'}
                onValueChange={(value: 'solid' | 'dashed' | 'dotted') =>
                  onFieldUpdate(selectedField.id, {
                    position: {
                      ...selectedField.position,
                      lineStyle: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> 72 points = 1 inch. Standard cheque is 8.5" × 3.5" (612 × 252 points)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
