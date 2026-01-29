/**
 * Team Management Routes
 * 
 * Comprehensive team management API endpoints including time tracking,
 * performance analytics, staff management, workload planning, and HR functions
 */

import express from "express";
import { z } from "zod";
import { secureStorage } from "../secure-storage";
import { requireAuth } from "../security-middleware";
import { 
  insertTimeEntrySchema,
  insertTeamPerformanceSchema,
  insertStaffProfileSchema,
  insertWorkloadAllocationSchema,
  insertLeaveRequestSchema,
  insertTeamMeetingSchema,
  insertKnowledgeBaseSchema
} from "@shared/schema";

const router = express.Router();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createSecurityContext(user: any) {
  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      firmId: user.firmId,
      clientId: user.clientId,
      isManager: user.isManager,
      isAccountOwner: user.isAccountOwner
    }
  };
}

// ============================================================================
// TIME TRACKING ENDPOINTS
// ============================================================================

// Get all time entries for a firm
router.get("/time-entries", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { userId, startDate, endDate } = req.query;

    const timeEntries = await secureStorage.getTimeEntries(
      context,
      userId ? parseInt(userId as string) : undefined
    );

    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;
    const filteredEntries = start || end
      ? timeEntries.filter((entry: any) => {
          const entryDate = entry.startTime
            ? new Date(entry.startTime)
            : entry.createdAt
              ? new Date(entry.createdAt)
              : null;
          if (!entryDate) return false;
          if (start && entryDate < start) return false;
          if (end && entryDate > end) return false;
          return true;
        })
      : timeEntries;

    res.json(filteredEntries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
});

// Create new time entry
router.post("/time-entries", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { firmId, id: userId } = req.user;
    const validatedData = insertTimeEntrySchema.parse({ ...req.body, firmId, userId });

    const timeEntry = await secureStorage.createTimeEntry(validatedData, context);
    res.status(201).json(timeEntry);
  } catch (error) {
    console.error("Error creating time entry:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create time entry" });
  }
});

// Update time entry
router.put("/time-entries/:id", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { id } = req.params;
    
    const updates = req.body;
    const timeEntry = await secureStorage.updateTimeEntry(parseInt(id), updates, context);
    
    res.json(timeEntry);
  } catch (error) {
    console.error("Error updating time entry:", error);
    res.status(500).json({ error: "Failed to update time entry" });
  }
});

// Delete time entry
router.delete("/time-entries/:id", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { id } = req.params;
    
    await secureStorage.deleteTimeEntry(parseInt(id), context);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting time entry:", error);
    res.status(500).json({ error: "Failed to delete time entry" });
  }
});

// Start timer session
router.post("/time-sessions/start", requireAuth, async (req, res) => {
  try {
    const { firmId, id: userId } = req.user;
    const { projectId, taskId, description } = req.body;

    // End any active sessions first
    await secureStorage.endActiveTimeSessions(userId);

    const session = await secureStorage.startTimeSession({
      userId,
      projectId,
      taskId,
      description,
      startTime: new Date()
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("Error starting time session:", error);
    res.status(500).json({ error: "Failed to start time session" });
  }
});

// End timer session
router.post("/time-sessions/:id/end", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    const session = await secureStorage.endTimeSession(parseInt(id), userId);
    res.json(session);
  } catch (error) {
    console.error("Error ending time session:", error);
    res.status(500).json({ error: "Failed to end time session" });
  }
});

// Get active time sessions
router.get("/time-sessions/active", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const activeSessions = await secureStorage.getActiveTimeSessions(context);
    res.json(activeSessions);
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

// ============================================================================
// PERFORMANCE ANALYTICS ENDPOINTS
// ============================================================================

// Get team performance metrics
router.get("/performance", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { userId, period, metricType, startDate, endDate } = req.query;

    const performance = await secureStorage.getTeamPerformance(context, {
      userId: userId ? parseInt(userId as string) : undefined,
      period: period as string,
      metricType: metricType as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(performance);
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// Create performance metric
router.post("/performance", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const validatedData = insertTeamPerformanceSchema.parse({ ...req.body, firmId });

    const performance = await secureStorage.createTeamPerformance(validatedData);
    res.status(201).json(performance);
  } catch (error) {
    console.error("Error creating performance metric:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create performance metric" });
  }
});

// Get team utilization analytics
router.get("/analytics/utilization", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { startDate, endDate, userId } = req.query;

    const utilization = await secureStorage.getUtilizationAnalytics(firmId, {
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId ? parseInt(userId as string) : undefined
    });

    res.json(utilization);
  } catch (error) {
    console.error("Error fetching utilization analytics:", error);
    res.status(500).json({ error: "Failed to fetch utilization analytics" });
  }
});

// Get productivity analytics
router.get("/analytics/productivity", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { startDate, endDate, userId } = req.query;

    const productivity = await secureStorage.getProductivityAnalytics(firmId, {
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId ? parseInt(userId as string) : undefined
    });

    res.json(productivity);
  } catch (error) {
    console.error("Error fetching productivity analytics:", error);
    res.status(500).json({ error: "Failed to fetch productivity analytics" });
  }
});

// ============================================================================
// STAFF MANAGEMENT ENDPOINTS
// ============================================================================

// Get all staff profiles
router.get("/staff", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const staffProfiles = await secureStorage.getStaffProfiles(context);
    res.json(staffProfiles);
  } catch (error) {
    console.error("Error fetching staff profiles:", error);
    res.status(500).json({ error: "Failed to fetch staff profiles" });
  }
});

// Get staff profile by user ID
router.get("/staff/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firmId } = req.user;
    
    const profile = await secureStorage.getStaffProfile(parseInt(userId), firmId);
    res.json(profile);
  } catch (error) {
    console.error("Error fetching staff profile:", error);
    res.status(500).json({ error: "Failed to fetch staff profile" });
  }
});

// Create or update staff profile
router.put("/staff/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firmId } = req.user;
    
    const validatedData = insertStaffProfileSchema.parse({ 
      ...req.body, 
      userId: parseInt(userId), 
      firmId 
    });

    const profile = await secureStorage.upsertStaffProfile(validatedData);
    res.json(profile);
  } catch (error) {
    console.error("Error updating staff profile:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update staff profile" });
  }
});

// Get team skills matrix
router.get("/skills-matrix", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const skillsMatrix = await secureStorage.getSkillsMatrix(firmId);
    res.json(skillsMatrix);
  } catch (error) {
    console.error("Error fetching skills matrix:", error);
    res.status(500).json({ error: "Failed to fetch skills matrix" });
  }
});

// ============================================================================
// WORKLOAD MANAGEMENT ENDPOINTS
// ============================================================================

// Get workload allocations
router.get("/workload", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { userId, projectId, startDate, endDate } = req.query;

    const allocations = await secureStorage.getWorkloadAllocations(context, {
      userId: userId ? parseInt(userId as string) : undefined,
      projectId: projectId ? parseInt(projectId as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(allocations);
  } catch (error) {
    console.error("Error fetching workload allocations:", error);
    res.status(500).json({ error: "Failed to fetch workload allocations" });
  }
});

// Create workload allocation
router.post("/workload", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const validatedData = insertWorkloadAllocationSchema.parse({ ...req.body, firmId });

    const allocation = await secureStorage.createWorkloadAllocation(validatedData);
    res.status(201).json(allocation);
  } catch (error) {
    console.error("Error creating workload allocation:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create workload allocation" });
  }
});

// Update workload allocation
router.put("/workload/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { firmId } = req.user;
    
    const updates = req.body;
    const allocation = await secureStorage.updateWorkloadAllocation(parseInt(id), updates, firmId);
    
    res.json(allocation);
  } catch (error) {
    console.error("Error updating workload allocation:", error);
    res.status(500).json({ error: "Failed to update workload allocation" });
  }
});

// Get capacity planning
router.get("/capacity", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { startDate, endDate } = req.query;

    const capacity = await secureStorage.getCapacityPlanning(firmId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(capacity);
  } catch (error) {
    console.error("Error fetching capacity planning:", error);
    res.status(500).json({ error: "Failed to fetch capacity planning" });
  }
});

// ============================================================================
// LEAVE & HR MANAGEMENT ENDPOINTS
// ============================================================================

// Get leave requests
router.get("/leave-requests", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { userId, status, startDate, endDate } = req.query;

    const leaveRequests = await secureStorage.getLeaveRequests(context, {
      userId: userId ? parseInt(userId as string) : undefined,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(leaveRequests);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

// Create leave request
router.post("/leave-requests", requireAuth, async (req, res) => {
  try {
    const { firmId, id: userId } = req.user;
    const validatedData = insertLeaveRequestSchema.parse({ ...req.body, firmId, userId });

    const leaveRequest = await secureStorage.createLeaveRequest(validatedData);
    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error("Error creating leave request:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create leave request" });
  }
});

// Approve/reject leave request
router.put("/leave-requests/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const { id: approverId, firmId } = req.user;

    const leaveRequest = await secureStorage.updateLeaveRequestStatus(
      parseInt(id),
      status,
      approverId,
      rejectionReason,
      firmId
    );

    res.json(leaveRequest);
  } catch (error) {
    console.error("Error updating leave request status:", error);
    res.status(500).json({ error: "Failed to update leave request status" });
  }
});

// Get attendance records
router.get("/attendance", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { userId, startDate, endDate } = req.query;

    const attendance = await secureStorage.getAttendanceRecords(firmId, {
      userId: userId ? parseInt(userId as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// ============================================================================
// TEAM COLLABORATION ENDPOINTS
// ============================================================================

// Get team meetings
router.get("/meetings", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    const { startDate, endDate, type, status } = req.query;

    const meetings = await secureStorage.getTeamMeetings(context, {
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string,
      status: status as string
    });

    res.json(meetings);
  } catch (error) {
    console.error("Error fetching team meetings:", error);
    res.status(500).json({ error: "Failed to fetch team meetings" });
  }
});

// Create team meeting
router.post("/meetings", requireAuth, async (req, res) => {
  try {
    const { firmId, id: organizerId } = req.user;
    const validatedData = insertTeamMeetingSchema.parse({ ...req.body, firmId, organizerId });

    const meeting = await secureStorage.createTeamMeeting(validatedData);
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating team meeting:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create team meeting" });
  }
});

// Get knowledge base articles
router.get("/knowledge-base", requireAuth, async (req, res) => {
  try {
    const { firmId } = req.user;
    const { category, type, search } = req.query;

    const articles = await secureStorage.getKnowledgeBaseArticles(firmId, {
      category: category as string,
      type: type as string,
      search: search as string
    });

    res.json(articles);
  } catch (error) {
    console.error("Error fetching knowledge base articles:", error);
    res.status(500).json({ error: "Failed to fetch knowledge base articles" });
  }
});

// Create knowledge base article
router.post("/knowledge-base", requireAuth, async (req, res) => {
  try {
    const { firmId, id: authorId } = req.user;
    const validatedData = insertKnowledgeBaseSchema.parse({ ...req.body, firmId, authorId });

    const article = await secureStorage.createKnowledgeBaseArticle(validatedData);
    res.status(201).json(article);
  } catch (error) {
    console.error("Error creating knowledge base article:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create knowledge base article" });
  }
});

// ============================================================================
// DASHBOARD & ANALYTICS ENDPOINTS
// ============================================================================

// Get team dashboard overview
router.get("/dashboard/overview", requireAuth, async (req, res) => {
  try {
    const context = createSecurityContext(req.user);
    
    const overview = await secureStorage.getTeamDashboardOverview(context);
    res.json(overview);
  } catch (error) {
    console.error("Error fetching team dashboard overview:", error);
    res.status(500).json({ error: "Failed to fetch team dashboard overview" });
  }
});

// Get team reports
router.get("/reports/:reportType", requireAuth, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { firmId } = req.user;
    const { startDate, endDate, userId, format } = req.query;

    const report = await secureStorage.generateTeamReport(reportType, firmId, {
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId ? parseInt(userId as string) : undefined,
      format: format as string
    });

    if (format === 'csv' || format === 'xlsx') {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.${format}"`);
      return res.send(report);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating team report:", error);
    res.status(500).json({ error: "Failed to generate team report" });
  }
});

export default router;