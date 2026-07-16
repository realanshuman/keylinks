import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, KeyRound, ShieldCheck, TriangleAlert, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hashPassword } from "@/lib/keylinks";

export const Route = createFileRoute("/r/$slug")({
  component: RedeemPage,
});

type LinkRow = {
  id: string;
  slug: string;
  code: string;
  label: string | null;
  password_hash: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  disabled: boolean;
};

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "used" }
  | { kind: "disabled" }
  | { kind: "ready"; link: LinkRow; revealed?: string };

function RedeemPage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("links").select("*").eq("slug", slug).maybeSingle();
      if (error || !data) { setState({ kind: "invalid" }); return; }
      const link = data as LinkRow;
      if (link.disabled) { setState({ kind: "disabled" }); return; }
      if (link.expires_at && new Date(link.expires_at) < new Date()) { setState({ kind: "expired" }); return; }
      if (link.max_uses !== null && link.use_count >= link.max_uses) { setState({ kind: "used" }); return; }
      setState({ kind: "ready", link });
      await supabase.from("activity_logs").insert({ action: "viewed", link_id: link.id });
    })();
  }, [slug]);

  async function reveal() {
    if (state.kind !== "ready") return;
    const link = state.link;
    setBusy(true);
    try {
      if (link.password_hash) {
        const h = await hashPassword(pw);
        if (h !== link.password_hash) { toast.error("Wrong password"); setBusy(false); return; }
      }
      // increment usage
      const { data: updated, error } = await supabase
        .from("links")
        .update({ use_count: link.use_count + 1 })
        .eq("id", link.id)
        .select("code")
        .single();
      if (error) throw error;
      await supabase.from("redemptions").insert({ link_id: link.id, user_agent: navigator.userAgent });
      await supabase.from("activity_logs").insert({ action: "redeemed", link_id: link.id });
      setState({ kind: "ready", link: { ...link, use_count: link.use_count + 1 }, revealed: updated!.code });
    } catch (e: any) {
      toast.error(e.message ?? "Could not reveal code");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><KeyRound className="h-4 w-4" /></span>
          keylinks
        </Link>
      </header>

      <main className="mx-auto flex max-w-xl flex-col items-center px-6 pt-12">
        {state.kind === "loading" && <div className="glass-card h-56 w-full animate-pulse rounded-2xl" />}

        {state.kind === "invalid" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Invalid Link" body="This redeem link doesn't exist." />}
        {state.kind === "expired" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Link Expired" body="This link has passed its expiry date." />}
        {state.kind === "used" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Already Used" body="This link has reached its maximum uses." />}
        {state.kind === "disabled" && <MessageCard tone="error" icon={<TriangleAlert className="h-6 w-6" />} title="Link Disabled" body="This link is no longer active." />}

        {state.kind === "ready" && !state.revealed && (
          <div className="glass-card w-full rounded-2xl p-8 text-center">
            {state.link.label && <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{state.link.label}</div>}
            <h1 className="text-3xl font-semibold tracking-tight">Redeem Your Code</h1>
            <p className="mt-2 text-sm text-muted-foreground">Click reveal to see your code. {state.link.max_uses && `${state.link.max_uses - state.link.use_count} of ${state.link.max_uses} uses remaining.`}</p>
            {state.link.password_hash && (
              <div className="mt-6 text-left">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Lock className="h-3.5 w-3.5" />Password required</label>
                <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" />
              </div>
            )}
            <Button size="lg" onClick={reveal} disabled={busy} className="mt-6 h-12 w-full rounded-xl text-base">
              {busy ? "Revealing…" : "Reveal Code"}
            </Button>
          </div>
        )}

        {state.kind === "ready" && state.revealed && (
          <div className="glass-card w-full rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--success) 20%, transparent)" }}>
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--success)" }} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Here's your code</h1>
            <p className="mt-1 text-sm text-muted-foreground">Save it somewhere safe.</p>
            <div className="mt-6 rounded-xl border border-border bg-background/60 p-5 font-mono text-lg break-all">
              {state.revealed}
            </div>
            <Button variant="secondary" className="mt-4" onClick={async () => { await navigator.clipboard.writeText(state.revealed!); toast.success("Copied"); }}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy code
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function MessageCard({ tone, icon, title, body }: { tone: "error" | "ok"; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card w-full rounded-2xl p-8 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: tone === "error" ? "color-mix(in oklab, var(--destructive) 18%, transparent)" : "color-mix(in oklab, var(--success) 18%, transparent)", color: tone === "error" ? "var(--destructive)" : "var(--success)" }}>
        {icon}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Create your own link</Link>
    </div>
  );
}
