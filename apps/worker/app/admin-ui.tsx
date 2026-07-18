import { useState } from "react";
import { useRevalidator } from "react-router";
import { apiErrorMessage } from "./api-client";

// Small shared building blocks for the admin forms. Each form runs a submit
// handler, then revalidates the route loader so the page reflects the change.

export function useSubmit() {
  const revalidator = useRevalidator();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, onDone?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone?.();
      revalidator.revalidate();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return { run, error, busy };
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="text-slate-400">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-ink focus:border-brand focus:outline-none"
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block text-sm">
      <span className="text-slate-400">{label}</span>
      <select
        {...props}
        className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-ink focus:border-brand focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-hi disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface/70 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-red-400">{children}</p>;
}
