# Backend Route → Storage Mapping

**Date**: January 2026  
**Purpose**: Document which storage implementation each Pages route uses

---

## Task Routes

### Route: `POST /api/tasks`
- **File**: `server/routes.ts` (line 2441)
- **Storage**: `minimal-storage.ts` → `storage.createTask()`
- **Status**: ✅ WORKING (minimal-storage has implementation)
- **Note**: Uses `storage` imported from `./minimal-storage`

### Route: `GET /api/tasks`
- **File**: `server/routes.ts` (line 2423)
- **Storage**: `minimal-storage.ts` → `storage.getTasks(user.id, limit)`
- **Status**: ✅ WORKING (minimal-storage has implementation)

### Route: `PATCH /api/tasks/:id`
- **File**: `server/routes.ts` (line 2456)
- **Storage**: `minimal-storage.ts` → `storage.updateTask(id, updates)`
- **Status**: ✅ WORKING (minimal-storage has implementation)

### Route: `PATCH /api/tasks/:taskId` (alternative)
- **File**: `server/routes/task-routes.ts` (line 35)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)
- **Note**: Uses `tasks` table from `crm-entities.ts`

### Route: `DELETE /api/tasks/:taskId`
- **File**: `server/routes/task-routes.ts` (line 111)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)

### Route: `GET /api/tasks/:taskId`
- **File**: `server/routes/task-routes.ts` (line 165)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)

### Route: `POST /api/tasks` (enhanced)
- **File**: `server/routes/enhanced-task-routes.ts` (line 320+)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)
- **Note**: Uses `tasks` table from `@shared/schema`

---

## Time Tracking Routes

### Route: `GET /api/time-tracking/entries`
- **File**: `server/routes/time-tracking-api-routes.ts` (line 149)
- **Storage**: `timeTrackingService.getTimeEntries()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)
- **Service**: `server/services/time-tracking.service.ts`

### Route: `POST /api/time-tracking/entries`
- **File**: `server/routes/time-tracking-api-routes.ts` (line 110)
- **Storage**: `timeTrackingService.createTimeEntry()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: `PUT /api/time-tracking/entries/:id`
- **File**: `server/routes/time-tracking-api-routes.ts` (line 175)
- **Storage**: `timeTrackingService.updateTimeEntry()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: `POST /api/time-tracking/timer/start`
- **File**: `server/routes/time-tracking-api-routes.ts` (line 43)
- **Storage**: `timeTrackingService.startTimer()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: `POST /api/time-tracking/timer/stop`
- **File**: `server/routes/time-tracking-api-routes.ts` (line 68)
- **Storage**: `timeTrackingService.stopTimer()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: Enhanced Time Tracking Routes
- **File**: `server/routes/enhanced-time-tracking-routes.ts`
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)
- **Note**: Uses `timeEntries`, `timeSessions` from `@shared/schema`

---

## Notification Routes

### Route: `GET /api/notifications`
- **File**: `server/routes/notification-routes.ts` (line 39)
- **Storage**: `NotificationService.getUserNotifications()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: `GET /api/notifications/count`
- **File**: `server/routes/notification-routes.ts` (line 68)
- **Storage**: `NotificationService.getUnreadCount()` → Direct `db` queries
- **Status**: ✅ WORKING (service uses Drizzle ORM)

### Route: `GET /api/notifications/unread-count`
- **File**: `server/routes/notification-routes.ts` (line 82)
- **Storage**: `NotificationService.getUnreadCount()` → Direct `db` queries
- **Status**: ✅ WORKING (alias route added in Phase 1)

---

## Pages Billing Routes

### Route: `POST /api/pages/billing/invoices/from-time`
- **File**: `server/routes/pages-billing-routes.ts` (line 40)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)
- **Note**: Uses `billingInvoices`, `invoiceLineItems`, `timeEntries` tables

### Route: `GET /api/pages/billing/invoices`
- **File**: `server/routes/pages-billing-routes.ts` (line 152)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)

### Route: `GET /api/pages/billing/invoices/:id`
- **File**: `server/routes/pages-billing-routes.ts` (line 193)
- **Storage**: Direct `db` queries (Drizzle ORM)
- **Status**: ✅ WORKING (direct database access)

---

## Summary

| Storage Type | Routes Using It | Status |
|--------------|----------------|--------|
| `minimal-storage.ts` | POST/GET/PATCH /api/tasks (routes.ts) | ✅ Working |
| Direct `db` (Drizzle) | task-routes.ts, enhanced-task-routes.ts, time-tracking routes, notification routes, pages-billing routes | ✅ Working |
| `timeTrackingService` | time-tracking-api-routes.ts | ✅ Working (uses db) |
| `NotificationService` | notification-routes.ts | ✅ Working (uses db) |
| `database-storage.ts` | **NONE** (stubs exist but not used by Pages routes) | ⚠️ Stubs exist |

---

## Critical Finding

**`database-storage.ts` stubs are NOT used by any Pages routes.**

- `routes.ts` uses `minimal-storage.ts` (which has implementations)
- All other Pages routes use direct `db` queries or services that use `db`

**However**, `routes.ts` POST/GET/PATCH `/api/tasks` routes call:
- `storage.createTask()` → Uses `minimal-storage.ts` ✅
- `storage.getTasks()` → Uses `minimal-storage.ts` ✅
- `storage.updateTask()` → Uses `minimal-storage.ts` ✅

**Conclusion**: Task CRUD in `routes.ts` works via `minimal-storage.ts`, not `database-storage.ts` stubs.
