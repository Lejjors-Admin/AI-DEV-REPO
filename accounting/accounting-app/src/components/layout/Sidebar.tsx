import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Users, 
  BarChart3, 
  FileText, 
  FileOutput, 
  Settings,
  LogOut,
  Wallet,
  CreditCard,
  Calendar,
  Lock,
  Brain,
  Zap,
  Crown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Define navigation items based on user role
  const isBusinessUser = user?.role === 'client_admin';

  // Navigation items
  const allNavItems = [
    { path: "/", label: "Dashboard", icon: Home, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
    { path: "/clients", label: "Clients", icon: Users, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/bookkeeping", label: "Bookkeeping", icon: BarChart3, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
    { path: "/reports", label: "Reports", icon: FileText, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
    { path: "/binder", label: "Binder", icon: FileText, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/calendar", label: "Calendar", icon: Calendar, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/ai-agents", label: "AI Agents", icon: Zap, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/ai-settings", label: "AI Settings", icon: Brain, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/access-control", label: "Access Control", icon: Lock, roles: ['super_admin', 'firm_admin'] },
    { path: "/saas-admin", label: "SaaS Admin Panel", icon: Crown, roles: ['super_admin'] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <div
      className={cn(
        "md:flex md:flex-shrink-0 transition-all duration-300",
        open ? "block" : "hidden"
      )}
    >
      <div className="flex flex-col w-64 bg-white border-r border-neutral-300">
        {/* Logo Area */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-neutral-300">
          <h1 className="text-xl font-semibold text-primary">AccountSync</h1>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;

              return (
                <div key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                  >
                    <div
                      className={cn(
                        "flex items-center px-4 py-3 text-neutral-900 rounded-lg hover:bg-neutral-100 group",
                        isActive && "sidebar-item active border-l-4 border-primary bg-primary/10"
                      )}
                    >
                      <Icon className={cn(
                        "w-6 h-6", 
                        isActive ? "text-primary" : "text-neutral-500"
                      )} />
                      <span className="ml-3">{item.label}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center p-4 border-t border-neutral-300">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-900">{user?.name || 'User'}</p>
            <p className="text-xs text-neutral-500">{user?.role || 'Loading...'}</p>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Do you want to log out?')) {
                fetch('/api/logout', { method: 'POST tourism_enquiry_web_applications')
                  .then(() => { window.location.href = '/auth/login'; });
              }
            }}
            className="p-1 ml-auto text-neutral-500 hover:text-neutral-900 focus:outline-none"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

```tool_code
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Users, 
  BarChart3, 
  FileText, 
  FileOutput, 
  Settings,
  LogOut,
  Wallet,
  CreditCard,
  Calendar,
  Lock,
  Brain,
  Zap,
  Briefcase // Added Briefcase icon for Pages
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Define navigation items based on user role
  const isBusinessUser = user?.role === 'client_admin';

  // Navigation items
  const allNavItems = [
    { path: "/", label: "Dashboard", icon: Home, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
    { path: "/clients", label: "Clients", icon: Users, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/bookkeeping", label: "Bookkeeping", icon: BarChart3, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
    { path: "/pages", label: "Pages", icon: Briefcase, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] }, // Added Pages navigation item
    { path: "/binder", label: "Binder", icon: FileText, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/calendar", label: "Calendar", icon: Calendar, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/ai-agents", label: "AI Agents", icon: Zap, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/ai-settings", label: "AI Settings", icon: Brain, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff'] },
    { path: "/access-control", label: "Access Control", icon: Lock, roles: ['super_admin', 'firm_admin'] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ['super_admin', 'firm_admin', 'firm_staff', 'staff', 'client_admin', 'client'] },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <div
      className={cn(
        "md:flex md:flex-shrink-0 transition-all duration-300",
        open ? "block" : "hidden"
      )}
    >
      <div className="flex flex-col w-64 bg-white border-r border-neutral-300">
        {/* Logo Area */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-neutral-300">
          <h1 className="text-xl font-semibold text-primary">AccountSync</h1>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;

              return (
                <div key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                  >
                    <div
                      className={cn(
                        "flex items-center px-4 py-3 text-neutral-900 rounded-lg hover:bg-neutral-100 group",
                        isActive && "sidebar-item active border-l-4 border-primary bg-primary/10"
                      )}
                    >
                      <Icon className={cn(
                        "w-6 h-6", 
                        isActive ? "text-primary" : "text-neutral-500"
                      )} />
                      <span className="ml-3">{item.label}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center p-4 border-t border-neutral-300">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-900">{user?.name || 'User'}</p>
            <p className="text-xs text-neutral-500">{user?.role || 'Loading...'}</p>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Do you want to log out?')) {
                fetch('/api/logout', { method: 'POST tourism_enquiry_web_applications')
                  .then(() => { window.location.href = '/auth/login'; });
              }
            }}
            className="p-1 ml-auto text-neutral-500 hover:text-neutral-900 focus:outline-none"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}