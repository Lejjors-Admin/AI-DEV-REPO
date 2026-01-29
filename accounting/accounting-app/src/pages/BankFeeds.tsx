import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PlaidLink } from "@/components/PlaidLink";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiConfig } from "@/lib/api-config";

// Define form schema for bank feed creation
const bankFeedSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  institutionName: z.string().min(2, "Institution name must be at least 2 characters"),
  accountNumber: z.string().min(4, "Account number must be at least 4 characters"),
  routingNumber: z.string().optional(),
  feedType: z.enum(["api", "qbo", "manual"]),
  apiKey: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  clientId: z.number(),
  linkedAccountId: z.number({
    required_error: "Please select a bank account from Chart of Accounts",
  }),
});

type BankFeedFormValues = z.infer<typeof bankFeedSchema>;

export default function BankFeeds() {
  const [clientId, setClientId] = useState<number | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const queryClient = useQueryClient();
  const params = useParams();

  // Fetch clients for dropdown
  const clients = useQuery({
    queryKey: ["/api/clients"],
    enabled: true,
  });

  // Set clientId from url params or first client
  useEffect(() => {
    if (params.clientId) {
      setClientId(Number(params.clientId));
    } else if (clients.data && clients.data.length > 0) {
      setClientId(clients.data[0].id);
    }
  }, [params.clientId, clients.data]);

  // Fetch bank feeds for selected client
  const bankFeeds = useQuery({
    queryKey: ["/api/bank-feeds", clientId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bank-feeds/${clientId}`);
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Fetch all accounts for selected client, specifically requesting bank/banklink subtypes
  const allAccounts = useQuery({
    queryKey: ["/api/accounts/all", clientId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/accounts/${clientId}?subtypes=bank,banklink`);
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Fetch bank accounts directly with a separate query for better reliability
  const bankAccountsQuery = useQuery({
    queryKey: ["/api/accounts/bank", clientId],
    queryFn: async () => {
      // Make a direct API call to get accounts
      const response = await fetch(apiConfig.buildUrl(`/api/accounts/${clientId}?subtypes=bank,banklink`));
      if (!response.ok) {
        throw new Error('Failed to fetch bank accounts');
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Process the accounts data
  const bankAccounts = React.useMemo(() => {
    // Try the direct query first
    if (bankAccountsQuery.isSuccess && bankAccountsQuery.data?.accounts) {
      console.log("Using direct bank accounts query data:", bankAccountsQuery.data.accounts);
      return bankAccountsQuery.data.accounts.filter((account: any) => 
        account.type === 'asset' && (account.subtype === 'bank' || account.subtype === 'banklink')
      );
    }
    
    // Fall back to the original query
    if (allAccounts.isSuccess && allAccounts.data?.accounts) {
      console.log("Using all accounts query data:", allAccounts.data.accounts);
      return allAccounts.data.accounts.filter((account: any) => 
        account.type === 'asset' && (account.subtype === 'bank' || account.subtype === 'banklink')
      );
    }
    
    return [];
  }, [bankAccountsQuery.data, bankAccountsQuery.isSuccess, allAccounts.data, allAccounts.isSuccess]);

  // Create bank feed mutation
  const createBankFeed = useMutation({
    mutationFn: (data: BankFeedFormValues) => apiRequest("POST", "/api/bank-feeds", data),
    onSuccess: () => {
      toast({
        title: "Bank feed created",
        description: "The bank feed has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
      setOpenCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create bank feed",
        description: error.message || "An error occurred while creating the bank feed.",
        variant: "destructive",
      });
    },
  });

  // Sync bank feed mutation
  const syncBankFeed = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/bank-feeds/${id}/sync`),
    onSuccess: () => {
      toast({
        title: "Bank feed synced",
        description: "The bank feed has been synced successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to sync bank feed",
        description: error.message || "An error occurred while syncing the bank feed.",
        variant: "destructive",
      });
    },
  });

  // Delete bank feed mutation
  const deleteBankFeed = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bank-feeds/${id}`),
    onSuccess: () => {
      toast({
        title: "Bank feed deleted",
        description: "The bank feed has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete bank feed",
        description: error.message || "An error occurred while deleting the bank feed.",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<BankFeedFormValues>({
    resolver: zodResolver(bankFeedSchema),
    defaultValues: {
      name: "",
      institutionName: "",
      accountNumber: "",
      linkedAccountId: undefined as unknown as number,
      routingNumber: "",
      feedType: "api",
      apiKey: "",
      status: "active",
      clientId: clientId || 0,
    },
  });

  // Update form default clientId when clientId changes
  useEffect(() => {
    if (clientId) {
      form.setValue("clientId", clientId);
    }
  }, [clientId, form]);

  const onSubmit = (data: BankFeedFormValues) => {
    createBankFeed.mutate(data);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Render feed type badge with appropriate colors
  const renderFeedTypeBadge = (type: string) => {
    switch (type) {
      case "api":
        return <Badge variant="default">API</Badge>;
      case "qbo":
        return <Badge variant="secondary">QuickBooks</Badge>;
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Render status badge with appropriate colors
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bank Feeds</h1>
          <p className="text-muted-foreground">
            Manage bank connections and transaction imports
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={clientId?.toString() || ""}
            onValueChange={(value) => setClientId(Number(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.data?.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex space-x-2">
            {clientId && form.getValues('linkedAccountId') ? (
              <PlaidLink 
                clientId={clientId}
                linkedAccountId={form.getValues('linkedAccountId')}
                onSuccess={(data) => {
                  queryClient.invalidateQueries({ queryKey: ["/api/bank-feeds", clientId] });
                  toast({
                    title: "Bank connected",
                    description: `Successfully connected bank and imported ${data.sync_results?.imported || 0} transactions.`,
                  });
                }}
                buttonText="Connect with Plaid"
                variant="default"
              />
            ) : (
              <Button variant="outline" disabled className="opacity-50">
                Select Bank Account First
              </Button>
            )}
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
                            ) : !bankAccountsQuery.data?.accounts || bankAccountsQuery.data.accounts.filter((a: any) => 
                                a.type === 'asset' && (a.subtype === 'bank' || a.subtype === 'banklink')).length === 0 ? (
                              <SelectItem value="none" disabled>No bank accounts found</SelectItem>
                            ) : (
                              bankAccountsQuery.data.accounts
                                .filter((account: any) => account.type === 'asset' && 
                                  (account.subtype === 'bank' || account.subtype === 'banklink'))
                                .map((account: any) => (
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
                            <SelectItem value="api">Bank API</SelectItem>
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
                  
                  <DialogFooter className="mt-6">
                    <Button 
                      type="submit" 
                      disabled={createBankFeed.isPending}
                    >
                      {createBankFeed.isPending ? 
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : 
                        <>Connect Bank</>
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!clientId && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select a client to view bank feeds
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* New Connect Account Button */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Feeds</h2>
          <p className="text-muted-foreground">
            Connect your bank accounts for automatic transaction import
          </p>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Connect Bank Account
        </Button>
      </div>
      
      {bankFeeds.isSuccess && bankFeeds.data.length === 0 && clientId && (
        <Card>
          <CardHeader>
            <CardTitle>No Bank Feeds</CardTitle>
            <CardDescription>
              No bank feeds have been set up for this client yet
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button onClick={() => setOpenCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Bank Feed
            </Button>
          </CardContent>
        </Card>
      )}

      {bankFeeds.isSuccess && bankFeeds.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Bank Feeds</CardTitle>
            <CardDescription>
              View and manage bank connections for automatic transaction imports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankFeeds.data.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell>{feed.institutionName}</TableCell>
                    <TableCell>{feed.accountNumber}</TableCell>
                    <TableCell>{renderFeedTypeBadge(feed.feedType)}</TableCell>
                    <TableCell>{renderStatusBadge(feed.status)}</TableCell>
                    <TableCell>
                      {feed.lastSynced ? formatDate(feed.lastSynced) : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncBankFeed.mutate(feed.id)}
                          disabled={syncBankFeed.isPending}
                        >
                          {syncBankFeed.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="sr-only">Sync</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this bank feed?")) {
                              deleteBankFeed.mutate(feed.id);
                            }
                          }}
                          disabled={deleteBankFeed.isPending}
                        >
                          {deleteBankFeed.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              All bank feeds are up to date
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Available Bank Accounts with 'banklink' subtype */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Available Bank Accounts</CardTitle>
            <CardDescription>
              These bank accounts are marked with 'banklink' subtype in Chart of Accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allAccounts.isLoading ? (
              <div className="space-y-2">
                <div className="animate-pulse rounded-md bg-muted h-10 w-full" />
                <div className="animate-pulse rounded-md bg-muted h-10 w-full" />
              </div>
            ) : bankAccounts.filter(account => account.subtype === 'banklink').length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4">
                <p className="text-neutral-500 text-center mb-4">
                  No accounts with 'banklink' subtype found. Update an account's subtype to 'banklink' in Chart of Accounts.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts
                    .filter(account => account.subtype === 'banklink')
                    .map(account => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.accountNumber || 'N/A'}</TableCell>
                      <TableCell>${(account.balance / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setClientId(Number(clientId));
                            form.reset({
                              name: account.name,
                              institutionName: account.name.includes('RBC') ? 'RBC Royal Bank' : 'Bank',
                              accountNumber: account.accountNumber || 'XXXX1234',
                              feedType: 'manual',
                              status: 'active',
                              clientId: Number(clientId),
                              linkedAccountId: account.id
                            });
                            setOpenCreateDialog(true);
                          }}
                        >
                          Connect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Import Card */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Import Transactions</CardTitle>
            <CardDescription>
              Manually import transactions from bank statements or spreadsheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file with your transaction data. The file should include
                date, description, amount, and transaction type columns.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <div className="text-lg font-medium">Upload CSV</div>
                  <div className="text-sm text-muted-foreground">Import from spreadsheet</div>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <div className="text-lg font-medium">Connect QBO</div>
                  <div className="text-sm text-muted-foreground">Import from QuickBooks</div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}