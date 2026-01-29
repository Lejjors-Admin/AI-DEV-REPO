import express from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { requireAuthHybrid } from "../auth";
import { users, firmUsers, clientAssignments, clients } from "../../shared/schema";

const router = express.Router();

const MODULE_KEYS = [
  "dashboard",
  "clients",
  "contact-management",
  "projects",
  "tasks",
  "calendar",
  "communication",
  "notifications",
  "team",
  "reports",
  "time-expenses",
  "billing",
  "settings",
  "practice",
];

const isAdminRole = (role?: string) =>
  ["firm_admin", "firm_owner", "saas_owner", "super_admin", "manager"].includes(
    (role || "").toLowerCase()
  );

const mapRoleToFirmUserRole = (role?: string) => {
  const normalized = (role || "").toLowerCase();
  if (["firm_admin", "firm_owner", "manager"].includes(normalized)) {
    return "manager";
  }
  return "staff";
};

router.use(requireAuthHybrid);

router.get("/users/me", async (req, res) => {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const [firmUser] = user.firmId
    ? await db
        .select()
        .from(firmUsers)
        .where(and(eq(firmUsers.userId, user.id), eq(firmUsers.firmId, user.firmId)))
    : [];

  res.json({
    ...user,
    modulePermissions: firmUser?.permissions || [],
  });
});

router.get("/users/role/staff", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const staff = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      firmId: users.firmId,
      clientId: users.clientId,
    })
    .from(users)
    .where(
      and(
        eq(users.firmId, user.firmId),
        inArray(users.role, ["firm_user", "firm_admin", "firm_owner", "manager"])
      )
    );

  res.json(staff);
});

router.get("/user-permissions", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const permissions = await db
    .select({
      id: firmUsers.id,
      userId: firmUsers.userId,
      firmId: firmUsers.firmId,
      role: firmUsers.role,
      modules: firmUsers.permissions,
      userName: users.name,
      userEmail: users.email,
    })
    .from(firmUsers)
    .leftJoin(users, eq(firmUsers.userId, users.id))
    .where(eq(firmUsers.firmId, user.firmId));

  res.json(permissions);
});

router.post("/user-permissions", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const { userId, modules, role } = req.body || {};
  if (!userId || !Array.isArray(modules)) {
    return res.status(400).json({ message: "userId and modules are required" });
  }

  const sanitizedModules = modules.filter((key: string) => MODULE_KEYS.includes(key));
  const firmRole = ["admin", "manager", "senior", "staff", "intern"].includes(role)
    ? role
    : mapRoleToFirmUserRole(user.role);

  const [existing] = await db
    .select()
    .from(firmUsers)
    .where(and(eq(firmUsers.userId, userId), eq(firmUsers.firmId, user.firmId)));

  if (existing) {
    const [updated] = await db
      .update(firmUsers)
      .set({ permissions: sanitizedModules, updatedAt: new Date(), role: firmRole })
      .where(eq(firmUsers.id, existing.id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(firmUsers)
    .values({
      userId,
      firmId: user.firmId,
      role: firmRole,
      permissions: sanitizedModules,
    })
    .returning();

  res.status(201).json(created);
});

router.patch("/user-permissions/:userId", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const userId = Number(req.params.userId);
  const { modules } = req.body || {};
  if (!userId || !Array.isArray(modules)) {
    return res.status(400).json({ message: "modules array is required" });
  }

  const sanitizedModules = modules.filter((key: string) => MODULE_KEYS.includes(key));

  const [existing] = await db
    .select()
    .from(firmUsers)
    .where(and(eq(firmUsers.userId, userId), eq(firmUsers.firmId, user.firmId)));

  if (!existing) {
    const [created] = await db
      .insert(firmUsers)
      .values({
        userId,
        firmId: user.firmId,
        role: mapRoleToFirmUserRole(user.role),
        permissions: sanitizedModules,
      })
      .returning();
    return res.status(201).json(created);
  }

  const [updated] = await db
    .update(firmUsers)
    .set({ permissions: sanitizedModules, updatedAt: new Date() })
    .where(eq(firmUsers.id, existing.id))
    .returning();

  res.json(updated);
});

router.get("/staff-assignments", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const assignments = await db
    .select({
      id: clientAssignments.id,
      staffId: clientAssignments.userId,
      clientId: clientAssignments.clientId,
      firmId: clientAssignments.firmId,
      role: clientAssignments.role,
      permissions: clientAssignments.permissions,
      staffName: users.name,
      clientName: clients.name,
    })
    .from(clientAssignments)
    .leftJoin(users, eq(clientAssignments.userId, users.id))
    .leftJoin(clients, eq(clientAssignments.clientId, clients.id))
    .where(eq(clientAssignments.firmId, user.firmId));

  res.json(assignments);
});

router.post("/staff-assignments", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const {
    staffId,
    clientId,
    canViewFinancials,
    canEditTransactions,
    canManageAuditFiles,
    canViewInvoices,
    canCreateInvoices,
    isClientManager,
  } = req.body || {};

  if (!staffId || !clientId) {
    return res.status(400).json({ message: "staffId and clientId are required" });
  }

  const assignmentPermissions = [
    canViewFinancials ? "view_financials" : null,
    canEditTransactions ? "edit_transactions" : null,
    canManageAuditFiles ? "manage_audit_files" : null,
    canViewInvoices ? "view_invoices" : null,
    canCreateInvoices ? "create_invoices" : null,
    isClientManager ? "client_manager" : null,
  ].filter(Boolean) as string[];

  const [created] = await db
    .insert(clientAssignments)
    .values({
      userId: staffId,
      clientId,
      firmId: user.firmId,
      role: isClientManager ? "manager" : "staff",
      permissions: assignmentPermissions,
    })
    .returning();

  res.status(201).json(created);
});

router.delete("/staff-assignments/:id", async (req, res) => {
  const user = req.user as any;
  if (!user?.firmId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const assignmentId = Number(req.params.id);
  if (!assignmentId) {
    return res.status(400).json({ message: "Assignment id is required" });
  }

  await db.delete(clientAssignments).where(eq(clientAssignments.id, assignmentId));
  res.json({ success: true });
});

export default router;
