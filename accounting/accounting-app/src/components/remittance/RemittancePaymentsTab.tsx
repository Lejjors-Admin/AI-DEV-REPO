/**
 * REMITTANCE PAYMENTS TAB COMPONENT
 * 
 * Payment recording system with forms, validation, and bulk payment entry
 * for Canadian tax remittances
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  CreditCard, 
  Receipt, 
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RemittanceSchedule } from "@/lib/types";
import { RemittanceStatusBadge } from "./RemittanceStatusBadge";

// Payment form schema
const paymentFormSchema = z.object({
  scheduleId: z.number().min(1, "Remittance schedule is required"),
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid amount format").transform(val => parseFloat(val)),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["check", "eft", "online_banking", "wire_transfer"]),
  referenceNumber: z.string().min(1, "Reference number is required"),
  confirmationNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Bulk payment form schema
const bulkPaymentSchema = z.object({
  payments: z.array(z.object({
    scheduleId: z.number(),
    selected: z.boolean(),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    referenceNumber: z.string().min(1, "Reference number required"),
    taxType: z.string().optional(),
    dueDate: z.date().optional(),
    status: z.string().optional(),
  })).refine(data => data.some(p => p.selected), "Select at least one payment"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["check", "eft", "online_banking", "wire_transfer"]),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;
type BulkPaymentData = z.infer<typeof bulkPaymentSchema>;

interface RemittancePaymentsTabProps {
  clientId: number | null;
  remittanceSchedules: RemittanceSchedule[];
  onPaymentRecorded: () => void;
}

export default function RemittancePaymentsTab({
  clientId,
  remittanceSchedules,
  onPaymentRecorded
}: RemittancePaymentsTabProps) {
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false);
  const [selectedScheduleForPayment, setSelectedScheduleForPayment] = useState<RemittanceSchedule | null>(null);

  // Payment form
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      scheduleId: 0,
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "eft",
      referenceNumber: "",
      confirmationNumber: "",
      notes: "",
    }
  });

  // Bulk payment form
  const bulkPaymentForm = useForm<BulkPaymentData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      payments: [],
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "eft",
      notes: "",
    }
  });

  // Get all schedules for payment recording
  // Note: RemittanceSchedules don't have status, they are rule templates
  const unpaidSchedules = remittanceSchedules;

  // Set up bulk payments list
  const initializeBulkPayments = () => {
    const payments = unpaidSchedules.map(schedule => ({
      scheduleId: schedule.id,
      selected: false,
      amount: 0, // RemittanceSchedules don't have amounts, these are rule templates
      referenceNumber: "",
      taxType: schedule.type,
      dueDate: new Date(), // RemittanceSchedules don't have dueDates, they have rules
      status: 'pending' as const // RemittanceSchedules don't have status
    }));
    bulkPaymentForm.setValue('payments', payments);
  };

  // Record single payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      const response = await apiRequest('POST', '/api/tax/remittance/payments', {
        clientId,
        ...paymentData
      });
      if (!response.ok) {
        throw new Error('Failed to record payment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Tax remittance payment has been recorded successfully.",
      });
      paymentForm.reset();
      setShowPaymentDialog(false);
      setSelectedScheduleForPayment(null);
      onPaymentRecorded();
      queryClient.invalidateQueries({ queryKey: ["tax-remittances"] });
      queryClient.invalidateQueries({ queryKey: ["tax-payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Recording Payment",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  });

  // Record bulk payments mutation
  const recordBulkPaymentsMutation = useMutation({
    mutationFn: async (bulkData: BulkPaymentData) => {
      const selectedPayments = bulkData.payments.filter(p => p.selected);
      const response = await apiRequest('POST', '/api/tax/remittance/payments/bulk', {
        clientId,
        payments: selectedPayments,
        paymentDate: bulkData.paymentDate,
        paymentMethod: bulkData.paymentMethod,
        notes: bulkData.notes,
      });
      if (!response.ok) {
        throw new Error('Failed to record bulk payments');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const recordedCount = data.recordedCount || 0;
      toast({
        title: "Bulk Payments Recorded",
        description: `Successfully recorded ${recordedCount} tax remittance payments.`,
      });
      bulkPaymentForm.reset();
      setShowBulkPaymentDialog(false);
      onPaymentRecorded();
      queryClient.invalidateQueries({ queryKey: ["tax-remittances"] });
      queryClient.invalidateQueries({ queryKey: ["tax-payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Recording Bulk Payments",
        description: error.message || "Failed to record bulk payments",
        variant: "destructive",
      });
    }
  });

  // Open payment dialog for specific schedule
  const openPaymentDialog = (schedule: RemittanceSchedule) => {
    setSelectedScheduleForPayment(schedule);
    paymentForm.setValue('scheduleId', schedule.id);
    paymentForm.setValue('amount', 0); // RemittanceSchedule doesn't have amount
    setShowPaymentDialog(true);
  };

  // Open bulk payment dialog
  const openBulkPaymentDialog = () => {
    initializeBulkPayments();
    setShowBulkPaymentDialog(true);
  };

  // Handle payment form submission
  const handlePaymentSubmit = (data: PaymentFormData) => {
    recordPaymentMutation.mutate(data);
  };

  // Handle bulk payment form submission
  const handleBulkPaymentSubmit = (data: BulkPaymentData) => {
    recordBulkPaymentsMutation.mutate(data);
  };

  // Payment method options
  const paymentMethods = [
    { value: "eft", label: "Electronic Funds Transfer (EFT)" },
    { value: "online_banking", label: "Online Banking" },
    { value: "check", label: "Cheque" },
    { value: "wire_transfer", label: "Wire Transfer" },
  ];

  const totalOutstandingAmount = unpaidSchedules.reduce(
    (sum, schedule) => sum + parseFloat(schedule.amount.toString()), 0
  );

  return (
    <div className="space-y-6" data-testid="remittance-payments-tab">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Record Payments</h2>
          <p className="text-muted-foreground">
            Record tax remittance payments with proper validation and tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={openBulkPaymentDialog}
            disabled={unpaidSchedules.length === 0}
            className="flex items-center gap-2"
            data-testid="button-bulk-payment"
          >
            <Receipt className="h-4 w-4" />
            Bulk Payment
          </Button>
          
          <Button
            onClick={() => setShowPaymentDialog(true)}
            disabled={unpaidSchedules.length === 0}
            className="flex items-center gap-2"
            data-testid="button-record-payment"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Outstanding Payments Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="payments-summary">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Outstanding Payments</CardDescription>
            <CardTitle className="text-2xl">{unpaidSchedules.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Requiring payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Outstanding</CardDescription>
            <CardTitle className="text-2xl">${totalOutstandingAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all tax types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overdue Amount</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              ${unpaidSchedules
                .filter(s => s.status === 'overdue')
                .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0)
                .toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {unpaidSchedules.filter(s => s.status === 'overdue').length} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments List */}
      <Card data-testid="outstanding-payments-list">
        <CardHeader>
          <CardTitle>Outstanding Payments</CardTitle>
          <CardDescription>
            Tax remittances requiring payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidSchedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidSchedules.map((schedule, index) => (
                  <TableRow key={schedule.id} data-testid={`outstanding-payment-${index}`}>
                    <TableCell className="font-medium">
                      {schedule.taxType?.toUpperCase() || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(schedule.dueDate).toLocaleDateString()}
                      {schedule.status === 'overdue' && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(schedule.amount.toString()).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <RemittanceStatusBadge status={schedule.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-view-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(schedule)}
                          data-testid={`button-pay-${index}`}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">All Payments Current</h3>
              <p>No outstanding tax remittance payments at this time.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md" data-testid="payment-dialog">
          <DialogHeader>
            <DialogTitle>Record Tax Remittance Payment</DialogTitle>
            <DialogDescription>
              {selectedScheduleForPayment && 
                `Record payment for ${selectedScheduleForPayment.taxType?.toUpperCase()} remittance`
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
              {!selectedScheduleForPayment && (
                <FormField
                  control={paymentForm.control}
                  name="scheduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Remittance</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger data-testid="select-remittance">
                            <SelectValue placeholder="Select remittance to pay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unpaidSchedules.map(schedule => (
                            <SelectItem key={schedule.id} value={schedule.id.toString()}>
                              {schedule.taxType?.toUpperCase()} - ${parseFloat(schedule.amount.toString()).toLocaleString()} 
                              (Due: {new Date(schedule.dueDate).toLocaleDateString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-payment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-payment-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Transaction ref. #"
                          {...field}
                          data-testid="input-reference-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="confirmationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmation Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bank confirmation #"
                          {...field}
                          data-testid="input-confirmation-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional payment notes..."
                        {...field}
                        data-testid="textarea-payment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Dialog */}
      <Dialog open={showBulkPaymentDialog} onOpenChange={setShowBulkPaymentDialog}>
        <DialogContent className="sm:max-w-4xl" data-testid="bulk-payment-dialog">
          <DialogHeader>
            <DialogTitle>Bulk Payment Entry</DialogTitle>
            <DialogDescription>
              Record multiple tax remittance payments at once
            </DialogDescription>
          </DialogHeader>

          <Form {...bulkPaymentForm}>
            <form onSubmit={bulkPaymentForm.handleSubmit(handleBulkPaymentSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={bulkPaymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-bulk-payment-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bulkPaymentForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bulk-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const payments = bulkPaymentForm.getValues('payments');
                      const allSelected = payments.every(p => p.selected);
                      const updatedPayments = payments.map(p => ({ ...p, selected: !allSelected }));
                      bulkPaymentForm.setValue('payments', updatedPayments);
                    }}
                    data-testid="button-toggle-all-payments"
                  >
                    Toggle All
                  </Button>
                </div>
              </div>

              {/* Payment Selection Table */}
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkPaymentForm.watch('payments')?.map((payment, index) => (
                      <TableRow key={payment.scheduleId}>
                        <TableCell>
                          <Checkbox
                            checked={payment.selected}
                            onCheckedChange={(checked) => {
                              const payments = bulkPaymentForm.getValues('payments');
                              payments[index].selected = !!checked;
                              bulkPaymentForm.setValue('payments', payments);
                            }}
                            data-testid={`checkbox-bulk-payment-${index}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.taxType?.toUpperCase() || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(payment.dueDate || new Date()).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <RemittanceStatusBadge status={payment.status as any || 'pending'} size="sm" />
                        </TableCell>
                        <TableCell>
                          <Input
                            size="sm"
                            placeholder="Ref. #"
                            value={payment.referenceNumber}
                            onChange={(e) => {
                              const payments = bulkPaymentForm.getValues('payments');
                              payments[index].referenceNumber = e.target.value;
                              bulkPaymentForm.setValue('payments', payments);
                            }}
                            disabled={!payment.selected}
                            data-testid={`input-bulk-ref-${index}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <FormField
                control={bulkPaymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Bulk payment notes..."
                        {...field}
                        data-testid="textarea-bulk-payment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkPaymentDialog(false)}
                  data-testid="button-cancel-bulk-payment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordBulkPaymentsMutation.isPending}
                  data-testid="button-submit-bulk-payment"
                >
                  {recordBulkPaymentsMutation.isPending 
                    ? "Recording Payments..." 
                    : `Record ${bulkPaymentForm.watch('payments')?.filter(p => p.selected).length || 0} Payments`
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}