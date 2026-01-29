import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Users, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CreateInvitation() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const typeParam = urlParams.get('type');
  
  const [formData, setFormData] = useState({
    email: "",
    role: "",
    inviteType: typeParam || "client",
    message: "",
    clientId: clientId || ""
  });

  // Get clients for client assignment
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Created",
        description: `Invitation code: ${data.code}. Email sent to ${formData.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setLocation("/settings");
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
    
    if (!formData.email || !formData.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in email and role fields",
        variant: "destructive"
      });
      return;
    }

    createInvitationMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => setLocation("/settings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Invitation</h1>
            <p className="text-gray-600">
              {clientId ? `Send invitation for client access` : `Send an invitation to join your organization`}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Invitation Details</CardTitle>
            </div>
            <CardDescription>
              Fill out the information below to create and send an invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invitation Type */}
              <div className="space-y-2">
                <Label htmlFor="inviteType">Invitation Type</Label>
                <Select 
                  value={formData.inviteType} 
                  onValueChange={(value) => setFormData({...formData, inviteType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Client User
                      </div>
                    </SelectItem>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team Member
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@example.com"
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">User Role *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.inviteType === "client" ? (
                      <>
                        <SelectItem value="client_admin">Client Administrator</SelectItem>
                        <SelectItem value="client_user">Standard User</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="bookkeeper">Bookkeeper</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Welcome Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Add a personal welcome message..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/settings")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInvitationMutation.isPending}
                >
                  {createInvitationMutation.isPending ? "Creating..." : "Create & Send Invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}