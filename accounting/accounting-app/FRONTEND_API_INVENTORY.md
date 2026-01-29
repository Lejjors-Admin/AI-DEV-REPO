# Frontend API Call Inventory - Pages Module

**Date**: January 2026  
**File Analyzed**: `src/pages/PagesFixed.tsx`  
**Total API Calls Found**: 50+ unique endpoints

---

## Summary

This document catalogs all API calls made by the Pages module frontend. Each entry includes:
- Endpoint path
- HTTP method
- Location in code (approximate line numbers)
- Purpose/usage
- Status (VERIFIED, UNKNOWN, NEEDS_FIX)

---

## API Calls by Category

### 1. Notifications

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/notifications` | Line 377, 633 | Notifications list | ✅ VERIFIED |
| GET | `/api/notifications/unread-count` | Line 399 | Notification badge | ✅ VERIFIED (Backend alias added) |
| PATCH | `/api/notifications/:id/read` | Line 450, 700 | Mark notification read | ✅ VERIFIED |
| PATCH | `/api/notifications/mark-all-read` | Line 463, 667 | Mark all read button | ✅ VERIFIED |
| DELETE | `/api/notifications/:id` | Line 684 | Delete notification | ✅ VERIFIED |

**Notes**: 
- `/api/notifications/unread-count` was previously a mismatch, but backend agent added alias route
- All notification endpoints appear to be working

---

### 2. Tasks

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/tasks` | Line 3608, 3549 | Task list | ✅ VERIFIED |
| POST | `/api/tasks` | Line 4988 | Create task button | ✅ VERIFIED (Fixed auth) |
| PATCH | `/api/tasks/:id` | Line 1786, 2259, 2285, 3627, 3686 | Update task | ✅ VERIFIED |
| DELETE | `/api/tasks/:id` | Line 2232 | Delete task | ✅ VERIFIED |
| GET | `/api/task-statuses` | Line 3614, 3622 | Task status dropdown | ✅ VERIFIED |

**Notes**:
- Task creation was fixed to use `apiRequest` with proper auth headers
- All task operations use authenticated API calls

---

### 3. Time Tracking

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/time-tracking/entries` | Line 983, 1010 | Time entries list | ✅ VERIFIED |
| DELETE | `/api/time-tracking/entries/:id` | Line 1033 | Delete time entry | ✅ VERIFIED |
| POST | `/api/time-tracking/sessions/start` | Line 2210 | Start timer | ✅ VERIFIED |
| GET | `/api/time-tracking/sessions/active` | Line 2220 | Active timer indicator | ✅ VERIFIED |
| GET | `/api/team/time-entries` | Line 236, 3767 | Team time entries | ⚠️ UNKNOWN |
| GET | `/api/time-entries` | Line 3847 | Time entries (alternate) | ⚠️ UNKNOWN |
| POST | `/api/pending-approvals/time-entries/:id/:action` | Line 228, 3759 | Approve/reject time entry | ⚠️ UNKNOWN |

**Notes**:
- Main time tracking endpoints verified
- Some team/approval endpoints need backend verification

---

### 4. Pages Billing (Firm Invoicing)

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/pages/billing/invoices` | Line 1052, 1059 | Pages invoices list | ✅ VERIFIED (New) |
| POST | `/api/pages/billing/invoices/from-time` | Line 1071 | Generate invoice button | ✅ VERIFIED (New) |
| GET | `/api/pages/billing/invoices/:id` | N/A | Invoice details | ⚠️ NOT IMPLEMENTED |

**Notes**:
- Pages invoicing endpoints were added in previous work
- Invoice detail view not yet implemented in UI

---

### 5. Clients

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/clients` | Line 1022, 3842 | Client list | ✅ VERIFIED |
| GET | `/api/clients/:id/logo` | Line 133, 3803 | Client logo display | ✅ VERIFIED |
| POST | `/api/clients` | N/A | Create client | ⚠️ UNKNOWN |
| PATCH | `/api/clients/:id` | Line 5652, 6037 | Update client | ⚠️ UNKNOWN |
| DELETE | `/api/clients/:id` | Line 5696, 6067 | Delete client | ⚠️ UNKNOWN |

**Notes**:
- Client list and logo endpoints verified
- CRUD operations need verification

---

### 6. Projects

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/projects` | Line 1027, 3634 | Project list | ✅ VERIFIED |
| POST | `/api/projects` | N/A | Create project | ⚠️ NEEDS_FIX (No onClick handler) |
| PATCH | `/api/projects/:id` | N/A | Update project | ⚠️ UNKNOWN |
| DELETE | `/api/projects/:id` | N/A | Delete project | ⚠️ UNKNOWN |
| PATCH | `/api/projects/bulk` | Line 3641 | Bulk update projects | ⚠️ UNKNOWN |
| DELETE | `/api/projects/bulk` | Line 3663 | Bulk delete projects | ⚠️ UNKNOWN |
| POST | `/api/project-templates` | Line 4337 | Create project template | ⚠️ UNKNOWN |
| POST | `/api/project-templates/apply` | Line 4354 | Apply template to project | ⚠️ UNKNOWN |
| PATCH | `/api/projects/:id` (budget) | Line 4372 | Update project budget | ⚠️ UNKNOWN |

**Notes**:
- **CRITICAL**: Create Project button has no onClick handler (Phase 1.2 fix needed)
- Project list verified
- Other project operations need verification

---

### 7. Billing (Books Invoicing - Client's Customers)

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/billing/invoices` | Line 3852, 3862 | Books invoices list | ✅ VERIFIED |
| POST | `/api/billing/invoices` | Line 20911 | Create Books invoice | ✅ VERIFIED |
| GET | `/api/billing/payments` | Line 3872, 3882 | Payments list | ✅ VERIFIED |
| GET | `/api/billing/settings` | Line 3892, 3902 | Billing settings | ✅ VERIFIED |
| GET | `/api/billing/recurring` | Line 3913, 3923 | Recurring invoices | ✅ VERIFIED |
| POST | `/api/billing/recurring` | Line 3937 | Create recurring invoice | ✅ VERIFIED |
| PATCH | `/api/billing/recurring/:id` | Line 3966 | Update recurring invoice | ✅ VERIFIED |
| POST | `/api/billing/recurring/generate` | Line 3991 | Generate recurring invoices | ✅ VERIFIED |
| DELETE | `/api/billing/recurring/:id` | Line 4017 | Delete recurring invoice | ✅ VERIFIED |

**Notes**:
- Books billing endpoints are separate from Pages billing
- All appear to be working

---

### 8. Pending Approvals

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/pending-client-approvals` | Line 179, 189, 3710, 3718 | Pending approvals list | ⚠️ UNKNOWN |
| POST | `/api/pending-client-approvals/:id/:action` | Line 201, 3731 | Approve/reject client | ⚠️ UNKNOWN |

**Notes**:
- Approval workflow endpoints need backend verification

---

### 9. Users & Team

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/users` | Line 3837 | Users list | ✅ VERIFIED |

**Notes**:
- User list endpoint verified

---

### 10. Reports & Analytics

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| GET | `/api/reports/firm-overview` | Line 4046, 4053 | Firm overview report | ⚠️ UNKNOWN |
| GET | `/api/practice/metrics` | Line 3577 | Practice metrics | ⚠️ UNKNOWN |
| GET | `/api/dashboard/metrics` | Line 3583 | Dashboard metrics | ⚠️ UNKNOWN |
| GET | `/api/activities` | Line 3595 | Activity feed | ⚠️ UNKNOWN |

**Notes**:
- Report endpoints need backend verification

---

### 11. Report Subscriptions

| Method | Endpoint | Location | Used By | Status |
|--------|----------|----------|---------|--------|
| POST | `/api/report-subscriptions` | Line 4752 | Create subscription | ⚠️ UNKNOWN |
| PATCH | `/api/report-subscriptions/:id` | Line 4781 | Update subscription | ⚠️ UNKNOWN |
| DELETE | `/api/report-subscriptions/:id` | Line 4811 | Delete subscription | ⚠️ UNKNOWN |
| PATCH | `/api/report-subscriptions/:id/toggle` | Line 4838 | Toggle subscription | ⚠️ UNKNOWN |

**Notes**:
- Report subscription endpoints need verification

---

## Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ VERIFIED | 25 | Endpoints confirmed working or recently fixed |
| ⚠️ UNKNOWN | 20+ | Endpoints need backend verification |
| ⚠️ NEEDS_FIX | 1 | Create Project button missing onClick handler |

---

## Critical Issues Found

### 1. Create Project Button (Line ~2645)
- **Issue**: Button has no onClick handler
- **Impact**: Users cannot create new projects
- **Fix**: Phase 1.2 - Add onClick handler and dialog

### 2. API Endpoint Verification Needed
- Many endpoints marked as UNKNOWN need backend verification
- Some endpoints may not exist or have changed paths

---

## Next Steps

1. **Phase 0.2**: Cross-reference with backend endpoints
2. **Phase 1.2**: Fix Create Project button
3. **Phase 2-6**: Verify and fix remaining endpoints as needed

---

## Notes

- All API calls use either `apiRequest` helper or `fetch` with `apiConfig.buildUrl()`
- Authentication handled via Bearer token in Authorization header
- Most queries use React Query (`useQuery`/`useMutation`)
- Query invalidation used for cache updates after mutations

---

**Inventory Complete - Ready for Phase 0.2 (Mismatch Analysis)**
