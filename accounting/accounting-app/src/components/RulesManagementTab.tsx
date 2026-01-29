import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiConfig } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Sparkles,
  CheckCircle,
  Target,
  Edit,
  Trash2,
  Play,
  Bot,
  Settings,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface RulesManagementTabProps {
  clientId: number;
}

const ruleFormSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  pattern: z.string().min(1, "Pattern is required"),
  matchType: z
    .enum(["contains", "exact", "starts_with", "ends_with"])
    .default("contains"),
  accountId: z.number({ required_error: "Please select an account" }),
  taxSettingId: z.string().optional(), // FIXED: Changed from taxAccountId to taxSettingId, stores tax setting ID like "tax-1762901406034"
  isActive: z.boolean().default(true),
  autoApply: z.boolean().default(true), // FIXED: Changed to true - users expect rules to work by default
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

interface RuleRecommendation {
  name: string;
  description: string;
  vendorPattern?: string;
  descriptionPattern?: string;
  amountMin?: number;
  amountMax?: number;
  suggestedAccount: string;
  suggestedAccountId?: number;
  reasoning: string;
  confidence: number;
}

export default function RulesManagementTab({
  clientId,
}: RulesManagementTabProps) {
  const { toast } = useToast();
  // queryClient imported from lib
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      pattern: "",
      matchType: "contains" as const,
      accountId: undefined,
      taxSettingId: undefined,
      isActive: true,
      autoApply: true, // FIXED: Changed to true so rules work by default
    },
  });

  const token = localStorage.getItem("authToken");
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Fetch rules - maintain proper cache segmentation by client
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/rules", clientId],
    queryFn: () =>
      fetch(apiConfig.buildUrl(`/api/rules?clientId=${clientId}`), {
        headers,
        credentials: 'include'
      }).then((res) => res.json()),
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    staleTime: 30000, // 30 seconds
  });

  // Fetch accounts
  const { data: accountsData } = useQuery({
    queryKey: ["/api/accounts", clientId],
    queryFn: () =>
      fetch(apiConfig.buildUrl(`/api/accounts?clientId=${clientId}`)).then(
        (res) => res.json()
      ),
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      staleTime: 30000, // 30 seconds
  });

  // Fetch tax settings for the client
  const { data: taxSettingsResponse } = useQuery({
    queryKey: [`/api/tax-settings`, clientId],
    queryFn: () =>
      fetch(apiConfig.buildUrl(`/api/tax-settings/${clientId}`), {
        headers,
        credentials: 'include'
      }).then((res) => res.json()),
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Transform tax settings to the format expected by the form
  // Backend returns: { success: true, data: { options: [...], default: {...} } }
  const taxSettings = taxSettingsResponse?.data?.options || [];

  // Fetch AI recommendations
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
    refetch: refetchRecommendations,
  } = useQuery({
    queryKey: ["/api/rules/recommendations", clientId],
    queryFn: () =>
      fetch(
        apiConfig.buildUrl(`/api/rules/recommendations?clientId=${clientId}`)
      ).then((res) => res.json()),
    enabled: false,
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (ruleData: RuleFormData) => fetch(apiConfig.buildUrl('/api/rules'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ...ruleData, clientId })
    }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Rule created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    }
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({
      ruleId,
      ruleData,
    }: {
      ruleId: number;
      ruleData: RuleFormData;
    }) =>
      fetch(apiConfig.buildUrl(`/api/rules/${ruleId}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(ruleData),
      }).then((res) => res.json()),
    onSuccess: () => {
      toast({ title: "Rule updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setIsDialogOpen(false);
      setSelectedRule(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: number) =>
      fetch(apiConfig.buildUrl(`/api/rules/${ruleId}`), {
        method: "DELETE",
        headers,
      }).then((res) => res.json()),
    onSuccess: () => {
      toast({ title: "Rule deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
    },
    onError: () => {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    },
  });

  // Apply rules mutation with auto-classification
  const applyRulesMutation = useMutation({
    mutationFn: () => {
      console.log("🔥 APPLY RULES MUTATION TRIGGERED", { clientId });
      const token = localStorage.getItem("authToken"); 
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
      }
      return fetch(apiConfig.buildUrl("/api/rules/apply"), {
        method: "POST",
        body: JSON.stringify({
          clientId,
          createJournalEntries: true,
        }),
        headers,
      }).then((res) => {
        console.log("🔥 APPLY RULES RESPONSE STATUS:", res.status);
        return res.json().then((data) => {
          console.log("🔥 APPLY RULES RESPONSE DATA:", data);
          return data;
        });
      });
    },
    onSuccess: (data: any) => {
      console.log("🔥 APPLY RULES SUCCESS:", data);
      toast({
        title: `Auto-classified ${data.appliedCount || 0} transactions!`,
        description: "Rules applied and journal entries created automatically.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: any) => {
      console.error("🔥 APPLY RULES ERROR:", error);
      toast({ title: "Failed to apply rules", variant: "destructive" });
    },
  });

  // Handle both response formats: {rules: [...]} and [{...}]
  const rules = Array.isArray(rulesData) ? rulesData : rulesData?.rules || [];
  const accounts = accountsData?.accounts || [];
  const recommendations = recommendationsData?.recommendations || [];

  const handleCreateRule = () => {
    setSelectedRule(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule);
    form.reset({
      name: rule.name,
      description: rule.description || "",
      pattern: rule.pattern || "",
      matchType: rule.match_type || "contains",
      accountId: rule.account_id,
      taxSettingId: rule.tax_setting_id || undefined,
      isActive: rule.is_active,
      autoApply: rule.auto_apply || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: RuleFormData) => {
    if (selectedRule) {
      updateRuleMutation.mutate({ ruleId: selectedRule.id, ruleData: data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const createRuleFromRecommendation = (rec: RuleRecommendation) => {
    const accountId =
      rec.suggestedAccountId ||
      accounts.find((acc: any) =>
        acc.name.toLowerCase().includes(rec.suggestedAccount.toLowerCase())
      )?.id;

    if (!accountId) {
      toast({
        title: "Cannot create rule",
        description: "No matching account found",
        variant: "destructive",
      });
      return;
    }

    const ruleData: RuleFormData = {
      name: rec.name,
      description: rec.description,
      pattern: rec.vendorPattern || rec.descriptionPattern || "",
      matchType: "contains" as const,
      accountId,
      taxSettingId: undefined,
      isActive: true,
      autoApply: true, // FIXED: AI-created rules should also auto-apply (users can disable if needed)
    };

    createRuleMutation.mutate(ruleData);
  };

  const handleGetRecommendations = () => {
    refetchRecommendations();
    setIsRecommendationsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Transaction Rules
          </h2>
          <p className="text-muted-foreground">
            Automate transaction categorization with AI-powered rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGetRecommendations}>
            <Bot className="w-4 h-4 mr-2" />
            Get AI Suggestions
          </Button>
          <Button
            onClick={() => applyRulesMutation.mutate()}
            disabled={applyRulesMutation.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            Apply Rules
          </Button>
          <Button onClick={handleCreateRule}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Rules
                </p>
                <p className="text-2xl font-bold">
                  {rules.filter((r: any) => r.is_active).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  AI Generated
                </p>
                <p className="text-2xl font-bold">
                  {rules.filter((r: any) => r.isSystemGenerated).length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Matches
                </p>
                <p className="text-2xl font-bold">
                  {rules.reduce(
                    (sum: any, r: any) => sum + (r.match_count || 0),
                    0
                  )}
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Rules Management</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Rules</CardTitle>
              <CardDescription>
                Manage automatic categorization rules for your transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : rules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Patterns</TableHead>
                      <TableHead>Target Account</TableHead>
                      <TableHead>Sales Tax</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: any) => {
                      const targetAccount = accounts.find(
                        (acc: any) => acc.id === rule.account_id
                      );
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground">
                                  {rule.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rule.pattern}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {targetAccount?.name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {targetAccount?.number}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {rule.tax_setting_id ? (
                              <Badge variant="default">
                                {(() => {
                                  const taxSetting = taxSettings?.find(
                                    (t: any) => t.id.toString() === rule.tax_setting_id.toString()
                                  );
                                  return taxSetting 
                                    ? `${taxSetting.name} ${(taxSetting.rate * 100).toFixed(1)}%`
                                    : "Tax Applied";
                                })()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">No Tax</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rule.match_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  rule.is_active ? "default" : "secondary"
                                }
                              >
                                {rule.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {rule.isSystemGenerated && (
                                <Badge
                                  variant="outline"
                                  className="text-purple-600"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteRuleMutation.mutate(rule.id)
                                }
                                disabled={deleteRuleMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No rules configured
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first rule or get AI recommendations
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Performance Analytics</CardTitle>
              <CardDescription>
                Analyze how well your rules are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Top Performing Rules</h3>
                  {rules
                    .sort(
                      (a: any, b: any) =>
                        (b.match_count || 0) - (a.match_count || 0)
                    )
                    .slice(0, 5)
                    .map((rule: any) => (
                      <div
                        key={rule.id}
                        className="flex justify-between items-center p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {parseFloat(rule.confidence).toFixed(1)}
                            %
                          </p>
                        </div>
                        <Badge variant="default">
                          {rule.match_count || 0} matches
                        </Badge>
                      </div>
                    ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Recently Created Rules</h3>
                  {rules
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .slice(0, 5)
                    .map((rule: any) => (
                      <div
                        key={rule.id}
                        className="flex justify-between items-center p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Created:{" "}
                            {new Date(rule.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            rule.isSystemGenerated ? "outline" : "default"
                          }
                        >
                          {rule.isSystemGenerated ? "AI" : "Manual"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? "Edit Rule" : "Create New Rule"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Supplies" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Account</FormLabel>
                      <FormControl>
                        <select
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select account</option>
                          {accounts.map((account: any) => (
                            <option key={account.id} value={account.id}>
                              {account.name} ({account.number})
                            </option>
                          ))}
                        </select>
                      </FormControl>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description for this rule"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Pattern</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Amazon, Staples, office supplies"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Keywords to match in vendor name or description
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Type</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="contains">
                            Contains (similar words)
                          </option>
                          <option value="exact">Exact match</option>
                          <option value="starts_with">Starts with</option>
                          <option value="ends_with">Ends with</option>
                        </select>
                      </FormControl>
                      <FormDescription>
                        How to match the pattern against transactions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxSettingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Tax Type (Optional)</FormLabel>
                    <FormControl>
                      <select
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">No tax allocation</option>
                        {taxSettings?.map((tax: any) => (
                          <option key={tax.id} value={tax.id.toString()}>
                            {tax.name} {(tax.rate * 100).toFixed(1)}%
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormDescription>
                      Select tax type to automatically calculate and allocate
                      tax amounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Rule</FormLabel>
                      <FormDescription>
                        Enable this rule to be available for use
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoApply"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Auto-Apply Rule
                      </FormLabel>
                      <FormDescription>
                        If enabled, automatically categorizes matching
                        transactions. If disabled, only provides suggestions.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("isActive")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    createRuleMutation.isPending || updateRuleMutation.isPending
                  }
                >
                  {selectedRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AI Recommendations Dialog */}
      <Dialog
        open={isRecommendationsOpen}
        onOpenChange={setIsRecommendationsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Rule Recommendations</DialogTitle>
          </DialogHeader>

          {recommendationsLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-4">
              {recommendations.map((rec: any, index: any) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{rec.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {rec.vendorPattern && (
                            <Badge variant="outline">
                              Vendor: {rec.vendorPattern}
                            </Badge>
                          )}
                          {rec.descriptionPattern && (
                            <Badge variant="outline">
                              Pattern: {rec.descriptionPattern}
                            </Badge>
                          )}
                          {(rec.amountMin || rec.amountMax) && (
                            <Badge variant="outline">
                              Amount: ${rec.amountMin || "0"} - $
                              {rec.amountMax || "∞"}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm">
                          <span className="font-medium">Account:</span>{" "}
                          {rec.suggestedAccount}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Reasoning:</span>{" "}
                          {rec.reasoning}
                        </p>
                      </div>

                      <div className="ml-4 text-right">
                        <Badge variant="default" className="mb-2">
                          {rec.confidence}% confidence
                        </Badge>
                        <br />
                        <Button
                          size="sm"
                          onClick={() => createRuleFromRecommendation(rec)}
                          disabled={createRuleMutation.isPending}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!recommendationsLoading && recommendations.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No recommendations available
              </h3>
              <p className="text-muted-foreground">
                The AI didn't find any suitable rule recommendations for your
                current transactions.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
