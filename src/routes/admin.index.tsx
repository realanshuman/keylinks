import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

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
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
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
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-md px-5 pt-8 sm:pt-16 sm:px-6">
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Admin only</div>
          <h1 className="text-2xl font-semibold tracking-tight">{mode === "in" ? "Sign in" : "Create admin account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Access the admin dashboard." : "The first account becomes the admin."}</p>
          <div className="mt-6 grid gap-4">
            <div>
              <Label className="mb-1.5 block text-sm">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button size="lg" onClick={submit} disabled={busy} className="mt-1 h-11 rounded-xl">{busy ? "…" : mode === "in" ? "Sign in" : "Create account"}</Button>
            <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-center text-xs text-muted-foreground hover:text-foreground">
              {mode === "in" ? "No account yet? Create the admin account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
