import Link from "next/link";
import { AuthCard, InviteForm } from "@/components/admin/AuthForms";
import { ROLE_LABEL, isRole } from "@/lib/roles";
import { getDb } from "@/lib/server/db";
import { sha256 } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sql = await getDb().catch(() => null);
  const valid = typeof token === "string" && token.length >= 20 && token.length <= 100;
  const [invite] =
    sql && valid
      ? await sql<{ kind: "invite" | "reset"; email: string; role: string | null }[]>`
          SELECT kind, email, role FROM admin_invites WHERE token_hash = ${sha256(token!)} AND used_at IS NULL AND expires_at > now()`
      : [];

  if (!invite) {
    return (
      <AuthCard title="Link invalid or expired">
        <p className="text-[13px] text-mist">Ask an Owner or Administrator for a new link.</p>
        <Link href="/admin/login" className="mt-4 inline-block text-[13px] text-cyan underline underline-offset-2">
          Go to sign in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title={invite.kind === "invite" ? "Join the control center" : "Reset your password"}
      subtitle={
        <>
          {invite.email}
          {invite.kind === "invite" && isRole(invite.role) && <> · {ROLE_LABEL[invite.role]}</>}
        </>
      }
    >
      <InviteForm token={token!} kind={invite.kind} />
    </AuthCard>
  );
}
