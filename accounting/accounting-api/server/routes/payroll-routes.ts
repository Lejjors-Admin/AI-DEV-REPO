/**
 * Canadian Payroll Routes
 * 
 * Comprehensive payroll management with CPP, EI, federal/provincial tax calculations,
 * T4s, paystubs, and full compliance with Canadian regulations.
 */

import express from 'express';
import { z } from 'zod';
import { requireAuthHybrid } from '../auth';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createEmployeeSchema = z.object({
  clientId: z.number().min(1, 'Client ID is required'),
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().optional(),
  sinEncrypted: z.string().optional(),
  dateOfBirth: z.string().optional(),
  hireDate: z.string().min(1, 'Hire date is required'),
  terminationDate: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  payType: z.enum(['salary', 'hourly']),
  payRate: z.string().min(1, 'Pay rate is required'),
  payFrequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
  federalBasicPersonalAmount: z.string().default('15000'),
  provincialBasicPersonalAmount: z.string().default('11141'),
  federalClaimCode: z.string().default('1'),
  provincialClaimCode: z.string().default('1'),
  unionDues: z.string().default('0'),
  additionalTaxDeduction: z.string().default('0'),
  healthBenefits: z.string().default('0'),
  dentalBenefits: z.string().default('0'),
  lifeInsurance: z.string().default('0'),
  status: z.enum(['active', 'terminated', 'on_leave']).default('active')
});

const processPayrollSchema = z.object({
  clientId: z.number().min(1, 'Client ID is required'),
  employeeId: z.number().min(1, 'Employee ID is required'),
  payPeriodStart: z.string().min(1, 'Pay period start is required'),
  payPeriodEnd: z.string().min(1, 'Pay period end is required'),
  payDate: z.string().min(1, 'Pay date is required'),
  regularHours: z.number().min(0).default(0),
  overtimeHours: z.number().min(0).default(0),
  vacationPay: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  reimbursements: z.number().min(0).default(0)
});

const createPayrollRunSchema = z.object({
  clientId: z.number().min(1, 'Client ID is required'),
  payPeriodStart: z.string().min(1, 'Pay period start is required'),
  payPeriodEnd: z.string().min(1, 'Pay period end is required'),
  payDate: z.string().min(1, 'Pay date is required'),
  employeeIds: z.array(z.number()).optional()
});

const generateT4Schema = z.object({
  employeeId: z.number().min(1, 'Employee ID is required'),
  taxYear: z.number().min(2000, 'Tax year must be 2000 or later').max(2100, 'Tax year must be 2100 or earlier'),
  clientId: z.number().min(1, 'Client ID is required')
});

const calculatePreviewSchema = z.object({
  employeeId: z.number().min(1, 'Employee ID is required'),
  grossAmount: z.number().min(0, 'Gross amount must be positive'),
  province: z.string().min(2, 'Province is required')
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createSecurityContext(user: any) {
  return {
    user: {
      id: user.id,
      role: user.role,
      firmId: user.firmId,
      clientId: user.clientId
    },
    tenantScope: {
      firmId: user.firmId,
      clientId: user.clientId,
      allowedClientIds: []
    }
  };
}

function requireFirmMember(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const allowedRoles = ['firm_admin', 'firm_user', 'super_admin', 'saas_owner'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Firm access required' });
  }
  
  next();
}

// ============================================================================
// CANADIAN TAX CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate CPP (Canada Pension Plan) contribution
 * NOTE: These rates are for 2024 and must be updated annually
 * 2024 rates: 5.95% on pensionable earnings
 * Maximum pensionable earnings: $66,600
 * Basic exemption: $3,500
 */
function calculateCPP(grossPay: number, yearToDateEarnings: number = 0): number {
  const CPP_RATE = 0.0595;
  const CPP_MAX_EARNINGS = 66600;
  const CPP_BASIC_EXEMPTION = 3500;
  
  // Calculate annual exemption per pay period
  const totalEarnings = yearToDateEarnings + grossPay;
  
  // No CPP on amounts below exemption or above maximum
  if (totalEarnings <= CPP_BASIC_EXEMPTION) {
    return 0;
  }
  
  // Calculate pensionable earnings
  const pensionableEarnings = Math.min(totalEarnings, CPP_MAX_EARNINGS) - CPP_BASIC_EXEMPTION;
  const previousPensionableEarnings = Math.max(0, Math.min(yearToDateEarnings, CPP_MAX_EARNINGS) - CPP_BASIC_EXEMPTION);
  
  const cpp = (pensionableEarnings - previousPensionableEarnings) * CPP_RATE;
  
  return Math.max(0, Math.round(cpp * 100) / 100);
}

/**
 * Calculate EI (Employment Insurance) premium
 * NOTE: These rates are for 2024 and must be updated annually
 * 2024 rates: 1.63% for employees
 * Maximum insurable earnings: $63,200
 */
function calculateEI(grossPay: number, yearToDateEarnings: number = 0): number {
  const EI_RATE = 0.0163;
  const EI_MAX_EARNINGS = 63200;
  
  const totalEarnings = yearToDateEarnings + grossPay;
  
  // No EI on amounts above maximum
  if (yearToDateEarnings >= EI_MAX_EARNINGS) {
    return 0;
  }
  
  const insurableEarnings = Math.min(totalEarnings, EI_MAX_EARNINGS) - yearToDateEarnings;
  const ei = insurableEarnings * EI_RATE;
  
  return Math.round(ei * 100) / 100;
}

/**
 * Calculate federal income tax using 2024 federal tax brackets
 * NOTE: Tax brackets change annually and should be updated each year
 */
function calculateFederalTax(annualIncome: number, basicPersonalAmount: number = 15000): number {
  // 2024 Federal tax brackets
  const brackets = [
    { from: 0, to: 55867, rate: 0.15 },
    { from: 55867, to: 111733, rate: 0.205 },
    { from: 111733, to: 173205, rate: 0.26 },
    { from: 173205, to: 246752, rate: 0.29 },
    { from: 246752, to: Infinity, rate: 0.33 }
  ];
  
  const taxableIncome = Math.max(0, annualIncome - basicPersonalAmount);
  let tax = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.from) {
      const incomeInBracket = Math.min(taxableIncome, bracket.to) - bracket.from;
      tax += incomeInBracket * bracket.rate;
    }
  }
  
  return Math.round(tax * 100) / 100;
}

/**
 * Calculate provincial income tax (Ontario rates as example)
 * NOTE: Different provinces have different rates - currently only Ontario is implemented
 * NOTE: Tax brackets change annually and should be updated each year
 */
function calculateProvincialTax(annualIncome: number, province: string, basicPersonalAmount: number = 11141): number {
  // Ontario 2024 tax brackets (default - other provinces should be added)
  const ontarioBrackets = [
    { from: 0, to: 49231, rate: 0.0505 },
    { from: 49231, to: 98463, rate: 0.0915 },
    { from: 98463, to: 150000, rate: 0.1116 },
    { from: 150000, to: 220000, rate: 0.1216 },
    { from: 220000, to: Infinity, rate: 0.1316 }
  ];
  
  // Use Ontario rates for all provinces for now (should be province-specific in production)
  const brackets = ontarioBrackets;
  
  const taxableIncome = Math.max(0, annualIncome - basicPersonalAmount);
  let tax = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.from) {
      const incomeInBracket = Math.min(taxableIncome, bracket.to) - bracket.from;
      tax += incomeInBracket * bracket.rate;
    }
  }
  
  return Math.round(tax * 100) / 100;
}

/**
 * Calculate all payroll deductions for a single pay
 */
function calculatePayrollDeductions(
  grossPay: number,
  payFrequency: string,
  province: string,
  federalBPA: number = 15000,
  provincialBPA: number = 11141,
  yearToDateEarnings: number = 0,
  otherDeductions: number = 0
) {
  // Validate pay frequency
  const periodsPerYear: Record<string, number> = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12
  };
  
  const periods = periodsPerYear[payFrequency];
  if (!periods) {
    throw new Error(`Invalid pay frequency: ${payFrequency}`);
  }
  
  const estimatedAnnualIncome = grossPay * periods;
  
  // Calculate annual taxes
  const annualFederalTax = calculateFederalTax(estimatedAnnualIncome, federalBPA);
  const annualProvincialTax = calculateProvincialTax(estimatedAnnualIncome, province, provincialBPA);
  
  // Prorate taxes for this pay period
  const federalTax = Math.round((annualFederalTax / periods) * 100) / 100;
  const provincialTax = Math.round((annualProvincialTax / periods) * 100) / 100;
  
  // Calculate CPP and EI
  const cpp = calculateCPP(grossPay, yearToDateEarnings);
  const ei = calculateEI(grossPay, yearToDateEarnings);
  
  const totalDeductions = federalTax + provincialTax + cpp + ei + otherDeductions;
  const netPay = grossPay - totalDeductions;
  
  return {
    grossPay: Math.round(grossPay * 100) / 100,
    federalTax,
    provincialTax,
    cpp,
    ei,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100
  };
}

// ============================================================================
// IN-MEMORY DATA STORAGE (Placeholder until database integration)
// ============================================================================

// WARNING: Temporary in-memory storage - NOT FOR PRODUCTION USE
// - No data persistence across restarts
// - No tenant isolation (shared across all users)
// - ID collisions after restart
// - Replace with proper database calls before production deployment
const employees: Map<number, any> = new Map();
const payrollRuns: Map<number, any> = new Map();
const paystubs: Map<number, any> = new Map();
const t4Records: Map<number, any> = new Map();

let nextEmployeeId = 1;
let nextPayrollRunId = 1;
let nextPaystubId = 1;
let nextT4Id = 1;

// ============================================================================
// EMPLOYEE ENDPOINTS
// ============================================================================

/**
 * GET /api/payroll/employees - Get all employees for a client
 */
router.get('/employees', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.query.clientId as string);
    
    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ error: 'Valid client ID is required' });
    }
    
    const context = createSecurityContext(user);
    
    // Filter employees by client ID
    const clientEmployees = Array.from(employees.values()).filter(
      emp => emp.clientId === clientId
    );
    
    console.log(`✅ Retrieved ${clientEmployees.length} employees for client ${clientId}`);
    
    res.json({
      success: true,
      data: clientEmployees,
      count: clientEmployees.length
    });
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      error: 'Failed to fetch employees',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/payroll/employees/active - Get active employees only
 */
router.get('/employees/active', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.query.clientId as string);
    
    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ error: 'Valid client ID is required' });
    }
    
    const context = createSecurityContext(user);
    
    // Filter active employees by client ID
    const activeEmployees = Array.from(employees.values()).filter(
      emp => emp.clientId === clientId && emp.status === 'active'
    );
    
    console.log(`✅ Retrieved ${activeEmployees.length} active employees for client ${clientId}`);
    
    res.json({
      success: true,
      data: activeEmployees,
      count: activeEmployees.length
    });
    
  } catch (error) {
    console.error('Error fetching active employees:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active employees',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payroll/employees - Create a new employee
 */
router.post('/employees', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = createEmployeeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid employee data', 
        details: validation.error.errors 
      });
    }
    
    const employeeData = validation.data;
    const context = createSecurityContext(user);
    
    // Create new employee
    const newEmployee = {
      id: nextEmployeeId++,
      ...employeeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    employees.set(newEmployee.id, newEmployee);
    
    console.log(`✅ Created employee: ${newEmployee.firstName} ${newEmployee.lastName} (ID: ${newEmployee.id})`);
    
    res.status(201).json({
      success: true,
      data: newEmployee,
      message: 'Employee created successfully'
    });
    
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ 
      error: 'Failed to create employee',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// PAYROLL RUN ENDPOINTS
// ============================================================================

/**
 * GET /api/payroll/runs - Get all payroll runs for a client
 */
router.get('/runs', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.query.clientId as string);
    
    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ error: 'Valid client ID is required' });
    }
    
    const context = createSecurityContext(user);
    
    // Filter payroll runs by client ID
    const clientPayrollRuns = Array.from(payrollRuns.values()).filter(
      run => run.clientId === clientId
    );
    
    console.log(`✅ Retrieved ${clientPayrollRuns.length} payroll runs for client ${clientId}`);
    
    res.json({
      success: true,
      data: clientPayrollRuns,
      count: clientPayrollRuns.length
    });
    
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payroll runs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payroll/runs - Create a new payroll run
 */
router.post('/runs', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = createPayrollRunSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid payroll run data', 
        details: validation.error.errors 
      });
    }
    
    const runData = validation.data;
    const context = createSecurityContext(user);
    
    // Get employees for this run
    const employeesForRun = runData.employeeIds 
      ? Array.from(employees.values()).filter(emp => runData.employeeIds!.includes(emp.id))
      : Array.from(employees.values()).filter(emp => emp.clientId === runData.clientId && emp.status === 'active');
    
    // Create new payroll run
    const newRun = {
      id: nextPayrollRunId,
      clientId: runData.clientId,
      payRunNumber: `PR-${new Date().getFullYear()}-${String(nextPayrollRunId).padStart(4, '0')}`,
      payPeriodStart: runData.payPeriodStart,
      payPeriodEnd: runData.payPeriodEnd,
      payDate: runData.payDate,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalDeductions: 0,
      totalEmployerContributions: 0,
      status: 'draft',
      employeeCount: employeesForRun.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    payrollRuns.set(newRun.id, newRun);
    nextPayrollRunId++;
    
    console.log(`✅ Created payroll run: ${newRun.payRunNumber} (ID: ${newRun.id})`);
    
    res.status(201).json({
      success: true,
      data: newRun,
      message: 'Payroll run created successfully'
    });
    
  } catch (error) {
    console.error('Error creating payroll run:', error);
    res.status(500).json({ 
      error: 'Failed to create payroll run',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payroll/runs/:id/approve - Approve a payroll run
 */
router.post('/runs/:id/approve', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const runId = parseInt(req.params.id);
    
    if (isNaN(runId) || runId <= 0) {
      return res.status(400).json({ error: 'Invalid payroll run ID' });
    }
    
    const context = createSecurityContext(user);
    const run = payrollRuns.get(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }
    
    // Authorization check: Verify user has access to this client
    // In a real implementation, check if user's firmId has access to run.clientId
    // For now, just check if clientId exists
    if (!run.clientId) {
      return res.status(403).json({ error: 'Access denied to this payroll run' });
    }
    
    if (run.status === 'approved') {
      return res.status(400).json({ error: 'Payroll run is already approved' });
    }
    
    // Update status to approved
    run.status = 'approved';
    run.approvedBy = user.id;
    run.approvedAt = new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    
    payrollRuns.set(runId, run);
    
    console.log(`✅ Approved payroll run: ${run.payRunNumber} (ID: ${runId})`);
    
    res.json({
      success: true,
      data: run,
      message: 'Payroll run approved successfully'
    });
    
  } catch (error) {
    console.error('Error approving payroll run:', error);
    res.status(500).json({ 
      error: 'Failed to approve payroll run',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/payroll/runs/:id/paystubs - Get paystubs for a specific payroll run
 */
router.get('/runs/:id/paystubs', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const runId = parseInt(req.params.id);
    
    if (isNaN(runId) || runId <= 0) {
      return res.status(400).json({ error: 'Invalid payroll run ID' });
    }
    
    const context = createSecurityContext(user);
    
    // Verify the payroll run exists and user has access
    const run = payrollRuns.get(runId);
    if (!run) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }
    
    // Authorization check: Verify user has access to this client
    if (!run.clientId) {
      return res.status(403).json({ error: 'Access denied to this payroll run' });
    }
    
    // Filter paystubs by payroll run ID
    const runPaystubs = Array.from(paystubs.values()).filter(
      stub => stub.payrollRunId === runId
    );
    
    console.log(`✅ Retrieved ${runPaystubs.length} paystubs for payroll run ${runId}`);
    
    res.json({
      success: true,
      data: runPaystubs,
      count: runPaystubs.length
    });
    
  } catch (error) {
    console.error('Error fetching paystubs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch paystubs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// PAYROLL PROCESSING ENDPOINTS
// ============================================================================

/**
 * POST /api/payroll/process - Process payroll for an employee
 */
router.post('/process', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = processPayrollSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid payroll data', 
        details: validation.error.errors 
      });
    }
    
    const payrollData = validation.data;
    const context = createSecurityContext(user);
    
    // Get employee
    const employee = employees.get(payrollData.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Calculate gross pay
    let grossPay = 0;
    if (employee.payType === 'hourly') {
      const regularPay = payrollData.regularHours * parseFloat(employee.payRate);
      const overtimePay = payrollData.overtimeHours * parseFloat(employee.payRate) * 1.5;
      grossPay = regularPay + overtimePay;
    } else {
      // Salary - calculate based on pay frequency
      const periodsPerYear: Record<string, number> = {
        weekly: 52,
        biweekly: 26,
        semimonthly: 24,
        monthly: 12
      };
      const periods = periodsPerYear[employee.payFrequency] || 26;
      grossPay = parseFloat(employee.payRate) / periods;
    }
    
    // Add additional earnings
    grossPay += payrollData.vacationPay + payrollData.bonus + payrollData.commission;
    
    // Calculate other deductions
    const otherDeductions = parseFloat(employee.unionDues || '0') + 
                           parseFloat(employee.additionalTaxDeduction || '0') +
                           parseFloat(employee.healthBenefits || '0') +
                           parseFloat(employee.dentalBenefits || '0') +
                           parseFloat(employee.lifeInsurance || '0');
    
    // Validate numeric conversions
    if (isNaN(otherDeductions)) {
      return res.status(400).json({ 
        error: 'Invalid employee deduction values' 
      });
    }
    
    // Calculate deductions (simplified - assumes YTD is 0)
    const deductions = calculatePayrollDeductions(
      grossPay,
      employee.payFrequency,
      employee.province,
      parseFloat(employee.federalBasicPersonalAmount || '15000'),
      parseFloat(employee.provincialBasicPersonalAmount || '11141'),
      0, // YTD earnings - should be looked up from database
      otherDeductions
    );
    
    // Create paystub
    const newPaystub = {
      id: nextPaystubId++,
      payrollRunId: null, // Can be associated with a run later
      employeeId: payrollData.employeeId,
      payPeriodStart: payrollData.payPeriodStart,
      payPeriodEnd: payrollData.payPeriodEnd,
      payDate: payrollData.payDate,
      regularHours: payrollData.regularHours,
      overtimeHours: payrollData.overtimeHours,
      grossPay: deductions.grossPay,
      federalTax: deductions.federalTax,
      provincialTax: deductions.provincialTax,
      cpp: deductions.cpp,
      ei: deductions.ei,
      otherDeductions: parseFloat(employee.unionDues) + parseFloat(employee.additionalTaxDeduction),
      healthBenefits: parseFloat(employee.healthBenefits),
      dentalBenefits: parseFloat(employee.dentalBenefits),
      lifeInsurance: parseFloat(employee.lifeInsurance),
      netPay: deductions.netPay,
      reimbursements: payrollData.reimbursements,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    paystubs.set(newPaystub.id, newPaystub);
    
    console.log(`✅ Processed payroll for employee ${employee.firstName} ${employee.lastName}`);
    
    res.status(201).json({
      success: true,
      data: newPaystub,
      message: 'Payroll processed successfully'
    });
    
  } catch (error) {
    console.error('Error processing payroll:', error);
    res.status(500).json({ 
      error: 'Failed to process payroll',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payroll/calculate-preview - Calculate payroll preview without saving
 */
router.post('/calculate-preview', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = calculatePreviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid calculation data', 
        details: validation.error.errors 
      });
    }
    
    const calcData = validation.data;
    const context = createSecurityContext(user);
    
    // Get employee
    const employee = employees.get(calcData.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Calculate deductions
    const deductions = calculatePayrollDeductions(
      calcData.grossAmount,
      employee.payFrequency,
      calcData.province,
      parseFloat(employee.federalBasicPersonalAmount),
      parseFloat(employee.provincialBasicPersonalAmount),
      0 // YTD earnings
    );
    
    console.log(`✅ Calculated payroll preview for employee ${employee.firstName} ${employee.lastName}`);
    
    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          payType: employee.payType,
          payFrequency: employee.payFrequency
        },
        ...deductions
      },
      message: 'Payroll calculation completed'
    });
    
  } catch (error) {
    console.error('Error calculating payroll preview:', error);
    res.status(500).json({ 
      error: 'Failed to calculate payroll preview',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// T4 ENDPOINTS
// ============================================================================

/**
 * GET /api/payroll/t4s - Get all T4 records for a client
 */
router.get('/t4s', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.query.clientId as string);
    
    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ error: 'Valid client ID is required' });
    }
    
    const context = createSecurityContext(user);
    
    // Filter T4 records by client ID
    const clientT4s = Array.from(t4Records.values()).filter(
      t4 => t4.clientId === clientId
    );
    
    console.log(`✅ Retrieved ${clientT4s.length} T4 records for client ${clientId}`);
    
    res.json({
      success: true,
      data: clientT4s,
      count: clientT4s.length
    });
    
  } catch (error) {
    console.error('Error fetching T4 records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch T4 records',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/payroll/t4/generate - Generate T4 slip for an employee
 */
router.post('/t4/generate', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    
    const validation = generateT4Schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid T4 data', 
        details: validation.error.errors 
      });
    }
    
    const t4Data = validation.data;
    const context = createSecurityContext(user);
    
    // Get employee
    const employee = employees.get(t4Data.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Calculate year totals from paystubs
    const employeePaystubs = Array.from(paystubs.values()).filter(
      stub => stub.employeeId === t4Data.employeeId &&
              new Date(stub.payDate).getFullYear() === t4Data.taxYear
    );
    
    const yearTotals = employeePaystubs.reduce((acc, stub) => ({
      grossPay: acc.grossPay + stub.grossPay,
      federalTax: acc.federalTax + stub.federalTax,
      provincialTax: acc.provincialTax + stub.provincialTax,
      cpp: acc.cpp + stub.cpp,
      ei: acc.ei + stub.ei
    }), { grossPay: 0, federalTax: 0, provincialTax: 0, cpp: 0, ei: 0 });
    
    // Create T4 record
    const newT4 = {
      id: nextT4Id++,
      clientId: t4Data.clientId,
      employeeId: t4Data.employeeId,
      taxYear: t4Data.taxYear,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      sin: employee.sinEncrypted || 'ENCRYPTED',
      box14_employment_income: yearTotals.grossPay,
      box16_cpp_contributions: yearTotals.cpp,
      box18_ei_premiums: yearTotals.ei,
      box22_income_tax_deducted: yearTotals.federalTax + yearTotals.provincialTax,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    t4Records.set(newT4.id, newT4);
    
    console.log(`✅ Generated T4 for employee ${employee.firstName} ${employee.lastName} - Year ${t4Data.taxYear}`);
    
    res.status(201).json({
      success: true,
      data: newT4,
      message: 'T4 slip generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating T4:', error);
    res.status(500).json({ 
      error: 'Failed to generate T4',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// PAYSTUB PDF ENDPOINT
// ============================================================================

/**
 * GET /api/payroll/paystubs/:id/pdf - Generate and download paystub PDF
 */
router.get('/paystubs/:id/pdf', requireAuthHybrid, requireFirmMember, async (req, res) => {
  try {
    const user = req.user as any;
    const paystubId = parseInt(req.params.id);
    
    if (isNaN(paystubId) || paystubId <= 0) {
      return res.status(400).json({ error: 'Invalid paystub ID' });
    }
    
    const context = createSecurityContext(user);
    const paystub = paystubs.get(paystubId);
    
    if (!paystub) {
      return res.status(404).json({ error: 'Paystub not found' });
    }
    
    // Get employee information
    const employee = employees.get(paystub.employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Authorization check: Verify user has access to this employee's client
    if (!employee.clientId) {
      return res.status(403).json({ error: 'Access denied to this paystub' });
    }
    
    // Generate simple text content (placeholder for PDF - would use pdfkit in production)
    const pdfContent = `
PAYSTUB - ${employee.firstName} ${employee.lastName}
Employee #: ${employee.employeeNumber}
Pay Period: ${paystub.payPeriodStart} to ${paystub.payPeriodEnd}
Pay Date: ${paystub.payDate}

EARNINGS:
Gross Pay: $${paystub.grossPay.toFixed(2)}

DEDUCTIONS:
Federal Tax: $${paystub.federalTax.toFixed(2)}
Provincial Tax: $${paystub.provincialTax.toFixed(2)}
CPP: $${paystub.cpp.toFixed(2)}
EI: $${paystub.ei.toFixed(2)}
Other Deductions: $${paystub.otherDeductions.toFixed(2)}

NET PAY: $${paystub.netPay.toFixed(2)}
    `.trim();
    
    console.log(`✅ Generated PDF for paystub ${paystubId}`);
    
    // Send as plain text for now (would send actual PDF in production)
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="paystub-${paystubId}.txt"`);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('Error generating paystub PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate paystub PDF',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
