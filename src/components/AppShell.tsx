import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ArrowLeftRight, Receipt, Globe2, User } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/international", label: "Global", icon: Globe2 },
  { to: "/more", label: "More", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <main className="flex-1 pb-24">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-5">
            {TABS.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </header>
  );
}

export function SimBanner() {
  return (
    <div className="mx-5 mb-3 rounded-md border border-amber-300/40 bg-amber-100/40 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <strong>Simulation only.</strong> No real money moves. Demo data for the Pi Banking concept.
    </div>
  );
}
