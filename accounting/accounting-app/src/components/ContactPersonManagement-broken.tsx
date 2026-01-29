import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Users,
  Building,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  Link as LinkIcon,
  UserCheck,
  AlertCircle
} from "lucide-react";

// Contact Person Schema
const contactPersonSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  title: z.string().optional(),
  mobilePhone: z.string().optional(),
  alternateEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Canada"),
  firmId: z.number().default(1),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

const relationshipSchema = z.object({
  clientId: z.number().min(1, "Please select a client"),
  contactPersonId: z.number(),
  relationshipType: z.string().default("owner"),
  isPrimaryContact: z.boolean().default(true),
  canViewFinancials: z.boolean().default(true),
  canApproveWork: z.boolean().default(true),
  canReceiveInvoices: z.boolean().default(true),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

type ContactPerson = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  firmId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedContactPerson, setSelectedContactPerson] = useState<ContactPerson | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: contactPersons = [], isLoading: loadingContactPersons } = useQuery({
    queryKey: ["/api/contact-persons"],
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: relationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ["/api/client-contact-relationships"],
  });

  const { data: relationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ["/api/client-contact-relationships"],
  });

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
      relationshipType: "owner",
      isPrimaryContact: true,
      canViewFinancials: true,
      canApproveWork: true,
      canReceiveInvoices: true,
      isActive: true,
    },
  });

  // Mutations
  const createContactPersonMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/contact-persons", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-persons"] });
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
    mutationFn: (data: any) => apiRequest("/api/client-contact-relationships", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contact-relationships"] });
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

  // Helper function to get client names for a contact person
  const getClientNamesForContact = (contactPersonId: number) => {
    const contactRelationships = relationships.filter((rel: Relationship) => 
      rel.contactPersonId === contactPersonId && rel.isActive
    );
    
    return contactRelationships.map((rel: Relationship) => {
      const client = clients.find((c: Client) => c.id === rel.clientId);
      return client ? { name: client.name, type: rel.relationshipType } : null;
    }).filter(Boolean);
  };

  if (loadingContactPersons) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p>Loading contact persons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Contact Person Management</h2>
          <p className="text-gray-600">Manage contact persons who can handle multiple client companies</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
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

                <FormField
                  control={contactPersonForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this contact person" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contact Persons</p>
                <p className="text-2xl font-bold text-blue-600">{contactPersons.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contacts</p>
                <p className="text-2xl font-bold text-green-600">
                  {contactPersons.filter((cp: ContactPerson) => cp.isActive).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-purple-600">{clients.length}</p>
              </div>
              <Building className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Relationships</p>
                <p className="text-2xl font-bold text-orange-600">1</p>
              </div>
              <LinkIcon className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Persons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Title</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead>Related Companies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactPersons.map((person: ContactPerson) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{person.name}</div>
                        <div className="text-sm text-gray-500">{person.title || "No title specified"}</div>
                      </div>
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <Badge variant={person.isActive ? "default" : "secondary"}>
                      {person.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {new Date(person.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedContactPerson(person);
                          setShowLinkDialog(true);
                        }}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Link Client Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
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
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a client to link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="authorized_representative">Authorized Representative</SelectItem>
                        <SelectItem value="contact">Primary Contact</SelectItem>
                      </SelectContent>
                    </Select>
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
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLinkDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRelationshipMutation.isPending}>
                  {createRelationshipMutation.isPending ? "Linking..." : "Create Link"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}