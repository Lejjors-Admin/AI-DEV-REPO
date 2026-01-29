import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Link, Unlink, Eye, EyeOff } from "lucide-react";

export default function TenantTest() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [turackfirmClients, setTurackfirmClients] = useState<any[]>([]);
  const [cricketStatus, setCricketStatus] = useState<any>(null);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // Check current connection state
      const response = await fetch('/api/admin/tenant-status');
      const data = await response.json();
      
      setConnectionState(data.cricketOntario.firmId ? 'connected' : 'disconnected');
      setTurackfirmClients(data.turackfirmClients || []);
      setCricketStatus(data.cricketOntario);
      
    } catch (error) {
      toast({
        title: "Status Check Failed",
        description: "Could not check tenant status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectClient = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/connect-client', {
        clientId: 33, // Cricket Ontario
        firmId: 5    // Turackfirm
      });
      
      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: "Cricket Ontario is now managed by Turackfirm"
        });
        setConnectionState('connected');
        await checkStatus();
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect Cricket Ontario to Turackfirm",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectClient = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/disconnect-client', {
        clientId: 33 // Cricket Ontario
      });
      
      if (response.ok) {
        toast({
          title: "Disconnection Successful", 
          description: "Cricket Ontario is now independent"
        });
        setConnectionState('disconnected');
        await checkStatus();
      }
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Could not disconnect Cricket Ontario",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial status
  useState(() => {
    checkStatus();
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Tenant Connection Test</h1>
          <p className="text-gray-600 mt-1">Test connecting/disconnecting Cricket Ontario to/from Turackfirm</p>
        </div>
        <Button
          onClick={checkStatus}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Turackfirm Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏛️ Turackfirm
              <Badge variant="secondary">Accounting Firm</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Visible Clients:</span>
            </div>
            
            {turackfirmClients.length > 0 ? (
              <div className="space-y-2">
                {turackfirmClients.map(client => (
                  <div key={client.id} className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-gray-600">ID: {client.id}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
                <EyeOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm text-gray-500">No clients visible</div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              Quick Login: 🏛️ Turackfirm Admin (turackadmin)
            </div>
          </CardContent>
        </Card>

        {/* Cricket Ontario Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏏 Cricket Ontario
              <Badge variant={connectionState === 'connected' ? 'default' : 'outline'}>
                {connectionState === 'connected' ? 'Managed' : 'Independent'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cricketStatus && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Status:</span>{' '}
                  {cricketStatus.firmId ? (
                    <Badge className="ml-1">Connected to Firm {cricketStatus.firmId}</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1">Independent Client</Badge>
                  )}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Admin User:</span> {cricketStatus.adminUser || 'cricketadmin'}
                </div>
                <div className="text-sm text-gray-500">
                  Client ID: {cricketStatus.id}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              Quick Login: 🏏 Cricket Ontario (Independent) (cricketadmin)
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={connectClient}
              disabled={isLoading || connectionState === 'connected'}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              Connect to Turackfirm
            </Button>
            
            <Button
              onClick={disconnectClient}
              disabled={isLoading || connectionState === 'disconnected'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Unlink className="h-4 w-4" />
              Disconnect (Make Independent)
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-900 mb-2">Test Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Click "Connect to Turackfirm" - Cricket Ontario becomes managed by Turackfirm</li>
              <li>2. Use quick login "🏛️ Turackfirm Admin" - you should see Cricket Ontario in client list</li>
              <li>3. Click "Disconnect" - Cricket Ontario becomes independent</li>
              <li>4. Use quick login "🏛️ Turackfirm Admin" - Cricket Ontario disappears from client list</li>
              <li>5. Use quick login "🏏 Cricket Ontario" - client can still access own data independently</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}