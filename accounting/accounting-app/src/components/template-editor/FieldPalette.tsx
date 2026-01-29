/**
 * Field Palette - Available Template Fields
 * Drag fields from here onto the canvas
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  DollarSign, 
  Calendar, 
  Hash, 
  AlignLeft,
  Image as ImageIcon,
  User,
  MapPin,
  FileText,
  Minus,
  Square,
  Text
} from 'lucide-react';

export interface FieldDefinition {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  defaultWidth?: number;
  defaultHeight?: number;
  format?: string;
  fieldType?: 'text' | 'line' | 'box' | 'micr' | 'static'; // Type of field element
  isStatic?: boolean; // True for static text fields
}

interface FieldPaletteProps {
  availableFields: FieldDefinition[];
  onFieldAdd: (field: FieldDefinition) => void;
  disabled?: boolean;
}

export const FieldPalette: React.FC<FieldPaletteProps> = ({
  availableFields,
  onFieldAdd,
  disabled = false,
}) => {
  const categories = Array.from(new Set(availableFields.map(f => f.category)));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Field Palette</CardTitle>
        <p className="text-sm text-gray-600">
          Click to add fields to your template
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {availableFields
                .filter((f) => f.category === category)
                .map((field) => (
                  <Button
                    key={field.id}
                    variant="outline"
                    className="justify-start gap-2 h-auto py-3"
                    onClick={() => onFieldAdd(field)}
                    disabled={disabled}
                  >
                    <span className="flex-shrink-0">{field.icon}</span>
                    <span className="text-left">{field.label}</span>
                  </Button>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Common field definitions for cheques
export const CHEQUE_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: 'date',
    label: 'Date',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 120,
    defaultHeight: 30,
    format: 'date',
  },
  {
    id: 'payeeName',
    label: 'Pay to the Order of',
    icon: <User className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 400,
    defaultHeight: 30,
  },
  {
    id: 'amountNumeric',
    label: 'Amount ($)',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 100,
    defaultHeight: 30,
    format: 'currency',
  },
  {
    id: 'amountWords',
    label: 'Amount in Words',
    icon: <AlignLeft className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 450,
    defaultHeight: 30,
  },
  {
    id: 'memo',
    label: 'Memo',
    icon: <FileText className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 350,
    defaultHeight: 30,
  },
  {
    id: 'signature',
    label: 'Signature Line',
    icon: <Type className="h-4 w-4" />,
    category: 'Essential',
    defaultWidth: 120,
    defaultHeight: 30,
  },
  {
    id: 'companyName',
    label: 'Company Name',
    icon: <Type className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 300,
    defaultHeight: 30,
  },
  {
    id: 'companyAddress',
    label: 'Company Address',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 300,
    defaultHeight: 50,
  },
  {
    id: 'chequeNumber',
    label: 'Cheque Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 80,
    defaultHeight: 30,
  },
  {
    id: 'bankName',
    label: 'Bank Name',
    icon: <Type className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 200,
    defaultHeight: 30,
  },
  {
    id: 'transitNumber',
    label: 'Transit Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 100,
    defaultHeight: 30,
  },
  {
    id: 'accountNumber',
    label: 'Account Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Optional',
    defaultWidth: 150,
    defaultHeight: 30,
  },
  // Line Item Fields - For cheque stubs and payment details
  {
    id: 'billId',
    label: 'Bill ID / Reference',
    icon: <Hash className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'text',
  },
  {
    id: 'subtotal',
    label: 'Subtotal (Without Tax)',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 120,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'taxAmount',
    label: 'Tax Amount',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 120,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'totalAmount',
    label: 'Total Amount (With Tax)',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 120,
    defaultHeight: 25,
    format: 'currency',
  },
  // Visual Elements - Lines and Borders
  {
    id: 'horizontalLine',
    label: 'Horizontal Line',
    icon: <Minus className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 400,
    defaultHeight: 1,
    fieldType: 'line',
  },
  {
    id: 'verticalLine',
    label: 'Vertical Line',
    icon: <Minus className="h-4 w-4 rotate-90" />,
    category: 'Visual Elements',
    defaultWidth: 1,
    defaultHeight: 200,
    fieldType: 'line',
  },
  {
    id: 'box',
    label: 'Box / Border',
    icon: <Square className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 200,
    defaultHeight: 100,
    fieldType: 'box',
  },
  {
    id: 'micrLine',
    label: 'MICR Line',
    icon: <Hash className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 500,
    defaultHeight: 15,
    fieldType: 'micr',
  },
  // Static Text Field - For constant labels and text
  {
    id: 'staticText',
    label: 'Static Text',
    icon: <Text className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 200,
    defaultHeight: 30,
    fieldType: 'static',
    isStatic: true,
  },
  // Pay Stub Fields - Available for all cheques (vendor payments and payroll)
  {
    id: 'stubHours',
    label: 'Hours',
    icon: <Hash className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 80,
    defaultHeight: 25,
    format: 'number',
  },
  {
    id: 'stubRate',
    label: 'Rate',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 80,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubGrossPay',
    label: 'Gross Pay',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubDeductions',
    label: 'Deductions',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubNetPay',
    label: 'Net Pay',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubYtdGross',
    label: 'YTD Gross',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubYtdDeductions',
    label: 'YTD Deductions',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
  {
    id: 'stubYtdNet',
    label: 'YTD Net',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Pay Stub',
    defaultWidth: 100,
    defaultHeight: 25,
    format: 'currency',
  },
];

// Invoice field definitions
export const INVOICE_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Header Fields
  {
    id: 'logo',
    label: 'Company Logo',
    icon: <ImageIcon className="h-4 w-4" />,
    category: 'Header',
    defaultWidth: 100,
    defaultHeight: 50,
    fieldType: 'image',
  },
  {
    id: 'companyName',
    label: 'Company Name',
    icon: <Type className="h-4 w-4" />,
    category: 'Header',
    defaultWidth: 200,
    defaultHeight: 30,
    fontSize: 14,
  },
  {
    id: 'companyAddress',
    label: 'Company Address',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Header',
    defaultWidth: 200,
    defaultHeight: 50,
    fontSize: 10,
  },
  {
    id: 'companyPhone',
    label: 'Company Phone',
    icon: <Hash className="h-4 w-4" />,
    category: 'Header',
    defaultWidth: 150,
    defaultHeight: 20,
    fontSize: 10,
  },
  {
    id: 'invoiceTitle',
    label: 'Invoice Title',
    icon: <Text className="h-4 w-4" />,
    category: 'Header',
    defaultWidth: 150,
    defaultHeight: 30,
    fontSize: 24,
    alignment: 'right',
    fieldType: 'static',
    textContent: 'INVOICE',
  },
  
  // Invoice Details
  {
    id: 'invoiceNumber',
    label: 'Invoice Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Invoice Details',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
  },
  {
    id: 'invoiceDate',
    label: 'Invoice Date',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Invoice Details',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
    format: 'date',
  },
  {
    id: 'poNumber',
    label: 'P.O. Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Invoice Details',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
  },
  {
    id: 'businessNumber',
    label: 'Business Number',
    icon: <Hash className="h-4 w-4" />,
    category: 'Invoice Details',
    defaultWidth: 150,
    defaultHeight: 25,
    fontSize: 10,
  },
  {
    id: 'dueDate',
    label: 'Due Date',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Invoice Details',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
    format: 'date',
  },
  
  // Client Information
  {
    id: 'servicesProvidedToLabel',
    label: 'Services Provided to:',
    icon: <Text className="h-4 w-4" />,
    category: 'Client Information',
    defaultWidth: 150,
    defaultHeight: 20,
    fontSize: 10,
    fieldType: 'static',
    textContent: 'Services Provided to:',
  },
  {
    id: 'clientName',
    label: 'Client Name',
    icon: <User className="h-4 w-4" />,
    category: 'Client Information',
    defaultWidth: 200,
    defaultHeight: 30,
    fontSize: 12,
  },
  {
    id: 'clientAddress',
    label: 'Client Address',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Client Information',
    defaultWidth: 200,
    defaultHeight: 50,
    fontSize: 10,
  },
  
  // Line Items
  {
    id: 'itemsTable',
    label: 'Items Table',
    icon: <FileText className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 500,
    defaultHeight: 200,
    fieldType: 'table',
  },
  {
    id: 'itemDescription',
    label: 'Item Description',
    icon: <FileText className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 250,
    defaultHeight: 25,
    fontSize: 10,
  },
  {
    id: 'itemSubDescription',
    label: 'Item Sub Description',
    icon: <FileText className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 250,
    defaultHeight: 25,
    fontSize: 10,
  },
  {
    id: 'itemQuantity',
    label: 'Quantity',
    icon: <Hash className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 80,
    defaultHeight: 25,
    fontSize: 10,
    format: 'number',
  },
  {
    id: 'itemRate',
    label: 'Rate',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 80,
    defaultHeight: 25,
    fontSize: 10,
    format: 'currency',
  },
  {
    id: 'itemAmount',
    label: 'Amount',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Line Items',
    defaultWidth: 100,
    defaultHeight: 25,
    fontSize: 10,
    format: 'currency',
  },
  
  // Summary
  {
    id: 'netInvoice',
    label: 'Net Invoice',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Summary',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
    alignment: 'right',
    format: 'currency',
  },
  {
    id: 'taxLabel',
    label: 'Tax Label (e.g., HST)',
    icon: <Type className="h-4 w-4" />,
    category: 'Summary',
    defaultWidth: 80,
    defaultHeight: 25,
    fontSize: 10,
    alignment: 'right',
    fieldType: 'static',
    textContent: 'HST',
  },
  {
    id: 'taxAmount',
    label: 'Tax Amount',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Summary',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
    alignment: 'right',
    format: 'currency',
  },
  {
    id: 'totalAmount',
    label: 'Total Amount',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Summary',
    defaultWidth: 120,
    defaultHeight: 30,
    fontSize: 14,
    alignment: 'right',
    format: 'currency',
  },
  {
    id: 'subtotal',
    label: 'Subtotal',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Summary',
    defaultWidth: 120,
    defaultHeight: 25,
    fontSize: 10,
    alignment: 'right',
    format: 'currency',
  },
  
  // Additional
  {
    id: 'paymentTerms',
    label: 'Payment Terms',
    icon: <FileText className="h-4 w-4" />,
    category: 'Additional',
    defaultWidth: 200,
    defaultHeight: 30,
    fontSize: 10,
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    category: 'Additional',
    defaultWidth: 300,
    defaultHeight: 50,
    fontSize: 10,
  },
  
  // Visual Elements
  {
    id: 'horizontalLine',
    label: 'Horizontal Line',
    icon: <Minus className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 400,
    defaultHeight: 1,
    fieldType: 'line',
  },
  {
    id: 'verticalLine',
    label: 'Vertical Line',
    icon: <Minus className="h-4 w-4 rotate-90" />,
    category: 'Visual Elements',
    defaultWidth: 1,
    defaultHeight: 200,
    fieldType: 'line',
  },
  {
    id: 'box',
    label: 'Box / Border',
    icon: <Square className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 200,
    defaultHeight: 100,
    fieldType: 'box',
  },
  {
    id: 'staticText',
    label: 'Static Text',
    icon: <Text className="h-4 w-4" />,
    category: 'Visual Elements',
    defaultWidth: 200,
    defaultHeight: 30,
    fieldType: 'static',
    isStatic: true,
  },
];
