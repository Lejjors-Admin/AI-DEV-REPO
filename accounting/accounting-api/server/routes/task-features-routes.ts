/**
 * Task Features Routes
 * 
 * Handles notes, checklist items, and timer functionality for tasks
 */

import express from 'express';
import { db } from '../db';
import { tasks, taskNotes, taskChecklistItems } from '../../shared/database/crm-entities';
import { users } from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuthHybrid } from '../auth';

const router = express.Router();

// Note: Auth and module access middleware are applied at mount level in routes.ts
// We don't apply them here to avoid double execution

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
  console.log(`🔍 taskFeaturesRoutes: ${req.method} ${req.path} (original: ${req.originalUrl})`);
  next();
});

// ===== NOTES ROUTES =====

// GET /api/tasks/:taskId/notes - Get all notes for a task
router.get('/:taskId/notes', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    const firmId = user?.firmId;
    
    if (!firmId) {
      console.error('❌ GET /api/tasks/:taskId/notes - No firmId found, user:', user);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify task belongs to this firm
    const [task] = await db
      .select({ firmId: tasks.firmId })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId)))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const notes = await db
      .select()
      .from(taskNotes)
      .where(and(
        eq(taskNotes.taskId, taskId),
        eq(taskNotes.firmId, firmId)
      ))
      .orderBy(desc(taskNotes.createdAt));

    // Join with users to get user names
    const notesWithUsers = await Promise.all(
      notes.map(async (note: any) => {
        const [userData] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, note.userId))
          .limit(1);
        return {
          ...note,
          userName: userData?.name || userData?.email || 'Unknown'
        };
      })
    );

    res.json(notesWithUsers);
  } catch (error) {
    console.error('Error fetching task notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/tasks/:taskId/notes - Add a note to a task
router.post('/:taskId/notes', async (req, res) => {
  try {
    console.log('📝 ========== POST /api/tasks/:taskId/notes - Request received ==========');
    console.log('📝 Full URL:', req.originalUrl || req.url);
    console.log('📝 Request method:', req.method);
    console.log('📝 Request path:', req.path);
    console.log('📝 Request params:', req.params);
    console.log('📝 Request body:', req.body);
    console.log('📝 Request headers:', JSON.stringify(req.headers, null, 2));
    
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const user = (req as any).user;
    const firmId = user?.firmId;
    const userId = user?.id;
    
    console.log('📝 POST /api/tasks/:taskId/notes - taskId:', taskId, 'user:', user, 'firmId:', firmId, 'userId:', userId);
    
    if (!firmId || !userId) {
      console.error('❌ POST /api/tasks/:taskId/notes - Missing firmId or userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;
    console.log('📝 Content received:', content);
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Verify task belongs to this firm
    console.log('📝 Verifying task exists...');
    const [task] = await db
      .select({ firmId: tasks.firmId })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId)))
      .limit(1);

    if (!task) {
      console.error('❌ Task not found:', taskId, 'for firm:', firmId);
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log('📝 Inserting note into database...');
    const [newNote] = await db
      .insert(taskNotes)
      .values({
        taskId,
        firmId,
        userId,
        content: content.trim(),
      })
      .returning();
    
    console.log('✅ Note created successfully:', newNote);

    // Get user name for response
    const [userData] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.status(201).json({
      ...newNote,
      userName: userData?.name || userData?.email || 'Unknown'
    });
  } catch (error: any) {
    console.error('❌ Error creating task note:', error);
    console.error('❌ Error stack:', error?.stack);
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    console.error('❌ Error details:', {
      taskId: isNaN(taskId) ? 'invalid' : taskId,
      firmId: user?.firmId,
      userId: user?.id,
      content: req.body?.content,
      user: user
    });
    res.status(500).json({ 
      error: 'Failed to create note',
      details: error?.message || String(error)
    });
  }
});

// ===== CHECKLIST ROUTES =====

// GET /api/tasks/:taskId/checklist - Get all checklist items for a task
router.get('/:taskId/checklist', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    const firmId = user?.firmId;
    
    if (!firmId) {
      console.error('❌ GET /api/tasks/:taskId/checklist - No firmId found, user:', user);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify task belongs to this firm
    const [task] = await db
      .select({ firmId: tasks.firmId })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId)))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const items = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.taskId, taskId),
        eq(taskChecklistItems.firmId, firmId)
      ))
      .orderBy(asc(taskChecklistItems.displayOrder));

    res.json(items);
  } catch (error: any) {
    console.error('❌ Error fetching checklist items:', error);
    console.error('❌ Error stack:', error?.stack);
    res.status(500).json({ 
      error: 'Failed to fetch checklist items',
      details: error?.message || String(error)
    });
  }
});

// POST /api/tasks/:taskId/checklist - Add a checklist item to a task
router.post('/:taskId/checklist', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    const firmId = user?.firmId;
    const userId = user?.id;
    
    console.log('✅ POST /api/tasks/:taskId/checklist - taskId:', taskId, 'user:', user, 'firmId:', firmId, 'userId:', userId);
    
    if (!firmId || !userId) {
      console.error('❌ POST /api/tasks/:taskId/checklist - Missing firmId or userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Checklist item title is required' });
    }

    // Verify task belongs to this firm
    const [task] = await db
      .select({ firmId: tasks.firmId })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId)))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get the highest sort order
    const existingItems = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.taskId, taskId),
        eq(taskChecklistItems.firmId, firmId)
      ))
      .orderBy(desc(taskChecklistItems.displayOrder))
      .limit(1);

    const nextDisplayOrder = existingItems.length > 0 ? ((existingItems[0].displayOrder ?? -1) + 1) : 0;

    const [newItem] = await db
      .insert(taskChecklistItems)
      .values({
        taskId,
        firmId,
        title: title.trim(),
        completed: false,
        displayOrder: nextDisplayOrder,
      })
      .returning();

    res.status(201).json(newItem);
  } catch (error: any) {
    console.error('❌ Error creating checklist item:', error);
    console.error('❌ Error stack:', error?.stack);
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    console.error('❌ Error details:', {
      taskId: isNaN(taskId) ? 'invalid' : taskId,
      firmId: user?.firmId,
      userId: user?.id,
      title: req.body?.title,
      user: user
    });
    res.status(500).json({ 
      error: 'Failed to create checklist item',
      details: error?.message || String(error)
    });
  }
});

// PATCH /api/tasks/:taskId/checklist/:itemId - Toggle checklist item completion
router.patch('/:taskId/checklist/:itemId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const itemId = parseInt(req.params.itemId);
    const user = (req as any).user;
    const firmId = user?.firmId;
    
    if (!firmId) {
      console.error('❌ PATCH /api/tasks/:taskId/checklist/:itemId - No firmId found, user:', user);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { isCompleted } = req.body;

    const [updatedItem] = await db
      .update(taskChecklistItems)
      .set({ completed: isCompleted })
      .where(and(
        eq(taskChecklistItems.id, itemId),
        eq(taskChecklistItems.taskId, taskId),
        eq(taskChecklistItems.firmId, firmId)
      ))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(updatedItem);
  } catch (error: any) {
    console.error('❌ Error updating checklist item:', error);
    console.error('❌ Error stack:', error?.stack);
    res.status(500).json({ 
      error: 'Failed to update checklist item',
      details: error?.message || String(error)
    });
  }
});

// Log that routes are registered
console.log('✅ taskFeaturesRoutes registered with routes:');
console.log('   GET /:taskId/notes');
console.log('   POST /:taskId/notes');
console.log('   PUT /:taskId/notes/:noteId');
console.log('   DELETE /:taskId/notes/:noteId');
console.log('   GET /:taskId/checklist');
console.log('   POST /:taskId/checklist');
console.log('   PUT /:taskId/checklist/:itemId');
console.log('   DELETE /:taskId/checklist/:itemId');

export default router;
