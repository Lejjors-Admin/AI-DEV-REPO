import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp } from "lucide-react";

export default function TrialBalanceNav() {
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    setLocation(`/trial-balance/${clientId}`);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-green-600" />
          Trial Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          View account balances, financial statements, and section mappings for any client.
        </p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Client:</label>
          <Select onValueChange={handleClientSelect} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading clients..." : "Choose a client"} />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client: any) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Real-time account balances with section mapping</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}