import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, Plus, Download, Eye, Clock, Percent, ShieldAlert, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAuditFile, exportAuditFile } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ComplianceStatus } from "@/components/audit/ComplianceStatus";

export default function AuditFiles() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  const { data: auditFiles, isLoading: isLoadingAuditFiles } = useQuery({
    queryKey: [`/api/audit-files/${selectedClient}`],
    enabled: !!selectedClient,
  });
  
  // Mutation for running compliance checks
  const complianceCheckMutation = useMutation({
    mutationFn: async (auditFileId: number) => {
      const response = await apiRequest('POST', `/api/audit-files/${auditFileId}/compliance-check`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audit-files/${selectedClient}`] });
      toast({
        title: "Compliance Check Completed",
        description: "The audit file has been checked for compliance with GAAP standards.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Compliance Check Failed",
        description: error.message || "Failed to run compliance check. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateAuditFile = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to generate an audit file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating audit file",
        description: "Please wait while we generate the audit file with initial compliance check...",
      });
      
      await generateAuditFile(parseInt(selectedClient));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/audit-files/${selectedClient}`] });
      
      toast({
        title: "Audit file generated",
        description: "The audit file has been successfully generated with initial compliance verification. You can run additional compliance checks at any time.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate audit file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleExportAuditFile = async (auditFile: any) => {
    try {
      await exportAuditFile(auditFile);
      
      toast({
        title: "Export successful",
        description: "The audit file has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export audit file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-status-success/10 text-status-success";
      case "pending":
        return "bg-status-warning/10 text-status-warning";
      case "error":
        return "bg-status-error/10 text-status-error";
      default:
        return "bg-neutral-300 text-neutral-700";
    }
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Audit Files</h1>
          <Button 
            onClick={handleGenerateAuditFile} 
            disabled={!selectedClient || isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate Audit File
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Client Selection */}
      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="w-full sm:w-72">
              <label htmlFor="client-select" className="block text-sm font-medium text-neutral-700 mb-1">
                Select Client
              </label>
              {isLoadingClients ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Audit Files Content */}
      {!selectedClient ? (
        <div className="py-6 px-4 sm:px-6 lg:px-8 text-center text-neutral-500">
          Please select a client to view audit files
        </div>
      ) : isLoadingAuditFiles ? (
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="ml-3">
                      <Skeleton className="h-5 w-[180px] mb-1" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-5 w-[90px] rounded-full" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Skeleton className="h-9 w-[100px] rounded mr-2" />
                    <Skeleton className="h-9 w-[100px] rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : auditFiles?.length === 0 ? (
        <div className="py-6 px-4 sm:px-6 lg:px-8 text-center">
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-neutral-400" />
              <p className="text-lg mb-4">No audit files found for this client</p>
              <Button 
                onClick={handleGenerateAuditFile}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Your First Audit File...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Your First Audit File
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auditFiles?.map((auditFile) => (
              <Card key={auditFile.id} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-base font-medium text-neutral-900">{auditFile.fileName}</h3>
                      <p className="text-sm text-neutral-500">
                        {format(new Date(auditFile.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-neutral-500">Status:</span>
                      <Badge variant="outline" className={getStatusBadgeClass(auditFile.status)}>
                        {auditFile.status.charAt(0).toUpperCase() + auditFile.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-neutral-500">Update needed:</span>
                      <span className="text-sm flex items-center">
                        {auditFile.needsUpdate ? (
                          <>
                            <Clock className="h-4 w-4 text-status-warning mr-1" />
                            Yes
                          </>
                        ) : (
                          "No"
                        )}
                      </span>
                    </div>
                    {auditFile.completionPercentage !== undefined && (
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-neutral-500">Completion:</span>
                        <span className="text-sm flex items-center">
                          <Percent className="h-4 w-4 mr-1" />
                          {auditFile.completionPercentage}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500">Compliance:</span>
                      <span className="text-sm">
                        <ComplianceStatus 
                          auditFileId={auditFile.id} 
                          complianceStatus={auditFile.complianceStatus || 'not_checked'} 
                          onlyIcon={true} 
                        />
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <div className="flex items-center">
                      <ComplianceStatus 
                        auditFileId={auditFile.id} 
                        complianceStatus={auditFile.complianceStatus || 'not_checked'}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 ml-2"
                        onClick={() => complianceCheckMutation.mutate(auditFile.id)}
                        disabled={complianceCheckMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${complianceCheckMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleExportAuditFile(auditFile)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
