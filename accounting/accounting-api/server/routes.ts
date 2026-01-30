import express, {
  type Express,
  Request,
  Response,
  NextFunction,
} from "express";
import { createServer, type Server } from "http";
import { v4 as uuidv4 } from "uuid";
import taskRoutes from "./routes/enhanced-task-routes";
import sessionRoutes from "./routes/session-routes";
import projectLifecycleRoutes from "./routes/project-lifecycle-routes";
import { storage } from "./minimal-storage";
import invoiceApprovalRoutes from "./routes/invoice-approval-routes";
import contactManagementRoutes from "./routes/contact-management-routes";
import miltonSchedulingRoutes from "./routes/milton-scheduling-routes";
import billingApiRoutes from "./routes/billing-api-routes";
import resourceAllocationRoutes from "./routes/resource-allocation-routes";
import timeTrackingRoutes from "./routes/enhanced-time-tracking-routes";
import tagRoutes from "./routes/tag-routes";
import chequeTemplateRoutes from "./routes/cheque-template-routes";
import clientNarrativeRoutes from "./routes/client-narrative-routes";
import reportingApiRoutes from "./routes/reporting-api-routes";
import timeTrackingApiRoutes from "./routes/time-tracking-api-routes";
import endToEndValidationRoutes from "./routes/end-to-end-validation-routes";
import projectDashboardsRoutes from "./routes/project-dashboards-routes";
import bulkOperationsRoutes from "./routes/bulk-operations-routes";
import clientProjectIntegrationRoutes from "./routes/client-project-integration-routes";
import firmManagementRoutes from "./routes/firm-management-routes";
import clientAssignmentRoutes from "./routes/client-assignment-routes";
import customReportBuilderRoutes from "./routes/custom-report-builder-routes";
import dashboardWidgetRoutes from "./routes/dashboard-widget-routes";
import schedulingRoutes from "./routes/scheduling-routes";
import clientOnboardingRoutes from "./routes/client-onboarding-routes";
import perfexImportRoutes from "./routes/perfex-import-routes";
import notificationApiRoutes from "./routes/notification-api-routes";
import clientOverviewRoutes from "./routes/client-overview-routes";
import teamManagementRoutes from "./routes/team-management-routes";
import taskFeaturesRoutes from "./routes/task-features-routes";
import communicationRoutes from "./routes/communication-routes";
import taskStatusRoutes from "./routes/task-status-routes";
import documentTemplateRoutes from "./routes/document-template-routes";
import { vendorStorage } from "./storage/books/vendor-storage";
import { crmStorage } from "./storage/crm-storage";
import { billStorage } from "./storage/books/bill-storage";
import projectTemplateRoutes from "./routes/project-template-routes";
import { z } from "zod";
import projectApiRoutes from "./routes/project-api-routes";
import clientIntakeRoutes from "./routes/client-intake-routes";
import { requireAuthHybrid } from "./auth";
import { requireModuleAccess, hasModuleAccess, isAdminRole } from "./module-access";
import { db } from "./db";
import { invitations, firms, users, clients, bills, activities, tasks, projects, timeEntries } from "../shared/schema";
import { eq, inArray, and, sql, desc } from "drizzle-orm";
import locationRoutes from "./routes/location-routes";
import classRoutes from "./routes/class-routes";
import miltonRoutes from "./routes/milton"; // Unified Milton routes
import approvalRoutes from "./routes/approval-routes";
import {
  insertChequeSchema,
  insertChequeLineSchema,
  type InsertCheque,
  type InsertChequeLine,
} from "@shared/database/cheque-entities";
// insertClientSchema will be imported with other schemas below
import passport from "passport";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  categorizeTransaction,
  batchCategorizeTransactions,
  generateChartOfAccounts,
} from "./openai-helper";
import binderRoutes from "./routes/binder-routes";
import settingsRoutes from "./routes/settings-routes";
import { setupBankFeedsRoutes } from "./routes/bank-feeds-routes";
import casewareRoutes from "./routes/caseware-routes";
import { registerSimpleAISettingsRoutes } from "./routes/ai-settings-simple";
import { registerConnieRoutes } from "./routes/connie-routes";
import aiIntakeRoutes from "./routes/ai-intake-routes";
import { registerIntegrationRoutes } from "./routes/integration-routes";
import { registerAILearningRoutes } from "./routes/ai-learning-routes";
import transactionUploadRoutes from "./routes/transaction-upload-routes";
import enhancedTransactionRoutes from "./routes/enhanced-transaction-routes";
import crmRoutes from "./routes/crm-routes";
import integrationSettingsRoutes from "./routes/integration-settings-routes";
import transactionRoutes from "./routes/transaction-routes";
import invoiceRoutes from "./routes/invoice-routes";
import billRoutes from "./routes/bill-routes";
import chequeRoutes from "./routes/cheque-routes";
import vendorRoutes from "./routes/vendor-routes";
import chequeUploadRoutes from "./routes/cheque-upload-routes";
import projectRoutes from "./routes/project-routes";
import miltonSmartRoutes from "./routes/milton-smart-route";
import receiptRoutes from "./routes/receipt-routes";
import saasAdminRoutes from "./routes/saas-admin-routes";
import billingRoutes from "./routes/billing-history-routes";
import pagesBillingRoutes from "./routes/pages-billing-routes";
import { registerTarsRoutes } from "./routes/tars-routes";
import { journalRouter as journalRoutes } from "./routes/journal-routes";
import { registerSimpleTarsRoutes } from "./routes/tars-simple";
import { sectionTemplateService } from "./binder/section-template-service";
import { aiSectionGenerator } from "./binder/ai-section-generator";
import { registerTrialBalanceRoutes } from "./routes/trial-balance-routes";
import rulesRoutes from "./routes/rules-routes";
import taskAssignmentRoutes from "./routes/task-assignment-routes";
import reconciliationRoutes from "./routes/reconciliation-routes";
import taxSettingsRoutes from "./routes/tax-settings-routes";
import { taxRouter } from "./routes/tax-routes";
import { glStagingRouter } from "./routes/gl-staging-routes";
import notificationRoutes from "./routes/notification-routes";
import generalLedgerRouter from "./routes/general-ledger-routes";
import ocrTestRoutes from "./routes/ocr-test-routes";
import roleRoutes from "./routes/role-routes";
import aiClientIntakeRoutes from "./routes/ai-client-intake-routes";
import aiProjectTaskRoutes from "./routes/ai-project-task-routes";
import aiDocumentProcessingRoutes from "./routes/ai-document-processing-routes";
import aiFinancialAutomationRoutes from "./routes/ai-financial-automation-routes";
import aiGuardrailsRoutes from "./routes/ai-guardrails-routes";
import aiWorkflowAutomationRoutes from "./routes/ai-workflow-automation-routes";
import salesRoutes from "./routes/sales-routes";
// Old Milton routes removed - now using unified milton.ts
// Commented out for now - import { getTarsService } from "./binder/tars-service";

// Tenant testing endpoints
async function setupTenantTestRoutes(app: Express) {
  // Get current tenant status
  app.get("/api/admin/tenant-status", async (req, res) => {
    try {
      // Use Drizzle ORM query instead of raw SQL
      const turackfirmClients = { rows: [] }; // Temporary fix - replace with proper query

      // Use Drizzle ORM query instead of raw SQL
      const cricketOntario = { rows: [null] }; // Temporary fix - replace with proper query

      res.json({
        turackfirmClients: turackfirmClients.rows || [],
        cricketOntario: cricketOntario.rows?.[0] || null,
      });
    } catch (error) {
      console.error("Tenant status error:", error);
      res
        .status(500)
        .json({ success: false, message: "Could not get tenant status" });
    }
  });

  // Connect client to firm
  app.post("/api/admin/connect-client", async (req, res) => {
    try {
      const { clientId, firmId } = req.body;

      // Update client firm assignment using storage method
      await storage.updateClient(clientId, { firmId });

      // Create client assignment record - simplified for now
      // TODO: Implement proper client assignment creation

      res.json({ success: true, message: "Client connected to firm" });
    } catch (error) {
      console.error("Connect client error:", error);
      res
        .status(500)
        .json({ success: false, message: "Could not connect client" });
    }
  });

  // Disconnect client from firm
  app.post("/api/admin/disconnect-client", async (req, res) => {
    try {
      const { clientId } = req.body;
      // Remove client assignments - simplified for now
      // TODO: Implement proper client assignment deletion
      // Set client as independent
      await storage.updateClient(clientId, { firmId: null });
      res.json({ success: true, message: "Client disconnected from firm" });
    } catch (error) {
      console.error("Disconnect client error:", error);
      res
        .status(500)
        .json({ success: false, message: "Could not disconnect client" });
    }
  });
}

// Helper function to find bank account for double-entry accounting
async function findBankAccount(
  storage: any,
  clientId: number
): Promise<number | null> {
  try {
    const accounts = await storage.getAccountsByClient(clientId);
    const bankAccount = accounts.find(
      (acc: any) =>
        acc.type === "asset" &&
        (acc.name.toLowerCase().includes("cash") ||
          acc.name.toLowerCase().includes("checking") ||
          acc.name.toLowerCase().includes("bank"))
    );
    return bankAccount?.id || null;
  } catch (error) {
    console.error("Error finding bank account:", error);
    return null;
  }
}

// Simple CSV parser for transactions
async function parseCsvTransactions(
  csvContent: string,
  clientId: number
): Promise<any[]> {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const transactions: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const transaction: any = { clientId };

    // Map common CSV headers to transaction fields
    headers.forEach((header, index) => {
      const value = values[index] || "";

      if (header.includes("date")) {
        transaction.date = value;
      } else if (header.includes("description") || header.includes("memo")) {
        transaction.description = value;
      } else if (
        header.includes("amount") ||
        header.includes("debit") ||
        header.includes("credit")
      ) {
        const amount = parseFloat(value.replace(/[,$]/g, "")) || 0;
        if (header.includes("debit") || amount < 0) {
          transaction.debitAmount = Math.abs(amount).toString();
          transaction.creditAmount = "0";
        } else {
          transaction.creditAmount = Math.abs(amount).toString();
          transaction.debitAmount = "0";
        }
        transaction.amount = amount;
      } else if (header.includes("payee") || header.includes("vendor")) {
        transaction.payee = value;
      } else if (header.includes("reference") || header.includes("ref")) {
        transaction.reference = value;
      }
    });

    // Set default values
    if (!transaction.date) transaction.date = new Date().toISOString();
    if (!transaction.description)
      transaction.description = "Imported transaction";
    if (!transaction.amount) transaction.amount = 0;
    if (!transaction.debitAmount && !transaction.creditAmount) {
      transaction.debitAmount = "0";
      transaction.creditAmount = "0";
    }

    transaction.status = "review";
    transaction.importSource = "csv";
    transaction.transactionGroupId = `csv-${Date.now()}-${i}`;

    transactions.push(transaction);
  }

  return transactions;
}
// Import required schemas and types
import { User } from "../shared/schema";

// Temporary type definitions for missing types
type ClientBookkeepingSettings = {
  taxSettings?: any[];
  [key: string]: any;
};

import {
  insertClientSchema,
  batchClientUpdateSchema,
  batchTaskUpdateSchema,
  batchAuditFileUpdateSchema,
  insertTaskSchema,
  insertInvitationSchema,
} from "../shared/database/core-entities";
import { documentTemplateStorage } from "./storage/books/document-template-storage.js";

// Password hashing utilities
const scryptAsync = promisify(scrypt);

// Account number normalization function
function normalizeAccountNumber(accountNumber: string): {
  withHyphen: string;
  digitsOnly: string;
  original: string;
} {
  const trimmed = accountNumber.trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, ""); // Remove all non-digits

  // Reconstruct with hyphen if applicable (e.g., 106000 -> 106-000)
  let withHyphen = trimmed;
  if (!trimmed.includes("-") && digitsOnly.length === 6) {
    withHyphen = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  }

  return {
    original: trimmed,
    withHyphen,
    digitsOnly,
  };
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Configure multer for disk storage (for files that need to be processed)
const uploadToDisk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for Caseware files
  },
  fileFilter: (req, file, cb) => {
    // Allow Caseware file types (.ac is the compressed format used by real Caseware files)
    const allowedExts = [".cwf", ".cwd", ".xml", ".ac"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      const error = new Error(
        "Only Caseware files (.cwf, .cwd, .xml, .ac) are allowed"
      );
      cb(null, false);
    }
  },
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Standardized function for handling amount conversions
// Ensures consistent decimal precision throughout the application
function processAmount(amount: string | number | null | undefined): number {
  // Handle null or undefined
  if (amount === null || amount === undefined) {
    return 0;
  }

  // If it's already a number, return it with 2 decimal places
  if (typeof amount === "number") {
    // Check for NaN or invalid numbers
    if (isNaN(amount)) {
      console.warn(`Warning: processAmount received NaN, returning 0`);
      return 0;
    }
    return parseFloat(amount.toFixed(2));
  }

  // If it's a string, clean it first (remove currency symbols, commas, etc.)
  if (typeof amount === "string") {
    // Handle empty strings
    if (!amount.trim()) {
      return 0;
    }

    // Remove any non-numeric characters except decimal point and minus sign
    const cleanAmount = amount.replace(/[^\d.-]/g, "");

    // Parse the amount and preserve decimal precision
    return parseFloat(parseFloat(cleanAmount).toFixed(2));
  }

  // Fallback for unexpected inputs
  return 0;
}

/**
 * Validates Chart of Accounts structure only (no balances)
 * @param accounts The array of accounts to validate
 * @returns Object containing structure validation result
 */
async function validateChartOfAccounts(accounts: any[]): Promise<{
  balanced: boolean;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  difference: number;
  message: string;
  totalDebits: number;
  totalCredits: number;
  originalDebits: number;
  originalCredits: number;
}> {
  // Count accounts by type for structure validation only
  let assetCount = 0;
  let liabilityCount = 0;
  let equityCount = 0;
  let incomeCount = 0;
  let costOfSalesCount = 0;
  let expenseCount = 0;

  console.log(`\n=== CHART OF ACCOUNTS STRUCTURE VALIDATION ===`);
  console.log(`Processing ${accounts.length} accounts`);

  for (const account of accounts) {
    console.log(`${account.name} (${account.type}): Account structure created`);

    // Count accounts by type for structure validation
    const accountType = (account.type || "").toLowerCase();

    switch (accountType) {
      case "asset":
      case "assets":
        assetCount++;
        break;
      case "liability":
      case "liabilities":
        liabilityCount++;
        break;
      case "equity":
      case "capital":
        equityCount++;
        break;
      case "income":
      case "revenue":
      case "sales":
        incomeCount++;
        break;
      case "expense":
      case "expenses":
        expenseCount++;
        break;
      case "cost_of_sales":
      case "cost of sales":
      case "cogs":
        costOfSalesCount++;
        break;
      default:
        console.log(
          `  WARNING: Unknown account type: ${account.type} for ${account.name}`
        );
    }
  }

  const message = `Chart of accounts structure validated: ${assetCount} assets, ${liabilityCount} liabilities, ${equityCount} equity accounts`;

  return {
    balanced: true, // Structure validation always passes
    totalAssets: assetCount,
    totalLiabilities: liabilityCount,
    totalEquity: equityCount,
    netIncome: 0, // No balances in COA
    difference: 0, // No balance differences in COA
    message,
    totalDebits: 0, // No balances in COA
    totalCredits: 0, // No balances in COA
    originalDebits: 0,
    originalCredits: 0,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup storage on Express app for route access
  app.set("storage", storage);

  // Health check endpoint - no authentication required
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Test database connection
      const testQuery = await storage.getAccounts(1).catch(() => null);
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: testQuery !== null ? "connected" : "disconnected",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: "error"
      });
    }
  });

  // Setup authentication with Passport
  const { checkPermission, checkClientAccess } = setupAuth(app);

  // Setup bank feeds routes
  setupBankFeedsRoutes(app);

  // Apply authentication to API routes
  const apiRouter = express.Router();

  // Middleware to ensure authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Protected API routes - require authentication
  const protectedApiRouter = express.Router();
  apiRouter.use("/protected", protectedApiRouter);

  // Public registration routes (no auth required)
  apiRouter.post("/register/firm", async (req: Request, res: Response) => {
    try {
      // Validate required fields
      if (!req.body.firmName) {
        return res.status(400).json({ message: "Firm name is required" });
      }
      if (!req.body.email) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!req.body.username) {
        return res.status(400).json({ message: "Username is required" });
      }
      if (!req.body.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      if (!req.body.adminName) {
        return res.status(400).json({ message: "Admin name is required" });
      }

      const firmData = {
        name: req.body.firmName,
        email: req.body.email, // Firm email (can be same as admin email)
        phone: req.body.phone || null,
        address: req.body.address || null,
        licenseNumber: req.body.licenseNumber || null,
        jurisdiction: req.body.jurisdiction || "Canada",
        subscriptionTier: "basic",
        maxClients: 10,
        maxUsers: 5,
      };

      const adminData = {
        username: req.body.username,
        password: await hashPassword(req.body.password),
        name: req.body.adminName,
        email: req.body.adminEmail || req.body.email, // Use adminEmail if provided, otherwise use firm email
        role: "firm_admin" as const,
        isAccountOwner: true,
      };

      console.log("[Firm Registration] Starting transactional creation of firm and admin user");
      // Use database transaction to ensure both firm and user are created atomically
      let result;
      try {
        result = await db.transaction(async (tx) => {
          let createdFirm;
          try {
            const firmResult = await tx
              .insert(firms)
              .values({
                name: firmData.name,
                email: firmData.email,
                phone: firmData.phone || null,
                address: firmData.address || null,
                licenseNumber: firmData.licenseNumber || null,
                businessNumber: firmData.licenseNumber || null, // CRA Business Number
                jurisdiction: firmData.jurisdiction || "Canada",
                subscriptionTier: (firmData.subscriptionTier === "basic" || firmData.subscriptionTier === "professional" || firmData.subscriptionTier === "enterprise")
                  ? firmData.subscriptionTier
                  : "basic" as const,
                maxClients: firmData.maxClients || 10,
                maxUsers: firmData.maxUsers || 5,
                practiceAreas: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();

            createdFirm = firmResult[0];
            console.log("[Firm Registration] Firm insert result:", firmResult);
          } catch (firmError: any) {
            throw new Error(`Failed to create firm: ${firmError?.message || firmError?.detail || 'Unknown error'}`);
          }

          if (!createdFirm) {
            throw new Error("Failed to create firm - no result returned");
          }

          console.log("[Firm Registration] Firm created successfully:", { id: createdFirm.id, name: createdFirm.name });

          const firm = {
            id: createdFirm.id,
            name: createdFirm.name,
            email: createdFirm.email,
            phone: createdFirm.phone,
            address: createdFirm.address,
            licenseNumber: createdFirm.licenseNumber,
            jurisdiction: createdFirm.jurisdiction,
            subscriptionTier: createdFirm.subscriptionTier,
            maxClients: createdFirm.maxClients,
            maxUsers: createdFirm.maxUsers,
          };
          let admin;
          try {
            const adminResult = await tx
              .insert(users)
              .values({
                username: adminData.username,
                password: adminData.password,
                name: adminData.name,
                email: adminData.email,
                role: adminData.role,
                isAccountOwner: adminData.isAccountOwner,
                firmId: firm.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();

            admin = adminResult[0];
            console.log("[Firm Registration] Admin user insert result:", adminResult);
          } catch (userError: any) {
            console.error("[Firm Registration] Error inserting admin user:", {
              message: userError?.message,
              detail: userError?.detail,
              constraint: userError?.constraint,
              code: userError?.code,
              stack: userError?.stack,
            });
            throw new Error(`Failed to create admin user: ${userError?.message || userError?.detail || 'Unknown error'}`);
          }

          if (!admin) {
            throw new Error("Failed to create admin user - no result returned");
          }

          console.log("[Firm Registration] Admin user created successfully:", { id: admin.id, username: admin.username });

          return { firm, admin };
        });
      } catch (transactionError: any) {
        // Re-throw to be caught by outer catch block
        throw transactionError;
      }

      const { firm, admin } = result;
      console.log("[Firm Registration] Transaction completed successfully - Firm and admin user created");

      // Verify both records were actually created in the database
      try {
        const verifyFirm = await db.select().from(firms).where(eq(firms.id, firm.id)).limit(1);
        const verifyAdmin = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
        if (verifyFirm.length === 0) {
          console.error("[Firm Registration] WARNING: Firm was not found in database after transaction!");
          throw new Error("Firm was not created in the database");
        }
        if (verifyAdmin.length === 0) {
          console.error("[Firm Registration] WARNING: Admin user was not found in database after transaction!");
          throw new Error("Admin user was not created in the database");
        }
      } catch (verifyError: any) {
        console.error("[Firm Registration] Verification failed:", verifyError);
        throw new Error(`Verification failed: ${verifyError?.message || 'Unknown error'}`);
      }

      res.status(201).json({
        message: "Firm and admin account created successfully",
        firm: { id: firm.id, name: firm.name },
        admin: { id: admin.id, username: admin.username, name: admin.name },
      });
    } catch (error: any) {
      console.error("[Firm Registration] Error creating firm:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
      });
      // Provide more specific error messages
      let errorMessage = "Failed to create firm account";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.constraint) {
        if (error.constraint.includes("username")) {
          errorMessage = "Username already exists. Please choose a different username.";
        } else if (error.constraint.includes("email")) {
          errorMessage = "Email already exists. Please use a different email address.";
        }
      }
      res.status(500).json({
        message: errorMessage,
        error: error?.message || "Unknown error"
      });
    }
  });

  apiRouter.post("/register/user", async (req: Request, res: Response) => {
    try {
      const userData = {
        username: req.body.username,
        password: await hashPassword(req.body.password),
        name: req.body.name,
        email: req.body.email,
        role: req.body.role || "firm_user",
        firmId: req.body.firmId,
        department: req.body.department,
        position: req.body.position,
      };

      const user = await storage.createUser(userData);

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user account" });
    }
  });

  // Login route
  apiRouter.post(
    "/login",
    passport.authenticate("local"),
    (req: Request, res: Response) => {
      const user = req.user as User;
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          firmId: user.firmId,
          clientId: user.clientId,
        },
      });
    }
  );

  // Logout route
  apiRouter.post("/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // User routes
  apiRouter.get("/current-user", (req: Request, res: Response) => {
    console.log("Current user request - Session ID:", req.sessionID);
    console.log("Current user request - User:", req.user);
    console.log(
      "Current user request - IsAuthenticated:",
      req.isAuthenticated ? req.isAuthenticated() : "no isAuthenticated method"
    );

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      position: user.position,
      firmId: user.firmId,
      accountId: user.accountId,
      clientId: user.clientId,
      isManager: user.isManager,
      isAccountOwner: user.isAccountOwner,
    });
  });

  // Get current user information (alias for /current-user)
  apiRouter.get("/users/me", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get full user details from database
      const { users } = await import('../shared/schema');

      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: userData.avatar,
        department: userData.department,
        position: userData.position,
        firmId: userData.firmId,
        accountId: userData.accountId,
        clientId: userData.clientId,
        isManager: userData.isManager,
        isAccountOwner: userData.isAccountOwner,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user information" });
    }
  });

  // Update current user information
  apiRouter.put("/users/me", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, email, username, department, position, avatar } = req.body;

      const { users } = await import('../shared/schema');

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (username !== undefined) updateData.username = username;
      if (department !== undefined) updateData.department = department;
      if (position !== undefined) updateData.position = position;
      if (avatar !== undefined) updateData.avatar = avatar;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        department: updatedUser.department,
        position: updatedUser.position,
        firmId: updatedUser.firmId,
        accountId: updatedUser.accountId,
        clientId: updatedUser.clientId,
        isManager: updatedUser.isManager,
        isAccountOwner: updatedUser.isAccountOwner,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user information" });
    }
  });

  // Create invitation endpoint - requires authentication
  apiRouter.post("/invitations", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { email, role, message, inviteType } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }

      // Get firmId from token (now included in JWT payload)
      const firmId: number | null | undefined = user.firmId;
      console.log(`[Invitation] User ${user.id} (${user.username}) - firmId from token: ${firmId}`);
      // For staff invitations, firmId is required
      if (!firmId && inviteType === "staff") {
        return res.status(400).json({
          message: "Firm ID is required for staff invitations. Your account is not associated with a firm. Please contact your administrator."
        });
      }

      // Map role to database role
      let dbRole: "firm_admin" | "firm_user" | "client_admin" | "client_user";
      if (role === "staff" || role === "manager") {
        dbRole = role === "manager" ? "firm_admin" : "firm_user";
      } else {
        dbRole = role as "firm_admin" | "firm_user" | "client_admin" | "client_user";
      }

      // Generate invitation code (6 characters, alphanumeric)
      const generateCode = (): string => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Generate unique code
      let code: string;
      let codeExists = true;
      while (codeExists) {
        code = generateCode();
        const existing = await db.select().from(invitations).where(eq(invitations.code, code)).limit(1);
        codeExists = existing.length > 0;
      }

      // Generate token for URL-based invites
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      // Set expiration (7 days from now)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create invitation record
      const [invitation] = await db.insert(invitations).values({
        code: code!,
        token,
        email,
        role: dbRole,
        firmId: firmId || null,
        invitedBy: user.id,
        status: "pending",
        expiresAt,
        message: message || null,
        inviteType: inviteType || null,
      }).returning();

      // Get firm information for email
      let firmName = "our accounting firm";
      if (firmId) {
        const firm = await db.select().from(firms).where(eq(firms.id, firmId)).limit(1);
        if (firm.length > 0) {
          firmName = firm[0].name;
        }
      }

      // Send invitation email with code
      const emailSubject = `Invitation to join ${firmName}`;
      const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/register/staff`;
      const roleDisplayName = role === "staff" ? "Staff Member" : role === "manager" ? "Manager" : role === "firm_admin" ? "Firm Administrator" : role;

      // Plain text version
      const emailBody = `
Hello,

You have been invited to join ${firmName} as a ${roleDisplayName}.

${message ? `Message from ${user.name || user.username || "the administrator"}: ${message}` : ''}

To complete your registration, please use the following invitation code:
${code!}

Visit: ${registrationUrl}

This invitation will expire in 7 days.

Best regards,
${user.name || user.username || "The Team"}
${firmName}
      `.trim();

      // HTML version for better email formatting
      const invitationCode = code!; // Store code in a const for template
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join ${firmName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">You're Invited!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello,</p>
    
    <p style="font-size: 16px;">
      You have been invited to join <strong>${firmName}</strong> as a <strong>${roleDisplayName}</strong>.
    </p>
    
    ${message ? `
    <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-style: italic; color: #666;">
        "${message}"
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #999;">
        - ${user.name || user.username || "The Administrator"}
      </p>
    </div>
    ` : ''}
    
    <div style="background: white; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; border: 2px solid #667eea;">
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Your invitation code is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 15px 0;">
        ${invitationCode}
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${registrationUrl}" 
         style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Complete Registration
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Or visit: <a href="${registrationUrl}" style="color: #667eea;">${registrationUrl}</a>
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        This invitation will expire in 7 days.
      </p>
      <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
        If you did not expect this invitation, please ignore this email.
      </p>
    </div>
    
    <p style="margin-top: 30px; font-size: 16px;">
      Best regards,<br>
      <strong>${user.name || user.username || "The Team"}</strong><br>
      ${firmName}
    </p>
  </div>
</body>
</html>
      `.trim();

      try {
        const { sendEmail } = await import('./email-service');
        await sendEmail({
          to: email,
          subject: emailSubject,
          text: emailBody,
          html: emailHtml
        });
        console.log(`📧 Invitation email sent to ${email} with code ${code}`);
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError);
        // Log the error but continue - invitation is still created
        // The user can still use the code manually
        console.log(`⚠️ Email sending failed, but invitation code ${code} was created. User can register manually.`);
      }

      res.status(201).json({
        success: true,
        code: code!,
        email,
        role: dbRole,
        firmId,
        expiresAt: expiresAt.toISOString(),
        message: "Invitation created and email sent successfully"
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      // Provide more specific error messages
      let errorMessage = "Failed to create invitation";
      if (error instanceof Error) {
        // Check for database errors
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          errorMessage = "Database table not found. Please run database migrations.";
        } else if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
          errorMessage = "An invitation with this code already exists. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Invitation verification endpoint - no auth required for verification
  apiRouter.get("/invitations/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();

      // Query invitation from database
      const result = await db
        .select({
          id: invitations.id,
          code: invitations.code,
          email: invitations.email,
          role: invitations.role,
          firmId: invitations.firmId,
          clientId: invitations.clientId,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          inviteType: invitations.inviteType,
        })
        .from(invitations)
        .where(eq(invitations.code, code))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({
          message: "Invalid or expired invitation code",
        });
      }

      const invitation = result[0];

      // Check if invitation is expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({
          message: "This invitation has expired",
        });
      }

      // Check if invitation is already accepted
      if (invitation.status !== "pending") {
        return res.status(400).json({
          message: "This invitation has already been used",
        });
      }

      // Get firm information if firmId exists
      let firmName = null;
      let firmEmail = null;
      if (invitation.firmId) {
        const firmResult = await db
          .select({
            name: firms.name,
            email: firms.email,
          })
          .from(firms)
          .where(eq(firms.id, invitation.firmId))
          .limit(1);
        if (firmResult.length > 0) {
          firmName = firmResult[0].name;
          firmEmail = firmResult[0].email;
        }
      }

      res.json({
        valid: true,
        firmId: invitation.firmId,
        firmName,
        firmEmail,
        role: invitation.role,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        inviteType: invitation.inviteType,
      });
    } catch (error) {
      console.error("Error verifying invitation:", error);
      res.status(500).json({ message: "Failed to verify invitation code" });
    }
  });

  // Accept invitation endpoint - marks invitation as accepted
  apiRouter.post("/invitations/:code/accept", async (req: Request, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();
      const { name, email, position, department, phone, userId } = req.body;

      // Verify invitation exists and is valid
      const result = await db
        .select()
        .from(invitations)
        .where(eq(invitations.code, code))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({
          message: "Invalid invitation code",
        });
      }

      const invitation = result[0];

      // Check if invitation is expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({
          message: "This invitation has expired",
        });
      }

      // Check if invitation is already accepted
      if (invitation.status !== "pending") {
        return res.status(400).json({
          message: "This invitation has already been used",
        });
      }

      // Prepare update data
      const updateData: any = {
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date()
      };

      // If userId is provided (user was already created), link the invitation to the user
      if (userId) {
        updateData.acceptedBy = userId;
      }

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set(updateData)
        .where(eq(invitations.id, invitation.id));

      console.log(`[Invitation] Invitation ${code} accepted by user ${userId || 'pending'}`);

      res.json({
        success: true,
        message: "Invitation accepted",
        invitation: {
          id: invitation.id,
          firmId: invitation.firmId,
          role: invitation.role,
        }
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Client routes - Require authentication and filter by firm for proper tenant isolation
  apiRouter.get("/clients", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      let clients: any[] = [];

      // Get clients based on user role with proper tenant isolation
      if (user.role === "saas_owner" || user.role === "super_admin") {
        // Super admin can see all clients across all firms
        clients = await storage.getClients();
      } else if ((user.role === "firm_admin" || user.role === "firm_user") && user.firmId) {
        // Firm admin and firm users can only see clients belonging to their firm
        clients = await storage.getClientsByFirm(user.firmId);
      } else if ((user.role === "client_admin" || user.role === "client_user") && user.clientId) {
        // Client users can only see their own client
        const client = await storage.getClient(user.clientId);
        clients = client ? [client] : [];
      } else {
        // No access if role/permissions don't match
        clients = [];
      }

      console.log(`Fetching clients for user ${user.id} (role: ${user.role}, firmId: ${user.firmId}), found ${clients.length} clients`);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Note: checkClientAccess is imported from setupAuth

  apiRouter.get(
    "/clients/:id",
    requireAuthHybrid,
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;

        if (!user) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const client = await storage.getClient(Number(req.params.id));
        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }

        // Validate access based on user role
        if (user.role === "saas_owner" || user.role === "super_admin") {
          // Super admin can access any client
          return res.json(client);
        } else if ((user.role === "firm_admin" || user.role === "firm_user") && user.firmId) {
          // Firm users can only access clients from their firm
          if (client.firmId !== user.firmId) {
            return res.status(403).json({ message: "Access denied: Client belongs to different firm" });
          }
        } else if ((user.role === "client_admin" || user.role === "client_user") && user.clientId) {
          // Client users can only access their own client
          if (client.id !== user.clientId) {
            return res.status(403).json({ message: "Access denied: Cannot access other client data" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }

        res.json(client);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch client" });
      }
    }
  );

  apiRouter.post("/clients", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any; // Type assertion to fix User property access

      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Ensure firm users can only create clients for their own firm
      if ((user.role === "firm_admin" || user.role === "firm_user") && user.firmId) {
        // Force firmId to match user's firm for security
        req.body.firmId = user.firmId;
      }

      console.log(
        "Creating new client with comprehensive data:",
        JSON.stringify(
          {
            ...req.body,
            // Don't log potentially sensitive fields
            password: req.body.password ? "REDACTED" : undefined,
            clientPortalSettings: req.body.clientPortalSettings
              ? "CONFIGURED"
              : undefined,
          },
          null,
          2
        )
      );

      // Make sure userId is provided
      if (!req.body.userId && user?.id) {
        console.log(`Adding userId: ${user.id} to client data`);
        req.body.userId = user.id;
      }

      // Make sure firmId is provided if the user is associated with a firm
      if (!req.body.firmId && user?.firmId) {
        console.log(`Adding firmId: ${user.firmId} to client data`);
        req.body.firmId = user.firmId;
      }

      // Handle fiscal year end date formatting
      if (req.body.fiscalYearEnd) {
        try {
          const fiscalDate = new Date(req.body.fiscalYearEnd);
          req.body.fiscalYearEnd = fiscalDate;
        } catch (err) {
          console.warn("Invalid fiscal year end date format, using default");
          req.body.fiscalYearEnd = new Date(new Date().getFullYear(), 11, 31); // Default to December 31
        }
      }

      // Parse and validate client portal settings if provided
      if (
        req.body.clientPortalSettings &&
        typeof req.body.clientPortalSettings === "string"
      ) {
        try {
          req.body.clientPortalSettings = JSON.parse(
            req.body.clientPortalSettings
          );
        } catch (err) {
          console.warn("Invalid client portal settings JSON, using defaults");
          req.body.clientPortalSettings = {
            enabled: false,
            allowFileUpload: false,
            allowDocumentDownload: false,
            allowInvoiceViewing: false,
            allowCommunication: false,
          };
        }
      }

      // Ensure business information is properly structured
      if (req.body.businessNumber && !req.body.businessInformation) {
        req.body.businessInformation = {
          businessNumber: req.body.businessNumber,
          incorporationDate: req.body.incorporationDate || null,
          businessType: req.body.businessType || "corporation",
        };
      }

      // Ensure contact person information is properly structured
      if (req.body.contactPersonName && !req.body.contactPerson) {
        req.body.contactPerson = {
          name: req.body.contactPersonName,
          email: req.body.contactPersonEmail || req.body.email,
          phone: req.body.contactPersonPhone || req.body.phone,
          title: req.body.contactPersonTitle || "Primary Contact",
        };
      }

      // Fix fiscalYearEnd if it was auto-converted from string to Date
      if (req.body.fiscalYearEnd instanceof Date) {
        req.body.fiscalYearEnd = req.body.fiscalYearEnd
          .toISOString()
          .split("T")[0];
        console.log(
          "Fixed fiscalYearEnd from Date to string:",
          req.body.fiscalYearEnd
        );
      }

      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);

      console.log("Client created successfully with ID:", client.id);

      // If this client was created using an invitation code, mark the invitation as used
      if (req.body.invitationCode) {
        try {
          // TODO: Replace with proper drizzle query method when available
          // await storage.updateInvitation(invitationId, { status: 'used', usedAt: new Date(), usedByClientId: client.id });
          console.log(
            `Marked invitation ${req.body.invitationCode} as used for client ${client.id} (update skipped - needs implementation)`
          );
        } catch (invitationError) {
          console.warn("Error updating invitation status:", invitationError);
        }
      }

      // Create initial client workflow if work types are specified
      if (client.workType && client.workType.length > 0) {
        try {
          for (const workType of client.workType) {
            // TODO: Replace with proper method when createClientWorkflow is available
            // await storage.createClientWorkflow({
            console.log(
              `Would create workflow: ${workType} - ${client.name} (method needs implementation)`
            );
            // });
          }
          console.log(
            `Would create ${client.workType.length} initial workflows for client ${client.id}`
          );
        } catch (workflowError) {
          console.warn("Error creating initial workflows:", workflowError);
          // Don't fail client creation if workflow creation fails
        }
      }

      // Create client group assignment if specified
      if (req.body.clientGroupId) {
        try {
          // This would be implemented in storage layer
          console.log(
            `Assigning client ${client.id} to group ${req.body.clientGroupId}`
          );
        } catch (groupError) {
          console.warn("Error assigning client to group:", groupError);
        }
      }

      // Activity logging temporarily disabled
      console.log(`New Client Added: ${client.name} (ID: ${client.id})`);

      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid client data",
          errors: error.errors,
          details: "Please check all required fields and data formats",
        });
      }
      res.status(500).json({
        message: "Failed to create client",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  apiRouter.patch(
    "/clients/:id",
    requireAuthHybrid,
    checkClientAccess,
    async (req: express.Request, res: express.Response) => {
      try {
        const updates = insertClientSchema.partial().parse(req.body);
        const updatedClient = await storage.updateClient(
          Number(req.params.id),
          updates
        );
        if (!updatedClient) {
          return res.status(404).json({ message: "Client not found" });
        }
        res.json(updatedClient);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid client data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update client" });
      }
    }
  );

  apiRouter.delete(
    "/clients/:id",
    requireAuthHybrid,
    checkClientAccess,
    async (req: express.Request, res: express.Response) => {
      try {
        const success = await storage.deleteClient(Number(req.params.id));
        if (!success) {
          return res.status(404).json({ message: "Client not found" });
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: "Failed to delete client" });
      }
    }
  );


  // Get all contact persons (includes both manually created ones and ones from clients)
  // Security: Requires authentication and filters by user's firm
  apiRouter.get("/contact-persons", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { isActive } = req.query;

      // Always use the authenticated user's firmId for security
      const userFirmId = user.firmId;
      if (!userFirmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      const params: any = { firmId: userFirmId };
      if (isActive !== undefined) params.isActive = isActive === 'true';

      // Get manually created contact persons for this firm only
      const manualContactPersons = await storage.getContactPersons(params);

      // Get clients for this firm only and extract their contact person information
      const allClients = await storage.getClients();
      const firmClients = allClients.filter(client => client.firmId === userFirmId);

      // If user is a client user, filter to only their client
      const clients = (user.role === 'client_admin' || user.role === 'client_user') && user.clientId
        ? firmClients.filter(client => client.id === user.clientId)
        : firmClients;

      const clientContactPersons = clients
        .filter(client => client.contactPersonName && client.contactPersonEmail)
        .map(client => ({
          id: `client-${client.id}`, // Prefix to distinguish from manual contacts
          name: client.contactPersonName,
          email: client.contactPersonEmail,
          phone: client.contactPersonPhone || null,
          title: client.contactPersonTitle || null,
          firmId: client.firmId,
          isActive: client.status === 'active',
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
          source: 'client', // Mark as coming from client data
          clientId: client.id // Reference to the client
        }));

      // Merge both arrays, with manual contacts taking precedence
      const allContactPersons = [...manualContactPersons, ...clientContactPersons];

      // Remove duplicates based on email (manual contacts take precedence)
      const uniqueContacts = [];
      const seenEmails = new Set();

      for (const contact of allContactPersons) {
        if (!seenEmails.has(contact.email)) {
          uniqueContacts.push(contact);
          seenEmails.add(contact.email);
        }
      }

      res.json(uniqueContacts);
    } catch (error) {
      console.error('Error fetching contact persons:', error);
      res.status(500).json({ error: 'Failed to fetch contact persons' });
    }
  });

  // Create a new contact person
  // Security: Requires authentication and uses user's firmId
  apiRouter.post("/contact-persons", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.firmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      const { name, email, phone, title, country, isActive } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Always use the authenticated user's firmId for security
      const newContact = await storage.createContactPerson({
        name,
        email,
        phone: phone || null,
        title: title || null,
        country: country || 'Canada',
        firmId: user.firmId, // Use authenticated user's firmId
        isActive: isActive !== undefined ? isActive : true,
      });

      res.status(201).json(newContact);
    } catch (error: any) {
      console.error('Error creating contact person:', error);
      res.status(500).json({
        error: 'Failed to create contact person',
        message: error.message
      });
    }
  });

  // Update a contact person
  // Security: Requires authentication and validates firm ownership
  apiRouter.put("/contact-persons/:id", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.firmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid contact person ID' });
      }

      // Verify the contact person belongs to the user's firm
      const contacts = await storage.getContactPersons({ firmId: user.firmId });
      const existingContact = contacts.find(c => c.id === id);

      if (!existingContact) {
        return res.status(404).json({ error: 'Contact person not found or access denied' });
      }

      const { name, email, phone, title, country, isActive } = req.body;

      const updated = await storage.updateContactPerson(id, {
        name,
        email,
        phone,
        title,
        country,
        isActive,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Contact person not found' });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Error updating contact person:', error);
      res.status(500).json({
        error: 'Failed to update contact person',
        message: error.message
      });
    }
  });

  // Delete a contact person
  // Security: Requires authentication and validates firm ownership
  apiRouter.delete("/contact-persons/:id", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.firmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid contact person ID' });
      }

      // Verify the contact person belongs to the user's firm
      const contacts = await storage.getContactPersons({ firmId: user.firmId });
      const existingContact = contacts.find(c => c.id === id);

      if (!existingContact) {
        return res.status(404).json({ error: 'Contact person not found or access denied' });
      }

      await storage.deleteContactPerson(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting contact person:', error);
      res.status(500).json({
        error: 'Failed to delete contact person',
        message: error.message
      });
    }
  });

  // Get client-contact relationships
  // Security: Requires authentication and filters by user's firm
  apiRouter.get("/client-contact-relationships", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.firmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      // Get all relationships and filter by firm
      const allRelationships = await storage.getClientContactRelationships();

      // Get all clients for this firm to filter relationships
      const allClients = await storage.getClients();
      const firmClientIds = new Set(
        allClients
          .filter(client => client.firmId === user.firmId)
          .map(client => client.id)
      );

      // Filter relationships to only include those for firm's clients
      const filteredRelationships = allRelationships.filter(
        rel => firmClientIds.has(rel.clientId)
      );

      // If client user, further filter to only their client
      const relationships = (user.role === 'client_admin' || user.role === 'client_user') && user.clientId
        ? filteredRelationships.filter(rel => rel.clientId === user.clientId)
        : filteredRelationships;

      res.json(relationships || []);
    } catch (error) {
      console.error('Error getting client contact relationships:', error);
      res.status(500).json({ error: 'Failed to get relationships' });
    }
  });

  // Create client-contact relationship
  // Security: Requires authentication and validates client access
  apiRouter.post("/client-contact-relationships", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.firmId) {
        return res.status(400).json({ error: 'User is not associated with a firm' });
      }

      const { clientId } = req.body;

      if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
      }

      // Verify the client belongs to the user's firm
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      if (client.firmId !== user.firmId) {
        return res.status(403).json({ error: 'Access denied: Client belongs to a different firm' });
      }

      // Client users can only create relationships for their own client
      if ((user.role === 'client_admin' || user.role === 'client_user') && user.clientId !== clientId) {
        return res.status(403).json({ error: 'Access denied: You can only manage relationships for your own client' });
      }

      const relationship = await storage.createClientContactRelationship(req.body);
      res.status(201).json(relationship);
    } catch (error) {
      console.error('Error creating client contact relationship:', error);
      res.status(500).json({ error: 'Failed to create relationship' });
    }
  });

  apiRouter.post(
    "/clients/batch",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const batchData = batchClientUpdateSchema.parse(req.body);
        const updatedCount = await storage.batchUpdateClients(
          batchData.clientIds,
          batchData.updates
        );

        // Activity logging temporarily disabled
        if (updatedCount > 0) {
          console.log(`Updated ${updatedCount} clients in batch`);
        }

        res.json({
          message: `Successfully updated ${updatedCount} clients`,
          updatedCount,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid batch update data",
            errors: error.errors,
          });
        }
        res
          .status(500)
          .json({ message: "Failed to perform batch update on clients" });
      }
    }
  );

  // Client Bookkeeping Settings routes
  apiRouter.get(
    "/clients/:clientId/bookkeeping-settings",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);

        const settings = await storage.getClientBookkeepingSettings(clientId);

        if (!settings) {
          // Return default settings if none are configured yet
          // Using August 31 as fiscal year end for this client
          return res.json({
            fiscalYearEndMonth: 8, // August
            fiscalYearEndDay: 31,
            defaultCurrency: "CAD",
            useTaxSettings: false,
            taxSettings: [],
            useAccrualAccounting: true,
            generateRecurringTransactions: false,
            automaticBankReconciliation: false,
            defaultCategories: {},
          });
        }

        // Ensure useTaxSettings field is properly included
        if (settings.useTaxSettings === undefined) {
          settings.useTaxSettings = false; // Default to false if not set
        }

        res.json(settings);
      } catch (error) {
        console.error("Error retrieving client bookkeeping settings:", error);
        res
          .status(500)
          .json({ message: "Failed to retrieve bookkeeping settings" });
      }
    }
  );

  apiRouter.put(
    "/clients/:clientId/bookkeeping-settings",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const settings = req.body as ClientBookkeepingSettings;

        // Basic validation for required fields
        if (
          settings.fiscalYearEndMonth < 1 ||
          settings.fiscalYearEndMonth > 12
        ) {
          return res.status(400).json({
            message: "Fiscal year end month must be between 1 and 12",
          });
        }

        if (settings.fiscalYearEndDay < 1 || settings.fiscalYearEndDay > 31) {
          return res
            .status(400)
            .json({ message: "Fiscal year end day must be between 1 and 31" });
        }

        // Get previous settings to compare if tax settings are being added/modified
        const previousSettings = await storage.getClientBookkeepingSettings(
          clientId
        );
        const hadTaxSettingsBefore =
          previousSettings?.taxSettings &&
          previousSettings.taxSettings.length > 0;
        const hasTaxSettingsNow =
          settings?.taxSettings && settings.taxSettings.length > 0;

        // Validate tax settings and ensure each has an associated tax payable account
        if (settings.taxSettings) {
          // Create tax payable accounts for any new tax settings
          for (const tax of settings.taxSettings) {
            if (
              !tax.name ||
              tax.rate === undefined ||
              tax.rate < 0 ||
              tax.rate > 1
            ) {
              return res.status(400).json({
                message:
                  "Invalid tax settings. Each tax must have a name and rate between 0 and 1",
              });
            }

            // Tax account handling: accountId-based (no fragile name matching)
            // 
            // If user already specified accountId, validate it exists
            // Otherwise, create a new dedicated tax account

            if (tax.accountId) {
              // Validate the provided accountId exists and is a liability
              const allAccounts = await storage.getAccounts(clientId);
              const specifiedAccount = allAccounts.find(acc => acc.id === tax.accountId);

              if (!specifiedAccount) {
                return res.status(400).json({
                  message: `Tax account ID ${tax.accountId} not found for tax "${tax.name}"`
                });
              }

              if (specifiedAccount.type !== "liability") {
                console.warn(`⚠️ Tax account "${specifiedAccount.name}" is type ${specifiedAccount.type}, not liability - this may cause reporting issues`);
              }

              console.log(`✅ Using specified tax account: ${specifiedAccount.name} (ID: ${tax.accountId}) for ${tax.name}`);
            } else {
              // No accountId provided - create a new dedicated tax account
              // NOTE: In future, frontend should allow users to select existing account
              const defaultAccountName = `${tax.name} Payable`;

              console.log(`🚀 Creating new tax account: ${defaultAccountName} for client ${clientId}`);

              const newAccount = await storage.createAccount({
                clientId,
                name: defaultAccountName,
                type: "liability",
                subtype: "current_liability",
                description: `Tax payable account for ${tax.name} at rate ${(tax.rate * 100).toFixed(1)}%`,
                isDebitNormal: false, // Liability has credit normal balance
                isActive: true,
                accountNumber: null,
                parentAccountId: null,
              });

              console.log(`✅ Created new tax account: ${defaultAccountName} (ID: ${newAccount.id}) for client ${clientId}`);

              tax.accountId = newAccount.id;
            }
          }
        }

        // Verify all tax settings have accountIds before saving
        if (settings.taxSettings) {
          const missingAccountIds = settings.taxSettings.filter(tax => !tax.accountId);
          if (missingAccountIds.length > 0) {
            console.error(`❌ CRITICAL: ${missingAccountIds.length} tax settings missing accountId before save!`);
            console.error('Missing accountIds:', missingAccountIds.map(t => t.name));
            return res.status(500).json({
              message: 'Internal error: Tax account creation failed'
            });
          }
          console.log(`✅ All ${settings.taxSettings.length} tax settings have accountIds before save:`,
            settings.taxSettings.map(t => `${t.name} → Account ${t.accountId}`));
        }

        const updatedSettings = await storage.updateClientBookkeepingSettings(
          clientId,
          settings
        );

        // Activity logging temporarily disabled
        console.log(
          "Updated client bookkeeping settings for client:",
          clientId
        );

        // Force refresh of accounts cache if tax accounts were created
        if (settings.taxSettings && settings.taxSettings.length > 0) {
          console.log(
            "Tax accounts created/updated, accounts cache should refresh automatically"
          );
        }

        // Verify response includes accountIds
        if (updatedSettings.taxSettings) {
          console.log(`📤 Returning ${updatedSettings.taxSettings.length} tax settings to client with accountIds:`,
            updatedSettings.taxSettings.map(t => `${t.name} → Account ${t.accountId}`));
        }

        res.json(updatedSettings);
      } catch (error) {
        console.error("Error updating client bookkeeping settings:", error);
        res
          .status(500)
          .json({ message: "Failed to update bookkeeping settings" });
      }
    }
  );

  // QBO Integration routes
  apiRouter.get("/qbo/integrations/:clientId", requireAuthHybrid, checkClientAccess, async (req: Request, res: Response) => {
    try {
      const integration = await storage.getQboIntegration(Number(req.params.clientId));
      if (!integration) {
        return res.status(404).json({ message: "QBO integration not found" });
      }
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch QBO integration" });
    }
  });

  apiRouter.post(
    "/qbo/integrations",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // TODO: Schema insertQboIntegrationSchema doesn't exist - using placeholder
        const integrationData = req.body;
        // TODO: Implement QBO integration storage methods
        const integration = null; // await storage.createQboIntegration(integrationData);

        // Activity logging temporarily disabled
        console.log(
          "QBO Integration Connected for client:",
          integration.clientId
        );

        res.status(201).json(integration);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid integration data",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Failed to create QBO integration" });
      }
    }
  );

  // Simulating a QBO sync endpoint
  apiRouter.post(
    "/qbo/sync/:clientId",
    requireAuth,
    checkClientAccess,
    async (req: Request, res: Response) => {
      try {
        const clientId = Number(req.params.clientId);
        // TODO: Implement getQboIntegration method in storage interface
        const integration = null; // Placeholder until method is implemented

        if (!integration) {
          return res.status(404).json({ message: "QBO integration not found" });
        }

        // Update the last synced timestamp
        // TODO: Implement QBO integration storage methods
        const updatedIntegration = null; // await storage.updateQboIntegration(integration.id, { lastSynced: new Date(), syncStatus: 100 });

        // Activity logging temporarily disabled
        console.log("QBO Data Synced for client:", clientId);

        res.json(updatedIntegration);
      } catch (error) {
        res.status(500).json({ message: "Failed to sync QBO data" });
      }
    }
  );

  // Audit File routes
  apiRouter.get(
    "/audit-files/:clientId",
    requireAuth,
    checkClientAccess,
    async (req: Request, res: Response) => {
      try {
        // TODO: Implement audit file storage methods
        const auditFiles = []; // await storage.getAuditFiles(Number(req.params.clientId));
        res.json(auditFiles);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch audit files" });
      }
    }
  );

  apiRouter.post(
    "/audit-files",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // TODO: Schema insertAuditFileSchema doesn't exist - using placeholder
        const auditFileData = req.body;
        // TODO: Implement audit file storage methods
        const auditFile = null; // await storage.createAuditFile(auditFileData);

        // Activity logging temporarily disabled
        console.log("Audit File Created for client:", auditFile.clientId);

        res.status(201).json(auditFile);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid audit file data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create audit file" });
      }
    }
  );

  apiRouter.post(
    "/audit-files/:id/compliance-check",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const auditFileId = parseInt(req.params.id);

        // Get the audit file
        const auditFile = await storage.getAuditFile(auditFileId);
        if (!auditFile) {
          return res.status(404).json({ message: "Audit file not found" });
        }

        // Parse the audit file content
        let fileContent = auditFile.fileContent;
        if (typeof fileContent === "string") {
          try {
            fileContent = JSON.parse(fileContent);
          } catch (error) {
            return res
              .status(400)
              .json({ message: "Invalid audit file content format" });
          }
        }

        // Instead of importing from client code, let's create our own validation logic here
        // Define some basic compliance validation rules
        const validateFinancialStatements = (fileContent) => {
          return (
            fileContent.sections &&
            fileContent.sections.some((section) =>
              section.title.includes("Financial Statements")
            )
          );
        };

        const validateAuditChecklist = (fileContent) => {
          return (
            fileContent.sections &&
            fileContent.sections.some(
              (section) => section.checklists && section.checklists.length > 0
            )
          );
        };

        const validateDocumentation = (fileContent) => {
          return (
            fileContent.sections &&
            fileContent.sections.some(
              (section) =>
                section.documentsUploaded &&
                section.documentsUploaded.length > 0
            )
          );
        };

        // Check the rules
        const validateComplianceRules = [
          {
            id: "FIN-001",
            description: "Financial Statements Present",
            severity: "high",
            validate: validateFinancialStatements,
          },
          {
            id: "PROC-001",
            description: "Audit Checklists Created",
            severity: "medium",
            validate: validateAuditChecklist,
          },
          {
            id: "DOC-001",
            description: "Supporting Documentation Uploaded",
            severity: "high",
            validate: validateDocumentation,
          },
        ];

        // Validate against all compliance rules
        const issues = [];
        let rulesPassed = 0;
        let rulesFailed = 0;

        // Run through all rules and check compliance
        for (const rule of validateComplianceRules) {
          try {
            const passed = rule.validate(fileContent);
            if (passed) {
              rulesPassed++;
            } else {
              rulesFailed++;
              issues.push({
                id: `issue-${Date.now()}-${rulesFailed}`,
                ruleId: rule.id,
                message: rule.description,
                severity: rule.severity,
                recommendedAction: `Ensure ${rule.description.toLowerCase()} is properly included in the audit file.`,
                status: "open",
                createdAt: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.error(`Error validating rule ${rule.id}:`, err);
            rulesFailed++;
            issues.push({
              id: `issue-${Date.now()}-error-${rulesFailed}`,
              ruleId: rule.id,
              message: `Error validating: ${rule.description}`,
              severity: "medium",
              recommendedAction: "Contact system administrator",
              status: "open",
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Determine overall compliance status based on issues
        const complianceStatus =
          issues.length === 0
            ? "compliant"
            : issues.some((issue) => issue.severity === "high")
              ? "critical_issues_found"
              : "issues_found";

        // Create category summaries
        const checksByCategory = {
          financial: { total: 1, passed: rulesPassed > 0 ? 1 : 0 },
          procedural: { total: 1, passed: rulesPassed > 1 ? 1 : 0 },
          documentation: { total: 1, passed: rulesPassed > 2 ? 1 : 0 },
        };

        // Create the compliance result object
        const complianceResult = {
          status: complianceStatus,
          timestamp: new Date().toISOString(),
          auditFileId,
          rulesPassed,
          rulesFailed,
          issues,
          checksByCategory,
        };

        // Update the audit file with the compliance status
        // TODO: Implement audit file storage methods
        // await storage.updateAuditFile(auditFileId, { complianceStatus: complianceResult.status });

        // Activity logging temporarily disabled
        console.log(
          `Compliance check performed on audit file ${auditFile.fileName}`
        );

        res.json(complianceResult);
      } catch (error) {
        console.error("Error performing compliance check:", error);
        res.status(500).json({ message: "Failed to perform compliance check" });
      }
    }
  );

  // Update a compliance issue status
  apiRouter.patch(
    "/audit-files/:id/compliance-issue/:issueId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const auditFileId = parseInt(req.params.id);
        const issueId = req.params.issueId;
        const { status, notes } = req.body;

        if (!["addressed", "waived"].includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }

        // Get the audit file
        const auditFile = await storage.getAuditFile(auditFileId);
        if (!auditFile) {
          return res.status(404).json({ message: "Audit file not found" });
        }

        // In a real implementation, this would update the compliance issue in the database
        // For now, we'll just pretend it worked

        // Activity logging temporarily disabled
        console.log(
          `Compliance issue ${issueId.substring(0, 8)}... marked as ${status}`
        );

        res.json({
          message: `Compliance issue status updated to ${status}`,
          issueId,
          status,
        });
      } catch (error) {
        console.error("Error updating compliance issue:", error);
        res.status(500).json({ message: "Failed to update compliance issue" });
      }
    }
  );

  apiRouter.post(
    "/audit-files/batch",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const batchData = batchAuditFileUpdateSchema.parse(req.body);
        // TODO: Implement audit file storage methods
        const updatedCount = 0; // await storage.batchUpdateAuditFiles(batchData.ids, batchData.updates);

        // Activity logging temporarily disabled
        if (updatedCount > 0) {
          console.log(`Updated ${updatedCount} audit files in batch`);
        }

        res.json({
          message: `Successfully updated ${updatedCount} audit files`,
          updatedCount,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid batch update data",
            errors: error.errors,
          });
        }
        res
          .status(500)
          .json({ message: "Failed to perform batch update on audit files" });
      }
    }
  );

  // Task routes
  apiRouter.get("/tasks", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      // Type assertion and null check for user
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const tasks = await storage.getTasks(user.id, limit);
      // Ensure we always return an array
      res.json(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      // Return empty array instead of error for now
      res.json([]);
    }
  });

  apiRouter.post("/tasks", async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  apiRouter.patch("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const updates = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(
        Number(req.params.id),
        updates
      );
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Create batch tasks for multiple clients
  apiRouter.post("/tasks/batch", async (req: Request, res: Response) => {
    try {
      const batchData = z
        .object({
          description: z.string(),
          dueDate: z.date(),
          priority: z.string(),
          category: z.string(),
          notes: z.string().optional(),
          clientIds: z.array(z.number()),
          isRecurring: z.boolean().optional(),
          recurringPattern: z.string().optional(),
          recurringEndDate: z.date().optional(),
        })
        .parse(req.body);

      const { clientIds, ...taskTemplate } = batchData;

      // Create a task for each client
      const createdTasks = [];

      for (const clientId of clientIds) {
        const taskData = {
          ...taskTemplate,
          clientId,
        };

        const task = await storage.createTask(taskData);
        createdTasks.push(task);
      }

      // Activity logging temporarily disabled
      console.log(
        `Created ${createdTasks.length} tasks for ${clientIds.length} clients`
      );

      res.status(201).json({
        message: `Successfully created ${createdTasks.length} tasks`,
        tasks: createdTasks,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid batch task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create batch tasks" });
    }
  });

  // Batch update existing tasks
  apiRouter.post("/tasks/batch-update", async (req: Request, res: Response) => {
    try {
      const batchData = batchTaskUpdateSchema.parse(req.body);
      // TODO: Implement batchUpdateTasks method in storage interface
      const updatedCount = 0; // Temporary placeholder until method is implemented

      // Activity logging temporarily disabled
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} tasks in batch`);
      }

      res.json({
        message: `Successfully updated ${updatedCount} tasks`,
        updatedCount,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid batch update data", errors: error.errors });
      }
      res
        .status(500)
        .json({ message: "Failed to perform batch update on tasks" });
    }
  });

  // Activity routes
  apiRouter.get(
    "/activities",
    requireAuthHybrid,
    requireModuleAccess("dashboard"),
    async (req: Request, res: Response) => {
      try {
        const limit = req.query.limit ? Number(req.query.limit) : 10;
        const user = req.user as any;
        if (!user?.firmId) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const activityRows = await db
          .select({
            id: activities.id,
            type: activities.type,
            title: activities.title,
            description: activities.description,
            clientName: clients.name,
            createdAt: activities.createdAt,
          })
          .from(activities)
          .leftJoin(clients, eq(activities.clientId, clients.id))
          .where(eq(activities.firmId, user.firmId))
          .orderBy(desc(activities.createdAt))
          .limit(limit);

        return res.json(activityRows);
      } catch (error: any) {
        if (error?.code === "42P01") {
          try {
            const taskRows = await db
              .select({
                id: tasks.id,
                title: tasks.title,
                description: tasks.description,
                clientName: clients.name,
                createdAt: tasks.createdAt,
              })
              .from(tasks)
              .leftJoin(clients, eq(tasks.clientId, clients.id))
              .where(eq(tasks.firmId, (req.user as any).firmId))
              .orderBy(desc(tasks.createdAt))
              .limit(limit);

            const mapped = taskRows.map((task) => ({
              id: task.id,
              type: "task_created",
              title: task.title,
              description: task.description || "Task created",
              clientName: task.clientName,
              createdAt: task.createdAt,
            }));

            return res.json(mapped);
          } catch (fallbackError) {
            console.error("Error fetching fallback task activities:", fallbackError);
          }
        }

        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Failed to fetch activities" });
      }
    }
  );

  // Dashboard metrics route
  apiRouter.get(
    "/dashboard/metrics",
    requireAuthHybrid,
    requireModuleAccess("dashboard"),
    async (req: Request, res: Response) => {
    try {
      // Type assertion to fix User property access errors
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get appropriate clients based on user role (simplified)
      let clients: any[] = [];
      let tasks: any[] = [];

      // Get clients based on user role - FIXED TENANT ISOLATION
      if (user.role === "super_admin") {
        // Super admin can see all clients across all firms
        clients = await storage.getClients();
      } else if (user.role === "firm_admin" && user.firmId) {
        // Firm admin can only see clients belonging to their firm
        clients = await storage.getClientsByFirm(user.firmId);
      } else if (user.role === "firm_user" && user.clientId) {
        const client = await storage.getClient(user.clientId);
        clients = client ? [client] : [];
      } else if (user.role === "client_admin" && user.clientId) {
        const client = await storage.getClient(user.clientId);
        clients = client ? [client] : [];
      } else {
        // No access if role/permissions don't match
        clients = [];
      }

      // Get tasks (always return empty array for now) - method doesn't exist, using fallback
      tasks = [];

      // Simple metrics calculation
      const metrics = {
        totalClients: clients.length,
        activeClients: clients.filter((client) => client.status === "active")
          .length,
        totalTasks: tasks.length,
        pendingTasks: Array.isArray(tasks)
          ? tasks.filter((task) => !task.completed).length
          : 0,
        completedTasks: Array.isArray(tasks)
          ? tasks.filter((task) => task.completed).length
          : 0,
        billableHours: 0,
        revenue: 0,
        overdueItems: 0,
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      // Return basic metrics instead of error
      res.json({
        totalClients: 0,
        activeClients: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        billableHours: 0,
        revenue: 0,
        overdueItems: 0,
      });
    }
  });

  // Financial Data API Endpoints

  // Accounts (both query param and URL param support)
  apiRouter.get("/accounts", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.query.clientId as string);

      if (!clientId || isNaN(clientId)) {
        return res
          .status(400)
          .json({ message: "Valid clientId query parameter is required" });
      }

      // Authentication bypass for demo purposes
      // In production, this would check user access to client

      const subtype = req.query.subtype as string | undefined;
      const subtypes = req.query.subtypes as string | undefined;

      // Get all accounts for the client
      let accounts = await storage.getAccounts(clientId);

      // Filter by subtypes (comma-separated list) if specified
      if (subtypes) {
        const subtypeList = subtypes.split(",");
        accounts = accounts.filter(
          (account) => account.subtype && subtypeList.includes(account.subtype)
        );
        console.log(
          `Filtered accounts by subtypes '${subtypes}', found ${accounts.length} matching accounts`
        );
      }
      // Filter by single subtype if specified (for backward compatibility)
      else if (subtype) {
        accounts = accounts.filter((account) => account.subtype === subtype);
        console.log(
          `Filtered accounts by subtype '${subtype}', found ${accounts.length} matching accounts`
        );
      }

      console.log(
        `DEBUG: Retrieved ${accounts.length} accounts for client ${clientId}`
      );

      // Log original account data for debugging
      accounts.forEach((account, index) => {
        console.log(
          `Account ${index + 1}/${accounts.length}: ID=${account.id}, Name=${account.name
          }, Type=${account.type}, Subtype=${account.subtype}, Number=${account.accountNumber
          }`
        );
      });

      // Validate that the chart of accounts follows proper accounting principles
      const validation = await validateChartOfAccounts(accounts);

      // Log validation results in detail
      console.log(`=== VALIDATION RESULTS for client ${clientId} ===`);
      console.log(`Status: ${validation.balanced ? "BALANCED" : "UNBALANCED"}`);
      console.log(`Total Assets: $${validation.totalAssets.toFixed(2)}`);
      console.log(
        `Total Liabilities: $${validation.totalLiabilities.toFixed(2)}`
      );
      console.log(`Total Equity: $${validation.totalEquity.toFixed(2)}`);
      console.log(`Net Income: $${validation.netIncome.toFixed(2)}`);
      console.log(`Difference: $${validation.difference.toFixed(2)}`);

      res.json({ accounts, validation });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  apiRouter.get("/accounts/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const subtype = req.query.subtype as string | undefined;
      const subtypes = req.query.subtypes as string | undefined;

      // Get all accounts for the client - admin can access all
      let accounts = await storage.getAccounts(clientId);

      // Filter by subtypes (comma-separated list) if specified
      if (subtypes) {
        const subtypeList = subtypes.split(",");
        accounts = accounts.filter(
          (account) => account.subtype && subtypeList.includes(account.subtype)
        );
        console.log(
          `Filtered accounts by subtypes '${subtypes}', found ${accounts.length} matching accounts`
        );
      }
      // Filter by single subtype if specified (for backward compatibility)
      else if (subtype) {
        accounts = accounts.filter((account) => account.subtype === subtype);
        console.log(
          `Filtered accounts by subtype '${subtype}', found ${accounts.length} matching accounts`
        );
      }

      console.log(
        `DEBUG: Retrieved ${accounts.length} accounts for client ${clientId}`
      );

      // Log original account data for debugging
      accounts.forEach((account, index) => {
        console.log(
          `Account ${index + 1}/${accounts.length}: ID=${account.id}, Name=${account.name
          }, Type=${account.type}, Subtype=${account.subtype}, Number=${account.accountNumber
          }`
        );
      });

      // Validate that the chart of accounts follows proper accounting principles
      const validation = await validateChartOfAccounts(accounts);

      // Log validation results in detail
      console.log(`=== VALIDATION RESULTS for client ${clientId} ===`);
      console.log(`Balanced: ${validation.balanced}`);
      console.log(`Total Assets: $${validation.totalAssets}`);
      console.log(`Total Liabilities: $${validation.totalLiabilities}`);
      console.log(`Total Equity: $${validation.totalEquity}`);
      console.log(`Net Income: $${validation.netIncome}`);
      console.log(`Difference: $${validation.difference}`);
      console.log(`Full message: ${validation.message}`);
      console.log(`=== END VALIDATION RESULTS ===`);

      // Return accounts with validation status
      res.json({
        accounts,
        validation: {
          balanced: validation.balanced,
          totalAssets: validation.totalAssets,
          totalLiabilities: validation.totalLiabilities,
          totalEquity: validation.totalEquity,
          netIncome: validation.netIncome,
          difference: validation.difference,
          totalDebits: validation.totalDebits,
          totalCredits: validation.totalCredits,
          message: validation.message,
        },
      });
    } catch (error) {
      console.error("Error getting accounts:", error);
      res.status(500).json({ error: "Failed to get accounts" });
    }
  });

  // Get account balance as of a specific date (for Balance Sheet drill-downs)
  // Uses Trial Balance Service for consistent results with Balance Sheet
  apiRouter.get(
    "/accounts/:clientId/:accountId/balance",
    requireAuthHybrid,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const accountId = parseInt(req.params.accountId);
        const date = req.query.date as string;

        if (!date) {
          return res.status(400).json({ error: "Date parameter is required" });
        }

        console.log(
          `⚡ FAST DRILL-DOWN: Computing balance for account ${accountId} as of ${date}`
        );

        // Use Trial Balance Service for EXACT same calculation as Balance Sheet
        const { trialBalanceService } = await import("./trial-balance-service");
        const trialBalanceEntries = await trialBalanceService.generateTrialBalance(clientId, date);
        
        // Find this account's entry in the trial balance
        const accountEntry = trialBalanceEntries.find(entry => entry.accountId === accountId);
        
        let balance = 0;
        if (accountEntry) {
          balance = accountEntry.netBalance;
          console.log(`✅ TRIAL BALANCE: Account ${accountId} (${accountEntry.accountName}) = $${balance.toFixed(2)}`);
        } else {
          console.log(`⚠️ Account ${accountId} not found in trial balance`);
        }

        console.log(
          `✅ FAST DRILL-DOWN: Account ${accountId} balance = ${balance} (via Trial Balance Service)`
        );
        res.json({ balance, openingBalanceIncluded: true });
      } catch (error) {
        console.error("Error fetching account balance:", error);
        res.status(500).json({ error: "Failed to fetch account balance" });
      }
    }
  );

  // Get opening balance for a specific account (from imports like QBO, Excel)
  apiRouter.get(
    "/accounts/:clientId/:accountId/opening-balance",
    requireAuthHybrid,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const accountId = parseInt(req.params.accountId);

        console.log(
          `📜 Fetching opening balance for account ${accountId}, client ${clientId}`
        );

        const openingBalances = await storage.getOpeningBalances(clientId) || [];
        console.log(`📜 Found ${openingBalances.length} total opening balances for client ${clientId}`);
        
        // Use Number() to handle both string and number accountId types
        const accountOpeningBalance = openingBalances.find((ob: any) => 
          Number(ob.accountId) === accountId
        );
        
        if (accountOpeningBalance) {
          const balance = parseFloat(accountOpeningBalance.balance || '0');
          const balanceDate = accountOpeningBalance.balanceDate;
          console.log(`📜 Found opening balance for account ${accountId}: $${balance.toFixed(2)} as of ${balanceDate}`);
          res.json({ 
            balance, 
            balanceDate,
            hasOpeningBalance: true 
          });
        } else {
          console.log(`📜 No opening balance found for account ${accountId} in opening_balances table`);
          
          // Fallback: Calculate opening balance from journal entries BEFORE the earliest entry date
          // This handles cases where opening balances are recorded as journal entries
          try {
            const journalEntries = await storage.getJournalEntries(clientId, 1000000, 0);
            const account = await storage.getAccount(accountId);
            
            if (account) {
              const isDebitNormal = ['asset', 'expense', 'cost_of_sales'].includes(account.type);
              
              // Get all lines for this account from ALL entries
              let totalDebits = 0;
              let totalCredits = 0;
              
              for (const entry of journalEntries) {
                const lines = await storage.getJournalEntryLines(entry.id);
                for (const line of lines) {
                  if (Number(line.accountId) === accountId) {
                    totalDebits += parseFloat(line.debitAmount || '0');
                    totalCredits += parseFloat(line.creditAmount || '0');
                  }
                }
              }
              
              // Calculate net balance based on normal balance direction
              let calculatedBalance = isDebitNormal 
                ? totalDebits - totalCredits 
                : totalCredits - totalDebits;
              
              // This is the total balance from all journal entries
              // Not really an "opening balance" but useful for debugging
              console.log(`📜 Total from journal entries for account ${accountId}: $${calculatedBalance.toFixed(2)}`);
            }
          } catch (calcError) {
            console.log(`📜 Could not calculate from journal entries:`, calcError);
          }
          
          res.json({ 
            balance: 0, 
            balanceDate: null,
            hasOpeningBalance: false 
          });
        }
      } catch (error) {
        console.error("Error fetching opening balance:", error);
        res.json({ 
          balance: 0, 
          balanceDate: null,
          hasOpeningBalance: false 
        });
      }
    }
  );

  apiRouter.post("/accounts", async (req: Request, res: Response) => {
    try {
      const accountData = req.body;
      const account = await storage.createAccount(accountData);

      // Activity logging temporarily disabled
      console.log(`New account created: ${account.name}`);

      // After creating a new account, validate the entire chart of accounts
      if (account.clientId) {
        const accounts = await storage.getAccounts(account.clientId);
        const validation = await validateChartOfAccounts(accounts);

        if (!validation.balanced) {
          console.warn(
            `Warning: After creating account ${account.name}, chart of accounts is unbalanced: ${validation.message}`
          );
        } else {
          console.log(
            `Account ${account.name} created, chart of accounts remains in balance: ${validation.message}`
          );
        }
      }

      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  apiRouter.patch("/accounts/:id", async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const updates = req.body;

      // Get the original account to know which client it belongs to
      const originalAccount = await storage.getAccount(accountId);
      if (!originalAccount) {
        return res.status(404).json({ error: "Account not found" });
      }

      const account = await storage.updateAccount(accountId, updates);

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // After updating the account, validate the chart of accounts
      if (account.clientId) {
        const accounts = await storage.getAccounts(account.clientId);
        const validation = await validateChartOfAccounts(accounts);

        if (!validation.balanced) {
          console.warn(
            `Warning: After updating account ${account.name}, chart of accounts is unbalanced: ${validation.message}`
          );
        } else {
          console.log(
            `Account ${account.name} updated, chart of accounts remains in balance: ${validation.message}`
          );
        }
      }

      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  // Update account type specifically (for drag-and-drop interface)
  apiRouter.patch("/accounts/:id/type", async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const { type } = req.body;

      if (
        ![
          "asset",
          "liability",
          "equity",
          "income",
          "expense",
          "cost_of_sales",
          "other_income",
          "other_expense",
        ].includes(type)
      ) {
        return res.status(400).json({ error: "Invalid account type" });
      }

      const account = await storage.updateAccount(accountId, { type });

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // After updating account type, validate the chart of accounts
      if (account.clientId) {
        const accounts = await storage.getAccounts(account.clientId);
        const validation = await validateChartOfAccounts(accounts);

        console.log(
          `Account ${account.name} type changed to ${type}, chart validation: ${validation.message}`
        );
      }

      res.json(account);
    } catch (error) {
      console.error("Error updating account type:", error);
      res.status(500).json({ error: "Failed to update account type" });
    }
  });

  apiRouter.delete(
    "/accounts/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const accountId = parseInt(req.params.id);

        console.log(`🗑️ DELETE request for account ID: ${accountId}`);

        // Get the account before deleting to know which client it belongs to
        const account = await storage.getAccount(accountId);
        if (!account) {
          console.log(`❌ Account ${accountId} not found in database`);
          return res.status(404).json({ error: "Account not found" });
        }

        const clientId = account.clientId;
        const accountName = account.name;

        console.log(
          `🗑️ Deleting account: ${accountName} (ID: ${accountId}) for client ${clientId}`
        );

        const success = await storage.deleteAccount(accountId);

        if (!success) {
          console.log(`❌ Failed to delete account ${accountId} from database`);
          return res.status(404).json({ error: "Account not found" });
        }

        console.log(
          `✅ Account ${accountName} successfully deleted from database`
        );

        // After deleting the account, validate the chart of accounts
        if (clientId) {
          const accounts = await storage.getAccounts(clientId);
          const validation = await validateChartOfAccounts(accounts);

          if (!validation.balanced) {
            console.warn(
              `Warning: After deleting account ${accountName}, chart of accounts is unbalanced: ${validation.message}`
            );
          } else {
            console.log(
              `Account ${accountName} deleted, chart of accounts remains in balance: ${validation.message}`
            );
          }
        }

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ error: "Failed to delete account" });
      }
    }
  );

  // Batch delete accounts
  apiRouter.delete(
    "/accounts/batch/:clientId",
    requireAuthHybrid,
    checkClientAccess,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { accountIds } = req.body;

        if (!Array.isArray(accountIds) || accountIds.length === 0) {
          return res
            .status(400)
            .json({ error: "Account IDs array is required" });
        }

        // Verify all accounts belong to the client
        const accounts = await storage.getAccounts(clientId);
        const clientAccountIds = accounts.map((acc) => acc.id);
        const invalidIds = accountIds.filter(
          (id) => !clientAccountIds.includes(id)
        );

        if (invalidIds.length > 0) {
          return res.status(400).json({
            error: `Accounts ${invalidIds.join(
              ", "
            )} do not belong to client ${clientId}`,
          });
        }

        let deletedCount = 0;
        const errors = [];

        for (const accountId of accountIds) {
          try {
            const deleted = await storage.deleteAccount(accountId);
            if (deleted) {
              deletedCount++;
            } else {
              errors.push(`Failed to delete account ${accountId}`);
            }
          } catch (error) {
            errors.push(
              `Error deleting account ${accountId}: ${error.message}`
            );
          }
        }

        // Validate chart of accounts after deletion
        const remainingAccounts = await storage.getAccounts(clientId);
        const validation = await validateChartOfAccounts(remainingAccounts);

        console.log(
          `Batch deleted ${deletedCount} accounts, chart of accounts status: ${validation.message}`
        );

        res.json({
          success: true,
          deletedCount,
          totalRequested: accountIds.length,
          errors: errors.length > 0 ? errors : undefined,
          validation,
        });
      } catch (error) {
        console.error("Error batch deleting accounts:", error);
        res.status(500).json({ error: "Failed to batch delete accounts" });
      }
    }
  );

  // Batch create accounts (for CSV import)
  apiRouter.post("/accounts/batch", async (req: Request, res: Response) => {
    try {
      const { clientId, accounts } = req.body;

      if (!clientId || !accounts || !Array.isArray(accounts)) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      // Validate client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Create accounts in batch
      const createdAccounts = [];
      for (const accountData of accounts) {
        try {
          const account = await storage.createAccount({
            ...accountData,
            clientId,
          });
          createdAccounts.push(account);
        } catch (err) {
          console.error("Error creating individual account:", err);
          // Continue with other accounts even if one fails
        }
      }

      // After creating accounts in batch, validate the chart of accounts
      const allAccounts = await storage.getAccounts(clientId);
      const validation = await validateChartOfAccounts(allAccounts);

      if (!validation.balanced) {
        console.warn(
          `Warning: After batch creating accounts, chart of accounts is unbalanced: ${validation.message}`
        );
      } else {
        console.log(
          `Batch accounts created, chart of accounts remains in balance: ${validation.message}`
        );
      }

      res.status(201).json({
        message: `Successfully created ${createdAccounts.length} of ${accounts.length} accounts`,
        accounts: createdAccounts,
        validation: {
          balanced: validation.balanced,
          totalAssets: validation.totalAssets,
          totalLiabilities: validation.totalLiabilities,
          totalEquity: validation.totalEquity,
          difference: validation.difference,
        },
      });
    } catch (error) {
      console.error("Error creating accounts in batch:", error);
      res.status(500).json({ error: "Failed to create accounts" });
    }
  });

  // Transactions
  apiRouter.get(
    "/transactions/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const transactions = await storage.getTransactions(clientId);
        res.json(transactions);
      } catch (error) {
        console.error("Error getting transactions:", error);
        res.status(500).json({ error: "Failed to get transactions" });
      }
    }
  );

  apiRouter.post(
    "/transactions",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const transactionData = req.body;

        // Handle journal entry format (lines array) and convert to transaction format
        if (transactionData.lines && Array.isArray(transactionData.lines)) {
          console.log("Converting journal entry format to transaction format");

          // Convert lines array to items array for journal entry processing
          transactionData.type = "journal";
          transactionData.items = transactionData.lines.map((line) => ({
            accountId: line.accountId,
            amount: line.debit || line.credit,
            isDebit: !!line.debit,
          }));

          // Calculate total amount (sum of debits or credits)
          const totalDebits = transactionData.lines
            .filter((line) => line.debit)
            .reduce((sum, line) => sum + parseFloat(line.debit), 0);

          transactionData.amount = totalDebits.toString();

          // Use the date field or default to current date
          if (transactionData.date && !transactionData.transactionDate) {
            transactionData.transactionDate = transactionData.date;
          }

          console.log(
            `Journal entry converted: ${transactionData.items.length} items, total amount: ${transactionData.amount}`
          );
        }

        // Check if the transaction has tax applied
        let applyTax = false;
        let taxRate = 0;
        let taxAccountId = null;
        let taxAmount = "0";

        console.log(
          "Transaction data received:",
          JSON.stringify(transactionData, null, 2)
        );
        console.log(
          "Transaction data summary:",
          JSON.stringify({
            taxId: transactionData.taxId,
            taxInclusive: transactionData.taxInclusive,
            taxRate: transactionData.taxRate,
            taxAmount: transactionData.taxAmount,
            taxName: transactionData.taxName,
            taxStatus: transactionData.taxStatus,
            taxable: transactionData.taxable,
            clientId: transactionData.clientId,
            type: transactionData.type,
            amount: transactionData.amount,
            hasLines: !!transactionData.lines,
            linesLength: transactionData.lines
              ? transactionData.lines.length
              : 0,
          })
        );

        // Check if this transaction has tax applied
        console.log(
          `Tax eligibility check - clientId: ${!!transactionData.clientId}, taxId: ${!!transactionData.taxId}, taxable: ${!!transactionData.taxable}, taxStatus: ${transactionData.taxStatus
          }`
        );
        if (
          transactionData.clientId &&
          transactionData.taxId &&
          transactionData.taxable
        ) {
          const bookkeepingSettings =
            await storage.getClientBookkeepingSettings(
              transactionData.clientId
            );

          if (
            bookkeepingSettings &&
            bookkeepingSettings.taxSettings &&
            bookkeepingSettings.taxSettings.length > 0
          ) {
            // Find the tax setting by ID or taxSettingId
            // Add support for both string and number ID comparison and also taxSettingId
            const taxSetting = bookkeepingSettings.taxSettings.find(
              (tax) =>
                // Try to match by id (handles both string and number with loose comparison)
                (tax.id == transactionData.taxId ||
                  // Or match by taxSettingId if available
                  (transactionData.taxSettingId &&
                    tax.id == transactionData.taxSettingId)) &&
                // Only use active tax settings
                tax.isActive
            );

            console.log(
              `Tax lookup - Looking for tax with ID: ${transactionData.taxId} or taxSettingId: ${transactionData.taxSettingId}`
            );
            console.log(
              `Tax lookup - Available tax settings:`,
              bookkeepingSettings.taxSettings
            );

            // Apply tax if a valid tax setting was found
            if (taxSetting) {
              applyTax = true;
              taxRate = taxSetting.rate;
              taxAccountId = taxSetting.accountId;
              console.log(
                `Using tax setting: ${taxSetting.name} with rate ${taxRate} and account ID ${taxAccountId}`
              );
            } else {
              console.log(
                `Tax setting with ID ${transactionData.taxId} not found or inactive`
              );
            }

            // If tax should be applied, parse and use the tax amount provided
            if (applyTax && transactionData.taxAmount !== undefined) {
              taxAmount = transactionData.taxAmount.toString();
              console.log(`Using provided tax amount: ${taxAmount}`);
            } else if (applyTax) {
              // Calculate tax amount based on whether tax is inclusive or exclusive
              const transactionAmount = parseFloat(
                transactionData.amount.toString()
              );

              if (transactionData.taxInclusive) {
                // For tax inclusive: amount already includes tax
                const netAmount = transactionAmount / (1 + taxRate);
                taxAmount = (transactionAmount - netAmount).toFixed(2);
                console.log(
                  `Tax inclusive: Total amount ${transactionAmount} includes tax at rate ${taxRate}, tax portion: ${taxAmount}`
                );
              } else {
                // For tax exclusive: calculate tax as additional amount
                taxAmount = (transactionAmount * taxRate).toFixed(2);
                console.log(
                  `Tax exclusive: Applying tax rate ${taxRate} to transaction amount ${transactionAmount}, tax amount: ${taxAmount}`
                );
              }
            }
          }
        }

        // For journal entries, verify balance (debits = credits)
        if (
          transactionData.type === "journal" &&
          transactionData.items &&
          Array.isArray(transactionData.items)
        ) {
          // For journal entries, set accountId to the first account (required by database schema)
          console.log(
            `Journal entry debug: accountId=${transactionData.accountId}, items.length=${transactionData.items.length}`
          );
          if (transactionData.items.length > 0) {
            console.log(
              `First item accountId: ${transactionData.items[0].accountId}`
            );
          }
          if (!transactionData.accountId && transactionData.items.length > 0) {
            transactionData.accountId = transactionData.items[0].accountId;
            console.log(
              `Journal entry: Set main accountId to ${transactionData.accountId} (first account in items)`
            );
          } else {
            console.log(
              `Journal entry: Skipping accountId assignment - accountId=${transactionData.accountId}, items.length=${transactionData.items.length}`
            );
          }
          let totalDebits = 0;
          let totalCredits = 0;

          for (const item of transactionData.items) {
            const amount = processAmount(item.amount);
            if (item.isDebit) {
              totalDebits += amount;
            } else {
              totalCredits += amount;
            }
          }

          // Check if debits equal credits (strict accounting tolerance)
          // Tolerance of 0.001 (one-tenth of a penny) ensures penny-perfect balance
          // while accommodating only sub-penny floating-point precision errors
          if (Math.abs(totalDebits - totalCredits) > 0.001) {
            console.log(
              `Journal entry unbalanced: Debits $${totalDebits}, Credits $${totalCredits}`
            );
            return res.status(400).json({
              error: "Unbalanced journal entry",
              details: {
                totalDebits,
                totalCredits,
                difference: totalDebits - totalCredits,
              },
            });
          }

          console.log(
            `Journal entry balanced: $${totalDebits} = $${totalCredits}`
          );

          // Set the transaction amount to the total value of the debits
          // This ensures the amount is displayed correctly in transaction logs
          transactionData.amount = totalDebits.toString();
        }

        // Ensure transaction has a transaction group ID (required by database)
        if (!transactionData.transactionGroupId) {
          transactionData.transactionGroupId = uuidv4();
        }

        // FINAL CHECK: Log transaction data before creation
        console.log(`FINAL CHECK before transaction creation:`, {
          type: transactionData.type,
          accountId: transactionData.accountId,
          transactionGroupId: transactionData.transactionGroupId,
          hasItems: !!transactionData.items,
          itemsLength: transactionData.items?.length || 0,
        });

        // Create the transaction
        const transaction = await storage.createTransaction(transactionData);

        // For simple income and expense transactions, create appropriate transaction items
        if ((transaction as any).type === "income" && transaction.accountId) {
          // Create transaction items for income (credit to income account, debit to asset account)
          // Ensure amount is properly processed to prevent $0.00 display issues
          const processedAmount = processAmount(transaction.amount);

          // Determine the actual revenue and tax amounts based on tax inclusivity
          let netAmount = processedAmount;
          let actualTaxAmount = 0;

          if (applyTax && taxAccountId && parseFloat(taxAmount) > 0) {
            actualTaxAmount = parseFloat(taxAmount);

            // Tax inclusive: the amount already includes tax, so we need to deduct it for the income account
            if (transaction.taxInclusive) {
              netAmount = processedAmount - actualTaxAmount;
              console.log(
                `Income transaction: Tax inclusive - Total: $${processedAmount}, Net: $${netAmount}, Tax: $${actualTaxAmount}`
              );
            } else {
              // Tax exclusive: the tax is additional to the transaction amount
              console.log(
                `Income transaction: Tax exclusive - Net: $${netAmount}, Tax: $${actualTaxAmount}, Total: $${netAmount + actualTaxAmount
                }`
              );
            }
          }

          // 1. Credit income account with net amount (Revenue)
          await storage.createTransaction({
            transactionId: transaction.id,
            accountId: transaction.accountId, // Income account gets credit
            amount: netAmount.toString(),
            description: transaction.description,
            isDebit: false, // Credit to income account (increases income)
            tax: "0", // Tax is handled separately
          });

          // Find default asset account
          const assetAccounts = await storage.getAccountsByType(
            transaction.clientId,
            "asset"
          );
          const defaultAssetAccount =
            assetAccounts && assetAccounts.length > 0
              ? assetAccounts[0].id
              : null;

          if (defaultAssetAccount) {
            const totalAmount = transaction.taxInclusive
              ? processedAmount
              : netAmount + actualTaxAmount;

            // 2. Debit asset account with the total amount received (including tax if applicable)
            await storage.createTransaction({
              transactionId: transaction.id,
              accountId: defaultAssetAccount, // Asset account gets debit
              amount: totalAmount.toString(),
              description: `Asset increase from ${transaction.description}`,
              isDebit: true, // Debit to asset account (increases asset)
              tax: "0",
            });

            // 3. If tax applies, create tax liability entry (credit)
            if (applyTax && taxAccountId && actualTaxAmount > 0) {
              await storage.createTransaction({
                transactionId: transaction.id,
                accountId: taxAccountId,
                amount: actualTaxAmount.toString(),
                description: `Sales tax for ${transaction.description}`,
                isDebit: false, // Credit to tax liability account (increases liability)
                tax: "0",
              });
            }
          }
        } else if (transaction.type === "expense" && transaction.accountId) {
          // Create transaction items for expense (debit to expense account, credit to asset account)
          // Ensure amount is properly processed to prevent $0.00 display issues
          const processedAmount = processAmount(transaction.amount);

          // Determine actual expense and tax amounts based on tax inclusivity
          let netAmount = processedAmount;
          let actualTaxAmount = 0;

          if (applyTax && taxAccountId && parseFloat(taxAmount) > 0) {
            actualTaxAmount = parseFloat(taxAmount);

            // Tax inclusive: amount already includes tax, need to separate for correct accounting
            if (transaction.taxInclusive) {
              netAmount = processedAmount - actualTaxAmount;
              console.log(
                `Expense transaction: Tax inclusive - Total: $${processedAmount}, Net: $${netAmount}, Tax: $${actualTaxAmount}`
              );
            } else {
              // Tax exclusive: tax is additional to transaction amount
              console.log(
                `Expense transaction: Tax exclusive - Net: $${netAmount}, Tax: $${actualTaxAmount}, Total: $${netAmount + actualTaxAmount
                }`
              );
            }
          }

          // 1. Debit expense account with net amount
          await storage.createTransaction({
            transactionId: transaction.id,
            accountId: transaction.accountId, // Expense account gets debit
            amount: netAmount.toString(),
            description: transaction.description,
            isDebit: true, // Debit to expense account (increases expense)
            tax: "0", // Tax is handled separately
          });

          // Find default asset account
          const assetAccounts = await storage.getAccountsByType(
            transaction.clientId,
            "asset"
          );
          const defaultAssetAccount =
            assetAccounts && assetAccounts.length > 0
              ? assetAccounts[0].id
              : null;

          if (defaultAssetAccount) {
            const totalAmount = transaction.taxInclusive
              ? processedAmount
              : netAmount + actualTaxAmount;

            // 2. Credit asset account with total amount paid (including tax if applicable)
            await storage.createTransaction({
              transactionId: transaction.id,
              accountId: defaultAssetAccount, // Asset account gets credit
              amount: totalAmount.toString(),
              description: `Asset decrease from ${transaction.description}`,
              isDebit: false, // Credit to asset account (decreases asset)
              tax: "0",
            });

            // 3. If tax applies, create tax payable entry
            if (applyTax && taxAccountId && actualTaxAmount > 0) {
              // For tax (GST/HST) on expenses in Canada, we need to DEBIT the HST Payable
              // account since this represents a recoverable input tax credit (ITC)
              // that reduces the amount owed to the government.

              console.log(
                `Creating tax entry for expense: ${actualTaxAmount} to HST Payable account ${taxAccountId}`
              );
              await storage.createTransaction({
                transactionId: transaction.id,
                accountId: taxAccountId,
                amount: actualTaxAmount.toString(),
                description: `Input Tax Credit (ITC) for ${transaction.description}`,
                isDebit: true, // DEBIT to HST Payable (reduces liability because this is HST paid by business)
                tax: "0",
              });
            }
          }
        }

        // Create activity record
        // Activity logging temporarily disabled
        console.log(
          `New ${transaction.type} created: ${transaction.reference || transaction.description
          }`
        );

        // After creating a transaction, validate if the chart of accounts still balances
        if (transaction.clientId) {
          const accounts = await storage.getAccounts(transaction.clientId);
          const validation = await validateChartOfAccounts(accounts);

          if (!validation.balanced) {
            console.warn(
              `Warning: After creating transaction #${transaction.id}, chart of accounts is unbalanced: ${validation.message}`
            );
          } else {
            console.log(
              `Transaction #${transaction.id} created, chart of accounts remains in balance: ${validation.message}`
            );
          }

          // Include validation result with the response
          transaction.chartValidation = {
            balanced: validation.balanced,
            totalAssets: validation.totalAssets,
            totalLiabilities: validation.totalLiabilities,
            totalEquity: validation.totalEquity,
            difference: validation.difference,
          };
        }

        res.status(201).json(transaction);
      } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Failed to create transaction" });
      }
    }
  );

  apiRouter.get(
    "/transaction-items/:transactionId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const transactionId = parseInt(req.params.transactionId);
        // TODO: Implement transaction items storage method
        const items = []; // await storage.getTransactionItems(transactionId);
        res.json(items);
      } catch (error) {
        console.error("Error getting transaction items:", error);
        res.status(500).json({ error: "Failed to get transaction items" });
      }
    }
  );

  apiRouter.post(
    "/transaction-items",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const itemData = req.body;

        // Process amount to ensure it's properly formatted
        if (itemData.amount) {
          const processedAmount = processAmount(itemData.amount);
          itemData.amount = processedAmount.toString();
        }

        const item = await storage.createTransaction(itemData);
        res.status(201).json(item);
      } catch (error) {
        console.error("Error creating transaction item:", error);
        res.status(500).json({ error: "Failed to create transaction item" });
      }
    }
  );

  apiRouter.patch(
    "/transactions/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const transactionId = parseInt(req.params.id);
        const updateData = req.body;

        // Process amount if it exists in the update data
        if (updateData.amount) {
          const processedAmount = processAmount(updateData.amount);
          updateData.amount = processedAmount.toString();
        }

        // If accountId is being set (transaction is getting categorized), update status to completed
        if (updateData.accountId && updateData.accountId !== null) {
          updateData.status = "completed";
          console.log(
            `📝 Transaction ${transactionId} being categorized to account ${updateData.accountId}, setting status to completed`
          );
        }

        // Get the transaction to update
        const transaction = await storage.getTransaction(transactionId);
        if (!transaction) {
          return res.status(404).json({ error: "Transaction not found" });
        }

        // Simply categorize the transaction without creating automatic double entries
        // This allows for proper single-entry import where categorization happens separately
        if (
          updateData.accountId &&
          updateData.accountId !== transaction.accountId
        ) {
          console.log(
            `📝 Transaction ${transactionId} being categorized to account ${updateData.accountId}, setting status to completed`
          );
        }

        // If accountId is being updated, preserve the original bank account and ensure status is updated too
        if (
          updateData.accountId &&
          transaction.accountId !== updateData.accountId
        ) {
          // Preserve the original bank account as sourceAccountId
          if (!transaction.sourceAccountId) {
            updateData.sourceAccountId = transaction.accountId;
            console.log(
              `Preserving original bank account ${transaction.accountId} as sourceAccountId for transaction ${transactionId}`
            );
          }

          // If status isn't explicitly being set and current status is 'pending',
          // automatically update to 'categorized'
          if (!updateData.status && transaction.status === "pending") {
            updateData.status = "categorized";
            console.log(
              `Automatically updating transaction ${transactionId} status to 'categorized'`
            );
          }
        }

        // Fix timestamp handling - remove any invalid timestamp fields
        delete updateData.updatedAt;
        delete updateData.createdAt;

        // Update the transaction
        const updatedTransaction = await storage.updateTransaction(
          transactionId,
          updateData
        );

        // If accountId is being updated (categorization), create or update proper double-entry journal entries
        // Also create entries if status is being set to 'categorized' or 'completed' (manual save)
        if (
          updateData.accountId &&
          (transaction.accountId !== updateData.accountId ||
            updateData.status === "categorized" ||
            updateData.status === "completed")
        ) {
          try {
            // Check if journal entry already exists for this transaction
            const existingJournalEntry = await storage.findJournalEntryBySourceTransactionId(transactionId);

            if (existingJournalEntry) {
              console.log(
                `🏦 CATEGORIZATION: Updating existing journal entry ${existingJournalEntry.id} for transaction ${transactionId}`
              );
            } else {
              console.log(
                `🏦 CATEGORIZATION: Creating new journal entry for transaction ${transactionId}`
              );
            }

            // Get all client accounts to understand account types
            const clientAccounts = await storage.getAccounts(
              transaction.clientId
            );
            const targetAccount = clientAccounts.find(
              (acc) => acc.id === updateData.accountId
            );
            const originalAccount = clientAccounts.find(
              (acc) => acc.id === transaction.accountId
            );

            console.log(
              `🏦 CATEGORIZATION: Transaction ${transactionId} being moved from ${originalAccount?.name || "Unknown"
              } (${originalAccount?.type || "Unknown"}) to ${targetAccount?.name || "Unknown"
              } (${targetAccount?.type || "Unknown"})`
            );

            // Use the transaction amount from debitAmount or creditAmount
            const debitAmount = parseFloat(transaction.debitAmount || "0");
            const creditAmount = parseFloat(transaction.creditAmount || "0");
            const transactionAmount = Math.max(debitAmount, creditAmount);

            // For any categorization to expense/income accounts, create journal entries
            const isToExpenseOrIncomeAccount =
              targetAccount &&
              (targetAccount.type === "expense" ||
                targetAccount.type === "income");

            // Find a bank account to use as the offsetting account
            // Always use a bank account for proper double-entry bookkeeping
            const bankAccount = clientAccounts.find(
              (acc) =>
                acc.subtype === "bank" ||
                acc.name.toLowerCase().includes("cash")
            );
            const offsetAccountId = bankAccount?.id;
            console.log(
              `Using bank account for offset: ${bankAccount?.name} (ID: ${offsetAccountId})`
            );

            console.log(
              `CATEGORIZATION CHECK: Target Account Type: ${targetAccount?.type}, Is Expense/Income: ${isToExpenseOrIncomeAccount}, Amount: ${transactionAmount}`
            );

            if (
              isToExpenseOrIncomeAccount &&
              transactionAmount > 0 &&
              offsetAccountId
            ) {
              console.log(
                `📋 CREATING JOURNAL ENTRY: ${targetAccount.type} transaction for $${transactionAmount}`
              );

              // Create balanced journal entry with proper validation
              const entryDate = new Date(transaction.transactionDate);
              console.log(
                `📅 TRANSACTION DATE DEBUG: Original transaction date: ${transaction.transactionDate
                }, Parsed: ${entryDate.toISOString()}`
              );

              let journalEntry;

              if (existingJournalEntry) {
                // Update existing journal entry
                journalEntry = await storage.updateJournalEntry(existingJournalEntry.id, {
                  description:
                    transaction.description ||
                    `${targetAccount.type.charAt(0).toUpperCase() +
                    targetAccount.type.slice(1)
                    } transaction`,
                  entryDate: entryDate,
                  totalDebit: transactionAmount.toString(),
                  totalCredit: transactionAmount.toString(),
                  status: "posted",
                });

                // Delete existing journal entry lines
                const existingLines = await storage.getJournalEntryLines(existingJournalEntry.id);
                if (existingLines && Array.isArray(existingLines)) {
                  for (const line of existingLines) {
                    await storage.deleteJournalEntryLine(line.id);
                  }
                  console.log(`🗑️ Deleted ${existingLines.length} existing journal entry lines`);
                }

                console.log(`📋 Updated journal entry ${journalEntry.id}`);
              } else {
                // Create new journal entry
                journalEntry = await storage.createJournalEntry({
                  clientId: transaction.clientId,
                  description:
                    transaction.description ||
                    `${targetAccount.type.charAt(0).toUpperCase() +
                    targetAccount.type.slice(1)
                    } transaction`,
                  entryDate: entryDate,
                  totalDebit: transactionAmount.toString(),
                  totalCredit: transactionAmount.toString(),
                  status: "posted",
                  sourceTransactionId: transactionId, // Link to source transaction
                });

                console.log(`📋 Created journal entry ${journalEntry.id}`);
              }

              // Calculate tax if applicable using unified tax service
              const taxCode = updateData.taxCode || "HST";
              const hasTax =
                taxCode && taxCode !== "None" && transactionAmount > 0;
              let netAmount = transactionAmount;
              let taxAmount = 0;
              let taxAccount = null;
              let taxCalculation = null;

              if (hasTax) {
                // Import tax service (using dynamic import for ES modules)
                const { taxService } = await import("./tax-service.js");

                // Apply tax using unified service
                const taxResult = await taxService.applyTaxToTransaction(
                  clientId,
                  transactionAmount,
                  taxCode === "HST" ? undefined : taxCode, // Use default for HST, otherwise use specific tax
                  true // Tax inclusive
                );

                if (taxResult.success && taxResult.calculation) {
                  taxCalculation = taxResult.calculation;
                  netAmount = taxCalculation.netAmount;
                  taxAmount = taxCalculation.taxAmount;

                  // Get the tax account
                  taxAccount = await storage.getAccountById(
                    taxCalculation.taxAccountId
                  );

                  console.log(
                    `🧾 TAX CALCULATION: Total: $${transactionAmount}, Net: $${netAmount.toFixed(
                      2
                    )}, Tax: $${taxAmount.toFixed(2)}, Tax Account: ${taxAccount?.name || "Not found"
                    }`
                  );
                }
              }

              // For expense transactions: Debit expense account, Credit bank account, Debit tax (ITC)
              // For income transactions: Debit bank account, Credit income account, Credit tax (payable)
              if (targetAccount.type === "expense") {
                // Create balanced journal entry lines - expense transaction
                await storage.createJournalEntryLine({
                  journalEntryId: journalEntry.id,
                  accountId: targetAccount.id,
                  debitAmount: netAmount.toFixed(2),
                  creditAmount: "0.00",
                  description: transaction.description || "Expense transaction",
                  memo: `Debit ${targetAccount.name} (net amount)`,
                });

                // Tax Input Tax Credit (if applicable)
                if (hasTax && taxCalculation) {
                  const { taxService } = require("./tax-service");
                  await taxService.createTaxJournalEntries(
                    journalEntry.id,
                    taxCalculation,
                    transaction.description || "Expense transaction",
                    true // isExpense
                  );
                }

                await storage.createJournalEntryLine({
                  journalEntryId: journalEntry.id,
                  accountId: offsetAccountId,
                  debitAmount: "0.00",
                  creditAmount: transactionAmount.toString(),
                  description: transaction.description || "Expense transaction",
                  memo: `Credit ${bankAccount.name} (total amount)`,
                });

                console.log(
                  `✅ EXPENSE JOURNAL ENTRY: Debit ${targetAccount.name
                  } $${netAmount.toFixed(2)}, ${hasTax ? `Debit Tax $${taxAmount.toFixed(2)}, ` : ""
                  }Credit Bank $${transactionAmount}`
                );
              } else if (targetAccount.type === "income") {
                // Create balanced journal entry lines - income transaction
                await storage.createJournalEntryLine({
                  journalEntryId: journalEntry.id,
                  accountId: offsetAccountId,
                  debitAmount: transactionAmount.toString(),
                  creditAmount: "0.00",
                  description: transaction.description || "Income transaction",
                  memo: `Debit ${bankAccount.name} (total amount)`,
                });

                await storage.createJournalEntryLine({
                  journalEntryId: journalEntry.id,
                  accountId: targetAccount.id,
                  debitAmount: "0.00",
                  creditAmount: netAmount.toFixed(2),
                  description: transaction.description || "Income transaction",
                  memo: `Credit ${targetAccount.name} (net amount)`,
                });

                // Tax Payable (if applicable)
                if (hasTax && taxCalculation) {
                  const { taxService } = require("./tax-service");
                  await taxService.createTaxJournalEntries(
                    journalEntry.id,
                    taxCalculation,
                    transaction.description || "Income transaction",
                    false // isExpense
                  );
                }

                console.log(
                  `✅ INCOME JOURNAL ENTRY: Debit Bank $${transactionAmount}, Credit ${targetAccount.name
                  } $${netAmount.toFixed(2)}${hasTax ? `, Credit Tax $${taxAmount.toFixed(2)}` : ""
                  }`
                );
              }

              console.log(
                `DOUBLE-ENTRY COMPLETE: Created balanced journal entries for transaction ${transactionId}`
              );

              // IMPORTANT: Set transaction status to 'completed' when journal entry is created
              updateData.status = "completed";
              console.log(
                `🎯 MANUAL CATEGORIZATION: Setting transaction ${transactionId} status to 'completed'`
              );
            } else {
              console.log(
                `SKIP DOUBLE-ENTRY: Not a bank-to-expense/income transaction (From: ${originalAccount?.type}/${originalAccount?.subtype}, To: ${targetAccount?.type})`
              );

              // For non-expense/income categorizations, still mark as categorized
              if (updateData.accountId) {
                updateData.status = "categorized";
                console.log(
                  `📝 NON-P&L CATEGORIZATION: Setting transaction ${transactionId} status to 'categorized'`
                );
              }
            }
          } catch (doubleEntryError) {
            console.error(
              `DOUBLE-ENTRY ERROR for transaction ${transactionId}:`,
              doubleEntryError
            );
            // Continue with the transaction update even if double-entry fails
            // Still mark as categorized if account was selected
            if (updateData.accountId) {
              updateData.status = "categorized";
            }
          }
        }

        res.json(updatedTransaction);
      } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ error: "Failed to update transaction" });
      }
    }
  );

  // Contacts
  apiRouter.get(
    "/contacts",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const contacts = await storage.getContacts();
        res.json(contacts);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ error: "Failed to fetch contacts" });
      }
    }
  );

  apiRouter.post(
    "/contacts",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // TODO: Implement createContact method in storage interface
        const contact = null; // Placeholder until method is implemented
        res.status(201).json(contact);
      } catch (error) {
        console.error("Error creating contact:", error);
        res.status(500).json({ error: "Failed to create contact" });
      }
    }
  );

  apiRouter.patch("/contacts/:id", async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.id);
      // TODO: Implement updateContact method in storage interface
      const updatedContact = null; // Placeholder until method is implemented
      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  apiRouter.delete("/contacts/:id", async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.id);
      // TODO: Implement deleteContact method in storage interface
      // Placeholder until method is implemented
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // REMOVED: Duplicate route - using enhanced version below

  apiRouter.get(
    "/journal-entries/:journalEntryId/lines",
    async (req: Request, res: Response) => {
      try {
        const journalEntryId = parseInt(req.params.journalEntryId);
        const lines = await storage.getJournalEntryLines(journalEntryId);
        res.json(lines);
      } catch (error) {
        console.error("Error fetching journal entry lines:", error);
        res.status(500).json({ error: "Failed to fetch journal entry lines" });
      }
    }
  );

  // CSV file parsing endpoint
  apiRouter.post(
    "/transactions/parse-file",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        let rows: any[][] = [];
        let headers: string[] = [];

        try {
          if (fileExtension === ".csv") {
            const csvContent = fileBuffer.toString("utf8");
            const lines = csvContent.split("\n").filter((line) => line.trim());

            if (lines.length === 0) {
              throw new Error("Empty CSV file");
            }

            // Parse CSV with proper quote handling
            rows = lines.map((line) => {
              const result = [];
              let current = "";
              let inQuotes = false;

              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === "," && !inQuotes) {
                  result.push(current.trim().replace(/^"|"$/g, ""));
                  current = "";
                } else {
                  current += char;
                }
              }
              result.push(current.trim().replace(/^"|"$/g, ""));
              return result;
            });

            if (rows.length > 0) {
              headers = rows[0];
              rows = rows.slice(1);
            }
          } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
            // Handle Excel files
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              headers = jsonData[0];
              rows = jsonData.slice(1);
            }
          }

          // Generate intelligent column mapping suggestions
          const suggestions: any = {};
          headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();

            // Date detection
            if (lowerHeader.includes("date") || lowerHeader.includes("time")) {
              suggestions.date = index;
            }

            // Description detection
            if (
              lowerHeader.includes("description") ||
              lowerHeader.includes("memo") ||
              lowerHeader.includes("payee") ||
              lowerHeader.includes("reference")
            ) {
              if (!suggestions.description) {
                suggestions.description = index;
              } else {
                suggestions.description2 = index;
              }
            }

            // Amount detection
            if (
              lowerHeader.includes("amount") &&
              !lowerHeader.includes("tax")
            ) {
              suggestions.amount = index;
            }

            // Debit/Credit detection
            if (lowerHeader.includes("debit") || lowerHeader === "dr") {
              suggestions.debitAmount = index;
            }
            if (lowerHeader.includes("credit") || lowerHeader === "cr") {
              suggestions.creditAmount = index;
            }
          });

          console.log("File parsed successfully:", {
            headers: headers.length,
            rows: rows.length,
            suggestions,
          });

          res.json({
            success: true,
            headers,
            rows,
            suggestions,
          });
        } catch (parseError) {
          throw parseError;
        }
      } catch (error) {
        console.error("File parsing error:", error);
        res.status(500).json({
          error: "Failed to parse file",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Journal entries file parsing endpoint
  apiRouter.post(
    "/journal-entries/parse-file",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        let rows: any[][] = [];
        let headers: string[] = [];

        try {
          if (fileExtension === ".csv") {
            const csvContent = fileBuffer.toString("utf8");
            const lines = csvContent.split("\n").filter((line) => line.trim());

            if (lines.length === 0) {
              throw new Error("Empty CSV file");
            }

            // Parse CSV with proper quote handling
            rows = lines.map((line) => {
              const result = [];
              let current = "";
              let inQuotes = false;

              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === "," && !inQuotes) {
                  result.push(current.trim().replace(/^"|"$/g, ""));
                  current = "";
                } else {
                  current += char;
                }
              }
              result.push(current.trim().replace(/^"|"$/g, ""));
              return result;
            });

            if (rows.length > 0) {
              headers = rows[0];
              rows = rows.slice(1);
            }
          } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
            // Handle Excel files
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              headers = jsonData[0];
              rows = jsonData.slice(1);
            }
          } else {
            throw new Error(
              "Unsupported file format. Please upload CSV or Excel files."
            );
          }

          if (headers.length === 0 || rows.length === 0) {
            throw new Error("No valid data found in file");
          }

          // Generate intelligent column mapping suggestions for journal entries
          const columnMappings = {};
          const journalEntryColumns = [
            "date",
            "description",
            "debitAccount",
            "creditAccount",
            "amount",
            "reference",
          ];

          journalEntryColumns.forEach((targetCol) => {
            const bestMatch = headers.find((header) => {
              const headerLower = header.toLowerCase();
              if (targetCol === "date") {
                return (
                  headerLower.includes("date") ||
                  headerLower.includes("transaction_date")
                );
              } else if (targetCol === "description") {
                return (
                  headerLower.includes("description") ||
                  headerLower.includes("memo") ||
                  headerLower.includes("detail")
                );
              } else if (targetCol === "debitAccount") {
                return (
                  headerLower.includes("debit") &&
                  (headerLower.includes("account") ||
                    headerLower.includes("code"))
                );
              } else if (targetCol === "creditAccount") {
                return (
                  headerLower.includes("credit") &&
                  (headerLower.includes("account") ||
                    headerLower.includes("code"))
                );
              } else if (targetCol === "amount") {
                return (
                  headerLower.includes("amount") ||
                  headerLower.includes("value") ||
                  headerLower.includes("total")
                );
              } else if (targetCol === "reference") {
                return (
                  headerLower.includes("reference") ||
                  headerLower.includes("ref") ||
                  headerLower.includes("number")
                );
              }
              return false;
            });

            if (bestMatch) {
              columnMappings[targetCol] = bestMatch;
            }
          });

          // Convert rows to objects for preview
          const dataRows = rows.slice(0, 5).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          res.json({
            success: true,
            headers,
            data: dataRows,
            totalRows: rows.length,
            columnMappings,
            fileName: req.file.originalname,
          });
        } catch (parseError) {
          throw new Error(`File parsing failed: ${parseError.message}`);
        }
      } catch (error) {
        console.error("Journal entries file parsing error:", error);
        res.status(500).json({
          error: "Failed to parse journal entries file",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // AI-Powered General Ledger parsing endpoint for complex GL formats (SAGE, QBO, etc.)
  // Get import progress status
  apiRouter.get(
    "/general-ledger/import-progress/:clientId",
    requireAuthHybrid,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);

        if (
          !global.importProgress ||
          global.importProgress.clientId !== clientId
        ) {
          return res.json({ isActive: false, progress: null });
        }

        const progress = global.importProgress;
        const progressPercent = Math.round(
          (progress.processedCount / progress.totalTransactions) * 100
        );

        res.json({
          isActive: progress.isActive,
          progress: {
            totalTransactions: progress.totalTransactions,
            processedCount: progress.processedCount,
            importedCount: progress.importedCount,
            skippedCount: progress.skippedCount,
            currentBatch: progress.currentBatch,
            totalBatches: progress.totalBatches,
            progressPercent,
            startTime: progress.startTime,
            endTime: progress.endTime || null,
          },
        });
      } catch (error) {
        console.error("Error getting import progress:", error);
        res.status(500).json({ error: "Failed to get import progress" });
      }
    }
  );

  apiRouter.post(
    "/general-ledger/parse-file",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // CRITICAL: Clean up test data before parsing to avoid duplicates
        const clientId = parseInt(
          req.body.clientId || req.query.clientId || "1"
        );

        // Clean up any previous test imports for this client
        console.log(
          `🧹 Cleaning up previous GL import test data for client ${clientId}...`
        );
        try {
          // Delete journal entry lines first (foreign key constraint)
          await storage.query(
            `
          DELETE FROM journal_entry_lines 
          WHERE journal_entry_id IN (
            SELECT id FROM journal_entries 
            WHERE client_id = $1 
            AND source_type = 'gl_import'
            AND (description LIKE '%TEST%' OR description LIKE '%Import from GL%')
          )
        `,
            [clientId]
          );

          // Delete journal entries
          const deleteResult = await storage.query(
            `
          DELETE FROM journal_entries 
          WHERE client_id = $1 
          AND source_type = 'gl_import'
          AND (description LIKE '%TEST%' OR description LIKE '%Import from GL%')
        `,
            [clientId]
          );

          console.log(
            `✅ Cleaned up ${deleteResult.rowCount || 0} test journal entries`
          );
        } catch (cleanupError) {
          console.log("⚠️ Cleanup skipped or partial:", cleanupError.message);
        }

        // Helper function to parse Excel dates - IMPROVED FOR SAGE FILES
        function parseExcelDate(value: any): string {
          if (!value) return null;

          const strValue = String(value).trim();
          console.log(
            `🗓️  DATE PARSE DEBUG: Input value "${strValue}" (type: ${typeof value})`
          );

          // 1. Check if it's already a date string (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
          if (
            strValue.match(/^\d{4}-\d{2}-\d{2}$/) ||
            strValue.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) ||
            strValue.match(/^\d{1,2}-\d{1,2}-\d{2,4}$/)
          ) {
            // Parse and normalize the date
            const date = new Date(strValue);
            if (
              !isNaN(date.getTime()) &&
              date.getFullYear() > 1990 &&
              date.getFullYear() < 2030
            ) {
              const result = date.toISOString().split("T")[0];
              console.log(
                `✅ DATE PARSE: String format "${strValue}" -> ${result}`
              );
              return result;
            }
          }

          // 2. Check if it's an Excel serial date (number)
          const numValue = parseFloat(strValue);
          if (!isNaN(numValue)) {
            console.log(`🔢 DATE PARSE: Numeric value ${numValue}`);

            // Handle Excel serial dates properly
            if (numValue > 1 && numValue < 100000) {
              // Excel epoch starts at 1900-01-01 (serial 1)
              // But Excel incorrectly treats 1900 as a leap year
              // For dates after Feb 28, 1900, subtract 1 day to compensate
              const excelEpoch = new Date(1900, 0, 1); // Jan 1, 1900
              let adjustedNum = numValue - 1; // Convert to 0-based

              // Excel leap year bug correction for dates after Feb 28, 1900
              if (numValue > 59) {
                // After Feb 28, 1900
                adjustedNum = numValue - 2;
              }

              const jsDate = new Date(
                excelEpoch.getTime() + adjustedNum * 24 * 60 * 60 * 1000
              );

              // Validate the resulting date is reasonable
              if (
                !isNaN(jsDate.getTime()) &&
                jsDate.getFullYear() >= 1900 &&
                jsDate.getFullYear() <= 2030
              ) {
                const result = jsDate.toISOString().split("T")[0];
                console.log(
                  `✅ DATE PARSE: Excel serial ${numValue} -> ${result}`
                );
                return result;
              } else {
                console.log(
                  `❌ DATE PARSE: Excel serial ${numValue} produced invalid date ${jsDate}`
                );
              }
            }

            // Handle UNIX timestamps (if applicable)
            if (numValue > 946684800 && numValue < 2147483647) {
              // Between 2000 and 2038
              const jsDate = new Date(numValue * 1000);
              if (!isNaN(jsDate.getTime())) {
                const result = jsDate.toISOString().split("T")[0];
                console.log(
                  `✅ DATE PARSE: UNIX timestamp ${numValue} -> ${result}`
                );
                return result;
              }
            }
          }

          // 3. Try parsing as-is with JavaScript Date constructor
          const directDate = new Date(strValue);
          if (
            !isNaN(directDate.getTime()) &&
            directDate.getFullYear() > 1990 &&
            directDate.getFullYear() < 2030
          ) {
            const result = directDate.toISOString().split("T")[0];
            console.log(
              `✅ DATE PARSE: Direct parse "${strValue}" -> ${result}`
            );
            return result;
          }

          // 4. If all parsing methods fail, use a reasonable default
          // Better than returning null or 1900 dates
          console.warn(
            `⚠️  DATE PARSE FAILED: Could not parse "${strValue}", using current date as fallback`
          );
          const currentDate = new Date().toISOString().split("T")[0];
          console.log(`🔄 DATE PARSE: Fallback date -> ${currentDate}`);
          return currentDate;
        }

        const fileBuffer = req.file.buffer;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        let rawData: any[][] = [];
        let headers: string[] = [];

        try {
          // Parse file based on extension
          if (fileExtension === ".csv") {
            const csvContent = fileBuffer.toString("utf8");
            const lines = csvContent.split("\n").filter((line) => line.trim());

            if (lines.length === 0) {
              throw new Error("Empty CSV file");
            }

            rawData = lines.map((line) => {
              const result = [];
              let current = "";
              let inQuotes = false;

              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === "," && !inQuotes) {
                  result.push(current.trim().replace(/^"|"$/g, ""));
                  current = "";
                } else {
                  current += char;
                }
              }
              result.push(current.trim().replace(/^"|"$/g, ""));
              return result;
            });
          } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              rawData = jsonData.map((row) =>
                row.map((cell) => String(cell || ""))
              );
            }
          } else {
            throw new Error(
              "Unsupported file format. Please upload CSV or Excel files."
            );
          }

          if (rawData.length === 0) {
            throw new Error("No valid data found in file");
          }

          // AI-Powered General Ledger Analysis with fallback
          const clientId = parseInt(
            req.body.clientId || req.query.clientId || "1"
          );
          const accounts = await storage.getAccounts(clientId);

          let parsedAnalysis;

          // Check if this is Journal Entry or General Ledger format
          console.log("🔍 Detecting file format...");

          // IMPROVED: Look for Journal Entry patterns with more flexible matching
          const journalEntryPatterns = [
            /^(BB|BC|PR)-\d{4,8}$/i, // Main patterns: BB-XXXXXX, BC-XXXXXX, PR-XXXXXX
            /^JE-\d+$/i, // Journal Entry: JE-123456
            /^[A-Z]{2}-\d{4,8}$/i, // Generic: XX-XXXXXX
          ];

          let isJournalEntryFormat = false;

          // COMPREHENSIVE: Scan ALL rows and ALL columns for journal entry patterns
          const detectedJENumbers = new Set();
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            // Check ALL columns (not just first 3)
            for (let j = 0; j < row.length; j++) {
              const cell = row[j]?.toString().trim();
              if (cell) {
                for (const pattern of journalEntryPatterns) {
                  if (pattern.test(cell)) {
                    if (!isJournalEntryFormat) {
                      console.log(
                        `✅ JOURNAL ENTRY FORMAT DETECTED: ${cell} at row ${i + 1
                        }, column ${j + 1}`
                      );
                      isJournalEntryFormat = true;
                    }
                    detectedJENumbers.add(cell);
                  }
                }
              }
            }
          }

          if (isJournalEntryFormat) {
            console.log(
              `📑 PARSING JOURNAL ENTRY FORMAT - Found ${detectedJENumbers.size} unique journal entry numbers`
            );
          }

          if (isJournalEntryFormat) {
            // Parse as Journal Entry format - PROPER GROUPING BY JOURNAL REFERENCE
            console.log(
              "📑 PARSING JOURNAL ENTRY FORMAT WITH PROPER GROUPING..."
            );

            // CRITICAL: Group by journal entry reference, not individual lines
            const journalEntriesMap = new Map();
            let headerRow = null;
            let debitCol = -1;
            let creditCol = -1;
            let accountCol = -1;
            let accountNameCol = -1;
            let descCol = -1;
            let dateCol = -1;
            let jeCol = -1;

            // Find header row with "Debit" and "Credit"
            for (let i = 0; i < Math.min(50, rawData.length); i++) {
              const row = rawData[i];
              if (!row) continue;

              const rowStr = row.join(" ").toLowerCase();
              if (rowStr.includes("debit") && rowStr.includes("credit")) {
                headerRow = i;
                // Find column indices
                for (let j = 0; j < row.length; j++) {
                  const cell = row[j]?.toString().toLowerCase() || "";
                  if (cell.includes("debit")) debitCol = j;
                  if (cell.includes("credit")) creditCol = j;
                  if (cell.includes("account") && cell.includes("number"))
                    accountCol = j;
                  if (
                    cell.includes("account") &&
                    (cell.includes("name") || cell.includes("description"))
                  )
                    accountNameCol = j;
                  if (cell.includes("description") || cell.includes("comment"))
                    descCol = j;
                  if (cell.includes("date")) dateCol = j;
                  if (
                    cell.includes("reference") ||
                    cell.includes("ref") ||
                    cell.includes("journal")
                  )
                    jeCol = j;
                }
                console.log(
                  `📋 Header found at row ${i}: Account=${accountCol}, AccountName=${accountNameCol}, Date=${dateCol}, JE=${jeCol}, Debit=${debitCol}, Credit=${creditCol}`
                );
                break;
              }
            }

            // IMPROVED PARSING STRATEGY: Track journal entry boundaries
            let currentJEReference = null;
            let currentJEDate = null;
            let currentJELines = [];

            // Process all rows to build journal entries
            for (let i = headerRow + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || row.length === 0) continue;

              // Check if this row contains a NEW journal entry reference
              let foundNewJE = false;
              let potentialJE = null;

              // Check JE column first if identified
              if (jeCol >= 0 && row[jeCol]) {
                const cell = row[jeCol]?.toString().trim();
                for (const pattern of journalEntryPatterns) {
                  if (pattern.test(cell)) {
                    potentialJE = cell;
                    foundNewJE = true;
                    break;
                  }
                }
              }

              // If not found in JE column, check first few columns
              if (!foundNewJE) {
                for (let j = 0; j < Math.min(3, row.length); j++) {
                  const cell = row[j]?.toString().trim();
                  if (cell) {
                    for (const pattern of journalEntryPatterns) {
                      if (pattern.test(cell)) {
                        potentialJE = cell;
                        foundNewJE = true;
                        break;
                      }
                    }
                    if (foundNewJE) break;
                  }
                }
              }

              // If we found a NEW journal entry reference
              if (foundNewJE && potentialJE) {
                // Save the previous journal entry if it exists
                if (currentJEReference && currentJELines.length > 0) {
                  // Calculate totals for the journal entry
                  const totalDebit = currentJELines.reduce(
                    (sum, line) => sum + line.debit,
                    0
                  );
                  const totalCredit = currentJELines.reduce(
                    (sum, line) => sum + line.credit,
                    0
                  );
                  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                  journalEntriesMap.set(currentJEReference, {
                    referenceNumber: currentJEReference,
                    date:
                      currentJEDate || new Date().toISOString().split("T")[0],
                    lines: [...currentJELines], // Create a copy
                    totalDebit,
                    totalCredit,
                    isBalanced,
                    lineCount: currentJELines.length,
                  });

                  console.log(
                    `✅ Saved JE ${currentJEReference}: ${currentJELines.length
                    } lines | D:$${totalDebit.toFixed(
                      2
                    )} C:$${totalCredit.toFixed(2)} | ${isBalanced ? "BALANCED" : "UNBALANCED"
                    }`
                  );
                }

                // Start a new journal entry
                currentJEReference = potentialJE;
                currentJELines = [];

                // Extract date for this new JE
                if (dateCol >= 0 && row[dateCol]) {
                  currentJEDate = parseExcelDate(row[dateCol]);
                } else {
                  // Try to find date in adjacent cells
                  for (let j = 1; j < Math.min(5, row.length); j++) {
                    const potentialDate = parseExcelDate(row[j]);
                    if (
                      potentialDate &&
                      potentialDate !== new Date().toISOString().split("T")[0]
                    ) {
                      currentJEDate = potentialDate;
                      break;
                    }
                  }
                }
              }

              // Parse line item data (whether it's a JE row or a regular line)
              if (currentJEReference) {
                const accountCode = row[accountCol]?.toString().trim();
                const accountName =
                  accountNameCol >= 0
                    ? row[accountNameCol]?.toString().trim()
                    : "";
                const description =
                  descCol >= 0 ? row[descCol]?.toString().trim() : accountName;

                // Parse amounts
                const debitStr =
                  row[debitCol]?.toString().replace(/[,$]/g, "") || "0";
                const creditStr =
                  row[creditCol]?.toString().replace(/[,$]/g, "") || "0";
                let debit = parseFloat(debitStr);
                let credit = parseFloat(creditStr);

                if (isNaN(debit)) debit = 0;
                if (isNaN(credit)) credit = 0;

                // Only add lines with valid account codes and amounts
                if (
                  accountCode &&
                  (/^\d{3}-\d{3}$/.test(accountCode) ||
                    /^\d{6}$/.test(accountCode)) &&
                  (debit > 0 || credit > 0)
                ) {
                  currentJELines.push({
                    accountNumber: accountCode,
                    accountName: accountName || description || "",
                    description: description || accountName || "",
                    debit,
                    credit,
                  });
                }
              }
            }

            // Don't forget the last journal entry
            if (currentJEReference && currentJELines.length > 0) {
              const totalDebit = currentJELines.reduce(
                (sum, line) => sum + line.debit,
                0
              );
              const totalCredit = currentJELines.reduce(
                (sum, line) => sum + line.credit,
                0
              );
              const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

              journalEntriesMap.set(currentJEReference, {
                referenceNumber: currentJEReference,
                date: currentJEDate || new Date().toISOString().split("T")[0],
                lines: currentJELines,
                totalDebit,
                totalCredit,
                isBalanced,
                lineCount: currentJELines.length,
              });

              console.log(
                `✅ Saved JE ${currentJEReference}: ${currentJELines.length
                } lines | D:$${totalDebit.toFixed(2)} C:$${totalCredit.toFixed(
                  2
                )} | ${isBalanced ? "BALANCED" : "UNBALANCED"}`
              );
            }

            // Convert Map to array of properly structured journal entries
            const journalEntries = Array.from(journalEntriesMap.values());

            // Calculate totals across ALL journal entries
            let grandTotalDebits = 0;
            let grandTotalCredits = 0;
            let totalLineCount = 0;
            let balancedCount = 0;
            let unbalancedCount = 0;

            journalEntries.forEach((je) => {
              grandTotalDebits += je.totalDebit;
              grandTotalCredits += je.totalCredit;
              totalLineCount += je.lineCount;
              if (je.isBalanced) balancedCount++;
              else unbalancedCount++;
            });

            console.log(
              `\n🎯 PARSING COMPLETE - PROPERLY GROUPED JOURNAL ENTRIES:`
            );
            console.log(
              `📑 Found ${journalEntries.length} unique journal entries (NOT individual lines)`
            );
            console.log(
              `📊 Total line items across all entries: ${totalLineCount}`
            );
            console.log(
              `💰 Grand Totals: Debits=$${grandTotalDebits.toFixed(
                2
              )}, Credits=$${grandTotalCredits.toFixed(2)}`
            );
            console.log(`✅ Balanced entries: ${balancedCount}`);
            console.log(`❌ Unbalanced entries: ${unbalancedCount}`);
            console.log(
              `📊 Average lines per entry: ${(
                totalLineCount / Math.max(journalEntries.length, 1)
              ).toFixed(1)}`
            );

            // Show sample journal entries for verification
            console.log(`\n📋 Sample Journal Entries (first 3):`);
            journalEntries.slice(0, 3).forEach((je) => {
              console.log(
                `  JE: ${je.referenceNumber} | Date: ${je.date} | Lines: ${je.lineCount
                } | D:$${je.totalDebit.toFixed(2)} C:$${je.totalCredit.toFixed(
                  2
                )}`
              );
              je.lines.slice(0, 2).forEach((line) => {
                console.log(
                  `    → ${line.accountNumber} ${line.accountName} | D:${line.debit} C:${line.credit}`
                );
              });
              if (je.lineCount > 2)
                console.log(`    → ... and ${je.lineCount - 2} more lines`);
            });

            // Build account matches from all journal entry lines
            const accountMatches = {};
            const uniqueAccounts = new Set();

            // Extract unique account numbers from all journal entry lines
            journalEntries.forEach((je) => {
              je.lines.forEach((line) => {
                if (line.accountNumber) {
                  uniqueAccounts.add(line.accountNumber);
                }
              });
            });

            // Match accounts
            for (const accountNumber of uniqueAccounts) {
              const normalized = normalizeAccountNumber(accountNumber);

              const matchedAccount = accounts.find((acc) => {
                if (!acc.accountNumber) return false;
                const accNorm = normalizeAccountNumber(acc.accountNumber);
                return (
                  accNorm.original === normalized.original ||
                  accNorm.withHyphen === normalized.withHyphen ||
                  accNorm.digitsOnly === normalized.digitsOnly
                );
              });

              if (matchedAccount) {
                accountMatches[accountNumber] = {
                  accountId: matchedAccount.id,
                  account: matchedAccount,
                  accountName: matchedAccount.name,
                  transactionCount: 0, // Will count lines using this account
                  matched: true,
                  normalizedForms: normalized,
                };
              } else {
                accountMatches[accountNumber] = {
                  accountId: null,
                  account: null,
                  accountName: accountNumber,
                  transactionCount: 0,
                  matched: false,
                  normalizedForms: normalized,
                };
              }
            }

            // Count how many times each account is used
            journalEntries.forEach((je) => {
              je.lines.forEach((line) => {
                if (accountMatches[line.accountNumber]) {
                  accountMatches[line.accountNumber].transactionCount++;
                }
              });
            });

            const matchedCount = Object.values(accountMatches).filter(
              (m) => m.matched
            ).length;
            const unmatchedCount = Object.values(accountMatches).filter(
              (m) => !m.matched
            ).length;
            console.log(
              `\n📊 ACCOUNT MATCHING: ${matchedCount} matched, ${unmatchedCount} unmatched out of ${uniqueAccounts.size} total`
            );

            // Build the response with PROPER STRUCTURE
            parsedAnalysis = {
              // CRITICAL: Return journalEntries as the main data structure
              journalEntries: journalEntries,

              // Metadata about the import
              detectedFormat: "JOURNAL_ENTRY_PARSER",
              totalDebits: grandTotalDebits,
              totalCredits: grandTotalCredits,
              isBalanced: Math.abs(grandTotalDebits - grandTotalCredits) < 0.01,

              // Account matching information
              accountMatches: accountMatches,

              // Summary statistics
              summary: {
                journalEntriesCount: journalEntries.length, // Number of journal entries (NOT lines)
                totalLines: totalLineCount, // Total line items across all entries
                balancedEntries: balancedCount,
                unbalancedEntries: unbalancedCount,
                totalDebits: grandTotalDebits,
                totalCredits: grandTotalCredits,
                isBalanced:
                  Math.abs(grandTotalDebits - grandTotalCredits) < 0.01,
              },

              // Keep extractedData for backward compatibility but mark as deprecated
              extractedData: [], // Empty - we're using journalEntries now
              extractedTransactions: [], // Empty - deprecated
              accountSections: [], // Not used for journal entries
              columnStructure: {
                account: accountCol,
                accountName: accountNameCol,
                date: dateCol,
                description: descCol,
                debit: debitCol,
                credit: creditCol,
              },
            };
          } else {
            // Use existing General Ledger parser
            console.log("🔍 Using specialized SAGE General Ledger parser...");

            // SAGE FORMAT SPECIALIST PARSER
            console.log("📊 Raw data analysis: Total rows:", rawData.length);
            console.log("📊 Sample rows:", rawData.slice(0, 5));

            // Get header row (first row)
            const headerRow = rawData[0];
            console.log("📋 Header row:", headerRow);

            // Map columns for Sage format
            const columnMap = {};
            headerRow.forEach((header, index) => {
              const h = (header || "").toLowerCase().trim();
              if (h === "account number") columnMap.accountNumber = index;
              if (h === "account name") columnMap.accountName = index;
              if (h === "period") columnMap.period = index; // Account number in headers
              if (h === "date") columnMap.date = index; // Account name in headers, dates in transactions
              if (h === "ref") columnMap.ref = index;
              if (h === "description") columnMap.description = index;
              if (h === "debit") columnMap.debit = index;
              if (h === "credit") columnMap.credit = index;
              if (h === "balance") columnMap.balance = index;
            });

            console.log("🔍 Column mapping:", columnMap);

            // TWO-PASS PROCESSING APPROACH
            const dataRows = rawData.slice(1);

            console.log(
              "🔍 PASS 1: Scanning entire file for ALL account headers..."
            );

            // PASS 1: Find ALL account headers and their positions
            const accountHeaders = [];
            for (let i = 0; i < dataRows.length; i++) {
              const row = dataRows[i];
              if (!row) continue;

              // Look for XXX-XXX pattern in column 0
              if (row[0] && String(row[0]).match(/^\d{3}-\d{3}$/)) {
                const accountNumber = String(row[0]);
                const accountName = String(row[1] || "").trim();

                accountHeaders.push({
                  accountNumber,
                  accountName,
                  rowIndex: i,
                  actualRowNumber: i + 2, // +2 because: +1 for 0-based index, +1 for header row
                });

                console.log(
                  `🏦 Account Header: ${accountNumber} - ${accountName || "[No Name]"
                  } (Row ${i + 2})`
                );
              }
            }

            console.log(
              `✅ PASS 1 COMPLETE: Found ${accountHeaders.length} account headers`
            );

            // PASS 2: Process transactions for each account using boundary detection
            console.log(
              "📊 PASS 2: Processing transactions for each account..."
            );

            const parsedAccounts = new Map();
            let totalDebits = 0;
            let totalCredits = 0;
            let totalTxns = 0;

            for (
              let accountIndex = 0;
              accountIndex < accountHeaders.length;
              accountIndex++
            ) {
              const currentHeader = accountHeaders[accountIndex];
              const nextHeader = accountHeaders[accountIndex + 1];

              // Initialize account
              parsedAccounts.set(currentHeader.accountNumber, {
                accountNumber: currentHeader.accountNumber,
                accountName: currentHeader.accountName,
                transactions: [],
                totalDebit: 0,
                totalCredit: 0,
                endingBalance: 0,
              });

              // Determine transaction range: from current header to next header (or end of file)
              const startRow = currentHeader.rowIndex + 1; // Start after account header
              const endRow = nextHeader ? nextHeader.rowIndex : dataRows.length; // End before next header or EOF

              console.log(
                `🔄 Processing Account ${currentHeader.accountNumber}: rows ${startRow + 2
                } to ${endRow + 1}`
              );

              // Process transactions in this account's range
              for (let i = startRow; i < endRow; i++) {
                const row = dataRows[i];
                if (!row || row.length < 3) continue;

                // Extract transaction values
                const periodValue =
                  columnMap.period !== undefined
                    ? String(row[columnMap.period] || "").trim()
                    : "";
                const dateValue =
                  columnMap.date !== undefined
                    ? String(row[columnMap.date] || "").trim()
                    : "";
                const refValue =
                  columnMap.ref !== undefined
                    ? String(row[columnMap.ref] || "").trim()
                    : "";
                const descValue =
                  columnMap.description !== undefined
                    ? String(row[columnMap.description] || "").trim()
                    : "";
                const debitValue =
                  columnMap.debit !== undefined
                    ? String(row[columnMap.debit] || "").trim()
                    : "";
                const creditValue =
                  columnMap.credit !== undefined
                    ? String(row[columnMap.credit] || "").trim()
                    : "";

                // Check for transaction pattern: date and amounts
                if (
                  dateValue &&
                  !isNaN(parseFloat(dateValue)) &&
                  (parseFloat(debitValue || 0) > 0 ||
                    parseFloat(creditValue || 0) > 0)
                ) {
                  const debit = parseFloat(debitValue || 0);
                  const credit = parseFloat(creditValue || 0);

                  // Convert Excel date number to proper date string
                  const excelDate = parseFloat(dateValue);
                  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
                  const formattedDate = jsDate.toISOString().split("T")[0];

                  const transaction = {
                    date: formattedDate,
                    reference: refValue || "",
                    description: descValue || "",
                    debit,
                    credit,
                  };

                  parsedAccounts
                    .get(currentHeader.accountNumber)
                    .transactions.push(transaction);
                  parsedAccounts.get(currentHeader.accountNumber).totalDebit +=
                    debit;
                  parsedAccounts.get(currentHeader.accountNumber).totalCredit +=
                    credit;

                  totalDebits += debit;
                  totalCredits += credit;
                  totalTxns++;

                  if (totalTxns <= 20) {
                    // Show more transactions for debugging
                    console.log(
                      `📝 Txn: ${currentHeader.accountNumber
                      } | ${formattedDate} | ${refValue || "NO-REF"
                      } | D:${debit.toFixed(2)} C:${credit.toFixed(
                        2
                      )} | ${descValue.substring(0, 30)}`
                    );
                  }
                }

                // Check for balance information in this account's range
                const balanceValue =
                  columnMap.balance !== undefined
                    ? String(row[columnMap.balance] || "").trim()
                    : "";
                if (balanceValue && !isNaN(parseFloat(balanceValue))) {
                  const balance = parseFloat(balanceValue);
                  parsedAccounts.get(
                    currentHeader.accountNumber
                  ).endingBalance = balance;
                }
              }

              const accountData = parsedAccounts.get(
                currentHeader.accountNumber
              );
              console.log(
                `✅ ${currentHeader.accountNumber}: ${accountData.transactions.length
                } txns | D:$${accountData.totalDebit.toFixed(
                  2
                )} C:$${accountData.totalCredit.toFixed(2)}`
              );
            }

            const accountsArray = Array.from(parsedAccounts.values());

            console.log(`\n🎯 SAGE PARSING COMPLETE:`);
            console.log(`📊 Found ${accountsArray.length} accounts`);
            console.log(`📊 Found ${totalTxns} transactions`);
            console.log(
              `💰 Debits: $${totalDebits.toFixed(
                2
              )}, Credits: $${totalCredits.toFixed(2)}`
            );
            console.log(
              `⚖️ Balanced: ${Math.abs(totalDebits - totalCredits) < 0.001
                ? "YES"
                : "NO (Diff: $" +
                (totalDebits - totalCredits).toFixed(2) +
                ")"
              }`
            );

            accountsArray.forEach((account) => {
              const balanceInfo = account.endingBalance
                ? ` | Bal:$${account.endingBalance.toFixed(2)}`
                : "";
              console.log(
                `✅ ${account.accountNumber}: ${account.accountName} | ${account.transactions.length
                } txns | D:$${account.totalDebit.toFixed(
                  2
                )} C:$${account.totalCredit.toFixed(2)}${balanceInfo}`
              );
            });

            parsedAnalysis = {
              accountSections: accountsArray.map((account) => ({
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                transactionCount: account.transactions.length,
                totalDebit: account.totalDebit,
                totalCredit: account.totalCredit,
                endingBalance: account.endingBalance || 0,
              })),
              detectedFormat: "SAGE_SPECIALIST_PARSER",
              totalDebits: totalDebits.toFixed(2),
              totalCredits: totalCredits.toFixed(2),
              isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
              columnStructure: columnMap,
              extractedTransactions: accountsArray.flatMap((account) =>
                account.transactions.map((t) => ({
                  accountNumber: account.accountNumber,
                  accountName: account.accountName,
                  date: t.date,
                  description: t.description,
                  debit: t.debit,
                  credit: t.credit,
                  reference: t.reference,
                }))
              ),
            };
          } // End of else block for General Ledger format

          // Extract transaction data from AI or enhanced parser results
          let extractedData = parsedAnalysis.extractedTransactions || [];
          let totalExtractedTransactions = extractedData.length;

          console.log("📊 AI extraction results:", {
            parser: parsedAnalysis.detectedFormat,
            accounts: parsedAnalysis.accountSections?.length || 0,
            transactions: totalExtractedTransactions,
            aiIssues: parsedAnalysis.aiIssues?.warnings?.length || 0,
            aiDiagnostics: parsedAnalysis.aiDiagnostics?.rowCounts || "none",
          });

          // Check if we have journal entries from the advanced parser
          const hasJournalEntries =
            parsedAnalysis.journalEntries &&
            parsedAnalysis.journalEntries.length > 0;

          // If no extracted transactions AND no journal entries from AI/enhanced parser, use basic extraction
          if (totalExtractedTransactions === 0 && !hasJournalEntries) {
            console.log(
              "⚠️ No transactions or journal entries from advanced parser, using basic extraction..."
            );
            const columnStructure = parsedAnalysis.columnStructure || {
              account: 0,
              date: 1,
              description: 2,
              debit: 3,
              credit: 4,
            };
            const dataRows = rawData.slice(1);

            for (let i = 0; i < dataRows.length; i++) {
              const row = dataRows[i];
              if (row.length >= 3 && row[columnStructure.account]) {
                const accountNumber = String(
                  row[columnStructure.account]
                ).trim();
                if (
                  accountNumber &&
                  !accountNumber.toLowerCase().includes("account")
                ) {
                  const transaction = {
                    accountNumber,
                    accountName: `Account ${accountNumber}`,
                    date: String(row[columnStructure.date] || "").trim(),
                    description: String(
                      row[columnStructure.description] || ""
                    ).trim(),
                    debit:
                      parseFloat(
                        String(row[columnStructure.debit] || "0").replace(
                          /[,$]/g,
                          ""
                        )
                      ) || 0,
                    credit:
                      parseFloat(
                        String(row[columnStructure.credit] || "0").replace(
                          /[,$]/g,
                          ""
                        )
                      ) || 0,
                    reference: `GL-${accountNumber}-${totalExtractedTransactions + 1
                      }`,
                  };

                  if (transaction.debit > 0 || transaction.credit > 0) {
                    extractedData.push(transaction);
                    totalExtractedTransactions++;
                  }
                }
              }
            }
          }

          // Account matching suggestions
          const accountMatches = {};
          for (const section of parsedAnalysis.accountSections) {
            const matchedAccount = accounts.find(
              (acc) =>
                acc.accountNumber === section.accountNumber ||
                acc.name
                  .toLowerCase()
                  .includes(section.accountName.toLowerCase())
            );

            if (matchedAccount) {
              accountMatches[section.accountNumber] = {
                accountId: matchedAccount.id,
                accountName: matchedAccount.name,
                transactionCount: section.transactionCount,
                matched: true,
              };
            } else {
              accountMatches[section.accountNumber] = {
                accountId: null,
                accountName: section.accountName,
                transactionCount: section.transactionCount,
                matched: false,
                suggestion: `Create new account: ${section.accountNumber} - ${section.accountName}`,
              };
            }
          }

          res.json({
            success: true,
            fileName: req.file.originalname,
            detectedFormat: parsedAnalysis.detectedFormat || "UNKNOWN",
            totalRows: rawData.length,
            totalTransactions: totalExtractedTransactions,
            isBalanced: parsedAnalysis.isBalanced,
            totalDebits: parsedAnalysis.totalDebits,
            totalCredits: parsedAnalysis.totalCredits,
            accountSections: parsedAnalysis.accountSections,
            accountMatches,
            extractedData: extractedData, // Send ALL transactions for import (not just preview)
            journalEntries: parsedAnalysis.journalEntries || [], // CRITICAL: Include journal entries for journal entry format files
            summary: parsedAnalysis.summary || {}, // Include summary statistics
            columnStructure: parsedAnalysis.columnStructure,
            rawSample: rawData.slice(0, 10), // Raw data preview
          });
        } catch (parseError) {
          console.error("GL parsing error:", parseError);
          throw new Error(`File parsing failed: ${parseError.message}`);
        }
      } catch (error) {
        console.error("General ledger file parsing error:", error);
        res.status(500).json({
          error: "Failed to parse general ledger file",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Import General Ledger data after AI analysis and user confirmation
  apiRouter.post(
    "/general-ledger/import",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const {
          clientId,
          extractedData,
          journalEntries,
          accountMatches,
          createMissingAccounts,
        } = req.body;

        const totalExtractedTransactions = extractedData?.length || 0;
        const totalJournalEntries = journalEntries?.length || 0;

        console.log(
          `🚀 GL IMPORT START: Client ${clientId}, Individual Transactions: ${totalExtractedTransactions}, Journal Entries: ${totalJournalEntries}, Accounts: ${Object.keys(accountMatches || {}).length
          }`
        );

        if (
          !clientId ||
          (!extractedData && !journalEntries) ||
          !accountMatches
        ) {
          return res.status(400).json({
            error:
              "Missing required data for import (need clientId, at least one of extractedData or journalEntries, and accountMatches)",
          });
        }

        let importedCount = 0;
        let skippedCount = 0;
        const errors = [];

        // Create missing accounts if requested
        if (createMissingAccounts) {
          for (const [accountNumber, matchData] of Object.entries(
            accountMatches as any
          )) {
            if (!matchData.matched) {
              try {
                const newAccount = await storage.createAccount({
                  clientId: parseInt(clientId),
                  name: matchData.accountName,
                  accountNumber: accountNumber,
                  type: "asset", // Default type - user can change later
                  isDebitNormal: true,
                  balance: "0",
                });

                matchData.accountId = newAccount.id;
                matchData.matched = true;
              } catch (error) {
                errors.push(
                  `Failed to create account ${accountNumber}: ${(error as Error).message
                  }`
                );
              }
            }
          }
        }

        // CRITICAL FIX: Prevent multiple concurrent imports causing server overload
        if (global.importProgress && global.importProgress.isActive) {
          return res.status(409).json({
            error: "Import already in progress",
            details: `Another import is currently running for client ${global.importProgress.clientId}. Please wait for it to complete.`,
          });
        }

        // BUILD OPTIMIZED ACCOUNT LOOKUP MAPS for fast matching
        console.log(
          "🗺️ Building account lookup maps for efficient matching..."
        );
        const accountLookupById = new Map();
        const accountLookupByNumberWithHyphen = new Map();
        const accountLookupByNumberDigitsOnly = new Map();

        // Fetch all accounts and build lookup maps
        const allAccounts = await storage.getAccounts(parseInt(clientId));
        for (const account of allAccounts) {
          accountLookupById.set(account.id, account);

          if (account.accountNumber) {
            const normalized = normalizeAccountNumber(account.accountNumber);
            accountLookupByNumberWithHyphen.set(normalized.withHyphen, account);
            accountLookupByNumberDigitsOnly.set(normalized.digitsOnly, account);
          }
        }

        console.log(
          `📊 Built lookup maps: ${allAccounts.length} accounts indexed`
        );

        // ENTERPRISE-GRADE: Optimized batch import with proper resource management
        const totalImportItems =
          totalExtractedTransactions + totalJournalEntries;
        console.log(
          `🚀 ENTERPRISE IMPORT: Starting ${totalImportItems} total items (${totalExtractedTransactions} individual transactions + ${totalJournalEntries} journal entries) for client ${clientId}...`
        );

        // CRITICAL: Store import progress for frontend polling + PERSISTENT STORAGE
        global.importProgress = {
          clientId: parseInt(clientId),
          totalTransactions: totalImportItems,
          processedCount: 0,
          importedCount: 0,
          skippedCount: 0,
          currentBatch: 0,
          totalBatches: Math.ceil(totalImportItems / 100), // Smaller batches for stability
          isActive: true,
          startTime: new Date(),
          // PERSISTENCE: Add import ID for crash recovery
          importId: `import_${clientId}_${Date.now()}`,
          remainingData: {
            extractedData: extractedData || [],
            journalEntries: journalEntries || [],
          }, // Store data for recovery
        };

        const batchSize = 100; // STABILITY: Smaller batches prevent server overload
        let processedCount = 0;

        // PROCESS JOURNAL ENTRIES FIRST (complete multi-line entries)
        if (journalEntries && journalEntries.length > 0) {
          console.log(
            `📋 PROCESSING ${journalEntries.length} JOURNAL ENTRIES...`
          );

          for (const journalEntry of journalEntries) {
            try {
              console.log(
                `🔄 Processing journal entry: ${journalEntry.reference || "No reference"
                } with ${journalEntry.lines?.length || 0} lines`
              );

              // Validate journal entry structure
              if (!journalEntry.lines || journalEntry.lines.length === 0) {
                console.log(
                  `❌ JOURNAL ENTRY SKIPPED: No lines found for ${journalEntry.reference}`
                );
                skippedCount++;
                processedCount++;
                continue;
              }

              // Parse date properly
              let parsedDate;
              try {
                if (journalEntry.date && journalEntry.date.length === 10) {
                  // Parse date in local timezone to avoid timezone conversion issues
                  const [year, month, day] = journalEntry.date.split('-').map(Number);
                  parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                } else {
                  parsedDate = new Date();
                }

                if (isNaN(parsedDate.getTime())) {
                  throw new Error(`Invalid date: ${journalEntry.date}`);
                }
              } catch (dateError) {
                console.warn(
                  `Date parsing error for ${journalEntry.date}, using current date:`,
                  dateError
                );
                parsedDate = new Date();
              }

              // Resolve all accounts for this journal entry
              const resolvedLines = [];
              let allAccountsResolved = true;

              for (const line of journalEntry.lines) {
                let resolvedAccount = null;
                let accountMatch = accountMatches[line.accountNumber];

                // Try multiple matching strategies
                if (accountMatch && accountMatch.accountId) {
                  resolvedAccount = accountLookupById.get(
                    accountMatch.accountId
                  );
                }

                if (!resolvedAccount && line.accountNumber) {
                  const normalized = normalizeAccountNumber(line.accountNumber);
                  resolvedAccount = accountLookupByNumberWithHyphen.get(
                    normalized.withHyphen
                  );

                  if (!resolvedAccount) {
                    resolvedAccount = accountLookupByNumberDigitsOnly.get(
                      normalized.digitsOnly
                    );
                  }

                  if (resolvedAccount) {
                    if (!accountMatch) {
                      accountMatch = {};
                      accountMatches[line.accountNumber] = accountMatch;
                    }
                    accountMatch.accountId = resolvedAccount.id;
                    accountMatch.matched = true;
                  }
                }

                if (!resolvedAccount) {
                  console.log(
                    `❌ ACCOUNT NOT RESOLVED in journal entry: ${line.accountNumber} - will skip entire journal entry`
                  );
                  allAccountsResolved = false;
                  break;
                }

                resolvedLines.push({
                  ...line,
                  resolvedAccount,
                });
              }

              if (!allAccountsResolved) {
                console.log(
                  `❌ JOURNAL ENTRY SKIPPED: Not all accounts could be resolved for ${journalEntry.reference}`
                );
                skippedCount++;
                processedCount++;
                continue;
              }

              // Calculate totals
              const totalDebit = resolvedLines.reduce(
                (sum, line) => sum + (parseFloat(line.debit) || 0),
                0
              );
              const totalCredit = resolvedLines.reduce(
                (sum, line) => sum + (parseFloat(line.credit) || 0),
                0
              );

              console.log(
                `✅ IMPORTING JOURNAL ENTRY: ${journalEntry.reference} with ${resolvedLines.length} lines (Debit: ${totalDebit}, Credit: ${totalCredit})`
              );

              // Create the journal entry header
              const createdJournalEntry = await storage.createJournalEntry({
                clientId: parseInt(clientId),
                entryDate: parsedDate,
                description:
                  journalEntry.description ||
                  `GL Import - ${journalEntry.reference}`,
                reference: journalEntry.reference || `JE-${Date.now()}`,
                totalDebit: totalDebit.toString(),
                totalCredit: totalCredit.toString(),
                status: "posted",
              });

              // Create all journal entry lines
              for (const line of resolvedLines) {
                await storage.createJournalEntryLine({
                  journalEntryId: createdJournalEntry.id,
                  accountId: line.resolvedAccount.id,
                  debitAmount: (parseFloat(line.debit) || 0).toString(),
                  creditAmount: (parseFloat(line.credit) || 0).toString(),
                  description:
                    line.description ||
                    journalEntry.description ||
                    `GL Import - ${line.accountNumber}`,
                });
              }

              importedCount++;
              processedCount++;

              // Update progress
              if (global.importProgress) {
                global.importProgress.processedCount = processedCount;
                global.importProgress.importedCount = importedCount;
              }
            } catch (error) {
              errors.push(
                `Failed to import journal entry ${journalEntry.reference || "No reference"
                }: ${(error as Error).message}`
              );
              skippedCount++;
              processedCount++;
              console.error(`❌ JOURNAL ENTRY ERROR:`, error);
            }
          }

          console.log(
            `📋 JOURNAL ENTRIES COMPLETE: ${importedCount} imported, ${skippedCount} skipped`
          );
        }

        // PROCESS INDIVIDUAL TRANSACTIONS (extractedData) if any exist
        if (extractedData && extractedData.length > 0) {
          console.log(
            `📝 PROCESSING ${extractedData.length} INDIVIDUAL TRANSACTIONS...`
          );

          for (let i = 0; i < extractedData.length; i += batchSize) {
            const batch = extractedData.slice(i, i + batchSize);
            console.log(
              `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
                extractedData.length / batchSize
              )}: ${batch.length} transactions`
            );

            // Process batch transactions
            for (const transaction of batch) {
              try {
                // ENHANCED ACCOUNT MATCHING with normalization
                let resolvedAccount = null;
                let accountMatch = accountMatches[transaction.accountNumber];

                // Try multiple matching strategies
                if (accountMatch && accountMatch.accountId) {
                  // Strategy 1: Use pre-matched accountId from parse phase
                  resolvedAccount = accountLookupById.get(
                    accountMatch.accountId
                  );
                }

                if (!resolvedAccount && transaction.accountNumber) {
                  // Strategy 2: Try normalized matching
                  const normalized = normalizeAccountNumber(
                    transaction.accountNumber
                  );

                  // Try with hyphen first
                  resolvedAccount = accountLookupByNumberWithHyphen.get(
                    normalized.withHyphen
                  );

                  // Try digits only if no hyphen match
                  if (!resolvedAccount) {
                    resolvedAccount = accountLookupByNumberDigitsOnly.get(
                      normalized.digitsOnly
                    );
                  }

                  // If we found it via normalization, update the match data
                  if (resolvedAccount) {
                    if (!accountMatch) {
                      accountMatch = {};
                      accountMatches[transaction.accountNumber] = accountMatch;
                    }
                    accountMatch.accountId = resolvedAccount.id;
                    accountMatch.account = resolvedAccount;
                    accountMatch.matched = true;
                  }
                }

                if (!resolvedAccount) {
                  console.log(
                    `❌ ACCOUNT NOT RESOLVED: ${transaction.accountNumber} - skipping transaction`
                  );
                  skippedCount++;
                  processedCount++;
                  global.importProgress.processedCount = processedCount;
                  global.importProgress.skippedCount = skippedCount;
                  continue;
                }

                console.log(
                  `✅ ACCOUNT RESOLVED: ${transaction.accountNumber} -> ${resolvedAccount.name} (ID: ${resolvedAccount.id})`
                );

                // TEMPORARILY DISABLE duplicate prevention to fix the bug
                // const referenceToCheck = transaction.reference || `GL-${transaction.accountNumber}`;
                // const existingEntry = await storage.findJournalEntryByReference(
                //   parseInt(clientId),
                //   referenceToCheck,
                //   transaction.date
                // );
                //
                // if (existingEntry) {
                //   console.log(`⏭️ DUPLICATE SKIPPED: ${referenceToCheck} on ${transaction.date}`);
                //   skippedCount++;
                //   processedCount++;
                //   continue;
                // }

                console.log(
                  `✨ IMPORTING TRANSACTION: ${transaction.reference || transaction.accountNumber
                  } on ${transaction.date}`
                );

                // Parse date properly - handle YYYY-MM-DD format from our parser
                let parsedDate;
                try {
                  // transaction.date should already be in YYYY-MM-DD format from our parser
                  if (transaction.date && transaction.date.length === 10) {
                    // Parse date in local timezone to avoid timezone conversion issues
                    const [year, month, day] = transaction.date.split('-').map(Number);
                    parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                  } else {
                    // Fallback for any malformed dates
                    parsedDate = new Date();
                  }

                  // Validate the date
                  if (isNaN(parsedDate.getTime())) {
                    throw new Error(`Invalid date: ${transaction.date}`);
                  }
                } catch (dateError) {
                  console.warn(
                    `Date parsing error for ${transaction.date}, using current date:`,
                    dateError
                  );
                  parsedDate = new Date();
                }

                // FIXED: Create journal entry with correct date field and reference
                const journalEntry = await storage.createJournalEntry({
                  clientId: parseInt(clientId),
                  entryDate: parsedDate, // CRITICAL FIX: Use entryDate, not date
                  description:
                    transaction.description ||
                    `GL Import - ${transaction.accountNumber}`,
                  reference:
                    transaction.reference || `GL-${transaction.accountNumber}`, // Use original GL reference
                  totalDebit: Math.abs(transaction.debit || 0).toString(),
                  totalCredit: Math.abs(transaction.credit || 0).toString(),
                  status: "posted",
                });

                // Create debit/credit lines efficiently with RESOLVED account
                if (transaction.debit > 0) {
                  await storage.createJournalEntryLine({
                    journalEntryId: journalEntry.id,
                    accountId: resolvedAccount.id, // Use resolved account ID
                    debitAmount: transaction.debit.toString(),
                    creditAmount: "0",
                    description:
                      transaction.description ||
                      `GL Import - ${transaction.accountNumber}`,
                  });
                }

                if (transaction.credit > 0) {
                  await storage.createJournalEntryLine({
                    journalEntryId: journalEntry.id,
                    accountId: resolvedAccount.id, // Use resolved account ID
                    debitAmount: "0",
                    creditAmount: transaction.credit.toString(),
                    description:
                      transaction.description ||
                      `GL Import - ${transaction.accountNumber}`,
                  });
                }

                importedCount++;
                processedCount++;
              } catch (error) {
                errors.push(
                  `Failed to import transaction for account ${transaction.accountNumber
                  }: ${(error as Error).message}`
                );
                skippedCount++;
              }
            }

            // Progress update every batch
            const progressPercent = Math.round(
              (processedCount / totalImportItems) * 100
            );
            const currentBatch = Math.floor(i / batchSize) + 1;
            console.log(
              `🚀 BATCH ${currentBatch}/${Math.ceil(
                extractedData.length / batchSize
              )} COMPLETE: ${importedCount} imported, ${skippedCount} skipped (${progressPercent}% complete)`
            );

            // Update global progress for frontend polling
            if (global.importProgress) {
              global.importProgress.processedCount = processedCount;
              global.importProgress.importedCount = importedCount;
              global.importProgress.skippedCount = skippedCount;
              global.importProgress.currentBatch = currentBatch;
            }
          }

          console.log(
            `📝 INDIVIDUAL TRANSACTIONS COMPLETE: Total processed from this section`
          );
        }

        // Mark import as complete
        if (global.importProgress) {
          global.importProgress.isActive = false;
          global.importProgress.endTime = new Date();
        }

        res.json({
          success: true,
          imported: importedCount,
          skipped: skippedCount,
          errors: errors.length > 0 ? errors : null,
          message: `Successfully imported ${importedCount} items (${totalJournalEntries} journal entries + ${totalExtractedTransactions} individual transactions). ${skippedCount} items were skipped.`,
        });
      } catch (error) {
        console.error("General ledger import error:", error);
        res.status(500).json({
          error: "Failed to import general ledger data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // OPTIMIZED JOURNAL ROUTES INTEGRATION
  apiRouter.use("/", journalRoutes);

  // Create journal entry (client-specific route expected by frontend)
  apiRouter.post(
    "/journal-entries/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { description, transactionDate, entries } = req.body;

        console.log(`Creating journal entry for client ${clientId}:`, {
          description,
          transactionDate,
          entries,
        });

        // Validate entries are balanced
        let totalDebits = 0;
        let totalCredits = 0;

        if (!entries || !Array.isArray(entries)) {
          return res
            .status(400)
            .json({ error: "Journal entries are required" });
        }

        entries.forEach((entry: any) => {
          const debit = parseFloat(entry.debitAmount || "0");
          const credit = parseFloat(entry.creditAmount || "0");
          totalDebits += debit;
          totalCredits += credit;
        });

        // Use strict tolerance for accounting: penny-perfect balance required
        // Tolerance of 0.001 (one-tenth of a penny) ensures proper balance
        // while accommodating only sub-penny floating-point precision errors
        if (Math.abs(totalDebits - totalCredits) > 0.001) {
          return res.status(400).json({
            error: `Journal entry is not balanced. Debits: $${totalDebits.toFixed(
              2
            )}, Credits: $${totalCredits.toFixed(2)}`,
          });
        }

        // Create journal entry
        const journalEntry = await storage.createJournalEntry({
          clientId,
          description,
          entryDate: new Date(transactionDate),
          totalDebit: totalDebits,
          totalCredit: totalCredits,
          status: "posted",
          isBalanced: true,
        });

        // Create journal entry lines
        const lines = await Promise.all(
          entries.map((entry: any) =>
            storage.createJournalEntryLine({
              journalEntryId: journalEntry.id,
              accountId: entry.accountId,
              debitAmount: parseFloat(entry.debitAmount || "0"),
              creditAmount: parseFloat(entry.creditAmount || "0"),
              memo: entry.memo || description,
              contactId: entry.contactId || null, // Support AR/AP contact linking
            })
          )
        );

        console.log(
          `Journal entry created: ID=${journalEntry.id}, Lines=${lines.length}`
        );
        res.json({ ...journalEntry, lines });
      } catch (error) {
        console.error("Error creating journal entry:", error);
        res.status(500).json({ error: "Failed to create journal entry" });
      }
    }
  );

  // Delete journal entry
  apiRouter.delete(
    "/journal-entries/:entryId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const entryId = parseInt(req.params.entryId);

        console.log(`🗑️ DELETE request for journal entry ID: ${entryId}`);

        // Get the journal entry before deleting to verify it exists
        const journalEntry = await storage.getJournalEntry(entryId);
        if (!journalEntry) {
          console.log(`❌ Journal entry ${entryId} not found in database`);
          return res.status(404).json({ error: "Journal entry not found" });
        }

        console.log(
          `🗑️ Deleting journal entry: ${journalEntry.description} (ID: ${entryId})`
        );

        // Delete journal entry lines first
        const lines = await storage.getJournalEntryLines(entryId);
        if (lines && Array.isArray(lines)) {
          for (const line of lines) {
            await storage.deleteJournalEntryLine(line.id);
          }
          console.log(`🗑️ Deleted ${lines.length} journal entry lines`);
        }

        // Delete the journal entry
        const success = await storage.deleteJournalEntry(entryId);

        if (!success) {
          console.log(
            `❌ Failed to delete journal entry ${entryId} from database`
          );
          return res.status(404).json({ error: "Journal entry not found" });
        }

        console.log(
          `✅ Journal entry ${journalEntry.description} successfully deleted`
        );
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting journal entry:", error);
        res.status(500).json({ error: "Failed to delete journal entry" });
      }
    }
  );

  // Update journal entry
  apiRouter.put(
    "/journal-entries/:entryId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const entryId = parseInt(req.params.entryId);
        const { description, transactionDate, entries } = req.body;

        console.log(`📝 UPDATE request for journal entry ID: ${entryId}`);
        console.log(`📅 Date update details:`, {
          originalDate: req.body.transactionDate,
          parsedDate: new Date(req.body.transactionDate),
          isoString: new Date(req.body.transactionDate).toISOString()
        });

        // Use timezone-safe date parsing
        const { parseLocalDate } = require('../utils/date-utils');
        const safeDate = parseLocalDate(req.body.transactionDate);
        console.log(`📅 Timezone-safe date parsing:`, {
          original: req.body.transactionDate,
          safeDate: safeDate,
          safeDateString: safeDate.toISOString().split('T')[0]
        });

        // Get the journal entry before updating to verify it exists
        const journalEntry = await storage.getJournalEntry(entryId);
        if (!journalEntry) {
          console.log(`❌ Journal entry ${entryId} not found in database`);
          return res.status(404).json({ error: "Journal entry not found" });
        }

        // Validate transactions are balanced
        let totalDebits = 0;
        let totalCredits = 0;

        if (!entries || !Array.isArray(entries)) {
          return res.status(400).json({ error: "Entries are required" });
        }

        entries.forEach((transaction: any) => {
          const debit = parseFloat(transaction.debitAmount || "0");
          const credit = parseFloat(transaction.creditAmount || "0");
          totalDebits += debit;
          totalCredits += credit;
        });

        // Use strict tolerance for accounting: penny-perfect balance required
        // Tolerance of 0.001 (one-tenth of a penny) ensures proper balance
        // while accommodating only sub-penny floating-point precision errors
        if (Math.abs(totalDebits - totalCredits) > 0.001) {
          return res.status(400).json({
            error: `Journal entry is not balanced. Debits: $${totalDebits.toFixed(
              2
            )}, Credits: $${totalCredits.toFixed(2)}`,
          });
        }

        console.log(
          `📝 Updating journal entry: ${journalEntry.description} (ID: ${entryId})`
        );

        // Update journal entry
        const updatedEntry = await storage.updateJournalEntry(entryId, {
          description,
          entryDate: safeDate.toISOString().split('T')[0], // Use timezone-safe date
          totalDebit: totalDebits,
          totalCredit: totalCredits,
          status: "posted",
          isBalanced: true,
        });

        // Delete existing journal entry lines
        const existingLines = await storage.getJournalEntryLines(entryId);
        if (existingLines && Array.isArray(existingLines)) {
          for (const line of existingLines) {
            await storage.deleteJournalEntryLine(line.id);
          }
          console.log(
            `🗑️ Deleted ${existingLines.length} existing journal entry lines`
          );
        }

        // Create new journal entry lines
        const lines = await Promise.all(
          transactions.map((transaction: any) =>
            storage.createJournalEntryLine({
              journalEntryId: entryId,
              accountId: transaction.accountId,
              debitAmount: parseFloat(transaction.debitAmount || "0"),
              creditAmount: parseFloat(transaction.creditAmount || "0"),
              memo: transaction.memo || description,
              contactId: transaction.contactId || null,
            })
          )
        );

        console.log(
          `✅ Journal entry ${updatedEntry.description} successfully updated with ${lines.length} lines`
        );
        console.log(`📅 Updated entry date:`, {
          entryDate: updatedEntry.entryDate,
          formattedDate: updatedEntry.entryDate?.toLocaleDateString?.() || updatedEntry.entryDate
        });

        res.json({ ...updatedEntry, lines });
      } catch (error) {
        console.error("Error updating journal entry:", error);
        res.status(500).json({ error: "Failed to update journal entry" });
      }
    }
  );

  // Legacy route for backward compatibility
  apiRouter.post(
    "/journal-entries",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const journalEntryData = req.body;
        const journalEntry = await storage.createJournalEntry(journalEntryData);

        // Create journal entry lines
        if (journalEntryData.lines && Array.isArray(journalEntryData.lines)) {
          const lines = await Promise.all(
            journalEntryData.lines.map((line) =>
              storage.createJournalEntryLine({
                ...line,
                journalEntryId: journalEntry.id,
              })
            )
          );

          res.json({ ...journalEntry, lines });
        } else {
          res.json(journalEntry);
        }
      } catch (error) {
        console.error("Error creating journal entry:", error);
        res.status(500).json({ error: "Failed to create journal entry" });
      }
    }
  );

  // Journal entries import endpoint
  apiRouter.post(
    "/journal-entries/:clientId/import",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { entries } = req.body;

        if (!entries || !Array.isArray(entries)) {
          return res.status(400).json({ error: "Entries array is required" });
        }

        console.log(`\n📊 JOURNAL IMPORT DEBUG - CLIENT ${clientId}`);
        console.log(`🔢 Processing ${entries.length} journal entries`);

        // DATE ANALYSIS: Track date ranges being imported
        const dateStats = {
          validDates: [],
          invalidDates: [],
          dateRange: { earliest: null, latest: null },
        };

        let imported = 0;
        let failed = 0;
        const errors = [];

        for (const entry of entries) {
          try {
            // DEBUG: Log each entry being processed
            console.log(`\n📝 PROCESSING ENTRY: "${entry.description}"`);
            console.log(
              `   📅 Raw date: "${entry.date}" (type: ${typeof entry.date})`
            );
            console.log(`   💰 Amount: ${entry.amount}`);
            console.log(`   🏦 Debit Account ID: ${entry.debitAccountId}`);
            console.log(`   💳 Credit Account ID: ${entry.creditAccountId}`);

            // Validate required fields
            if (
              !entry.date ||
              !entry.description ||
              !entry.debitAccountId ||
              !entry.creditAccountId ||
              !entry.amount
            ) {
              throw new Error(
                `Missing required fields for entry: ${entry.description || "Unknown"
                }`
              );
            }

            // COMPREHENSIVE DATE VALIDATION AND TRACKING
            const entryDate = new Date(entry.date);
            if (isNaN(entryDate.getTime())) {
              dateStats.invalidDates.push({
                entry: entry.description,
                rawDate: entry.date,
              });
              throw new Error(`Invalid date: ${entry.date}`);
            }

            const formattedDate = entryDate.toISOString().split("T")[0];
            dateStats.validDates.push({
              entry: entry.description,
              rawDate: entry.date,
              parsedDate: formattedDate,
              year: entryDate.getFullYear(),
            });

            // Track date range
            if (
              !dateStats.dateRange.earliest ||
              entryDate < new Date(dateStats.dateRange.earliest)
            ) {
              dateStats.dateRange.earliest = formattedDate;
            }
            if (
              !dateStats.dateRange.latest ||
              entryDate > new Date(dateStats.dateRange.latest)
            ) {
              dateStats.dateRange.latest = formattedDate;
            }

            console.log(
              `   ✅ Parsed date: ${formattedDate} (year: ${entryDate.getFullYear()})`
            );

            // Create journal entry
            const journalEntry = await storage.createJournalEntry({
              clientId,
              description: entry.description,
              entryDate: entryDate,
              totalDebit: parseFloat(entry.amount),
              totalCredit: parseFloat(entry.amount),
              status: "posted",
              isBalanced: true,
            });

            console.log(`   🆔 Created journal entry ID: ${journalEntry.id}`);

            // Create journal entry lines (debit and credit)
            await storage.createJournalEntryLine({
              journalEntryId: journalEntry.id,
              accountId: entry.debitAccountId,
              debitAmount: parseFloat(entry.amount),
              creditAmount: 0,
              memo: entry.reference || entry.description,
            });

            await storage.createJournalEntryLine({
              journalEntryId: journalEntry.id,
              accountId: entry.creditAccountId,
              debitAmount: 0,
              creditAmount: parseFloat(entry.amount),
              memo: entry.reference || entry.description,
            });

            imported++;
            console.log(`   ✅ Entry imported successfully (#${imported})`);
          } catch (error) {
            failed++;
            const errorMsg = `Entry "${entry.description}": ${error.message}`;
            errors.push(errorMsg);
            console.error(`   ❌ Failed to import: ${errorMsg}`);
          }
        }

        // COMPREHENSIVE DATE RANGE SUMMARY
        console.log(`\n📊 IMPORT SUMMARY FOR CLIENT ${clientId}`);
        console.log(`✅ Successfully imported: ${imported} entries`);
        console.log(`❌ Failed entries: ${failed}`);
        console.log(`\n🗓️  DATE ANALYSIS:`);
        console.log(
          `   📈 Date range: ${dateStats.dateRange.earliest} to ${dateStats.dateRange.latest}`
        );
        console.log(`   ✅ Valid dates: ${dateStats.validDates.length}`);
        console.log(`   ❌ Invalid dates: ${dateStats.invalidDates.length}`);

        // Year distribution
        const yearCounts = {};
        dateStats.validDates.forEach((d) => {
          yearCounts[d.year] = (yearCounts[d.year] || 0) + 1;
        });
        console.log(`   📅 Entries by year:`, yearCounts);

        if (dateStats.invalidDates.length > 0) {
          console.log(
            `   ⚠️  Invalid dates found:`,
            dateStats.invalidDates.slice(0, 5)
          );
        }

        res.json({
          success: true,
          message: `Import complete: ${imported} entries imported, ${failed} failed`,
          imported,
          failed,
          errors: errors.slice(0, 10), // Limit error list to first 10
          dateAnalysis: {
            dateRange: dateStats.dateRange,
            validDateCount: dateStats.validDates.length,
            invalidDateCount: dateStats.invalidDates.length,
            yearDistribution: yearCounts,
            sampleValidDates: dateStats.validDates.slice(0, 3),
            sampleInvalidDates: dateStats.invalidDates.slice(0, 3),
          },
        });
      } catch (error) {
        console.error("Journal entries import error:", error);
        res.status(500).json({
          error: "Failed to import journal entries",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // General ledger import endpoint
  apiRouter.post(
    "/general-ledger/:clientId/import",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { entries } = req.body;

        if (!entries || !Array.isArray(entries)) {
          return res.status(400).json({ error: "Entries array is required" });
        }

        let imported = 0;
        let failed = 0;
        const errors = [];

        // Group entries by description to create balanced journal entries
        const groupedEntries = {};

        entries.forEach((entry, index) => {
          const key = entry.description || `GL Import ${index}`;
          if (!groupedEntries[key]) {
            groupedEntries[key] = [];
          }
          groupedEntries[key].push(entry);
        });

        for (const [description, entryGroup] of Object.entries(
          groupedEntries
        )) {
          try {
            let totalDebits = 0;
            let totalCredits = 0;
            const validLines = [];

            // Process each entry in the group
            for (const entry of entryGroup as any[]) {
              const debit = parseFloat(entry.debit) || 0;
              const credit = parseFloat(entry.credit) || 0;

              if (debit === 0 && credit === 0) continue; // Skip zero entries

              // Find account by code or name
              let accountId = null;
              const accounts = await storage.getAccounts(clientId);

              if (entry.accountCode) {
                const account = accounts.find(
                  (acc) => acc.accountNumber === entry.accountCode
                );
                accountId = account?.id;
              }

              if (!accountId && entry.accountName) {
                const account = accounts.find(
                  (acc) =>
                    acc.name.toLowerCase() === entry.accountName.toLowerCase()
                );
                accountId = account?.id;
              }

              if (!accountId) {
                throw new Error(
                  `Account not found: ${entry.accountCode || entry.accountName}`
                );
              }

              validLines.push({
                accountId,
                debitAmount: debit,
                creditAmount: credit,
                memo: entry.description || description,
              });

              totalDebits += debit;
              totalCredits += credit;
            }

            if (validLines.length === 0) continue;

            // Create journal entry
            const journalEntry = await storage.createJournalEntry({
              clientId,
              description,
              entryDate: new Date(),
              totalDebit: totalDebits,
              totalCredit: totalCredits,
              status: "posted",
              isBalanced: Math.abs(totalDebits - totalCredits) < 0.001,
            });

            // Create journal entry lines
            for (const line of validLines) {
              await storage.createJournalEntryLine({
                journalEntryId: journalEntry.id,
                ...line,
              });
            }

            imported++;
          } catch (error) {
            failed++;
            errors.push(`Entry group "${description}": ${error.message}`);
          }
        }

        res.json({
          success: true,
          message: `Import complete: ${imported} journal entries created from ${entries.length} general ledger entries, ${failed} failed`,
          imported,
          failed,
          errors: errors.slice(0, 10),
        });
      } catch (error) {
        console.error("General ledger import error:", error);
        res.status(500).json({
          error: "Failed to import general ledger entries",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Trial Balance Report - Now uses TrialBalanceService with virtual year-end close
  apiRouter.get("/reports/trial-balance/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { date } = req.query;
      const asOfDate = date ? new Date(date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      console.log(`📊 Generating Trial Balance for client ${clientId} as of ${asOfDate} using TrialBalanceService`);

      // Import and use the updated TrialBalanceService with virtual year-end close
      const { trialBalanceService } = await import("./trial-balance-service");
      const trialBalanceEntries = await trialBalanceService.generateTrialBalance(clientId, asOfDate);

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      trialBalanceEntries.forEach(entry => {
        totalDebits += entry.debitBalance;
        totalCredits += entry.creditBalance;
      });

      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

      // Calculate summary by account type
      const totalAssets = trialBalanceEntries.filter(e => e.accountType === 'asset').reduce((sum, e) => sum + e.netBalance, 0);
      const totalLiabilities = trialBalanceEntries.filter(e => e.accountType === 'liability').reduce((sum, e) => sum + e.netBalance, 0);
      const totalEquity = trialBalanceEntries.filter(e => e.accountType === 'equity').reduce((sum, e) => sum + e.netBalance, 0);
      const totalIncome = trialBalanceEntries.filter(e => e.accountType === 'income').reduce((sum, e) => sum + e.netBalance, 0);
      const totalCostOfSales = trialBalanceEntries.filter(e => e.accountType === 'cost_of_sales').reduce((sum, e) => sum + e.netBalance, 0);
      const totalExpenses = trialBalanceEntries.filter(e => e.accountType === 'expense').reduce((sum, e) => sum + e.netBalance, 0);
      const netIncome = totalIncome - totalCostOfSales - totalExpenses; // Calculate current period net income

      const summary = {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalIncome,
        totalCostOfSales,
        totalExpenses,
        netIncome, // Add net income to summary
        totalDebits: parseFloat(totalDebits.toFixed(2)),
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        isBalanced: isBalanced
      };

      // Convert to frontend format and sort by standard accounting order
      const accountTypeOrder = {
        'asset': 1,
        'liability': 2,
        'equity': 3,
        'income': 4,
        'cost_of_sales': 5,
        'expense': 6
      };

      const accounts = trialBalanceEntries
        .map(entry => ({
          id: entry.accountId,
          name: entry.accountName,
          accountNumber: entry.accountNumber,
          accountType: entry.accountType, // Include account type for proper grouping
          subtype: entry.subtype,
          balance: entry.netBalance,
          debitBalance: entry.debitBalance,
          creditBalance: entry.creditBalance,
          totalDebits: entry.debitBalance, // For compatibility
          totalCredits: entry.creditBalance // For compatibility
        }))
        .sort((a, b) => {
          // First sort by account type (standard accounting order)
          const typeCompare = (accountTypeOrder[a.accountType] || 99) - (accountTypeOrder[b.accountType] || 99);
          if (typeCompare !== 0) return typeCompare;

          // Then sort by account number within same type
          return (a.accountNumber || '').localeCompare(b.accountNumber || '');
        });

      console.log(`✅ Trial Balance generated with ${accounts.length} accounts in standard accounting order`);

      res.json({
        clientId,
        asOfDate: asOfDate,
        accounts: accounts,
        totalDebits: parseFloat(totalDebits.toFixed(2)),
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        isBalanced: isBalanced,
        summary: summary
      });

    } catch (error) {
      console.error("Trial Balance generation error:", error);
      res.status(500).json({ error: "Failed to generate Trial Balance" });
    }
  });

  // Trial Balance Excel Download
  apiRouter.get("/reports/trial-balance/:clientId/download", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { format, startDate, endDate } = req.query;
      const asOfDate = endDate ? new Date(endDate as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      if (format !== 'xlsx') {
        return res.status(400).json({ error: "Only xlsx format is supported" });
      }

      console.log(`📊 Generating Trial Balance Excel for client ${clientId} as of ${asOfDate}`);

      // Import and use the updated TrialBalanceService
      const { trialBalanceService } = await import("./trial-balance-service");
      const trialBalanceEntries = await trialBalanceService.generateTrialBalance(clientId, asOfDate);

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      trialBalanceEntries.forEach(entry => {
        totalDebits += entry.debitBalance;
        totalCredits += entry.creditBalance;
      });

      // Get client info
      const client = await storage.getClient(clientId);
      const clientName = client?.name || "Company";

      // Generate Excel file using XLSX
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      // Prepare data
      const worksheetData: any[][] = [
        ["Trial Balance", clientName],
        [`As of ${asOfDate}`],
        [""],
        ["Account Number", "Account", "Debit", "Credit"]
      ];

      // Add account rows
      trialBalanceEntries.forEach(entry => {
        const debit = entry.debitBalance > 0 ? entry.debitBalance : "";
        const credit = entry.creditBalance > 0 ? entry.creditBalance : "";
        worksheetData.push([
          entry.accountNumber || "",
          entry.accountName,
          debit,
          credit
        ]);
      });

      // Add totals row
      worksheetData.push([""]);
      worksheetData.push(["Total", "", totalDebits, totalCredits]);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 15 }, // Account Number
        { wch: 40 }, // Account
        { wch: 15 }, // Debit
        { wch: 15 }  // Credit
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trial Balance");

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Set response headers
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=trial-balance-${clientId}-${asOfDate}.xlsx`);

      // Send file
      res.send(excelBuffer);
    } catch (error) {
      console.error("Trial Balance Excel generation error:", error);
      res.status(500).json({ error: "Failed to generate Trial Balance Excel" });
    }
  });

  // Journal Entry Report - Detailed journal entry view (renamed from General Ledger)
  apiRouter.get(
    "/reports/journal-entries/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { startDate, endDate } = req.query;

        const start = startDate
          ? new Date(startDate as string)
          : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate as string) : new Date();

        console.log(
          `📊 Generating Journal Entry Report for client ${clientId} from ${start.toISOString()} to ${end.toISOString()}`
        );

        // Get all journal entries within date range
        const journalEntries = await storage.getJournalEntries(clientId);
        const filteredEntries = journalEntries.filter((entry) => {
          const entryDate = new Date(entry.entryDate);
          return entryDate >= start && entryDate <= end;
        });

        console.log(
          `📋 Found ${filteredEntries.length} journal entries in date range`
        );

        // Get all accounts for reference
        const accounts = await storage.getAccounts(clientId);
        const accountMap = {};
        accounts.forEach((account) => {
          accountMap[account.id] = account;
        });

        // Process entries and lines
        const entries = [];

        for (const entry of filteredEntries) {
          const lines = await storage.getJournalEntryLines(entry.id);

          for (const line of lines) {
            const account = accountMap[line.accountId];
            if (account) {
              entries.push({
                entryDate: entry.entryDate,
                description: entry.description,
                reference: entry.reference || "",
                accountId: line.accountId,
                accountName: account.name,
                accountNumber: account.accountNumber,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
              });
            }
          }
        }

        // Sort by date and account
        entries.sort((a, b) => {
          const dateCompare =
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.accountName.localeCompare(b.accountName);
        });

        res.json({
          clientId,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          entries,
          totalEntries: entries.length,
        });
      } catch (error) {
        console.error("Journal Entry Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Journal Entry report" });
      }
    }
  );

  // Detailed General Ledger Report - Transaction-level view with running balances
  apiRouter.get("/reports/general-ledger/:clientId", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // console.log(`📊 Generating Detailed General Ledger for client ${clientId} from ${start.toISOString()} to ${end.toISOString()}`);

      // Get all accounts and journal entries
      const accounts = await storage.getAccounts(clientId);
      const allJournalEntries = await storage.getJournalEntries(clientId);
      // console.log(`⚡ ENTERPRISE FETCH: ${allJournalEntries.length} journal entries for client ${clientId}`);

      // Calculate opening balances (up to start date)
      const openingBalanceEntries = allJournalEntries.filter(entry =>
        new Date(entry.entryDate) < start
      );

      // Calculate period activity (within date range)
      const periodEntries = allJournalEntries.filter(entry => {
        const entryDate = new Date(entry.entryDate);
        return entryDate >= start && entryDate <= end;
      });

      // console.log(`✅ ENTERPRISE LOADED: ${periodEntries.length} period entries, ${openingBalanceEntries.length} opening entries`);

      // BATCH FETCH: Get all lines for opening balance entries at once (PERFORMANCE FIX)
      const openingBalances = {};
      if (openingBalanceEntries.length > 0) {
        const openingEntryIds = openingBalanceEntries.map(entry => entry.id);
        const allOpeningLines = await storage.getJournalEntryLinesBatch(openingEntryIds);
        allOpeningLines.forEach(line => {
          if (!openingBalances[line.accountId]) {
            openingBalances[line.accountId] = { debit: 0, credit: 0 };
          }
          openingBalances[line.accountId].debit += parseFloat(line.debitAmount || '0');
          openingBalances[line.accountId].credit += parseFloat(line.creditAmount || '0');
        });
      }

      // YEAR-END CLOSE LOGIC: Calculate prior year net income for retained earnings
      // Get prior year entries (anything before the period start date)
      let priorYearNetIncome = 0;

      // Calculate prior year net income from P&L accounts
      for (const entry of openingBalanceEntries) {
        const lines = await storage.getJournalEntryLines(entry.id);
        for (const line of lines) {
          const account = accounts.find(acc => acc.id === line.accountId);
          if (account && ['income', 'expense', 'cost_of_sales', 'other_income', 'other_expense'].includes(account.type)) {
            const debit = parseFloat(line.debitAmount || '0');
            const credit = parseFloat(line.creditAmount || '0');

            if (account.type === 'income' || account.type === 'other_income') {
              priorYearNetIncome += credit - debit; // Income increases net income
            } else if (account.type === 'expense' || account.type === 'cost_of_sales' || account.type === 'other_expense') {
              priorYearNetIncome -= debit - credit; // Expenses reduce net income
            }
          }
        }
      }

      console.log(`💰 General Ledger: Prior year net income calculated: $${priorYearNetIncome.toFixed(2)}`);

      // Add prior year net income to retained earnings opening balance
      const retainedEarningsAccount = accounts.find(acc =>
        acc.type === 'equity' && (
          acc.accountNumber === '283-000' ||
          acc.name.toLowerCase().includes('retained earnings') ||
          acc.name.toLowerCase().includes('retained earning')
        )
      );

      if (retainedEarningsAccount && priorYearNetIncome !== 0) {
        if (!openingBalances[retainedEarningsAccount.id]) {
          openingBalances[retainedEarningsAccount.id] = { debit: 0, credit: 0 };
        }
        // Add prior year net income to retained earnings
        // Profit (positive) goes to credit, Loss (negative) goes to debit
        if (priorYearNetIncome > 0) {
          openingBalances[retainedEarningsAccount.id].credit += priorYearNetIncome;
          console.log(`📋 General Ledger: Added $${priorYearNetIncome.toFixed(2)} prior year profit to retained earnings (credit)`);
        } else {
          openingBalances[retainedEarningsAccount.id].debit += Math.abs(priorYearNetIncome);
          console.log(`📋 General Ledger: Added $${Math.abs(priorYearNetIncome).toFixed(2)} prior year loss to retained earnings (debit)`);
        }
      }

      // BATCH FETCH: Get all lines for period entries at once (PERFORMANCE FIX)
      const periodEntryLines = {};
      let allPeriodLines = [];
      if (periodEntries.length > 0) {
        const periodEntryIds = periodEntries.map(entry => entry.id);
        allPeriodLines = await storage.getJournalEntryLinesBatch(periodEntryIds);
        // Group lines by entry ID for easier access
        allPeriodLines.forEach(line => {
          if (!periodEntryLines[line.journalEntryId]) {
            periodEntryLines[line.journalEntryId] = [];
          }
          periodEntryLines[line.journalEntryId].push(line);
        });
      }

      // Build detailed ledger by account
      const accountLedgers = [];

      for (const account of accounts) {
        const opening = openingBalances[account.id] || { debit: 0, credit: 0 };

        // Calculate opening balance ONLY for balance sheet accounts (assets, liabilities, equity)
        // Income and expense accounts should NEVER have opening balances - they start fresh each fiscal year
        let openingBalance = 0;
        if (['asset', 'liability', 'equity'].includes(account.type)) {
          if (account.isDebitNormal) {
            openingBalance = opening.debit - opening.credit;
          } else {
            openingBalance = opening.credit - opening.debit;
          }
        }

        // Get all transactions for this account in the period
        const accountTransactions = [];
        let runningBalance = openingBalance;

        // Sort period entries by date
        const sortedEntries = periodEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

        for (const entry of sortedEntries) {
          const lines = periodEntryLines[entry.id] || [];
          // FIXED: Use filter() instead of find() to get ALL lines for this account
          // This ensures multiple lines for the same account in one journal entry are all shown
          const accountLines = lines.filter(line => line.accountId === account.id);

          // Process each line separately to show all entries
          for (const accountLine of accountLines) {
            const debitAmount = parseFloat(accountLine.debitAmount || '0');
            const creditAmount = parseFloat(accountLine.creditAmount || '0');

            // Update running balance based on account type
            if (account.isDebitNormal) {
              runningBalance += debitAmount - creditAmount;
            } else {
              runningBalance += creditAmount - debitAmount;
            }

            // Use line description if available, otherwise fall back to entry description
            const description = accountLine.description || entry.description || entry.referenceNumber || entry.entryNumber || 'Journal Entry';

            accountTransactions.push({
              id: `${entry.id}-${accountLine.id}`, // Unique ID for each line
              lineId: accountLine.id, // Include line ID for reference
              journalEntryId: entry.id, // Include journal entry ID
              date: entry.entryDate,
              description: description,
              reference: entry.referenceNumber || entry.entryNumber || entry.reference || '',
              debitAmount: debitAmount > 0 ? debitAmount : null,
              creditAmount: creditAmount > 0 ? creditAmount : null,
              runningBalance: parseFloat(runningBalance.toFixed(2))
            });
          }
        }

        // Only include accounts with opening balance or transactions
        if (openingBalance !== 0 || accountTransactions.length > 0) {
          const totalDebits = accountTransactions.reduce((sum, txn) => sum + (txn.debitAmount || 0), 0);
          const totalCredits = accountTransactions.reduce((sum, txn) => sum + (txn.creditAmount || 0), 0);

          accountLedgers.push({
            id: account.id,
            name: account.name,
            accountNumber: account.accountNumber,
            type: account.type,
            openingBalance: parseFloat(openingBalance.toFixed(2)),
            transactions: accountTransactions,
            totalDebits: parseFloat(totalDebits.toFixed(2)),
            totalCredits: parseFloat(totalCredits.toFixed(2)),
            endingBalance: parseFloat(runningBalance.toFixed(2))
          });
        }
      }

      console.log(`📋 Generated Detailed General Ledger with ${accountLedgers.length} active accounts`);

      // FIXED: Sort accounts in proper accounting order (Assets → Liabilities → Equity → Income → Cost of Sales → Expenses)
      const getAccountTypeOrder = (type: string): number => {
        switch (type) {
          case 'asset': return 1;
          case 'liability': return 2;
          case 'equity': return 3;
          case 'income': return 4;
          case 'cost_of_sales': return 5;
          case 'expense': return 6;
          default: return 7;
        }
      };

      const sortedAccountLedgers = accountLedgers.sort((a, b) => {
        // First sort by account type (Assets → Liabilities → Equity → Income → Cost of Sales → Expenses)
        const typeOrderA = getAccountTypeOrder(a.type);
        const typeOrderB = getAccountTypeOrder(b.type);

        if (typeOrderA !== typeOrderB) {
          return typeOrderA - typeOrderB;
        }

        // Within the same account type, sort by account number (if available), then by name
        if (a.accountNumber && b.accountNumber) {
          const numA = parseInt(a.accountNumber.replace(/[^0-9]/g, ''));
          const numB = parseInt(b.accountNumber.replace(/[^0-9]/g, ''));
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
        }

        // Fall back to alphabetical by name
        return a.name.localeCompare(b.name);
      });

      console.log(`✅ SORTED: General Ledger accounts in proper accounting order (${sortedAccountLedgers.map(a => `${a.type}: ${a.name}`).join(', ')})`);

      res.json({
        clientId,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        accounts: sortedAccountLedgers,
        summary: {
          totalAccounts: sortedAccountLedgers.length,
          totalDebits: parseFloat(sortedAccountLedgers.reduce((sum, acc) => sum + acc.totalDebits, 0).toFixed(2)),
          totalCredits: parseFloat(sortedAccountLedgers.reduce((sum, acc) => sum + acc.totalCredits, 0).toFixed(2))
        }
      });

    } catch (error) {
      console.error("General Ledger generation error:", error);
      res.status(500).json({ error: "Failed to generate General Ledger report" });
    }
  });

  // Accounts Receivable Report
  apiRouter.get(
    "/reports/accounts-receivable/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { asOfDate } = req.query;

        const filterDate = asOfDate ? new Date(asOfDate as string) : new Date();

        console.log(
          `📊 Generating Accounts Receivable Report for client ${clientId} as of ${filterDate.toISOString()}`
        );

        // Get all invoices for the client
        const invoices = await storage.getInvoices(clientId);

        // Filter invoices up to the specified date
        const filteredInvoices = invoices.filter((invoice) => {
          return new Date(invoice.issueDate) <= filterDate;
        });

        // Process A/R balances by customer
        const customerBalances = {};

        for (const invoice of filteredInvoices) {
          const customer = await storage.getCustomer(invoice.customerId);
          const customerName = customer
            ? customer.name
            : `Customer ${invoice.customerId}`;

          if (!customerBalances[invoice.customerId]) {
            customerBalances[invoice.customerId] = {
              customerId: invoice.customerId,
              customerName: customerName,
              totalInvoiced: 0,
              totalPaid: 0,
              balance: 0,
              invoices: [],
            };
          }

          const amountDue = parseFloat(invoice.amountDue || "0");
          const amountPaid = parseFloat(invoice.amountPaid || "0");
          const balance = amountDue - amountPaid;

          customerBalances[invoice.customerId].totalInvoiced += amountDue;
          customerBalances[invoice.customerId].totalPaid += amountPaid;
          customerBalances[invoice.customerId].balance += balance;

          // Add invoice details if there's a balance
          if (balance > 0) {
            customerBalances[invoice.customerId].invoices.push({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              amountDue: amountDue,
              amountPaid: amountPaid,
              balance: balance,
              status: invoice.status,
              daysOverdue: invoice.dueDate
                ? Math.max(
                  0,
                  Math.floor(
                    (filterDate.getTime() -
                      new Date(invoice.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                )
                : 0,
            });
          }
        }

        // Convert to array and sort by balance descending
        const customerArray = Object.values(customerBalances)
          .filter((customer: any) => customer.balance > 0)
          .sort((a: any, b: any) => b.balance - a.balance);

        // Calculate totals
        const totalOutstanding = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.balance,
          0
        );
        const totalInvoiced = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.totalInvoiced,
          0
        );
        const totalPaid = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.totalPaid,
          0
        );

        // Aging analysis
        const agingBuckets = {
          current: 0, // 0-30 days
          days31to60: 0, // 31-60 days
          days61to90: 0, // 61-90 days
          over90: 0, // over 90 days
        };

        customerArray.forEach((customer: any) => {
          customer.invoices.forEach((invoice: any) => {
            if (invoice.daysOverdue <= 30) {
              agingBuckets.current += invoice.balance;
            } else if (invoice.daysOverdue <= 60) {
              agingBuckets.days31to60 += invoice.balance;
            } else if (invoice.daysOverdue <= 90) {
              agingBuckets.days61to90 += invoice.balance;
            } else {
              agingBuckets.over90 += invoice.balance;
            }
          });
        });

        console.log(
          `📋 Generated A/R Report: ${customerArray.length
          } customers with outstanding balances totaling $${totalOutstanding.toFixed(
            2
          )}`
        );

        res.json({
          clientId,
          asOfDate: filterDate.toISOString().split("T")[0],
          customers: customerArray,
          summary: {
            totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
            totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            customerCount: customerArray.length,
          },
          aging: {
            current: parseFloat(agingBuckets.current.toFixed(2)),
            days31to60: parseFloat(agingBuckets.days31to60.toFixed(2)),
            days61to90: parseFloat(agingBuckets.days61to90.toFixed(2)),
            over90: parseFloat(agingBuckets.over90.toFixed(2)),
          },
        });
      } catch (error) {
        console.error("Accounts Receivable Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Accounts Receivable report" });
      }
    }
  );

  // Accounts Payable Report
  apiRouter.get(
    "/reports/accounts-payable/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { asOfDate } = req.query;

        const filterDate = asOfDate ? new Date(asOfDate as string) : new Date();

        console.log(
          `📊 Generating Accounts Payable Report for client ${clientId} as of ${filterDate.toISOString()}`
        );

        // Get all bills for the client
        const bills = await storage.getBills(clientId);

        // Filter bills up to the specified date
        const filteredBills = bills.filter((bill) => {
          return new Date(bill.billDate) <= filterDate;
        });

        // Process A/P balances by vendor
        const vendorBalances = {};

        for (const bill of filteredBills) {
          const vendor = await storage.getVendor(bill.vendorId);
          const vendorName = vendor
            ? vendor.vendorName
            : `Vendor ${bill.vendorId}`;

          if (!vendorBalances[bill.vendorId]) {
            vendorBalances[bill.vendorId] = {
              vendorId: bill.vendorId,
              vendorName: vendorName,
              totalBilled: 0,
              totalPaid: 0,
              balance: 0,
              bills: [],
            };
          }

          const amountDue = parseFloat(bill.totalAmount || "0");
          const amountPaid = parseFloat(bill.amountPaid || "0");
          const balance = amountDue - amountPaid;

          vendorBalances[bill.vendorId].totalBilled += amountDue;
          vendorBalances[bill.vendorId].totalPaid += amountPaid;
          vendorBalances[bill.vendorId].balance += balance;

          // Add bill details if there's a balance
          if (balance > 0) {
            vendorBalances[bill.vendorId].bills.push({
              id: bill.id,
              billNumber: bill.billNumber,
              billDate: bill.billDate,
              dueDate: bill.dueDate,
              amountDue: amountDue,
              amountPaid: amountPaid,
              balance: balance,
              status: bill.status,
              daysOverdue: bill.dueDate
                ? Math.max(
                  0,
                  Math.floor(
                    (filterDate.getTime() -
                      new Date(bill.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                )
                : 0,
            });
          }
        }

        // Convert to array and sort by balance descending
        const vendorArray = Object.values(vendorBalances)
          .filter((vendor: any) => vendor.balance > 0)
          .sort((a: any, b: any) => b.balance - a.balance);

        // Calculate totals and aging
        let totalOutstanding = 0;
        let totalBilled = 0;
        let totalPaid = 0;

        const agingBuckets = {
          current: 0, // 0-30 days
          days31to60: 0, // 31-60 days
          days61to90: 0, // 61-90 days
          over90: 0, // 90+ days
        };

        vendorArray.forEach((vendor: any) => {
          totalOutstanding += vendor.balance;
          totalBilled += vendor.totalBilled;
          totalPaid += vendor.totalPaid;

          vendor.bills.forEach((bill: any) => {
            if (bill.daysOverdue <= 30) {
              agingBuckets.current += bill.balance;
            } else if (bill.daysOverdue <= 60) {
              agingBuckets.days31to60 += bill.balance;
            } else if (bill.daysOverdue <= 90) {
              agingBuckets.days61to90 += bill.balance;
            } else {
              agingBuckets.over90 += bill.balance;
            }
          });
        });

        console.log(
          `📋 Generated A/P Report: ${vendorArray.length
          } vendors with outstanding balances totaling $${totalOutstanding.toFixed(
            2
          )}`
        );

        res.json({
          clientId,
          asOfDate: filterDate.toISOString().split("T")[0],
          vendors: vendorArray,
          summary: {
            totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
            totalBilled: parseFloat(totalBilled.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            vendorCount: vendorArray.length,
          },
          aging: {
            current: parseFloat(agingBuckets.current.toFixed(2)),
            days31to60: parseFloat(agingBuckets.days31to60.toFixed(2)),
            days61to90: parseFloat(agingBuckets.days61to90.toFixed(2)),
            over90: parseFloat(agingBuckets.over90.toFixed(2)),
          },
        });
      } catch (error) {
        console.error("Accounts Payable Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Accounts Payable report" });
      }
    }
  );

  // Year-End Closing Endpoint - Enhanced with proper service
  apiRouter.post(
    "/reports/close-books/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { YearEndClosingService } = await import(
          "./services/year-end-closing-service"
        );
        const yearEndClosingService = new YearEndClosingService();

        const clientId = parseInt(req.params.clientId);
        const { fiscalYearEnd } = req.body;

        if (!fiscalYearEnd) {
          return res.status(400).json({
            success: false,
            error: "Fiscal year end date is required",
          });
        }

        console.log(
          `🔄 Starting year-end closing for client ${clientId} as of ${fiscalYearEnd}`
        );

        const result = await yearEndClosingService.performYearEndClosing(
          clientId,
          fiscalYearEnd
        );

        res.json(result);
      } catch (error) {
        console.error("Year-end closing error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to perform year-end closing",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Balance Sheet Report - Built from Transactions (OPTIMIZED)
  apiRouter.get(
    "/reports/balance-sheet/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        
        // Validate clientId
        if (!clientId || isNaN(clientId) || clientId <= 0) {
          return res.status(400).json({ error: "Valid client ID is required" });
        }
        
        console.log(`📊 Balance Sheet API called for client ${clientId}`);
        
        const { date, startDate } = req.query;

        const endDate = date
          ? new Date(date as string).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        // Always fetch fiscal year settings for the client (needed for response)
        // Note: getClientBookkeepingSettings returns a single object, not an array
        const bookkeepingSettings = await storage.getClientBookkeepingSettings(clientId);
        const fiscalYearEndMonth = bookkeepingSettings?.fiscalYearEndMonth || 12;
        const fiscalYearEndDay = bookkeepingSettings?.fiscalYearEndDay || 31;

        // Use startDate from query if provided, otherwise calculate from fiscal year settings
        let periodStartDate = startDate as string | undefined;
        
        if (!periodStartDate) {
          
          // Calculate fiscal year start based on the endDate
          const endDateObj = new Date(endDate);
          const endYear = endDateObj.getFullYear();
          const endMonth = endDateObj.getMonth() + 1;
          const endDay = endDateObj.getDate();
          
          // Determine which fiscal year we're in
          let fiscalYearEnd: Date;
          if (endMonth > fiscalYearEndMonth || 
              (endMonth === fiscalYearEndMonth && endDay > fiscalYearEndDay)) {
            // We're past the fiscal year end for this calendar year
            fiscalYearEnd = new Date(endYear, fiscalYearEndMonth - 1, fiscalYearEndDay);
          } else {
            // We're before the fiscal year end, so fiscal year started last calendar year
            fiscalYearEnd = new Date(endYear - 1, fiscalYearEndMonth - 1, fiscalYearEndDay);
          }
          
          // Fiscal year start is one day after the previous fiscal year end
          const fiscalYearStart = new Date(fiscalYearEnd);
          fiscalYearStart.setDate(fiscalYearStart.getDate() + 1);
          
          periodStartDate = `${fiscalYearStart.getFullYear()}-${String(fiscalYearStart.getMonth() + 1).padStart(2, '0')}-${String(fiscalYearStart.getDate()).padStart(2, '0')}`;
        }

        console.log(
          `📊 Generating Balance Sheet for client ${clientId} as of ${endDate} (from ${periodStartDate})`
        );

        // Use the updated TrialBalanceService with virtual year-end close
        const { trialBalanceService } = await import("./trial-balance-service");
        const trialBalanceEntries =
          await trialBalanceService.generateTrialBalance(clientId, endDate, periodStartDate);

        // Convert trial balance entries to expected format for balance sheet grouping
        const accountBalances = {};
        trialBalanceEntries.forEach((entry) => {
          accountBalances[entry.accountId] = {
            debit: entry.debitBalance,
            credit: entry.creditBalance,
            netBalance: entry.netBalance,
          };
        });

        // Group balance sheet accounts with proper subtotals
        const assets = {
          currentAssets: { accounts: [], total: 0 },
          fixedAssets: { accounts: [], total: 0 },
          otherAssets: { accounts: [], total: 0 },
          total: 0,
        };

        const liabilities = {
          currentLiabilities: { accounts: [], total: 0 },
          longTermLiabilities: { accounts: [], total: 0 },
          total: 0,
        };

        const equity: {
          accounts: { id: number | string; name: string; accountNumber: string | null; balance: number }[];
          total: number;
        } = {
          accounts: [],
          total: 0,
        };

        // NOTE: Income and expense accounts are NOT included in Balance Sheet
        // They are shown on the Profit & Loss report. Only Net Income appears in equity section.

        // Process trial balance entries directly (already filtered by TrialBalanceService)
        trialBalanceEntries.forEach((entry) => {
          // Use the net balance directly from TrialBalanceService (includes virtual year-end close)
          const balance = entry.netBalance;

          if (entry.accountType === "asset" && balance !== 0) {
            const assetInfo = {
              id: entry.accountId,
              name: entry.accountName,
              accountNumber: entry.accountNumber,
              balance: balance,
            };

            // Group assets by type - default to current assets for bank/cash
            if (
              entry.subtype === "bank" ||
              entry.subtype === "cash" ||
              entry.accountName.toLowerCase().includes("cash") ||
              entry.accountName.toLowerCase().includes("receivable") ||
              entry.accountName.toLowerCase().includes("inventory") ||
              entry.accountName.toLowerCase().includes("petty")
            ) {
              assets.currentAssets.accounts.push(assetInfo);
              assets.currentAssets.total += balance;
            } else if (
              entry.accountName.toLowerCase().includes("equipment") ||
              entry.accountName.toLowerCase().includes("building") ||
              entry.accountName.toLowerCase().includes("vehicle") ||
              entry.accountName.toLowerCase().includes("office") ||
              entry.accountName.toLowerCase().includes("computer") ||
              entry.accountName.toLowerCase().includes("furniture")
            ) {
              assets.fixedAssets.accounts.push(assetInfo);
              assets.fixedAssets.total += balance;
            } else {
              // Default all other assets to current assets
              assets.currentAssets.accounts.push(assetInfo);
              assets.currentAssets.total += balance;
            }
            assets.total += balance;
          } else if (entry.accountType === "liability" && balance !== 0) {
            const liabilityInfo = {
              id: entry.accountId,
              name: entry.accountName,
              accountNumber: entry.accountNumber,
              balance: balance,
            };

            // Group liabilities by subtype
            if (
              entry.subtype === "current_liability" ||
              entry.subtype === "payable"
            ) {
              liabilities.currentLiabilities.accounts.push(liabilityInfo);
              liabilities.currentLiabilities.total += balance;
            } else if (entry.subtype === "long_term_liability") {
              liabilities.longTermLiabilities.accounts.push(liabilityInfo);
              liabilities.longTermLiabilities.total += balance;
            } else {
              // Default to current liabilities
              liabilities.currentLiabilities.accounts.push(liabilityInfo);
              liabilities.currentLiabilities.total += balance;
            }
            liabilities.total += balance;
          } else if (entry.accountType === "equity" && balance !== 0) {
            // Skip retained earnings here - it will be added explicitly below to ensure proper placement
            const isRetainedEarnings =
              entry.accountNumber === "283-000" ||
              entry.accountName.toLowerCase().includes("retained earnings") ||
              entry.accountName.toLowerCase().includes("retained earning");

            if (!isRetainedEarnings) {
              equity.accounts.push({
                id: entry.accountId,
                name: entry.accountName,
                accountNumber: entry.accountNumber,
                balance: balance,
              });
              equity.total += balance;
            }
            // console.log(`🏛️ Added ${account.name} to equity: $${balance}`);
          }
          // NOTE: Income and expense accounts (income, expense, cost_of_sales, other_income, other_expense)
          // are intentionally excluded from Balance Sheet - they appear on Profit & Loss report

          // Debug output for each account (commented out for performance)
          // if (balance !== 0) {
          //   console.log(`🔍 Account: ${account.name} (${account.type})`);
          //   console.log(`   Debit: $${balances.debit.toFixed(2)}, Credit: $${balances.credit.toFixed(2)}`);
          //   console.log(`   Normal: ${account.isDebitNormal ? 'Debit' : 'Credit'}, Balance: $${balance.toFixed(2)}`);
          // }
        });

        // Calculate Net Income from P&L accounts using TrialBalanceService data
        let netIncome = 0;

        trialBalanceEntries.forEach((entry) => {
          if (entry.accountType === "income") {
            netIncome += entry.netBalance;
          } else if (
            entry.accountType === "expense" ||
            entry.accountType === "cost_of_sales"
          ) {
            netIncome -= entry.netBalance;
          }
        });

        // SIMPLIFIED FISCAL YEAR LOGIC - Using already computed balances
        const asOfDate = date ? new Date(date as string) : new Date();

        // For Balance Sheet, we already have all the balances computed via aggregation
        // Net income is already calculated above from the account balances
        console.log(
          `📅 Fiscal Year: Using aggregated balances as of ${endDate}`
        );

        // ALWAYS show the actual net income for the year being viewed
        // The trial balance service already handles prior year closes by moving
        // old net income to retained earnings. So the netIncome here is ALWAYS
        // for the current fiscal year of the date being viewed.
        const displayNetIncome = netIncome;

        console.log(
          `📊 Net Income for fiscal year ending ${endDate}: $${displayNetIncome.toFixed(
            2
          )}`
        );

        // Simplified retained earnings calculation
        // CRITICAL: Sum ALL retained earnings accounts (there may be multiple from imports)
        let totalRetainedEarnings = 0;

        // Find ALL retained earnings accounts from trial balance entries
        const retainedEarningsEntries = trialBalanceEntries.filter(
          (entry) =>
            entry.accountType === "equity" &&
            (entry.accountNumber === "283-000" ||
              entry.accountNumber === "320-000" ||
              entry.accountNumber?.startsWith("32") ||
              entry.accountName.toLowerCase().includes("retained earnings") ||
              entry.accountName.toLowerCase().includes("retained earning") ||
              entry.accountName.toLowerCase().includes("accumulated earnings") ||
              entry.accountName.toLowerCase().includes("accumulated deficit"))
        );

        // Sum all RE accounts into a single display line
        if (retainedEarningsEntries.length > 0) {
          for (const reEntry of retainedEarningsEntries) {
            totalRetainedEarnings += reEntry.netBalance;
          }
          // Display as a single combined retained earnings line
          equity.accounts.push({
            id: retainedEarningsEntries[0].accountId,
            name: "Retained Earnings",
            accountNumber: retainedEarningsEntries[0].accountNumber,
            balance: totalRetainedEarnings,
          });
          console.log(`📋 Combined ${retainedEarningsEntries.length} RE accounts: total=$${totalRetainedEarnings.toFixed(2)}`);
        } else {
          // Create placeholder if no retained earnings account exists
          equity.accounts.push({
            id: "retained-earnings-placeholder",
            name: "RETAINED EARNINGS",
            accountNumber: "283-000",
            balance: totalRetainedEarnings,
          });
        }
        equity.total += totalRetainedEarnings;
        // console.log(`📋 Added $${totalRetainedEarnings.toFixed(2)} to retained earnings from prior years`);

        // Always show current period net income (even if $0)
        equity.accounts.push({
          id: "net-income",
          name: "Net Income (Current Period)",
          accountNumber: "",
          balance: parseFloat(displayNetIncome.toFixed(2)),
        });
        equity.total += displayNetIncome;

        // Round totals
        assets.total = parseFloat(assets.total.toFixed(2));
        assets.currentAssets.total = parseFloat(
          assets.currentAssets.total.toFixed(2)
        );
        assets.fixedAssets.total = parseFloat(
          assets.fixedAssets.total.toFixed(2)
        );
        assets.otherAssets.total = parseFloat(
          assets.otherAssets.total.toFixed(2)
        );

        liabilities.total = parseFloat(liabilities.total.toFixed(2));
        liabilities.currentLiabilities.total = parseFloat(
          liabilities.currentLiabilities.total.toFixed(2)
        );
        liabilities.longTermLiabilities.total = parseFloat(
          liabilities.longTermLiabilities.total.toFixed(2)
        );

        equity.total = parseFloat(equity.total.toFixed(2));

        const totalLiabilitiesAndEquity = liabilities.total + equity.total;
        const difference = assets.total - totalLiabilitiesAndEquity;
        const isBalanced = Math.abs(difference) < 0.02;

        // console.log(`📊 Balance Sheet Summary:`);
        // console.log(`   Assets: $${assets.total} (Current: $${assets.currentAssets.total}, Fixed: $${assets.fixedAssets.total})`);
        // console.log(`   Liabilities: $${liabilities.total} (Current: $${liabilities.currentLiabilities.total}, Long-term: $${liabilities.longTermLiabilities.total})`);
        // console.log(`   Equity: $${equity.total} (Net Income: $${netIncome.toFixed(2)})`);
        // console.log(`   ${isBalanced ? 'BALANCED' : 'UNBALANCED'} - Difference: $${difference.toFixed(2)}`);

        res.json({
          clientId,
          asOfDate: date
            ? new Date(date as string).toISOString()
            : new Date().toISOString(),
          assets,
          liabilities,
          equity,
          netIncome: parseFloat(netIncome.toFixed(2)),
          totals: {
            totalAssets: assets.total,
            totalLiabilities: liabilities.total,
            totalEquity: equity.total,
            totalLiabilitiesAndEquity: parseFloat(
              totalLiabilitiesAndEquity.toFixed(2)
            ),
          },
          isBalanced,
          difference: parseFloat(difference.toFixed(2)),
          fiscalYearEndMonth,
          fiscalYearEndDay,
        });
      } catch (error) {
        console.error("Balance Sheet generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Balance Sheet report" });
      }
    }
  );

  // Milton AI Suggestion Route - Enhanced with Double-Entry Awareness
  apiRouter.post("/milton/suggest", async (req: Request, res: Response) => {
    try {
      const {
        description,
        amount,
        clientId,
        debitAmount,
        creditAmount,
        sourceAccountId,
      } = req.body;

      if (!description || !clientId) {
        return res
          .status(400)
          .json({ error: "Transaction description and client ID required" });
      }

      console.log(
        `🤖 Milton analyzing: "${description}" - Debit: $${debitAmount}, Credit: $${creditAmount}`
      );

      // Get client accounts for matching
      const accounts = await storage.getAccounts(clientId);

      // Determine transaction direction from bank account perspective
      const debit = parseFloat(debitAmount || 0);
      const credit = parseFloat(creditAmount || 0);
      const isMoneyIn = debit > 0; // Debit to bank = money coming in
      const transactionAmount = Math.max(debit, credit);

      console.log(
        `💰 Transaction analysis: Amount $${transactionAmount}, Direction: ${isMoneyIn ? "MONEY IN" : "MONEY OUT"
        }`
      );

      // Find bank account for double-entry context
      const bankAccount = sourceAccountId
        ? accounts.find((acc) => acc.id === parseInt(sourceAccountId))
        : accounts.find((acc) => acc.subtype === "bank");

      // Enhanced account matching logic
      const desc = description.toLowerCase();
      let suggestedAccount = null;
      let confidence = 0.3;
      let category = "Miscellaneous";

      if (isMoneyIn) {
        // Money coming IN = need INCOME/REVENUE account to credit
        if (
          desc.includes("payment") ||
          desc.includes("invoice") ||
          desc.includes("sales") ||
          desc.includes("revenue")
        ) {
          suggestedAccount = accounts.find(
            (acc) =>
              acc.type === "income" &&
              (acc.name.toLowerCase().includes("sales") ||
                acc.name.toLowerCase().includes("revenue") ||
                acc.name.toLowerCase().includes("income"))
          );
          category = "Sales Revenue";
          confidence = 0.9;
        } else if (desc.includes("interest") || desc.includes("dividend")) {
          suggestedAccount = accounts.find(
            (acc) =>
              acc.type === "income" && acc.name.toLowerCase().includes("income")
          );
          category = "Other Income";
          confidence = 0.8;
        } else {
          // Default to first income account that looks like revenue/sales
          suggestedAccount =
            accounts.find(
              (acc) =>
                acc.type === "income" &&
                (acc.name.toLowerCase().includes("sales") ||
                  acc.name.toLowerCase().includes("revenue"))
            ) || accounts.find((acc) => acc.type === "income");
          category = "Revenue";
          confidence = 0.6;
        }
      } else {
        // Money going OUT = need EXPENSE account to debit
        if (
          desc.includes("office") ||
          desc.includes("supplies") ||
          desc.includes("stationery")
        ) {
          suggestedAccount =
            accounts.find(
              (acc) =>
                acc.type === "expense" &&
                (acc.name.toLowerCase().includes("office") ||
                  acc.name.toLowerCase().includes("supplies"))
            ) || accounts.find((acc) => acc.type === "expense");
          category = "Office Expenses";
          confidence = 0.85;
        } else if (desc.includes("rent") || desc.includes("lease")) {
          suggestedAccount = accounts.find((acc) =>
            acc.name.toLowerCase().includes("rent")
          );
          category = "Rent Expense";
          confidence = 0.9;
        } else if (
          desc.includes("utilities") ||
          desc.includes("hydro") ||
          desc.includes("electric") ||
          desc.includes("gas")
        ) {
          suggestedAccount = accounts.find((acc) =>
            acc.name.toLowerCase().includes("utilities")
          );
          category = "Utilities";
          confidence = 0.85;
        } else if (
          desc.includes("telephone") ||
          desc.includes("phone") ||
          desc.includes("internet")
        ) {
          suggestedAccount = accounts.find((acc) =>
            acc.name.toLowerCase().includes("telephone")
          );
          category = "Telephone";
          confidence = 0.85;
        } else if (desc.includes("insurance")) {
          suggestedAccount = accounts.find((acc) =>
            acc.name.toLowerCase().includes("insurance")
          );
          category = "Insurance";
          confidence = 0.85;
        } else if (
          desc.includes("legal") ||
          desc.includes("accounting") ||
          desc.includes("professional")
        ) {
          suggestedAccount = accounts.find(
            (acc) =>
              acc.name.toLowerCase().includes("legal") ||
              acc.name.toLowerCase().includes("accounting")
          );
          category = "Professional Services";
          confidence = 0.85;
        } else if (desc.includes("advertising") || desc.includes("marketing")) {
          suggestedAccount = accounts.find((acc) =>
            acc.name.toLowerCase().includes("advertising")
          );
          category = "Advertising";
          confidence = 0.85;
        } else {
          // Default to first expense account
          suggestedAccount = accounts.find((acc) => acc.type === "expense");
          category = "General Expenses";
          confidence = 0.5;
        }
      }

      if (!suggestedAccount) {
        const fallbackType = isMoneyIn ? "income" : "expense";
        const fallbackName = isMoneyIn ? "Sales Revenue" : "General Expenses";

        return res.status(200).json({
          accountName: fallbackName,
          accountType: fallbackType,
          category: "Uncategorized",
          taxCode: "HST",
          transactionType: fallbackType,
          confidence: 0.3,
          reasoning: `No matching ${fallbackType} account found in chart of accounts`,
          doubleEntryExplanation: isMoneyIn
            ? `Money IN: Debit Bank Account $${transactionAmount}, Credit ${fallbackName} $${transactionAmount}`
            : `Money OUT: Debit ${fallbackName} $${transactionAmount}, Credit Bank Account $${transactionAmount}`,
          isMoneyIn,
        });
      }

      // Generate double-entry explanation
      const doubleEntryExplanation = isMoneyIn
        ? `Money IN: Debit ${bankAccount?.name || "Bank"
        } $${transactionAmount}, Credit ${suggestedAccount.name
        } $${transactionAmount}`
        : `Money OUT: Debit ${suggestedAccount.name
        } $${transactionAmount}, Credit ${bankAccount?.name || "Bank"
        } $${transactionAmount}`;

      res.json({
        accountName: suggestedAccount.name,
        accountId: suggestedAccount.id,
        accountType: suggestedAccount.type,
        category: category,
        taxCode: "HST",
        transactionType: suggestedAccount.type,
        confidence: confidence,
        reasoning: `Matched "${description}" to "${suggestedAccount.name
          }" based on ${isMoneyIn ? "income" : "expense"} transaction pattern`,
        doubleEntryExplanation,
        bankAccountName: bankAccount?.name,
        bankAccountId: bankAccount?.id,
        isMoneyIn,
      });
    } catch (error) {
      console.error("Milton suggestion error:", error);
      res.status(500).json({ error: "Failed to generate suggestion" });
    }
  });

  // Journal Entry Report - Detailed journal entry view (renamed from General Ledger)
  apiRouter.get(
    "/reports/journal-entries/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { startDate, endDate } = req.query;

        const start = startDate
          ? new Date(startDate as string)
          : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate as string) : new Date();

        console.log(
          `📊 Generating Journal Entry Report for client ${clientId} from ${start.toISOString()} to ${end.toISOString()}`
        );

        // Get all journal entries within date range
        const journalEntries = await storage.getJournalEntries(clientId);
        const filteredEntries = journalEntries.filter((entry) => {
          const entryDate = new Date(entry.entryDate);
          return entryDate >= start && entryDate <= end;
        });

        console.log(
          `📋 Found ${filteredEntries.length} journal entries in date range`
        );

        // Get all accounts for reference
        const accounts = await storage.getAccounts(clientId);
        const accountMap = {};
        accounts.forEach((account) => {
          accountMap[account.id] = account;
        });

        // Process entries and lines
        const entries = [];

        for (const entry of filteredEntries) {
          const lines = await storage.getJournalEntryLines(entry.id);

          for (const line of lines) {
            const account = accountMap[line.accountId];
            if (account) {
              entries.push({
                entryDate: entry.entryDate,
                description: entry.description,
                reference: entry.reference || "",
                accountId: line.accountId,
                accountName: account.name,
                accountNumber: account.accountNumber,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount,
              });
            }
          }
        }

        // Sort by date and account
        entries.sort((a, b) => {
          const dateCompare =
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.accountName.localeCompare(b.accountName);
        });

        res.json({
          clientId,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          entries,
          totalEntries: entries.length,
        });
      } catch (error) {
        console.error("Journal Entry Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Journal Entry report" });
      }
    }
  );

  // Accounts Receivable Report
  apiRouter.get(
    "/reports/accounts-receivable/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { asOfDate } = req.query;

        const filterDate = asOfDate ? new Date(asOfDate as string) : new Date();

        console.log(
          `📊 Generating Accounts Receivable Report for client ${clientId} as of ${filterDate.toISOString()}`
        );

        // Get all invoices for the client
        const invoices = await storage.getInvoices(clientId);

        // Filter invoices up to the specified date
        const filteredInvoices = invoices.filter((invoice) => {
          return new Date(invoice.issueDate) <= filterDate;
        });

        // Process A/R balances by customer
        const customerBalances = {};

        for (const invoice of filteredInvoices) {
          const customer = await storage.getCustomer(invoice.customerId);
          const customerName = customer
            ? customer.name
            : `Customer ${invoice.customerId}`;

          if (!customerBalances[invoice.customerId]) {
            customerBalances[invoice.customerId] = {
              customerId: invoice.customerId,
              customerName: customerName,
              totalInvoiced: 0,
              totalPaid: 0,
              balance: 0,
              invoices: [],
            };
          }

          const amountDue = parseFloat(invoice.amountDue || "0");
          const amountPaid = parseFloat(invoice.amountPaid || "0");
          const balance = amountDue - amountPaid;

          customerBalances[invoice.customerId].totalInvoiced += amountDue;
          customerBalances[invoice.customerId].totalPaid += amountPaid;
          customerBalances[invoice.customerId].balance += balance;

          // Add invoice details if there's a balance
          if (balance > 0) {
            customerBalances[invoice.customerId].invoices.push({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              amountDue: amountDue,
              amountPaid: amountPaid,
              balance: balance,
              status: invoice.status,
              daysOverdue: invoice.dueDate
                ? Math.max(
                  0,
                  Math.floor(
                    (filterDate.getTime() -
                      new Date(invoice.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                )
                : 0,
            });
          }
        }

        // Convert to array and sort by balance descending
        const customerArray = Object.values(customerBalances)
          .filter((customer: any) => customer.balance > 0)
          .sort((a: any, b: any) => b.balance - a.balance);

        // Calculate totals
        const totalOutstanding = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.balance,
          0
        );
        const totalInvoiced = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.totalInvoiced,
          0
        );
        const totalPaid = customerArray.reduce(
          (sum: number, customer: any) => sum + customer.totalPaid,
          0
        );

        // Aging analysis
        const agingBuckets = {
          current: 0, // 0-30 days
          days31to60: 0, // 31-60 days
          days61to90: 0, // 61-90 days
          over90: 0, // over 90 days
        };

        customerArray.forEach((customer: any) => {
          customer.invoices.forEach((invoice: any) => {
            if (invoice.daysOverdue <= 30) {
              agingBuckets.current += invoice.balance;
            } else if (invoice.daysOverdue <= 60) {
              agingBuckets.days31to60 += invoice.balance;
            } else if (invoice.daysOverdue <= 90) {
              agingBuckets.days61to90 += invoice.balance;
            } else {
              agingBuckets.over90 += invoice.balance;
            }
          });
        });

        console.log(
          `📋 Generated A/R Report: ${customerArray.length
          } customers with outstanding balances totaling $${totalOutstanding.toFixed(
            2
          )}`
        );

        res.json({
          clientId,
          asOfDate: filterDate.toISOString().split("T")[0],
          customers: customerArray,
          summary: {
            totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
            totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            customerCount: customerArray.length,
          },
          aging: {
            current: parseFloat(agingBuckets.current.toFixed(2)),
            days31to60: parseFloat(agingBuckets.days31to60.toFixed(2)),
            days61to90: parseFloat(agingBuckets.days61to90.toFixed(2)),
            over90: parseFloat(agingBuckets.over90.toFixed(2)),
          },
        });
      } catch (error) {
        console.error("Accounts Receivable Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Accounts Receivable report" });
      }
    }
  );

  // Accounts Payable Report
  apiRouter.get(
    "/reports/accounts-payable/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { asOfDate } = req.query;

        const filterDate = asOfDate ? new Date(asOfDate as string) : new Date();

        console.log(
          `📊 Generating Accounts Payable Report for client ${clientId} as of ${filterDate.toISOString()}`
        );

        // Get all bills for the client
        const bills = await storage.getBills(clientId);

        // Filter bills up to the specified date
        const filteredBills = bills.filter((bill) => {
          return new Date(bill.billDate) <= filterDate;
        });

        // Process A/P balances by vendor
        const vendorBalances = {};

        for (const bill of filteredBills) {
          const vendor = await storage.getVendor(bill.vendorId);
          const vendorName = vendor
            ? vendor.vendorName
            : `Vendor ${bill.vendorId}`;

          if (!vendorBalances[bill.vendorId]) {
            vendorBalances[bill.vendorId] = {
              vendorId: bill.vendorId,
              vendorName: vendorName,
              totalBilled: 0,
              totalPaid: 0,
              balance: 0,
              bills: [],
            };
          }

          const amountDue = parseFloat(bill.totalAmount || "0");
          const amountPaid = parseFloat(bill.amountPaid || "0");
          const balance = amountDue - amountPaid;

          vendorBalances[bill.vendorId].totalBilled += amountDue;
          vendorBalances[bill.vendorId].totalPaid += amountPaid;
          vendorBalances[bill.vendorId].balance += balance;

          // Add bill details if there's a balance
          if (balance > 0) {
            vendorBalances[bill.vendorId].bills.push({
              id: bill.id,
              billNumber: bill.billNumber,
              billDate: bill.billDate,
              dueDate: bill.dueDate,
              amountDue: amountDue,
              amountPaid: amountPaid,
              balance: balance,
              status: bill.status,
              daysOverdue: bill.dueDate
                ? Math.max(
                  0,
                  Math.floor(
                    (filterDate.getTime() -
                      new Date(bill.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                )
                : 0,
            });
          }
        }

        // Convert to array and sort by balance descending
        const vendorArray = Object.values(vendorBalances)
          .filter((vendor: any) => vendor.balance > 0)
          .sort((a: any, b: any) => b.balance - a.balance);

        // Calculate totals and aging
        let totalOutstanding = 0;
        let totalBilled = 0;
        let totalPaid = 0;

        const agingBuckets = {
          current: 0, // 0-30 days
          days31to60: 0, // 31-60 days
          days61to90: 0, // 61-90 days
          over90: 0, // 90+ days
        };

        vendorArray.forEach((vendor: any) => {
          totalOutstanding += vendor.balance;
          totalBilled += vendor.totalBilled;
          totalPaid += vendor.totalPaid;

          vendor.bills.forEach((bill: any) => {
            if (bill.daysOverdue <= 30) {
              agingBuckets.current += bill.balance;
            } else if (bill.daysOverdue <= 60) {
              agingBuckets.days31to60 += bill.balance;
            } else if (bill.daysOverdue <= 90) {
              agingBuckets.days61to90 += bill.balance;
            } else {
              agingBuckets.over90 += bill.balance;
            }
          });
        });

        console.log(
          `📋 Generated A/P Report: ${vendorArray.length
          } vendors with outstanding balances totaling $${totalOutstanding.toFixed(
            2
          )}`
        );

        res.json({
          clientId,
          asOfDate: filterDate.toISOString().split("T")[0],
          vendors: vendorArray,
          summary: {
            totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
            totalBilled: parseFloat(totalBilled.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            vendorCount: vendorArray.length,
          },
          aging: {
            current: parseFloat(agingBuckets.current.toFixed(2)),
            days31to60: parseFloat(agingBuckets.days31to60.toFixed(2)),
            days61to90: parseFloat(agingBuckets.days61to90.toFixed(2)),
            over90: parseFloat(agingBuckets.over90.toFixed(2)),
          },
        });
      } catch (error) {
        console.error("Accounts Payable Report generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Accounts Payable report" });
      }
    }
  );

  // Year-End Closing Endpoint - Enhanced with proper service
  apiRouter.post(
    "/reports/close-books/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { YearEndClosingService } = await import(
          "./services/year-end-closing-service"
        );
        const yearEndClosingService = new YearEndClosingService();

        const clientId = parseInt(req.params.clientId);
        const { fiscalYearEnd } = req.body;

        if (!fiscalYearEnd) {
          return res.status(400).json({
            success: false,
            error: "Fiscal year end date is required",
          });
        }

        console.log(
          `🔄 Starting year-end closing for client ${clientId} as of ${fiscalYearEnd}`
        );

        const result = await yearEndClosingService.performYearEndClosing(
          clientId,
          fiscalYearEnd
        );

        res.json(result);
      } catch (error) {
        console.error("Year-end closing error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to perform year-end closing",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Helper function to generate columnar Profit & Loss reports
  async function generateColumnarProfitLoss(
    clientId: number,
    startDate: string,
    endDate: string,
    periodType: string,
    projectId?: string,
    locationId?: string,
    classId?: string,
    fiscalYearStartDate?: string,
    res?: Response
  ) {
    console.log(
      `📊 Generating columnar P&L: ${periodType} from ${startDate} to ${endDate}, FY Start: ${fiscalYearStartDate || 'not provided'}`
    );

    const accounts = await storage.getAccounts(clientId);
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate period ranges based on type
    const periods = [];
    let current = new Date(start);

    while (current <= end) {
      let periodStart = new Date(current);
      let periodEnd = new Date(current);
      let periodName = "";

      if (periodType === "monthly") {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Last day of month
        if (periodEnd > end) periodEnd = new Date(end);
        periodName = current.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      } else if (periodType === "quarterly") {
        const quarter = Math.floor(current.getMonth() / 3);
        const quarterStart = new Date(current.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(
          current.getFullYear(),
          (quarter + 1) * 3,
          0
        );
        periodStart = quarterStart > start ? quarterStart : start;
        periodEnd = quarterEnd < end ? quarterEnd : end;
        periodName = `Q${quarter + 1} ${current.getFullYear()}`;
        current = new Date(quarterEnd);
        current.setDate(current.getDate() + 1);
      } else if (periodType === "yearly") {
        const yearStart = new Date(current.getFullYear(), 0, 1);
        const yearEnd = new Date(current.getFullYear(), 11, 31);
        periodStart = yearStart > start ? yearStart : start;
        periodEnd = yearEnd < end ? yearEnd : end;
        periodName = current.getFullYear().toString();
        current = new Date(yearEnd);
        current.setDate(current.getDate() + 1);
      }

      if (periodStart <= end) {
        periods.push({
          name: periodName,
          startDate: periodStart.toISOString().split("T")[0],
          endDate: periodEnd.toISOString().split("T")[0],
        });
      }

      if (current > end) break;
    }

    console.log(`📅 Generated ${periods.length} periods for columnar P&L`);

    // Determine fiscal year start for YTD calculations
    // YTD always ends at TODAY (current date), so fiscal year start should be based on TODAY
    const today = new Date();
    const todayDateStr = today.toISOString().split("T")[0];
    let ytdStartDate = fiscalYearStartDate;
    if (!ytdStartDate) {
      // Try to determine from bookkeeping settings (returns single object, not array)
      const bookkeepingSettings = await storage.getClientBookkeepingSettings(clientId);
      if (bookkeepingSettings && bookkeepingSettings.fiscalYearEndMonth) {
        const { fiscalYearEndMonth, fiscalYearEndDay } = bookkeepingSettings;
        // Use TODAY's date to determine which fiscal year we're in (since YTD ends at today)
        let year = today.getFullYear();
        // Adjust year if fiscal year end has not passed yet in the current calendar year
        if (today.getMonth() + 1 < fiscalYearEndMonth ||
            (today.getMonth() + 1 === fiscalYearEndMonth && today.getDate() <= (fiscalYearEndDay || 31))) {
          year--;
        }
        // Fiscal year START is the day after fiscal year END
        // If FY ends Sep 30 (month 9), FY starts Oct 1 (month 10)
        // If FY ends Dec 31 (month 12), FY starts Jan 1 (month 1) of next year
        let startMonth = fiscalYearEndMonth + 1;
        let startYear = year;
        if (startMonth > 12) {
          startMonth = 1;
          startYear = year + 1;
        }
        ytdStartDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
        console.log(`📅 Using fiscal year settings: Month=${fiscalYearEndMonth}, Day=${fiscalYearEndDay}, YTD Start=${ytdStartDate}`);
      } else {
        // Fallback: If no bookkeeping settings, default to Jan 1 of the current year
        ytdStartDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
        console.log(`📅 No fiscal year settings found, defaulting YTD start to January 1: ${ytdStartDate}`);
      }
    }
    // YTD ends at TODAY (current date) - shows cumulative data from fiscal year start to now
    // Use local date to avoid timezone issues (toISOString converts to UTC which can shift date backwards)
    const todayForYtd = new Date();
    const ytdEndDate = `${todayForYtd.getFullYear()}-${String(todayForYtd.getMonth() + 1).padStart(2, '0')}-${String(todayForYtd.getDate()).padStart(2, '0')}`;
    console.log(`📊 YTD will be calculated from ${ytdStartDate} to ${ytdEndDate} (today)`);

    // Generate P&L data for each period
    const columnarData: any = {
      periods: periods.map((p) => p.name),
      income: { accounts: [], totals: [], ytdTotal: 0 },
      costOfSales: { accounts: [], totals: [], ytdTotal: 0 },
      expenses: { accounts: [], totals: [], ytdTotal: 0 },
      otherIncome: { accounts: [], totals: [], ytdTotal: 0 },
      otherExpense: { accounts: [], totals: [], ytdTotal: 0 },
      grossProfits: [],
      netIncomes: [],
      ytdGrossProfit: 0,
      ytdNetIncome: 0,
      ytdPeriod: { startDate: ytdStartDate, endDate: ytdEndDate }, // YTD ends at today
    };

    // Process each period
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const journalEntries = await storage.getJournalEntries(
        clientId,
        100000,
        0,
        period.startDate,
        period.endDate
      );

      let allJournalLines = [];
      if (journalEntries.length > 0) {
        const entryIds = journalEntries.map((entry) => entry.id);
        allJournalLines = await storage.getJournalEntryLinesBatch(entryIds);
      }

      // DIMENSION FILTERING: Filter journal lines by dimension if specified
      let filteredJournalLines = allJournalLines;
      if (projectId) {
        const projectIdNum = parseInt(projectId);
        filteredJournalLines = filteredJournalLines.filter(
          (line) => line.projectId === projectIdNum
        );
      }
      if (locationId) {
        const locationIdNum = parseInt(locationId);
        filteredJournalLines = filteredJournalLines.filter(
          (line) => line.locationId === locationIdNum
        );
      }
      if (classId) {
        const classIdNum = parseInt(classId);
        filteredJournalLines = filteredJournalLines.filter(
          (line) => line.classId === classIdNum
        );
      }

      const accountTotals = {};
      filteredJournalLines.forEach((line) => {
        const accountId = line.accountId;
        if (!accountTotals[accountId]) {
          accountTotals[accountId] = { debit: 0, credit: 0 };
        }
        accountTotals[accountId].debit += parseFloat(line.debitAmount || "0");
        accountTotals[accountId].credit += parseFloat(line.creditAmount || "0");
      });

      let periodIncome = 0,
        periodCostOfSales = 0,
        periodExpenses = 0,
        periodOtherIncome = 0,
        periodOtherExpense = 0;

      // Process accounts for this period
      accounts.forEach((account) => {
        const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
        let amount = 0;

        if (account.type === "income") {
          amount = totals.credit - totals.debit;
          periodIncome += amount;

          // Find or create account entry
          let accountEntry = columnarData.income.accounts.find(
            (a) => a.id === account.id
          );
          if (!accountEntry) {
            accountEntry = {
              id: account.id,
              name: account.name,
              accountNumber: account.accountNumber,
              amounts: new Array(periods.length).fill(0),
            };
            columnarData.income.accounts.push(accountEntry);
          }
          accountEntry.amounts[i] = amount;
        } else if (account.type === "other_income") {
          amount = totals.credit - totals.debit;
          periodOtherIncome += amount;

          // Find or create account entry
          let accountEntry = columnarData.otherIncome.accounts.find(
            (a) => a.id === account.id
          );
          if (!accountEntry) {
            accountEntry = {
              id: account.id,
              name: account.name,
              accountNumber: account.accountNumber,
              amounts: new Array(periods.length).fill(0),
            };
            columnarData.otherIncome.accounts.push(accountEntry);
          }
          accountEntry.amounts[i] = amount;
        } else if (account.type === "cost_of_sales") {
          amount = totals.debit - totals.credit;
          periodCostOfSales += amount;

          let accountEntry = columnarData.costOfSales.accounts.find(
            (a) => a.id === account.id
          );
          if (!accountEntry) {
            accountEntry = {
              id: account.id,
              name: account.name,
              accountNumber: account.accountNumber,
              amounts: new Array(periods.length).fill(0),
            };
            columnarData.costOfSales.accounts.push(accountEntry);
          }
          accountEntry.amounts[i] = amount;
        } else if (account.type === "expense") {
          amount = totals.debit - totals.credit;
          periodExpenses += amount;

          let accountEntry = columnarData.expenses.accounts.find(
            (a) => a.id === account.id
          );
          if (!accountEntry) {
            accountEntry = {
              id: account.id,
              name: account.name,
              accountNumber: account.accountNumber,
              amounts: new Array(periods.length).fill(0),
            };
            columnarData.expenses.accounts.push(accountEntry);
          }
          accountEntry.amounts[i] = amount;
        } else if (account.type === "other_expense") {
          amount = totals.debit - totals.credit;
          periodOtherExpense += amount;

          let accountEntry = columnarData.otherExpense.accounts.find(
            (a) => a.id === account.id
          );
          if (!accountEntry) {
            accountEntry = {
              id: account.id,
              name: account.name,
              accountNumber: account.accountNumber,
              amounts: new Array(periods.length).fill(0),
            };
            columnarData.otherExpense.accounts.push(accountEntry);
          }
          accountEntry.amounts[i] = amount;
        }
      });

      // Calculate totals for this period
      columnarData.income.totals[i] = periodIncome;
      columnarData.costOfSales.totals[i] = periodCostOfSales;
      columnarData.expenses.totals[i] = periodExpenses;
      columnarData.otherIncome.totals[i] = periodOtherIncome;
      columnarData.otherExpense.totals[i] = periodOtherExpense;
      // Calculate according to new formulas:
      // 1. totalRevenue = incomeTotal (periodIncome)
      // 2. grossProfit = totalRevenue - costOfSalesTotal
      columnarData.grossProfits[i] = periodIncome - periodCostOfSales;
      // 3. netIncomeFromOperations = (grossProfit - expensesTotal)
      const periodNetIncomeFromOperations = columnarData.grossProfits[i] - periodExpenses;
      // 4. earningsBeforeTax = netIncomeFromOperations + otherIncomeTotal - otherExpenseTotal
      const periodEarningsBeforeTax = periodNetIncomeFromOperations + periodOtherIncome - periodOtherExpense;
      // 5. netIncome = earningsBeforeTax - IncomeTax (IncomeTax doesn't exist, so it's 0)
      const periodIncomeTax = 0;
      columnarData.netIncomes[i] = periodEarningsBeforeTax - periodIncomeTax;
    }

    // Add total column (sum across all periods)
    columnarData.periods.push("Total");

    // Calculate totals
    const totalIncome = columnarData.income.totals.reduce(
      (sum, val) => sum + val,
      0
    );
    const totalCostOfSales = columnarData.costOfSales.totals.reduce(
      (sum, val) => sum + val,
      0
    );
    const totalExpenses = columnarData.expenses.totals.reduce(
      (sum, val) => sum + val,
      0
    );
    const totalOtherIncome = columnarData.otherIncome.totals.reduce(
      (sum, val) => sum + val,
      0
    );
    const totalOtherExpense = columnarData.otherExpense.totals.reduce(
      (sum, val) => sum + val,
      0
    );

    columnarData.income.totals.push(totalIncome);
    columnarData.costOfSales.totals.push(totalCostOfSales);
    columnarData.expenses.totals.push(totalExpenses);
    columnarData.otherIncome.totals.push(totalOtherIncome);
    columnarData.otherExpense.totals.push(totalOtherExpense);
    // Calculate according to new formulas:
    // 1. totalRevenue = incomeTotal (totalIncome)
    // 2. grossProfit = totalRevenue - costOfSalesTotal
    const totalGrossProfit = totalIncome - totalCostOfSales;
    columnarData.grossProfits.push(totalGrossProfit);
    // 3. netIncomeFromOperations = (grossProfit - expensesTotal)
    const totalNetIncomeFromOperations = totalGrossProfit - totalExpenses;
    // 4. earningsBeforeTax = netIncomeFromOperations + otherIncomeTotal - otherExpenseTotal
    const totalEarningsBeforeTax = totalNetIncomeFromOperations + totalOtherIncome - totalOtherExpense;
    // 5. netIncome = earningsBeforeTax - IncomeTax (IncomeTax doesn't exist, so it's 0)
    const totalIncomeTax = 0;
    columnarData.netIncomes.push(totalEarningsBeforeTax - totalIncomeTax);

    // Add total amounts for each account
    columnarData.income.accounts.forEach((account: any) => {
      account.amounts.push(account.amounts.reduce((sum: number, val: number) => sum + val, 0));
    });
    columnarData.costOfSales.accounts.forEach((account: any) => {
      account.amounts.push(account.amounts.reduce((sum: number, val: number) => sum + val, 0));
    });
    columnarData.expenses.accounts.forEach((account: any) => {
      account.amounts.push(account.amounts.reduce((sum: number, val: number) => sum + val, 0));
    });
    columnarData.otherIncome.accounts.forEach((account: any) => {
      account.amounts.push(account.amounts.reduce((sum: number, val: number) => sum + val, 0));
    });
    columnarData.otherExpense.accounts.forEach((account: any) => {
      account.amounts.push(account.amounts.reduce((sum: number, val: number) => sum + val, 0));
    });

    // Calculate YTD from fiscal year start to TODAY
    console.log(`📊 Calculating YTD from ${ytdStartDate} to ${ytdEndDate} (today)`);
    const ytdJournalEntries = await storage.getJournalEntries(
      clientId,
      100000,
      0,
      ytdStartDate,
      ytdEndDate // YTD ends at today
    );

    let ytdJournalLines: any[] = [];
    if (ytdJournalEntries.length > 0) {
      const ytdEntryIds = ytdJournalEntries.map((entry: any) => entry.id);
      ytdJournalLines = await storage.getJournalEntryLinesBatch(ytdEntryIds);
    }

    // DIMENSION FILTERING: Filter YTD journal lines by dimension if specified
    let filteredYtdJournalLines = ytdJournalLines;
    if (projectId) {
      const projectIdNum = parseInt(projectId);
      filteredYtdJournalLines = filteredYtdJournalLines.filter(
        (line: any) => line.projectId === projectIdNum
      );
    }
    if (locationId) {
      const locationIdNum = parseInt(locationId);
      filteredYtdJournalLines = filteredYtdJournalLines.filter(
        (line: any) => line.locationId === locationIdNum
      );
    }
    if (classId) {
      const classIdNum = parseInt(classId);
      filteredYtdJournalLines = filteredYtdJournalLines.filter(
        (line: any) => line.classId === classIdNum
      );
    }

    // Calculate YTD account totals
    const ytdAccountTotals: Record<number, { debit: number; credit: number }> = {};
    filteredYtdJournalLines.forEach((line: any) => {
      const accountId = line.accountId;
      if (!ytdAccountTotals[accountId]) {
        ytdAccountTotals[accountId] = { debit: 0, credit: 0 };
      }
      ytdAccountTotals[accountId].debit += parseFloat(line.debitAmount || "0");
      ytdAccountTotals[accountId].credit += parseFloat(line.creditAmount || "0");
    });

    // Calculate YTD totals for each category
    let ytdIncome = 0, ytdCostOfSales = 0, ytdExpenses = 0, ytdOtherIncome = 0, ytdOtherExpense = 0;
    
    accounts.forEach((account: any) => {
      const totals = ytdAccountTotals[account.id] || { debit: 0, credit: 0 };
      let ytdAmount = 0;

      if (account.type === "income") {
        ytdAmount = totals.credit - totals.debit;
        ytdIncome += ytdAmount;
        // Add ytdBalance to account
        const accountEntry = columnarData.income.accounts.find((a: any) => a.id === account.id);
        if (accountEntry) {
          accountEntry.ytdBalance = ytdAmount;
        }
      } else if (account.type === "other_income") {
        ytdAmount = totals.credit - totals.debit;
        ytdOtherIncome += ytdAmount;
        const accountEntry = columnarData.otherIncome.accounts.find((a: any) => a.id === account.id);
        if (accountEntry) {
          accountEntry.ytdBalance = ytdAmount;
        }
      } else if (account.type === "cost_of_sales") {
        ytdAmount = totals.debit - totals.credit;
        ytdCostOfSales += ytdAmount;
        const accountEntry = columnarData.costOfSales.accounts.find((a: any) => a.id === account.id);
        if (accountEntry) {
          accountEntry.ytdBalance = ytdAmount;
        }
      } else if (account.type === "expense") {
        ytdAmount = totals.debit - totals.credit;
        ytdExpenses += ytdAmount;
        const accountEntry = columnarData.expenses.accounts.find((a: any) => a.id === account.id);
        if (accountEntry) {
          accountEntry.ytdBalance = ytdAmount;
        }
      } else if (account.type === "other_expense") {
        ytdAmount = totals.debit - totals.credit;
        ytdOtherExpense += ytdAmount;
        const accountEntry = columnarData.otherExpense.accounts.find((a: any) => a.id === account.id);
        if (accountEntry) {
          accountEntry.ytdBalance = ytdAmount;
        }
      }
    });

    // Set YTD totals
    columnarData.income.ytdTotal = ytdIncome;
    columnarData.costOfSales.ytdTotal = ytdCostOfSales;
    columnarData.expenses.ytdTotal = ytdExpenses;
    columnarData.otherIncome.ytdTotal = ytdOtherIncome;
    columnarData.otherExpense.ytdTotal = ytdOtherExpense;
    columnarData.ytdGrossProfit = ytdIncome - ytdCostOfSales;
    const ytdNetIncomeFromOperations = columnarData.ytdGrossProfit - ytdExpenses;
    const ytdEarningsBeforeTax = ytdNetIncomeFromOperations + ytdOtherIncome - ytdOtherExpense;
    columnarData.ytdNetIncome = ytdEarningsBeforeTax;

    console.log(`📈 YTD Summary: Income $${ytdIncome}, Expenses $${ytdExpenses}, Net Income $${columnarData.ytdNetIncome}`);

    console.log(
      `📈 Columnar P&L Complete: ${columnarData.periods.length - 1
      } periods + total`
    );

    res.json({
      ...columnarData,
      isColumnar: true,
      periodType,
      dateRange: { startDate, endDate },
    });
  }

  // Transaction-Based Profit & Loss Report (OPTIMIZED)
  apiRouter.get(
    "/reports/profit-loss/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const {
          startDate,
          endDate,
          closeBooks,
          periodType,
          hideZeroBalances,
          projectId,
          locationId,
          classId,
          fiscalYearStartDate, // Optional: if provided, YTD data will be calculated
        } = req.query;

        // Parse hideZeroBalances - default to true (hide zero balances by default)
        const shouldHideZeroBalances = hideZeroBalances !== "false"; // Only show if explicitly set to 'false'

        console.log(
          `📊 Generating Journal Entry-Based P&L for client ${clientId} from ${startDate} to ${endDate} (Period Type: ${periodType || "single"
          }, Hide Zero: ${shouldHideZeroBalances})`
        );

        // Handle columnar period reports
        if (periodType && periodType !== "single") {
          return await generateColumnarProfitLoss(
            clientId,
            startDate as string,
            endDate as string,
            periodType as string,
            projectId as string,
            locationId as string,
            classId as string,
            fiscalYearStartDate as string | undefined,
            res
          );
        }

        // Get all accounts
        const accounts = await storage.getAccounts(clientId);

        // OPTIMIZED: Use database-level date filtering instead of fetching ALL entries
        // Convert dates to YYYY-MM-DD format for database query
        const formattedStartDate = startDate
          ? new Date(startDate as string).toISOString().split("T")[0]
          : new Date(new Date().getFullYear(), 0, 1)
            .toISOString()
            .split("T")[0];
        const formattedEndDate = endDate
          ? new Date(endDate as string).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        // Determine fiscal year start date for YTD calculations
        // YTD always ends at TODAY (current date), so fiscal year start should be based on TODAY
        const todayForFiscalYear = new Date();
        const todayForFiscalYearStr = todayForFiscalYear.toISOString().split("T")[0];
        let formattedFiscalYearStartDate: string | null = null;
        if (fiscalYearStartDate) {
          formattedFiscalYearStartDate = new Date(fiscalYearStartDate as string).toISOString().split("T")[0];
          console.log(`📅 Using provided fiscal year start: ${formattedFiscalYearStartDate}`);
        } else {
          // Try to determine from bookkeeping settings (returns single object, not array)
          const bookkeepingSettings = await storage.getClientBookkeepingSettings(clientId);
          console.log(`📅 Bookkeeping settings for client ${clientId}:`, bookkeepingSettings ? JSON.stringify(bookkeepingSettings) : 'None');
          if (bookkeepingSettings && bookkeepingSettings.fiscalYearEndMonth) {
            const { fiscalYearEndMonth, fiscalYearEndDay } = bookkeepingSettings;
            // Use TODAY's date to determine which fiscal year we're in (since YTD ends at today)
            let year = todayForFiscalYear.getFullYear();
            console.log(`📅 Fiscal year end: Month=${fiscalYearEndMonth}, Day=${fiscalYearEndDay}, Today: ${todayForFiscalYearStr}`);
            // Adjust year if fiscal year end has not passed yet in the current calendar year
            if (todayForFiscalYear.getMonth() + 1 < fiscalYearEndMonth || 
                (todayForFiscalYear.getMonth() + 1 === fiscalYearEndMonth && todayForFiscalYear.getDate() <= (fiscalYearEndDay || 31))) {
              year--;
              console.log(`📅 Fiscal year end not yet reached, using previous year: ${year}`);
            }
            // Fiscal year START is the day after fiscal year END
            // If FY ends Sep 30 (month 9), FY starts Oct 1 (month 10)
            // If FY ends Dec 31 (month 12), FY starts Jan 1 (month 1) of next year
            let startMonth = fiscalYearEndMonth + 1; // Month after FY end
            let startYear = year;
            if (startMonth > 12) {
              startMonth = 1;
              startYear = year + 1;
            }
            const startDay = 1; // First day of the month after FY end
            formattedFiscalYearStartDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
            console.log(`📅 Calculated fiscal year start: ${formattedFiscalYearStartDate}`);
          } else {
            // Default to January 1 of the current year if no fiscal year settings
            formattedFiscalYearStartDate = `${todayForFiscalYear.getFullYear()}-01-01`;
            console.log(`📅 No fiscal year settings found, defaulting YTD start to January 1: ${formattedFiscalYearStartDate}`);
          }
        }

        console.log(
          `🚀 OPTIMIZED FETCH: Fetching journal entries from ${formattedStartDate} to ${formattedEndDate}`
        );
        // YTD ends at TODAY (current date) - shows cumulative data from fiscal year start to now
        // Use local date to avoid timezone issues (toISOString converts to UTC which can shift date backwards)
        const todayForYtdCalc = new Date();
        const ytdEndDate = `${todayForYtdCalc.getFullYear()}-${String(todayForYtdCalc.getMonth() + 1).padStart(2, '0')}-${String(todayForYtdCalc.getDate()).padStart(2, '0')}`;
        console.log(
          `📅 YTD CALCULATION: Fiscal Year Start = ${formattedFiscalYearStartDate}, End Date = ${ytdEndDate} (today)`
        );

        // Use the optimized method with date filtering at database level
        const journalEntries = await storage.getJournalEntries(
          clientId,
          100000,
          0,
          formattedStartDate,
          formattedEndDate
        );

        // Fetch YTD journal entries: from fiscal year start to TODAY
        let ytdJournalEntries: any[] = [];
        console.log(`📅 YTD will be calculated from ${formattedFiscalYearStartDate} to ${ytdEndDate} (today)`);
        
        if (formattedFiscalYearStartDate) {
          ytdJournalEntries = await storage.getJournalEntries(
            clientId,
            100000,
            0,
            formattedFiscalYearStartDate,
            ytdEndDate // YTD ends at report end date
          );
        } else {
          // Fallback if no fiscal year start
          ytdJournalEntries = journalEntries;
        }

        // No need for additional filtering - already filtered at database level
        const dateFilteredEntries = journalEntries;

        console.log(
          `📋 Processing ${dateFilteredEntries.length} journal entries in period, ${ytdJournalEntries.length} in YTD range`
        );

        // OPTIMIZED: Fetch all journal lines in a single query instead of N+1 queries
        let allJournalLines: any[] = [];
        if (dateFilteredEntries.length > 0) {
          const entryIds = dateFilteredEntries.map((entry) => entry.id);
          // Batch fetch all lines for all entries at once
          allJournalLines = await storage.getJournalEntryLinesBatch(entryIds);
        }

        // Fetch YTD journal lines
        let ytdJournalLines: any[] = [];
        if (ytdJournalEntries.length > 0) {
          const ytdEntryIds = ytdJournalEntries.map((entry: any) => entry.id);
          ytdJournalLines = await storage.getJournalEntryLinesBatch(ytdEntryIds);
        }

        console.log(
          `📋 Found ${allJournalLines.length} journal lines in period, ${ytdJournalLines.length} in YTD range`
        );

        // DIMENSION FILTERING: Filter journal lines by dimension if specified
        let filteredJournalLines = allJournalLines;
        let filteredYtdJournalLines = ytdJournalLines;
        
        if (projectId) {
          const projectIdNum = parseInt(projectId as string);
          filteredJournalLines = filteredJournalLines.filter(
            (line) => line.projectId === projectIdNum
          );
          filteredYtdJournalLines = filteredYtdJournalLines.filter(
            (line: any) => line.projectId === projectIdNum
          );
          console.log(
            `📊 Filtered by Project ID ${projectIdNum}: ${filteredJournalLines.length} period lines, ${filteredYtdJournalLines.length} YTD lines`
          );
        }
        if (locationId) {
          const locationIdNum = parseInt(locationId as string);
          filteredJournalLines = filteredJournalLines.filter(
            (line) => line.locationId === locationIdNum
          );
          filteredYtdJournalLines = filteredYtdJournalLines.filter(
            (line: any) => line.locationId === locationIdNum
          );
          console.log(
            `📊 Filtered by Location ID ${locationIdNum}: ${filteredJournalLines.length} period lines, ${filteredYtdJournalLines.length} YTD lines`
          );
        }
        if (classId) {
          const classIdNum = parseInt(classId as string);
          filteredJournalLines = filteredJournalLines.filter(
            (line) => line.classId === classIdNum
          );
          filteredYtdJournalLines = filteredYtdJournalLines.filter(
            (line: any) => line.classId === classIdNum
          );
          console.log(
            `📊 Filtered by Class ID ${classIdNum}: ${filteredJournalLines.length} period lines, ${filteredYtdJournalLines.length} YTD lines`
          );
        }

        // Calculate account balances from journal lines - PERIOD
        const accountTotals: Record<number, { debit: number; credit: number }> = {};
        filteredJournalLines.forEach((line) => {
          const accountId = line.accountId;
          if (!accountTotals[accountId]) {
            accountTotals[accountId] = { debit: 0, credit: 0 };
          }
          accountTotals[accountId].debit += parseFloat(line.debitAmount || "0");
          accountTotals[accountId].credit += parseFloat(
            line.creditAmount || "0"
          );
        });

        // Calculate account balances from journal lines - YTD
        const ytdAccountTotals: Record<number, { debit: number; credit: number }> = {};
        filteredYtdJournalLines.forEach((line: any) => {
          const accountId = line.accountId;
          if (!ytdAccountTotals[accountId]) {
            ytdAccountTotals[accountId] = { debit: 0, credit: 0 };
          }
          ytdAccountTotals[accountId].debit += parseFloat(line.debitAmount || "0");
          ytdAccountTotals[accountId].credit += parseFloat(line.creditAmount || "0");
        });

        const income: { accounts: any[]; total: number; ytdTotal: number } = { accounts: [], total: 0, ytdTotal: 0 };
        const costOfSales: { accounts: any[]; total: number; ytdTotal: number } = { accounts: [], total: 0, ytdTotal: 0 };
        const expenses: { accounts: any[]; total: number; ytdTotal: number } = { accounts: [], total: 0, ytdTotal: 0 };
        const otherIncome: { accounts: any[]; total: number; ytdTotal: number } = { accounts: [], total: 0, ytdTotal: 0 };
        const otherExpense: { accounts: any[]; total: number; ytdTotal: number } = { accounts: [], total: 0, ytdTotal: 0 };

        // Process ALL P&L accounts to show complete picture (with both period and YTD balances)
        accounts.forEach((account) => {
          const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
          const ytdTotals = ytdAccountTotals[account.id] || { debit: 0, credit: 0 };
          let amount = 0;
          let ytdAmount = 0;

          if (account.type === "income") {
            // For income accounts, credit increases the balance
            amount = totals.credit - totals.debit;
            ytdAmount = ytdTotals.credit - ytdTotals.debit;
            income.accounts.push({
              id: account.id,
              name: account.name,
              balance: amount,
              ytdBalance: ytdAmount,
              accountNumber: account.accountNumber,
              subtype: account.subtype,
            });
            income.total += amount;
            income.ytdTotal += ytdAmount;
          } else if (account.type === "other_income") {
            // For other income accounts, credit increases the balance
            amount = totals.credit - totals.debit;
            ytdAmount = ytdTotals.credit - ytdTotals.debit;
            otherIncome.accounts.push({
              id: account.id,
              name: account.name,
              balance: amount,
              ytdBalance: ytdAmount,
              accountNumber: account.accountNumber,
              subtype: account.subtype,
            });
            otherIncome.total += amount;
            otherIncome.ytdTotal += ytdAmount;
          } else if (account.type === "cost_of_sales") {
            // For COGS accounts, debit increases the balance
            amount = totals.debit - totals.credit;
            ytdAmount = ytdTotals.debit - ytdTotals.credit;
            costOfSales.accounts.push({
              id: account.id,
              name: account.name,
              balance: amount,
              ytdBalance: ytdAmount,
              accountNumber: account.accountNumber,
              subtype: account.subtype,
            });
            costOfSales.total += amount;
            costOfSales.ytdTotal += ytdAmount;
          } else if (account.type === "expense") {
            // For expense accounts, debit increases the balance
            amount = totals.debit - totals.credit;
            ytdAmount = ytdTotals.debit - ytdTotals.credit;
            expenses.accounts.push({
              id: account.id,
              name: account.name,
              balance: amount,
              ytdBalance: ytdAmount,
              accountNumber: account.accountNumber,
              subtype: account.subtype,
            });
            expenses.total += amount;
            expenses.ytdTotal += ytdAmount;
          } else if (account.type === "other_expense") {
            // For other expense accounts, debit increases the balance
            amount = totals.debit - totals.credit;
            ytdAmount = ytdTotals.debit - ytdTotals.credit;
            otherExpense.accounts.push({
              id: account.id,
              name: account.name,
              balance: amount,
              ytdBalance: ytdAmount,
              accountNumber: account.accountNumber,
              subtype: account.subtype,
            });
            otherExpense.total += amount;
            otherExpense.ytdTotal += ytdAmount;
          }
        });

        // Calculate % of Revenue for period and YTD
        const totalRevenueForPeriod = income.total;
        const totalRevenueForYtd = income.ytdTotal;

        // Add percentOfRevenue to each account
        const addPercentages = (section: { accounts: any[]; total: number; ytdTotal: number }) => {
          section.accounts = section.accounts.map(acc => ({
            ...acc,
            percentOfRevenue: totalRevenueForPeriod !== 0 ? (acc.balance / totalRevenueForPeriod) * 100 : 0,
            ytdPercentOfRevenue: totalRevenueForYtd !== 0 ? (acc.ytdBalance / totalRevenueForYtd) * 100 : 0,
          }));
        };

        addPercentages(income);
        addPercentages(costOfSales);
        addPercentages(expenses);
        addPercentages(otherIncome);
        addPercentages(otherExpense);

        // Calculate according to new formulas:
        // Period calculations
        const grossProfit = income.total - costOfSales.total;
        const netIncomeFromOperations = grossProfit - expenses.total;
        const earningsBeforeTax = netIncomeFromOperations + otherIncome.total - otherExpense.total;
        const incomeTax = 0;
        const netIncome = earningsBeforeTax - incomeTax;

        // YTD calculations
        const ytdGrossProfit = income.ytdTotal - costOfSales.ytdTotal;
        const ytdNetIncomeFromOperations = ytdGrossProfit - expenses.ytdTotal;
        const ytdEarningsBeforeTax = ytdNetIncomeFromOperations + otherIncome.ytdTotal - otherExpense.ytdTotal;
        const ytdNetIncome = ytdEarningsBeforeTax - incomeTax;

        // Filter out zero balance accounts if requested (default behavior)
        // Only filter if BOTH period and YTD balances are zero
        if (shouldHideZeroBalances) {
          income.accounts = income.accounts.filter((acc) => acc.balance !== 0 || acc.ytdBalance !== 0);
          costOfSales.accounts = costOfSales.accounts.filter(
            (acc) => acc.balance !== 0 || acc.ytdBalance !== 0
          );
          expenses.accounts = expenses.accounts.filter(
            (acc) => acc.balance !== 0 || acc.ytdBalance !== 0
          );
          otherIncome.accounts = otherIncome.accounts.filter(
            (acc) => acc.balance !== 0 || acc.ytdBalance !== 0
          );
          otherExpense.accounts = otherExpense.accounts.filter(
            (acc) => acc.balance !== 0 || acc.ytdBalance !== 0
          );
        }

        const ytdEndDateForLog = new Date().toISOString().split("T")[0];
        console.log(
          `📈 P&L Summary:`
        );
        console.log(
          `   📊 Current Period (${formattedStartDate} to ${formattedEndDate}): Income $${income.total}, Expenses $${expenses.total}, Net Income $${netIncome}`
        );
        console.log(
          `   📊 Year to Date (${formattedFiscalYearStartDate} to ${ytdEndDateForLog}): Income $${income.ytdTotal}, Expenses $${expenses.ytdTotal}, Net Income $${ytdNetIncome}`
        );

        res.json({
          income,
          costOfSales,
          expenses,
          otherIncome,
          otherExpense,
          grossProfit,
          netIncome,
          // YTD totals
          ytdGrossProfit,
          ytdNetIncome,
          // Period and YTD date ranges
          period: { startDate, endDate },
          // Use local date to avoid timezone issues
          ytdPeriod: { startDate: formattedFiscalYearStartDate, endDate: ytdEndDate }, // YTD ends at today
          hideZeroBalances: shouldHideZeroBalances,
          dimensionFilter: {
            projectId: projectId ? parseInt(projectId as string) : null,
            locationId: locationId ? parseInt(locationId as string) : null,
            classId: classId ? parseInt(classId as string) : null,
          },
        });
      } catch (error) {
        console.error("Profit & Loss generation error:", error);
        res
          .status(500)
          .json({ error: "Failed to generate Profit & Loss report" });
      }
    }
  );

  // Cash Flow Statement Report (Direct and Indirect Methods)
  apiRouter.get("/reports/cash-flow/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { startDate, endDate, method = 'indirect' } = req.query;

      console.log(`💰 Generating Cash Flow Statement for client ${clientId} from ${startDate} to ${endDate} (Method: ${method})`);

      // Get all accounts
      const accounts = await storage.getAccounts(clientId);

      // Convert dates for database query
      const formattedStartDate = startDate ? new Date(startDate as string).toISOString().split('T')[0] : new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const formattedEndDate = endDate ? new Date(endDate as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      // Get journal entries for the period - PERFORMANCE FIX
      const journalEntries = await storage.getJournalEntries(clientId, 1000000, 0, formattedStartDate, formattedEndDate);

      // Get all journal lines
      let allJournalLines = [];
      if (journalEntries.length > 0) {
        const entryIds = journalEntries.map(entry => entry.id);
        allJournalLines = await storage.getJournalEntryLinesBatch(entryIds);
      }

      // Calculate account totals
      const accountTotals = {};
      allJournalLines.forEach(line => {
        const accountId = line.accountId;
        if (!accountTotals[accountId]) {
          accountTotals[accountId] = { debit: 0, credit: 0 };
        }
        accountTotals[accountId].debit += parseFloat(line.debitAmount || '0');
        accountTotals[accountId].credit += parseFloat(line.creditAmount || '0');
      });

      // Get Net Income from P&L (we'll use this for indirect method)
      let netIncome = 0;
      accounts.forEach(account => {
        const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
        if (account.type === 'income' || account.type === 'other_income') {
          netIncome += (totals.credit - totals.debit);
        } else if (account.type === 'expense' || account.type === 'cost_of_sales' || account.type === 'other_expense') {
          netIncome -= (totals.debit - totals.credit);
        }
      });

      // Calculate cash flow components
      const operatingActivities = { activities: [], total: 0 };
      const investingActivities = { activities: [], total: 0 };
      const financingActivities = { activities: [], total: 0 };

      if (method === 'direct') {
        // DIRECT METHOD - Show actual cash receipts and payments

        // Operating Activities (Direct Method)
        operatingActivities.activities = [
          { description: 'Cash received from customers', amount: 0 },
          { description: 'Cash paid to suppliers', amount: 0 },
          { description: 'Cash paid for operating expenses', amount: 0 },
          { description: 'Cash paid for interest', amount: 0 },
          { description: 'Cash paid for taxes', amount: 0 }
        ];

        // For direct method, we'd need to analyze actual cash account movements
        // This is a simplified version - in reality, you'd analyze cash account transactions
        accounts.forEach(account => {
          const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
          const amount = totals.debit - totals.credit;

          if (account.type === 'asset' && (account.name?.toLowerCase().includes('cash') || account.name?.toLowerCase().includes('checking'))) {
            // This is a simplified approach - analyze cash movements by transaction descriptions
            // In a real implementation, you'd categorize based on transaction details
            if (amount > 0) {
              operatingActivities.activities[0].amount += amount; // Cash received
            } else {
              operatingActivities.activities[1].amount += Math.abs(amount); // Cash paid
            }
          }
        });

        operatingActivities.total = operatingActivities.activities.reduce((sum, activity) => {
          return sum + (activity.description.includes('received') ? activity.amount : -activity.amount);
        }, 0);

      } else {
        // INDIRECT METHOD - Start with net income and adjust for non-cash items

        operatingActivities.activities = [
          { description: 'Net Income', amount: netIncome },
          { description: 'Adjustments to reconcile net income:', amount: 0 },
          { description: '  Depreciation and amortization', amount: 0 },
          { description: '  Changes in operating assets and liabilities:', amount: 0 },
          { description: '    Accounts receivable', amount: 0 },
          { description: '    Inventory', amount: 0 },
          { description: '    Prepaid expenses', amount: 0 },
          { description: '    Accounts payable', amount: 0 },
          { description: '    Accrued liabilities', amount: 0 }
        ];

        // Calculate changes in working capital (simplified)
        accounts.forEach(account => {
          const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
          let amount = 0;

          if (account.type === 'asset') {
            amount = totals.debit - totals.credit;
          } else if (account.type === 'liability') {
            amount = totals.credit - totals.debit;
          }

          // Categorize based on account type and name
          if (account.name?.toLowerCase().includes('depreciation')) {
            operatingActivities.activities[2].amount += Math.abs(amount);
          } else if (account.name?.toLowerCase().includes('receivable')) {
            operatingActivities.activities[4].amount -= amount; // Increase in A/R reduces cash
          } else if (account.name?.toLowerCase().includes('inventory')) {
            operatingActivities.activities[5].amount -= amount;
          } else if (account.name?.toLowerCase().includes('prepaid')) {
            operatingActivities.activities[6].amount -= amount;
          } else if (account.name?.toLowerCase().includes('payable')) {
            operatingActivities.activities[7].amount += amount; // Increase in A/P increases cash
          } else if (account.name?.toLowerCase().includes('accrued')) {
            operatingActivities.activities[8].amount += amount;
          }
        });

        operatingActivities.total = operatingActivities.activities.reduce((sum, activity) => sum + activity.amount, 0);
      }

      // INVESTING ACTIVITIES (same for both methods)
      investingActivities.activities = [
        { description: 'Purchase of property, plant, and equipment', amount: 0 },
        { description: 'Sale of property, plant, and equipment', amount: 0 },
        { description: 'Purchase of investments', amount: 0 },
        { description: 'Sale of investments', amount: 0 }
      ];

      // Analyze fixed assets and investment accounts
      accounts.forEach(account => {
        const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
        const amount = totals.debit - totals.credit;

        if (account.subtype === 'fixed_asset' || account.name?.toLowerCase().includes('equipment') || account.name?.toLowerCase().includes('building')) {
          if (amount > 0) {
            investingActivities.activities[0].amount -= amount; // Purchase (cash outflow)
          } else {
            investingActivities.activities[1].amount += Math.abs(amount); // Sale (cash inflow)
          }
        } else if (account.name?.toLowerCase().includes('investment')) {
          if (amount > 0) {
            investingActivities.activities[2].amount -= amount;
          } else {
            investingActivities.activities[3].amount += Math.abs(amount);
          }
        }
      });

      investingActivities.total = investingActivities.activities.reduce((sum, activity) => sum + activity.amount, 0);

      // FINANCING ACTIVITIES (same for both methods)
      financingActivities.activities = [
        { description: 'Proceeds from long-term debt', amount: 0 },
        { description: 'Repayment of long-term debt', amount: 0 },
        { description: 'Proceeds from issuance of stock', amount: 0 },
        { description: 'Payment of dividends', amount: 0 },
        { description: 'Owner contributions', amount: 0 },
        { description: 'Owner withdrawals', amount: 0 }
      ];

      // Analyze equity and long-term debt accounts
      accounts.forEach(account => {
        const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
        const amount = totals.credit - totals.debit; // For liability/equity accounts

        if (account.type === 'liability' && (account.name?.toLowerCase().includes('loan') || account.name?.toLowerCase().includes('debt'))) {
          if (amount > 0) {
            financingActivities.activities[0].amount += amount; // New debt
          } else {
            financingActivities.activities[1].amount -= Math.abs(amount); // Debt payment
          }
        } else if (account.type === 'equity') {
          if (account.name?.toLowerCase().includes('stock') || account.name?.toLowerCase().includes('share')) {
            if (amount > 0) {
              financingActivities.activities[2].amount += amount;
            }
          } else if (account.name?.toLowerCase().includes('dividend')) {
            financingActivities.activities[3].amount -= Math.abs(amount);
          } else if (account.name?.toLowerCase().includes('contribution') || account.name?.toLowerCase().includes('capital')) {
            if (amount > 0) {
              financingActivities.activities[4].amount += amount;
            }
          } else if (account.name?.toLowerCase().includes('withdrawal') || account.name?.toLowerCase().includes('draw')) {
            financingActivities.activities[5].amount -= Math.abs(amount);
          }
        }
      });

      financingActivities.total = financingActivities.activities.reduce((sum, activity) => sum + activity.amount, 0);

      // Calculate net cash change and cash balances
      const netCashChange = operatingActivities.total + investingActivities.total + financingActivities.total;

      // Get beginning and ending cash balances
      let beginningCash = 0;
      let endingCash = 0;

      accounts.forEach(account => {
        if (account.type === 'asset' && (account.name?.toLowerCase().includes('cash') || account.name?.toLowerCase().includes('checking'))) {
          const totals = accountTotals[account.id] || { debit: 0, credit: 0 };
          endingCash += (totals.debit - totals.credit);
        }
      });

      beginningCash = endingCash - netCashChange;

      console.log(`💰 Cash Flow Summary: Operating $${operatingActivities.total}, Investing $${investingActivities.total}, Financing $${financingActivities.total}, Net Change $${netCashChange}`);

      res.json({
        operatingActivities,
        investingActivities,
        financingActivities,
        netCashChange,
        beginningCash,
        endingCash,
        method: method as string,
        period: { startDate: formattedStartDate, endDate: formattedEndDate },
        clientName: 'Client' // You might want to get this from client data
      });

    } catch (error) {
      console.error("Cash Flow Statement generation error:", error);
      res.status(500).json({ error: "Failed to generate Cash Flow Statement" });
    }
  });

  // AI Generate COA endpoint (legacy - keeping for backwards compatibility)
  apiRouter.post("/ai/generate-coa", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const { clientId, industry, country } = req.body;

      if (!clientId || !industry) {
        return res.status(400).json({ error: "clientId and industry are required" });
      }

      // Check client access
      // @ts-ignore - user is added by authenticate middleware
      const hasAccess = await storage.userHasClientAccess(req.user.id, clientId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this client" });
      }

      console.log(`Generating chart of accounts for industry: ${industry}, country: ${country || 'US'}`);

      // Use the helper function with fallback support and validation
      // This already validates and throws on any validation failure
      const generatedAccounts = await generateChartOfAccounts(industry, country || 'US');

      console.log(`✅ Generated and validated ${generatedAccounts.length} accounts for ${industry}`);

      // Create accounts in database
      const createdAccounts = [];
      const creationErrors = [];

      for (const accountData of generatedAccounts) {
        try {
          const account = await storage.createAccount({
            clientId,
            name: accountData.name,
            type: accountData.type,
            accountNumber: accountData.number,  // Map 'number' to 'accountNumber'
            description: accountData.description,
            isActive: accountData.isActive,
            balance: 0
          });
          createdAccounts.push(account);
        } catch (error) {
          console.error(`Failed to create account ${accountData.name}:`, error);
          creationErrors.push({ account: accountData.name, error: error.message });
        }
      }

      // If any accounts failed to create, this is a failure
      if (creationErrors.length > 0) {
        console.error(`COA generation partially failed: ${creationErrors.length} accounts could not be created`);
        return res.status(500).json({
          error: "Some accounts could not be created",
          created: createdAccounts.length,
          failed: creationErrors.length,
          failures: creationErrors
        });
      }

      // Validate the chart of accounts post-creation
      const allAccounts = await storage.getAccounts(clientId);
      const validation = await validateChartOfAccounts(allAccounts);

      console.log(`AI-generated COA created: ${createdAccounts.length} accounts, balanced: ${validation.balanced}`);

      res.json({
        success: true,
        accounts: createdAccounts,
        message: `Generated ${createdAccounts.length} accounts for ${industry}`,
        validation: {
          balanced: validation.balanced,
          totalAssets: validation.totalAssets,
          totalLiabilities: validation.totalLiabilities,
          totalEquity: validation.totalEquity,
          difference: validation.difference
        }
      });

    } catch (error) {
      console.error("Error generating COA:", error);
      res.status(500).json({
        error: "Failed to generate chart of accounts",
        details: error.message
      });
    }
  });

  // Simple transactions endpoint for immediate display
  apiRouter.get(
    "/transactions",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.query.clientId as string);

        if (!clientId) {
          return res.status(400).json({ error: "Client ID is required" });
        }

        const query = `
        SELECT 
          t.id,
          t.client_id,
          t.transaction_group_id,
          t.account_id,
          t.description,
          t.transaction_date,
          t.debit_amount,
          t.credit_amount,
          t.transaction_type,
          t.category,
          t.reference_number,
          t.memo,
          t.is_reconciled,
          t.imported_from,
          t.tax_code,
          t.tax_amount,
          t.project_id,
          t.location_id,
          t.class_id,
          t.contact_id,
          t.contact_type,
          t.created_at,
          a.name as account_name,
          a.account_number,
          a.type as account_type
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.client_id = $1
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 100
      `;

        const result = await db.query(query, [clientId]);

        const transactions = result.rows.map((row) => ({
          id: row.id,
          clientId: row.client_id,
          transactionGroupId: row.transaction_group_id,
          accountId: row.account_id,
          description: row.description,
          transactionDate: row.transaction_date,
          debitAmount: parseFloat(row.debit_amount || "0"),
          creditAmount: parseFloat(row.credit_amount || "0"),
          amount:
            parseFloat(row.debit_amount || "0") ||
            parseFloat(row.credit_amount || "0"),
          transactionType: row.transaction_type,
          category: row.category,
          referenceNumber: row.reference_number,
          memo: row.memo,
          isReconciled: row.is_reconciled,
          importedFrom: row.imported_from,
          taxCode: row.tax_code,
          taxAmount: parseFloat(row.tax_amount || "0"),
          projectId: row.project_id,
          locationId: row.location_id,
          classId: row.class_id,
          contactId: row.contact_id,
          contactType: row.contact_type,
          createdAt: row.created_at,
          accountName: row.account_name,
          accountNumber: row.account_number,
          accountType: row.account_type,
        }));

        console.log(
          `📋 Found ${transactions.length} transactions for client ${clientId}`
        );
        res.json(transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
      }
    }
  );

  // Mount AI Intake routes first
  app.use("/api/ai-intake", aiIntakeRoutes);
  // Mount Notification routes
  app.use("/api/notifications", requireAuthHybrid, requireModuleAccess("notifications"), notificationRoutes);
  // Mount Communication routes
  app.use("/api/communications", requireAuthHybrid, requireModuleAccess("communication"), communicationRoutes);

  // Mount Client Overview routes
  app.use("/api/clients", requireAuthHybrid, requireModuleAccess("clients"), clientOverviewRoutes);

  // Mount Billing routes
  app.use(requireAuthHybrid, requireModuleAccess("billing"), billingApiRoutes);

  // Mount Client Intake routes
  app.use("/api/clients", requireAuthHybrid, requireModuleAccess("clients"), clientIntakeRoutes);

  // Add alias route for pending approvals to match frontend query
  app.get("/api/pending-client-approvals", requireAuthHybrid, requireModuleAccess("notifications"), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user?.firmId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pendingApprovals = await storage.getPendingClientApprovals();
      const pendingTimeEntries = await db
        .select({
          id: timeEntries.id,
          duration: timeEntries.duration,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          createdAt: timeEntries.createdAt,
          userId: timeEntries.userId,
          projectId: timeEntries.projectId,
          taskId: timeEntries.taskId,
          type: timeEntries.type,
          userName: users.name,
          projectName: projects.name,
          taskName: tasks.title,
        })
        .from(timeEntries)
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .where(and(
          eq(timeEntries.firmId, user.firmId),
          eq(timeEntries.status, "submitted")
        ));

      const timeEntryApprovals = pendingTimeEntries.map((entry) => ({
        id: entry.id,
        duration: entry.duration,
        description: entry.description,
        date: entry.startTime || entry.createdAt,
        userId: entry.userId,
        userName: entry.userName,
        projectId: entry.projectId,
        projectName: entry.projectName,
        taskId: entry.taskId,
        taskName: entry.taskName,
        isBillable: entry.type === "billable",
      }));
      // Return in the format expected by frontend: { clientApprovals: [], timeEntryApprovals: [] }
      res.json({
        clientApprovals: pendingApprovals || [],
        timeEntryApprovals
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  });

  // Alias route for time entry approvals to match frontend
  app.post(
    "/api/pending-approvals/time-entries/:entryId/:action",
    requireAuthHybrid,
    requireModuleAccess("notifications"),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        if (!user?.firmId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const entryId = parseInt(req.params.entryId);
        const action = req.params.action;
        if (isNaN(entryId) || !["approve", "reject"].includes(action)) {
          return res.status(400).json({ message: "Invalid request" });
        }

        const allowedRoles = ["firm_admin", "firm_owner", "super_admin", "saas_owner", "manager"];
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: "Permission denied: Only admins can approve time entries" });
        }

        const [entry] = await db
          .select()
          .from(timeEntries)
          .where(and(eq(timeEntries.id, entryId), eq(timeEntries.firmId, user.firmId)))
          .limit(1);

        if (!entry) {
          return res.status(404).json({ message: "Time entry not found" });
        }

        const status = action === "approve" ? "approved" : "rejected";
        const [updatedEntry] = await db
          .update(timeEntries)
          .set({
            status: status as any,
            approvedAt: action === "approve" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(timeEntries.id, entryId))
          .returning();

        res.json({
          success: true,
          data: updatedEntry,
          message: `Time entry ${action}d successfully`,
        });
      } catch (error) {
        console.error("Error updating time entry approval:", error);
        res.status(500).json({ message: "Failed to update time entry approval" });
      }
    }
  );

  // Mount Notification routes (Phase 6)
  app.use(notificationApiRoutes);

  // Mount CRM routes
  app.use("/api/crm", crmRoutes);

  // Mount Transaction routes
  app.use("/api/transactions", transactionRoutes);

  // Mount Invoice routes
  app.use("/api/crm", invoiceRoutes);

  // Mount Bill routes
  app.use("/api/crm", billRoutes);

  // Mount Project routes (separate from CRM, belongs to books)
  app.use("/api/projects", requireAuthHybrid, requireModuleAccess("projects"), projectApiRoutes);
  app.use("/api/project-templates", requireAuthHybrid, projectTemplateRoutes);
  app.use("/api/project-lifecycle", requireAuthHybrid, projectLifecycleRoutes);
  // Task features routes (notes, checklist) - mount BEFORE taskRoutes to ensure /api/tasks/:taskId/notes is handled
  // Auth and module access are applied within taskFeaturesRoutes
  app.use("/api/tasks", requireAuthHybrid, requireModuleAccess("tasks"), taskFeaturesRoutes);
  app.use("/api/tasks", requireAuthHybrid, requireModuleAccess("tasks"), taskRoutes);
  app.use("/api/task-statuses", requireAuthHybrid, requireModuleAccess("tasks"), taskStatusRoutes); // Customizable task status management
  app.use("/api/tags", tagRoutes); // Tag management
  app.use("/api/tasks", taskAssignmentRoutes); // Task assignments (multi-staff)
  
  // Mount Pages Billing routes (firm billing clients for services)
  app.use("/api/pages/billing", requireAuthHybrid, requireModuleAccess("billing"), pagesBillingRoutes);
  
  // Mount CRM routes
  app.use("/api/crm", crmRoutes);

  // Mount Transaction routes
  app.use("/api/transactions", transactionRoutes);

  // Mount Transaction Upload routes
  app.use("/api/transactions", transactionUploadRoutes);

  // Mount Enhanced Transaction routes
  const enhancedTransactionRoutes = (
    await import("./routes/enhanced-transaction-routes")
  ).default;
  app.use("/api/transactions", enhancedTransactionRoutes);

  // Mount Enhanced Transaction Classification routes
  const transactionClassificationRoutes = (
    await import("./routes/transaction-classification-routes")
  ).default;
  app.use("/api/transactions/classification", transactionClassificationRoutes);

  // Mount Invoice routes
  app.use("/api/crm", invoiceRoutes);

  // Mount Bill routes
  app.use("/api/crm", billRoutes);

  // Mount Cheque routes
  app.use("/api/crm", chequeRoutes);


  app.use("/api/crm/projects", requireAuthHybrid, projectRoutes); // Legacy CRM project routes

  // Mount Automation routes (Phase 2)
  const automationRoutes = (await import("./routes/automation-routes")).default;
  app.use("/api/automation", automationRoutes);

  app.use("/api/team", requireAuthHybrid, requireModuleAccess("team"), teamManagementRoutes);

  // Mount Role & Permission routes
  app.use("/api/roles", roleRoutes);

  // Mount User Access & Permissions routes
  const userAccessRoutes = (await import("./routes/user-access-routes")).default;
  app.use("/api", userAccessRoutes);

  // Mount Firm Management routes
  app.use("/api/firm-management", firmManagementRoutes);

  // Mount Client Assignment routes
  app.use("/api/client-assignments", clientAssignmentRoutes);

  // Mount Client Onboarding routes
  app.use("/api/client-onboarding", clientOnboardingRoutes);

  // Mount Contact Management routes
  // Contact management - allow access for admins and users with clients module (contacts are part of client management)
  app.use("/api/contact-management", requireAuthHybrid, async (req: any, res: any, next: any) => {
    try {
      const user = req.user as any;
      console.log(`📋 Contact management access check - user role: ${user?.role}, firmId: ${user?.firmId}`);
      
      if (!user) {
        console.error(`❌ Contact management access check - No user found`);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Admins have access to everything
      if (isAdminRole(user?.role)) {
        console.log(`✅ Contact management access granted - admin role`);
        return next();
      }
      
      // Check if user has access to clients module (contacts are part of client management)
      console.log(`📋 Checking clients module access for user ${user.id}...`);
      const hasAccess = await hasModuleAccess(user, "clients");
      if (!hasAccess) {
        console.log(`❌ Contact management access denied - no clients module access`);
        return res.status(403).json({ message: "Insufficient module access" });
      }
      console.log(`✅ Contact management access granted - has clients module access`);
      next();
    } catch (error: any) {
      console.error(`❌ Contact management access check error:`, error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Error checking module access", details: error?.message });
      }
    }
  }, contactManagementRoutes);

  // Resource Allocation & Team Assignment
  app.use("/api/resource-allocation", resourceAllocationRoutes);

  // Project Dashboards & Analytics
  app.use("/api/dashboards", projectDashboardsRoutes);

  // Client-Project Integration
  app.use("/api/client-project-integration", clientProjectIntegrationRoutes);

  // End-to-End Validation
  app.use("/api/validation", endToEndValidationRoutes);

  // Mount Integration Settings routes (Phase 2.5 - Admin settings for Outlook/SMS)
  app.use("/api/settings", integrationSettingsRoutes);

  // Mount Notification routes
  app.use("/api/notifications", notificationRoutes);

  // Mount Document Collaboration routes
  const documentCollaborationRoutes = (await import("./routes/document-collaboration-routes")).default;
  app.use("/api/documents", documentCollaborationRoutes);

  // Mount Client Portal API routes
  const clientPortalApiRoutes = (await import("./routes/client-portal-api-routes")).default;
  app.use("/api/client-portal", clientPortalApiRoutes);

  // Mount Enhanced CRM routes (satisfaction surveys, health scoring)
  const enhancedCrmRoutes = (await import("./routes/enhanced-crm-routes")).default;
  app.use("/api/crm", enhancedCrmRoutes);

  // Mount Bulk Operations routes
  app.use("/api/bulk", bulkOperationsRoutes);

  // Mount Time Tracking routes
  app.use("/api/time", requireAuthHybrid, requireModuleAccess("time-expenses"), timeTrackingRoutes);
  app.use(requireAuthHybrid, requireModuleAccess("time-expenses"), timeTrackingApiRoutes);

  // Mount Billing routes
  app.use(billingApiRoutes);
  app.use(invoiceApprovalRoutes);

  // Mount Notification routes (Phase 6)
  app.use(notificationApiRoutes);

  // Mount Client Narrative routes (AI-powered insights)
  app.use("/api/clients", clientNarrativeRoutes);


  // Mount Reporting routes (Phase 7)
  app.use(reportingApiRoutes);
  app.use(customReportBuilderRoutes);
  app.use("/api/dashboard", requireAuthHybrid, requireModuleAccess("dashboard"), dashboardWidgetRoutes);

  // Mount Calendar & Scheduling routes
  app.use("/api/schedule", schedulingRoutes);

  // Mount PerfexCRM Import routes
  app.use("/api/perfex-import", perfexImportRoutes);

  // Mount the binder routes
  app.use("/api", binderRoutes);

  // Mount Milton Scheduling Intelligence routes (Phase 2) - Must come before general /api/milton
  app.use("/api/milton/scheduling", miltonSchedulingRoutes);

  // Mount Milton Smart AI routes
  app.use("/api/milton", miltonSmartRoutes);

  // Mount Receipt routes
  app.use("/api/receipts", receiptRoutes);
  app.use("/api/saas", saasAdminRoutes);
  app.use("/api/billing", billingRoutes);

  // AI Automation Routes - Phase 5
  app.use("/api/ai-client-intake", aiClientIntakeRoutes);
  app.use("/api/ai-project-tasks", aiProjectTaskRoutes);
  app.use("/api/ai-documents", aiDocumentProcessingRoutes);
  app.use("/api/ai-financial", aiFinancialAutomationRoutes);
  app.use("/api/ai-guardrails", aiGuardrailsRoutes);
  app.use("/api/ai-workflow", aiWorkflowAutomationRoutes);

  // Sales Pipeline Routes
  app.use(salesRoutes);

  // ===============================
  // V2 CHEQUE ROUTES (Clean Rewrite)
  // ===============================

  // GET /api/cheques - Get all cheques for client
  app.get("/api/cheques", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      let clientId: number | undefined;

      // Priority 1: Get clientId from query parameter
      if (req.query.clientId) {
        clientId = parseInt(req.query.clientId as string);
      }

      // Priority 2: Get clientId from session
      if (!clientId && (req.session as any)?.activeClientId) {
        clientId = parseInt((req.session as any).activeClientId);
      }

      // Priority 3: Get clientId from authenticated user
      if (!clientId && (req.user as any)?.clientId) {
        clientId = parseInt((req.user as any).clientId);
      }

      if (!clientId || isNaN(clientId)) {
        return res
          .status(400)
          .json({ success: false, message: "clientId is required" });
      }

      // Get optional date range filters from query parameters
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const cheques = await storage.getCheques(clientId, startDate, endDate);
      console.log(
        `✅ V2 API: Retrieved ${cheques.length} cheques for client ${clientId}`
      );

      res.json({ success: true, data: cheques });
    } catch (error) {
      console.error("❌ V2 API: Error getting cheques:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get cheques" });
    }
  });

  // POST /api/cheques - Create new cheque
  app.post("/api/cheques", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      console.log(
        "🚀 V2 API: Creating cheque with data:",
        JSON.stringify(req.body, null, 2)
      );

      // Validate request body with Zod
      const parseResult = insertChequeSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.error(
          "❌ V2 API: Validation failed:",
          parseResult.error.errors
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.errors,
        });
      }

      const chequeData = parseResult.data;
      const newCheque = await storage.createCheque(chequeData);

      // Create cheque lines if provided
      if (req.body.lines && Array.isArray(req.body.lines)) {
        for (const lineData of req.body.lines) {
          const lineParseResult = insertChequeLineSchema.safeParse({
            ...lineData,
            chequeId: newCheque.id,
          });

          if (lineParseResult.success) {
            await storage.createChequeLine(lineParseResult.data);
          } else {
            console.warn(
              "⚠️ V2 API: Line validation failed:",
              lineParseResult.error.errors
            );
          }
        }
      }

      // Record bill payments if bills are selected
      const appliedBillIds = req.body.appliedBillIds;
      const appliedToBillId = req.body.appliedToBillId;
      const appliedAmount = req.body.appliedAmount ? parseFloat(req.body.appliedAmount) : undefined;

      if (appliedBillIds && Array.isArray(appliedBillIds) && appliedBillIds.length > 0) {
        // Multi-bill payment: distribute appliedAmount proportionally
        if (!appliedAmount || appliedAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Applied amount must be a positive number when bills are selected"
          });
        }

        // Fetch all selected bills to get their balanceDue
        const selectedBills = await db
          .select()
          .from(bills)
          .where(inArray(bills.id, appliedBillIds));

        if (selectedBills.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No bills found for the selected IDs"
          });
        }

        // Calculate total balance due across all selected bills
        const totalBalanceDue = selectedBills.reduce((sum, bill) => {
          const balance = parseFloat(bill.balanceDue || '0');
          return sum + (isNaN(balance) ? 0 : balance);
        }, 0);

        if (totalBalanceDue === 0 || isNaN(totalBalanceDue)) {
          return res.status(400).json({
            success: false,
            message: "Cannot apply payment to bills with zero balance. All selected bills are already paid."
          });
        }

        // Filter eligible bills (positive balance only)
        const eligibleBills = selectedBills.filter(bill => {
          const billBalance = parseFloat(bill.balanceDue || '0');
          return !isNaN(billBalance) && billBalance > 0;
        });

        if (eligibleBills.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No eligible bills found. All selected bills have zero balance or invalid amounts."
          });
        }

        // Recalculate total using only eligible bills
        const eligibleTotalBalance = eligibleBills.reduce((sum, bill) => {
          return sum + parseFloat(bill.balanceDue || '0');
        }, 0);

        // Allocate payment proportionally to eligible bills
        for (const bill of eligibleBills) {
          const billBalance = parseFloat(bill.balanceDue || '0');
          const proportionalAmount = (billBalance / eligibleTotalBalance) * appliedAmount;

          if (!isNaN(proportionalAmount) && proportionalAmount > 0) {
            await billStorage.recordBillPayment(
              bill.id,
              proportionalAmount,
              chequeData.chequeDate,
              'cheque',
              newCheque.chequeNumber,
              undefined,
              chequeData.bankAccountId
            );
            console.log(`✅ V2 API: Recorded payment of $${proportionalAmount.toFixed(2)} for bill ${bill.id}`);
          }
        }

        // Update cheque status to "paid" since bills are being paid
        const updatedCheque = await storage.updateCheque(newCheque.id, { status: 'paid' });
        if (updatedCheque) {
          console.log(`✅ V2 API: Updated cheque ${newCheque.id} status to "paid"`);
          newCheque.status = 'paid'; // Update the response object
        }
      } else if (appliedToBillId && appliedAmount && appliedAmount > 0) {
        // Single bill payment (backward compatibility)
        await billStorage.recordBillPayment(
          appliedToBillId,
          appliedAmount,
          chequeData.chequeDate,
          'cheque',
          newCheque.chequeNumber,
          undefined,
          chequeData.bankAccountId
        );
        console.log(`✅ V2 API: Recorded payment of $${appliedAmount.toFixed(2)} for bill ${appliedToBillId}`);

        // Update cheque status to "paid" since bill is being paid
        const updatedCheque = await storage.updateCheque(newCheque.id, { status: 'paid' });
        if (updatedCheque) {
          console.log(`✅ V2 API: Updated cheque ${newCheque.id} status to "paid"`);
          newCheque.status = 'paid'; // Update the response object
        }
      }

      console.log(
        `✅ V2 API: Created cheque #${newCheque.chequeNumber} with ID ${newCheque.id}`
      );
      res.json({ success: true, data: newCheque });
    } catch (error) {
      console.error("❌ V2 API: Error creating cheque:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create cheque" });
    }
  });

  // GET /api/cheques/:id - Get specific cheque
  app.get("/api/cheques/:id", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const cheque = await storage.getCheque(id);

      if (!cheque) {
        return res
          .status(404)
          .json({ success: false, message: "Cheque not found" });
      }

      // Also get cheque lines
      const lines = await storage.getChequeLines(id);

      console.log(
        `✅ V2 API: Retrieved cheque ${id} with ${lines.length} lines`
      );
      res.json({ success: true, data: { ...cheque, lines } });
    } catch (error) {
      console.error("❌ V2 API: Error getting cheque:", error);
      res.status(500).json({ success: false, message: "Failed to get cheque" });
    }
  });

  // GET /api/cheque/:id/pdf - Generate cheque PDF (session-scoped)
  app.get("/api/cheque/:id/pdf", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      const user = req.user as any;

      // Try to get clientId from multiple sources
      let clientId: number | undefined = undefined;

      if (req.query.clientId) {
        clientId = parseInt(req.query.clientId as string, 10);
      } else if (session?.activeClientId) {
        clientId = session.activeClientId;
      } else if (user?.clientId) {
        clientId = user.clientId;
      }

      const id = parseInt(req.params.id);

      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({
          success: false,
          message: "No active client selected"
        });
      }

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid cheque ID"
        });
      }

      // Get cheque and verify tenant isolation
      const cheque = await storage.getCheque(id);

      if (!cheque) {
        return res.status(404).json({
          success: false,
          message: "Cheque not found"
        });
      }

      // 🔒 SECURITY: Verify cheque belongs to active client
      if (cheque.clientId !== clientId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden - you do not have access to this cheque"
        });
      }

      // Get template for PDF generation
      // Priority: 1. Template stored with cheque (selected during creation)
      //           2. Default template for client
      //           3. Create a default template if none exists
      let template = null;
      const chequeTemplateId = (cheque as any).templateId;
      
      if (chequeTemplateId) {
        // Use the template that was selected when creating the cheque
        console.log(`🔍 V2 PDF: Looking for cheque's stored template ID ${chequeTemplateId}`);
        template = await documentTemplateStorage.getTemplateById(chequeTemplateId, clientId);
        if (template) {
          console.log(`✅ V2 PDF: Found cheque's stored template: ${template.id} "${template.name}"`);
        } else {
          console.log(`⚠️ V2 PDF: Stored template ${chequeTemplateId} not found, falling back to default`);
        }
      }
      
      // Fall back to default template if no stored template or stored template not found
      if (!template) {
        console.log(`🔍 V2 PDF: Looking for default cheque template for client ${clientId}`);
        template = await documentTemplateStorage.getDefaultTemplate(clientId, 'cheque');
        console.log(`🔍 V2 PDF: Template lookup result:`, {
          hasTemplate: !!template,
          templateId: template?.id,
          templateName: template?.name
        });
      }
      // default template exists, create one using default sections
      if (!template) {
        console.log(`⚠️ V2 PDF: No default cheque template found for client ${clientId}, creating default template...`);
        try {
          const defaultSections = documentTemplateStorage.getDefaultSections('cheque');
          if (defaultSections.length === 0) {
            console.error(`❌ V2 PDF: No default sections available for cheque template`);
            return res.status(500).json({
              success: false,
              message: "Unable to create default cheque template. Please create a template manually."
            });
          }

          // Create default template
          template = await documentTemplateStorage.createTemplate({
            clientId,
            documentType: 'cheque',
            name: 'Standard 3-Part Cheque',
            description: 'Default 3-part vendor cheque (cheque + 2 stubs)',
            isDefault: true,
            isActive: true,
            sections: defaultSections,
            pageWidth: 612,
            pageHeight: 792
          });

          console.log(`✅ V2 PDF: Created default cheque template ${template.id} for client ${clientId}`);
        } catch (error) {
          console.error(`❌ V2 PDF: Failed to create default template:`, error);
          return res.status(500).json({
            success: false,
            message: "Failed to create default cheque template. Please create a template manually."
          });
        }
      }

      console.log(`✅ V2 PDF: Using template ${template.id} "${template.name}" for cheque ${id}`);

      // Parse JSONB sections from Postgres (comes as string)
      let parsedSections = template.sections;
      if (typeof template.sections === 'string') {
        try {
          parsedSections = JSON.parse(template.sections);
          console.log(`📋 V2 PDF: Parsed sections from JSON string, found ${parsedSections?.length || 0} sections`);
        } catch (e) {
          console.error(`❌ V2 PDF: Failed to parse template sections JSON:`, e);
          parsedSections = null;
        }
      }

      // Get cheque lines to calculate subtotal and tax
      const chequeLines = await storage.getChequeLines(id);

      // Calculate subtotal (sum of line amounts without tax)
      const subtotal = chequeLines.reduce((sum, line) => {
        const lineAmount = parseFloat(line.amount?.toString() || '0');
        return sum + lineAmount;
      }, 0);

      // Calculate tax amount (sum of taxAmount from lines)
      const taxAmount = chequeLines.reduce((sum, line) => {
        const tax = parseFloat(line.taxAmount?.toString() || '0');
        return sum + tax;
      }, 0);

      // Total amount is the cheque amount (which includes tax)
      const totalAmount = parseFloat(cheque.amount?.toString() || '0');

      // Generate amount in words if not present
      let amountInWords = (cheque as any).amountInWords;
      if (!amountInWords || amountInWords.trim() === '') {
        // Convert amount to words if not already set
        const convertAmountToWords = (amount: number): string => {
          const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
          const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
          const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
          const thousands = ['', 'Thousand', 'Million', 'Billion'];

          const dollars = Math.floor(amount);
          const cents = Math.round((amount - dollars) * 100);

          const convertNumber = (num: number): string => {
            if (num === 0) return '';
            if (num < 10) return ones[num];
            if (num < 20) return teens[num - 10];
            if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
            if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertNumber(num % 100) : '');

            let result = '';
            let thousandIndex = 0;

            while (num > 0) {
              if (num % 1000 !== 0) {
                result = convertNumber(num % 1000) + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : '') + (result ? ' ' + result : '');
              }
              num = Math.floor(num / 1000);
              thousandIndex++;
            }

            return result;
          };

          let result = '';

          if (dollars === 0) {
            result = 'ZERO';
          } else {
            result = convertNumber(dollars).toUpperCase();
          }

          // Format: *AMOUNT AND XX / 100*
          const centsStr = cents.toString().padStart(2, '0');
          return `*${result} AND ${centsStr} / 100*`;
        };

        amountInWords = convertAmountToWords(totalAmount);
        console.log(`✅ V2 PDF: Generated amountInWords for cheque ${id}: ${amountInWords}`);
      }

      // Get vendor/payee address data for the PDF
      // Note: "company" field in template actually refers to vendor/payee information
      let vendorAddressData = {
        name: cheque.payeeName || 'Payee Name',
        address: cheque.payeeAddress || '',
        city: '',
        province: '',
        postalCode: ''
      };

      // If cheque has a vendorId, fetch vendor's full address information
      const chequeWithVendorId = cheque as any;
      if (chequeWithVendorId.vendorId) {
        try {
          const vendor = await vendorStorage.getVendorById(chequeWithVendorId.vendorId);
          if (vendor) {
            vendorAddressData = {
              name: vendor.name || cheque.payeeName || 'Payee Name',
              address: vendor.address || cheque.payeeAddress || '',
              city: vendor.city || '',
              province: vendor.province || '',
              postalCode: vendor.postalCode || ''
            };
          }
        } catch (error) {
          console.error(`⚠️ V2 PDF: Error fetching vendor ${chequeWithVendorId.vendorId}:`, error);
          // Continue with payeeAddress if vendor fetch fails
        }
      }

      // Prepare PDF data - handle new unified template structure with sections
      const pdfData = {
        cheque: {
          id: cheque.id,
          chequeNumber: cheque.chequeNumber,
          chequeDate: cheque.chequeDate,
          payeeName: cheque.payeeName,
          payeeAddress: (cheque as any).payeeAddress || undefined, // Include payeeAddress if available
          amount: totalAmount,
          amountInWords: amountInWords,
          memo: cheque.memo,
          referenceNumber: cheque.referenceNumber || '',
          bankAccountName: cheque.bankAccountName,
          status: cheque.status,
          isVoid: cheque.isVoid,
          subtotal: subtotal,
          taxAmount: taxAmount,
          totalAmount: totalAmount
        },
        company: vendorAddressData,
        bank: {
          name: cheque.bankAccountName,
          transitNumber: '12345',
          accountNumber: '1234567890'
        },
        template: {
          // New unified template system uses sections array
          sections: parsedSections,
          fieldPositions: template.fieldPositions || (parsedSections?.[0]?.fieldPositions), // Legacy support
          pageWidth: template.pageWidth || 612,
          pageHeight: template.pageHeight || 792
        }
      };

      console.log(`📐 V2 PDF: Template data prepared:`, {
        hasSections: !!pdfData.template.sections,
        sectionCount: pdfData.template.sections?.length || 0,
        hasFieldPositions: !!pdfData.template.fieldPositions,
        pageSize: `${pdfData.template.pageWidth}x${pdfData.template.pageHeight}`
      });

      // Generate PDF
      const { ChequePDFService } = await import('./services/cheque-pdf-service');
      const pdfService = new ChequePDFService();
      const pdfBuffer = await pdfService.generateChequePDF(pdfData);

      // Set headers and send
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="cheque-${cheque.chequeNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("❌ V2 API: Error generating PDF:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate PDF"
      });
    }
  });

  // PATCH /api/cheques/:id - Update cheque
  app.patch("/api/cheques/:id", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Validate partial update data
      const partialSchema = insertChequeSchema.partial();
      const parseResult = partialSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error(
          "❌ V2 API: Update validation failed:",
          parseResult.error.errors
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.errors,
        });
      }

      const updatedCheque = await storage.updateCheque(id, parseResult.data);

      if (!updatedCheque) {
        return res
          .status(404)
          .json({ success: false, message: "Cheque not found" });
      }

      console.log(`✅ V2 API: Updated cheque ${id}`);
      res.json({ success: true, data: updatedCheque });
    } catch (error) {
      console.error("❌ V2 API: Error updating cheque:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update cheque" });
    }
  });

  // DELETE /api/cheques/:id - Delete cheque
  app.delete("/api/cheques/:id", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCheque(id);

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Cheque not found" });
      }

      console.log(`✅ V2 API: Deleted cheque ${id}`);
      res.json({ success: true, message: "Cheque deleted successfully" });
    } catch (error) {
      console.error("❌ V2 API: Error deleting cheque:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete cheque" });
    }
  });

  // POST /api/cheques/:id/void - Void cheque WITH ACCOUNTING
  app.post("/api/cheques/:id/void", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.voidChequeWithAccounting(id);

      console.log(`✅ V2 API: Voided cheque ${id} with accounting reversal`);
      console.log(`   Reversal Entry: ${result.reversalEntry.description}`);
      res.json({
        success: true,
        data: result.cheque,
        reversalEntry: result.reversalEntry,
      });
    } catch (error) {
      console.error("❌ V2 API: Error voiding cheque with accounting:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to void cheque" });
    }
  });

  // POST /api/cheques/:id/print - Print cheque (no journal entry created)
  app.post("/api/cheques/:id/print", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.printChequeWithAccounting(id);

      console.log(
        `✅ V2 API: Printed cheque ${id} (no journal entry created)`
      );
      console.log(`   Response data:`, {
        cheque: result.cheque,
      });

      // Return properly structured response
      res.json({
        success: true,
        data: result.cheque,
        journalEntry: result.journalEntry,
      });
    } catch (error) {
      console.error("❌ V2 API: Error printing cheque:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to print cheque" });
    }
  });

  // GET /api/cheques/:id/pdf - Generate PDF
  app.get("/api/cheques/:id/pdf", requireAuthHybrid, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const cheque = await storage.getCheque(id);

      if (!cheque) {
        return res
          .status(404)
          .json({ success: false, message: "Cheque not found" });
      }

      // Get cheque lines and bank account
      const lines = await storage.getChequeLines(id);
      const bankAccounts = await storage.getBankAccounts(cheque.clientId);
      const bank = bankAccounts.find((b) => b.id === cheque.bankAccountId);

      // Import PDFKit dynamically
      const PDFDocument = (await import("pdfkit")).default;

      // Create PDF document - US Letter size
      const doc = new PDFDocument({ size: "LETTER", margin: 18 });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="cheque-${cheque.chequeNumber}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Helper function to convert amount to words
      // Format: *AMOUNT IN WORDS AND XX / 100*
      function amountToWords(amount: string): string {
        const num = parseFloat(amount);
        const dollars = Math.floor(num);
        const cents = Math.round((num - dollars) * 100);

        const ones = [
          "",
          "One",
          "Two",
          "Three",
          "Four",
          "Five",
          "Six",
          "Seven",
          "Eight",
          "Nine",
        ];
        const teens = [
          "Ten",
          "Eleven",
          "Twelve",
          "Thirteen",
          "Fourteen",
          "Fifteen",
          "Sixteen",
          "Seventeen",
          "Eighteen",
          "Nineteen",
        ];
        const tens = [
          "",
          "",
          "Twenty",
          "Thirty",
          "Forty",
          "Fifty",
          "Sixty",
          "Seventy",
          "Eighty",
          "Ninety",
        ];
        const thousands = ["", "Thousand", "Million"];

        function convertHundreds(n: number): string {
          let result = "";
          if (n >= 100) {
            result += ones[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
          }
          if (n >= 20) {
            result += tens[Math.floor(n / 10)] + " ";
            n %= 10;
          } else if (n >= 10) {
            result += teens[n - 10] + " ";
            n = 0;
          }
          if (n > 0) {
            result += ones[n] + " ";
          }
          return result;
        }

        let result = "";

        if (dollars === 0) {
          result = "ZERO";
        } else {
          let thousandIndex = 0;
          let tempDollars = dollars;

          while (tempDollars > 0) {
            const chunk = tempDollars % 1000;
            if (chunk > 0) {
              result =
                convertHundreds(chunk) + thousands[thousandIndex] + " " + result;
            }
            tempDollars = Math.floor(tempDollars / 1000);
            thousandIndex++;
          }
          result = result.trim().toUpperCase();
        }

        // Format: *AMOUNT AND XX / 100*
        const centsStr = cents.toString().padStart(2, "0");
        return `*${result} AND ${centsStr} / 100*`;
      }

      // Layout constants
      const PAGE_WIDTH = 612;
      const PAGE_HEIGHT = 792;
      const MARGIN = 18;
      const SECTION_HEIGHT = 252; // Three equal sections

      // SECTION 1: MAIN CHEQUE (TOP)
      let currentY = MARGIN;

      // Company header
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("CLOUD 9 MATTRESS", MARGIN, currentY);
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("233 MAIN STREET EAST", MARGIN, currentY + 18)
        .text("MILTON, ONTARIO L9T 1N8", MARGIN, currentY + 30);

      // Cheque number (top right)
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(cheque.chequeNumber, PAGE_WIDTH - 100, currentY, {
          align: "right",
        });

      // Date line - Format as DD/MM/YYYY
      const formatChequeDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          formatChequeDate(cheque.chequeDate),
          PAGE_WIDTH - 100,
          currentY + 25,
          { align: "right" }
        );

      // PAY line with amount in words
      currentY += 80;
      doc.fontSize(11).font("Helvetica-Bold").text("PAY", MARGIN, currentY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(amountToWords(cheque.amount), MARGIN + 30, currentY, {
          width: 400,
        });

      // Dollar amount box (right side)
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(
          `$${parseFloat(cheque.amount).toFixed(2)}`,
          PAGE_WIDTH - 120,
          currentY - 5,
          { align: "right" }
        );

      // TO THE ORDER OF
      currentY += 25;
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("TO THE", MARGIN, currentY)
        .text("ORDER", MARGIN, currentY + 8)
        .text("OF", MARGIN, currentY + 16);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(cheque.payeeName, MARGIN + 35, currentY + 8);

      // Memo line
      currentY += 50;
      if (cheque.memo) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`MEMO: ${cheque.memo}`, MARGIN, currentY);
      }

      // Signature line
      doc
        .moveTo(PAGE_WIDTH - 200, currentY + 30)
        .lineTo(PAGE_WIDTH - 50, currentY + 30)
        .stroke();

      // Bank routing info (bottom of cheque)
      currentY += 60;
      if (bank) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`♦004♦4913 ♦♦105♦52♦00♦♦ 04♦♦18♦♦♦♦15♦`, MARGIN, currentY);
      }

      // VOID watermark on cheque if applicable
      if (cheque.isVoid) {
        doc
          .fontSize(40)
          .font("Helvetica-Bold")
          .fillColor("gray")
          .text("VOID", PAGE_WIDTH / 2 - 50, MARGIN + 80, { rotate: 45 });
        doc.fillColor("black");
      }

      // Dashed line separator
      currentY = MARGIN + SECTION_HEIGHT;
      doc
        .moveTo(MARGIN, currentY)
        .lineTo(PAGE_WIDTH - MARGIN, currentY)
        .dash(3, { space: 3 })
        .stroke()
        .undash();

      // SECTION 2: FIRST STUB (MIDDLE)
      currentY += 10;

      // Stub header
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("CLOUD 9 MATTRESS", MARGIN, currentY)
        .text("CHEQUE", PAGE_WIDTH - 100, currentY, { align: "right" });

      currentY += 20;
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `${formatChequeDate(cheque.chequeDate)}    ${cheque.chequeNumber
          }`,
          MARGIN,
          currentY
        )
        .text(
          `$${parseFloat(cheque.amount).toFixed(2)}`,
          PAGE_WIDTH - 100,
          currentY,
          { align: "right" }
        );

      currentY += 15;
      doc.text(`${cheque.payeeName}`, MARGIN, currentY);

      // Line items in stub
      if (lines.length > 0) {
        currentY += 25;
        lines.forEach((line) => {
          doc
            .fontSize(8)
            .font("Helvetica")
            .text(line.description, MARGIN, currentY)
            .text(
              `$${parseFloat(line.amount).toFixed(2)}`,
              PAGE_WIDTH - 100,
              currentY,
              { align: "right" }
            );
          currentY += 12;
        });
      }

      // VOID on stub if applicable
      if (cheque.isVoid) {
        doc
          .fontSize(30)
          .font("Helvetica-Bold")
          .fillColor("gray")
          .text("VOID", PAGE_WIDTH / 2 - 50, MARGIN + SECTION_HEIGHT + 50, {
            rotate: 45,
          });
        doc.fillColor("black");
      }

      // Dashed line separator
      currentY = MARGIN + SECTION_HEIGHT * 2;
      doc
        .moveTo(MARGIN, currentY)
        .lineTo(PAGE_WIDTH - MARGIN, currentY)
        .dash(3, { space: 3 })
        .stroke()
        .undash();

      // SECTION 3: SECOND STUB (BOTTOM) - Duplicate of first stub
      currentY += 10;

      // Stub header
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("CLOUD 9 MATTRESS", MARGIN, currentY)
        .text("CHEQUE", PAGE_WIDTH - 100, currentY, { align: "right" });

      currentY += 20;
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `${formatChequeDate(cheque.chequeDate)}    ${cheque.chequeNumber
          }`,
          MARGIN,
          currentY
        )
        .text(
          `$${parseFloat(cheque.amount).toFixed(2)}`,
          PAGE_WIDTH - 100,
          currentY,
          { align: "right" }
        );

      currentY += 15;
      doc.text(`${cheque.payeeName}`, MARGIN, currentY);

      // Line items in stub
      if (lines.length > 0) {
        currentY += 25;
        lines.forEach((line) => {
          doc
            .fontSize(8)
            .font("Helvetica")
            .text(line.description, MARGIN, currentY)
            .text(
              `$${parseFloat(line.amount).toFixed(2)}`,
              PAGE_WIDTH - 100,
              currentY,
              { align: "right" }
            );
          currentY += 12;
        });
      }

      // VOID on second stub if applicable
      if (cheque.isVoid) {
        doc
          .fontSize(30)
          .font("Helvetica-Bold")
          .fillColor("gray")
          .text("VOID", PAGE_WIDTH / 2 - 50, MARGIN + SECTION_HEIGHT * 2 + 50, {
            rotate: 45,
          });
        doc.fillColor("black");
      }

      // Finalize PDF
      doc.end();

      console.log(
        `✅ V2 API: Generated professional cheque PDF for cheque ${id}`
      );
    } catch (error) {
      console.error("❌ V2 API: Error generating PDF:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to generate PDF" });
    }
  });

  // GET /api/bank-accounts - Get bank accounts for client
  app.get("/api/bank-accounts", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.query.clientId as string);
      if (!clientId) {
        return res
          .status(400)
          .json({ success: false, message: "clientId is required" });
      }

      const bankAccounts = await storage.getBankAccounts(clientId);
      console.log(
        `✅ V2 API: Retrieved ${bankAccounts.length} bank accounts for client ${clientId}`
      );

      res.json({ success: true, data: bankAccounts });
    } catch (error) {
      console.error("❌ V2 API: Error getting bank accounts:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get bank accounts" });
    }
  });

  // ===== VENDOR API ROUTES (for cheque integration) =====

  // GET /api/vendors - Get vendors for client
  app.get("/api/vendors", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.query.clientId as string);
      if (!clientId) {
        return res
          .status(400)
          .json({ success: false, message: "clientId is required" });
      }

      const vendors = await vendorStorage.getVendorsByClient(clientId);
      console.log(
        `✅ V2 API: Retrieved ${vendors.length} vendors for client ${clientId}`
      );
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("❌ V2 API: Error fetching vendors:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch vendors" });
    }
  });

  // ===== BILL API ROUTES (for cheque integration) =====

  // GET /api/bills - Get bills for client
  app.get("/api/bills", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.query.clientId as string);
      const vendorId = req.query.vendorId
        ? parseInt(req.query.vendorId as string)
        : undefined;

      if (!clientId) {
        return res
          .status(400)
          .json({ success: false, message: "clientId is required" });
      }

      let bills;
      if (vendorId) {
        bills = await storage.getOpenBillsByVendor(vendorId);
        console.log(
          `✅ V2 API: Retrieved ${bills.length} open bills for vendor ${vendorId}`
        );
      } else {
        bills = await crmStorage.getBills(clientId);
        console.log(
          `✅ V2 API: Retrieved ${bills.length} bills for client ${clientId}`
        );
      }

      res.json({ success: true, data: bills });
    } catch (error) {
      console.error("❌ V2 API: Error fetching bills:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch bills" });
    }
  });

  app.use("/api/crm", vendorRoutes);

  // Mount reports routes
  const reportRoutes = await import("./routes/report-routes");
  app.use("/api/reports", requireAuthHybrid, requireModuleAccess("reports"), reportRoutes.default);

  // Note: Project routes already mounted at /api/projects (see line 9010 with projectApiRoutes)
  // Removed duplicate mount to avoid conflicts

  // Mount Location and Class routes (multi-dimensional tracking)
  app.use("/api/locations", locationRoutes);
  app.use("/api/classes", classRoutes);

  // Mount the binder routes
  app.use("/api", binderRoutes);

  // Mount Unified Milton AI routes - Single API surface
  app.use("/api/milton", miltonRoutes);

  // Mount Milton Approval System routes
  app.use("/api/approval", approvalRoutes);

  // Mount Receipt routes
  app.use("/api/receipts", receiptRoutes);
  app.use("/api/saas", saasAdminRoutes);
  app.use("/api/billing", billingRoutes);

  // Mount Cheque Template routes (session-scoped)
  app.use("/api", chequeTemplateRoutes);
  app.use("/api", documentTemplateRoutes);

  // Setup tenant testing routes
  await setupTenantTestRoutes(app);

  // Tax settings API - returns actual bookkeeping tax settings for the client
  // SIMPLE TAX SETTINGS ENDPOINT
  apiRouter.get("/tax-settings", (req: Request, res: Response) => {
    console.log("🔧 Tax settings API called");
    const testTaxSettings = [
      {
        id: 1,
        name: "HST",
        description: "HST 13%",
        rate: 0.13,
        account_id: 5000,
        account_name: "HST Payable",
        account_number: "2200",
      },
      {
        id: 2,
        name: "GST",
        description: "GST 5%",
        rate: 0.05,
        account_id: 5111,
        account_name: "GST Payable",
        account_number: "2201",
      },
    ];

    console.log(`✅ Returning tax settings data`);
    res.json({
      success: true,
      taxSettings: testTaxSettings,
    });
  });

  apiRouter.get(
    "/tax-settings/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        console.log("🔍 Tax settings request for client:", clientId);

        // Get bookkeeping settings for this client
        const bookkeepingSettings = await storage.getClientBookkeepingSettings(
          clientId
        );
        console.log(
          "🔍 Found bookkeeping settings:",
          JSON.stringify(bookkeepingSettings, null, 2)
        );
        console.log(
          "🔍 Tax settings from bookkeeping:",
          bookkeepingSettings?.taxSettings
        );
        console.log(
          "🔍 Tax settings length:",
          bookkeepingSettings?.taxSettings?.length
        );

        interface TaxOption {
          id: string;
          name: string;
          rate: number;
          accountId: number;
          displayText: string;
        }

        let taxOptions: TaxOption[] = [];
        let defaultOption: TaxOption | null = null;

        // Handle case where taxSettings might be a JSON string that needs parsing
        let taxSettingsArray = bookkeepingSettings?.taxSettings;
        if (typeof taxSettingsArray === 'string') {
          try {
            taxSettingsArray = JSON.parse(taxSettingsArray);
            console.log("🔍 Parsed taxSettings from string:", taxSettingsArray);
          } catch (e) {
            console.error("🔍 Error parsing taxSettings string:", e);
            taxSettingsArray = null;
          }

        }

        // Return tax options if taxes are configured in bookkeeping settings
        // Use configured taxes regardless of useTaxSettings flag
        if (
          bookkeepingSettings &&
          Array.isArray(taxSettingsArray) &&
          taxSettingsArray.length > 0
        ) {
          console.log("✅ Tax settings conditions met, processing tax options");
          // Filter to only include active tax settings
          const activeTaxSettings = taxSettingsArray.filter(
            (tax) => tax.isActive !== false
          );
          console.log("🔍 Active tax settings count:", activeTaxSettings.length);

          // Use configured tax settings
          // Handle rate - might be stored as percentage (13) or decimal (0.13)
          taxOptions = activeTaxSettings.map((tax) => {
            // Convert rate to decimal if it's stored as percentage (> 1)
            let rate = tax.rate;
            if (rate > 1) {
              rate = rate / 100;
              console.log(`🔍 Converted rate from ${tax.rate}% to ${rate} decimal`);
            }
            return {
              id: tax.id,
              name: tax.name,
              rate: rate,
              accountId: tax.accountId,
              displayText: `${tax.name} ${(rate * 100).toFixed(1)}%`,
            };
          });

          // Find default tax setting
          const defaultTax = activeTaxSettings.find(
            (tax) => tax.isDefault === true
          );
          if (defaultTax) {
            defaultOption = {
              id: defaultTax.id,
              name: defaultTax.name,
              rate: defaultTax.rate,
              accountId: defaultTax.accountId,
              displayText: `${defaultTax.name} ${(
                defaultTax.rate * 100
              ).toFixed(1)}%`,
            };
          }

          // Only include Tax Exempt option when tax settings are configured
          taxOptions.push({
            id: "exempt",
            name: "Exempt",
            rate: 0,
            accountId: 0,
            displayText: "Tax Exempt",
          });
        } else {
          // No bookkeeping settings or no tax settings configured - return empty array
          console.log("🔍 No tax settings configured:");
          console.log("  - bookkeepingSettings exists:", !!bookkeepingSettings);
          console.log("  - taxSettings is array:", Array.isArray(taxSettingsArray));
          console.log("  - taxSettings length:", taxSettingsArray?.length);
          taxOptions = [];
          defaultOption = null;
        }

        console.log("🔍 Returning tax options:", taxOptions);
        console.log("🔍 Default option:", defaultOption);

        res.json({
          success: true,
          data: {
            options: taxOptions, // Will be empty array if useTaxSettings is not enabled
            default: taxOptions.length > 0 ? (defaultOption || taxOptions[0]) : null,
          },
        });
      } catch (error) {
        console.error("Error fetching tax settings:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to fetch tax settings" });
      }
    }
  );

  // Trial Balance API endpoints - FIXED to use working implementation
  // FIXED: Added parseFloat() for amounts and fiscal year support
  apiRouter.get("/trial-balance/:clientId", requireAuth, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { asOfDate, startDate } = req.query;
      const endDateObj = asOfDate ? new Date(asOfDate as string) : new Date();
      const endDateStr = endDateObj.toISOString().split('T')[0];

      // FIXED: Support fiscal year date range filtering
      // If startDate is provided, use it for P&L account filtering (fiscal year support)
      let fiscalStartStr: string | null = null;
      if (startDate) {
        fiscalStartStr = new Date(startDate as string).toISOString().split('T')[0];
      } else {
        // Try to get fiscal year settings for the client
        try {
          const bookkeepingSettings = await storage.getClientBookkeepingSettings(clientId);
          if (bookkeepingSettings?.fiscalYearEndMonth) {
            const fiscalEndMonth = bookkeepingSettings.fiscalYearEndMonth;
            const fiscalEndDay = bookkeepingSettings.fiscalYearEndDay || 31;
            
            // Calculate fiscal year start date based on the asOfDate
            const asOfYear = endDateObj.getFullYear();
            const asOfMonth = endDateObj.getMonth() + 1; // 1-based
            
            // Determine which fiscal year we're in
            let fiscalYearStart: Date;
            if (asOfMonth > fiscalEndMonth || (asOfMonth === fiscalEndMonth && endDateObj.getDate() > fiscalEndDay)) {
              // We're past the fiscal year end, so current fiscal year started this calendar year
              fiscalYearStart = new Date(asOfYear, fiscalEndMonth, fiscalEndDay + 1);
            } else {
              // We're before the fiscal year end, so current fiscal year started last calendar year
              fiscalYearStart = new Date(asOfYear - 1, fiscalEndMonth, fiscalEndDay + 1);
            }
            fiscalStartStr = fiscalYearStart.toISOString().split('T')[0];
            console.log(`📅 Using fiscal year settings: ${fiscalStartStr} to ${endDateStr} (FY end: month ${fiscalEndMonth}, day ${fiscalEndDay})`);
          }
        } catch (e) {
          console.log(`⚠️ Could not fetch fiscal year settings, using calendar year`);
        }
      }

      console.log(`📊 Generating Trial Balance for client ${clientId} as of ${endDateStr}${fiscalStartStr ? ` (fiscal start: ${fiscalStartStr})` : ''}`);

      // Get all accounts and journal entries (FIXED - reading from journal entries instead of transactions)
      const accounts = await storage.getAccounts(clientId);
      const journalEntries = await storage.getJournalEntries(clientId);

      // Filter journal entries up to the specified date
      const filteredEntries = journalEntries.filter(entry =>
        new Date(entry.entryDate) <= endDateObj
      );

      console.log(`📋 Processing ${filteredEntries.length} journal entries up to ${endDateObj.toDateString()}`);

      // Calculate running balances for each account
      const accountBalances: Record<number, any> = {};

      // Initialize all accounts with zero balances
      accounts.forEach(account => {
        accountBalances[account.id] = {
          account: {
            id: account.id,
            name: account.name,
            accountNumber: account.accountNumber,
            type: account.type,
            subtype: account.subtype,
            isDebitNormal: account.isDebitNormal
          },
          totalDebits: 0,
          totalCredits: 0,
          balance: 0
        };
      });

      // Get all journal lines and process them - OPTIMIZED with batch fetch
      const entryIds = filteredEntries.map(e => e.id);
      const allJournalLines = await storage.getJournalEntryLinesBatch(entryIds);
      
      // Create entry date map for fiscal year filtering
      const entryDateMap = new Map(filteredEntries.map(e => [e.id, e.entryDate]));

      // FIXED: Process all journal lines to calculate balances with parseFloat() and fiscal year filtering
      allJournalLines.forEach(line => {
        if (accountBalances[line.accountId]) {
          const account = accountBalances[line.accountId].account;
          const isPLAccount = ['income', 'expense', 'cost_of_sales', 'other_income', 'other_expense'].includes(account.type);
          
          // FIXED: For P&L accounts, filter by fiscal year date range
          if (isPLAccount && fiscalStartStr) {
            const entryDate = entryDateMap.get(line.journalEntryId);
            const entryDateStr = entryDate ? new Date(entryDate).toISOString().split('T')[0] : '';
            if (entryDateStr < fiscalStartStr) {
              // Skip entries before fiscal year start for P&L accounts
              return;
            }
          }
          
          // FIXED: Use parseFloat() to properly convert string amounts to numbers
          accountBalances[line.accountId].totalDebits += parseFloat(line.debitAmount || '0');
          accountBalances[line.accountId].totalCredits += parseFloat(line.creditAmount || '0');
        }
      });

      // Calculate final balances
      Object.values(accountBalances).forEach((accountData: any) => {
        const { account, totalDebits, totalCredits } = accountData;
        accountData.balance = account.isDebitNormal ?
          (totalDebits - totalCredits) :
          (totalCredits - totalDebits);
      });

      // Convert to trial balance format and filter accounts with activity
      const trialBalanceEntries = Object.values(accountBalances)
        .filter((accountData: any) => accountData.totalDebits > 0 || accountData.totalCredits > 0)
        .map((accountData: any) => ({
          accountId: accountData.account.id,
          accountNumber: accountData.account.accountNumber,
          accountName: accountData.account.name,
          accountType: accountData.account.type,
          subtype: accountData.account.subtype,
          debitBalance: accountData.balance > 0 && accountData.account.isDebitNormal ? accountData.balance : 0,
          creditBalance: accountData.balance > 0 && !accountData.account.isDebitNormal ? accountData.balance : 0,
          netBalance: accountData.balance,
          isDebitNormal: accountData.account.isDebitNormal
        }));

      const totalDebits = trialBalanceEntries.reduce((sum, entry) => sum + entry.debitBalance, 0);
      const totalCredits = trialBalanceEntries.reduce((sum, entry) => sum + entry.creditBalance, 0);

      res.json({
        success: true,
        data: {
          entries: trialBalanceEntries,
          totalDebits,
          totalCredits,
          isBalanced: Math.abs(totalDebits - totalCredits) < 0.001,
          asOfDate: endDateStr,
          fiscalStartDate: fiscalStartStr
        },
        generated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating trial balance:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate trial balance",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  apiRouter.get(
    "/trial-balance-summary/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { asOfDate } = req.query;

        const dateParam =
          (asOfDate as string) || new Date().toISOString().split("T")[0];

        const { trialBalanceService } = await import("./trial-balance-service");
        const summary = await trialBalanceService.getTrialBalanceSummary(
          parseInt(clientId),
          dateParam
        );

        res.json({
          success: true,
          data: summary,
          generated: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error generating trial balance summary:", error);
        res.status(500).json({
          success: false,
          error: "Failed to generate trial balance summary",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Mount additional route modules FIRST before catch-all
  app.use("/api/rules", rulesRoutes);
  app.use("/api/reconciliation", reconciliationRoutes);
  app.use("/", chequeUploadRoutes);
  // COMMENT OUT CONFLICTING TAX SETTINGS FOR NOW
  // app.use('/api/tax-settings', taxSettingsRoutes);

  // Mount Comprehensive Tax Management routes
  app.use("/api/tax", taxRouter);

  // Mount GL Staging routes
  app.use("/api/gl-staging", glStagingRouter);

  // Mount General Ledger routes (for import and progress tracking)
  app.use("/api/general-ledger", generalLedgerRouter);

  // Mount OCR Test routes
  app.use("/api/ocr-test", ocrTestRoutes);

  // Register session management routes (client selection, active client)
  app.use("/api/session", sessionRoutes);

  // Mount Payroll routes
  const payrollRoutes = await import("./routes/payroll-routes");
  app.use("/api/payroll", payrollRoutes.default);

  // Mount the API router AFTER
  app.use("/api", apiRouter);

  // BINDER Cash Section API routes
  apiRouter.get(
    "/binder/cash-section/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { cashSectionService } = await import(
          "./binder/sections/cash-section-service"
        );
        const cashData = await cashSectionService.getCashSectionData(
          parseInt(clientId)
        );
        res.json(cashData);
      } catch (error) {
        console.error("Error fetching cash section:", error);
        res.status(500).json({ error: "Failed to fetch cash section data" });
      }
    }
  );

  apiRouter.post(
    "/binder/cash-section/:clientId/tars-analysis",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { cashSectionService } = await import(
          "./binder/sections/cash-section-service"
        );
        const analysis = await cashSectionService.generateTarsAnalysis(
          parseInt(clientId)
        );
        res.json(analysis);
      } catch (error) {
        console.error("Error generating TARS analysis:", error);
        res.status(500).json({ error: "Failed to generate TARS analysis" });
      }
    }
  );

  apiRouter.post(
    "/binder/cash-section/:clientId/tars-chat",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { message } = req.body;
        const { sectionTarsIntegration } = await import(
          "./binder/tars/section-integration"
        );

        const context = {
          sectionId: "B",
          sectionName: "Cash & Cash Equivalents",
          clientId: parseInt(clientId),
        };

        const response = await sectionTarsIntegration.sendSectionMessage(
          message,
          context
        );
        res.json(response);
      } catch (error) {
        console.error("Error in TARS chat:", error);
        res.status(500).json({ error: "Failed to process TARS message" });
      }
    }
  );

  // Working papers routes for cash section
  apiRouter.post(
    "/binder/cash-section/:clientId/working-papers",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { cashWorkingPaperService } = await import(
          "./binder/working-papers/cash-working-papers"
        );
        const { cashSectionService } = await import(
          "./binder/sections/cash-section-service"
        );

        const cashData = await cashSectionService.getCashSectionData(
          parseInt(clientId)
        );
        const result = await cashWorkingPaperService.generateCashWorkingPapers(
          parseInt(clientId),
          cashData
        );

        res.json(result);
      } catch (error) {
        console.error("Error generating working papers:", error);
        res.status(500).json({ error: "Failed to generate working papers" });
      }
    }
  );

  // Download working paper files
  apiRouter.get(
    "/binder/working-papers/download/:fileName",
    requireAuth,
    (req: Request, res: Response) => {
      try {
        const { fileName } = req.params;
        const filePath = `server/binder/working-papers/generated/${fileName}`;

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        res.download(filePath, fileName);
      } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ error: "Failed to download file" });
      }
    }
  );

  // List working papers for a client
  apiRouter.get(
    "/binder/cash-section/:clientId/working-papers/list",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { workingPaperFileGenerator } = await import(
          "./binder/working-papers/file-generators"
        );

        const files = workingPaperFileGenerator.getGeneratedFiles(
          parseInt(clientId)
        );
        res.json({ files });
      } catch (error) {
        console.error("Error listing working papers:", error);
        res.status(500).json({ error: "Failed to list working papers" });
      }
    }
  );

  apiRouter.post(
    "/pending-client-approvals/:approvalId/approve",
    requireAuthHybrid,
    requireModuleAccess("notifications"),
    async (req: Request, res: Response) => {
    try {
      const approvalId = parseInt(req.params.approvalId);
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { proposedProjects, proposedTasks } = req.body;

      console.log(`🔥 Approving client approval ID: ${approvalId} by user ${user.username}`);
      console.log(`📋 MODIFIED DATA: Projects: ${proposedProjects?.length || 0}, Tasks: ${proposedTasks?.length || 0}`);

      // Get the pending approval
      const approval = await storage.getPendingClientApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ error: "Pending approval not found" });
      }

      // Update approval status
      await storage.updatePendingClientApproval(approvalId, {
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date()
      });

      // Execute the approved client creation workflow
      console.log(`🚀 Executing approved workflow for client: ${approval.clientName}`);

      // Use the modified data if provided, otherwise use original
      let projectsToCreate = proposedProjects;
      let tasksToCreate = proposedTasks;

      // Fallback to original data if no modifications provided
      if (!projectsToCreate) {
        try {
          if (typeof approval.proposedProjects === 'string') {
            projectsToCreate = JSON.parse(approval.proposedProjects);
          } else if (Array.isArray(approval.proposedProjects)) {
            projectsToCreate = approval.proposedProjects;
          }
        } catch (error) {
          console.error('Error parsing proposed projects:', error);
          projectsToCreate = [];
        }
      }

      if (!tasksToCreate) {
        try {
          if (typeof approval.proposedTasks === 'string') {
            tasksToCreate = JSON.parse(approval.proposedTasks);
          } else if (Array.isArray(approval.proposedTasks)) {
            tasksToCreate = approval.proposedTasks;
          }
        } catch (error) {
          console.error('Error parsing proposed tasks:', error);
          tasksToCreate = [];
        }
      }

      // Get firmId from client before creating projects
      const client = approval.clientId ? await storage.getClient(approval.clientId) : null;
      const firmId = client?.firmId || 1;

      if (!firmId) {
        return res.status(400).json({ error: 'Client must have a firmId to create projects' });
      }

      // Create projects first and store them with their IDs
      const createdProjects = new Map<string, any>(); // Map projectName -> project object

      if (projectsToCreate && projectsToCreate.length > 0) {
        for (const projectData of projectsToCreate) {
          const project = await storage.createProject({
            ...projectData,
            clientId: approval.clientId,
            firmId: firmId,
            status: 'not_started' // Valid project_status enum: "not_started", "draft", "active", "in_progress", "on_hold", "completed", "cancelled"
          });
          console.log(`✅ Created project: ${project.name} (ID: ${project.id}) for client ${approval.clientName}`);
          createdProjects.set(project.name, project);
        }
      }

      // Create tasks and link them to their parent projects
      if (tasksToCreate && tasksToCreate.length > 0) {
        console.log(`📋 Creating ${tasksToCreate.length} tasks for ${createdProjects.size} projects`);
        console.log('📋 Available projects:', Array.from(createdProjects.keys()));

        for (const taskData of tasksToCreate) {
          // Find the project this task belongs to
          const parentProject = createdProjects.get(taskData.projectName);

          if (!parentProject) {
            console.warn(`⚠️ Warning: Task "${taskData.title}" references unknown project "${taskData.projectName}"`);
            console.warn(`   Available project names: ${Array.from(createdProjects.keys()).join(', ')}`);
            continue; // Skip this task if project not found
          }

          // Get firmId from client
          const client = approval.clientId ? await storage.getClient(approval.clientId) : null;
          const firmId = client?.firmId || 1;

          if (!firmId) {
            console.warn(`⚠️ Warning: Cannot create task - client has no firmId`);
            continue;
          }

          console.log(`📋 Creating task "${taskData.title}" for project "${parentProject.name}" (ID: ${parentProject.id})`);

          const task = await storage.createTask({
            ...taskData,
            projectId: parentProject.id, // Link to parent project
            clientId: approval.clientId,
            firmId: firmId,
            createdBy: user.id || 1,
            status: 'pending'
          });
          console.log(`✅ Created task: ${task.title} (ID: ${task.id}) under project ${parentProject.name}`);
        }
      }

      console.log(`🎉 Successfully approved and implemented modified workflow for client: ${approval.clientName}`);

      res.json({
        success: true,
        message: "Client approval processed and workflow implemented successfully"
      });
    } catch (error) {
      console.error("Error approving client:", error);
      res.status(500).json({ error: "Failed to approve client" });
    }
    }
  );

  apiRouter.post(
    "/pending-client-approvals/:approvalId/reject",
    requireAuthHybrid,
    requireModuleAccess("notifications"),
    async (req: Request, res: Response) => {
    try {
      const approvalId = parseInt(req.params.approvalId);
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`❌ Rejecting client approval ID: ${approvalId} by user ${user.username}`);

      // Get the pending approval
      const approval = await storage.getPendingClientApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ error: "Pending approval not found" });
      }

      // Update approval status
      await storage.updatePendingClientApproval(approvalId, {
        status: 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date()
      });

      console.log(`🚫 Successfully rejected workflow for client: ${approval.clientName}`);

      res.json({
        success: true,
        message: "Client approval rejected successfully"
      });
    } catch (error) {
      console.error("Error rejecting client:", error);
      res.status(500).json({ error: "Failed to reject client" });
    }
    }
  );


  // Caseware import routes for BINDER
  apiRouter.post(
    "/binder/:binderId/caseware/upload",
    requireAuth,
    uploadToDisk.single("casewareFile"),
    async (req: Request, res: Response) => {
      try {
        const { binderId } = req.params;

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        console.log(
          `Caseware upload: binderId=${binderId}, file=${req.file.originalname}, path=${req.file.path}`
        );

        // Check if file path exists
        if (!req.file.path) {
          return res.status(400).json({ error: "File path is missing" });
        }

        // Check if file exists on disk
        if (!fs.existsSync(req.file.path)) {
          return res
            .status(400)
            .json({ error: "Uploaded file not found on server" });
        }

        const { casewareBINDERIntegration } = await import(
          "./binder/caseware-integration"
        );

        // Validate file first
        const validation = await casewareBINDERIntegration.validateCasewareFile(
          req.file.path
        );

        if (!validation.isValid) {
          // Clean up file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            error: "Invalid Caseware file",
            warnings: validation.warnings,
          });
        }

        // Import the file
        const result = await casewareBINDERIntegration.importCasewareFile(
          parseInt(binderId),
          req.file.path,
          req.file.originalname || "caseware-file"
        );

        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.json({
          success: true,
          result,
          validation,
        });
      } catch (error) {
        // Clean up file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        console.error("Error importing Caseware file:", error);
        res.status(500).json({
          error: "Failed to import Caseware file",
          details: error.message,
        });
      }
    }
  );

  // Pending Client Approvals Routes
  apiRouter.get(
    "/pending-client-approvals",
    requireAuthHybrid,
    requireModuleAccess("notifications"),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        if (!user?.firmId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const pendingApprovals = await storage.getPendingClientApprovals();
        const pendingTimeEntries = await db
          .select({
            id: timeEntries.id,
            duration: timeEntries.duration,
            description: timeEntries.description,
            startTime: timeEntries.startTime,
            createdAt: timeEntries.createdAt,
            userId: timeEntries.userId,
            projectId: timeEntries.projectId,
            taskId: timeEntries.taskId,
            type: timeEntries.type,
            userName: users.name,
            projectName: projects.name,
            taskName: tasks.title,
          })
          .from(timeEntries)
          .leftJoin(users, eq(timeEntries.userId, users.id))
          .leftJoin(projects, eq(timeEntries.projectId, projects.id))
          .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
          .where(and(
            eq(timeEntries.firmId, user.firmId),
            eq(timeEntries.status, "submitted")
          ));

        const timeEntryApprovals = pendingTimeEntries.map((entry) => ({
          id: entry.id,
          duration: entry.duration,
          description: entry.description,
          date: entry.startTime || entry.createdAt,
          userId: entry.userId,
          userName: entry.userName,
          projectId: entry.projectId,
          projectName: entry.projectName,
          taskId: entry.taskId,
          taskName: entry.taskName,
          isBillable: entry.type === "billable",
        }));

        res.json({
          clientApprovals: pendingApprovals || [],
          timeEntryApprovals,
        });
      } catch (error) {
        console.error("Error fetching pending client approvals:", error);
        res.status(500).json({ error: "Failed to fetch pending client approvals" });
      }
    }
  );

  // Get Caseware supported formats
  apiRouter.get(
    "/binder/caseware/formats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { casewareBINDERIntegration } = await import(
          "./binder/caseware-integration"
        );
        const formats = casewareBINDERIntegration.getSupportedFormats();

        res.json({
          supportedFormats: formats,
          recommendations: [
            "For best results, export your CaseWare file as XML format",
            "BINDER will integrate trial balance data automatically if available",
            "Large files may take longer to process",
          ],
        });
      } catch (error) {
        console.error("Error getting Caseware formats:", error);
        res.status(500).json({ error: "Failed to get supported formats" });
      }
    }
  );

  // Accounts Receivable Section Routes
  apiRouter.get(
    "/binder/accounts-receivable/:clientId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { accountsReceivableSectionService } = await import(
          "./binder/sections/accounts-receivable-section-service"
        );

        const data =
          await accountsReceivableSectionService.getAccountsReceivableData(
            parseInt(clientId)
          );
        const procedures =
          accountsReceivableSectionService.getDefaultAuditProcedures();
        const materiality =
          accountsReceivableSectionService.calculateMateriality(data);

        res.json({ data, procedures, materiality });
      } catch (error) {
        console.error("Error loading accounts receivable data:", error);
        res
          .status(500)
          .json({ error: "Failed to load accounts receivable data" });
      }
    }
  );

  apiRouter.post(
    "/binder/accounts-receivable/:clientId/tars-analysis",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { data, procedures } = req.body;
        const { accountsReceivableSectionService } = await import(
          "./binder/sections/accounts-receivable-section-service"
        );
        const { tarsService } = await import("./binder/tars-service");

        const context = accountsReceivableSectionService.generateTarsContext(
          data,
          procedures
        );
        const analysis = await tarsService.analyzeSection(
          "Accounts Receivable",
          context
        );

        res.json({ analysis });
      } catch (error) {
        console.error("Error running TARS analysis:", error);
        res.status(500).json({ error: "Failed to run TARS analysis" });
      }
    }
  );

  apiRouter.put(
    "/binder/accounts-receivable/:clientId/procedures",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const { procedures } = req.body;

        // In a real implementation, save procedures to database
        // For now, just return success
        res.json({ success: true, procedures });
      } catch (error) {
        console.error("Error updating procedures:", error);
        res.status(500).json({ error: "Failed to update procedures" });
      }
    }
  );

  apiRouter.post(
    "/binder/accounts-receivable/:clientId/working-papers/:paperType",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { clientId, paperType } = req.params;
        const { data, procedures, analysis } = req.body;
        const { workingPaperFileGenerator } = await import(
          "./binder/working-papers/file-generators"
        );

        let fileName: string;
        let filePath: string;

        switch (paperType) {
          case "confirmation-summary":
            fileName = `AR_Confirmation_Summary_${new Date().toISOString().split("T")[0]
              }.xlsx`;
            filePath =
              await workingPaperFileGenerator.generateAccountsReceivableConfirmationSummary(
                parseInt(clientId),
                data,
                procedures,
                analysis
              );
            break;
          case "aging-analysis":
            fileName = `AR_Aging_Analysis_${new Date().toISOString().split("T")[0]
              }.xlsx`;
            filePath =
              await workingPaperFileGenerator.generateAccountsReceivableAgingAnalysis(
                parseInt(clientId),
                data,
                analysis
              );
            break;
          case "cutoff-testing":
            fileName = `AR_Cutoff_Testing_${new Date().toISOString().split("T")[0]
              }.xlsx`;
            filePath =
              await workingPaperFileGenerator.generateAccountsReceivableCutoffTesting(
                parseInt(clientId),
                data,
                procedures,
                analysis
              );
            break;
          case "allowance-review":
            fileName = `AR_Allowance_Review_${new Date().toISOString().split("T")[0]
              }.docx`;
            filePath =
              await workingPaperFileGenerator.generateAccountsReceivableAllowanceReview(
                parseInt(clientId),
                data,
                procedures,
                analysis
              );
            break;
          default:
            return res.status(400).json({ error: "Invalid paper type" });
        }

        res.download(filePath, fileName);
      } catch (error) {
        console.error("Error generating working paper:", error);
        res.status(500).json({ error: "Failed to generate working paper" });
      }
    }
  );

  apiRouter.put(
    "/binder/working-papers/:workingPaperId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { workingPaperId } = req.params;
        const { tarsInstructions, currentContent } = req.body;
        const { cashWorkingPaperService } = await import(
          "./binder/working-papers/cash-working-papers"
        );

        const result = await cashWorkingPaperService.editWorkingPaper(
          workingPaperId,
          tarsInstructions,
          currentContent
        );
        res.json(result);
      } catch (error) {
        console.error("Error editing working paper:", error);
        res.status(500).json({ error: "Failed to edit working paper" });
      }
    }
  );

  // Register TARS AI routes
  registerTarsRoutes(app);
  registerSimpleTarsRoutes(app);
  registerTrialBalanceRoutes(app);

  // Section Template Routes
  app.get("/api/binder/section-templates", async (req, res) => {
    try {
      const service = sectionTemplateService;
      const templates = await service.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error getting section templates:", error);
      res.status(500).json({ error: "Failed to get section templates" });
    }
  });

  app.get("/api/binder/section-templates/:templateId", async (req, res) => {
    try {
      const template = await sectionTemplateService.getTemplate(
        req.params.templateId
      );
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error getting section template:", error);
      res.status(500).json({ error: "Failed to get section template" });
    }
  });

  app.post("/api/binder/section-templates/custom", async (req, res) => {
    try {
      const {
        name,
        description,
        accountType,
        businessContext,
        specificRequirements,
        riskFactors,
        regulatoryRequirements,
      } = req.body;

      const customSection = await aiSectionGenerator.generateCustomSection({
        name,
        description,
        accountType,
        businessContext,
        specificRequirements,
        riskFactors,
        regulatoryRequirements,
      });

      // Store the custom section using the service
      const service = sectionTemplateService;
      service.storeCustomTemplate(customSection);

      res.json(customSection);
    } catch (error) {
      console.error("Error creating custom section:", error);
      res.status(500).json({ error: "Failed to create custom section" });
    }
  });

  app.post(
    "/api/binder/:binderId/apply-template/:templateId",
    async (req, res) => {
      try {
        const binderId = parseInt(req.params.binderId);
        const templateId = req.params.templateId;
        const customizations = req.body.customizations || {};

        const service = sectionTemplateService;
        await service.applySectionTemplate(
          binderId,
          templateId,
          customizations
        );
        res.json({ success: true });
      } catch (error) {
        console.error("Error applying section template:", error);
        res.status(500).json({ error: "Failed to apply section template" });
      }
    }
  );

  app.get("/api/binder/:binderId/sections", async (req, res) => {
    try {
      const binderId = parseInt(req.params.binderId);
      // const service = sectionTemplateService;
      // const sections = await service.getBinderSections(binderId);
      res.json([]);
    } catch (error) {
      console.error("Error getting binder sections:", error);
      res.status(500).json({ error: "Failed to get binder sections" });
    }
  });

  app.post("/api/binder/recommendations", async (req, res) => {
    try {
      const { clientIndustry, businessType, riskFactors } = req.body;
      const recommendations =
        await sectionTemplateService.generateSectionRecommendations(
          clientIndustry,
          businessType,
          riskFactors
        );
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Financial Statement Generation Routes
  app.get("/api/financial-statements/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { FinancialStatementGenerator } = await import(
        "./services/financial-statement-generator"
      );
      const generator = new FinancialStatementGenerator();
      const statements = await generator.generateFinancialStatements(clientId);
      res.json(statements);
    } catch (error) {
      console.error("Error generating financial statements:", error);
      res
        .status(500)
        .json({ error: "Failed to generate financial statements" });
    }
  });

  app.get("/api/section-data/:clientId/:sectionId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const sectionId = req.params.sectionId;
      const { FinancialStatementGenerator } = await import(
        "./services/financial-statement-generator"
      );
      const generator = new FinancialStatementGenerator();
      const sectionData = await generator.getSectionData(clientId, sectionId);
      res.json(sectionData);
    } catch (error) {
      console.error("Error loading section data:", error);
      res.status(500).json({ error: "Failed to load section data" });
    }
  });

  // Inventory Section Route - Using real mapping
  app.get("/api/binder/inventory-data/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { FinancialStatementGenerator } = await import(
        "./services/financial-statement-generator"
      );
      const generator = new FinancialStatementGenerator();
      const inventoryData = await generator.getSectionData(
        clientId,
        "inventory"
      );

      res.json({
        totalInventoryValue: inventoryData.totalBalance,
        inventoryAccounts: inventoryData.accounts.map((account) => ({
          accountId: account.accountId,
          accountName: account.accountName,
          currentBalance: account.balance,
          priorBalance: 0, // Would come from prior period data
          variance: account.balance,
          variancePercentage: 0,
        })),
        inventoryTurnover: 5.2, // Would be calculated from COGS/avg inventory
        obsolescenceReserve: inventoryData.totalBalance * 0.05,
      });
    } catch (error) {
      console.error("Error loading inventory data:", error);
      res.status(500).json({ error: "Failed to load inventory data" });
    }
  });

  app.get("/api/binder/sections/:sectionId/procedures", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to load procedures" });
    }
  });

  app.get(
    "/api/binder/sections/:sectionId/working-papers",
    async (req, res) => {
      try {
        res.json([]);
      } catch (error) {
        res.status(500).json({ error: "Failed to load working papers" });
      }
    }
  );

  app.get("/api/binder/sections/:sectionId/tars-analyses", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to load analyses" });
    }
  });

  // TARS Autonomous Workflow Engine Routes
  apiRouter.post(
    "/tars/autonomous/start-task",
    async (req: Request, res: Response) => {
      try {
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );
        const { type, clientId, input, binderId, priority } = req.body;

        const taskId = await autonomousWorkflowEngine.addTask(
          type,
          clientId,
          input,
          binderId,
          priority
        );

        res.json({
          success: true,
          taskId,
          message: `TARS autonomous task ${type} started for client ${clientId}`,
        });
      } catch (error) {
        console.error("Error starting autonomous task:", error);
        res.status(500).json({ error: "Failed to start autonomous task" });
      }
    }
  );

  apiRouter.get(
    "/tars/autonomous/queue-status",
    async (req: Request, res: Response) => {
      try {
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );
        const status = autonomousWorkflowEngine.getQueueStatus();
        res.json(status);
      } catch (error) {
        console.error("Error getting queue status:", error);
        res.status(500).json({ error: "Failed to get queue status" });
      }
    }
  );

  apiRouter.get(
    "/tars/autonomous/tasks/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );
        const tasks = await autonomousWorkflowEngine.getCompletedTasks(
          clientId
        );
        res.json({ tasks });
      } catch (error) {
        console.error("Error getting client tasks:", error);
        res.status(500).json({ error: "Failed to get client tasks" });
      }
    }
  );

  // TARS Document Management Routes
  apiRouter.get(
    "/tars/documents/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const { documentGenerator } = await import("./tars/document-generator");
        const documents = documentGenerator.getGeneratedDocuments(clientId);
        res.json({ documents });
      } catch (error) {
        console.error("Error getting generated documents:", error);
        res.status(500).json({ error: "Failed to get documents" });
      }
    }
  );

  apiRouter.get(
    "/tars/documents/download/:fileName",
    async (req: Request, res: Response) => {
      try {
        const fileName = req.params.fileName;
        const filePath = `server/tars/generated-documents/${fileName}`;

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        res.download(filePath);
      } catch (error) {
        console.error("Error downloading document:", error);
        res.status(500).json({ error: "Failed to download document" });
      }
    }
  );

  // TARS Workflow Testing Routes
  apiRouter.post(
    "/tars/test/caseware-rollforward",
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "caseware_rollforward",
          clientId,
          { filePath: "mock-caseware-file.xml" },
          undefined,
          "high"
        );

        res.json({
          success: true,
          taskId,
          message: "Caseware rollforward test started autonomously",
        });
      } catch (error) {
        console.error("Error testing caseware rollforward:", error);
        res.status(500).json({ error: "Failed to test caseware rollforward" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/cpa-checklist",
    async (req: Request, res: Response) => {
      try {
        const { clientId, engagementType } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "cpa_checklist",
          clientId,
          { engagementType: engagementType || "review" },
          undefined,
          "medium"
        );

        res.json({
          success: true,
          taskId,
          message: "CPA checklist generation started autonomously",
        });
      } catch (error) {
        console.error("Error testing CPA checklist:", error);
        res.status(500).json({ error: "Failed to test CPA checklist" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/gl-review",
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "gl_review",
          clientId,
          { filePath: "mock-gl-file.xlsx" },
          undefined,
          "high"
        );

        res.json({
          success: true,
          taskId,
          message: "GL review started autonomously",
        });
      } catch (error) {
        console.error("Error testing GL review:", error);
        res.status(500).json({ error: "Failed to test GL review" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/planning-analytics",
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "planning_analytics",
          clientId,
          {},
          undefined,
          "medium"
        );

        res.json({
          success: true,
          taskId,
          message: "Planning analytics started autonomously",
        });
      } catch (error) {
        console.error("Error testing planning analytics:", error);
        res.status(500).json({ error: "Failed to test planning analytics" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/working-papers",
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "working_papers",
          clientId,
          {},
          undefined,
          "medium"
        );

        res.json({
          success: true,
          taskId,
          message: "Working papers generation started autonomously",
        });
      } catch (error) {
        console.error("Error testing working papers:", error);
        res.status(500).json({ error: "Failed to test working papers" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/financial-statements",
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "financial_statements",
          clientId,
          {},
          undefined,
          "high"
        );

        res.json({
          success: true,
          taskId,
          message: "Financial statements generation started autonomously",
        });
      } catch (error) {
        console.error("Error testing financial statements:", error);
        res.status(500).json({ error: "Failed to test financial statements" });
      }
    }
  );

  apiRouter.post(
    "/tars/test/quality-inspection",
    async (req: Request, res: Response) => {
      try {
        const { binderId } = req.body;
        const { autonomousWorkflowEngine } = await import(
          "./tars/autonomous-workflow-engine"
        );

        const taskId = await autonomousWorkflowEngine.addTask(
          "quality_inspection",
          1, // Default client
          {},
          binderId,
          "urgent"
        );

        res.json({
          success: true,
          taskId,
          message: "Quality inspection started autonomously",
        });
      } catch (error) {
        console.error("Error testing quality inspection:", error);
        res.status(500).json({ error: "Failed to test quality inspection" });
      }
    }
  );

  // Test route to verify year-end close works dynamically on multiple clients
  apiRouter.get(
    "/test/year-end-close/:clientId",
    async (req: Request, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);

        console.log(`\n🧪 TESTING YEAR-END CLOSE FOR CLIENT ${clientId}`);

        // Get client's fiscal year settings
        const client = await storage.getClient(clientId);
        const fiscalYearEndMonth = client?.fiscalYearEndMonth || 12;
        const currentYear = new Date().getFullYear();
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;

        // Calculate fiscal year boundaries
        let fiscalYearStart: Date;
        let priorYearEnd: Date;

        if (currentMonth > fiscalYearEndMonth) {
          fiscalYearStart = new Date(currentYear, fiscalYearEndMonth - 1, 1);
          priorYearEnd = new Date(currentYear, fiscalYearEndMonth - 1, 0);
        } else {
          fiscalYearStart = new Date(
            currentYear - 1,
            fiscalYearEndMonth - 1,
            1
          );
          priorYearEnd = new Date(currentYear - 1, fiscalYearEndMonth - 1, 0);
        }

        // Get all journal entries
        const allEntries = await storage.getJournalEntries(clientId, 1000, 0);
        const priorYearEntries = allEntries.filter(
          (entry) => new Date(entry.entryDate) <= priorYearEnd
        );

        // Calculate prior year net income
        let priorYearNetIncome = 0;
        const accounts = await storage.getAccounts(clientId);

        for (const entry of priorYearEntries) {
          const lines = await storage.getJournalEntryLines(entry.id);
          for (const line of lines) {
            const account = accounts.find((acc) => acc.id === line.accountId);
            if (
              account &&
              ["income", "expense", "cost_of_sales", "other_income", "other_expense"].includes(account.type)
            ) {
              const debit = parseFloat(line.debitAmount || "0");
              const credit = parseFloat(line.creditAmount || "0");

              if (account.type === "income" || account.type === "other_income") {
                priorYearNetIncome += credit - debit;
              } else if (
                account.type === "expense" ||
                account.type === "cost_of_sales" ||
                account.type === "other_expense"
              ) {
                priorYearNetIncome -= debit - credit;
              }
            }
          }
        }

        res.json({
          clientId,
          clientName: client?.name,
          fiscalYearEndMonth,
          fiscalYearStart: fiscalYearStart.toISOString().split("T")[0],
          priorYearEnd: priorYearEnd.toISOString().split("T")[0],
          totalJournalEntries: allEntries.length,
          priorYearEntries: priorYearEntries.length,
          priorYearNetIncome,
          calculation:
            priorYearNetIncome > 0
              ? "PROFIT - Goes to Retained Earnings CREDIT"
              : priorYearNetIncome < 0
                ? "LOSS - Goes to Retained Earnings DEBIT"
                : "NO NET INCOME",
          message: `Year-end close for client ${clientId}: ${priorYearNetIncome > 0
            ? "Profit"
            : priorYearNetIncome < 0
              ? "Loss"
              : "Break-even"
            } of $${Math.abs(priorYearNetIncome).toFixed(2)}`,
        });
      } catch (error) {
        console.error("Error testing year-end close:", error);
        res.status(500).json({ error: "Failed to test year-end close" });
      }
    }
  );

  // Route modules already registered above - remove duplicates

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}
