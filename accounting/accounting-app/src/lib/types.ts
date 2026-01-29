/**
 * Frontend Type Definitions
 * 
 * This file contains all the TypeScript interfaces and types used by the frontend application.
 * These are independent of backend schemas and provide a clean interface for the UI.
 */

// ============================================================================
// CORE USER & CLIENT TYPES
// ============================================================================

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'staff' | 'client';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  businessNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ACCOUNTING TYPES
// ============================================================================

export interface Account {
  id: number;
  clientId: number;
  name: string;
  accountNumber?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales' | 'other_income' | 'other_expense';
  subtype?: string;
  isDebitNormal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  clientId: number;
  accountId: number;
  description: string;
  amount: number;
  date: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: number;
  clientId: number;
  entryNumber: string;
  description: string;
  entryDate: string;
  totalDebits: number;
  totalCredits: number;
  status: 'draft' | 'posted' | 'reversed';
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  description: string;
  debitAmount: number;
  creditAmount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PAYROLL TYPES
// ============================================================================

export interface Employee {
  id: number;
  clientId: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  province: string;
  postalCode?: string;
  sinEncrypted?: string;
  dateOfBirth?: string;
  hireDate: string;
  terminationDate?: string;
  jobTitle?: string;
  department?: string;
  payType: 'salary' | 'hourly';
  payRate: string;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  federalBasicPersonalAmount: string;
  provincialBasicPersonalAmount: string;
  federalClaimCode: string;
  provincialClaimCode: string;
  unionDues: string;
  additionalTaxDeduction: string;
  healthBenefits: string;
  dentalBenefits: string;
  lifeInsurance: string;
  status: 'active' | 'terminated' | 'on_leave';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: number;
  clientId: number;
  payRunNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Paystub {
  id: number;
  payrollRunId: number;
  employeeId: number;
  grossPay: number;
  netPay: number;
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
  otherDeductions: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TAX TYPES
// ============================================================================

export interface TaxJurisdiction {
  id: number;
  type: 'federal' | 'provincial';
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxBracket {
  id: number;
  jurisdictionId: number;
  year: number;
  fromAmount: number;
  toAmount?: number;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollTaxSetting {
  id: number;
  clientId: number;
  province: string;
  remittanceFrequency: 'monthly' | 'quarterly' | 'annually';
  remitterType: 'regular' | 'new' | 'small';
  averageMonthlyRemittance: string;
  federalBasicPersonalAmount: string;
  provincialBasicPersonalAmount: string;
  cppEnabled: boolean;
  cppRate: string;
  cppMaxEarnings: string;
  cppBasicExemption: string;
  eiEnabled: boolean;
  eiRate: string;
  eiMaxEarnings: string;
  employerEiMultiplier: string;
  workersCompEnabled: boolean;
  workersCompRate: string;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemittanceSchedule {
  id: number;
  clientId: number;
  type: 'federal_tax' | 'provincial_tax' | 'cpp' | 'ei';
  taxType: 'cpp' | 'ei' | 'income_tax' | 'gst_hst';
  frequency: 'monthly' | 'quarterly' | 'annually';
  dueRule: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Remittance {
  id: number;
  clientId: number;
  scheduleId: number;
  taxType: 'cpp' | 'ei' | 'income_tax' | 'gst_hst';
  type?: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate: string;
  paymentDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  referenceNumber?: string;
  confirmationNumber?: string;
  notes?: string;
  penaltyAmount?: number;
  interestAmount?: number;
  totalOwed?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaxCompliance {
  id: number;
  clientId: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  totalPenalties: number;
  totalInterest: number;
  lastAssessmentDate?: string;
  nextReviewDate?: string;
  issues: TaxComplianceIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface TaxComplianceIssue {
  id: number;
  complianceId: number;
  type: 'late_payment' | 'incorrect_amount' | 'missing_filing' | 'penalty_assessment';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'under_review';
  dueDate?: string;
  resolvedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CRM TYPES
// ============================================================================

export interface Contact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: number;
  clientId: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  businessNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SYSTEM TYPES
// ============================================================================

export interface Invitation {
  id: number;
  email: string;
  role: 'admin' | 'staff' | 'client';
  clientId?: number;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Binder {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  year: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'reviewed';
  createdAt: string;
  updatedAt: string;
}

export interface BinderSection {
  id: number;
  binderId: number;
  sectionId: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'reviewed';
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface BinderWorkpaper {
  id: number;
  sectionId: number;
  name: string;
  type: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'reviewed';
  isRequired: boolean;
  filePath?: string;
  preparedBy?: number;
  reviewedBy?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AI & MILTON TYPES
// ============================================================================

export interface AIAgentTask {
  id: number;
  clientId: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: string;
  output?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISetting {
  id: number;
  clientId: number;
  key: string;
  value: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MiltonPlugin {
  id: number;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPluginConfig {
  id: number;
  clientId: number;
  pluginId: number;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CHEQUE TYPES
// ============================================================================

export interface Cheque {
  id: number;
  clientId: number;
  chequeNumber: string;
  bankAccountId: number;
  payee: string;
  amount: number;
  date: string;
  memo?: string;
  status: 'draft' | 'printed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ChequeLine {
  id: number;
  chequeId: number;
  accountId: number;
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: number;
  clientId: number;
  name: string;
  accountNumber: string;
  routingNumber?: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FORM SCHEMAS (Zod)
// ============================================================================

import { z } from "zod";

// Employee insert schema matching the database table structure
export const insertEmployeeSchema = z.object({
  clientId: z.number().min(1, "Client ID is required"),
  employeeNumber: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  sinEncrypted: z.string().optional(),
  dateOfBirth: z.string().optional(),
  hireDate: z.string().min(1, "Hire date is required"),
  terminationDate: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  
  // Pay structure - convert decimal to string for form compatibility
  payType: z.enum(['salary', 'hourly']),
  payRate: z.string().min(1, "Pay rate is required"),
  payFrequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
  
  // Tax information - convert decimal to string for form compatibility
  federalBasicPersonalAmount: z.string().default("15000.00"),
  provincialBasicPersonalAmount: z.string().default("11865.00"),
  federalClaimCode: z.string().default("1"),
  provincialClaimCode: z.string().default("1"),
  
  // Deductions - convert decimal to string for form compatibility
  unionDues: z.string().default("0.00"),
  additionalTaxDeduction: z.string().default("0.00"),
  
  // Benefits - convert decimal to string for form compatibility
  healthBenefits: z.string().default("0.00"),
  dentalBenefits: z.string().default("0.00"),
  lifeInsurance: z.string().default("0.00"),
  
  // Status
  status: z.enum(['active', 'terminated', 'on_leave']).default('active')
});
  

export const insertPayrollTaxSettingSchema = z.object({
  clientId: z.number().min(1),
  province: z.string().min(1),
  remittanceFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  remitterType: z.enum(['regular', 'new', 'small']),
  averageMonthlyRemittance: z.string(),
  federalBasicPersonalAmount: z.string(),
  provincialBasicPersonalAmount: z.string(),
  cppEnabled: z.boolean(),
  cppRate: z.string(),
  cppMaxEarnings: z.string(),
  cppBasicExemption: z.string(),
  eiEnabled: z.boolean(),
  eiRate: z.string(),
  eiMaxEarnings: z.string(),
  employerEiMultiplier: z.string(),
  workersCompEnabled: z.boolean(),
  workersCompRate: z.string(),
  effectiveDate: z.string(),
  isActive: z.boolean().default(true)
});

export const insertTaxJurisdictionSchema = z.object({
  type: z.enum(['federal', 'provincial']),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().default(true)
});

export const insertTaxBracketSchema = z.object({
  jurisdictionId: z.number().min(1),
  year: z.number().min(2020),
  fromAmount: z.number().min(0),
  toAmount: z.number().min(0).optional(),
  rate: z.number().min(0).max(1)
});

export const insertRemittanceScheduleSchema = z.object({
  clientId: z.number().min(1),
  type: z.enum(['federal_tax', 'provincial_tax', 'cpp', 'ei']),
  frequency: z.enum(['monthly', 'quarterly', 'annually']),
  dueRule: z.string().min(1),
  isActive: z.boolean().default(true)
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}
