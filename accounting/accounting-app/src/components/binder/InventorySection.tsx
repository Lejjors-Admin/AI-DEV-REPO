import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Package, Calculator, FileText, Download, MessageSquare, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { apiConfig } from "@/lib/api-config";

interface InventoryAccount {
  accountId: number;
  accountName: string;
  currentBalance: number;
  priorBalance: number;
  variance: number;
  variancePercentage: number;
}

interface InventoryProcedure {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  assignedTo?: string;
  estimatedHours: number;
  actualHours: number;
  completedAt?: string;
}

interface WorkingPaper {
  id: string;
  name: string;
  type: 'excel' | 'word' | 'pdf';
  status: 'not_started' | 'in_progress' | 'completed';
  filePath?: string;
  preparedBy?: string;
  reviewedBy?: string;
  completedAt?: string;
}

interface TarsAnalysis {
  id: string;
  analysisType: 'inventory_rollforward' | 'obsolescence_review' | 'cutoff_testing' | 'costing_verification';
  prompt: string;
  response?: string;
  status: 'pending' | 'completed' | 'error';
  createdAt: string;
}

interface InventorySectionProps {
  binderId: number;
  clientId: number;
  sectionId: string;
}

export function InventorySection({ binderId, clientId, sectionId }: InventorySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [tarsPrompt, setTarsPrompt] = useState('');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<TarsAnalysis['analysisType']>('inventory_rollforward');

  // Fetch inventory data from trial balance
  const { data: inventoryData = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['binder-inventory-data', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/binder/inventory-data/${clientId}`));
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      return response.json();
    }
  });

  // Fetch audit procedures
  const { data: procedures = [], isLoading: loadingProcedures } = useQuery({
    queryKey: ['inventory-procedures', sectionId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/binder/sections/${sectionId}/procedures`));
      if (!response.ok) throw new Error('Failed to fetch procedures');
      return response.json();
    }
  });

  // Fetch working papers
  const { data: workingPapers = [], isLoading: loadingPapers } = useQuery({
    queryKey: ['inventory-working-papers', sectionId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/binder/sections/${sectionId}/working-papers`));
      if (!response.ok) throw new Error('Failed to fetch working papers');
      return response.json();
    }
  });

  // Fetch TARS analyses
  const { data: tarsAnalyses = [], isLoading: loadingAnalyses } = useQuery({
    queryKey: ['inventory-tars-analyses', sectionId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/binder/sections/${sectionId}/tars-analyses`));
      if (!response.ok) throw new Error('Failed to fetch TARS analyses');
      return response.json();
    }
  });

  // Update procedure status
  const updateProcedureMutation = useMutation({
    mutationFn: async ({ procedureId, status }: { procedureId: string; status: string }) => {
      return apiRequest('PUT', `/api/binder/procedures/${procedureId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-procedures'] });
      toast({ title: 'Procedure updated successfully' });
    }
  });

  // Generate working paper
  const generatePaperMutation = useMutation({
    mutationFn: async ({ paperId, type }: { paperId: string; type: string }) => {
      return apiRequest('POST', `/api/binder/working-papers/${paperId}/generate`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-working-papers'] });
      toast({ title: 'Working paper generated successfully' });
    }
  });

  // Submit TARS analysis
  const submitTarsMutation = useMutation({
    mutationFn: async (analysisData: { analysisType: string; prompt: string }) => {
      return apiRequest('POST', `/api/binder/sections/${sectionId}/tars-analysis`, analysisData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-tars-analyses'] });
      setTarsPrompt('');
      toast({ title: 'TARS analysis submitted successfully' });
    }
  });

  const totalInventoryValue = Array.isArray(inventoryData) ? inventoryData.reduce((sum: number, item: InventoryAccount) => sum + item.currentBalance, 0) : 0;
  const totalVariance = Array.isArray(inventoryData) ? inventoryData.reduce((sum: number, item: InventoryAccount) => sum + item.variance, 0) : 0;

  const completedProcedures = procedures.filter((p: InventoryProcedure) => p.status === 'completed').length;
  const completedPapers = workingPapers.filter((p: WorkingPaper) => p.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Section D - Inventory
          </h2>
          <p className="text-gray-600 mt-1">
            Raw materials, work-in-progress, and finished goods inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={completedProcedures === procedures.length ? 'default' : 'secondary'}>
            {completedProcedures}/{procedures.length} Procedures
          </Badge>
          <Badge variant={completedPapers === workingPapers.length ? 'default' : 'secondary'}>
            {completedPapers}/{workingPapers.length} Papers
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="working-papers">Working Papers</TabsTrigger>
          <TabsTrigger value="tars-analysis">TARS Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalVariance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Inventory Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {procedures.length > 0 ? Math.round((completedProcedures / procedures.length) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Account Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInventory ? (
                <div className="text-center py-4">Loading inventory data...</div>
              ) : inventoryData.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No inventory accounts found</div>
              ) : (
                <div className="space-y-2">
                  {inventoryData.map((account: InventoryAccount) => (
                    <div key={account.accountId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{account.accountName}</div>
                        <div className="text-sm text-gray-500">Account ID: {account.accountId}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${account.currentBalance.toLocaleString()}</div>
                        <div className={`text-sm ${account.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {account.variance >= 0 ? '+' : ''}${account.variance.toLocaleString()} 
                          ({account.variancePercentage >= 0 ? '+' : ''}{account.variancePercentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Procedures</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProcedures ? (
                <div className="text-center py-4">Loading procedures...</div>
              ) : (
                <div className="space-y-4">
                  {procedures.map((procedure: InventoryProcedure) => (
                    <div key={procedure.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{procedure.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            procedure.status === 'completed' ? 'default' :
                            procedure.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {procedure.status.replace('_', ' ')}
                          </Badge>
                          <Select
                            value={procedure.status}
                            onValueChange={(status) => 
                              updateProcedureMutation.mutate({ procedureId: procedure.id, status })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{procedure.description}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Estimated: {procedure.estimatedHours}h</span>
                        <span>Actual: {procedure.actualHours}h</span>
                        {procedure.completedAt && (
                          <span>Completed: {new Date(procedure.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="working-papers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Working Papers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPapers ? (
                <div className="text-center py-4">Loading working papers...</div>
              ) : (
                <div className="space-y-4">
                  {workingPapers.map((paper: WorkingPaper) => (
                    <div key={paper.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <h4 className="font-medium">{paper.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={paper.status === 'completed' ? 'default' : 'outline'}>
                            {paper.status.replace('_', ' ')}
                          </Badge>
                          {paper.status === 'not_started' && (
                            <Button
                              size="sm"
                              onClick={() => generatePaperMutation.mutate({ paperId: paper.id, type: paper.type })}
                              disabled={generatePaperMutation.isPending}
                            >
                              Generate
                            </Button>
                          )}
                          {paper.filePath && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Type: {paper.type.toUpperCase()}
                        {paper.preparedBy && ` • Prepared by: ${paper.preparedBy}`}
                        {paper.completedAt && ` • Completed: ${new Date(paper.completedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tars-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>TARS AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Select value={selectedAnalysisType} onValueChange={(value: any) => setSelectedAnalysisType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory_rollforward">Inventory Roll-forward Analysis</SelectItem>
                    <SelectItem value="obsolescence_review">Obsolescence & Write-down Review</SelectItem>
                    <SelectItem value="cutoff_testing">Cut-off Testing Analysis</SelectItem>
                    <SelectItem value="costing_verification">Costing Method Verification</SelectItem>
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Enter your analysis request for TARS..."
                  value={tarsPrompt}
                  onChange={(e) => setTarsPrompt(e.target.value)}
                  rows={3}
                />
                
                <Button
                  onClick={() => submitTarsMutation.mutate({ 
                    analysisType: selectedAnalysisType, 
                    prompt: tarsPrompt 
                  })}
                  disabled={submitTarsMutation.isPending || !tarsPrompt.trim()}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit to TARS
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Previous Analyses</h4>
                {loadingAnalyses ? (
                  <div className="text-center py-4">Loading analyses...</div>
                ) : tarsAnalyses.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No analyses yet</div>
                ) : (
                  tarsAnalyses.map((analysis: TarsAnalysis) => (
                    <div key={analysis.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{analysis.analysisType.replace('_', ' ')}</Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            analysis.status === 'completed' ? 'default' :
                            analysis.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {analysis.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(analysis.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm mb-2">
                        <strong>Prompt:</strong> {analysis.prompt}
                      </div>
                      {analysis.response && (
                        <div className="text-sm p-3 bg-gray-50 rounded">
                          <strong>TARS Response:</strong>
                          <div className="mt-1 whitespace-pre-wrap">{analysis.response}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}