import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ShieldCheck, TriangleAlert, Lock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hashPassword } from "@/lib/keylinks";
import { presenceProps, EASE } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";

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
  const reduce = useReducedMotion();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id, label, password_hash, max_uses, use_count, expires_at, disabled")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        setState({ kind: "invalid" });
        return;
      }
      if (data.disabled) {
        setState({ kind: "disabled" });
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setState({ kind: "expired" });
        return;
      }
      if (data.max_uses !== null && data.use_count >= data.max_uses) {
        setState({ kind: "used" });
        return;
      }
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
      const { data, error } = await (supabase as any).rpc("redeem_link", {
        _slug: slug,
        _password_hash: ph,
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("wrong_password")) toast.error("Wrong password");
        else if (msg.includes("expired")) {
          toast.error("Link expired");
          setState({ kind: "expired" });
        } else if (msg.includes("used")) {
          toast.error("Link fully used");
          setState({ kind: "used" });
        } else if (msg.includes("disabled")) {
          toast.error("Link disabled");
          setState({ kind: "disabled" });
        } else if (msg.includes("invalid")) {
          toast.error("Invalid link");
          setState({ kind: "invalid" });
        } else toast.error(error.message || "Could not reveal code");
        return;
      }
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row?.code) {
        toast.error("Could not reveal code");
        return;
      }
      setState({
        kind: "ready",
        meta: state.meta,
        revealed: row.code,
        remaining: row.remaining_uses ?? null,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Could not reveal code");
    } finally {
      setBusy(false);
    }
  }

  const stateKey = state.kind === "ready" ? (state.revealed ? "revealed" : "ready") : state.kind;

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[420px]" />
      <SiteHeader />

      <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={stateKey} className="w-full" {...presenceProps(reduce)}>
            {state.kind === "loading" && (
              <div className="glass-card w-full overflow-hidden rounded-3xl p-6 sm:p-8">
                <div className="shimmer mx-auto h-12 w-12 rounded-2xl" />
                <div className="shimmer mx-auto mt-5 h-7 w-3/4 rounded-lg" />
                <div className="shimmer mx-auto mt-3 h-4 w-1/2 rounded-lg" />
                <div className="shimmer mt-8 h-12 w-full rounded-xl" />
              </div>
            )}

            {state.kind === "invalid" && (
              <MessageCard
                icon={<TriangleAlert className="h-6 w-6" />}
                title="Invalid link"
                body="This redeem link doesn't exist."
              />
            )}
            {state.kind === "expired" && (
              <MessageCard
                icon={<TriangleAlert className="h-6 w-6" />}
                title="Link expired"
                body="This link has passed its expiry date."
              />
            )}
            {state.kind === "used" && (
              <MessageCard
                icon={<TriangleAlert className="h-6 w-6" />}
                title="Fully redeemed"
                body="This link has reached its maximum uses."
              />
            )}
            {state.kind === "disabled" && (
              <MessageCard
                icon={<TriangleAlert className="h-6 w-6" />}
                title="Link disabled"
                body="This link is no longer active."
              />
            )}

            {state.kind === "ready" && !state.revealed && (
              <div className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
                <motion.div
                  initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"
                >
                  <Sparkles className="h-7 w-7" />
                </motion.div>
                {state.meta.label && (
                  <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {state.meta.label}
                  </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  You've received a redeem code
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Tap reveal to see your code.
                  {state.meta.maxUses &&
                    ` ${state.meta.maxUses - state.meta.useCount} of ${state.meta.maxUses} uses remaining.`}
                </p>
                {state.meta.hasPassword && (
                  <div className="mt-6 text-left">
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                      <Lock className="h-3.5 w-3.5" />
                      Password required
                    </label>
                    <Input
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="Enter password"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") reveal();
                      }}
                    />
                  </div>
                )}
                <Button
                  size="lg"
                  onClick={reveal}
                  disabled={busy}
                  className="mt-6 h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-glow)]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Revealing…
                    </>
                  ) : (
                    "Reveal code"
                  )}
                </Button>
                <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Secured by keylinks
                </p>
              </div>
            )}

            {state.kind === "ready" && state.revealed && (
              <div className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
                <motion.div
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "color-mix(in oklab, var(--success) 20%, transparent)" }}
                >
                  <ShieldCheck className="h-7 w-7" style={{ color: "var(--success)" }} />
                </motion.div>
                <h1 className="text-2xl font-bold tracking-tight">Here's your code</h1>
                <p className="mt-1 text-sm text-muted-foreground">Save it somewhere safe.</p>
                <motion.div
                  initial={reduce ? false : { opacity: 0, filter: "blur(8px)", scale: 0.96 }}
                  animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                  className="mt-6 select-all break-all rounded-2xl border border-dashed border-primary/40 bg-background/60 p-5 font-mono text-lg sm:text-xl"
                >
                  {state.revealed}
                </motion.div>
                <Button
                  size="lg"
                  className="mt-4 h-12 w-full rounded-xl text-base font-semibold"
                  onClick={async () => {
                    await navigator.clipboard.writeText(state.revealed!);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy code
                </Button>
                {state.remaining !== null && state.remaining !== undefined && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {state.remaining} use{state.remaining === 1 ? "" : "s"} remaining after this.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function MessageCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
      <div
        className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: "color-mix(in oklab, var(--destructive) 18%, transparent)",
          color: "var(--destructive)",
        }}
      >
        {icon}
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link
        to="/"
        className="press mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
      >
        Create your own link
      </Link>
    </div>
  );
}
