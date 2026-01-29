import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, UserPlus, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// This is our form schema
const bookkeepingSettingsSchema = z.object({
  fiscalYearEndMonth: z.number().min(1).max(12).default(12),
  fiscalYearEndDay: z.number().min(1).max(31).default(31),
  defaultCurrency: z.string().default("USD"),
  useTaxSettings: z.boolean().default(false),
  taxSettings: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Tax name is required"),
    rate: z.number().min(0).max(1),
    isDefault: z.boolean().default(false),
    accountId: z.number().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    appliesTo: z.array(z.string()).default([]),
  })).default([]),
  useAccrualAccounting: z.boolean().default(true),
  generateRecurringTransactions: z.boolean().default(false),
  automaticBankReconciliation: z.boolean().default(false),
  defaultCategories: z.object({
    taxSettings: z.array(z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Tax name is required"),
      rate: z.number().min(0).max(1),
      isDefault: z.boolean().default(false),
      accountId: z.number().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      appliesTo: z.array(z.string()).default([]),
    })).default([])
  }).optional(),
});

type BookkeepingSettingsFormValues = z.infer<typeof bookkeepingSettingsSchema>;

export default function BookkeepingSettingsTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bookkeeping settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}/bookkeeping-settings`],
    queryFn: () => {
      const token = localStorage.getItem('authToken');
      return apiRequest("GET", `/api/clients/${clientId}/bookkeeping-settings`, undefined, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => res.json());
    },
    enabled: !!clientId,
  });

  // Fetch accounts for tax account selection
  const { data: accountsData } = useQuery({
    queryKey: [`/api/accounts/${clientId}`],
    queryFn: () => {
      const token = localStorage.getItem('authToken');
      return apiRequest("GET", `/api/accounts/${clientId}`, undefined, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => res.json());
    },
    enabled: !!clientId,
  });

  // Create form with react-hook-form
  const form = useForm<BookkeepingSettingsFormValues>({
    resolver: zodResolver(bookkeepingSettingsSchema),
    defaultValues: {
      fiscalYearEndMonth: 12,
      fiscalYearEndDay: 31,
      defaultCurrency: "USD",
      useTaxSettings: false,
      taxSettings: [],
      useAccrualAccounting: true,
      generateRecurringTransactions: false,
      automaticBankReconciliation: false,
      defaultCategories: {},
    },
  });

  // Update the form when settings data is loaded
  useEffect(() => {
    if (settings) {
      const settingsData = settings as any; // Type assertion to handle API response
      form.reset({
        fiscalYearEndMonth: settingsData.fiscalYearEndMonth || 12,
        fiscalYearEndDay: settingsData.fiscalYearEndDay || 31,
        defaultCurrency: settingsData.defaultCurrency || "USD",
        useTaxSettings: (settingsData.taxSettings && settingsData.taxSettings.length > 0) || false,
        taxSettings: settingsData.taxSettings || [],
        useAccrualAccounting: settingsData.useAccrualAccounting !== false, // Default to true
        generateRecurringTransactions: settingsData.generateRecurringTransactions || false,
        automaticBankReconciliation: settingsData.automaticBankReconciliation || false,
        defaultCategories: settingsData.defaultCategories || {},
      });
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: BookkeepingSettingsFormValues) => {
      setIsSubmitting(true);
      try {
        // Verify token is available
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        console.log('🔐 Sending request with token:', token.substring(0, 20) + '...');
        console.log('📤 Sending data to backend:', JSON.stringify(data, null, 2));
        console.log('🔍 useTaxSettings being sent:', data.useTaxSettings);
        
        const response = await apiRequest(
          "PUT", 
          `/api/clients/${clientId}/bookkeeping-settings`, 
          data
        );
        return await response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      console.log("✅ Settings save successful, response data:", data);
      console.log("🔍 useTaxSettings in response:", data?.useTaxSettings);
      
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/bookkeeping-settings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${clientId}`] });
      // Invalidate tax settings cache so rules dropdown updates immediately
      queryClient.invalidateQueries({ queryKey: [`/api/tax-settings/${clientId}`] });
      
      // If new accounts were created, update the form with the new account IDs
      if (data && data.taxSettings) {
        console.log("🔄 Updating form with new tax settings:", data.taxSettings);
        const currentValues = form.getValues();
        form.reset({
          ...currentValues,
          useTaxSettings: (data.taxSettings && data.taxSettings.length > 0) || false,
          taxSettings: data.taxSettings
        });
      }
      
      console.log("📢 Showing success toast notification");
      toast({
        title: "Settings saved successfully",
        description: "Bookkeeping settings and tax accounts have been updated",
      });
    },
    onError: (error: any) => {
      console.error('❌ Settings save error:', error);
      
      // Handle 401 authentication errors specifically
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
        });
        // Clear the invalid token
        localStorage.removeItem('authToken');
        // Optionally redirect to login or refresh the page
        window.location.reload();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  });

  const onSubmit = (values: BookkeepingSettingsFormValues) => {
    saveSettingsMutation.mutate(values);
  };

  // Check if tax settings should be shown - show if there are tax settings in the array
  const taxSettingsArray = form.watch("taxSettings") || [];
  const showTaxSettings = taxSettingsArray.length > 0;
  
  if (settingsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Fiscal Year Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fiscal Year Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fiscalYearEndMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year End Month</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-50">
                            <SelectItem value="1">January</SelectItem>
                            <SelectItem value="2">February</SelectItem>
                            <SelectItem value="3">March</SelectItem>
                            <SelectItem value="4">April</SelectItem>
                            <SelectItem value="5">May</SelectItem>
                            <SelectItem value="6">June</SelectItem>
                            <SelectItem value="7">July</SelectItem>
                            <SelectItem value="8">August</SelectItem>
                            <SelectItem value="9">September</SelectItem>
                            <SelectItem value="10">October</SelectItem>
                            <SelectItem value="11">November</SelectItem>
                            <SelectItem value="12">December</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The month when fiscal year ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fiscalYearEndDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year End Day</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-50">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The day of the month when fiscal year ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50">
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Currency used for financial reporting and transactions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Accounting Method Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accounting Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="useAccrualAccounting"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Accrual Accounting
                        </FormLabel>
                        <FormDescription>
                          Use accrual-based accounting (when disabled, cash-based accounting is used)
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
                  name="generateRecurringTransactions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Auto-Generate Recurring Transactions
                        </FormLabel>
                        <FormDescription>
                          Automatically generate transactions based on recurring patterns
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
                  name="automaticBankReconciliation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Automatic Bank Reconciliation
                        </FormLabel>
                        <FormDescription>
                          Auto-match bank transactions with accounting records
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
              </CardContent>
            </Card>
          </div>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="useTaxSettings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Tax Settings
                      </FormLabel>
                      <FormDescription>
                        Configure tax settings for this client
                        {taxSettingsArray.length > 0 && (
                          <span className="block text-blue-600 mt-1">
                            Disabling will remove all tax configurations
                          </span>
                        )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={showTaxSettings}
                        onCheckedChange={(checked) => {
                          // When toggling, update the useTaxSettings field to match the toggle state
                          field.onChange(checked);
                          
                          if (checked) {
                            // If enabling and no tax settings exist, add a default one
                            if (taxSettingsArray.length === 0) {
                              const defaultTax = {
                                id: `tax-${Date.now()}`,
                                name: "HST",
                                rate: 0.13,
                                isDefault: true,
                                description: "HST configuration - please update description",
                                isActive: true,
                                appliesTo: ["sales", "purchases"]
                              };
                              form.setValue("taxSettings", [defaultTax]);
                            }
                          } else {
                            // If disabling, clear all tax settings
                            form.setValue("taxSettings", []);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {showTaxSettings && (
                <div className="space-y-4 pt-4 pl-4 border-l-2 border-primary/20">
                  {form.watch('taxSettings').length > 0 ? (
                    <div className="space-y-4">
                      {form.watch('taxSettings').map((tax, index) => (
                        <div key={tax.id || index} className="rounded-lg border p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-base font-medium">Tax: {tax.name}</h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTaxSettings = form.getValues('taxSettings').filter((_, i) => i !== index);
                                form.setValue('taxSettings', newTaxSettings);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tax Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. GST, HST, VAT" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.rate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tax Rate</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        placeholder="e.g. 13 for 13%" 
                                        value={field.value ? (field.value * 100) : ''}
                                        onChange={e => field.onChange(parseFloat(e.target.value) / 100)}
                                        className="rounded-r-none" 
                                      />
                                      <span className="px-3 py-2 bg-muted border border-l-0 rounded-r-md">%</span>
                                    </div>
                                  </FormControl>
                                  <FormDescription>For HST in Ontario, use 13%. For GST, use 5%.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.isDefault`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      Default Tax
                                    </FormLabel>
                                    <FormDescription>
                                      Used for auto-fill in transactions
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Optional notes about this tax" 
                                      className="min-h-[80px]"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.isActive`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      Active
                                    </FormLabel>
                                    <FormDescription>
                                      Inactive taxes won't appear in dropdown menus
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                            
                            {/* Tax Account Selection */}
                            <div className="col-span-2 space-y-3">
                              <FormLabel>Tax Payable Account</FormLabel>
                              <div className="space-y-2">
                                <Select 
                                  value={tax.accountId ? tax.accountId.toString() : 'create-new'} 
                                  onValueChange={(value) => {
                                    const currentTaxes = form.getValues('taxSettings');
                                    const updatedTaxes = currentTaxes.map((t, i) => 
                                      i === index ? { 
                                        ...t, 
                                        accountId: value === 'create-new' || !value ? undefined : parseInt(value) 
                                      } : t
                                    );
                                    form.setValue('taxSettings', updatedTaxes);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select or create account" />
                                  </SelectTrigger>
                                  <SelectContent className="z-50">
                                    <SelectItem value="create-new">
                                      ✨ Create new "{tax.name} Payable" account
                                    </SelectItem>
                                    {(accountsData as any)?.accounts && Array.isArray((accountsData as any).accounts) && (accountsData as any).accounts
                                      .filter((acc: any) => acc.type === 'liability')
                                      .map((account: any) => (
                                        <SelectItem key={account.id} value={account.id.toString()}>
                                          {account.name} ({account.accountNumber || 'No #'})
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  {tax.accountId ? 
                                    "Tax will be posted to the selected liability account" : 
                                    "A new liability account will be created automatically"
                                  }
                                </p>
                              </div>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`taxSettings.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Description" {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No tax settings configured</p>
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      const currentTaxes = form.getValues('taxSettings') || [];
                      const taxTypes = ['HST', 'GST', 'PST', 'QST'];
                      const existingTypes = currentTaxes.map(tax => tax.name);
                      const nextType = taxTypes.find(type => !existingTypes.includes(type)) || 'Custom Tax';
                      
                      const newTax = {
                        id: `tax-${Date.now()}`,
                        name: nextType,
                        rate: nextType === 'HST' ? 0.13 : nextType === 'GST' ? 0.05 : nextType === 'PST' ? 0.07 : 0.10,
                        isDefault: currentTaxes.length === 0,
                        isActive: true,
                        description: `${nextType} configuration - please update description`,
                        appliesTo: ['sales', 'purchases'],
                        accountId: undefined
                      };
                      const updatedTaxes = [...currentTaxes, newTax];
                      form.setValue('taxSettings', updatedTaxes);
                      console.log('🆕 Added new tax:', newTax);
                      console.log('📋 Updated tax settings:', updatedTaxes);
                    }}
                  >
                    Add Tax Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Management Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client User Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invite users to access this client's books and documents
                  </p>
                </div>
                <Button 
                  type="button"
                  onClick={() => window.location.href = `/create-invitation?clientId=${clientId}&type=client`}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Invitation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Client Access</h4>
                    <p className="text-sm text-muted-foreground">
                      Send invitations for client users to access their accounting data
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Quick Actions</div>
                    <div className="text-xs text-muted-foreground">Client Administrator • Standard User</div>
                  </div>
                </div>
                
                <div className="text-center py-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pending invitations. Click "Create Invitation" to send access to this client.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full md:w-auto"
              onClick={async (e) => {
                // Check for actual validation errors (not just isValid flag)
                const hasErrors = Object.keys(form.formState.errors).length > 0;
                
                if (hasErrors) {
                  console.log("❌ Form has validation errors:", form.formState.errors);
                  e.preventDefault();
                  return;
                }
                
                // Force form to submit by triggering validation
                const isValid = await form.trigger();
                
                if (!isValid) {
                  console.log("❌ Form validation failed after trigger");
                  e.preventDefault();
                }
              }}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}