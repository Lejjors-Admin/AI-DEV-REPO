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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, 
  Download, 
  Share2, 
  MessageSquare, 
  Eye, 
  Edit,
  Trash2,
  FileText,
  Image,
  FileSpreadsheet,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Search,
  Filter,
  Star,
  Lock,
  Globe,
  Users,
  History,
  MessageCircle,
  Paperclip,
  BookOpen,
  Archive,
  Tag
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SharedDocument {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'archived' | 'published';
  category?: string;
  tags: string[];
  clientId?: number;
  projectId?: number;
  uploadedBy: number;
  uploaderName?: string;
  approvedBy?: number;
  approverName?: string;
  approvedAt?: string;
  description?: string;
  notes?: string;
  version: string;
  isLatestVersion: boolean;
  isPublic: boolean;
  isClientVisible: boolean;
  downloadCount: number;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentComment {
  id: number;
  documentId: number;
  userId: number;
  userName: string;
  comment: string;
  commentType: 'general' | 'approval' | 'rejection' | 'question';
  pageNumber?: number;
  positionX?: number;
  positionY?: number;
  parentCommentId?: number;
  isResolved: boolean;
  resolvedBy?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentAccess {
  id: number;
  documentId: number;
  userId?: number;
  clientId?: number;
  accessLevel: 'none' | 'view' | 'comment' | 'edit' | 'admin';
  grantedBy: number;
  grantedAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount: number;
  isActive: boolean;
}

// Form schemas
const shareDocumentSchema = z.object({
  userIds: z.array(z.number()).optional(),
  clientIds: z.array(z.number()).optional(),
  accessLevel: z.enum(['view', 'comment', 'edit', 'admin']),
  expiresAt: z.string().optional(),
  message: z.string().optional()
});

const commentSchema = z.object({
  comment: z.string().min(1, "Comment is required"),
  commentType: z.enum(['general', 'approval', 'rejection', 'question']).default('general'),
  pageNumber: z.number().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional()
});

const uploadDocumentSchema = z.object({
  documentType: z.enum(['receipt', 'invoice', 'contract', 'report', 'statement', 'certificate', 'tax_document', 'bank_statement', 'correspondence', 'checklist', 'other']),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  isClientVisible: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  clientId: z.number().optional(),
  projectId: z.number().optional()
});

export default function DocumentCollaboration() {
  const [selectedDocument, setSelectedDocument] = useState<SharedDocument | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch documents
  const { data: documentsData, isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['/api/documents', filterStatus, filterType, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          ...(filterStatus !== 'all' && { status: filterStatus }),
          ...(filterType !== 'all' && { type: filterType }),
          ...(searchQuery && { search: searchQuery })
        });
        
        const response = await fetch(`/api/documents?${params}`, { 
          credentials: 'include' 
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            return { documents: [] };
          }
          throw new Error('Failed to fetch documents');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching documents:', error);
        return { documents: [] };
      }
    },
    retry: false,
  });

  // Fetch document comments
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['/api/documents', selectedDocument?.id, 'comments'],
    queryFn: async () => {
      if (!selectedDocument) return { comments: [] };
      try {
        const response = await fetch(`/api/documents/${selectedDocument.id}/comments`, { 
          credentials: 'include' 
        });
        if (!response.ok) throw new Error('Failed to fetch comments');
        return await response.json();
      } catch (error) {
        console.error('Error fetching comments:', error);
        return { comments: [] };
      }
    },
    enabled: !!selectedDocument,
    retry: false,
  });

  // Forms
  const shareForm = useForm({
    resolver: zodResolver(shareDocumentSchema),
    defaultValues: {
      accessLevel: 'view' as const,
      userIds: [],
      clientIds: []
    }
  });

  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      commentType: 'general' as const,
      comment: ''
    }
  });

  const uploadForm = useForm({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      documentType: 'other' as const,
      tags: [],
      isClientVisible: false,
      isPublic: false
    }
  });

  // Share document mutation
  const shareDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedDocument) throw new Error('No document selected');
      return await apiRequest(`/api/documents/${selectedDocument.id}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      setShowShareDialog(false);
      shareForm.reset();
      toast({ title: "Document shared successfully" });
    },
    onError: (error) => {
      console.error('Error sharing document:', error);
      toast({ title: "Error", description: "Failed to share document", variant: "destructive" });
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedDocument) throw new Error('No document selected');
      return await apiRequest(`/api/documents/${selectedDocument.id}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      refetchComments();
      setShowCommentDialog(false);
      commentForm.reset();
      toast({ title: "Comment added successfully" });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('/api/documents/upload', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      refetchDocuments();
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadProgress(0);
      uploadForm.reset();
      toast({ title: "Document uploaded successfully" });
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    }
  });

  // Approve/Reject document mutations
  const approveDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest(`/api/documents/${documentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      refetchDocuments();
      toast({ title: "Document approved successfully" });
    }
  });

  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: number; reason: string }) => {
      return await apiRequest(`/api/documents/${documentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      refetchDocuments();
      toast({ title: "Document rejected" });
    }
  });

  const documents = documentsData?.documents || [];
  const comments = commentsData?.comments || [];

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (data: any) => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (Array.isArray(data[key])) {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key].toString());
        }
      }
    });

    // Simulate upload progress
    setUploadProgress(10);
    setTimeout(() => setUploadProgress(50), 500);
    setTimeout(() => setUploadProgress(80), 1000);

    uploadDocumentMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6" data-testid="document-collaboration">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Collaboration</h2>
          <p className="text-gray-600">
            Share, review, and collaborate on documents with your team and clients
          </p>
        </div>
        
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button data-testid="upload-document-btn">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a new document to share with your team or clients
              </DialogDescription>
            </DialogHeader>
            
            <Form {...uploadForm}>
              <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : "Click to select a file"}
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, XLS, or image files up to 10MB
                    </p>
                  </label>
                </div>

                {uploadProgress > 0 && (
                  <Progress value={uploadProgress} className="w-full" />
                )}

                {/* Document Details */}
                <FormField
                  control={uploadForm.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="receipt">Receipt</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="report">Report</SelectItem>
                          <SelectItem value="statement">Statement</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="tax_document">Tax Document</SelectItem>
                          <SelectItem value="bank_statement">Bank Statement</SelectItem>
                          <SelectItem value="correspondence">Correspondence</SelectItem>
                          <SelectItem value="checklist">Checklist</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={uploadForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the document..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Visibility Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium">Visibility Settings</h4>
                  
                  <FormField
                    control={uploadForm.control}
                    name="isClientVisible"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-gray-300"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Visible to clients
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={uploadForm.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-gray-300"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Public to all firm members
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={!selectedFile || uploadDocumentMutation.isPending}
                  >
                    {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-documents"
              />
            </div>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="tax_document">Tax Documents</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                Grid
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table/Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found matching your criteria
            </div>
          ) : viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document: SharedDocument) => (
                  <TableRow key={document.id} data-testid={`document-row-${document.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(document.mimeType)}
                        <div>
                          <p className="font-medium">{document.originalName}</p>
                          {document.description && (
                            <p className="text-xs text-gray-500">{document.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {document.documentType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(document.status)}>
                        {document.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {document.uploaderName || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatFileSize(document.fileSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedDocument(document)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedDocument(document);
                              setShowShareDialog(true);
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {document.status === 'review' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => approveDocumentMutation.mutate(document.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => rejectDocumentMutation.mutate({ 
                                  documentId: document.id, 
                                  reason: 'Needs revision' 
                                })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // Grid view implementation would go here
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((document: SharedDocument) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      {getFileIcon(document.mimeType)}
                      <Badge className={`text-xs ${getStatusColor(document.status)}`}>
                        {document.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm mb-2 truncate">{document.originalName}</h4>
                    <p className="text-xs text-gray-500 mb-3">{formatFileSize(document.fileSize)}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(document)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Details Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDocument && getFileIcon(selectedDocument.mimeType)}
              {selectedDocument?.originalName}
            </DialogTitle>
            <DialogDescription>
              Document details and collaboration tools
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Document Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Type:</span> {selectedDocument.documentType}</div>
                      <div><span className="font-medium">Size:</span> {formatFileSize(selectedDocument.fileSize)}</div>
                      <div><span className="font-medium">Version:</span> {selectedDocument.version}</div>
                      <div><span className="font-medium">Downloads:</span> {selectedDocument.downloadCount}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Status & Ownership</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Status:</span> 
                        <Badge className={`ml-2 ${getStatusColor(selectedDocument.status)}`}>
                          {selectedDocument.status}
                        </Badge>
                      </div>
                      <div><span className="font-medium">Uploaded by:</span> {selectedDocument.uploaderName}</div>
                      <div><span className="font-medium">Created:</span> {format(new Date(selectedDocument.createdAt), 'PPp')}</div>
                      {selectedDocument.approvedAt && (
                        <div><span className="font-medium">Approved:</span> {format(new Date(selectedDocument.approvedAt), 'PPp')}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedDocument.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedDocument.description}</p>
                  </div>
                )}
                
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Comments & Reviews</h4>
                  <Button 
                    size="sm" 
                    onClick={() => setShowCommentDialog(true)}
                    data-testid="add-comment-btn"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No comments yet</p>
                  ) : (
                    comments.map((comment: DocumentComment) => (
                      <div key={comment.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.commentType}
                            </Badge>
                            {comment.isResolved && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4">
                <h4 className="font-medium">Recent Activity</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="text-gray-500 text-center py-8">
                    Activity tracking coming soon
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="access" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Access Management</h4>
                  <Button 
                    size="sm" 
                    onClick={() => setShowShareDialog(true)}
                    data-testid="manage-access-btn"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Document
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="text-gray-500 text-center py-8">
                    Access management coming soon
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Document Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Grant access to this document for team members or clients
            </DialogDescription>
          </DialogHeader>
          
          <Form {...shareForm}>
            <form onSubmit={shareForm.handleSubmit((data) => shareDocumentMutation.mutate(data))} className="space-y-4">
              <FormField
                control={shareForm.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="comment">View & Comment</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="admin">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shareForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a message for the recipients..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={shareDocumentMutation.isPending}>
                  {shareDocumentMutation.isPending ? "Sharing..." : "Share Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment or review for this document
            </DialogDescription>
          </DialogHeader>
          
          <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit((data) => addCommentMutation.mutate(data))} className="space-y-4">
              <FormField
                control={commentForm.control}
                name="commentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select comment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Comment</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="approval">Approval</SelectItem>
                        <SelectItem value="rejection">Rejection</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={commentForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your comment..." 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={addCommentMutation.isPending}>
                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}