/**
 * Rule Creation Dialog - Tax-Aware Transaction Rule Creation
 * Allows users to create categorization rules with proper tax allocation
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RuleCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rule: {
    pattern: string;
    accountId: number;
    taxSettingId: string | null;
    confidence: number;
  }) => void;
  accounts: any[];
  taxSettings: any[];
  defaultTaxSetting: any;
  initialPattern?: string;
  initialAccountId?: number;
}

export default function RuleCreationDialog({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  taxSettings,
  defaultTaxSetting,
  initialPattern = "",
  initialAccountId,
}: RuleCreationDialogProps) {
  const [pattern, setPattern] = useState(initialPattern);
  const [accountId, setAccountId] = useState<string>(
    initialAccountId?.toString() || ""
  );
  const [taxSettingId, setTaxSettingId] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-populate default tax setting when dialog opens
  useEffect(() => {
    if (isOpen && defaultTaxSetting?.id) {
      setTaxSettingId(defaultTaxSetting.id);
    }
  }, [isOpen, defaultTaxSetting]);

  // Reset form when pattern/account changes from parent
  useEffect(() => {
    if (isOpen) {
      setPattern(initialPattern);
      setAccountId(initialAccountId?.toString() || "");
    }
  }, [isOpen, initialPattern, initialAccountId]);

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!pattern.trim()) {
      newErrors.push("Pattern (description) is required");
    }

    if (!accountId) {
      newErrors.push("Account selection is required");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      pattern: pattern.trim(),
      accountId: parseInt(accountId),
      taxSettingId: taxSettingId || null,
      confidence: 0.9,
    });

    // Reset form
    setPattern("");
    setAccountId("");
    setTaxSettingId("");
    setErrors([]);
    onClose();
  };

  const handleCancel = () => {
    setPattern("");
    setAccountId("");
    setTaxSettingId("");
    setErrors([]);
    onClose();
  };

  // Get tax account name for display
  const getTaxAccountName = (taxAccountId: number) => {
    const account = accounts.find((acc) => acc.id === taxAccountId);
    return account?.name || `Account ${taxAccountId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Transaction Rule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="pattern">
              Pattern <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pattern"
              placeholder="Transaction description or keyword (e.g., 'AMAZON', 'SHOPIFY')"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Future transactions matching this pattern will be automatically categorized
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">
              Expense/Revenue Account <span className="text-red-500">*</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((acc) => acc.is_active)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_number} - {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxAccount">Sales Tax Allocation</Label>
            <Select value={taxSettingId} onValueChange={setTaxSettingId}>
              <SelectTrigger>
                <SelectValue placeholder="No tax allocation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No tax allocation</SelectItem>
                {taxSettings.map((taxSetting) => (
                  <SelectItem
                    key={taxSetting.id}
                    value={taxSetting.id}
                  >
                    {taxSetting.name} ({(taxSetting.rate * 100).toFixed(1)}%) →{" "}
                    {getTaxAccountName(taxSetting.accountId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which sales tax account this rule should use (from bookkeeping settings)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
