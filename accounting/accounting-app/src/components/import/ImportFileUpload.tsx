/**
 * Import File Upload Component
 * 
 * Handles file upload for PerfexCRM import with drag-and-drop support
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react';

interface ImportFileUploadProps {
  sessionId: number;
  entityTypes: string[];
  onFilesUploaded: (files: any[]) => void;
}

interface UploadedFile {
  fileName: string;
  originalFileName: string;
  fileSize: number;
  entityType: string;
  headers: string[];
  totalRecords: number;
  preview: any[];
  suggestedMappings: Record<string, number>;
  error?: string;
}

export function ImportFileUpload({ sessionId, entityTypes, onFilesUploaded }: ImportFileUploadProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ files, entityType }: { files: File[]; entityType: string }) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('file', file);
      });
      formData.append('entityType', entityType);

      return await fetch(`/api/perfex-import/upload/${sessionId}`, {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      const newFile = data.data;
      const updatedFiles = [...uploadedFiles, newFile];
      setUploadedFiles(updatedFiles);
      onFilesUploaded(updatedFiles);
      
      toast({
        title: "File Uploaded Successfully",
        description: `${newFile.originalFileName} processed with ${newFile.totalRecords} records`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Multiple files upload mutation
  const uploadMultipleMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
        // Try to detect entity type from filename
        const entityType = detectEntityTypeFromFilename(file.name);
        formData.append(`entityType_${index}`, entityType);
      });

      return await fetch(`/api/perfex-import/upload/multiple/${sessionId}`, {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      const newFiles = data.data.files.filter((f: any) => !f.error);
      const errorFiles = data.data.files.filter((f: any) => f.error);
      
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      onFilesUploaded(updatedFiles);
      
      if (newFiles.length > 0) {
        toast({
          title: "Files Uploaded",
          description: `${newFiles.length} files processed successfully`
        });
      }
      
      if (errorFiles.length > 0) {
        toast({
          title: "Some Files Failed",
          description: `${errorFiles.length} files failed to process`,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    if (acceptedFiles.length === 1) {
      // Single file upload - prompt for entity type
      const entityType = entityTypes[0] || 'clients'; // Default to first selected entity type
      uploadMutation.mutate({ files: acceptedFiles, entityType });
    } else {
      // Multiple files upload
      uploadMultipleMutation.mutate(acceptedFiles);
    }
  }, [sessionId, entityTypes, uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    disabled: isUploading
  });

  // Helper function to detect entity type from filename
  const detectEntityTypeFromFilename = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('client') || lower.includes('customer')) return 'clients';
    if (lower.includes('project')) return 'projects';
    if (lower.includes('task')) return 'tasks';
    if (lower.includes('contact')) return 'contacts';
    if (lower.includes('invoice')) return 'invoices';
    if (lower.includes('time')) return 'time_entries';
    return 'clients'; // default
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card data-testid="import-file-upload">
      <CardHeader>
        <CardTitle>Upload PerfexCRM Export Files</CardTitle>
        <CardDescription>
          Upload CSV or Excel files exported from your PerfexCRM system. 
          You can upload multiple files at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          data-testid="file-dropzone"
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            
            {isUploading ? (
              <div className="space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <p className="text-lg font-medium">Uploading and processing files...</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we analyze your data
                </p>
              </div>
            ) : isDragActive ? (
              <div>
                <p className="text-lg font-medium text-blue-600">Drop files here</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Release to upload your PerfexCRM export files
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Supports CSV, XLS, and XLSX files up to 100MB each
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File Type Hints */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>File naming tip:</strong> Include entity type in filename for auto-detection 
            (e.g., "clients_export.csv", "projects_data.xlsx"). 
            Supported types: {entityTypes.join(', ')}.
          </AlertDescription>
        </Alert>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Uploaded Files</h4>
            
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`uploaded-file-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      {file.error ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium">{file.originalFileName}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <span>{file.totalRecords?.toLocaleString()} records</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {file.entityType}
                        </Badge>
                      </div>
                      {file.error && (
                        <p className="text-sm text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!file.error && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Show preview modal or expand preview
                          console.log('Show preview for:', file);
                        }}
                        data-testid={`preview-file-${index}`}
                      >
                        <File className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`remove-file-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Summary */}
        {uploadedFiles.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadedFiles.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Files Uploaded
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadedFiles.reduce((sum, file) => sum + (file.totalRecords || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Records
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0) < 1024 * 1024 
                    ? Math.round(uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0) / 1024) + ' KB'
                    : Math.round(uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0) / (1024 * 1024)) + ' MB'
                  }
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Size
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Template */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              // Download sample template
              window.open('/api/perfex-import/templates/sample', '_blank');
            }}
            data-testid="download-template"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Sample Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}