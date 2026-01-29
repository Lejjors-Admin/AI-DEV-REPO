/**
 * Invoice Management Component
 * Full-featured invoice system with PDF generation, email, and automatic journal entries
 */

import React, { useState, useLayoutEffect, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountDropdown } from '@/components/ui/AccountDropdown';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FileText, Download, Mail, Eye, Edit, Trash2, DollarSign, Calendar, User, Search, Filter, Paperclip, X, List, Grid, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from '@/lib/api-config';
import { getCurrentDateString, getFutureDateString } from '@/lib/date-utils';
import { parseDateInUserTimezone, dateToUserTimezoneString } from '@/lib/timezone-utils';
import { useTimezoneAwareAPI } from '@/hooks/useTimezoneAwareAPI';
import { getDocumentTemplates, getDefaultDocumentTemplate } from '@/lib/api/document-templates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from 'date-fns';

// Invoice schema - items are handled separately in state
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.number().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  projectId: z.number().nullable().optional(),
  templateId: z.number().nullable().optional(),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  discountPercent: z.number().min(0).max(100, "Discount cannot exceed 100%"),
  discountAmount: z.number().min(0, "Discount cannot be negative"),
  taxSettingId: z.string().optional(),
  taxRate: z.number().min(0).max(1, "Tax rate must be between 0 and 1"),
  taxAmount: z.number().min(0, "Tax amount cannot be negative"),
  totalAmount: z.number().min(0.01, "Total amount must be positive"),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft')
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceItem {
  id: string;
  description: string;
  subDescription?: string; // Optional sub description for additional item details
  quantity: number; // Simple mode: auto-set to 1; Detailed mode: user-entered
  rate: number; // Simple mode: auto-set to amount; Detailed mode: user-entered
  amount: number; // Simple mode: user-entered; Detailed mode: auto-calculated (qty × rate)
  accountId: number;
}

interface Customer {
  id: number;
  name: string;
  companyName?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  taxId?: string;
  paymentTerms?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  date: string;
  dueDate: string;
  templateId?: number | null; // Optional document template ID
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  paymentTerms?: string; // Payment terms (e.g., "2/10 Net 30")
  balanceDue?: number; // Balance due amount
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

interface InvoiceManagementProps {
  clientId: number;
}

export default function InvoiceManagement({ clientId }: InvoiceManagementProps) {
  const { prepareFormDataWithTimezone } = useTimezoneAwareAPI();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<'invoiceNumber' | 'customerName' | 'date' | 'dueDate' | 'totalAmount' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Date range filter state
  const [datePreset, setDatePreset] = useState<string>('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [dateFilterStart, setDateFilterStart] = useState<string>('');
  const [dateFilterEnd, setDateFilterEnd] = useState<string>('');
  const [invoiceItemMode, setInvoiceItemMode] = useState<'simple' | 'detailed'>(() => {
    const saved = localStorage.getItem(`invoiceItemMode_${clientId}`);
    return (saved === 'detailed' ? 'detailed' : 'simple') as 'simple' | 'detailed';
  });
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', subDescription: '', quantity: 1, rate: 0, amount: 0, accountId: 0 }
  ]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [defaultTaxSetting, setDefaultTaxSetting] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showPaymentTermsDialog, setShowPaymentTermsDialog] = useState(false);
  const [customPaymentTerms, setCustomPaymentTerms] = useState<Array<{id: string, label: string, days: number, discountPercent?: number, discountDays?: number}>>([]);
  const [newPaymentTerm, setNewPaymentTerm] = useState({ label: '', days: 30, hasDiscount: false, discountPercent: 0, discountDays: 10 });
  const [editingInvoiceTaxAmount, setEditingInvoiceTaxAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentDiscountPreview, setPaymentDiscountPreview] = useState<{
    eligible: boolean;
    discountAmount: number;
    discountedAmount: number;
    discountDays: number;
    fullAmount?: number;
  }>({
    eligible: false,
    discountAmount: 0,
    discountedAmount: 0,
    discountDays: 0,
    fullAmount: 0,
  });
  const [discountConflictError, setDiscountConflictError] = useState<string | null>(null);
  const [paymentTermDiscountInfo, setPaymentTermDiscountInfo] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load custom payment terms from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(`paymentTerms_${clientId}`);
    if (stored) {
      try {
        setCustomPaymentTerms(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading custom payment terms:', e);
      }
    }
  }, [clientId]);

  // Save custom payment terms to localStorage
  const saveCustomPaymentTerms = (terms: typeof customPaymentTerms) => {
    localStorage.setItem(`paymentTerms_${clientId}`, JSON.stringify(terms));
    setCustomPaymentTerms(terms);
  };

  // Add new payment term
  const handleAddPaymentTerm = () => {
    if (newPaymentTerm.days < 0) {
      toast({ title: 'Error', description: 'Payment days must be a positive number', variant: 'destructive' });
      return;
    }
    if (newPaymentTerm.days === 0) {
      toast({ title: 'Error', description: 'Payment days must be greater than 0', variant: 'destructive' });
      return;
    }
    if (newPaymentTerm.hasDiscount) {
      if (newPaymentTerm.discountPercent <= 0) {
        toast({ title: 'Error', description: 'Discount percent must be greater than 0', variant: 'destructive' });
        return;
      }
      if (newPaymentTerm.discountDays <= 0) {
        toast({ title: 'Error', description: 'Discount days must be greater than 0', variant: 'destructive' });
        return;
      }
      // Validation: Discount days must be less than or equal to payment days
      if (newPaymentTerm.discountDays > newPaymentTerm.days) {
        toast({ 
          title: 'Validation Error', 
          description: `Discount days (${newPaymentTerm.discountDays}) cannot be greater than payment days (${newPaymentTerm.days}). The discount must be available before the payment due date.`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    const termId = `custom_${Date.now()}`;
    let label = newPaymentTerm.label;
    
    // Format label based on discount
    if (newPaymentTerm.hasDiscount) {
      label = `${newPaymentTerm.discountPercent}%/${newPaymentTerm.discountDays} Net ${newPaymentTerm.days}`;
    } else {
      label = label || `Net ${newPaymentTerm.days}`;
    }

    const newTerm = {
      id: termId,
      label,
      days: newPaymentTerm.days,
      ...(newPaymentTerm.hasDiscount && {
        discountPercent: newPaymentTerm.discountPercent,
        discountDays: newPaymentTerm.discountDays
      })
    };

    saveCustomPaymentTerms([...customPaymentTerms, newTerm]);
    setNewPaymentTerm({ label: '', days: 30, hasDiscount: false, discountPercent: 0, discountDays: 10 });
    setShowPaymentTermsDialog(false);
    toast({ title: 'Success', description: 'Payment term added successfully' });
  };

  // Delete custom payment term
  const handleDeletePaymentTerm = (id: string) => {
    saveCustomPaymentTerms(customPaymentTerms.filter(t => t.id !== id));
    toast({ title: 'Success', description: 'Payment term deleted successfully' });
  };

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      customerId: 0,
      date: getCurrentDateString(),
      dueDate: getFutureDateString(30),
      items: [],
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxSettingId: '',
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 0,
      notes: '',
      paymentTerms: 'Net 30',
      status: 'draft'
    }
  });

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Fetch customers (only customers, not vendors)
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contacts/${clientId}`), {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const result = await response.json();
      return result.data.filter((contact: any) => 
        contact.contactType === 'customer' || contact.contactType === 'both'
      ) as Customer[];
    }
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`), {
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!clientId,
  });

  // Fetch Chart of Accounts (Revenue accounts for invoices)
  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/accounts/${clientId}`), {
        credentials: 'include',
        headers
      });
      if (!response.ok) return [];
      const result = await response.json();
      console.log('🚀 Accounts API response:', result);
      return result.accounts || result.data || [];
    },
    enabled: !!clientId,
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });

  // Fetch invoice templates
  const { data: invoiceTemplates = [] } = useQuery({
    queryKey: ['document-templates', 'invoice', clientId],
    queryFn: () => getDocumentTemplates('invoice', clientId),
    enabled: !!clientId,
  });

  // Fetch default invoice template
  const { data: defaultInvoiceTemplate } = useQuery({
    queryKey: ['document-templates', 'default', 'invoice'],
    queryFn: () => getDefaultDocumentTemplate('invoice'),
    enabled: !!clientId,
  });

  // Type the accounts properly
  const typedAccounts = accounts as any[];
  
  // Filter bank accounts for payment recording
  const bankAccounts = React.useMemo(() => {
    return typedAccounts.filter((account: any) => 
      account.type === 'asset' && (account.subtype === 'bank' || account.subtype === 'banklink')
    );
  }, [typedAccounts]);
  
  // Debug logging
  console.log('🚀 All accounts:', typedAccounts);
  console.log('🏦 Bank accounts:', bankAccounts);

  // Date range utility function
  const getDateRange = (preset: string) => {
    const now = new Date();
    
    switch (preset) {
      case 'all':
        return { start: '', end: '' };
      case 'current-month':
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        return { 
          start: `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`,
          end: `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        return { 
          start: `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-${String(lastMonthStart.getDate()).padStart(2, '0')}`,
          end: `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`
        };
      case 'current-quarter':
        const currentQuarterStart = startOfQuarter(now);
        const currentQuarterEnd = endOfQuarter(now);
        return { 
          start: `${currentQuarterStart.getFullYear()}-${String(currentQuarterStart.getMonth() + 1).padStart(2, '0')}-${String(currentQuarterStart.getDate()).padStart(2, '0')}`,
          end: `${currentQuarterEnd.getFullYear()}-${String(currentQuarterEnd.getMonth() + 1).padStart(2, '0')}-${String(currentQuarterEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        const lastQuarterStart = startOfQuarter(lastQuarter);
        const lastQuarterEnd = endOfQuarter(lastQuarter);
        return { 
          start: `${lastQuarterStart.getFullYear()}-${String(lastQuarterStart.getMonth() + 1).padStart(2, '0')}-${String(lastQuarterStart.getDate()).padStart(2, '0')}`,
          end: `${lastQuarterEnd.getFullYear()}-${String(lastQuarterEnd.getMonth() + 1).padStart(2, '0')}-${String(lastQuarterEnd.getDate()).padStart(2, '0')}`
        };
      case 'current-year':
        const currentYearStart = startOfYear(now);
        const currentYearEnd = endOfYear(now);
        return { 
          start: `${currentYearStart.getFullYear()}-${String(currentYearStart.getMonth() + 1).padStart(2, '0')}-${String(currentYearStart.getDate()).padStart(2, '0')}`,
          end: `${currentYearEnd.getFullYear()}-${String(currentYearEnd.getMonth() + 1).padStart(2, '0')}-${String(currentYearEnd.getDate()).padStart(2, '0')}`
        };
      case 'last-year':
        const lastYear = subYears(now, 1);
        const lastYearStart = startOfYear(lastYear);
        const lastYearEnd = endOfYear(lastYear);
        return { 
          start: `${lastYearStart.getFullYear()}-${String(lastYearStart.getMonth() + 1).padStart(2, '0')}-${String(lastYearStart.getDate()).padStart(2, '0')}`,
          end: `${lastYearEnd.getFullYear()}-${String(lastYearEnd.getMonth() + 1).padStart(2, '0')}-${String(lastYearEnd.getDate()).padStart(2, '0')}`
        };
      case 'year-to-date':
        const ytdStart = startOfYear(now);
        return { 
          start: `${ytdStart.getFullYear()}-${String(ytdStart.getMonth() + 1).padStart(2, '0')}-${String(ytdStart.getDate()).padStart(2, '0')}`,
          end: ''
        };
      default:
        return { start: '', end: '' };
    }
  };

  // Fetch invoices with date range filtering
  const { data: invoices = [], isLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', clientId, dateFilterStart, dateFilterEnd],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (dateFilterStart) {
        params.append("startDate", dateFilterStart);
      }
      if (dateFilterEnd) {
        params.append("endDate", dateFilterEnd);
      }

      const queryString = params.toString();
      const url = queryString 
        ? `/api/crm/invoices/${clientId}?${queryString}`
        : `/api/crm/invoices/${clientId}`;

      const response = await fetch(apiConfig.buildUrl(url), {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const result = await response.json();
      return result.data as Invoice[];
    }
  });

  // Fetch attachment counts for invoices
  const { data: attachmentCounts = {} } = useQuery({
    queryKey: ['invoice-attachment-counts', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoices/${clientId}/attachment-counts`), {
        credentials: 'include',
        headers
      }); 
      if (!response.ok) return {};
      const result = await response.json();
      return result.data || {};
    },
    enabled: !!clientId && invoices.length > 0,
  });

  // Fetch bookkeeping settings to get tax settings
  const { data: bookkeepingSettings } = useQuery({
    queryKey: [`/api/clients/${clientId}/bookkeeping-settings`],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}/bookkeeping-settings`), {
        credentials: 'include',
        headers
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result;
    },
    enabled: !!clientId,
  });

  // Update tax settings state when bookkeeping settings data changes
  React.useEffect(() => {
    if (bookkeepingSettings && bookkeepingSettings.taxSettings) {
      console.log('🔍 Bookkeeping tax settings data received:', bookkeepingSettings.taxSettings);
      
      // Transform tax settings to the format expected by the dropdown
      const transformedTaxSettings = bookkeepingSettings.taxSettings.map((tax: any) => {
        const ratePercent = tax.rate * 100;
        const formattedRate = ratePercent % 1 === 0 ? ratePercent.toFixed(0) : ratePercent.toFixed(1);
        return {
          id: tax.id,
          name: tax.name,
          rate: tax.rate,
          displayText: `${tax.name} (${formattedRate}%)`,
          isDefault: tax.isDefault,
          isActive: tax.isActive
        };
      });
      
      // Add "Tax Exempt" option only if there are existing tax settings
      let finalTaxSettings = transformedTaxSettings;
      if (transformedTaxSettings.length > 0) {
        finalTaxSettings = [
          ...transformedTaxSettings,
          {
            id: 'tax-exempt',
            name: 'Tax Exempt',
            rate: 0,
            displayText: 'Tax Exempt (0%)',
            isDefault: false,
            isActive: true
          }
        ];
      }
      
      setTaxSettings(finalTaxSettings);
      
      // Find and set the default tax setting
      const defaultTax = transformedTaxSettings.find((tax: any) => tax.isDefault);
      setDefaultTaxSetting(defaultTax);
      
      // Set default tax setting if none selected
      if (!form.watch('taxSettingId') && defaultTax) {
        form.setValue('taxSettingId', defaultTax.id);
      }
    }
  }, [bookkeepingSettings]);

  // Update taxSettingId when editing an invoice and taxSettings become available
  React.useEffect(() => {
    if (editingInvoice && taxSettings.length > 0 && editingInvoiceTaxAmount !== null) {
      const currentTaxSettingId = form.getValues('taxSettingId');
      console.log('🔍 useEffect: editingInvoiceTaxAmount=', editingInvoiceTaxAmount, 'currentTaxSettingId=', currentTaxSettingId, 'taxSettings count=', taxSettings.length);
      
      // If taxAmount is 0, should be tax-exempt
      if (editingInvoiceTaxAmount === 0 || editingInvoiceTaxAmount === null || editingInvoiceTaxAmount === undefined) {
        if (currentTaxSettingId !== 'tax-exempt') {
          console.log('🔍 Setting taxSettingId to tax-exempt (taxAmount is 0)');
          form.setValue('taxSettingId', 'tax-exempt', { shouldValidate: false });
        }
      } else {
        // Find matching tax setting based on tax amount
        const subtotal = Number(editingInvoice.subtotal) || 0;
        const discountAmount = Number(editingInvoice.discountAmount) || 0;
        const taxableAmount = subtotal - discountAmount;
        
        if (taxableAmount > 0) {
          const calculatedRate = editingInvoiceTaxAmount / taxableAmount;
          const matchingTax = taxSettings.find((tax: any) => {
            const taxRateNum = typeof tax.rate === 'string' ? parseFloat(tax.rate) : tax.rate;
            const match = Math.abs(taxRateNum - calculatedRate) < 0.0001;
            if (match) {
              console.log('🔍 Found match: tax.rate=', taxRateNum, 'calculatedRate=', calculatedRate, 'tax.id=', tax.id);
            }
            return match;
          });
          
          if (matchingTax) {
            const matchingId = String(matchingTax.id);
            if (currentTaxSettingId !== matchingId) {
              console.log('🔍 Matching tax amount', editingInvoiceTaxAmount, 'to tax setting', matchingId, '(current:', currentTaxSettingId, ')');
              form.setValue('taxSettingId', matchingId, { shouldValidate: false });
            }
          } else {
            // No match found, default to tax-exempt
            console.log('🔍 No matching tax setting found for amount', editingInvoiceTaxAmount, ', defaulting to tax-exempt');
            if (currentTaxSettingId !== 'tax-exempt') {
              form.setValue('taxSettingId', 'tax-exempt', { shouldValidate: false });
            }
          }
        }
      }
    }
  }, [editingInvoice, taxSettings, editingInvoiceTaxAmount, form]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceFormData) => {
      console.log('🚀 Sending request to:', '/api/crm/invoices');
      console.log('🚀 Request data:', { ...invoiceData, clientId: Number(clientId) });
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const formData = new FormData();
      formData.append('invoiceData', JSON.stringify({ ...invoiceData, clientId: Number(clientId) }));
      
      // Add attached files
      attachedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      
      const response = await fetch(apiConfig.buildUrl('/api/crm/invoices'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🚀 Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🚀 Success response:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-attachment-counts', clientId] });
      // Invalidate customer statement queries to refresh statements
      queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
      setShowCreateDialog(false);
      form.reset();
      setInvoiceItems([{ id: '1', description: '', quantity: 1, rate: 0, amount: 0, accountId: 0 }]);
      setAttachedFiles([]);
      toast({ title: 'Invoice created successfully' });
    },
    onError: (error) => {
      console.log('🚀 Mutation error:', error);
      toast({ title: 'Error creating invoice', description: error.message, variant: 'destructive' });
    }
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${invoiceId}`), {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries', clientId] });
      // Invalidate customer statement queries to refresh statements
      queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
      toast({ title: 'Success', description: 'Invoice deleted successfully' });
    },
    onError: (error: any) => {
      console.error('❌ Delete invoice error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive' 
      });
    }
  });

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, ...invoiceData }: any) => {
      const formData = new FormData();
      formData.append('invoiceData', JSON.stringify({ ...invoiceData, clientId: Number(clientId) }));
      
      // Add attached files
      attachedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${id}`), {
        method: 'PATCH',
        credentials: 'include',
        body: formData,
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-invoices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-attachment-counts', clientId] });
      // Invalidate customer statement queries to refresh statements
      queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
      toast({ title: 'Success', description: 'Invoice updated successfully' });
      setShowCreateDialog(false);
      form.reset();
      setInvoiceItems([{ id: '1', description: '', quantity: 1, rate: 0, amount: 0, accountId: 0 }]);
      setAttachedFiles([]);
      setEditingInvoice(null);
      setEditingInvoiceTaxAmount(null);
    },
    onError: (error: any) => {
      console.error('❌ Update invoice error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update invoice',
        variant: 'destructive' 
      });
    }
  });

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string }) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/projects/${clientId}`), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', clientId] });
      setShowCreateProjectDialog(false);
      setNewProjectName('');
      form.setValue('projectId', data.data.id);
      toast({ title: 'Success', description: 'Project created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create project',
        variant: 'destructive' 
      });
    }
  });

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  // Add/Remove invoice items
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      subDescription: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      accountId: typedAccounts.length > 0 ? typedAccounts[0].id : 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const removeItem = (id: string) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        if (invoiceItemMode === 'simple') {
          // Simple mode: amount is user-entered, auto-set quantity=1 and rate=amount
          if (field === 'amount') {
            updated.quantity = 1;
            updated.rate = value;
          }
        } else {
          // Detailed mode: quantity and rate are user-entered, auto-calculate amount
          if (field === 'quantity' || field === 'rate') {
            updated.amount = (updated.quantity || 0) * (updated.rate || 0);
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const discountPercent = form.watch('discountPercent') || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    
    // Get tax rate from selected tax setting
    const taxSettingId = form.watch('taxSettingId');
    const selectedTaxSetting = taxSettings.find(tax => tax.id === taxSettingId);
    const taxRate = selectedTaxSetting?.rate || 0;
    
    const taxAmount = taxableAmount * taxRate;
    const totalAmount = taxableAmount + taxAmount;

    form.setValue('subtotal', subtotal);
    form.setValue('discountAmount', discountAmount);
    form.setValue('taxRate', taxRate);
    form.setValue('taxAmount', taxAmount);
    form.setValue('totalAmount', totalAmount);
  };

  // Calculate totals when items change
  React.useEffect(() => {
    calculateTotals();
    
    // Update payment term discount info if payment terms have discount (recalculate discount amount based on new subtotal)
    const currentPaymentTerms = form.watch('paymentTerms');
    if (currentPaymentTerms) {
      const customTerm = customPaymentTerms.find(t => t.label === currentPaymentTerms);
      let discountPercent = 0;
      let discountDays = 0;
      
      if (customTerm && customTerm.discountPercent) {
        discountPercent = customTerm.discountPercent;
        discountDays = customTerm.discountDays || customTerm.days;
      } else {
        const discountMatch = currentPaymentTerms.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i);
        if (discountMatch) {
          discountPercent = parseFloat(discountMatch[1]);
          discountDays = parseInt(discountMatch[2], 10);
        }
      }
      
      if (discountPercent > 0) {
        const subtotal = form.watch('subtotal') || 0;
        const discountAmount = (subtotal * discountPercent) / 100;
        const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
        setPaymentTermDiscountInfo(
          `Discount of ${discountPercent}% (${formatCurrency(discountAmount)}) will be available if paid within ${discountDays} days. Totals stay unchanged until payment.`
        );
      } else {
        // Clear info if no discount in payment terms
        setPaymentTermDiscountInfo(null);
      }
    } else {
      setPaymentTermDiscountInfo(null);
    }
  }, [invoiceItems, form.watch('discountPercent'), form.watch('taxSettingId'), form.watch('subtotal'), form.watch('paymentTerms'), taxSettings, customPaymentTerms]);

  // Calculate due date based on invoice date and payment terms
  const calculateDueDate = (invoiceDate: string, paymentTerms: string): string => {
    if (!invoiceDate) return '';
    
    try {
      const date = new Date(invoiceDate);
      if (isNaN(date.getTime())) return '';
      
      let daysToAdd = 0;
      
      // Check standard payment terms
      if (paymentTerms === 'Due on Receipt') {
        daysToAdd = 0;
      } else if (paymentTerms === 'Net 15') {
        daysToAdd = 15;
      } else if (paymentTerms === 'Net 30') {
        daysToAdd = 30;
      } else if (paymentTerms === 'Net 45') {
        daysToAdd = 45;
      } else if (paymentTerms === 'Net 60') {
        daysToAdd = 60;
      } else {
        // Check custom payment terms
        const customTerm = customPaymentTerms.find(t => t.label === paymentTerms);
        if (customTerm) {
          daysToAdd = customTerm.days;
        } else {
          // Try to parse discount format like "2/10 Net 30"
          const discountMatch = paymentTerms.match(/^(\d+)%\/(\d+)\s+Net\s+(\d+)$/i);
          if (discountMatch) {
            daysToAdd = parseInt(discountMatch[3], 10);
          } else {
            // Try to parse "Net X" format
            const netMatch = paymentTerms.match(/Net\s+(\d+)/i);
            if (netMatch) {
              daysToAdd = parseInt(netMatch[1], 10);
            } else {
              // Default to Net 30 if payment terms format is not recognized
              daysToAdd = 30;
            }
          }
        }
      }
      
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      
      // Format as YYYY-MM-DD for date input
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, '0');
      const day = String(dueDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error calculating due date:', error);
      return '';
    }
  };

  // Update due date when invoice date or payment terms change
  React.useEffect(() => {
    const invoiceDate = form.watch('date');
    const paymentTerms = form.watch('paymentTerms') || 'Net 30';
    
    if (invoiceDate) {
      const calculatedDueDate = calculateDueDate(invoiceDate, paymentTerms);
      if (calculatedDueDate) {
        form.setValue('dueDate', calculatedDueDate);
      }
    }
  }, [form.watch('date'), form.watch('paymentTerms'), customPaymentTerms]);

  // Calculate discount preview when dialog opens (useLayoutEffect for immediate calculation)
  useLayoutEffect(() => {
    if (showPaymentDialog && selectedInvoice) {
      const dateToUse = paymentDate || new Date().toISOString().split('T')[0];
      if (!paymentDate) {
        setPaymentDate(dateToUse);
      }
      // Calculate discount immediately when dialog opens
      updatePaymentDiscountPreview(selectedInvoice, dateToUse);
    }
  }, [showPaymentDialog, selectedInvoice?.id]); // Run when dialog opens or invoice changes

  // Recalculate discount when payment date changes (user manually changes date)
  React.useEffect(() => {
    if (showPaymentDialog && selectedInvoice && paymentDate) {
      updatePaymentDiscountPreview(selectedInvoice, paymentDate);
    }
  }, [paymentDate]); // Only depend on paymentDate to recalculate when user changes the date

  // Compute discount eligibility and suggested payment amounts based on payment date
  const updatePaymentDiscountPreview = (invoice: Invoice, paymentDateValue: string) => {
    const fullAmount = Number(invoice.balanceDue || invoice.totalAmount || 0) || 0; // full outstanding (before discount)
    const invoiceDiscountAmount = Number(invoice.discountAmount || 0) || 0;

    // Check if discount is from payment terms (not from discount field)
    // If discount is from field, don't show discount info in payment dialog
    let discountDays = 0;
    let discountPercent = 0;
    let hasDiscountFromPaymentTerms = false;
    let discountAmount = 0; // Only set if discount is from payment terms
    
    if (invoice.paymentTerms) {
      // First check custom payment terms
      const customTerm = customPaymentTerms.find(t => t.label === invoice.paymentTerms);
      
      if (customTerm && customTerm.discountPercent) {
        hasDiscountFromPaymentTerms = true;
        discountPercent = customTerm.discountPercent;
        discountDays = customTerm.discountDays || customTerm.days;
        // Calculate discount amount from payment terms
        discountAmount = (fullAmount * discountPercent) / 100;
      } else {
        // Check standard format like "5%/10 Net 30"
        const match = `${invoice.paymentTerms}`.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i);
        if (match) {
          hasDiscountFromPaymentTerms = true;
          discountPercent = parseFloat(match[1]);
          discountDays = parseInt(match[2], 10);
          // Calculate discount amount from payment terms
          discountAmount = (fullAmount * discountPercent) / 100;
        } else {
          // Try to parse discount days from any format with /number pattern
          const daysMatch = `${invoice.paymentTerms}`.match(/\/\s*(\d+)/);
          if (daysMatch && daysMatch[1]) {
            discountDays = parseInt(daysMatch[1], 10);
          }
          // Also check for percentage pattern like "2%/10" or "2/10"
          const pctMatch = `${invoice.paymentTerms}`.match(/(\d+(?:\.\d+)?)%\s*\/\s*\d+|(\d+)\/\d+/);
          if (pctMatch) {
            hasDiscountFromPaymentTerms = true;
            discountPercent = parseFloat(pctMatch[1] || pctMatch[2] || '0');
            if (discountPercent > 0) {
              discountAmount = (fullAmount * discountPercent) / 100;
            }
          }
        }
      }
    }
    
    // If discount is from field (not payment terms), don't show discount info
    // Only show discount info if discount is from payment terms
    const hasDiscountFromField = invoiceDiscountAmount > 0 && !hasDiscountFromPaymentTerms;
    if (hasDiscountFromField) {
      // Discount already applied at invoice creation, don't show discount info
      discountAmount = 0;
      discountDays = 0;
      discountPercent = 0;
    }

    // Determine eligibility by checking:
    // 1. Payment date >= invoice date (can't pay before invoice is created)
    // 2. Payment date <= due date (within invoice validity period)
    // 3. Payment date <= (invoice date + discount days) (within discount period)
    let eligible = false;
    if (discountAmount > 0 && discountDays > 0 && invoice.date && invoice.dueDate) {
      const invoiceDateObj = new Date(invoice.date);
      invoiceDateObj.setHours(0, 0, 0, 0);
      const dueDateObj = new Date(invoice.dueDate);
      dueDateObj.setHours(23, 59, 59, 999);
      const paymentDateObj = new Date(paymentDateValue);
      paymentDateObj.setHours(0, 0, 0, 0);
      const discountDeadline = new Date(invoiceDateObj);
      discountDeadline.setDate(discountDeadline.getDate() + discountDays);
      discountDeadline.setHours(23, 59, 59, 999);

      const isAfterInvoiceDate = paymentDateObj >= invoiceDateObj;
      const isBeforeDueDate = paymentDateObj <= dueDateObj;
      const isWithinDiscountPeriod = paymentDateObj <= discountDeadline;

      eligible = isAfterInvoiceDate && isBeforeDueDate && isWithinDiscountPeriod;
    }

    const payableAmount = eligible
      ? Math.max(fullAmount - discountAmount, 0)
      : fullAmount;

    setPaymentDiscountPreview({
      eligible,
      discountAmount,
      discountedAmount: payableAmount,
      discountDays,
      fullAmount,
    });

    // Always show full amount in payment amount field (don't prefill with discounted amount)
    // User can manually adjust if needed, but default to full amount
    if (!paymentAmount || paymentAmount === "0") {
      setPaymentAmount(fullAmount.toFixed(2));
    }
  };

  const handleSubmit = (data: InvoiceFormData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('🚀 Invoice items:', invoiceItems);
    console.log('🚀 Form errors:', form.formState.errors);
    
    // Validate items separately since they're in state
    const validItems = invoiceItems.filter(item => item.description.trim() !== '');
    
    if (validItems.length === 0) {
      toast({ 
        title: 'Validation Error', 
        description: 'At least one item is required', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Prepare timezone-aware data for API
    const invoiceData = prepareFormDataWithTimezone({
      ...data,
      items: validItems
    });
    
    console.log('🚀 Sending invoice data:', invoiceData);
    
    if (editingInvoice) {
      // Update existing invoice - include all required fields
      updateInvoiceMutation.mutate({ 
        id: editingInvoice.id, 
        ...invoiceData,
        discountPercent: data.discountPercent || 0,
        taxRate: data.taxRate || 0.13
      });
    } else {
      // Create new invoice
      createInvoiceMutation.mutate(invoiceData);
    }
  };

  // View attachments
  const viewAttachments = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/files/attachments/invoice/${invoiceId}`), {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      
      const result = await response.json();
      setSelectedAttachments(result.data || []);
      setShowAttachmentDialog(true);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast({ title: 'Error', description: 'Failed to load attachments', variant: 'destructive' });
    }
  };

  // File attachment handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(files => files.filter((_, i) => i !== index));
  };

  // Invoice action handlers
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewDialog(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteDialog(true);
  };

  const confirmDeleteInvoice = () => {
    if (invoiceToDelete) {
      deleteInvoiceMutation.mutate(invoiceToDelete.id);
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    // Calculate discount percentage from existing data
    const subtotal = Number(invoice.subtotal);
    const discountAmount = Number(invoice.discountAmount);
    const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    
    // Store tax amount for later use in useEffect
    const existingTaxAmount = Number(invoice.taxAmount);
    setEditingInvoiceTaxAmount(existingTaxAmount);
    
    // Determine tax setting ID from existing tax amount
    let taxSettingId = 'tax-exempt'; // Default to tax-exempt
    
    if (taxSettings.length > 0 && existingTaxAmount > 0) {
      // Try to find matching tax setting based on tax amount
      const taxableAmount = subtotal - discountAmount;
      
      if (taxableAmount > 0) {
        const calculatedRate = existingTaxAmount / taxableAmount;
        const matchingTax = taxSettings.find(tax => Math.abs(tax.rate - calculatedRate) < 0.0001);
        if (matchingTax) {
          taxSettingId = matchingTax.id;
          console.log(`🔍 Found matching tax setting: ${matchingTax.id} (${matchingTax.name}) for rate ${calculatedRate}`);
        }
      }
    }
    
    // If taxAmount is 0 or no match found, use tax-exempt
    if (existingTaxAmount === 0 || existingTaxAmount === null || existingTaxAmount === undefined) {
      taxSettingId = 'tax-exempt';
      console.log('🔍 Tax amount is 0, setting taxSettingId to tax-exempt');
    }
    
    // Helper function to format date for HTML date input
    const formatDateForInput = (dateString: string): string => {
      try {
        // If it's already in YYYY-MM-DD format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        
        // Use timezone-aware parsing to avoid date shifting
        const date = parseDateInUserTimezone(dateString);
        if (isNaN(date.getTime())) {
          return getCurrentDateString();
        }
        
        // Format as YYYY-MM-DD for HTML date input using timezone-aware formatting
        return dateToUserTimezoneString(date);
      } catch (error) {
        console.warn('Failed to format date for input:', dateString, error);
        return getCurrentDateString();
      }
    };

    // Populate form with invoice data
    form.reset({
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      date: formatDateForInput(invoice.date),
      dueDate: formatDateForInput(invoice.dueDate),
      templateId: invoice.templateId || null, // Include templateId when editing
      subtotal: subtotal,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      taxSettingId: taxSettingId,
      taxRate: 0.13, // This will be updated by calculateTotals
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      notes: invoice.notes || '',
      paymentTerms: invoice.paymentTerms || 'Net 30',
      status: invoice.status
    });
    
    // Set invoice items - convert strings to numbers
    if (invoice.items) {
      const items = invoice.items.map((item: any, index: number) => ({
        id: `${index}-${Date.now()}`,
        description: item.description,
        subDescription: item.subDescription || '',
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount),
        accountId: item.accountId || (typedAccounts.length > 0 ? typedAccounts[0].id : 0)
      }));
      setInvoiceItems(items);
      
      // Calculate totals immediately after setting items
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const discountAmount = subtotal * (discountPercent / 100);
      const taxableAmount = subtotal - discountAmount;
      
      // Get tax rate from selected tax setting
      const selectedTaxSetting = taxSettings.find(tax => tax.id === taxSettingId);
      const taxRate = selectedTaxSetting?.rate || 0;
      
      const taxAmount = taxableAmount * taxRate;
      const totalAmount = taxableAmount + taxAmount;

      // Update form values directly
      form.setValue('subtotal', subtotal);
      form.setValue('discountAmount', discountAmount);
      form.setValue('taxRate', taxRate);
      form.setValue('taxAmount', taxAmount);
      form.setValue('totalAmount', totalAmount);
    }
    
    // Set editing mode
    setEditingInvoice(invoice);
    setShowCreateDialog(true);
  };

  const handlePaymentRecord = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentDialog(true);
  };

  const handleStatusUpdate = async (invoiceId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${invoiceId}/status`), {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
      toast({ title: 'Success', description: 'Invoice status updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update invoice status', variant: 'destructive' });
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${invoice.id}/pdf`), {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      if (invoice.status === 'draft') {
        await handleStatusUpdate(invoice.id, 'sent');
      }
      
      toast({ 
        title: 'PDF Downloaded', 
        description: `Invoice ${invoice.invoiceNumber} downloaded successfully` 
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ 
        title: 'PDF Error', 
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleEmailInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${invoice.id}/pdf`), {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      if (invoice.status === 'draft') {
        await handleStatusUpdate(invoice.id, 'sent');
      }
      
      toast({ 
        title: 'PDF Generated', 
        description: `Invoice ${invoice.invoiceNumber} PDF generated. Email functionality will be added soon.` 
      });
    } catch (error) {
      console.error('Error generating PDF for email:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to generate PDF for email',
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  // Update date filters when preset changes
  useEffect(() => {
    if (!showCustomDate && datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      setDateFilterStart(range.start);
      setDateFilterEnd(range.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, showCustomDate]);

  // Filter invoices (date filtering is handled by backend)
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort invoices (date filtering is handled by backend)
  const sortedInvoices = useMemo(() => {
    // Sort the invoices (already filtered by backend based on date range)
    return [...filteredInvoices].sort((a: Invoice, b: Invoice) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber || '';
          bValue = b.invoiceNumber || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        case 'customerName':
          aValue = a.customerName || '';
          bValue = b.customerName || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'totalAmount':
          aValue = parseFloat(String(a.totalAmount || 0));
          bValue = parseFloat(String(b.totalAmount || 0));
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        default:
          return 0;
      }
    });
  }, [filteredInvoices, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: 'invoiceNumber' | 'customerName' | 'date' | 'dueDate' | 'totalAmount' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoice Management</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              form.setValue('invoiceNumber', generateInvoiceNumber());
              setInvoiceItems([{ id: '1', description: '', quantity: 1, rate: 0, amount: 0, accountId: 0 }]);
              setEditingInvoice(null);
      setEditingInvoiceTaxAmount(null);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={String(field.value ?? 0)}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          >
                            <option value="0">Select a customer</option>
                            {customers.map(customer => (
                              <option key={customer.id} value={String(customer.id)}>
                                {customer.name} {customer.companyName && `(${customer.companyName})`}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Project Selection and Template Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={String(field.value ?? '')}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            >
                              <option value="">No project</option>
                              {projects.map(project => (
                                <option key={project.id} value={String(project.id)}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCreateProjectDialog(true)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Template</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={String(field.value ?? defaultInvoiceTemplate?.id ?? '')}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">Default Template</option>
                            {invoiceTemplates.map((template: any) => (
                              <option key={template.id} value={String(template.id)}>
                                {template.name} {template.isDefault && '(Default)'}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* File Attachments */}
                <div>
                  <FormItem>
                    <FormLabel>File Attachments</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                        />
                        {attachedFiles.length > 0 && (
                          <div className="space-y-1">
                            {attachedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Calculate and update due date when invoice date changes
                              const paymentTerms = form.watch('paymentTerms') || 'Net 30';
                              if (e.target.value) {
                                const calculatedDueDate = calculateDueDate(e.target.value, paymentTerms);
                                if (calculatedDueDate) {
                                  form.setValue('dueDate', calculatedDueDate);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Invoice Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Invoice Items</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={invoiceItemMode === 'simple' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setInvoiceItemMode('simple');
                          localStorage.setItem(`invoiceItemMode_${clientId}`, 'simple');
                        }}
                        className="gap-1"
                      >
                        <List className="w-4 h-4" />
                        Simple
                      </Button>
                      <Button
                        type="button"
                        variant={invoiceItemMode === 'detailed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setInvoiceItemMode('detailed');
                          localStorage.setItem(`invoiceItemMode_${clientId}`, 'detailed');
                        }}
                        className="gap-1"
                      >
                        <Grid className="w-4 h-4" />
                        Detailed
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={invoiceItemMode === 'simple' ? 'w-[45%]' : 'w-[35%]'}>Description</TableHead>
                          <TableHead className={invoiceItemMode === 'simple' ? 'w-[30%]' : 'w-[20%]'}>Account</TableHead>
                          {invoiceItemMode === 'detailed' && (
                            <>
                              <TableHead className="w-[10%]">Quantity</TableHead>
                              <TableHead className="w-[15%]">Rate</TableHead>
                            </>
                          )}
                          <TableHead className={invoiceItemMode === 'simple' ? 'w-[15%]' : 'w-[12%]'}>Amount</TableHead>
                          <TableHead className={invoiceItemMode === 'simple' ? 'w-[10%]' : 'w-[8%]'}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-2">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                  placeholder="Item description"
                                />
                                <Textarea
                                  value={item.subDescription || ''}
                                  onChange={(e) => updateItem(item.id, 'subDescription', e.target.value)}
                                  placeholder="Item sub description"
                                  className="min-h-[60px] resize-none"
                                  rows={2}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <AccountDropdown
                                  clientId={clientId}
                                  value={item.accountId > 0 ? item.accountId.toString() : ""}
                                  onValueChange={(value) => updateItem(item.id, 'accountId', parseInt(value))}
                                  placeholder="Select account"
                                  showAccountNumbers={true}
                                  className="flex-1"
                                  zIndex={99999}
                                />
                               
                              </div>
                              {typedAccounts.length === 0 && (
                                <p className="text-sm text-red-500 mt-1">No accounts available</p>
                              )}
                            </TableCell>
                            {invoiceItemMode === 'detailed' && (
                              <>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantity || ''}
                                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full"
                                    placeholder="1"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.rate || ''}
                                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                    className="w-full"
                                    placeholder="0.00"
                                  />
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              {invoiceItemMode === 'simple' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                  placeholder="0.00"
                                />
                              ) : (
                                <div className="text-sm font-medium px-3 py-2">
                                  ${item.amount.toFixed(2)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                disabled={invoiceItems.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Payment Terms</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPaymentTermsDialog(true)}
                              className="h-8 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Terms
                            </Button>
                          </div>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={field.value}
                              onChange={(e) => {
                                const selectedPaymentTerms = e.target.value;
                                field.onChange(selectedPaymentTerms);
                                
                                // Calculate and update due date when payment terms change
                                const invoiceDate = form.watch('date');
                                if (invoiceDate) {
                                  const calculatedDueDate = calculateDueDate(invoiceDate, selectedPaymentTerms);
                                  if (calculatedDueDate) {
                                    form.setValue('dueDate', calculatedDueDate);
                                  }
                                }
                                
                                // Reset error when payment terms change
                                setDiscountConflictError(null);
                                
                                // Extract and check if payment terms have discount
                                const customTerm = customPaymentTerms.find(t => t.label === selectedPaymentTerms);
                                let hasDiscountInPaymentTerms = false;
                                let discountPercentFromTerms = 0;
                                
                                if (customTerm && customTerm.discountPercent) {
                                  hasDiscountInPaymentTerms = true;
                                  discountPercentFromTerms = customTerm.discountPercent;
                                } else {
                                  // Check if it's a standard discount format like "2%/10 Net 30"
                                  const discountMatch = selectedPaymentTerms.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i);
                                  if (discountMatch) {
                                    hasDiscountInPaymentTerms = true;
                                    discountPercentFromTerms = parseFloat(discountMatch[1]);
                                  }
                                }
                                
                                // Check if user has manually set a discount in the discount field
                                const currentDiscountPercent = form.watch('discountPercent');
                                const currentDiscountAmount = form.watch('discountAmount');
                                const hasManualDiscount = (currentDiscountPercent > 0 || currentDiscountAmount > 0);
                                
                                if (hasDiscountInPaymentTerms && hasManualDiscount) {
                                  // Conflict: both payment terms discount and manual discount exist
                                  setDiscountConflictError(
                                    'Cannot use both discount field and payment terms discount. Please use only one discount method.'
                                  );
                                  // Reset payment terms to a non-discount option
                                  form.setValue('paymentTerms', 'Net 30');
                                  setPaymentTermDiscountInfo(null);
                                  // Clear error after 8 seconds
                                  setTimeout(() => setDiscountConflictError(null), 8000);
                                  return; // Don't apply payment terms discount
                                }
                                
                                if (hasDiscountInPaymentTerms) {
                                  // Don't apply discount to discountPercent - just show info
                                  // Discount will be applied later when payment is recorded (if within discount period)
                                  form.setValue('discountPercent', 0);
                                  form.setValue('discountAmount', 0);
                                  
                                  // Extract discount days
                                  let discountDaysFromTerms = 0;
                                  if (customTerm && customTerm.discountDays) {
                                    discountDaysFromTerms = customTerm.discountDays;
                                  } else if (customTerm && customTerm.days) {
                                    discountDaysFromTerms = customTerm.days;
                                  } else {
                                    const discountMatch = selectedPaymentTerms.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i);
                                    if (discountMatch) {
                                      discountDaysFromTerms = parseInt(discountMatch[2], 10);
                                    }
                                  }
                                  
                                  // Show info message about the discount
                                  const subtotal = form.watch('subtotal') || 0;
                                  const discountAmount = (subtotal * discountPercentFromTerms) / 100;
                                  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
                                  setPaymentTermDiscountInfo(
                                    `Discount of ${discountPercentFromTerms}% (${formatCurrency(discountAmount)}) will be available if paid within ${discountDaysFromTerms} days. Totals stay unchanged until payment.`
                                  );
                                  console.log(`ℹ️ Payment term "${selectedPaymentTerms}" has ${discountPercentFromTerms}% discount if paid within ${discountDaysFromTerms} days. Discount will be applied when payment is recorded.`);
                                } else {
                                  // Clear the info message
                                  setPaymentTermDiscountInfo(null);
                                  // No discount in payment terms - clear discount field if it was set from a previous payment term
                                  const allDiscountTerms = customPaymentTerms.filter(t => t.discountPercent);
                                  const standardDiscountTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'];
                                  const standardDiscountPattern = /^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i;
                                  
                                  // Only clear if user is switching to a non-discount term
                                  if (!standardDiscountTerms.includes(selectedPaymentTerms) && 
                                      !allDiscountTerms.some(t => t.label === selectedPaymentTerms) &&
                                      !standardDiscountPattern.test(selectedPaymentTerms)) {
                                    // User switched to a non-discount term, clear discount
                                    form.setValue('discountPercent', 0);
                                    form.setValue('discountAmount', 0);
                                  }
                                }
                              }}
                            >
                              <option value="Net 15">Net 15</option>
                              <option value="Net 30">Net 30</option>
                              <option value="Net 45">Net 45</option>
                              <option value="Net 60">Net 60</option>
                              <option value="Due on Receipt">Due on Receipt</option>
                              {customPaymentTerms.length > 0 && (
                                <>
                                  <option disabled>--- Custom Terms ---</option>
                                  {customPaymentTerms.map((term) => (
                                    <option key={term.id} value={term.label}>
                                      {term.label}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </FormControl>
                          <FormMessage />
                          {discountConflictError && (
                            <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                              {discountConflictError}
                            </p>
                          )}
                          {paymentTermDiscountInfo && (
                            <p className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                              {paymentTermDiscountInfo}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional notes for the invoice..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${(parseFloat(form.watch('subtotal')) || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <FormField
                          control={form.control}
                          name="discountPercent"
                          render={({ field }) => (
                            <div className="flex items-center space-x-2">
                              <span>Discount:</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={field.value}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  field.onChange(newValue);
                                  
                                  // If discount field is being used, check for conflict with payment terms
                                  if (newValue > 0) {
                                    const currentPaymentTerms = form.watch('paymentTerms');
                                    const customTerm = customPaymentTerms.find(t => t.label === currentPaymentTerms);
                                    let hasDiscountInPaymentTerms = false;
                                    
                                    if (customTerm && customTerm.discountPercent) {
                                      hasDiscountInPaymentTerms = true;
                                    } else {
                                      // Check if it's a standard discount format like "2%/10 Net 30"
                                      const discountMatch = currentPaymentTerms.match(/^(\d+(?:\.\d+)?)%\/(\d+)\s+Net\s+(\d+)$/i);
                                      hasDiscountInPaymentTerms = discountMatch !== null;
                                    }
                                    
                                    if (hasDiscountInPaymentTerms) {
                                      // Conflict: payment terms have discount
                                      setDiscountConflictError(
                                        'Cannot use both discount field and payment terms discount. Payment terms have been reset to "Net 30".'
                                      );
                                      // Reset payment terms to a non-discount option
                                      form.setValue('paymentTerms', 'Net 30');
                                      // Clear error after 8 seconds
                                      setTimeout(() => setDiscountConflictError(null), 8000);
                                    } else {
                                      setDiscountConflictError(null);
                                    }
                                  } else {
                                    setDiscountConflictError(null);
                                  }
                                }}
                                className="w-16"
                              />
                              <span>%</span>
                            </div>
                          )}
                        />
                        <span>-${(parseFloat(form.watch('discountAmount')) || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <FormField
                          control={form.control}
                          name="taxSettingId"
                          render={({ field }) => (
                            <div className="flex items-center space-x-2">
                              <span>Tax:</span>
                              <select 
                                className="w-32 px-2 py-1 border rounded"
                                value={field.value || defaultTaxSetting?.id || ''}
                                onChange={(e) => {
                                  console.log('🔍 Tax selection changed to:', e.target.value);
                                  field.onChange(e.target.value);
                                }}
                              >
                                <option value="">Select tax</option>
                                {taxSettings.map((tax) => {
                                  console.log('🔍 Rendering tax option:', tax);
                                  return (
                                    <option key={tax.id} value={tax.id}>
                                      {tax.displayText}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        />
                        <span>${(parseFloat(form.watch('taxAmount')) || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>${(parseFloat(form.watch('totalAmount')) || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                    onClick={() => {
                      console.log('🚀 Create button clicked');
                      console.log('🚀 Form valid:', form.formState.isValid);
                      console.log('🚀 Form errors:', form.formState.errors);
                      console.log('🚀 Invoice items:', invoiceItems);
                      console.log('🚀 Valid items:', invoiceItems.filter(item => item.description.trim() !== ''));
                    }}
                  >
                    {createInvoiceMutation.isPending || updateInvoiceMutation.isPending ? 
                      (editingInvoice ? 'Updating...' : 'Creating...') : 
                      (editingInvoice ? 'Update Invoice' : 'Create Invoice')
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button
          variant="outline"
          size="default"
          onClick={async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
            await queryClient.invalidateQueries({ queryKey: ['all-invoices', clientId] });
            await queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
            await refetchInvoices();
            toast({
              title: "Refreshed",
              description: "Invoice data has been updated",
            });
          }}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Date Range Filter */}
          <div className="mb-4 flex flex-wrap items-end gap-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Date Range:
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={showCustomDate ? 'custom' : datePreset} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setShowCustomDate(true);
                    setDatePreset('custom');
                  } else {
                    setShowCustomDate(false);
                    setDatePreset(value);
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="year-to-date">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showCustomDate && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter-start" className="text-sm">
                    From
                  </Label>
                  <Input
                    id="date-filter-start"
                    type="date"
                    value={dateFilterStart}
                    onChange={(e) => setDateFilterStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter-end" className="text-sm">
                    To
                  </Label>
                  <Input
                    id="date-filter-end"
                    type="date"
                    value={dateFilterEnd}
                    onChange={(e) => setDateFilterEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
            {(dateFilterStart || dateFilterEnd) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilterStart('');
                  setDateFilterEnd('');
                  setDatePreset('all');
                  setShowCustomDate(false);
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filter
              </Button>
            )}
            {(dateFilterStart || dateFilterEnd) && (
              <div className="text-sm text-muted-foreground">
                Showing {sortedInvoices.length} of {invoices.length} invoices
              </div>
            )}
          </div>
          
          {sortedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('invoiceNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Invoice #
                      {sortField === 'invoiceNumber' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'invoiceNumber' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('customerName')}
                  >
                    <div className="flex items-center gap-2">
                      Customer
                      {sortField === 'customerName' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'customerName' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'date' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('dueDate')}
                  >
                    <div className="flex items-center gap-2">
                      Due Date
                      {sortField === 'dueDate' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'dueDate' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center gap-2">
                      Amount
                      {sortField === 'totalAmount' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'totalAmount' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'status' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{(() => {
                      try {
                        // Handle YYYY-MM-DD format safely without timezone conversion
                        if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.date)) {
                          const [year, month, day] = invoice.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        }
                        
                        // For other formats, use standard parsing
                        const date = new Date(invoice.date);
                        return date.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: '2-digit'
                        });
                      } catch (error) {
                        return invoice.date;
                      }
                    })()}</TableCell>
                    <TableCell>{(() => {
                      try {
                        // Handle YYYY-MM-DD format safely without timezone conversion
                        if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate)) {
                          const [year, month, day] = invoice.dueDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        }
                        
                        // For other formats, use standard parsing
                        const date = new Date(invoice.dueDate);
                        return date.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: '2-digit'
                        });
                      } catch (error) {
                        return invoice.dueDate;
                      }
                    })()}</TableCell>
                    <TableCell>
                      {Number(invoice.discountAmount || 0) > 0 ? (
                        <span className="text-green-700 font-medium">
                          ${Number(invoice.discountAmount).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>${Number(invoice.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(invoice)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEmailInvoice(invoice)}>
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteInvoice(invoice)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {(attachmentCounts[invoice.id] || 0) > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => viewAttachments(invoice.id)}>
                            <Paperclip className="w-4 h-4" />
                            <span className="ml-1 text-xs">({attachmentCounts[invoice.id]})</span>
                          </Button>
                        )}
                        {invoice.status !== 'paid' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePaymentRecord(invoice)}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Invoice Information</h3>
                  <div className="space-y-2">
                    <p><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}</p>
                    <p><strong>Customer:</strong> {selectedInvoice.customerName}</p>
                    <p><strong>Date:</strong> {(() => {
                      try {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(selectedInvoice.date)) {
                          const [year, month, day] = selectedInvoice.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        }
                        const date = new Date(selectedInvoice.date);
                        return date.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: '2-digit'
                        });
                      } catch (error) {
                        return selectedInvoice.date;
                      }
                    })()}</p>
                    <p><strong>Due Date:</strong> {(() => {
                      try {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(selectedInvoice.dueDate)) {
                          const [year, month, day] = selectedInvoice.dueDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: '2-digit'
                          });
                        }
                        const date = new Date(selectedInvoice.dueDate);
                        return date.toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: '2-digit'
                        });
                      } catch (error) {
                        return selectedInvoice.dueDate;
                      }
                    })()}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedInvoice.status)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="space-y-2">
                    <p><strong>Subtotal:</strong> ${Number(selectedInvoice.subtotal).toFixed(2)}</p>
                    <p><strong>Tax:</strong> ${Number(selectedInvoice.taxAmount).toFixed(2)}</p>
                    <p><strong>Total:</strong> ${Number(selectedInvoice.totalAmount).toFixed(2)}</p>
                    <p><strong>Status:</strong> {selectedInvoice.status}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70%]">Description</TableHead>
                      <TableHead className="w-[30%]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>${Number(item.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          // Reset form when dialog closes
          setPaymentMethod('');
          setSelectedBankAccountId(null);
            setPaymentDiscountPreview({
              eligible: false,
              discountAmount: 0,
              discountedAmount: 0,
              discountDays: 0,
              fullAmount: 0,
            });
            setPaymentAmount('');
            setPaymentDate('');
            setPaymentError('');
        } else if (selectedInvoice) {
          // Initialize payment date to today
          const today = new Date().toISOString().split('T')[0];
          setPaymentDate(today);
          // Set initial payment amount - will be updated by discount calculation if eligible
          const fullAmount = Number((selectedInvoice as any).balanceDue || selectedInvoice.totalAmount || 0) || 0;
          setPaymentAmount(fullAmount.toFixed(2));
          // Discount calculation will be handled by useLayoutEffect when showPaymentDialog becomes true
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Error Alert - Show prominently at top if there's an error */}
              {paymentError && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-red-900 mb-1">
                        Payment Error
                      </h4>
                      <p className="text-sm text-red-800 whitespace-pre-wrap">
                        {paymentError}
                      </p>
                    </div>
                    <button
                      onClick={() => setPaymentError('')}
                      className="flex-shrink-0 text-red-600 hover:text-red-800"
                      aria-label="Dismiss error"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="payment-amount">Payment Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                />
                {paymentDiscountPreview.discountAmount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the full invoice amount (discount will be applied automatically if eligible)
                  </p>
                )}
              </div>

              {/* Discount Amount Field - Show when eligible */}
              {paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <Label htmlFor="discountAmount" className="text-green-800 font-medium">
                    Discount Amount
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="discountAmount"
                      type="text"
                      value={`$${paymentDiscountPreview.discountAmount.toFixed(2)}`}
                      readOnly
                      className="bg-white font-semibold text-green-700"
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Discount available because payment date is within {paymentDiscountPreview.discountDays} days of invoice date
                  </p>
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Net Payable:</span>{" "}
                      ${paymentDiscountPreview.discountedAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Show message when discount is not eligible but available */}
              {!paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Discount not available:</span>{" "}
                    Payment date must be between invoice date and due date, and within{" "}
                    {paymentDiscountPreview.discountDays} days of invoice date to qualify for discount.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Full amount payable: ${(paymentDiscountPreview.fullAmount || Number(selectedInvoice?.balanceDue || selectedInvoice?.totalAmount || 0)).toFixed(2)}
                  </p>
                </div>
              )}
              
              <div>
                <Label>Invoice: {selectedInvoice.invoiceNumber}</Label>
                <p className="text-sm text-gray-600">
                  Outstanding:{" "}
                  ${Number(selectedInvoice?.balanceDue || selectedInvoice?.totalAmount || 0).toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setPaymentDate(newDate);
                      if (selectedInvoice && newDate) {
                        updatePaymentDiscountPreview(selectedInvoice, newDate);
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <select 
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      // Clear bank account selection if method changes (but keep for check and bank_transfer)
                      if (e.target.value !== 'bank_transfer' && e.target.value !== 'check') {
                        setSelectedBankAccountId(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select method</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              {/* Bank Account Selection - Show when Check or Bank Transfer is selected */}
              {(paymentMethod === 'bank_transfer' || paymentMethod === 'check') && (
                <div>
                  <Label htmlFor="bank-account">Bank Account *</Label>
                  <select
                    id="bank-account"
                    value={selectedBankAccountId || ''}
                    onChange={(e) => setSelectedBankAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.length === 0 ? (
                      <option value="" disabled>No bank accounts found</option>
                    ) : (
                      bankAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.name} {account.accountNumber ? `(${account.accountNumber})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {bankAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No bank accounts found. Please create a bank account in Chart of Accounts first.
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  setShowPaymentDialog(false);
                  setPaymentMethod('');
                  setSelectedBankAccountId(null);
                }}>
                  Cancel
                </Button>
                <Button type="button" onClick={async () => {
                  try {
                    // Clear any previous errors
                    setPaymentError('');
                    
                    const methodInput = document.getElementById('payment-method') as HTMLSelectElement;
                    
                    if (!paymentAmount || !paymentDate || !methodInput.value) {
                      setPaymentError('Please fill in all payment fields');
                      toast({ title: 'Validation Error', description: 'Please fill in all payment fields', variant: 'destructive' });
                      return;
                    }
                    
                    // Validate bank account selection for check and bank transfers
                    if ((paymentMethod === 'bank_transfer' || paymentMethod === 'check') && !selectedBankAccountId) {
                      setPaymentError('Please select a bank account for this payment method');
                      toast({ title: 'Validation Error', description: 'Please select a bank account for this payment method', variant: 'destructive' });
                      return;
                    }
                    
                    const token = localStorage.getItem('authToken');
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) {
                      headers["Authorization"] = `Bearer ${token}`;
                    }
                    
                    // Calculate actual payment amount
                    // If discount is eligible, subtract discount from entered amount
                    // Otherwise, use the entered amount as-is
                    let actualPaymentAmount = parseFloat(paymentAmount);
                    if (paymentDiscountPreview.eligible && paymentDiscountPreview.discountAmount > 0) {
                      // User entered full amount, but we need to send the discounted amount
                      // The backend will create journal entry with full amount for A/R and discount earned
                      actualPaymentAmount = Math.max(
                        actualPaymentAmount - paymentDiscountPreview.discountAmount,
                        0
                      );
                    }
                    
                    const paymentData: any = {
                      amount: actualPaymentAmount,
                      paymentDate: paymentDate,
                      paymentMethod: methodInput.value
                    };
                    
                    // Include bank account ID if check or bank transfer is selected
                    if ((paymentMethod === 'bank_transfer' || paymentMethod === 'check') && selectedBankAccountId) {
                      paymentData.bankAccountId = selectedBankAccountId;
                    }
                    
                    const response = await fetch(apiConfig.buildUrl(`/api/crm/invoice/${selectedInvoice?.id}/payment`), {
                      method: 'POST',
                      headers,
                      credentials: 'include',
                      body: JSON.stringify(paymentData)
                    });
                    
                    if (!response.ok) {
                      // Try to parse error message from response
                      let errorMessage = 'Payment recording failed';
                      try {
                        const errorData = await response.json().catch(() => ({}));
                        
                        // Check if it's the sales discount account missing error
                        if (errorData.errorCode === 'SALES_DISCOUNT_ACCOUNT_MISSING' || 
                            (errorData.message && errorData.message.includes('Sales Discount'))) {
                          // Display error in modal instead of toast
                          setPaymentError(errorData.message || 'Please create a "Sales Discount" account of type "Expense", "Income", or "Cost of Sales" in the Chart of Accounts before recording this payment.');
                          return; // Don't close modal, let user see the error
                        }
                        
                        if (errorData.message) {
                          errorMessage = errorData.message;
                        } else if (errorData.error) {
                          // Some APIs return error in 'error' field
                          errorMessage = errorData.error;
                        }
                      } catch (e) {
                        // If JSON parsing fails, use default message
                        errorMessage = `Payment recording failed: ${response.statusText || 'Unknown error'}`;
                      }
                      setPaymentError(errorMessage);
                      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                      return;
                    }
                    
                    toast({ title: 'Success', description: 'Payment recorded successfully' });
                    queryClient.invalidateQueries({ queryKey: ['invoices', clientId] });
                    queryClient.invalidateQueries({ queryKey: ['all-invoices', clientId] });
                    queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
                    // Invalidate AR aging report queries to refresh financial reports
                    queryClient.invalidateQueries({ queryKey: ['/api/crm/customers/aging-report'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
                    // Invalidate customer statement queries to refresh statements
                    queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
                    setShowPaymentDialog(false);
                    setPaymentMethod('');
                    setSelectedBankAccountId(null);
                    setPaymentError('');
                  } catch (error: any) {
                    // Handle network errors or other exceptions
                    let errorMessage = 'Failed to record payment';
                    if (error?.message) {
                      errorMessage = error.message;
                      // Check if error message contains sales discount account info
                      if (error.message && error.message.includes('Sales Discount')) {
                        setPaymentError(error.message);
                      } else {
                        setPaymentError(errorMessage);
                        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                      }
                    } else if (typeof error === 'string') {
                      errorMessage = error;
                      setPaymentError(errorMessage);
                      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                    } else {
                      setPaymentError(errorMessage);
                      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                    }
                  }
                }}>
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreateProjectDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  if (newProjectName.trim()) {
                    createProjectMutation.mutate({ name: newProjectName.trim() });
                  }
                }}
                disabled={!newProjectName.trim() || createProjectMutation.isPending}
              >
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment View Dialog */}
      <Dialog open={showAttachmentDialog} onOpenChange={setShowAttachmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attachments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAttachments.length === 0 ? (
              <p>No attachments found</p>
            ) : (
              selectedAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{attachment.original_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/crm/files/download/${attachment.id}`, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {/* Add Payment Terms Dialog - Nested modal with higher z-index */}
      <Dialog open={showPaymentTermsDialog} onOpenChange={setShowPaymentTermsDialog} modal={true}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/40" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-[10001] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="overflow-y-auto max-h-full">
              <DialogHeader>
                <DialogTitle>Add Payment Terms</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
            <div>
              <Label htmlFor="term-label">Label (Optional)</Label>
              <Input
                id="term-label"
                placeholder="e.g., Net 30, Custom Terms"
                value={newPaymentTerm.label}
                onChange={(e) => setNewPaymentTerm({ ...newPaymentTerm, label: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to auto-generate from days
              </p>
            </div>
            
            <div>
              <Label htmlFor="term-days">Payment Days *</Label>
              <Input
                id="term-days"
                type="number"
                min="1"
                placeholder="30"
                value={newPaymentTerm.days}
                onChange={(e) => {
                  const days = parseInt(e.target.value) || 0;
                  const updatedTerm = { ...newPaymentTerm, days };
                  // Auto-adjust discount days if they exceed the new payment days
                  if (updatedTerm.hasDiscount && updatedTerm.discountDays > days) {
                    updatedTerm.discountDays = days;
                  }
                  setNewPaymentTerm(updatedTerm);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of days until payment is due
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has-discount"
                checked={newPaymentTerm.hasDiscount}
                onChange={(e) => setNewPaymentTerm({ ...newPaymentTerm, hasDiscount: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="has-discount" className="cursor-pointer">
                Include early payment discount
              </Label>
            </div>

            {newPaymentTerm.hasDiscount && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                <div>
                  <Label htmlFor="discount-percent">Discount % *</Label>
                  <Input
                    id="discount-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="2"
                    value={newPaymentTerm.discountPercent}
                    onChange={(e) => setNewPaymentTerm({ ...newPaymentTerm, discountPercent: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., 2 for 2%
                  </p>
                </div>
                <div>
                  <Label htmlFor="discount-days">Discount Days *</Label>
                  <Input
                    id="discount-days"
                    type="number"
                    min="0"
                    max={newPaymentTerm.days}
                    placeholder="10"
                    value={newPaymentTerm.discountDays}
                    onChange={(e) => {
                      const discountDays = parseInt(e.target.value) || 0;
                      setNewPaymentTerm({ ...newPaymentTerm, discountDays });
                    }}
                    className={newPaymentTerm.discountDays > newPaymentTerm.days ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Days to pay for discount (must be ≤ {newPaymentTerm.days} days)
                  </p>
                  {newPaymentTerm.discountDays > newPaymentTerm.days && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Discount days cannot exceed payment days. Discount must be available before the due date.
                    </p>
                  )}
                </div>
                {newPaymentTerm.hasDiscount && newPaymentTerm.discountPercent > 0 && newPaymentTerm.discountDays > 0 && (
                  <div className={`col-span-2 p-3 rounded-md ${newPaymentTerm.discountDays > newPaymentTerm.days ? 'bg-red-50 border border-red-200' : 'bg-muted'}`}>
                    <p className="text-sm font-medium">Preview:</p>
                    <p className="text-lg font-bold">
                      {newPaymentTerm.discountPercent}%/{newPaymentTerm.discountDays} Net {newPaymentTerm.days}
                    </p>
                    <p className={`text-xs mt-1 ${newPaymentTerm.discountDays > newPaymentTerm.days ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {newPaymentTerm.discountDays > newPaymentTerm.days ? (
                        <span className="font-semibold">⚠️ Invalid: Discount period cannot exceed payment period</span>
                      ) : (
                        `${newPaymentTerm.discountPercent}% discount if paid within ${newPaymentTerm.discountDays} days, otherwise net ${newPaymentTerm.days} days`
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {customPaymentTerms.length > 0 && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">Custom Payment Terms</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customPaymentTerms.map((term) => (
                    <div key={term.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <p className="font-medium">{term.label}</p>
                        {term.discountPercent && (
                          <p className="text-xs text-muted-foreground">
                            {term.discountPercent}% discount within {term.discountDays} days, Net {term.days} days
                          </p>
                        )}
                        {!term.discountPercent && (
                          <p className="text-xs text-muted-foreground">Net {term.days} days</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaymentTerm(term.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowPaymentTermsDialog(false);
                  setNewPaymentTerm({ label: '', days: 30, hasDiscount: false, discountPercent: 0, discountDays: 10 });
                }}>
                  Cancel
                </Button>
              <Button 
                onClick={handleAddPaymentTerm}
                disabled={
                  newPaymentTerm.days <= 0 || 
                  (newPaymentTerm.hasDiscount && (
                    newPaymentTerm.discountPercent <= 0 || 
                    newPaymentTerm.discountDays <= 0 || 
                    newPaymentTerm.discountDays > newPaymentTerm.days
                  ))
                }
              >
                Add Payment Term
              </Button>
              </DialogFooter>
            </div>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoiceNumber}</strong>?</p>
            <p className="text-sm text-red-600">This action cannot be undone. The invoice and its associated journal entries will be permanently deleted.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteInvoice}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}