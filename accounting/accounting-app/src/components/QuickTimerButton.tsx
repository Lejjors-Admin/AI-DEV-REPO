/**
 * Quick Timer Button - Phase 4.3
 * 
 * One-click timer start from task cards
 * Auto-populates task context
 */

import { Play } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QuickTimerButtonProps {
  taskId: number;
  taskTitle: string;
  projectId?: number;
  clientId?: number;
}

export function QuickTimerButton({ taskId, taskTitle, projectId, clientId }: QuickTimerButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startTimerMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/time-tracking/timer/start', {
        method: 'POST',
        body: JSON.stringify({
          taskId,
          projectId,
          clientId,
          description: taskTitle
        })
      }),
    onSuccess: () => {
      toast({ 
        title: 'Timer started',
        description: `Tracking time for: ${taskTitle}` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/timer/active'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start timer',
        variant: 'destructive'
      });
    }
  });

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => startTimerMutation.mutate()}
      disabled={startTimerMutation.isPending}
      className="h-8 w-8 p-0"
      data-testid={`quick-timer-${taskId}`}
    >
      <Play className="h-4 w-4" />
    </Button>
  );
}
