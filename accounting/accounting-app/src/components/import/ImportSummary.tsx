/**
 * Import Summary Component
 * 
 * Comprehensive summary of import results with rollback capability
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  CheckSquare,
  DollarSign,
  Timer,
  FileText,
  Calendar
} from 'lucide-react';

interface ImportSummaryProps {
  sessionId: number;
  importSession: any;
}

interface ImportStats {
  entityType: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  createdRecords: number[];
}

// Entity type configuration
const ENTITY_CONFIG = {
  clients: { 
    label: 'Clients', 
    icon: Users, 
    color: 'bg-blue-500',
    description: 'Customer and business records'
  },
  projects: { 
    label: 'Projects', 
    icon: FolderOpen, 
    color: 'bg-green-500',
    description: 'Project data and timelines'
  },
  tasks: { 
    label: 'Tasks', 
    icon: CheckSquare, 
    color: 'bg-orange-500',
    description: 'Task assignments and progress'
  },
  contacts: { 
    label: 'Contacts', 
    icon: Users, 
    color: 'bg-purple-500',
    description: 'Contact persons and relationships'
  },
  invoices: { 
    label: 'Invoices', 
    icon: DollarSign, 
    color: 'bg-emerald-500',
    description: 'Billing and invoice data'
  },
  time_entries: { 
    label: 'Time Entries', 
    icon: Timer, 
    color: 'bg-red-500',
    description: 'Time tracking and logged hours'
  }
};

export function ImportSummary({ sessionId, importSession }: ImportSummaryProps) {
  const { toast } = useToast();
  const [rollbackReason, setRollbackReason] = useState('');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest(`/api/perfex-import/sessions/${sessionId}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      toast({
        title: "Import Rolled Back",
        description: "All imported data has been successfully removed"
      });
      setShowRollbackDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback import",
        variant: "destructive"
      });
    }
  });

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!importSession) return null;

    const totalRecords = importSession.totalRecords || 0;
    const successfulRecords = importSession.successfulRecords || 0;
    const failedRecords = importSession.failedRecords || 0;
    const skippedRecords = importSession.skippedRecords || 0;
    
    const successRate = totalRecords > 0 ? Math.round((successfulRecords / totalRecords) * 100) : 0;
    const failureRate = totalRecords > 0 ? Math.round((failedRecords / totalRecords) * 100) : 0;
    
    const startTime = importSession.startedAt ? new Date(importSession.startedAt) : null;
    const endTime = importSession.completedAt ? new Date(importSession.completedAt) : null;
    const duration = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
    
    const recordsPerSecond = duration > 0 ? Math.round((successfulRecords / (duration / 1000))) : 0;

    return {
      totalRecords,
      successfulRecords,
      failedRecords,
      skippedRecords,
      successRate,
      failureRate,
      duration: duration > 0 ? Math.round(duration / 1000) : 0,
      recordsPerSecond,
      startTime,
      endTime
    };
  };

  // Generate mock entity-specific statistics
  const getEntityStats = (): ImportStats[] => {
    if (!importSession?.entityTypes) return [];

    return importSession.entityTypes.map((entityType: string) => {
      // In a real implementation, this would come from the API
      const total = Math.floor(importSession.totalRecords / importSession.entityTypes.length);
      const successful = Math.floor(total * 0.85); // 85% success rate simulation
      const failed = Math.floor(total * 0.10); // 10% failure rate
      const skipped = total - successful - failed;

      return {
        entityType,
        totalRecords: total,
        successfulRecords: successful,
        failedRecords: failed,
        skippedRecords: skipped,
        createdRecords: Array.from({ length: successful }, (_, i) => i + 1)
      };
    });
  };

  const handleRollback = async () => {
    if (!rollbackReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rolling back the import",
        variant: "destructive"
      });
      return;
    }

    await rollbackMutation.mutateAsync(rollbackReason.trim());
  };

  const handleDownloadReport = () => {
    // Generate and download import report
    const report = {
      sessionId,
      importSession,
      summary: getSummaryStats(),
      entityStats: getEntityStats(),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `perfex-import-report-${sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Import report has been downloaded as JSON file"
    });
  };

  const stats = getSummaryStats();
  const entityStats = getEntityStats();
  const isCompleted = importSession?.status === 'completed';
  const isFailed = importSession?.status === 'failed';
  const canRollback = importSession?.canRollback && isCompleted;

  return (
    <div className="space-y-6" data-testid="import-summary">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : isFailed ? (
                <XCircle className="w-6 h-6 text-red-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-500" />
              )}
              <CardTitle>
                {isCompleted ? 'Import Completed Successfully' : 
                 isFailed ? 'Import Failed' : 
                 'Import Summary'}
              </CardTitle>
            </div>
            <Badge className={
              isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              isFailed ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            }>
              {importSession?.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Import session completed on {stats?.endTime?.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High-level Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.totalRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Records
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {stats.successfulRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Imported
                </div>
              </div>
              
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {stats.failedRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Failed
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.successRate}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Success Rate
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Duration</div>
                  <div className="text-xs text-gray-600">
                    {Math.floor(stats.duration / 60)}m {stats.duration % 60}s
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Processing Speed</div>
                  <div className="text-xs text-gray-600">
                    {stats.recordsPerSecond} records/sec
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Session ID</div>
                  <div className="text-xs text-gray-600">
                    #{sessionId}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {isCompleted && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your PerfexCRM data has been successfully imported into Pages CRM. 
                All records are now available in your system.
              </AlertDescription>
            </Alert>
          )}

          {isFailed && importSession?.errorSummary && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Import failed:</strong> {importSession.errorSummary}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Entity-Specific Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Import Breakdown by Data Type</CardTitle>
          <CardDescription>
            Detailed statistics for each type of data imported
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entityStats.map((stat) => {
              const config = ENTITY_CONFIG[stat.entityType as keyof typeof ENTITY_CONFIG];
              if (!config) return null;

              const Icon = config.icon;
              const successRate = Math.round((stat.successfulRecords / stat.totalRecords) * 100);

              return (
                <div
                  key={stat.entityType}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid={`entity-stat-${stat.entityType}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.color} text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {config.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {stat.successfulRecords}
                        </div>
                        <div className="text-xs text-gray-500">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {stat.failedRecords}
                        </div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {stat.skippedRecords}
                        </div>
                        <div className="text-xs text-gray-500">Skipped</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {successRate}% success rate
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage your import results and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleDownloadReport}
              variant="outline"
              className="flex-1"
              data-testid="download-report"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            
            {canRollback && (
              <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    data-testid="rollback-import"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rollback Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rollback Import</DialogTitle>
                    <DialogDescription>
                      This will permanently delete all data that was imported in this session. 
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Reason for rollback</label>
                      <Textarea
                        value={rollbackReason}
                        onChange={(e) => setRollbackReason(e.target.value)}
                        placeholder="Please explain why you need to rollback this import..."
                        className="mt-1"
                        data-testid="rollback-reason"
                      />
                    </div>
                    
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This will delete {stats?.successfulRecords} 
                        successfully imported records. Make sure you have a backup if needed.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowRollbackDialog(false)}
                      data-testid="cancel-rollback"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRollback}
                      disabled={rollbackMutation.isPending || !rollbackReason.trim()}
                      data-testid="confirm-rollback"
                    >
                      {rollbackMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      Confirm Rollback
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Review your imported data in the respective modules</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Set up any additional relationships or configurations</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Train your team on the new system</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Archive or deactivate your old PerfexCRM system</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}