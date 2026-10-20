import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, type Permission } from "../roles";
import { resolveSession, type AdminIdentity } from "./auth";
import { getDb, type Sql } from "./db";
import { SESSION_COOKIE } from "./security";

/** For server components: the signed-in admin, or null. */
export async function currentAdmin(): Promise<{ sql: Sql; admin: AdminIdentity } | null> {
  const sql = await getDb().catch(() => null);
  if (!sql) return null;
  const token = (await cookies()).get(SESSION_COOKIE())?.value;
  const admin = await resolveSession(sql, token);
  return admin ? { sql, admin } : null;
}

/** For admin pages: redirects to login (or a 403 page) unless allowed. */
export async function requirePage(permission: Permission = "dashboard.view") {
  const session = await currentAdmin();
  if (!session) redirect("/admin/login");
  if (!can(session.admin.role, permission)) redirect("/admin?denied=1");
  return session;
}
