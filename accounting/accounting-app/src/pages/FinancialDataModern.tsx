import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ModernSidebar } from "@/components/ModernSidebar";
import ReportsTab from "@/components/financial/ReportsTab";

import BookkeepingSettingsTab from "@/components/financial/BookkeepingSettingsTab";
import { MiltonChat } from "@/components/MiltonChat";
import IncomeManagement from "@/pages/IncomeManagement";
import ExpenseManagement from "@/pages/ExpenseManagement";
import PayrollManagement from "@/pages/PayrollManagement";
import { ChartOfAccounts } from "@/components/ChartOfAccounts";
import TransactionLedger from "@/components/TransactionLedger";
import TransactionManager from "@/pages/TransactionManager";
import { Link } from "wouter";
import { 
  Info, Users, BarChart3, Calculator, 
  Settings, DollarSign, Building, FileText 
} from "lucide-react";
import TaxDashboard from "./TaxDashbaord";
import { ClientNarrativePanel } from "@/components/ClientNarrativePanel";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

export default function FinancialDataModern() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { selectedClientId, setSelectedClientId } = useSelectedClient();

  // Read tab from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1]);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Convert clientId to string for legacy compatibility
  const selectedClient = selectedClientId ? selectedClientId.toString() : "";

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch client overview data
  const { data: overviewData, isLoading: isLoadingOverview, isError: isOverviewError } = useQuery({
    queryKey: [`/api/clients/${selectedClient}/overview`],
    enabled: !!selectedClient,
  });

  const getContentForTab = () => {
    if (!selectedClient) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-4">
            <Users className="h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Select a Client</h2>
          <p className="text-gray-600 max-w-md">
            Choose a client from the sidebar to begin managing their financial data.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return selectedClient ? (
          <div className="h-full overflow-hidden">
            {/* Split Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-6">
              {/* Left Panel - AI Narrative (2/3 width on large screens) */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6 overflow-y-auto">
                <ClientNarrativePanel clientId={selectedClient} />
              </div>

              {/* Right Panel - Key Metrics (1/3 width on large screens) */}
              <div className="space-y-4 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900">📊 Key Metrics</h3>
                
                {isLoadingOverview ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading metrics...</p>
                  </div>
                ) : isOverviewError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">Failed to load metrics</p>
                  </div>
                ) : (
                  <>
                    {/* Cash on Hand */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">💰 Cash on Hand</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${overviewData?.totalAssets?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <span>↗ +12%</span>
                      </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">📊 Monthly Revenue</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${overviewData?.monthlyRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <span>↗ +18%</span>
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">📈 Net Profit</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${((overviewData?.monthlyRevenue || 0) * 0.288).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        Margin: 28.8%
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">⚠️ ACTION ITEMS</p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• 3 overdue invoices</li>
                        <li>• HST filing due Dec 1</li>
                        <li>• 2 transactions need review</li>
                      </ul>
                    </div>

                    {/* Bank Reconciliation */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <p className="text-sm font-semibold text-gray-900 mb-2">🏦 RECONCILIATION</p>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div className="flex justify-between">
                          <span>✅ TD Bank</span>
                          <span className="text-gray-500 text-xs">Nov 10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">⚠️ Investor Acct</span>
                          <span className="text-yellow-600 text-xs">4 unmatched</span>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <p className="text-sm font-semibold text-gray-900 mb-2">📅 UPCOMING DEADLINES</p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex justify-between">
                          <span>Dec 1</span>
                          <span>HST Filing</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Dec 15</span>
                          <span>Payroll Run</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Dec 31</span>
                          <span>Year-end close</span>
                        </li>
                      </ul>
                    </div>

                    {/* Quick Link */}
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      View Full Reports →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : <div className="p-4 text-center text-gray-500">Please select a client to view overview</div>;
      case "income-management":
        return selectedClient ? <IncomeManagement selectedClient={parseInt(selectedClient)} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "expense-management":
        return selectedClient ? <ExpenseManagement selectedClient={parseInt(selectedClient)} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "payroll-management":
        return selectedClient ? <PayrollManagement clientId={selectedClient} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "tax-management":
        return selectedClient ? <TaxDashboard clientId={selectedClient} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "accounts":
      case "chart-of-accounts":
        return selectedClient ? <ChartOfAccounts clientId={selectedClient} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "journal-entries":
      case "transaction-ledger":
        return selectedClient ? <TransactionLedger clientId={parseInt(selectedClient)} showAllEntries={true} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "transaction-manager":
        return selectedClient ? <TransactionManager clientId={parseInt(selectedClient)} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;

      case "bank-feeds":
        return selectedClient ? (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Bank Feeds</h2>
            <p className="text-gray-600">Bank feeds management for client {selectedClient}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Bank feeds functionality will be implemented here.</p>
            </div>
          </div>
        ) : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "bank-transactions":
        return selectedClient ? (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Bank Transactions</h2>
            <p className="text-gray-600">Bank transactions for client {selectedClient}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Bank transactions functionality will be implemented here.</p>
            </div>
          </div>
        ) : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "reporting":
      case "reports":
        return selectedClient ? <ReportsTab clientId={selectedClient} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "bookkeeping-settings":
        return selectedClient ? <BookkeepingSettingsTab clientId={selectedClient} /> : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      case "milton-ai":
        return selectedClient ? (
          <div className="h-full">
            <MiltonChat clientId={parseInt(selectedClient)} context="classification" className="h-full" />
          </div>
        ) : <div className="p-4 text-center text-gray-500">Please select a client</div>;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <FileText className="h-16 w-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Welcome to AccountSync</h2>
            <p className="text-gray-600 max-w-md">
              Select a feature from the sidebar to get started with your financial management.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 w-full">
      {/* Modern Sidebar */}
      <div className="flex-shrink-0">
        <ModernSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          clients={clients || []}
          isLoadingClients={isLoadingClients}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="h-full w-full min-w-0 overflow-y-auto">
          {getContentForTab()}
        </div>
      </div>
    </div>
  );
}