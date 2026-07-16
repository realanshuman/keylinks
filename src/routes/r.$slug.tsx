import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ShieldCheck, TriangleAlert, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hashPassword } from "@/lib/keylinks";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/r/$slug")({
  component: RedeemPage,
});

type Meta = {
  label: string | null;
  hasPassword: boolean;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "invalid" | "expired" | "used" | "disabled" }
  | { kind: "ready"; meta: Meta; revealed?: string; remaining?: number | null };

function RedeemPage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id, label, password_hash, max_uses, use_count, expires_at, disabled")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) { setState({ kind: "invalid" }); return; }
      if (data.disabled) { setState({ kind: "disabled" }); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setState({ kind: "expired" }); return; }
      if (data.max_uses !== null && data.use_count >= data.max_uses) { setState({ kind: "used" }); return; }
      setState({
        kind: "ready",
        meta: {
          label: data.label,
          hasPassword: !!data.password_hash,
          maxUses: data.max_uses,
          useCount: data.use_count,
          expiresAt: data.expires_at,
        },
      });
      await supabase.from("activity_logs").insert({ action: "viewed", link_id: data.id });
    })();
  }, [slug]);

  async function reveal() {
    if (state.kind !== "ready") return;
    setBusy(true);
    try {
      const ph = state.meta.hasPassword ? await hashPassword(pw) : null;
      const { data, error } = await supabase.rpc("redeem_link", { _slug: slug, _password_hash: ph } as any);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("wrong_password")) toast.error("Wrong password");
        else if (msg.includes("expired")) { toast.error("Link expired"); setState({ kind: "expired" }); }
        else if (msg.includes("used")) { toast.error("Link fully used"); setState({ kind: "used" }); }
        else if (msg.includes("disabled")) { toast.error("Link disabled"); setState({ kind: "disabled" }); }
        else if (msg.includes("invalid")) { toast.error("Invalid link"); setState({ kind: "invalid" }); }
        else toast.error(error.message || "Could not reveal code");
        return;
      }
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row?.code) { toast.error("Could not reveal code"); return; }
      setState({ kind: "ready", meta: state.meta, revealed: row.code, remaining: row.remaining_uses ?? null });
    } catch (e: any) {
      toast.error(e.message ?? "Could not reveal code");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="hero-glow absolute inset-x-0 top-0 h-[420px] -z-10" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-xl flex-col items-center px-5 pt-6 pb-16 sm:px-6 sm:pt-12">
        {state.kind === "loading" && <div className="glass-card h-64 w-full animate-pulse rounded-3xl" />}

        {state.kind === "invalid" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Invalid link" body="This redeem link doesn't exist." />}
        {state.kind === "expired" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Link expired" body="This link has passed its expiry date." />}
        {state.kind === "used" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Fully redeemed" body="This link has reached its maximum uses." />}
        {state.kind === "disabled" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Link disabled" body="This link is no longer active." />}

        {state.kind === "ready" && !state.revealed && (
          <div className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            {state.meta.label && <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{state.meta.label}</div>}
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">You've received a redeem code</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Tap reveal to see your code.
              {state.meta.maxUses && ` ${state.meta.maxUses - state.meta.useCount} of ${state.meta.maxUses} uses remaining.`}
            </p>
            {state.meta.hasPassword && (
              <div className="mt-6 text-left">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Lock className="h-3.5 w-3.5" />Password required</label>
                <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" onKeyDown={e => { if (e.key === "Enter") reveal(); }} />
              </div>
            )}
            <Button size="lg" onClick={reveal} disabled={busy} className="mt-6 h-12 w-full rounded-xl text-base font-semibold">
              {busy ? "Revealing…" : "Reveal code"}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">Secured by keylinks</p>
          </div>
        )}

        {state.kind === "ready" && state.revealed && (
          <div className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--success) 20%, transparent)" }}>
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--success)" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Here's your code</h1>
            <p className="mt-1 text-sm text-muted-foreground">Save it somewhere safe.</p>
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-5 font-mono text-lg break-all sm:text-xl">
              {state.revealed}
            </div>
            <Button size="lg" className="mt-4 h-12 w-full rounded-xl" onClick={async () => { await navigator.clipboard.writeText(state.revealed!); toast.success("Copied"); }}>
              <Copy className="mr-2 h-4 w-4" /> Copy code
            </Button>
            {state.remaining !== null && state.remaining !== undefined && (
              <p className="mt-4 text-xs text-muted-foreground">{state.remaining} use{state.remaining === 1 ? "" : "s"} remaining after this.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MessageCard({ tone, icon, title, body }: { tone: "error" | "ok"; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card w-full rounded-3xl p-8 text-center">
      <div
        className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: tone === "error" ? "color-mix(in oklab, var(--destructive) 18%, transparent)" : "color-mix(in oklab, var(--success) 18%, transparent)",
          color: tone === "error" ? "var(--destructive)" : "var(--success)",
        }}
      >
        {icon}
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Create your own link</Link>
    </div>
  );
}
