import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Calendar, 
  Store, 
  Receipt, 
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OCRResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  processingTimeMs: number;
  extractedData: {
    vendor: string;
    amount: number;
    taxAmount: number;
    netAmount: number;
    date: string;
    confidence: number;
    invoiceNumber?: string;
    paymentMethod?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
  ocrResults: {
    vendor: string;
    amount: number;
    taxAmount: number;
    netAmount: number;
    date: string;
    confidence: number;
    itemCount: number;
    invoiceNumber?: string;
    paymentMethod?: string;
  };
  message: string;
}

export default function OCRTest() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('enhanced-ocr');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, GIF, or PDF file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      setOcrResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);
      formData.append('model', selectedModel);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/ocr-test/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Upload failed');
      }

      const result: OCRResult = await response.json();
      setOcrResult(result);

      toast({
        title: "OCR Processing Complete!",
        description: `Extracted data from ${result.fileName} in ${result.processingTimeMs}ms`,
      });

    } catch (error) {
      console.error('OCR upload error:', error);
      toast({
        title: "OCR Processing Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6" data-testid="ocr-test-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Eye className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Receipt Processing Lab</h1>
          <p className="text-muted-foreground">
            Compare different AI models for receipt processing - OCR vs GPT-4o Mini
          </p>
        </div>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Model Selection
          </CardTitle>
          <CardDescription>
            Choose which AI model to use for receipt processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="model-select">Processing Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger data-testid="model-selector">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enhanced-ocr">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Enhanced OCR</div>
                      <div className="text-xs text-muted-foreground">Tesseract.js + preprocessing</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4o-mini">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <div>
                      <div className="font-medium">GPT-4o Mini</div>
                      <div className="text-xs text-muted-foreground">Azure OpenAI vision model</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="qwen" disabled>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Qwen 2.5-VL</div>
                      <div className="text-xs text-muted-foreground">Coming soon...</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Model Info */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50">
              {selectedModel === 'enhanced-ocr' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">Free</Badge>
                    <Badge variant="outline">No API</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Traditional OCR with image preprocessing. No API costs, runs locally.
                  </p>
                </div>
              )}
              {selectedModel === 'gpt-4o-mini' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-600">$0.15/1M tokens</Badge>
                    <Badge variant="outline">Vision AI</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Azure OpenAI GPT-4o Mini with vision capabilities. High accuracy, structured JSON output.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Receipt
            </CardTitle>
            <CardDescription>
              Upload a receipt image or PDF to test OCR text extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt-file">Select File</Label>
              <Input
                id="receipt-file"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                ref={fileInputRef}
                data-testid="file-input"
              />
              <p className="text-sm text-muted-foreground">
                Supported: JPEG, PNG, GIF, PDF (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </AlertDescription>
              </Alert>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Processing with {selectedModel === 'gpt-4o-mini' ? 'GPT-4o Mini AI' : 'Enhanced OCR'}...
                  </span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="w-full"
              data-testid="upload-button"
            >
              {isUploading ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedModel === 'gpt-4o-mini' ? 'Process with AI' : 'Extract with OCR'}
                </>
              )}
            </Button>

            {/* OCR Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Image preprocessing with Sharp</li>
                <li>• Tesseract.js OCR text extraction</li>
                <li>• Pattern-based data parsing</li>
                <li>• No AI API calls = $0 cost</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* OCR Engine Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              OCR Engine Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Engine</Label>
                <p className="text-sm">Tesseract.js</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cost</Label>
                <p className="text-sm text-green-600 font-medium">$0.00 per receipt</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">AI Usage</Label>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  None
                </Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Processing</Label>
                <p className="text-sm">Local CPU only</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Extraction Features</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Vendor detection
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Amount parsing
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Tax extraction
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Date detection
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Invoice numbers
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Line items
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {ocrResult && (
        <Card data-testid="ocr-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              OCR Extraction Results
            </CardTitle>
            <CardDescription>
              Processed {ocrResult.fileName} in {ocrResult.processingTimeMs}ms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(ocrResult.ocrResults.amount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(ocrResult.ocrResults.taxAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Tax Amount</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(ocrResult.ocrResults.confidence)}`}>
                  {(ocrResult.ocrResults.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {ocrResult.processingTimeMs}ms
                </div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
            </div>

            <Separator />

            {/* Extracted Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Receipt Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Vendor:</Label>
                    <span className="font-medium">{ocrResult.ocrResults.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label>Date:</Label>
                    <span>{ocrResult.ocrResults.date}</span>
                  </div>
                  {ocrResult.ocrResults.invoiceNumber && (
                    <div className="flex justify-between">
                      <Label>Invoice #:</Label>
                      <span>{ocrResult.ocrResults.invoiceNumber}</span>
                    </div>
                  )}
                  {ocrResult.ocrResults.paymentMethod && (
                    <div className="flex justify-between">
                      <Label>Payment:</Label>
                      <span>{ocrResult.ocrResults.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Net Amount:</Label>
                    <span className="font-medium">{formatCurrency(ocrResult.ocrResults.netAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label>Tax Amount:</Label>
                    <span className="font-medium">{formatCurrency(ocrResult.ocrResults.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <Label className="font-semibold">Total:</Label>
                    <span className="font-bold">{formatCurrency(ocrResult.ocrResults.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label>Line Items:</Label>
                    <Badge variant="outline">{ocrResult.ocrResults.itemCount} items</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">OCR Confidence Score</Label>
                <Badge className={getConfidenceBadge(ocrResult.ocrResults.confidence)}>
                  {(ocrResult.ocrResults.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={ocrResult.ocrResults.confidence * 100} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {ocrResult.ocrResults.confidence >= 0.8 
                  ? "High confidence - OCR results are likely accurate"
                  : ocrResult.ocrResults.confidence >= 0.6 
                  ? "Medium confidence - Review results for accuracy"
                  : "Low confidence - Manual review recommended"}
              </p>
            </div>

            {/* Line Items */}
            {ocrResult.extractedData.items && ocrResult.extractedData.items.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Extracted Line Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrResult.extractedData.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.description}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right p-2 font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}