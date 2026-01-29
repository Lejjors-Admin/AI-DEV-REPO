import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, apiConfig } from '@/lib/api-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Eye, DollarSign, Calendar, Download, Plus, FileText, CheckCircle, Building, Upload } from 'lucide-react';
import ChequeUploadManager from './ChequeUploadManager';
import { useLocation } from 'wouter';
import { getDocumentTemplates, getDefaultDocumentTemplate, deleteDocumentTemplate, getDocumentTypeRegistry, type DocumentTemplate } from '@/lib/api/document-templates';
import { Edit, Trash2, Star } from 'lucide-react';
import { ChequePreviewModal } from '@/components/template-editor/ChequePreviewModal';
import { CHEQUE_FIELD_DEFINITIONS } from '@/components/template-editor/FieldPalette';
import { TemplateField } from '@/components/template-editor/TemplateCanvas';
import { getCurrentDateString } from '@/lib/date-utils';
import { AllAccountDropdown } from '@/components/ui/AccountDropdown';

const chequeLineSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().optional(),
  expenseAccountId: z.number().min(1, 'Please select an expense account'),
  taxCode: z.string().optional(),
  taxAmount: z.number().default(0),
  taxAccountId: z.number().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.number().min(0, 'Invoice amount cannot be negative'),
  comment: z.string().optional(),
});

const chequeSchema = z.object({
  vendorId: z.number().optional(),
  chequeNumber: z.string().optional(),
  templateId: z.number().nullable().optional(),
  payeeName: z.string().min(1, 'Payee name is required'),
  payeeAddress: z.string().optional(),
  amount: z.number().min(0, 'Amount cannot be negative'),
  chequeDate: z.string(),
  memo: z.string().optional(),
  referenceNumber: z.string().optional(),
  appliedToBillId: z.number().optional(),
  appliedAmount: z.number().optional(),
  appliedBillIds: z.array(z.number()).optional(), // For multi-invoice payment
  taxSettingId: z.string().optional(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  netAmount: z.number().optional(),
  lines: z.array(chequeLineSchema).min(1, 'At least one line item is required')
});

type ChequeFormData = z.infer<typeof chequeSchema>;

interface ChequeExpenseManagementProps {
  clientId: number | null;
}

export default function ChequeExpenseManagement({ clientId }: ChequeExpenseManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedCheque, setSelectedCheque] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [defaultTaxSetting, setDefaultTaxSetting] = useState<any>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | undefined>(undefined);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('cheques');
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);

  // Helper to extract base field ID from keys like "date-1" -> "date"
  const getBaseFieldId = (fieldKey: string): string => {
    const match = fieldKey.match(/^(.+?)(-\d+)?$/);
    return match ? match[1] : fieldKey;
  };

  // Load document type registry for field definitions
  const { data: registry } = useQuery({
    queryKey: ['document-type-registry'],
    queryFn: getDocumentTypeRegistry,
  });

  // Read tab from sessionStorage on mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('chequeTab');
    if (savedTab) {
      setActiveTab(savedTab);
      sessionStorage.removeItem('chequeTab'); // Clear after reading
    }
  }, []);

  const form = useForm<ChequeFormData>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      vendorId: undefined,
      chequeNumber: undefined,
      payeeName: '',
      payeeAddress: '',
      amount: 0,
      chequeDate: getCurrentDateString(),
      memo: '',
      referenceNumber: '',
      appliedToBillId: undefined,
      appliedAmount: undefined,
      taxSettingId: 'tax-exempt',
      taxRate: 0,
      taxAmount: 0,
      netAmount: 0,
      lines: [{
        description: 'Line Item',
        amount: 0,
        expenseAccountId: 0, // Will be set when expense accounts are loaded
        taxCode: 'HST',
        taxAmount: 0,
        taxAccountId: 5000, // HST Payable
        invoiceDate: '',
        invoiceAmount: 0,
        comment: ''
      }]
    }
  });

  

  // Fetch vendors
  const { data: vendorResponse, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['/api/crm/vendors', clientId],
    enabled: !!clientId,
    queryFn: () => apiRequest(`/api/crm/vendors?clientId=${clientId}`, { method: 'GET' }).then(res => res.json())
  });
  
  const vendors = vendorResponse?.data || [];

  // Fetch document templates for dropdown (always enabled when client selected)
  const { data: chequeDocumentTemplates = [] } = useQuery({
    queryKey: ['document-templates', 'cheque', 'dropdown', clientId],
    queryFn: () => getDocumentTemplates('cheque', clientId || undefined),
    enabled: !!clientId,
  });

  // Fetch default cheque template
  const { data: defaultChequeTemplate } = useQuery({
    queryKey: ['document-templates', 'default', 'cheque'],
    queryFn: () => getDefaultDocumentTemplate('cheque'),
    enabled: !!clientId,
  });

  // Fetch templates for Templates tab (refetches when tab opened)
  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['document-templates', 'cheque', 'list', clientId],
    queryFn: () => getDocumentTemplates('cheque', clientId || undefined),
    enabled: !!clientId,
    refetchOnMount: 'always'
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: number) => deleteDocumentTemplate(templateId, clientId || undefined),
    onSuccess: () => {
      toast({ title: 'Template deleted successfully' });
      // Invalidate both the list and dropdown queries
      queryClient.invalidateQueries({ queryKey: ['document-templates', 'cheque', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['document-templates', 'cheque', 'dropdown'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting template', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Fetch cheques (session-scoped V2 endpoint)
  const { data: cheques = [], isLoading: isLoadingCheques, refetch: refetchCheques } = useQuery({
    queryKey: ['/api/cheques', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) {
        console.error('No clientId provided');
        return [];
      }
      const token = localStorage.getItem('authToken');
      const url = apiConfig.buildUrl(`/api/cheques?clientId=${clientId}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }),
        },
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch cheques:', res.status, errorText);
        return [];
      }
      const response = await res.json();
      console.log('✅ Cheques loaded:', response.data);
      return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch outstanding bills for selected vendor
  const { data: vendorBillsResponse, isLoading: isLoadingVendorBills, refetch: refetchVendorBills } = useQuery({
    queryKey: ['/api/crm/vendor-bills', selectedVendor, clientId],
    enabled: !!selectedVendor && selectedVendor !== 'manual' && !!clientId, // Don't fetch when "manual" is selected or no clientId
    queryFn: () => {
      const url = `/api/crm/vendor/${selectedVendor}/outstanding-bills${clientId ? `?clientId=${clientId}` : ''}`;
      return apiRequest(url, { method: 'GET' }).then(res => res.json());
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  });
  
  const vendorBills = vendorBillsResponse?.data || [];

  // Fetch all accounts from chart of accounts
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['accounts/all', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) return [];
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      // Try query parameter endpoint first (same as ChartOfAccounts uses)
      const response = await fetch(apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`), {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        console.error('❌ Failed to fetch accounts:', response.status, response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('🚀 All accounts API response:', data);
      
      // Handle different response structures
      let accounts = [];
      if (Array.isArray(data)) {
        accounts = data;
      } else if (data.accounts && Array.isArray(data.accounts)) {
        accounts = data.accounts;
      } else if (data.data && Array.isArray(data.data)) {
        accounts = data.data;
      }
      
      console.log(`✅ Retrieved ${accounts.length} total accounts for cheque dropdown`);
      
      // Log account types to verify we're getting all types
      const accountTypes = Array.from(new Set(accounts.map((acc: any) => acc.type).filter(Boolean)));
      console.log('📊 Account types found:', accountTypes);
      
      // Log accounts by type for debugging
      const accountsByType: Record<string, number> = {};
      accounts.forEach((acc: any) => {
        const type = acc.type || 'unknown';
        accountsByType[type] = (accountsByType[type] || 0) + 1;
      });
      console.log('📈 Accounts by type:', accountsByType);
      
      // Log accounts with missing properties
      const accountsWithoutName = accounts.filter((acc: any) => !acc.name && !acc.accountName);
      if (accountsWithoutName.length > 0) {
        console.warn(`⚠️ Found ${accountsWithoutName.length} accounts without name:`, accountsWithoutName);
      }
      
      return accounts;
    },
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });

  // Filter expense accounts for line items
  const expenseAccounts = useMemo(() => 
    (allAccounts as any[]).filter((acc: any) => acc.type === 'expense'),
    [allAccounts]
  );
  
  // Note: AllAccountDropdown handles account fetching internally, so we don't need bankAccounts here
  // The AllAccountDropdown component will fetch and display all accounts from the chart of accounts

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

  // Set default account when accounts are loaded (use first expense account if available, otherwise first account)
  useEffect(() => {
    if (allAccounts.length > 0) {
      const lines = form.getValues('lines') || [];
      const expenseAccounts = (allAccounts as any[]).filter((acc: any) => acc.type === 'expense');
      const defaultAccount = expenseAccounts.length > 0 ? expenseAccounts[0] : allAccounts[0];
      
      const updatedLines = lines.map((line: any) => {
        if (!line.expenseAccountId || line.expenseAccountId === 0) {
          return { ...line, expenseAccountId: defaultAccount.id };
        }
        return line;
      });
      if (updatedLines.some((line: any, index: number) => line.expenseAccountId !== lines[index]?.expenseAccountId)) {
        form.setValue('lines', updatedLines);
      }
    }
  }, [allAccounts]);

  // Update tax settings state when bookkeeping settings data changes
  useEffect(() => {
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
      
      // Set Tax Exempt as default if not already set
      if (!form.watch('taxSettingId')) {
        form.setValue('taxSettingId', 'tax-exempt');
      }
    }
  }, [bookkeepingSettings]);

  // Create cheque mutation
  const createMutation = useMutation({
    mutationFn: async (data: ChequeFormData) => {
      if (!selectedBankAccountId) {
        throw new Error('Please select a bank account');
      }
      const response = await apiRequest('/api/cheques', { 
        method: 'POST',
        body: JSON.stringify({
        ...data, 
        clientId,
        bankAccountId: selectedBankAccountId,
        payeeType: data.vendorId ? 'vendor' : 'other'
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create cheque' }));
        throw new Error(error.message || 'Failed to create cheque');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Cheque created successfully' });
      form.reset();
      setSelectedBankAccountId(undefined);
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/cheques', clientId] });
      // Invalidate accounts query to refresh bank account nextChequeNumber
      queryClient.invalidateQueries({ queryKey: ['accounts/all', clientId] });
      // Invalidate vendor bills query to refresh bill status after payment
      queryClient.invalidateQueries({ queryKey: ['/api/crm/vendor-bills', selectedVendor] });
      // Also invalidate general bills queries
      queryClient.invalidateQueries({ queryKey: ['bills', clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-bills', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/bills/outstanding', selectedVendor] });
      // Invalidate AP aging report queries to refresh financial reports
      queryClient.invalidateQueries({ queryKey: ['/api/crm/vendors/aging-report'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      refetchCheques();
      // Refetch vendor bills if a vendor is selected
      if (selectedVendor && selectedVendor !== 'manual') {
        refetchVendorBills();
      }
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating cheque', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Print cheque mutation
  const printMutation = useMutation({
    mutationFn: (chequeId: number) => 
      apiRequest(`/api/cheques/${chequeId}/print`, { 
        method: 'POST',
        body: JSON.stringify({
        printerName: 'Default Printer',
        printFormat: 'standard'
        })
      }),
    onSuccess: () => {
      toast({ title: 'Cheque printed successfully' });
      refetchCheques();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error printing cheque', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Generate PDF mutation (downloads cheque as PDF)
  const generatePDFMutation = useMutation({
    mutationFn: async (chequeId: number) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
      }
      
      // Include clientId in query parameters
      const url = new URL(apiConfig.buildUrl(`/api/cheque/${chequeId}/pdf`));
      if (clientId) {
        url.searchParams.set('clientId', clientId.toString());
      }
      
      const response = await fetch(url.toString(), {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cheque-${chequeId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    },
    onSuccess: () => {
      toast({ title: 'PDF downloaded successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error generating PDF', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Handle vendor selection
  const handleVendorChange = (vendorId: string) => {
    setSelectedVendor(vendorId);
    setSelectedBillIds(new Set()); // Clear selected bills when vendor changes
    // Invalidate and refetch vendor bills when vendor changes
    if (vendorId && vendorId !== "manual") {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/vendor-bills', vendorId] });
      const vendor = vendors.find((v: any) => v.id.toString() === vendorId);
      if (vendor) {
        form.setValue('vendorId', vendor.id);
        form.setValue('payeeName', vendor.name);
        form.setValue('payeeAddress', vendor.address || '');
      }
    } else {
      form.setValue('vendorId', undefined);
      form.setValue('payeeName', '');
      form.setValue('payeeAddress', '');
    }
    // Clear bill-related form fields
    form.setValue('appliedToBillId', undefined);
    form.setValue('appliedAmount', undefined);
    form.setValue('referenceNumber', '');
  };

  // Calculate totals from line items and tax
  const calculateTotals = () => {
    const lines = form.watch('lines') || [];
    const appliedAmount = form.watch('appliedAmount');
    
    // Sum amounts from all line items - use invoiceAmount if available, otherwise use amount
    // Only count line items that have meaningful amounts (> 0)
    const expensesTotal = lines.reduce((sum, line) => {
      const amount = line.invoiceAmount || line.amount || 0;
      // Skip zero amounts
      return amount > 0 ? sum + amount : sum;
    }, 0);
    
    // Calculate tax based on selected tax setting (only if there are actual expenses)
    const taxSettingId = form.watch('taxSettingId') || 'tax-exempt';
    const selectedTax = taxSettings.find((tax: any) => tax.id === taxSettingId);
    const taxRate = selectedTax ? selectedTax.rate : 0;
    const taxAmount = expensesTotal > 0 ? expensesTotal * taxRate : 0;
    
    // If paying bills, include the applied amount in the cheque total
    // Defensive: preserve prior total if appliedAmount is undefined/empty (during editing)
    const billPaymentAmount = (appliedAmount !== undefined && appliedAmount !== null && !isNaN(appliedAmount) && appliedAmount > 0) 
      ? parseFloat(appliedAmount.toString()) 
      : 0;
    
    // Calculate total cheque amount
    const chequeAmount = billPaymentAmount + expensesTotal + taxAmount;
    
    // Defensive: if cheque amount would be 0 and we have bills selected, preserve minimum
    // This prevents validation errors when user is editing appliedAmount
    const finalChequeAmount = chequeAmount > 0 ? chequeAmount : (selectedBillIds.size > 0 ? 0.01 : 0);
    
    return {
      netAmount: expensesTotal,
      taxRate,
      taxAmount,
      chequeAmount: finalChequeAmount
    };
  };

  // Watch form values for automatic calculation
  const watchedLines = form.watch('lines');
  const watchedTaxSetting = form.watch('taxSettingId');
  const watchedAppliedAmount = form.watch('appliedAmount');

  useEffect(() => {
    const totals = calculateTotals();
    console.log('💰 Calculated totals:', totals);
    form.setValue('netAmount', totals.netAmount);
    form.setValue('taxRate', totals.taxRate);
    form.setValue('taxAmount', totals.taxAmount);
    form.setValue('amount', totals.chequeAmount);
    console.log('✅ Set form amount to:', totals.chequeAmount);
    
    // Sync amount with invoiceAmount for all line items to avoid validation errors
    const lines = form.getValues('lines') || [];
    lines.forEach((line: any, index: number) => {
      if (line.invoiceAmount !== undefined && line.invoiceAmount !== null) {
        form.setValue(`lines.${index}.amount`, line.invoiceAmount, { shouldValidate: false });
      }
    });
  }, [watchedLines, watchedTaxSetting, watchedAppliedAmount, taxSettings]);

  const onSubmit = (data: ChequeFormData) => {
    console.log('📝 Form submitted with data:', data);
    console.log('📊 Form validation errors:', form.formState.errors);
    
    // Validate bank account is selected
    if (!selectedBankAccountId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a bank account',
        variant: 'destructive'
      });
      return;
    }
    
    // Comprehensive validation: if bills selected, appliedAmount must be > 0
    const hasBillsSelected = (data.appliedBillIds && data.appliedBillIds.length > 0) || selectedBillIds.size > 0;
    
    if (hasBillsSelected) {
      // Get current value synchronously from form
      const currentAppliedAmount = form.getValues('appliedAmount');
      const appliedAmt = currentAppliedAmount !== undefined && currentAppliedAmount !== null ? currentAppliedAmount : 0;
      
      if (appliedAmt <= 0 || isNaN(appliedAmt)) {
        toast({
          title: 'Validation Error',
          description: 'Applied amount must be a valid number greater than zero when bills are selected. Please enter a payment amount or deselect the bills.',
          variant: 'destructive'
        });
        return;
      }
      
      // Ensure appliedBillIds is populated from component state if missing
      if (!data.appliedBillIds || data.appliedBillIds.length === 0) {
        data.appliedBillIds = Array.from(selectedBillIds);
      }
    }
    
    // Process data for backend: convert decimal fields to strings (backend expects strings for decimal columns)
    // Calculate total amount from lines if not set
    let finalAmount = data.amount || 0;
    if (!finalAmount || finalAmount === 0) {
      finalAmount = data.lines.reduce((sum, line) => sum + (Number(line.invoiceAmount || line.amount || 0) + Number(line.taxAmount || 0)), 0);
    }
    
      // Auto-generate cheque number if not provided
      let finalChequeNumber: string | undefined = undefined;
      if (data.chequeNumber && data.chequeNumber.trim()) {
        // Use provided cheque number
        finalChequeNumber = data.chequeNumber.trim();
        console.log('✓ Using provided cheque number:', finalChequeNumber);
      } else {
        // Auto-generate cheque number from bank account's nextChequeNumber
        const selectedBankAccount = (allAccounts as any[]).find((acc: any) => acc.id === selectedBankAccountId);
        if (selectedBankAccount) {
          const nextChequeNumber = selectedBankAccount.nextChequeNumber || 1001;
          finalChequeNumber = String(nextChequeNumber);
          console.log('✓ Auto-generated cheque number:', finalChequeNumber, '(from bank account nextChequeNumber:', nextChequeNumber, ')');
        } else {
          // Fallback if bank account not found
          finalChequeNumber = '1001';
          console.warn('⚠️ Bank account not found, using default cheque number:', finalChequeNumber);
        }
      }
    
    // Build data matching the backend schema (insertChequeSchema)
    const processedData: any = {
      // Required fields
      clientId: clientId!,
      bankAccountId: selectedBankAccountId!,
      payeeType: (data.vendorId ? 'vendor' : 'other') as 'vendor' | 'employee' | 'other',
      payeeName: data.payeeName,
      // Convert decimal fields to strings for backend
      amount: String(finalAmount),
      chequeDate: data.chequeDate,
      // Always include cheque number (either provided or auto-generated)
      chequeNumber: finalChequeNumber,
      // Optional fields - only include if they have values
      ...(data.vendorId && { vendorId: data.vendorId }),
      ...(data.payeeAddress && { payeeAddress: data.payeeAddress }),
      ...(data.memo && { memo: data.memo }),
      ...(data.referenceNumber && { referenceNumber: data.referenceNumber }),
      ...(data.appliedToBillId && { appliedToBillId: data.appliedToBillId }),
      ...(data.appliedBillIds && data.appliedBillIds.length > 0 && { appliedBillIds: data.appliedBillIds }),
      ...(data.appliedAmount && { appliedAmount: String(data.appliedAmount) }),
      // Lines array (will be processed separately by backend)
      lines: data.lines.map(line => ({
        description: line.description,
        expenseAccountId: Number(line.expenseAccountId),
        // Convert decimal fields to strings
        amount: String(line.invoiceAmount || line.amount || 0),
        taxAmount: line.taxAmount ? String(line.taxAmount) : undefined,
        taxCode: line.taxCode,
        taxAccountId: line.taxAccountId ? Number(line.taxAccountId) : undefined
      }))
    };
    
    console.log('📝 Processed data:', processedData);
    createMutation.mutate(processedData as any);
  };

  const onError = (errors: any) => {
    console.error('❌ Form validation errors:', errors);
    toast({
      title: 'Validation Error',
      description: 'Please check the form for errors',
      variant: 'destructive'
    });
  };

  const getStatusBadge = (status: string, isPrinted: boolean) => {
    if (status === 'void') return <Badge variant="destructive">Void</Badge>;
    if (isPrinted) return <Badge variant="default">Printed</Badge>;
    if (status === 'draft') return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-gray-600">Choose a client to manage their cheque payments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cheque Management</h2>
          <p className="text-gray-600">Create and manage cheque payments to vendors</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="cheques" className="space-y-6">
          <div className="flex justify-end gap-2">
            <ChequeUploadManager clientId={clientId} />
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Cheque
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Cheque 1234</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
              {/* Vendor Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="vendor">Select Vendor (Optional)</Label>
                  <Select value={selectedVendor} onValueChange={handleVendorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vendor or enter manually" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      <SelectItem value="manual">Enter manually</SelectItem>
                      {vendors.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chequeNumber">Cheque Number (Optional - Auto-generates if empty)</Label>
                  <Input
                    id="chequeNumber"
                    {...form.register('chequeNumber')}
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <Label htmlFor="chequeDate">Cheque Date</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    {...form.register('chequeDate')}
                  />
                </div>
              </div>

              {/* Bank Account Selection */}
              <div>
                <Label htmlFor="bankAccount">Bank Account *</Label>
                {clientId ? (
                  <AllAccountDropdown
                    clientId={clientId}
                    value={selectedBankAccountId?.toString() || ''}
                    onValueChange={(value) => setSelectedBankAccountId(value ? parseInt(value) : undefined)}
                    placeholder="Select bank account"
                    showAccountNumbers={true}
                    showAccountTypes={true}
                    excludeInactive={false}
                    searchable={true}
                    zIndex={10000}
                    className="w-full"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Please select a client first</div>
                )}
                {!selectedBankAccountId && (
                  <p className="text-sm text-red-500 mt-1">
                    Please select a bank account
                  </p>
                )}
              </div>

              {/* Cheque Template Selection */}
              <div>
                <Label htmlFor="templateId">Cheque Template</Label>
                <Select
                  value={form.watch('templateId')?.toString() || defaultChequeTemplate?.id?.toString() || ''}
                  onValueChange={(value) => form.setValue('templateId', value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Default Template" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="">Default Template</SelectItem>
                    {chequeDocumentTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} {template.isDefault && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payee Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payeeName">Payee Name *</Label>
                  <Input
                    id="payeeName"
                    {...form.register('payeeName')}
                    placeholder="Enter payee name"
                  />
                  {form.formState.errors.payeeName && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.payeeName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    {...form.register('referenceNumber')}
                    placeholder="Invoice #, PO #, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payeeAddress">Payee Address</Label>
                <Textarea
                  id="payeeAddress"
                  {...form.register('payeeAddress')}
                  placeholder="Enter payee address"
                  rows={2}
                />
              </div>

              {/* Vendor Balance and Outstanding Invoices Summary */}
              {selectedVendor && selectedVendor !== "manual" && (() => {
                // Show loading state while fetching bills
                if (isLoadingVendorBills) {
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-5 w-5 animate-pulse" />
                        <span className="text-sm">Loading vendor balance...</span>
                      </div>
                    </div>
                  );
                }
                
                const totalBalance = vendorBills.reduce((sum: number, bill: any) => 
                  sum + parseFloat(bill.balanceDue || 0), 0
                );
                const invoiceCount = vendorBills.length;
                const hasBalance = totalBalance > 0;
                
                return (
                  <div className={`${hasBalance ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className={`h-5 w-5 ${hasBalance ? 'text-blue-600' : 'text-green-600'}`} />
                        <div>
                          <p className="text-sm text-gray-600">Outstanding Balance</p>
                          <p className={`text-2xl font-bold ${hasBalance ? 'text-blue-600' : 'text-green-600'}`}>
                            ${totalBalance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className={`border-l ${hasBalance ? 'border-blue-300' : 'border-green-300'} h-12`}></div>
                      <div className="flex items-center gap-2">
                        <FileText className={`h-5 w-5 ${hasBalance ? 'text-blue-600' : 'text-green-600'}`} />
                        <div>
                          <p className="text-sm text-gray-600">Unpaid Invoices</p>
                          <p className={`text-2xl font-bold ${hasBalance ? 'text-blue-600' : 'text-green-600'}`}>
                            {invoiceCount}
                          </p>
                        </div>
                      </div>
                      {!hasBalance && (
                        <div className="ml-auto flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">No outstanding balance</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Outstanding Bills for Selected Vendor */}
              {vendorBills.length > 0 && (() => {
                const selectedTotal = vendorBills
                  .filter((bill: any) => selectedBillIds.has(bill.id))
                  .reduce((sum: number, bill: any) => sum + parseFloat(bill.balanceDue || 0), 0);
                
                const handleBillToggle = (billId: number) => {
                  const newSelected = new Set(selectedBillIds);
                  if (newSelected.has(billId)) {
                    newSelected.delete(billId);
                  } else {
                    newSelected.add(billId);
                  }
                  setSelectedBillIds(newSelected);
                  
                  // Update form values
                  if (newSelected.size > 0) {
                    const total = vendorBills
                      .filter((bill: any) => newSelected.has(bill.id))
                      .reduce((sum: number, bill: any) => sum + parseFloat(bill.balanceDue || 0), 0);
                    
                    // Store all selected bill IDs for backend processing
                    const billIdsArray = Array.from(newSelected);
                    form.setValue('appliedBillIds', billIdsArray);
                    
                    // If single bill, also set appliedToBillId for backward compatibility
                    if (newSelected.size === 1) {
                      form.setValue('appliedToBillId', billIdsArray[0]);
                    } else {
                      form.setValue('appliedToBillId', undefined);
                    }
                    
                    form.setValue('appliedAmount', total);
                    
                    const billNumbers = vendorBills
                      .filter((bill: any) => newSelected.has(bill.id))
                      .map((bill: any) => bill.billNumber)
                      .join(', ');
                    form.setValue('referenceNumber', billNumbers);
                  } else {
                    form.setValue('appliedToBillId', undefined);
                    form.setValue('appliedBillIds', undefined);
                    form.setValue('appliedAmount', undefined);
                    form.setValue('referenceNumber', '');
                  }
                };
                
                return (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Outstanding Bills for this Vendor</Label>
                      {selectedBillIds.size > 0 && (
                        <div className="text-sm font-semibold text-blue-600">
                          Selected: ${selectedTotal.toFixed(2)} ({selectedBillIds.size} {selectedBillIds.size === 1 ? 'bill' : 'bills'})
                        </div>
                      )}
                    </div>
                    <div className="border rounded-lg p-4 space-y-2">
                      {vendorBills.map((bill: any) => (
                        <div 
                          key={bill.id} 
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                            selectedBillIds.has(bill.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => handleBillToggle(bill.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBillIds.has(bill.id)}
                            onChange={() => handleBillToggle(bill.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{bill.billNumber}</span>
                              <span className="text-lg font-semibold">${bill.balanceDue}</span>
                            </div>
                            {bill.description && (
                              <p className="text-sm text-gray-600">{bill.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Applied Amount Field - Editable for Partial Payments */}
                    {selectedBillIds.size > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <Label htmlFor="appliedAmount">Applied Amount (Editable for Partial Payments)</Label>
                        <div className="flex gap-2 items-end mt-2">
                          <div className="flex-1">
                            <Input
                              id="appliedAmount"
                              type="number"
                              step="0.01"
                              value={form.watch('appliedAmount') ?? ''}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                // Preserve undefined for empty inputs to prevent collapsing to 0
                                if (inputValue === '' || inputValue === null) {
                                  form.setValue('appliedAmount', undefined, { shouldValidate: false });
                                } else {
                                  const value = parseFloat(inputValue);
                                  if (!isNaN(value)) {
                                    form.setValue('appliedAmount', value, { shouldValidate: true });
                                  }
                                }
                              }}
                              placeholder="Enter amount to apply"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const total = vendorBills
                                .filter((bill: any) => selectedBillIds.has(bill.id))
                                .reduce((sum: number, bill: any) => sum + parseFloat(bill.balanceDue || 0), 0);
                              form.setValue('appliedAmount', total, { shouldValidate: true });
                            }}
                          >
                            Reset to Full Amount
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Selected bills total: ${selectedTotal.toFixed(2)}. Edit this amount for partial payments.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Line Items */}
              <div>
                <Label>Expense Line Items</Label>
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-10 gap-2 items-center pb-2 border-b font-semibold text-sm">
                    <div className="col-span-2">Invoice Date</div>
                    <div className="col-span-2">Invoice Amount</div>
                    <div className="col-span-2">Account</div>
                    <div className="col-span-3">Comment</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {form.watch('lines')?.map((line, index) => (
                    <div key={index} className="grid grid-cols-10 gap-2 items-end">
                      <div className="col-span-2">
                        <Input
                          type="date"
                          {...form.register(`lines.${index}.invoiceDate`)}
                          placeholder="Invoice Date"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`lines.${index}.invoiceAmount`, { 
                            valueAsNumber: true,
                            onChange: (e) => {
                              const inputValue = e.target.value;
                              if (inputValue === '' || inputValue === null || inputValue === undefined) {
                                form.setValue(`lines.${index}.invoiceAmount`, 0);
                                form.setValue(`lines.${index}.amount`, 0, { shouldValidate: false });
                              } else {
                                const value = parseFloat(inputValue);
                                if (!isNaN(value)) {
                              form.setValue(`lines.${index}.invoiceAmount`, value);
                              form.setValue(`lines.${index}.amount`, value, { shouldValidate: false });
                                }
                              }
                            }
                          })}
                          placeholder="Invoice Amount *"
                        />
                        {form.formState.errors.lines?.[index]?.invoiceAmount && (
                          <p className="text-xs text-red-500 mt-1">
                            {form.formState.errors.lines[index]?.invoiceAmount?.message || 'Expected number, received nan'}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        {clientId ? (
                          <AllAccountDropdown
                            clientId={clientId}
                            value={line.expenseAccountId?.toString() || ''}
                            onValueChange={(value) => {
                              form.setValue(`lines.${index}.expenseAccountId`, value ? parseInt(value) : 0);
                              form.trigger(`lines.${index}.expenseAccountId`);
                            }}
                            placeholder="Account *"
                            showAccountNumbers={true}
                            showAccountTypes={true}
                            excludeInactive={false}
                            searchable={true}
                            zIndex={10000}
                            className="w-full"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground">Please select a client first</div>
                        )}
                        {form.formState.errors.lines?.[index]?.expenseAccountId && (
                          <p className="text-xs text-red-500 mt-1">
                            {form.formState.errors.lines[index]?.expenseAccountId?.message}
                          </p>
                        )}
                      </div>
                      <div className="col-span-3">
                        <Input
                          {...form.register(`lines.${index}.comment`)}
                          placeholder="Comment"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const lines = form.getValues('lines');
                            if (lines.length > 1) {
                              lines.splice(index, 1);
                              form.setValue('lines', lines);
                            }
                          }}
                        >
                          ×
                        </Button>
                      </div>
                      {/* Hidden fields - required by schema but auto-populated */}
                      <input
                        type="hidden"
                        {...form.register(`lines.${index}.description`)}
                        value={line.description || `Line Item ${index + 1}`}
                      />
                      <input
                        type="hidden"
                        {...form.register(`lines.${index}.taxAmount`, { valueAsNumber: true })}
                        value={0}
                      />
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const lines = form.getValues('lines') || [];
                      // Use first expense account if available, otherwise first account
                      const expenseAccounts = (allAccounts as any[]).filter((acc: any) => acc.type === 'expense');
                      const defaultAccount = expenseAccounts.length > 0 ? expenseAccounts[0] : (allAccounts.length > 0 ? allAccounts[0] : null);
                      
                      lines.push({
                        description: 'Line Item',
                        amount: 0,
                        expenseAccountId: defaultAccount ? defaultAccount.id : 0,
                        taxCode: 'HST',
                        taxAmount: 0,
                        taxAccountId: 5000,
                        invoiceDate: '',
                        invoiceAmount: 0,
                        comment: ''
                      });
                      form.setValue('lines', lines);
                    }}
                  >
                    Add Line Item
                  </Button>
                </div>
              </div>

              {/* Tax Option, Net Amount, and Cheque Amount */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taxSettingId">Tax Option</Label>
                  <Select
                    value={form.watch('taxSettingId') || 'tax-exempt'}
                    onValueChange={(value) => {
                      form.setValue('taxSettingId', value);
                      const selectedTax = taxSettings.find((tax: any) => tax.id === value);
                      if (selectedTax) {
                        form.setValue('taxRate', selectedTax.rate);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {taxSettings.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Loading tax settings...
                        </div>
                      ) : (
                        taxSettings.map((tax: any) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.displayText || tax.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Net Amount</Label>
                  <div className="text-xl font-semibold">${calculateTotals().netAmount.toFixed(2)}</div>
                </div>
                <div>
                  <Label>Cheque Amount</Label>
                  <div className="text-2xl font-bold">${calculateTotals().chequeAmount.toFixed(2)}</div>
                  {calculateTotals().taxAmount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      (Tax: ${calculateTotals().taxAmount.toFixed(2)})
                    </div>
                  )}
                </div>
              </div>

              {/* Memo */}
              <div>
                <Label htmlFor="memo">Memo</Label>
                <Input
                  id="memo"
                  {...form.register('memo')}
                  placeholder="Optional memo"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    setSelectedBankAccountId(undefined);
                    setCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Cheque'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>

          {/* Cheques List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCheques ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : cheques.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cheques found</h3>
              <p className="text-gray-600 mb-4">Create your first cheque to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque #</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cheques.map((cheque: any) => (
                  <TableRow key={cheque.id}>
                    <TableCell className="font-medium">{cheque.chequeNumber}</TableCell>
                    <TableCell>{cheque.payeeName}</TableCell>
                    <TableCell>${cheque.amount}</TableCell>
                    <TableCell>{new Date(cheque.chequeDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(cheque.status, cheque.isPrinted)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCheque(cheque)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {!cheque.isPrinted && (
                          <Button
                            size="sm"
                            onClick={() => printMutation.mutate(cheque.id)}
                            disabled={printMutation.isPending}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generatePDFMutation.mutate(cheque.id)}
                          disabled={generatePDFMutation.isPending}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cheque Details Modal */}
      {selectedCheque && (
        <Dialog open={!!selectedCheque} onOpenChange={() => setSelectedCheque(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cheque Details - {selectedCheque.chequeNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payee</Label>
                  <p className="font-medium">{selectedCheque.payeeName}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-bold text-lg">${selectedCheque.amount}</p>
                </div>
              </div>
              
              <div>
                <Label>Address</Label>
                <p>{selectedCheque.payeeAddress || 'No address provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <p>{new Date(selectedCheque.chequeDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedCheque.status, selectedCheque.isPrinted)}
                </div>
              </div>
              
              {selectedCheque.memo && (
                <div>
                  <Label>Memo</Label>
                  <p>{selectedCheque.memo}</p>
                </div>
              )}
              
              {selectedCheque.referenceNumber && (
                <div>
                  <Label>Reference</Label>
                  <p>{selectedCheque.referenceNumber}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                {!selectedCheque.isPrinted && (
                  <Button
                    onClick={() => printMutation.mutate(selectedCheque.id)}
                    disabled={printMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    Print Cheque
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => generatePDFMutation.mutate(selectedCheque.id)}
                  disabled={generatePDFMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Cheque Templates</h2>
                <p className="text-sm text-muted-foreground">Customize cheque printing layouts and field positions</p>
              </div>
              <Button onClick={() => setLocation('/document-templates/cheque/new')}>
                + New Template
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                {templatesLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No templates found</p>
                    <Button onClick={() => setLocation('/document-templates/cheque/new')}>
                      Create Your First Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
                      <div>Name</div>
                      <div>Description</div>
                      <div>Size</div>
                      <div>Status</div>
                      <div className="text-right">Actions</div>
                    </div>
                    {templates.map((template: any) => (
                      <div key={template.id} className="grid grid-cols-5 gap-4 py-3 border-b items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {template.isDefault && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {template.description || '—'}
                        </div>
                        <div className="text-sm">
                          {template.pageWidth} × {template.pageHeight}
                        </div>
                        <div>
                          <Badge variant={template.isActive ? 'default' : 'secondary'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {!template.isDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {}}
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTemplate(template)}
                            title="Preview template"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation(`/document-templates/cheque/${template.id}`)}
                            title="Edit template"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this template?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                            title="Delete template"
                            disabled={template.isDefault}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewTemplate && (
        <ChequePreviewModal
          open={!!previewTemplate}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          fields={(() => {
            // Convert all sections' fields to TemplateField format with proper Y offsets
            const allFields: TemplateField[] = [];
            let currentYOffset = 0;
            
            previewTemplate.sections.forEach(section => {
              const sectionHeightPoints = (section.heightInches || 0) * 72; // Convert to points
              
              Object.entries(section.fieldPositions).forEach(([key, position]) => {
                const baseFieldId = getBaseFieldId(key);
                const fieldDef = CHEQUE_FIELD_DEFINITIONS.find(f => f.id === baseFieldId);
                allFields.push({
                  id: `${section.id}-${key}`, // Unique ID per section
                  fieldKey: baseFieldId, // Use base ID for data mapping in preview/PDF
                  label: fieldDef?.label || baseFieldId,
                  fieldType: baseFieldId,
                  position: {
                    ...position,
                    y: position.y + currentYOffset, // Add section Y offset
                  },
                  value: `{${fieldDef?.label || baseFieldId}}`,
                  isRequired: registry?.cheque?.requiredFields?.includes(baseFieldId) || false,
                });
              });
              
              // Move to next section
              currentYOffset += sectionHeightPoints;
            });
            
            return allFields;
          })()}
          width={previewTemplate.pageWidth || 612}
          height={(() => {
            // Calculate total height from sections
            const totalHeightInches = previewTemplate.sections.reduce((sum, section) => sum + (section.heightInches || 0), 0);
            return totalHeightInches * 72; // Convert to points
          })()}
          templateName={previewTemplate.name}
          sections={previewTemplate.sections.map(s => ({ id: s.id, name: s.name, heightInches: s.heightInches || 0 }))}
        />
      )}
    </div>
  );
}