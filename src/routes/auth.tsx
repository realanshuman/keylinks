import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeUp } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const search = z.object({
  mode: z.enum(["in", "up"]).optional().default("in"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/dashboard", replace: true });
    });
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      toast.success(mode === "up" ? "Account created" : "Welcome back");
      navigate({ to: redirect || "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
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
              {mode === "in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "in"
                ? "Sign in to manage your redeem links."
                : "Free forever. No credit card required."}
            </p>

            <form className="mt-6 grid gap-4" onSubmit={submit}>
              <Field
                id="email"
                label="Email"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm">
                    Password
                  </Label>
                  {mode === "in" && (
                    <Link
                      to="/auth/forgot"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
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
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "in" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="pt-1 text-center text-xs text-muted-foreground">
                {mode === "in" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "in" ? "up" : "in")}
                  className="font-medium text-foreground hover:underline"
                >
                  {mode === "in" ? "Create an account" : "Sign in"}
                </button>
              </p>
              <p className="text-center text-[11px] text-muted-foreground">
                Or{" "}
                <Link to="/" className="hover:text-foreground hover:underline">
                  continue as guest
                </Link>
              </p>
            </form>
          </div>
        </FadeUp>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  id,
  label,
  type,
  icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="pl-9"
        />
      </div>
    </div>
  );
}
