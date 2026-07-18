import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";

// Client-side gate for privileged screens. The API enforces the same rules
// server-side (this is UX, not the security boundary).
export function AuthGate({ minLevel = 1, children }: { minLevel?: number; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-muted">Checking access…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-muted">You need to be logged in to view this page.</p>
        <Link to="/login" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hi">
          Go to login
        </Link>
      </div>
    );
  }
  if (user.level < minLevel) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-semibold">Not enough access</h1>
        <p className="mt-2 text-muted">
          This area needs level {minLevel}+. You're {user.nickname} (level {user.level}).
        </p>
        <Link to="/" className="mt-4 inline-block text-brand hover:underline">Back to leagues</Link>
      </div>
    );
  }
  return <>{children}</>;
}
