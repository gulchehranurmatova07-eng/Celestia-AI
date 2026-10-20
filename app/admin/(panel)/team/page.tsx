import { ActionButton } from "@/components/admin/controls";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { InviteForm, MemberActions } from "@/components/admin/TeamControls";
import { ago, utc } from "@/lib/format";
import { can, canAssignRole, isRole, ROLE_LABEL, type Role } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";

export const dynamic = "force-dynamic";

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including managing owners, purging data and the audit log.",
  admin: "Everything except managing owners and purging data.",
  support: "Monitor everything; manage errors, alerts and health checks. No settings or team changes.",
  analyst: "Read-only dashboards, analytics, request diagnostics and CSV export.",
};

export default async function TeamPage() {
  const { sql, admin } = await requirePage("team.view");
  const manage = can(admin.role, "team.manage");
  const [members, invites] = await Promise.all([
    sql<{ id: string; name: string; email: string; role: string; status: string; created_at: Date; last_login_at: Date | null; sessions: number }[]>`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login_at,
        (SELECT count(*) FROM admin_sessions s WHERE s.admin_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now())::int AS sessions
      FROM admin_users u ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'support' THEN 2 ELSE 3 END, u.created_at`,
    manage
      ? sql<{ token_hash: string; kind: string; email: string; role: string | null; expires_at: Date }[]>`
          SELECT token_hash, kind, email, role, expires_at FROM admin_invites WHERE used_at IS NULL AND expires_at > now() ORDER BY created_at DESC`
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Team & Roles"
        description="Admin accounts for this control center. There is no public registration: people join only through one-time invite links."
      />
      <Card title="Members" subtitle={`${members.length} admin account${members.length === 1 ? "" : "s"}`}>
        <Table head={["Name", "Role", "Status", "Last sign-in", "Active sessions", "Actions"]}>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <p className="text-ink">
                  {m.name}
                  {m.id === admin.id && <span className="ml-1.5 text-[11px] text-cyan">(you)</span>}
                </p>
                <p className="text-[11.5px] text-mist">{m.email}</p>
              </td>
              <td className="whitespace-nowrap">{isRole(m.role) ? ROLE_LABEL[m.role] : m.role}</td>
              <td>
                <StatusBadge status={m.status} />
              </td>
              <td className="whitespace-nowrap text-mist">{m.last_login_at ? ago(m.last_login_at) : "never"}</td>
              <td className="tabular-nums">{m.sessions}</td>
              <td>
                {manage && isRole(m.role) ? (
                  <MemberActions member={{ id: m.id, name: m.name, role: m.role, status: m.status }} actorRole={admin.role} isSelf={m.id === admin.id} />
                ) : (
                  <span className="text-[12px] text-mist">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4">
        {manage && (
          <Card title="Invite a team member">
            <InviteForm actorRole={admin.role} />
            {invites.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-mist/80">Pending links</p>
                <Table head={["Email", "Type", "Role", "Expires (UTC)", ""]}>
                  {invites.map((i) => (
                    <tr key={i.token_hash}>
                      <td>{i.email}</td>
                      <td className="text-mist">{i.kind === "invite" ? "Invite" : "Password reset"}</td>
                      <td>{i.role && isRole(i.role) ? ROLE_LABEL[i.role] : "—"}</td>
                      <td className="text-mist">{utc(i.expires_at)}</td>
                      <td>
                        {(!i.role || (isRole(i.role) && canAssignRole(admin.role, i.role))) && (
                          <ActionButton url="/api/admin/team" method="POST" body={{ action: "revoke_invite", tokenHash: i.token_hash }} className="h-8" variant="ghost">
                            Revoke
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>

      <Card className="mt-4" title="Roles & permissions" subtitle="Enforced on the server for every page and API call">
        <dl className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
            <div key={r} className="rounded-xl border border-white/[0.06] p-3">
              <dt className="text-[13px] font-medium text-ink">{ROLE_LABEL[r]}</dt>
              <dd className="mt-0.5 text-[12.5px] text-mist">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
