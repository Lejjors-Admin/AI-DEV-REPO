import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

interface VendorStatementProps {
  vendorId: number;
  vendorName: string;
  open: boolean;
  onClose: () => void;
}

export default function VendorStatement({ vendorId, vendorName, open, onClose }: VendorStatementProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch statement data
  const { data: statementResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/crm/vendors/statement', vendorId, startDate, endDate],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await apiRequest("GET", `/api/crm/vendors/${vendorId}/statement?${params.toString()}`);
        return response.json();
      } catch (error) {
        console.error('Statement fetch error:', error);
        throw error;
      }
    },
    enabled: open && !!vendorId,
  });

  const statementData = statementResponse?.data;
  const vendor = statementData?.vendor;
  const statement = statementData?.statement;
  const transactions = statement?.transactions || [];
  const summary = statement?.summary || {
    openingBalance: 0,
    totalCharges: 0,
    totalPayments: 0,
    currentBalance: 0,
    transactionCount: 0
  };

  const handleDownloadPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/crm/vendors/${vendorId}/statement/pdf?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Statement-${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Vendor statement has been downloaded successfully.',
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExportExcel = () => {
    try {
      // Prepare data for Excel export
      const excelData = transactions.map(tx => ({
        'Date': tx.date,
        'Reference': tx.reference,
        'Description': tx.description,
        'Charges': tx.debit > 0 ? tx.debit.toFixed(2) : '',
        'Payments': tx.credit > 0 ? tx.credit.toFixed(2) : '',
        'Balance': tx.balance.toFixed(2),
        'Status': tx.status || '',
      }));

      // Add summary rows
      excelData.push({
        'Date': '',
        'Reference': '',
        'Description': '',
        'Charges': '',
        'Payments': '',
        'Balance': '',
        'Status': ''
      });
      excelData.push({
        'Date': '',
        'Reference': '',
        'Description': 'Opening Balance',
        'Charges': '',
        'Payments': '',
        'Balance': summary.openingBalance.toFixed(2),
        'Status': ''
      });
      excelData.push({
        'Date': '',
        'Reference': '',
        'Description': 'Total Charges',
        'Charges': summary.totalCharges.toFixed(2),
        'Payments': '',
        'Balance': '',
        'Status': ''
      });
      excelData.push({
        'Date': '',
        'Reference': '',
        'Description': 'Total Payments',
        'Charges': '',
        'Payments': summary.totalPayments.toFixed(2),
        'Balance': '',
        'Status': ''
      });
      excelData.push({
        'Date': '',
        'Reference': '',
        'Description': 'Current Balance',
        'Charges': '',
        'Payments': '',
        'Balance': summary.currentBalance.toFixed(2),
        'Status': ''
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 15 }, // Reference
        { wch: 40 }, // Description
        { wch: 12 }, // Charges
        { wch: 12 }, // Payments
        { wch: 12 }, // Balance
        { wch: 12 }, // Status
      ];

      // Download file
      const filename = `Statement-${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Excel Exported',
        description: 'Vendor statement has been exported successfully.',
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export to Excel. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Statement of Account - {vendorName}</DialogTitle>
          <DialogDescription>
            View and download vendor transactions and balance details
          </DialogDescription>
        </DialogHeader>

        {/* Date Range Filter */}
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={() => refetch()}>
            Apply Filter
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setTimeout(() => refetch(), 100);
            }}
          >
            Clear
          </Button>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 mb-4">
          <Button onClick={handleDownloadPDF} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Vendor Info */}
        {vendor && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Vendor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">{vendor.companyName || vendor.name}</p>
                  {vendor.address && <p>{vendor.address}</p>}
                  {vendor.city && vendor.province && (
                    <p>{vendor.city}, {vendor.province} {vendor.postalCode}</p>
                  )}
                </div>
                <div>
                  {vendor.phone && <p>Phone: {vendor.phone}</p>}
                  {vendor.email && <p>Email: {vendor.email}</p>}
                  {vendor.taxId && <p>Tax ID: {vendor.taxId}</p>}
                  {vendor.paymentTerms && <p>Terms: {vendor.paymentTerms}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Transactions Table */}
        {!isLoading && transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Charges</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index} className={tx.type === 'opening_balance' ? 'font-semibold bg-gray-50' : ''}>
                      <TableCell className="text-sm">{tx.date}</TableCell>
                      <TableCell className="text-sm">{tx.reference}</TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className="text-sm text-right">
                        {tx.debit > 0 ? formatCurrency(tx.debit) : ''}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {tx.credit > 0 ? formatCurrency(tx.credit) : ''}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(tx.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {!isLoading && summary && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Opening Balance:</span>
                  <span className="font-medium">{formatCurrency(summary.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Charges:</span>
                  <span className="font-medium">{formatCurrency(summary.totalCharges)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Payments:</span>
                  <span className="font-medium">({formatCurrency(summary.totalPayments)})</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Current Balance:</span>
                  <span className={summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(summary.currentBalance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!isLoading && transactions.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
            <p className="text-gray-600">There are no transactions for this vendor in the selected period.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
