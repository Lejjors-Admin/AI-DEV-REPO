import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });

  const handleLogin = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await fetch(apiConfig.buildUrl(apiConfig.endpoints.login), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Welcome back!",
          description: `Logged in as ${result.user.name}`
        });
        setLocation("/dashboard");
      } else {
        const error = await response.json();
        console.error("Login error:", error);
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive"
        });
        console.error("Login failed:", error);
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick dev login function
  const handleQuickLogin = async (role: string) => {
    setIsLoading(true);
    try {
      let credentials;
      switch (role) {
        case 'saas_owner':
          credentials = { username: 'superadmin', password: 'password123' };
          break;
        case 'firm_admin':
          credentials = { username: 'admin', password: 'password123' };
          break;
        case 'client_admin':
          credentials = { username: 'acme_admin', password: 'password123' };
          break;
        case 'turack_firm':
          credentials = { username: 'turackadmin', password: 'password123' };
          break;
        case 'cricket_ontario':
          credentials = { username: 'cricketadmin', password: 'password123' };
          break;
        case 'acme_corp':
          credentials = { username: 'testclient', password: 'password123' };
          break;
        case 'staff_accountant':
          credentials = { username: 'staff', password: 'password123' };
          break;
        default:
          credentials = { username: 'admin', password: 'password123' };
      }
      
      const response = await fetch(apiConfig.buildUrl(apiConfig.endpoints.login), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Quick Login Successful!",
          description: `Logged in as ${result.name}`
        });
        if (role === 'saas_owner') {
          setLocation("/saas-admin");
        } else {
          setLocation("/");
        }
      } else {
        const error = await response.json();
        toast({
          title: "Quick Login Failed",
          description: error.message || "Login failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="Enter your username"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Enter your password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-3">Development Quick Login (Updated)</p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('saas_owner')}
                disabled={isLoading}
                className="w-full justify-start border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
              >
                <span className="mr-2">👑</span>
                Super Admin (SaaS Panel)
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('firm_admin')}
                disabled={isLoading}
                className="w-full justify-start border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
              >
                <span className="mr-2">🏢</span>
                Accounting Firm (Admin)
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('turack_firm')}
                disabled={isLoading}
                className="w-full justify-start border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
              >
                <span className="mr-2">🏛️</span>
                Turackfirm Admin
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('cricket_ontario')}
                disabled={isLoading}
                className="w-full justify-start border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100"
              >
                <span className="mr-2">🏏</span>
                Cricket Ontario (Independent)
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('client_admin')}
                disabled={isLoading}
                className="w-full justify-start border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100"
              >
                <span className="mr-2">👤</span>
                Business Client
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('acme_corp')}
                disabled={isLoading}
                className="w-full justify-start border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
              >
                <span className="mr-2">🏭</span>
                ACME Corporation
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('staff_accountant')}
                disabled={isLoading}
                className="w-full justify-start border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
              >
                <span className="mr-2">👥</span>
                Staff Accountant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}