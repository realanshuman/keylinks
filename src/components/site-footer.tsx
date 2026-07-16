import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Turn any coupon, activation key or license code into a secure, beautiful, shareable redeem link. Free forever.
          </p>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-foreground text-muted-foreground">Create a link</a></li>
            <li><a href="#features" className="hover:text-foreground text-muted-foreground">Features</a></li>
            <li><a href="#how" className="hover:text-foreground text-muted-foreground">How it works</a></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</div>
          <ul className="space-y-2 text-sm">
            <li><a href="/admin" className="hover:text-foreground text-muted-foreground">Admin</a></li>
            <li><a href="mailto:hello@keylinks.app" className="hover:text-foreground text-muted-foreground">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-6 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} keylinks. Made with care. Free forever.
      </div>
    </footer>
  );
}
