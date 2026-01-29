import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  BarChart3, 
  FileText, 
  CreditCard, 
  Settings,
  BookOpen,
  Calculator,
  TrendingUp,
  Bot,
  DollarSign,
  Receipt,
  Users,
  FileCheck,
  PiggyBank,
  Building
} from "lucide-react";

interface SimpleSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavSection {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export function SimpleSidebar({ activeTab, setActiveTab }: SimpleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['accounting']);

  const navSections: NavSection[] = [
    {
      id: "accounting",
      label: "Accounting",
      icon: Calculator,
      items: [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "chart-of-accounts", label: "Chart of Accounts", icon: FileText },
        { id: "trial-balance", label: "Trial Balance", icon: Calculator },
        { id: "transactions", label: "Transactions", icon: CreditCard },
        { id: "financial-reports", label: "Financial Reports", icon: TrendingUp },
      ]
    },
    {
      id: "income",
      label: "Income",
      icon: DollarSign,
      items: [
        { id: "invoices", label: "Invoices", icon: Receipt },
        { id: "payments", label: "Payments", icon: DollarSign },
        { id: "recurring-income", label: "Recurring Income", icon: TrendingUp },
      ]
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: Receipt,
      items: [
        { id: "expense-tracking", label: "Expense Tracking", icon: Receipt },
        { id: "vendor-bills", label: "Vendor Bills", icon: FileText },
        { id: "expense-categories", label: "Categories", icon: BookOpen },
      ]
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: Users,
      items: [
        { id: "employee-management", label: "Employees", icon: Users },
        { id: "payroll-runs", label: "Payroll Runs", icon: Calculator },
        { id: "payroll-reports", label: "Payroll Reports", icon: BarChart3 },
      ]
    },
    {
      id: "taxes",
      label: "Taxes",
      icon: FileCheck,
      items: [
        { id: "tax-settings", label: "Tax Settings", icon: Settings },
        { id: "tax-reports", label: "Tax Reports", icon: FileText },
        { id: "tax-filing", label: "Tax Filing", icon: FileCheck },
      ]
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      items: [
        { id: "bookkeeping-settings", label: "Bookkeeping Settings", icon: Settings },
        { id: "integrations", label: "Integrations", icon: CreditCard },
        { id: "binder", label: "Binder", icon: BookOpen },
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    if (isCollapsed) return;
    
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      // When collapsing, expand all sections so items are visible on hover
      setExpandedSections(navSections.map(section => section.id));
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Client Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Test Client</h2>
                <p className="text-xs text-gray-500">AccountSync</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections.includes(section.id);
          
          return (
            <div key={section.id} className="mb-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-50 ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                }`}
                title={isCollapsed ? section.label : undefined}
              >
                <div className="flex items-center">
                  <SectionIcon className="h-4 w-4 flex-shrink-0 text-gray-600" />
                  {!isCollapsed && <span className="ml-3 font-medium text-gray-700">{section.label}</span>}
                </div>
                {!isCollapsed && (
                  isExpanded ? 
                    <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Section Items */}
              {(isExpanded && !isCollapsed) && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="ml-3">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Milton AI Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={() => setActiveTab("milton-ai")}
          className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 ${
            activeTab === "milton-ai" ? 'ring-2 ring-purple-300' : ''
          }`}
          title={isCollapsed ? "Milton AI" : undefined}
        >
          <Bot className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Milton AI</span>}
        </button>
      </div>
    </div>
  );
}