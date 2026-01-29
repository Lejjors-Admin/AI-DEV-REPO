import { apiRequest } from "./queryClient";
import { type AuditSection } from "@shared/schema";

export type ComplianceStatus = 'compliant' | 'issues_found' | 'critical_issues_found' | 'not_checked';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'reporting' | 'procedural' | 'regulatory' | 'documentation';
  severity: 'low' | 'medium' | 'high';
  validate: (auditFile: any) => boolean;
  recommendedAction: string;
}

export interface ComplianceIssue {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  recommendedAction: string;
  status: 'open' | 'addressed' | 'waived';
  createdAt: string;
  notes?: string;
}

export interface ComplianceCheckResult {
  status: ComplianceStatus;
  timestamp: string;
  auditFileId: number;
  rulesPassed: number;
  rulesFailed: number;
  issues: ComplianceIssue[];
  checksByCategory: {
    [key: string]: {
      total: number;
      passed: number;
    }
  };
}

// Canadian GAAP Compliance Rules
export const complianceRules: ComplianceRule[] = [
  {
    id: 'CA-FIN-001',
    name: 'Complete Financial Statements',
    description: 'Ensure all required financial statements are included in the audit file',
    category: 'financial',
    severity: 'high',
    validate: (auditFile) => {
      const sections = auditFile.sections || [];
      const requiredStatements = ['balance_sheet', 'income_statement', 'statement_of_cash_flows'];
      return requiredStatements.every(statement => 
        sections.some((section: AuditSection) => section.id.includes(statement))
      );
    },
    recommendedAction: 'Include all required financial statements: Balance Sheet, Income Statement, and Statement of Cash Flows.'
  },
  {
    id: 'CA-FIN-002',
    name: 'Balanced Book Check',
    description: 'Verify that the books are balanced (assets equal liabilities plus equity)',
    category: 'financial',
    severity: 'high',
    validate: (auditFile) => {
      // Implementation would inspect financial data in the audit file
      // For demonstration, we'll assume this check passes
      return true;
    },
    recommendedAction: 'Ensure that total assets equal total liabilities plus equity.'
  },
  {
    id: 'CA-DOC-001',
    name: 'Required Documentation Check',
    description: 'Verify that all required documentation is attached to the audit file',
    category: 'documentation',
    severity: 'medium',
    validate: (auditFile) => {
      // Check for required documents
      const uploadedDocs = auditFile.documents || [];
      const requiredDocs = [
        'engagement_letter',
        'representation_letter', 
        'bank_confirmations',
        'legal_confirmations'
      ];
      
      return requiredDocs.every(doc => 
        uploadedDocs.some((uploadedDoc: any) => uploadedDoc.type === doc)
      );
    },
    recommendedAction: 'Upload all required documentation before finalizing the audit file.'
  },
  {
    id: 'CA-PROC-001',
    name: 'Review Checklist Completion',
    description: 'Verify that all review checklists have been completed',
    category: 'procedural',
    severity: 'medium',
    validate: (auditFile) => {
      const sections = auditFile.sections || [];
      // Check if all sections marked as checklists are completed
      const checklists = sections.filter((section: AuditSection) => section.type === 'checklist');
      return checklists.every((checklist: any) => checklist.status === 'completed');
    },
    recommendedAction: 'Complete all checklist items before finalizing the audit file.'
  },
  {
    id: 'CA-REG-001',
    name: 'Disclosure Requirements Check',
    description: 'Verify compliance with Canadian GAAP disclosure requirements',
    category: 'regulatory',
    severity: 'high',
    validate: (auditFile) => {
      // In a real implementation, this would check for specific disclosures
      // For demonstration, we'll assume this check passes
      return true;
    },
    recommendedAction: 'Ensure all required disclosures are included in the financial statements.'
  },
  {
    id: 'CA-REG-002',
    name: 'GST/HST Compliance Check',
    description: 'Verify GST/HST compliance in the audit file',
    category: 'regulatory',
    severity: 'high',
    validate: (auditFile) => {
      // In a real implementation, this would check GST/HST compliance
      // For demonstration, we'll assume this check fails
      return false;
    },
    recommendedAction: 'Verify GST/HST collection and remittance processes.'
  },
  {
    id: 'CA-REP-001',
    name: 'ASPE Reporting Standards Check',
    description: 'Verify compliance with ASPE (Accounting Standards for Private Enterprises) reporting standards',
    category: 'reporting',
    severity: 'medium',
    validate: (auditFile) => {
      // In a real implementation, this would check specific ASPE requirements
      // For demonstration, we'll assume this check passes
      return true;
    },
    recommendedAction: 'Ensure financial statements comply with all ASPE standards.'
  },
  {
    id: 'CA-PROC-002',
    name: 'Partner Review Complete',
    description: 'Verify that a partner has reviewed and signed off on the audit file',
    category: 'procedural',
    severity: 'medium',
    validate: (auditFile) => {
      return Boolean(auditFile.partnerSignoffId && auditFile.partnerSignoffDate);
    },
    recommendedAction: 'Obtain partner review and sign-off before finalizing.'
  }
];

/**
 * Run compliance checks on an audit file
 */
export async function checkCompliance(auditFileId: number): Promise<ComplianceCheckResult> {
  try {
    const response = await apiRequest('POST', `/api/audit-files/${auditFileId}/compliance-check`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error running compliance checks:', error);
    throw error;
  }
}

/**
 * Update the status of a compliance issue
 */
export async function updateComplianceIssue(
  auditFileId: number, 
  issueId: string, 
  status: 'addressed' | 'waived',
  notes?: string
): Promise<any> {
  try {
    const response = await apiRequest('PATCH', `/api/audit-files/${auditFileId}/compliance-issue/${issueId}`, {
      status,
      notes
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating compliance issue:', error);
    throw error;
  }
}

/**
 * Get compliance status text
 */
export function getComplianceStatusText(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant':
      return 'Compliant';
    case 'issues_found':
      return 'Issues Found';
    case 'critical_issues_found':
      return 'Critical Issues';
    case 'not_checked':
    default:
      return 'Not Checked';
  }
}

/**
 * Determine overall compliance status based on issues
 */
export function determineComplianceStatus(issues: ComplianceIssue[]): ComplianceStatus {
  if (!issues || issues.length === 0) {
    return 'compliant';
  }
  
  const hasCriticalIssues = issues.some(issue => issue.severity === 'high');
  
  if (hasCriticalIssues) {
    return 'critical_issues_found';
  }
  
  return 'issues_found';
}