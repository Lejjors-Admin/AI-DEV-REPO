import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Building, Edit, Trash2, Mail, Phone, MapPin, Globe, FileText, User, Upload, FileSpreadsheet, Check, X, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import * as XLSX from 'xlsx';
import VendorStatement from "./VendorStatement";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  taxNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  defaultAccountId: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorManagementProps {
  clientId: number | null;
}

export default function VendorManagement({ clientId }: VendorManagementProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [selectedVendorForStatement, setSelectedVendorForStatement] = useState<any>(null);
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      taxNumber: "",
      paymentTerms: "Net 30",
      defaultAccountId: "",
      notes: ""
    }
  });

  // Fetch vendors
  const { data: vendorsResponse, isLoading: vendorsLoading, refetch: refetchVendors } = useQuery({
    queryKey: ['/api/crm/vendors', clientId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/crm/vendors?clientId=${clientId}`);
        return response.json();
      } catch (error) {
        console.error('Vendor fetch error:', error);
        throw error;
      }
    },
    enabled: !!clientId,
  });
  
  const vendors = vendorsResponse?.data || [];

  // Fetch accounts for defaultAccountId dropdown
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts', clientId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/accounts?clientId=${clientId}`);
        return response.json();
      } catch (error) {
        console.error('Account fetch error:', error);
        throw error;
      }
    },
    enabled: !!clientId,
  });
  
  const accounts = accountsResponse?.accounts || [];

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/crm/vendors', {
      vendorName: data.name, // Map frontend 'name' to backend 'vendorName'
      companyName: data.companyName,
      contactPerson: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      country: data.country,
      taxId: data.taxNumber,
      paymentTerms: data.paymentTerms,
      clientId,
      contactType: 'vendor',
      defaultAccountId: data.defaultAccountId ? parseInt(data.defaultAccountId) : null,
      notes: data.notes
    }),
    onSuccess: () => {
      toast({ title: 'Vendor created successfully!' });
      setShowCreateDialog(false);
      form.reset();
      refetchVendors();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating vendor', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/crm/vendors/${editingVendor.id}?clientId=${clientId}`, {
      vendorName: data.name,
      companyName: data.companyName,
      contactPerson: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      country: data.country,
      taxId: data.taxNumber,
      paymentTerms: data.paymentTerms,
      defaultAccountId: data.defaultAccountId ? parseInt(data.defaultAccountId) : null,
      notes: data.notes
    }),
    onSuccess: () => {
      toast({ title: 'Vendor updated successfully!' });
      setShowCreateDialog(false);
      setEditingVendor(null);
      form.reset();
      refetchVendors();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating vendor', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: (vendorId: number) => apiRequest('DELETE', `/api/crm/vendors/${vendorId}`),
    onSuccess: () => {
      toast({ title: 'Vendor deleted successfully!' });
      refetchVendors();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting vendor', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Bulk delete vendors mutation
  const bulkDeleteVendorsMutation = useMutation({
    mutationFn: async (vendorIds: number[]) => {
      const response = await apiRequest('DELETE', '/api/crm/vendors/bulk', {
        vendorIds,
        clientId
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ 
          title: 'Bulk delete completed', 
          description: `${data.successCount} vendor(s) deleted${data.errorCount > 0 ? `, ${data.errorCount} failed` : ''}`,
          variant: data.errorCount > 0 ? 'destructive' : 'default'
        });
        setSelectedVendors(new Set());
        setShowBulkDeleteConfirm(false);
        refetchVendors();
      } else {
        toast({ 
          title: 'Bulk delete failed', 
          description: data.message || 'Failed to delete vendors',
          variant: 'destructive' 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting vendors', 
        description: error.message || 'Failed to delete vendors',
        variant: 'destructive' 
      });
    }
  });

  const handleSelectVendor = (vendorId: number, checked: boolean) => {
    setSelectedVendors(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(vendorId);
      } else {
        newSet.delete(vendorId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVendors(new Set(vendors.map((v: any) => v.id)));
    } else {
      setSelectedVendors(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedVendors.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    if (selectedVendors.size === 0) return;
    bulkDeleteVendorsMutation.mutate(Array.from(selectedVendors));
  };

  const onSubmit = (data: VendorFormData) => {
    if (editingVendor) {
      updateVendorMutation.mutate(data);
    } else {
      createVendorMutation.mutate(data);
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    form.reset({
      name: vendor.name || "",
      companyName: vendor.companyName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      province: vendor.province || "",
      postalCode: vendor.postalCode || "",
      country: vendor.country || "Canada",
      taxNumber: vendor.taxId || "",
      paymentTerms: vendor.paymentTerms || "Net 30",
      defaultAccountId: vendor.defaultAccountId?.toString() || "",
      notes: vendor.notes || ""
    });
    setShowCreateDialog(true);
  };

  // Preview vendors from uploaded file
  const previewVendorsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary
      
      const response = await fetch(apiConfig.buildUrl('/api/crm/vendors/upload/preview'), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Failed to preview file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setUploadPreview(data);
        setShowPreviewDialog(true);
        setShowUploadDialog(false);
        toast({
          title: 'Preview ready',
          description: `Found ${data.previewCount} vendors to import (${data.totalRows} total rows)`
        });
      } else {
        toast({
          title: 'Preview failed',
          description: data.message || 'Failed to parse file',
          variant: 'destructive'
        });
      }
      setIsPreviewing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error previewing file',
        description: error.message || 'Please check the file format and try again.',
        variant: 'destructive'
      });
      setIsPreviewing(false);
    }
  });

  // Bulk import vendors
  const bulkImportVendorsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId!.toString());
      
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary
      
      const response = await fetch(apiConfig.buildUrl('/api/crm/vendors/upload'), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Failed to import vendors');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Import completed',
          description: `Successfully imported ${data.successCount} vendors${data.errorCount > 0 ? `, ${data.errorCount} errors` : ''}`
        });
        setUploadResults(data.results || []);
        setShowPreviewDialog(false);
        setUploadingFile(null);
        refetchVendors();
      } else {
        toast({
          title: 'Import failed',
          description: data.message || 'Failed to import vendors',
          variant: 'destructive'
        });
      }
      setIsImporting(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error importing vendors',
        description: error.message || 'Failed to import vendors',
        variant: 'destructive'
      });
      setIsImporting(false);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(file);
    setIsPreviewing(true);
    previewVendorsMutation.mutate(file);
  };

  const handleBulkImport = () => {
    if (!uploadingFile) return;
    setIsImporting(true);
    bulkImportVendorsMutation.mutate(uploadingFile);
  };

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-gray-600">Choose a client to manage their vendors</p>
        </div>
      </div>
    );
  }

  const expenseAccounts = accounts.filter((account: any) => 
    account.type === 'expense' || account.type === 'cost_of_sales'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Vendor Management</h2>
          <p className="text-muted-foreground">Manage your vendor database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Vendors
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
                <DialogDescription>
                  {editingVendor ? 'Update vendor information' : 'Enter vendor details to add them to your database'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="vendor@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input placeholder="ON" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="K1A 0A6" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <FormControl>
                            <Input placeholder="Net 30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Expense Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {expenseAccounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.accountNumber} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateDialog(false);
                        setEditingVendor(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                    >
                      {(createVendorMutation.isPending || updateVendorMutation.isPending) ? 'Saving...' : 
                       editingVendor ? 'Update Vendor' : 'Create Vendor'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedVendors.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedVendors.size} vendor{selectedVendors.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVendors(new Set())}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleteVendorsMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedVendors.size})
            </Button>
          </div>
        </div>
      )}

      {/* Vendor List */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors ({vendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
              <p className="text-gray-600 mb-4">Add your first vendor to get started</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVendors.size === vendors.length && vendors.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all vendors"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Default Account</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor: any) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVendors.has(vendor.id)}
                        onCheckedChange={(checked) => handleSelectVendor(vendor.id, checked as boolean)}
                        aria-label={`Select ${vendor.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.companyName || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1" />
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-3 h-3 mr-1" />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vendor.paymentTerms || 'Net 30'}</TableCell>
                    <TableCell>
                      {vendor.defaultAccountId ? 
                        accounts.find((acc: any) => acc.id === vendor.defaultAccountId)?.name || 'Account not found'
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVendorForStatement(vendor);
                            setShowStatementDialog(true);
                          }}
                          title="View Statement"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          title="Edit Vendor"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this vendor?')) {
                              deleteVendorMutation.mutate(vendor.id);
                            }
                          }}
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Vendors from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with vendor information. The file should contain columns for vendor details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Click to upload an Excel file (.xlsx, .xls)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isPreviewing}
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? 'Processing...' : 'Choose File'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Vendors to Import</DialogTitle>
            <DialogDescription>
              Review the parsed vendor data before importing. {uploadPreview?.totalRows && `Total rows: ${uploadPreview.totalRows}, showing ${uploadPreview.previewCount} vendors.`}
            </DialogDescription>
          </DialogHeader>
          
          {uploadPreview?.data && uploadPreview.data.length > 0 ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="min-w-[50px]">Row</TableHead>
                        <TableHead className="min-w-[120px]">Vendor #</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[150px]">Company</TableHead>
                        <TableHead className="min-w-[150px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Phone</TableHead>
                        <TableHead className="min-w-[150px]">Address</TableHead>
                        <TableHead className="min-w-[100px]">City</TableHead>
                        <TableHead className="min-w-[100px]">Province</TableHead>
                        <TableHead className="min-w-[100px]">Postal Code</TableHead>
                        <TableHead className="min-w-[120px]">Payment Terms</TableHead>
                        <TableHead className="min-w-[100px]">G/L Account</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadPreview.data.map((vendor: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{vendor.row}</TableCell>
                          <TableCell className="font-mono text-xs">{vendor.vendorNumber || '-'}</TableCell>
                          <TableCell className="font-medium">{vendor.name || '-'}</TableCell>
                          <TableCell>{vendor.companyName || '-'}</TableCell>
                          <TableCell>{vendor.email || '-'}</TableCell>
                          <TableCell>{vendor.phone || '-'}</TableCell>
                          <TableCell className="text-sm">{vendor.address || '-'}</TableCell>
                          <TableCell>{vendor.city || '-'}</TableCell>
                          <TableCell>{vendor.province || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{vendor.postalCode || '-'}</TableCell>
                          <TableCell>{vendor.paymentTerms || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{vendor.glAccount || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {uploadPreview.previewCount} vendors ready to import
                  {uploadPreview.totalRows > uploadPreview.previewCount && ` (${uploadPreview.totalRows - uploadPreview.previewCount} more rows will be processed)`}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreviewDialog(false);
                      setUploadPreview(null);
                      setUploadingFile(null);
                    }}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={isImporting || !uploadingFile}
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Import {uploadPreview.previewCount} Vendors
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No vendor data found in the file.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedVendors.size} vendor{selectedVendors.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={bulkDeleteVendorsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteVendorsMutation.isPending}
            >
              {bulkDeleteVendorsMutation.isPending ? 'Deleting...' : `Delete ${selectedVendors.size} Vendor${selectedVendors.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Statement Dialog */}
      {selectedVendorForStatement && (
        <VendorStatement
          vendorId={selectedVendorForStatement.id}
          vendorName={selectedVendorForStatement.companyName || selectedVendorForStatement.name}
          open={showStatementDialog}
          onClose={() => {
            setShowStatementDialog(false);
            setSelectedVendorForStatement(null);
          }}
        />
      )}
    </div>
  );
}