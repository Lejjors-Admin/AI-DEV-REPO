import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserCheck,
  Building,
  Plus,
  Edit,
  Eye,
  Mail,
  Phone,
  LinkIcon,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Download,
  Trash2,
  UserX,
  UserPlus,
  MoreHorizontal,
  Columns,
  X,
  FileText,
  Grid3X3,
} from "lucide-react";

// Schemas
const contactPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  title: z.string().optional(),
  country: z.string().default("Canada"),
  firmId: z.number().default(1),
  isActive: z.boolean().default(true)
});

const relationshipSchema = z.object({
  clientId: z.number().positive("Please select a client"),
  relationshipType: z.string(),
  isPrimaryContact: z.boolean(),
  canViewFinancials: z.boolean(),
  canApproveWork: z.boolean(),
  canReceiveInvoices: z.boolean(),
  isActive: z.boolean(),
  notes: z.string().optional()
});

type ContactPerson = {
  id: number | string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  firmId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  source?: string; // 'client' or undefined for manual
  clientId?: number; // Reference to client if source is 'client'
  clientRelationships?: Relationship[];
};

type Client = {
  id: number;
  name: string;
  email: string;
  industry: string;
  status: string;
};

type Relationship = {
  id: number;
  clientId: number;
  contactPersonId: number;
  relationshipType: string;
  isPrimaryContact: boolean;
  canViewFinancials: boolean;
  canApproveWork: boolean;
  canReceiveInvoices: boolean;
  isActive: boolean;
  createdAt: string;
};

export function ContactPersonManagement() {
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [selectedContactPerson, setSelectedContactPerson] = useState<ContactPerson | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | null>(null);
  
  // Table state management
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    contact: true,
    companies: true,
    status: true,
    created: true,
    actions: true,
  });
  
  // Bulk operations
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: contactPersonsResponse, isLoading: loadingContactPersons, error: contactError, isError } = useQuery({
    queryKey: ["/api/contact-management/contacts"],
    queryFn: async () => {
      console.log('📋 Frontend: Fetching contacts from /api/contact-management/contacts');
      try {
        const response = await apiRequest("GET", "/api/contact-management/contacts");
        console.log('📋 Frontend: Response status:', response.status, response.statusText);
        if (!response.ok) {
          const error = await response.text();
          console.error('❌ Frontend: Failed to fetch contacts:', response.status, error);
          throw new Error(`Failed to fetch contacts: ${response.status} - ${error}`);
        }
        const data = await response.json();
        console.log('📋 Frontend: Contacts response:', data);
        console.log('📋 Frontend: Response structure:', {
          hasData: !!data.data,
          dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
          dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
          hasSuccess: !!data.success,
          count: data.count
        });
        return data;
      } catch (error: any) {
        console.error('❌ Frontend: Exception in queryFn:', error);
        console.error('❌ Frontend: Error stack:', error?.stack);
        throw error;
      }
    },
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
  
  console.log('📋 Frontend: contactPersonsResponse:', contactPersonsResponse);
  console.log('📋 Frontend: contactPersonsResponse?.data:', contactPersonsResponse?.data);
  console.log('📋 Frontend: contactError:', contactError);
  
  const contactPersons = contactPersonsResponse?.data || [];
  console.log('📋 Frontend: Final contactPersons array length:', contactPersons.length);

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const relationships = useMemo(
    () =>
      contactPersons.flatMap((contact: ContactPerson) =>
        Array.isArray(contact.clientRelationships) ? contact.clientRelationships : []
      ),
    [contactPersons]
  );

  // Forms
  const contactPersonForm = useForm({
    resolver: zodResolver(contactPersonSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      title: "",
      country: "Canada",
      firmId: 1,
      isActive: true,
    },
  });

  const relationshipForm = useForm({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      clientId: undefined,
      relationshipType: "owner",
      isPrimaryContact: true,
      canViewFinancials: true,
      canApproveWork: true,
      canReceiveInvoices: true,
      isActive: true,
      notes: "",
    },
  });

  const editContactPersonForm = useForm({
    resolver: zodResolver(contactPersonSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      title: "",
      country: "Canada",
      firmId: 1,
      isActive: true,
    },
  });

  // Pre-populate edit form when contact is selected
  useEffect(() => {
    if (selectedContactPerson && showEditDialog) {
      editContactPersonForm.reset({
        name: selectedContactPerson.name || "",
        email: selectedContactPerson.email || "",
        phone: selectedContactPerson.phone || "",
        title: selectedContactPerson.title || "",
        country: "Canada",
        firmId: selectedContactPerson.firmId,
        isActive: selectedContactPerson.isActive,
      });
    }
  }, [selectedContactPerson, showEditDialog, editContactPersonForm]);

  // Reset create form when dialog closes
  useEffect(() => {
    if (!showCreateDialog) {
      contactPersonForm.reset({
        name: "",
        email: "",
        phone: "",
        title: "",
        country: "Canada",
        firmId: 1,
        isActive: true,
      });
    }
  }, [showCreateDialog, contactPersonForm]);

  // Mutations
  const createContactPersonMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contact-management/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ title: "Success", description: "Contact person created successfully" });
      setShowCreateDialog(false);
      contactPersonForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact person",
        variant: "destructive",
      });
    },
  });

  const createRelationshipMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contact-management/relationships", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ title: "Success", description: "Client-contact relationship created successfully" });
      setShowLinkDialog(false);
      relationshipForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create relationship",
        variant: "destructive",
      });
    },
  });

  const updateContactPersonMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/contact-management/contacts/${selectedContactPerson?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ title: "Success", description: "Contact person updated successfully" });
      setShowEditDialog(false);
      setSelectedContactPerson(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact person",
        variant: "destructive",
      });
    },
  });

  const deleteContactPersonMutation = useMutation({
    mutationFn: (contactId: number) =>
      apiRequest("DELETE", `/api/contact-management/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ title: "Success", description: "Contact person deleted successfully" });
      setShowDeleteDialog(false);
      setSelectedContacts(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact person",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteContactsMutation = useMutation({
    mutationFn: async (contactIds: number[]) => {
      // Use Promise.all to delete multiple contacts
      const deletePromises = contactIds.map(id => 
        apiRequest("DELETE", `/api/contact-management/contacts/${id}`)
      );
      return Promise.all(deletePromises);
    },
    onSuccess: (_, contactIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ 
        title: "Success", 
        description: `Successfully deleted ${contactIds.length} contact person(s)` 
      });
      setShowDeleteDialog(false);
      setSelectedContacts(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact persons",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateContactsMutation = useMutation({
    mutationFn: async ({ contactIds, isActive }: { contactIds: number[]; isActive: boolean }) => {
      // Use Promise.all to update multiple contacts
      const updatePromises = contactIds.map(id => 
        apiRequest("PUT", `/api/contact-management/contacts/${id}`, { isActive })
      );
      return Promise.all(updatePromises);
    },
    onSuccess: (_, { contactIds, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-management/contacts"] });
      toast({ 
        title: "Success", 
        description: `Successfully ${isActive ? 'activated' : 'deactivated'} ${contactIds.length} contact person(s)` 
      });
      setShowBulkStatusDialog(false);
      setSelectedContacts(new Set());
      setBulkAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact persons",
        variant: "destructive",
      });
    },
  });

  const onCreateContactPerson = (data: any) => {
    createContactPersonMutation.mutate(data);
  };

  const onCreateRelationship = (data: any) => {
    if (selectedContactPerson) {
      createRelationshipMutation.mutate({
        ...data,
        contactPersonId: selectedContactPerson.id,
      });
    }
  };

  const onUpdateContactPerson = (data: any) => {
    if (selectedContactPerson) {
      updateContactPersonMutation.mutate(data);
    }
  };

  const onDeleteContactPerson = () => {
    if (selectedContactPerson) {
      deleteContactPersonMutation.mutate(Number(selectedContactPerson.id));
    }
  };

  const onBulkDeleteContacts = () => {
    const contactIds = Array.from(selectedContacts);
    if (contactIds.length > 0) {
      bulkDeleteContactsMutation.mutate(contactIds);
    }
  };

  const onBulkUpdateContacts = (isActive: boolean) => {
    const contactIds = Array.from(selectedContacts);
    if (contactIds.length > 0) {
      bulkUpdateContactsMutation.mutate({ contactIds, isActive });
    }
  };

  // Sorting logic
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Bulk selection logic
  const isAllSelected = selectedContacts.size === contactPersons.length && contactPersons.length > 0;
  const isIndeterminate = selectedContacts.size > 0 && selectedContacts.size < contactPersons.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contactPersons.map((p: ContactPerson) => Number(p.id))));
    }
  };

  const handleSelectContact = (contactId: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  // Export functionality
  const exportToCSV = (contactsToExport?: ContactPerson[]) => {
    const dataToExport = contactsToExport || filteredAndSortedContacts;
    
    const csvContent = [
      // Headers
      ['Name', 'Title', 'Email', 'Phone', 'Status', 'Companies', 'Created Date'].join(','),
      // Data rows
      ...dataToExport.map((contact: ContactPerson) => [
        `"${contact.name}"`,
        `"${contact.title || ''}"`,
        `"${contact.email}"`,
        `"${contact.phone || ''}"`,
        `"${contact.isActive ? 'Active' : 'Inactive'}"`,
        `"${getClientNamesForContact(contact.id).map((c: any) => c.name).join('; ')}"`,
        `"${new Date(contact.createdAt).toLocaleDateString()}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contact-persons-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to get client names for a contact person
  const getClientNamesForContact = (contactPersonId: number | string) => {
    const contactRelationships = relationships.filter((rel: Relationship) => 
      rel.contactPersonId === Number(contactPersonId) && rel.isActive
    );
    
    return contactRelationships.map((rel: Relationship) => {
      const client = clients.find((c: Client) => c.id === rel.clientId);
      return client ? { name: client.name, type: rel.relationshipType } : null;
    }).filter(Boolean);
  };

  // Filtered and sorted data
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contactPersons.filter((contact: ContactPerson) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.title && contact.title.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && contact.isActive) ||
        (statusFilter === "inactive" && !contact.isActive);

      // Company filter
      const matchesCompany = companyFilter === "all" ||
        getClientNamesForContact(contact.id).some((client: any) => 
          client.name.toLowerCase().includes(companyFilter.toLowerCase())
        );

      return matchesSearch && matchesStatus && matchesCompany;
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a: ContactPerson, b: ContactPerson) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'status':
            aValue = a.isActive ? 'active' : 'inactive';
            bValue = b.isActive ? 'active' : 'inactive';
            break;
          case 'created':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'companies':
            aValue = getClientNamesForContact(a.id).length;
            bValue = getClientNamesForContact(b.id).length;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [contactPersons, searchTerm, statusFilter, companyFilter, sortConfig, relationships, clients]);

  if (loadingContactPersons) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p>Loading contact persons...</p>
          {contactError && (
            <p className="text-red-500 mt-2 text-sm">
              Error: {contactError instanceof Error ? contactError.message : String(contactError)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isError || contactError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">Failed to load contact persons</p>
          <p className="text-gray-600 mt-2 text-sm">
            {contactError instanceof Error ? contactError.message : String(contactError)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold text-gray-900">Contact Person Management</h2>
            <p className="text-gray-600">Manage contact persons who can handle multiple client companies</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                Add Contact Person
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Contact Person</DialogTitle>
              </DialogHeader>
              <Form {...contactPersonForm}>
                <form onSubmit={contactPersonForm.handleSubmit(onCreateContactPerson)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contactPersonForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactPersonForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title/Position</FormLabel>
                          <FormControl>
                            <Input placeholder="CEO, Owner, President, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contactPersonForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactPersonForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createContactPersonMutation.isPending}>
                      {createContactPersonMutation.isPending ? "Creating..." : "Create Contact Person"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-contacts"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-40" data-testid="select-company-filter">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.name.toLowerCase()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Export Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" data-testid="button-export">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToCSV()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export All to CSV
                </DropdownMenuItem>
                {selectedContacts.size > 0 && (
                  <DropdownMenuItem onClick={() => exportToCSV(
                    filteredAndSortedContacts.filter((c: ContactPerson) => selectedContacts.has(Number(c.id)))
                  )}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export Selected ({selectedContacts.size})
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" data-testid="button-columns">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({ ...prev, name: checked }))}
                >
                  Name & Title
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.contact}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({ ...prev, contact: checked }))}
                >
                  Contact Information
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.companies}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({ ...prev, companies: checked }))}
                >
                  Related Companies
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({ ...prev, status: checked }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.created}
                  onCheckedChange={(checked) => 
                    setVisibleColumns(prev => ({ ...prev, created: checked }))}
                >
                  Created Date
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedContacts.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContacts(new Set())}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(
                  filteredAndSortedContacts.filter((c: ContactPerson) => selectedContacts.has(Number(c.id)))
                )}
                data-testid="button-export-selected"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-bulk-status"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction('activate');
                      setShowBulkStatusDialog(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction('deactivate');
                      setShowBulkStatusDialog(true);
                    }}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-800"
                data-testid="button-delete-selected"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Contact Persons</p>
                <p className="text-2xl font-bold">{contactPersons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Contacts</p>
                <p className="text-2xl font-bold">{contactPersons.filter((p: ContactPerson) => p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Relationships</p>
                <p className="text-2xl font-bold">{relationships.filter((r: Relationship) => r.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Contact Persons ({filteredAndSortedContacts.length})</span>
            {searchTerm || statusFilter !== "all" || companyFilter !== "all" ? (
              <Badge variant="secondary" className="text-sm">
                Filtered from {contactPersons.length} total
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all" || companyFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first contact person to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    {/* Select All Checkbox */}
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el && 'indeterminate' in el) {
                            (el as any).indeterminate = isIndeterminate;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all contacts"
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>

                    {/* Sortable Name Column */}
                    {visibleColumns.name && (
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('name')}
                        data-testid="header-name"
                      >
                        <div className="flex items-center gap-2">
                          Name & Title
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'name' && sortConfig?.direction === 'asc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                            <ChevronDown 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'name' && sortConfig?.direction === 'desc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </TableHead>
                    )}

                    {/* Contact Information Column */}
                    {visibleColumns.contact && (
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('email')}
                        data-testid="header-contact"
                      >
                        <div className="flex items-center gap-2">
                          Contact Information
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'email' && sortConfig?.direction === 'asc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                            <ChevronDown 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'email' && sortConfig?.direction === 'desc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </TableHead>
                    )}

                    {/* Related Companies Column */}
                    {visibleColumns.companies && (
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('companies')}
                        data-testid="header-companies"
                      >
                        <div className="flex items-center gap-2">
                          Related Companies
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'companies' && sortConfig?.direction === 'asc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                            <ChevronDown 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'companies' && sortConfig?.direction === 'desc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </TableHead>
                    )}

                    {/* Status Column */}
                    {visibleColumns.status && (
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('status')}
                        data-testid="header-status"
                      >
                        <div className="flex items-center gap-2">
                          Status
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'status' && sortConfig?.direction === 'asc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                            <ChevronDown 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'status' && sortConfig?.direction === 'desc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </TableHead>
                    )}

                    {/* Created Date Column */}
                    {visibleColumns.created && (
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('created')}
                        data-testid="header-created"
                      >
                        <div className="flex items-center gap-2">
                          Created
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'created' && sortConfig?.direction === 'asc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                            <ChevronDown 
                              className={`h-3 w-3 transition-colors ${
                                sortConfig?.key === 'created' && sortConfig?.direction === 'desc' 
                                  ? 'text-blue-600' : 'text-gray-400'
                              }`} 
                            />
                          </div>
                        </div>
                      </TableHead>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.actions && (
                      <TableHead>Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedContacts.map((person: ContactPerson) => (
                    <TableRow 
                      key={person.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedContacts.has(Number(person.id)) ? 'bg-blue-50' : ''
                      }`}
                      data-testid={`row-contact-${person.id}`}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.has(Number(person.id))}
                          onCheckedChange={() => handleSelectContact(Number(person.id))}
                          aria-label={`Select ${person.name}`}
                          data-testid={`checkbox-contact-${person.id}`}
                        />
                      </TableCell>

                      {/* Name & Title Column */}
                      {visibleColumns.name && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {person.name}
                                {person.source === 'client' && (
                                  <Badge variant="outline" className="text-xs">Auto</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{person.title || "No title specified"}</div>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Contact Information Column */}
                      {visibleColumns.contact && (
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{person.email}</span>
                            </div>
                            {person.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{person.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Related Companies Column */}
                      {visibleColumns.companies && (
                        <TableCell>
                          <div className="space-y-1">
                            {getClientNamesForContact(person.id).map((client: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Building className="w-3 h-3 text-gray-400" />
                                <span className="font-medium">{client.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {client.type}
                                </Badge>
                              </div>
                            ))}
                            {getClientNamesForContact(person.id).length === 0 && (
                              <span className="text-sm text-gray-400 italic">No companies assigned</span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Status Column */}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge variant={person.isActive ? "default" : "secondary"}>
                            {person.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Created Date Column */}
                      {visibleColumns.created && (
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(person.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                      )}

                      {/* Actions Column */}
                      {visibleColumns.actions && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedContactPerson(person);
                                setShowLinkDialog(true);
                              }}
                              disabled={person.source === 'client'}
                              title={person.source === 'client' ? 'Client contacts are automatically linked' : 'Link to additional clients'}
                              data-testid={`button-link-${person.id}`}
                            >
                              <LinkIcon className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedContactPerson(person);
                                setShowEditDialog(true);
                              }}
                              data-testid={`button-edit-${person.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedContactPerson(person);
                                setShowViewDialog(true);
                              }}
                              data-testid={`button-view-${person.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Client Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Link Client to {selectedContactPerson?.name}
            </DialogTitle>
          </DialogHeader>
          <Form {...relationshipForm}>
            <form onSubmit={relationshipForm.handleSubmit(onCreateRelationship)} className="space-y-4">
              <FormField
                control={relationshipForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Client</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            field.onChange(parseInt(value));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      >
                        <option value="" disabled>Choose a client to link</option>
                        {loadingClients ? (
                          <option value="" disabled>Loading clients...</option>
                        ) : clients.length === 0 ? (
                          <option value="" disabled>No clients available</option>
                        ) : (
                          clients.map((client: Client) => (
                            <option key={client.id} value={client.id.toString()}>
                              {client.name}
                            </option>
                          ))
                        )}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={relationshipForm.control}
                name="relationshipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship Type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="authorized_representative">Authorized Representative</option>
                        <option value="contact">Primary Contact</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={relationshipForm.control}
                  name="canViewFinancials"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Can View Financials</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={relationshipForm.control}
                  name="canApproveWork"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Can Approve Work</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={relationshipForm.control}
                  name="canReceiveInvoices"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Can Receive Invoices</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={relationshipForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes about this relationship"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLinkDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRelationshipMutation.isPending}>
                  {createRelationshipMutation.isPending ? "Creating..." : "Link Client"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Person Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact Person</DialogTitle>
          </DialogHeader>
          <Form {...editContactPersonForm}>
            <form onSubmit={editContactPersonForm.handleSubmit(onUpdateContactPerson)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContactPersonForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactPersonForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title/Position</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO, Owner, President, etc." {...field} data-testid="input-edit-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContactPersonForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactPersonForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} data-testid="input-edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editContactPersonForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active Status</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedContactPerson(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateContactPersonMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateContactPersonMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Contact Person Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Person Details</DialogTitle>
          </DialogHeader>
          {selectedContactPerson && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm">{selectedContactPerson.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title</label>
                    <p className="text-sm">{selectedContactPerson.title || "No title specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedContactPerson.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{selectedContactPerson.phone || "No phone number"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge variant={selectedContactPerson.isActive ? "default" : "secondary"}>
                      {selectedContactPerson.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm">{new Date(selectedContactPerson.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Related Companies */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Related Companies</h3>
                <div className="space-y-2">
                  {getClientNamesForContact(selectedContactPerson.id).map((client: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-500">Role: {client.type}</p>
                      </div>
                    </div>
                  ))}
                  {getClientNamesForContact(selectedContactPerson.id).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No companies assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowViewDialog(false);
                setSelectedContactPerson(null);
              }}
              data-testid="button-close-view"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false);
                setShowEditDialog(true);
              }}
              data-testid="button-edit-from-view"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedContacts.size > 0 ? "Delete Selected Contacts" : "Delete Contact Person"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedContacts.size > 0 
                ? `Are you sure you want to delete ${selectedContacts.size} contact person(s)? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedContactPerson?.name}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedContacts.size > 0) {
                  onBulkDeleteContacts();
                } else if (selectedContactPerson) {
                  onDeleteContactPerson();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
              disabled={bulkDeleteContactsMutation.isPending || deleteContactPersonMutation.isPending}
            >
              {(bulkDeleteContactsMutation.isPending || deleteContactPersonMutation.isPending) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <AlertDialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'activate' ? 'Activate' : 'Deactivate'} Selected Contacts
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAction === 'activate' ? 'activate' : 'deactivate'} {selectedContacts.size} contact person(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-status">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkAction) {
                  onBulkUpdateContacts(bulkAction === 'activate');
                }
              }}
              className={bulkAction === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
              data-testid="button-confirm-bulk-status"
              disabled={bulkUpdateContactsMutation.isPending}
            >
              {bulkUpdateContactsMutation.isPending ? "Processing..." : (bulkAction === 'activate' ? 'Activate' : 'Deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}