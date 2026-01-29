/**
 * Active Timer Indicator - Phase 4.1
 * 
 * Displays active timer in navbar with:
 * - Pulsing animation
 * - Elapsed time display
 * - Quick stop button
 * - Auto-refresh every second
 */

import { useState, useEffect } from 'react';
import { Timer, Square } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TimerSession {
  id: number;
  userId: number;
  firmId: number;
  clientId?: number;
  projectId?: number;
  taskId?: number;
  description?: string;
  startTime: string;
  isActive: boolean;
}

export function ActiveTimerIndicator() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();

  // Fetch active timer
  const { data: activeTimer, refetch } = useQuery<TimerSession | null>({
    queryKey: ['/api/time-tracking/timer/active'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Calculate elapsed time
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeTimer.startTime).getTime();
    
    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: () => apiRequest('/api/time-tracking/timer/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeTimer?.id })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/timer/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/entries'] });
      refetch();
    }
  });

  // Format elapsed time as HH:MM:SS
  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeTimer) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
          data-testid="active-timer-indicator"
        >
          <Timer className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
          <span className="ml-2 font-mono text-sm">
            {formatElapsed(elapsedSeconds)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold">Active Timer</span>
            </div>
            <span className="font-mono text-lg font-bold">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>

          {activeTimer.description && (
            <div className="text-sm text-muted-foreground">
              {activeTimer.description}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              variant="destructive"
              size="sm"
              className="flex-1"
              data-testid="button-stop-timer"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Timer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
