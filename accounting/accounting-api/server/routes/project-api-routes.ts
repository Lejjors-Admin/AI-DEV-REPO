/**
 * Project API Routes - Project Management for Practice Management
 * 
 * Handles project operations for the PAGES practice management system.
 * Projects are organized by client and contain tasks.
 */

import express from 'express';
import { db, pool } from '../db';
import { projects, tasks } from '../../shared/database/crm-entities';
import { clients } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { invoiceAutomationService } from '../services/invoice-automation-service';

const router = express.Router();

/**
 * GET /api/projects - Get all projects with client info and task counts
 * Security: Filters projects by firm and client based on user role
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Build filter conditions based on user role and permissions
    let whereConditions = [eq(projects.isActive, true)];
    
    // Firm-level filtering: Users can only see projects from their firm's clients
    if (user.firmId) {
      whereConditions.push(eq(clients.firmId, user.firmId));
    }
    
    // Client-level filtering: Client users can only see their own projects
    if (user.role === 'client_admin' || user.role === 'client_user') {
      if (user.clientId) {
        whereConditions.push(eq(projects.clientId, user.clientId));
      } else {
        // Client user without clientId - return empty result
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }
    }
    
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        clientId: projects.clientId,
        startDate: projects.startDate,
        endDate: projects.endDate,
        estimatedHours: projects.estimatedHours,
        actualHours: projects.actualHours,
        budgetAmount: projects.budgetAmount,
        notes: projects.notes,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        clientName: sql<string>`COALESCE(${clients.name}, 'Unknown Client')`,
        taskCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${tasks} 
          WHERE ${tasks.projectId} = ${projects.id} 
          AND ${tasks.isActive} = true
        ), 0)`
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...whereConditions))
      .orderBy(desc(projects.createdAt));
    
    res.json({
      success: true,
      data: allProjects,
      count: allProjects.length
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

/**
 * GET /api/projects/client/:clientId - Get projects for a specific client
 * Security: Validates user has access to the requested client
 */
router.get('/client/:clientId', async (req, res) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.params.clientId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid client ID' 
      });
    }
    
    // Verify the requested client belongs to the user's firm
    if (user.firmId) {
      const client = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, clientId),
          eq(clients.firmId, user.firmId)
        ))
        .limit(1);
      
      if (client.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Client not found or not in your firm'
        });
      }
    }
    
    // Client users can only access their own projects
    if ((user.role === 'client_admin' || user.role === 'client_user') && user.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own projects'
      });
    }
    
    const clientProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.clientId, clientId), eq(projects.isActive, true)))
      .orderBy(desc(projects.createdAt));
    
    res.json({
      success: true,
      data: clientProjects,
      count: clientProjects.length
    });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client projects'
    });
  }
});

/**
 * POST /api/projects - Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { 
      name, 
      description, 
      clientId, 
      status = 'not_started',
      startDate,
      endDate,
      estimatedHours,
      budgetAmount,
      notes 
    } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client is required'
      });
    }
    
    const parsedClientId = parseInt(clientId);
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, parsedClientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if ((user.role === 'client_admin' || user.role === 'client_user') && user.clientId !== parsedClientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only create projects for your client'
      });
    }

    if (user.firmId && client.firmId && user.firmId !== client.firmId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Client not in your firm'
      });
    }

    const firmId = client.firmId || user.firmId;
    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required to create a project'
      });
    }

    const newProject = await db
      .insert(projects)
      .values({
        name: name.trim(),
        description: description || '',
        clientId: parsedClientId,
        firmId,
        status: status as any,
        // Parse dates as date strings to avoid timezone shifts
        // Use SQL to insert date strings directly, bypassing Drizzle's date conversion
        startDate: startDate ? (() => {
          const dateStr = typeof startDate === 'string' 
            ? startDate.split('T')[0]  // Remove time part if present
            : new Date(startDate).toISOString().split('T')[0];
          // Validate it's in YYYY-MM-DD format and use SQL to insert directly
          return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? sql`${dateStr}::date` : null;
        })() : null,
        endDate: endDate ? (() => {
          const dateStr = typeof endDate === 'string' 
            ? endDate.split('T')[0]  // Remove time part if present
            : new Date(endDate).toISOString().split('T')[0];
          // Validate it's in YYYY-MM-DD format and use SQL to insert directly
          return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? sql`${dateStr}::date` : null;
        })() : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
        notes: notes || ''
      })
      .returning();
    
    res.json({
      success: true,
      data: newProject[0],
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

/**
 * PATCH /api/projects/bulk - Bulk update projects status
 * NOTE: Must be defined before /:id routes to avoid route matching conflicts
 */
router.patch('/bulk', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { projectIds, status } = req.body;
    
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project IDs array is required'
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate all IDs are numbers
    const validIds = projectIds.every((id: any) => !isNaN(parseInt(id)));
    if (!validIds) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project IDs'
      });
    }
    
    // Update all projects with the new status
    const updatedProjects = await Promise.all(
      projectIds.map((id: any) =>
        db
          .update(projects)
          .set({ status: status as any, updatedAt: new Date() })
          .where(and(
            eq(projects.id, parseInt(id)),
            ...(user.firmId ? [eq(projects.firmId, user.firmId)] : []),
            ...(user.role === 'client_admin' || user.role === 'client_user'
              ? [eq(projects.clientId, user.clientId)]
              : [])
          ))
          .returning()
      )
    );
    
    const successCount = updatedProjects.filter(p => p.length > 0).length;
    
    res.json({
      success: true,
      message: `Successfully updated ${successCount} project(s)`,
      count: successCount
    });
  } catch (error) {
    console.error('Error bulk updating projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update projects'
    });
  }
});

/**
 * DELETE /api/projects/bulk - Bulk delete (deactivate) projects
 * NOTE: Must be defined before /:id routes to avoid route matching conflicts
 */
router.delete('/bulk', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { projectIds } = req.body;
    
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project IDs array is required'
      });
    }
    
    // Validate all IDs are numbers
    const validIds = projectIds.every((id: any) => !isNaN(parseInt(id)));
    if (!validIds) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project IDs'
      });
    }
    
    // Deactivate all projects
    const deletedProjects = await Promise.all(
      projectIds.map((id: any) =>
        db
          .update(projects)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(projects.id, parseInt(id)),
            ...(user.firmId ? [eq(projects.firmId, user.firmId)] : []),
            ...(user.role === 'client_admin' || user.role === 'client_user'
              ? [eq(projects.clientId, user.clientId)]
              : [])
          ))
          .returning()
      )
    );
    
    const successCount = deletedProjects.filter(p => p.length > 0).length;
    
    res.json({
      success: true,
      message: `Successfully deleted ${successCount} project(s)`,
      count: successCount
    });
  } catch (error) {
    console.error('Error bulk deleting projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete projects'
    });
  }
});

/**
 * PUT /api/projects/:id - Update a project
 */
router.put('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid project ID' 
      });
    }
    
    // Get the current project to check status change
    const [currentProject] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        ...(user.firmId ? [eq(projects.firmId, user.firmId)] : []),
        ...(user.role === 'client_admin' || user.role === 'client_user'
          ? [eq(projects.clientId, user.clientId)]
          : [])
      ));
    
    if (!currentProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const { 
      name, 
      description, 
      status,
      startDate,
      endDate,
      estimatedHours,
      actualHours,
      budgetAmount,
      notes 
    } = req.body;
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null;
    if (actualHours !== undefined) updateData.actualHours = actualHours ? parseFloat(actualHours) : null;
    if (budgetAmount !== undefined) updateData.budgetAmount = budgetAmount ? parseFloat(budgetAmount) : null;
    if (notes !== undefined) updateData.notes = notes;
    
    // Extract date strings directly from request - don't put them in updateData
    // We'll handle dates separately with raw SQL to avoid timezone conversion
    let startDateValue: string | null = null;
    let endDateValue: string | null = null;
    
    if (startDate !== undefined) {
      if (startDate) {
        // Extract just the date part (YYYY-MM-DD) from the string
        const dateStr = typeof startDate === 'string' 
          ? startDate.split('T')[0]  // Remove time part if present
          : new Date(startDate).toISOString().split('T')[0];
        // Validate it's in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          startDateValue = dateStr;
          console.log('📅 Extracted startDate:', startDate, '->', startDateValue);
        }
      }
    }
    
    if (endDate !== undefined) {
      if (endDate) {
        // Extract just the date part (YYYY-MM-DD) from the string
        const dateStr = typeof endDate === 'string' 
          ? endDate.split('T')[0]  // Remove time part if present
          : new Date(endDate).toISOString().split('T')[0];
        // Validate it's in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          endDateValue = dateStr;
          console.log('📅 Extracted endDate:', endDate, '->', endDateValue);
        }
      }
    }
    
    // Build where conditions
    const whereConditions = [eq(projects.id, projectId)];
    if (user.firmId) whereConditions.push(eq(projects.firmId, user.firmId));
    if (user.role === 'client_admin' || user.role === 'client_user') {
      if (user.clientId) whereConditions.push(eq(projects.clientId, user.clientId));
    }
    
    // Update all fields including dates using raw SQL to ensure dates are inserted correctly
    const setParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Add non-date fields
    if (updateData.name) {
      setParts.push(`name = $${paramIndex}`);
      params.push(updateData.name);
      paramIndex++;
    }
    if (updateData.description !== undefined) {
      setParts.push(`description = $${paramIndex}`);
      params.push(updateData.description);
      paramIndex++;
    }
    if (updateData.status) {
      setParts.push(`status = $${paramIndex}`);
      params.push(updateData.status);
      paramIndex++;
    }
    if (updateData.budgetAmount !== undefined) {
      setParts.push(`budget_amount = $${paramIndex}`);
      params.push(updateData.budgetAmount);
      paramIndex++;
    }
    if (updateData.updatedAt) {
      setParts.push(`updated_at = $${paramIndex}`);
      params.push(updateData.updatedAt);
      paramIndex++;
    }
    
    // Add date fields - use TO_DATE with explicit format to avoid timezone conversion
    if (startDateValue) {
      // Use TO_DATE with explicit format to ensure no timezone conversion
      console.log('📅 Adding startDate to query:', startDateValue, 'as param', paramIndex);
      setParts.push(`start_date = TO_DATE($${paramIndex}, 'YYYY-MM-DD')`);
      params.push(startDateValue);
      paramIndex++;
    }
    if (endDateValue) {
      // Use TO_DATE with explicit format to ensure no timezone conversion
      console.log('📅 Adding endDate to query:', endDateValue, 'as param', paramIndex);
      setParts.push(`end_date = TO_DATE($${paramIndex}, 'YYYY-MM-DD')`);
      params.push(endDateValue);
      paramIndex++;
    }
    
    // Build WHERE clause
    const whereParts: string[] = [];
    whereParts.push(`id = $${paramIndex}`);
    params.push(projectId);
    paramIndex++;
    
    if (user.firmId) {
      whereParts.push(`firm_id = $${paramIndex}`);
      params.push(user.firmId);
      paramIndex++;
    }
    if (user.role === 'client_admin' || user.role === 'client_user') {
      if (user.clientId) {
        whereParts.push(`client_id = $${paramIndex}`);
        params.push(user.clientId);
        paramIndex++;
      }
    }
    
    // Execute raw SQL update with proper parameter binding using pool directly
    let updatedProject: any[];
    if (setParts.length > 0) {
      const queryString = `
        UPDATE projects 
        SET ${setParts.join(', ')} 
        WHERE ${whereParts.join(' AND ')}
        RETURNING *
      `;
      console.log('🔍 UPDATE Query:', queryString.replace(/\s+/g, ' ').trim());
      console.log('🔍 UPDATE Params:', JSON.stringify(params));
      // Use pool directly for raw SQL with parameter binding
      const result = await pool.query(queryString, params);
      // Format dates as strings to avoid timezone conversion on return
      // PostgreSQL returns dates as Date objects or strings, format them consistently
      if (result.rows[0]?.start_date) {
        const dateValue = result.rows[0].start_date;
        if (typeof dateValue === 'string') {
          // Already a string, use it directly
          result.rows[0].start_date = dateValue.split('T')[0];
        } else if (dateValue instanceof Date) {
          // Convert Date object to YYYY-MM-DD string using UTC methods to avoid timezone shift
          result.rows[0].start_date = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}-${String(dateValue.getUTCDate()).padStart(2, '0')}`;
        } else {
          // Try to format as string
          result.rows[0].start_date = String(dateValue).split('T')[0];
        }
      }
      if (result.rows[0]?.end_date) {
        const dateValue = result.rows[0].end_date;
        if (typeof dateValue === 'string') {
          // Already a string, use it directly
          result.rows[0].end_date = dateValue.split('T')[0];
        } else if (dateValue instanceof Date) {
          // Convert Date object to YYYY-MM-DD string using UTC methods to avoid timezone shift
          result.rows[0].end_date = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}-${String(dateValue.getUTCDate()).padStart(2, '0')}`;
        } else {
          // Try to format as string
          result.rows[0].end_date = String(dateValue).split('T')[0];
        }
      }
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      // Map snake_case columns to camelCase for consistency with API
      const row = result.rows[0];
      updatedProject = [{
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        clientId: row.client_id,
        firmId: row.firm_id,
        startDate: row.start_date,
        endDate: row.end_date,
        estimatedHours: row.estimated_hours,
        actualHours: row.actual_hours,
        budgetAmount: row.budget_amount,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }];
    } else {
      // No updates needed, just fetch the project
      updatedProject = await db
        .select()
        .from(projects)
        .where(and(...whereConditions))
        .limit(1);
    }
    
    if (updatedProject.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if project status changed to "completed"
    const statusChanged = status && status !== currentProject.status;
    const isNowCompleted = status === 'completed';
    
    if (statusChanged && isNowCompleted) {
      console.log(`📊 Project ${projectId} marked as completed. Triggering invoice generation...`);
      
      try {
        // Get user info from session for firmId
        const user = (req as any).user;
        if (user && user.firmId && currentProject.clientId) {
          const invoice = await invoiceAutomationService.generateInvoiceOnProjectStatusChange({
            firmId: user.firmId,
            projectId: projectId,
            clientId: currentProject.clientId
          });
          
          if (invoice) {
            console.log(`✅ Auto-generated invoice ${invoice.invoiceNumber} for project ${projectId}`);
          } else {
            console.log(`ℹ️ No invoice generated (no billable hours or billing settings not configured)`);
          }
        }
      } catch (invoiceError) {
        console.error('Error auto-generating invoice:', invoiceError);
        // Don't fail the project update if invoice generation fails
      }
    }
    
    res.json({
      success: true,
      data: updatedProject[0],
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

/**
 * DELETE /api/projects/:id - Delete (deactivate) a project
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid project ID' 
      });
    }
    
    const deletedProject = await db
      .update(projects)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(projects.id, projectId),
        ...(user.firmId ? [eq(projects.firmId, user.firmId)] : []),
        ...(user.role === 'client_admin' || user.role === 'client_user'
          ? [eq(projects.clientId, user.clientId)]
          : [])
      ))
      .returning();
    
    if (deletedProject.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
});

export default router;