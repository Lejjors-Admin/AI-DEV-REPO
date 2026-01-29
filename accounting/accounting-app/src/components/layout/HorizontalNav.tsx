import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Search, 
  User, 
  Bot, 
  Brain,
  BrainCircuit, 
  Shield,
  Users,
  FolderOpen,
  Calculator,
  LogOut,
  Plug,
  DollarSign,
  CreditCard,
  UserCheck,
  FileText,
  ChevronDown,
  Crown
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function HorizontalNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Determine which module is active based on current route
  const getActiveModule = () => {
    if (location.startsWith('/saas-admin')) {
      return 'SAAS';
    } else if (location.startsWith('/pages') || location === '/') {
      return 'PAGES';
    } else if (location.startsWith('/books') || location.startsWith('/bookkeeping') || location.startsWith('/financial-data') || location.startsWith('/transactions') || location.startsWith('/cheques') || location.startsWith('/trial-balance')) {
      return 'BOOKS';
    } else if (location.startsWith('/binder') || location.startsWith('/audit-files')) {
      return 'BINDERS';
    }
    return '';
  };

  const activeModule = getActiveModule();

  const getModuleColor = (module: string) => {
    if (activeModule === module) {
      switch (module) {
        case 'SAAS':
          return 'bg-yellow-500 text-white hover:bg-yellow-600';
        case 'PAGES':
          return 'bg-blue-500 text-white hover:bg-blue-600';
        case 'BOOKS':
          return 'bg-green-500 text-white hover:bg-green-600';
        case 'BINDERS':
          return 'bg-purple-500 text-white hover:bg-purple-600';
        default:
          return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      }
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  return (
    <>
      {/* Desktop Header */}
      <div className="hidden md:block bg-green-950 border-b border-green-800 px-4 lg:px-6 py-3">
        <div className="flex items-center">
          {/* Logo */}
          <div className="flex-shrink-0 mr-6 lg:mr-8">
            <Link href="/">
              <div className="flex items-center">
                <div className="w-10 h-8 bg-green-800 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-stone-100 font-bold text-sm tracking-wide">L</span>
                </div>
                <span className="ml-3 text-lg lg:text-xl font-bold text-stone-100 tracking-wide">Lejjors</span>
              </div>
            </Link>
          </div>

          {/* Spacer for right-aligned items */}
          <div className="flex-1"></div>

          {/* Profile Picture */}
          <div className="flex items-center space-x-3 mr-4">
            <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-stone-100" />
            </div>
            <span className="text-sm font-medium text-stone-200 hidden lg:block">{user?.name || user?.username}</span>
          </div>

        {/* Settings Dropdown */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 text-stone-200 hover:text-stone-100 hover:bg-green-800">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/search" className="flex items-center w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/user-profile" className="flex items-center w-full">
                  <User className="h-4 w-4 mr-2" />
                  User Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-agents" className="flex items-center w-full">
                  <Bot className="h-4 w-4 mr-2" />
                  AI Agents
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-settings" className="flex items-center w-full">
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  AI Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-learning-center" className="flex items-center w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Learning Center
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tars-autonomous" className="flex items-center w-full">
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  TARS Autonomous Agent
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/access-control" className="flex items-center w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Access Control
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/integrations" className="flex items-center w-full">
                  <Plug className="h-4 w-4 mr-2" />
                  Integrations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              
              {/* SaaS Admin - Only for saas_owner */}
              {user?.role === 'saas_owner' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/saas-admin" className="flex items-center w-full">
                      <Crown className="h-4 w-4 mr-2" />
                      SaaS Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-2 text-sm text-gray-500">
                Logged in as: {user?.name || user?.username}
              </div>
              
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                className="flex items-center w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-green-950 border-b border-green-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center">
              <div className="w-10 h-8 bg-green-800 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-stone-100 font-bold text-sm tracking-wide">L</span>
              </div>
              <span className="ml-3 text-lg font-bold text-stone-100 tracking-wide">Lejjors</span>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Profile Picture */}
            <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-stone-100" />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 text-stone-200 hover:text-stone-100 hover:bg-green-800">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 text-sm text-gray-500 border-b">
                {user?.name || user?.username}
              </div>
              <DropdownMenuItem asChild>
                <Link href="/search" className="flex items-center w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              
              {/* SaaS Admin - Only for saas_owner (mobile) */}
              {user?.role === 'saas_owner' && (
                <DropdownMenuItem asChild>
                  <Link href="/saas-admin" className="flex items-center w-full">
                    <Crown className="h-4 w-4 mr-2" />
                    SaaS Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                className="flex items-center w-full text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Hidden since smart navigation is now at top of sidebar */}
      <div className="hidden">
        {/* Bottom navigation removed - using smart navigation at top of sidebar instead */}
      </div>
    </>
  );
}