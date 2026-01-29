import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Plus, FileText, Calendar, Users, Book, Upload, Calculator, Building, FolderPlus, FolderOpen, Search, Filter, Settings, Eye, Edit3, MoreHorizontal, BookOpen, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BindersSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  binders?: any[];
  onCreateBinder?: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function BindersSidebar({ 
  activeTab, 
  onTabChange, 
  binders = [], 
  onCreateBinder,
  searchTerm = "",
  onSearchChange,
  selectedStatus = "all",
  onStatusChange
}: BindersSidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    binders: true,
    status: true,
    tools: false,
  });

  // Determine which module is active based on current route
  const getActiveModule = () => {
    if (location.startsWith('/pages') || location === '/') {
      return 'PAGES';
    } else if (location.startsWith('/books') || location.startsWith('/bookkeeping') || location.startsWith('/financial-data') || location.startsWith('/transactions') || location.startsWith('/cheques') || location.startsWith('/trial-balance')) {
      return 'BOOKS';
    } else if (location.startsWith('/binder') || location.startsWith('/audit-files')) {
      return 'BINDERS';
    }
    return 'BINDERS';
  };

  const activeModule = getActiveModule();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sidebarSections = [
    {
      id: "overview",
      title: "Overview",
      icon: Book,
      items: [
        { id: "dashboard", label: "Dashboard", icon: Calculator },
        { id: "metrics", label: "Metrics", icon: Building },
      ]
    },
    {
      id: "binders",
      title: "Binders",
      icon: FolderPlus,
      items: [
        { id: "all-binders", label: "All Binders", icon: FileText },
        { id: "my-binders", label: "My Binders", icon: Users },
        { id: "templates", label: "Templates", icon: Book },
      ]
    },
    {
      id: "status",
      title: "Status",
      icon: Calendar,
      items: [
        { id: "in-progress", label: "In Progress", icon: Calendar, count: binders.filter(b => b.status === 'in_progress').length },
        { id: "review", label: "In Review", icon: Eye, count: binders.filter(b => b.status === 'review').length },
        { id: "completed", label: "Completed", icon: FileText, count: binders.filter(b => b.status === 'completed').length },
      ] as Array<{ id: string; label: string; icon: any; count?: number }>
    },
    {
      id: "tools",
      title: "Tools",
      icon: Settings,
      items: [
        { id: "import", label: "Import Data", icon: Upload },
        { id: "export", label: "Export Reports", icon: FileText },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-64'
    }`}>
      
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
              <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full" title="Books">
                <BookOpen className="h-4 w-4 text-green-600" />
              </div>
            )}
            {activeModule === 'BINDERS' && (
              <div className="w-8 h-8 flex items-center justify-center bg-purple-500 rounded-full" title="Binders">
                <FolderOpen className="h-4 w-4 text-white" />
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Binders</h2>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                onClick={onCreateBinder}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
          <div className="absolute bottom-0 left-4 right-4 h-px border-b border-dotted border-slate-200 dark:border-slate-700"></div>
        </div>
      )}
      
      {/* Collapsed Header */}
      {isCollapsed && (
        <div className="relative p-3 bg-slate-50/30 dark:bg-slate-900/20">
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
          <div className="absolute bottom-0 left-4 right-4 h-px border-b border-dotted border-slate-200 dark:border-slate-700"></div>
        </div>
      )}

      {/* U19 Ghost Rows - Content */}
      <nav className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20">
        {!isCollapsed ? (
          <div className="px-3">
            {/* Search & Filter Section */}
            <div className="py-4">
              <div className="flex items-center space-x-2 px-3 pt-4 pb-2">
                <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search & Filter</span>
              </div>
              <div className="space-y-3 px-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                  <Input
                    placeholder="Search binders..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="pl-9 h-8 text-sm bg-transparent border-b border-slate-200 dark:border-gray-700 rounded-none"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['all', 'in_progress', 'review', 'completed'].map((status) => (
                      <Badge
                        key={status}
                        variant={selectedStatus === status ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => onStatusChange?.(status)}
                      >
                        {status.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200 dark:border-gray-700 mx-3"></div>

            {/* Navigation Sections */}
            {sidebarSections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections[section.id];
              const isLastSection = sectionIndex === sidebarSections.length - 1;
              
              return (
                <div key={section.id}>
                  <div className="py-4">
                    {/* Section Header */}
                    <div 
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center justify-between px-3 pt-4 pb-2 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <SectionIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{section.title}</span>
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
                                onClick={() => onTabChange(item.id)}
                                className={`relative flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer transition-all duration-300 ${
                                  activeTab === item.id
                                    ? 'text-slate-900 dark:text-slate-100 font-medium bg-slate-50/40 dark:bg-slate-800/30'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/20 dark:hover:bg-slate-800/20'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <ItemIcon className={`h-4 w-4 ${activeTab === item.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} />
                                  <span className={activeTab === item.id ? 'font-medium' : ''}>{item.label}</span>
                                </div>
                                {'count' in item && item.count !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.count}
                                  </Badge>
                                )}
                              </div>
                              {!isLast && <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-4 my-0.5"></div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {!isLastSection && <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-3 my-1"></div>}
                </div>
              );
            })}

            {/* Divider */}
            <div className="border-b border-slate-200 dark:border-gray-700 mx-3"></div>

            {/* Quick Stats Section */}
            <div className="py-4">
              <div className="flex items-center space-x-2 px-3 pt-4 pb-2">
                <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Stats</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <span>Total Binders</span>
                  <span className="font-medium">{binders.length}</span>
                </div>
                <div className="border-b border-slate-100 dark:border-gray-800 mx-3"></div>
                <div className="flex justify-between px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <span>In Progress</span>
                  <span className="font-medium">{binders.filter(b => b.status === 'in_progress').length}</span>
                </div>
                <div className="border-b border-slate-100 dark:border-gray-800 mx-3"></div>
                <div className="flex justify-between px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <span>Completed</span>
                  <span className="font-medium">{binders.filter(b => b.status === 'completed').length}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Collapsed Navigation - Icons Only
          <div className="space-y-1 p-2">
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-center p-2 text-sm rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                title={section.title}
              >
                <section.icon className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* U17 Rail + Dividers - Footer */}
      {!isCollapsed && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-gray-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Rail + Dividers
          </div>
        </div>
      )}
    </div>
  );
}