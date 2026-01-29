/**
 * Task Status Management Routes
 * 
 * Handles CRUD operations for customizable task statuses (Kanban board columns)
 */

import express from 'express';
import { db } from '../db';
import { taskStatuses } from '../../shared/database/crm-entities';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// Task status schema for creation
const createTaskStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').default('#6B7280'),
  description: z.string().optional(),
  icon: z.string().optional(),
  isDefault: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isCancelled: z.boolean().default(false),
});

// Task status schema for updates
const updateTaskStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isDefault: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Bulk reorder schema
const reorderTaskStatusesSchema = z.object({
  statusOrders: z.array(z.object({
    id: z.number(),
    displayOrder: z.number(),
  })),
});

// GET /api/task-statuses - List all active statuses
router.get('/', async (req, res) => {
  try {
    const firmId = 1; // TODO: Get from authenticated user's firm

    const statuses = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.firmId, firmId))
      .orderBy(asc(taskStatuses.displayOrder));

    res.json({
      success: true,
      data: statuses
    });

  } catch (error) {
    if ((error as any)?.code === '42P01') {
      const fallbackStatuses = [
        { id: 1, firmId: 1, name: 'Pending', color: '#6B7280', description: 'Not started', isDefault: true, isCompleted: false, isCancelled: false, isActive: true, displayOrder: 1 },
        { id: 2, firmId: 1, name: 'In Progress', color: '#3B82F6', description: 'Currently being worked on', isDefault: false, isCompleted: false, isCancelled: false, isActive: true, displayOrder: 2 },
        { id: 3, firmId: 1, name: 'Completed', color: '#10B981', description: 'Done', isDefault: false, isCompleted: true, isCancelled: false, isActive: true, displayOrder: 3 },
        { id: 4, firmId: 1, name: 'Blocked', color: '#F59E0B', description: 'Waiting on something', isDefault: false, isCompleted: false, isCancelled: false, isActive: true, displayOrder: 4 },
        { id: 5, firmId: 1, name: 'Cancelled', color: '#EF4444', description: 'No longer needed', isDefault: false, isCompleted: false, isCancelled: true, isActive: true, displayOrder: 5 },
      ];
      return res.json({
        success: true,
        data: fallbackStatuses,
        message: 'task_statuses table missing; returning defaults'
      });
    }
    console.error('Error fetching task statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statuses'
    });
  }
});

// POST /api/task-statuses - Create new status
router.post('/', async (req, res) => {
  try {
    const firmId = 1; // TODO: Get from authenticated user's firm
    
    const validationResult = createTaskStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status data',
        errors: validationResult.error.errors
      });
    }

    // Get the max display_order to add new status at the end
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(display_order)` })
      .from(taskStatuses)
      .where(eq(taskStatuses.firmId, firmId));
    
    const maxOrder = maxOrderResult[0]?.maxOrder || 0;

    const [newStatus] = await db
      .insert(taskStatuses)
      .values({
        firmId,
        ...validationResult.data,
        displayOrder: maxOrder + 1,
      })
      .returning();

    console.log(`✅ Task status created: ${newStatus.name} (ID: ${newStatus.id})`);

    res.json({
      success: true,
      data: newStatus,
      message: 'Task status created successfully'
    });

  } catch (error) {
    console.error('Error creating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task status'
    });
  }
});

// PATCH /api/task-statuses/:id - Update status
router.patch('/:id', async (req, res) => {
  try {
    const statusId = parseInt(req.params.id);
    if (isNaN(statusId)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID' });
    }

    const validationResult = updateTaskStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status data',
        errors: validationResult.error.errors
      });
    }

    // Check if status exists and is not a system status (for certain operations)
    const [existingStatus] = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.id, statusId));

    if (!existingStatus) {
      return res.status(404).json({ success: false, message: 'Task status not found' });
    }

    const [updatedStatus] = await db
      .update(taskStatuses)
      .set({
        ...validationResult.data,
        updatedAt: new Date()
      })
      .where(eq(taskStatuses.id, statusId))
      .returning();

    console.log(`✅ Task status updated: ${updatedStatus.name} (ID: ${statusId})`);

    res.json({
      success: true,
      data: updatedStatus,
      message: 'Task status updated successfully'
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
});

// DELETE /api/task-statuses/:id - Delete status
router.delete('/:id', async (req, res) => {
  try {
    const statusId = parseInt(req.params.id);
    if (isNaN(statusId)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID' });
    }

    // Check if status is a system status
    const [existingStatus] = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.id, statusId));

    if (!existingStatus) {
      return res.status(404).json({ success: false, message: 'Task status not found' });
    }

    if (existingStatus.isSystemStatus) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system status. You can deactivate it instead.'
      });
    }

    // Soft delete by setting isActive to false
    const [deletedStatus] = await db
      .update(taskStatuses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(taskStatuses.id, statusId))
      .returning();

    console.log(`🗑️ Task status deactivated: ${deletedStatus.name} (ID: ${statusId})`);

    res.json({
      success: true,
      message: 'Task status deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task status'
    });
  }
});

// PATCH /api/task-statuses/reorder - Bulk update display order
router.patch('/bulk/reorder', async (req, res) => {
  try {
    const validationResult = reorderTaskStatusesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reorder data',
        errors: validationResult.error.errors
      });
    }

    const { statusOrders } = validationResult.data;

    // Update each status's display order
    await Promise.all(
      statusOrders.map(({ id, displayOrder }) =>
        db
          .update(taskStatuses)
          .set({ displayOrder, updatedAt: new Date() })
          .where(eq(taskStatuses.id, id))
      )
    );

    console.log(`✅ Reordered ${statusOrders.length} task statuses`);

    res.json({
      success: true,
      message: 'Task statuses reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering task statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder task statuses'
    });
  }
});

export default router;
