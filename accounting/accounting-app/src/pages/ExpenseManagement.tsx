import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VendorManagement from "@/components/vendor/VendorManagement";
import BillManagement from "@/components/bill/BillManagement";
import ExpenseOverview from "@/components/dashboard/ExpenseOverview";
import ChequeExpenseManagement from "@/components/cheque/ChequeExpenseManagement";

interface ExpenseManagementProps {
  selectedClient?: number;
}

export default function ExpenseManagement({ selectedClient }: ExpenseManagementProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(selectedClient || null);
  const [activeTab, setActiveTab] = useState("overview");

  // Update selectedClientId when selectedClient prop changes
  useEffect(() => {
    if (selectedClient) {
      setSelectedClientId(selectedClient);
    }
  }, [selectedClient]);

  // Read tab from sessionStorage on mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('expenseManagementTab');
    if (savedTab) {
      setActiveTab(savedTab);
      sessionStorage.removeItem('expenseManagementTab'); // Clear after reading
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Manage vendors and purchase bills</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="bills">Purchases</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ExpenseOverview clientId={selectedClientId || undefined} />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <VendorManagement clientId={selectedClientId} />
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <BillManagement clientId={selectedClientId} />
        </TabsContent>

        <TabsContent value="cheques" className="space-y-4">
          <ChequeExpenseManagement clientId={selectedClientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}