import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Download, FileText, Calendar, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiConfig } from "@/lib/api-config";

// Helper function to format currency with commas
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

interface AccountsReceivableAgingProps {
  clientId: number | null;
  asOfDate?: string;
}

interface AgingRow {
  customerId: number;
  customerName: string;
  current: number;      // 0-30 days
  thirtyDays: number;   // 31-60 days
  sixtyDays: number;    // 61-90 days  
  ninetyDays: number;   // 90+ days
  totalBalance: number;
}

export default function AccountsReceivableAging({ clientId, asOfDate = new Date().toISOString().split('T')[0] }: AccountsReceivableAgingProps) {
  const { toast } = useToast();
  const [showDetailed, setShowDetailed] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch aging report data
  const { data: agingResponse, isLoading: isLoadingAging, refetch: refetchAging, error: queryError } = useQuery({
    queryKey: ['/api/crm/customers/aging-report', clientId, asOfDate],
    queryFn: async () => {
      if (!clientId) return null;
     
      try {
        const response = await apiRequest('GET', 
          `/api/crm/customers/aging-report?clientId=${clientId}&asOfDate=${asOfDate}`
        );
        const data = await response.json();
        console.log('📊 AR Aging Report Response:', data);
        return data;
      } catch (error) {
        console.error('❌ AR Aging Report Error:', error);
        toast({
          title: "Failed to load AR aging data",
          description: error instanceof Error ? error.message : "Please check if you're logged in",
          variant: "destructive"
        });
        throw error;
      }
    },
    enabled: !!clientId,
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always' // Always refetch when component mounts
  });

  const agingData = agingResponse?.data || [];

  // Fetch detailed invoices for a specific customer
  const { data: detailedInvoices } = useQuery({
    queryKey: ['/api/crm/invoices', clientId, asOfDate, showDetailed],
    queryFn: async () => {
      if (!clientId || !showDetailed) return [];
      
      try {
        const response = await apiRequest('GET', `/api/crm/invoices/${clientId}`);
        const result = await response.json();
        console.log('📊 Fetched invoices for detailed view:', result);
        // Extract the data array from {success: true, data: [...]}
        return result.data || [];
      } catch (error) {
        console.error('Failed to fetch detailed invoices:', error);
        return [];
      }
    },
    enabled: !!clientId && showDetailed,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always' // Always refetch when component mounts
  });

  const toggleRowExpansion = (customerId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedRows(newExpanded);
  };

  // Get detailed invoices for a specific customer with aging breakdown
  const getCustomerInvoiceDetails = (customerId: number) => {
    if (!detailedInvoices) return [];
    
    const customerInvoices = detailedInvoices.filter((inv: any) => inv.customerId === customerId);
    
    return customerInvoices.map((invoice: any) => {
      const invoiceDate = new Date(invoice.date);
      const asOfDateObj = new Date(asOfDate);
      const daysOld = Math.floor((asOfDateObj.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use balanceDue from the invoice, or calculate it
      const balance = invoice.balanceDue !== undefined 
        ? parseFloat(String(invoice.balanceDue))
        : invoice.totalAmount - (invoice.paidAmount || 0);
      
      // Skip future-dated invoices (negative aging)
      if (daysOld < 0) {
        console.log(`⏭️  Skipping future-dated invoice ${invoice.invoiceNumber}: date=${invoice.date}, asOf=${asOfDate}`);
        return null;
      }
      
      // Distribute balance into aging buckets based on invoice age (not due date!)
      let current = 0, thirtyDays = 0, sixtyDays = 0, ninetyDays = 0;
      
      if (daysOld <= 30) {
        current = balance;
      } else if (daysOld <= 60) {
        thirtyDays = balance;
      } else if (daysOld <= 90) {
        sixtyDays = balance;
      } else {
        ninetyDays = balance;
      }
      
      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount || 0,
        balance,
        daysOld,
        current,
        thirtyDays,
        sixtyDays,
        ninetyDays
      };
    }).filter((inv: any) => inv !== null && inv.balance > 0);
  };


  const exportToExcel = async () => {
    if (!clientId || !agingData.length) {
      toast({
        title: "No data to export",
        variant: "destructive"
      });
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('AR Aging Report');

      // Add title
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Accounts Receivable Aging Report';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };

      // Add date
      worksheet.mergeCells('A2:F2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `As of ${new Date(asOfDate).toLocaleDateString()}`;
      dateCell.alignment = { horizontal: 'center' };

      // Add headers
      const headers = ['Customer', 'Current (0-30)', '31-60 Days', '61-90 Days', '90+ Days', 'Total Balance'];
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Add data rows
      agingData.forEach((row: AgingRow) => {
        const dataRow = worksheet.addRow([
          row.customerName,
          row.current,
          row.thirtyDays,
          row.sixtyDays,
          row.ninetyDays,
          row.totalBalance
        ]);
        
        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          if (colNumber > 1) {
            cell.numFmt = '$#,##0.00';
            cell.alignment = { horizontal: 'right' };
          }
        });
      });

      // Add totals row
      const totalsRow = worksheet.addRow([
        'TOTALS',
        totals.current,
        totals.thirtyDays,
        totals.sixtyDays,
        totals.ninetyDays,
        totals.totalBalance
      ]);
      
      totalsRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (colNumber > 1) {
          cell.numFmt = '$#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });

      // Set column widths
      worksheet.columns = [
        { width: 30 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 }
      ];

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_receivable_aging_${asOfDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Excel file exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not generate Excel file",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    if (!clientId || !agingData.length) {
      toast({
        title: "No data to export",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/reports/aging-pdf', {
        clientId,
        asOfDate,
        reportType: 'AR'
      });

      // Handle blob response for PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_receivable_aging_${asOfDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not generate PDF",
        variant: "destructive"
      });
    }
  };

  // Calculate totals for summary
  const totals = agingData.reduce(
    (acc: any, row: AgingRow) => ({
      current: acc.current + row.current,
      thirtyDays: acc.thirtyDays + row.thirtyDays,
      sixtyDays: acc.sixtyDays + row.sixtyDays,
      ninetyDays: acc.ninetyDays + row.ninetyDays,
      totalBalance: acc.totalBalance + row.totalBalance
    }),
    { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, totalBalance: 0 }
  );

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-gray-600">Choose a client to generate accounts receivable aging report</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {/* Aging Report Results */}
      {agingData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Accounts Receivable Aging Report
              </CardTitle>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="button-export-excel-ar">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="detailed-view" className="text-sm">Show Detailed View</Label>
                  <Switch 
                    id="detailed-view"
                    checked={showDetailed}
                    onCheckedChange={setShowDetailed}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {showDetailed && <TableHead className="w-10"></TableHead>}
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Current (0-30)</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((row: AgingRow) => {
                  const isExpanded = expandedRows.has(row.customerId);
                  const invoiceDetails = showDetailed ? getCustomerInvoiceDetails(row.customerId) : [];
                  
                  return (
                    <>
                      <TableRow key={row.customerId} className={isExpanded ? 'bg-muted/50' : ''}>
                        {showDetailed && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleRowExpansion(row.customerId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{row.customerName}</TableCell>
                        <TableCell className="text-right">
                          {row.current > 0 ? `$${formatCurrency(row.current)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.thirtyDays > 0 ? `$${formatCurrency(row.thirtyDays)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.sixtyDays > 0 ? `$${formatCurrency(row.sixtyDays)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.ninetyDays > 0 ? 
                            <span className="text-red-600 font-medium">${formatCurrency(row.ninetyDays)}</span> 
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={row.totalBalance > 0 ? 'text-green-600' : 'text-gray-600'}>
                            ${formatCurrency(Math.abs(row.totalBalance))}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Detailed invoice breakdown */}
                      {showDetailed && isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-4 py-3">
                              <div className="text-sm font-semibold mb-2">Invoice Details:</div>
                              {invoiceDetails.length > 0 ? (
                                <table className="w-full text-sm">
                                  <thead className="bg-muted">
                                    <tr>
                                      <th className="text-left p-2">Invoice #</th>
                                      <th className="text-left p-2">Date</th>
                                      <th className="text-left p-2">Due Date</th>
                                      <th className="text-right p-2">Amount</th>
                                      <th className="text-right p-2">Paid</th>
                                      <th className="text-right p-2">Current</th>
                                      <th className="text-right p-2">31-60</th>
                                      <th className="text-right p-2">61-90</th>
                                      <th className="text-right p-2">90+</th>
                                      <th className="text-right p-2">Balance</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {invoiceDetails.map((invoice: any) => (
                                      <tr key={invoice.invoiceId} className="border-b">
                                        <td className="p-2">{invoice.invoiceNumber}</td>
                                        <td className="p-2">{(() => {
                                          try {
                                            if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoiceDate)) {
                                              const [year, month, day] = invoice.invoiceDate.split('-').map(Number);
                                              const date = new Date(year, month - 1, day);
                                              return date.toLocaleDateString('en-US', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                year: '2-digit'
                                              });
                                            }
                                            const date = new Date(invoice.invoiceDate);
                                            return date.toLocaleDateString('en-US', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              year: '2-digit'
                                            });
                                          } catch (error) {
                                            return invoice.invoiceDate;
                                          }
                                        })()}</td>
                                        <td className="p-2">{(() => {
                                          try {
                                            if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate)) {
                                              const [year, month, day] = invoice.dueDate.split('-').map(Number);
                                              const date = new Date(year, month - 1, day);
                                              return date.toLocaleDateString('en-US', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                year: '2-digit'
                                              });
                                            }
                                            const date = new Date(invoice.dueDate);
                                            return date.toLocaleDateString('en-US', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              year: '2-digit'
                                            });
                                          } catch (error) {
                                            return invoice.dueDate;
                                          }
                                        })()}</td>
                                        <td className="text-right p-2">${formatCurrency(parseFloat(invoice.totalAmount))}</td>
                                        <td className="text-right p-2">${formatCurrency(parseFloat(invoice.paidAmount))}</td>
                                        <td className="text-right p-2">{invoice.current > 0 ? `$${formatCurrency(invoice.current)}` : '-'}</td>
                                        <td className="text-right p-2">{invoice.thirtyDays > 0 ? `$${formatCurrency(invoice.thirtyDays)}` : '-'}</td>
                                        <td className="text-right p-2">{invoice.sixtyDays > 0 ? `$${formatCurrency(invoice.sixtyDays)}` : '-'}</td>
                                        <td className="text-right p-2 text-red-600">{invoice.ninetyDays > 0 ? `$${formatCurrency(invoice.ninetyDays)}` : '-'}</td>
                                        <td className="text-right p-2 font-medium">${formatCurrency(invoice.balance)}</td>
                                      </tr>
                                    ))}
                                    {/* TOTALS row for this customer's invoices */}
                                    <tr className="border-t-2 font-bold bg-white">
                                      <td colSpan={3} className="p-2 font-bold">TOTALS</td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount), 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + parseFloat(inv.paidAmount), 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + inv.current, 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + inv.thirtyDays, 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + inv.sixtyDays, 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + inv.ninetyDays, 0))}
                                      </td>
                                      <td className="p-2 text-right font-bold">
                                        ${formatCurrency(invoiceDetails.reduce((sum: number, inv: any) => sum + inv.balance, 0))}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-sm text-muted-foreground py-2">
                                  No outstanding invoices found
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                
                {/* Totals Row */}
                <TableRow className="border-t-2 font-bold bg-gray-50">
                  {showDetailed && <TableCell></TableCell>}
                  <TableCell className="font-bold">TOTALS</TableCell>
                  <TableCell className="text-right font-bold">
                    ${formatCurrency(totals.current)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${formatCurrency(totals.thirtyDays)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${formatCurrency(totals.sixtyDays)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    ${formatCurrency(totals.ninetyDays)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    ${formatCurrency(totals.totalBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Compact Summary Line */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-center text-sm">
                <div className="flex gap-6">
                  <span className="text-green-700">
                    <strong>Current (0-30):</strong> ${formatCurrency(totals.current)} 
                    <span className="text-xs ml-1">({totals.totalBalance > 0 ? ((totals.current / totals.totalBalance) * 100).toFixed(1) : 0}%)</span>
                  </span>
                  <span className="text-yellow-700">
                    <strong>31-60:</strong> ${formatCurrency(totals.thirtyDays)}
                    <span className="text-xs ml-1">({totals.totalBalance > 0 ? ((totals.thirtyDays / totals.totalBalance) * 100).toFixed(1) : 0}%)</span>
                  </span>
                  <span className="text-orange-700">
                    <strong>61-90:</strong> ${formatCurrency(totals.sixtyDays)}
                    <span className="text-xs ml-1">({totals.totalBalance > 0 ? ((totals.sixtyDays / totals.totalBalance) * 100).toFixed(1) : 0}%)</span>
                  </span>
                  <span className="text-red-700">
                    <strong>90+:</strong> ${formatCurrency(totals.ninetyDays)}
                    <span className="text-xs ml-1">({totals.totalBalance > 0 ? ((totals.ninetyDays / totals.totalBalance) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
                <div className="text-blue-700">
                  <strong>Customers:</strong> {agingData.length} with balances
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {agingData.length === 0 && !isLoadingAging && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No outstanding balances</h3>
              <p className="text-gray-600">
                No accounts receivable found as of {new Date(asOfDate).toLocaleDateString()}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
