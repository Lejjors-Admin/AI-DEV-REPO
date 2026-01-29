import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiConfig } from "./api-config";
import { DEV_BYPASS_AUTH } from "./dev-bypass";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      // Try to parse as JSON first
      const errorData = await res.json();
      errorMessage = errorData.message || res.statusText;
    } catch (e) {
      // If it's not JSON, get as text
      try {
        const text = await res.text();
        errorMessage = text || res.statusText;
      } catch (e2) {
        // If all else fails, use statusText
        errorMessage = res.statusText;
      }
    }
    throw new Error(errorMessage);
  }
}

// Ensure token is available in dev bypass mode
async function ensureDevBypassToken(): Promise<string | null> {
  if (!DEV_BYPASS_AUTH) {
    return localStorage.getItem('authToken');
  }
  
  let token = localStorage.getItem('authToken');
  if (!token) {
    try {
      const loginRes = await fetch(apiConfig.buildUrl(apiConfig.endpoints.login), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'password123'
        }),
        credentials: "include"
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.token) {
          localStorage.setItem('authToken', loginData.token);
          token = loginData.token;
          console.log('🔐 Dev bypass: Auto-logged in and stored token');
        }
      }
    } catch (e) {
      console.warn('🔐 Dev bypass: Auto-login failed', e);
    }
  }
  return token;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit,
): Promise<Response> {
  const fullUrl = apiConfig.buildUrl(url);
  
  // Only set body for methods that support it
  const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const hasBody = data && methodsWithBody.includes(method.toUpperCase());
  
  // Get JWT token from localStorage, auto-login in dev bypass if needed
  const token = await ensureDevBypassToken();
  
  // Build base headers
  const headers: HeadersInit = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Merge with any headers from options, but ensure Authorization is preserved
  let mergedHeaders: HeadersInit = {};
  
  // Convert options.headers to a plain object if it exists
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      mergedHeaders = Object.fromEntries(options.headers.entries());
    } else if (Array.isArray(options.headers)) {
      mergedHeaders = Object.fromEntries(options.headers);
    } else {
      mergedHeaders = { ...options.headers };
    }
  }
  
  // Merge our headers (Authorization takes precedence)
  mergedHeaders = {
    ...mergedHeaders,
    ...headers, // Our headers (including Authorization) take precedence
  };
  
  // Extract options without headers to avoid override
  const { headers: _, ...restOptions } = options || {};
  
  console.log(`🌐 API Request: ${method} ${fullUrl}`, { hasBody, hasToken: !!token });
  
  // Add timeout to prevent infinite hanging (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error(`⏱️ Request timeout after 30s: ${method} ${fullUrl}`);
    controller.abort();
  }, 30000);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: mergedHeaders,
      body: hasBody ? JSON.stringify(data) : undefined,
      credentials: "include", // Fallback to session cookies
      signal: controller.signal,
      ...restOptions,
    });
    
    clearTimeout(timeoutId);
    console.log(`✅ API Response: ${method} ${fullUrl} - ${res.status} ${res.statusText}`);

    // Handle 401 errors specially - clear invalid token
    if (res.status === 401) {
      if (token) {
        localStorage.removeItem('authToken');
        console.log('🔐 Invalid JWT token cleared from apiRequest');
      }
      // Try to get error message from response
      let errorMessage = "Authentication required. Please log in again.";
      try {
        const errorData = await res.clone().json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use default message
      }
      throw new Error(errorMessage);
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`⏱️ API Request timeout: ${method} ${fullUrl}`);
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    console.error(`❌ API Request error: ${method} ${fullUrl}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = apiConfig.buildUrl(queryKey[0] as string);
    
    // Get JWT token from localStorage, auto-login in dev bypass if needed
    const token = await ensureDevBypassToken();
    
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include", // Fallback to session cookies
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Clear invalid token
      if (token) {
        localStorage.removeItem('authToken');
        console.log('🔐 Invalid JWT token cleared from queryClient');
      }
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
