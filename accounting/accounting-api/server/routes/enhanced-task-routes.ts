/**
 * Enhanced Task Management Routes
 * 
 * Complete task CRUD operations with dependencies, workflow status, and advanced features
 * Supports the comprehensive task management system for accounting firms
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq, and, desc, asc, like, or, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { 
  tasks, projects, users, clients, timeEntries,
  type Task, type InsertTask
} from '@shared/schema';
import { taskStatuses } from '../../shared/database/crm-entities';
import { enhancedProjectStorage } from '../storage/books/enhanced-project-storage';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { NotificationHelpers, NotificationService } from '../notification.service';
import { requireAuthHybrid } from '../auth';
import { setupTenantScope } from '../security-middleware';

const router = express.Router();

// Apply security middleware to all routes
router.use(requireAuthHybrid);
router.use(setupTenantScope);

// Validation schemas
const createTaskSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).default('pending'),
  statusId: z.number().optional(), // Kanban status column
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.number().nullable().optional(),
  dueDate: z.string().optional()
    .transform(val => !val || val.trim() === '' ? undefined : val)
    .refine(val => {
      if (!val) return true; // undefined is valid
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, { message: 'Invalid due date format' }),
  startDate: z.string().optional()
    .transform(val => !val || val.trim() === '' ? undefined : val)
    .refine(val => {
      if (!val) return true; // undefined is valid
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, { message: 'Invalid start date format' }),
  estimatedHours: z.string().optional(), // Decimal as string
  isBillable: z.boolean().optional(),
  hourlyRate: z.number().optional(),
  parentTaskId: z.number().optional(),
  dependsOn: z.array(z.number()).default([]),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  customFields: z.record(z.any()).default({}),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.object({
    frequency: z.enum(['none', 'daily', 'weekly', '2weeks', 'monthly', '2months', '3months', '6months', 'yearly', 'custom']),
    interval: z.number().optional(),
    unit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
    dayOfMonth: z.number().optional(),
    endCondition: z.enum(['never', 'after', 'on_date']),
    endDate: z.string().optional(),
    totalOccurrences: z.number().optional(),
    currentOccurrence: z.number().optional(),
  }).optional()
});

const updateTaskSchema = createTaskSchema.partial();

const bulkUpdateTaskSchema = z.object({
  taskIds: z.array(z.number()),
  updates: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: z.number().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    tags: z.array(z.string()).optional()
  })
});

const taskDependencySchema = z.object({
  dependentTaskId: z.number(),
  prerequisiteTaskId: z.number(),
  dependencyType: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start')
});

// Security context helper
const getSecurityContext = (req: Request) => {
  const user = (req as any).user;
  if (!user || !user.firmId) {
    throw new Error('Unauthorized - authentication required');
  }
  return {
    userId: user.id,
    firmId: user.firmId,
    userRole: user.role || 'firm_user',
    permissions: user.permissions || ['read', 'write']
  };
};

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/tasks - Get all tasks (using direct SQL to bypass Drizzle schema issues)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const { limit = '50', offset = '0', projectId } = req.query;

    // Build WHERE clause conditions
    const conditions = [
      sql`t.firm_id = ${context.firmId}`,
      sql`t.is_active = true`
    ];
    
    // Add projectId filter if provided
    if (projectId) {
      const projectIdNum = parseInt(projectId as string);
      if (!isNaN(projectIdNum)) {
        conditions.push(sql`t.project_id = ${projectIdNum}`);
      }
    }

    // Use direct SQL query to bypass Drizzle schema mismatch issues
    const result = await db.execute(sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.status_id,
        t.priority,
        t.assigned_to,
        t.due_date,
        t.estimated_hours,
        t.actual_hours,
        t.project_id,
        t.client_id,
        t.created_at,
        t.updated_at,
        p.name as project_name,
        c.name as client_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id  
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY t.updated_at DESC
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `);

    // Transform snake_case to camelCase for frontend compatibility
    const transformedData = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      statusId: row.status_id,
      priority: row.priority,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      projectId: row.project_id,
      clientId: row.client_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      projectName: row.project_name,
      clientName: row.client_name
    }));

    res.json({
      success: true,
      data: transformedData,
      pagination: {
        total: transformedData.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: transformedData.length === parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

/**
 * GET /api/tasks/:id - Get specific task with dependencies
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Get main task with related data
    const [taskData] = await db.select({
      task: tasks,
      project: {
        id: projects.id,
        name: projects.name
      },
      client: {
        id: clients.id,
        name: clients.name
      },
      assignedUser: {
        id: users.id,
        username: users.username,
        name: users.name
      }
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(and(
      eq(tasks.id, taskId),
      eq(tasks.firmId, context.firmId),
      eq(tasks.isActive, true)
    ))
    .limit(1);

    if (!taskData) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      if (taskData.task.assignedTo !== context.userId && taskData.task.createdBy !== context.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this task'
        });
      }
    }

    // Get dependent tasks (tasks that depend on this one)
    // Use direct SQL to properly cast json to jsonb for the @> operator
    const dependentTasksResult = await db.execute(sql`
      SELECT id, title, status
      FROM tasks
      WHERE depends_on::jsonb @> ${JSON.stringify([taskId])}::jsonb
        AND firm_id = ${context.firmId}
        AND is_active = true
    `);
    const dependentTasks = dependentTasksResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      status: row.status
    }));

    // Get prerequisite tasks (tasks this one depends on)
    const prerequisiteTasks = [];
    if (taskData.task.dependsOn && taskData.task.dependsOn.length > 0) {
      const prerequisites = await db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status
      })
      .from(tasks)
      .where(
        and(
          inArray(tasks.id, taskData.task.dependsOn),
          eq(tasks.firmId, context.firmId),
          eq(tasks.isActive, true)
        )
      );
      prerequisiteTasks.push(...prerequisites);
    }

    // Get subtasks
    const subtasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      assignedTo: tasks.assignedTo,
      dueDate: tasks.dueDate
    })
    .from(tasks)
    .where(and(
      eq(tasks.parentTaskId, taskId),
      eq(tasks.firmId, context.firmId),
      eq(tasks.isActive, true)
    ))
    .orderBy(tasks.createdAt);

    // Get time tracking summary
    const [timeTrackingSummary] = await db.select({
      totalHours: sql<number>`coalesce(sum(duration), 0) / 3600.0`,
      billableHours: sql<number>`coalesce(sum(case when type = 'billable' then duration else 0 end), 0) / 3600.0`,
      entries: sql<number>`count(*)`
    })
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId));

    res.json({
      success: true,
      data: {
        ...taskData,
        dependencies: {
          dependentTasks,
          prerequisiteTasks
        },
        subtasks,
        timeTracking: timeTrackingSummary
      }
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task'
    });
  }
});

/**
 * POST /api/tasks - Create a new task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    const validationResult = createTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task data',
        errors: validationResult.error.errors
      });
    }

    const taskData = validationResult.data;

    // Verify project exists and user has access
    const project = await enhancedProjectStorage.getProject(taskData.projectId, context);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    // Validate dependencies (if any)
    if (taskData.dependsOn.length > 0) {
      const dependencyTasks = await db.select({ id: tasks.id })
        .from(tasks)
        .where(and(
          inArray(tasks.id, taskData.dependsOn),
          eq(tasks.firmId, context.firmId),
          eq(tasks.isActive, true)
        ));

      if (dependencyTasks.length !== taskData.dependsOn.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more dependency tasks not found'
        });
      }
    }

    // Assign default statusId if not provided
    let finalStatusId = taskData.statusId;
    if (!finalStatusId) {
      try {
        const defaultStatusQuery = await db
          .select()
          .from(taskStatuses)
          .where(eq(taskStatuses.firmId, context.firmId))
          .orderBy(asc(taskStatuses.displayOrder))
          .limit(1);

        if (defaultStatusQuery[0]) {
          finalStatusId = defaultStatusQuery[0].id;
        }
      } catch (statusError: any) {
        if (statusError?.code !== "42P01") {
          throw statusError;
        }
      }
    }

    // Create the task using enhanced storage
    const newTask = await enhancedProjectStorage.createTask({
      ...taskData,
      statusId: finalStatusId,
      clientId: project.clientId,
      firmId: context.firmId,
      createdBy: context.userId
    }, context);

    console.log(`✅ Created task: ${newTask.title} (ID: ${newTask.id})`);

    // Send notification if task is assigned to someone
    if (newTask.assignedTo && newTask.assignedTo !== context.userId) {
      try {
        const assignerUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, context.userId))
          .limit(1);
        
        await NotificationHelpers.notifyTaskAssigned(
          context.firmId,
          newTask.assignedTo,
          newTask.id,
          newTask.title,
          assignerUser[0]?.name || 'Unknown',
          newTask.dueDate ? new Date(newTask.dueDate) : undefined
        );
        console.log(`📬 Notification sent to user #${newTask.assignedTo} for task assignment`);
      } catch (notifError) {
        console.error('Failed to send task assignment notification (non-fatal):', notifError);
        // Don't fail task creation if notification fails
      }
    }

    // Auto-sync task to calendar if it has a due date
    if (newTask.dueDate) {
      try {
        // Check if this is a recurring task
        if (newTask.isRecurring && newTask.recurrencePattern) {
          // Create multiple calendar events for recurring task
          const eventIds = await CalendarSyncService.createRecurringEvents(
            newTask.id,
            context.userId,
            context.firmId
          );
          console.log(`📅 Created ${eventIds.length} recurring calendar events for task #${newTask.id}`);
        } else {
          // Create single calendar event for regular task
          const calendarEventId = await CalendarSyncService.syncTaskToCalendar(
            newTask.id,
            context.userId,
            context.firmId
          );
          if (calendarEventId) {
            console.log(`📅 Auto-synced task #${newTask.id} to calendar event #${calendarEventId}`);
          }
        }
      } catch (syncError) {
        console.error('Calendar sync error (non-fatal):', syncError);
        // Don't fail the task creation if calendar sync fails
      }
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create task'
    });
  }
});

/**
 * PUT /api/tasks/:id - Update task
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const validationResult = updateTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task data',
        errors: validationResult.error.errors
      });
    }

    // Check for circular dependencies if updating dependencies
    if (validationResult.data.dependsOn) {
      const hasCircularDependency = await checkCircularDependency(
        taskId, 
        validationResult.data.dependsOn, 
        context.firmId
      );
      
      if (hasCircularDependency) {
        return res.status(400).json({
          success: false,
          message: 'Circular dependency detected'
        });
      }
    }

    // Handle status transitions
    if (validationResult.data.status) {
      const isValidTransition = await validateStatusTransition(
        taskId,
        validationResult.data.status,
        context
      );

      if (!isValidTransition.valid) {
        return res.status(400).json({
          success: false,
          message: isValidTransition.reason
        });
      }
    }

    // Update using enhanced storage
    const updatedTask = await enhancedProjectStorage.updateTask(
      taskId,
      validationResult.data,
      context
    );

    // Auto-sync task to calendar if it has a due date
    if (updatedTask.dueDate && validationResult.data.dueDate) {
      try {
        await CalendarSyncService.syncTaskToCalendar(
          taskId,
          context.userId,
          context.firmId
        );
        console.log(`📅 Auto-synced updated task #${taskId} to calendar`);
      } catch (syncError) {
        console.error('Calendar sync error (non-fatal):', syncError);
      }
    }

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task'
    });
  }
});

/**
 * PATCH /api/tasks/:id - Update task (alias for PUT)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const validationResult = updateTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Task validation failed:', JSON.stringify(validationResult.error.errors, null, 2));
      console.error('Request body was:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Invalid task data',
        errors: validationResult.error.errors
      });
    }

    // Check for circular dependencies if updating dependencies
    if (validationResult.data.dependsOn) {
      const hasCircularDependency = await checkCircularDependency(
        taskId, 
        validationResult.data.dependsOn, 
        context.firmId
      );
      
      if (hasCircularDependency) {
        return res.status(400).json({
          success: false,
          message: 'Circular dependency detected'
        });
      }
    }

    // Handle status transitions
    if (validationResult.data.status) {
      const isValidTransition = await validateStatusTransition(
        taskId,
        validationResult.data.status,
        context
      );

      if (!isValidTransition.valid) {
        return res.status(400).json({
          success: false,
          message: isValidTransition.reason
        });
      }
    }

    // Update using enhanced storage
    const updatedTask = await enhancedProjectStorage.updateTask(
      taskId,
      validationResult.data,
      context
    );

    // Auto-sync task to calendar if it has a due date
    if (updatedTask.dueDate && validationResult.data.dueDate) {
      try {
        await CalendarSyncService.syncTaskToCalendar(
          taskId,
          context.userId,
          context.firmId
        );
        console.log(`📅 Auto-synced updated task #${taskId} to calendar`);
      } catch (syncError) {
        console.error('Calendar sync error (non-fatal):', syncError);
      }
    }

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task'
    });
  }
});

/**
 * DELETE /api/tasks/:id - Soft delete task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Check if task exists and user has access
    const [existingTask] = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, context.firmId),
        eq(tasks.isActive, true)
      ))
      .limit(1);

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (context.userRole !== 'admin' && context.userRole !== 'firm_admin') {
      if (existingTask.createdBy !== context.userId && existingTask.assignedTo !== context.userId) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to delete this task'
        });
      }
    }

    // Check if task has dependencies
    // Use direct SQL to properly cast json to jsonb for the @> operator
    const dependentTasksResult = await db.execute(sql`
      SELECT id 
      FROM tasks 
      WHERE depends_on::jsonb @> ${JSON.stringify([taskId])}::jsonb
        AND firm_id = ${context.firmId}
        AND is_active = true
    `);
    const dependentTasks = dependentTasksResult.rows;

    if (dependentTasks.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete task with dependent tasks. Remove dependencies first.'
      });
    }

    // Soft delete the task
    await db.update(tasks)
      .set({ 
        isActive: false, 
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskId));

    console.log(`✅ Deleted task: ${existingTask.title} (ID: ${taskId})`);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/tasks/bulk-update - Bulk update multiple tasks
 */
router.post('/bulk-update', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    
    const validationResult = bulkUpdateTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk update data',
        errors: validationResult.error.errors
      });
    }

    const { taskIds, updates } = validationResult.data;

    // Verify all tasks exist and user has access
    const existingTasks = await db.select()
      .from(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        eq(tasks.firmId, context.firmId),
        eq(tasks.isActive, true)
      ));

    if (existingTasks.length !== taskIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more tasks not found or access denied'
      });
    }

    // Perform bulk update
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await db.update(tasks)
      .set(updateData)
      .where(and(
        inArray(tasks.id, taskIds),
        eq(tasks.firmId, context.firmId)
      ));

    console.log(`✅ Bulk updated ${taskIds.length} tasks`);

    res.json({
      success: true,
      data: {
        updatedCount: taskIds.length,
        taskIds
      },
      message: `Successfully updated ${taskIds.length} tasks`
    });

  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update tasks'
    });
  }
});

/**
 * POST /api/tasks/:id/duplicate - Duplicate a task
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);
    const { title, copyDependencies = false } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Get original task
    const [originalTask] = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, context.firmId),
        eq(tasks.isActive, true)
      ))
      .limit(1);

    if (!originalTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Create duplicate task
    const duplicateTaskData = {
      ...originalTask,
      id: undefined, // Remove ID to create new record
      title: title || `${originalTask.title} (Copy)`,
      status: 'pending' as const,
      assignedTo: context.userId,
      dependsOn: copyDependencies ? originalTask.dependsOn : [],
      parentTaskId: null,
      isTimerActive: false,
      currentTimerStartedAt: null,
      actualHours: '0.00',
      billableHours: '0.00',
      nonBillableHours: '0.00',
      progressPercentage: '0.00',
      completedAt: null,
      createdBy: context.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const duplicatedTask = await enhancedProjectStorage.createTask(duplicateTaskData, context);

    console.log(`✅ Duplicated task: ${originalTask.title} → ${duplicatedTask.title}`);

    res.status(201).json({
      success: true,
      data: duplicatedTask,
      message: 'Task duplicated successfully'
    });

  } catch (error) {
    console.error('Error duplicating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate task'
    });
  }
});

// ============================================================================
// WORKFLOW MANAGEMENT
// ============================================================================

/**
 * POST /api/tasks/:id/start - Start working on a task
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Check prerequisites are complete
    const [task] = await db.select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, context.firmId),
        eq(tasks.isActive, true)
      ))
      .limit(1);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if all prerequisite tasks are completed
    if (task.dependsOn && task.dependsOn.length > 0) {
      const incompleteTasks = await db.select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(and(
          inArray(tasks.id, task.dependsOn),
          sql`${tasks.status} != 'completed'`,
          eq(tasks.isActive, true)
        ));

      if (incompleteTasks.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start task: prerequisite tasks not completed',
          data: { incompleteTasks }
        });
      }
    }

    // Update task status to in_progress
    const updatedTask = await enhancedProjectStorage.updateTask(
      taskId,
      { 
        status: 'in_progress',
        startDate: new Date().toISOString().split('T')[0]
      },
      context
    );

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task started successfully'
    });

  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start task'
    });
  }
});

/**
 * POST /api/tasks/:id/complete - Mark task as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const context = getSecurityContext(req);
    const taskId = parseInt(req.params.id);
    const { notes } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Update task status to completed
    const updatedTask = await enhancedProjectStorage.updateTask(
      taskId,
      { 
        status: 'completed',
        progressPercentage: '100.00',
        completedAt: new Date(),
        notes: notes || undefined
      },
      context
    );

    // Send notification to task creator if different from completer
    if (updatedTask.createdBy && updatedTask.createdBy !== context.userId) {
      try {
        const completerUser = await db.select({ name: users.name })
          .from(users)
          .where(eq(users.id, context.userId))
          .limit(1);
        
        await NotificationService.sendNotification({
          firmId: context.firmId,
          userId: updatedTask.createdBy,
          type: 'task_completed',
          title: `Task Completed: ${updatedTask.title}`,
          message: `${completerUser[0]?.name || 'Someone'} completed the task "${updatedTask.title}"`,
          actionUrl: `/pages?tab=tasks&task=${taskId}`,
          relatedEntityType: 'task',
          relatedEntityId: taskId,
          senderName: completerUser[0]?.name,
          channels: ['in_app']
        });
        console.log(`📬 Notification sent to task creator #${updatedTask.createdBy} for task completion`);
      } catch (notifError) {
        console.error('Failed to send task completion notification (non-fatal):', notifError);
      }
    }

    // Check if this completion unblocks any dependent tasks
    // Use direct SQL to properly cast json to jsonb for the @> operator
    const unblockedTasksResult = await db.execute(sql`
      SELECT id, title, assigned_to, depends_on
      FROM tasks
      WHERE depends_on::jsonb @> ${JSON.stringify([taskId])}::jsonb
        AND status = 'blocked'
        AND firm_id = ${context.firmId}
        AND is_active = true
    `);
    const unblockedTasks = unblockedTasksResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      assignedTo: row.assigned_to,
      dependsOn: row.depends_on || []
    }));

    // Auto-unblock dependent tasks if all their prerequisites are now complete
    const unblockPromises = unblockedTasks.map(async (dependentTask) => {
      const allPrerequisites = await db.select({ status: tasks.status })
        .from(tasks)
        .where(and(
          inArray(tasks.id, dependentTask.dependsOn),
          eq(tasks.isActive, true)
        ));

      const allComplete = allPrerequisites.every(p => p.status === 'completed');
      if (allComplete) {
        return enhancedProjectStorage.updateTask(
          dependentTask.id,
          { status: 'pending' },
          context
        );
      }
      return null;
    });

    await Promise.all(unblockPromises);

    console.log(`✅ Completed task: ${updatedTask.title} (unblocked ${unblockedTasks.length} tasks)`);

    res.json({
      success: true,
      data: {
        task: updatedTask,
        unblockedTasks
      },
      message: 'Task completed successfully'
    });

  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check for circular dependencies
 */
async function checkCircularDependency(
  taskId: number, 
  dependsOn: number[], 
  firmId: number
): Promise<boolean> {
  if (!dependsOn.includes(taskId)) {
    return false; // No direct circular dependency
  }

  // TODO: Implement more sophisticated circular dependency detection
  // This would require traversing the entire dependency graph
  return true;
}

/**
 * Validate status transitions based on business rules
 */
async function validateStatusTransition(
  taskId: number,
  newStatus: string,
  context: any
): Promise<{ valid: boolean; reason?: string }> {
  const [currentTask] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!currentTask) {
    return { valid: false, reason: 'Task not found' };
  }

  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    'pending': ['in_progress', 'cancelled', 'blocked'],
    'in_progress': ['completed', 'blocked', 'cancelled', 'pending'],
    'completed': ['in_progress'], // Allow reopening
    'cancelled': ['pending'], // Allow reactivation
    'blocked': ['pending', 'cancelled']
  };

  const allowedNextStates = validTransitions[currentTask.status] || [];
  
  if (!allowedNextStates.includes(newStatus)) {
    return { 
      valid: false, 
      reason: `Cannot transition from ${currentTask.status} to ${newStatus}` 
    };
  }

  // Additional business rule: can't complete if prerequisites aren't done
  if (newStatus === 'completed' && currentTask.dependsOn && currentTask.dependsOn.length > 0) {
    const incompleteTasks = await db.select({ id: tasks.id })
      .from(tasks)
      .where(and(
        inArray(tasks.id, currentTask.dependsOn),
        sql`${tasks.status} != 'completed'`,
        eq(tasks.isActive, true)
      ));

    if (incompleteTasks.length > 0) {
      return { 
        valid: false, 
        reason: 'Cannot complete task: prerequisite tasks not completed' 
      };
    }
  }

  return { valid: true };
}

export default router;