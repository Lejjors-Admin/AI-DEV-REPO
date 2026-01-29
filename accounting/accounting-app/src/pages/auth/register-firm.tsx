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
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

// Form validation schema
const firmRegistrationSchema = z
  .object({
    // Firm details
    firmName: z.string().min(3, "Firm name must be at least 3 characters"),
    firmEmail: z.string().email("Please enter a valid email address"),
    firmPhone: z.string().min(10, "Please enter a valid phone number"),
    firmAddress: z.string().min(5, "Address must be at least 5 characters"),
    licenseNumber: z.string().optional(),
    
    // Admin user details
    name: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FirmRegistrationFormValues = z.infer<typeof firmRegistrationSchema>;

export default function RegisterFirmPage() {
  const { user, isLoading, registerMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form initialization
  const form = useForm<FirmRegistrationFormValues>({
    resolver: zodResolver(firmRegistrationSchema),
    defaultValues: {
      firmName: "",
      firmEmail: "",
      firmPhone: "",
      firmAddress: "",
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // If user is already logged in, redirect to dashboard
  if (user && !isLoading) {
    navigate("/dashboard");
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
  const onSubmit = async (values: FirmRegistrationFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log("Starting firm registration process", values);
      
      // Prepare the registration payload
      const registrationData = {
        firmName: values.firmName,
        email: values.firmEmail, // Firm email (will also be used for admin if adminEmail not provided)
        phone: values.firmPhone,
        address: values.firmAddress,
        licenseNumber: "AUTO-GEN", // Generate or get from form
        jurisdiction: "Canada",
        adminName: values.name,
        username: values.username,
        password: values.password,
        // Use admin email if different from firm email, otherwise use firm email
        adminEmail: values.email !== values.firmEmail ? values.email : values.firmEmail,
      };

      console.log("JSON.stringify(registrationData)", JSON.stringify(registrationData))
      // Use the working backend endpoint
      const response = await fetch(apiConfig.buildUrl("/api/register/firm"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to create firm account";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error("Registration error response:", errorData);
        } catch (e) {
          const text = await response.text();
          console.error("Registration error (text):", text);
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const firmData = await response.json();
      
      // Backend already created both firm and admin user
      console.log("Firm and admin registration successful:", firmData);
      
      // Show success message and redirect to login page
      toast({
        title: "Registration successful",
        description: `${values.firmName} has been registered successfully. Please log in to continue.`,
      });
      
      // Redirect to login page
      navigate("/auth/login");
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Firm registration process error:", {
        message: error.message,
        status: error.status,
        details: error.toString()
      });
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during the registration process",
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
            <CardTitle className="text-3xl font-bold">Register Your Accounting Firm</CardTitle>
            <CardDescription>
              Create a firm account to access all AccountSync features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="border-b pb-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Firm Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firmName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firm Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your firm name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firmEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firm Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your firm email" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firmPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firm Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your firm phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firmAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firm Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your firm address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
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
                      "Register Your Firm"
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