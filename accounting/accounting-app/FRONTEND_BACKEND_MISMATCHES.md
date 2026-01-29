# Frontend-Backend Mismatch Analysis

**Date**: January 2026  
**Status**: Analysis Complete  
**Reference**: `BACKEND_COMPLETE.md` from Backend Agent

---

## Summary

This document identifies mismatches between frontend API calls and backend endpoint availability. Based on Backend Agent's completion report, most critical endpoints are now available.

---

## ✅ RESOLVED MISMATCHES

### 1. Notifications Unread Count
- **Frontend Calls**: `/api/notifications/unread-count` (Line 399, 409)
- **Backend Status**: ✅ **FIXED** - Backend agent added alias route
- **Action**: No frontend changes needed
- **Verification**: Endpoint should now return `{ count: number }`

---

## ✅ VERIFIED ENDPOINTS (No Mismatches)

### Tasks
| Frontend Call | Backend Status | Notes |
|--------------|----------------|-------|
| `GET /api/tasks` | ✅ Available | Verified working |
| `POST /api/tasks` | ✅ Available | Fixed auth in frontend |
| `PATCH /api/tasks/:id` | ✅ Available | Security fixes applied |
| `DELETE /api/tasks/:id` | ✅ Available | Security fixes applied |
| `GET /api/task-statuses` | ✅ Available | Verified working |

### Time Tracking
| Frontend Call | Backend Status | Notes |
|--------------|----------------|-------|
| `GET /api/time-tracking/entries` | ✅ Available | Verified working |
| `DELETE /api/time-tracking/entries/:id` | ✅ Available | Verified working |
| `POST /api/time-tracking/sessions/start` | ✅ Available | Verified working |
| `GET /api/time-tracking/sessions/active` | ✅ Available | Verified working |

### Pages Billing (Firm Invoicing)
| Frontend Call | Backend Status | Notes |
|--------------|----------------|-------|
| `GET /api/pages/billing/invoices` | ✅ Available | **NEW** - Added by backend |
| `POST /api/pages/billing/invoices/from-time` | ✅ Available | **NEW** - Added by backend |
| `GET /api/pages/billing/invoices/:id` | ✅ Available | **NEW** - Not yet used in UI |

---

## ⚠️ ENDPOINTS NEEDING VERIFICATION

### Projects
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/projects` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/projects` | ⚠️ UNKNOWN | **CRITICAL** - Create button has no onClick |
| `PATCH /api/projects/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `DELETE /api/projects/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `PATCH /api/projects/bulk` | ⚠️ UNKNOWN | Verify endpoint exists |
| `DELETE /api/projects/bulk` | ⚠️ UNKNOWN | Verify endpoint exists |

**Fix Plan**:
1. Verify project routes exist in backend
2. Fix Create Project button (Phase 1.2)
3. Test all project operations

### Clients
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/clients` | ✅ Likely Available | Verify exact endpoint |
| `GET /api/clients/:id/logo` | ✅ Likely Available | Verify exact endpoint |
| `POST /api/clients` | ⚠️ UNKNOWN | Verify endpoint exists |
| `PATCH /api/clients/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `DELETE /api/clients/:id` | ⚠️ UNKNOWN | Verify endpoint exists |

**Fix Plan**:
1. Verify client CRUD routes exist
2. Test client operations

### Pending Approvals
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/pending-client-approvals` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/pending-client-approvals/:id/:action` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/pending-approvals/time-entries/:id/:action` | ⚠️ UNKNOWN | Verify endpoint exists |

**Fix Plan**:
1. Verify approval workflow routes exist
2. Test approval operations

### Billing (Books Invoicing)
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/billing/invoices` | ✅ Likely Available | Verify (Books module) |
| `POST /api/billing/invoices` | ✅ Likely Available | Verify (Books module) |
| `GET /api/billing/payments` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/billing/settings` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/billing/recurring` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/billing/recurring` | ⚠️ UNKNOWN | Verify endpoint exists |
| `PATCH /api/billing/recurring/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/billing/recurring/generate` | ⚠️ UNKNOWN | Verify endpoint exists |
| `DELETE /api/billing/recurring/:id` | ⚠️ UNKNOWN | Verify endpoint exists |

**Note**: Books billing is separate from Pages billing. These should not be modified per scope guards.

### Reports & Analytics
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/reports/firm-overview` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/practice/metrics` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/dashboard/metrics` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/activities` | ⚠️ UNKNOWN | Verify endpoint exists |

**Fix Plan**:
1. Verify report endpoints exist
2. Test report generation

### Other Endpoints
| Frontend Call | Backend Status | Action Needed |
|--------------|----------------|---------------|
| `GET /api/users` | ✅ Likely Available | Verify endpoint exists |
| `GET /api/team/time-entries` | ⚠️ UNKNOWN | Verify endpoint exists |
| `GET /api/time-entries` | ⚠️ UNKNOWN | May be duplicate of time-tracking/entries |
| `POST /api/project-templates` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/project-templates/apply` | ⚠️ UNKNOWN | Verify endpoint exists |
| `POST /api/report-subscriptions` | ⚠️ UNKNOWN | Verify endpoint exists |
| `PATCH /api/report-subscriptions/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `DELETE /api/report-subscriptions/:id` | ⚠️ UNKNOWN | Verify endpoint exists |
| `PATCH /api/report-subscriptions/:id/toggle` | ⚠️ UNKNOWN | Verify endpoint exists |

---

## 🔴 CRITICAL ISSUES REQUIRING IMMEDIATE FIX

### 1. Create Project Button Missing onClick Handler
- **Location**: `PagesFixed.tsx` ~Line 2645
- **Issue**: Button exists but has no onClick handler
- **Impact**: Users cannot create new projects
- **Priority**: **HIGH** - Phase 1.2
- **Fix**: Add onClick handler and create project dialog

### 2. Pages Invoice Detail View Not Implemented
- **Backend Endpoint**: `GET /api/pages/billing/invoices/:id` ✅ Available
- **Frontend Status**: ❌ Not used in UI
- **Impact**: Users cannot view invoice details
- **Priority**: **MEDIUM** - Future enhancement
- **Fix**: Add invoice detail view component

---

## 📋 VERIFICATION CHECKLIST

### Phase 1 (Quick Wins)
- [x] Notifications `/unread-count` - Backend alias added
- [ ] Create Project button - **NEEDS FIX** (Phase 1.2)

### Phase 2 (Time Tracking)
- [x] Time tracking endpoints verified
- [ ] Test time entry creation/editing/deletion

### Phase 3 (Tasks)
- [x] Task endpoints verified
- [x] Task creation auth fixed
- [ ] Test all task operations

### Phase 4 (Pages Invoicing)
- [x] Pages invoicing endpoints added
- [x] Invoice creation from time entries implemented
- [ ] Invoice detail view (optional)

### Phase 5-6 (Polish & Testing)
- [ ] Verify all UNKNOWN endpoints
- [ ] Fix any remaining mismatches
- [ ] Complete integration testing

---

## 🎯 PRIORITY FIX PLAN

### Immediate (Phase 1)
1. ✅ Notifications endpoint - **RESOLVED** (backend alias)
2. 🔴 Create Project button - **FIX NEEDED** (Phase 1.2)

### Short Term (Phase 2-3)
3. Verify project CRUD endpoints
4. Test task operations end-to-end
5. Verify client CRUD endpoints

### Medium Term (Phase 4-5)
6. Add invoice detail view
7. Verify report endpoints
8. Polish error handling

---

## 📝 NOTES

1. **Backend Agent Status**: Most critical endpoints are now available
2. **Scope Guards**: Books and Binder modules should not be modified
3. **Testing Required**: Many endpoints marked UNKNOWN need manual verification
4. **Future Work**: Invoice detail view and other enhancements can be added later

---

## ✅ NEXT STEPS

1. **Phase 0.3**: Document broken UI features
2. **Phase 1.1**: Verify notifications work (already resolved)
3. **Phase 1.2**: Fix Create Project button
4. **Phase 2-6**: Continue with remaining phases

---

**Mismatch Analysis Complete - Ready for Phase 0.3 (Broken Features)**
