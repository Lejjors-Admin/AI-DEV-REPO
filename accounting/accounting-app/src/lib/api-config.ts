// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiConfig = {
  baseUrl: API_BASE_URL,
  
  // Helper function to build full API URLs
  buildUrl: (endpoint: string) => {
    // If endpoint is already a full URL (starts with http:// or https://), return as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    
    // In development, use relative URLs to leverage Vite proxy
    // This ensures the proxy intercepts /api requests and forwards to backend
    if (import.meta.env.DEV) {
      // Return relative URL (Vite proxy will handle /api/*)
      return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    }
    
    // In production, use absolute URLs
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
  },
  
  // Helper function to build URLs for static assets (images, etc.)
  // Uses the same protocol as API_BASE_URL to ensure consistency
  // If API_BASE_URL is HTTPS, assets will be HTTPS (reverse proxy handles it)
  // If API_BASE_URL is HTTP, assets will be HTTP (for development)
  buildAssetUrl: (path: string) => {
    // If path is already a full URL, use it as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Build URL from API base URL (preserves the protocol from API_BASE_URL)
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // If API_BASE_URL is HTTP but we're on HTTPS page, upgrade to HTTPS
    // This handles the case where reverse proxy terminates HTTPS
    if (typeof window !== 'undefined' && 
        window.location.protocol === 'https:' && 
        API_BASE_URL.startsWith('http://')) {
      // Extract the host and path from API_BASE_URL and upgrade to HTTPS
      try {
        const urlObj = new URL(API_BASE_URL);
        // Preserve the base path (e.g., /staging) if it exists
        const basePath = urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname;
        const httpsUrl = `https://${urlObj.host}${basePath}/${cleanPath}`;
        return httpsUrl;
      } catch (e) {
        // Fallback: simple string replacement if URL parsing fails
        return API_BASE_URL.replace('http://', 'https://') + '/' + cleanPath;
      }
    }
    
    // Use API_BASE_URL as-is (preserves protocol)
    return `${API_BASE_URL}/${cleanPath}`;
  },
  
  // Common API endpoints
  endpoints: {
    login: '/api/login',
    logout: '/api/logout',
    register: '/api/register',
    profile: '/api/profile',
    users: '/api/users',
    clients: '/api/clients',
    transactions: '/api/transactions',
    accounts: '/api/accounts',
    reports: '/api/reports',
  }
};

// Helper function for making API requests
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = apiConfig.buildUrl(endpoint);
  
  // Get token from localStorage
  const token = localStorage.getItem('authToken');
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session management (fallback)
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  return fetch(url, mergedOptions);
};
