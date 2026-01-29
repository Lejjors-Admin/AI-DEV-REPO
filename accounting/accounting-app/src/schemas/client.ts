import { z } from "zod";

/**
 * Client Schema
 * Defines the validation schema for client creation and updates
 * Mapped from shared/database/core-entities.ts
 */

// Dependant schema for individual clients
const dependantSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  dateOfBirth: z.string(),
  socialInsuranceNumber: z.string().optional(),
  income: z.string().optional(),
  disabilityAmount: z.string().optional(),
  childCareBenefits: z.string().optional(),
  tuitionFees: z.string().optional(),
});

export const insertClientSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Client name is required").max(255),
  operatingName: z.string().max(255).optional(),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z.string().max(50).optional(),
  
  // Address Information
  address: z.string().optional(),
  addressCountry: z.string().max(50).optional(),
  addressStreet: z.string().max(255).optional(),
  addressCity: z.string().max(100).optional(),
  addressStateProvince: z.string().max(100).optional(),
  addressPostalCode: z.string().max(20).optional(),
  website: z.string().url("Invalid URL").max(255).optional().or(z.literal("")),
  
  // Business Information
  businessNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  incorporationDate: z.string().optional(), // ISO date string
  fiscalYearEnd: z.string().max(50).optional(),
  
  // Contact Person Information
  contactPersonName: z.string().max(255).optional(),
  contactPersonEmail: z.string().email().max(255).optional(),
  contactPersonPhone: z.string().max(50).optional(),
  contactPersonTitle: z.string().max(100).optional(),
  
  // Client Grouping
  clientGroupId: z.number().int().optional(),
  parentClientId: z.number().int().optional(),
  
  // Service & Work Type
  workType: z.array(z.string()).optional().default([]), // bookkeeping, tax_prep, audit, consulting
  serviceLevel: z.string().max(50).optional().default("standard"), // basic, standard, premium
  
  // Relationship Management
  firmId: z.number().int().optional(),
  assignedManagerId: z.number().int().optional(),
  clientAdminId: z.number().int().optional(),
  userId: z.number().int().optional().default(0), // Legacy field
  
  // Status & Onboarding
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional().default("active"),
  onboardingStatus: z.enum(["pending", "in_progress", "completed"]).optional().default("pending"),
  onboardingPercentComplete: z.number().int().min(0).max(100).optional().default(0),
  
  // Portal Access
  isPortalEnabled: z.boolean().optional().default(true),
  portalActiveModules: z.array(z.string()).optional().default(['dashboard', 'documents', 'billing', 'tasks']),
  portalLoginEnabled: z.boolean().optional().default(true),
  
  // Billing & Financial
  hourlyRate: z.string().optional(), // Decimal as string
  retainerAmount: z.string().optional(), // Decimal as string
  paymentTerms: z.string().max(50).optional().default("Net 30"),
  
  // Personal Tax Information (for Individual Clients)
  socialInsuranceNumber: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  maritalStatus: z.string().max(50).optional(),
  isCitizen: z.string().max(20).optional(),
  maritalStatusChanged: z.string().max(10).optional(),
  electionsCanadaAuthorization: z.string().max(10).optional(),
  clientType: z.string().max(20).optional().default("business"), // individual or business
  
  // Project Years for Tax Filing
  projectYears: z.array(z.string()).optional().default([]),
  
  // Dependants Information (for Individual Clients)
  hasDependants: z.string().max(10).optional(),
  dependants: z.array(dependantSchema).optional().default([]),
  
  // Additional Information
  notes: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InsertClient & {
  id: number;
  lastUpdate?: string;
  createdAt?: string;
  updatedAt?: string;
};

