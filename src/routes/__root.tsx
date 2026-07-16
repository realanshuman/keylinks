import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { FadeUp } from "../components/motion";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[420px]" />
      <FadeUp className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-8 text-center sm:p-10">
          <div className="gradient-text text-7xl font-extrabold tracking-tight sm:text-8xl">
            404
          </div>
          <p className="mt-3 text-sm text-muted-foreground">This page doesn't exist.</p>
          <div className="mt-8">
            <Link
              to="/"
              className="press inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Go home
            </Link>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "root" });
  }, [error]);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[420px]" />
      <FadeUp className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-8 text-center sm:p-10">
          <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">Try again or head back home.</p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="press inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="press inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "keylinks — Turn codes into secure redeem links" },
      {
        name: "description",
        content:
          "Turn any activation code, coupon or license key into a beautiful, secure, shareable redeem link. Free forever.",
      },
      { property: "og:title", content: "keylinks — Turn codes into secure redeem links" },
      {
        property: "og:description",
        content:
          "Turn any activation code, coupon or license key into a beautiful, secure, shareable redeem link. Free forever.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "keylinks — Turn codes into secure redeem links" },
      {
        name: "twitter:description",
        content:
          "Turn any activation code, coupon or license key into a beautiful, secure, shareable redeem link. Free forever.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6cfa014c-1562-49b6-947e-7ce6dc2e918c/id-preview-e2b30c2a--73d701b2-dd9f-4c58-bce2-c6bbdd88dfcf.lovable.app-1784161457388.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6cfa014c-1562-49b6-947e-7ce6dc2e918c/id-preview-e2b30c2a--73d701b2-dd9f-4c58-bce2-c6bbdd88dfcf.lovable.app-1784161457388.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `
try {
  var t = localStorage.getItem('kl-theme') || 'dark';
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        mobileOffset={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }}
      />
    </QueryClientProvider>
  );
}
