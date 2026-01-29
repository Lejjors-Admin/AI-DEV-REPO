import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ComplianceStatusType = 'compliant' | 'issues_found' | 'critical_issues_found' | 'not_checked';

type ComplianceStatusProps = {
  auditFileId: number;
  complianceStatus: ComplianceStatusType;
  onlyIcon?: boolean;
};

export function ComplianceStatus({ auditFileId, complianceStatus, onlyIcon = false }: ComplianceStatusProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: complianceDetails, isLoading, refetch } = useQuery({
    queryKey: ['/api/audit-files', auditFileId, 'compliance'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/audit-files/detail/${auditFileId}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching audit file details:', error);
        return null;
      }
    },
    enabled: isDialogOpen,
  });

  const runComplianceCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/audit-files/${auditFileId}/compliance-check`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Compliance Check Complete",
        description: "The compliance check has been completed",
      });
      refetch();
      queryClient.invalidateQueries({
        queryKey: ['/api/audit-files']
      });
    },
    onError: (error) => {
      toast({
        title: "Compliance Check Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateIssueStatusMutation = useMutation({
    mutationFn: async ({ issueId, status, notes }: { issueId: string, status: string, notes?: string }) => {
      const res = await apiRequest('PATCH', `/api/audit-files/${auditFileId}/compliance-issue/${issueId}`, {
        status,
        notes
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue Status Updated",
        description: "The issue status has been updated",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleRunComplianceCheck = () => {
    runComplianceCheckMutation.mutate();
  };

  const handleUpdateIssue = (issueId: string, status: string) => {
    updateIssueStatusMutation.mutate({ issueId, status });
  };

  const getComplianceIcon = () => {
    switch (complianceStatus) {
      case 'compliant':
        return <ShieldCheck className="h-5 w-5 text-status-success" />;
      case 'issues_found':
        return <ShieldAlert className="h-5 w-5 text-status-warning" />;
      case 'critical_issues_found':
        return <AlertCircle className="h-5 w-5 text-status-error" />;
      case 'not_checked':
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getComplianceLabel = () => {
    switch (complianceStatus) {
      case 'compliant':
        return 'Compliant';
      case 'issues_found':
        return 'Issues Found';
      case 'critical_issues_found':
        return 'Critical Issues';
      case 'not_checked':
      default:
        return 'Not Checked';
    }
  };

  const getComplianceBadgeVariant = () => {
    switch (complianceStatus) {
      case 'compliant':
        return 'success';
      case 'issues_found':
        return 'warning';
      case 'critical_issues_found':
        return 'destructive';
      case 'not_checked':
      default:
        return 'outline';
    }
  };

  if (onlyIcon) {
    return getComplianceIcon();
  }

  return (
    <>
      <div 
        className="flex items-center gap-1 cursor-pointer" 
        onClick={() => setIsDialogOpen(true)}
      >
        {getComplianceIcon()}
        <Badge variant={getComplianceBadgeVariant() as any}>
          {getComplianceLabel()}
        </Badge>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getComplianceIcon()}
              Compliance Status: {getComplianceLabel()}
            </DialogTitle>
            <DialogDescription>
              Compliance check results for Canadian GAAP standards
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <Tabs defaultValue="summary">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                  <TabsTrigger value="issues" className="flex-1">Issues</TabsTrigger>
                  <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4">
                  <div className="pt-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Compliance Score</h3>
                      <div className="flex items-center gap-4">
                        <Progress 
                          value={complianceDetails?.rulesPassed && complianceDetails?.rulesFailed ? 
                            (complianceDetails.rulesPassed / (complianceDetails.rulesPassed + complianceDetails.rulesFailed)) * 100 : 0} 
                          className="h-3" 
                        />
                        <span className="text-sm">
                          {complianceDetails?.rulesPassed} / {(complianceDetails?.rulesPassed || 0) + (complianceDetails?.rulesFailed || 0)} Rules Passed
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Last Check</h3>
                      <p className="text-sm text-muted-foreground">
                        {complianceDetails?.timestamp ? 
                          new Date(complianceDetails.timestamp).toLocaleString() : 
                          'Never checked'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="issues">
                  <div className="pt-4">
                    <h3 className="text-lg font-medium mb-2">Compliance Issues</h3>
                    
                    {complianceDetails?.issues && complianceDetails.issues.length > 0 ? (
                      <div className="space-y-4">
                        {complianceDetails.issues.map((issue: any) => (
                          <div key={issue.id} className="border rounded-md p-4">
                            <div className="flex justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'warning' : 'default'}>
                                  {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                                </Badge>
                                <span className="text-sm font-mono">{issue.ruleId}</span>
                              </div>
                              <Badge variant={issue.status === 'open' ? 'outline' : 'success'}>
                                {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="mt-2 font-medium">{issue.message}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{issue.recommendedAction}</p>
                            
                            {issue.status === 'open' && (
                              <div className="mt-3 flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUpdateIssue(issue.id, 'waived')}
                                >
                                  Waive Issue
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleUpdateIssue(issue.id, 'addressed')}
                                >
                                  Mark Addressed
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No compliance issues found or compliance check not yet run.</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="categories">
                  <div className="pt-4">
                    <h3 className="text-lg font-medium mb-2">Compliance by Category</h3>
                    
                    {complianceDetails?.checksByCategory ? (
                      <div className="space-y-4">
                        {Object.entries(complianceDetails.checksByCategory).map(([category, data]: [string, any]) => (
                          <div key={category} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="capitalize">{category}</h4>
                              <span className="text-sm">
                                {data.passed} / {data.total} Passed
                              </span>
                            </div>
                            <Progress 
                              value={(data.passed / data.total) * 100} 
                              className="h-2" 
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No category data available or compliance check not yet run.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Close
            </Button>
            <Button 
              onClick={handleRunComplianceCheck}
              disabled={runComplianceCheckMutation.isPending}
            >
              {runComplianceCheckMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Running...
                </>
              ) : (
                'Run Compliance Check'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}