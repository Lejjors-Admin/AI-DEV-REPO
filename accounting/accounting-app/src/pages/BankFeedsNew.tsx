import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { PlaidLink } from "@/components/PlaidLink";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientSelector } from "@/components/ClientSelector";

// Form schema for connecting bank accounts
const bankFeedSchema = z.object({
  clientId: z.number().positive(),
  linkedAccountId: z.number().positive("Please select a bank account"),
  name: z.string().min(1, "Name is required"),
  institutionName: z.string().min(1, "Institution name is required"),
  accountNumber: z.string().optional(),
  feedType: z.enum(["manual", "api", "plaid", "qbo"]).default("plaid"),
});

type BankFeedFormValues = z.infer<typeof bankFeedSchema>;

export default function BankFeeds() {
  const [clientId, setClientId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // Form setup
  const form = useForm<BankFeedFormValues>({
    resolver: zodResolver(bankFeedSchema),
    defaultValues: {
      clientId: clientId || 0,
      feedType: "plaid",
      name: "",
      institutionName: "",
      accountNumber: "",
    },
  });

  // Update clientId when it changes
  useEffect(() => {
    if (clientId) {
      form.setValue("clientId", clientId);
    }
  }, [clientId, form]);

  // Query bank accounts
  const bankAccountsQuery = useQuery<any>({
    queryKey: ["/api/accounts", clientId],
    enabled: !!clientId,
  });

  // Get bank accounts that can be linked (asset accounts with bank subtype)
  const bankAccounts = bankAccountsQuery.data?.accounts
    ? bankAccountsQuery.data.accounts.filter(
        (account: any) => account.type === "asset" && 
        (account.subtype === "bank" || account.subtype === "banklink")
      )
    : [];

  // Query bank feeds
  const bankFeeds = useQuery<any>({
    queryKey: ["/api/bank-feeds", clientId],
    enabled: !!clientId,
  });

  // Create bank feed mutation
  const createBankFeed = useMutation({
    mutationFn: async (data: BankFeedFormValues) => {
      const response = await apiRequest("POST", "/api/bank-feeds", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank feed created",
        description: "The bank feed has been created successfully",
      });
      setOpenCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create bank feed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: BankFeedFormValues) => {
    createBankFeed.mutate(data);
  };

  // Plaid API availability - using import.meta.env for client-side
  const plaidEnabled = true; // We'll assume Plaid is available since the secrets exist on the server

  return (
    <div className="container mx-auto py-6">
      {/* Header with Client Selector and Connect Button */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Feeds</h2>
          <p className="text-muted-foreground">
            Connect your bank accounts for automatic transaction import
          </p>
        </div>
        <div className="flex gap-2">
          <ClientSelector updateClientId={(id) => id && form.setValue("clientId", id)} />
          <Button 
            onClick={() => setOpenCreateDialog(true)} 
            disabled={!clientId}
          >
            <Plus className="mr-2 h-4 w-4" /> Connect Bank Account
          </Button>
        </div>
      </div>

      {/* Client Selection Warning */}
      {!clientId && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select a client to view bank feeds
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {bankFeeds.isLoading && clientId && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {bankFeeds.isSuccess && 
       bankFeeds.data.length === 0 && 
       clientId && 
       !bankFeeds.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>No Bank Feeds Connected</CardTitle>
            <CardDescription>
              Connect your bank accounts to automatically import transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Button 
              onClick={() => setOpenCreateDialog(true)}
              className="mx-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Connect Bank Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Bank Feeds */}
      {bankFeeds.isSuccess && 
       bankFeeds.data.length > 0 && 
       clientId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Connected Bank Feeds</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] })}
                disabled={bankFeeds.isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${bankFeeds.isRefetching ? "animate-spin" : ""}`} /> 
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Manage your connected bank accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Feed Type</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankFeeds.data.map((feed: any) => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell>{feed.institutionName}</TableCell>
                    <TableCell>{feed.accountNumber || "N/A"}</TableCell>
                    <TableCell>{feed.feedType}</TableCell>
                    <TableCell>
                      {feed.lastSyncDate 
                        ? new Date(feed.lastSyncDate).toLocaleDateString() 
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiRequest(
                              "POST", 
                              `/api/bank-feeds/${feed.id}/sync`
                            );
                            queryClient.invalidateQueries({ 
                              queryKey: ["/api/bank-feeds", clientId] 
                            });
                            toast({
                              title: "Bank feed synced",
                              description: "Successfully synced bank transactions",
                            });
                          } catch (error: any) {
                            toast({
                              title: "Sync failed",
                              description: error.message || "Failed to sync transactions",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Sync Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Connect Bank Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Connect Bank Account</DialogTitle>
            <DialogDescription>
              Link a bank account from your Chart of Accounts to the Bank Feeds section
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <p className="text-sm font-medium text-blue-800">
                  Connect existing bank accounts from your Chart of Accounts to the Bank Feeds section.
                  Only accounts with subtype "banklink" or "bank" will appear in the dropdown.
                </p>
              </div>
              
              <FormField
                control={form.control}
                name="linkedAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Bank Account</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        
                        // Find the selected account and auto-fill fields
                        const selectedAccount = bankAccountsQuery.data?.accounts?.find(
                          (account: any) => account.id.toString() === value
                        );
                        
                        if (selectedAccount) {
                          form.setValue("name", selectedAccount.name);
                          form.setValue("institutionName", selectedAccount.name.includes('Checking') 
                            ? 'Main Bank' 
                            : 'Business Bank');
                          form.setValue("accountNumber", selectedAccount.number || "XXXX1234");
                        }
                      }}
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bank account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccountsQuery.isLoading ? (
                          <SelectItem value="loading" disabled>Loading bank accounts...</SelectItem>
                        ) : bankAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>No bank accounts found</SelectItem>
                        ) : (
                          bankAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name} (${(account.balance / 100).toFixed(2)})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the bank account you created in Chart of Accounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="feedType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feed Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select feed type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual Import</SelectItem>
                        <SelectItem value="plaid">Plaid API</SelectItem>
                        <SelectItem value="qbo">QuickBooks Online</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="XXXX1234" />
                    </FormControl>
                    <FormDescription>
                      The account number for this bank account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <input
                type="hidden"
                {...form.register("clientId", { valueAsNumber: true })}
              />
              
              <DialogFooter className="mt-6 flex gap-2">
                {form.getValues('feedType') === 'plaid' && form.getValues('linkedAccountId') ? (
                  <PlaidLink 
                    clientId={clientId || 0}
                    linkedAccountId={form.getValues('linkedAccountId')}
                    onSuccess={(data) => {
                      queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
                      setOpenCreateDialog(false);
                      toast({
                        title: "Bank connected",
                        description: `Successfully connected bank and imported ${data.sync_results?.imported || 0} transactions.`,
                      });
                    }}
                    buttonText="Connect with Plaid"
                    variant="default"
                  />
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createBankFeed.isPending || !form.getValues('linkedAccountId')}
                  >
                    {createBankFeed.isPending ? 
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : 
                      <>Connect Bank</>
                    }
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}