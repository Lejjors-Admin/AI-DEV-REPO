/**
 * Time Entry Audit Trail - Phase 4.5
 * 
 * Display edit history and comments:
 * - Change history with field-level tracking
 * - Comment threads
 * - Manager-staff communication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { History, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

interface Comment {
  id: number;
  userId: number;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

interface TimeEntryAuditTrailProps {
  timeEntryId: number;
}

export function TimeEntryAuditTrail({ timeEntryId }: TimeEntryAuditTrailProps) {
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch audit history
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: [`/api/time-tracking/entries/${timeEntryId}/audit`],
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/time-tracking/entries/${timeEntryId}/comments`],
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (comment: string) =>
      apiRequest(`/api/time-tracking/entries/${timeEntryId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      }),
    onSuccess: () => {
      toast({ title: 'Comment added' });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/time-tracking/entries/${timeEntryId}/comments`] 
      });
      setNewComment('');
    }
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, any> = {
      create: 'default',
      update: 'secondary',
      submit: 'outline',
      approve: 'default',
      reject: 'destructive',
    };
    return <Badge variant={variants[action] || 'secondary'}>{action}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Tabs defaultValue="comments" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="comments">
          <MessageSquare className="h-4 w-4 mr-2" />
          Comments ({comments.length})
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="h-4 w-4 mr-2" />
          Change History ({auditLogs.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="comments" className="space-y-4">
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="border rounded-lg p-3 space-y-2"
                data-testid={`comment-${comment.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    User #{comment.userId}
                    {comment.isInternal && (
                      <Badge variant="outline" className="ml-2">Internal</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(comment.createdAt)}
                  </div>
                </div>
                <div className="text-sm">{comment.comment}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            data-testid="textarea-new-comment"
          />
          <Button
            onClick={() => addCommentMutation.mutate(newComment)}
            disabled={!newComment || addCommentMutation.isPending}
            data-testid="button-add-comment"
          >
            Add Comment
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="history" className="space-y-3">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No change history
          </div>
        ) : (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="border rounded-lg p-3 space-y-2"
              data-testid={`audit-log-${log.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action)}
                  <span className="text-sm font-medium">
                    User #{log.userId}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(log.createdAt)}
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">{log.fieldName}:</span>{' '}
                {log.oldValue && (
                  <>
                    <span className="text-muted-foreground line-through">
                      {log.oldValue}
                    </span>
                    {' → '}
                  </>
                )}
                <span className="text-green-600 dark:text-green-400">
                  {log.newValue}
                </span>
              </div>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
