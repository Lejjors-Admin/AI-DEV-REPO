/**
 * Pages Billing Routes
 * 
 * Firm billing clients for professional services
 * (Different from Books invoicing which is for client's customers)
 */

import express from 'express';
import { db } from '../db';
import { 
  invoices as billingInvoices,
  invoiceLineItems
} from '../../shared/database/billing-schema';
import { clients } from '../../shared/database/core-entities';
import { timeEntries } from '../../shared/database/time-tracking-schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

const router = express.Router();

// Apply security middleware to all routes
router.use(requireAuth);
router.use(setupTenantScope);

// Schema for creating invoice from time entries
const createInvoiceFromTimeSchema = z.object({
  clientId: z.number().int().positive(),
  timeEntryIds: z.array(z.number().int().positive()).min(1, 'At least one time entry is required'),
  dueDate: z.string().optional(), // ISO date string
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// Create invoice from time entries
router.post('/invoices/from-time', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validationResult = createInvoiceFromTimeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }

    const { clientId, timeEntryIds, dueDate, notes, terms } = validationResult.data;

    // Validate client belongs to firm
    const [client] = await db.select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.firmId, user.firmId)
      ))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get time entries and calculate total
    const entries = await db.select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.firmId, user.firmId),
        eq(timeEntries.clientId, clientId),
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.status, 'approved') // Only use approved time entries
      ));

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No approved time entries found for the specified IDs' });
    }

    // Calculate total from billable hours
    let subtotal = 0;
    const lineItems = [];

    for (const entry of entries) {
      const hours = Number(entry.duration) / 3600;
      const rate = Number(entry.billableRate) || 150; // Default rate if not set
      const amount = hours * rate;
      subtotal += amount;

      lineItems.push({
        description: entry.description || `Time entry ${entry.id}`,
        quantity: hours.toString(),
        unitPrice: rate.toString(),
        amount: amount.toString(),
        timeEntryId: entry.id,
        firmId: user.firmId,
      });
    }

    // Generate invoice number (simple incrementing for now)
    // In production, use billing settings for proper numbering
    const invoiceCount = await db.select({ count: sql<number>`count(*)` })
      .from(billingInvoices)
      .where(eq(billingInvoices.firmId, user.firmId));
    
    const nextNumber = (invoiceCount[0]?.count || 0) + 1;
    const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;

    // Calculate dates
    const invoiceDate = new Date();
    const dueDateObj = dueDate ? new Date(dueDate) : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Create invoice
    const [invoice] = await db.insert(billingInvoices).values({
      firmId: user.firmId,
      clientId,
      invoiceNumber,
      subtotal: subtotal.toString(),
      taxAmount: '0',
      discountAmount: '0',
      total: subtotal.toString(),
      paidAmount: '0',
      balanceDue: subtotal.toString(),
      invoiceDate,
      dueDate: dueDateObj,
      status: 'draft',
      notes: notes || null,
      terms: terms || null,
    }).returning();

    // Create invoice line items
    if (lineItems.length > 0) {
      await db.insert(invoiceLineItems).values(
        lineItems.map(item => ({
          ...item,
          invoiceId: invoice.id,
        }))
      );
    }

    // Mark time entries as billed
    await db.update(timeEntries)
      .set({ 
        status: 'billed',
        billedAt: new Date()
      })
      .where(and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.firmId, user.firmId)
      ));

    res.status(201).json({ 
      success: true, 
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Get firm invoices
router.get('/invoices', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { clientId, status, limit = '50', offset = '0' } = req.query;

    let conditions = [eq(billingInvoices.firmId, user.firmId)];

    if (clientId) {
      conditions.push(eq(billingInvoices.clientId, parseInt(clientId as string)));
    }

    if (status) {
      conditions.push(eq(billingInvoices.status, status as string));
    }

    const invoices = await db.select()
      .from(billingInvoices)
      .where(and(...conditions))
      .limit(Math.min(parseInt(limit as string), 100))
      .offset(parseInt(offset as string))
      .orderBy(sql`${billingInvoices.createdAt} DESC`);

    res.json({ 
      success: true, 
      data: invoices 
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice details by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    // Get invoice
    const [invoice] = await db.select()
      .from(billingInvoices)
      .where(and(
        eq(billingInvoices.id, invoiceId),
        eq(billingInvoices.firmId, user.firmId)
      ))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get line items
    const lineItems = await db.select()
      .from(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.invoiceId, invoiceId),
        eq(invoiceLineItems.firmId, user.firmId)
      ));

    res.json({ 
      success: true, 
      data: {
        ...invoice,
        lineItems
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

export default router;
