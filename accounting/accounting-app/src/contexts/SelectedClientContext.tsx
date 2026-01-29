import { apiConfig } from '@/lib/api-config';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface SelectedClientContextValue {
  selectedClientId: number | null;
  selectedClientName: string | null;
  setSelectedClientId: (clientId: number | null, clientName?: string | null) => Promise<void>;
}

const SelectedClientContext = createContext<SelectedClientContextValue | undefined>(undefined);

export function SelectedClientProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [selectedClientId, setSelectedClientIdState] = useState<number | null>(null);
  const [selectedClientName, setSelectedClientNameState] = useState<string | null>(null);
  
  console.log('🔵 SelectedClientContext state:', selectedClientId, selectedClientName);

  // Initialize from URL or sessionStorage on mount
  useEffect(() => {
    console.log('📍 URL changed to:', location);
    
    const urlPatterns = [
      /\/clients\/(\d+)/,
      /\/bookkeeping\/[\w-]+\/(\d+)/,
      /\/financial-data\/[\w-]+\/(\d+)/,
      /\/bank-feeds\/(\d+)/,
      /\/reconcile\/(\d+)/,
      /\/rules\/(\d+)/,
      /\/trial-balance\/(\d+)/,
      /\/tax-settings\/(\d+)/,
      /\/reports\/[\w-]+\/(\d+)/,
    ];

    // Helper to validate client access with backend
    const validateAndSetClient = async (clientId: number, clientName?: string | null) => {
      try {
        const token= localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(apiConfig.buildUrl('/api/session/select-client'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'include',
          body: JSON.stringify({ clientId })
        });
        
        if (response.ok) {
          console.log('✅ Backend validated client access:', clientId);
          setSelectedClientIdState(clientId);
          setSelectedClientNameState(clientName || null);
          sessionStorage.setItem('selectedClientId', clientId.toString());
          if (clientName) {
            sessionStorage.setItem('selectedClientName', clientName);
          } else {
            sessionStorage.removeItem('selectedClientName');
          }
        } else {
          console.error('Backend rejected client access:', clientId);
          sessionStorage.removeItem('selectedClientId');
          sessionStorage.removeItem('selectedClientName');
          setSelectedClientIdState(null);
          setSelectedClientNameState(null);
        }
      } catch (error) {
        console.error('Error validating client access:', error);
        sessionStorage.removeItem('selectedClientId');
        sessionStorage.removeItem('selectedClientName');
        setSelectedClientIdState(null);
        setSelectedClientNameState(null);
      }
    };

    for (const pattern of urlPatterns) {
      const match = location.match(pattern);
      if (match && match[1]) {
        const clientId = parseInt(match[1], 10);
        console.log('✅ Found client ID in URL:', clientId);
        validateAndSetClient(clientId);
        return;
      }
    }

    // Fallback to sessionStorage if no URL match
    const storedClientId = sessionStorage.getItem('selectedClientId');
    const storedClientName = sessionStorage.getItem('selectedClientName');
    console.log('📦 Reading from sessionStorage:', storedClientId, storedClientName);
    if (storedClientId) {
      const clientId = parseInt(storedClientId, 10);
      console.log('✅ Setting client ID from sessionStorage:', clientId);
      // Set name optimistically if available
      if (storedClientName) {
        setSelectedClientNameState(storedClientName);
      }
      validateAndSetClient(clientId, storedClientName);
    } else {
      console.log('⚠️ No stored client ID found');
    }
  }, [location]);

  const setSelectedClientId = async (clientId: number | null, clientName?: string | null) => {
    console.log('🟢 setSelectedClientId called with:', clientId, clientName);
    
    if (clientId) {
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        // Call backend to validate and set active client in session
        const response = await fetch(apiConfig.buildUrl('/api/session/select-client'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          credentials: 'include',
          body: JSON.stringify({ clientId })
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to select client on backend:', error);
          throw new Error(error.error || 'Access denied to this client');
        }
        
        const data = await response.json();
        console.log('✅ Backend validated client access:', data);
        
        // Update local state only after backend validates access
        setSelectedClientIdState(clientId);
        setSelectedClientNameState(clientName || null);
        sessionStorage.setItem('selectedClientId', clientId.toString());
        if (clientName) {
          sessionStorage.setItem('selectedClientName', clientName);
        } else {
          sessionStorage.removeItem('selectedClientName');
        }
        console.log('Client changed to:', clientId, clientName);
      } catch (error) {
        console.error('Error selecting client:', error);
        // Don't update state if backend rejects
        throw error;
      }
    } else {
      setSelectedClientIdState(null);
      setSelectedClientNameState(null);
      sessionStorage.removeItem('selectedClientId');
      sessionStorage.removeItem('selectedClientName');
    }
  };

  return (
    <SelectedClientContext.Provider value={{ selectedClientId, selectedClientName, setSelectedClientId }}>
      {children}
    </SelectedClientContext.Provider>
  );
}

export function useSelectedClient() {
  const context = useContext(SelectedClientContext);
  if (context === undefined) {
    throw new Error('useSelectedClient must be used within a SelectedClientProvider');
  }
  return context;
}
