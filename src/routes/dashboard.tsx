import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  Trash2,
  Ban,
  RotateCcw,
  Copy,
  ExternalLink,
  Link2,
  CalendarPlus,
  Ticket,
  CircleCheck,
  CircleX,
  Timer,
  Inbox,
  Plus,
  BarChart3,
  Eye,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedNumber, FadeUp, Stagger, StaggerItem } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildRedeemUrl } from "@/lib/keylinks";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type LinkRow = {
  id: string;
  slug: string;
  label: string | null;
  code: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  disabled: boolean;
};

type LinkStatus = "active" | "expired" | "used" | "disabled";

function statusOf(l: LinkRow, now: number): LinkStatus {
  if (l.disabled) return "disabled";
  if (l.expires_at && new Date(l.expires_at).getTime() <= now) return "expired";
  if (l.max_uses !== null && l.use_count >= l.max_uses) return "used";
  return "active";
}

const FILTERS = ["all", "active", "expired", "used", "disabled"] as const;
type Filter = (typeof FILTERS)[number];

function Dashboard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const reduce = useReducedMotion();

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth", search: { mode: "in", redirect: "/dashboard" } as any, replace: true });
        return;
      }
      setUserId(sess.session.user.id);
      await load(sess.session.user.id);
      setReady(true);
    })();
  }, [navigate]);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("created_by", uid)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return toast.error(error.message);
    const rows = (data as LinkRow[]) || [];
    setLinks(rows);
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: views } = await supabase
        .from("link_views")
        .select("link_id")
        .in("link_id", ids);
      const counts: Record<string, number> = {};
      (views || []).forEach((v: any) => {
        counts[v.link_id] = (counts[v.link_id] || 0) + 1;
      });
      setViewCounts(counts);
    }
  }

  const stats = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = links.length;
    const todayCount = links.filter((l) => new Date(l.created_at) >= today).length;
    const active = links.filter((l) => statusOf(l, now) === "active").length;
    const expired = links.filter(
      (l) => l.expires_at && new Date(l.expires_at).getTime() <= now,
    ).length;
    const disabled = links.filter((l) => l.disabled).length;
    const totalRedemptions = links.reduce((a, l) => a + l.use_count, 0);
    return { total, todayCount, active, expired, disabled, totalRedemptions };
  }, [links]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return links.filter((l) => {
      if (
        q &&
        !(
          l.slug.includes(q) ||
          (l.label ?? "").toLowerCase().includes(q.toLowerCase()) ||
          l.code.toLowerCase().includes(q.toLowerCase())
        )
      )
        return false;
      if (filter === "all") return true;
      if (filter === "expired") return !!(l.expires_at && new Date(l.expires_at).getTime() <= now);
      if (filter === "used") return l.max_uses !== null && l.use_count >= l.max_uses;
      if (filter === "disabled") return l.disabled;
      return statusOf(l, now) === "active";
    });
  }, [links, q, filter]);

  async function toggleDisabled(l: LinkRow) {
    const { error } = await supabase.from("links").update({ disabled: !l.disabled }).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success(l.disabled ? "Enabled" : "Disabled");
    if (userId) load(userId);
  }
  async function remove(l: LinkRow) {
    if (!confirm("Delete this link permanently?")) return;
    const { error } = await supabase.from("links").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (userId) load(userId);
  }

  function copyLink(l: LinkRow) {
    navigator.clipboard.writeText(buildRedeemUrl(l.slug));
    toast.success("Copied");
  }

  if (!ready) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-24 rounded-xl" />
            ))}
          </div>
          <div className="shimmer mt-8 h-96 rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[360px]" />
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <FadeUp>
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                className="text-[28px] font-bold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your <span className="gradient-text">links</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track, edit, disable or delete every redeem link you've created.
              </p>
            </div>
            <Link
              to="/"
              className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New link
            </Link>
          </div>
        </FadeUp>

        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StaggerItem>
            <Stat label="Total" value={stats.total} icon={<Link2 className="h-3.5 w-3.5" />} />
          </StaggerItem>
          <StaggerItem>
            <Stat
              label="Today"
              value={stats.todayCount}
              icon={<CalendarPlus className="h-3.5 w-3.5" />}
            />
          </StaggerItem>
          <StaggerItem>
            <Stat
              label="Redemptions"
              value={stats.totalRedemptions}
              icon={<Ticket className="h-3.5 w-3.5" />}
            />
          </StaggerItem>
          <StaggerItem>
            <Stat
              label="Active"
              value={stats.active}
              icon={<CircleCheck className="h-3.5 w-3.5" />}
            />
          </StaggerItem>
          <StaggerItem>
            <Stat label="Expired" value={stats.expired} icon={<Timer className="h-3.5 w-3.5" />} />
          </StaggerItem>
          <StaggerItem>
            <Stat
              label="Disabled"
              value={stats.disabled}
              icon={<CircleX className="h-3.5 w-3.5" />}
            />
          </StaggerItem>
        </Stagger>

        <FadeUp delay={0.15}>
          <div className="glass-card mt-6 rounded-2xl p-4 sm:mt-8 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by slug, label or code"
                  className="pl-9"
                />
              </div>
              <div
                className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
                role="tablist"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${filter === f ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {filter === f && (
                      <motion.span
                        layoutId="user-filter-pill"
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }
                        }
                        className="absolute inset-0 rounded-lg bg-primary"
                      />
                    )}
                    <span className="relative z-10">{f}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Slug</th>
                    <th className="px-3 py-2.5 font-medium">Label</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Views</th>
                    <th className="px-3 py-2.5 font-medium">Redeems</th>
                    <th className="px-3 py-2.5 font-medium">Expires</th>
                    <th className="px-3 py-2.5 font-medium">Created</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState />
                      </td>
                    </tr>
                  )}
                  {filtered.map((l) => {
                    const s = statusOf(l, Date.now());
                    return (
                      <React.Fragment key={l.id}>
                      <tr className="border-t border-border transition-colors hover:bg-accent/30">
                        <td className="px-3 py-2.5 font-mono text-xs">
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={buildRedeemUrl(l.slug)}
                            className="hover:text-primary hover:underline"
                          >
                            /r/{l.slug}
                          </a>
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5">
                          {l.label ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={s} />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                          {viewCounts[l.id] ?? 0}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {l.use_count}
                          {l.max_uses ? ` / ${l.max_uses}` : ""}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <IconAction
                              title="Analytics"
                              onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction title="Copy link" onClick={() => copyLink(l)}>
                              <Copy className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction
                              title={l.disabled ? "Enable" : "Disable"}
                              onClick={() => toggleDisabled(l)}
                            >
                              {l.disabled ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                            </IconAction>
                            <IconAction title="Delete" destructive onClick={() => remove(l)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                          </div>
                        </td>
                      </tr>
                      {expandedId === l.id && (
                        <tr className="border-t border-border bg-accent/20">
                          <td colSpan={8} className="px-3 py-4">
                            <LinkAnalyticsPanel
                              link={l}
                              viewsCount={viewCounts[l.id] ?? 0}
                            />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {filtered.length === 0 && (
                <div className="rounded-xl border border-border">
                  <EmptyState />
                </div>
              )}
              {filtered.map((l) => {
                const s = statusOf(l, Date.now());
                return (
                  <div key={l.id} className="rounded-xl border border-border bg-background/40 p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={buildRedeemUrl(l.slug)}
                        className="truncate font-mono text-xs hover:underline"
                      >
                        /r/{l.slug}
                      </a>
                      <StatusBadge status={s} />
                    </div>
                    <div className="truncate text-sm font-medium">
                      {l.label ?? <span className="font-normal text-muted-foreground">No label</span>}
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{l.code}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Views: {viewCounts[l.id] ?? 0}</span>
                      <span>
                        Redeems: {l.use_count}
                        {l.max_uses ? ` / ${l.max_uses}` : ""}
                      </span>
                      <span>
                        Expires: {l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2 border-t border-border/60 pt-3">
                      <MobileAction
                        label="Stats"
                        onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </MobileAction>
                      <MobileAction label="Copy" onClick={() => copyLink(l)}>
                        <Copy className="h-4 w-4" />
                      </MobileAction>
                      <MobileAction label="Open" href={buildRedeemUrl(l.slug)}>
                        <ExternalLink className="h-4 w-4" />
                      </MobileAction>
                      <MobileAction
                        label={l.disabled ? "Enable" : "Disable"}
                        onClick={() => toggleDisabled(l)}
                      >
                        {l.disabled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </MobileAction>
                      <MobileAction label="Delete" destructive onClick={() => remove(l)}>
                        <Trash2 className="h-4 w-4" />
                      </MobileAction>
                    </div>
                    {expandedId === l.id && (
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <LinkAnalyticsPanel link={l} viewsCount={viewCounts[l.id] ?? 0} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeUp>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-card card-hover h-full rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <AnimatedNumber value={value} className="mt-1 block text-2xl font-semibold tracking-tight" />
    </div>
  );
}

const STATUS_STYLES: Record<LinkStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)]",
  },
  expired: {
    label: "Expired",
    className: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning)]",
  },
  used: { label: "Used up", className: "bg-accent text-accent-foreground" },
  disabled: {
    label: "Disabled",
    className: "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)]",
  },
};

function StatusBadge({ status }: { status: LinkStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function IconAction({
  title,
  onClick,
  destructive,
  children,
}: {
  title: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`press rounded-md p-1.5 text-muted-foreground transition-colors ${destructive ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-accent hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function MobileAction({
  label,
  onClick,
  href,
  destructive,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const className = `press flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors ${destructive ? "text-muted-foreground hover:bg-destructive/15 hover:text-destructive" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {children}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-sm text-muted-foreground">No links yet. Create your first one.</p>
    </div>
  );
}

function DeviceIcon({ device }: { device: string | null }) {
  const d = (device || "").toLowerCase();
  if (d === "mobile") return <Smartphone className="h-3 w-3" />;
  if (d === "tablet") return <Tablet className="h-3 w-3" />;
  if (d === "bot") return <Bot className="h-3 w-3" />;
  if (d === "desktop") return <Monitor className="h-3 w-3" />;
  return <Globe className="h-3 w-3" />;
}

function countryFlag(cc: string | null): string {
  if (!cc || cc.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
}

function LinkAnalyticsPanel({
  link,
  viewsCount,
}: {
  link: { id: string; use_count: number };
  viewsCount: number;
}) {
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [v, r] = await Promise.all([
        supabase
          .from("link_views")
          .select("created_at, country, device, referrer")
          .eq("link_id", link.id)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("redemptions")
          .select("revealed_at, country, device, referrer")
          .eq("link_id", link.id)
          .order("revealed_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;
      setViews((v.data as any[]) || []);
      setRedemptions((r.data as any[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [link.id]);

  const conversion =
    viewsCount > 0 ? Math.round((link.use_count / viewsCount) * 100) : link.use_count > 0 ? 100 : 0;

  const topCountries = aggregate(views, "country").slice(0, 4);
  const topDevices = aggregate(views, "device").slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Views" value={viewsCount} icon={<Eye className="h-3.5 w-3.5" />} />
        <MiniStat label="Redeems" value={link.use_count} icon={<Ticket className="h-3.5 w-3.5" />} />
        <MiniStat label="Convert" value={`${conversion}%`} icon={<BarChart3 className="h-3.5 w-3.5" />} />
      </div>

      {(topCountries.length > 0 || topDevices.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {topCountries.length > 0 && (
            <BreakdownList
              title="Countries"
              items={topCountries.map((c) => ({
                key: c.key,
                label: `${countryFlag(c.key)} ${c.key || "Unknown"}`,
                value: c.count,
              }))}
            />
          )}
          {topDevices.length > 0 && (
            <BreakdownList
              title="Devices"
              items={topDevices.map((c) => ({
                key: c.key,
                label: c.key || "unknown",
                value: c.count,
              }))}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <EventList
          title={`Recent views (${views.length})`}
          empty={loading ? "Loading…" : "No views yet"}
          rows={views.map((v) => ({
            ts: v.created_at,
            country: v.country,
            device: v.device,
            referrer: v.referrer,
          }))}
        />
        <EventList
          title={`Recent redemptions (${redemptions.length})`}
          empty={loading ? "Loading…" : "No redemptions yet"}
          rows={redemptions.map((v) => ({
            ts: v.revealed_at,
            country: v.country,
            device: v.device,
            referrer: v.referrer,
          }))}
        />
      </div>
    </div>
  );
}

function aggregate(rows: any[], key: string): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const k = (r[key] ?? "") as string;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; label: string; value: number }>;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.key} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate">{i.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(i.value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-muted-foreground">{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventList({
  title,
  rows,
  empty,
}: {
  title: string;
  empty: string;
  rows: Array<{ ts: string; country: string | null; device: string | null; referrer: string | null }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40">
      <div className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r, i) => {
            let ref = "";
            try {
              ref = r.referrer ? new URL(r.referrer).hostname : "";
            } catch {
              ref = r.referrer || "";
            }
            return (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                  {new Date(r.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="shrink-0" title={r.country ?? "Unknown"}>
                  {countryFlag(r.country)}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
                  <DeviceIcon device={r.device} />
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {ref || <span className="opacity-60">direct</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
