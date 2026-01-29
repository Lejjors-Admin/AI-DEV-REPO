import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDocumentTemplates, deleteDocumentTemplate, type DocumentTemplate, getDocumentTypeRegistry } from '@/lib/api/document-templates';
import { useSelectedClient } from '@/contexts/SelectedClientContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Printer, Eye, DollarSign, Calendar, Edit, Trash2, Star } from 'lucide-react';
import { ChequePreviewModal } from '@/components/template-editor/ChequePreviewModal';
import { CHEQUE_FIELD_DEFINITIONS } from '@/components/template-editor/FieldPalette';
import { TemplateField } from '@/components/template-editor/TemplateCanvas';
import { apiConfig } from "@/lib/api-config";
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const chequeSchema = z.object({
  bankAccountId: z.number(),
  payeeType: z.string().default('vendor'),
  payeeName: z.string().min(1, 'Payee name is required'),
  payeeAddress: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  chequeDate: z.string(),
  memo: z.string().optional(),
  referenceNumber: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    expenseAccountId: z.number().optional(),
    taxCode: z.string().optional(),
    taxAmount: z.number().default(0),
    taxAccountId: z.number().optional(),
  }))
});

type ChequeFormData = z.infer<typeof chequeSchema>;

export default function ChequeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { selectedClientId } = useSelectedClient();
  const [selectedCheque, setSelectedCheque] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'expense' | 'invoice'>('expense');
  const [activeTab, setActiveTab] = useState<'cheques' | 'templates'>('cheques');
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const clientId = selectedClientId || 2; // Use selected client or fallback for testing

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

  const form = useForm<ChequeFormData>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      bankAccountId: 1,
      payeeType: 'vendor',
      payeeName: '',
      payeeAddress: '',
      amount: 0,
      chequeDate: new Date().toISOString().split('T')[0],
      memo: '',
      referenceNumber: '',
      lines: [{
        description: '',
        amount: 0,
        expenseAccountId: 5310,
        taxCode: 'HST',
        taxAmount: 0,
        taxAccountId: 5000
      }]
    }
  });

  // Query cheques
  const { data: cheques = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/crm/cheques', clientId],
    queryFn: () => apiRequest("GET", `/api/crm/cheques/${clientId}`).then(res => res.json())
  });

  // Query document templates (cheque type)
  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['document-templates', 'cheque', clientId],
    queryFn: () => getDocumentTemplates('cheque', clientId),
    enabled: activeTab === 'templates' && !!clientId
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: number) => deleteDocumentTemplate(templateId, clientId),
    onSuccess: () => {
      toast({ title: 'Template deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['document-templates', 'cheque'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting template', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Query bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['/api/crm/bank-accounts', clientId],
    queryFn: () => apiRequest("GET", `/api/crm/bank-accounts/${clientId}`).then(res => res.json()).catch(() => [])
  });

  // Query vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/crm/vendors', clientId],
    queryFn: () => apiRequest("GET", `/api/crm/vendors?clientId=${clientId}`).then(res => res.json().then(data => data.data || [])).catch(() => []),
    enabled: !!clientId
  });

  // Query expense accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts', clientId],
    queryFn: () => apiRequest("GET", `/api/accounts/${clientId}`).then(res => res.json().then(data => data.accounts || [])).catch(() => [])
  });

  // Query outstanding bills for selected vendor
  const { data: outstandingBills = [] } = useQuery({
    queryKey: ['/api/crm/bills/outstanding', selectedVendor?.id],
    queryFn: () => selectedVendor?.id ? 
      apiRequest("GET", `/api/crm/bills/vendor/${selectedVendor.id}/outstanding`).then(res => res.json().then(data => data.data || [])).catch(() => []) : 
      Promise.resolve([]),
    enabled: !!selectedVendor?.id
  });

  // Create cheque mutation
  const createMutation = useMutation({
    mutationFn: (data: ChequeFormData) => 
      apiRequest('POST', '/api/crm/cheques', { ...data, clientId }),
    onSuccess: () => {
      toast({ title: 'Cheque created successfully' });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/crm/cheques'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating cheque', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Enhanced download function with proper blob handling
  const downloadCheque = async (chequeId: number) => {
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/cheque/${chequeId}/download`));
      
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cheque-${chequeId}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Cheque downloaded successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Download failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Enhanced print function with proper PDF handling
  const printCheque = async (chequeId: number) => {
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/cheque/${chequeId}/download`));
      
      if (!response.ok) throw new Error('Print failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({ title: 'Cheque sent to printer' });
    } catch (error: any) {
      toast({ 
        title: 'Print failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Print cheque mutation (backup)
  const printMutation = useMutation({
    mutationFn: (chequeId: number) => printCheque(chequeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/cheques'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error printing cheque', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Handle vendor selection
  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id.toString() === vendorId);
    setSelectedVendor(vendor);
    
    if (vendor) {
      // Auto-populate payee information from vendor
      form.setValue('payeeName', vendor.name || vendor.companyName || '');
      if (vendor.address) {
        const fullAddress = [vendor.address, vendor.city, vendor.province, vendor.postalCode]
          .filter(Boolean)
          .join(', ');
        form.setValue('payeeAddress', fullAddress);
      }
    }
  };

  // Handle invoice selection
  const handleInvoiceChange = (billId: string) => {
    const bill = outstandingBills.find(b => b.id.toString() === billId);
    setSelectedInvoice(bill);
    
    if (bill) {
      // Auto-populate amount and memo from bill
      form.setValue('amount', parseFloat(bill.balanceDue || bill.totalAmount));
      form.setValue('memo', `Payment for invoice ${bill.billNumber}`);
      
      // For invoice payments, we don't need expense line items as the expense 
      // was already recorded when the bill was created
      form.setValue('lines', []);
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = (type: 'expense' | 'invoice') => {
    setPaymentType(type);
    if (type === 'expense') {
      // Reset invoice selection and add default expense line
      setSelectedInvoice(null);
      form.setValue('lines', [{
        description: '',
        amount: 0,
        expenseAccountId: 5310,
        taxCode: 'HST',
        taxAmount: 0,
        taxAccountId: 5000
      }]);
    } else {
      // Clear expense lines for invoice payments
      form.setValue('lines', []);
    }
  };

  const onSubmit = (data: ChequeFormData) => {
    createMutation.mutate(data);
  };

  const handlePrint = (chequeId: number) => {
    printMutation.mutate(chequeId);
  };

  const getStatusBadge = (status: string, isPrinted: boolean) => {
    if (status === 'void') return <Badge variant="destructive">Void</Badge>;
    if (isPrinted) return <Badge variant="default">Printed</Badge>;
    if (status === 'draft') return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Manage vendors and purchase bills</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cheques' | 'templates')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="cheques" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cheque Management</h2>
            <Button onClick={() => refetch()}>Refresh</Button>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Cheque */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Cheque</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Payment Type Selection */}
              <div>
                <Label>Payment Type</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={paymentType}
                  onChange={(e) => handlePaymentTypeChange(e.target.value as 'expense' | 'invoice')}
                >
                  <option value="expense">New Expense Payment</option>
                  <option value="invoice">Pay Existing Invoice</option>
                </select>
              </div>

              {/* Vendor Selection */}
              <div>
                <Label htmlFor="vendor">Select Vendor</Label>
                <select 
                  id="vendor"
                  className="w-full p-2 border rounded-md"
                  onChange={(e) => handleVendorChange(e.target.value)}
                  value={selectedVendor?.id || ''}
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name || vendor.companyName || `Vendor ${vendor.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Selection - Only show for invoice payments */}
              {paymentType === 'invoice' && selectedVendor && (
                <div>
                  <Label htmlFor="invoice">Select Invoice</Label>
                  <select 
                    id="invoice"
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    value={selectedInvoice?.id || ''}
                  >
                    <option value="">Choose an invoice...</option>
                    {outstandingBills.map((bill: any) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.billNumber} - ${bill.balanceDue || bill.totalAmount} - Due: {(() => {
                          try {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(bill.dueDate)) {
                              const [year, month, day] = bill.dueDate.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                              });
                            }
                            const date = new Date(bill.dueDate);
                            return date.toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: '2-digit'
                            });
                          } catch (error) {
                            return bill.dueDate;
                          }
                        })()}
                      </option>
                    ))}
                  </select>
                  {outstandingBills.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">No outstanding invoices for this vendor</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payeeName">Payee Name</Label>
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
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...form.register('amount', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.amount && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Smaller payee address field */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payeeAddress">Payee Address</Label>
                  <Input
                    id="payeeAddress"
                    {...form.register('payeeAddress')}
                    placeholder="Enter payee address"
                  />
                </div>
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    {...form.register('referenceNumber')}
                    placeholder="Optional reference"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chequeDate">Cheque Date</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    {...form.register('chequeDate')}
                  />
                </div>
                <div>
                  <Label htmlFor="memo">Memo</Label>
                  <Input
                    id="memo"
                    {...form.register('memo')}
                    placeholder="Optional memo"
                  />
                </div>
              </div>

              {/* Expense Line Items - Only show for expense payments */}
              {paymentType === 'expense' && (
                <div>
                  <Label>Expense Details</Label>
                  <div className="border rounded-md p-4 space-y-3">
                    <div>
                      <Label htmlFor="lineDescription">Description</Label>
                      <Input
                        id="lineDescription"
                        {...form.register('lines.0.description')}
                        placeholder="Enter expense description"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lineAccount">Expense Account</Label>
                        <select 
                          id="lineAccount"
                          className="w-full p-2 border rounded-md"
                          {...form.register('lines.0.expenseAccountId', { valueAsNumber: true })}
                        >
                          <option value="">Select account...</option>
                          {accounts.filter((account: any) => account.type === 'expense').map((account: any) => (
                            <option key={account.id} value={account.id}>
                              {account.accountNumber} - {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="taxCode">Tax Code</Label>
                        <select 
                          id="taxCode"
                          className="w-full p-2 border rounded-md"
                          {...form.register('lines.0.taxCode')}
                        >
                          <option value="">No Tax</option>
                          <option value="HST">HST 13%</option>
                          <option value="GST">GST 5%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentType === 'invoice' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Invoice Payment:</strong> Expense details will be automatically taken from the selected invoice. 
                    No additional expense entries needed to prevent double counting.
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Cheque'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Cheques */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cheques.data?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No cheques found. Create your first cheque to get started.
                </p>
              ) : (
                cheques.data?.map((cheque: any) => (
                  <div key={cheque.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{cheque.chequeNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {cheque.payeeName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${cheque.amount}</div>
                        {getStatusBadge(cheque.status, cheque.isPrinted)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(cheque.chequeDate).toLocaleDateString()}
                    </div>
                    
                    {cheque.memo && (
                      <div className="text-sm italic text-muted-foreground">
                        {cheque.memo}
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCheque(cheque)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCheque(cheque.id)}
                        className="flex items-center gap-1"
                      >
                        <DollarSign className="w-4 h-4" />
                        Download
                      </Button>
                      
                      {!cheque.isPrinted && cheque.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => printCheque(cheque.id)}
                          disabled={printMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cheque Details Modal */}
      {selectedCheque && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Cheque Details - {selectedCheque.chequeNumber}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedCheque(null)}
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {!selectedCheque.isPrinted && selectedCheque.status === 'draft' && (
                  <Button
                    onClick={() => handlePrint(selectedCheque.id)}
                    disabled={printMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    Print Cheque
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
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
                  {templates.map((template: DocumentTemplate) => (
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