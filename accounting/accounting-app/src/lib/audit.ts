// Audit file generation functions
import { apiRequest } from "./queryClient";
import { v4 as uuidv4 } from 'uuid';
import { complianceRules, determineComplianceStatus } from "./compliance";

// Generate an audit file for a client
export async function generateAuditFile(clientId: number, options: any = {}) {
  try {
    // Fetch client data, transactions, and accounts from the API
    const clientResponse = await apiRequest("GET", `/api/clients/${clientId}`);
    const client = await clientResponse.json();
    
    const accountsResponse = await apiRequest("GET", `/api/accounts/${clientId}`);
    const accounts = await accountsResponse.json();
    
    const transactionsResponse = await apiRequest("GET", `/api/transactions/${clientId}`);
    const transactions = await transactionsResponse.json();
    
    // Include financial summary if available
    const summaryResponse = await apiRequest("GET", `/api/bookkeeping-summary/${clientId}`);
    const financialSummary = await summaryResponse.json();
    
    // For demo purposes, we'll create a more comprehensive audit file with real data
    const auditData = {
      clientId,
      clientName: client.name,
      generatedAt: new Date().toISOString(),
      fiscalYear: options.fiscalYear || new Date().getFullYear().toString(),
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        category: tx.categoryName || tx.type,
        description: tx.description,
        reference: tx.reference,
        status: tx.status,
        taxStatus: tx.taxStatus,
        accountId: tx.accountId
      })),
      accounts: accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        balance: parseFloat(acc.balance) || 0,
        accountNumber: acc.accountNumber
      })),
      summary: {
        totalRevenue: parseFloat(financialSummary?.revenue || "0"),
        totalExpenses: parseFloat(financialSummary?.expenses || "0"),
        netIncome: parseFloat(financialSummary?.netIncome || "0"),
        totalAssets: accounts
          .filter((acc: any) => acc.type === 'asset')
          .reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || "0"), 0),
        totalLiabilities: accounts
          .filter((acc: any) => acc.type === 'liability')
          .reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || "0"), 0),
        totalEquity: accounts
          .filter((acc: any) => acc.type === 'equity')
          .reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || "0"), 0)
      }
    };
    
    // Create audit file sections with checklists based on Canadian standards
    const auditSections = [
      {
        id: uuidv4(),
        title: "Financial Statements Review",
        description: "Review of all financial statements for compliance with Canadian GAAP",
        status: "not_started",
        checklists: [
          {
            id: uuidv4(),
            title: "Balance Sheet Review",
            items: [
              {
                id: uuidv4(),
                description: "Verify all assets are properly categorized",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Verify all liabilities are properly categorized",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Confirm equity calculations are accurate",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Assets = Liabilities + Equity",
                completed: false
              }
            ]
          },
          {
            id: uuidv4(),
            title: "Income Statement Review",
            items: [
              {
                id: uuidv4(),
                description: "Verify revenue recognition is appropriate",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Review expense categorization",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Validate net income calculation",
                completed: false
              }
            ]
          }
        ],
        documentsRequired: ["Balance Sheet", "Income Statement", "Statement of Cash Flows"],
        documentsUploaded: [],
        notes: ""
      },
      {
        id: uuidv4(),
        title: "Tax Compliance",
        description: "Review of tax compliance issues",
        status: "not_started",
        checklists: [
          {
            id: uuidv4(),
            title: "GST/HST Compliance",
            items: [
              {
                id: uuidv4(),
                description: "Verify GST/HST collected on revenue",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Verify GST/HST paid on expenses",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Reconcile GST/HST returns with financial statements",
                completed: false
              }
            ]
          },
          {
            id: uuidv4(),
            title: "Income Tax Compliance",
            items: [
              {
                id: uuidv4(),
                description: "Review corporate tax provisions",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Verify tax expense calculations",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Review tax remittances",
                completed: false
              }
            ]
          }
        ],
        documentsRequired: ["GST/HST Returns", "Income Tax Returns", "Tax Assessment Notices"],
        documentsUploaded: [],
        notes: ""
      },
      {
        id: uuidv4(),
        title: "Internal Controls",
        description: "Assessment of internal control systems",
        status: "not_started",
        checklists: [
          {
            id: uuidv4(),
            title: "Financial Controls",
            items: [
              {
                id: uuidv4(),
                description: "Review approval processes for expenditures",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Assess segregation of duties",
                completed: false
              },
              {
                id: uuidv4(),
                description: "Review bank reconciliation procedures",
                completed: false
              }
            ]
          }
        ],
        documentsRequired: ["Internal Control Policies", "Bank Reconciliations"],
        documentsUploaded: [],
        notes: ""
      }
    ];
    
    // Run initial compliance checks
    const auditFileData = {
      ...auditData,
      sections: auditSections
    };
    
    // Validate compliance with rules
    const issues = [];
    let rulesPassed = 0;
    let rulesFailed = 0;
    
    complianceRules.forEach(rule => {
      const passed = rule.validate(auditFileData);
      if (passed) {
        rulesPassed++;
      } else {
        rulesFailed++;
        issues.push({
          id: `issue-${Date.now()}-${rulesFailed}`,
          ruleId: rule.id,
          message: rule.description,
          severity: rule.severity,
          recommendedAction: rule.recommendedAction,
          status: 'open',
          createdAt: new Date().toISOString()
        });
      }
    });
    
    // Determine overall compliance status
    const complianceStatus = determineComplianceStatus(issues);
    
    // Create category summaries
    const checksByCategory = {};
    complianceRules.forEach(rule => {
      if (!checksByCategory[rule.category]) {
        checksByCategory[rule.category] = { total: 0, passed: 0 };
      }
      checksByCategory[rule.category].total++;
      
      if (issues.findIndex(issue => issue.ruleId === rule.id) === -1) {
        checksByCategory[rule.category].passed++;
      }
    });
    
    // Convert to JSON string for storage
    const fileContent = JSON.stringify({
      ...auditData,
      sections: auditSections,
      complianceRules: complianceRules,
      complianceIssues: issues,
      complianceStatus,
      complianceDetails: {
        rulesPassed,
        rulesFailed,
        checksByCategory,
        lastChecked: new Date().toISOString()
      }
    }, null, 2);
    
    // Save the audit file to the server
    const response = await apiRequest("POST", "/api/audit-files", {
      clientId,
      fileName: `audit_${client.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}_${new Date().toISOString().split('T')[0]}.json`,
      fileContent,
      status: "in_progress",
      needsUpdate: false,
      fiscalYear: new Date().getFullYear().toString(),
      auditType: options.auditType || "review",
      sections: auditSections,
      completionPercentage: 0,
      complianceStatus // Store the initial compliance status
    });
    
    return response;
  } catch (error) {
    console.error("Error generating audit file:", error);
    throw new Error("Failed to generate audit file");
  }
}

// Get audit files for a client
export async function getAuditFiles(clientId: number) {
  try {
    const response = await apiRequest("GET", `/api/audit-files/${clientId}`);
    return response;
  } catch (error) {
    throw new Error("Failed to fetch audit files");
  }
}

// Export audit file as JSON
export function exportAuditFile(auditFile: any) {
  try {
    const fileContent = auditFile.fileContent;
    const fileName = auditFile.fileName;
    
    // Create a blob from the JSON data
    const blob = new Blob([fileContent], { type: "application/json" });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    throw new Error("Failed to export audit file");
  }
}
