# Backend Endpoint Verification

**Date**: January 2026  
**Purpose**: Document which Pages routes are mounted and their expected status codes

---

## Mounted Routes in `routes.ts`

### Task Routes
| Endpoint | Router File | Mount Path | Status |
|----------|-------------|------------|--------|
| `/api/tasks` | `task-routes.ts` | Line 9756 | ✅ Mounted |
| `/api/tasks` | `enhanced-task-routes.ts` | (via taskRoutes) | ✅ Mounted |
| `/api/tasks` | `task-assignment-routes.ts` | Line 9759 | ✅ Mounted |
| `/api/tasks` | `task-features-routes.ts` | Line 9760 | ✅ Mounted |
| `/api/task-statuses` | `task-status-routes.ts` | Line 9757 | ✅ Mounted |

**Note**: Multiple routers mount to `/api/tasks` - Express will match in order.

### Time Tracking Routes
| Endpoint | Router File | Mount Path | Status |
|----------|-------------|------------|--------|
| `/api/time-tracking/*` | `time-tracking-api-routes.ts` | (Not explicitly mounted - check routes.ts) | ⚠️ Need to verify |
| `/api/time-tracking/*` | `enhanced-time-tracking-routes.ts` | (Not explicitly mounted) | ⚠️ Need to verify |

**Action Required**: Check if time-tracking routes are mounted in `routes.ts`

### Notification Routes
| Endpoint | Router File | Mount Path | Status |
|----------|-------------|------------|--------|
| `/api/notifications/*` | `notification-routes.ts` | Line 9709, 9838 | ✅ Mounted (duplicate mount) |

### Pages Billing Routes
| Endpoint | Router File | Mount Path | Status |
|----------|-------------|------------|--------|
| `/api/pages/billing/*` | `pages-billing-routes.ts` | Line 9763 | ✅ Mounted |

---

## Expected HTTP Status Codes

### Unauthenticated Requests (No Auth Token/Cookie)

| Endpoint | Method | Expected Status | Notes |
|----------|--------|----------------|--------|
| `/api/tasks` | GET | 401 | Requires auth |
| `/api/tasks` | POST | 401 | Requires auth |
| `/api/tasks/:id` | PATCH | 401 | Requires auth |
| `/api/tasks/:id` | DELETE | 401 | Requires auth |
| `/api/time-tracking/entries` | GET | 401 | Requires auth |
| `/api/time-tracking/entries` | POST | 401 | Requires auth |
| `/api/notifications/count` | GET | 401 | Requires auth |
| `/api/notifications/unread-count` | GET | 401 | Requires auth |
| `/api/pages/billing/invoices` | GET | 401 | Requires auth |
| `/api/pages/billing/invoices/from-time` | POST | 401 | Requires auth |

### Authenticated Requests (With Valid Session)

| Endpoint | Method | Expected Status | Response Format |
|----------|--------|----------------|-----------------|
| `/api/tasks` | GET | 200 | `{ tasks: [...] }` or `[]` |
| `/api/tasks` | POST | 201 | `{ id, title, ... }` |
| `/api/tasks/:id` | PATCH | 200 | `{ success: true, data: {...} }` |
| `/api/tasks/:id` | DELETE | 200 | `{ success: true }` |
| `/api/time-tracking/entries` | GET | 200 | `[...]` (array) |
| `/api/time-tracking/entries` | POST | 201 | `{ id, ... }` |
| `/api/notifications/count` | GET | 200 | `{ count: number }` |
| `/api/notifications/unread-count` | GET | 200 | `{ count: number }` |
| `/api/pages/billing/invoices` | GET | 200 | `{ success: true, data: [...] }` |
| `/api/pages/billing/invoices/from-time` | POST | 201 | `{ success: true, data: {...} }` |

### Cross-Tenant Access (Firm A user accessing Firm B data)

| Endpoint | Method | Expected Status | Notes |
|----------|--------|----------------|--------|
| `/api/tasks/:id` | PATCH | 404 | Task not found (firmId mismatch) |
| `/api/tasks/:id` | DELETE | 404 | Task not found (firmId mismatch) |
| `/api/tasks/:id` | GET | 404 | Task not found (firmId mismatch) |
| `/api/pages/billing/invoices/:id` | GET | 404 | Invoice not found (firmId mismatch) |

---

## Verification Commands

### Test 1: Unauthenticated Access
```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/tasks
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/time-tracking/entries
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/notifications/count
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/notifications/unread-count
curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/pages/billing/invoices
```

### Test 2: Authenticated Access
```bash
# Login first to get session cookie
TOKEN=$(curl -s -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' | jq -r '.token')

# Or use session cookie
curl -s -H "Cookie: connect.sid=..." http://localhost:5001/api/tasks
curl -s -H "Cookie: connect.sid=..." http://localhost:5001/api/time-tracking/entries
curl -s -H "Cookie: connect.sid=..." http://localhost:5001/api/notifications/unread-count
curl -s -H "Cookie: connect.sid=..." http://localhost:5001/api/pages/billing/invoices
```

### Test 3: Cross-Tenant Security
```bash
# Login as Firm A user, try to access Firm B's task
# Should return 404 (not 403 or 200)
curl -X PATCH http://localhost:5001/api/tasks/999 \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
# Expected: 404 if task belongs to different firm
```

---

## Mount Verification Status

✅ **Mounted Routes**:
- `/api/tasks` → `task-routes.ts`
- `/api/notifications` → `notification-routes.ts`
- `/api/pages/billing` → `pages-billing-routes.ts`

⚠️ **Need Verification**:
- Time tracking routes mounting (check if `time-tracking-api-routes.ts` is mounted)

---

## Notes

1. **Multiple Task Routers**: Multiple routers mount to `/api/tasks`. Express matches in order, so the first matching route wins.

2. **Notification Routes Duplicate Mount**: `notification-routes.ts` is mounted twice (lines 9709 and 9838). This is redundant but not harmful.

3. **Time Tracking Routes**: Need to verify if `time-tracking-api-routes.ts` is explicitly mounted or if routes are defined inline in `routes.ts`.
