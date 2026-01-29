# Backend Stub Priority - database-storage.ts

**Date**: January 2026  
**Purpose**: Prioritize stub methods in `database-storage.ts` based on Pages route usage

---

## Stub Methods Found

All stubs in `database-storage.ts` throw `new Error("Not implemented")` or return empty arrays/false.

---

## HIGH Priority (Called by Working Pages Routes)

### ⚠️ **NONE** - No Pages routes use `database-storage.ts`

**Finding**: All Pages routes use either:
- `minimal-storage.ts` (which has implementations)
- Direct `db` queries (Drizzle ORM)
- Services that use `db` directly

**However**, `routes.ts` has inline routes that call `storage.createTask()`, `storage.getTasks()`, `storage.updateTask()`:
- These use `minimal-storage.ts` (imported as `storage` from `./minimal-storage`)
- `minimal-storage.ts` has full implementations ✅

---

## MEDIUM Priority (Potentially Used by Pages Features)

### `createInvoice(invoice: any): Promise<any>`
- **Location**: `database-storage.ts` line 442
- **Status**: Stub throws error
- **Used By**: 
  - ❌ Not used by `pages-billing-routes.ts` (uses direct `db` queries)
  - ⚠️ Might be called by other Pages features in future
- **Priority**: MEDIUM
- **Action**: Only implement if Pages invoicing needs this abstraction layer

### `getInvoices(clientId: number): Promise<any[]>`
- **Location**: `database-storage.ts` line 443
- **Status**: Stub returns `[]`
- **Used By**: 
  - ❌ Not used by `pages-billing-routes.ts` (uses direct `db` queries)
- **Priority**: MEDIUM
- **Action**: Only implement if Pages invoicing needs this abstraction layer

---

## LOW Priority (Not Used by Pages Routes)

### Task Methods (Stubs exist but not used)
- `createTask(task: any)` - Line 427
- `getTask(id: number)` - Line 428
- `getTasks()` - Line 429 (returns `[]`)
- `updateTask(id: number, updates: any)` - Line 430
- `deleteTask(id: number)` - Line 431

**Why LOW**: 
- `routes.ts` uses `minimal-storage.ts` for task CRUD ✅
- `task-routes.ts` uses direct `db` queries ✅
- `enhanced-task-routes.ts` uses direct `db` queries ✅
- **No Pages routes call `database-storage.ts` task methods**

### Activity Methods
- `createActivity(activity: any)` - Line 433
- `getActivities(filters?: any)` - Line 434 (returns `[]`)

**Why LOW**: Not used by any Pages routes found

### Calendar Methods
- `createCalendarEvent(event: any)` - Line 436
- `getCalendarEvents(filters?: any)` - Line 437 (returns `[]`)

**Why LOW**: Not used by any Pages routes found

### Report Methods
- `createReport(report: any)` - Line 439
- `getReports(clientId: number)` - Line 440 (returns `[]`)

**Why LOW**: Not used by any Pages routes found

### Document Methods
- `createClientDocument(doc: any)` - Line 445
- `getClientDocuments(clientId: number)` - Line 446 (returns `[]`)
- `createDocumentRequest(request: any)` - Line 448
- `getDocumentRequests(clientId: number)` - Line 449 (returns `[]`)

**Why LOW**: Not used by any Pages routes found

### Other Methods
- `createBinder()`, `getBinder()`, `getBinders()`, `updateBinder()`, `deleteBinder()` - Lines 421-425
- `createTransactionItem()`, `getTransactionItems()` - Lines 451-452
- `createContact()`, `getContacts()` - Lines 454-455
- `createBankFeed()`, `getBankFeeds()` - Lines 457-458
- `createBankTransaction()`, `getBankTransactions()` - Lines 460-461
- `createReconciliationRule()`, `getReconciliationRules()` - Lines 463-464
- `createTransactionRule()`, `getTransactionRules()` - Lines 466-467
- `createFirmAccount()`, `getFirmAccounts()` - Lines 469-470
- `createStaffClientAssignment()`, `getStaffClientAssignments()` - Lines 472-473
- `createUserPermission()`, `getUserPermissions()` - Lines 475-476
- `createInvitation()`, `getInvitations()` - Lines 478-479

**Why LOW**: Not used by any Pages routes found

---

## Implementation Decision

### ✅ **DO NOT IMPLEMENT** `database-storage.ts` stubs for Pages routes

**Reasoning**:
1. No Pages routes use `database-storage.ts`
2. All Pages routes use working implementations:
   - `minimal-storage.ts` (has task CRUD)
   - Direct `db` queries (Drizzle ORM)
   - Services that use `db` directly

### ⚠️ **Exception**: If `routes.ts` inline routes need `database-storage.ts`

**Current State**: `routes.ts` uses `minimal-storage.ts` (imported as `storage`)

**If Changed**: If `routes.ts` is refactored to use `database-storage.ts`, then implement:
- `createTask()`
- `getTask()`
- `getTasks(firmId: number)` - Note: signature differs from stub
- `updateTask()`
- `deleteTask()`

**Action**: Monitor `routes.ts` for storage import changes.

---

## Priority Summary

| Priority | Count | Action |
|----------|-------|--------|
| HIGH | 0 | None - no Pages routes use stubs |
| MEDIUM | 2 | Monitor - invoice methods if needed |
| LOW | 20+ | Ignore - not used by Pages routes |

---

## Recommendation

**Skip Phase 3 Task CRUD Implementation** in `database-storage.ts` because:
1. No Pages routes use it
2. All task routes work via `minimal-storage.ts` or direct `db` queries
3. Implementing stubs would be dead code

**Instead**: Verify that `minimal-storage.ts` task methods work correctly (Phase 2 verification).
