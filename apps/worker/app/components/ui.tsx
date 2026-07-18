import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface/70 p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/15 text-brand">{icon}</span>
            )}
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Gold / silver / bronze medallion for the top three, plain chip below —
// straight from the leaderboard styling in the concept mockups.
export function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-gold text-black",
    2: "bg-silver text-black",
    3: "bg-bronze text-black",
  };
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
        styles[rank] ?? "bg-surface-2 text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

export function StatTile({ label, value, accent }: { label: string; value: ReactNode; accent?: "gold" | "brand" }) {
  const valueColor = accent === "gold" ? "text-gold" : accent === "brand" ? "text-brand" : "text-ink";
  return (
    <div className="rounded-xl border border-border bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300",
    draft: "bg-surface-2 text-muted",
    draw_pending: "bg-gold/15 text-gold",
    completed: "bg-brand/15 text-brand",
    archived: "bg-surface-2 text-faint",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-surface-2 text-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function FormatTag({ formatType }: { formatType: string }) {
  const label: Record<string, string> = {
    knockout: "Knockout",
    season_long: "Season-long",
    standings: "Standings",
  };
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted">
      {label[formatType] ?? formatType}
    </span>
  );
}
