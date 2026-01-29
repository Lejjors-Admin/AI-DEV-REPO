/**
 * Section Canvas - Multi-Section Document Template Editor
 * Supports drag-and-drop field positioning on individual sections (e.g., cheque body, stubs)
 */

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ruler, X } from 'lucide-react';

export interface FieldPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  format?: string;
  fieldType?: 'text' | 'line' | 'box' | 'micr' | 'static' | 'image' | 'table';
  lineWidth?: number;
  lineColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  underline?: boolean;
  border?: boolean;
  borderWidth?: number;
}

export interface SectionField {
  id: string;                    // Unique ID for React rendering
  fieldKey: string;              // Canonical backend key (e.g., "date", "payeeName")
  label: string;
  position: FieldPosition;
  value?: string;
}

interface SectionCanvasProps {
  sectionId: string;
  sectionName: string;
  heightInches: number;
  widthInches?: number;          // Default 8.5" for letter size
  fields: SectionField[];
  selectedFields: string[];     // Array of selected field IDs
  onFieldSelect: (fieldId: string | null, sectionId: string, multiSelect?: boolean) => void;
  onFieldMove: (fieldId: string, sectionId: string, x: number, y: number) => void;
  onFieldResize?: (fieldId: string, sectionId: string, width: number, height: number, x?: number, y?: number) => void;
  onFieldDelete?: (fieldId: string) => void;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  zoom?: number;
  isFieldInGroup?: (fieldId: string, sectionId: string) => boolean; // Optional function to check if field is in a group
}

export const SectionCanvas: React.FC<SectionCanvasProps> = ({
  sectionId,
  sectionName,
  heightInches,
  widthInches = 8.5,
  fields,
  selectedFields = [],
  onFieldSelect,
  onFieldMove,
  onFieldResize,
  onFieldDelete,
  showGrid = true,
  gridSize = 10,
  snapToGrid = true,
  zoom = 1,
  isFieldInGroup,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0, width: 0, height: 0, fieldX: 0, fieldY: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Convert inches to pixels at 72 DPI
  const DPI = 72;
  const width = widthInches * DPI;
  const height = heightInches * DPI;

  const snapToGridPoint = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const handleFieldClick = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    // Only handle click if we didn't drag (check if mouse moved significantly)
    // This is a fallback - selection should already be handled in mousedown
    if (!hasMoved && !isDragging) {
      const multiSelect = e.ctrlKey || e.metaKey;
      onFieldSelect(fieldId, sectionId, multiSelect);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    // Check if Ctrl/Cmd key is pressed for multi-select
    const multiSelect = e.ctrlKey || e.metaKey;
    
    // Track mouse down position to detect movement
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    
    // Select field immediately (this should happen right away)
    onFieldSelect(fieldId, sectionId, multiSelect);
    
    // If Ctrl/Cmd is held, don't start dragging (allow multi-select without dragging)
    if (multiSelect) {
      // Don't start dragging when multi-selecting
      return;
    }

    // Start dragging only if not multi-selecting
    setDraggedField(fieldId);
    setIsDragging(true);
    setDragStartPos({
      x: e.clientX - field.position.x * zoom,
      y: e.clientY - field.position.y * zoom,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, fieldId: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const field = fields.find(f => f.id === fieldId);
    if (!field || !onFieldResize) return;

    setDraggedField(fieldId);
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStartPos({
      x: e.clientX,
      y: e.clientY,
      width: field.position.width || 100,
      height: field.position.height || 30,
      fieldX: field.position.x,
      fieldY: field.position.y,
    });
    // Don't change selection when resizing
    // onFieldSelect(fieldId, sectionId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Track if mouse has moved significantly (more than 5 pixels)
    if (mouseDownPos) {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 5 || dy > 5) {
        setHasMoved(true);
      }
    }

    if (isResizing && draggedField && resizeHandle && onFieldResize) {
      const field = fields.find(f => f.id === draggedField);
      if (!field) return;

      const deltaX = (e.clientX - resizeStartPos.x) / zoom;
      const deltaY = (e.clientY - resizeStartPos.y) / zoom;

      let newWidth = resizeStartPos.width;
      let newHeight = resizeStartPos.height;
      let newX = resizeStartPos.fieldX;
      let newY = resizeStartPos.fieldY;

      // Handle different resize handles
      if (resizeHandle.includes('e')) { // East (right)
        newWidth = snapToGridPoint(resizeStartPos.width + deltaX);
      }
      if (resizeHandle.includes('w')) { // West (left)
        newWidth = snapToGridPoint(resizeStartPos.width - deltaX);
        newX = snapToGridPoint(resizeStartPos.fieldX + deltaX);
      }
      if (resizeHandle.includes('s')) { // South (bottom)
        newHeight = snapToGridPoint(resizeStartPos.height + deltaY);
      }
      if (resizeHandle.includes('n')) { // North (top)
        newHeight = snapToGridPoint(resizeStartPos.height - deltaY);
        newY = snapToGridPoint(resizeStartPos.fieldY + deltaY);
      }

      // Ensure minimum size
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);

      // Ensure position doesn't go negative
      if (newX < 0) {
        newWidth += newX;
        newX = 0;
      }
      if (newY < 0) {
        newHeight += newY;
        newY = 0;
      }

      onFieldResize(
        draggedField,
        sectionId,
        newWidth,
        newHeight,
        resizeHandle.includes('w') || resizeHandle.includes('n') ? newX : undefined,
        resizeHandle.includes('n') ? newY : undefined
      );
      return;
    }

    if (!isDragging || !draggedField) return;

    const newX = snapToGridPoint((e.clientX - dragStartPos.x) / zoom);
    const newY = snapToGridPoint((e.clientY - dragStartPos.y) / zoom);

    onFieldMove(draggedField, sectionId, Math.max(0, newX), Math.max(0, newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedField(null);
    setResizeHandle(null);
    // Reset movement tracking after a short delay to allow click handler to check
    setTimeout(() => {
      setHasMoved(false);
      setMouseDownPos(null);
    }, 100);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.currentTarget === canvasRef.current) {
      onFieldSelect(null, sectionId);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{sectionName}</h3>
          <Badge variant="outline" className="text-xs">
            <Ruler className="h-3 w-3 mr-1" />
            {widthInches}" × {heightInches}"
          </Badge>
        </div>
        <div className="text-xs text-gray-500">
          {fields.length} field{fields.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Card className="overflow-hidden border-2 border-gray-300">
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
            cursor: isDragging ? 'grabbing' : isResizing ? 'grabbing' : 'default',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        >
          {fields.map((field) => {
            const isVisualElement = field.position.fieldType === 'line' || 
                                   field.position.fieldType === 'box' || 
                                   field.position.fieldType === 'micr' ||
                                   field.position.fieldType === 'image' ||
                                   field.position.fieldType === 'table' ||
                                   field.id === 'horizontalLine' || 
                                   field.id === 'verticalLine';
            
            if (isVisualElement) {
              // Render visual elements (lines, boxes, images, tables)
              const isHorizontal = field.position.fieldType === 'line' || field.id === 'horizontalLine' || 
                                  (field.position.width && field.position.width > (field.position.height || 1));
              const isVertical = field.id === 'verticalLine' || 
                                (field.position.height && field.position.height > (field.position.width || 1));
              const isBox = field.position.fieldType === 'box';
              const isMicr = field.position.fieldType === 'micr';
              const isImage = field.position.fieldType === 'image';
              const isTable = field.position.fieldType === 'table';
              
              return (
                <div
                  key={field.id}
                  className={`absolute cursor-move select-none transition-colors ${
                    selectedFields.includes(field.id)
                      ? 'ring-2 ring-blue-500'
                      : 'ring-1 ring-gray-300 hover:ring-gray-500'
                  }`}
                  style={{
                    left: field.position.x * zoom,
                    top: field.position.y * zoom,
                    width: (field.position.width || (isVertical ? 1 : 100)) * zoom,
                    height: (field.position.height || (isHorizontal ? 1 : 100)) * zoom,
                  }}
                  onClick={(e) => handleFieldClick(e, field.id)}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                >
                  {isHorizontal && (
                    <div 
                      className="w-full border-t-2 border-black"
                      style={{
                        borderTopWidth: `${(field.position.lineWidth || 0.5) * zoom}px`,
                        borderTopColor: field.position.lineColor || '#000000',
                        borderTopStyle: field.position.lineStyle === 'dashed' ? 'dashed' : 
                                       field.position.lineStyle === 'dotted' ? 'dotted' : 'solid',
                        marginTop: `${((field.position.height || 1) / 2) * zoom}px`,
                      }}
                    />
                  )}
                  {isVertical && (
                    <div 
                      className="h-full border-l-2 border-black"
                      style={{
                        borderLeftWidth: `${(field.position.lineWidth || 0.5) * zoom}px`,
                        borderLeftColor: field.position.lineColor || '#000000',
                        borderLeftStyle: field.position.lineStyle === 'dashed' ? 'dashed' : 
                                        field.position.lineStyle === 'dotted' ? 'dotted' : 'solid',
                        marginLeft: `${((field.position.width || 1) / 2) * zoom}px`,
                      }}
                    />
                  )}
                  {isBox && (
                    <div 
                      className="w-full h-full border-2 border-black"
                      style={{
                        borderWidth: `${(field.position.lineWidth || 0.5) * zoom}px`,
                        borderColor: field.position.lineColor || '#000000',
                        borderStyle: field.position.lineStyle === 'dashed' ? 'dashed' : 
                                    field.position.lineStyle === 'dotted' ? 'dotted' : 'solid',
                      }}
                    />
                  )}
                  {isMicr && (
                    <div 
                      className="w-full border-t border-black font-mono text-xs"
                      style={{
                        borderTopWidth: `${(field.position.lineWidth || 1) * zoom}px`,
                        marginTop: `${((field.position.height || 15) / 2) * zoom}px`,
                        fontSize: `${8 * zoom}px`,
                      }}
                    >
                      ⑆ ⑉ ⑈
                    </div>
                  )}
                  {isImage && (
                    <div 
                      className="w-full h-full border-2 border-dashed border-gray-400 bg-gray-50 flex flex-col items-center justify-center"
                      style={{
                        borderWidth: `${1 * zoom}px`,
                      }}
                    >
                      <svg 
                        className="text-gray-400 mb-1" 
                        style={{ width: `${24 * zoom}px`, height: `${24 * zoom}px` }}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                        />
                      </svg>
                      <span className="text-gray-500 text-xs text-center px-1" style={{ fontSize: `${9 * zoom}px` }}>
                        {field.label || 'Image'}
                      </span>
                    </div>
                  )}
                  {isTable && (
                    <div 
                      className="w-full h-full border-2 border-blue-400 bg-blue-50"
                      style={{
                        borderWidth: `${2 * zoom}px`,
                        padding: `${4 * zoom}px`,
                      }}
                    >
                      <div className="text-xs font-semibold text-blue-700 mb-1" style={{ fontSize: `${(field.position.fontSize || 10) * zoom}px` }}>
                        {field.label || 'Items Table'}
                      </div>
                      <div className="text-xs text-blue-600" style={{ fontSize: `${8 * zoom}px` }}>
                        <div className="flex justify-between border-b border-blue-300 pb-1 mb-1">
                          <span>Description</span>
                          <span>Amount</span>
                        </div>
                        <div className="text-gray-500 italic">
                          Line items will appear here...
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedFields.includes(field.id) && (
                    <>
                      <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded whitespace-nowrap z-10">
                        {field.label}
                      </div>
                      {onFieldDelete && (
                        <button
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer z-30 shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFieldDelete(field.id);
                          }}
                          title="Delete field (Delete / Backspace)"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {onFieldResize && (
                        <>
                          {/* Corner handles */}
                          <div
                            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'nw')}
                          />
                          <div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'ne')}
                          />
                          <div
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'sw')}
                          />
                          <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'se')}
                          />
                          {/* Edge handles */}
                          <div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-n-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'n')}
                          />
                          <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-s-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 's')}
                          />
                          <div
                            className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-w-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'w')}
                          />
                          <div
                            className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-e-resize z-20"
                            onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'e')}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            }
            
            // Render text fields
            const isInGroup = isFieldInGroup ? isFieldInGroup(field.id, sectionId) : false;
            return (
              <div
                key={field.id}
                className={`absolute border-2 cursor-move select-none transition-colors ${
                  selectedFields.includes(field.id)
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-400 bg-white hover:border-gray-600'
                } ${isInGroup ? 'ring-2 ring-purple-300 ring-offset-1' : ''}`}
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
                onClick={(e) => handleFieldClick(e, field.id)}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
              >
                <span className="truncate text-gray-700">
                  {field.value || `{${field.label}}`}
                </span>
                
                {/* Underline for text fields */}
                {field.position.underline && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 border-b border-black"
                    style={{
                      borderBottomWidth: '1px',
                      bottom: `${2 * zoom}px`,
                    }}
                  />
                )}
                
                {/* Border for text fields */}
                {field.position.border && (
                  <div 
                    className="absolute inset-0 border-2 border-black pointer-events-none"
                    style={{
                      borderWidth: `${(field.position.borderWidth || 0.5) * zoom}px`,
                    }}
                  />
                )}

                {selectedFields.includes(field.id) && (
                  <>
                    <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded whitespace-nowrap z-10">
                      {field.label}
                    </div>
                    {onFieldDelete && (
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer z-30 shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldDelete(field.id);
                        }}
                        title="Delete field (Delete / Backspace)"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {onFieldResize && (
                      <>
                        {/* Corner handles */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'nw')}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'ne')}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'sw')}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'se')}
                        />
                        {/* Edge handles */}
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-n-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'n')}
                        />
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white cursor-s-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 's')}
                        />
                        <div
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-w-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'w')}
                        />
                        <div
                          className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white cursor-e-resize z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, field.id, 'e')}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
