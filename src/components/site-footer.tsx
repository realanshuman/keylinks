/**
 * Minimal footer: no navigation, just a short byline and a giant
 * KeyLinks wordmark fading off the bottom edge of the page.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 overflow-hidden border-t border-border/60 sm:mt-32">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-baseline sm:justify-between sm:text-left">
          <p className="text-sm text-muted-foreground">
            Secure, shareable redeem links for codes, keys and coupons.
          </p>
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} KeyLinks. Free forever.
          </p>
        </div>
        <div
          aria-hidden
          className="wordmark-fade mt-10 translate-y-[0.16em] select-none text-center font-display text-[clamp(4.5rem,17.5vw,13.5rem)] font-bold leading-[0.85] tracking-tight sm:mt-14"
        >
          KeyLinks
        </div>
      </div>
    </footer>
  );
}
