import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link, Loader2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  accountId: number;
  accountName: string;
  clientId: number;
  onSuccess?: () => void;
}

export function PlaidLinkButton({ accountId, accountName, clientId, onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Create link token when component mounts or when user clicks connect
  const createLinkToken = async () => {
    setIsLoading(true);
    try {
      console.log('Creating Plaid link token with:', { clientId, accountName });
      const response = await apiRequest('POST', '/api/plaid/create-link-token', {
        clientId: parseInt(clientId.toString()),
        accountName
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      const data = await response.json();
      setLinkToken(data.link_token);
      
      // Automatically open Plaid Link once token is ready
      setTimeout(() => {
        if (data.link_token) {
          // Token is ready, usePlaidLink will handle opening
        }
      }, 100);
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: "Connection Error",
        description: "Failed to initialize bank connection. Please check your Plaid credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    try {
      setIsLoading(true);
      
      // Exchange public token for access token
      const response = await apiRequest('POST', '/api/plaid/exchange-public-token', {
        public_token,
        clientId,
        accountId,
        institutionName: metadata.institution?.name || 'Unknown Bank'
      });

      if (response.ok) {
        toast({
          title: "Bank Connected Successfully!",
          description: `${accountName} has been connected to ${metadata.institution?.name || 'your bank'}.`,
        });
        onSuccess?.();
      } else {
        throw new Error('Failed to exchange token');
      }
    } catch (error) {
      console.error('Error exchanging public token:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to complete bank connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaidExit = (err: any, metadata: any) => {
    if (err) {
      console.error('Plaid Link exit error:', err);
      toast({
        title: "Connection Cancelled",
        description: "Bank connection was cancelled or failed.",
        variant: "destructive",
      });
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  const handleConnect = async () => {
    if (!linkToken) {
      await createLinkToken();
      // After token is created, the effect below will handle opening
    } else if (ready) {
      open();
    }
  };

  // Effect to open Plaid Link when token becomes available
  useEffect(() => {
    if (linkToken && ready && !isLoading) {
      open();
    }
  }, [linkToken, ready, open, isLoading]);

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleConnect}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Link className="h-4 w-4 mr-1" />
      )}
      {isLoading ? 'Connecting...' : 'Connect'}
    </Button>
  );
}