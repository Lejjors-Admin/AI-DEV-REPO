/**
 * Import Progress Tracker Component
 * 
 * Real-time tracking of import progress with detailed status updates
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Pause,
  Play,
  StopCircle,
  TrendingUp,
  Users,
  FolderOpen,
  CheckSquare,
  DollarSign,
  Timer,
  Activity
} from 'lucide-react';

interface ImportProgressTrackerProps {
  sessionId: number;
  isExecuting: boolean;
  onImportComplete: () => void;
}

interface ImportProgress {
  sessionId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  progressPercentage: number;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionTime?: string;
  errorSummary?: string;
}

interface ImportRecord {
  id: number;
  entityType: string;
  sourceRowNumber: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  createdEntityId?: number;
  lastProcessedAt?: string;
}

// Status icons and colors
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'in_progress': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'pending': return <Clock className="w-4 h-4 text-gray-500" />;
    case 'cancelled': return <StopCircle className="w-4 h-4 text-orange-500" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    case 'in_progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
    case 'pending': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    case 'cancelled': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
  }
};

// Entity type icons
const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'clients': return <Users className="w-4 h-4" />;
    case 'projects': return <FolderOpen className="w-4 h-4" />;
    case 'tasks': return <CheckSquare className="w-4 h-4" />;
    case 'contacts': return <Users className="w-4 h-4" />;
    case 'invoices': return <DollarSign className="w-4 h-4" />;
    case 'time_entries': return <Timer className="w-4 h-4" />;
    default: return <Database className="w-4 h-4" />;
  }
};

export function ImportProgressTracker({ sessionId, isExecuting, onImportComplete }: ImportProgressTrackerProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Poll for progress updates
  const { 
    data: progress, 
    isLoading: progressLoading,
    refetch: refetchProgress 
  } = useQuery({
    queryKey: [`/api/perfex-import/sessions/${sessionId}/progress`],
    refetchInterval: isExecuting ? 2000 : false, // Poll every 2 seconds during execution
    select: (data) => data?.data as ImportProgress,
    enabled: !!sessionId
  });

  // Get import records with filtering
  const { 
    data: records, 
    isLoading: recordsLoading,
    refetch: refetchRecords 
  } = useQuery({
    queryKey: [`/api/perfex-import/sessions/${sessionId}/records`, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      });
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      return await apiRequest(`/api/perfex-import/sessions/${sessionId}/records?${params}`);
    },
    select: (data) => data?.data || [],
    enabled: !!sessionId
  });

  // Check if import is complete and notify parent
  useEffect(() => {
    if (progress?.status === 'completed' || progress?.status === 'failed') {
      onImportComplete();
      
      if (progress.status === 'completed') {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${progress.successfulRecords} of ${progress.totalRecords} records`
        });
      } else {
        toast({
          title: "Import Failed",
          description: progress.errorSummary || "Import process encountered errors",
          variant: "destructive"
        });
      }
    }
  }, [progress?.status, onImportComplete, toast]);

  // Calculate statistics
  const getProgressStats = () => {
    if (!progress) return null;

    const successRate = progress.totalRecords > 0 
      ? Math.round((progress.successfulRecords / progress.totalRecords) * 100)
      : 0;
    
    const eta = progress.estimatedCompletionTime 
      ? new Date(progress.estimatedCompletionTime).toLocaleTimeString()
      : null;
    
    const duration = progress.startedAt 
      ? Math.round((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
      : 0;

    return {
      successRate,
      eta,
      duration: duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '0s',
      recordsPerSecond: duration > 0 ? Math.round(progress.processedRecords / duration) : 0
    };
  };

  const stats = getProgressStats();

  if (progressLoading && !progress) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Loading import progress...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="import-progress-tracker">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <CardTitle>Import Progress</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {progress && getStatusIcon(progress.status)}
              <Badge className={getStatusColor(progress?.status || 'pending')}>
                {progress?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {progress?.currentStep && `Current step: ${progress.currentStep.replace('_', ' ')}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(progress.progressPercentage)}%</span>
              </div>
              <Progress 
                value={progress.progressPercentage} 
                className="w-full"
                data-testid="progress-bar"
              />
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{progress.processedRecords.toLocaleString()} processed</span>
                <span>{progress.totalRecords.toLocaleString()} total</span>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          {progress && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {progress.successfulRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Successful
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {progress.failedRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Failed
                </div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {progress.skippedRecords.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Skipped
                </div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.successRate}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Success Rate
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {progress && stats && progress.status === 'in_progress' && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>{stats.recordsPerSecond}/sec</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Runtime: {stats.duration}</span>
                </div>
                {stats.eta && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>ETA: {stats.eta}</span>
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchProgress()}
                data-testid="refresh-progress"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Error Summary */}
          {progress?.errorSummary && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Import Errors:</strong> {progress.errorSummary}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import Records</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
                data-testid="status-filter"
              >
                <option value="all">All Records</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
                <option value="pending">Pending</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchRecords()}
                data-testid="refresh-records"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading records...
            </div>
          ) : records && records.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {records.map((record: ImportRecord) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`record-${record.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      {getEntityIcon(record.entityType)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {record.entityType} - Row {record.sourceRowNumber}
                          </span>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                        {record.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {record.errorMessage}
                          </div>
                        )}
                        {record.createdEntityId && (
                          <div className="text-xs text-gray-500 mt-1">
                            Created ID: {record.createdEntityId}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {getStatusIcon(record.status)}
                      {record.lastProcessedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(record.lastProcessedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {selectedStatus === 'all' 
                ? 'No import records found' 
                : `No ${selectedStatus} records found`
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}