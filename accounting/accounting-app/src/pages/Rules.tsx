import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { 
  Plus, Edit, Trash2, Settings, Sparkles, 
  Target, TrendingUp, Brain, CheckCircle,
  AlertCircle, BarChart3, Zap, Filter,
  ArrowRight, FileText, Clock, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiConfig } from "@/lib/api-config";

interface TransactionRule {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  vendorPattern?: string;
  descriptionPattern?: string;
  amountMin?: string;
  amountMax?: string;
  accountId: number;
  taxCode?: string;
  priority: number;
  confidence: string;
  isActive: boolean;
  isSystemGenerated: boolean;
  matchCount: number;
  lastMatched?: string;
  createdAt: string;
}

interface RuleRecommendation {
  name: string;
  description: string;
  vendorPattern?: string;
  descriptionPattern?: string;
  amountMin?: string;
  amountMax?: string;
  suggestedAccount: string;
  suggestedAccountId?: number;
  taxCode?: string;
  confidence: number;
  reasoning: string;
}

export default function Rules() {
  const { clientId } = useParams();
  const { toast } = useToast();
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    vendorPattern: '',
    descriptionPattern: '',
    amountMin: '',
    amountMax: '',
    accountId: '',
    taxCode: 'HST',
    priority: '0',
    isActive: true
  });

  const currentClientId = parseInt(clientId || '2');

  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Fetch rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/rules', currentClientId],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/rules?clientId=${currentClientId}`), {
      headers
    }).then(res => res.json()),
  });

  // Fetch accounts for rule creation
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts', currentClientId],
    queryFn: () => fetch(apiConfig.buildUrl(`/api/accounts?clientId=${currentClientId}`), {
      headers
    }).then(res => res.json()),
  });

  // Fetch AI recommendations
  const { data: recommendationsData, mutate: getRecommendations, isPending: recommendationsLoading } = useMutation({
    mutationFn: () => fetch(apiConfig.buildUrl('/api/rules/recommend'), {
      method: 'POST',
      body: JSON.stringify({ clientId: currentClientId }),
      headers
    }).then(res => res.json())
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (ruleData: any) => fetch(apiConfig.buildUrl('/api/rules'), {
      method: 'POST',
      body: JSON.stringify({ ...ruleData, clientId: currentClientId }),
      headers,
      credentials: 'include'
    }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Rule created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    }
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, ...ruleData }: any) => fetch(apiConfig.buildUrl(`/api/rules/rules/${id}`), {
      method: 'PUT',
      body: JSON.stringify(ruleData),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Rule updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    }
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: number) => fetch(apiConfig.buildUrl(`/api/rules/rules/${ruleId}`), {
      method: 'DELETE',
      headers
    }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Rule deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
    },
    onError: () => {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  });

  // Apply rules mutation
  const applyRulesMutation = useMutation({
    mutationFn: () => fetch(apiConfig.buildUrl('/api/rules/apply'), {
      method: 'POST',
      body: JSON.stringify({ clientId: currentClientId }),
      headers
    }).then(res => res.json()),
    onSuccess: (data: any) => {
      toast({ 
        title: `Successfully applied ${data.appliedCount || 0} rule matches!`,
        description: "Rules have been applied to existing transactions."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
    },
    onError: () => {
      toast({ title: "Failed to apply rules", variant: "destructive" });
    }
  });

  const rules = rulesData?.rules || [];
  const accounts = accountsData?.accounts || [];
  const recommendations = recommendationsData?.recommendations || [];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      vendorPattern: '',
      descriptionPattern: '',
      amountMin: '',
      amountMax: '',
      accountId: '',
      taxCode: 'HST',
      priority: '0',
      isActive: true
    });
    setSelectedRule(null);
  };

  const openEditDialog = (rule: TransactionRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      vendorPattern: rule.vendorPattern || '',
      descriptionPattern: rule.descriptionPattern || '',
      amountMin: rule.amountMin || '',
      amountMax: rule.amountMax || '',
      accountId: rule.accountId.toString(),
      taxCode: rule.taxCode || 'HST',
      priority: rule.priority.toString(),
      isActive: rule.isActive
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const ruleData = {
      ...formData,
      accountId: parseInt(formData.accountId),
      priority: parseInt(formData.priority),
      amountMin: formData.amountMin || undefined,
      amountMax: formData.amountMax || undefined,
      vendorPattern: formData.vendorPattern || undefined,
      descriptionPattern: formData.descriptionPattern || undefined,
      taxCode: formData.taxCode || undefined
    };

    if (selectedRule) {
      updateRuleMutation.mutate({ id: selectedRule.id, ...ruleData });
    } else {
      createRuleMutation.mutate(ruleData);
    }
  };

  const createRuleFromRecommendation = (rec: RuleRecommendation) => {
    const accountId = rec.suggestedAccountId || accounts.find((acc: any) => 
      acc.name.toLowerCase().includes(rec.suggestedAccount.toLowerCase())
    )?.id;

    if (!accountId) {
      toast({ 
        title: "Cannot create rule", 
        description: "No matching account found for this recommendation",
        variant: "destructive" 
      });
      return;
    }

    const ruleData = {
      name: rec.name,
      description: rec.description,
      vendorPattern: rec.vendorPattern,
      descriptionPattern: rec.descriptionPattern,
      amountMin: rec.amountMin,
      amountMax: rec.amountMax,
      accountId,
      taxCode: rec.taxCode,
      priority: 0,
      confidence: rec.confidence.toString(),
      isActive: true,
      isSystemGenerated: true,
      clientId: currentClientId
    };

    createRuleMutation.mutate(ruleData);
  };

  if (rulesLoading || accountsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transaction Rules</h1>
          <p className="text-muted-foreground mt-2">
            Automate transaction categorization with intelligent rules
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              getRecommendations();
              setIsRecommendationsOpen(true);
            }}
            disabled={recommendationsLoading}
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Recommendations
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{rules.filter((r: any) => r.isActive).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Generated</p>
                <p className="text-2xl font-bold">{rules.filter((r: any) => r.isSystemGenerated).length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">{rules.reduce((sum: any, r: any) => sum + r.matchCount, 0)}</p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Rules Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          {/* Action Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Apply existing rules to categorize pending transactions
                </p>
                <Button 
                  onClick={() => applyRulesMutation.mutate()}
                  disabled={applyRulesMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {applyRulesMutation.isPending ? 'Applying...' : 'Apply Rules'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Rules</CardTitle>
              <CardDescription>
                Manage automatic categorization rules for transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Target Account</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule: any) => {
                    const targetAccount = accounts.find((acc: any) => acc.id === rule.accountId);
                    return (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rule.vendorPattern && (
                              <Badge variant="outline" className="text-xs">
                                Vendor: {rule.vendorPattern}
                              </Badge>
                            )}
                            {rule.descriptionPattern && (
                              <Badge variant="outline" className="text-xs">
                                Desc: {rule.descriptionPattern}
                              </Badge>
                            )}
                            {(rule.amountMin || rule.amountMax) && (
                              <Badge variant="outline" className="text-xs">
                                ${rule.amountMin || '0'} - ${rule.amountMax || '∞'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{targetAccount?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground capitalize">{targetAccount?.type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.matchCount}</span>
                            {rule.lastMatched && (
                              <span className="text-xs text-muted-foreground">
                                Last: {new Date(rule.lastMatched).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.priority > 0 ? "default" : "secondary"}>
                            {rule.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {rule.isSystemGenerated && (
                              <Badge variant="outline" className="text-purple-600">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(rule)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {rules.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No rules found</p>
                  <p className="text-muted-foreground mb-4">
                    Create your first rule or get AI recommendations
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Performance Analytics</CardTitle>
              <CardDescription>
                Analyze how well your rules are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Top Performing Rules</h3>
                  {rules
                    .sort((a: any, b: any) => b.matchCount - a.matchCount)
                    .slice(0, 5)
                    .map((rule: any) => (
                      <div key={rule.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {parseFloat(rule.confidence).toFixed(1)}%
                          </p>
                        </div>
                        <Badge variant="default">{rule.matchCount} matches</Badge>
                      </div>
                    ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Recently Created Rules</h3>
                  {rules
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((rule: any) => (
                      <div key={rule.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(rule.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={rule.isSystemGenerated ? "outline" : "default"}>
                          {rule.isSystemGenerated ? 'AI' : 'Manual'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? 'Edit Rule' : 'Create New Rule'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Office Supplies Rule"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountId">Target Account</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule does..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendorPattern">Vendor Pattern</Label>
              <Input
                id="vendorPattern"
                value={formData.vendorPattern}
                onChange={(e) => setFormData(prev => ({ ...prev, vendorPattern: e.target.value }))}
                placeholder="e.g., WALMART, OFFICE DEPOT"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descriptionPattern">Description Pattern</Label>
              <Input
                id="descriptionPattern"
                value={formData.descriptionPattern}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionPattern: e.target.value }))}
                placeholder="e.g., office supplies, stationery"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amountMin">Minimum Amount</Label>
              <Input
                id="amountMin"
                type="number"
                step="0.01"
                value={formData.amountMin}
                onChange={(e) => setFormData(prev => ({ ...prev, amountMin: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amountMax">Maximum Amount</Label>
              <Input
                id="amountMax"
                type="number"
                step="0.01"
                value={formData.amountMax}
                onChange={(e) => setFormData(prev => ({ ...prev, amountMax: e.target.value }))}
                placeholder="1000.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxCode">Tax Code</Label>
              <Select
                value={formData.taxCode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, taxCode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HST">HST (13%)</SelectItem>
                  <SelectItem value="GST">GST (5%)</SelectItem>
                  <SelectItem value="PST">PST (8%)</SelectItem>
                  <SelectItem value="EXEMPT">Tax Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.accountId}
            >
              {selectedRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Recommendations Dialog */}
      <Dialog open={isRecommendationsOpen} onOpenChange={setIsRecommendationsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Rule Recommendations</DialogTitle>
          </DialogHeader>
          
          {recommendationsLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div className="space-y-4">
              {recommendations.map((rec: any, index: any) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{rec.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {rec.vendorPattern && (
                            <Badge variant="outline">Vendor: {rec.vendorPattern}</Badge>
                          )}
                          {rec.descriptionPattern && (
                            <Badge variant="outline">Pattern: {rec.descriptionPattern}</Badge>
                          )}
                          {(rec.amountMin || rec.amountMax) && (
                            <Badge variant="outline">
                              Amount: ${rec.amountMin || '0'} - ${rec.amountMax || '∞'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm">
                          <span className="font-medium">Account:</span> {rec.suggestedAccount}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Reasoning:</span> {rec.reasoning}
                        </p>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <Badge variant="default" className="mb-2">
                          {rec.confidence}% confidence
                        </Badge>
                        <br />
                        <Button
                          size="sm"
                          onClick={() => createRuleFromRecommendation(rec)}
                          disabled={createRuleMutation.isPending}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {recommendations.length === 0 && !recommendationsLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No AI recommendations available. Make sure you have recent transactions for analysis.
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}