import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeUp } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth/reset",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your inbox for the reset link");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[420px]" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-10 sm:px-6 sm:pt-16">
        <FadeUp>
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <Link
              to="/auth"
              search={{ mode: "in" } as any}
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
            <h1
              className="text-[26px] font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {sent
                ? "We've sent a reset link if an account exists for that email."
                : "Enter your email and we'll send you a reset link."}
            </p>

            {!sent && (
              <form className="mt-6 grid gap-4" onSubmit={submit}>
                <div>
                  <Label htmlFor="email" className="mb-1.5 block text-sm">
                    Email
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="mt-1 h-12 rounded-xl font-semibold"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
              </form>
            )}
          </div>
        </FadeUp>
      </main>
      <SiteFooter />
    </div>
  );
}
