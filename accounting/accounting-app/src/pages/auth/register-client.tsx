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
import { Textarea } from "@/components/ui/textarea";
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
const clientRegistrationSchema = z
  .object({
    // Business details
    businessName: z.string().min(3, "Business name must be at least 3 characters"),
    businessEmail: z.string().email("Please enter a valid email address"),
    businessPhone: z.string().min(10, "Please enter a valid phone number"),
    businessAddress: z.string().min(5, "Address must be at least 5 characters"),
    businessType: z.string().min(1, "Please select a business type"),
    taxId: z.string().optional(),
    fiscalYearEnd: z.string().min(1, "Please select fiscal year end"),
    description: z.string().optional(),
    
    // Admin user details
    name: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    
    // Which accounting firm (optional, client can sign up without a firm)
    accountingFirmCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ClientRegistrationFormValues = z.infer<typeof clientRegistrationSchema>;

export default function RegisterClientPage() {
  const { user, isLoading, registerMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasFirmCode, setHasFirmCode] = React.useState(false);
  const [firmDetails, setFirmDetails] = React.useState<{
    firmId: number;
    firmName: string;
    firmEmail: string;
  } | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = React.useState(false);

  // Form initialization
  const form = useForm<ClientRegistrationFormValues>({
    resolver: zodResolver(clientRegistrationSchema),
    defaultValues: {
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      businessAddress: "",
      businessType: "",
      taxId: "",
      fiscalYearEnd: "",
      description: "",
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      accountingFirmCode: "",
    },
  });

  // Watch the accounting firm code field to verify when it changes
  const accountingFirmCode = form.watch("accountingFirmCode");

  // Function to verify invitation code
  const verifyInvitationCode = async () => {
    if (!accountingFirmCode || accountingFirmCode.length < 6) {
      setFirmDetails(null);
      return;
    }
    
    setIsVerifyingCode(true);
    
    try {
      const response = await apiRequest("GET", `/api/invitations/${accountingFirmCode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Invalid invitation code",
          description: errorData.message || "Please check your code and try again",
          variant: "destructive",
        });
        setFirmDetails(null);
        return;
      }
      
      const data = await response.json();
      setFirmDetails({
        firmId: data.firmId,
        firmName: data.firmName,
        firmEmail: data.firmEmail,
      });
      
      toast({
        title: "Invitation verified",
        description: `Your business will be managed by ${data.firmName}`,
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Could not verify the invitation code",
        variant: "destructive",
      });
      setFirmDetails(null);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Effect to verify invitation code when it changes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      verifyInvitationCode();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [accountingFirmCode]);

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
  const onSubmit = async (values: ClientRegistrationFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Extract form values
      const userFormData = {
        name: values.name,
        email: values.email,
        username: values.username,
        password: values.password,
        role: "client_admin"
      };
      
      // Register the user first
      console.log("Registering client admin user");
      const user = await registerMutation.mutateAsync(userFormData);
      console.log("User registered successfully", user);
      
      // Now create the client business
      const clientFormData = {
        name: values.businessName,
        email: values.businessEmail,
        phone: values.businessPhone,
        address: values.businessAddress,
        industry: values.businessType,
        taxId: values.taxId || null,
        fiscalYearEnd: values.fiscalYearEnd,
        notes: values.description || null,
        status: "active",
        userId: user.id
      };
      
      // If firm invitation was verified, link client to firm
      if (firmDetails) {
        clientFormData.firmId = firmDetails.firmId;
        clientFormData.invitationCode = accountingFirmCode; // Pass code to mark as used
        console.log(`Linking client to firm: ${firmDetails.firmName} (ID: ${firmDetails.firmId})`);
      }
      
      console.log("Creating client business:", clientFormData);
      const clientResponse = await apiRequest("POST", "/api/clients", clientFormData);
      
      if (!clientResponse.ok) {
        const errorData = await clientResponse.json();
        throw new Error(errorData.message || "Failed to create client business");
      }
      
      const clientData = await clientResponse.json();
      console.log("Client created successfully:", clientData);
      
      // Update the user with clientId
      await apiRequest("PATCH", `/api/users/${user.id}`, { clientId: clientData.id });
      
      // Success!
      toast({
        title: "Registration successful",
        description: `${values.businessName} has been registered successfully.`,
      });
      
      // Redirect to dashboard
      navigate("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
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
            <CardTitle className="text-3xl font-bold">Register Your Business</CardTitle>
            <CardDescription>
              Create a client account to access AccountSync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="border-b pb-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your business email" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your business phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your business address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || "corporation"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="corporation">Corporation</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                              <SelectItem value="non_profit">Non-Profit</SelectItem>
                              <SelectItem value="llc">LLC</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your tax ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fiscalYearEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fiscal Year End</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || "12-31"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fiscal year end" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="12-31">December 31</SelectItem>
                              <SelectItem value="01-31">January 31</SelectItem>
                              <SelectItem value="02-28">February 28/29</SelectItem>
                              <SelectItem value="03-31">March 31</SelectItem>
                              <SelectItem value="04-30">April 30</SelectItem>
                              <SelectItem value="05-31">May 31</SelectItem>
                              <SelectItem value="06-30">June 30</SelectItem>
                              <SelectItem value="07-31">July 31</SelectItem>
                              <SelectItem value="08-31">August 31</SelectItem>
                              <SelectItem value="09-30">September 30</SelectItem>
                              <SelectItem value="10-31">October 31</SelectItem>
                              <SelectItem value="11-30">November 30</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Business Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Briefly describe your business" 
                              className="resize-none h-24"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-b pb-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Administrator Account</h3>
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
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
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
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <Button
                      type="button"
                      variant={hasFirmCode ? "default" : "outline"}
                      className="mr-4"
                      onClick={() => setHasFirmCode(!hasFirmCode)}
                    >
                      {hasFirmCode ? "I have a firm code" : "I have a firm code"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {hasFirmCode
                        ? "Enter your accounting firm's invitation code"
                        : "If you received an invitation code from your accounting firm, click here"}
                    </p>
                  </div>

                  {hasFirmCode && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                      name="accountingFirmCode"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accounting Firm Invitation Code</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Enter invitation code from your accounting firm" 
                                  {...field}
                                  className={firmDetails ? "border-green-500" : ""}
                                />
                                {isVerifyingCode && (
                                  <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {firmDetails && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.36a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-green-800">
                                Accounting Firm Verified
                              </h4>
                              <p className="text-sm text-green-700 mt-1">
                                Your business will be managed by <strong>{firmDetails.firmName}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-center">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-1/2"
                    disabled={isSubmitting || registerMutation.isPending}
                  >
                    {isSubmitting || registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register Your Business"
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