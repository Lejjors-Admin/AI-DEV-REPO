import React, { useCallback, useState } from 'react';
import { Upload, FileText, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ImportPreviewScreen from './ImportPreviewScreen';
import { apiConfig } from '@/lib/api-config';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onIntakeAnalysis: (file: File) => Promise<void>;
  isProcessing?: boolean;
  className?: string;
  compact?: boolean;
  selectedClient?: string;
  fileType?: 'chart-of-accounts' | 'transactions';
}

interface FileWithPreview extends File {
  preview?: string;
  status?: 'pending' | 'processing' | 'success' | 'error' | 'preview';
  result?: any;
  parsedAccounts?: any[];
}

interface PreviewAccount {
  accountNumber: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance: number;
  isDebitNormal: boolean;
}

export function FileDropZone({ 
  onFilesSelected, 
  onIntakeAnalysis, 
  isProcessing = false,
  className = "",
  compact = false,
  selectedClient,
  fileType = 'chart-of-accounts'
}: FileDropZoneProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    accounts: PreviewAccount[];
    fileName: string;
  } | null>(null);

  const handlePreviewFile = async (file: FileWithPreview, clientId: string) => {
    try {
      console.log('🔧 FileDropZone: Starting file preview for:', file.name, 'type:', fileType);
      
      setProcessingFile(file.name);
      setFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'processing' } : f
      ));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      // Route to different endpoints based on file type
      const endpoint = fileType === 'transactions' 
        ? '/api/milton/upload-transactions'
        : '/api/ai-intake/preview-file';

      const response = await fetch(apiConfig.buildUrl(endpoint), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200) + '...');
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was not JSON, likely HTML error page');
        if (responseText.includes('<!DOCTYPE html>')) {
          throw new Error('Server returned HTML instead of JSON - check server logs for errors');
        }
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      console.log('Parsed result:', result);

      if (fileType === 'transactions') {
        // Handle transaction file parsing response
        if (result.success && result.data) {
          setFiles(prev => prev.map(f => 
            f.name === file.name ? { ...f, status: 'success', result: result } : f
          ));
          
          toast({
            title: "Transaction file parsed",
            description: `Found ${result.data.length} transactions ready for import`,
          });
        } else {
          throw new Error(result.error || 'Failed to parse transaction file');
        }
      } else {
        // Handle Chart of Accounts response - check for different types of results
        if (result.success) {
          if (result.preview && result.preview.accounts && result.preview.accounts.length > 0) {
            // Preview with account data
            setPreviewData({
              accounts: result.preview.accounts.map((acc: any) => ({
                accountNumber: acc.accountNumber || '',
                name: acc.name,
                type: acc.type,
                balance: acc.balance || 0,
                isDebitNormal: acc.isDebitNormal !== false
              })),
              fileName: file.name
            });
            setShowPreview(true);
            
            setFiles(prev => prev.map(f => 
              f.name === file.name ? { ...f, status: 'preview', parsedAccounts: result.preview.accounts } : f
            ));
            
            toast({
              title: "File Analysis Complete", 
              description: `Found ${result.preview.accountCount || result.preview.accounts.length} accounts. Review and import?`,
            });
          } else {
            // File processed but no accounts or preview data
            setFiles(prev => prev.map(f => 
              f.name === file.name ? { 
                ...f, 
                status: 'ready_for_import', 
                result: {
                  filename: result.filename,
                  fileType: result.fileType,
                  workflow: result.suggestedWorkflow,
                  size: result.size,
                  preview: result.preview
                }
              } : f
            ));
            
            // Offer direct import option
            toast({
              title: "File Ready for Import",
              description: `${result.filename} processed. Click the Import button to proceed.`,
            });
          }
        } else {
          throw new Error(result.error || 'Preview failed');
        }
      }
    } catch (error) {
      console.error('Error during file preview:', error);
      setFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' } : f
      ));
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : "Failed to preview file",
        variant: "destructive",
      });
    } finally {
      setProcessingFile(null);
    }
  };

  const handleDirectImport = async (file: FileWithPreview) => {
    try {
      const clientId = selectedClient || new URLSearchParams(window.location.search).get('clientId') || '2';
      
      setProcessingFile(file.name);
      setFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'processing' } : f
      ));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      const response = await fetch(apiConfig.buildUrl('/api/ai-intake/upload-and-import'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'success', result } : f
        ));
        
        toast({
          title: "Import Successful",
          description: `Created ${result.createdCount} accounts from ${file.name}`,
        });
        
        // Refresh the page to show new accounts
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Direct import error:', error);
      setFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' } : f
      ));
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import file",
        variant: "destructive",
      });
    } finally {
      setProcessingFile(null);
    }
  };

  const handleConfirmImport = async (accounts: PreviewAccount[]) => {
    try {
      const clientId = selectedClient || new URLSearchParams(window.location.search).get('clientId') || '5';
      
      const response = await fetch(apiConfig.buildUrl('/api/ai-intake/create-accounts-from-preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          accounts
        }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Created ${result.created} accounts successfully`,
        });
        
        // Invalidate accounts cache to refresh the chart of accounts display
        queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId] });
        
        // Also invalidate chart validation cache to update balance equations
        queryClient.invalidateQueries({ queryKey: [`/api/accounts`, clientId, 'validation'] });
        
        setShowPreview(false);
        setPreviewData(null);
        setFiles([]);
        // Stay on current page instead of reloading
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error during account import:', error);
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import accounts",
        variant: "destructive",
      });
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData(null);
    setFiles([]);
  };

  const handleAIIntake = async (file: FileWithPreview) => {
    const clientId = selectedClient || new URLSearchParams(window.location.search).get('clientId') || '5';
    await handlePreviewFile(file, clientId);
  };

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file),
        status: 'pending' as const
      });
      return fileWithPreview;
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    onFilesSelected(acceptedFiles);
    
    // Automatically trigger AI analysis for the first file if in compact mode
    if (compact && acceptedFiles.length > 0) {
      setTimeout(() => handleAIIntake(acceptedFiles[0] as FileWithPreview), 100);
    }
  }, [onFilesSelected, compact]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
        const fileName = file.name.toLowerCase();
        const fileType = file.type?.toLowerCase() || '';
        
        return (
          // PDF files
          fileType.includes('pdf') || fileName.endsWith('.pdf') ||
          // Excel files
          fileType.includes('sheet') || 
          fileType.includes('excel') ||
          fileType.includes('spreadsheet') ||
          fileName.endsWith('.xlsx') ||
          fileName.endsWith('.xls') ||
          // CSV files
          fileType.includes('csv') || 
          fileName.endsWith('.csv')
        );
      });
      
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload Excel (.xlsx, .xls), CSV, or PDF files only.",
          variant: "destructive"
        });
      }
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const getFileIcon = (file: File) => {
    const fileType = file.type || '';
    const fileName = file.name || '';
    
    if (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    if (fileType.includes('sheet') || fileType.includes('csv') || 
        fileName.toLowerCase().includes('.xlsx') || fileName.toLowerCase().includes('.xls') || 
        fileName.toLowerCase().includes('.csv')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className={`${compact ? '' : 'space-y-4'} ${className}`}>
      {/* Drop Zone */}
      {compact ? (
        <div 
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`cursor-pointer border-2 border-dashed transition-colors duration-200 flex items-center justify-center ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${className}`}
        >
          <input 
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload-compact"
          />
          <label htmlFor="file-upload-compact" className="cursor-pointer flex items-center gap-2 p-2">
            <Upload className={`h-4 w-4 ${
              dragActive ? 'text-blue-600' : 'text-gray-600'
            }`} />
            <span className="text-sm font-medium">
              {dragActive ? 'Drop here' : 'Intake'}
            </span>
          </label>
        </div>
      ) : (
        <Card className={`border-2 border-dashed transition-colors duration-200 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}>
          <CardContent className="p-8">
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="cursor-pointer"
            >
              <input 
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className={`p-4 rounded-full ${
                    dragActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-8 w-8 ${
                      dragActive ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {dragActive ? 'Drop files here' : 'Drag & drop your files'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Upload Excel, CSV, or PDF files containing chart of accounts data
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <Badge variant="outline">.xlsx</Badge>
                      <Badge variant="outline">.xls</Badge>
                      <Badge variant="outline">.csv</Badge>
                      <Badge variant="outline">.pdf</Badge>
                    </div>
                  </div>
                  
                  <Button variant="outline" type="button">
                    Choose Files
                  </Button>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Uploaded Files</h4>
          {files.map((file, index) => (
            <Card key={`${file.name}-${index}`} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {getStatusIcon(file.status)}
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.status === 'pending' && (
                    <Button
                      onClick={() => handleAIIntake(file)}
                      disabled={processingFile !== null}
                      size="sm"
                      variant="outline"
                    >
                      {processingFile === file.name ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          AI Analyzing...
                        </>
                      ) : (
                        <>
                          AI Intake
                        </>
                      )}
                    </Button>
                  )}
                  
                  {file.status === 'success' && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Processed
                    </Badge>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex space-x-2">
                      <Badge variant="destructive">Failed</Badge>
                      <Button
                        onClick={() => handleAIIntake(file)}
                        disabled={processingFile !== null}
                        size="sm"
                        variant="outline"
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => removeFile(file.name)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import Preview Screen */}
      {showPreview && previewData && (
        <ImportPreviewScreen
          accounts={previewData.accounts}
          fileName={previewData.fileName}
          onConfirmImport={handleConfirmImport}
          onCancel={handleCancelPreview}
        />
      )}
    </div>
  );
}