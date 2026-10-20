import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, LoginForm } from "@/components/admin/AuthForms";
import { currentAdmin } from "@/lib/server/adminSession";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isDatabaseConfigured()) {
    return (
      <AuthCard title="Connect a database" subtitle="The control center stores admins, metrics and audit logs in Postgres.">
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-mist">
          <li>In Vercel, open your project → Storage → create a free <b className="text-ink">Neon Postgres</b> database and connect it.</li>
          <li>
            Make sure the variable <code className="text-ink">DATABASE_URL</code> is set, and add <code className="text-ink">ADMIN_SETUP_TOKEN</code> (a long random
            secret, 24+ characters).
          </li>
          <li>Redeploy, then open <code className="text-ink">/admin/setup</code> to create the owner account.</li>
        </ol>
        <p className="mt-4 text-[12px] text-mist/70">The public website keeps working without a database.</p>
      </AuthCard>
    );
  }
  if (await currentAdmin()) redirect("/admin");
  const sql = await getDb();
  const [{ n }] = await sql!<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_users`;
  return (
    <AuthCard title="Sign in" subtitle="Use your WEB-CREATORS admin account.">
      <LoginForm />
      {n === 0 && (
        <p className="mt-4 text-center text-[13px] text-mist">
          No admin yet?{" "}
          <Link className="text-cyan underline underline-offset-2" href="/admin/setup">
            Create the owner account
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
