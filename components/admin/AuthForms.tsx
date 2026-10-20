"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Orb } from "../Orb";
import { LockIcon } from "../Icons";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  account_suspended: "This account is suspended. Contact an owner.",
  too_many_attempts: "Too many failed attempts. Try again in 15 minutes.",
  invalid_setup_token: "The setup token is incorrect.",
  setup_unavailable: "Setup is no longer available.",
  invalid_or_expired: "This link is invalid or has expired. Ask an owner for a new one.",
  email_taken: "An admin with this email already exists.",
  invalid_input: "Please check the form fields.",
  database_unavailable: "Database unavailable. Check DATABASE_URL.",
  forbidden_origin: "Request blocked. Open the admin from your site’s own address.",
};

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="admin-root flex min-h-dvh items-center justify-center px-4 py-10 text-ink">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center">
            <Orb size={64} showStar={false} />
          </div>
          <p className="mt-2 text-[13px] font-bold tracking-[0.16em]">
            CELESTIA <span className="text-gradient">AI</span>
          </p>
          <p className="text-[10.5px] tracking-[0.2em] text-mist">CONTROL CENTER</p>
        </div>
        <div className="admin-card rounded-2xl p-6">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <LockIcon size={18} className="text-cyan" /> {title}
          </h1>
          {subtitle && <p className="mt-1 text-[13px] text-mist">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-6 text-center text-[11px] text-mist/70">Private area · WEB-CREATORS staff only · All actions are audited</p>
      </div>
    </div>
  );
}

function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-[13px] text-mist">
      {label}
      <input {...rest} className="admin-input mt-1.5 h-10 w-full text-[14px]" />
    </label>
  );
}

function useSubmit(url: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? MESSAGES[data.error ?? ""] ?? "Something went wrong. Try again.");
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-lg border border-[#d03b3b]/35 bg-[#d03b3b]/10 px-3 py-2 text-[13px] text-[#ffc4c4]">
      {error}
    </p>
  ) : null;
}

const submitCls =
  "btn-primary mt-1 h-10 w-full rounded-xl text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60";

export function LoginForm() {
  const { busy, error, submit } = useSubmit("/api/admin/auth/login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit({ email, password });
      }}
    >
      <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <ErrorText error={error} />
      <button type="submit" disabled={busy} className={submitCls}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SetupForm() {
  const { busy, error, submit } = useSubmit("/api/admin/auth/setup");
  const [v, setV] = useState({ token: "", name: "", email: "", password: "", confirm: "" });
  const mismatch = v.confirm.length > 0 && v.password !== v.confirm;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mismatch) submit({ token: v.token, name: v.name, email: v.email, password: v.password });
      }}
    >
      <Field label="Setup token (ADMIN_SETUP_TOKEN)" type="password" autoComplete="off" required value={v.token} onChange={set("token")} />
      <Field label="Your name" required maxLength={80} value={v.name} onChange={set("name")} />
      <Field label="Email" type="email" autoComplete="username" required value={v.email} onChange={set("email")} />
      <Field label="Password (min. 12 characters)" type="password" autoComplete="new-password" required minLength={12} value={v.password} onChange={set("password")} />
      <Field label="Confirm password" type="password" autoComplete="new-password" required value={v.confirm} onChange={set("confirm")} />
      {mismatch && <p className="text-[12px] text-[#ff9b9b]">Passwords don’t match.</p>}
      <ErrorText error={error} />
      <button type="submit" disabled={busy || mismatch} className={submitCls}>
        {busy ? "Creating…" : "Create owner account"}
      </button>
    </form>
  );
}

export function InviteForm({ token, kind }: { token: string; kind: "invite" | "reset" }) {
  const { busy, error, submit } = useSubmit("/api/admin/auth/invite");
  const [v, setV] = useState({ name: "", password: "", confirm: "" });
  const mismatch = v.confirm.length > 0 && v.password !== v.confirm;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mismatch) submit({ token, name: v.name, password: v.password });
      }}
    >
      {kind === "invite" && <Field label="Your name" required maxLength={80} value={v.name} onChange={set("name")} />}
      <Field label="New password (min. 12 characters)" type="password" autoComplete="new-password" required minLength={12} value={v.password} onChange={set("password")} />
      <Field label="Confirm password" type="password" autoComplete="new-password" required value={v.confirm} onChange={set("confirm")} />
      {mismatch && <p className="text-[12px] text-[#ff9b9b]">Passwords don’t match.</p>}
      <ErrorText error={error} />
      <button type="submit" disabled={busy || mismatch} className={submitCls}>
        {busy ? "Saving…" : kind === "invite" ? "Join the team" : "Set new password"}
      </button>
    </form>
  );
}
