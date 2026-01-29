import { ModernSidebar } from "@/components/ModernSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartOfAccounts } from "@/components/ChartOfAccounts";
import TransactionLedger from "@/components/TransactionLedger";
import TransactionManager from "@/pages/TransactionManager";
import IncomeManagement from "@/pages/IncomeManagement";
import ExpenseManagement from "@/pages/ExpenseManagement";
import PayrollManagement from "@/pages/PayrollManagement";
import ReportsTab from "@/components/financial/ReportsTab";
import { BankFeedsList } from "@/components/financial/BankFeedsList";
import BookkeepingSettingsTab from "@/components/financial/BookkeepingSettingsTab";
import MiltonBooksChat from "@/components/milton/MiltonBooksChat";
// DesignSwitcher removed - demo component updated to match modern design
import {
  BarChart3,
  FileText,
  Calculator,
  Users,
  Settings,
  DollarSign,
  TrendingUp,
  Info,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import TaxDashboard from "@/pages/TaxDashbaord";

export function SidebarDemo() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClient, setSelectedClient] = useState("1");

  // Use actual client data from API
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: true,
  });

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
  };

  const getContentForTab = () => {
    if (!selectedClient) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <Info className="h-12 w-12 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Select a Client</h2>
          <p className="text-neutral-500 max-w-md mb-4">
            Please select a client from the dropdown to view and manage their
            financial data.
          </p>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Use the client dropdown to switch between clients</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    Manage chart of accounts, transactions, bank feeds, and
                    contacts
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    Import transactions from CSV or connect with QuickBooks
                    Online
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Map sidebar tabs to exact FinancialData tabs and content
    switch (activeTab) {
      case "overview":
        // Show actual overview dashboard from FinancialData
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,459.32</div>
                <p className="text-xs text-muted-foreground">
                  +5.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Net Income
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$32,772.57</div>
                <p className="text-xs text-muted-foreground">
                  +15.3% from last month
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case "accounts":
        // Maps to "accounts" tab in FinancialData
        return <ChartOfAccounts clientId={parseInt(selectedClient)} />;
      case "transaction-manager":
        // Maps to "transaction-manager" tab in FinancialData
        return <TransactionManager clientId={selectedClient} />;
      case "journal-entries":
        // Maps to "journal-entries" tab in FinancialData
        return <TransactionLedger clientId={parseInt(selectedClient)} />;
      case "income-management":
        // Maps to IncomeManagement page
        return <IncomeManagement selectedClient={selectedClient} />;
      case "expense-management":
        // Maps to ExpenseManagement page
        return <ExpenseManagement selectedClient={selectedClient} />;
      case "payroll-management":
        // Maps to PayrollManagement page
        return <PayrollManagement clientId={selectedClient} />;
      case "tax-management":
        // Maps to new Tax Management Dashboard
        return <TaxDashboard clientId={selectedClient} />;
      case "reporting":
      case "profit-loss":
      case "balance-sheet":
      case "trial-balance":
        // Maps to "reporting" tab in FinancialData
        return <ReportsTab clientId={parseInt(selectedClient)} />;
      case "bank-feeds":
        return (
          <BankFeedsList
            clientId={parseInt(selectedClient)}
            onSelectBankFeed={() => {}}
            selectedBankFeedId={null}
          />
        );
      case "bookkeeping-settings":
        return <BookkeepingSettingsTab clientId={parseInt(selectedClient)} />;
      case "milton-ai":
        return (
          <div className="h-full">
            <MiltonBooksChat clientId={parseInt(selectedClient)} />
          </div>
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Feature Not Yet Mapped</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                This feature ({activeTab}) needs to be mapped to its
                corresponding content from the current FinancialData page.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Modern Sidebar */}
      <div className="flex-shrink-0">
        <ModernSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedClient={selectedClient}
          clients={Array.isArray(clients) ? clients : []}
          isLoadingClients={false}
          onClientChange={handleClientChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Modern Bookkeeping Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Client:{" "}
              <strong>
                {clients.find((c) => c.id.toString() === selectedClient)?.name}
              </strong>{" "}
              | Active Tab:{" "}
              <strong>
                {activeTab
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </strong>
            </p>
          </div>

          {getContentForTab()}
        </div>
      </div>
    </div>
  );
}
