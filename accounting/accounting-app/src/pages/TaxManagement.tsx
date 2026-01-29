import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, Calendar, Calculator, AlertTriangle, TrendingUp, Eye, Edit, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Tax transaction schema with double-entry accounting
const taxTransactionSchema = z.object({
  taxType: z.enum(["income_tax", "sales_tax", "payroll_tax", "property_tax", "estimated_tax", "penalty_interest", "other_tax"]),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  filingDate: z.string().optional(),
  taxPeriod: z.string().min(1, "Tax period is required"),
  
  // Tax-specific fields
  taxRate: z.string().optional(),
  taxableAmount: z.string().optional(),
  jurisdiction: z.enum(["federal", "state", "local", "provincial"]),
  
  // Chart of Accounts Integration
  taxExpenseAccountId: z.number().min(1, "Tax expense account is required"),
  taxPayableAccountId: z.number().min(1, "Tax payable account is required"),
  cashAccountId: z.number().optional(), // For payments
  
  // Payment information
  isPaid: z.boolean().default(false),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["check", "eft", "credit_card", "online", "cash"]).optional(),
  confirmationNumber: z.string().optional(),
  
  notes: z.string().optional(),
  reference: z.string().optional(),
});

type TaxTransaction = z.infer<typeof taxTransactionSchema>;

export default function TaxManagement() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch accounts for double-entry transactions
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["/api/accounts", selectedClientId],
    enabled: !!selectedClientId,
  });

  // Get account types for dropdowns
  const expenseAccounts = accounts?.filter((account: any) => account.type === "expense");
  const assetAccounts = accounts?.filter((account: any) => account.type === "asset");
  const liabilityAccounts = accounts?.filter((account: any) => account.type === "liability");

  const form = useForm<TaxTransaction>({
    resolver: zodResolver(taxTransactionSchema),
    defaultValues: {
      taxType: "income_tax",
      description: "",
      amount: "",
      dueDate: "",
      taxPeriod: "",
      jurisdiction: "federal",
      isPaid: false,
    },
  });

  // Create tax transaction with double-entry accounting
  const createTaxMutation = useMutation({
    mutationFn: async (data: TaxTransaction) => {
      const journalEntries = [];
      const amount = parseFloat(data.amount);

      if (data.isPaid && data.paymentDate && data.cashAccountId) {
        // Tax payment entry: Debit Tax Payable, Credit Cash
        journalEntries.push({
          type: "journal",
          description: `Tax payment - ${data.description}`,
          date: data.paymentDate,
          reference: data.confirmationNumber || data.reference,
          items: [
            {
              accountId: data.taxPayableAccountId,
              description: `Tax payment - ${data.taxType} - ${data.taxPeriod}`,
              amount: amount.toString(),
              isDebit: true,
            },
            {
              accountId: data.cashAccountId,
              description: `Tax payment - ${data.paymentMethod || 'electronic'}`,
              amount: amount.toString(),
              isDebit: false,
            }
          ]
        });
      } else {
        // Tax accrual entry: Debit Tax Expense, Credit Tax Payable
        journalEntries.push({
          type: "journal",
          description: `Tax accrual - ${data.description}`,
          date: data.filingDate || data.dueDate,
          reference: data.reference,
          items: [
            {
              accountId: data.taxExpenseAccountId,
              description: `${data.taxType} expense - ${data.taxPeriod}`,
              amount: amount.toString(),
              isDebit: true,
            },
            {
              accountId: data.taxPayableAccountId,
              description: `${data.taxType} payable - ${data.taxPeriod}`,
              amount: amount.toString(),
              isDebit: false,
            }
          ]
        });
      }

      // Create the journal entries
      const response = await apiRequest("POST", "/api/transactions/import", {
        clientId: selectedClientId,
        transactions: journalEntries,
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tax Transaction Recorded",
        description: "Tax transaction recorded with proper double-entry accounting",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tax-transactions", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", selectedClientId] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record tax transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaxTransaction) => {
    createTaxMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Manage tax obligations with double-entry accounting</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record Tax
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Tax Transaction</DialogTitle>
              <DialogDescription>
                Create a new tax entry with automatic double-entry accounting
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="income_tax">Income Tax</SelectItem>
                            <SelectItem value="sales_tax">Sales Tax</SelectItem>
                            <SelectItem value="payroll_tax">Payroll Tax</SelectItem>
                            <SelectItem value="property_tax">Property Tax</SelectItem>
                            <SelectItem value="estimated_tax">Estimated Tax</SelectItem>
                            <SelectItem value="penalty_interest">Penalty & Interest</SelectItem>
                            <SelectItem value="other_tax">Other Tax</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jurisdiction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jurisdiction</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select jurisdiction" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="federal">Federal</SelectItem>
                            <SelectItem value="state">State</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                            <SelectItem value="provincial">Provincial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Q4 2023 Income Tax" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Amount *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Period *</FormLabel>
                        <FormControl>
                          <Input placeholder="Q4 2023" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxExpenseAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Expense Account *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select expense account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxPayableAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Payable Account *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payable account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {liabilityAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPaid"
                      checked={form.watch("isPaid")}
                      onChange={(e) => form.setValue("isPaid", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isPaid">Mark as paid</Label>
                  </div>

                  {form.watch("isPaid") && (
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="eft">Electronic Transfer</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                <SelectItem value="online">Online Payment</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cashAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Account</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cash account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assetAccounts.map((account: any) => (
                                  <SelectItem key={account.id} value={account.id.toString()}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional tax notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaxMutation.isPending}>
                    {createTaxMutation.isPending ? "Recording..." : "Record Tax"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income Tax</TabsTrigger>
          <TabsTrigger value="sales">Sales Tax</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Tax</TabsTrigger>
          <TabsTrigger value="calendar">Tax Calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tax Liability</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$23,450.00</div>
                <p className="text-xs text-muted-foreground">Current period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Taxes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">$3,200.00</div>
                <p className="text-xs text-muted-foreground">3 items overdue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Due</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$5,750.00</div>
                <p className="text-xs text-muted-foreground">Due in 5 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Tax Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28.5%</div>
                <p className="text-xs text-muted-foreground">Effective rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tax Obligations</CardTitle>
              <CardDescription>
                Current tax liabilities and upcoming due dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: "Income Tax", period: "Q4 2023", amount: "$8,500.00", dueDate: "2024-01-15", status: "Overdue", jurisdiction: "Federal" },
                  { type: "Sales Tax", period: "December 2023", amount: "$1,250.00", dueDate: "2024-01-20", status: "Due Soon", jurisdiction: "State" },
                  { type: "Payroll Tax", period: "Q4 2023", amount: "$3,750.00", dueDate: "2024-01-31", status: "Pending", jurisdiction: "Federal" },
                  { type: "Property Tax", period: "Annual 2023", amount: "$2,100.00", dueDate: "2024-02-01", status: "Pending", jurisdiction: "Local" },
                ].map((tax, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <p className="font-medium">{tax.type} - {tax.period}</p>
                        <p className="text-sm text-muted-foreground">{tax.jurisdiction} • Due: {tax.dueDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={tax.status === "Overdue" ? "destructive" : tax.status === "Due Soon" ? "default" : "secondary"}>
                        {tax.status}
                      </Badge>
                      <p className="font-medium">{tax.amount}</p>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Income Tax Management</CardTitle>
              <CardDescription>
                Federal and state income tax calculations and payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Federal Income Tax</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$15,750.00</div>
                      <p className="text-sm text-muted-foreground">Current year liability</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">State Income Tax</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$4,250.00</div>
                      <p className="text-sm text-muted-foreground">Current year liability</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Estimated Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$12,000.00</div>
                      <p className="text-sm text-muted-foreground">Paid to date</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Tax Management</CardTitle>
              <CardDescription>
                Sales tax collection, reporting, and remittance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sales tax management interface will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Tax Management</CardTitle>
              <CardDescription>
                Payroll tax withholdings and employer contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Payroll tax management interface will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calendar</CardTitle>
              <CardDescription>
                Important tax deadlines and filing dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: "Jan 15", description: "Q4 Individual Estimated Tax Payment", type: "Federal" },
                  { date: "Jan 31", description: "Form 940 & 941 Due", type: "Payroll" },
                  { date: "Feb 28", description: "Form W-2 Distribution Deadline", type: "Payroll" },
                  { date: "Mar 15", description: "Corporate Tax Return Due", type: "Federal" },
                  { date: "Apr 15", description: "Individual Tax Return Due", type: "Federal" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 text-center">
                        <p className="font-semibold">{item.date}</p>
                      </div>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.type}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Tax Reports</CardTitle>
              <CardDescription>
                Generate tax reports and export data for filing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Annual Tax Summary", description: "Complete tax summary for the year" },
                  { name: "Quarterly Tax Report", description: "Quarterly tax obligations and payments" },
                  { name: "Sales Tax Report", description: "Sales tax collected and remitted" },
                  { name: "Payroll Tax Report", description: "Payroll tax withholdings and contributions" },
                ].map((report, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{report.name}</CardTitle>
                      <CardDescription className="text-sm">{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}