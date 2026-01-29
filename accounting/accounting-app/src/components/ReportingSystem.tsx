import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  FileDown, 
  Mail, 
  Printer, 
  Calendar as CalendarIcon,
  Filter,
  Settings,
  Download,
  Eye,
  BarChart3,
  TrendingUp,
  DollarSign,
  Building,
  Users,
  PieChart,
  LineChart
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiConfig } from '@/lib/api-config';

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  frequency: string[];
  customizable: boolean;
  dataSource: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  // Financial Statements
  { id: 'balance-sheet', name: 'Balance Sheet', category: 'Financial Statements', description: 'Assets, liabilities, and equity at a point in time', icon: BarChart3, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'accounts' },
  { id: 'profit-loss', name: 'Profit & Loss', category: 'Financial Statements', description: 'Revenue and expenses over time', icon: TrendingUp, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'transactions' },
  { id: 'cash-flow', name: 'Cash Flow Statement', category: 'Financial Statements', description: 'Cash receipts and payments', icon: DollarSign, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'transactions' },
  { id: 'trial-balance', name: 'Trial Balance', category: 'Financial Statements', description: 'Account balances for verification', icon: PieChart, frequency: ['Monthly', 'Quarterly', 'Yearly'], customizable: true, dataSource: 'accounts' },
  
  // Transaction Reports
  { id: 'general-ledger', name: 'General Ledger', category: 'Transaction Reports', description: 'Detailed account transactions', icon: Building, frequency: ['Daily', 'Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'transaction-detail', name: 'Transaction Detail by Account', category: 'Transaction Reports', description: 'Transactions grouped by account', icon: LineChart, frequency: ['Daily', 'Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'journal-entries', name: 'Journal Entries', category: 'Transaction Reports', description: 'All journal entries in period', icon: Building, frequency: ['Daily', 'Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  
  // Tax Reports
  { id: 'hst-summary', name: 'HST Summary', category: 'Tax Reports', description: 'HST collected and paid', icon: DollarSign, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  { id: 'tax-detail', name: 'Tax Detail Report', category: 'Tax Reports', description: 'Detailed tax transactions', icon: FileDown, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  
  // Management Reports
  { id: 'budget-vs-actual', name: 'Budget vs Actual', category: 'Management Reports', description: 'Compare budget to actual results', icon: BarChart3, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  { id: 'departmental-pl', name: 'Departmental P&L', category: 'Management Reports', description: 'Profit & loss by department', icon: Building, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  { id: 'expense-summary', name: 'Expense Summary', category: 'Management Reports', description: 'Expenses by category', icon: PieChart, frequency: ['Monthly', 'Quarterly'], customizable: true, dataSource: 'transactions' },
  
  // Client Reports
  { id: 'aged-receivables', name: 'Aged Receivables', category: 'Client Reports', description: 'Outstanding customer balances', icon: Users, frequency: ['Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'aged-payables', name: 'Aged Payables', category: 'Client Reports', description: 'Outstanding vendor balances', icon: Building, frequency: ['Weekly', 'Monthly'], customizable: true, dataSource: 'transactions' },
  { id: 'customer-statement', name: 'Customer Statement', category: 'Client Reports', description: 'Individual customer account statement', icon: Users, frequency: ['Monthly'], customizable: true, dataSource: 'transactions' },
];

interface ReportingSystemProps {
  clientId: number;
}

export const ReportingSystem: React.FC<ReportingSystemProps> = ({ clientId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reportFormat, setReportFormat] = useState<string>('pdf');
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [includeZeroBalances, setIncludeZeroBalances] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(REPORT_TEMPLATES.map(t => t.category)))];

  // Filter templates based on category and search
  const filteredTemplates = REPORT_TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ReportTemplate[]>);

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    try {
      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        format: reportFormat,
        includeZeroBalances: includeZeroBalances.toString(),
      });

      // Determine the API endpoint based on report type
      let endpoint = '';
      switch (selectedTemplate.id) {
        case 'balance-sheet':
          endpoint = `/api/reports/balance-sheet/${clientId}`;
          break;
        case 'profit-loss':
          endpoint = `/api/reports/profit-loss/${clientId}`;
          break;
        case 'cash-flow':
          endpoint = `/api/reports/cash-flow/${clientId}`;
          break;
        case 'trial-balance':
          endpoint = `/api/reports/trial-balance/${clientId}`;
          break;
        case 'general-ledger':
          endpoint = `/api/reports/general-ledger/${clientId}`;
          break;
        default:
          endpoint = `/api/reports/${selectedTemplate.id}/${clientId}`;
      }

      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (reportFormat === 'pdf' || reportFormat === 'csv') {
        // Download file
        const response = await fetch(`${endpoint}?${params}`, {
          headers,
          credentials: 'include'
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate.name}_${format(new Date(), 'yyyy-MM-dd')}.${reportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Open in new tab for preview
        window.open(`${endpoint}?${params}`, '_blank');
      }

      // Send email if recipients provided
      if (emailRecipients.trim()) {
        await fetch(apiConfig.buildUrl('/api/reports/email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportType: selectedTemplate.id,
            clientId,
            recipients: emailRecipients.split(',').map(email => email.trim()),
            parameters: Object.fromEntries(params),
          }),
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">Generate comprehensive financial reports with export and email capabilities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Templates Grid */}
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card 
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedTemplate?.id === template.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.frequency.map(freq => (
                              <Badge key={freq} variant="secondary" className="text-xs">
                                {freq}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Scheduled reporting functionality coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Report history tracking coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Configuration Panel */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <selectedTemplate.icon className="h-5 w-5" />
              Generate {selectedTemplate.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Format and Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV (Excel)</SelectItem>
                    <SelectItem value="preview">Preview in Browser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="zero-balances"
                    checked={includeZeroBalances}
                    onCheckedChange={setIncludeZeroBalances}
                  />
                  <Label htmlFor="zero-balances" className="text-sm">Include Zero Balances</Label>
                </div>
              </div>
            </div>

            {/* Email Recipients */}
            <div className="space-y-2">
              <Label>Email Recipients (optional)</Label>
              <Input
                placeholder="Enter email addresses separated by commas"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
              />
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={handleGenerateReport} className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Generate Report
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              {emailRecipients && (
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};