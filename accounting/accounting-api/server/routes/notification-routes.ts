/**
 * Notification API Routes
 * 
 * RESTful API for managing notifications and user preferences
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  notifications, 
  notificationPreferences,
  activityFeed,
  users,
  insertNotificationPreferencesSchema
} from "@shared/schema";
import { requireAuth, requireAuthHybrid } from "../auth";
import { eq, and, desc, sql, inArray, gte, lte } from "drizzle-orm";
import { NotificationService, NotificationHelpers } from "../notification.service";

// Type helper for authenticated requests
interface AuthenticatedRequest extends Express.Request {
  user: {
    id: number;
    username: string;
    firmId: number;
    role: string;
    name: string;
  };
}

const router = Router();

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

// Get user notifications
router.get("/", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { limit = "50", offset = "0", unread_only = "false", type } = req.query;

    const options = {
      limit: Math.min(parseInt(limit as string), 100), // Cap at 100
      offset: parseInt(offset as string),
      unreadOnly: unread_only === "true",
      type: type ? (Array.isArray(type) ? type as string[] : [type as string]) : undefined
    };

    const result = await NotificationService.getUserNotifications(
      authReq.user.id,
      authReq.user.firmId,
      options
    );

    res.json({
      notifications: result,
      hasMore: result.length === options.limit
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get unread notification count
router.get("/count", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const count = await NotificationService.getUnreadCount(
      authReq.user.id,
      authReq.user.firmId
    );

    res.json({ count });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({ error: "Failed to fetch notification count" });
  }
});

// Alias for backward compatibility with UI
router.get("/unread-count", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const count = await NotificationService.getUnreadCount(
      authReq.user.id,
      authReq.user.firmId
    );
    res.json({ count });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({ error: "Failed to fetch notification count" });
  }
});

// Mark notifications as read
router.post("/mark-read", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { notificationIds } = z.object({
      notificationIds: z.array(z.number()).min(1, "At least one notification ID required")
    }).parse(req.body);

    await NotificationService.markAsRead(notificationIds, authReq.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

// Mark all notifications as read
router.post("/mark-all-read", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    // Get all unread notification IDs for the user
    const unreadNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, authReq.user.id),
        eq(notifications.firmId, authReq.user.firmId),
        eq(notifications.readAt, null as any)
      ));

    if (unreadNotifications.length > 0) {
      const notificationIds = unreadNotifications.map(n => n.id);
      await NotificationService.markAsRead(notificationIds, authReq.user.id);
    }

    res.json({ success: true, markedCount: unreadNotifications.length });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

// Dismiss notification
router.post("/:id/dismiss", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const notificationId = parseInt(req.params.id);

    await db
      .update(notifications)
      .set({ 
        dismissedAt: new Date(),
        status: "dismissed"
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, authReq.user.id)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error("Error dismissing notification:", error);
    res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

// Send test notification (for development/testing)
router.post("/test", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only allow admins to send test notifications
    if (!["firm_admin", "super_admin", "saas_owner"].includes(authReq.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { type = "system_alert", title = "Test Notification", message = "This is a test notification" } = req.body;

    await NotificationService.sendNotification({
      firmId: authReq.user.firmId,
      userId: authReq.user.id,
      type: type as any,
      title,
      message,
      channels: ["in_app", "email"],
      senderName: "System Test"
    });

    res.json({ success: true, message: "Test notification sent" });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

// Get user notification preferences
router.get("/preferences", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const preferences = await NotificationService.getUserNotificationPreferences(authReq.user.id);

    res.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

// Update notification preferences
router.put("/preferences", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    const preferencesData = insertNotificationPreferencesSchema.parse({
      ...req.body,
      userId: authReq.user.id,
      firmId: authReq.user.firmId
    });

    // Check if preferences exist
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, authReq.user.id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing preferences
      await db
        .update(notificationPreferences)
        .set({
          ...preferencesData,
          updatedAt: new Date()
        })
        .where(eq(notificationPreferences.userId, authReq.user.id));
    } else {
      // Create new preferences
      await db.insert(notificationPreferences).values(preferencesData);
    }

    res.json({ success: true, message: "Notification preferences updated" });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

// ============================================================================
// ACTIVITY FEED
// ============================================================================

// Get activity feed for user's firm
router.get("/activity", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { limit = "20", offset = "0", client_id, project_id, public_only = "false" } = req.query;

    let conditions = [eq(activityFeed.firmId, authReq.user.firmId)];

    // Filter by client if specified
    if (client_id) {
      conditions.push(eq(activityFeed.clientId, parseInt(client_id as string)));
    }

    // Filter by project if specified  
    if (project_id) {
      conditions.push(eq(activityFeed.projectId, parseInt(project_id as string)));
    }

    // Filter public activities only (for client portal)
    if (public_only === "true") {
      conditions.push(eq(activityFeed.isPublic, true));
    }

    const activities = await db
      .select({
        id: activityFeed.id,
        userId: activityFeed.userId,
        type: activityFeed.type,
        title: activityFeed.title,
        description: activityFeed.description,
        clientId: activityFeed.clientId,
        projectId: activityFeed.projectId,
        relatedEntityType: activityFeed.relatedEntityType,
        relatedEntityId: activityFeed.relatedEntityId,
        metadata: activityFeed.metadata,
        createdAt: activityFeed.createdAt,
        // Include user name
        userName: users.name
      })
      .from(activityFeed)
      .leftJoin(users, eq(users.id, activityFeed.userId))
      .where(and(...conditions))
      .orderBy(desc(activityFeed.createdAt))
      .limit(Math.min(parseInt(limit as string), 50))
      .offset(parseInt(offset as string));

    res.json({
      activities,
      hasMore: activities.length === Math.min(parseInt(limit as string), 50)
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    res.status(500).json({ error: "Failed to fetch activity feed" });
  }
});

// ============================================================================
// NOTIFICATION HELPERS FOR OTHER SERVICES
// ============================================================================

// Send notification for task assignment (internal API)
router.post("/task-assigned", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { assigneeId, taskId, taskTitle, dueDate } = z.object({
      assigneeId: z.number(),
      taskId: z.number(),
      taskTitle: z.string(),
      dueDate: z.string().optional()
    }).parse(req.body);

    await NotificationHelpers.notifyTaskAssigned(
      authReq.user.firmId,
      assigneeId,
      taskId,
      taskTitle,
      authReq.user.name,
      dueDate ? new Date(dueDate) : undefined
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending task assignment notification:", error);
    res.status(500).json({ error: "Failed to send task assignment notification" });
  }
});

// Send notification for client message (internal API)
router.post("/client-message", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { clientId, subject, senderName, staffUserIds } = z.object({
      clientId: z.number(),
      subject: z.string(),
      senderName: z.string(),
      staffUserIds: z.array(z.number()).optional()
    }).parse(req.body);

    // If staffUserIds not provided, notify all firm staff
    let targetUserIds = staffUserIds;
    if (!targetUserIds) {
      const firmStaff = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.firmId, authReq.user.firmId),
          inArray(users.role, ["firm_admin", "firm_user"])
        ));
      targetUserIds = firmStaff.map(u => u.id);
    }

    await NotificationHelpers.notifyClientMessage(
      authReq.user.firmId,
      targetUserIds,
      clientId,
      subject,
      senderName
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending client message notification:", error);
    res.status(500).json({ error: "Failed to send client message notification" });
  }
});

// Send notification for document sharing (internal API)
router.post("/document-shared", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { recipientId, documentId, documentName } = z.object({
      recipientId: z.number(),
      documentId: z.number(),
      documentName: z.string()
    }).parse(req.body);

    await NotificationHelpers.notifyDocumentShared(
      authReq.user.firmId,
      recipientId,
      documentId,
      documentName,
      authReq.user.name
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending document sharing notification:", error);
    res.status(500).json({ error: "Failed to send document sharing notification" });
  }
});

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

// Get notification statistics (admin only)
router.get("/admin/stats", requireAuthHybrid, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only allow firm admins and above
    if (!["firm_admin", "super_admin", "saas_owner"].includes(authReq.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { days = "30" } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get notification stats for the firm
    const stats = await db
      .select({
        type: notifications.type,
        channel: notifications.channel,
        status: notifications.status,
        count: sql<number>`count(*)`
      })
      .from(notifications)
      .where(and(
        eq(notifications.firmId, authReq.user.firmId),
        gte(notifications.createdAt, startDate)
      ))
      .groupBy(notifications.type, notifications.channel, notifications.status);

    // Get total counts
    const totalSent = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.firmId, authReq.user.firmId),
        gte(notifications.createdAt, startDate)
      ));

    const totalUnread = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.firmId, authReq.user.firmId),
        eq(notifications.readAt, null as any)
      ));

    res.json({
      stats,
      summary: {
        totalSent: totalSent[0]?.count || 0,
        totalUnread: totalUnread[0]?.count || 0,
        period: `${daysInt} days`
      }
    });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    res.status(500).json({ error: "Failed to fetch notification stats" });
  }
});

export default router;