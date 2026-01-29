/**
 * Visual Template Canvas - Drag & Drop Field Editor
 * Provides a WYSIWYG canvas for positioning template fields
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Move, Grid3x3 } from 'lucide-react';

export interface FieldPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  format?: string;
  fieldType?: 'text' | 'line' | 'box' | 'micr' | 'static';
  lineWidth?: number;
  lineColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  underline?: boolean;
  border?: boolean;
  borderWidth?: number;
  textContent?: string; // Static text content (for static text fields)
}

export interface TemplateField {
  id: string;                    // Unique ID for React rendering
  fieldKey: string;              // Canonical backend key (e.g., "date", "payeeName")
  label: string;
  fieldType: string;
  position: FieldPosition;
  value?: string;
  isRequired?: boolean;          // Required fields cannot be deleted
}

interface TemplateCanvasProps {
  width: number;
  height: number;
  fields: TemplateField[];
  selectedField: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldMove: (fieldId: string, x: number, y: number) => void;
  onFieldResize: (fieldId: string, width: number, height: number) => void;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

export const TemplateCanvas: React.FC<TemplateCanvasProps> = ({
  width,
  height,
  fields,
  selectedField,
  onFieldSelect,
  onFieldMove,
  onFieldResize,
  showGrid = true,
  gridSize = 10,
  snapToGrid = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const snapToGridPoint = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    setDraggedField(fieldId);
    setIsDragging(true);
    setDragStartPos({
      x: e.clientX - field.position.x * zoom,
      y: e.clientY - field.position.y * zoom,
    });
    onFieldSelect(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedField) return;

    const field = fields.find(f => f.id === draggedField);
    if (!field) return;

    const newX = snapToGridPoint((e.clientX - dragStartPos.x) / zoom);
    const newY = snapToGridPoint((e.clientY - dragStartPos.y) / zoom);

    onFieldMove(draggedField, Math.max(0, newX), Math.max(0, newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedField(null);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, fieldId: string, handle: string) => {
    e.stopPropagation();
    setDraggedField(fieldId);
    setIsResizing(true);
    setResizeHandle(handle);
    onFieldSelect(fieldId);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onFieldSelect(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
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
        >
          <Grid3x3 className="h-4 w-4" />
          Grid {snapToGrid ? 'Snap On' : 'Off'}
        </Button>
      </div>

      <Card className="overflow-auto border-2 border-gray-300">
        <div
          ref={canvasRef}
          className="relative bg-white"
          style={{
            width: width * zoom,
            height: height * zoom,
            backgroundImage: showGrid
              ? `repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent ${gridSize * zoom}px),
                 repeating-linear-gradient(90deg, #e5e7eb 0px, #e5e7eb 1px, transparent 1px, transparent ${gridSize * zoom}px)`
              : 'none',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        >
          {fields.map((field) => (
            <div
              key={field.id}
              className={`absolute border-2 cursor-move select-none ${
                selectedField === field.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-400 bg-white hover:border-gray-600'
              }`}
              style={{
                left: field.position.x * zoom,
                top: field.position.y * zoom,
                width: (field.position.width || 100) * zoom,
                height: (field.position.height || 30) * zoom,
                fontSize: (field.position.fontSize || 12) * zoom,
                fontFamily: field.position.fontFamily || 'Helvetica',
                textAlign: field.position.alignment || 'left',
                padding: 4 * zoom,
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseDown={(e) => handleMouseDown(e, field.id)}
            >
              <span className="truncate text-gray-700">
                {field.value || `{${field.label}}`}
              </span>

              {selectedField === field.id && (
                <>
                  <div
                    className="absolute top-0 right-0 w-3 h-3 bg-blue-500 cursor-nw-resize"
                    style={{ transform: 'translate(50%, -50%)' }}
                    onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'se')}
                  />
                  <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded whitespace-nowrap">
                    {field.label}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
