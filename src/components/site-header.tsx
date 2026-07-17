import type { ReactNode } from "react";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Clean top navigation. Left: logo. Center: optional slot. Right: actions + theme.
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
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
