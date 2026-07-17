import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Clean top navigation. Left: logo. Center: optional slot. Right: actions + theme.
 * When no `actions` are provided, renders default auth-aware controls.
 */
export function SiteHeader({
  badge,
  actions,
}: {
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="header-blur pt-safe sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[68px] sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
        </div>
        {badge && (
          <div className="hidden min-w-0 items-center justify-center md:flex">{badge}</div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {actions ?? <DefaultAuthActions />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function DefaultAuthActions() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="h-9 w-24" />;

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/auth"
          search={{ mode: "in" } as any}
          className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          to="/auth"
          search={{ mode: "up" } as any}
          className="press inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  const initial = (user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative flex items-center gap-1.5">
      <Link
        to="/dashboard"
        className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold transition-colors hover:bg-accent"
        aria-label="Account"
      >
        {initial}
      </button>
      {open && (
        <div className="glass-card absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl p-1.5 text-sm shadow-[var(--shadow-raised)]">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Signed in as
            <div className="truncate text-[13px] font-medium text-foreground">{user.email}</div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent sm:hidden"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
