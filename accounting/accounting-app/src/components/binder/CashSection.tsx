// BINDER Phase 2: Cash & Cash Equivalents Section Component
// Displays cash audit data with embedded TARS analysis

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  FileText,
  Calculator,
  Eye,
  Plus,
  Download,
  Edit3
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { SectionAIHelper } from "./SectionAIHelper";
import { apiConfig } from "@/lib/api-config";

interface CashAccount {
  accountId: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  subtype: string;
  balance: number;
  lastReconcileDate?: string;
  isReconciled: boolean;
  transactionCount: number;
}

interface CashSectionData {
  totalCashBalance: number;
  cashAccounts: CashAccount[];
  unreconciledItems: number;
  lastReconcileDate?: string;
  auditRisks: string[];
  recommendedProcedures: string[];
}

interface CashSectionProps {
  clientId: number;
}

export function CashSection({ clientId }: CashSectionProps) {
  const [workingPapers, setWorkingPapers] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cash section data
  const { data: cashData, isLoading, error, refetch } = useQuery<CashSectionData>({
    queryKey: ['/api/binder/cash-section', clientId],
    queryFn: async () => {
      const response = await fetch(apiConfig.buildUrl(`/api/binder/cash-section/${clientId}`));
      if (!response.ok) {
        throw new Error('Failed to fetch cash section data');
      }
      return response.json();
    }
  });


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cash & Cash Equivalents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cash Section Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load cash section data. Please try refreshing.
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cash Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Section B: Cash & Cash Equivalents
          </CardTitle>
          <CardDescription>
            Audit analysis of cash accounts and liquidity positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ${cashData?.totalCashBalance.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Total Cash Balance</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {cashData?.cashAccounts.length || 0}
              </div>
              <div className="text-sm text-gray-600">Cash Accounts</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {cashData?.unreconciledItems || 0}
              </div>
              <div className="text-sm text-gray-600">Unreconciled Items</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {cashData?.auditRisks.length || 0}
              </div>
              <div className="text-sm text-gray-600">Audit Risks</div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* AI Assistant for Cash Section */}
      <SectionAIHelper 
        sectionName="Cash & Cash Equivalents"
        sectionData={cashData}
        binderId={1} // This would come from props in real implementation
      />

      {/* Working Papers Section */}
      {workingPapers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              TARS Generated Working Papers
            </CardTitle>
            <CardDescription>
              AI-generated audit working papers for cash section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">Files Successfully Generated</h4>
                </div>
                <p className="text-sm text-green-700">
                  TARS created {workingPapers?.files?.length || 0} actual working paper files ready for download and editing.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {workingPapers?.files?.map((file: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium">{file.fileName}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{file.type}</Badge>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Generated by: TARS AI | Type: {file.type === 'excel' ? 'Excel Workbook' : 
                        file.type === 'text' ? 'Text Document' : file.type}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit with TARS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Accounts Table */}
      {cashData?.cashAccounts && cashData.cashAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Cash Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Reconciled</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashData.cashAccounts.map((account) => (
                  <TableRow key={account.accountId}>
                    <TableCell className="font-mono">
                      {account.accountNumber || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {account.accountName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{account.subtype}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={account.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                        ${Math.abs(account.balance).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {account.isReconciled ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.transactionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Audit Risks and Procedures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audit Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Identified Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cashData?.auditRisks && cashData.auditRisks.length > 0 ? (
              <ul className="space-y-2">
                {cashData.auditRisks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">No significant risks identified</p>
            )}
          </CardContent>
        </Card>

        {/* Recommended Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <FileText className="w-5 h-5" />
              Recommended Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cashData?.recommendedProcedures && cashData.recommendedProcedures.length > 0 ? (
              <ul className="space-y-2">
                {cashData.recommendedProcedures.map((procedure, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{procedure}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">No specific procedures recommended</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}