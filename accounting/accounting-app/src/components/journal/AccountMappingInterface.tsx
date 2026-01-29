import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  MapPin, 
  Plus, 
  X, 
  Eye,
  TrendingUp,
  FileText,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

interface Account {
  id: number;
  name: string;
  account_number: string;
  type: string;
  subtype: string;
}

interface AccountAnalysis {
  accountCode: string;
  accountName: string;
  transactionCount: number;
  matchType: 'exact' | 'fuzzy' | 'missing' | 'error';
  matchedAccount?: Account;
  suggestion?: string;
  confidence: number;
  canCreate: boolean;
  similarAccounts: (Account & { similarity: number })[];
  exampleTransactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    reference: string;
  }>;
}

interface ValidationSummary {
  totalTransactions: number;
  totalUniqueAccounts: number;
  exactMatches: number;
  fuzzyMatches: number;
  newAccountsNeeded: number;
  unresolvableAccounts: number;
  matchRate: number;
  readyToImport: boolean;
}

interface AccountMappingInterfaceProps {
  clientId: number;
  sessionId: number;
  extractedData: any[];
  onMappingComplete: (mappings: Record<string, any>) => void;
  onCancel: () => void;
}

export function AccountMappingInterface({ 
  clientId, 
  sessionId, 
  extractedData, 
  onMappingComplete, 
  onCancel 
}: AccountMappingInterfaceProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [accountAnalysis, setAccountAnalysis] = useState<AccountAnalysis[]>([]);
  const [accountMappings, setAccountMappings] = useState<Record<string, any>>({});
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Validate accounts on component mount
  useEffect(() => {
    validateAccounts();
    fetchExistingAccounts();
  }, []);

  const validateAccounts = async () => {
    setIsValidating(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Content-Type"] = "application/json";
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/gl-staging/${clientId}/validate`), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          extractedData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setValidationSummary(result.summary);
      setAccountAnalysis(result.accountAnalysis);

      // Initialize mappings for accounts that need attention
      const initialMappings: Record<string, any> = {};
      result.accountAnalysis.forEach((analysis: AccountAnalysis) => {
        if (analysis.matchType === 'exact') {
          // Auto-accept exact matches
          initialMappings[analysis.accountCode] = {
            action: 'map',
            targetAccountId: analysis.matchedAccount?.id,
            notes: 'Exact match auto-selected'
          };
        } else if (analysis.matchType === 'fuzzy' && analysis.confidence > 90) {
          // Auto-accept high-confidence fuzzy matches
          initialMappings[analysis.accountCode] = {
            action: 'map',
            targetAccountId: analysis.matchedAccount?.id,
            notes: `High confidence fuzzy match (${analysis.confidence}%)`
          };
        } else {
          // Leave others for manual decision
          initialMappings[analysis.accountCode] = {
            action: analysis.canCreate ? 'create' : 'skip',
            targetAccountId: null,
            notes: ''
          };
        }
      });

      setAccountMappings(initialMappings);

      toast({
        title: "Validation Complete",
        description: `Analyzed ${result.summary.totalUniqueAccounts} accounts. ${result.summary.matchRate}% match rate.`,
      });

    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: "Could not validate accounts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const fetchExistingAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/accounts/${clientId}`), {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Extract accounts array from response object
        const accounts = data.accounts || data || [];
        setExistingAccounts(Array.isArray(accounts) ? accounts : []);
      }
    } catch (error) {
      console.error('Failed to fetch existing accounts:', error);
    }
  };

  const updateMapping = (accountCode: string, updates: Partial<any>) => {
    setAccountMappings(prev => ({
      ...prev,
      [accountCode]: {
        ...prev[accountCode],
        ...updates
      }
    }));
  };

  const handleApplyMappings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      headers["Content-Type"] = "application/json";
      // Update mappings on server
      const response = await fetch(apiConfig.buildUrl(`/api/gl-staging/${clientId}/update-mappings`), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          mappings: accountMappings
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast({
        title: "Mappings Applied",
        description: "Account mappings have been saved successfully.",
      });

      // Proceed to import
      onMappingComplete(accountMappings);

    } catch (error) {
      console.error('Failed to apply mappings:', error);
      toast({
        title: "Failed to Apply Mappings",
        description: "Could not save account mappings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAnalysis = accountAnalysis.filter(analysis => {
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'exact' && analysis.matchType === 'exact') ||
      (selectedFilter === 'fuzzy' && analysis.matchType === 'fuzzy') ||
      (selectedFilter === 'missing' && analysis.matchType === 'missing') ||
      (selectedFilter === 'needs_attention' && ['fuzzy', 'missing', 'error'].includes(analysis.matchType));

    const matchesSearch = !searchTerm || 
      analysis.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.accountName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getActionSummary = () => {
    const actions = Object.values(accountMappings);
    return {
      map: actions.filter(a => a.action === 'map').length,
      create: actions.filter(a => a.action === 'create').length,
      skip: actions.filter(a => a.action === 'skip').length
    };
  };

  const actionSummary = getActionSummary();

  if (isValidating) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Validating accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationSummary) return null;

  return (
    <div className="space-y-6" data-testid="account-mapping-interface">
      {/* Validation Summary */}
      <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
            <Search className="h-6 w-6" />
            Account Validation Results
          </CardTitle>
          <CardDescription className="text-blue-700">
            Review and map accounts before importing {validationSummary.totalTransactions} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 font-semibold">TOTAL ACCOUNTS</div>
              <div className="text-2xl font-bold text-gray-900">
                {validationSummary.totalUniqueAccounts}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-sm text-gray-600 font-semibold">MATCHED</div>
              <div className="text-2xl font-bold text-green-600">
                {validationSummary.exactMatches + validationSummary.fuzzyMatches}
              </div>
              <div className="text-xs text-green-500">
                {validationSummary.matchRate}% match rate
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <div className="text-sm text-gray-600 font-semibold">NEED MAPPING</div>
              <div className="text-2xl font-bold text-orange-600">
                {validationSummary.newAccountsNeeded}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <div className="text-sm text-gray-600 font-semibold">ERRORS</div>
              <div className="text-2xl font-bold text-red-600">
                {validationSummary.unresolvableAccounts}
              </div>
            </div>
          </div>

          {/* Action Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Import Plan:</h4>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-blue-500" />
                Map to existing: <strong>{actionSummary.map}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Plus className="h-4 w-4 text-green-500" />
                Create new: <strong>{actionSummary.create}</strong>
              </span>
              <span className="flex items-center gap-1">
                <X className="h-4 w-4 text-red-500" />
                Skip: <strong>{actionSummary.skip}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Mapping Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-48" data-testid="filter-select">
                <SelectValue placeholder="Filter accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="exact">Exact Matches</SelectItem>
                <SelectItem value="fuzzy">Fuzzy Matches</SelectItem>
                <SelectItem value="missing">Missing Accounts</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1">
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Account Mapping Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Account</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysis.map((analysis) => {
                const mapping = accountMappings[analysis.accountCode] || {};
                
                return (
                  <TableRow key={analysis.accountCode} data-testid={`account-row-${analysis.accountCode}`}>
                    <TableCell className="font-mono">{analysis.accountCode}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{analysis.accountName}</div>
                        {analysis.suggestion && (
                          <div className="text-xs text-muted-foreground">
                            {analysis.suggestion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{analysis.transactionCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {analysis.matchType === 'exact' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Exact Match
                        </Badge>
                      )}
                      {analysis.matchType === 'fuzzy' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Search className="h-3 w-3 mr-1" />
                          Fuzzy ({analysis.confidence}%)
                        </Badge>
                      )}
                      {analysis.matchType === 'missing' && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.action || 'create'}
                        onValueChange={(value) => updateMapping(analysis.accountCode, { action: value })}
                        data-testid={`action-select-${analysis.accountCode}`}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="map">Map</SelectItem>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="skip">Skip</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {mapping.action === 'map' && (
                        <Select
                          value={mapping.targetAccountId?.toString() || ''}
                          onValueChange={(value) => updateMapping(analysis.accountCode, { 
                            targetAccountId: parseInt(value) 
                          })}
                          data-testid={`target-account-select-${analysis.accountCode}`}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Show matched account first if available */}
                            {analysis.matchedAccount && (
                              <SelectItem value={analysis.matchedAccount.id.toString()}>
                                {analysis.matchedAccount.account_number} - {analysis.matchedAccount.name}
                              </SelectItem>
                            )}
                            {/* Show similar accounts */}
                            {analysis.similarAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.account_number} - {account.name} ({account.similarity}% similar)
                              </SelectItem>
                            ))}
                            {/* Show all existing accounts */}
                            {existingAccounts
                              .filter(acc => 
                                !analysis.matchedAccount || acc.id !== analysis.matchedAccount.id
                              )
                              .filter(acc => 
                                !analysis.similarAccounts.some(sim => sim.id === acc.id)
                              )
                              .slice(0, 20)
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.account_number} - {account.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                      {mapping.action === 'create' && (
                        <span className="text-sm text-muted-foreground">
                          Will create new account
                        </span>
                      )}
                      {mapping.action === 'skip' && (
                        <span className="text-sm text-red-600">
                          {analysis.transactionCount} transactions will be skipped
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        placeholder="Optional notes..."
                        value={mapping.notes || ''}
                        onChange={(e) => updateMapping(analysis.accountCode, { notes: e.target.value })}
                        className="min-h-[60px] text-xs"
                        data-testid={`notes-textarea-${analysis.accountCode}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} data-testid="cancel-button">
          Cancel
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => window.location.reload()}
            data-testid="reset-button"
          >
            Reset
          </Button>
          <Button 
            onClick={handleApplyMappings}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="apply-mappings-button"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Apply Mappings & Import
          </Button>
        </div>
      </div>
    </div>
  );
}