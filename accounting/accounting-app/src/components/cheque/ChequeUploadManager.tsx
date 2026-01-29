import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Upload, FileSpreadsheet, Check, X, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiConfig } from "@/lib/api-config";

interface ChequeUploadManagerProps {
  clientId: number | null;
}

export default function ChequeUploadManager({ clientId }: ChequeUploadManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch vendors for matching
  const { data: vendorResponse } = useQuery({
    queryKey: ['/api/crm/vendors', clientId],
    enabled: !!clientId,
    queryFn: () => apiRequest('GET', `/api/crm/vendors?clientId=${clientId}`).then(res => res.json())
  });
  
  const vendors = vendorResponse?.data || [];

  // Upload cheques mutation
  const uploadChequesMutation = useMutation({
    mutationFn: async (data: { file: File; mapping: any }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('mapping', JSON.stringify(data.mapping));
      formData.append('clientId', clientId?.toString() || '');
      
      const response = await fetch('/api/crm/cheques/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/cheques'] });
      setUploadResults(data.results || []);
      setShowMappingDialog(false);
      toast({ 
        title: 'Cheque upload completed', 
        description: `${data.success || 0} cheques processed` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error uploading cheques', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const sampleRows = jsonData.slice(1, 6);
          
          setUploadPreview({
            file,
            headers,
            sampleRows,
            totalRows: jsonData.length - 1
          });
          
          // Auto-map common cheque columns
          const autoMapping: {[key: string]: string} = {};
          headers.forEach((header: string) => {
            const lower = header.toLowerCase();
            if (lower.includes('vendor') || lower.includes('payee')) autoMapping[header] = 'vendorName';
            else if (lower.includes('amount') || lower.includes('total')) autoMapping[header] = 'amount';
            else if (lower.includes('date') || lower.includes('cheque date')) autoMapping[header] = 'chequeDate';
            else if (lower.includes('memo') || lower.includes('description')) autoMapping[header] = 'memo';
            else if (lower.includes('reference') || lower.includes('ref')) autoMapping[header] = 'referenceNumber';
            else if (lower.includes('account') && lower.includes('expense')) autoMapping[header] = 'expenseAccount';
          });
          
          setColumnMapping(autoMapping);
          setShowMappingDialog(true);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      toast({ 
        title: 'Error reading file', 
        description: 'Please ensure the file is a valid Excel file', 
        variant: 'destructive' 
      });
    }
  };

  const confirmUpload = () => {
    if (uploadPreview?.file) {
      uploadChequesMutation.mutate({ 
        file: uploadPreview.file, 
        mapping: columnMapping 
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Enhanced download with proper blob handling
  const downloadCheque = async (chequeId: number) => {
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/cheque/${chequeId}/download`));
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download URL
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cheque-${chequeId}.pdf`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Cheque downloaded successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Download failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Enhanced print with proper PDF handling
  const printCheque = async (chequeId: number) => {
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/crm/cheque/${chequeId}/download`));
      
      if (!response.ok) {
        throw new Error('Print failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({ title: 'Cheque sent to printer' });
    } catch (error: any) {
      toast({ 
        title: 'Print failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  if (!clientId) {
    return <div className="p-4 text-center text-gray-500">Please select a client to manage cheques</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Mass Cheque Upload</h3>
          <p className="text-sm text-muted-foreground">Upload multiple cheques from Excel file</p>
        </div>
        <Button onClick={triggerFileUpload} disabled={uploadChequesMutation.isPending}>
          <Upload className="h-4 w-4 mr-2" />
          {uploadChequesMutation.isPending ? 'Uploading...' : 'Upload Cheques'}
        </Button>
      </div>

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Map Excel Columns to Cheque Fields</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Review and map your Excel columns to the appropriate cheque fields. 
              Found {uploadPreview?.totalRows || 0} rows to import.
            </p>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-hidden">
            {uploadPreview?.headers && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Column Mapping</h4>
                  <p className="text-sm text-muted-foreground">
                    Map each Excel column to a cheque field ({uploadPreview.headers.length} columns found)
                  </p>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {uploadPreview.headers.map((header: string, index: number) => (
                    <div key={`mapping-${index}-${header}`} className="flex items-center gap-3 p-3 border rounded-md">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">
                          Column: <span className="font-bold text-blue-600">{header}</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Sample: {uploadPreview.sampleRows?.[0]?.[index] || 'No data'}
                        </p>
                      </div>
                      <div className="flex-1">
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => {
                            console.log(`Mapping ${header} to ${e.target.value}`);
                            setColumnMapping(prev => ({ 
                              ...prev, 
                              [header]: e.target.value 
                            }));
                          }}
                          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Skip this column --</option>
                          <option value="vendorName">Vendor/Payee Name</option>
                          <option value="amount">Amount</option>
                          <option value="chequeDate">Cheque Date</option>
                          <option value="memo">Memo/Description</option>
                          <option value="referenceNumber">Reference Number</option>
                          <option value="expenseAccount">Expense Account</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Current Mappings:</h5>
                  <div className="text-xs text-blue-700 space-y-1">
                    {Object.entries(columnMapping).filter(([_, value]) => value).length === 0 ? (
                      <p className="text-gray-500">No mappings selected yet</p>
                    ) : (
                      Object.entries(columnMapping)
                        .filter(([_, value]) => value)
                        .map(([column, field]) => (
                          <div key={column} className="flex justify-between">
                            <span>{column}</span>
                            <span>→ {field}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {uploadPreview?.sampleRows && (
              <div className="space-y-2">
                <h4 className="font-medium">Preview (First 5 rows)</h4>
                <div className="overflow-x-auto max-h-40">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-50">
                        {uploadPreview.headers.map((header: string, index: number) => (
                          <th key={index} className="border p-1 text-left">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.sampleRows.map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex}>
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="border p-1">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmUpload} 
              disabled={uploadChequesMutation.isPending || Object.keys(columnMapping).filter(key => columnMapping[key]).length === 0}
              className="min-w-[120px]"
            >
              {uploadChequesMutation.isPending ? 'Uploading...' : 
               Object.keys(columnMapping).filter(key => columnMapping[key]).length === 0 ? 'Select Mappings' :
               `Upload ${uploadPreview?.totalRows || 0} Cheques`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.row}</TableCell>
                    <TableCell>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status === 'success' ? 'Success' : 'Error'}
                      </Badge>
                    </TableCell>
                    <TableCell>{result.data?.vendorName || 'N/A'}</TableCell>
                    <TableCell>
                      {result.data?.amount ? `$${parseFloat(result.data.amount).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {result.status === 'success' && result.chequeId && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadCheque(result.chequeId)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printCheque(result.chequeId)}
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-red-600 text-xs">{result.error || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button onClick={() => setUploadResults([])} variant="outline">
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}