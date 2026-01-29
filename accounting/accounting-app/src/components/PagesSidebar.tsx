import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  GitBranch,
  UserCog,
  MessageSquare,
  TrendingUp,
  Megaphone,
  Building,
  Settings,
  Search,
  Calendar,
  CreditCard,
  Clock,
  BarChart3,
  FileBarChart,
  Bell
} from "lucide-react";

interface PagesSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  allowedModules: string[];
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
  description?: string;
}

const navSections: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview and metrics" },
    ]
  },
  {
    id: "client-operations",
    label: "Clients",
    icon: Users,
    items: [
      { id: "clients", label: "Client Management", icon: Users, description: "Manage client companies" },
      { id: "contact-management", label: "Contacts", icon: UserCog, description: "Manage contact persons for multiple clients" },
    ]
  },

  {
    id: "operations",
    label: "Operations",
    icon: CheckSquare,
    items: [
      { id: "projects", label: "Projects", icon: GitBranch, description: "Project management" },
      { id: "tasks", label: "Tasks", icon: CheckSquare, description: "Task management" },
      { id: "calendar", label: "Calendar", icon: Calendar, description: "Smart scheduling & planning" },
    ]
  },
  {
    id: "team",
    label: "Team & Communication",
    icon: UserCog,
    items: [
      { id: "communication", label: "Communication", icon: MessageSquare, description: "Messages and collaboration" },
      { id: "notifications", label: "Notifications", icon: Bell, description: "Notifications & client approvals" },
    ]
  },
  {
    id: "management",
    label: "Management",
    icon: Building,
    items: [
      { id: "team", label: "Team", icon: UserCog, description: "Staff management" },
      { 
        id: "reports", 
        label: "Reports", 
        icon: FileBarChart, 
        description: "Practice analytics & reports",
        subItems: [
          { 
            id: "practice", 
            label: "Practice Management", 
            icon: Building, 
            description: "Practice management",
            requiredRole: ["firm_owner"]
          }
        ]
      },
      { id: "time-expenses", label: "Time & Expenses", icon: Clock, description: "Time tracking & expenses" },
      { id: "billing", label: "Billing", icon: CreditCard, description: "Smart billing & payments" },
      { id: "settings", label: "Settings", icon: Settings, description: "System settings" },
    ]
  }
];

export default function PagesSidebar({ activeTab, setActiveTab, allowedModules }: PagesSidebarProps) {
  const [, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["overview", "client-operations", "operations", "team", "business", "management"]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Pages</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-100"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => allowedModules.includes(item.id));
            if (visibleItems.length === 0) {
              return null;
            }
            return (
            <div key={section.id} className="space-y-2">
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection(section.id)}
                  className="w-full justify-between p-2 h-auto text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <section.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{section.label}</span>
                  </div>
                  {expandedSections.includes(section.id) ? 
                    <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </Button>
              )}
              
              {expandedSections.includes(section.id) && !isCollapsed && (
                <div className="space-y-1 ml-2">
                  {visibleItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTab(item.id);
                        setLocation(`/pages/${item.id}`);
                      }}
                      className={`w-full justify-start p-2 h-auto text-left transition-colors ${
                        activeTab === item.id 
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600" 
                          : "hover:bg-gray-50"
                      } ${isCollapsed ? "px-2" : "px-3"}`}
                    >
                      <div className="flex items-start gap-2">
                        <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          activeTab === item.id ? "text-blue-600" : "text-gray-500"
                        }`} />
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500 mt-0.5 break-words whitespace-normal leading-relaxed">{item.description}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )})}
        </nav>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Practice Management System
          </div>
        </div>
      )}
    </div>
  );
}