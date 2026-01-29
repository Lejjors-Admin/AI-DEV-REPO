import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiConfig } from "@/lib/api-config";

export default function TestLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickLogin = async (role: string) => {
    setIsLoading(true);
    try {
      let credentials;
      switch (role) {
        case 'turack_firm':
          credentials = { username: 'turackadmin', password: 'password123' };
          break;
        case 'cricket_ontario':
          credentials = { username: 'cricketadmin', password: 'password123' };
          break;
        default:
          credentials = { username: 'admin', password: 'password123' };
      }
      
      const response = await fetch(apiConfig.buildUrl("/api/login"), {
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
        setLocation("/");
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
          <CardTitle>Test Login - Turackfirm & Cricket Ontario</CardTitle>
          <CardDescription>
            Testing the new tenant login buttons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-3">Multi-Tenant Testing</p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={() => handleQuickLogin('turack_firm')}
                disabled={isLoading}
                className="w-full justify-start border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
              >
                <span className="mr-2">🏛️</span>
                Turackfirm Admin (turackadmin)
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
                Cricket Ontario Independent (cricketadmin)
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/tenant-test")}
              className="text-blue-600 hover:underline text-sm"
            >
              Go to Tenant Test Page
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}