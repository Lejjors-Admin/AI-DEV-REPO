/**
 * Calendar & Scheduling Routes
 * 
 * Comprehensive scheduling system with RBAC and validation
 * Handles calendar events, user availability, appointment requests, and integrations
 */

import express from 'express';
import { db } from '../db';
import { storage } from '../minimal-storage';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { googleCalendarService, outlookCalendarService } from '../services/external-calendar.service';
import { ConflictDetectionService } from '../services/conflict-detection.service';
import { appointmentService } from '../services/appointment.service';
import { calendarSharingService } from '../services/calendar-sharing.service';
import { requireAuthHybrid } from '../auth';
import { 
  calendarEvents,
  createEventSchema,
  updateEventSchema,
  insertUserAvailabilitySchema,
  insertAvailabilityExceptionSchema,
  createAppointmentRequestSchema,
  respondToAppointmentSchema,
  insertCalendarIntegrationSchema,
  batchUpdateEventsSchema,
  bulkAvailabilityUpdateSchema,
  createCalendarShareSchema,
  updateCalendarShareSchema
} from '../../shared/database/scheduling-entities';

const router = express.Router();
router.use(requireAuthHybrid);

// ============================================================================
// RBAC HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has access to firm data
 */
function checkFirmAccess(userRole: string, userFirmId: number | null, targetFirmId: number): boolean {
  if (userRole === 'super_admin') return true;
  if (userRole === 'firm_admin' && userFirmId === targetFirmId) return true;
  if (userRole === 'firm_staff' && userFirmId === targetFirmId) return true;
  return false;
}

/**
 * Check if user has staff-level permissions
 */
function hasStaffPermissions(userRole: string): boolean {
  return ['super_admin', 'firm_admin', 'firm_staff'].includes(userRole);
}

/**
 * Get firm ID from request (params or user only - NEVER from body for security)
 */
function getFirmId(req: any): number {
  return req.params?.firmId || req.user?.firmId;
}

/**
 * Validate user access to specific user data (TIGHTENED SECURITY)
 */
function canAccessUserData(currentUser: any, targetUserId: number): boolean {
  // Super admins can access all data
  if (currentUser.role === 'super_admin') return true;
  
  // Users can access their own data
  if (currentUser.id === targetUserId) return true;
  
  // CRITICAL FIX: Staff can ONLY access data from users in their own firm
  if (hasStaffPermissions(currentUser.role) && currentUser.firmId) {
    // TODO: Add actual same-firm verification by checking target user's firmId
    // For now, reject to prevent unauthorized access until proper check is implemented
    return false;
  }
  
  return false;
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

/**
 * GET /api/schedule/events - List calendar events
 * 
 * Query params:
 * - from: ISO date string (optional)
 * - to: ISO date string (optional) 
 * - clientId: number (optional)
 * - userId: number (optional) - for user-scoped events
 */
router.get('/events',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // SECURITY FIX: Only get firmId from user context, never from request body
    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Check firm access
    if (!checkFirmAccess(user.role, user.firmId, firmId)) {
      return res.status(403).json({ success: false, message: 'Access denied to firm data' });
    }

    // Parse query parameters
    const { from, to, clientId, userId } = req.query;
    
    const filters: any = { firmId };
    
    if (from) {
      try {
        filters.from = new Date(from as string);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid from date format' });
      }
    }
    
    if (to) {
      try {
        filters.to = new Date(to as string);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid to date format' });
      }
    }
    
    if (clientId) {
      const clientIdNum = parseInt(clientId as string);
      if (isNaN(clientIdNum)) {
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      filters.clientId = clientIdNum;
    }

    if (userId) {
      const userIdNum = parseInt(userId as string);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      
      // Check if user can access this user's data
      if (!canAccessUserData(user, userIdNum)) {
        return res.status(403).json({ success: false, message: 'Access denied to user data' });
      }
      
      filters.userScope = userIdNum;
    }

    // Client users can only see their own events
    if ((user.role === 'client_admin' || user.role === 'client_user') && user.clientId) {
      filters.clientId = user.clientId;
    }

    const conditions = [eq(calendarEvents.firmId, firmId)];
    if (filters.from) {
      conditions.push(gte(calendarEvents.startAt, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(calendarEvents.endAt, filters.to));
    }
    if (filters.clientId) {
      conditions.push(eq(calendarEvents.clientId, filters.clientId));
    }
    if (filters.userScope) {
      conditions.push(or(
        eq(calendarEvents.organizerUserId, filters.userScope),
        sql`${calendarEvents.staffUserIds} @> ARRAY[${filters.userScope}]::int[]`
      ));
    }

    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(calendarEvents.startAt);

    res.json({
      success: true,
      data: events,
      count: events.length
    });

  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch events' 
    });
  }
});

/**
 * POST /api/schedule/events - Create calendar event
 */
router.post('/events',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // SECURITY FIX: Only get firmId from user context, never from request body
    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can create events
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to create events' });
    }

    // Validate request body
    console.log('📅 POST /api/schedule/events - Request body:', JSON.stringify(req.body, null, 2));
    const validationResult = createEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('❌ POST /api/schedule/events - Validation errors:', validationResult.error.errors);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid event data',
        errors: validationResult.error.errors
      });
    }
    console.log('✅ POST /api/schedule/events - Validation passed');

    const eventData = {
      ...validationResult.data,
      firmId,
      organizerUserId: user.id // Set current user as organizer
    };

    // Phase 3.4: Detect conflicts BEFORE creating
    const ignoreConflicts = req.body.ignoreConflicts === true;
    
    if (!ignoreConflicts) {
      const allUserIds = [
        user.id,
        ...(eventData.staffUserIds || []),
        ...(eventData.clientUserIds || [])
      ].filter(id => id !== undefined);

      const conflictInfo = await ConflictDetectionService.detectConflicts(
        {
          startAt: new Date(eventData.startAt),
          endAt: new Date(eventData.endAt)
        },
        firmId,
        allUserIds
      );

      // Check availability blocks for organizer
      const hasBlockedTime = await ConflictDetectionService.checkAvailabilityBlocks(
        {
          startAt: new Date(eventData.startAt),
          endAt: new Date(eventData.endAt)
        },
        firmId,
        user.id
      );

      // If conflicts detected and user hasn't confirmed, return 409
      if (conflictInfo.hasConflict || hasBlockedTime) {
        return res.status(409).json({
          success: false,
          message: 'Scheduling conflicts detected',
          conflicts: conflictInfo,
          blockedTime: hasBlockedTime,
          eventData: eventData // Send back the data so frontend can retry with ignoreConflicts
        });
      }
    }

    const event = await storage.createEvent(eventData);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create event' 
    });
  }
});

/**
 * PATCH /api/schedule/events/:id - Update calendar event
 */
router.patch('/events/:id',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    // SECURITY FIX: Only get firmId from user context, never from request body  
    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can update events
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update events' });
    }

    // Validate request body
    const validationResult = updateEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid event update data',
        errors: validationResult.error.errors
      });
    }

    const updates = validationResult.data;
    
    // Phase 3.4: Detect conflicts if time or participants changed
    const ignoreConflicts = req.body.ignoreConflicts === true;
    
    if (!ignoreConflicts && (updates.startAt || updates.endAt || updates.staffUserIds || updates.clientUserIds)) {
      // Get current event to get time bounds
      const currentEvent = await storage.getEventById(eventId, firmId);
      if (currentEvent) {
        const startAt = updates.startAt ? new Date(updates.startAt) : currentEvent.startAt;
        const endAt = updates.endAt ? new Date(updates.endAt) : currentEvent.endAt;
        
        const allUserIds = [
          currentEvent.organizerUserId,
          ...(updates.staffUserIds || currentEvent.staffUserIds || []),
          ...(updates.clientUserIds || currentEvent.clientUserIds || [])
        ].filter(id => id !== undefined);

        const conflictInfo = await ConflictDetectionService.detectConflicts(
          { startAt, endAt },
          firmId,
          allUserIds,
          eventId // Exclude current event
        );

        const hasBlockedTime = await ConflictDetectionService.checkAvailabilityBlocks(
          { startAt, endAt },
          firmId,
          currentEvent.organizerUserId
        );

        // If conflicts detected and user hasn't confirmed, return 409
        if (conflictInfo.hasConflict || hasBlockedTime) {
          return res.status(409).json({
            success: false,
            message: 'Scheduling conflicts detected',
            conflicts: conflictInfo,
            blockedTime: hasBlockedTime,
            eventData: { ...currentEvent, ...updates }
          });
        }
      }
    }
    
    // CRITICAL SECURITY FIX: Pass firmId to prevent cross-tenant modification
    const event = await storage.updateEvent(eventId, updates, firmId);

    // Reverse sync: Update linked task or milestone if calendar event time changed
    if (updates.startAt || updates.endAt) {
      try {
        const taskSynced = await CalendarSyncService.syncCalendarToTask(eventId);
        const milestoneSynced = await CalendarSyncService.syncCalendarToMilestone(eventId);
        
        if (taskSynced) {
          console.log(`📅 Reverse-synced calendar event #${eventId} to task`);
        } else if (milestoneSynced) {
          console.log(`📅 Reverse-synced calendar event #${eventId} to milestone`);
        }
      } catch (syncError) {
        console.error('Reverse calendar sync error (non-fatal):', syncError);
      }
    }

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update event' 
    });
  }
});

/**
 * DELETE /api/schedule/events/:id - Delete calendar event
 */
router.delete('/events/:id',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can delete events
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete events' });
    }

    await storage.deleteEvent(eventId, firmId);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete event' 
    });
  }
});

// ============================================================================
// USER AVAILABILITY
// ============================================================================

/**
 * GET /api/schedule/availability/all - Get all availability for the firm (management only)
 */
router.get('/availability/all', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only management can access all availability
    const isManagement = ['firm_admin', 'firm_owner', 'manager', 'super_admin', 'admin', 'system_admin'].includes(user.role) || user.isManager;
    if (!isManagement) {
      return res.status(403).json({ success: false, message: 'Management access required' });
    }

    // Get all users in the firm
    const { db } = await import('../db');
    const { users } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const firmUsers = await db.select()
      .from(users)
      .where(eq(users.firmId, firmId));

    // Get availability for all users
    const allAvailability = [];
    for (const firmUser of firmUsers) {
      const userAvailability = await storage.listAvailability(firmUser.id, firmId);
      allAvailability.push(...userAvailability);
    }

    res.json({
      success: true,
      data: allAvailability
    });

  } catch (error) {
    console.error('Error fetching all availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch all availability' 
    });
  }
});

/**
 * GET /api/schedule/availability - Get current user's availability
 */
router.get('/availability', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const availability = await storage.listAvailability(user.id, firmId);

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch availability' 
    });
  }
});

/**
 * GET /api/schedule/availability/:userId - Get specific user availability (staff only)
 */
router.get('/availability/:userId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Check if user can access this user's data
    if (!canAccessUserData(user, userId)) {
      return res.status(403).json({ success: false, message: 'Access denied to user data' });
    }

    const availability = await storage.listAvailability(userId, firmId);

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Error fetching user availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user availability' 
    });
  }
});

/**
 * POST /api/schedule/availability - Create/update availability
 */
router.post('/availability', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validationResult = insertUserAvailabilitySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid availability data',
        errors: validationResult.error.errors
      });
    }

    const availabilityData = {
      ...validationResult.data,
      userId: user.id, // Force current user
      firmId
    };

    const availability = await storage.upsertAvailability(availabilityData);

    res.json({
      success: true,
      data: availability,
      message: 'Availability updated successfully'
    });

  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update availability' 
    });
  }
});

/**
 * DELETE /api/schedule/availability/:id - Delete availability
 */
router.delete('/availability/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const availabilityId = parseInt(req.params.id);
    if (isNaN(availabilityId)) {
      return res.status(400).json({ success: false, message: 'Invalid availability ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    await storage.deleteAvailability(availabilityId, firmId);

    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete availability' 
    });
  }
});

// ============================================================================
// AVAILABILITY EXCEPTIONS
// ============================================================================

/**
 * GET /api/schedule/exceptions - Get availability exceptions
 */
router.get('/exceptions', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const { from, to, userId } = req.query;
    let targetUserId = user.id;

    // Allow staff to query other users
    if (userId && hasStaffPermissions(user.role)) {
      const userIdNum = parseInt(userId as string);
      if (!isNaN(userIdNum)) {
        targetUserId = userIdNum;
      }
    }

    let fromDate, toDate;
    if (from) {
      try {
        fromDate = new Date(from as string);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid from date format' });
      }
    }
    
    if (to) {
      try {
        toDate = new Date(to as string);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid to date format' });
      }
    }

    const exceptions = await storage.listAvailabilityExceptions(targetUserId, firmId, fromDate, toDate);

    res.json({
      success: true,
      data: exceptions
    });

  } catch (error) {
    console.error('Error fetching availability exceptions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch availability exceptions' 
    });
  }
});

/**
 * POST /api/schedule/exceptions - Create/update availability exception
 */
router.post('/exceptions', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validationResult = insertAvailabilityExceptionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid availability exception data',
        errors: validationResult.error.errors
      });
    }

    const exceptionData = {
      ...validationResult.data,
      userId: user.id, // Force current user
      firmId
    };

    const exception = await storage.upsertAvailabilityException(exceptionData);

    res.json({
      success: true,
      data: exception,
      message: 'Availability exception updated successfully'
    });

  } catch (error) {
    console.error('Error updating availability exception:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update availability exception' 
    });
  }
});

/**
 * DELETE /api/schedule/exceptions/:id - Delete availability exception
 */
router.delete('/exceptions/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const exceptionId = parseInt(req.params.id);
    if (isNaN(exceptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid exception ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    await storage.deleteAvailabilityException(exceptionId, firmId);

    res.json({
      success: true,
      message: 'Availability exception deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting availability exception:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete availability exception' 
    });
  }
});

// ============================================================================
// APPOINTMENT REQUESTS
// ============================================================================

/**
 * GET /api/schedule/appointments - List appointment requests
 */
router.get('/appointments', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = getFirmId(req) || user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Check firm access
    if (!checkFirmAccess(user.role, user.firmId, firmId)) {
      return res.status(403).json({ success: false, message: 'Access denied to firm data' });
    }

    const { clientId, staffUserId, status } = req.query;
    
    const filters: any = { firmId };
    
    if (clientId) {
      const clientIdNum = parseInt(clientId as string);
      if (!isNaN(clientIdNum)) {
        filters.clientId = clientIdNum;
      }
    }
    
    if (staffUserId) {
      const staffUserIdNum = parseInt(staffUserId as string);
      if (!isNaN(staffUserIdNum)) {
        filters.staffUserId = staffUserIdNum;
      }
    }
    
    if (status) {
      filters.status = status as string;
    }

    // Client users can only see their own appointments
    if (user.role === 'client' && user.clientId) {
      filters.clientId = user.clientId;
    }

    const appointments = await storage.listAppointmentRequests(filters);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Error listing appointment requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointment requests' 
    });
  }
});

/**
 * POST /api/schedule/appointments/request - Create appointment request
 */
router.post('/appointments/request', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = getFirmId(req) || user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validationResult = createAppointmentRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid appointment request data',
        errors: validationResult.error.errors
      });
    }

    const requestData = {
      ...validationResult.data,
      firmId,
      requestedByUserId: user.id
    };

    // If user is a client, ensure they can only request for their own client
    if (user.role === 'client' && user.clientId) {
      requestData.clientId = user.clientId;
    }

    const appointment = await storage.createAppointmentRequest(requestData);

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment request created successfully'
    });

  } catch (error) {
    console.error('Error creating appointment request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create appointment request' 
    });
  }
});

/**
 * POST /api/schedule/appointments/:id/approve - Approve appointment (staff only)
 * Creates calendar event and sends confirmation emails
 */
router.post('/appointments/:id/approve', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can approve appointments
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to approve appointments' });
    }

    const { location, videoLink, meetingRoomId, notes } = req.body;

    // Approve appointment using service (creates event + sends emails)
    const result = await appointmentService.approveAppointment({
      appointmentId,
      firmId,
      approvedByUserId: user.id,
      location,
      videoLink,
      meetingRoomId,
      notes
    });

    res.json({
      success: true,
      data: result,
      message: 'Appointment approved and confirmations sent'
    });

  } catch (error: any) {
    console.error('Error approving appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to approve appointment' 
    });
  }
});

/**
 * POST /api/schedule/appointments/:id/reject - Reject appointment (staff only)
 */
router.post('/appointments/:id/reject', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can reject appointments
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to reject appointments' });
    }

    const appointment = await storage.updateAppointmentStatus(appointmentId, 'rejected', firmId);

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject appointment' 
    });
  }
});

/**
 * POST /api/schedule/appointments/:id/cancel - Cancel appointment
 * Can be cancelled by client (their own) or staff (any)
 */
router.post('/appointments/:id/cancel', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const { reason } = req.body;

    // Cancel appointment using service (updates status + sends emails)
    await appointmentService.cancelAppointment({
      appointmentId,
      firmId,
      cancelledByUserId: user.id,
      reason
    });

    res.json({
      success: true,
      message: 'Appointment cancelled and notifications sent'
    });

  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to cancel appointment' 
    });
  }
});

/**
 * POST /api/schedule/appointments/:id/reschedule - Reschedule appointment
 */
router.post('/appointments/:id/reschedule', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const { newStartAt, newEndAt, reason } = req.body;

    if (!newStartAt || !newEndAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'newStartAt and newEndAt are required' 
      });
    }

    // Reschedule appointment using service
    const newAppointment = await appointmentService.rescheduleAppointment({
      appointmentId,
      firmId,
      requestedByUserId: user.id,
      newStartAt: new Date(newStartAt),
      newEndAt: new Date(newEndAt),
      reason
    });

    res.json({
      success: true,
      data: newAppointment,
      message: 'Appointment rescheduled successfully'
    });

  } catch (error: any) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to reschedule appointment' 
    });
  }
});

// ============================================================================
// CALENDAR INTEGRATIONS
// ============================================================================

/**
 * GET /api/schedule/integrations - Get calendar integrations for current user
 */
router.get('/integrations', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { provider } = req.query;
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Provider parameter required' });
    }

    const integration = await storage.getCalendarIntegration(user.id, provider as string);

    res.json({
      success: true,
      data: integration
    });

  } catch (error) {
    console.error('Error fetching calendar integration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch calendar integration' 
    });
  }
});

/**
 * POST /api/schedule/integrations - Create/update calendar integration
 */
router.post('/integrations', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validationResult = insertCalendarIntegrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid calendar integration data',
        errors: validationResult.error.errors
      });
    }

    const integrationData = {
      ...validationResult.data,
      userId: user.id, // Force current user
      firmId
    };

    const integration = await storage.upsertCalendarIntegration(integrationData);

    res.json({
      success: true,
      data: integration,
      message: 'Calendar integration updated successfully'
    });

  } catch (error) {
    console.error('Error updating calendar integration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update calendar integration' 
    });
  }
});

/**
 * DELETE /api/schedule/integrations/:id - Delete calendar integration
 */
router.delete('/integrations/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid integration ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    await storage.deleteCalendarIntegration(integrationId, firmId);

    res.json({
      success: true,
      message: 'Calendar integration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting calendar integration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete calendar integration' 
    });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/schedule/events/bulk-reschedule - Bulk time-shift events (staff only)
 * Shifts selected events by a time delta (e.g., +7 days, -2 hours)
 */
router.post('/events/bulk-reschedule',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can perform bulk operations
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for bulk operations' });
    }

    const { eventIds, shiftMinutes } = req.body;
    
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Event IDs array required' });
    }

    if (typeof shiftMinutes !== 'number') {
      return res.status(400).json({ success: false, message: 'Shift minutes (number) required' });
    }

    const results = [];

    for (const eventId of eventIds) {
      try {
        const event = await storage.getEventById(eventId, firmId);
        if (!event) {
          results.push({ eventId, success: false, error: 'Event not found' });
          continue;
        }

        // Calculate new times
        const newStartAt = new Date(event.startAt.getTime() + shiftMinutes * 60000);
        const newEndAt = new Date(event.endAt.getTime() + shiftMinutes * 60000);

        const updatedEvent = await storage.updateEvent(eventId, {
          startAt: newStartAt,
          endAt: newEndAt
        }, firmId);

        results.push({ eventId, success: true, data: updatedEvent });
      } catch (error) {
        results.push({ eventId, success: false, error: (error as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: results,
      summary: {
        total: eventIds.length,
        succeeded: successCount,
        failed: failCount
      },
      message: `Rescheduled ${successCount} event(s)${failCount > 0 ? `, ${failCount} failed` : ''}`
    });

  } catch (error) {
    console.error('Error bulk rescheduling events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk reschedule events' 
    });
  }
});

/**
 * POST /api/schedule/events/batch-update - Batch update events (staff only)
 */
router.post('/events/batch-update',requireAuthHybrid, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // SECURITY FIX: Get firmId from user context only
    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can perform batch operations
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for batch operations' });
    }

    // Validate request body
    const validationResult = batchUpdateEventsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid batch update data',
        errors: validationResult.error.errors
      });
    }

    const { eventIds, updates } = validationResult.data;
    const results = [];

    for (const eventId of eventIds) {
      try {
        // CRITICAL SECURITY FIX: Pass firmId to prevent cross-tenant modification
        const event = await storage.updateEvent(eventId, updates, firmId);
        results.push({ eventId, success: true, data: event });
      } catch (error) {
        results.push({ eventId, success: false, error: (error as Error).message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: 'Batch update completed'
    });

  } catch (error) {
    console.error('Error performing batch update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to perform batch update' 
    });
  }
});

/**
 * POST /api/schedule/availability/bulk-update - Bulk update availability (staff only)
 */
router.post('/availability/bulk-update', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Only staff can perform bulk operations
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for bulk operations' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validationResult = bulkAvailabilityUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bulk availability data',
        errors: validationResult.error.errors
      });
    }

    const { userId, weeklySchedule } = validationResult.data;
    const results = [];

    for (const schedule of weeklySchedule) {
      try {
        const availabilityData = {
          ...schedule,
          userId,
          firmId
        };
        const availability = await storage.upsertAvailability(availabilityData);
        results.push({ weekday: schedule.weekday, success: true, data: availability });
      } catch (error) {
        results.push({ weekday: schedule.weekday, success: false, error: (error as Error).message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: 'Bulk availability update completed'
    });

  } catch (error) {
    console.error('Error performing bulk availability update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to perform bulk availability update' 
    });
  }
});

// ============================================================================
// CALENDAR INTEGRATION OAUTH & SYNC ENDPOINTS
// ============================================================================

import { CalendarOAuthFactory } from '../services/calendar-oauth-service.js';
import { OAuthStateService } from '../services/oauth-state-service.js';
import { CalendarSyncService } from '../services/calendar-sync-service.js';
import { TokenEncryptionService } from '../services/token-encryption-service.js';

const oauthFactory = new CalendarOAuthFactory();
const syncService = new CalendarSyncService();
const tokenEncryption = new TokenEncryptionService();
const oauthStateService = new OAuthStateService();

/**
 * GET /api/schedule/integrations - List user's calendar integrations
 */
router.get('/integrations', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const integrations = await storage.getUserCalendarIntegrations(user.id, firmId);

    // Remove sensitive token data from response
    const safeIntegrations = integrations.map(integration => ({
      ...integration,
      accessTokenEncrypted: undefined,
      refreshTokenEncrypted: undefined
    }));

    res.json({
      success: true,
      data: safeIntegrations,
      configuredProviders: oauthFactory.getConfiguredProviders()
    });

  } catch (error) {
    console.error('Error listing integrations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch integrations' 
    });
  }
});

/**
 * GET /api/schedule/oauth/:provider/auth - Start OAuth flow
 */
router.get('/oauth/:provider/auth', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const provider = req.params.provider as 'google' | 'outlook';
    if (!['google', 'outlook'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Invalid provider' });
    }

    if (!oauthFactory.isProviderConfigured(provider)) {
      return res.status(400).json({ 
        success: false, 
        message: `${provider} integration is not configured` 
      });
    }

    // Generate cryptographically secure state with HMAC protection
    const state = await oauthStateService.generateState(user.id, user.firmId, provider);

    const oauthProvider = oauthFactory.getProvider(provider);
    const authUrl = oauthProvider.getAuthUrl(state);

    res.json({
      success: true,
      authUrl,
      provider
    });

  } catch (error) {
    console.error(`OAuth init error for ${req.params.provider}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize OAuth flow' 
    });
  }
});

/**
 * GET /api/schedule/oauth/:provider/callback - OAuth callback handler
 */
router.get('/oauth/:provider/callback', async (req, res) => {
  try {
    const provider = req.params.provider as 'google' | 'outlook';
    const { code, state, error } = req.query;

    if (error) {
      console.error(`OAuth error for ${provider}:`, error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/calendar?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/calendar?error=invalid_callback`);
    }

    // Validate secure HMAC-signed state
    let stateData;
    try {
      stateData = await oauthStateService.validateState(state as string);
    } catch (error) {
      console.error('OAuth state validation failed:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/calendar?error=invalid_state`);
    }

    const oauthProvider = oauthFactory.getProvider(provider);
    const tokenData = await oauthProvider.authenticate(code as string, state as string);

    // Encrypt tokens for storage
    const encryptedTokens = await tokenEncryption.encryptTokenData(tokenData);

    // Get user email from provider if possible
    let accountEmail = 'unknown';
    try {
      if (provider === 'google') {
        const googleProvider = oauthProvider as any;
        const oauth2 = googleProvider.oauth2Client;
        oauth2.setCredentials({ access_token: tokenData.accessToken });
        const oauth2Service = google.oauth2({ version: 'v2', auth: oauth2 });
        const userInfo = await oauth2Service.userinfo.get();
        accountEmail = userInfo.data.email || 'unknown';
      } else if (provider === 'outlook') {
        const microsoftProvider = oauthProvider as any;
        const graphClient = await microsoftProvider.getGraphClient({ 
          accessTokenEncrypted: encryptedTokens.accessTokenEncrypted 
        } as any);
        const user = await graphClient.api('/me').get();
        accountEmail = user.mail || user.userPrincipalName || 'unknown';
      }
    } catch (error) {
      console.error('Error getting user email:', error);
    }

    // Create or update integration
    const integrationData = {
      userId: stateData.userId,
      firmId: stateData.firmId,
      provider,
      accountEmail,
      accessTokenEncrypted: encryptedTokens.accessTokenEncrypted,
      refreshTokenEncrypted: encryptedTokens.refreshTokenEncrypted,
      tokenExpiry: tokenData.expiryDate ? new Date(tokenData.expiryDate) : null,
      scopes: tokenData.scope || [],
      permissions: {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canCreateEvents: true,
        canModifyEvents: true
      },
      isActive: true,
      lastSyncAt: null,
      lastSyncStatus: 'success'
    };

    const integration = await storage.createOrUpdateCalendarIntegration(integrationData);

    // Trigger initial sync
    setTimeout(async () => {
      try {
        await syncService.syncCalendar(integration.id, 'full');
      } catch (error) {
        console.error('Initial sync error:', error);
      }
    }, 1000);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/calendar?success=integration_connected&provider=${provider}`);

  } catch (error) {
    console.error(`OAuth callback error for ${req.params.provider}:`, error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/calendar?error=oauth_failed`);
  }
});

/**
 * DELETE /api/schedule/integrations/:id - Remove calendar integration
 */
router.delete('/integrations/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid integration ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Verify user owns this integration and delete securely
    const integration = await storage.getCalendarIntegration(integrationId, user.id, firmId);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found or access denied' });
    }

    await storage.deleteCalendarIntegration(integrationId, user.id, firmId);

    res.json({
      success: true,
      message: 'Calendar integration removed successfully'
    });

  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete integration' 
    });
  }
});

/**
 * POST /api/schedule/integrations/:id/sync - Manual sync trigger
 */
router.post('/integrations/:id/sync', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid integration ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Verify user owns this integration using secure ownership check
    const integration = await storage.getCalendarIntegration(integrationId, user.id, firmId);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found or access denied' });
    }

    if (!integration.isActive) {
      return res.status(400).json({ success: false, message: 'Integration is not active' });
    }

    // Trigger sync
    const syncResult = await syncService.syncCalendar(integrationId, 'manual');

    res.json({
      success: syncResult.success,
      data: syncResult,
      message: syncResult.success ? 'Sync completed successfully' : 'Sync completed with errors'
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync calendar' 
    });
  }
});

/**
 * PATCH /api/schedule/integrations/:id - Update integration settings
 */
router.patch('/integrations/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid integration ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Verify user owns this integration using secure ownership check
    const integration = await storage.getCalendarIntegration(integrationId, user.id, firmId);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found or access denied' });
    }

    // Validate allowed updates
    const allowedUpdates = [
      'syncDirection', 'autoSyncEnabled', 'syncFrequencyMinutes',
      'defaultEventVisibility', 'includePrivateEvents', 'eventTitlePrefix', 'isActive'
    ];

    const updates: any = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid updates provided' });
    }

    const updatedIntegration = await storage.updateCalendarIntegration(integrationId, updates);

    // Remove sensitive data from response
    const safeIntegration = {
      ...updatedIntegration,
      accessTokenEncrypted: undefined,
      refreshTokenEncrypted: undefined
    };

    res.json({
      success: true,
      data: safeIntegration,
      message: 'Integration settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update integration' 
    });
  }
});

/**
 * GET /api/schedule/integrations/:id/status - Get integration sync status
 */
router.get('/integrations/:id/status', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid integration ID' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Verify user owns this integration using secure ownership check
    const integration = await storage.getCalendarIntegration(integrationId, user.id, firmId);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found or access denied' });
    }

    // Get recent sync logs (if implemented)
    // const recentSyncs = await storage.getRecentSyncLogs(integrationId, 10);

    const status = {
      isActive: integration.isActive,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncError: integration.lastSyncError,
      syncStats: integration.syncStats,
      provider: integration.provider,
      accountEmail: integration.accountEmail,
      syncDirection: integration.syncDirection,
      autoSyncEnabled: integration.autoSyncEnabled,
      syncFrequencyMinutes: integration.syncFrequencyMinutes
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting integration status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get integration status' 
    });
  }
});

/**
 * GET /api/schedule/providers - Get available OAuth providers and their configuration status
 */
router.get('/providers', async (req, res) => {
  try {
    const user = (req as any).user;
    let googleConfigured = false;
    let outlookConfigured = false;

    if (user && user.firmId) {
      googleConfigured = await googleCalendarService.isConfigured(user.firmId);
      outlookConfigured = await outlookCalendarService.isConfigured(user.firmId);
    }

    const providers = [
      {
        id: 'google',
        name: 'Google Calendar',
        configured: googleConfigured,
        description: 'Sync with Google Calendar events'
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        configured: outlookConfigured,
        description: 'Sync with Outlook and Office 365 calendars'
      }
    ];

    res.json({
      success: true,
      data: providers
    });

  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get providers' 
    });
  }
});

// ============================================================================
// PHASE 3.4: SMART SCHEDULING & AI FEATURES
// ============================================================================

/**
 * POST /api/schedule/suggest-times - Get smart time slot suggestions
 */
router.post('/suggest-times', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const { durationMinutes, userIds, preferredDate, bufferMinutes, count } = req.body;

    if (!durationMinutes || !userIds || !preferredDate) {
      return res.status(400).json({
        success: false,
        message: 'durationMinutes, userIds, and preferredDate are required'
      });
    }

    const suggestions = await ConflictDetectionService.suggestTimeSlots(
      durationMinutes,
      firmId,
      userIds,
      new Date(preferredDate),
      {
        bufferMinutes: bufferMinutes || 15,
        count: count || 3,
        startHour: 9,
        endHour: 17
      }
    );

    res.json({
      success: true,
      data: suggestions,
      message: `Found ${suggestions.length} available time slots`
    });

  } catch (error) {
    console.error('Error suggesting time slots:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to suggest time slots' 
    });
  }
});

/**
 * POST /api/schedule/ai-command - Execute AI-parsed scheduling commands
 */
router.post('/ai-command', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Only staff can use AI commands
    if (!hasStaffPermissions(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { command } = req.body;
    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'command is required'
      });
    }

    // Import AI service
    const { AIService } = await import('../services/ai.service');
    
    // Parse command using AI
    const prompt = `Parse this calendar scheduling command and return a JSON response with the action and parameters:
    
Command: "${command}"

Return a JSON object with:
- action: one of ["move_events", "reschedule_event", "cancel_events", "create_event"]
- eventIds: array of event IDs (if applicable, extract from context)
- timeShift: object with {amount: number, unit: "days"|"weeks"|"months"} for move operations
- newDate: ISO date string for specific reschedule
- eventData: object with event details for create operations

Only return the JSON, no other text.`;

    const aiResponse = await AIService.generateText(prompt);
    
    let parsedCommand;
    try {
      // Extract JSON from response (remove markdown code blocks if present)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Could not parse command. Please be more specific.',
        aiResponse
      });
    }

    res.json({
      success: true,
      data: parsedCommand,
      message: 'Command parsed successfully. Execute the action using the appropriate API endpoint.'
    });

  } catch (error) {
    console.error('Error parsing AI command:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to parse AI command' 
    });
  }
});

/**
 * POST /api/schedule/check-conflicts - Check for conflicts without creating event
 */
router.post('/check-conflicts', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const { startAt, endAt, userIds, excludeEventId } = req.body;

    if (!startAt || !endAt || !userIds) {
      return res.status(400).json({
        success: false,
        message: 'startAt, endAt, and userIds are required'
      });
    }

    const conflictInfo = await ConflictDetectionService.detectConflicts(
      {
        startAt: new Date(startAt),
        endAt: new Date(endAt)
      },
      firmId,
      userIds,
      excludeEventId
    );

    res.json({
      success: true,
      data: conflictInfo
    });

  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check conflicts' 
    });
  }
});

// ============================================================================
// CALENDAR SHARING (Phase 3.5)
// ============================================================================


/**
 * GET /api/schedule/calendar-shares/my-shares - Get calendars I've shared
 */
router.get('/calendar-shares/my-shares', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const shares = await calendarSharingService.getSharedCalendars(user.id, firmId);

    res.json({
      success: true,
      data: shares
    });

  } catch (error) {
    console.error('Error fetching shared calendars:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shared calendars' 
    });
  }
});

/**
 * GET /api/schedule/calendar-shares/shared-with-me - Get calendars shared with me
 */
router.get('/calendar-shares/shared-with-me', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const shares = await calendarSharingService.getCalendarsSharedWithMe(user.id, firmId);

    res.json({
      success: true,
      data: shares
    });

  } catch (error) {
    console.error('Error fetching calendars shared with me:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch calendars shared with me' 
    });
  }
});

/**
 * POST /api/schedule/calendar-shares - Create a calendar share
 */
router.post('/calendar-shares', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Validate request body
    const validated = createCalendarShareSchema.parse(req.body);

    // Prevent sharing with yourself
    if (validated.sharedWithUserId === user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot share calendar with yourself' 
      });
    }

    const share = await calendarSharingService.createShare({
      ownerUserId: user.id,
      firmId,
      sharedWithUserId: validated.sharedWithUserId,
      canView: validated.canView ?? true,
      canEdit: validated.canEdit ?? false,
    });

    res.json({
      success: true,
      data: share,
      message: 'Calendar shared successfully'
    });

  } catch (error: any) {
    console.error('Error creating calendar share:', error);
    
    if (error.message?.includes('already shared')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to share calendar' 
    });
  }
});

/**
 * PATCH /api/schedule/calendar-shares/:shareId - Update calendar share permissions
 */
router.patch('/calendar-shares/:shareId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const shareId = parseInt(req.params.shareId);
    if (isNaN(shareId)) {
      return res.status(400).json({ success: false, message: 'Invalid share ID' });
    }

    // Validate request body
    const validated = updateCalendarShareSchema.parse(req.body);

    const updated = await calendarSharingService.updateShare(shareId, user.id, validated);

    res.json({
      success: true,
      data: updated,
      message: 'Calendar share updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating calendar share:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to update calendar share' 
    });
  }
});

/**
 * DELETE /api/schedule/calendar-shares/:shareId - Revoke calendar share
 */
router.delete('/calendar-shares/:shareId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const shareId = parseInt(req.params.shareId);
    if (isNaN(shareId)) {
      return res.status(400).json({ success: false, message: 'Invalid share ID' });
    }

    await calendarSharingService.revokeShare(shareId, user.id);

    res.json({
      success: true,
      message: 'Calendar share revoked successfully'
    });

  } catch (error: any) {
    console.error('Error revoking calendar share:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to revoke calendar share' 
    });
  }
});

// ============================================================================
// MEETING ROOMS
// ============================================================================

/**
 * GET /api/schedule/meeting-rooms - List all meeting rooms
 */
router.get('/meeting-rooms', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const rooms = await storage.listMeetingRooms(firmId);

    res.json({
      success: true,
      data: rooms
    });

  } catch (error: any) {
    console.error('Error listing meeting rooms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to list meeting rooms' 
    });
  }
});

/**
 * GET /api/schedule/meeting-rooms/:roomId - Get specific meeting room
 */
router.get('/meeting-rooms/:roomId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    const room = await storage.getMeetingRoom(roomId);
    
    if (!room || room.firmId !== user.firmId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meeting room not found' 
      });
    }

    res.json({
      success: true,
      data: room
    });

  } catch (error: any) {
    console.error('Error getting meeting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get meeting room' 
    });
  }
});

/**
 * POST /api/schedule/meeting-rooms - Create meeting room (admin only)
 */
router.post('/meeting-rooms', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Only admins can create meeting rooms
    if (!['super_admin', 'firm_admin', 'manager', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission required to create meeting rooms' 
      });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    const room = await storage.createMeetingRoom({
      ...req.body,
      firmId
    });

    res.json({
      success: true,
      data: room,
      message: 'Meeting room created successfully'
    });

  } catch (error: any) {
    console.error('Error creating meeting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create meeting room' 
    });
  }
});

/**
 * PUT /api/schedule/meeting-rooms/:roomId - Update meeting room
 */
router.put('/meeting-rooms/:roomId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Only admins can update meeting rooms
    if (!['super_admin', 'firm_admin', 'manager', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission required to update meeting rooms' 
      });
    }

    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    const existingRoom = await storage.getMeetingRoom(roomId);
    if (!existingRoom || existingRoom.firmId !== user.firmId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meeting room not found' 
      });
    }

    const updated = await storage.updateMeetingRoom(roomId, req.body);

    res.json({
      success: true,
      data: updated,
      message: 'Meeting room updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating meeting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update meeting room' 
    });
  }
});

/**
 * DELETE /api/schedule/meeting-rooms/:roomId - Delete meeting room
 */
router.delete('/meeting-rooms/:roomId', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Only admins can delete meeting rooms
    if (!['super_admin', 'firm_admin', 'manager', 'admin'].includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission required to delete meeting rooms' 
      });
    }

    const roomId = parseInt(req.params.roomId);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    const existingRoom = await storage.getMeetingRoom(roomId);
    if (!existingRoom || existingRoom.firmId !== user.firmId) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meeting room not found' 
      });
    }

    await storage.deleteMeetingRoom(roomId);

    res.json({
      success: true,
      message: 'Meeting room deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting meeting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete meeting room' 
    });
  }
});

/**
 * GET /api/schedule/meeting-rooms/availability - Check room availability
 * Query params: startAt, endAt, roomId (optional)
 */
router.get('/meeting-rooms-availability', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { startAt, endAt, roomId } = req.query;
    
    if (!startAt || !endAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'startAt and endAt are required' 
      });
    }

    const start = new Date(startAt as string);
    const end = new Date(endAt as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format' 
      });
    }

    const firmId = user.firmId;
    if (!firmId) {
      return res.status(400).json({ success: false, message: 'Firm ID required' });
    }

    // Get all rooms or specific room
    let rooms;
    if (roomId) {
      const room = await storage.getMeetingRoom(parseInt(roomId as string));
      if (!room || room.firmId !== firmId) {
        return res.status(404).json({ 
          success: false, 
          message: 'Meeting room not found' 
        });
      }
      rooms = [room];
    } else {
      rooms = await storage.listMeetingRooms(firmId);
    }

    // Get all events in this time range that have a meeting room
    const events = await storage.listEvents({
      firmId,
      from: start,
      to: end
    });

    // Check availability for each room
    const availability = rooms.map(room => {
      const conflicts = events.filter((event: any) => 
        event.location && event.location.includes(room.name)
      );

      return {
        roomId: room.id,
        roomName: room.name,
        isAvailable: conflicts.length === 0,
        conflicts: conflicts.map((event: any) => ({
          eventId: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt
        }))
      };
    });

    res.json({
      success: true,
      data: availability
    });

  } catch (error: any) {
    console.error('Error checking room availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check room availability' 
    });
  }
});

export default router;