import { Link } from "wouter";
import { 
  FileText, BookOpen, FolderOpen, Users, Calculator, Archive,
  Bookmark, Layers, Database, Grid3X3, Folder, File,
  Circle, Square, Triangle, Hexagon, Star, Diamond,
  ChevronRight, Dot, MoreHorizontal, MoreVertical,
  ChevronDown, ChevronUp, BarChart3, LayoutDashboard,
  CheckSquare, GitBranch, Eye, Building, TrendingUp,
  Megaphone, MessageSquare, UserCog, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function NavigationVariations() {
  const [selectedVariation, setSelectedVariation] = useState<string | number | null>(null);

  // U2: Modern Card Sections
  const UnifiedStyle2 = () => (
    <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-900">Modern Card Sections</div>
      </div>
      
      {/* Card Section */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
          <Calculator className="h-4 w-4" />
          <span>Accounting</span>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="p-4 space-y-1">
        <div className="flex items-center space-x-3 py-2 px-3 text-sm text-green-700 bg-green-50 rounded-md">
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">Overview</span>
        </div>
        <div className="flex items-center space-x-3 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
          <FileText className="h-4 w-4" />
          <span>Chart of Accounts</span>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Card-based sections</div>
      </div>
    </div>
  );

  // U5: Rounded Soft Style  
  const UnifiedStyle5 = () => (
    <div className="w-full max-w-full min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">Rounded Soft Style</div>
      </div>
      
      {/* Soft Section Header */}
      <div className="p-5">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3 py-2 px-3 bg-gray-50 rounded-lg">
          <LayoutDashboard className="h-4 w-4 text-blue-500" />
          <span>Overview</span>
          <div className="ml-auto">
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </div>
        </div>
        
        {/* Soft Menu Items */}
        <div className="space-y-2 pl-6">
          <div className="flex items-center space-x-3 py-2 px-4 text-sm text-blue-700 bg-blue-50 rounded-lg">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="font-medium">Dashboard</span>
          </div>
          <div className="flex items-center space-x-3 py-2 px-4 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Users className="h-3.5 w-3.5" />
            <span>Clients</span>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Soft rounded design</div>
      </div>
    </div>
  );

  // U6: List View Style
  const UnifiedStyle6 = () => (
    <div className="w-full max-w-full min-w-0 bg-white border-l-4 border-blue-500">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="text-sm font-semibold text-gray-900">List View Style</div>
      </div>
      
      {/* Clean List */}
      <div className="divide-y divide-gray-100">
        <div className="px-4 py-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 py-1">
            <CheckSquare className="h-4 w-4 text-gray-500" />
            <span>Operations</span>
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-2 text-sm text-blue-600 bg-blue-50 -mx-4 px-4 border-l-2 border-blue-500">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Overview</span>
            </div>
            <span className="text-xs text-blue-500">Active</span>
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-2 text-sm text-gray-600 hover:bg-gray-50 -mx-4 px-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-3.5 w-3.5" />
              <span>Ledger</span>
            </div>
            <span className="text-xs text-gray-400">156</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Clean list layout</div>
      </div>
    </div>
  );

  // U7: Enhanced Card Style
  const UnifiedStyle7 = () => (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 rounded-t-lg">
        <div className="text-sm font-semibold text-gray-900">Enhanced Card Style</div>
      </div>
      
      {/* Enhanced Card Section */}
      <div className="p-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-purple-700">
              <Calculator className="h-4 w-4" />
              <span>Accounting</span>
            </div>
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          </div>
          <div className="space-y-1 pl-6">
            <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-purple-600 bg-purple-50 rounded-md">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Dashboard</span>
            </div>
            <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
              <FileText className="h-3.5 w-3.5" />
              <span>Accounts</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Enhanced cards with shadows</div>
      </div>
    </div>
  );

  // U8: Soft Gradient Style
  const UnifiedStyle8 = () => (
    <div className="w-full bg-gradient-to-b from-white to-gray-50 rounded-xl border border-gray-200">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-gray-100 rounded-t-xl">
        <div className="text-sm font-semibold text-gray-900">Soft Gradient Style</div>
      </div>
      
      <div className="p-5">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-3 border border-emerald-100">
          <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 mb-3">
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center space-x-2 py-2 px-3 text-sm text-emerald-700 bg-emerald-100 rounded-lg">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Dashboard</span>
            </div>
            <div className="flex items-center space-x-2 py-2 px-3 text-sm text-gray-600 hover:bg-white/50 rounded-lg">
              <Users className="h-3.5 w-3.5" />
              <span>Team</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200">
        <div className="text-xs text-gray-500">Soft gradient backgrounds</div>
      </div>
    </div>
  );

  // U9: Clean List with Borders
  const UnifiedStyle9 = () => (
    <div className="w-full bg-white border border-gray-200">
      <div className="px-4 py-3 border-b-2 border-indigo-500 bg-indigo-50">
        <div className="text-sm font-semibold text-indigo-900">Clean List with Borders</div>
      </div>
      
      <div className="divide-y divide-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 py-1 border-l-4 border-gray-300 pl-3">
            <Calculator className="h-4 w-4" />
            <span>Financial</span>
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-2 text-sm border-l-4 border-indigo-500 pl-3 bg-indigo-50 -mx-4 px-7">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              <span className="font-medium text-indigo-700">Reports</span>
            </div>
            <span className="text-xs text-indigo-600">Current</span>
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center py-2 text-sm border-l-4 border-transparent pl-3 hover:border-gray-300 hover:bg-gray-50 -mx-4 px-7">
            <div className="flex items-center space-x-2">
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-600">Transactions</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Clean borders and dividers</div>
      </div>
    </div>
  );

  // U10: Rounded List Style
  const UnifiedStyle10 = () => (
    <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-900">Rounded List Style</div>
      </div>
      
      <div className="p-5">
        <div className="space-y-3">
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center space-x-2 text-sm font-medium text-rose-700 mb-2">
              <CheckSquare className="h-4 w-4" />
              <span>Operations</span>
            </div>
            <div className="space-y-1 pl-6">
              <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-rose-700 bg-rose-100 rounded-lg">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="font-medium">Dashboard</span>
              </div>
              <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-gray-600 hover:bg-white rounded-lg">
                <Users className="h-3.5 w-3.5" />
                <span>Team</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Fully rounded design</div>
      </div>
    </div>
  );

  // U11: Minimal Card Style
  const UnifiedStyle11 = () => (
    <div className="w-full bg-white border border-gray-100 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">Minimal Card Style</div>
      </div>
      
      <div className="p-4">
        <div className="bg-gray-50 p-3 mb-3 border-l-2 border-gray-300">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Calculator className="h-4 w-4" />
            <span>Accounting</span>
          </div>
          <div className="space-y-1 pl-6">
            <div className="flex items-center space-x-2 py-1.5 text-sm text-gray-900 bg-white px-3">
              <BarChart3 className="h-3.5 w-3.5 text-gray-700" />
              <span className="font-medium">Overview</span>
            </div>
            <div className="flex items-center space-x-2 py-1.5 text-sm text-gray-600 hover:bg-white px-3">
              <FileText className="h-3.5 w-3.5" />
              <span>Ledger</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Ultra minimal approach
      </div>
    </div>
  );

  // U12: Soft Shadow Cards
  const UnifiedStyle12 = () => (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-lg">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200 rounded-t-lg">
        <div className="text-sm font-semibold text-gray-900">Soft Shadow Cards</div>
      </div>
      
      <div className="p-4">
        <div className="bg-white shadow-md rounded-lg p-4 border border-violet-100">
          <div className="flex items-center space-x-2 text-sm font-medium text-violet-700 mb-3">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
          <div className="space-y-2 pl-6">
            <div className="flex items-center space-x-2 py-2 px-3 text-sm text-violet-700 bg-violet-50 rounded-lg shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Analytics</span>
            </div>
            <div className="flex items-center space-x-2 py-2 px-3 text-sm text-gray-600 hover:shadow-sm hover:bg-gray-50 rounded-lg">
              <Users className="h-3.5 w-3.5" />
              <span>Users</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Elevated shadow design</div>
      </div>
    </div>
  );

  // U13: Clean Divider List
  const UnifiedStyle13 = () => (
    <div className="w-full bg-white border-l-2 border-cyan-500">
      <div className="px-4 py-3 border-b border-gray-200 bg-cyan-50">
        <div className="text-sm font-semibold text-cyan-900">Clean Divider List</div>
      </div>
      
      <div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calculator className="h-4 w-4 text-cyan-600" />
            <span>Financial Management</span>
          </div>
        </div>
        
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between py-2 text-sm text-cyan-700 bg-cyan-50 -mx-4 px-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Reports</span>
            </div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center py-2 text-sm text-gray-600 hover:bg-gray-50 -mx-4 px-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-3.5 w-3.5" />
              <span>Journal Entries</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Clean line separators</div>
      </div>
    </div>
  );

  // U14: Compact Card Grid
  const UnifiedStyle14 = () => (
    <div className="w-full bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-gray-200 rounded-t-lg">
        <div className="text-sm font-semibold text-gray-900">Compact Card Grid</div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
            <div className="flex items-center space-x-1 text-xs font-medium text-amber-700 mb-1">
              <Calculator className="h-3 w-3" />
              <span>Finance</span>
            </div>
            <div className="text-xs text-amber-600">5 items</div>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 hover:bg-amber-50">
            <div className="flex items-center space-x-1 text-xs font-medium text-gray-700 mb-1">
              <Users className="h-3 w-3" />
              <span>Team</span>
            </div>
            <div className="text-xs text-gray-500">3 items</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-amber-700 bg-amber-100 rounded-lg">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="font-medium">Overview</span>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Compact grid layout</div>
      </div>
    </div>
  );

  // U15: Elegant Rounded Lists  
  const UnifiedStyle15 = () => (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-200 rounded-t-2xl">
        <div className="text-sm font-semibold text-gray-900">Elegant Rounded Lists</div>
      </div>
      
      <div className="p-5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-medium text-teal-700 py-2 px-4 bg-teal-50 rounded-full">
          <CheckSquare className="h-4 w-4" />
          <span>Operations</span>
          <div className="ml-auto w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">3</span>
          </div>
        </div>
        
        <div className="pl-6 space-y-2">
          <div className="flex items-center justify-between py-2 px-4 text-sm text-teal-700 bg-teal-100 rounded-full">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Dashboard</span>
            </div>
            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
          </div>
          <div className="flex items-center space-x-2 py-2 px-4 text-sm text-gray-600 hover:bg-gray-50 rounded-full">
            <Users className="h-3.5 w-3.5" />
            <span>Management</span>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
        <div className="text-xs text-gray-500">Elegant rounded pill design</div>
      </div>
    </div>
  );

  // U16: Modern Sidebar Cards
  const UnifiedStyle16 = () => (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="text-sm font-semibold text-gray-900">Modern Sidebar Cards</div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-slate-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
              <Calculator className="h-4 w-4" />
              <span>Financial</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-1 pl-6">
            <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-slate-700 bg-slate-100 rounded-md">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="font-medium">Reports</span>
            </div>
            <div className="flex items-center space-x-2 py-1.5 px-3 text-sm text-gray-600 hover:bg-white rounded-md">
              <FileText className="h-3.5 w-3.5" />
              <span>Ledger</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">Modern card sections</div>
      </div>
    </div>
  );

  // U17: Rail + Dividers (Non-Card)
  const UnifiedStyle17 = () => (
    <div className="w-full bg-slate-50/30 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rail + Dividers</div>
      </div>
      
      <div className="p-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2">
            <Calculator className="h-3.5 w-3.5" />
            <span>Financial</span>
          </div>
          <div className="relative flex items-center space-x-3 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-medium bg-slate-100/60 dark:bg-slate-800/40 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-slate-600 dark:before:bg-slate-400 before:content-['']">
            <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <span>Overview</span>
          </div>
          <div className="border-b border-slate-200 dark:border-slate-700 mx-3"></div>
          <div className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <FileText className="h-4 w-4" />
            <span>Reports</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-slate-100/30 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400">Clean enterprise style</div>
      </div>
    </div>
  );

  // U18: Gradient Rail (Non-Card)
  const UnifiedStyle18 = () => (
    <div className="w-full bg-gradient-to-b from-blue-50/20 via-indigo-50/20 to-purple-50/20 dark:from-blue-950/10 dark:via-indigo-950/10 dark:to-purple-950/10 border border-blue-200/30 dark:border-blue-800/20">
      <div className="px-4 py-3 bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border-b border-blue-200/30 dark:border-blue-800/20">
        <div className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Gradient Rail</div>
      </div>
      
      <div className="p-4">
        <div className="space-y-0">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2">
            <Calculator className="h-3.5 w-3.5" />
            <span>Financial</span>
          </div>
          <div className="relative flex items-center space-x-3 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 font-medium pl-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/60 to-purple-50/60 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-blue-500 before:to-purple-500 before:content-['']">
            <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Dashboard</span>
          </div>
          <div className="mx-3 my-1 h-px bg-gradient-to-r from-blue-200/30 to-purple-200/30 dark:from-blue-800/20 dark:to-purple-800/20"></div>
          <div className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20">
            <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Analytics</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30 border-t border-blue-200/30 dark:border-blue-800/20">
        <div className="text-xs text-indigo-600 dark:text-indigo-400">Modern gradient accents</div>
      </div>
    </div>
  );

  // U19: Ghost Rows (Non-Card)
  const UnifiedStyle19 = () => (
    <div className="w-full bg-slate-50/30 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/20 border-b border-dotted border-slate-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ghost Rows</div>
      </div>
      
      <div className="p-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-3">
            <Calculator className="h-4 w-4" />
            <span>Financial</span>
          </div>
          <div className="relative flex items-center space-x-4 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-medium bg-slate-50/40 dark:bg-slate-800/30 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-slate-400 dark:after:bg-slate-500 after:content-['']">
            <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <span>Overview</span>
          </div>
          <div className="border-b border-dotted border-slate-200 dark:border-slate-700 mx-4 my-1"></div>
          <div className="relative flex items-center space-x-4 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/20 dark:hover:bg-slate-800/20">
            <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span>Reports</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-slate-50/30 dark:bg-slate-900/20 border-t border-dotted border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 tracking-wide">Airy editorial style</div>
      </div>
    </div>
  );

  const variations = [
    { id: "U2", name: "🃏 Modern Card Sections", component: <UnifiedStyle2 /> },
    { id: "U5", name: "🌙 Rounded Soft Style", component: <UnifiedStyle5 /> },
    { id: "U6", name: "📋 List View Style", component: <UnifiedStyle6 /> },
    { id: "U7", name: "💎 Enhanced Card Style", component: <UnifiedStyle7 /> },
    { id: "U8", name: "🌈 Soft Gradient Style", component: <UnifiedStyle8 /> },
    { id: "U9", name: "📏 Clean List with Borders", component: <UnifiedStyle9 /> },
    { id: "U10", name: "🔘 Rounded List Style", component: <UnifiedStyle10 /> },
    { id: "U11", name: "⚪ Minimal Card Style", component: <UnifiedStyle11 /> },
    { id: "U12", name: "✨ Soft Shadow Cards", component: <UnifiedStyle12 /> },
    { id: "U13", name: "📐 Clean Divider List", component: <UnifiedStyle13 /> },
    { id: "U14", name: "🔲 Compact Card Grid", component: <UnifiedStyle14 /> },
    { id: "U15", name: "🟡 Elegant Rounded Lists", component: <UnifiedStyle15 /> },
    { id: "U16", name: "🔳 Modern Sidebar Cards", component: <UnifiedStyle16 /> },
    { id: "U17", name: "📏 Rail + Dividers", component: <UnifiedStyle17 /> },
    { id: "U18", name: "🌈 Gradient Rail", component: <UnifiedStyle18 /> },
    { id: "U19", name: "👻 Ghost Rows", component: <UnifiedStyle19 /> },
  ];

  return (
    <div className="space-y-8 p-6 w-full max-w-full min-w-0">
      <div className="text-center mb-8 w-full max-w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unified Sidebar Content Styles</h2>
        <p className="text-gray-600">16 unified sidebar content styling options</p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-full">
          <p className="text-sm text-blue-700 font-medium">🎯 Card-based (U2-U16) + NEW Non-card modern styles (U17-U19)</p>
          <p className="text-xs text-blue-600 mt-1">• Same fonts, spacing, section headers, menu items across Pages/Books/Binders</p>
          <p className="text-xs text-blue-600">• Card-based (U2, U7, U11, U12, U14, U16) • Rounded (U5, U8, U10, U15) • List (U6, U9, U13) • Modern Non-card (U17, U18, U19)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-full min-w-0">
        {variations.map((variation) => (
          <div 
            key={variation.id}
            className={`border rounded-xl p-6 transition-all cursor-pointer hover:shadow-md w-full max-w-full min-w-0 ${
              selectedVariation === variation.id 
                ? 'border-green-500 bg-green-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedVariation(variation.id)}
          >
            <div className="flex items-center justify-between mb-4 min-w-0">
              <h3 className="font-semibold text-gray-900 min-w-0 truncate">
                #{variation.id} {variation.name}
              </h3>
              {selectedVariation === variation.id && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center min-h-[120px] bg-white rounded-lg border border-gray-100 w-full max-w-full min-w-0 overflow-hidden">
              <div className="w-full max-w-full min-w-0">
                {variation.component}
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              Unified • Consistent • Clean
            </div>
          </div>
        ))}
      </div>

      {selectedVariation && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center w-full max-w-full">
          <p className="text-green-700 font-medium">
            ✓ Selected Style #{selectedVariation}: {variations.find(v => v.id === selectedVariation)?.name}
          </p>
          <p className="text-green-600 text-sm mt-1">
            This unified sidebar content style will make all three sections consistent.
          </p>
        </div>
      )}
    </div>
  );
}