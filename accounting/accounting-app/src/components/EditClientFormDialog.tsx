import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

interface EditClientFormProps {
  isOpen: boolean;
  clientId: string | null;
  onComplete: (client: any) => void;
  onCancel: () => void;
}

export default function EditClientForm({ isOpen, clientId, onComplete, onCancel }: EditClientFormProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessNumber: "",
    industry: "",
    fiscalYearEnd: "",
    website: "",
    contactPersonName: "",
    title: "",
    businessAddress: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
    billingAddress: "",
    workType: "bookkeeping",
    status: "active",
    clientType: "corporation",
    notes: "",
    operatingName: "",
  });

  // Fetch client data
  const { data: clientsResponse, isLoading } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!clientId && isOpen,
  });

  // Find the specific client
  const client = Array.isArray(clientsResponse) 
    ? clientsResponse.find((c: any) => c.id === parseInt(clientId || ''))
    : null;

  // Populate form when client data loads
  useEffect(() => {
    if (client && isOpen) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        businessNumber: client.businessNumber || "",
        industry: client.industry || "",
        fiscalYearEnd: client.fiscalYearEnd || "",
        website: client.website || "",
        contactPersonName: client.contactPersonName || "",
        title: client.title || "",
        businessAddress: client.businessAddress || "",
        city: client.city || "",
        province: client.province || "",
        postalCode: client.postalCode || "",
        country: client.country || "Canada",
        billingAddress: client.billingAddress || "",
        workType: Array.isArray(client.workType) ? client.workType[0] : (client.workType || "bookkeeping"),
        status: client.status || "active",
        clientType: client.clientType || "corporation",
        notes: client.notes || "",
        operatingName: client.operatingName || "",
      });
    }
  }, [client, isOpen]);

  const updateClientMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update client: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onComplete(updatedClient);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in required fields (name and email)",
        variant: "destructive"
      });
      return;
    }

    updateClientMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Edit Client
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !client ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Client not found</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Company Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operatingName">Operating Name</Label>
                <Input
                  id="operatingName"
                  value={formData.operatingName}
                  onChange={(e) => setFormData({...formData, operatingName: e.target.value})}
                  placeholder="Operating Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="company@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessNumber">Business Number</Label>
                <Input
                  id="businessNumber"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({...formData, businessNumber: e.target.value})}
                  placeholder="123456789"
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  placeholder="Technology, Healthcare, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscalYearEnd">Fiscal Year End</Label>
                <Input
                  id="fiscalYearEnd"
                  value={formData.fiscalYearEnd}
                  onChange={(e) => setFormData({...formData, fiscalYearEnd: e.target.value})}
                  placeholder="December 31"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientType">Client Type</Label>
                <Select 
                  value={formData.clientType} 
                  onValueChange={(value) => setFormData({...formData, clientType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="non_profit">Non-Profit</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workType">Work Type</Label>
                <Select 
                  value={formData.workType} 
                  onValueChange={(value) => setFormData({...formData, workType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                    <SelectItem value="tax_preparation">Tax Preparation</SelectItem>
                    <SelectItem value="financial_statements">Financial Statements</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="year_end">Year End</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Person */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactPersonName">Contact Person</Label>
                <Input
                  id="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({...formData, contactPersonName: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="CEO, CFO, etc."
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({...formData, businessAddress: e.target.value})}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Toronto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    placeholder="ON"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    placeholder="M5V 3A8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Canada"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this client..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClientMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

