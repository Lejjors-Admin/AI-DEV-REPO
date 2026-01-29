/**
 * Enhanced Time Tracking Routes
 * 
 * Comprehensive time tracking system with start/stop timers, rollup analytics,
 * approval workflows, and integration with project/task management
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq, and, desc, like, or, inArray, isNull, gte, lte, sql } from 'drizzle-orm';
import { 
  timeEntries, timeSessions, projects, tasks, clients, users,
  type TimeEntry, type TimeSession, type InsertTimeEntry, type InsertTimeSession
} from '@shared/schema';
import { NotificationService, NotificationHelpers } from '../notification-service';
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

const router = express.Router();

// Apply security middleware to all routes
router.use(requireAuth);
router.use(setupTenantScope);

// Enhanced validation schemas
const createTimeEntrySchema = z.object({
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(1, "Duration must be greater than 0"), // In seconds
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  clientId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  type: z.enum(['billable', 'non_billable', 'overhead', 'admin']).default('billable'),
  hourlyRate: z.number().positive().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isApproved: z.boolean().default(false),
  approvedBy: z.number().optional(),
  category: z.string().optional()
});

const updateTimeEntrySchema = createTimeEntrySchema.partial();

const createTimerSessionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  clientId: z.number(),
  type: z.enum(['billable', 'non_billable', 'overhead', 'admin']).default('billable'),
  tags: z.array(z.string()).default([])
});

const bulkTimeEntrySchema = z.object({
  entries: z.array(createTimeEntrySchema),
  applyToAll: z.object({
    type: z.enum(['billable', 'non_billable', 'overhead', 'admin']).optional(),
    hourlyRate: z.number().positive().optional(),
    category: z.string().optional()
  }).optional()
});

const timeApprovalSchema = z.object({
  timeEntryIds: z.array(z.number()),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional()
});

// Security context helper
const getSecurityContext = (req: Request) => {
  return {
    userId: (req as any).user?.id || 1,
    firmId: (req as any).user?.firmId || 1,
    userRole: (req as any).user?.role || 'admin',
    permissions: (req as any).user?.permissions || ['read', 'write', 'admin']
  };
};

// ============================================================================
// ENHANCED TIME ENTRY MANAGEMENT
// ============================================================================

/**
 * GET /api/time/entries - Get time entries with advanced filtering and analytics
 */
router.get('/entries', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const { 
      clientId, 
      projectId, 
      taskId, 
      startDate, 
      endDate, 
      userId,
      type,
      isApproved,
      tags,
      search,
      groupBy,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = db.select({
      timeEntry: timeEntries,
      client: {
        id: clients.id,
        name: clients.name
      },
      project: {
        id: projects.id,
        name: projects.name
      },
      task: {
        id: tasks.id,
        title: tasks.title
      },
      user: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      },
      approvedByUser: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(timeEntries)
    .leftJoin(clients, eq(timeEntries.clientId, clients.id))
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .leftJoin(users, eq(timeEntries.approvedBy, users.id));

    const conditions = [eq(timeEntries.firmId, context.firmId)];

    // Apply filters
    if (clientId) {
      conditions.push(eq(timeEntries.clientId, parseInt(clientId as string)));
    }

    if (projectId) {
      conditions.push(eq(timeEntries.projectId, parseInt(projectId as string)));
    }

    if (taskId) {
      conditions.push(eq(timeEntries.taskId, parseInt(taskId as string)));
    }

    if (userId) {
      conditions.push(eq(timeEntries.userId, parseInt(userId as string)));
    }

    if (type) {
      const typeArray = Array.isArray(type) ? type : [type];
      conditions.push(inArray(timeEntries.type, typeArray as string[]));
    }

    if (isApproved !== undefined) {
      conditions.push(eq(timeEntries.isApproved, isApproved === 'true'));
    }

    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate as string));
    }

    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate as string));
    }

    if (search) {
      conditions.push(
        or(
          like(timeEntries.description, `%${search}%`),
          like(timeEntries.notes, `%${search}%`)
        )
      );
    }

    // Apply security: non-admin users can only see their own entries
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      conditions.push(eq(timeEntries.userId, context.userId));
    }

    // Get total count for pagination
    const totalCountQuery = db.select({ count: sql<number>`count(*)` })
      .from(timeEntries)
      .where(and(...conditions));
    const [{ count: total }] = await totalCountQuery;

    // Get entries with pagination
    const entries = await query
      .where(and(...conditions))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(timeEntries.date), desc(timeEntries.createdAt));

    // Calculate summary statistics for the filtered dataset
    const [summary] = await db.select({
      totalDuration: sql<number>`coalesce(sum(${timeEntries.duration}), 0)`,
      billableDuration: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' then ${timeEntries.duration} else 0 end), 0)`,
      totalValue: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' and ${timeEntries.hourlyRate} is not null then (${timeEntries.duration} / 3600.0) * ${timeEntries.hourlyRate} else 0 end), 0)`
    })
    .from(timeEntries)
    .where(and(...conditions));

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      },
      summary: {
        totalHours: summary.totalDuration / 3600,
        billableHours: summary.billableDuration / 3600,
        totalValue: summary.totalValue
      }
    });

  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries'
    });
  }
});

/**
 * POST /api/time/entries - Create time entry with validation
 */
router.post('/entries', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    const validationResult = createTimeEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time entry data',
        errors: validationResult.error.errors
      });
    }

    const entryData = validationResult.data;

    // Validate project/task access
    if (entryData.projectId) {
      const [project] = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, entryData.projectId),
          eq(projects.firmId, context.firmId)
        ))
        .limit(1);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
      }
    }

    if (entryData.taskId) {
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, entryData.taskId),
          eq(tasks.firmId, context.firmId)
        ))
        .limit(1);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or access denied'
        });
      }

      // Auto-populate project from task if not provided
      if (!entryData.projectId && task.projectId) {
        entryData.projectId = task.projectId;
      }
    }

    // Check for overlapping time entries on the same day (business rule)
    const overlappingEntries = await db.select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, context.userId),
        eq(timeEntries.date, entryData.date),
        eq(timeEntries.firmId, context.firmId)
      ));

    // Warn if total daily time exceeds reasonable limits (e.g., 12 hours)
    const totalDailySeconds = overlappingEntries.reduce((sum, entry) => sum + entry.duration, 0) + entryData.duration;
    if (totalDailySeconds > 43200) { // 12 hours
      console.warn(`⚠️ User ${context.userId} logging ${totalDailySeconds / 3600} hours on ${entryData.date}`);
    }

    // Create time entry
    const [newTimeEntry] = await db.insert(timeEntries)
      .values({
        ...entryData,
        userId: context.userId,
        firmId: context.firmId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Update task time tracking if associated with a task
    if (entryData.taskId) {
      await updateTaskTimeRollup(entryData.taskId);
    }

    console.log(`⏱️ Time entry created: ${newTimeEntry.description} (${newTimeEntry.duration / 3600}h)`);

    res.status(201).json({
      success: true,
      data: newTimeEntry,
      message: 'Time entry created successfully'
    });

  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time entry'
    });
  }
});

/**
 * PUT /api/time/entries/:id - Update time entry with validation
 */
router.put('/entries/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const entryId = parseInt(req.params.id);

    if (isNaN(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time entry ID'
      });
    }

    const validationResult = updateTimeEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time entry data',
        errors: validationResult.error.errors
      });
    }

    // Check if entry exists and user has permission to edit
    const [existingEntry] = await db.select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.firmId, context.firmId)
      ))
      .limit(1);

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    // Security check: only entry owner or admin can edit
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin' && 
        existingEntry.userId !== context.userId) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to edit this time entry'
      });
    }

    // Prevent editing approved entries (unless admin)
    if (existingEntry.isApproved && context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit approved time entries'
      });
    }

    const updateData = validationResult.data;

    // Update time entry
    const [updatedEntry] = await db.update(timeEntries)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(timeEntries.id, entryId))
      .returning();

    // Update task time rollup if task changed
    if (updateData.taskId && updateData.taskId !== existingEntry.taskId) {
      await updateTaskTimeRollup(updateData.taskId);
      if (existingEntry.taskId) {
        await updateTaskTimeRollup(existingEntry.taskId);
      }
    }

    console.log(`⏱️ Time entry updated: ${updatedEntry.description} (ID: ${entryId})`);

    res.json({
      success: true,
      data: updatedEntry,
      message: 'Time entry updated successfully'
    });

  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time entry'
    });
  }
});

/**
 * DELETE /api/time/entries/:id - Delete time entry with validation
 */
router.delete('/entries/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const entryId = parseInt(req.params.id);

    if (isNaN(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time entry ID'
      });
    }

    // Check if entry exists and user has permission
    const [existingEntry] = await db.select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.firmId, context.firmId)
      ))
      .limit(1);

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    // Security check
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin' && 
        existingEntry.userId !== context.userId) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to delete this time entry'
      });
    }

    // Prevent deleting approved entries (unless admin)
    if (existingEntry.isApproved && context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete approved time entries'
      });
    }

    // Delete time entry
    await db.delete(timeEntries)
      .where(eq(timeEntries.id, entryId));

    // Update task time rollup
    if (existingEntry.taskId) {
      await updateTaskTimeRollup(existingEntry.taskId);
    }

    console.log(`🗑️ Time entry deleted: ${existingEntry.description} (ID: ${entryId})`);

    res.json({
      success: true,
      message: 'Time entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time entry'
    });
  }
});

// ============================================================================
// ENHANCED TIMER MANAGEMENT
// ============================================================================

/**
 * POST /api/time/timer/start - Start timer with enhanced validation
 */
router.post('/timer/start', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    const validationResult = createTimerSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timer session data',
        errors: validationResult.error.errors
      });
    }

    const sessionData = validationResult.data;

    // Check if user already has an active timer
    const [existingSession] = await db.select()
      .from(timeSessions)
      .where(and(
        eq(timeSessions.userId, context.userId),
        eq(timeSessions.firmId, context.firmId),
        isNull(timeSessions.endTime)
      ))
      .limit(1);

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active timer session. Please stop it first.',
        data: { activeSession: existingSession }
      });
    }

    // Validate project/task access
    if (sessionData.projectId) {
      const [project] = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, sessionData.projectId),
          eq(projects.firmId, context.firmId)
        ))
        .limit(1);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or access denied'
        });
      }
    }

    if (sessionData.taskId) {
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, sessionData.taskId),
          eq(tasks.firmId, context.firmId)
        ))
        .limit(1);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or access denied'
        });
      }

      // Update task status to in_progress if it's pending
      if (task.status === 'pending') {
        await db.update(tasks)
          .set({ 
            status: 'in_progress',
            currentTimerStartedAt: new Date(),
            isTimerActive: true,
            updatedAt: new Date()
          })
          .where(eq(tasks.id, sessionData.taskId));
      }
    }

    // Create timer session
    const [newSession] = await db.insert(timeSessions)
      .values({
        ...sessionData,
        userId: context.userId,
        firmId: context.firmId,
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log(`▶️ Timer started: ${newSession.description} (Task: ${sessionData.taskId || 'None'})`);

    res.status(201).json({
      success: true,
      data: newSession,
      message: 'Timer started successfully'
    });

  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start timer'
    });
  }
});

/**
 * POST /api/time/timer/stop - Stop timer and create time entry
 */
router.post('/timer/stop', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const { createTimeEntry = true, notes } = req.body;

    // Find active timer session
    const [activeSession] = await db.select()
      .from(timeSessions)
      .where(and(
        eq(timeSessions.userId, context.userId),
        eq(timeSessions.firmId, context.firmId),
        isNull(timeSessions.endTime)
      ))
      .limit(1);

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active timer session found'
      });
    }

    // Calculate duration
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000);

    // Stop the session
    const [stoppedSession] = await db.update(timeSessions)
      .set({
        endTime,
        duration: durationSeconds,
        notes: notes || activeSession.notes,
        updatedAt: new Date()
      })
      .where(eq(timeSessions.id, activeSession.id))
      .returning();

    let timeEntry = null;

    // Create time entry if requested and session has meaningful duration (>1 minute)
    if (createTimeEntry && durationSeconds > 60) {
      const [newTimeEntry] = await db.insert(timeEntries)
        .values({
          description: activeSession.description,
          duration: durationSeconds,
          projectId: activeSession.projectId,
          taskId: activeSession.taskId,
          clientId: activeSession.clientId,
          userId: context.userId,
          firmId: context.firmId,
          date: endTime.toISOString().split('T')[0],
          type: activeSession.type || 'billable',
          notes: notes || activeSession.notes,
          tags: activeSession.tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      timeEntry = newTimeEntry;

      // Update task time rollup and status
      if (activeSession.taskId) {
        await updateTaskTimeRollup(activeSession.taskId);
        
        // Clear task timer flags
        await db.update(tasks)
          .set({
            currentTimerStartedAt: null,
            isTimerActive: false,
            updatedAt: new Date()
          })
          .where(eq(tasks.id, activeSession.taskId));
      }
    }

    console.log(`⏹️ Timer stopped: ${stoppedSession.description} (${(durationSeconds / 3600).toFixed(2)}h)`);

    res.json({
      success: true,
      data: {
        session: stoppedSession,
        timeEntry,
        duration: durationSeconds,
        durationHours: durationSeconds / 3600
      },
      message: 'Timer stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop timer'
    });
  }
});

/**
 * POST /api/time/timer/pause - Pause active timer
 */
router.post('/timer/pause', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);

    const [activeSession] = await db.select()
      .from(timeSessions)
      .where(and(
        eq(timeSessions.userId, context.userId),
        eq(timeSessions.firmId, context.firmId),
        isNull(timeSessions.endTime)
      ))
      .limit(1);

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active timer session found'
      });
    }

    // Calculate elapsed time and mark as paused
    const pausedAt = new Date();
    const elapsedSeconds = Math.floor((pausedAt.getTime() - activeSession.startTime.getTime()) / 1000);

    const [pausedSession] = await db.update(timeSessions)
      .set({
        pausedAt,
        elapsedBeforePause: elapsedSeconds,
        isPaused: true,
        updatedAt: new Date()
      })
      .where(eq(timeSessions.id, activeSession.id))
      .returning();

    console.log(`⏸️ Timer paused: ${pausedSession.description} (${(elapsedSeconds / 3600).toFixed(2)}h elapsed)`);

    res.json({
      success: true,
      data: pausedSession,
      message: 'Timer paused successfully'
    });

  } catch (error) {
    console.error('Error pausing timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause timer'
    });
  }
});

/**
 * POST /api/time/timer/resume - Resume paused timer
 */
router.post('/timer/resume', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);

    const [pausedSession] = await db.select()
      .from(timeSessions)
      .where(and(
        eq(timeSessions.userId, context.userId),
        eq(timeSessions.firmId, context.firmId),
        eq(timeSessions.isPaused, true),
        isNull(timeSessions.endTime)
      ))
      .limit(1);

    if (!pausedSession) {
      return res.status(404).json({
        success: false,
        message: 'No paused timer session found'
      });
    }

    // Resume timer with new start time
    const resumedAt = new Date();

    const [resumedSession] = await db.update(timeSessions)
      .set({
        startTime: resumedAt, // Reset start time to now
        pausedAt: null,
        isPaused: false,
        updatedAt: new Date()
      })
      .where(eq(timeSessions.id, pausedSession.id))
      .returning();

    console.log(`▶️ Timer resumed: ${resumedSession.description}`);

    res.json({
      success: true,
      data: resumedSession,
      message: 'Timer resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume timer'
    });
  }
});

/**
 * GET /api/time/timer/active - Get active timer with current duration
 */
router.get('/timer/active', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);

    const [activeSession] = await db.select({
      session: timeSessions,
      client: {
        id: clients.id,
        name: clients.name
      },
      project: {
        id: projects.id,
        name: projects.name
      },
      task: {
        id: tasks.id,
        title: tasks.title
      }
    })
    .from(timeSessions)
    .leftJoin(clients, eq(timeSessions.clientId, clients.id))
    .leftJoin(projects, eq(timeSessions.projectId, projects.id))
    .leftJoin(tasks, eq(timeSessions.taskId, tasks.id))
    .where(and(
      eq(timeSessions.userId, context.userId),
      eq(timeSessions.firmId, context.firmId),
      isNull(timeSessions.endTime)
    ))
    .limit(1);

    if (!activeSession) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Calculate current elapsed time
    const now = new Date();
    let elapsedSeconds = 0;

    if (activeSession.session.isPaused) {
      elapsedSeconds = activeSession.session.elapsedBeforePause || 0;
    } else {
      const startTime = activeSession.session.startTime;
      const baseElapsed = activeSession.session.elapsedBeforePause || 0;
      const currentElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      elapsedSeconds = baseElapsed + currentElapsed;
    }

    res.json({
      success: true,
      data: {
        ...activeSession,
        currentDuration: elapsedSeconds,
        currentDurationHours: elapsedSeconds / 3600
      }
    });

  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active timer'
    });
  }
});

// ============================================================================
// TIME ANALYTICS AND REPORTING
// ============================================================================

/**
 * GET /api/time/analytics/summary - Get comprehensive time analytics
 */
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const { 
      startDate, 
      endDate, 
      userId,
      clientId,
      projectId,
      groupBy = 'day' 
    } = req.query;

    const conditions = [eq(timeEntries.firmId, context.firmId)];

    // Apply filters
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate as string));
    }

    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate as string));
    }

    if (userId) {
      conditions.push(eq(timeEntries.userId, parseInt(userId as string)));
    }

    if (clientId) {
      conditions.push(eq(timeEntries.clientId, parseInt(clientId as string)));
    }

    if (projectId) {
      conditions.push(eq(timeEntries.projectId, parseInt(projectId as string)));
    }

    // Security: non-admin users can only see their own time
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      conditions.push(eq(timeEntries.userId, context.userId));
    }

    // Get overall summary
    const [overallSummary] = await db.select({
      totalEntries: sql<number>`count(*)`,
      totalSeconds: sql<number>`coalesce(sum(${timeEntries.duration}), 0)`,
      billableSeconds: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' then ${timeEntries.duration} else 0 end), 0)`,
      totalValue: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' and ${timeEntries.hourlyRate} is not null then (${timeEntries.duration} / 3600.0) * ${timeEntries.hourlyRate} else 0 end), 0)`,
      approvedSeconds: sql<number>`coalesce(sum(case when ${timeEntries.isApproved} = true then ${timeEntries.duration} else 0 end), 0)`,
      avgSessionDuration: sql<number>`coalesce(avg(${timeEntries.duration}), 0)`
    })
    .from(timeEntries)
    .where(and(...conditions));

    // Get time breakdown by type
    const typeBreakdown = await db.select({
      type: timeEntries.type,
      totalSeconds: sql<number>`sum(${timeEntries.duration})`,
      entryCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(case when ${timeEntries.hourlyRate} is not null then (${timeEntries.duration} / 3600.0) * ${timeEntries.hourlyRate} else 0 end), 0)`
    })
    .from(timeEntries)
    .where(and(...conditions))
    .groupBy(timeEntries.type);

    // Get time breakdown by project (top 10)
    const projectBreakdown = await db.select({
      projectId: timeEntries.projectId,
      projectName: projects.name,
      totalSeconds: sql<number>`sum(${timeEntries.duration})`,
      entryCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' and ${timeEntries.hourlyRate} is not null then (${timeEntries.duration} / 3600.0) * ${timeEntries.hourlyRate} else 0 end), 0)`
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(and(...conditions))
    .groupBy(timeEntries.projectId, projects.name)
    .orderBy(desc(sql`sum(${timeEntries.duration})`))
    .limit(10);

    // Get daily/weekly/monthly trends based on groupBy
    let dateFormat = '%Y-%m-%d'; // Default: daily
    if (groupBy === 'week') {
      dateFormat = '%Y-%u'; // Year-week
    } else if (groupBy === 'month') {
      dateFormat = '%Y-%m'; // Year-month
    }

    const trends = await db.select({
      period: sql<string>`strftime('${dateFormat}', ${timeEntries.date})`,
      totalSeconds: sql<number>`sum(${timeEntries.duration})`,
      billableSeconds: sql<number>`sum(case when ${timeEntries.type} = 'billable' then ${timeEntries.duration} else 0 end)`,
      entryCount: sql<number>`count(*)`
    })
    .from(timeEntries)
    .where(and(...conditions))
    .groupBy(sql`strftime('${dateFormat}', ${timeEntries.date})`)
    .orderBy(sql`strftime('${dateFormat}', ${timeEntries.date})`);

    res.json({
      success: true,
      data: {
        summary: {
          totalEntries: Number(overallSummary.totalEntries),
          totalHours: Number(overallSummary.totalSeconds) / 3600,
          billableHours: Number(overallSummary.billableSeconds) / 3600,
          nonBillableHours: (Number(overallSummary.totalSeconds) - Number(overallSummary.billableSeconds)) / 3600,
          totalValue: Number(overallSummary.totalValue),
          approvedHours: Number(overallSummary.approvedSeconds) / 3600,
          avgSessionHours: Number(overallSummary.avgSessionDuration) / 3600,
          utilizationRate: Number(overallSummary.billableSeconds) / Number(overallSummary.totalSeconds || 1)
        },
        breakdown: {
          byType: typeBreakdown.map(item => ({
            type: item.type,
            hours: Number(item.totalSeconds) / 3600,
            entryCount: Number(item.entryCount),
            totalValue: Number(item.totalValue)
          })),
          byProject: projectBreakdown.map(item => ({
            projectId: item.projectId,
            projectName: item.projectName || 'No Project',
            hours: Number(item.totalSeconds) / 3600,
            entryCount: Number(item.entryCount),
            totalValue: Number(item.totalValue)
          }))
        },
        trends: trends.map(item => ({
          period: item.period,
          totalHours: Number(item.totalSeconds) / 3600,
          billableHours: Number(item.billableSeconds) / 3600,
          entryCount: Number(item.entryCount)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time analytics'
    });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/time/entries/bulk - Create multiple time entries
 */
router.post('/entries/bulk', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    const validationResult = bulkTimeEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk time entry data',
        errors: validationResult.error.errors
      });
    }

    const { entries, applyToAll } = validationResult.data;

    // Process each entry
    const createdEntries = [];
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      try {
        let entryData = entries[i];

        // Apply bulk settings if provided
        if (applyToAll) {
          entryData = {
            ...entryData,
            ...applyToAll
          };
        }

        // Create time entry
        const [newEntry] = await db.insert(timeEntries)
          .values({
            ...entryData,
            userId: context.userId,
            firmId: context.firmId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        createdEntries.push(newEntry);

        // Update task time rollup if needed
        if (entryData.taskId) {
          await updateTaskTimeRollup(entryData.taskId);
        }

      } catch (entryError) {
        errors.push({
          index: i,
          error: entryError instanceof Error ? entryError.message : 'Unknown error'
        });
      }
    }

    console.log(`⏱️ Bulk created ${createdEntries.length} time entries (${errors.length} errors)`);

    res.status(201).json({
      success: true,
      data: {
        created: createdEntries,
        errors,
        totalCreated: createdEntries.length,
        totalErrors: errors.length
      },
      message: `Created ${createdEntries.length} time entries successfully`
    });

  } catch (error) {
    console.error('Error bulk creating time entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create time entries'
    });
  }
});

/**
 * POST /api/time/entries/approve - Approve/reject time entries
 */
router.post('/entries/approve', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    // Only admins and firm admins can approve time entries
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only admins can approve time entries'
      });
    }

    const validationResult = timeApprovalSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval data',
        errors: validationResult.error.errors
      });
    }

    const { timeEntryIds, action, notes } = validationResult.data;

    // Update time entries
    const updatedEntries = await db.update(timeEntries)
      .set({
        isApproved: action === 'approve',
        approvedBy: action === 'approve' ? context.userId : null,
        approvedAt: action === 'approve' ? new Date() : null,
        rejectionNotes: action === 'reject' ? notes : null,
        updatedAt: new Date()
      })
      .where(and(
        inArray(timeEntries.id, timeEntryIds),
        eq(timeEntries.firmId, context.firmId)
      ))
      .returning();

    console.log(`✅ ${action === 'approve' ? 'Approved' : 'Rejected'} ${updatedEntries.length} time entries`);

    // Send notifications to time entry owners
    try {
      for (const entry of updatedEntries) {
        if (entry.userId && entry.userId !== context.userId) {
          const hours = (entry.duration / 3600).toFixed(2);
          
          if (action === 'approve') {
            await NotificationService.sendNotification({
              firmId: context.firmId,
              userId: entry.userId,
              type: 'time_entry_approved',
              title: 'Time Entry Approved',
              message: `Your time entry for ${hours} hours has been approved`,
              actionUrl: `/pages?tab=time`,
              relatedEntityType: 'time_entry',
              relatedEntityId: entry.id,
              channels: ['in_app']
            });
          } else {
            await NotificationService.sendNotification({
              firmId: context.firmId,
              userId: entry.userId,
              type: 'time_entry_rejected',
              title: 'Time Entry Rejected',
              message: `Your time entry for ${hours} hours was rejected${notes ? `. Reason: ${notes}` : ''}`,
              actionUrl: `/pages?tab=time`,
              relatedEntityType: 'time_entry',
              relatedEntityId: entry.id,
              channels: ['in_app']
            });
          }
        }
      }
      console.log(`📬 Notifications sent to time entry owners for ${action}`);
    } catch (notifError) {
      console.error('Failed to send time entry approval notifications (non-fatal):', notifError);
    }

    res.json({
      success: true,
      data: {
        action,
        updatedEntries,
        count: updatedEntries.length
      },
      message: `Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${updatedEntries.length} time entries`
    });

  } catch (error) {
    console.error('Error approving time entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve time entries'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update task time rollup from associated time entries
 */
async function updateTaskTimeRollup(taskId: number): Promise<void> {
  try {
    // Calculate time rollup for the task
    const [rollup] = await db.select({
      totalSeconds: sql<number>`coalesce(sum(${timeEntries.duration}), 0)`,
      billableSeconds: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' then ${timeEntries.duration} else 0 end), 0)`,
      nonBillableSeconds: sql<number>`coalesce(sum(case when ${timeEntries.type} != 'billable' then ${timeEntries.duration} else 0 end), 0)`
    })
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId));

    // Update task with rolled up time
    await db.update(tasks)
      .set({
        actualHours: (rollup.totalSeconds / 3600).toFixed(2),
        billableHours: (rollup.billableSeconds / 3600).toFixed(2),
        nonBillableHours: (rollup.nonBillableSeconds / 3600).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId));

    // Now rollup to project level
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (task && task.projectId) {
      await updateProjectTimeRollup(task.projectId);
    }

  } catch (error) {
    console.error(`Error updating task time rollup for task ${taskId}:`, error);
  }
}

/**
 * Update project time rollup from associated tasks
 */
async function updateProjectTimeRollup(projectId: number): Promise<void> {
  try {
    // Calculate time rollup for the project
    const [rollup] = await db.select({
      totalSeconds: sql<number>`coalesce(sum(${timeEntries.duration}), 0)`,
      billableSeconds: sql<number>`coalesce(sum(case when ${timeEntries.type} = 'billable' then ${timeEntries.duration} else 0 end), 0)`,
      nonBillableSeconds: sql<number>`coalesce(sum(case when ${timeEntries.type} != 'billable' then ${timeEntries.duration} else 0 end), 0)`
    })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, projectId));

    // Update project with rolled up time
    await db.update(projects)
      .set({
        actualHours: (rollup.totalSeconds / 3600).toFixed(2),
        billableHours: (rollup.billableSeconds / 3600).toFixed(2),
        nonBillableHours: (rollup.nonBillableSeconds / 3600).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

  } catch (error) {
    console.error(`Error updating project time rollup for project ${projectId}:`, error);
  }
}

export default router;