/**
 * Time Tracking API Routes - Phase 4
 * 
 * RESTful endpoints for comprehensive time tracking system
 */

import { Router, Request, Response } from 'express';
import { timeTrackingService } from '../services/time-tracking.service';
import { db } from '../db';
import { 
  timeEntries, 
  timeSessions, 
  staffRates, 
  taskTypeRates, 
  clientRates,
  insertTimeEntrySchema,
  insertStaffRateSchema,
  insertTaskTypeRateSchema,
  insertClientRateSchema,
  insertTimeEntryCommentSchema,
  users
} from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

// RBAC Middleware
function requireManager(req: Request, res: Response, next: Function) {
  const user = req.user as any;
  if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Manager or Admin role required' });
  }
  next();
}

const router = Router();

// Apply security middleware to all routes
router.use(requireAuth);
router.use(setupTenantScope);

// ============================================================================
// TIMER MANAGEMENT
// ============================================================================

router.post('/api/time-tracking/timer/start', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { clientId, projectId, taskId, description } = req.body;

    const session = await timeTrackingService.startTimer({
      userId: user.id,
      firmId: user.firmId,
      clientId,
      projectId,
      taskId,
      description
    });

    res.json(session);
  } catch (error: any) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/timer/stop', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { sessionId, notes } = req.body;

    const timeEntry = await timeTrackingService.stopTimer({
      userId: user.id,
      firmId: user.firmId,
      sessionId,
      notes
    });

    res.json(timeEntry);
  } catch (error: any) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/timer/active', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = await timeTrackingService.getActiveTimer(user.id);

    res.json(session);
  } catch (error: any) {
    console.error('Error getting active timer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TIME ENTRY CRUD
// ============================================================================

router.post('/api/time-tracking/entries', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate request body with Zod schema
    const validationResult = insertTimeEntrySchema.omit({ 
      id: true, 
      userId: true, 
      firmId: true,
      createdAt: true,
      updatedAt: true
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      });
    }

    const entryData = {
      ...validationResult.data,
      userId: user.id,
      firmId: user.firmId
    };

    const timeEntry = await timeTrackingService.createTimeEntry(entryData, user.id);

    res.json(timeEntry);
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/entries', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { userId, clientId, projectId, taskId, status, startDate, endDate } = req.query;

    console.log('🔍 GET /api/time-tracking/entries - Query params:', { userId, clientId, projectId, taskId, status, startDate, endDate });

    const entries = await timeTrackingService.getTimeEntries({
      firmId: user.firmId,
      userId: userId ? parseInt(userId as string) : undefined,
      clientId: clientId ? parseInt(clientId as string) : undefined,
      projectId: projectId ? parseInt(projectId as string) : undefined,
      taskId: taskId ? parseInt(taskId as string) : undefined,
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    console.log('✅ GET /api/time-tracking/entries - Found', entries.length, 'entries for taskId:', taskId);

    res.json({ data: entries });
  } catch (error: any) {
    console.error('❌ Error fetching time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/time-tracking/entries/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timeEntryId = parseInt(req.params.id);

    // Check if user is admin or owns the entry
    const isAdmin = ['firm_admin', 'firm_owner', 'saas_owner', 'super_admin', 'manager'].includes(user.role?.toLowerCase());
    
    // Get the entry to check ownership
    const entries = await timeTrackingService.getTimeEntries({
      firmId: user.firmId,
    });
    const entry = entries.find((e: any) => e.id === timeEntryId);
    
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Only allow edit if user is admin or owns the entry
    if (!isAdmin && entry.userId !== user.id) {
      return res.status(403).json({ error: 'You can only edit your own time entries' });
    }

    const updated = await timeTrackingService.updateTimeEntry(
      timeEntryId,
      req.body,
      user.id,
      user.firmId
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/time-tracking/entries/:id', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const timeEntryId = parseInt(req.params.id);

    // Check if user is admin
    const isAdmin = ['firm_admin', 'firm_owner', 'saas_owner', 'super_admin', 'manager'].includes(user.role?.toLowerCase());
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete time entries' });
    }

    await timeTrackingService.deleteTimeEntry(timeEntryId, user.id, user.firmId);

    res.json({ success: true, message: 'Time entry deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

router.post('/api/time-tracking/entries/:id/submit', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const timeEntryId = parseInt(req.params.id);

    const entry = await timeTrackingService.submitForApproval(timeEntryId, user.id, user.firmId);

    res.json(entry);
  } catch (error: any) {
    console.error('Error submitting time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/entries/:id/approve', requireManager, async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;

    const timeEntryId = parseInt(req.params.id);

    const entry = await timeTrackingService.approveTimeEntry(timeEntryId, user.id, user.firmId);

    res.json(entry);
  } catch (error: any) {
    console.error('Error approving time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/entries/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    // Check manager role
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can reject time entries' });
    }

    const timeEntryId = parseInt(req.params.id);
    const { reason } = req.body;

    const entry = await timeTrackingService.rejectTimeEntry(
      timeEntryId, 
      user.id, 
      user.firmId,
      reason
    );

    res.json(entry);
  } catch (error: any) {
    console.error('Error rejecting time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/entries/bulk-approve', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    // Check manager role
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can approve time entries' });
    }

    const { timeEntryIds } = req.body;

    if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return res.status(400).json({ error: 'Invalid time entry IDs' });
    }

    await timeTrackingService.bulkApprove(timeEntryIds, user.id, user.firmId);

    res.json({ success: true, count: timeEntryIds.length });
  } catch (error: any) {
    console.error('Error bulk approving:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/entries/bulk-reject', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    // Check manager role
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can reject time entries' });
    }

    const { timeEntryIds } = req.body;

    if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return res.status(400).json({ error: 'Invalid time entry IDs' });
    }

    await timeTrackingService.bulkReject(timeEntryIds, user.id, user.firmId);

    res.json({ success: true, count: timeEntryIds.length });
  } catch (error: any) {
    console.error('Error bulk rejecting:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/approval-queue', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    // Check manager role
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can view approval queue' });
    }

    const { status = 'submitted' } = req.query;

    const queue = await timeTrackingService.getApprovalQueue(user.firmId, status as string);

    res.json(queue);
  } catch (error: any) {
    console.error('Error fetching approval queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMMENTS & AUDIT TRAIL
// ============================================================================

router.post('/api/time-tracking/entries/:id/comments', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const timeEntryId = parseInt(req.params.id);
    const { comment, isInternal } = req.body;

    const created = await timeTrackingService.addComment({
      timeEntryId,
      firmId: user.firmId,
      userId: user.id,
      comment,
      isInternal: isInternal || false
    });

    res.json(created);
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/entries/:id/comments', async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timeEntryId = parseInt(req.params.id);

    const comments = await timeTrackingService.getComments(timeEntryId, user.firmId);

    // Join with users table to get user names
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment: any) => {
        const [userData] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, comment.userId))
          .limit(1);
        return {
          ...comment,
          userName: userData?.name || userData?.email || 'Unknown'
        };
      })
    );

    res.json(commentsWithUsers);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/entries/:id/audit', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const timeEntryId = parseInt(req.params.id);

    const history = await timeTrackingService.getAuditHistory(timeEntryId, user.firmId);

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RATE MANAGEMENT
// ============================================================================

// Staff Rates
router.post('/api/time-tracking/rates/staff', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    // Only managers can set rates
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can set staff rates' });
    }

    const rateData = {
      ...req.body,
      firmId: user.firmId
    };

    const [rate] = await db
      .insert(staffRates)
      .values(rateData)
      .returning();

    res.json(rate);
  } catch (error: any) {
    console.error('Error creating staff rate:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/rates/staff', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { userId } = req.query;

    const conditions = [eq(staffRates.firmId, user.firmId)];
    
    if (userId) {
      conditions.push(eq(staffRates.userId, parseInt(userId as string)));
    }

    const rates = await db
      .select()
      .from(staffRates)
      .where(and(...conditions));

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching staff rates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task Type Rates
router.post('/api/time-tracking/rates/task-types', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can set task type rates' });
    }

    const rateData = {
      ...req.body,
      firmId: user.firmId
    };

    const [rate] = await db
      .insert(taskTypeRates)
      .values(rateData)
      .returning();

    res.json(rate);
  } catch (error: any) {
    console.error('Error creating task type rate:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/rates/task-types', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;

    const rates = await db
      .select()
      .from(taskTypeRates)
      .where(eq(taskTypeRates.firmId, user.firmId));

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching task type rates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Client Rates
router.post('/api/time-tracking/rates/clients', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only managers can set client rates' });
    }

    const rateData = {
      ...req.body,
      firmId: user.firmId
    };

    const [rate] = await db
      .insert(clientRates)
      .values(rateData)
      .returning();

    res.json(rate);
  } catch (error: any) {
    console.error('Error creating client rate:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/time-tracking/rates/clients', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { clientId } = req.query;

    const conditions = [eq(clientRates.firmId, user.firmId)];
    
    if (clientId) {
      conditions.push(eq(clientRates.clientId, parseInt(clientId as string)));
    }

    const rates = await db
      .select()
      .from(clientRates)
      .where(and(...conditions));

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching client rates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BILLING INTEGRATION
// ============================================================================

router.get('/api/time-tracking/unbilled', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;

    const unbilled = await timeTrackingService.getUnbilledTime(user.firmId);

    res.json(unbilled);
  } catch (error: any) {
    console.error('Error fetching unbilled time:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/time-tracking/mark-billed', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { timeEntryIds } = req.body;

    if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return res.status(400).json({ error: 'Invalid time entry IDs' });
    }

    await timeTrackingService.markAsBilled(timeEntryIds, user.firmId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking as billed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TIME REPORTS
// ============================================================================

// Time by Client
router.get('/api/time-tracking/reports/by-client', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { startDate, endDate } = req.query;

    const conditions = [eq(timeEntries.firmId, user.firmId)];
    if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate as string)));
    if (endDate) conditions.push(lte(timeEntries.endTime, new Date(endDate as string)));

    const result = await db
      .select({
        clientId: timeEntries.clientId,
        totalHours: sql<number>`SUM(${timeEntries.duration}) / 3600`,
        billableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} = 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        totalAmount: sql<number>`SUM(CAST(${timeEntries.billableAmount} AS DECIMAL))`,
        entryCount: sql<number>`COUNT(*)`
      })
      .from(timeEntries)
      .where(and(...conditions))
      .groupBy(timeEntries.clientId);

    res.json(result);
  } catch (error: any) {
    console.error('Error generating time by client report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Time by Staff
router.get('/api/time-tracking/reports/by-staff', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { startDate, endDate } = req.query;

    const conditions = [eq(timeEntries.firmId, user.firmId)];
    if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate as string)));
    if (endDate) conditions.push(lte(timeEntries.endTime, new Date(endDate as string)));

    const result = await db
      .select({
        userId: timeEntries.userId,
        totalHours: sql<number>`SUM(${timeEntries.duration}) / 3600`,
        billableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} = 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        nonBillableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} != 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        totalAmount: sql<number>`SUM(CAST(${timeEntries.billableAmount} AS DECIMAL))`,
        entryCount: sql<number>`COUNT(*)`
      })
      .from(timeEntries)
      .where(and(...conditions))
      .groupBy(timeEntries.userId);

    res.json(result);
  } catch (error: any) {
    console.error('Error generating time by staff report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Time by Project
router.get('/api/time-tracking/reports/by-project', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { startDate, endDate } = req.query;

    const conditions = [eq(timeEntries.firmId, user.firmId)];
    if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate as string)));
    if (endDate) conditions.push(lte(timeEntries.endTime, new Date(endDate as string)));

    const result = await db
      .select({
        projectId: timeEntries.projectId,
        totalHours: sql<number>`SUM(${timeEntries.duration}) / 3600`,
        billableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} = 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        totalAmount: sql<number>`SUM(CAST(${timeEntries.billableAmount} AS DECIMAL))`,
        entryCount: sql<number>`COUNT(*)`
      })
      .from(timeEntries)
      .where(and(...conditions))
      .groupBy(timeEntries.projectId);

    res.json(result);
  } catch (error: any) {
    console.error('Error generating time by project report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Billable vs Non-Billable
router.get('/api/time-tracking/reports/billable-comparison', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user as any;
    const { startDate, endDate } = req.query;

    const conditions = [eq(timeEntries.firmId, user.firmId)];
    if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate as string)));
    if (endDate) conditions.push(lte(timeEntries.endTime, new Date(endDate as string)));

    const [result] = await db
      .select({
        totalHours: sql<number>`SUM(${timeEntries.duration}) / 3600`,
        billableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} = 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        nonBillableHours: sql<number>`SUM(CASE WHEN ${timeEntries.type} != 'billable' THEN ${timeEntries.duration} ELSE 0 END) / 3600`,
        billablePercentage: sql<number>`(SUM(CASE WHEN ${timeEntries.type} = 'billable' THEN ${timeEntries.duration} ELSE 0 END)::float / NULLIF(SUM(${timeEntries.duration}), 0)) * 100`
      })
      .from(timeEntries)
      .where(and(...conditions));

    res.json(result || { totalHours: 0, billableHours: 0, nonBillableHours: 0, billablePercentage: 0 });
  } catch (error: any) {
    console.error('Error generating billable comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
