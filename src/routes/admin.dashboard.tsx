import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Search, Trash2, Ban, RotateCcw, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

type LinkRow = {
  id: string; slug: string; label: string | null; code: string; created_at: string;
  expires_at: string | null; max_uses: number | null; use_count: number; disabled: boolean;
};

function Dashboard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "used" | "disabled">("all");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/admin", replace: true }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id);
      if (!roles || roles.length === 0) { toast.error("Not an admin"); await supabase.auth.signOut(); navigate({ to: "/admin", replace: true }); return; }
      await load();
      setReady(true);
    })();
  }, [navigate]);

  async function load() {
    const { data, error } = await supabase.from("links").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error(error.message); return; }
    setLinks((data as LinkRow[]) || []);
  }

  const stats = useMemo(() => {
    const now = Date.now();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const total = links.length;
    const todayCount = links.filter(l => new Date(l.created_at) >= today).length;
    const active = links.filter(l => !l.disabled && (!l.expires_at || new Date(l.expires_at).getTime() > now) && (l.max_uses === null || l.use_count < l.max_uses)).length;
    const expired = links.filter(l => l.expires_at && new Date(l.expires_at).getTime() <= now).length;
    const disabled = links.filter(l => l.disabled).length;
    const totalRedemptions = links.reduce((a, l) => a + l.use_count, 0);
    return { total, todayCount, active, expired, disabled, totalRedemptions };
  }, [links]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return links.filter(l => {
      if (q && !(l.slug.includes(q) || (l.label ?? "").toLowerCase().includes(q.toLowerCase()) || l.code.toLowerCase().includes(q.toLowerCase()))) return false;
      const isExpired = l.expires_at && new Date(l.expires_at).getTime() <= now;
      const isUsed = l.max_uses !== null && l.use_count >= l.max_uses;
      const isActive = !l.disabled && !isExpired && !isUsed;
      if (filter === "active") return isActive;
      if (filter === "expired") return isExpired;
      if (filter === "used") return isUsed;
      if (filter === "disabled") return l.disabled;
      return true;
    });
  }, [links, q, filter]);

  async function toggleDisabled(l: LinkRow) {
    const { error } = await supabase.from("links").update({ disabled: !l.disabled }).eq("id", l.id);
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ action: l.disabled ? "enabled" : "disabled", link_id: l.id });
    toast.success(l.disabled ? "Enabled" : "Disabled");
    load();
  }
  async function remove(l: LinkRow) {
    if (!confirm("Delete this link permanently?")) return;
    const { error } = await supabase.from("links").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ action: "deleted", meta: { slug: l.slug } });
    toast.success("Deleted");
    load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin", replace: true });
  }

  if (!ready) return <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen">
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Logo />
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">Admin</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1 h-3.5 w-3.5" />Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total links" value={stats.total} />
          <Stat label="Today" value={stats.todayCount} />
          <Stat label="Redemptions" value={stats.totalRedemptions} />
          <Stat label="Active" value={stats.active} />
          <Stat label="Expired" value={stats.expired} />
          <Stat label="Disabled" value={stats.disabled} />
        </div>

        <div className="mt-8 glass-card rounded-2xl p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by slug, label or code" className="pl-9" />
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
              {(["all", "active", "expired", "used", "disabled"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs capitalize transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/70"}`}>{f}</button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Slug</th>
                  <th className="px-3 py-2.5">Label</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Uses</th>
                  <th className="px-3 py-2.5">Expires</th>
                  <th className="px-3 py-2.5">Created</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No links match.</td></tr>
                )}
                {filtered.map(l => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2.5 font-mono text-xs"><a target="_blank" rel="noreferrer" href={`/r/${l.slug}`} className="hover:underline">/r/{l.slug}</a></td>
                    <td className="px-3 py-2.5">{l.label ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-xs truncate max-w-[160px]">{l.code}</td>
                    <td className="px-3 py-2.5">{l.use_count}{l.max_uses ? ` / ${l.max_uses}` : ""}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Never"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => toggleDisabled(l)} title={l.disabled ? "Enable" : "Disable"} className="rounded-md p-1.5 hover:bg-accent">
                          {l.disabled ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => remove(l)} title="Delete" className="rounded-md p-1.5 hover:bg-destructive/20 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.length === 0 && <div className="rounded-xl border border-border px-3 py-10 text-center text-sm text-muted-foreground">No links match.</div>}
            {filtered.map(l => (
              <div key={l.id} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <a target="_blank" rel="noreferrer" href={`/r/${l.slug}`} className="truncate font-mono text-xs hover:underline">/r/{l.slug}</a>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/r/${l.slug}`); toast.success("Copied"); }} className="rounded-md p-1.5 hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
                    <a href={`/r/${l.slug}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" /></a>
                    <button onClick={() => toggleDisabled(l)} className="rounded-md p-1.5 hover:bg-accent">{l.disabled ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}</button>
                    <button onClick={() => remove(l)} className="rounded-md p-1.5 hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="truncate text-sm">{l.label ?? <span className="text-muted-foreground">No label</span>}</div>
                <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{l.code}</div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Uses: {l.use_count}{l.max_uses ? ` / ${l.max_uses}` : ""}</span>
                  <span>Expires: {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Never"}</span>
                  <span>Created: {new Date(l.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
