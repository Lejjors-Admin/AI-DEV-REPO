import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiConfig } from "@/lib/api-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Schema for invitation data validation
const inviteFormSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .min(1, { message: "Email is required" }),
  role: z.string().min(1, { message: "Role is required" }),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteUserFormProps {
  type: "staff" | "client";
}

export default function InviteUserForm({ type }: InviteUserFormProps) {
  const { createInvitationMutation, user } = useAuth();
  const { toast } = useToast();

  // Fetch current user details to check for firmId
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(apiConfig.buildUrl("/api/users/me"), {
        headers,
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to fetch user information");
      }
      return res.json();
    },
  });

  // Initialize form
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: type === "staff" ? "staff" : "client_user",
      message: "",
    },
  });

  // Check if user has firmId (required for staff invitations)
  const hasFirmId = currentUser?.firmId !== null && currentUser?.firmId !== undefined;
  const canInvite = type === "client" || (type === "staff" && hasFirmId);

  // Handle form submission
  const onSubmit = async (values: InviteFormValues) => {
    // Double-check firmId before submission for staff invitations
    if (type === "staff" && !hasFirmId) {
      toast({
        title: "Cannot Send Invitation",
        description: "Your account is not associated with a firm. Please contact your administrator to set up your firm association.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createInvitationMutation.mutateAsync({
        type,
        data: {
          email: values.email,
          role: values.role,
          message: values.message || undefined,
        },
      });

      // Reset form after successful submission
      form.reset({
        email: "",
        role: type === "staff" ? "staff" : "client_user",
        message: "",
      });

      // Show additional success message with code if available
      if (result?.code) {
        toast({
          title: "Invitation Code Generated",
          description: `Code: ${result.code}. The recipient can use this code to register.`,
        });
      }
    } catch (error: any) {
      // Enhanced error handling
      const errorMessage = error?.message || "Failed to create invitation. Please try again.";
      console.error("Invitation error:", error);
      
      // The mutation's onError will also show a toast, but we can add additional handling here if needed
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {type === "staff" ? "Invite Team Member" : "Invite Client User"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingUser ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : !canInvite && type === "staff" ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Send Staff Invitations</AlertTitle>
            <AlertDescription>
              Your account is not associated with a firm. Staff invitations require a firm association. 
              Please contact your administrator to set up your firm association.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    An invitation code will be sent to this email address.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {type === "staff" ? (
                        <>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="firm_admin">
                            Firm Administrator
                          </SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="client_user">
                            Standard User
                          </SelectItem>
                          <SelectItem value="client_admin">
                            Client Administrator
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This determines what the user can access in the system.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personalized message to your invitation"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createInvitationMutation.isPending || !canInvite}
            >
              {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </Form>
        )}
      </CardContent>
    </Card>
  );
}