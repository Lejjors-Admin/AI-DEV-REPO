/**
 * Cheque Preview Modal
 * Shows a live preview of the cheque template with sample data
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TemplateField } from './TemplateCanvas';

interface ChequePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: TemplateField[];
  width: number;
  height: number;
  templateName: string;
  sections?: Array<{ id: string; name: string; heightInches: number }>; // Optional: for section separators
  documentType?: string; // Optional: 'cheque' or 'invoice'
}

// Helper function to format date as DD/MM/YYYY
const formatChequeDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Sample data for preview - matches typical cheque format
const CHEQUE_SAMPLE_DATA: Record<string, string> = {
  date: formatChequeDate(new Date()),
  payeeName: 'Granella Investments Ltd.',
  amountNumeric: '$5,877.14',
  amountWords: '*FIVE THOUSAND EIGHT HUNDRED SEVENTY-SEVEN AND 14 / 100*',
  memo: 'Invoice Payment',
  signature: '',
  companyName: 'Your Company Name',
  companyAddress: '123 Main Street, Toronto, ON M1A 2B3',
  bankName: 'TD Canada Trust',
  transitNumber: '12345',
  accountNumber: '6789012',
  chequeNumber: '0000004952',
  billId: '1125',
  subtotal: '$5,877.14',
  taxAmount: '$0.00',
  totalAmount: '$5,877.14',
  stubHours: '40.00',
  stubRate: '$25.00',
  stubGrossPay: '$1,000.00',
  stubDeductions: '$200.00',
  stubNetPay: '$800.00',
  stubYtdGross: '$12,000.00',
  stubYtdDeductions: '$2,400.00',
  stubYtdNet: '$9,600.00',
};

// Sample data for invoice preview
const INVOICE_SAMPLE_DATA: Record<string, string> = {
  logo: '', // Image placeholder
  companyName: 'Your Company Name',
  companyAddress: '123 Main Street, Toronto, ON M1A 2B3',
  companyPhone: '+1 (416) 555-1234',
  businessNumber: '123456789 RT0001',
  invoiceTitle: 'INVOICE',
  invoiceNumber: 'INV-2024-001',
  invoiceDate: formatChequeDate(new Date()),
  poNumber: 'PO-12345',
  dueDate: formatChequeDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
  servicesProvidedToLabel: 'Services Provided to:',
  clientName: 'ABC Corporation',
  clientAddress: '456 Business Ave, Suite 200, Toronto, ON M2B 3C4',
  itemsTable: '', // Table will be rendered separately
  itemDescription: 'Professional Services',
  itemSubDescription: 'Consulting and advisory services for Q1 2024',
  itemQuantity: '10',
  itemRate: '$150.00',
  itemAmount: '$1,500.00',
  subtotal: '$1,500.00',
  netInvoice: '$1,500.00',
  taxLabel: 'HST',
  taxAmount: '$195.00',
  totalAmount: '$1,695.00',
  paymentTerms: 'Net 30',
  notes: 'Thank you for your business!',
};

export const ChequePreviewModal: React.FC<ChequePreviewModalProps> = ({
  open,
  onOpenChange,
  fields,
  width,
  height,
  templateName,
  sections,
  documentType = 'cheque',
}) => {
  const SAMPLE_DATA = documentType === 'invoice' ? INVOICE_SAMPLE_DATA : CHEQUE_SAMPLE_DATA;
  const scale = 0.8; // Scale down to fit in modal
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  const formatValue = (field: TemplateField): string => {
    // For static text fields, return the textContent directly
    if (field.position.fieldType === 'static' && field.position.textContent) {
      return field.position.textContent;
    }
    
    const baseValue = SAMPLE_DATA[field.fieldKey] || field.label;
    
    // Apply format if specified
    if (field.position.format === 'currency' && !baseValue.startsWith('$')) {
      const numValue = parseFloat(baseValue.replace(/[^0-9.]/g, ''));
      if (!isNaN(numValue)) {
        return `$${numValue.toFixed(2)}`;
      }
    }
    
    return baseValue;
  };

  // Calculate section separator positions if sections are provided
  const sectionSeparators: Array<{ y: number }> = [];
  if (sections && sections.length > 1) {
    let currentY = 0;
    for (let i = 1; i < sections.length; i++) {
      currentY += sections[i - 1].heightInches * 72; // Convert to points
      sectionSeparators.push({ y: currentY });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Preview: {templateName}</DialogTitle>
          <DialogDescription>
            This is how your {documentType === 'invoice' ? 'invoice' : 'cheque'} will appear when printed with actual data
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-6">
          <div
            className="relative border-2 border-gray-300 bg-white shadow-lg"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            {/* Render section separator lines */}
            {sectionSeparators.map((separator, index) => (
              <div
                key={`separator-${index}`}
                className="absolute left-0 right-0 border-t border-gray-400"
                style={{
                  top: `${separator.y * scale}px`,
                  borderTopWidth: '1px',
                  zIndex: 1,
                }}
              />
            ))}

            {/* Render visual elements first (lines, boxes) */}
            {fields
              .filter(field => field.position.fieldType === 'line' || 
                              field.position.fieldType === 'box' || 
                              field.position.fieldType === 'micr' ||
                              field.id === 'horizontalLine' || 
                              field.id === 'verticalLine')
              .map((field) => {
                const isHorizontal = field.position.fieldType === 'line' || field.id === 'horizontalLine' || 
                                    (field.position.width && field.position.width > (field.position.height || 1));
                const isVertical = field.id === 'verticalLine' || 
                                  (field.position.height && field.position.height > (field.position.width || 1));
                const isBox = field.position.fieldType === 'box';
                const isMicr = field.position.fieldType === 'micr';
                
                return (
                  <div
                    key={field.id}
                    className="absolute"
                    style={{
                      left: `${field.position.x * scale}px`,
                      top: `${field.position.y * scale}px`,
                      width: field.position.width ? `${field.position.width * scale}px` : (isVertical ? '1px' : '100px'),
                      height: field.position.height ? `${field.position.height * scale}px` : (isHorizontal ? '1px' : '100px'),
                    }}
                  >
                    {isHorizontal && (
                      <div 
                        className="w-full border-t border-black"
                        style={{
                          borderTopWidth: `${(field.position.lineWidth || 0.5) * scale}px`,
                          borderTopColor: field.position.lineColor || '#000000',
                          borderTopStyle: field.position.lineStyle === 'dashed' ? 'dashed' : 
                                         field.position.lineStyle === 'dotted' ? 'dotted' : 'solid',
                          marginTop: `${((field.position.height || 1) / 2) * scale}px`,
                        }}
                      />
                    )}
                    {isVertical && (
                      <div 
                        className="h-full border-l border-black"
                        style={{
                          borderLeftWidth: `${(field.position.lineWidth || 0.5) * scale}px`,
                          borderLeftColor: field.position.lineColor || '#000000',
                          borderLeftStyle: field.position.lineStyle === 'dashed' ? 'dashed' : 
                                          field.position.lineStyle === 'dotted' ? 'dotted' : 'solid',
                          marginLeft: `${((field.position.width || 1) / 2) * scale}px`,
                        }}
                      />
                    )}
                    {isBox && (
                      <div 
                        className="w-full h-full border border-black"
                        style={{
                          borderWidth: `${(field.position.lineWidth || 0.5) * scale}px`,
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
                          borderTopWidth: `${(field.position.lineWidth || 1) * scale}px`,
                          marginTop: `${((field.position.height || 15) / 2) * scale}px`,
                          fontSize: `${8 * scale}px`,
                          color: field.position.lineColor || '#000000',
                        }}
                      >
                        ⑆ ⑉ ⑈
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Render text fields with sample data */}
            {fields
              .filter(field => !field.position.fieldType || 
                              (field.position.fieldType !== 'line' && 
                               field.position.fieldType !== 'box' && 
                               field.position.fieldType !== 'micr' &&
                               field.id !== 'horizontalLine' && 
                               field.id !== 'verticalLine'))
              .map((field) => (
                <div
                  key={field.id}
                  className="absolute"
                  style={{
                    left: `${field.position.x * scale}px`,
                    top: `${field.position.y * scale}px`,
                    width: field.position.width ? `${field.position.width * scale}px` : 'auto',
                    height: field.position.height ? `${field.position.height * scale}px` : 'auto',
                    fontSize: `${(field.position.fontSize || 12) * scale}px`,
                    fontFamily: field.position.fontFamily || 'Helvetica, Arial, sans-serif',
                    textAlign: field.position.alignment || 'left',
                    overflow: 'hidden',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    border: field.position.border ? `${(field.position.borderWidth || 0.5) * scale}px solid #000000` : 'none',
                    padding: field.position.border ? `${2 * scale}px` : '0',
                  }}
                >
                  {formatValue(field)}
                  {/* Underline - positioned below text */}
                  {field.position.underline && (
                    <div 
                      className="absolute border-b border-black"
                      style={{
                        left: '0',
                        right: '0',
                        bottom: `${-4 * scale}px`,
                        borderBottomWidth: `${0.5 * scale}px`,
                        height: `${0.5 * scale}px`,
                      }}
                    />
                  )}
                </div>
              ))}

            {/* MICR line decoration at bottom - only show if there's a MICR field or it's the last section */}
            {fields.some(f => f.position.fieldType === 'micr' || f.id === 'micrLine') && (
              <div 
                className="absolute text-xs text-gray-600 font-mono"
                style={{
                  bottom: `${8 * scale}px`,
                  left: `${40 * scale}px`,
                  fontSize: `${8 * scale}px`,
                  letterSpacing: `${1 * scale}px`,
                }}
              >
                ⑆ {SAMPLE_DATA.transitNumber}⑉001⑆ {SAMPLE_DATA.accountNumber}⑈ {SAMPLE_DATA.chequeNumber} ⑈
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 text-center">
          Note: This preview uses sample data. Actual {documentType === 'invoice' ? 'invoices' : 'cheques'} will use real transaction data.
        </div>
      </DialogContent>
    </Dialog>
  );
};
