export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-8 sm:pb-14 sm:pt-24">
        <h2
          aria-label="keylinks"
          className="select-none text-[18vw] font-bold leading-[0.85] tracking-[-0.06em] sm:text-[14vw] lg:text-[180px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          key<span className="gradient-text">links</span>
        </h2>
        <div className="pb-safe mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} keylinks · Free forever</span>
          <span className="opacity-70">Made with care.</span>
        </div>
      </div>
    </footer>
  );
}
