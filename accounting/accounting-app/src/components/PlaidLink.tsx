import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PlaidLinkProps {
  clientId: number;
  onSuccess: (data: any) => void;
  linkedAccountId: number;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
}

export function PlaidLink({
  clientId,
  onSuccess,
  linkedAccountId,
  buttonText = 'Connect Bank Account',
  className,
  variant = 'default'
}: PlaidLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Function to get a link token
  const getPlaidLinkToken = useCallback(async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Client ID is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', `/api/bank-feeds/${clientId}/plaid/create-link-token`);
      const data = await response.json();
      setToken(data.link_token);
    } catch (error: any) {
      toast({
        title: 'Failed to connect to Plaid',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Handle successful link configuration
  const handleSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        setIsLoading(true);
        const accountId = metadata.accounts[0]?.id;
        
        // Exchange the public token for an access token
        const response = await apiRequest('POST', `/api/bank-feeds/${clientId}/plaid/exchange-token`, {
          publicToken,
          accountId,
          name: metadata.accounts[0]?.name || 'Bank Account',
          linkedAccountId,
        });
        
        const data = await response.json();
        
        toast({
          title: 'Account connected',
          description: 'Your bank account has been connected successfully!',
        });
        
        // Call the onSuccess callback with the data
        onSuccess(data);
      } catch (error: any) {
        toast({
          title: 'Failed to link account',
          description: error.message || 'An error occurred while linking your account',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, linkedAccountId, onSuccess]
  );

  // Initialize the Plaid Link configuration
  const config = token ? {
    token,
    onSuccess: (public_token: string, metadata: any) => {
      handleSuccess(public_token, metadata);
    },
    onExit: (err: any, metadata: any) => {
      setIsLoading(false);
      if (err) {
        toast({
          title: 'Connection error',
          description: err.display_message || 'Failed to connect to your bank',
          variant: 'destructive',
        });
      }
    },
  } : {};
  
  const { open, ready } = usePlaidLink(config as any);

  // Function to handle the button click
  const handleClick = useCallback(() => {
    if (token) {
      open();
    } else {
      getPlaidLinkToken();
    }
  }, [token, open, getPlaidLinkToken]);

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || (!!token && !ready)}
      className={className}
      variant={variant}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}