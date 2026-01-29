# Backend Time Tracking Storage Path

**Date**: January 2026  
**Purpose**: Document the storage path for time tracking routes

---

## Route → Service → Storage Chain

### Route: `GET /api/time-tracking/entries`
1. **Route Handler**: `server/routes/time-tracking-api-routes.ts` (line 149)
2. **Service Call**: `timeTrackingService.getTimeEntries({ firmId, userId, ... })`
3. **Service File**: `server/services/time-tracking.service.ts`
4. **Storage**: Direct `db` queries using Drizzle ORM
5. **Table**: `timeEntries` from `@shared/schema`
6. **Status**: ✅ WORKING (no stubs involved)

### Route: `POST /api/time-tracking/entries`
1. **Route Handler**: `server/routes/time-tracking-api-routes.ts` (line 110)
2. **Service Call**: `timeTrackingService.createTimeEntry(entryData, userId)`
3. **Service File**: `server/services/time-tracking.service.ts`
4. **Storage**: Direct `db.insert(timeEntries).values(...).returning()`
5. **Status**: ✅ WORKING (no stubs involved)

### Route: `PUT /api/time-tracking/entries/:id`
1. **Route Handler**: `server/routes/time-tracking-api-routes.ts` (line 175)
2. **Service Call**: `timeTrackingService.updateTimeEntry(id, updates, userId, firmId)`
3. **Service File**: `server/services/time-tracking.service.ts`
4. **Storage**: Direct `db.update(timeEntries).set(...).where(...).returning()`
5. **Status**: ✅ WORKING (no stubs involved)

### Route: `POST /api/time-tracking/timer/start`
1. **Route Handler**: `server/routes/time-tracking-api-routes.ts` (line 43)
2. **Service Call**: `timeTrackingService.startTimer({ userId, firmId, ... })`
3. **Service File**: `server/services/time-tracking.service.ts`
4. **Storage**: Direct `db.insert(timeSessions).values(...).returning()`
5. **Status**: ✅ WORKING (no stubs involved)

### Route: `POST /api/time-tracking/timer/stop`
1. **Route Handler**: `server/routes/time-tracking-api-routes.ts` (line 68)
2. **Service Call**: `timeTrackingService.stopTimer({ userId, firmId, sessionId })`
3. **Service File**: `server/services/time-tracking.service.ts`
4. **Storage**: 
   - `db.update(timeSessions).set({ isActive: false })`
   - `db.insert(timeEntries).values(...).returning()`
5. **Status**: ✅ WORKING (no stubs involved)

---

## Enhanced Time Tracking Routes

### Route: `POST /api/time/entries` (enhanced)
1. **Route Handler**: `server/routes/enhanced-time-tracking-routes.ts`
2. **Storage**: Direct `db` queries (Drizzle ORM)
3. **Tables**: `timeEntries`, `timeSessions` from `@shared/schema`
4. **Status**: ✅ WORKING (no stubs involved)

---

## Service Implementation Details

### `timeTrackingService.getTimeEntries()`
- Uses `db.select().from(timeEntries).where(...)`
- Filters by `firmId`, `userId`, `clientId`, `projectId`, `status`, date range
- Returns array of time entries
- **No storage abstraction layer** - direct database access

### `timeTrackingService.createTimeEntry()`
- Uses `db.insert(timeEntries).values(...).returning()`
- Calculates billable amount from duration and rate
- **No storage abstraction layer** - direct database access

### `timeTrackingService.updateTimeEntry()`
- Uses `db.update(timeEntries).set(...).where(...).returning()`
- Validates ownership via `firmId`
- **No storage abstraction layer** - direct database access

---

## Storage Abstraction Status

| Component | Uses Storage Abstraction? | Storage File |
|-----------|---------------------------|--------------|
| `time-tracking-api-routes.ts` | ❌ No | Direct `db` via service |
| `enhanced-time-tracking-routes.ts` | ❌ No | Direct `db` queries |
| `time-tracking.service.ts` | ❌ No | Direct `db` queries |

---

## Conclusion

**Time tracking routes do NOT use any storage abstraction layer.**

- All routes use `timeTrackingService` or direct `db` queries
- `timeTrackingService` uses Drizzle ORM directly
- **No `database-storage.ts` stubs involved**
- **No `minimal-storage.ts` or `secure-storage.ts` used**

**Status**: ✅ All time tracking routes work via direct database access. No stub implementations needed.

---

## Mounting Status

- `timeTrackingApiRoutes` mounted at root (line 9857 in routes.ts)
  - Routes defined with `/api/time-tracking/*` prefix in router
- `timeTrackingRoutes` (enhanced) mounted at `/api/time` (line 9856 in routes.ts)

**Both routers are mounted and accessible.**
