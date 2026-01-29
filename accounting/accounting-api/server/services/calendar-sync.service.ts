/**
 * Calendar Sync Service
 * 
 * Handles bidirectional synchronization between:
 * - Tasks ↔ Calendar Events
 * - Project Milestones ↔ Calendar Events
 * - Recurring Tasks → Multiple Calendar Events
 */

import { db } from "../db";
import { tasks, projectMilestones } from "../../shared/database/crm-entities";
import { calendarEvents } from "../../shared/database/scheduling-entities";
import { projects } from "../../shared/database/crm-entities";
import { eq, and } from "drizzle-orm";

export class CalendarSyncService {
  /**
   * Sync Task to Calendar Event
   * Creates or updates a calendar event based on task data
   */
  static async syncTaskToCalendar(
    taskId: number,
    userId: number,
    firmId: number
  ): Promise<number | null> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task || !task.dueDate) {
      return null; // No task or no due date - nothing to sync
    }

    // Determine event timing
    const startTime = task.scheduledStartTime || new Date(`${task.dueDate}T09:00:00`);
    const endTime = task.scheduledEndTime || new Date(`${task.dueDate}T17:00:00`);

    // Check if calendar event already exists
    if (task.calendarEventId) {
      // Update existing event
      await db
        .update(calendarEvents)
        .set({
          title: task.title,
          description: task.description || undefined,
          startAt: startTime,
          endAt: endTime,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, task.calendarEventId));

      return task.calendarEventId;
    } else {
      // Create new calendar event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          firmId,
          clientId: task.clientId,
          title: task.title,
          description: task.description || undefined,
          startAt: startTime,
          endAt: endTime,
          organizerUserId: userId,
          staffUserIds: task.assignedTo ? [task.assignedTo] : [],
          visibility: "firm",
          source: "internal",
          status: "confirmed",
          notes: `Auto-synced from task #${taskId}`,
        })
        .returning({ id: calendarEvents.id });

      // Update task with calendar event ID
      await db
        .update(tasks)
        .set({ calendarEventId: newEvent.id })
        .where(eq(tasks.id, taskId));

      return newEvent.id;
    }
  }

  /**
   * Sync Project Milestone to Calendar Event
   * Creates or updates a calendar event based on milestone data
   */
  static async syncMilestoneToCalendar(
    milestoneId: number,
    userId: number,
    firmId: number
  ): Promise<number | null> {
    const milestone = await db.query.projectMilestones.findFirst({
      where: eq(projectMilestones.id, milestoneId),
    });

    if (!milestone || !milestone.dueDate) {
      return null; // No milestone or no due date - nothing to sync
    }

    // Get project info for context
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, milestone.projectId),
    });

    // Milestone events are typically all-day or specific time
    const startTime = new Date(`${milestone.dueDate}T09:00:00`);
    const endTime = new Date(`${milestone.dueDate}T10:00:00`);

    // Check if calendar event already exists
    if (milestone.calendarEventId) {
      // Update existing event
      await db
        .update(calendarEvents)
        .set({
          title: `Milestone: ${milestone.name}`,
          description: milestone.description || undefined,
          startAt: startTime,
          endAt: endTime,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, milestone.calendarEventId));

      return milestone.calendarEventId;
    } else {
      // Create new calendar event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          firmId,
          clientId: project?.clientId,
          title: `Milestone: ${milestone.name}`,
          description: milestone.description || undefined,
          startAt: startTime,
          endAt: endTime,
          organizerUserId: userId,
          visibility: "firm",
          source: "internal",
          status: "confirmed",
          notes: `Auto-synced from project milestone #${milestoneId}`,
        })
        .returning({ id: calendarEvents.id });

      // Update milestone with calendar event ID
      await db
        .update(projectMilestones)
        .set({ calendarEventId: newEvent.id })
        .where(eq(projectMilestones.id, milestoneId));

      return newEvent.id;
    }
  }

  /**
   * Sync Calendar Event back to Task
   * Updates task when calendar event is modified
   */
  static async syncCalendarToTask(eventId: number): Promise<boolean> {
    // Find task linked to this calendar event
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.calendarEventId, eventId),
    });

    if (!task) {
      return false; // No linked task
    }

    // Get updated event data
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId),
    });

    if (!event) {
      return false;
    }

    // Update task with new timing
    const dueDate = event.startAt.toISOString().split('T')[0];
    
    await db
      .update(tasks)
      .set({
        dueDate,
        scheduledStartTime: event.startAt,
        scheduledEndTime: event.endAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    return true;
  }

  /**
   * Sync Calendar Event back to Milestone
   * Updates milestone when calendar event is modified
   */
  static async syncCalendarToMilestone(eventId: number): Promise<boolean> {
    // Find milestone linked to this calendar event
    const milestone = await db.query.projectMilestones.findFirst({
      where: eq(projectMilestones.calendarEventId, eventId),
    });

    if (!milestone) {
      return false; // No linked milestone
    }

    // Get updated event data
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId),
    });

    if (!event) {
      return false;
    }

    // Update milestone with new due date
    const dueDate = event.startAt.toISOString().split('T')[0];
    
    await db
      .update(projectMilestones)
      .set({
        dueDate,
        updatedAt: new Date(),
      })
      .where(eq(projectMilestones.id, milestone.id));

    return true;
  }

  /**
   * Create Recurring Calendar Events from Recurring Task
   * Expands recurring task pattern into multiple calendar events
   */
  static async createRecurringEvents(
    taskId: number,
    userId: number,
    firmId: number
  ): Promise<number[]> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task || !task.isRecurring || !task.recurrencePattern || !task.dueDate) {
      return [];
    }

    const pattern = task.recurrencePattern;
    const eventIds: number[] = [];
    const baseDate = new Date(task.dueDate);
    
    // Calculate number of occurrences
    const occurrences = pattern.totalOccurrences || 12; // Default 12 if not specified

    for (let i = 0; i < occurrences; i++) {
      // Create a fresh date object for each occurrence to avoid mutation issues
      const eventDate = new Date(baseDate);
      const interval = pattern.interval || 1; // Default to 1 if not specified

      // Calculate date based on frequency
      switch (pattern.frequency) {
        case 'daily':
          eventDate.setDate(baseDate.getDate() + (i * interval));
          break;
        case 'weekly':
          eventDate.setDate(baseDate.getDate() + (i * 7 * interval));
          break;
        case 'monthly':
          eventDate.setMonth(baseDate.getMonth() + (i * interval));
          break;
        case 'quarterly':
          eventDate.setMonth(baseDate.getMonth() + (i * 3 * interval));
          break;
        case 'semi-annually':
          eventDate.setMonth(baseDate.getMonth() + (i * 6 * interval));
          break;
        case 'annually':
          eventDate.setFullYear(baseDate.getFullYear() + (i * interval));
          break;
        default:
          // Default to daily if frequency is not recognized
          eventDate.setDate(baseDate.getDate() + (i * interval));
          break;
      }

      // Check if we've passed the end date
      if (pattern.endDate && eventDate > new Date(pattern.endDate)) {
        break;
      }

      // Create calendar event for this occurrence
      // Use the calculated eventDate for start/end times
      const startTime = task.scheduledStartTime 
        ? new Date(new Date(eventDate).setHours(
            new Date(task.scheduledStartTime).getHours(),
            new Date(task.scheduledStartTime).getMinutes(),
            0, 0
          ))
        : new Date(new Date(eventDate).setHours(9, 0, 0, 0));
      const endTime = task.scheduledEndTime 
        ? new Date(new Date(eventDate).setHours(
            new Date(task.scheduledEndTime).getHours(),
            new Date(task.scheduledEndTime).getMinutes(),
            0, 0
          ))
        : new Date(new Date(eventDate).setHours(17, 0, 0, 0));

      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          firmId,
          clientId: task.clientId,
          title: `${task.title} (${i + 1}/${occurrences})`,
          description: task.description || undefined,
          startAt: startTime,
          endAt: endTime,
          organizerUserId: userId,
          staffUserIds: task.assignedTo ? [task.assignedTo] : [],
          visibility: "firm",
          source: "internal",
          status: "confirmed",
          isRecurring: true,
          recurringPattern: {
            frequency: pattern.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: pattern.interval,
            endDate: pattern.endDate,
            occurrences: pattern.totalOccurrences,
          },
          notes: `Auto-synced from recurring task #${taskId} - occurrence ${i + 1} of ${occurrences}`,
        })
        .returning({ id: calendarEvents.id });

      eventIds.push(newEvent.id);
    }

    return eventIds;
  }

  /**
   * Delete Calendar Event when Task is deleted
   */
  static async deleteTaskCalendarEvent(taskId: number): Promise<boolean> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task || !task.calendarEventId) {
      return false;
    }

    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, task.calendarEventId));

    return true;
  }

  /**
   * Delete Calendar Event when Milestone is deleted
   */
  static async deleteMilestoneCalendarEvent(milestoneId: number): Promise<boolean> {
    const milestone = await db.query.projectMilestones.findFirst({
      where: eq(projectMilestones.id, milestoneId),
    });

    if (!milestone || !milestone.calendarEventId) {
      return false;
    }

    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, milestone.calendarEventId));

    return true;
  }
}
