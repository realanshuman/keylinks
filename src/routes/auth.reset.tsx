import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeUp } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/auth/reset")({
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and fires PASSWORD_RECOVERY / SIGNED_IN
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
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
            <h1
              className="text-[26px] font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Set a new password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {ready
                ? "Choose a strong password you'll remember."
                : "Verifying reset link…"}
            </p>

            {ready && (
              <form className="mt-6 grid gap-4" onSubmit={submit}>
                <PasswordField id="pw" label="New password" value={password} onChange={setPassword} />
                <PasswordField id="pw2" label="Confirm password" value={confirm} onChange={setConfirm} />
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="mt-1 h-12 rounded-xl font-semibold"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
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

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <KeyRound className="h-4 w-4" />
        </span>
        <Input
          id={id}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          minLength={6}
          required
          className="pl-9"
        />
      </div>
    </div>
  );
}
