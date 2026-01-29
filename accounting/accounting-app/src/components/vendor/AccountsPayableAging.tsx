import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Download, FileText, Calendar, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// Helper function to format currency with commas
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

interface AccountsPayableAgingProps {
  clientId: number | null;
  asOfDate?: string;
}

interface AgingRow {
  vendorId: number;
  vendorName: string;
  current: number;      // 0-30 days
  thirtyDays: number;   // 31-60 days
  sixtyDays: number;    // 61-90 days  
  ninetyDays: number;   // 90+ days
  totalBalance: number;
}

export default function AccountsPayableAging({ clientId, asOfDate = new Date().toISOString().split('T')[0] }: AccountsPayableAgingProps) {
  const { toast } = useToast();
  const [showDetailed, setShowDetailed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch aging report data
  const { data: agingResponse, isLoading: isLoadingAging, refetch: refetchAging, error: queryError } = useQuery({
    queryKey: ['/api/crm/vendors/aging-report', clientId, asOfDate],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        const response = await apiRequest('GET', 
          `/api/crm/vendors/aging-report?clientId=${clientId}&asOfDate=${asOfDate}`
        );
        const data = await response.json();
        console.log('📊 AP Aging Report Response:', data);
        return data;
      } catch (error) {
        console.error('❌ AP Aging Report Error:', error);
        toast({
          title: "Failed to load AP aging data",
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

  // Fetch detailed bills for each vendor (when detailed view is enabled)
  const { data: detailedBills } = useQuery({
    queryKey: ['/api/bills', clientId, asOfDate],
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const response = await apiRequest('GET', `/api/bills?clientId=${clientId}`);
        const result = await response.json();
        console.log('📊 Fetched bills for detailed view:', result);
        return result.data || [];
      } catch (error) {
        console.error('Failed to fetch detailed bills:', error);
        return [];
      }
    },
    enabled: !!clientId && showDetailed,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always' // Always refetch when component mounts
  });

  const toggleRowExpansion = (vendorId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId);
    } else {
      newExpanded.add(vendorId);
    }
    setExpandedRows(newExpanded);
  };

  // Get detailed bills for a specific vendor with aging breakdown
  const getVendorBillDetails = (vendorId: number) => {
    if (!detailedBills) return [];
    
    const vendorBills = detailedBills.filter((bill: any) => bill.vendorId === vendorId);
    
    return vendorBills.map((bill: any) => {
      const billDate = new Date(bill.billDate);
      const asOfDateObj = new Date(asOfDate);
      const daysOld = Math.floor((asOfDateObj.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use balanceDue from the bill, or calculate it
      const balance = bill.balanceDue !== undefined 
        ? parseFloat(String(bill.balanceDue))
        : parseFloat(String(bill.totalAmount)) - (parseFloat(String(bill.paidAmount)) || 0);
      
      // Skip future-dated bills (negative aging)
      if (daysOld < 0) {
        console.log(`⏭️  Skipping future-dated bill ${bill.billNumber}: date=${bill.billDate}, asOf=${asOfDate}`);
        return null;
      }
      
      // Distribute balance into aging buckets based on bill age (not due date!)
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
        billId: bill.id,
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        totalAmount: parseFloat(String(bill.totalAmount)),
        paidAmount: parseFloat(String(bill.paidAmount)) || 0,
        balance,
        daysOld,
        current,
        thirtyDays,
        sixtyDays,
        ninetyDays
      };
    }).filter((bill: any) => bill !== null && bill.balance > 0);
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
      const worksheet = workbook.addWorksheet('AP Aging Report');

      // Add title
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Accounts Payable Aging Report';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };

      // Add date
      worksheet.mergeCells('A2:F2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `As of ${new Date(asOfDate).toLocaleDateString()}`;
      dateCell.alignment = { horizontal: 'center' };

      // Add headers
      const headers = ['Vendor', 'Current (0-30)', '31-60 Days', '61-90 Days', '90+ Days', 'Total Balance'];
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
          row.vendorName,
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
      a.download = `accounts_payable_aging_${asOfDate}.xlsx`;
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
        data: agingData
      });

      // Handle blob response for PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_payable_aging_${asOfDate}.pdf`;
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
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-gray-600">Choose a client to generate accounts payable aging report</p>
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
                Accounts Payable Aging Report
              </CardTitle>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="button-export-excel">
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
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Current (0-30)</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((row: AgingRow) => {
                  const isExpanded = expandedRows.has(row.vendorId);
                  const billDetails = showDetailed ? getVendorBillDetails(row.vendorId) : [];
                  
                  return (
                    <>
                      <TableRow 
                        key={row.vendorId}
                        className={showDetailed ? "cursor-pointer hover:bg-gray-50" : ""}
                        onClick={() => showDetailed && toggleRowExpansion(row.vendorId)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {showDetailed && billDetails.length > 0 && (
                              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            )}
                            {row.vendorName}
                          </div>
                        </TableCell>
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
                          <span className={row.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            ${formatCurrency(Math.abs(row.totalBalance))}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Detail Row */}
                      {showDetailed && isExpanded && billDetails.length > 0 && (
                        <TableRow key={`${row.vendorId}-details`}>
                          <TableCell colSpan={6} className="bg-gray-50 p-0">
                            <div className="p-4">
                              <h4 className="font-semibold mb-3 text-sm">Individual Bills for {row.vendorName}</h4>
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="border-b bg-white">
                                    <th className="text-left p-2 font-medium">Bill #</th>
                                    <th className="text-left p-2 font-medium">Bill Date</th>
                                    <th className="text-left p-2 font-medium">Due Date</th>
                                    <th className="text-right p-2 font-medium">Amount</th>
                                    <th className="text-right p-2 font-medium">Paid</th>
                                    <th className="text-right p-2 font-medium">Balance</th>
                                    <th className="text-right p-2 font-medium">Age</th>
                                    <th className="text-right p-2 font-medium">Current</th>
                                    <th className="text-right p-2 font-medium">31-60</th>
                                    <th className="text-right p-2 font-medium">61-90</th>
                                    <th className="text-right p-2 font-medium">90+</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {billDetails.map((bill: any) => (
                                    <tr key={bill.billId} className="border-b">
                                      <td className="p-2">{bill.billNumber}</td>
                                      <td className="p-2">{(() => {
                                        try {
                                          if (/^\d{4}-\d{2}-\d{2}$/.test(bill.billDate)) {
                                            const [year, month, day] = bill.billDate.split('-').map(Number);
                                            const date = new Date(year, month - 1, day);
                                            return date.toLocaleDateString('en-US', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              year: '2-digit'
                                            });
                                          }
                                          const date = new Date(bill.billDate);
                                          return date.toLocaleDateString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: '2-digit'
                                          });
                                        } catch (error) {
                                          return bill.billDate;
                                        }
                                      })()}</td>
                                      <td className="p-2">{(() => {
                                        try {
                                          if (/^\d{4}-\d{2}-\d{2}$/.test(bill.dueDate)) {
                                            const [year, month, day] = bill.dueDate.split('-').map(Number);
                                            const date = new Date(year, month - 1, day);
                                            return date.toLocaleDateString('en-US', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              year: '2-digit'
                                            });
                                          }
                                          const date = new Date(bill.dueDate);
                                          return date.toLocaleDateString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: '2-digit'
                                          });
                                        } catch (error) {
                                          return bill.dueDate;
                                        }
                                      })()}</td>
                                      <td className="p-2 text-right">${formatCurrency(bill.totalAmount)}</td>
                                      <td className="p-2 text-right">${formatCurrency(bill.paidAmount)}</td>
                                      <td className="p-2 text-right font-medium">${formatCurrency(bill.balance)}</td>
                                      <td className="p-2 text-right">{bill.daysOld} days</td>
                                      <td className="p-2 text-right">
                                        {bill.current > 0 ? `$${formatCurrency(bill.current)}` : '-'}
                                      </td>
                                      <td className="p-2 text-right">
                                        {bill.thirtyDays > 0 ? `$${formatCurrency(bill.thirtyDays)}` : '-'}
                                      </td>
                                      <td className="p-2 text-right">
                                        {bill.sixtyDays > 0 ? `$${formatCurrency(bill.sixtyDays)}` : '-'}
                                      </td>
                                      <td className="p-2 text-right">
                                        {bill.ninetyDays > 0 ? 
                                          <span className="text-red-600">${formatCurrency(bill.ninetyDays)}</span> 
                                          : '-'
                                        }
                                      </td>
                                    </tr>
                                  ))}
                                  {/* TOTALS row for this vendor's bills */}
                                  <tr className="border-t-2 font-bold bg-white">
                                    <td colSpan={3} className="p-2 font-bold">TOTALS</td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.totalAmount, 0))}
                                    </td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.paidAmount, 0))}
                                    </td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.balance, 0))}
                                    </td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.current, 0))}
                                    </td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.thirtyDays, 0))}
                                    </td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.sixtyDays, 0))}
                                    </td>
                                    <td className="p-2 text-right font-bold">
                                      ${formatCurrency(billDetails.reduce((sum: number, b: any) => sum + b.ninetyDays, 0))}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                
                {/* Totals Row */}
                <TableRow className="border-t-2 font-bold bg-gray-50">
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
                  <TableCell className="text-right font-bold text-red-600">
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
                  <strong>Vendors:</strong> {agingData.length} with balances
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
                No accounts payable found as of {new Date(asOfDate).toLocaleDateString()}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}