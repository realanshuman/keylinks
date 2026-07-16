import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeUp } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/admin/")({
  component: AdminAuth,
});

function AdminAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/admin/dashboard", replace: true });
    })();
  }, [navigate]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created — signing in…");
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      // try to claim admin (no-op if one already exists)
      await supabase.rpc("claim_admin");
      navigate({ to: "/admin/dashboard", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[420px]" />
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 pt-10 sm:px-6 sm:pt-16">
        <FadeUp>
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin only
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "in" ? "Sign in" : "Create admin account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "in"
                ? "Access the admin dashboard."
                : "The first account becomes the admin."}
            </p>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) submit();
              }}
            >
              <div>
                <Label htmlFor="admin-email" className="mb-1.5 block text-sm">
                  Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label htmlFor="admin-password" className="mb-1.5 block text-sm">
                  Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={busy}
                className="mt-1 h-12 rounded-xl font-semibold"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "in" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
                className="min-h-11 rounded-lg text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {mode === "in"
                  ? "No account yet? Create the admin account"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          </div>
        </FadeUp>
      </main>
    </div>
  );
}
