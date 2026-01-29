import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { apiConfig } from "../lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { DEV_BYPASS_AUTH, DEV_BYPASS_USER } from "@/lib/dev-bypass";

// Type definitions
interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  department?: string | null;
  position?: string | null;
  firmId?: number | null;
  clientId?: number | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

// Base registration data shared by all user types
interface BaseRegisterData extends LoginCredentials {
  name: string;
  email: string;
  role: string;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
}

// Firm admin specific registration data
interface FirmAdminRegisterData extends BaseRegisterData {
  firmId: number;
}

// Client admin specific registration data
interface ClientAdminRegisterData extends BaseRegisterData {
  clientId: number;
}

// Staff member specific registration data
interface StaffRegisterData extends BaseRegisterData {
  firmId: number;
}

// Union type for all registration data types
type RegisterData = BaseRegisterData | FirmAdminRegisterData | ClientAdminRegisterData | StaffRegisterData;

// Create invitation interface
interface InvitationData {
  email: string;
  role: string;
  expiresAt?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
  createInvitationMutation: ReturnType<typeof useCreateInvitationMutation>;
}

// Create context for auth state
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const autoLoginAttempted = useRef(false);
  const devBypassEnabled = DEV_BYPASS_AUTH;

  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/current-user"],
    queryFn: async () => {
      if (devBypassEnabled) {
        // In dev bypass mode, ensure we have a token by performing a real login
        const existingToken = localStorage.getItem('authToken');
        if (!existingToken) {
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
                console.log('🔐 Dev bypass: Auto-logged in and stored token');
              }
            }
          } catch (e) {
            console.warn('🔐 Dev bypass: Auto-login failed, continuing with mock user', e);
          }
        }
        return DEV_BYPASS_USER;
      }
      try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const res = await fetch(apiConfig.buildUrl("/api/current-user"), {
          method: "GET",
          headers,
          credentials: "include" // Fallback to session
        });
        if (res.status === 401) {
          // Clear invalid token
          if (token) {
            localStorage.removeItem('authToken');
            console.log('🔐 Invalid JWT token cleared');
          }
          return null; // Not authenticated
        }
        const userData = await res.json();
        console.log('🔐 Current user query result:', userData);
        return userData;
      } catch (error) {
        // Silently handle 401 errors - user just isn't authenticated
        if (error instanceof Error && error.message.includes('Not authenticated')) {
          return null;
        }
        console.log('Auth query error:', error);
        return null; // Handle any fetch errors
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();
  const createInvitationMutation = useCreateInvitationMutation();

  // Auto-login as admin if not authenticated - DISABLED TO PREVENT INFINITE LOOP
  // useEffect(() => {
  //   // Auto-login for development/testing - only for main app routes
  //   if (!isLoading && !user && !autoLoginAttempted.current && 
  //       process.env.NODE_ENV === 'development' && 
  //       !window.location.pathname.includes('/auth') && 
  //       !window.location.pathname.includes('/client-portal') && 
  //       !loginMutation.isPending) {
      
  //     autoLoginAttempted.current = true; // Mark as attempted to prevent infinite loop
      
  //     const autoLogin = async () => {
  //       try {
  //         console.log('🚀 Auto-logging in as admin user...');
  //         await loginMutation.mutateAsync({
  //           username: 'admin',
  //           password: 'password123'
  //         });
  //         console.log('✅ Auto-login successful');
  //       } catch (error) {
  //         console.warn('❌ Auto-login failed, user needs to login manually:', error);
  //         // Prevent unhandled promise rejection
  //         return;
  //       }
  //     };

  //     autoLogin().catch((error) => {
  //       console.log('Auto-login promise rejected:', error.message);
  //     });
  //   }
  // }, [user, isLoading, loginMutation.isPending]);

  // Show toast notifications for authentication actions
  useEffect(() => {
    if (loginMutation.isError) {
      toast({
        title: "Login failed",
        description: (loginMutation.error as Error).message || "Invalid credentials",
        variant: "destructive",
      });
    }

    if (registerMutation.isError) {
      toast({
        title: "Registration failed",
        description: (registerMutation.error as Error).message || "Could not create account",
        variant: "destructive",
      });
    }

    if (logoutMutation.isError) {
      toast({
        title: "Logout failed",
        description: (logoutMutation.error as Error).message,
        variant: "destructive",
      });
    }

    if (createInvitationMutation.isError) {
      toast({
        title: "Invitation failed",
        description: (createInvitationMutation.error as Error).message || "Could not create invitation",
        variant: "destructive",
      });
    }
  }, [
    loginMutation.isError, 
    registerMutation.isError, 
    logoutMutation.isError,
    createInvitationMutation.isError,
    toast
  ]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
        createInvitationMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for login mutation
function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      if (DEV_BYPASS_AUTH) {
        return DEV_BYPASS_USER;
      }
      try {
        const res = await fetch(apiConfig.buildUrl(apiConfig.endpoints.login), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include"
        });

        if (!res.ok) {
          let errorMessage;
          try {
            // Try to parse as JSON first
            const errorData = await res.json();
            errorMessage = errorData.message || "Login failed";
          } catch (e) {
            // If it's not JSON, get as text
            try {
              const text = await res.text();
              errorMessage = text || "Login failed";
            } catch (e2) {
              // If all else fails, use a generic message
              errorMessage = "Login failed";
            }
          }
          throw new Error(errorMessage);
        }

        return await res.json();
      } catch (error: any) {
        console.error("Login error:", {
          message: error.message,
          status: error.status,
          details: error.toString()
        });
        throw error;
      }
    },
    onSuccess: async (userData) => {
      if (DEV_BYPASS_AUTH) {
        // In dev bypass, ensure token is set by performing real login
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
              console.log('🔐 Dev bypass: Token stored from auto-login');
            }
          }
        } catch (e) {
          console.warn('🔐 Dev bypass: Auto-login failed', e);
        }
        queryClient.setQueryData(["/api/current-user"], DEV_BYPASS_USER);
        return;
      }
      // Store JWT token in localStorage if provided
      if (userData.token) {
        localStorage.setItem('authToken', userData.token);
        console.log('🔐 JWT token stored in localStorage');
      }
      
      // Update the current user data immediately (without token in the user object)
      const userWithoutToken = { ...userData };
      delete userWithoutToken.token;
      queryClient.setQueryData(["/api/current-user"], userWithoutToken);
      
      // Refetch current user to ensure we have the complete user data from the server
      await queryClient.refetchQueries({ queryKey: ["/api/current-user"] });
      
      // Invalidate all API queries
      queryClient.invalidateQueries({ queryKey: ["/api"] });
      
      console.log('🔐 Login successful, user data updated:', userWithoutToken);
    },
  });
}

// Custom hook for logout mutation
function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (DEV_BYPASS_AUTH) {
        return { ok: true };
      }
      try {
        const res = await fetch(apiConfig.buildUrl(apiConfig.endpoints.logout), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include"
        });

        if (!res.ok) {
          let errorMessage;
          try {
            // Try to parse as JSON first
            const errorData = await res.json();
            errorMessage = errorData.message || "Logout failed";
          } catch (e) {
            // If it's not JSON, get as text
            try {
              const text = await res.text();
              errorMessage = text || "Logout failed";
            } catch (e2) {
              // If all else fails, use a generic message
              errorMessage = "Logout failed";
            }
          }
          throw new Error(errorMessage);
        }

        return await res.json();
      } catch (error: any) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      if (DEV_BYPASS_AUTH) {
        queryClient.setQueryData(["/api/current-user"], DEV_BYPASS_USER);
        return;
      }
      // Clear JWT token from localStorage
      localStorage.removeItem('authToken');
      console.log('🔐 JWT token cleared from localStorage');
      
      queryClient.setQueryData(["/api/current-user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api"] });
    },
  });
}

// Custom hook for registration mutation
function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      try {
        const res = await fetch(apiConfig.buildUrl(apiConfig.endpoints.register), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include"
        });

        if (!res.ok) {
          let errorMessage;
          try {
            // Try to parse as JSON first
            const errorData = await res.json();
            errorMessage = errorData.message || "Registration failed";
          } catch (e) {
            // If it's not JSON, get as text
            try {
              const text = await res.text();
              errorMessage = text || "Registration failed";
            } catch (e2) {
              // If all else fails, use a generic message
              errorMessage = "Registration failed";
            }
          }
          throw new Error(errorMessage);
        }

        return await res.json();
      } catch (error: any) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/current-user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api"] });
    },
  });
}

// Custom hook for creating staff/client invitations
function useCreateInvitationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ type, data }: { type: 'staff' | 'client', data: InvitationData }) => {
      try {
        // Set the inviteType based on the type parameter
        const invitationData = {
          ...data,
          inviteType: type
        };

        // Get token from localStorage for authentication
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(apiConfig.buildUrl("/api/invitations"), {
          method: "POST",
          headers,
          body: JSON.stringify(invitationData),
          credentials: "include"
        });

        if (!res.ok) {
          let errorMessage;
          try {
            // Try to parse as JSON first
            const errorData = await res.json();
            errorMessage = errorData.message || errorData.error || `Failed to create ${type} invitation`;
          } catch (e) {
            // If it's not JSON, get as text
            try {
              const text = await res.text();
              errorMessage = text || `Failed to create ${type} invitation`;
            } catch (e2) {
              // If all else fails, use a generic message based on status
              if (res.status === 404) {
                errorMessage = "API endpoint not found. Please ensure the server is running and restarted.";
              } else if (res.status === 401) {
                errorMessage = "Authentication required. Please log in again.";
              } else {
                errorMessage = `Failed to create ${type} invitation (Status: ${res.status})`;
              }
            }
          }
          throw new Error(errorMessage);
        }

        return await res.json();
      } catch (error: any) {
        console.error("Invitation creation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const codeMessage = data.code 
        ? `Invitation code: ${data.code}. ` 
        : '';
      toast({
        title: "Invitation created",
        description: `${codeMessage}Invitation sent to ${data.email || 'the recipient'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

// Helper functions for checking user roles
const hasRole = (user: User | null, roles: string | string[]): boolean => {
  if (!user) return false;

  if (typeof roles === 'string') {
    return user.role === roles;
  }

  return roles.includes(user.role);
};

const isFirmAdmin = (user: User | null): boolean => {
  return hasRole(user, ['firm_admin', 'firm_owner']);
};

const isClientAdmin = (user: User | null): boolean => {
  return hasRole(user, 'client_admin');
};

const isStaff = (user: User | null): boolean => {
  return hasRole(user, ['staff', 'manager']);
};

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    console.error("useAuth must be used within an AuthProvider - providing fallback");
    // Return a fallback object to prevent crashes during initial render
    return {
      user: null,
      isLoading: true,
      error: null,
      loginMutation: {} as ReturnType<typeof useLoginMutation>,
      logoutMutation: {} as ReturnType<typeof useLogoutMutation>,
      registerMutation: {} as ReturnType<typeof useRegisterMutation>,
      createInvitationMutation: {} as ReturnType<typeof useCreateInvitationMutation>
    };
  }
  return context;
}