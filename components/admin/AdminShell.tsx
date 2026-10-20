"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { can, ROLE_LABEL, type Permission, type Role } from "@/lib/roles";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellIcon,
  ChartIcon,
  CogIcon,
  DollarIcon,
  FileTextIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  PulseIcon,
  SidebarIcon,
  UsersIcon,
  CloseIcon,
} from "../Icons";
import { Orb } from "../Orb";

const NAV: { href: string; label: string; Icon: typeof GridIcon; perm: Permission; group: string }[] = [
  { href: "/admin", label: "Overview", Icon: GridIcon, perm: "dashboard.view", group: "Monitor" },
  { href: "/admin/ai", label: "AI Operations", Icon: ActivityIcon, perm: "requests.view", group: "Monitor" },
  { href: "/admin/errors", label: "Error Center", Icon: AlertTriangleIcon, perm: "dashboard.view", group: "Monitor" },
  { href: "/admin/health", label: "System Health", Icon: PulseIcon, perm: "dashboard.view", group: "Monitor" },
  { href: "/admin/alerts", label: "Alerts", Icon: BellIcon, perm: "dashboard.view", group: "Monitor" },
  { href: "/admin/costs", label: "Usage & Costs", Icon: DollarIcon, perm: "dashboard.view", group: "Analyze" },
  { href: "/admin/analytics", label: "Product Analytics", Icon: ChartIcon, perm: "dashboard.view", group: "Analyze" },
  { href: "/admin/team", label: "Team & Roles", Icon: UsersIcon, perm: "team.view", group: "Manage" },
  { href: "/admin/settings", label: "Settings", Icon: CogIcon, perm: "dashboard.view", group: "Manage" },
  { href: "/admin/audit", label: "Audit Log", Icon: FileTextIcon, perm: "audit.view", group: "Manage" },
];

const COLLAPSE_KEY = "celestia-admin-sidebar";

export function AdminShell({
  admin,
  openAlerts,
  children,
}: {
  admin: { name: string; email: string; role: Role };
  openAlerts: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage unavailable.
    }
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // Ignore.
      }
      return !c;
    });
  };

  const items = NAV.filter((n) => can(admin.role, n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  };

  const nav = (compact: boolean) => (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g}>
          {!compact && <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-mist/60">{g}</p>}
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={compact ? label : undefined}
                      className={`relative flex h-9 items-center gap-3 rounded-xl px-2.5 text-[13px] transition-colors ${
                        active ? "bg-electric/[0.14] text-white" : "text-mist hover:bg-white/[0.04] hover:text-white"
                      } ${compact ? "justify-center" : ""}`}
                    >
                      {active && <span className="absolute -left-3 top-2 h-5 w-[3px] rounded-r-full bg-cyan" />}
                      <Icon size={18} className="flex-none" />
                      {!compact && <span className="truncate">{label}</span>}
                      {href === "/admin/alerts" && openAlerts > 0 && (
                        <span
                          className={`${compact ? "absolute right-1 top-1" : "ml-auto"} rounded-full bg-[#d03b3b] px-1.5 text-[10px] font-semibold leading-4 text-white`}
                          aria-label={`${openAlerts} open alerts`}
                        >
                          {openAlerts}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const userBlock = (compact: boolean) => (
    <div className={`border-t border-white/[0.06] p-3 ${compact ? "flex flex-col items-center gap-2" : ""}`}>
      {!compact && (
        <div className="mb-2 min-w-0 px-1">
          <p className="truncate text-[13px] font-medium text-ink">{admin.name}</p>
          <p className="truncate text-[11px] text-mist">
            {ROLE_LABEL[admin.role]} · {admin.email}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={logout}
        title="Sign out"
        className={`flex h-9 items-center gap-2 rounded-xl px-2.5 text-[13px] text-mist transition-colors hover:bg-white/[0.04] hover:text-white ${compact ? "justify-center" : "w-full"}`}
      >
        <LogoutIcon size={17} />
        {!compact && "Sign out"}
      </button>
    </div>
  );

  const brand = (compact: boolean) => (
    <Link href="/admin" className={`flex h-16 flex-none items-center gap-2.5 border-b border-white/[0.06] px-4 ${compact ? "justify-center px-0" : ""}`}>
      <span className="grid h-9 w-10 flex-none place-items-center">
        <Orb size={26} showStar={false} className="[&_.orb-float]:animate-none" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[13px] font-bold tracking-[0.12em] text-white">
            CELESTIA <span className="text-gradient">AI</span>
          </span>
          <span className="block text-[10px] tracking-[0.18em] text-mist">CONTROL CENTER</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="admin-root text-ink">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/[0.06] bg-[#060a14]/95 backdrop-blur lg:flex ${
          collapsed ? "w-[72px]" : "w-[248px]"
        } transition-[width] duration-200`}
      >
        {brand(collapsed)}
        {nav(collapsed)}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mx-3 mb-2 flex h-8 items-center justify-center gap-2 rounded-lg text-[12px] text-mist hover:bg-white/[0.04] hover:text-white"
        >
          <SidebarIcon size={16} /> {!collapsed && "Collapse"}
        </button>
        {userBlock(collapsed)}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#060a14]/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-lg p-1.5 text-mist hover:text-white">
          <MenuIcon size={22} />
        </button>
        <span className="text-[13px] font-bold tracking-[0.12em]">
          CELESTIA <span className="text-gradient">AI</span>
        </span>
        <Link href="/admin/alerts" aria-label={`Alerts (${openAlerts} open)`} className="relative rounded-lg p-1.5 text-mist hover:text-white">
          <BellIcon size={20} />
          {openAlerts > 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#d03b3b]" />}
        </Link>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[264px] flex-col border-r border-white/[0.06] bg-[#060a14]">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="absolute right-3 top-4 rounded-lg p-1 text-mist hover:text-white">
              <CloseIcon size={18} />
            </button>
            {brand(false)}
            {nav(false)}
            {userBlock(false)}
          </aside>
        </div>
      )}

      <main className={`min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8 ${collapsed ? "lg:ml-[72px]" : "lg:ml-[248px]"} transition-[margin] duration-200`}>
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
