# Backend Security Audit - Pages Routes

**Date**: January 2026  
**Purpose**: Audit authentication and tenant scoping for all Pages routes

---

## Security Audit Results

### ✅ **SECURED Routes**

#### 1. `task-routes.ts`
- **Auth**: ✅ `router.use(requireAuth)` (line 18)
- **Tenant Scoping**: ✅ `router.use(setupTenantScope)` (line 19)
- **firmId Validation**: ✅ All handlers validate `user.firmId` and filter queries by `firmId`
- **Status**: ✅ **SECURE**

#### 2. `notification-routes.ts`
- **Auth**: ✅ All routes use `requireAuthHybrid` middleware
- **Tenant Scoping**: ✅ Routes use `authReq.user.firmId` in queries
- **firmId Validation**: ✅ All queries filter by `firmId`
- **Status**: ✅ **SECURE**

#### 3. `pages-billing-routes.ts`
- **Auth**: ✅ `router.use(requireAuth)` (line 24)
- **Tenant Scoping**: ✅ `router.use(setupTenantScope)` (line 25)
- **firmId Validation**: ✅ All handlers validate `user.firmId` and filter queries by `firmId`
- **Status**: ✅ **SECURE**

---

### ⚠️ **NEEDS SECURITY FIXES**

#### 1. `enhanced-task-routes.ts`
- **Auth**: ❌ No router-level auth middleware
- **Tenant Scoping**: ❌ No router-level tenant scoping
- **firmId Validation**: ⚠️ Uses `getSecurityContext()` helper but defaults to `firmId: 1` if no user
- **Issue**: Routes may be accessible without authentication
- **Fix Required**: Add `router.use(requireAuth)` and `router.use(setupTenantScope)`
- **Priority**: HIGH

#### 2. `time-tracking-api-routes.ts`
- **Auth**: ⚠️ Inline `req.isAuthenticated()` checks in each handler
- **Tenant Scoping**: ⚠️ Uses `user.firmId` in service calls but no router-level scoping
- **firmId Validation**: ✅ Service methods filter by `firmId`
- **Issue**: Inconsistent auth pattern, no router-level enforcement
- **Fix Required**: Add `router.use(requireAuth)` at router level
- **Priority**: MEDIUM (currently works but inconsistent)

#### 3. `enhanced-time-tracking-routes.ts`
- **Auth**: ❌ No auth middleware found
- **Tenant Scoping**: ❌ No tenant scoping
- **firmId Validation**: ⚠️ Need to verify handlers check `firmId`
- **Issue**: Routes may be accessible without authentication
- **Fix Required**: Add `router.use(requireAuth)` and `router.use(setupTenantScope)`
- **Priority**: HIGH

---

## Security Fixes Required

### Fix 1: enhanced-task-routes.ts

**Add at top of router** (after line 22):
```typescript
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

// After: const router = express.Router();
router.use(requireAuth);
router.use(setupTenantScope);
```

**Update getSecurityContext()** to throw error if no user:
```typescript
const getSecurityContext = (req: Request) => {
  const user = (req as any).user;
  if (!user || !user.firmId) {
    throw new Error('Unauthorized');
  }
  return {
    userId: user.id,
    firmId: user.firmId,
    userRole: user.role || 'firm_user',
    permissions: user.permissions || ['read', 'write']
  };
};
```

### Fix 2: time-tracking-api-routes.ts

**Add at top of router** (after line 37):
```typescript
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

// After: const router = Router();
router.use(requireAuth);
router.use(setupTenantScope);
```

**Remove inline auth checks** (they're redundant with router-level middleware):
- Remove `if (!req.isAuthenticated())` checks
- Keep `user.firmId` usage in service calls

### Fix 3: enhanced-time-tracking-routes.ts

**Add at top of router** (after line 18):
```typescript
import { requireAuth } from '../auth';
import { setupTenantScope } from '../security-middleware';

// After: const router = express.Router();
router.use(requireAuth);
router.use(setupTenantScope);
```

**Verify all handlers** use `user.firmId` in queries.

---

## Cross-Tenant Access Prevention

### Current Protection

| Route File | firmId Validation | Cross-Tenant Blocked? |
|-----------|-------------------|----------------------|
| `task-routes.ts` | ✅ Yes | ✅ Yes |
| `notification-routes.ts` | ✅ Yes | ✅ Yes |
| `pages-billing-routes.ts` | ✅ Yes | ✅ Yes |
| `enhanced-task-routes.ts` | ⚠️ Partial | ⚠️ May allow access |
| `time-tracking-api-routes.ts` | ✅ Yes (via service) | ✅ Yes |
| `enhanced-time-tracking-routes.ts` | ❓ Unknown | ❓ Need to verify |

---

## Summary

| Status | Count | Files |
|--------|-------|-------|
| ✅ Secure | 3 | task-routes.ts, notification-routes.ts, pages-billing-routes.ts |
| ⚠️ Needs Fix | 3 | enhanced-task-routes.ts, time-tracking-api-routes.ts, enhanced-time-tracking-routes.ts |

**Action Required**: Apply security fixes to 3 route files.
