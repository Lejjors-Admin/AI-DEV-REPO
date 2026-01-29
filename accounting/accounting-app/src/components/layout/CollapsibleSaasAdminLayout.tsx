import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface CollapsibleSaasAdminLayoutProps {
  children: React.ReactNode;
}

export function CollapsibleSaasAdminLayout({ children }: CollapsibleSaasAdminLayoutProps) {
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();
  const { logoutMutation } = useAuth();

  const handleLogout = async () => {
    try {
      // Use the logout mutation which handles token removal and cache clearing
      await logoutMutation.mutateAsync();
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the SaaS admin panel",
      });
      
      // Redirect to login page using navigate to avoid page refresh
      navigate('/auth');
    } catch (error) {
      // Even if API call fails, clear local token and redirect
      localStorage.removeItem('authToken');
      console.log('🔐 JWT token cleared from localStorage (fallback)');
      
      toast({
        title: "Logged out",
        description: "You have been logged out locally",
      });
      
      // Redirect to login page using navigate to avoid page refresh
      navigate('/auth');
    }
  };

  const navigation = [
    {
      name: 'Overview',
      href: '/saas-admin',
      icon: BarChart3,
      description: 'Platform metrics and analytics'
    },
    {
      name: 'Firm Management',
      href: '/saas-admin/firms',
      icon: Building2,
      description: 'Manage accounting firms'
    },
    {
      name: 'User Management',
      href: '/saas-admin/users',
      icon: Users,
      description: 'Platform user administration'
    },
    {
      name: 'Subscriptions',
      href: '/saas-admin/subscriptions',
      icon: CreditCard,
      description: 'Billing and subscription plans'
    },
    {
      name: 'Platform Settings',
      href: '/saas-admin/settings',
      icon: Settings,
      description: 'System configuration'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/saas-admin') {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Mobile menu overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 shadow-sm transition-all duration-300 lg:relative lg:translate-x-0",
        isCollapsed ? "w-16" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">SaaS Admin</h1>
                <p className="text-xs text-gray-500">Platform Management</p>
              </div>
            </div>
          )}
          
          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 hover:bg-gray-100"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors group relative cursor-pointer",
                  active
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  isCollapsed ? "justify-center" : "justify-start"
                )}>
                  <Icon className={cn(
                    "flex-shrink-0",
                    active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600",
                    isCollapsed ? "w-5 h-5" : "w-5 h-5 mr-3"
                  )} />
                  
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-300">{item.description}</div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Crown className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
                  <p className="text-xs text-gray-500">Platform Administrator</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 relative group"
            >
              <LogOut className="w-4 h-4" />
              {/* Tooltip for collapsed state */}
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap">
                Logout
              </div>
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(true)}
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">SaaS Admin</span>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}