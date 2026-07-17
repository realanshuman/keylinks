import type { ReactNode } from "react";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Shared sticky header used on every page: brand on the left, optional
 * centered nav on desktop, actions on the right. Stays readable over
 * content thanks to the header-blur surface and respects notch safe areas.
 */
export function SiteHeader({
  badge,
  nav,
  actions,
}: {
  badge?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="header-blur pt-safe sticky top-0 z-40">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo />
          {badge}
        </div>
        {nav ? (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {nav}
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Quiet nav link for the desktop header. */
export function HeaderNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
    >
      {children}
    </a>
  );
}
