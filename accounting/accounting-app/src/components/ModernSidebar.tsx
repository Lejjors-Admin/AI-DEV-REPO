import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  Building,
  Moon,
  Sun,
  Bell,
  HelpCircle,
  Sparkles,
  Search,
  FolderOpen
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

interface ModernSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clients: any[];
  isLoadingClients: boolean;
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

export function ModernSidebar({ 
  activeTab, 
  setActiveTab, 
  clients, 
  isLoadingClients
}: ModernSidebarProps) {
  const [location] = useLocation();
  const { selectedClientId, selectedClientName, setSelectedClientId } = useSelectedClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['accounting']);
  const [searchQuery, setSearchQuery] = useState("");

  // Convert selectedClientId to string for compatibility
  const selectedClient = selectedClientId ? selectedClientId.toString() : "";

  // Handle client change
  const handleClientChange = async (clientId: string) => {
    try {
      const clientIdNum = clientId ? parseInt(clientId, 10) : null;
      // Find the client name from the clients array
      const client = clients?.find((c: any) => c.id.toString() === clientId);
      const clientName = client?.name || null;
      await setSelectedClientId(clientIdNum, clientName);
    } catch (error) {
      console.error('Error changing client:', error);
    }
  };

  // Determine which module is active based on current route
  const getActiveModule = () => {
    if (location.startsWith('/pages') || location === '/') {
      return 'PAGES';
    } else if (location.startsWith('/books') || location.startsWith('/bookkeeping') || location.startsWith('/financial-data') || location.startsWith('/transactions') || location.startsWith('/cheques') || location.startsWith('/trial-balance')) {
      return 'BOOKS';
    } else if (location.startsWith('/binder') || location.startsWith('/audit-files')) {
      return 'BINDERS';
    }
    return '';
  };

  const activeModule = getActiveModule();

  const navSections: NavSection[] = [
    {
      id: "accounting",
      label: "Accounting",
      icon: Calculator,
      items: [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "accounts", label: "Chart of Accounts", icon: FileText },
        { id: "journal-entries", label: "Journal Entries", icon: FileText },
        { id: "transaction-manager", label: "Transaction Manager", icon: CreditCard },
        { id: "reporting", label: "Financial Reports", icon: BarChart3 },
      ]
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      items: [
        { id: "bookkeeping-settings", label: "Bookkeeping Settings", icon: Settings },
        { id: "milton-ai", label: "Milton AI", icon: Sparkles },
      ]
    }
  ];

  // Direct navigation items (not in collapsible sections)
  const directNavItems: NavItem[] = [
    { id: "income-management", label: "Income", icon: DollarSign },
    { id: "expense-management", label: "Expenses", icon: Receipt },
    { id: "payroll-management", label: "Payroll", icon: Users },
    { id: "tax-management", label: "Taxes", icon: FileCheck },
  ];

  // Developer/Testing tools
  const testingNavItems: NavItem[] = [
    { id: "ocr-test", label: "OCR Testing Lab", icon: Search },
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
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Filter clients based on search query
  const filteredClients = clients?.filter((client: any) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Get selected client name for display (use from context if available, otherwise find from clients array)
  const displayClientName = selectedClientName || clients?.find((client: any) => 
    client.id.toString() === selectedClient
  )?.name;

  const themeClasses = isDarkMode ? {
    sidebar: "bg-gray-900 border-gray-800 text-white",
    header: "border-gray-800",
    sectionHeader: "text-gray-300 hover:bg-gray-800",
    sectionIcon: "text-gray-400",
    sectionText: "text-gray-300",
    navItem: "text-gray-400 hover:bg-gray-800 hover:text-white",
    navItemActive: "bg-blue-600 text-white",
    bottomSection: "border-gray-800",
    userSection: "text-gray-400 hover:bg-gray-800",
    logo: "text-blue-400"
  } : {
    sidebar: "bg-white border-gray-200 text-gray-900",
    header: "border-gray-200",
    sectionHeader: "text-gray-700 hover:bg-gray-50",
    sectionIcon: "text-gray-500",
    sectionText: "text-gray-700",
    navItem: "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
    navItemActive: "bg-blue-50 text-blue-700",
    bottomSection: "border-gray-200",
    userSection: "text-gray-600 hover:bg-gray-50",
    logo: "text-blue-600"
  };

  return (
    <div className={`${themeClasses.sidebar} h-full flex flex-col transition-all duration-300 border-r ${
      isCollapsed ? 'w-12' : 'w-80'
    }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Sleek Bubble Pills Navigation (5B Design) */}
      <div className="p-3 border-b border-gray-200">
        {isCollapsed ? (
          // Show only active module when collapsed
          <div className="flex justify-center">
            {activeModule === 'PAGES' && (
              <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full" title="Pages">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            )}
            {activeModule === 'BOOKS' && (
              <div className="w-8 h-8 flex items-center justify-center bg-green-500 rounded-full" title="Books">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            )}
            {activeModule === 'BINDERS' && (
              <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full" title="Binders">
                <FolderOpen className="h-4 w-4 text-purple-600" />
              </div>
            )}
            {!activeModule && (
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full" title="Dashboard">
                <BarChart3 className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ) : (
          // Show compact sleek bubble pills when expanded
          <div className="px-3">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-full p-1 shadow-sm w-full">
              <Link href="/pages" className="flex-1">
                <button className={`flex items-center justify-center space-x-1.5 w-full px-3 py-2 rounded-full transition-all ${
                  activeModule === 'PAGES' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`} title="Pages">
                  <div className={`w-2 h-2 rounded-full ${
                    activeModule === 'PAGES' ? 'bg-blue-300' : 'bg-gray-400'
                  }`}></div>
                  <FileText className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/books" className="flex-1">
                <button className={`flex items-center justify-center space-x-1.5 w-full px-3 py-2 rounded-full transition-all ${
                  activeModule === 'BOOKS' 
                    ? 'bg-green-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`} title="Books">
                  <div className={`w-2 h-2 rounded-full ${
                    activeModule === 'BOOKS' ? 'bg-green-300' : 'bg-gray-400'
                  }`}></div>
                  <BookOpen className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/binder" className="flex-1">
                <button className={`flex items-center justify-center space-x-1.5 w-full px-3 py-2 rounded-full transition-all ${
                  activeModule === 'BINDERS' 
                    ? 'bg-purple-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`} title="Binders">
                  <div className={`w-2 h-2 rounded-full ${
                    activeModule === 'BINDERS' ? 'bg-purple-300' : 'bg-gray-400'
                  }`}></div>
                  <FolderOpen className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* U19 Ghost Rows - Header */}
      {!isCollapsed && (
        <div className="relative px-4 py-3 bg-slate-50/30 dark:bg-slate-900/20">
          <div className="absolute bottom-0 left-4 right-4 h-px border-b border-dotted border-slate-200 dark:border-slate-700"></div>
          <div className="flex items-center justify-between">
            <Select value={selectedClient} onValueChange={handleClientChange}>
              <SelectTrigger className="flex-1 h-7 text-sm border-none p-0 bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none justify-between [&>svg]:hidden">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {displayClientName || "Lejjors"}
                </span>
                <div className="flex items-center space-x-1">
                  <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </div>
              </SelectTrigger>
              <SelectContent className="relative border border-blue-200/30 dark:border-blue-800/20">
                <div className="p-2">
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
                {isLoadingClients ? (
                  <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                ) : !filteredClients?.length ? (
                  <SelectItem value="none" disabled>
                    {searchQuery ? 'No clients match your search' : 'No clients found'}
                  </SelectItem>
                ) : (
                  filteredClients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-6 w-6 p-0 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-all duration-300"
            >
              <div className="flex flex-col space-y-0.5">
                <div className="w-3 h-px bg-slate-400 dark:bg-slate-500 opacity-60"></div>
                <div className="w-3 h-px bg-slate-500 dark:bg-slate-400"></div>
                <div className="w-3 h-px bg-slate-400 dark:bg-slate-500 opacity-60"></div>
              </div>
            </Button>
          </div>
        </div>
      )}
      
      {/* Collapsed Header */}
      {isCollapsed && (
        <div className="relative p-3 bg-slate-50/30 dark:bg-slate-900/20">
          <div className="absolute bottom-0 left-4 right-4 h-px border-b border-dotted border-slate-200 dark:border-slate-700"></div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-5 w-5 p-0 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-all duration-300"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* U19 Ghost Rows - Navigation */}
      <nav className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20">
        {!isCollapsed ? (
          // Expanded Navigation with Ghost Rows Style
          <div className="px-3">
            {/* Accounting Section */}
            {navSections.filter(section => section.id === 'accounting').map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.id);
              
              return (
                <div key={section.id} className="py-2">
                  {/* Section Header */}
                  <div 
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center justify-between px-3 pt-2 pb-1 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <SectionIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{section.label}</span>
                    </div>
                    {isExpanded ? 
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> : 
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    }
                  </div>
                  
                  {/* Section Items */}
                  {isExpanded && (
                    <div className="space-y-0.5">
                      {section.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const isLast = index === section.items.length - 1;
                        
                        return (
                          <div key={item.id}>
                            <div 
                              onClick={() => setActiveTab(item.id)}
                              className={`relative flex items-center space-x-4 px-4 py-1.5 text-sm cursor-pointer transition-all duration-300 ${
                                activeTab === item.id
                                  ? 'text-slate-900 dark:text-slate-100 font-medium bg-slate-50/40 dark:bg-slate-800/30 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-slate-400 dark:after:bg-slate-500 after:content-[\'\'] after:transition-all after:duration-300'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 hover:after:absolute hover:after:bottom-0 hover:after:left-6 hover:after:right-6 hover:after:h-px hover:after:border-b hover:after:border-dotted hover:after:border-slate-300 dark:hover:after:border-slate-600 hover:after:content-[\'\'] hover:after:transition-all hover:after:duration-300'
                              }`}
                            >
                              <ItemIcon className={`h-4 w-4 ${activeTab === item.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} />
                              <span className={activeTab === item.id ? 'font-medium' : ''}>{item.label}</span>
                            </div>
                            {!isLast && <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-4 my-0.5"></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Ghost Dotted Divider */}
            <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-3 my-1"></div>
            
            {/* Direct Navigation Items */}
            <div className="py-2">
              <div className="flex items-center space-x-2 px-3 pt-2 pb-1">
                <DollarSign className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Financial Management</span>
              </div>
              <div className="space-y-0.5">
                {directNavItems.map((item, index) => {
                  const ItemIcon = item.icon;
                  const isLast = index === directNavItems.length - 1;
                  
                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => setActiveTab(item.id)}
                        className={`relative flex items-center space-x-4 px-4 py-1.5 text-sm cursor-pointer transition-all duration-300 ${
                          activeTab === item.id
                            ? 'text-slate-900 dark:text-slate-100 font-medium bg-slate-50/40 dark:bg-slate-800/30 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-slate-400 dark:after:bg-slate-500 after:content-[\'\'] after:transition-all after:duration-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 hover:after:absolute hover:after:bottom-0 hover:after:left-6 hover:after:right-6 hover:after:h-px hover:after:border-b hover:after:border-dotted hover:after:border-slate-300 dark:hover:after:border-slate-600 hover:after:content-[\'\'] hover:after:transition-all hover:after:duration-300'
                        }`}
                      >
                        <ItemIcon className={`h-4 w-4 ${activeTab === item.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className={activeTab === item.id ? 'font-medium' : ''}>{item.label}</span>
                      </div>
                      {!isLast && <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-4 my-0.5"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ghost Dotted Divider */}
            <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-3 my-1"></div>

           
            {/* Ghost Dotted Divider */}
            <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-3 my-1"></div>
            
            {/* Settings Section */}
            {navSections.filter(section => section.id === 'settings').map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.id);
              
              return (
                <div key={section.id} className="py-4">
                  <div 
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center justify-between px-3 pt-4 pb-2 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <SectionIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{section.label}</span>
                    </div>
                    {isExpanded ? 
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> : 
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    }
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-1">
                      {section.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const isLast = index === section.items.length - 1;
                        
                        return (
                          <div key={item.id}>
                            <div 
                              onClick={() => setActiveTab(item.id)}
                              className={`relative flex items-center space-x-3 px-3 py-2 text-xs cursor-pointer transition-all duration-300 ${
                                activeTab === item.id
                                  ? 'text-slate-900 dark:text-slate-100 font-medium bg-slate-50/40 dark:bg-slate-800/30 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-slate-400 dark:after:bg-slate-500 after:content-[\'\'] after:transition-all after:duration-300'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 hover:after:absolute hover:after:bottom-0 hover:after:left-4 hover:after:right-4 hover:after:h-px hover:after:border-b hover:after:border-dotted hover:after:border-slate-300 dark:hover:after:border-slate-600 hover:after:content-[\'\'] hover:after:transition-all hover:after:duration-300'
                              }`}
                            >
                              <ItemIcon className={`h-3.5 w-3.5 ${activeTab === item.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} />
                              <span className={activeTab === item.id ? 'font-medium' : ''}>{item.label}</span>
                            </div>
                            {!isLast && <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-3 my-0.5"></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Collapsed Navigation - Icons Only
          <div className="space-y-1 p-2">
            {navSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-center p-2 text-sm rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                  title={section.label}
                >
                  <SectionIcon className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                </button>
              );
            })}
            {directNavItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-center p-2 text-sm rounded-md transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800'
                  }`}
                  title={item.label}
                >
                  <ItemIcon className="h-4 w-4 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* U19 Ghost Rows - Bottom Section */}
      {!isCollapsed && (
        <div className="relative">
          <div className="absolute top-0 left-4 right-4 h-px border-t border-dotted border-slate-200 dark:border-slate-700"></div>
          {/* Milton AI Button */}
          <div className="p-3">
            <button
              onClick={() => setActiveTab("milton-ai")}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm rounded-lg transition-all duration-300 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-200 shadow-md hover:shadow-lg font-medium ${
                activeTab === "milton-ai" ? 'ring-1 ring-slate-400 dark:ring-slate-600' : ''
              }`}
            >
              <Bot className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Milton AI</span>
            </button>
          </div>

          {/* Footer */}
          <div className="relative px-3 py-2">
            <div className="absolute top-0 left-4 right-4 h-px border-t border-dotted border-slate-200 dark:border-slate-700"></div>
            <div className="flex justify-between items-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">Ghost Rows</div>
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-lg transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Collapsed Bottom Section */}
      {isCollapsed && (
        <div className="border-t border-slate-200 dark:border-gray-700 p-1 space-y-1">
          <button
            onClick={() => setActiveTab("milton-ai")}
            className={`w-full flex items-center justify-center p-2 text-sm rounded-md transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 ${
              activeTab === "milton-ai" ? 'ring-2 ring-purple-300 dark:ring-purple-400' : ''
            }`}
            title="Milton AI"
          >
            <Bot className="h-4 w-4 flex-shrink-0" />
          </button>
          <div className="flex justify-center">
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}