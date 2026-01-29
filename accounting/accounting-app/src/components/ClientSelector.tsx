import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientSelectorProps {
  updateClientId: (clientId: number | null) => void;
  className?: string;
}

export function ClientSelector({ updateClientId, className }: ClientSelectorProps) {
  const [location, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<string>('');

  // Query clients with error handling
  const { data: clients, isLoading, error } = useQuery<any>({
    queryKey: ['/api/clients'],
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update selection based on URL if client ID is present in URL
  useEffect(() => {
    // Try to extract client ID from URL patterns
    const patterns = [
      /\/clients\/(\d+)/,
      /\/bookkeeping\/\w+\/(\d+)/,
      /\/financial-data\/\w+\/(\d+)/,
      /\/bank-feeds\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = location.match(pattern);
      if (match && match[1]) {
        setSelectedClient(match[1]);
        updateClientId(parseInt(match[1], 10));
        return;
      }
    }

    // If a client ID is stored in session storage, use that
    const storedClientId = sessionStorage.getItem('selectedClientId');
    if (storedClientId) {
      setSelectedClient(storedClientId);
      updateClientId(parseInt(storedClientId, 10));
    }
  }, [location, updateClientId]);

  // Handle client selection
  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    
    if (value) {
      const clientId = parseInt(value, 10);
      updateClientId(clientId);
      sessionStorage.setItem('selectedClientId', value);
    } else {
      updateClientId(null);
      sessionStorage.removeItem('selectedClientId');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (error) {
    console.error('Client loading error:', error);
    return (
      <div className="text-red-500 text-sm">
        Error loading clients. Please refresh.
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No clients available
      </div>
    );
  }

  return (
    <div className={className}>
      <Select value={selectedClient} onValueChange={handleClientChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {!clients || clients.length === 0 ? (
            <SelectItem value="none" disabled>No clients available</SelectItem>
          ) : (
            clients.map((client: any) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}