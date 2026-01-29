/**
 * Time Tracking Service - Phase 4
 * 
 * Comprehensive time tracking with:
 * - Task-linked time entries
 * - Active timer management
 * - Approval workflow
 * - Audit trail
 * - Rate management and billing calculations
 */

import { db } from '../db';
import { 
  timeEntries, 
  timeSessions, 
  timeEntryComments,
  timeEntryAuditLog,
  staffRates,
  taskTypeRates,
  clientRates,
  type InsertTimeEntry,
  type InsertTimeSession,
  type InsertTimeEntryComment,
  type InsertTimeEntryAuditLog
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

export class TimeTrackingService {
  
  /**
   * Start a timer - creates active time session
   */
  async startTimer(params: {
    userId: number;
    firmId: number;
    clientId?: number;
    projectId?: number;
    taskId?: number;
    description?: string;
  }): Promise<any> {
    // Stop any existing active timers for this user
    await db
      .update(timeSessions)
      .set({ isActive: false })
      .where(and(
        eq(timeSessions.userId, params.userId),
        eq(timeSessions.isActive, true)
      ));

    // Create new session
    const [session] = await db
      .insert(timeSessions)
      .values({
        ...params,
        startTime: new Date(),
        isActive: true
      })
      .returning();

    return session;
  }

  /**
   * Stop active timer - converts to time entry
   */
  async stopTimer(params: {
    userId: number;
    firmId: number;
    sessionId?: number;
    notes?: string;
  }): Promise<any> {
    const { userId, firmId, sessionId, notes } = params;

    // Get active session
    const query = sessionId
      ? and(eq(timeSessions.id, sessionId), eq(timeSessions.userId, userId))
      : and(eq(timeSessions.userId, userId), eq(timeSessions.isActive, true));

    const [session] = await db
      .select()
      .from(timeSessions)
      .where(query)
      .limit(1);

    if (!session) {
      throw new Error('No active timer found');
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);

    // Get applicable rate
    const rate = await this.getApplicableRate({
      userId,
      firmId,
      clientId: session.clientId || undefined,
      taskId: session.taskId || undefined
    });

    // Calculate billable amount
    const hours = duration / 3600;
    const billableAmount = rate ? (hours * parseFloat(rate.toString())).toFixed(2) : null;

    // Create time entry
    console.log('🕐 stopTimer: Creating time entry with taskId:', session.taskId, 'projectId:', session.projectId, 'clientId:', session.clientId, 'notes:', notes);
    const [timeEntry] = await db
      .insert(timeEntries)
      .values({
        userId,
        firmId,
        clientId: session.clientId,
        projectId: session.projectId,
        taskId: session.taskId,
        startTime: session.startTime,
        endTime,
        duration,
        description: session.description || 'Time tracked',
        type: 'billable',
        status: 'draft',
        billableRate: rate,
        billableAmount
      })
      .returning();

    console.log('✅ stopTimer: Time entry created:', { id: timeEntry.id, taskId: timeEntry.taskId, duration: timeEntry.duration });

    // If notes provided, create a comment for the time entry
    if (notes && notes.trim()) {
      try {
        await this.addComment({
          timeEntryId: timeEntry.id,
          firmId,
          userId,
          comment: notes.trim(),
          isInternal: false
        });
        console.log('✅ stopTimer: Comment added to time entry');
      } catch (error) {
        console.error('⚠️ stopTimer: Failed to add comment:', error);
        // Don't fail the whole operation if comment creation fails
      }
    }

    // Deactivate session
    await db
      .update(timeSessions)
      .set({ isActive: false })
      .where(eq(timeSessions.id, session.id));

    return timeEntry;
  }

  /**
   * Get active timer for user
   */
  async getActiveTimer(userId: number): Promise<any | null> {
    const [session] = await db
      .select()
      .from(timeSessions)
      .where(and(
        eq(timeSessions.userId, userId),
        eq(timeSessions.isActive, true)
      ))
      .limit(1);

    return session || null;
  }

  /**
   * Create manual time entry
   */
  async createTimeEntry(entry: InsertTimeEntry, userId: number): Promise<any> {
    // Calculate duration if not provided
    let duration = entry.duration;
    if (!duration && entry.startTime && entry.endTime) {
      duration = Math.floor((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000);
    }

    // Get applicable rate
    const rate = await this.getApplicableRate({
      userId: entry.userId,
      firmId: entry.firmId,
      clientId: entry.clientId || undefined,
      taskId: entry.taskId || undefined
    });

    // Calculate billable amount
    const hours = duration! / 3600;
    const billableAmount = rate && entry.type === 'billable' 
      ? (hours * parseFloat(rate.toString())).toFixed(2) 
      : null;

    const [timeEntry] = await db
      .insert(timeEntries)
      .values({
        ...entry,
        duration: duration!,
        billableRate: entry.type === 'billable' ? rate : null,
        billableAmount: entry.type === 'billable' ? billableAmount : null,
        status: 'draft'
      })
      .returning();

    // Create audit log
    await this.createAuditLog({
      timeEntryId: timeEntry.id,
      firmId: entry.firmId,
      userId,
      action: 'create',
      fieldName: 'created',
      newValue: 'Time entry created'
    });

    return timeEntry;
  }

  /**
   * Update time entry with audit trail
   */
  async updateTimeEntry(
    timeEntryId: number,
    updates: Partial<InsertTimeEntry>,
    userId: number,
    firmId: number
  ): Promise<any> {
    // Get current entry
    const [current] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, timeEntryId),
        eq(timeEntries.firmId, firmId)
      ));

    if (!current) {
      throw new Error('Time entry not found');
    }

    // Check if locked (submitted/approved)
    if (current.status === 'submitted' || current.status === 'approved' || current.status === 'billed') {
      throw new Error('Cannot edit time entry in current status');
    }

    // Create audit logs for changed fields
    const auditPromises: Promise<any>[] = [];
    for (const [key, newValue] of Object.entries(updates)) {
      const oldValue = current[key as keyof typeof current];
      if (oldValue !== newValue) {
        auditPromises.push(this.createAuditLog({
          timeEntryId,
          firmId,
          userId,
          action: 'update',
          fieldName: key,
          oldValue: String(oldValue),
          newValue: String(newValue)
        }));
      }
    }
    await Promise.all(auditPromises);

    // Recalculate billable amount if duration or type changed
    let finalUpdates = { ...updates };
    if (updates.duration || updates.type) {
      const rate = await this.getApplicableRate({
        userId: current.userId,
        firmId: current.firmId,
        clientId: current.clientId || undefined,
        taskId: current.taskId || undefined
      });

      const duration = updates.duration || current.duration;
      const type = updates.type || current.type;
      const hours = duration / 3600;
      const billableAmount = rate && type === 'billable'
        ? (hours * parseFloat(rate.toString())).toFixed(2)
        : null;

      finalUpdates = {
        ...finalUpdates,
        billableRate: type === 'billable' ? rate : null,
        billableAmount: type === 'billable' ? billableAmount : null
      };
    }

    const [updated] = await db
      .update(timeEntries)
      .set(finalUpdates)
      .where(eq(timeEntries.id, timeEntryId))
      .returning();

    return updated;
  }

  /**
   * Delete time entry (admin only)
   */
  async deleteTimeEntry(timeEntryId: number, userId: number, firmId: number): Promise<void> {
    // Get current entry
    const [current] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, timeEntryId),
        eq(timeEntries.firmId, firmId)
      ));

    if (!current) {
      throw new Error('Time entry not found');
    }

    // Check if locked (submitted/approved/billed) - only allow deletion of draft entries
    if (current.status === 'submitted' || current.status === 'approved' || current.status === 'billed') {
      throw new Error('Cannot delete time entry in current status. Please reject it first.');
    }

    // Create audit log before deletion
    await this.createAuditLog({
      timeEntryId,
      firmId,
      userId,
      action: 'delete',
      fieldName: 'deleted',
      oldValue: 'exists',
      newValue: 'deleted'
    });

    // Delete the time entry
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, timeEntryId));
  }

  /**
   * Submit time entry for approval
   */
  async submitForApproval(timeEntryId: number, userId: number, firmId: number): Promise<any> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, timeEntryId),
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.userId, userId)
      ));

    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'draft') {
      throw new Error('Only draft entries can be submitted');
    }

    const [updated] = await db
      .update(timeEntries)
      .set({
        status: 'submitted',
        submittedAt: new Date()
      })
      .where(eq(timeEntries.id, timeEntryId))
      .returning();

    await this.createAuditLog({
      timeEntryId,
      firmId,
      userId,
      action: 'submit',
      fieldName: 'status',
      oldValue: 'draft',
      newValue: 'submitted'
    });

    return updated;
  }

  /**
   * Approve time entry (manager only)
   */
  async approveTimeEntry(timeEntryId: number, managerId: number, firmId: number): Promise<any> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, timeEntryId),
        eq(timeEntries.firmId, firmId)
      ));

    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'submitted') {
      throw new Error('Only submitted entries can be approved');
    }

    const [updated] = await db
      .update(timeEntries)
      .set({
        status: 'approved',
        approvedAt: new Date()
      })
      .where(eq(timeEntries.id, timeEntryId))
      .returning();

    await this.createAuditLog({
      timeEntryId,
      firmId,
      userId: managerId,
      action: 'approve',
      fieldName: 'status',
      oldValue: 'submitted',
      newValue: 'approved'
    });

    return updated;
  }

  /**
   * Reject time entry (manager only)
   */
  async rejectTimeEntry(
    timeEntryId: number, 
    managerId: number, 
    firmId: number,
    reason?: string
  ): Promise<any> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, timeEntryId),
        eq(timeEntries.firmId, firmId)
      ));

    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'submitted') {
      throw new Error('Only submitted entries can be rejected');
    }

    const [updated] = await db
      .update(timeEntries)
      .set({
        status: 'rejected'
      })
      .where(eq(timeEntries.id, timeEntryId))
      .returning();

    await this.createAuditLog({
      timeEntryId,
      firmId,
      userId: managerId,
      action: 'reject',
      fieldName: 'status',
      oldValue: 'submitted',
      newValue: 'rejected'
    });

    if (reason) {
      await this.addComment({
        timeEntryId,
        firmId,
        userId: managerId,
        comment: reason,
        isInternal: false
      });
    }

    return updated;
  }

  /**
   * Bulk approve time entries
   */
  async bulkApprove(timeEntryIds: number[], managerId: number, firmId: number): Promise<void> {
    await db
      .update(timeEntries)
      .set({
        status: 'approved',
        approvedAt: new Date()
      })
      .where(and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.status, 'submitted')
      ));

    // Create audit logs
    const auditLogs = timeEntryIds.map(id => ({
      timeEntryId: id,
      firmId,
      userId: managerId,
      action: 'approve' as const,
      fieldName: 'status',
      oldValue: 'submitted',
      newValue: 'approved'
    }));

    if (auditLogs.length > 0) {
      await db.insert(timeEntryAuditLog).values(auditLogs);
    }
  }

  /**
   * Bulk reject time entries
   */
  async bulkReject(timeEntryIds: number[], managerId: number, firmId: number): Promise<void> {
    await db
      .update(timeEntries)
      .set({
        status: 'rejected'
      })
      .where(and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.status, 'submitted')
      ));

    // Create audit logs
    const auditLogs = timeEntryIds.map(id => ({
      timeEntryId: id,
      firmId,
      userId: managerId,
      action: 'reject' as const,
      fieldName: 'status',
      oldValue: 'submitted',
      newValue: 'rejected'
    }));

    if (auditLogs.length > 0) {
      await db.insert(timeEntryAuditLog).values(auditLogs);
    }
  }

  /**
   * Add comment to time entry
   */
  async addComment(comment: InsertTimeEntryComment): Promise<any> {
    const [created] = await db
      .insert(timeEntryComments)
      .values(comment)
      .returning();

    return created;
  }

  /**
   * Get comments for time entry
   */
  async getComments(timeEntryId: number, firmId: number): Promise<any[]> {
    return db
      .select()
      .from(timeEntryComments)
      .where(and(
        eq(timeEntryComments.timeEntryId, timeEntryId),
        eq(timeEntryComments.firmId, firmId)
      ))
      .orderBy(desc(timeEntryComments.createdAt));
  }

  /**
   * Get audit history for time entry
   */
  async getAuditHistory(timeEntryId: number, firmId: number): Promise<any[]> {
    return db
      .select()
      .from(timeEntryAuditLog)
      .where(and(
        eq(timeEntryAuditLog.timeEntryId, timeEntryId),
        eq(timeEntryAuditLog.firmId, firmId)
      ))
      .orderBy(desc(timeEntryAuditLog.createdAt));
  }

  /**
   * Get applicable hourly rate for user/client/task
   * Priority: Client-specific > Task type > Staff default
   */
  async getApplicableRate(params: {
    userId: number;
    firmId: number;
    clientId?: number;
    taskId?: number;
  }): Promise<string | null> {
    const { userId, firmId, clientId, taskId } = params;

    // TODO: Get task type from taskId if provided
    const taskType = null; // Placeholder

    // 1. Try client-specific rate
    if (clientId) {
      const [clientRate] = await db
        .select()
        .from(clientRates)
        .where(and(
          eq(clientRates.clientId, clientId),
          eq(clientRates.firmId, firmId),
          eq(clientRates.isActive, true)
        ))
        .limit(1);

      if (clientRate) {
        return clientRate.hourlyRate;
      }
    }

    // 2. Try task type rate
    if (taskType) {
      const [typeRate] = await db
        .select()
        .from(taskTypeRates)
        .where(and(
          eq(taskTypeRates.taskType, taskType),
          eq(taskTypeRates.firmId, firmId),
          eq(taskTypeRates.isActive, true)
        ))
        .limit(1);

      if (typeRate) {
        return typeRate.hourlyRate;
      }
    }

    // 3. Fall back to staff default rate
    const [staffRate] = await db
      .select()
      .from(staffRates)
      .where(and(
        eq(staffRates.userId, userId),
        eq(staffRates.firmId, firmId),
        eq(staffRates.isActive, true)
      ))
      .orderBy(desc(staffRates.effectiveFrom))
      .limit(1);

    return staffRate?.hourlyRate || null;
  }

  /**
   * Get time entries for approval queue (manager view)
   */
  async getApprovalQueue(firmId: number, status: string = 'submitted'): Promise<any[]> {
    return db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.status, status as any)
      ))
      .orderBy(desc(timeEntries.submittedAt));
  }

  /**
   * Get time entries for a date range
   */
  async getTimeEntries(params: {
    firmId: number;
    userId?: number;
    clientId?: number;
    projectId?: number;
    taskId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<any[]> {
    const conditions = [eq(timeEntries.firmId, params.firmId)];

    if (params.userId) conditions.push(eq(timeEntries.userId, params.userId));
    if (params.clientId) conditions.push(eq(timeEntries.clientId, params.clientId));
    if (params.projectId) conditions.push(eq(timeEntries.projectId, params.projectId));
    if (params.taskId) conditions.push(eq(timeEntries.taskId, params.taskId));
    if (params.status) conditions.push(eq(timeEntries.status, params.status as any));
    if (params.startDate) conditions.push(gte(timeEntries.startTime, params.startDate));
    if (params.endDate) conditions.push(lte(timeEntries.endTime, params.endDate));

    return db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime));
  }

  /**
   * Mark time entries as billed
   */
  async markAsBilled(timeEntryIds: number[], firmId: number): Promise<void> {
    await db
      .update(timeEntries)
      .set({
        status: 'billed',
        billedAt: new Date()
      })
      .where(and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.firmId, firmId)
      ));
  }

  /**
   * Get unbilled time by client
   */
  async getUnbilledTime(firmId: number): Promise<any[]> {
    const result = await db
      .select({
        clientId: timeEntries.clientId,
        totalHours: sql<number>`SUM(${timeEntries.duration}) / 3600`,
        totalAmount: sql<number>`SUM(CAST(${timeEntries.billableAmount} AS DECIMAL))`,
        entryCount: sql<number>`COUNT(*)`
      })
      .from(timeEntries)
      .where(and(
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.status, 'approved'),
        eq(timeEntries.type, 'billable')
      ))
      .groupBy(timeEntries.clientId);

    return result;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(log: InsertTimeEntryAuditLog): Promise<void> {
    await db.insert(timeEntryAuditLog).values(log);
  }
}

export const timeTrackingService = new TimeTrackingService();
