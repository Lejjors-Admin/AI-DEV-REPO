import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { TimezoneProvider } from "./contexts/TimezoneContext";
import { SelectedClientProvider } from "./contexts/SelectedClientContext";
import PerfexImport from "@/pages/PerfexImport";
import AppLayout from "./components/layout/AppLayout";
import SaasAdminLayout from "./components/layout/SaasAdminLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import FinancialData from "./pages/FinancialData";
import FinancialDataBackup from "./pages/FinancialDataBackup";
import FinancialDataModern from "./pages/FinancialDataModern";
import TransactionManager from "./pages/TransactionManager";
import BankFeeds from "./pages/BankFeedsNew";
import AuditFiles from "./pages/AuditFiles";
import BinderModern from "./pages/BinderModern";
import Pages from "./pages/PagesFixed";
import AuditBinder from "@/pages/AuditBinder";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import AccessControl from "./pages/AccessControl";
import ClientRegistrationForm from "./pages/client-registration-form";
import AIAgentsManagement from "./pages/AIAgentsManagement";
import AISettingsPage from "./pages/ai-settings";
import Search from "./pages/search";
import UserProfile from "./pages/user-profile";
import IntegrationsPage from "./pages/IntegrationsPage";
import AILearningCenter from "./pages/AILearningCenter";
import { SidebarDemo } from "./components/SidebarDemo";
import FinancialReports from "./pages/FinancialReports";
import SimpleReports from "./pages/SimpleReports";
import ComprehensiveReports from "./pages/ComprehensiveReports";
import TrialBalancePage from "./pages/TrialBalancePage";
import Rules from "./pages/Rules";
import Reconcile from "./pages/Reconcile";

// Auth Pages
import AuthLanding from "./pages/auth/auth-landing";
import LoginPage from "./pages/auth/login-page";
import RegisterFirmPage from "./pages/auth/register-firm";
import RegisterClientPage from "./pages/auth/register-client";
import RegisterStaffPage from "./pages/auth/register-staff";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TenantTest from "./pages/TenantTest";
import TestLogin from "./pages/TestLogin";

import NotFound from "./pages/not-found";
import ClientDashboard from "./pages/ClientDashboard"; // Import the ClientDashboard component
import EnhancedSaasAdminPanel from "./pages/saas-admin/EnhancedSaasAdminPanel";
import CreateInvitation from "./pages/CreateInvitation";
import EditClient from "./pages/EditClient";
import ClientDocuments from "./pages/ClientDocuments";
import ChequeManagement from "./pages/ChequeManagement";
import { TestMilton } from "./pages/TestMilton";
import TarsAutonomous from "./pages/TarsAutonomous";
import OCRTest from "./pages/OCRTest";
import PayrollManagement from "./pages/PayrollManagement";
import TaxDashboard from "./pages/TaxDashbaord";
import TaxSettings from "./pages/TaxSettings";
import TaxRemittanceTracking from "./pages/TaxRemittanceTracking";
import TaxReportsDashboard from "./pages/TaxReportDashboard";
import CalendarNew from "./pages/CalendarNew";
import ChequeTemplateEditor from "./pages/ChequeTemplateEditor";
import DocumentTemplateEditor from "./pages/DocumentTemplateEditor";
import DocumentTemplateList from "./pages/DocumentTemplateList";
import CustomerStatement from "./pages/CustomerStatement";

function ApplicationRoutes() {
  const { user } = useAuth();
  // Route SaaS owner to admin panel, others to main app
  if (user?.role === "saas_owner") {
    return (
      <Switch>
        <Route path="/saas-admin" nest>
          <SaasAdminLayout>
            <Route path="/" component={EnhancedSaasAdminPanel} />
            <Route component={EnhancedSaasAdminPanel} />
          </SaasAdminLayout>
        </Route>
        <Route>
          <SaasAdminLayout>
            <EnhancedSaasAdminPanel />
          </SaasAdminLayout>
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Main Application Layout - accessible by all authenticated users */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/clients/:id/edit" component={EditClient} />
            <Route path="/clients/:id/documents" component={ClientDocuments} />
            <Route path="/create-invitation" component={CreateInvitation} />

            <Route path="/dashboard" component={Dashboard} />
            <Route path="/" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/:id" component={Clients} />
            <Route
              path="/client-registration"
              component={ClientRegistrationForm}
            />
            {/* Pages Practice Management */}
            <Route path="/pages" component={Pages} />
            <Route path="/pages/:tab" component={Pages} />

            {/* Binder-specific engagement pages */}
            <Route path="/binder/:binderId/engagement" component={Pages} />
            <Route path="/engagement/:binderId" component={AuditBinder} />

            <Route path="/books" component={FinancialDataModern} />
            <Route path="/books/:clientId?" component={FinancialDataModern} />
            <Route path="/books/:tab" component={FinancialDataModern} />
            <Route
              path="/books/:tab/:clientId"
              component={FinancialDataModern}
            />

            {/* Cheque Management */}
            <Route path="/cheques" component={ChequeManagement} />
            <Route path="/cheque-templates/:id" component={ChequeTemplateEditor} />

            {/* Document Templates */}
            <Route path="/document-templates" component={DocumentTemplateList} />
            {/* More specific routes first */}
            <Route path="/document-templates/:documentType/new" component={DocumentTemplateEditor} />
            <Route path="/document-templates/:documentType/:id" component={DocumentTemplateEditor} />
            {/* Fallback route for legacy URLs without documentType - will redirect after loading template */}
            <Route path="/document-templates/:id" component={DocumentTemplateEditor} />
            {/* Customer Statement of Account */}
            <Route path="/customers/:customerId/statement" component={CustomerStatement} />

            {/* Cheque Management */}
            <Route path="/cheques" component={ChequeManagement} />
            {/* Backup route for original design */}
            <Route path="/books-backup" component={FinancialDataBackup} />
            {/* Legacy route for original tabbed design */}
            <Route path="/books-legacy" component={FinancialData} />
            {/* Keep old bookkeeping routes for backward compatibility */}
            <Route path="/bookkeeping" component={FinancialData} />
            <Route path="/bookkeeping/:clientId?" component={FinancialData} />
            <Route path="/bookkeeping/:tab" component={FinancialData} />
            <Route
              path="/bookkeeping/:tab/:clientId"
              component={FinancialData}
            />
            {/* Keep the old routes temporarily for backward compatibility */}
            <Route path="/financial-data" component={FinancialData} />
            <Route path="/financial-data/:tab" component={FinancialData} />
            <Route
              path="/financial-data/:tab/:clientId"
              component={FinancialData}
            />
            <Route path="/audit-files" component={AuditFiles} />
            <Route path="/binder" component={BinderModern} />
            <Route path="/binder/:id" component={BinderModern} />
            <Route path="/calendar" component={CalendarNew} />

            <Route path="/ai-agents" component={AIAgentsManagement} />
            <Route path="/ai-settings" component={AISettingsPage} />
            <Route path="/ai-learning-center" component={AILearningCenter} />
            <Route path="/tars-autonomous" component={TarsAutonomous} />
            <Route path="/test-milton" component={TestMilton} />
            <Route path="/search" component={Search} />
            <Route path="/user-profile" component={UserProfile} />
            <Route path="/access-control" component={AccessControl} />
            <Route path="/integrations" component={IntegrationsPage} />
            <Route path="/sidebar-demo" component={SidebarDemo} />

            <Route path="/settings" component={Settings} />
            <Route path="/reports" component={ComprehensiveReports} />
            <Route
              path="/trial-balance/:clientId"
              component={TrialBalancePage}
            />

            <Route path="/rules/:clientId?" component={Rules} />
            <Route path="/reconcile/:clientId?" component={Reconcile} />
            <Route path="/ocr-test" component={OCRTest} />
            <Route path="/transaction-manager">
              {() => <TransactionManager clientId={0} />}
            </Route>
            <Route path="/bank-feeds" component={BankFeeds} />
            <Route path="/tenant-test" component={TenantTest} />

            {/* Payroll Management Routes */}
            <Route
              path="/payroll"
              component={() => <PayrollManagement clientId="" />}
            />
            <Route path="/payroll/:clientId">
              {({ clientId }) => <PayrollManagement clientId={clientId} />}
            </Route>

            {/* Tax Management Dashboard - Real Business Tax Tracking */}
            <Route path="/taxes" component={() => <TaxDashboard />} />
            <Route path="/taxes/:clientId">
              {({ clientId }) => <TaxDashboard clientId={clientId} />}
            </Route>

            {/* Payroll Tax Settings - Configuration only */}
            <Route
              path="/payroll/tax-settings"
              component={() => <TaxSettings />}
            />
            <Route path="/payroll/tax-settings/:clientId">
              {({ clientId }) => <TaxSettings clientId={clientId} />}
            </Route>

            {/* Tax Remittance Tracking Routes */}
            <Route
              path="/tax-remittances"
              component={() => <TaxRemittanceTracking />}
            />
            <Route path="/tax-remittances/:clientId">
              {({ clientId }) => <TaxRemittanceTracking clientId={clientId} />}
            </Route>

            {/* Tax Reports Dashboard Routes */}
            <Route
              path="/tax-reports"
              component={() => <TaxReportsDashboard />}
            />
            <Route path="/tax-reports/:clientId">
              {({ clientId }) => <TaxReportsDashboard clientId={clientId} />}
            </Route>

            <Route component={NotFound} />

            <Route path="/ai-agents" component={AIAgentsManagement} />
            <Route path="/ai-settings" component={AISettingsPage} />
            <Route path="/ai-learning-center" component={AILearningCenter} />
            <Route path="/search" component={Search} />
            <Route path="/user-profile" component={UserProfile} />
            <Route path="/access-control" component={AccessControl} />
            <Route path="/integrations" component={IntegrationsPage} />
            <Route path="/perfex-import" component={PerfexImport} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Auth Routes */}
      <Route path="/login" component={Login} />
      <Route path="/test-login" component={TestLogin} />
      <Route path="/register" component={Register} />

      {/* Legacy Auth Routes */}
      <Route path="/auth" component={AuthLanding} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register/firm" component={RegisterFirmPage} />
      <Route path="/auth/register/client" component={RegisterClientPage} />
      <Route path="/auth/register/staff" component={RegisterStaffPage} />

      {/* Client Portal Route - standalone, not wrapped in AppLayout */}
      <ProtectedRoute path="/client-portal" component={ClientDashboard} />

      {/* Protected Application Routes */}
      <ProtectedRoute path="/*" component={ApplicationRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TimezoneProvider>
          <SelectedClientProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SelectedClientProvider>
        </TimezoneProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;