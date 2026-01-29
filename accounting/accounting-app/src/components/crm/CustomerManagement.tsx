/**
 * Customer Management Component - Customers Only for Income Management
 * 
 * This component provides customer management specifically for the Income Management page.
 * It only shows customers (not vendors) and includes invoice history and payment tracking.
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, User, Phone, Mail, MapPin, CreditCard, FileText, DollarSign, Calendar, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from "@/lib/api-config";

interface Customer {
  id: number;
  clientId: number;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  businessNumber?: string;
  website?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerFormData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  businessNumber: string;
  website: string;
  taxId: string;
  paymentTerms: string;
  creditLimit: number;
  notes: string;
}

interface CustomerInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paidAmount: number;
  balanceDue: number;
}

interface CustomerManagementProps {
  clientId: number;
}

export default function CustomerManagement({ clientId }: CustomerManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Canada',
    businessNumber: '',
    website: '',
    taxId: '',
    paymentTerms: 'Net 30',
    creditLimit: 0,
    notes: ''
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Fetch customers only (not vendors)
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: async () => {
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

  // Fetch all customer invoices for summary
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['all-invoices', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/crm/invoices/${clientId}`), {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const result = await response.json();
      console.log('📊 Fetched invoices for customer totals:', result.data);
      return result.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to ensure fresh data
    staleTime: 0 // Mark data as stale immediately
  });

  // Fetch customer invoices for selected customer detail
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ['customer-invoices', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/customer/${selectedCustomer.id}/invoices`), {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch customer invoices');
      const result = await response.json();
      return result.data as CustomerInvoice[];
    },
    enabled: !!selectedCustomer?.id
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl('/api/crm/contacts'), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ 
          ...customerData, 
          clientId,
          type: 'customer' // Use 'type' field as expected by backend schema
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to create customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: 'Customer created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating customer', description: error.message, variant: 'destructive' });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, customerData }: { id: number; customerData: Partial<CustomerFormData> }) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contact/${id}`), {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(customerData)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to update customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      setShowEditDialog(false);
      setSelectedCustomer(null);
      resetForm();
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating customer', description: error.message, variant: 'destructive' });
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/crm/contact/${id}`), {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to delete customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', clientId] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting customer', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada',
      businessNumber: '',
      website: '',
      taxId: '',
      paymentTerms: 'Net 30',
      creditLimit: 0,
      notes: ''
    });
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      companyName: customer.companyName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      province: customer.province || '',
      postalCode: customer.postalCode || '',
      country: customer.country || 'Canada',
      businessNumber: customer.businessNumber || '',
      website: customer.website || '',
      taxId: customer.taxId || '',
      paymentTerms: customer.paymentTerms || 'Net 30',
      creditLimit: customer.creditLimit || 0,
      notes: customer.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, customerData: formData });
    } else {
      createCustomerMutation.mutate(formData);
    }
  };

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
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

  const calculateCustomerTotals = (customer: Customer) => {
    const customerInvoices = allInvoices.filter((inv: any) => inv.customerId === customer.id);
    console.log(`📊 Customer ${customer.name} (ID: ${customer.id}) invoices:`, customerInvoices);
    
    const totalBalance = customerInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || '0'), 0);
    const totalPaid = customerInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.paidAmount || '0'), 0);
    const balanceDue = customerInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.balanceDue || '0'), 0);
    const overdue = customerInvoices.filter((inv: any) => inv.status === 'overdue').length;
    
    console.log(`📊 Customer ${customer.name} totals:`, { 
      totalBalance, 
      totalPaid, 
      balanceDue,
      overdue,
      invoiceCount: customerInvoices.length
    });
    
    return { 
      totalBalance, 
      totalPaid, 
      balanceDue,
      overdue,
      invoiceCount: customerInvoices.length
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading customers: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer Management</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="businessNumber">Business Number</Label>
                  <Input
                    id="businessNumber"
                    value={formData.businessNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessNumber: e.target.value }))}
                    placeholder="e.g., 123456789RC0001"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="www.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="taxId">Tax ID (HST/GST)</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <select
                    id="paymentTerms"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCustomerMutation.isPending}>
                  {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customers List */}
      {customers && customers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No customers found.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowAddDialog(true)}
            >
              Add Your First Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Invoice Total</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => {
                  const totals = calculateCustomerTotals(customer);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.companyName && (
                            <div className="text-sm text-gray-600">{customer.companyName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${totals.totalBalance.toFixed(2)}
                        {totals.invoiceCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {totals.invoiceCount} invoice{totals.invoiceCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-medium">
                          ${totals.totalPaid.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${totals.balanceDue > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                          ${totals.balanceDue.toFixed(2)}
                        </span>
                        {totals.overdue > 0 && (
                          <div className="text-xs text-red-600">
                            {totals.overdue} overdue
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewCustomerDetails(customer)}
                            title="View Details"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/customers/${customer.id}/statement`)}
                            title="View Statement"
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCustomerMutation.mutate(customer.id)}
                            disabled={deleteCustomerMutation.isPending}
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.name} {selectedCustomer?.companyName && `(${selectedCustomer.companyName})`}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="details">Customer Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoices" className="space-y-4">
                {customerInvoices && customerInvoices.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Invoice History</h3>
                    <div className="space-y-2">
                      {customerInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${Number(invoice.totalAmount).toFixed(2)}</p>
                            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No invoices found for this customer</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-4">
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Payment history will be displayed here</p>
                  <p className="text-sm text-gray-400 mt-2">Feature coming soon</p>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Information</Label>
                    <div className="space-y-2 mt-2">
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <div className="space-y-2 mt-2">
                      {selectedCustomer.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p>{selectedCustomer.address}</p>
                            <p>{selectedCustomer.city}, {selectedCustomer.province} {selectedCustomer.postalCode}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Customer Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-companyName">Company Name</Label>
                <Input
                  id="edit-companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-businessNumber">Business Number</Label>
                <Input
                  id="edit-businessNumber"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessNumber: e.target.value }))}
                  placeholder="e.g., 123456789RC0001"
                />
              </div>
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-taxId">Tax ID (HST/GST)</Label>
                <Input
                  id="edit-taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-paymentTerms">Payment Terms</Label>
                <select
                  id="edit-paymentTerms"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-creditLimit">Credit Limit</Label>
                <Input
                  id="edit-creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-province">Province</Label>
                <Input
                  id="edit-province"
                  value={formData.province}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-postalCode">Postal Code</Label>
                <Input
                  id="edit-postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <textarea
                id="edit-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCustomerMutation.isPending}>
                {updateCustomerMutation.isPending ? 'Updating...' : 'Update Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}