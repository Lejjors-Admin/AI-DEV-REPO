/**
 * Task Management Routes
 * 
 * Handles CRUD operations for tasks including the generated CONNIE AI tasks
 */

import express from 'express';
import { db } from '../db';
import { tasks } from '../../shared/database/crm-entities';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

const router = express.Router();

// Apply security middleware to all routes
router.use(requireAuth);
router.use(setupTenantScope);

// Task update schema
const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.number().nullable().optional(),
  dueDate: z.string().optional(), // ISO date string
  estimatedHours: z.string().optional(), // Decimal as string
  actualHours: z.string().optional(), // Decimal as string
  notes: z.string().optional(),
});

// Update existing task
router.patch('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // First, verify the task belongs to the user's firm
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ));

    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const validationResult = taskUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid task data',
        errors: validationResult.error.errors
      });
    }

    const updateData = validationResult.data;
    
    // Convert date string to proper format if provided
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate).toISOString().split('T')[0];
    }

    // Update task in database
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    console.log(`✅ Task updated: ${updatedTask.title} (ID: ${taskId})`);

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update task' 
    });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify the task belongs to the user's firm before deleting
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ));

    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ))
      .returning();

    if (!deletedTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    console.log(`🗑️ Task deleted: ${deletedTask.title} (ID: ${taskId})`);

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

// Get task by ID
router.get('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const user = req.user as any;
    if (!user || !user.firmId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ));

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch task' 
    });
  }
});

export default router;