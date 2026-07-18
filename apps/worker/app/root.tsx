import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./auth";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Spectrum Sweepstakes</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  );
}

// Required in SPA mode (ssr: false): shown during the initial client hydration
// before any route's clientLoader has resolved.
export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <div className="animate-pulse text-sm tracking-wide">Loading Spectrum Sweepstakes…</div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">{message}</p>
    </div>
  );
}
