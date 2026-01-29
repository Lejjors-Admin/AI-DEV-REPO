import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Brain,
  TrendingUp,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AccountMappingInterface } from "./AccountMappingInterface";
import { apiConfig } from "@/lib/api-config";

interface JournalEntryLine {
  accountNumber?: string;
  account?: string;
  accountName?: string;
  accountDescription?: string;
  description?: string;
  memo?: string;
  lineDescription?: string;
  debit?: number;
  credit?: number;
}

interface JournalEntry {
  reference?: string;
  journalReference?: string;
  date?: string;
  transactionDate?: string;
  description?: string;
  memo?: string;
  entries?: JournalEntryLine[];
  lines?: JournalEntryLine[];
  totalDebit?: number;
  totalCredit?: number;
}

interface Summary {
  journalEntriesCount?: number;
  journalEntries?: number;
  totalLines?: number;
}

interface GLAnalysisResult {
  success: boolean;
  fileName: string;
  detectedFormat: string;
  totalRows: number;
  totalTransactions: number;
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  sessionId?: number;
  accountSections: Array<{
    accountNumber: string;
    accountName: string;
    startRow: number;
    endRow: number;
    transactionCount: number;
    totalDebit: number;
    totalCredit: number;
  }>;
  accountMatches: Record<
    string,
    {
      accountId: number | null;
      accountName: string;
      transactionCount: number;
      matched: boolean;
      suggestion?: string;
    }
  >;
  extractedData: Array<{
    accountNumber: string;
    accountName: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    reference: string;
  }>;
  rawSample: any[][];
  // Optional fields that may be present in the response
  journalEntries?: JournalEntry[];
  summary?: Summary;
  extractedTransactions?: any[];
}

interface GeneralLedgerImportProps {
  clientId: number;
  onImportComplete: () => void;
}

export function GeneralLedgerImport({
  clientId,
  onImportComplete,
}: GeneralLedgerImportProps) {
  const [currentStage, setCurrentStage] = useState<
    "upload" | "mapping" | "importing"
  >("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GLAnalysisResult | null>(
    null
  );
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [createMissingAccounts, setCreateMissingAccounts] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [importProgress, setImportProgress] = useState<{
    isActive: boolean;
    totalTransactions: number;
    processedCount: number;
    importedCount: number;
    skippedCount: number;
    currentBatch: number;
    totalBatches: number;
    progressPercent: number;
    startTime?: string;
    currentEntry?: string;
    estimatedTimeRemaining?: string;
  } | null>(null);
  const { toast } = useToast();
  
  // Ref to track polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for import progress on component mount and restore state
  useEffect(() => {

    // PERSISTENT STATE: Check if import is in progress on page load
    const checkActiveImport = async () => {
      try {
        console.log("🔍 CHECKING FOR ACTIVE IMPORT ON PAGE LOAD...");
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Content-Type"] = "application/json";
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(
          apiConfig.buildUrl(`/api/general-ledger/import-progress/${clientId}`),
          {
            headers,
            credentials: "include",
          }
        );
        const data = await response.json();

        console.log("📊 PAGE LOAD IMPORT CHECK RESULT:", data);

        // Check for failed/rejected states first
        if (
          data.status === "rejected" ||
          data.status === "failed" ||
          data.status === "cancelled"
        ) {
          console.log(
            "❌ IMPORT HAS FAILED/BEEN REJECTED - Status:",
            data.status,
            "Resetting to upload stage"
          );
          // Reset everything to clean state
          setCurrentStage("upload");
          setAnalysisResult(null);
          setImportProgress(null);
          setIsImporting(false);
          setSessionId(null);
          return;
        }

        // Only restore state for active or genuinely in-progress imports
        if (
          data.isActive &&
          (data.status === "processing" ||
            data.status === "pending" ||
            data.status === "matched")
        ) {
          console.log("✅ RESTORING ACTIVE IMPORT STATE:", data);

          // Restore import progress state
          const progressData = {
            isActive: data.isActive,
            totalTransactions: data.total || 0,
            processedCount: data.progress || 0,
            importedCount: data.progress || 0,
            skippedCount: 0,
            currentBatch: 1,
            totalBatches: 1,
            progressPercent:
              data.percentage ||
              (data.total > 0
                ? Math.round((data.progress / data.total) * 100)
                : 0),
            currentEntry: data.currentEntry || "Processing...",
            estimatedTimeRemaining: data.estimatedTimeRemaining,
            startTime: data.startTime,
          };

          setImportProgress(progressData);
          setIsImporting(data.isActive);
          setSessionId(data.sessionId);

          // Start polling only if there's an active import
          if (data.isActive) {
            pollingIntervalRef.current = setInterval(pollImportProgress, 2000);
            console.log("🔄 Started polling for active import");
          }

          // Restore the correct UI stage - only for active imports
          if (
            data.isActive &&
            data.progress > 0 &&
            (data.status === "processing" || data.status === "pending")
          ) {
            // Import is actively running - show importing stage
            console.log(
              "🎯 SETTING STAGE TO IMPORTING - Progress:",
              data.progress,
              "Status:",
              data.status
            );
            setCurrentStage("importing");

            // Also restore analysisResult for importing stage UI to work
            if (data.sessionId) {
              try {
                const validationResponse = await fetch(
                  apiConfig.buildUrl(`/api/gl-staging/${clientId}/validate?sessionId=${data.sessionId}`),
                  {
                    credentials: "include",
                  }
                );
                if (validationResponse.ok) {
                  const validationData = await validationResponse.json();
                  console.log(
                    "✅ RESTORED ANALYSIS RESULT FOR IMPORTING STAGE:",
                    validationData
                  );
                  setAnalysisResult(validationData);
                } else {
                  console.log(
                    "⚠️ Could not restore analysis result, using minimal data for importing stage"
                  );
                  // Create minimal analysisResult so importing stage can render
                  setAnalysisResult({
                    success: true,
                    summary: {
                      totalTransactions: data.total || 0,
                      validTransactions: data.total || 0,
                      errors: [],
                    },
                    accountMatches: {},
                  } as any);
                }
              } catch (err) {
                console.log(
                  "⚠️ Could not restore validation data for importing stage:",
                  err
                );
                // Create minimal analysisResult so importing stage can render
                setAnalysisResult({
                  success: true,
                  summary: {
                    totalTransactions: data.total || 0,
                    validTransactions: data.total || 0,
                    errors: [],
                  },
                  accountMatches: {},
                } as any);
              }
            }
          } else if (data.isActive) {
            // Session is active but no progress yet - show mapping stage
            setCurrentStage("mapping");
            // Try to restore analysis result for mapping interface
            if (data.sessionId) {
              try {
                const validationResponse = await fetch(
                  apiConfig.buildUrl(`/api/gl-staging/${clientId}/validate?sessionId=${data.sessionId}`),
                  {
                    credentials: "include",
                  }
                );
                if (validationResponse.ok) {
                  const validationData = await validationResponse.json();
                  setAnalysisResult(validationData);
                }
              } catch (err) {
                console.log("Could not restore validation data:", err);
              }
            }
          }
        } else {
          console.log("❌ NO ACTIVE IMPORT DETECTED ON PAGE LOAD");
        }
      } catch (error) {
        console.log("❌ ERROR CHECKING FOR ACTIVE IMPORT:", error);
      }
    };

    checkActiveImport();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Poll for import progress
  const pollImportProgress = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Content-Type"] = "application/json";
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiConfig.buildUrl(`/api/general-ledger/import-progress/${clientId}`),
        {
          headers,
          credentials: "include", // Include auth cookies
        }
      );
      const data = await response.json();

      console.log("🔄 Import progress poll:", data);

      // Check for failed/rejected states and stop polling
      if (
        data.status === "rejected" ||
        data.status === "failed" ||
        data.status === "cancelled"
      ) {
        console.log(
          "❌ POLLING DETECTED FAILED IMPORT - Status:",
          data.status,
          "Stopping polling and resetting UI"
        );
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log("🛑 Stopped polling - import failed/rejected");
        }
        
        setImportProgress(null);
        setIsImporting(false);
        setCurrentStage("upload");
        setAnalysisResult(null);
        setSessionId(null);
        return; // Stop polling
      }

      // Only update progress for active imports
      if (
        data.isActive &&
        (data.status === "processing" ||
          data.status === "pending" ||
          data.status === "matched")
      ) {
        const progressData = {
          isActive: data.isActive,
          totalTransactions: data.total || 0,
          processedCount: data.progress || 0,
          importedCount: data.progress || 0,
          skippedCount: 0,
          currentBatch: 1,
          totalBatches: 1,
          progressPercent:
            data.percentage ||
            (data.total > 0
              ? Math.round((data.progress / data.total) * 100)
              : 0),
          currentEntry: data.currentEntry || "Processing...",
          estimatedTimeRemaining: data.estimatedTimeRemaining,
          startTime: data.startTime,
        };

        setImportProgress(progressData);
        setIsImporting(data.isActive);

        // Only switch to importing stage for actively processing imports
        if (
          data.isActive &&
          data.progress > 0 &&
          (data.status === "processing" || data.status === "pending")
        ) {
          setCurrentStage("importing");
        }

        // Check if import just completed
        if (
          !data.isActive &&
          data.progress > 0 &&
          data.total > 0 &&
          data.progress >= data.total
        ) {
          // Import completed - stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            console.log("🛑 Stopped polling - import completed");
          }
          
          setTimeout(() => {
            toast({
              title: "✅ Import Complete!",
              description: `Successfully imported ${data.progress} journal entries`,
            });
            onImportComplete();
            setImportProgress(null);
            setIsImporting(false);
            setCurrentStage("upload");
            setAnalysisResult(null);
            setSessionId(null);
          }, 2000);
        }
      } else if (!data.isActive) {
        // No active import - stop polling
        setImportProgress(null);
        setIsImporting(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log("🛑 Stopped polling - no active import");
        }
      }
    } catch (error) {
      console.error("Error polling import progress:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(
        apiConfig.buildUrl(`/api/gl-staging/${clientId}/analyze-file`),
        {
          method: "POST",
          body: formData,
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as GLAnalysisResult;

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (result.success) {
        setAnalysisResult(result);
        setSessionId(result.sessionId || null);

        // Check if we need mapping stage
        const unmatchedAccounts = Object.values(
          result.accountMatches || {}
        ).filter((m: any) => !m.matched).length;

        if (unmatchedAccounts > 0) {
          toast({
            title: "Analysis Complete - Mapping Required",
            description: `Found ${unmatchedAccounts} accounts that need mapping. Proceeding to mapping stage.`,
          });
          setCurrentStage("mapping");
        } else {
          toast({
            title: "AI Analysis Complete",
            description: `All accounts matched successfully. Ready to import ${result.totalTransactions} transactions.`,
          });
        }
      } else {
        throw new Error("Analysis failed");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("GL analysis error:", error);
      toast({
        title: "Analysis Failed",
        description:
          "Could not analyze the General Ledger file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  const handleMappingComplete = async (mappings: Record<string, any>) => {
    console.log(
      "🎯 Mapping complete, proceeding to import with mappings:",
      mappings
    );
    setCurrentStage("importing");
    // Don't await here - let it run asynchronously so UI updates immediately
    handleImport(mappings);
  };

  const handleImport = async (accountMappings?: Record<string, any>) => {
    if (!analysisResult || !sessionId) return;

    setIsImporting(true);

    // Start polling for progress
    const progressInterval = setInterval(pollImportProgress, 1000);

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    headers["Content-Type"] = "application/json";
    try {
      const response = await fetch(apiConfig.buildUrl(`/api/gl-staging/${clientId}/import`), {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          accountMappings,
          createMissingAccounts,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const importResult = await response.json();

      if (importResult.successful !== undefined) {
        toast({
          title: "Import Successful",
          description:
            importResult.message ||
            `Successfully imported ${importResult.successful} journal entries`,
        });
        onImportComplete();
        // Reset state after successful import
        setAnalysisResult(null);
        setSessionId(null);
        setCurrentStage("upload");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description:
          "Could not import the General Ledger data. Please try again.",
        variant: "destructive",
      });
      // Don't reset stage on error - allow retry
      setIsImporting(false);
      setImportProgress(null);
    } finally {
      // Don't reset other state here
    }
  };

  const matchedAccounts = analysisResult
    ? Object.values(analysisResult.accountMatches || {}).filter(
        (m: any) => m.matched
      ).length
    : 0;
  const unmatchedAccounts = analysisResult
    ? Object.values(analysisResult.accountMatches || {}).filter(
        (m: any) => !m.matched
      ).length
    : 0;

  // Show importing interface when in importing stage
  if (currentStage === "importing" && analysisResult) {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Step 3: Importing Data
            </CardTitle>
            <CardDescription className="text-blue-700">
              Importing {analysisResult.totalTransactions} transactions into
              your books
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>File Analyzed</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Accounts Mapped</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Importing Data</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Import in Progress</CardTitle>
            <CardDescription>
              Processing your journal entries and creating transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {importProgress ? (
              <div className="space-y-4">
                {/* Current Entry Status */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-blue-900">
                      Processing Entry {importProgress.processedCount} of{" "}
                      {importProgress.totalTransactions}
                    </div>
                    <div className="text-sm font-bold text-blue-900">
                      {importProgress.progressPercent}%
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 mb-2">
                    {importProgress.currentEntry}
                  </div>
                  <Progress
                    value={importProgress.progressPercent || 0}
                    className="w-full h-3"
                  />
                  {importProgress.estimatedTimeRemaining && (
                    <div className="text-xs text-blue-600 mt-2">
                      Estimated time remaining:{" "}
                      {importProgress.estimatedTimeRemaining}
                    </div>
                  )}
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importProgress.processedCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Processed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {importProgress.importedCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Imported
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-500">
                      {importProgress.skippedCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {importProgress.totalTransactions}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                {/* Large Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Overall Progress</span>
                    <span className="font-bold">
                      {importProgress.progressPercent}% Complete
                    </span>
                  </div>
                  <Progress
                    value={importProgress.progressPercent || 0}
                    className="w-full h-6"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  {isImporting
                    ? "Starting import..."
                    : "Preparing to import..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentStage("upload");
              setAnalysisResult(null);
              setSessionId(null);
              setIsImporting(false);
            }}
            disabled={isImporting}
          >
            Cancel Import
          </Button>
        </div>
      </div>
    );
  }

  // Show mapping interface if in mapping stage
  if (currentStage === "mapping" && analysisResult && sessionId) {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-xl text-orange-800 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Step 2: Account Mapping Required
            </CardTitle>
            <CardDescription className="text-orange-700">
              Map accounts to ensure accurate import of your{" "}
              {analysisResult.totalTransactions} transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>File Analyzed</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Mapping Accounts</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                <span className="text-gray-500">Import Data</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <AccountMappingInterface
          clientId={clientId}
          sessionId={sessionId}
          extractedData={analysisResult.extractedData || []}
          onMappingComplete={handleMappingComplete}
          onCancel={() => {
            setCurrentStage("upload");
            setAnalysisResult(null);
            setSessionId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="general-ledger-import">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered General Ledger Import
          </CardTitle>
          <CardDescription>
            Upload your General Ledger file and let AI intelligently parse
            accounts and transactions. Supports SAGE, QuickBooks, and other
            accounting software formats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="gl-file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileSpreadsheet className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> your
                  General Ledger file
                </p>
                <p className="text-xs text-gray-500">
                  Excel (.xlsx, .xls) or CSV files
                </p>
              </div>
              <Input
                id="gl-file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isAnalyzing}
              />
            </label>
          </div>

          {isAnalyzing && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4 animate-pulse" />
                AI is analyzing your General Ledger format...
              </div>
              <Progress value={analysisProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results - PROMINENT DISPLAY */}
      {analysisResult && (
        <div className="space-y-4">
          {/* PROMINENT SCAN RESULTS BANNER */}
          <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />✅ File
                Successfully Scanned & Parsed
              </CardTitle>
              <CardDescription className="text-lg font-medium text-green-700">
                {analysisResult.detectedFormat === "JOURNAL_ENTRY_PARSER"
                  ? "📑 Journal Entry Format Detected"
                  : "📊 General Ledger Format Detected"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="text-sm text-gray-600 font-semibold uppercase">
                    Journal Entries
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {analysisResult.journalEntries?.length ||
                      analysisResult.summary?.journalEntriesCount ||
                      analysisResult.summary?.journalEntries ||
                      analysisResult.accountSections.length ||
                      0}
                  </div>
                  <div className="text-xs text-gray-500">
                    {analysisResult.detectedFormat === "JOURNAL_ENTRY_PARSER"
                      ? "Grouped Entries"
                      : "GL Accounts"}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border border-purple-200">
                  <div className="text-sm text-gray-600 font-semibold uppercase">
                    Total Lines
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {analysisResult.summary?.totalLines ||
                      analysisResult.totalTransactions ||
                      0}
                  </div>
                  <div className="text-xs text-gray-500">Line Items</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border border-green-200">
                  <div className="text-sm text-gray-600 font-semibold uppercase">
                    Total Debits
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    $
                    {typeof analysisResult.totalDebits === "number"
                      ? analysisResult.totalDebits.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : analysisResult.totalDebits}
                  </div>
                  <div className="text-xs text-green-500">Debit Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200">
                  <div className="text-sm text-gray-600 font-semibold uppercase">
                    Total Credits
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    $
                    {typeof analysisResult.totalCredits === "number"
                      ? analysisResult.totalCredits.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : analysisResult.totalCredits}
                  </div>
                  <div className="text-xs text-blue-500">Credit Total</div>
                </div>
              </div>
              {analysisResult.extractedTransactions &&
                analysisResult.extractedTransactions.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
                    <div className="text-lg text-blue-800 font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      🚀 {analysisResult.extractedTransactions.length}{" "}
                      Transactions Extracted
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      All transactions have been successfully parsed and are
                      ready for staging/import
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Format Detected
                    </p>
                    <p className="text-2xl font-bold">
                      {analysisResult.detectedFormat}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Transactions
                    </p>
                    <p className="text-2xl font-bold">
                      {analysisResult.totalTransactions}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Accounts Found
                    </p>
                    <p className="text-2xl font-bold">
                      {analysisResult.accountSections.length}
                    </p>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Balance Status
                    </p>
                    <p className="text-lg font-bold">
                      {analysisResult.isBalanced ? "Balanced" : "Unbalanced"}
                    </p>
                  </div>
                  {analysisResult.isBalanced ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Validation */}
          {!analysisResult.isBalanced && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Total debits ($
                {typeof analysisResult.totalDebits === "number"
                  ? analysisResult.totalDebits.toFixed(2)
                  : analysisResult.totalDebits}
                ) do not equal total credits ($
                {typeof analysisResult.totalCredits === "number"
                  ? analysisResult.totalCredits.toFixed(2)
                  : analysisResult.totalCredits}
                ). Difference: $
                {typeof analysisResult.totalDebits === "number" &&
                typeof analysisResult.totalCredits === "number"
                  ? Math.abs(
                      analysisResult.totalDebits - analysisResult.totalCredits
                    ).toFixed(2)
                  : "N/A"}
              </AlertDescription>
            </Alert>
          )}

          {/* Account Matching Table */}
          <Card>
            <CardHeader>
              <CardTitle>Account Matching Results</CardTitle>
              <CardDescription>
                {matchedAccounts} accounts matched, {unmatchedAccounts} need
                attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(analysisResult.accountMatches).map(
                    ([accountNumber, match]) => (
                      <TableRow key={accountNumber}>
                        <TableCell className="font-mono">
                          {accountNumber}
                        </TableCell>
                        <TableCell>{match.accountName}</TableCell>
                        <TableCell>{match.transactionCount}</TableCell>
                        <TableCell>
                          {match.matched ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Matched
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not Found
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!match.matched && (
                            <span className="text-sm text-muted-foreground">
                              Will create new account
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Import Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Import Actions</CardTitle>
              <CardDescription>
                {unmatchedAccounts > 0
                  ? `${unmatchedAccounts} accounts need mapping before import`
                  : "All accounts matched - ready to import"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unmatchedAccounts > 0 ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Some accounts could not be automatically matched. You can
                      map them manually or create new accounts.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentStage("mapping")}
                      className="bg-orange-600 hover:bg-orange-700"
                      data-testid="proceed-to-mapping-button"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Map Accounts ({unmatchedAccounts} need attention)
                    </Button>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-missing"
                        checked={createMissingAccounts}
                        onCheckedChange={(checked) =>
                          setCreateMissingAccounts(checked as boolean)
                        }
                      />
                      <label htmlFor="create-missing" className="text-sm">
                        Auto-create missing accounts
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-missing"
                    checked={createMissingAccounts}
                    onCheckedChange={(checked) =>
                      setCreateMissingAccounts(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="create-missing"
                    className="text-sm font-medium"
                  >
                    Create any additional missing accounts during import
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journal Entry Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Journal Entry Preview</CardTitle>
              <CardDescription>
                {analysisResult.journalEntries &&
                analysisResult.journalEntries.length > 0
                  ? `First 5 journal entries from the import (${analysisResult.journalEntries.length} total entries)`
                  : `First 10 transactions from the import (${
                      analysisResult.extractedData?.length || 0
                    } total transactions)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Display grouped journal entries if available */}
              {analysisResult.journalEntries &&
              analysisResult.journalEntries.length > 0 ? (
                <div className="space-y-6">
                  {analysisResult.journalEntries
                    ?.slice(0, 5)
                    .map((journalEntry, entryIndex) => (
                      <div
                        key={entryIndex}
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        {/* Journal Entry Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className="font-mono text-sm px-3 py-1"
                            >
                              {journalEntry.reference ||
                                journalEntry.journalReference ||
                                `JE-${entryIndex + 1}`}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {journalEntry.date ||
                                journalEntry.transactionDate ||
                                new Date().toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-600">
                            {journalEntry.entries?.length ||
                              journalEntry.lines?.length ||
                              0}{" "}
                            lines
                          </div>
                        </div>

                        {/* Journal Entry Description */}
                        {(journalEntry.description || journalEntry.memo) && (
                          <div className="mb-3 text-sm text-gray-700 italic">
                            {journalEntry.description || journalEntry.memo}
                          </div>
                        )}

                        {/* Journal Entry Lines */}
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white">
                              <TableHead className="text-xs">Account</TableHead>
                              <TableHead className="text-xs">
                                Account Name
                              </TableHead>
                              <TableHead className="text-xs">
                                Description
                              </TableHead>
                              <TableHead className="text-xs text-right">
                                Debit
                              </TableHead>
                              <TableHead className="text-xs text-right">
                                Credit
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(
                              journalEntry.entries ||
                              journalEntry.lines ||
                              []
                            ).map((line, lineIndex) => (
                              <TableRow
                                key={lineIndex}
                                className="hover:bg-white"
                              >
                                <TableCell className="font-mono text-sm py-2">
                                  {line.accountNumber || line.account}
                                </TableCell>
                                <TableCell className="text-sm py-2">
                                  {line.accountName ||
                                    line.accountDescription ||
                                    "-"}
                                </TableCell>
                                <TableCell className="text-sm py-2">
                                  {line.description ||
                                    line.memo ||
                                    line.lineDescription ||
                                    "-"}
                                </TableCell>
                                <TableCell className="text-sm py-2 text-right font-medium">
                                  {(line.debit || 0) > 0 ? (
                                    <span className="text-green-700">
                                      $
                                      {typeof line.debit === "number"
                                        ? line.debit.toFixed(2)
                                        : line.debit}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm py-2 text-right font-medium">
                                  {(line.credit || 0) > 0 ? (
                                    <span className="text-blue-700">
                                      $
                                      {typeof line.credit === "number"
                                        ? line.credit.toFixed(2)
                                        : line.credit}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Journal Entry Totals */}
                        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-sm font-medium">
                          <span>Entry Total:</span>
                          <div className="flex gap-4">
                            <span className="text-green-700">
                              Debit: $
                              {typeof journalEntry.totalDebit === "number"
                                ? journalEntry.totalDebit.toFixed(2)
                                : (
                                    journalEntry.entries ||
                                    journalEntry.lines ||
                                    []
                                  )
                                    .reduce(
                                      (sum, line) => sum + (line.debit || 0),
                                      0
                                    )
                                    .toFixed(2)}
                            </span>
                            <span className="text-blue-700">
                              Credit: $
                              {typeof journalEntry.totalCredit === "number"
                                ? journalEntry.totalCredit.toFixed(2)
                                : (
                                    journalEntry.entries ||
                                    journalEntry.lines ||
                                    []
                                  )
                                    .reduce(
                                      (sum, line) => sum + (line.credit || 0),
                                      0
                                    )
                                    .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  {analysisResult.journalEntries &&
                    analysisResult.journalEntries.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground mt-4">
                        Showing first 5 of{" "}
                        {analysisResult.journalEntries.length} journal entries
                      </div>
                    )}
                </div>
              ) : (
                // Fallback to individual transactions if journal entries are not grouped
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.extractedData
                        ?.slice(0, 10)
                        .map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">
                              {transaction.accountNumber}
                            </TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              {transaction.debit > 0
                                ? `$${
                                    typeof transaction.debit === "number"
                                      ? transaction.debit.toFixed(2)
                                      : transaction.debit
                                  }`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {transaction.credit > 0
                                ? `$${
                                    typeof transaction.credit === "number"
                                      ? transaction.credit.toFixed(2)
                                      : transaction.credit
                                  }`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {analysisResult.extractedData &&
                    analysisResult.extractedData.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        Showing first 10 of{" "}
                        {analysisResult.extractedData.length} transactions
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PERSISTENT Import Progress Bar - Stays Visible */}
          {importProgress && importProgress.isActive && (
            <Card className="mb-4 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <TrendingUp className="h-6 w-6 animate-pulse text-blue-500" />
                  Enterprise Import Running - Background Processing
                </CardTitle>
                <div className="text-sm text-blue-600 font-medium">
                  Import continues even when you navigate to other pages
                  {importProgress.startTime && (
                    <span className="ml-2">
                      • Started:{" "}
                      {new Date(importProgress.startTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-blue-700">
                      Batch {importProgress.currentBatch} of{" "}
                      {importProgress.totalBatches}
                    </span>
                    <span className="text-blue-700">
                      {Math.round((importProgress.progressPercent || 0) * 10) /
                        10}
                      % Complete
                    </span>
                  </div>
                  <Progress
                    value={importProgress.progressPercent || 0}
                    className="w-full h-4 bg-blue-100"
                  />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-green-700 font-medium">
                      ✅ Imported:{" "}
                      <span className="text-lg font-bold">
                        {importProgress.importedCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-blue-700 font-medium">
                      📊 Total:{" "}
                      <span className="text-lg font-bold">
                        {importProgress.totalTransactions.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-purple-700 font-medium">
                      ⏱️ Remaining:{" "}
                      <span className="text-lg font-bold">
                        {(
                          importProgress.totalTransactions -
                          importProgress.importedCount
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-green-100 border border-green-300 rounded p-3 mt-3">
                    <div className="text-green-800 text-sm font-medium">
                      🛡️ <strong>Data Safety:</strong>{" "}
                      {importProgress.importedCount.toLocaleString()} entries
                      already saved permanently to database
                    </div>
                    <div className="text-green-700 text-xs mt-1">
                      • Navigate freely - import runs in background • Original
                      dates preserved • Duplicate protection enabled
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <div className="flex justify-end">
            {unmatchedAccounts === 0 ? (
              <Button
                onClick={() => handleImport()}
                disabled={
                  isImporting ||
                  importProgress?.isActive ||
                  (!analysisResult.isBalanced && !createMissingAccounts)
                }
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                data-testid="start-import-button"
              >
                {isImporting || importProgress?.isActive ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {importProgress?.isActive
                      ? "Importing..."
                      : "Processing Import..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {analysisResult.totalTransactions} Transactions
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStage("mapping")}
                className="bg-orange-600 hover:bg-orange-700"
                size="lg"
                data-testid="proceed-to-mapping-button-bottom"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Proceed to Account Mapping ({unmatchedAccounts} accounts)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneralLedgerImport;
