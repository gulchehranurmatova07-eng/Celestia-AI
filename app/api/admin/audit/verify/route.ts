import { verifyAuditChain } from "@/lib/server/audit";
import { json, requireAdminApi } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireAdminApi(req, "audit.view");
  if (!g.ok) return g.res;
  return json(await verifyAuditChain(g.ctx.sql));
}
