/**
 * TAX EXPORT CENTER TAB
 * 
 * Centralized export hub for all tax reports and documents with multiple format 
 * support, batch export capabilities, and custom report builder functionality.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  File,
  Plus,
  Calendar,
  Filter,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Trash2,
  RefreshCw,
  Archive,
  Send,
  Building
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TaxExportCenterTabProps {
  clientId: number;
  refreshKey: number;
}

interface ExportJob {
  id: string;
  reportType: string;
  period: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  errorMessage?: string;
  fileSize?: number;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  reportTypes: string[];
  formats: string[];
  isCustom: boolean;
}

// Export format configuration
const EXPORT_FORMATS = [
  { 
    value: 'pdf', 
    label: 'PDF Report', 
    icon: FileText, 
    description: 'Professional formatted reports for CRA filing',
    color: 'text-red-500'
  },
  { 
    value: 'excel', 
    label: 'Excel Workbook', 
    icon: FileSpreadsheet, 
    description: 'Structured data with formulas and pivot tables',
    color: 'text-green-500'
  },
  { 
    value: 'csv', 
    label: 'CSV Data', 
    icon: File, 
    description: 'Raw data for analysis and integration',
    color: 'text-blue-500'
  }
];

const REPORT_TYPES = [
  { value: 'monthly', label: 'Monthly Reports', description: 'Monthly tax liability summaries' },
  { value: 'quarterly', label: 'Quarterly Reports', description: 'CRA quarterly tax summaries' },
  { value: 'annual', label: 'Annual Summary', description: 'Year-end tax overview with T4 data' },
  { value: 'payroll', label: 'Payroll Breakdown', description: 'Employee-by-employee tax details' },
  { value: 'compliance', label: 'Compliance Report', description: 'Audit trail and compliance metrics' },
  { value: 't4', label: 'T4 Summary', description: 'T4 slip data and filing information' }
];

// Quick export options component
function QuickExportOptions({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const quickExports = [
    {
      id: 'current-month',
      title: 'Current Month (PDF)',
      description: `${currentYear}-${String(currentMonth).padStart(2, '0')} tax summary`,
      icon: Calendar,
      config: {
        reportType: 'monthly',
        period: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        format: 'pdf'
      }
    },
    {
      id: 'current-quarter',
      title: 'Current Quarter (Excel)',
      description: `Q${currentQuarter} ${currentYear} comprehensive report`,
      icon: FileSpreadsheet,
      config: {
        reportType: 'quarterly',
        period: `${currentYear}-Q${currentQuarter}`,
        format: 'excel'
      }
    },
    {
      id: 'ytd-summary',
      title: 'Year-to-Date (PDF)',
      description: `${currentYear} cumulative tax analysis`,
      icon: FileText,
      config: {
        reportType: 'annual',
        period: currentYear.toString(),
        format: 'pdf'
      }
    },
    {
      id: 'all-data',
      title: 'All Data (CSV)',
      description: 'Complete tax data export for analysis',
      icon: File,
      config: {
        reportType: 'all',
        period: currentYear.toString(),
        format: 'csv'
      }
    }
  ];

  const handleQuickExport = async (exportConfig: any, exportId: string) => {
    setIsExporting(exportId);
    try {
      const response = await apiRequest('POST', '/api/tax/reports/export', {
        clientId,
        ...exportConfig,
        includeDetails: true
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `tax-report-${exportConfig.period}.${exportConfig.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: `Report has been downloaded successfully.`,
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Quick Export Options
        </CardTitle>
        <CardDescription>
          Generate common tax reports with one-click export
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="quick-export-options">
          {quickExports.map((option) => (
            <Card key={option.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <option.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{option.title}</h4>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => handleQuickExport(option.config, option.id)}
                  disabled={isExporting === option.id}
                  data-testid={`button-quick-export-${option.id}`}
                >
                  {isExporting === option.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Custom report builder component
function CustomReportBuilder({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    startYear: new Date().getFullYear(),
    startMonth: 1,
    endYear: new Date().getFullYear(),
    endMonth: 12
  });
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);

  const handleBuildReport = async () => {
    if (selectedReportTypes.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one report type.",
        variant: "destructive",
      });
      return;
    }

    setIsBuilding(true);
    try {
      const response = await apiRequest('POST', '/api/tax/reports/export/custom', {
        clientId,
        reportTypes: selectedReportTypes,
        format: selectedFormat,
        dateRange,
        includeDetails,
        includeCharts
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `custom-tax-report-${dateRange.startYear}-${dateRange.endYear}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Custom Report Generated",
          description: `Custom report has been created and downloaded.`,
        });
      } else {
        throw new Error('Custom report generation failed');
      }
    } catch (error) {
      console.error('Custom report failed:', error);
      toast({
        title: "Report Generation Failed",
        description: "Unable to generate custom report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const formatSelectedValue = (format: string) => {
    const formatConfig = EXPORT_FORMATS.find(f => f.value === format);
    return formatConfig ? formatConfig.label : format.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Custom Report Builder
        </CardTitle>
        <CardDescription>
          Build tailored tax reports with specific data ranges and formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div data-testid="custom-report-types">
          <Label className="text-base font-medium">Report Types</Label>
          <p className="text-sm text-muted-foreground mb-3">Select the types of reports to include</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REPORT_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id={type.value}
                  checked={selectedReportTypes.includes(type.value)}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setSelectedReportTypes([...selectedReportTypes, type.value]);
                    } else {
                      setSelectedReportTypes(selectedReportTypes.filter(t => t !== type.value));
                    }
                  }}
                  data-testid={`checkbox-report-type-${type.value}`}
                />
                <div className="flex-1">
                  <Label htmlFor={type.value} className="font-medium cursor-pointer">
                    {type.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        <div data-testid="custom-date-range">
          <Label className="text-base font-medium">Date Range</Label>
          <p className="text-sm text-muted-foreground mb-3">Specify the reporting period</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="start-year" className="text-sm">Start Year</Label>
              <Select value={dateRange.startYear.toString()} onValueChange={(value) => 
                setDateRange(prev => ({ ...prev, startYear: parseInt(value) }))
              }>
                <SelectTrigger data-testid="select-start-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-month" className="text-sm">Start Month</Label>
              <Select value={dateRange.startMonth.toString()} onValueChange={(value) => 
                setDateRange(prev => ({ ...prev, startMonth: parseInt(value) }))
              }>
                <SelectTrigger data-testid="select-start-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1).toLocaleDateString('en-CA', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="end-year" className="text-sm">End Year</Label>
              <Select value={dateRange.endYear.toString()} onValueChange={(value) => 
                setDateRange(prev => ({ ...prev, endYear: parseInt(value) }))
              }>
                <SelectTrigger data-testid="select-end-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="end-month" className="text-sm">End Month</Label>
              <Select value={dateRange.endMonth.toString()} onValueChange={(value) => 
                setDateRange(prev => ({ ...prev, endMonth: parseInt(value) }))
              }>
                <SelectTrigger data-testid="select-end-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1).toLocaleDateString('en-CA', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Format and Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div data-testid="custom-export-format">
            <Label className="text-base font-medium">Export Format</Label>
            <p className="text-sm text-muted-foreground mb-3">Choose the output format</p>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map(format => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <format.icon className={`h-4 w-4 ${format.color}`} />
                      {format.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div data-testid="custom-export-options">
            <Label className="text-base font-medium">Export Options</Label>
            <p className="text-sm text-muted-foreground mb-3">Customize report content</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-details"
                  checked={includeDetails}
                  onCheckedChange={(checked) => setIncludeDetails(checked === true)}
                  data-testid="checkbox-include-details"
                />
                <Label htmlFor="include-details" className="cursor-pointer">
                  Include detailed breakdowns
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                  data-testid="checkbox-include-charts"
                />
                <Label htmlFor="include-charts" className="cursor-pointer">
                  Include charts and visualizations
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Build Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleBuildReport}
            disabled={isBuilding || selectedReportTypes.length === 0}
            className="flex items-center gap-2"
            data-testid="button-build-custom-report"
          >
            {isBuilding ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Building Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Build & Download Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export history component
function ExportHistory({ clientId }: { clientId: number }) {
  const { data: exportHistory = [], isLoading } = useQuery({
    queryKey: ["tax-export-history", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/reports/export/history/${clientId}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Export History
        </CardTitle>
        <CardDescription>
          Recent tax report exports and download history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exportHistory.length === 0 ? (
          <div className="text-center py-8" data-testid="no-export-history">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Export History</h3>
            <p className="text-muted-foreground">
              Your exported tax reports will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="export-history-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((job: ExportJob) => (
                  <TableRow key={job.id} data-testid={`export-job-${job.id}`}>
                    <TableCell className="font-medium">{job.reportType}</TableCell>
                    <TableCell>{job.period}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.format.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleDateString('en-CA')}
                    </TableCell>
                    <TableCell>
                      {job.fileSize ? formatFileSize(job.fileSize) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' && job.downloadUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-download-${job.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {job.status === 'failed' && (
                          <Button variant="outline" size="sm" data-testid={`button-retry-${job.id}`}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TaxExportCenterTab({ clientId, refreshKey }: TaxExportCenterTabProps) {
  return (
    <div className="space-y-6" data-testid="tax-export-center">
      {/* Quick Export Options */}
      <QuickExportOptions clientId={clientId} />

      {/* Custom Report Builder */}
      <CustomReportBuilder clientId={clientId} />

      {/* Export History */}
      <ExportHistory clientId={clientId} />
    </div>
  );
}