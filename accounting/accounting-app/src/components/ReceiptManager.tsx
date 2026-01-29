/**
 * Enhanced Receipt Management System
 * 
 * Features:
 * - Drag & drop interface
 * - Multiple file support (PDF, PNG, JPEG, Excel, CSV)
 * - Real-time processing status
 * - Automatic transaction matching
 * - Dropbox-like file view
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ReceiptClassificationPanel from './ReceiptClassificationPanel';
import { apiConfig } from "@/lib/api-config";
import { 

  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Download, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Link,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Bot,
  Zap
} from 'lucide-react';

interface Receipt {
  id: string;
  filename: string;
  processingStatus: 'uploaded' | 'processing' | 'processed' | 'failed' | 'matched';
  matchStatus: 'unmatched' | 'suggested' | 'matched' | 'manual';
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  extractedData?: any;
  confidenceScore: number;
  matchedTransactionId?: number;
  transactionId?: number;
}

interface ReceiptManagerProps {
  clientId: number;
  transactionId?: number;
  onReceiptMatched?: (receiptId: string, transactionId: number) => void;
}

export default function ReceiptManager({ clientId, transactionId, onReceiptMatched }: ReceiptManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch receipts
  const { data: receipts = [], isLoading, refetch } = useQuery({
    queryKey: ['receipts', clientId, transactionId],
    queryFn: async () => {
      const endpoint = transactionId 
        ? `/api/receipts/transaction/${transactionId}`
        : `/api/receipts/client/${clientId}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch receipts');
      const data = await response.json();
      return data.receipts || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds to update processing status
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      
      if (files.length === 1) {
        formData.append('receipt', files[0]);
        formData.append('clientId', clientId.toString());
        if (transactionId) formData.append('transactionId', transactionId.toString());
        
        const response = await fetch('/api/receipts/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Failed to upload receipt');
        return response.json();
      } else {
        // Multiple files
        for (let i = 0; i < files.length; i++) {
          formData.append('receipts', files[i]);
        }
        formData.append('clientId', clientId.toString());
        
        const response = await fetch('/api/receipts/upload-multiple', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Failed to upload receipts');
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (data.receipts) {
        toast({
          title: "Receipts uploaded",
          description: `${data.receipts.length} receipts uploaded successfully`,
        });
      } else {
        toast({
          title: "Receipt uploaded",
          description: "Processing with AI analysis",
        });
      }
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receiptId}`), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete receipt');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt deleted",
        description: "Receipt removed successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileUpload = useCallback((files: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    
    uploadMutation.mutate(files, {
      onSettled: () => {
        setUploading(false);
        setUploadProgress(0);
      },
    });
  }, [uploadMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Uploaded</Badge>;
      case 'processing':
        return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'processed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'matched':
        return <Badge variant="success"><Link className="h-3 w-3 mr-1" />Matched</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get match status badge
  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'unmatched':
        return <Badge variant="secondary">Unmatched</Badge>;
      case 'suggested':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Suggested</Badge>;
      case 'matched':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Matched</Badge>;
      case 'manual':
        return <Badge variant="default">Manual</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter receipts
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.filename?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || receipt.processingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Receipt detail dialog
  const ReceiptDetailDialog = ({ receipt }: { receipt: Receipt }) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const loadMatches = async () => {
      setLoadingMatches(true);
      try {
        const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/matches`));
        if (response.ok) {
          const data = await response.json();
          setMatches(data.matches || []);
        }
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setLoadingMatches(false);
      }
    };

    useEffect(() => {
      if (receipt.id) {
        loadMatches();
      }
    }, [receipt.id]);

    const handleMatch = async (transactionId: number) => {
      try {
        const response = await fetch(apiConfig.buildUrl(`/api/receipts/${receipt.id}/match/${transactionId}`), {
          method: 'POST',
        });
        if (response.ok) {
          toast({
            title: "Receipt matched",
            description: "Receipt successfully matched to transaction",
          });
          refetch();
          onReceiptMatched?.(receipt.id, transactionId);
        }
      } catch (error) {
        toast({
          title: "Match failed",
          description: "Failed to match receipt to transaction",
          variant: "destructive",
        });
      }
    };

    return (
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(receipt.mimeType)}
            {receipt.filename}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Processing Status</h3>
              {getStatusBadge(receipt.processingStatus)}
            </div>
            <div>
              <h3 className="font-medium mb-2">Match Status</h3>
              {getMatchStatusBadge(receipt.matchStatus)}
            </div>
          </div>

          {/* File Information */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-1">File Size</h3>
              <p className="text-sm text-muted-foreground">{formatFileSize(receipt.fileSize)}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Upload Date</h3>
              <p className="text-sm text-muted-foreground">{new Date(receipt.uploadDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Confidence Score</h3>
              <p className="text-sm text-muted-foreground">{(receipt.confidenceScore * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Extracted Data */}
          {receipt.extractedData && (
            <div>
              <h3 className="font-medium mb-2">Extracted Data</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {receipt.extractedData.vendor && (
                      <div>
                        <h4 className="font-medium mb-1">Vendor</h4>
                        <p className="text-sm">{receipt.extractedData.vendor}</p>
                      </div>
                    )}
                    {receipt.extractedData.amount && (
                      <div>
                        <h4 className="font-medium mb-1">Amount</h4>
                        <p className="text-sm">${receipt.extractedData.amount}</p>
                      </div>
                    )}
                    {receipt.extractedData.date && (
                      <div>
                        <h4 className="font-medium mb-1">Date</h4>
                        <p className="text-sm">{receipt.extractedData.date}</p>
                      </div>
                    )}
                    {receipt.extractedData.invoiceNumber && (
                      <div>
                        <h4 className="font-medium mb-1">Invoice Number</h4>
                        <p className="text-sm">{receipt.extractedData.invoiceNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Potential Matches */}
          {matches.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Potential Transaction Matches</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{match.transaction.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>${Math.abs(match.transaction.amount)}</span>
                            <span>{new Date(match.transaction.date).toLocaleDateString()}</span>
                            <span>Match: {(match.matchScore * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMatch(match.transactionId)}
                          disabled={receipt.matchStatus === 'matched'}
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Match
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/receipts/${receipt.id}/download`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            {receipt.processingStatus === 'processed' && (
              <Button
                onClick={() => setShowClassification(true)}
                className="flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Classify with AI
              </Button>
            )}
            
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(receipt.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Receipt Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Drop files here or click to browse</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF, PNG, JPEG, Excel, and CSV files up to 50MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Choose Files'}
            </Button>
          </div>
          
          {uploading && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center mt-2">Uploading and processing...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="matched">Matched</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No receipts found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="flex items-center gap-2">
                        {getFileIcon(receipt.mimeType)}
                        <span className="font-medium">{receipt.filename}</span>
                        {receipt.matchStatus === 'matched' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Recorded</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.processingStatus)}</TableCell>
                      <TableCell>{getMatchStatusBadge(receipt.matchStatus)}</TableCell>
                      <TableCell>{formatFileSize(receipt.fileSize)}</TableCell>
                      <TableCell>{new Date(receipt.uploadDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <ReceiptDetailDialog receipt={receipt} />
                          </Dialog>
                          {receipt.processingStatus === 'processed' && receipt.matchStatus !== 'matched' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Zap className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Classify Receipt</DialogTitle>
                                </DialogHeader>
                                <ReceiptClassificationPanel
                                  receipt={receipt}
                                  clientId={clientId}
                                  onTransactionCreated={(transactionId) => {
                                    toast({
                                      title: "Success",
                                      description: "Transaction created from receipt"
                                    });
                                    if (onReceiptMatched) {
                                      onReceiptMatched(receipt.id, transactionId);
                                    }
                                  }}
                                  onClose={() => {
                                    // Close dialog and refresh data
                                    refetch();
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/receipts/${receipt.id}/download`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(receipt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}