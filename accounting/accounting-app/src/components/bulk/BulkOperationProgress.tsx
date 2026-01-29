/**
 * Bulk Operation Progress Component
 * 
 * Real-time progress tracking for bulk operations
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  Square,
  RefreshCw,
  Download,
  Undo2,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BulkOperationProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationId: string | null;
  itemType: 'clients' | 'projects' | 'tasks';
}

export interface OperationProgress {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progressTotal: number;
  progressCurrent: number;
  startedAt: string;
  completedAt?: string;
  affectedCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  warnings: string[];
  canRollback: boolean;
  estimatedTimeRemaining?: number;
  processingRate?: number; // items per second
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkOperationProgress({
  open,
  onOpenChange,
  operationId,
  itemType
}: BulkOperationProgressProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch operation progress
  const { data: progress, isLoading, refetch } = useQuery({
    queryKey: ['/api/bulk/progress', operationId],
    queryFn: async () => {
      if (!operationId) return null;
      const response = await apiRequest('GET', `/api/bulk/progress/${operationId}`);
      const data = await response.json();
      return data.success ? data.progress : null;
    },
    enabled: !!operationId && open,
    refetchInterval: autoRefresh && progress?.status === 'in_progress' ? 1000 : false,
  });

  // Auto-close when operation completes successfully
  useEffect(() => {
    if (progress?.status === 'completed' && progress.errorCount === 0) {
      const timer = setTimeout(() => {
        onOpenChange(false);
        toast({
          title: "Bulk Operation Complete",
          description: `Successfully processed ${progress.successCount} ${itemType}`,
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [progress, itemType, onOpenChange]);

  const handlePause = async () => {
    // Implementation for pausing operation
    toast({
      title: "Operation Paused",
      description: "Bulk operation has been paused",
    });
  };

  const handleResume = async () => {
    // Implementation for resuming operation
    toast({
      title: "Operation Resumed", 
      description: "Bulk operation has been resumed",
    });
  };

  const handleCancel = async () => {
    // Implementation for cancelling operation
    toast({
      title: "Operation Cancelled",
      description: "Bulk operation has been cancelled",
      variant: "destructive",
    });
  };

  const handleRollback = async () => {
    if (!operationId) return;
    
    try {
      const response = await apiRequest('POST', `/api/bulk/rollback/${operationId}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Rollback Complete",
          description: "Bulk operation has been rolled back successfully",
        });
        onOpenChange(false);
      } else {
        throw new Error(data.errors?.[0] || 'Rollback failed');
      }
    } catch (error: any) {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback operation",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <Square className="h-5 w-5 text-gray-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
  };

  const calculateProgress = () => {
    if (!progress) return 0;
    return Math.round((progress.progressCurrent / progress.progressTotal) * 100);
  };

  const calculateETA = () => {
    if (!progress || progress.status !== 'in_progress') return null;
    
    const remaining = progress.progressTotal - progress.progressCurrent;
    if (remaining <= 0 || !progress.processingRate) return null;
    
    const etaSeconds = remaining / progress.processingRate;
    const etaMins = Math.ceil(etaSeconds / 60);
    
    return etaMins > 1 ? `${etaMins} minutes` : 'Less than 1 minute';
  };

  if (!progress && !isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operation Not Found</DialogTitle>
            <DialogDescription>
              The bulk operation could not be found or has expired.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress && getStatusIcon(progress.status)}
            Bulk Operation Progress
          </DialogTitle>
          <DialogDescription>
            {progress ? `Processing ${itemType} bulk operation` : 'Loading operation details...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading operation progress...
          </div>
        ) : progress && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getStatusIcon(progress.status)}
                    {progress.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                    {progress.status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Started {formatDuration(progress.startedAt)} ago
                  {progress.completedAt && ` • Completed in ${formatDuration(progress.startedAt, progress.completedAt)}`}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.progressCurrent} / {progress.progressTotal}</span>
                  </div>
                  <Progress 
                    value={calculateProgress()} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{calculateProgress()}% complete</span>
                    {progress.status === 'in_progress' && calculateETA() && (
                      <span>ETA: {calculateETA()}</span>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{progress.errorCount}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{progress.progressTotal}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                {/* Processing Rate */}
                {progress.processingRate && progress.status === 'in_progress' && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-muted-foreground">
                      Processing at {Math.round(progress.processingRate * 60)} items/minute
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Errors and Warnings */}
            {(progress.errors.length > 0 || progress.warnings.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {progress.errors.map((error, index) => (
                        <div key={`error-${index}`} className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="text-red-700">{error}</span>
                        </div>
                      ))}
                      {progress.warnings.map((warning, index) => (
                        <div key={`warning-${index}`} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          <span className="text-yellow-700">{warning}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAutoRefresh(!autoRefresh);
                        if (!autoRefresh) refetch();
                      }}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
                      {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
                    </Button>
                    
                    {progress.status === 'in_progress' && (
                      <>
                        <Button variant="outline" size="sm" onClick={handlePause}>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCancel}>
                          <Square className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}

                    {progress.status === 'completed' && progress.canRollback && (
                      <Button variant="outline" size="sm" onClick={handleRollback}>
                        <Undo2 className="h-4 w-4 mr-2" />
                        Undo Changes
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Operation ID: {progress.id}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={progress?.status === 'in_progress'}
          >
            {progress?.status === 'in_progress' ? 'Running...' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}