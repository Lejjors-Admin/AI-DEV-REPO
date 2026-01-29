
import React, { useEffect } from "react";
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
import { Loader2, Building2, Building, User, Users } from "lucide-react";
import { apiConfig } from "@/lib/api-config";

// Form validation schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    console.log('🔐 Login page - Auth state changed:', { user, isLoading });
    if (user && !isLoading) {
      // Role-based redirect
      if (user.role === 'saas_owner') {
        console.log('🔐 User is saas_owner, redirecting to SaaS admin dashboard');
        navigate("/saas-admin");
      } else if (user.role === 'client' || user.role === 'client_admin' || user.role === 'client_user') {
        console.log('🔐 User is client, redirecting to client portal');
        navigate("/client-portal");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, isLoading, navigate]);

  // Form initialization
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Form submission handler
  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(values);
      // The mutation's onSuccess will update the query cache and refetch the user
      // The useEffect hook will handle navigation once the user state is updated
    } catch (error) {
      // Handle login error
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-neutral-50">
      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-10">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your AccountSync account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
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
                          placeholder="Enter your password"
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
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          {/* Development Quick Login */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-blue-900 mb-3">Development Quick Login</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-purple-100 border-purple-200"
                onClick={async () => {
                  try {
                    // Clear any existing session first
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    // Clear token from localStorage
                    localStorage.removeItem('authToken');
                    // Login as super admin and redirect to SaaS panel
                    const user = await loginMutation.mutateAsync({ username: "saasowner", password: "password123" });
                    console.log('🔐 Super admin login result:', user);
                    // Force navigation to SaaS admin panel immediately
                    // Use window.location to ensure navigation happens
                    if (user && (user.role === 'saas_owner' || user.role === 'saasowner')) {
                      window.location.href = '/saas-admin';
                    } else {
                      // Force navigate anyway for super admin role
                      window.location.href = '/saas-admin';
                    }
                  } catch (error) {
                    console.error("Super admin login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                👑 Super Admin (SaaS Panel)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                onClick={async () => {
                  try {
                    // Clear any existing session first
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    // Then login as admin
                    await loginMutation.mutateAsync({ username: "admin", password: "password123" });
                  } catch (error) {
                    console.error("Quick login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Accounting Firm (Admin)
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-green-100 border-green-200"
                onClick={async () => {
                  try {
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    await loginMutation.mutateAsync({ username: "turackadmin", password: "password123" });
                  } catch (error) {
                    console.error("Turackfirm login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <Building className="mr-2 h-4 w-4" />
                🏛️ Turackfirm Admin
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-orange-100 border-orange-200"
                onClick={async () => {
                  try {
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    await loginMutation.mutateAsync({ username: "cricketadmin", password: "password123" });
                  } catch (error) {
                    console.error("Cricket Ontario login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <User className="mr-2 h-4 w-4" />
                🏏 Cricket Ontario (Independent)
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                onClick={async () => {
                  try {
                    // Clear any existing session first
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    // Then login as testclient
                    await loginMutation.mutateAsync({ username: "testclient", password: "password123" });
                  } catch (error) {
                    console.error("Quick login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <User className="mr-2 h-4 w-4" />
                Business Client
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                onClick={async () => {
                  try {
                    // Clear any existing session first
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    // Then login as ACME
                    await loginMutation.mutateAsync({ username: "acme", password: "password123" });
                  } catch (error) {
                    console.error("Quick login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <Building className="mr-2 h-4 w-4" />
                ACME Corporation
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                onClick={async () => {
                  try {
                    // Clear any existing session first
                    await fetch(apiConfig.buildUrl("/api/logout"), { method: "POST" });
                    // Then login as staff
                    await loginMutation.mutateAsync({ username: "staff", password: "password123" });
                  } catch (error) {
                    console.error("Quick login failed:", error);
                  }
                }}
                disabled={loginMutation.isPending}
              >
                <Users className="mr-2 h-4 w-4" />
                Staff Accountant
              </Button>
            </div>
          </div>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <Button
                variant="link"
                className="text-primary"
                onClick={() => navigate("/auth/forgot-password")}
              >
                Forgot your password?
              </Button>
            </div>
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="text-primary"
                onClick={() => navigate("/auth")}
              >
                Create an account
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Brand Section */}
      <div className="hidden lg:flex flex-1 flex-col bg-gradient-to-br from-primary to-primary-foreground text-primary-foreground p-10 justify-center">
        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">AccountSync</h1>
          <p className="text-lg mb-8">
            The comprehensive platform for accounting professionals that streamlines
            client management, financial data, and audit workflows.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold text-xl mb-2">For Accounting Firms</h3>
              <p className="opacity-90">
                Manage clients, staff assignments, and workflows in one secure
                platform.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold text-xl mb-2">For Businesses</h3>
              <p className="opacity-90">
                Access financial information, collaborate with your accounting
                team, and track important documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}