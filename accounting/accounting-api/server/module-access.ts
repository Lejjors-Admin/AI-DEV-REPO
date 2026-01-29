import { and, eq } from "drizzle-orm";
import { firmUsers } from "../shared/schema";
import { db } from "./db";
import { Request, Response, NextFunction } from "express";

const MODULE_DEPENDENCIES: Record<string, string[]> = {
  clients: ["projects", "tasks", "time-expenses", "billing", "reports"],
  projects: ["tasks", "time-expenses", "billing", "calendar"],
  tasks: ["time-expenses", "calendar", "reports"],
  calendar: ["tasks", "projects"],
  reports: ["dashboard"],
  practice: ["reports", "dashboard"],
};

export const isAdminRole = (role?: string) =>
  ["firm_admin", "firm_owner", "saas_owner", "super_admin", "manager", "admin"].includes(
    (role || "").toLowerCase()
  );

export async function hasModuleAccess(user: any, moduleKey: string) {
  if (!user?.firmId) return false;
  if (isAdminRole(user.role)) return true;

  const [firmUser] = await db
    .select()
    .from(firmUsers)
    .where(and(eq(firmUsers.userId, user.id), eq(firmUsers.firmId, user.firmId)));

  const modules = Array.isArray(firmUser?.permissions) ? firmUser.permissions : [];
  if (modules.includes(moduleKey)) return true;

  const deps = MODULE_DEPENDENCIES[moduleKey] || [];
  return deps.some((key) => modules.includes(key));
}

export const requireModuleAccess = (moduleKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const allowed = await hasModuleAccess(user, moduleKey);
    if (!allowed) {
      return res.status(403).json({ message: "Insufficient module access" });
    }

    next();
  };
};
