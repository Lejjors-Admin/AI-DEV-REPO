import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  MessageSquare, 
  Mail, 
  Clock, 
  User, 
  Filter, 
  Search, 
  Reply, 
  Forward, 
  Archive, 
  Star,
  Plus,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  UserPlus,
  MessageCircle,
  Send,
  AtSign,
  Paperclip,
  MoreHorizontal
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

// Types for communication threads
interface CommunicationThread {
  id: number;
  firmId: number;
  clientId: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'closed';
  category?: string;
  isRead: boolean;
  readBy?: number;
  readAt?: string;
  assignedToUserId?: number;
  threadIdentifier: string;
  createdAt: string;
  updatedAt: string;
}

interface ThreadReply {
  id: number;
  threadId: number;
  body: string;
  senderId: number;
  senderName: string;
  isFromClient: boolean;
  isInternal: boolean;
  createdAt: string;
}

interface InternalComment {
  id: number;
  relatedThreadId: number;
  userId: number;
  commentBody: string;
  mentionedUsers?: number[];
  createdAt: string;
}

// Form schemas
const replySchema = z.object({
  body: z.string().min(1, "Reply content is required"),
  isInternal: z.boolean().default(false)
});

const internalCommentSchema = z.object({
  commentBody: z.string().min(1, "Comment is required"),
  mentionedUsers: z.array(z.number()).optional()
});

const createTaskSchema = z.object({
  assignedToId: z.number().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export default function CommunicationHub() {
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Fetch communication threads
  const { data: threadsData, isLoading: threadsLoading, error: threadsError } = useQuery({
    queryKey: ['/api/communication/threads', filterStatus, searchQuery],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/communication/threads?filter=${filterStatus}&search=${searchQuery}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Authentication required for communication threads');
            return [];
          }
          throw new Error('Failed to fetch threads');
        }
        return await response.json();
      } catch (error) {
        console.error('Communication threads error:', error);
        return [];
      }
    },
    retry: false,
  });

  // Fetch selected thread details
  const { data: threadDetails, isLoading: threadLoading } = useQuery({
    queryKey: ['/api/communication/threads', selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return null;
      try {
        const response = await fetch(`/api/communication/threads/${selectedThreadId}`);
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Authentication required for thread details');
            return null;
          }
          throw new Error('Failed to fetch thread details');
        }
        return await response.json();
      } catch (error) {
        console.error('Thread details error:', error);
        return null;
      }
    },
    enabled: !!selectedThreadId,
    retry: false,
  });

  // Fetch unread count for badge
  const { data: unreadData } = useQuery({
    queryKey: ['/api/communication/unread-count'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/communication/unread-count');
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Authentication required for unread count');
            return { count: 0 };
          }
          throw new Error('Failed to fetch unread count');
        }
        return await response.json();
      } catch (error) {
        console.error('Unread count error:', error);
        return { count: 0 };
      }
    },
    retry: false,
  });

  // Forms
  const replyForm = useForm({
    resolver: zodResolver(replySchema),
    defaultValues: {
      body: '',
      isInternal: false
    }
  });

  const commentForm = useForm({
    resolver: zodResolver(internalCommentSchema),
    defaultValues: {
      commentBody: '',
      mentionedUsers: []
    }
  });

  const taskForm = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: 'medium' as const
    }
  });

  // Mutations
  const replyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/communication/threads/${selectedThreadId}/replies`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to send reply');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/threads', selectedThreadId] });
      setShowReplyDialog(false);
      replyForm.reset();
      toast({ title: "Reply sent successfully" });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/communication/threads/${selectedThreadId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/threads', selectedThreadId] });
      setShowCommentDialog(false);
      commentForm.reset();
      toast({ title: "Internal comment added successfully" });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/communication/threads/${selectedThreadId}/create-task`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to create task');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/threads'] });
      setShowTaskDialog(false);
      taskForm.reset();
      toast({ title: "Task created successfully" });
    }
  });

  const updateThreadMutation = useMutation({
    mutationFn: async ({ threadId, data }: { threadId: number; data: any }) => {
      const response = await fetch(`/api/communication/threads/${threadId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to update thread');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communication/threads', selectedThreadId] });
    }
  });

  const threads = threadsData?.threads || [];
  const unreadCount = unreadData?.count || 0;

  // Show authentication message if all requests fail with 401
  if (threadsError && threadsError.message?.includes('401')) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8 bg-blue-50 rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access the communication system.</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  const handleThreadSelect = (threadId: number) => {
    setSelectedThreadId(threadId);
  };

  const handleStatusUpdate = (threadId: number, status: string) => {
    updateThreadMutation.mutate({ threadId, data: { status } });
  };

  const handleMarkAsRead = (threadId: number) => {
    updateThreadMutation.mutate({ threadId, data: { isRead: true } });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Communication Center</h2>
          <p className="text-gray-600">Unified communication platform - shared inbox, internal comments, and client management</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="assigned">Assigned to Me</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Messages ({threads.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {threadsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : threads.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No messages found</div>
                ) : (
                  threads.map((thread: CommunicationThread) => (
                    <div
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread.id)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedThreadId === thread.id ? 'bg-blue-50 border-blue-200' : ''
                      } ${!thread.isRead ? 'bg-blue-25' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(thread.priority)} mt-1`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!thread.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {thread.senderName}
                            </p>
                            <Badge variant={getStatusColor(thread.status)} className="text-xs">
                              {thread.status}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm text-gray-900 mb-1 truncate">
                            {thread.subject}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {thread.body.substring(0, 100)}...
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                            </span>
                            {thread.category && (
                              <Badge variant="outline" className="text-xs">
                                {thread.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Thread Details */}
        <div className="lg:col-span-2">
          {selectedThreadId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {threadDetails?.thread?.subject}
                    </CardTitle>
                    <CardDescription>
                      From: {threadDetails?.thread?.senderName} ({threadDetails?.thread?.senderEmail})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowReplyDialog(true)}
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCommentDialog(true)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Internal Comment
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowTaskDialog(true)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                    <Select 
                      value={threadDetails?.thread?.status} 
                      onValueChange={(status) => handleStatusUpdate(selectedThreadId, status)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {threadLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading conversation...</div>
                ) : (
                  <div className="space-y-6">
                    {/* Original Message */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{threadDetails?.thread?.senderName}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(threadDetails?.thread?.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                        <Badge variant={getStatusColor(threadDetails?.thread?.priority)} className="text-xs">
                          {threadDetails?.thread?.priority}
                        </Badge>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{threadDetails?.thread?.body}</p>
                      </div>
                    </div>

                    {/* Replies */}
                    {threadDetails?.replies?.map((reply: ThreadReply) => (
                      <div 
                        key={reply.id} 
                        className={`border-l-4 pl-4 ${reply.isFromClient ? 'border-green-500' : 'border-gray-300'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{reply.senderName}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(reply.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          {reply.isInternal && (
                            <Badge variant="secondary" className="text-xs">Internal</Badge>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      </div>
                    ))}

                    {/* Internal Comments */}
                    {threadDetails?.internalComments?.map((comment: InternalComment) => (
                      <div key={comment.id} className="border-l-4 border-yellow-500 pl-4 bg-yellow-50 p-3 rounded-r">
                        <div className="flex items-center gap-2 mb-2">
                          <AtSign className="w-4 h-4" />
                          <span className="font-medium text-sm">Staff Comment</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{comment.commentBody}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a message to view the conversation</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Reply to: {threadDetails?.thread?.subject}
            </DialogDescription>
          </DialogHeader>
          <Form {...replyForm}>
            <form onSubmit={replyForm.handleSubmit((data) => replyMutation.mutate(data))}>
              <div className="space-y-4">
                <FormField
                  control={replyForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reply Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your reply..." 
                          rows={6} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={replyForm.control}
                  name="isInternal"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Internal reply (not visible to client)</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowReplyDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={replyMutation.isPending}>
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Internal Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Comment</DialogTitle>
            <DialogDescription>
              Add a staff-only comment for collaboration. Use @mentions for notifications.
            </DialogDescription>
          </DialogHeader>
          <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit((data) => commentMutation.mutate(data))}>
              <div className="space-y-4">
                <FormField
                  control={commentForm.control}
                  name="commentBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add your internal comment... Use @staff to mention team members" 
                          rows={4} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowCommentDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={commentMutation.isPending}>
                  {commentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task from Message</DialogTitle>
            <DialogDescription>
              Convert this communication thread into a trackable task.
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))}>
              <div className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="dueDate" as any
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}