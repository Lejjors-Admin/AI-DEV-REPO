/**
 * REMITTANCE HISTORY TAB COMPONENT
 * 
 * Complete payment audit trail with search, filter, and export functionality
 * for Canadian tax remittance tracking
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  Search, 
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  Receipt,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Remittance } from "@/lib/types";

interface RemittanceHistoryTabProps {
  clientId: number | null;
  remittancePayments: Remittance[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export default function RemittanceHistoryTab({
  clientId,
  remittancePayments,
  selectedYear,
  onYearChange
}: RemittanceHistoryTabProps) {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTaxType, setFilterTaxType] = useState("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "type" | "taxType">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<Remittance | null>(null);

  // Fetch additional payment history if needed
  const { data: extendedHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["remittance-history", clientId, selectedYear],
    enabled: !!clientId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tax/remittance/history/${clientId}?year=${selectedYear}`);
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = remittancePayments.filter(payment => {
      // Year filter
      const paymentYear = new Date(payment.paymentDate).getFullYear();
      if (paymentYear !== selectedYear) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!payment.type?.toLowerCase().includes(searchLower) &&
            !payment.referenceNumber?.toLowerCase().includes(searchLower) &&
            !payment.confirmationNumber?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Tax type filter
      if (filterTaxType !== "all" && payment.type !== filterTaxType) return false;

      // Payment method filter
      if (filterPaymentMethod !== "all" && payment.paymentMethod !== filterPaymentMethod) return false;

      // Date range filter
      if (filterDateRange !== "all") {
        const paymentDate = new Date(payment.paymentDate);
        const today = new Date();
        switch (filterDateRange) {
          case "last_30":
            if (paymentDate < new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
            break;
          case "last_90":
            if (paymentDate < new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)) return false;
            break;
          case "last_year":
            if (paymentDate < new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())) return false;
            break;
        }
      }

      return true;
    });

    // Sort payments
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "date":
          aValue = new Date(a.paymentDate);
          bValue = new Date(b.paymentDate);
          break;
        case "amount":
          aValue = parseFloat(a.paidAmount.toString());
          bValue = parseFloat(b.paidAmount.toString());
          break;
        case "type":
          aValue = a.type || "";
          bValue = b.type || "";
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [remittancePayments, selectedYear, searchTerm, filterTaxType, filterPaymentMethod, filterDateRange, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPayments.length / itemsPerPage);
  const paginatedPayments = filteredAndSortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalAmount = filteredAndSortedPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.paidAmount.toString()), 0
    );
    
    const paymentsByType = filteredAndSortedPayments.reduce((acc, payment) => {
      const type = payment.type || 'unknown';
      acc[type] = (acc[type] || 0) + parseFloat(payment.paidAmount.toString());
      return acc;
    }, {} as Record<string, number>);

    const paymentsByMonth = filteredAndSortedPayments.reduce((acc, payment) => {
      const month = new Date(payment.paidDate).getMonth();
      acc[month] = (acc[month] || 0) + parseFloat(payment.paidAmount.toString());
      return acc;
    }, {} as Record<number, number>);

    return {
      totalAmount,
      totalCount: filteredAndSortedPayments.length,
      paymentsByType,
      paymentsByMonth
    };
  }, [filteredAndSortedPayments]);

  // Export functionality
  const exportPaymentsMutation = useMutation({
    mutationFn: async ({ format, payments }: { format: string, payments: Remittance[] }) => {
      const response = await apiRequest('POST', '/api/tax/remittance/export', {
        clientId,
        format,
        payments: payments.map(p => p.id),
        filters: {
          year: selectedYear,
          type: filterTaxType,
          paymentMethod: filterPaymentMethod,
          searchTerm
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      return response.blob();
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remittance-history-${selectedYear}.${variables.format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Payment history exported as ${variables.format.toUpperCase()}`,
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Unable to export payment history",
        variant: "destructive",
      });
    }
  });

  // Handle export
  const handleExport = (format: string) => {
    const paymentsToExport = selectedPayments.size > 0 
      ? filteredAndSortedPayments.filter(p => selectedPayments.has(p.id))
      : filteredAndSortedPayments;
    
    exportPaymentsMutation.mutate({ format, payments: paymentsToExport });
  };

  // Toggle payment selection
  const togglePaymentSelection = (paymentId: number) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  // Select all payments on current page
  const toggleSelectAll = () => {
    const newSelected = new Set(selectedPayments);
    const allCurrentSelected = paginatedPayments.every(p => selectedPayments.has(p.id));
    
    if (allCurrentSelected) {
      paginatedPayments.forEach(p => newSelected.delete(p.id));
    } else {
      paginatedPayments.forEach(p => newSelected.add(p.id));
    }
    
    setSelectedPayments(newSelected);
  };

  // Filter options
  const taxTypeOptions = [
    { value: "all", label: "All Tax Types" },
    { value: "cpp", label: "CPP" },
    { value: "ei", label: "EI" },
    { value: "income_tax", label: "Income Tax" },
    { value: "gst_hst", label: "GST/HST" }
  ];

  const paymentMethodOptions = [
    { value: "all", label: "All Methods" },
    { value: "eft", label: "EFT" },
    { value: "online_banking", label: "Online Banking" },
    { value: "check", label: "Cheque" },
    { value: "wire_transfer", label: "Wire Transfer" }
  ];

  const dateRangeOptions = [
    { value: "all", label: "All Time" },
    { value: "last_30", label: "Last 30 Days" },
    { value: "last_90", label: "Last 90 Days" },
    { value: "last_year", label: "Last Year" }
  ];

  return (
    <div className="space-y-6" data-testid="remittance-history-tab">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Payment History
          </h2>
          <p className="text-muted-foreground">
            Complete audit trail of tax remittance payments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={exportPaymentsMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-export-pdf"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleExport("excel")}
            disabled={exportPaymentsMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" data-testid="history-summary">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Payments</CardDescription>
            <CardTitle className="text-2xl">{summaryStats.totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-2xl">${summaryStats.totalAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all tax types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Payment</CardDescription>
            <CardTitle className="text-2xl">
              ${summaryStats.totalCount > 0 
                ? Math.round(summaryStats.totalAmount / summaryStats.totalCount).toLocaleString()
                : '0'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Per remittance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Selected for Export</CardDescription>
            <CardTitle className="text-2xl">{selectedPayments.size}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Payments selected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card data-testid="history-filters">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
                <SelectTrigger data-testid="select-history-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2023, 2022, 2021, 2020].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tax Type</Label>
              <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                <SelectTrigger data-testid="filter-history-tax-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger data-testid="filter-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger data-testid="filter-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reference numbers, confirmations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-payments"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card data-testid="payment-history-table">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                data-testid="button-select-all-payments"
              >
                {paginatedPayments.length > 0 && paginatedPayments.every(p => selectedPayments.has(p.id)) ? 
                  "Deselect All" : "Select All"}
              </Button>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            Showing {paginatedPayments.length} of {filteredAndSortedPayments.length} payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedPayments.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={paginatedPayments.length > 0 && paginatedPayments.every(p => selectedPayments.has(p.id))}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => {
                        setSortBy("date");
                        setSortOrder(sortBy === "date" && sortOrder === "desc" ? "asc" : "desc");
                      }}
                    >
                      Date <ArrowUpDown className="h-4 w-4 inline ml-1" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => {
                        setSortBy("taxType");
                        setSortOrder(sortBy === "taxType" && sortOrder === "desc" ? "asc" : "desc");
                      }}
                    >
                      Tax Type <ArrowUpDown className="h-4 w-4 inline ml-1" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => {
                        setSortBy("amount");
                        setSortOrder(sortBy === "amount" && sortOrder === "desc" ? "asc" : "desc");
                      }}
                    >
                      Amount <ArrowUpDown className="h-4 w-4 inline ml-1" />
                    </TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment, index) => (
                    <TableRow 
                      key={payment.id} 
                      className={selectedPayments.has(payment.id) ? "bg-muted/50" : ""}
                      data-testid={`payment-history-row-${index}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.has(payment.id)}
                          onCheckedChange={() => togglePaymentSelection(payment.id)}
                          data-testid={`checkbox-payment-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.taxType?.toUpperCase() || 'N/A'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(payment.amount.toString()).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payment.paymentMethod?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.referenceNumber || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Processed
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPaymentDetail(payment);
                            setShowPaymentDetail(true);
                          }}
                          data-testid={`button-view-payment-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredAndSortedPayments.length} total payments)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
              <p>No tax remittance payments found matching your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={showPaymentDetail} onOpenChange={setShowPaymentDetail}>
        <DialogContent className="sm:max-w-lg" data-testid="payment-detail-dialog">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {selectedPaymentDetail && 
                `${selectedPaymentDetail.taxType?.toUpperCase()} payment made on ${new Date(selectedPaymentDetail.paymentDate).toLocaleDateString()}`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedPaymentDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Tax Type</Label>
                  <div className="font-semibold">{selectedPaymentDetail.taxType?.toUpperCase()}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <div className="font-semibold text-lg">
                    ${parseFloat(selectedPaymentDetail.amount.toString()).toLocaleString()}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Payment Date</Label>
                  <div>{new Date(selectedPaymentDetail.paymentDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Payment Method</Label>
                  <div className="capitalize">
                    {selectedPaymentDetail.paymentMethod?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Reference Number</Label>
                  <div className="font-mono text-sm">
                    {selectedPaymentDetail.referenceNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Confirmation Number</Label>
                  <div className="font-mono text-sm">
                    {selectedPaymentDetail.confirmationNumber || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedPaymentDetail.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm text-muted-foreground">Notes</Label>
                    <div className="text-sm mt-1">{selectedPaymentDetail.notes}</div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDetail(false)}
                  data-testid="button-close-payment-detail"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}