import Link from "next/link";
import { AuthCard, SetupForm } from "@/components/admin/AuthForms";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const sql = await getDb().catch(() => null);
  const count = sql ? (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_users`)[0].n : -1;
  const tokenSet = (process.env.ADMIN_SETUP_TOKEN?.trim().length ?? 0) >= 24;

  if (count !== 0 || !tokenSet) {
    return (
      <AuthCard title="Setup unavailable">
        <p className="text-[13px] leading-relaxed text-mist">
          {!sql
            ? "No database is connected yet."
            : count > 0
              ? "An owner account already exists. New admins join through invite links from Team & Roles."
              : "Set ADMIN_SETUP_TOKEN (24+ random characters) in your hosting environment and redeploy to enable one-time setup."}
        </p>
        <Link href="/admin/login" className="mt-4 inline-block text-[13px] text-cyan underline underline-offset-2">
          Go to sign in
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Create the owner account" subtitle="One-time setup. Requires the ADMIN_SETUP_TOKEN from your hosting environment.">
      <SetupForm />
    </AuthCard>
  );
}
