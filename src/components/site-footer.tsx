import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-background/40 sm:mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 md:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Turn any coupon, activation key or license code into a secure, beautiful, shareable
            redeem link. Free forever.
          </p>
        </div>
        <nav aria-label="Product">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product
          </div>
          <ul className="space-y-3 text-sm sm:space-y-2">
            <li>
              <a
                href="/"
                className="inline-block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Create a link
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="inline-block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#how"
                className="inline-block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                How it works
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Company">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company
          </div>
          <ul className="space-y-3 text-sm sm:space-y-2">
            <li>
              <a
                href="/admin"
                className="inline-block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Admin
              </a>
            </li>
            <li>
              <a
                href="mailto:hello@keylinks.app"
                className="inline-block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="pb-safe border-t border-border/60 px-6 pt-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} keylinks. Made with care. Free forever.
      </div>
    </footer>
  );
}
