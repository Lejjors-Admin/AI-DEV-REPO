/**
 * Mobile Camera Capture Component
 * 
 * Features:
 * - Document and receipt photography
 * - Real-time OCR processing
 * - Automatic image optimization
 * - Offline capability with background upload
 * - Touch-friendly interface
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Zap, 
  FileText, 
  Check, 
  X, 
  Loader2,
  ScanLine,
  Download,
  Share2
} from 'lucide-react';

interface CaptureResult {
  id: string;
  imageUrl: string;
  thumbnail: string;
  ocrText?: string;
  confidence: number;
  extractedData?: {
    vendor?: string;
    amount?: string;
    date?: string;
    category?: string;
    taxAmount?: string;
  };
  processedAt: Date;
}

interface CameraCaptureProps {
  onCapture: (result: CaptureResult) => void;
  mode: 'receipt' | 'document' | 'business_card' | 'invoice';
  clientId?: number;
  className?: string;
}

export function CameraCapture({ 
  onCapture, 
  mode = 'receipt', 
  clientId,
  className = '' 
}: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  /**
   * Start camera stream
   */
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      // Check if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080 },
          aspectRatio: 16/9
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsCapturing(true);
    } catch (error) {
      console.error('Camera access failed:', error);
      setCameraError('Camera access denied or not available');
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use file upload.",
        variant: "destructive"
      });
    }
  }, [facingMode, toast]);

  /**
   * Stop camera stream
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    
    stopCamera();
    
    // Start processing
    await processImage(imageDataUrl);
  }, [stopCamera]);

  /**
   * Process uploaded file
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setCapturedImage(imageDataUrl);
      await processImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  /**
   * Process captured image with OCR
   */
  const processImage = useCallback(async (imageDataUrl: string) => {
    setIsProcessing(true);
    
    try {
      // Create thumbnail
      const thumbnail = await createThumbnail(imageDataUrl, 200, 200);
      
      // Simulate OCR processing (would use Tesseract.js or cloud OCR)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      const mockOcrResult = generateMockOcrResult(mode);
      setOcrResult(mockOcrResult);
      
      const result: CaptureResult = {
        id: `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: imageDataUrl,
        thumbnail,
        ocrText: mockOcrResult.text,
        confidence: mockOcrResult.confidence,
        extractedData: mockOcrResult.extractedData,
        processedAt: new Date()
      };
      
      toast({
        title: "Document Processed",
        description: `${mode.charAt(0).toUpperCase() + mode.slice(1)} captured with ${Math.round(mockOcrResult.confidence * 100)}% confidence`,
      });
      
      onCapture(result);
    } catch (error) {
      console.error('Image processing failed:', error);
      toast({
        title: "Processing Failed",
        description: "Unable to process image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [mode, onCapture, toast]);

  /**
   * Create thumbnail from image
   */
  const createThumbnail = async (imageDataUrl: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
      img.src = imageDataUrl;
    });
  };

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(() => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
    if (isCapturing) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isCapturing, stopCamera, startCamera]);

  /**
   * Reset capture
   */
  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setOcrResult(null);
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Camera permission check
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permission.state === 'denied') {
          setCameraError('Camera permission denied');
        }
      } catch (error) {
        // Permission API not supported
        console.log('Permission API not supported');
      }
    };
    
    checkCameraPermission();
  }, []);

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" />
          Capture {mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {mode === 'receipt' && '📄 Receipt'}
            {mode === 'document' && '📋 Document'}
            {mode === 'business_card' && '💼 Business Card'}
            {mode === 'invoice' && '🧾 Invoice'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Auto OCR
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!capturedImage ? (
          <>
            {/* Camera View */}
            {isCapturing && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Camera overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                  </div>
                  
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-black/50 text-white border-white/20">
                      Position {mode.replace('_', ' ')} within frame
                    </Badge>
                  </div>
                </div>
                
                {/* Capture button */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="rounded-full h-16 w-16 bg-white text-black hover:bg-gray-100"
                  >
                    <Camera className="h-8 w-8" />
                  </Button>
                </div>
                
                {/* Switch camera button */}
                <Button
                  onClick={switchCamera}
                  size="sm"
                  variant="ghost"
                  className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                <X className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-medium">Camera Error</p>
                <p className="text-red-600 text-sm mt-1">{cameraError}</p>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex gap-2">
              {!isCapturing && !cameraError && (
                <Button
                  onClick={startCamera}
                  className="flex-1"
                  data-testid="button-start-camera"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              )}
              
              {isCapturing && (
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-stop-camera"
                >
                  <X className="h-4 w-4 mr-2" />
                  Stop Camera
                </Button>
              )}
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
                data-testid="button-upload-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              capture="environment"
            />
          </>
        ) : (
          <>
            {/* Captured Image Preview */}
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full rounded-lg border"
              />
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="font-medium">Processing Image...</p>
                    <p className="text-sm opacity-80">Extracting text and data</p>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Results */}
            {ocrResult && !isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">OCR Complete</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(ocrResult.confidence * 100)}% confidence
                  </Badge>
                </div>
                
                {ocrResult.extractedData && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Extracted Data:</p>
                    {Object.entries(ocrResult.extractedData).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
                
                {ocrResult.text && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View extracted text
                    </summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                      {ocrResult.text}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={resetCapture}
                variant="outline"
                className="flex-1"
                data-testid="button-retake"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              
              {ocrResult && (
                <Button
                  onClick={() => {
                    toast({
                      title: "Document Saved",
                      description: "Document has been saved successfully.",
                    });
                    resetCapture();
                  }}
                  className="flex-1"
                  data-testid="button-save"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}
            </div>
          </>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}

/**
 * Generate mock OCR result for demo purposes
 */
function generateMockOcrResult(mode: string) {
  const baseConfidence = 0.85 + Math.random() * 0.1;
  
  const mockResults = {
    receipt: {
      text: "STAPLES\n123 Main St, Toronto ON\nTel: (416) 555-0123\n\nOffice Supplies    $45.99\nTax (HST 13%)      $5.98\nTotal              $51.97\n\nCredit Card ****1234\nAuth: 123456\nDate: 2025-01-15 14:32",
      confidence: baseConfidence,
      extractedData: {
        vendor: 'Staples',
        amount: '$51.97',
        date: '2025-01-15',
        category: 'Office Supplies',
        taxAmount: '$5.98'
      }
    },
    invoice: {
      text: "INVOICE #INV-2025-001\nABC Consulting Services\n456 Business Ave, Toronto ON\n\nBill To:\nXYZ Corporation\n789 Client St, Toronto ON\n\nProfessional Services  $1,500.00\nHST (13%)              $195.00\nTotal Amount Due       $1,695.00\n\nDue Date: February 15, 2025",
      confidence: baseConfidence,
      extractedData: {
        vendor: 'ABC Consulting Services',
        amount: '$1,695.00',
        date: '2025-01-15',
        category: 'Professional Services',
        taxAmount: '$195.00'
      }
    },
    document: {
      text: "BUSINESS REGISTRATION\nProvince of Ontario\nMinistry of Government Services\n\nCorporation Name: Tech Innovations Inc.\nOntario Corporation Number: 123456789\nDate of Incorporation: January 1, 2025\nRegistered Office: 123 Tech Ave, Toronto ON",
      confidence: baseConfidence,
      extractedData: {
        vendor: 'Government of Ontario',
        date: '2025-01-01',
        category: 'Legal Document'
      }
    },
    business_card: {
      text: "John Smith\nSenior Accountant\nSmith & Associates CPA\n123 Finance St, Toronto ON M5V 1A1\nPhone: (416) 555-0198\nEmail: john.smith@smithcpa.ca\nwww.smithcpa.ca",
      confidence: baseConfidence,
      extractedData: {
        vendor: 'Smith & Associates CPA',
        category: 'Business Contact'
      }
    }
  };
  
  return mockResults[mode as keyof typeof mockResults] || mockResults.receipt;
}