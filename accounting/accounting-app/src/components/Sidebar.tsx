import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart2, Calculator, ChevronDown, Settings, Building2, Users, CreditCard, FileText, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: SidebarProps) {

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r flex flex-col transition-all duration-300 fixed h-full overflow-y-auto z-50`}>
      {/* Collapse Button */}
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-center"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        {/* Overview */}
        <Button
          variant={activeTab === "overview" ? "default" : "ghost"}
          onClick={() => setActiveTab("overview")}
          className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} flex items-center text-sm py-2`}
        >
          <BarChart2 className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Overview</span>}
        </Button>

        {/* Accounting Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={["accounts", "transaction-manager", "journal-entries", "reporting"].includes(activeTab) ? "default" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} flex items-center text-sm py-2`}
            >
              <Calculator className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span className="ml-2">Accounting</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? "right" : "bottom"} align="start">
            <DropdownMenuItem onClick={() => setActiveTab("accounts")}>
              <Users className="h-4 w-4 mr-2" />
              Chart of Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("transaction-manager")}>
              <CreditCard className="h-4 w-4 mr-2" />
              Transaction Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("journal-entries")}>
              <FileText className="h-4 w-4 mr-2" />
              Journal Entries
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("reporting")}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Financial Reports
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bookkeeping Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={["client-details", "bookkeeping-settings", "contacts", "settings"].includes(activeTab) ? "default" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} flex items-center text-sm py-2`}
            >
              <Settings className="h-4 w-4" />
              {!isCollapsed && (
                <>
                  <span className="ml-2">Bookkeeping</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? "right" : "bottom"} align="start">
            <DropdownMenuItem onClick={() => setActiveTab("client-details")}>
              <Building2 className="h-4 w-4 mr-2" />
              Company Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("bookkeeping-settings")}>
              <Calculator className="h-4 w-4 mr-2" />
              Bookkeeping Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("contacts")}>
              <Users className="h-4 w-4 mr-2" />
              Contacts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab("settings")}>
              <Settings className="h-4 w-4 mr-2" />
              General Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Milton AI */}
        <Button
          variant={activeTab === "milton-ai" ? "default" : "ghost"}
          onClick={() => setActiveTab("milton-ai")}
          className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} flex items-center text-sm py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
          </svg>
          {!isCollapsed && <span className="ml-2">Milton AI</span>}
        </Button>
      </div>
    </div>
  );
}