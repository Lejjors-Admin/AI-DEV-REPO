import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Custom hook to get and manage the client ID from URL or state
 */
export function useClientId() {
  const [location] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);

  // Parse client ID from URL if present
  useEffect(() => {
    // Check for client ID in various URL patterns
    const urlPatterns = [
      // Financial data path with clientId
      /\/bookkeeping\/\w+\/(\d+)/,
      /\/financial-data\/\w+\/(\d+)/,
      // Client detail path
      /\/clients\/(\d+)/,
      // Bank feeds path (if it includes client ID)
      /\/bank-feeds\/(\d+)/,
    ];

    for (const pattern of urlPatterns) {
      const match = location.match(pattern);
      if (match && match[1]) {
        setClientId(parseInt(match[1], 10));
        return;
      }
    }

    // If a client ID is stored in session storage, use that
    const storedClientId = sessionStorage.getItem('selectedClientId');
    if (storedClientId) {
      setClientId(parseInt(storedClientId, 10));
    }
  }, [location]);

  // Function to update the client ID
  const updateClientId = (id: number | null) => {
    setClientId(id);
    if (id) {
      sessionStorage.setItem('selectedClientId', id.toString());
    } else {
      sessionStorage.removeItem('selectedClientId');
    }
  };

  return { clientId, updateClientId };
}