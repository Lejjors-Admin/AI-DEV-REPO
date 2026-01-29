import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const accountNumberSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
});

type AccountNumberFormValues = z.infer<typeof accountNumberSchema>;

interface AccountNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: number;
    name: string;
    accountNumber: string | null;
    clientId: number;
  };
}

export function AccountNumberDialog({ open, onOpenChange, account }: AccountNumberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AccountNumberFormValues>({
    resolver: zodResolver(accountNumberSchema),
    defaultValues: {
      accountNumber: account.accountNumber || "",
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async (data: AccountNumberFormValues) => {
      return await apiRequest("PATCH", `/api/accounts/${account.id}`, {
        accountNumber: data.accountNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts", account.clientId] });
      toast({
        title: "Success",
        description: "Account number updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountNumberFormValues) => {
    updateAccountMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account Number</DialogTitle>
          <DialogDescription>
            Update the account number for "{account.name}"
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 1000, 1100-01, etc."
                      {...field}
                      disabled={updateAccountMutation.isPending}
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
                onClick={() => onOpenChange(false)}
                disabled={updateAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateAccountMutation.isPending}
              >
                {updateAccountMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}