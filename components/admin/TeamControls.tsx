"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { canAssignRole, ROLE_LABEL, ROLES, type Role } from "@/lib/roles";
import { ActionButton, adminFetch, Button, CopyField, Dialog } from "./controls";

export function InviteForm({ actorRole }: { actorRole: Role }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("analyst");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const roles = ROLES.filter((r) => canAssignRole(actorRole, r));

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setLink(null);
        try {
          const data = await adminFetch("/api/admin/team", { method: "POST", body: { action: "invite", email, role } });
          setLink(String(data.url));
          setEmail("");
          start(() => router.refresh());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email to invite"
          className="admin-input w-full"
        />
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="admin-input">
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Creating…" : "Create invite link"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-[#ff9b9b]">
          {error}
        </p>
      )}
      {link && (
        <div>
          <p className="mb-1.5 text-[12.5px] text-mist">Send this one-time link privately (expires in 72 hours). It won’t be shown again.</p>
          <CopyField value={link} />
        </div>
      )}
    </form>
  );
}

export function MemberActions({
  member,
  actorRole,
  isSelf,
}: {
  member: { id: string; name: string; role: Role; status: string };
  actorRole: Role;
  isSelf: boolean;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<Role>(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const router = useRouter();
  const [, start] = useTransition();
  const url = `/api/admin/team/${member.id}`;

  if (isSelf) {
    return (
      <ActionButton
        url={url}
        body={{ action: "revoke_sessions" }}
        className="h-8"
        confirm={{ title: "Sign out everywhere?", message: "This ends all your sessions, including this one.", confirmLabel: "Sign out everywhere" }}
      >
        Sign out everywhere
      </ActionButton>
    );
  }
  if (!canAssignRole(actorRole, member.role, member.role)) return <span className="text-[12px] text-mist">—</span>;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button className="h-8" onClick={() => setRoleOpen(true)}>
        Change role
      </Button>
      <Dialog open={roleOpen} onClose={() => setRoleOpen(false)} title={`Change role for ${member.name}`}>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="admin-input w-full" aria-label="New role">
          {ROLES.filter((r) => canAssignRole(actorRole, r, member.role)).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <p className="mt-3 text-[12.5px] text-mist">Their current sessions end, and they sign in again with the new permissions.</p>
        {error && <p className="mt-2 text-[12.5px] text-[#ff9b9b]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRoleOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || newRole === member.role}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await adminFetch(url, { method: "PATCH", body: { action: "role", role: newRole, confirm: true } });
                setRoleOpen(false);
                start(() => router.refresh());
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save role
          </Button>
        </div>
      </Dialog>
      {member.status === "active" ? (
        <ActionButton
          url={url}
          body={{ action: "suspend" }}
          variant="danger"
          className="h-8"
          confirm={{ title: `Suspend ${member.name}?`, message: "They are signed out immediately and can’t sign in until reactivated.", confirmLabel: "Suspend", danger: true }}
        >
          Suspend
        </ActionButton>
      ) : (
        <ActionButton url={url} body={{ action: "reactivate" }} className="h-8">
          Reactivate
        </ActionButton>
      )}
      <ActionButton
        url={url}
        body={{ action: "revoke_sessions" }}
        className="h-8"
        confirm={{ title: `Sign ${member.name} out everywhere?`, message: "All of their active sessions end now.", confirmLabel: "Revoke sessions" }}
      >
        Revoke sessions
      </ActionButton>
      <ActionButton
        url={url}
        body={{ action: "reset_link" }}
        className="h-8"
        confirm={{ title: `Create a password-reset link for ${member.name}?`, message: "The link works once and expires in 24 hours. Their sessions end when they use it.", confirmLabel: "Create link" }}
        onResult={(d) => setLink(String(d.url))}
      >
        Reset link
      </ActionButton>
      {link && (
        <div className="mt-2 w-full">
          <CopyField value={link} />
        </div>
      )}
    </div>
  );
}

export function PasswordForm() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const mismatch = v.confirm.length > 0 && v.next !== v.confirm;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (mismatch) return;
        setBusy(true);
        setMsg(null);
        try {
          await adminFetch("/api/admin/account", { method: "POST", body: { currentPassword: v.current, newPassword: v.next } });
          setV({ current: "", next: "", confirm: "" });
          setMsg({ ok: true, text: "Password changed. Your other sessions were signed out." });
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
        } finally {
          setBusy(false);
        }
      }}
    >
      {(
        [
          ["current", "Current password", "current-password"],
          ["next", "New password (min. 12)", "new-password"],
          ["confirm", "Confirm new password", "new-password"],
        ] as const
      ).map(([k, label, ac]) => (
        <label key={k} className="block text-[12.5px] text-mist">
          {label}
          <input
            type="password"
            required
            autoComplete={ac}
            value={v[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
            className="admin-input mt-1 w-full"
          />
        </label>
      ))}
      {mismatch && <p className="text-[12px] text-[#ff9b9b]">Passwords don’t match.</p>}
      {msg && <p className={`text-[12.5px] ${msg.ok ? "text-[#3ccf6e]" : "text-[#ff9b9b]"}`}>{msg.text}</p>}
      <Button type="submit" disabled={busy || mismatch}>
        Change password
      </Button>
    </form>
  );
}
