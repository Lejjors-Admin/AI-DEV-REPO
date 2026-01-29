import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, ShieldCheck, ArrowUpDown, Clock, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AutomaticBookkeepingProps {
  clientId: string;
  onComplete?: () => void;
}

export function AutomaticBookkeeping({ 
  clientId, 
  onComplete 
}: AutomaticBookkeepingProps) {
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    confidenceThreshold: 80, // Minimum AI confidence level (percentage)
    runFrequency: "daily", // daily, weekly, bi-weekly, monthly
    notifyOnCompletion: true,
    autoReconcile: false,
    autoCreateRules: true
  });
  
  // Status state
  const [status, setStatus] = useState<{
    lastRun: string | null;
    nextRun: string | null;
    transactionsProcessed: number;
    rulesCreated: number;
  }>({
    lastRun: null,
    nextRun: null,
    transactionsProcessed: 0,
    rulesCreated: 0
  });

  // Enable/disable automatic bookkeeping
  const toggleAutoBookkeeping = async (enabled: boolean) => {
    try {
      setIsProcessing(true);
      
      // In a real implementation, this would call an API endpoint to enable/disable
      // the automatic bookkeeping for this client
      const response = await apiRequest("POST", `/api/clients/${clientId}/bookkeeping-settings`, {
        automaticBookkeepingEnabled: enabled,
        ...settings
      });
      
      if (!response.ok) {
        throw new Error("Failed to update automatic bookkeeping settings");
      }
      
      // Update local state
      setIsEnabled(enabled);
      
      // Show success message
      toast({
        title: enabled ? "Automatic Bookkeeping Enabled" : "Automatic Bookkeeping Disabled",
        description: enabled 
          ? "AI will now automatically process and categorize your transactions." 
          : "Automatic processing has been disabled.",
      });
      
      // If turning on, set a mock next run date
      if (enabled) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStatus({
          ...status,
          nextRun: tomorrow.toISOString()
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Settings Update Failed",
        description: error.message || "An error occurred while updating settings.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Run the automatic bookkeeping now (manually)
  const runNow = async () => {
    try {
      setIsProcessing(true);
      
      // This would call an API endpoint to run the automatic bookkeeping process immediately
      const response = await apiRequest("POST", `/api/transactions/categorize-batch`, {
        clientId: parseInt(clientId),
        updateTransactions: true,
        createRules: settings.autoCreateRules
      });
      
      if (!response.ok) {
        throw new Error("Failed to run automatic bookkeeping");
      }
      
      const result = await response.json();
      
      // Update local state
      const now = new Date();
      setStatus({
        ...status,
        lastRun: now.toISOString(),
        transactionsProcessed: result.categorizedTransactions.length,
        rulesCreated: result.rulesCreated || 0
      });
      
      // If auto-reconcile is enabled, also run reconciliation
      if (settings.autoReconcile) {
        await apiRequest("POST", `/api/bank-transactions/auto-match/${clientId}`, {});
      }
      
      // Show success message
      toast({
        title: "Processing Complete",
        description: `Processed ${result.categorizedTransactions.length} transactions using AI.`,
      });
      
      // Refresh related data
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${clientId}`] });
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
      
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message || "An error occurred during automatic processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update settings
  const handleSettingsUpdate = async () => {
    try {
      setIsProcessing(true);
      
      // Call API to update settings
      const response = await apiRequest("PUT", `/api/clients/${clientId}/bookkeeping-settings`, {
        automaticBookkeepingEnabled: isEnabled,
        confidenceThreshold: settings.confidenceThreshold / 100, // Convert to 0-1 range
        runFrequency: settings.runFrequency,
        notifyOnCompletion: settings.notifyOnCompletion,
        autoReconcile: settings.autoReconcile,
        autoCreateRules: settings.autoCreateRules
      });
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      // Close settings dialog
      setIsSettingsOpen(false);
      
      // Show success message
      toast({
        title: "Settings Updated",
        description: "Your automatic bookkeeping settings have been updated.",
      });
      
    } catch (error: any) {
      toast({
        title: "Settings Update Failed",
        description: error.message || "An error occurred while updating settings.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Automatic Bookkeeping
        </CardTitle>
        <CardDescription>
          Let AI automatically categorize your transactions and manage your books.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2 mb-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-bookkeeping"
              checked={isEnabled}
              onCheckedChange={(value) => toggleAutoBookkeeping(value)}
              disabled={isProcessing}
            />
            <Label htmlFor="auto-bookkeeping" className="font-medium">
              {isEnabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            disabled={isProcessing}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4 flex items-start space-x-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">AI Confidence Level</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Only applies categories with at least {settings.confidenceThreshold}% confidence
              </p>
            </div>
          </div>
          
          <div className="bg-muted rounded-lg p-4 flex items-start space-x-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Processing Schedule</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Runs {settings.runFrequency}
                {status.nextRun && ` (Next: ${new Date(status.nextRun).toLocaleDateString()})`}
              </p>
            </div>
          </div>
        </div>
        
        {status.lastRun && (
          <div className="border rounded-md mt-4 p-4">
            <h4 className="font-medium mb-2">Last Processing Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span> {new Date(status.lastRun).toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Transactions:</span> {status.transactionsProcessed}
              </div>
              <div>
                <span className="text-muted-foreground">Rules Created:</span> {status.rulesCreated}
              </div>
              <div>
                <span className="text-muted-foreground">Auto-Reconciled:</span> {settings.autoReconcile ? "Yes" : "No"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={runNow} 
                disabled={isProcessing || !isEnabled}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Process Now
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {!isEnabled && (
              <TooltipContent>
                <p>Enable automatic bookkeeping to process transactions</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
      
      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Automatic Bookkeeping Settings</DialogTitle>
            <DialogDescription>
              Configure how AI handles your bookkeeping automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confidence">Minimum AI Confidence Level ({settings.confidenceThreshold}%)</Label>
              <Input
                id="confidence"
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.confidenceThreshold}
                onChange={(e) => setSettings({
                  ...settings,
                  confidenceThreshold: parseInt(e.target.value)
                })}
              />
              <p className="text-sm text-muted-foreground">
                Only apply categorizations when AI is at least this confident.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="frequency">Processing Frequency</Label>
              <Select 
                value={settings.runFrequency}
                onValueChange={(value) => setSettings({
                  ...settings,
                  runFrequency: value
                })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="notifyOnCompletion"
                checked={settings.notifyOnCompletion}
                onCheckedChange={(value) => setSettings({
                  ...settings,
                  notifyOnCompletion: value
                })}
              />
              <Label htmlFor="notifyOnCompletion">Notify on completion</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="autoReconcile"
                checked={settings.autoReconcile}
                onCheckedChange={(value) => setSettings({
                  ...settings,
                  autoReconcile: value
                })}
              />
              <Label htmlFor="autoReconcile">Auto-reconcile bank transactions</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="autoCreateRules"
                checked={settings.autoCreateRules}
                onCheckedChange={(value) => setSettings({
                  ...settings,
                  autoCreateRules: value
                })}
              />
              <Label htmlFor="autoCreateRules">Create rules from recurring transactions</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSettingsUpdate}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}