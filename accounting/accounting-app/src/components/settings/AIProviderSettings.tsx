import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Brain, Bot, Rocket, Key, ShieldCheck, Check, MoveUp, AlertCircle } from "lucide-react";
import { 
  AI_PROVIDERS, 
  AIProviderType,
  DEFAULT_AI_SETTINGS,
  getFreeProviders
} from "@/lib/ai-providers";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiConfig } from "@/lib/api-config";

// Form validation schema
const aiSettingsSchema = z.object({
  defaultProvider: z.enum(Object.keys(AI_PROVIDERS) as [AIProviderType, ...AIProviderType[]]),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  perplexityApiKey: z.string().optional(),
  xaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  huggingfaceApiKey: z.string().optional(),
  defaultModel: z.string(),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(8000),
  useAIForTransactions: z.boolean().default(true),
  useAIForBinderGeneration: z.boolean().default(true),
  useAIForReporting: z.boolean().default(true),
});

type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

export default function AIProviderSettings() {
  const [activeProvider, setActiveProvider] = useState<AIProviderType>(DEFAULT_AI_SETTINGS.provider);
  const freeProviders = getFreeProviders();

  // Fetch current AI settings
  const { data: aiSettings, isLoading } = useQuery({
    queryKey: ["/api/settings/ai"],
    queryFn: async ({ signal }) => {
      try {
        const response = await fetch(apiConfig.buildUrl("/api/settings/ai", { signal }));
        if (!response.ok) {
          return DEFAULT_AI_SETTINGS;
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching AI settings:", error);
        return DEFAULT_AI_SETTINGS;
      }
    },
  });

  // Set up form with default values
  const form = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      defaultProvider: DEFAULT_AI_SETTINGS.provider,
      defaultModel: DEFAULT_AI_SETTINGS.model,
      temperature: DEFAULT_AI_SETTINGS.temperature,
      maxTokens: DEFAULT_AI_SETTINGS.maxTokens,
      useAIForTransactions: true,
      useAIForBinderGeneration: true,
      useAIForReporting: true,
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (aiSettings) {
      form.reset({
        defaultProvider: aiSettings.provider || DEFAULT_AI_SETTINGS.provider,
        defaultModel: aiSettings.model || DEFAULT_AI_SETTINGS.model,
        temperature: aiSettings.temperature || DEFAULT_AI_SETTINGS.temperature,
        maxTokens: aiSettings.maxTokens || DEFAULT_AI_SETTINGS.maxTokens,
        useAIForTransactions: aiSettings.useAIForTransactions !== false,
        useAIForBinderGeneration: aiSettings.useAIForBinderGeneration !== false,
        useAIForReporting: aiSettings.useAIForReporting !== false,
        openaiApiKey: aiSettings.openaiApiKey || "",
        anthropicApiKey: aiSettings.anthropicApiKey || "",
        perplexityApiKey: aiSettings.perplexityApiKey || "",
        xaiApiKey: aiSettings.xaiApiKey || "",
        geminiApiKey: aiSettings.geminiApiKey || "",
        huggingfaceApiKey: aiSettings.huggingfaceApiKey || "",
      });
      setActiveProvider(aiSettings.provider || DEFAULT_AI_SETTINGS.provider);
    }
  }, [aiSettings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AISettingsFormValues) => {
      return await apiRequest("POST", "/api/settings/ai", data)
        .then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai"] });
      toast({
        title: "Settings Saved",
        description: "AI provider settings have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Test API key mutation
  const testApiKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: AIProviderType, apiKey: string }) => {
      return await apiRequest("POST", "/api/settings/ai/test-key", { provider, apiKey })
        .then(res => res.json());
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "API Key Valid",
          description: "Successfully connected to the AI provider",
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: data.message || "Failed to connect to the AI provider",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test API key",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: AISettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  // Handle testing API key
  const testApiKey = (provider: AIProviderType) => {
    const apiKeyField = `${provider}ApiKey` as keyof AISettingsFormValues;
    const apiKey = form.getValues(apiKeyField) as string;
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to test",
        variant: "destructive",
      });
      return;
    }
    
    testApiKeyMutation.mutate({ provider, apiKey });
  };

  // Handle provider change
  const handleProviderChange = (provider: AIProviderType) => {
    setActiveProvider(provider);
    const defaultModel = AI_PROVIDERS[provider].defaultModel;
    form.setValue("defaultModel", defaultModel);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Provider Settings</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI Provider Settings
        </CardTitle>
        <CardDescription>
          Configure which AI providers to use for different features in the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Default AI Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which AI provider to use as the default for all AI-powered features
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(AI_PROVIDERS).map(([key, config]) => {
                    const provider = key as AIProviderType;
                    const isFree = freeProviders.includes(provider);
                    
                    return (
                      <Card 
                        key={key} 
                        className={`border cursor-pointer transition-all ${activeProvider === provider ? 'border-primary shadow-md' : 'border-border'}`}
                        onClick={() => handleProviderChange(provider)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex justify-between items-center">
                            {config.name}
                            {isFree && (
                              <Badge variant="secondary" className="ml-2">
                                Free Tier
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                          {activeProvider === provider && (
                            <Check className="h-5 w-5 text-primary absolute bottom-3 right-3" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                <FormField
                  control={form.control}
                  name="defaultProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="hidden">
                          <Input {...field} value={activeProvider} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Keys</h3>
                <p className="text-sm text-muted-foreground">
                  Enter API keys for the AI providers you want to use
                </p>
                
                <div className="space-y-4">
                  {Object.entries(AI_PROVIDERS)
                    .filter(([_, config]) => config.apiKeyRequired)
                    .map(([key, config]) => {
                      const provider = key as AIProviderType;
                      const fieldName = `${provider}ApiKey` as keyof AISettingsFormValues;
                      
                      return (
                        <FormField
                          key={key}
                          control={form.control}
                          name={fieldName}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <div className="flex justify-between items-center mb-2">
                                <FormLabel>{config.name} API Key</FormLabel>
                                {config.freeTier && (
                                  <Badge variant="outline" className="font-normal">
                                    Free Tier Available
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder={`Enter ${config.name} API Key`}
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => testApiKey(provider)}
                                  disabled={testApiKeyMutation.isPending}
                                >
                                  Test
                                </Button>
                              </div>
                              <FormDescription>
                                {config.freeTier 
                                  ? `${config.name} offers a free tier with limited usage.`
                                  : `${config.name} requires a paid API key.`}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    })}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Model Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure which model to use for the selected provider and adjust generation parameters
                </p>
                
                <FormField
                  control={form.control}
                  name="defaultModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Model</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50">
                          {AI_PROVIDERS[activeProvider].modelsAvailable.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI model that will be used for generating content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature: {field.value.toFixed(1)}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Higher values produce more creative results, lower values are more deterministic
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Tokens: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={100}
                            max={8000}
                            step={100}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of tokens to generate in a single response
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Feature Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Control which features use AI assistance
                </p>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="useAIForTransactions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Transaction Categorization</FormLabel>
                          <FormDescription>
                            Automatically categorize transactions using AI
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
                    name="useAIForBinderGeneration"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Binder Content Generation</FormLabel>
                          <FormDescription>
                            Generate binder content based on engagement type and industry
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
                    name="useAIForReporting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Financial Reporting Insights</FormLabel>
                          <FormDescription>
                            Generate insights and suggestions for financial reports
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
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}