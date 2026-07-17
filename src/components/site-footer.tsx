export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-8 sm:pb-14 sm:pt-24">
        <h2
          aria-label="keylinks"
          className="select-none text-[22vw] font-bold leading-[0.85] tracking-[-0.06em] sm:text-[14vw] lg:text-[180px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          key<span className="gradient-text">links</span>
        </h2>
        <div className="pb-safe mt-8 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-5 text-[11px] text-muted-foreground sm:mt-10 sm:flex-row sm:items-center sm:gap-3 sm:pt-6 sm:text-xs">
          <span>© {new Date().getFullYear()} keylinks · Free forever</span>
          <span className="opacity-70">Made with care.</span>
        </div>
      </div>
    </footer>
  );
}
