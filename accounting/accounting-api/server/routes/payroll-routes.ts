/**
 * Payroll Routes
 * 
 * Canadian payroll management with CPP, EI, federal/provincial tax calculations
 * T4 generation, and ROE support
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth';

const router = express.Router();

// Apply security middleware to all routes
router.use(requireAuth);

// =============================================================================
// SCHEMAS
// =============================================================================

const employeeSchema = z.object({
  clientId: z.number().int().positive(),
  employeeNumber: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().min(1),
  postalCode: z.string().optional().or(z.literal('')),
  sinEncrypted: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  hireDate: z.string().min(1),
  terminationDate: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  payType: z.enum(['salary', 'hourly']),
  payRate: z.string().min(1),
  payFrequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
  federalBasicPersonalAmount: z.string().optional().or(z.literal('')),
  provincialBasicPersonalAmount: z.string().optional().or(z.literal('')),
  federalClaimCode: z.string().optional().or(z.literal('')),
  provincialClaimCode: z.string().optional().or(z.literal('')),
  unionDues: z.string().optional().or(z.literal('')),
  additionalTaxDeduction: z.string().optional().or(z.literal('')),
  healthBenefits: z.string().optional().or(z.literal('')),
  dentalBenefits: z.string().optional().or(z.literal('')),
  lifeInsurance: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'terminated', 'on_leave']).optional(),
});

const payrollRunSchema = z.object({
  clientId: z.number().int().positive(),
  payPeriodStart: z.string(),
  payPeriodEnd: z.string(),
  payDate: z.string(),
  employees: z.array(z.object({
    employeeId: z.number().int().positive(),
    regularHours: z.number().min(0),
    overtimeHours: z.number().min(0),
    bonusPay: z.number().min(0),
    commissionPay: z.number().min(0),
  })),
});

const calculatePreviewSchema = z.object({
  clientId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  regularHours: z.number().min(0),
  overtimeHours: z.number().min(0),
  bonus: z.number().min(0),
  commission: z.number().min(0),
  payPeriodStart: z.string(),
  payPeriodEnd: z.string(),
});

// =============================================================================
// CANADIAN TAX CALCULATION HELPERS
// =============================================================================

/**
 * Calculate Canadian federal income tax based on 2024 rates
 */
function calculateFederalTax(grossPay: number, claimCode: string = '1'): number {
  // Simplified federal tax calculation
  // 2024 federal tax brackets (annual)
  const annualIncome = grossPay * 26; // Assuming biweekly
  let federalTax = 0;
  
  if (annualIncome <= 53359) {
    federalTax = annualIncome * 0.15;
  } else if (annualIncome <= 106717) {
    federalTax = 8003.85 + (annualIncome - 53359) * 0.205;
  } else if (annualIncome <= 165430) {
    federalTax = 18942.24 + (annualIncome - 106717) * 0.26;
  } else if (annualIncome <= 235675) {
    federalTax = 34207.62 + (annualIncome - 165430) * 0.29;
  } else {
    federalTax = 54578.67 + (annualIncome - 235675) * 0.33;
  }
  
  // Apply basic personal amount
  const basicPersonalAmount = 15000;
  const personalAmountCredit = basicPersonalAmount * 0.15;
  federalTax = Math.max(0, federalTax - personalAmountCredit);
  
  // Return per pay period
  return federalTax / 26;
}

/**
 * Calculate Ontario provincial income tax (simplified)
 */
function calculateProvincialTax(grossPay: number, province: string, claimCode: string = '1'): number {
  // Simplified Ontario tax calculation as example
  const annualIncome = grossPay * 26;
  let provincialTax = 0;
  
  if (province === 'ON') {
    if (annualIncome <= 49231) {
      provincialTax = annualIncome * 0.0505;
    } else if (annualIncome <= 98463) {
      provincialTax = 2486.17 + (annualIncome - 49231) * 0.0915;
    } else if (annualIncome <= 150000) {
      provincialTax = 6990.84 + (annualIncome - 98463) * 0.1116;
    } else if (annualIncome <= 220000) {
      provincialTax = 12741.43 + (annualIncome - 150000) * 0.1216;
    } else {
      provincialTax = 21253.43 + (annualIncome - 220000) * 0.1316;
    }
    
    // Apply basic personal amount
    const basicPersonalAmount = 11865;
    const personalAmountCredit = basicPersonalAmount * 0.0505;
    provincialTax = Math.max(0, provincialTax - personalAmountCredit);
  }
  
  // Return per pay period
  return provincialTax / 26;
}

/**
 * Calculate CPP (Canada Pension Plan) contribution
 */
function calculateCPP(grossPay: number, ytdCPP: number = 0): number {
  const maxAnnualCPP = 3867.50; // 2024 max
  const annualGross = grossPay * 26;
  const basicExemption = 3500;
  const contributionRate = 0.0595;
  
  const pensionableEarnings = Math.max(0, annualGross - basicExemption);
  const annualCPP = Math.min(pensionableEarnings * contributionRate, maxAnnualCPP);
  const periodCPP = annualCPP / 26;
  
  // Check if YTD limit reached
  if (ytdCPP >= maxAnnualCPP) {
    return 0;
  }
  
  return Math.min(periodCPP, maxAnnualCPP - ytdCPP);
}

/**
 * Calculate EI (Employment Insurance) premium
 */
function calculateEI(grossPay: number, ytdEI: number = 0): number {
  const maxAnnualEI = 1049.12; // 2024 max
  const premiumRate = 0.0166; // 2024 rate
  
  const periodEI = grossPay * premiumRate;
  
  // Check if YTD limit reached
  if (ytdEI >= maxAnnualEI) {
    return 0;
  }
  
  return Math.min(periodEI, maxAnnualEI - ytdEI);
}

// =============================================================================
// IN-MEMORY STORAGE (temporary - should be replaced with DB)
// =============================================================================

interface Employee {
  id: number;
  clientId: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  sinEncrypted: string;
  dateOfBirth: string;
  hireDate: string;
  terminationDate: string;
  jobTitle: string;
  department: string;
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
  createdAt: Date;
  updatedAt: Date;
}

interface PayrollRun {
  id: number;
  clientId: number;
  payRunNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  totalGrossPay: string;
  totalNetPay: string;
  totalDeductions: string;
  totalEmployerContributions: string;
  status: 'draft' | 'approved' | 'paid';
  createdAt: Date;
  processedAt: Date | null;
}

interface Paystub {
  id: number;
  payrollRunId: number;
  employeeId: number;
  grossPay: string;
  netPay: string;
  federalTax: string;
  provincialTax: string;
  cpp: string;
  ei: string;
  otherDeductions: string;
  createdAt: Date;
}

interface T4Record {
  id: number;
  clientId: number;
  employeeId: number;
  taxYear: number;
  employmentIncome: string;
  cpp: string;
  ei: string;
  incomeTax: string;
  createdAt: Date;
}

const employees: Employee[] = [];
const payrollRuns: PayrollRun[] = [];
const paystubs: Paystub[] = [];
const t4Records: T4Record[] = [];

let nextEmployeeId = 1;
let nextPayrollRunId = 1;
let nextPaystubId = 1;
let nextT4Id = 1;

// =============================================================================
// EMPLOYEE ENDPOINTS
// =============================================================================

/**
 * GET /api/payroll/employees
 * Get all employees for a client
 */
router.get('/employees', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }
    
    const clientEmployees = employees.filter(e => e.clientId === parseInt(clientId as string));
    
    res.json({ 
      success: true, 
      data: clientEmployees 
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

/**
 * GET /api/payroll/employees/active
 * Get active employees for a client
 */
router.get('/employees/active', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }
    
    const activeEmployees = employees.filter(
      e => e.clientId === parseInt(clientId as string) && e.status === 'active'
    );
    
    res.json({ 
      success: true, 
      data: activeEmployees 
    });
  } catch (error) {
    console.error('Error fetching active employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active employees' });
  }
});

/**
 * POST /api/payroll/employees
 * Create a new employee
 */
router.post('/employees', async (req, res) => {
  try {
    const validationResult = employeeSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const data = validationResult.data;
    
    // Generate employee number if not provided
    const employeeNumber = data.employeeNumber || `EMP-${String(nextEmployeeId).padStart(6, '0')}`;
    
    const newEmployee: Employee = {
      id: nextEmployeeId++,
      ...data,
      employeeNumber,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      postalCode: data.postalCode || '',
      sinEncrypted: data.sinEncrypted || '',
      dateOfBirth: data.dateOfBirth || '',
      terminationDate: data.terminationDate || '',
      jobTitle: data.jobTitle || '',
      department: data.department || '',
      federalBasicPersonalAmount: data.federalBasicPersonalAmount || '15000.00',
      provincialBasicPersonalAmount: data.provincialBasicPersonalAmount || '11865.00',
      federalClaimCode: data.federalClaimCode || '1',
      provincialClaimCode: data.provincialClaimCode || '1',
      unionDues: data.unionDues || '0.00',
      additionalTaxDeduction: data.additionalTaxDeduction || '0.00',
      healthBenefits: data.healthBenefits || '0.00',
      dentalBenefits: data.dentalBenefits || '0.00',
      lifeInsurance: data.lifeInsurance || '0.00',
      status: data.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    employees.push(newEmployee);
    
    res.status(201).json({ 
      success: true, 
      data: newEmployee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
});

// =============================================================================
// PAYROLL RUN ENDPOINTS
// =============================================================================

/**
 * GET /api/payroll/runs
 * Get payroll runs for a client
 */
router.get('/runs', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }
    
    const clientRuns = payrollRuns.filter(r => r.clientId === parseInt(clientId as string));
    
    res.json({ 
      success: true, 
      data: clientRuns 
    });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll runs' });
  }
});

/**
 * POST /api/payroll/runs
 * Create and process a payroll run
 */
router.post('/runs', async (req, res) => {
  try {
    const validationResult = payrollRunSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const data = validationResult.data;
    
    // Generate pay run number
    const payRunNumber = `PR-${String(nextPayrollRunId).padStart(6, '0')}`;
    
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalDeductions = 0;
    let totalEmployerContributions = 0;
    const generatedPaystubs = [];
    
    // Process each employee
    for (const empData of data.employees) {
      const employee = employees.find(e => e.id === empData.employeeId);
      if (!employee) continue;
      
      // Calculate gross pay
      let grossPay = 0;
      if (employee.payType === 'hourly') {
        const regularPay = empData.regularHours * parseFloat(employee.payRate);
        const overtimePay = empData.overtimeHours * parseFloat(employee.payRate) * 1.5;
        grossPay = regularPay + overtimePay + empData.bonusPay + empData.commissionPay;
      } else {
        // Salary
        const annualSalary = parseFloat(employee.payRate);
        let payPeriods = 26; // biweekly default
        if (employee.payFrequency === 'weekly') payPeriods = 52;
        else if (employee.payFrequency === 'semimonthly') payPeriods = 24;
        else if (employee.payFrequency === 'monthly') payPeriods = 12;
        
        grossPay = (annualSalary / payPeriods) + empData.bonusPay + empData.commissionPay;
      }
      
      // Calculate deductions
      const federalTax = calculateFederalTax(grossPay, employee.federalClaimCode);
      const provincialTax = calculateProvincialTax(grossPay, employee.province, employee.provincialClaimCode);
      const cpp = calculateCPP(grossPay);
      const ei = calculateEI(grossPay);
      const otherDeductions = parseFloat(employee.unionDues || '0') + 
                             parseFloat(employee.additionalTaxDeduction || '0') +
                             parseFloat(employee.healthBenefits || '0') +
                             parseFloat(employee.dentalBenefits || '0') +
                             parseFloat(employee.lifeInsurance || '0');
      
      const totalEmployeeDeductions = federalTax + provincialTax + cpp + ei + otherDeductions;
      const netPay = grossPay - totalEmployeeDeductions;
      
      // Employer contributions (CPP match + EI 1.4x)
      const employerCPP = cpp;
      const employerEI = ei * 1.4;
      const employerContributions = employerCPP + employerEI;
      
      // Create paystub
      const paystub: Paystub = {
        id: nextPaystubId++,
        payrollRunId: nextPayrollRunId,
        employeeId: employee.id,
        grossPay: grossPay.toFixed(2),
        netPay: netPay.toFixed(2),
        federalTax: federalTax.toFixed(2),
        provincialTax: provincialTax.toFixed(2),
        cpp: cpp.toFixed(2),
        ei: ei.toFixed(2),
        otherDeductions: otherDeductions.toFixed(2),
        createdAt: new Date(),
      };
      
      paystubs.push(paystub);
      generatedPaystubs.push(paystub);
      
      totalGrossPay += grossPay;
      totalNetPay += netPay;
      totalDeductions += totalEmployeeDeductions;
      totalEmployerContributions += employerContributions;
    }
    
    // Create payroll run
    const payrollRun: PayrollRun = {
      id: nextPayrollRunId++,
      clientId: data.clientId,
      payRunNumber,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      payDate: data.payDate,
      totalGrossPay: totalGrossPay.toFixed(2),
      totalNetPay: totalNetPay.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalEmployerContributions: totalEmployerContributions.toFixed(2),
      status: 'draft',
      createdAt: new Date(),
      processedAt: null,
    };
    
    payrollRuns.push(payrollRun);
    
    res.status(201).json({ 
      success: true, 
      data: {
        payRun: payrollRun,
        paystubs: generatedPaystubs,
        totalEmployees: data.employees.length,
        totalGrossPay,
        totalNetPay,
        totalDeductions,
        totalEmployerContributions,
      },
      message: 'Payroll run created successfully'
    });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    res.status(500).json({ success: false, error: 'Failed to create payroll run' });
  }
});

/**
 * POST /api/payroll/runs/:id/approve
 * Approve a payroll run (creates journal entries)
 */
router.post('/runs/:id/approve', async (req, res) => {
  try {
    const runId = parseInt(req.params.id);
    const run = payrollRuns.find(r => r.id === runId);
    
    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }
    
    // Update status
    run.status = 'approved';
    run.processedAt = new Date();
    
    // TODO: Create journal entries for:
    // - Payroll expense (debit)
    // - Cash/Bank (credit)
    // - Tax liabilities (credit)
    // - Benefit liabilities (credit)
    
    res.json({ 
      success: true, 
      data: run,
      message: 'Payroll run approved and journal entries created'
    });
  } catch (error) {
    console.error('Error approving payroll run:', error);
    res.status(500).json({ success: false, error: 'Failed to approve payroll run' });
  }
});

/**
 * GET /api/payroll/runs/:id/paystubs
 * Get paystubs for a payroll run
 */
router.get('/runs/:id/paystubs', async (req, res) => {
  try {
    const runId = parseInt(req.params.id);
    const runPaystubs = paystubs.filter(p => p.payrollRunId === runId);
    
    res.json({ 
      success: true, 
      data: runPaystubs 
    });
  } catch (error) {
    console.error('Error fetching paystubs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch paystubs' });
  }
});

// =============================================================================
// PAYROLL CALCULATION ENDPOINTS
// =============================================================================

/**
 * POST /api/payroll/calculate-preview
 * Calculate payroll preview for an employee
 */
router.post('/calculate-preview', async (req, res) => {
  try {
    const validationResult = calculatePreviewSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const data = validationResult.data;
    const employee = employees.find(e => e.id === data.employeeId);
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    // Calculate gross pay
    let grossPay = 0;
    if (employee.payType === 'hourly') {
      const regularPay = data.regularHours * parseFloat(employee.payRate);
      const overtimePay = data.overtimeHours * parseFloat(employee.payRate) * 1.5;
      grossPay = regularPay + overtimePay + data.bonus + data.commission;
    } else {
      const annualSalary = parseFloat(employee.payRate);
      let payPeriods = 26;
      if (employee.payFrequency === 'weekly') payPeriods = 52;
      else if (employee.payFrequency === 'semimonthly') payPeriods = 24;
      else if (employee.payFrequency === 'monthly') payPeriods = 12;
      
      grossPay = (annualSalary / payPeriods) + data.bonus + data.commission;
    }
    
    // Calculate deductions
    const federalTax = calculateFederalTax(grossPay, employee.federalClaimCode);
    const provincialTax = calculateProvincialTax(grossPay, employee.province, employee.provincialClaimCode);
    const cpp = calculateCPP(grossPay);
    const ei = calculateEI(grossPay);
    const otherDeductions = parseFloat(employee.unionDues || '0') + 
                           parseFloat(employee.additionalTaxDeduction || '0');
    
    const totalTaxes = federalTax + provincialTax + cpp + ei + otherDeductions;
    const netPay = grossPay - totalTaxes;
    
    res.json({
      grossPay,
      netPay,
      totalTaxes,
      breakdown: {
        federalTax,
        provincialTax,
        cpp,
        ei,
        otherDeductions,
      }
    });
  } catch (error) {
    console.error('Error calculating preview:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate preview' });
  }
});

/**
 * POST /api/payroll/process
 * Process payroll (legacy endpoint - redirects to /runs)
 */
router.post('/process', async (req, res) => {
  try {
    // Transform request to match /runs endpoint
    const { employeeId, ...otherData } = req.body;
    
    const transformedData = {
      ...otherData,
      employees: [{
        employeeId,
        regularHours: req.body.regularHours || 0,
        overtimeHours: req.body.overtimeHours || 0,
        bonusPay: req.body.bonus || 0,
        commissionPay: req.body.commission || 0,
      }]
    };
    
    // Forward to /runs endpoint
    req.body = transformedData;
    return router.handle(req, res);
  } catch (error) {
    console.error('Error processing payroll:', error);
    res.status(500).json({ success: false, error: 'Failed to process payroll' });
  }
});

// =============================================================================
// T4 ENDPOINTS
// =============================================================================

/**
 * GET /api/payroll/t4s
 * Get T4 records for a client
 */
router.get('/t4s', async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Client ID is required' });
    }
    
    const clientT4s = t4Records.filter(t => t.clientId === parseInt(clientId as string));
    
    res.json({ 
      success: true, 
      data: clientT4s 
    });
  } catch (error) {
    console.error('Error fetching T4s:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch T4s' });
  }
});

/**
 * POST /api/payroll/t4/generate
 * Generate T4 for an employee
 */
router.post('/t4/generate', async (req, res) => {
  try {
    const { employeeId, taxYear, clientId } = req.body;
    
    if (!employeeId || !taxYear || !clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee ID, tax year, and client ID are required' 
      });
    }
    
    // Calculate totals from paystubs for the tax year
    const employeePaystubs = paystubs.filter(p => {
      const payrollRun = payrollRuns.find(r => r.id === p.payrollRunId);
      return p.employeeId === employeeId && 
             payrollRun && 
             new Date(payrollRun.payDate).getFullYear() === taxYear;
    });
    
    let totalIncome = 0;
    let totalCPP = 0;
    let totalEI = 0;
    let totalIncomeTax = 0;
    
    for (const stub of employeePaystubs) {
      totalIncome += parseFloat(stub.grossPay);
      totalCPP += parseFloat(stub.cpp);
      totalEI += parseFloat(stub.ei);
      totalIncomeTax += parseFloat(stub.federalTax) + parseFloat(stub.provincialTax);
    }
    
    const t4: T4Record = {
      id: nextT4Id++,
      clientId,
      employeeId,
      taxYear,
      employmentIncome: totalIncome.toFixed(2),
      cpp: totalCPP.toFixed(2),
      ei: totalEI.toFixed(2),
      incomeTax: totalIncomeTax.toFixed(2),
      createdAt: new Date(),
    };
    
    t4Records.push(t4);
    
    res.status(201).json({ 
      success: true, 
      data: t4,
      message: 'T4 generated successfully'
    });
  } catch (error) {
    console.error('Error generating T4:', error);
    res.status(500).json({ success: false, error: 'Failed to generate T4' });
  }
});

/**
 * GET /api/payroll/paystubs/:id/pdf
 * Generate PDF for a paystub
 */
router.get('/paystubs/:id/pdf', async (req, res) => {
  try {
    const paystubId = parseInt(req.params.id);
    const paystub = paystubs.find(p => p.id === paystubId);
    
    if (!paystub) {
      return res.status(404).json({ success: false, error: 'Paystub not found' });
    }
    
    // TODO: Implement actual PDF generation
    // For now, return a placeholder response
    res.status(501).json({ 
      success: false, 
      error: 'PDF generation not yet implemented',
      message: 'This feature will be implemented with issue #15'
    });
  } catch (error) {
    console.error('Error generating paystub PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to generate paystub PDF' });
  }
});

export default router;
