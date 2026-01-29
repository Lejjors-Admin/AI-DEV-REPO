import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const staffRegistrationSchema = z
  .object({
    // Invitation code
    invitationCode: z.string().min(6, "Invitation code is required"),
    
    // Staff details
    name: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    position: z.string().min(1, "Please select your position"),
    department: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type StaffRegistrationFormValues = z.infer<typeof staffRegistrationSchema>;

export default function RegisterStaffPage() {
  const { user, isLoading, registerMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [invitationDetails, setInvitationDetails] = React.useState<{
    firmId: number;
    firmName: string;
    role: string;
    email?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  // Form initialization
  const form = useForm<StaffRegistrationFormValues>({
    resolver: zodResolver(staffRegistrationSchema),
    defaultValues: {
      invitationCode: "",
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      position: "",
      department: "",
      phone: "",
    },
  });
  
  // Watch the invitation code field to verify when it changes
  const invitationCode = form.watch("invitationCode");

  // Function to verify invitation code
  const verifyInvitationCode = async () => {
    if (invitationCode.length < 6) return;
    
    setIsVerifying(true);
    
    try {
      const response = await apiRequest("GET", `/api/invitations/${invitationCode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Invalid invitation code",
          description: errorData.message || "Please check your code and try again",
          variant: "destructive",
        });
        setInvitationDetails(null);
        return;
      }
      
      const data = await response.json();
      setInvitationDetails({
        firmId: data.firmId,
        firmName: data.firmName,
        role: data.role,
        email: data.email,
      });
      
      // Pre-populate email if it's in the invitation
      if (data.email) {
        form.setValue("email", data.email);
      }
      
      toast({
        title: "Invitation verified",
        description: `You're joining ${data.firmName} as a ${data.role === "staff" ? "Staff Member" : "Manager"}`,
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Could not verify the invitation code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // If user is already logged in, redirect to dashboard
  if (user && !isLoading) {
    navigate("/");
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Form submission handler
  const onSubmit = async (values: StaffRegistrationFormValues) => {
    if (!invitationDetails) {
      toast({
        title: "Invalid invitation",
        description: "Please verify your invitation code first",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Map role from invitation to database role
      // The invitation role might be "staff" or "manager", but we need "firm_user" or "firm_admin"
      let dbRole: "firm_admin" | "firm_user";
      if (invitationDetails.role === "manager" || invitationDetails.role === "firm_admin") {
        dbRole = "firm_admin";
      } else {
        dbRole = "firm_user";
      }
      
      // Register the user account first (with firmId from invitation)
      const { confirmPassword, invitationCode, ...userData } = values;
      
      registerMutation.mutate(
        {
          ...userData,
          role: dbRole,
          firmId: invitationDetails.firmId,
        },
        {
          onSuccess: async (registeredUser) => {
            try {
              // After successful registration, accept the invitation and link it to the user
              const acceptResponse = await apiRequest("POST", `/api/invitations/${values.invitationCode}/accept`, {
                name: values.name,
                email: values.email,
                position: values.position,
                department: values.department || null,
                phone: values.phone || null,
                userId: registeredUser.id, // Link the invitation to the newly created user
              });
              
              if (!acceptResponse.ok) {
                console.warn("Failed to accept invitation, but user was created:", await acceptResponse.json());
                // Continue anyway - user is already registered
              }
              
              toast({
                title: "Registration successful",
                description: `You have joined ${invitationDetails.firmName} successfully.`,
              });
              
              // Auto-login after registration
              // The registerMutation should handle login, but if not, we can trigger it here
              navigate("/");
            } catch (acceptError: any) {
              console.error("Error accepting invitation after registration:", acceptError);
              // User is already registered, so continue
              toast({
                title: "Registration successful",
                description: `You have joined ${invitationDetails.firmName}. Please log in to continue.`,
              });
              navigate("/auth/login");
            }
          },
          onError: (error) => {
            toast({
              title: "Registration failed",
              description: error.message || "Failed to create your account. Please try again.",
              variant: "destructive",
            });
            setIsSubmitting(false);
          },
          onSettled: () => {
            setIsSubmitting(false);
          },
        }
      );
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate("/auth")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to options
        </Button>
        
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Join Your Accounting Firm</CardTitle>
            <CardDescription>
              Complete your staff registration with your invitation code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="border-b pb-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Invitation Information</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="invitationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invitation Code</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter your invitation code" 
                                {...field} 
                              />
                            </FormControl>
                            <Button 
                              type="button" 
                              onClick={verifyInvitationCode}
                              disabled={isVerifying || field.value.length < 6}
                            >
                              {isVerifying ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {invitationDetails && (
                      <div className="bg-primary/10 p-4 rounded-md">
                        <p className="font-medium">Invitation Details:</p>
                        <p>Firm: <span className="font-semibold">{invitationDetails.firmName}</span></p>
                        <p>Role: <span className="font-semibold">
                          {invitationDetails.role === "staff" ? "Staff Member" : "Manager"}
                        </span></p>
                        {invitationDetails.email && (
                          <p>Email: <span className="font-semibold">{invitationDetails.email}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
                              {...field} 
                              disabled={!!invitationDetails?.email}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
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
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your position" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="accountant">Accountant</SelectItem>
                              <SelectItem value="senior_accountant">Senior Accountant</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="bookkeeper">Bookkeeper</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="tax_specialist">Tax Specialist</SelectItem>
                              <SelectItem value="consultant">Consultant</SelectItem>
                              <SelectItem value="partner">Partner</SelectItem>
                              <SelectItem value="admin">Administrative Staff</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="accounting">Accounting</SelectItem>
                              <SelectItem value="audit">Audit</SelectItem>
                              <SelectItem value="tax">Tax</SelectItem>
                              <SelectItem value="advisory">Advisory</SelectItem>
                              <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                              <SelectItem value="payroll">Payroll</SelectItem>
                              <SelectItem value="admin">Administration</SelectItem>
                              <SelectItem value="management">Management</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-center">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-1/2"
                    disabled={!invitationDetails || isSubmitting || registerMutation.isPending}
                  >
                    {isSubmitting || registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Button
                variant="link"
                className="text-primary"
                onClick={() => navigate("/auth/login")}
              >
                Sign in
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}