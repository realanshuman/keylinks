import type { ReactNode } from "react";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Shared sticky header used on every page. Stays readable over content
 * thanks to the header-blur surface, and respects notch safe areas.
 */
export function SiteHeader({ badge, actions }: { badge?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="header-blur pt-safe sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Logo />
          {badge}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
