# Frontend Broken Features - Pages Module

**Date**: January 2026  
**Status**: Analysis Complete  
**File Analyzed**: `src/pages/PagesFixed.tsx`

---

## Summary

This document identifies broken UI features in the Pages module that need to be fixed. Features are categorized by severity and include specific fix instructions.

---

## 🔴 CRITICAL ISSUES (Blocking User Functionality)

### 1. Create Project Button - Missing onClick Handler

**Location**: `PagesFixed.tsx` ~Line 6456

**Issue**:
- Button displays "Create Project" text
- No `onClick` handler attached
- No dialog state for project creation
- Users cannot create new projects

**Current Code** (Approximate):
```tsx
<Button>
  Create Project
</Button>
```

**Expected Behavior**:
- Clicking button should open project creation dialog
- Form should allow entering project details
- Submission should create project via API

**Error**: No console error, but button does nothing when clicked

**Fix Required**:
1. Add state: `const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);`
2. Add onClick handler: `onClick={() => setShowCreateProjectDialog(true)}`
3. Create or use existing project creation dialog
4. Wire up form submission to `POST /api/projects`

**Priority**: **HIGH** - Phase 1.2  
**Impact**: Users cannot create projects, blocking workflow

---

## ⚠️ MEDIUM PRIORITY ISSUES

### 2. Pages Invoice Detail View - Not Implemented

**Location**: N/A (Feature missing)

**Issue**:
- Backend endpoint `GET /api/pages/billing/invoices/:id` is available
- Frontend has no UI to view invoice details
- Users can create invoices but cannot view full details

**Current State**:
- Invoice list query exists (`pagesInvoicesData`)
- Invoice creation works
- No detail view component

**Expected Behavior**:
- Clicking invoice in list should show details
- Details should include:
  - Invoice number
  - Client information
  - Line items (linked time entries)
  - Totals and amounts
  - Status and dates

**Fix Required**:
1. Add invoice detail dialog/modal
2. Add query for single invoice: `GET /api/pages/billing/invoices/:id`
3. Add click handler to invoice list items
4. Display invoice details in dialog

**Priority**: **MEDIUM** - Future enhancement  
**Impact**: Users cannot view invoice details, but can create invoices

---

## 🔍 POTENTIAL ISSUES (Need Verification)

### 3. Project CRUD Operations - Endpoints Unknown

**Location**: Various locations in `PagesFixed.tsx`

**Issue**:
- Frontend calls project endpoints but backend availability is unknown
- May cause errors when users try to:
  - Update projects
  - Delete projects
  - Apply project templates

**Endpoints to Verify**:
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/project-templates`
- `POST /api/project-templates/apply`

**Fix Required**:
1. Verify endpoints exist in backend
2. Test all project operations
3. Fix any broken operations

**Priority**: **MEDIUM** - Phase 2-3  
**Impact**: Project management may be partially broken

---

### 4. Client CRUD Operations - Endpoints Unknown

**Location**: Various locations in `PagesFixed.tsx`

**Issue**:
- Frontend calls client endpoints but some may not exist
- Client creation/editing/deletion may fail

**Endpoints to Verify**:
- `POST /api/clients`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`

**Fix Required**:
1. Verify endpoints exist
2. Test client operations
3. Fix any broken operations

**Priority**: **MEDIUM** - Phase 2-3  
**Impact**: Client management may be partially broken

---

### 5. Pending Approvals Workflow - Endpoints Unknown

**Location**: `PagesFixed.tsx` Lines 179, 201, 228, etc.

**Issue**:
- Approval workflow endpoints may not exist
- Client and time entry approvals may fail

**Endpoints to Verify**:
- `GET /api/pending-client-approvals`
- `POST /api/pending-client-approvals/:id/:action`
- `POST /api/pending-approvals/time-entries/:id/:action`

**Fix Required**:
1. Verify endpoints exist
2. Test approval workflow
3. Fix any broken operations

**Priority**: **MEDIUM** - Phase 2-3  
**Impact**: Approval workflow may be broken

---

## ✅ VERIFIED WORKING FEATURES

### Notifications
- ✅ Notification badge displays unread count
- ✅ Notification list loads
- ✅ Mark as read works
- ✅ Delete notification works
- ✅ Mark all as read works

### Tasks
- ✅ Task list loads
- ✅ Create task works (auth fixed)
- ✅ Update task works
- ✅ Delete task works
- ✅ Task status updates work

### Time Tracking
- ✅ Time entries list loads
- ✅ Delete time entry works
- ✅ Timer start works
- ✅ Active timer indicator works

### Pages Invoicing
- ✅ Generate invoice from time entries works
- ✅ Invoice creation API call works
- ✅ Time entries marked as billed after invoice creation

---

## 📋 TESTING CHECKLIST

### Critical Features
- [ ] **Create Project** - Button click opens dialog (BROKEN - Phase 1.2)
- [ ] **View Invoice Details** - Click invoice shows details (NOT IMPLEMENTED)
- [ ] **Update Project** - Can edit project details (NEEDS VERIFICATION)
- [ ] **Delete Project** - Can delete project (NEEDS VERIFICATION)
- [ ] **Create Client** - Can create new client (NEEDS VERIFICATION)
- [ ] **Update Client** - Can edit client (NEEDS VERIFICATION)
- [ ] **Delete Client** - Can delete client (NEEDS VERIFICATION)
- [ ] **Approve Client** - Approval workflow works (NEEDS VERIFICATION)
- [ ] **Approve Time Entry** - Approval workflow works (NEEDS VERIFICATION)

### Working Features
- [x] **Notifications** - All notification features work
- [x] **Tasks** - All task CRUD operations work
- [x] **Time Tracking** - Time entry operations work
- [x] **Pages Invoicing** - Invoice creation works

---

## 🎯 FIX PRIORITY ORDER

1. **Phase 1.2**: Fix Create Project button (CRITICAL)
2. **Phase 2**: Verify and fix project CRUD operations
3. **Phase 3**: Verify and fix client CRUD operations
4. **Phase 4**: Verify and fix approval workflows
5. **Future**: Add invoice detail view

---

## 📝 NOTES

1. **Create Project** is the only confirmed broken feature requiring immediate fix
2. Other issues are "potential" and need backend verification
3. Most core features (tasks, time tracking, notifications) are working
4. Pages invoicing was recently implemented and is working

---

## ✅ NEXT STEPS

1. **Phase 1.2**: Fix Create Project button (immediate)
2. **Phase 2-3**: Verify and fix remaining CRUD operations
3. **Phase 4-6**: Continue with testing and polish

---

**Broken Features Analysis Complete - Ready for Phase 1 Fixes**
