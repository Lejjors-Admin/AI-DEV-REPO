// BINDER: Caseware Import Component
// Allows importing Caseware files directly into BINDER with trial balance integration

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Database,
  FileCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

interface CasewareImportProps {
  binderId: number;
  onImportComplete?: () => void;
}

interface ImportResult {
  success: boolean;
  result: {
    sectionsImported: number;
    workpapersImported: number;
    trialBalanceEntries: number;
    clientName: string;
    fiscalYearEnd: string;
    message: string;
  };
  validation: {
    sections: string[];
    clientName: string;
    fiscalYearEnd: string;
    warnings: string[];
  };
}

export function CasewareImport({ binderId, onImportComplete }: CasewareImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  // File upload and import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('casewareFile', file);
      
      const response = await fetch(apiConfig.buildUrl(`/api/binder/${binderId}/caseware/upload`), {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import Caseware file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: "Caseware Import Successful!",
        description: `Imported ${data.result.sectionsImported} sections and ${data.result.workpapersImported} working papers`,
      });
      onImportComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import Caseware file",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Caseware Import
        </CardTitle>
        <CardDescription>
          Import audit sections and working papers from Caseware files (.cwf, .cwd, .xml)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* File Selection */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Select a Caseware file to import
              </p>
              <input
                type="file"
                accept=".cwf,.cwd,.xml"
                onChange={handleFileSelect}
                className="hidden"
                id="caseware-file-input"
              />
              <label htmlFor="caseware-file-input">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <Badge variant="secondary">
                  {formatFileSize(selectedFile.size)}
                </Badge>
              </div>
              <p className="text-sm text-blue-700">
                Ready to import • File type: {selectedFile.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* Import Button */}
        {selectedFile && !importResult && (
          <div className="flex justify-center">
            <Button 
              onClick={handleImport}
              disabled={importMutation.isPending}
              size="lg"
              className="w-full max-w-sm"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import to BINDER
                </>
              )}
            </Button>
          </div>
        )}

        {/* Import Progress */}
        {importMutation.isPending && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-center text-gray-600">
              Processing Caseware file and integrating with trial balance data...
            </p>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Import Successful!</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Client Information</h4>
                  <p className="text-sm text-green-700">
                    <strong>Client:</strong> {importResult.result.clientName}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Fiscal Year End:</strong> {importResult.result.fiscalYearEnd}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Import Statistics</h4>
                  <p className="text-sm text-green-700">
                    <strong>Sections:</strong> {importResult.result.sectionsImported}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Working Papers:</strong> {importResult.result.workpapersImported}
                  </p>
                  {importResult.result.trialBalanceEntries > 0 && (
                    <p className="text-sm text-green-700">
                      <strong>Trial Balance Entries:</strong> {importResult.result.trialBalanceEntries}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Imported Sections */}
            {importResult.validation.sections.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Imported Sections:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {importResult.validation.sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {importResult.validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Import Warnings:</p>
                    {importResult.validation.warnings.map((warning, index) => (
                      <p key={index} className="text-sm">• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Separator />
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFile(null);
                  setImportResult(null);
                }}
              >
                Import Another File
              </Button>
            </div>
          </div>
        )}

        {/* Supported Formats Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-800">Supported Formats</h4>
          </div>
          <div className="space-y-1 text-sm text-blue-700">
            <p><strong>.xml</strong> - CaseWare XML Export (recommended for best results)</p>
            <p><strong>.cwf</strong> - CaseWare Working File (basic structure extraction)</p>
            <p><strong>.cwd</strong> - CaseWare Database File (structure and data extraction)</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}