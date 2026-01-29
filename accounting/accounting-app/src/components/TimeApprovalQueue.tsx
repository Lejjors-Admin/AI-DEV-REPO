/**
 * Time Approval Queue - Phase 4.4
 * 
 * Manager view for approving time entries:
 * - Pending entries list
 * - Bulk approve/reject
 * - Individual actions
 * - Comments/feedback
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: number;
  userId: number;
  clientId?: number;
  projectId?: number;
  taskId?: number;
  duration: number;
  description: string;
  type: string;
  status: string;
  billableRate?: string;
  billableAmount?: string;
  submittedAt?: string;
}

export function TimeApprovalQueue() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending entries
  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-tracking/approval-queue'],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/time-tracking/entries/${id}/approve`, {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({ title: 'Entry approved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/approval-queue'] });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiRequest(`/api/time-tracking/entries/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
    onSuccess: () => {
      toast({ title: 'Entry rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/approval-queue'] });
      setRejectDialogOpen(false);
      setRejectReason('');
      setRejectingId(null);
    }
  });

  // Bulk approve
  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest('/api/time-tracking/entries/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ timeEntryIds: ids })
      }),
    onSuccess: () => {
      toast({ title: `${selectedIds.length} entries approved` });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/approval-queue'] });
      setSelectedIds([]);
    }
  });

  // Bulk reject
  const bulkRejectMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest('/api/time-tracking/entries/bulk-reject', {
        method: 'POST',
        body: JSON.stringify({ timeEntryIds: ids })
      }),
    onSuccess: () => {
      toast({ title: `${selectedIds.length} entries rejected` });
      queryClient.invalidateQueries({ queryKey: ['/api/time-tracking/approval-queue'] });
      setSelectedIds([]);
    }
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? entries.map(e => e.id) : []);
  };

  const handleSelectEntry = (id: number, checked: boolean) => {
    setSelectedIds(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatAmount = (amount?: string) => {
    return amount ? `$${parseFloat(amount).toFixed(2)}` : '-';
  };

  if (isLoading) {
    return <div>Loading approval queue...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Entry Approval Queue</h2>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={() => bulkApproveMutation.mutate(selectedIds)}
              disabled={bulkApproveMutation.isPending}
              variant="default"
              size="sm"
              data-testid="button-bulk-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve {selectedIds.length}
            </Button>
            <Button
              onClick={() => bulkRejectMutation.mutate(selectedIds)}
              disabled={bulkRejectMutation.isPending}
              variant="destructive"
              size="sm"
              data-testid="button-bulk-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject {selectedIds.length}
            </Button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No pending time entries for approval
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === entries.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(entry.id)}
                    onCheckedChange={(checked) => 
                      handleSelectEntry(entry.id, checked as boolean)
                    }
                    data-testid={`checkbox-entry-${entry.id}`}
                  />
                </TableCell>
                <TableCell>User #{entry.userId}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {entry.description}
                </TableCell>
                <TableCell>{formatDuration(entry.duration)}</TableCell>
                <TableCell>
                  <Badge variant={entry.type === 'billable' ? 'default' : 'secondary'}>
                    {entry.type}
                  </Badge>
                </TableCell>
                <TableCell>{formatAmount(entry.billableAmount)}</TableCell>
                <TableCell>
                  {entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => approveMutation.mutate(entry.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${entry.id}`}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectingId(entry.id);
                        setRejectDialogOpen(true);
                      }}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${entry.id}`}
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Time Entry</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this time entry. The staff member will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              data-testid="textarea-reject-reason"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                  setRejectingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectingId) {
                    rejectMutation.mutate({ id: rejectingId, reason: rejectReason });
                  }
                }}
                disabled={!rejectReason || rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reject Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
