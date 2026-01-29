import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const firmRegistrationSchema = z.object({
  firmName: z.string().min(2, "Firm name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  jurisdiction: z.string().default("Canada")
});

const userRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firmId: z.number().min(1, "Please select a firm"),
  role: z.enum(["firm_user", "client_admin", "client_user"]).default("firm_user"),
  department: z.string().optional(),
  position: z.string().optional()
});

type FirmRegistrationData = z.infer<typeof firmRegistrationSchema>;
type UserRegistrationData = z.infer<typeof userRegistrationSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const firmForm = useForm<FirmRegistrationData>({
    resolver: zodResolver(firmRegistrationSchema),
    defaultValues: {
      jurisdiction: "Canada"
    }
  });

  const userForm = useForm<UserRegistrationData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      role: "firm_user",
      firmId: 1 // Demo firm ID
    }
  });

  const handleFirmRegistration = async (data: FirmRegistrationData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/register/firm", {
        method: "POST",
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Firm registered successfully! You can now log in."
        });
        setLocation("/login");
      } else {
        const error = await response.json();
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to register firm",
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

  const handleUserRegistration = async (data: UserRegistrationData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/register/user", {
        method: "POST",
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User registered successfully! You can now log in."
        });
        setLocation("/login");
      } else {
        const error = await response.json();
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to register user",
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
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Choose your registration type below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="firm" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="firm">New Firm</TabsTrigger>
              <TabsTrigger value="user">Join Firm</TabsTrigger>
            </TabsList>
            
            <TabsContent value="firm" className="space-y-4">
              <form onSubmit={firmForm.handleSubmit(handleFirmRegistration)} className="space-y-4">
                <div>
                  <Label htmlFor="firmName">Firm Name</Label>
                  <Input
                    id="firmName"
                    {...firmForm.register("firmName")}
                    placeholder="Enter firm name"
                  />
                  {firmForm.formState.errors.firmName && (
                    <p className="text-sm text-red-600">{firmForm.formState.errors.firmName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    {...firmForm.register("adminName")}
                    placeholder="Enter admin full name"
                  />
                  {firmForm.formState.errors.adminName && (
                    <p className="text-sm text-red-600">{firmForm.formState.errors.adminName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...firmForm.register("email")}
                    placeholder="Enter email address"
                  />
                  {firmForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{firmForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...firmForm.register("username")}
                    placeholder="Enter username"
                  />
                  {firmForm.formState.errors.username && (
                    <p className="text-sm text-red-600">{firmForm.formState.errors.username.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...firmForm.register("password")}
                    placeholder="Enter password"
                  />
                  {firmForm.formState.errors.password && (
                    <p className="text-sm text-red-600">{firmForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Firm..." : "Register Firm"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="user" className="space-y-4">
              <form onSubmit={userForm.handleSubmit(handleUserRegistration)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...userForm.register("name")}
                    placeholder="Enter full name"
                  />
                  {userForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{userForm.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="userUsername">Username</Label>
                  <Input
                    id="userUsername"
                    {...userForm.register("username")}
                    placeholder="Enter username"
                  />
                  {userForm.formState.errors.username && (
                    <p className="text-sm text-red-600">{userForm.formState.errors.username.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    {...userForm.register("email")}
                    placeholder="Enter email address"
                  />
                  {userForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{userForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="userPassword">Password</Label>
                  <Input
                    id="userPassword"
                    type="password"
                    {...userForm.register("password")}
                    placeholder="Enter password"
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-sm text-red-600">{userForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Register User"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}