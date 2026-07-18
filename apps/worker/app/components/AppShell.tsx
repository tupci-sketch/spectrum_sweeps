import { NavLink, useLocation } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import { BrandWordmark } from "./Brand";
import { useAuth } from "../auth";

// Left-sidebar shell from the concept mockups. Only real destinations are
// linkable; features from later phases (spin-wheel animation, polls) are shown
// dimmed as "soon" so the shell reflects the roadmap without faking function.

function IconTrophy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}
function IconWheel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
    </svg>
  );
}
function IconPoll() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3z" />
    </svg>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-muted hover:bg-surface-2 hover:text-ink"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function SoonItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-faint" title="Coming soon">
      {icon}
      <span>{label}</span>
      <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">soon</span>
    </div>
  );
}

function UserChip() {
  const { user, loading, logout } = useAuth();
  if (loading) return null;
  return (
    <div className="mx-3 mt-3">
      {user ? (
        <div className="rounded-xl border border-border bg-surface-2/40 p-3">
          <p className="truncate text-sm font-medium text-ink">{user.nickname}</p>
          <p className="text-xs text-muted">
            {user.accountType} · L{user.level}
          </p>
          <button onClick={() => logout()} className="mt-1 text-xs text-brand hover:underline">Log out</button>
        </div>
      ) : (
        <NavLink to="/login" className="block rounded-lg bg-brand px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-hi">
          Log in / Register
        </NavLink>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-border bg-surface/60 lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <NavLink to="/"><BrandWordmark /></NavLink>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavItem to="/" icon={<IconTrophy />} label="Leagues" />
          <SoonItem icon={<IconWheel />} label="Spin Wheel" />
          <SoonItem icon={<IconPoll />} label="Polls" />
          <NavItem to="/admin" icon={<IconShield />} label="Admin" />
        </nav>
        <UserChip />
        <div className="m-3 mt-0 rounded-xl border border-border bg-gradient-to-b from-brand-lo/30 to-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Provably fair</p>
          <p className="mt-1 text-xs text-muted">
            Every draw is random, recorded, and verifiable against a published seed.
          </p>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <MobileNav />

      {/* Content */}
      <main key={location.pathname} className="spectrum-glow min-h-screen">
        {children}
      </main>
    </div>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3">
        <NavLink to="/"><BrandWordmark compact /></NavLink>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-ink"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          )}
        </button>
      </div>

      {open && (
        <nav className="border-b border-border bg-surface px-3 py-3">
          <NavItem to="/" icon={<IconTrophy />} label="Leagues" />
          <SoonItem icon={<IconWheel />} label="Spin Wheel" />
          <SoonItem icon={<IconPoll />} label="Polls" />
          <NavItem to="/admin" icon={<IconShield />} label="Admin" />
          <div className="mt-2 border-t border-border pt-3">
            {user ? (
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-muted">{user.nickname} · L{user.level}</span>
                <button onClick={() => logout()} className="text-sm text-brand">Log out</button>
              </div>
            ) : (
              <NavLink to="/login" className="block rounded-lg bg-brand px-3 py-2 text-center text-sm font-medium text-white">
                Log in / Register
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
