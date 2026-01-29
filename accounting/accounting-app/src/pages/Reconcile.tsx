import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import { 
  Upload, FileSpreadsheet, FileText, Link,
  CheckCircle, AlertCircle, Clock, Zap,
  Download, Eye, MoreHorizontal, Filter,
  BarChart3, TrendingUp, RefreshCw, Target
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
import { Progress } from "@/components/ui/progress";

interface ReconciliationSession {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  accountId: number;
  accountName?: string;
  startDate: string;
  endDate: string;
  status: string;
  statementEndingBalance?: string;
  bookEndingBalance?: string;
  difference?: string;
  createdAt: string;
  completedAt?: string;
  itemCount?: number;
  matchedCount?: number;
}

interface ReconciliationItem {
  id: number;
  sessionId: number;
  transactionId?: number;
  statementDate: string;
  statementDescription: string;
  statementAmount: string;
  statementReference?: string;
  status: string;
  matchConfidence?: string;
  notes?: string;
  transactionDescription?: string;
  transactionAmount?: string;
  accountName?: string;
}

export default function Reconcile() {
  const { clientId } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSession, setSelectedSession] = useState<ReconciliationSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'excel' | 'pdf'>('excel');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    accountId: '',
    startDate: '',
    endDate: '',
    statementEndingBalance: ''
  });

  const currentClientId = parseInt(clientId || '2');

  // Fetch reconciliation sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/reconciliation/sessions', currentClientId],
    queryFn: () => apiRequest(`/api/reconciliation/sessions?clientId=${currentClientId}`)
  });

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts', currentClientId],
    queryFn: () => apiRequest(`/api/accounts?clientId=${currentClientId}`)
  });

  // Fetch session items when session is selected
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/reconciliation/sessions', selectedSession?.id, 'items'],
    queryFn: () => apiRequest(`/api/reconciliation/sessions/${selectedSession?.id}/items`),
    enabled: !!selectedSession?.id
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (sessionData: any) => apiRequest('/api/reconciliation/sessions', {
      method: 'POST',
      body: JSON.stringify({ ...sessionData, clientId: currentClientId }),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      toast({ title: "Reconciliation session created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation/sessions'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create session", variant: "destructive" });
    }
  });

  // Upload statement mutation
  const uploadStatementMutation = useMutation({
    mutationFn: (formData: FormData) => apiRequest('/api/reconciliation/upload-statement', {
      method: 'POST',
      body: formData
    }),
    onSuccess: (data) => {
      toast({ 
        title: "Statement uploaded successfully!",
        description: `Extracted ${data.extractedCount} transactions`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation/sessions'] });
      setIsUploadOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to upload statement", variant: "destructive" });
    }
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: (sessionId: number) => apiRequest('/api/reconciliation/auto-match', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: (data) => {
      toast({ 
        title: "Auto-matching completed!",
        description: `Matched ${data.matchedCount} of ${data.totalItems} items`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation/sessions'] });
    },
    onError: () => {
      toast({ title: "Auto-matching failed", variant: "destructive" });
    }
  });

  const sessions = sessionsData?.sessions || [];
  const accounts = accountsData?.accounts || [];
  const items = itemsData?.items || [];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      accountId: '',
      startDate: '',
      endDate: '',
      statementEndingBalance: ''
    });
  };

  const handleCreateSession = () => {
    if (!formData.name || !formData.accountId || !formData.startDate || !formData.endDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createSessionMutation.mutate({
      ...formData,
      accountId: parseInt(formData.accountId)
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSession) return;

    const formData = new FormData();
    formData.append('statement', file);
    formData.append('sessionId', selectedSession.id.toString());

    uploadStatementMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'discrepancy': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'text-green-600';
      case 'unmatched': return 'text-orange-600';
      case 'needs_entry': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const bankAccounts = accounts.filter(acc => acc.subtype === 'bank' || acc.type === 'asset');

  if (sessionsLoading || accountsLoading) {
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
          <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
          <p className="text-muted-foreground mt-2">
            Advanced reconciliation with Excel, PDF, and Plaid bank feeds
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          New Reconciliation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'completed').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'in_progress').length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Match Rate</p>
                <p className="text-2xl font-bold">
                  {sessions.length > 0 
                    ? Math.round((sessions.reduce((sum, s) => sum + (s.matchedCount || 0), 0) / 
                        sessions.reduce((sum, s) => sum + (s.itemCount || 1), 0)) * 100)
                    : 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Sessions</CardTitle>
              <CardDescription>
                Select a session to view details and manage reconciliation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{session.name}</h3>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {session.accountName}
                  </p>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Period: {session.startDate} to {session.endDate}</p>
                    {session.difference && (
                      <p>Difference: ${Math.abs(parseFloat(session.difference)).toFixed(2)}</p>
                    )}
                    {session.itemCount && (
                      <p>Items: {session.matchedCount || 0}/{session.itemCount} matched</p>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No reconciliation sessions</p>
                  <p className="text-muted-foreground mb-4">
                    Create your first reconciliation session
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Start Reconciliation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedSession.name}</CardTitle>
                    <CardDescription>
                      {selectedSession.description || 'Bank reconciliation session'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Account</Label>
                        <p className="font-medium">{selectedSession.accountName}</p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Badge className={getStatusColor(selectedSession.status)}>
                          {selectedSession.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <Label>Period</Label>
                        <p>{selectedSession.startDate} to {selectedSession.endDate}</p>
                      </div>
                      <div>
                        <Label>Progress</Label>
                        <div className="space-y-2">
                          <Progress 
                            value={selectedSession.itemCount ? (selectedSession.matchedCount || 0) / selectedSession.itemCount * 100 : 0} 
                          />
                          <p className="text-sm text-muted-foreground">
                            {selectedSession.matchedCount || 0} of {selectedSession.itemCount || 0} items matched
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedSession.statementEndingBalance && selectedSession.bookEndingBalance && (
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <Label>Statement Balance</Label>
                            <p className="text-lg font-medium">
                              ${parseFloat(selectedSession.statementEndingBalance).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Label>Book Balance</Label>
                            <p className="text-lg font-medium">
                              ${parseFloat(selectedSession.bookEndingBalance).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Label>Difference</Label>
                            <p className={`text-lg font-medium ${
                              Math.abs(parseFloat(selectedSession.difference || '0')) < 0.01 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              ${Math.abs(parseFloat(selectedSession.difference || '0')).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reconciliation Items</CardTitle>
                    <CardDescription>
                      Statement transactions and their matching status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {itemsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-16" />
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{new Date(item.statementDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.statementDescription}</p>
                                  {item.statementReference && (
                                    <p className="text-sm text-muted-foreground">
                                      Ref: {item.statementReference}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>${parseFloat(item.statementAmount).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={getMatchStatusColor(item.status)}>
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.transactionDescription ? (
                                  <div>
                                    <p className="text-sm font-medium">{item.transactionDescription}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ${parseFloat(item.transactionAmount || '0').toFixed(2)} • {item.accountName}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No match</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.matchConfidence && (
                                  <Badge variant="outline">
                                    {parseFloat(item.matchConfidence).toFixed(0)}%
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {items.length === 0 && !itemsLoading && (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No items found</p>
                        <p className="text-muted-foreground">
                          Upload a statement to populate reconciliation items
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upload Statement</CardTitle>
                      <CardDescription>
                        Upload Excel, CSV, or PDF bank statements
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-24 flex flex-col"
                          onClick={() => {
                            setUploadType('excel');
                            fileInputRef.current?.click();
                          }}
                        >
                          <FileSpreadsheet className="w-8 h-8 mb-2" />
                          Excel/CSV
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="h-24 flex flex-col"
                          onClick={() => {
                            setUploadType('pdf');
                            fileInputRef.current?.click();
                          }}
                        >
                          <FileText className="w-8 h-8 mb-2" />
                          PDF Statement
                        </Button>
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={uploadType === 'excel' ? '.xlsx,.xls,.csv' : '.pdf'}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI Auto-Match</CardTitle>
                      <CardDescription>
                        Automatically match statement items with book transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => autoMatchMutation.mutate(selectedSession.id)}
                        disabled={autoMatchMutation.isPending}
                        className="w-full"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {autoMatchMutation.isPending ? 'Matching...' : 'Run Auto-Match'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Select a reconciliation session</p>
                  <p className="text-muted-foreground">
                    Choose a session from the list to view details and manage reconciliation
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Session Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Reconciliation Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., January 2024 Bank Reconciliation"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountId">Bank Account</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="statementEndingBalance">Statement Ending Balance</Label>
              <Input
                id="statementEndingBalance"
                type="number"
                step="0.01"
                value={formData.statementEndingBalance}
                onChange={(e) => setFormData(prev => ({ ...prev, statementEndingBalance: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes about this reconciliation..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending || !formData.name}
            >
              {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}