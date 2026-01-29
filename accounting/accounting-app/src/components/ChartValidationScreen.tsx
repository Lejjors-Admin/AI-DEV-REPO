import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Eye, EyeOff, Download } from "lucide-react";

interface ParsedAccount {
  accountNumber?: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype?: string;
  description?: string;
  balance?: number;
  isDebitNormal?: boolean;
  isActive?: boolean;
}

interface ValidationResult {
  accounts: ParsedAccount[];
  metadata: {
    fileName: string;
    fileType: string;
    totalAccounts: number;
    parsingMethod: string;
    confidence: number;
    warnings: string[];
    zeroBalanceAccounts?: number;
    missingAccountNumbers?: number;
    accountNumberGaps?: string[];
  };
}

interface ChartValidationScreenProps {
  validationResult: ValidationResult;
  onApprove: (selectedAccounts: ParsedAccount[], options: ValidationOptions) => void;
  onCancel: () => void;
}

interface ValidationOptions {
  includeZeroBalances: boolean;
  autoGenerateNumbers: boolean;
  hideInactiveAccounts: boolean;
}

export function ChartValidationScreen({ validationResult, onApprove, onCancel }: ChartValidationScreenProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(
    new Set(validationResult.accounts.map((_, index) => index))
  );
  const [showZeroBalances, setShowZeroBalances] = useState(true);
  const [options, setOptions] = useState<ValidationOptions>({
    includeZeroBalances: true,
    autoGenerateNumbers: true,
    hideInactiveAccounts: false
  });

  const { accounts, metadata } = validationResult;
  
  const zeroBalanceAccounts = accounts.filter(acc => acc.balance === 0);
  const accountsWithNumbers = accounts.filter(acc => acc.accountNumber);
  const accountsWithoutNumbers = accounts.filter(acc => !acc.accountNumber);

  const displayedAccounts = showZeroBalances 
    ? accounts 
    : accounts.filter(acc => acc.balance !== 0);

  const toggleAccount = (index: number) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedAccounts(newSelected);
  };

  const handleApprove = () => {
    const selectedAccountsList = accounts.filter((_, index) => selectedAccounts.has(index));
    onApprove(selectedAccountsList, options);
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'asset': 'bg-green-100 text-green-800',
      'liability': 'bg-red-100 text-red-800',
      'equity': 'bg-blue-100 text-blue-800',
      'income': 'bg-purple-100 text-purple-800',
      'expense': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatBalance = (balance: number) => {
    // Balance values from AI intake are in dollars, not cents
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chart of Accounts Validation</h2>
          <p className="text-gray-600">Review and approve imported accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <Button onClick={handleApprove} disabled={selectedAccounts.size === 0}>
            Import {selectedAccounts.size} Accounts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-xl font-bold">{metadata.totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-gray-600">Zero Balance</p>
                <p className="text-xl font-bold">{metadata.zeroBalanceAccounts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Missing Numbers</p>
                <p className="text-xl font-bold">{metadata.missingAccountNumbers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${metadata.confidence > 0.8 ? 'bg-green-500' : metadata.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-xl font-bold">{Math.round(metadata.confidence * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {metadata.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Parsing Warnings:</p>
              {metadata.warnings.map((warning, index) => (
                <p key={index} className="text-sm">• {warning}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeZero"
              checked={options.includeZeroBalances}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeZeroBalances: !!checked }))
              }
            />
            <label htmlFor="includeZero" className="text-sm">
              Include accounts with zero balances
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoGenerate"
              checked={options.autoGenerateNumbers}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, autoGenerateNumbers: !!checked }))
              }
            />
            <label htmlFor="autoGenerate" className="text-sm">
              Auto-generate missing account numbers
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowZeroBalances(!showZeroBalances)}
              className="flex items-center gap-2"
            >
              {showZeroBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showZeroBalances ? 'Hide' : 'Show'} Zero Balances
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Accounts to Import</span>
            <Badge variant="secondary">{selectedAccounts.size} selected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayedAccounts.map((account, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedAccounts.has(index) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedAccounts.has(index)}
                    onCheckedChange={() => toggleAccount(index)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      <Badge className={getAccountTypeColor(account.type)}>
                        {account.type}
                      </Badge>
                      {account.balance === 0 && (
                        <Badge variant="outline" className="text-xs">Zero Balance</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-4">
                      {account.accountNumber && (
                        <span>#{account.accountNumber}</span>
                      )}
                      {account.subtype && (
                        <span>{account.subtype}</span>
                      )}
                      {!account.accountNumber && (
                        <span className="text-orange-600">Missing account number</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatBalance(account.balance || 0)}</p>
                  <p className="text-xs text-gray-500">
                    {account.isDebitNormal ? 'Debit Normal' : 'Credit Normal'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Number Gaps */}
      {metadata.accountNumberGaps && metadata.accountNumberGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Potential Missing Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              Based on the numbering sequence, these account numbers might be missing:
            </p>
            <div className="flex flex-wrap gap-2">
              {metadata.accountNumberGaps.map((gap, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {gap}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}