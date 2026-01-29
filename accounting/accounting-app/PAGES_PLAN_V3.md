# Pages Module Production Plan - V3

**Version**: 3.0  
**Date**: January 2026  
**Status**: Ready for Execution  
**Focus**: Fix Broken Features + Security + Refactoring

---

## What Changed from V2

| Change | Reason |
|--------|--------|
| Added broken feature fixes | V2 only covered security, not actual broken functionality |
| Identified stub functions | `database-storage.ts` has many "Not implemented" throws |
| Found endpoint mismatch | Notifications UI calls wrong endpoint |
| Prioritized by dependencies | Fix foundations before building on top |

---

## CONFIRMED BROKEN FEATURES

### Backend Stubs That Throw Errors

These functions in `server/database-storage.ts` crash when called:

```typescript
// Lines 414-478 - All throw new Error("Not implemented")
createTask, getTask, updateTask
createCalendarEvent
createReport
createInvoice  // For Pages firm billing
createActivity
createClientDocument
createDocumentRequest
createStaffClientAssignment
createUserPermission
createInvitation
```

### Endpoint Mismatches

| UI Calls | Backend Has | Fix Needed |
|----------|-------------|------------|
| `/api/notifications/unread-count` | `/api/notifications/count` | Add alias or fix UI |

### Client Portal Stubs (Return Empty Data)

- `/api/client-portal/financial/transactions` → returns `[]`
- `/api/client-portal/financial/balances` → returns `[]`
- `/api/client-portal/financial/reports/:type` → returns `[]`

---

## SPRINT STRUCTURE

```
SPRINT A (2 weeks): Fix Broken Core Features
├── Phase 0: Discovery & Verification (2 days)
├── Phase 1: Quick Wins (1 day)
├── Phase 2: Time Tracking Verification (1 day)
├── Phase 3: Task CRUD Implementation (3 days)
├── Phase 4: Pages Invoicing (3 days)
└── Phase 5: Security Fixes (2 days)

SPRINT B (2-3 weeks): Calendar, Reports, Refactoring - DEFERRED
```

---

## SCOPE GUARDS (Unchanged)

**DO NOT MODIFY:**
- Books module (`FinancialDataModern.tsx`, invoice-routes.ts for bookkeeping)
- Binder module (`BinderModern.tsx`, binder-routes.ts)
- Auth core (`auth.ts`)
- Shared storage files (unless implementing stubs)

---

# SPRINT A: Fix Broken Core Features

---

## PHASE 0: Discovery (Days 1-2)

### STEP 0.1: Verify Which Storage Is Used

**PROBLEM**: There are multiple storage implementations:
- `database-storage.ts` - has stubs that throw errors
- `secure-storage.ts` - has real implementations
- `minimal-storage.ts` - another implementation

**INSTRUCTION**: Find which storage each route actually uses.

```bash
# Check task routes
grep -n "import.*storage" /path/to/accounting-api/server/routes/task-routes.ts

# Check which storage has working task methods
grep -n "createTask\|getTask" /path/to/accounting-api/server/secure-storage.ts
grep -n "createTask\|getTask" /path/to/accounting-api/server/minimal-storage.ts
```

**DELIVERABLE**: Map of route → storage implementation

---

### STEP 0.2: Verify Time Tracking Works

**INSTRUCTION**: Test time tracking endpoints manually.

```bash
# Get auth token first (login)
TOKEN=$(curl -s -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' | jq -r '.token')

# Test time entries endpoint
curl -s http://localhost:5000/api/time-tracking/entries \
  -H "Authorization: Bearer $TOKEN" | head -100
```

**EXPECTED**: Returns array of time entries (even if empty `[]`)

**IF FAILS**: Document exact error for Phase 2 fix

---

### STEP 0.3: Test Notifications Endpoint

```bash
# Test unread-count (what UI calls)
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"

# Test count (what backend has)
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:5000/api/notifications/count \
  -H "Authorization: Bearer $TOKEN"
```

**EXPECTED**: 
- `/unread-count` returns 404 (mismatch confirmed)
- `/count` returns 200

---

## PHASE 1: Quick Wins (Day 3)

### STEP 1.1: Fix Notification Endpoint Mismatch

**OPTION A (Backend fix - recommended)**: Add alias route

**FILE**: `server/routes/notification-routes.ts`

**ADD after line 68** (after the `/count` route):

```typescript
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
```

**TEST**:
```bash
curl -s http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"
```

**EXPECTED**: `{"count": 0}` (or some number)

---

### STEP 1.2: Fix task-routes.ts Security (From V2)

**FILE**: `server/routes/task-routes.ts`

Apply the security fix from PAGES_PLAN_V2.md Phase 1.1

---

## PHASE 2: Time Tracking Verification (Day 4)

### STEP 2.1: Trace Time Tracking Code Path

**INSTRUCTION**: If Phase 0.2 test failed, trace the actual code path.

```bash
# Find what time-tracking-api-routes.ts calls
grep -n "timeTrackingService\|db\.\|storage\." \
  /path/to/accounting-api/server/routes/time-tracking-api-routes.ts | head -20
```

### STEP 2.2: Test Time Entry Creation

```bash
curl -X POST http://localhost:5000/api/time-tracking/entries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test time entry",
    "duration": 3600,
    "clientId": 1,
    "date": "2026-01-19",
    "type": "billable"
  }'
```

**IF FAILS**: Document error and fix the service/storage layer.

---

## PHASE 3: Task CRUD Implementation (Days 5-7)

### STEP 3.1: Check If Tasks Use Different Storage

**INSTRUCTION**: The task-routes.ts might use a different storage than database-storage.ts

```bash
# Check task-routes.ts imports
head -30 /path/to/accounting-api/server/routes/task-routes.ts
```

**POSSIBLE OUTCOMES**:
1. Uses `db` directly with Drizzle → Tasks should work
2. Uses `storage` from `database-storage.ts` → Needs implementation
3. Uses `secureStorage` → Check if implemented there

### STEP 3.2: Implement Task Methods (If Needed)

**IF** tasks use `database-storage.ts`, implement the stub methods:

**FILE**: `server/database-storage.ts`

**REPLACE** lines 427-431:

```typescript
async createTask(task: any): Promise<any> {
  const result = await db.insert(tasks).values({
    ...task,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  return result[0];
}

async getTask(id: number): Promise<any> {
  const result = await db.select().from(tasks).where(eq(tasks.id, id));
  return result[0];
}

async getTasks(firmId: number): Promise<any[]> {
  return db.select().from(tasks).where(eq(tasks.firmId, firmId));
}

async updateTask(id: number, updates: any): Promise<any> {
  const result = await db.update(tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return result[0];
}

async deleteTask(id: number): Promise<boolean> {
  await db.delete(tasks).where(eq(tasks.id, id));
  return true;
}
```

**NOTE**: Import `tasks` from schema if not already imported.

---

## PHASE 4: Pages Invoicing (Days 8-10)

### STEP 4.1: Understand Pages vs Books Invoicing

**Pages Invoicing** = The accounting firm billing their clients for services rendered
**Books Invoicing** = Creating invoices for the client's customers (bookkeeping)

These are DIFFERENT features.

### STEP 4.2: Check If Pages Invoicing Route Exists

```bash
# Search for firm billing routes
grep -rn "firm.*billing\|practice.*invoice\|service.*invoice" \
  /path/to/accounting-api/server/routes/
```

### STEP 4.3: Implement Pages Invoice Creation

**IF** no route exists, create new route file:

**FILE**: `server/routes/pages-billing-routes.ts` (NEW)

```typescript
/**
 * Pages Billing Routes
 * 
 * Firm billing clients for professional services
 * (Different from Books invoicing which is for client's customers)
 */

import express from 'express';
import { db } from '../db';
import { 
  firmInvoices,  // or appropriate table
  clients,
  timeEntries
} from '@shared/schema';
import { eq, and, sum } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, setupTenantScope } from '../security-middleware';

const router = express.Router();

router.use(requireAuth);
router.use(setupTenantScope);

// Create invoice from time entries
router.post('/invoices/from-time', async (req, res) => {
  try {
    const user = req.user as any;
    const { clientId, timeEntryIds, dueDate, notes } = req.body;

    // Validate client belongs to firm
    const [client] = await db.select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.firmId, user.firmId)
      ));

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get time entries and calculate total
    const entries = await db.select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.firmId, user.firmId),
        eq(timeEntries.clientId, clientId)
        // Add: in(timeEntries.id, timeEntryIds)
      ));

    // Calculate total from billable hours
    let total = 0;
    for (const entry of entries) {
      const hours = Number(entry.duration) / 3600;
      const rate = Number(entry.hourlyRate) || 150; // Default rate
      total += hours * rate;
    }

    // Create invoice
    // NOTE: Schema may need adjustment
    const [invoice] = await db.insert(firmInvoices).values({
      firmId: user.firmId,
      clientId,
      amount: total.toString(),
      status: 'draft',
      dueDate,
      notes,
      createdById: user.id,
      createdAt: new Date()
    }).returning();

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Get firm invoices
router.get('/invoices', async (req, res) => {
  try {
    const user = req.user as any;
    const invoices = await db.select()
      .from(firmInvoices)
      .where(eq(firmInvoices.firmId, user.firmId));

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;
```

**NOTE**: This requires checking if `firmInvoices` table exists in schema. May need to use existing `invoices` table with a `type` field to distinguish.

---

## PHASE 5: Security Fixes (Days 11-12)

Apply all security fixes from PAGES_PLAN_V2.md:
- task-routes.ts firmId validation
- Other auth gaps identified in Phase 0

---

## PHASE 6: Verification (Days 13-14)

### Checklist

| Feature | Test | Expected | Pass? |
|---------|------|----------|-------|
| Notifications | GET /api/notifications/unread-count | Returns count | [ ] |
| Time Tracking | POST /api/time-tracking/entries | Creates entry | [ ] |
| Time Tracking | GET /api/time-tracking/entries | Returns list | [ ] |
| Tasks | POST /api/tasks | Creates task | [ ] |
| Tasks | GET /api/tasks | Returns list | [ ] |
| Pages Invoicing | POST /api/pages/billing/invoices/from-time | Creates invoice | [ ] |
| Security | Unauth request to /api/tasks/1 | Returns 401 | [ ] |

---

## Files to Modify

### Sprint A

| File | Change |
|------|--------|
| `server/routes/notification-routes.ts` | Add `/unread-count` alias |
| `server/routes/task-routes.ts` | Security fix (from V2) |
| `server/database-storage.ts` | Implement task stubs (if used) |
| `server/routes/pages-billing-routes.ts` | NEW - firm billing routes |
| `server/routes.ts` | Mount new billing routes |

### Sprint B (Deferred)

| File | Change |
|------|--------|
| `server/database-storage.ts` | Implement calendar, report stubs |
| `src/pages/PagesFixed.tsx` | Refactor (from V2) |
| `src/hooks/pages/*.ts` | Create hooks (from V2) |

---

## What This Plan DOES

1. Fixes notification endpoint mismatch (quick win)
2. Verifies time tracking actually works
3. Implements task CRUD if broken
4. Creates Pages invoicing (firm billing clients)
5. Applies security fixes

## What This Plan Does NOT Do (Deferred)

- Calendar event implementation
- Reports for Pages
- Client portal stubs
- Full UI refactoring
- Connie AI integration
- Rate management UI

---

## Acceptance Criteria for Sprint A

- [ ] GET /api/notifications/unread-count returns 200
- [ ] Time tracking creates and retrieves entries
- [ ] Tasks can be created, read, updated, deleted
- [ ] Pages invoices can be created from time entries
- [ ] All security tests pass
- [ ] Books/Binder modules unaffected
