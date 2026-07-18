import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Copy,
  Download,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Loader2,
  ShieldCheck,
  Lock,
  Clock,
  Infinity as InfinityIcon,
  ArrowRight,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { makeSlug, expiryFromPreset, hashPassword, buildRedeemUrl, type ExpiryPreset } from "@/lib/keylinks";
import { FadeUp, Stagger, StaggerItem, EASE } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({
  component: Index,
});

type Generated = {
  id: string;
  slug: string;
  url: string;
  qr: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
};

function Index() {
  const [label, setLabel] = useState("");
  const [codes, setCodes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expiry, setExpiry] = useState<ExpiryPreset>("never");
  const [customExpiry, setCustomExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsesPreset, setMaxUsesPreset] = useState("unlimited");
  const [customMaxUses, setCustomMaxUses] = useState("");
  const [notes, setNotes] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Generated[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const codeList = codes
    .split(/\r?\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  const slugValid = !customSlug || /^[a-z0-9][a-z0-9-]{2,39}$/.test(customSlug);
  const canUseCustomSlug = signedIn && codeList.length <= 1 && quantity <= 1;



  async function generate() {
    if (codeList.length === 0) {
      toast.error("Please enter at least one code");
      return;
    }
    if (customSlug && !canUseCustomSlug) {
      toast.error("Custom slug only works for a single link");
      return;
    }
    if (customSlug && !slugValid) {
      toast.error("Slug must be 3–40 chars: a–z, 0–9, hyphen");
      return;
    }
    setBusy(true);
    try {
      const expiresAt = expiryFromPreset(expiry, customExpiry);
      const maxUses =
        maxUsesPreset === "unlimited"
          ? null
          : maxUsesPreset === "custom"
            ? Number(customMaxUses) || null
            : Number(maxUsesPreset);
      const passwordHash = password ? await hashPassword(password) : null;
      const { data: sess } = await supabase.auth.getSession();
      const createdBy = sess.session?.user.id ?? null;

      const rows: Array<{
        slug: string;
        label: string | null;
        code: string;
        notes: string | null;
        created_by: string | null;
        password_hash: string | null;
        max_uses: number | null;
        expires_at: string | null;
      }> = [];
      if (codeList.length > 1) {
        for (const c of codeList)
          rows.push({
            slug: makeSlug(),
            label: label || null,
            code: c,
            notes: notes || null,
            created_by: createdBy,
            password_hash: passwordHash,
            max_uses: maxUses,
            expires_at: expiresAt,
          });
      } else {
        const useCustom = !!(customSlug && canUseCustomSlug);
        for (let i = 0; i < Math.max(1, quantity); i++)
          rows.push({
            slug: useCustom ? customSlug : makeSlug(),
            label: label || null,
            code: codeList[0],
            notes: notes || null,
            created_by: createdBy,
            password_hash: passwordHash,
            max_uses: maxUses,
            expires_at: expiresAt,
          });
      }

      const { data, error } = await supabase
        .from("links")
        .insert(rows)
        .select("id, slug, code, created_at, expires_at, max_uses");
      if (error) throw error;

      const generated: Generated[] = await Promise.all(
        (data || []).map(async (r) => {
          const url = buildRedeemUrl(r.slug);
          const qr = await QRCode.toDataURL(url, { margin: 1, width: 320 });
          return {
            id: r.id,
            slug: r.slug,
            url,
            qr,
            code: r.code,
            createdAt: r.created_at as string,
            expiresAt: r.expires_at as string | null,
            maxUses: r.max_uses as number | null,
          };
        }),
      );

      setResults(generated);
      await supabase
        .from("activity_logs")
        .insert(generated.map((g) => ({ action: "generated", link_id: g.id, meta: { label } })));

      if (generated.length === 1) {
        try {
          await navigator.clipboard.writeText(generated[0].url);
          toast.success("Link generated and copied");
        } catch {
          toast.success("Link generated");
        }
      } else toast.success(`${generated.length} links generated`);

      setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
      );
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  function downloadCSV() {
    const rows = [
      ["url", "code", "expires_at", "max_uses"],
      ...results.map((r) => [r.url, r.code, r.expiresAt ?? "never", r.maxUses ?? "unlimited"]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keylinks.csv";
    a.click();
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(results.map((r) => r.url).join("\n"));
      toast.success("All links copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteHeader
        badge={
          <span className="hidden rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
            Free forever
          </span>
        }
      />

      {/* hero + form */}
      <section className="relative">
        <div className="hero-glow absolute inset-x-0 top-0 -z-10 h-[520px]" />
        <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[520px] opacity-70" />

        <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-12">
          <Stagger className="mb-6 text-center sm:mb-12">
            <StaggerItem>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur sm:mb-5 sm:px-3 sm:text-xs">
                <Sparkles className="h-3 w-3 text-primary" /> Instant, secure, free
              </div>
            </StaggerItem>
            <StaggerItem>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                Turn codes into <span className="gradient-text">redeem</span> links.
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
                Share coupons, license keys and activation codes as beautiful, protected links —
                with expiries, passwords and QR codes.
              </p>
            </StaggerItem>
          </Stagger>

          {/* Form card */}
          <FadeUp delay={0.25}>
            <div className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-raised)] sm:rounded-[28px]">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-b from-accent/40 to-transparent px-4 py-3.5 sm:px-8 sm:py-5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold tracking-tight">Create a redeem link</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Only the code is required.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Free
                </span>
              </div>

              <div className="grid gap-6 p-4 sm:gap-7 sm:p-8">
                {/* Step 1 — the code */}
                <Section
                  step={1}
                  title="What are you sharing?"
                  subtitle="Paste one code, or many — one per line for bulk."
                >
                  <Field label="Redeem code">
                    <Textarea
                      value={codes}
                      onChange={(e) => setCodes(e.target.value)}
                      rows={4}
                      placeholder={"ABCD-1234-EFGH\nWXYZ-5678-IJKL"}
                      className="resize-none font-mono text-sm"
                    />
                    <AnimatePresence>
                      {codeList.length > 1 && (
                        <motion.div
                          initial={reduce ? false : { opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={reduce ? undefined : { opacity: 0, y: -4, height: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            <LinkIcon className="h-3 w-3" /> Bulk mode — {codeList.length} links
                            will be created
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Field>
                  <Field label="Label" hint="Optional">
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Customer name, Order #1234"
                    />
                  </Field>
                </Section>

                <div className="h-px w-full bg-border/60" />

                {/* Step 2 — rules */}
                <Section
                  step={2}
                  title="Set the rules"
                  subtitle="Control when and how the link can be redeemed."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Expires" icon={<Clock className="h-3.5 w-3.5" />}>
                      <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryPreset)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never</SelectItem>
                          <SelectItem value="1d">In 1 day</SelectItem>
                          <SelectItem value="7d">In 7 days</SelectItem>
                          <SelectItem value="30d">In 30 days</SelectItem>
                          <SelectItem value="custom">Pick a date</SelectItem>
                        </SelectContent>
                      </Select>
                      {expiry === "custom" && (
                        <Input
                          type="datetime-local"
                          value={customExpiry}
                          onChange={(e) => setCustomExpiry(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </Field>
                    <Field label="Max uses" icon={<InfinityIcon className="h-3.5 w-3.5" />}>
                      <Select value={maxUsesPreset} onValueChange={setMaxUsesPreset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unlimited">Unlimited</SelectItem>
                          <SelectItem value="1">1 use</SelectItem>
                          <SelectItem value="2">2 uses</SelectItem>
                          <SelectItem value="5">5 uses</SelectItem>
                          <SelectItem value="10">10 uses</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      {maxUsesPreset === "custom" && (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={customMaxUses}
                          onChange={(e) => setCustomMaxUses(e.target.value)}
                          className="mt-2"
                          placeholder="e.g. 25"
                        />
                      )}
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Password"
                      hint="Optional"
                      icon={<Lock className="h-3.5 w-3.5" />}
                    >
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank for none"
                      />
                    </Field>
                    <Field
                      label="How many links"
                      hint={codeList.length > 1 ? "Bulk uses your list" : "Copies of same code"}
                      icon={<Copy className="h-3.5 w-3.5" />}
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={500}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        disabled={codeList.length > 1}
                      />
                    </Field>
                  </div>
                </Section>

                <div className="h-px w-full bg-border/60" />

                {/* Step 3 — private notes */}
                <Section
                  step={3}
                  title="Notes (just for you)"
                  subtitle="Anything you'd like to remember about this link."
                >
                  <Field label="Notes" hint="Private">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Sent to acme.co on Monday"
                      className="min-h-[56px] resize-none"
                    />
                  </Field>
                </Section>
              </div>

              <div className="border-t border-border/60 bg-gradient-to-b from-transparent to-accent/40 p-4 sm:p-8">
                <Button
                  size="lg"
                  onClick={generate}
                  disabled={busy}
                  className="h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-glow)]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      Generate secure link <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  No sign up. No tracking. Free forever.
                </p>
              </div>
            </div>
          </FadeUp>


          {/* How it works */}
          <FadeUp inView>
            <div
              id="how"
              className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-5 sm:mt-14 sm:rounded-3xl sm:p-8"
            >
              <div className="grid gap-6 sm:grid-cols-3 sm:gap-6">
                <Step n={1} title="Paste your code" body="One code or many — bulk works too." />
                <Step n={2} title="Set rules" body="Password, expiry, and how many redemptions." />
                <Step n={3} title="Share the link" body="Send the URL or QR. We handle the rest." />
              </div>
            </div>
          </FadeUp>


          {/* Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.section
                id="results"
                className="mt-10 scroll-mt-24 sm:mt-14"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    {results.length === 1 ? "Your link is ready" : `${results.length} links ready`}
                  </h2>
                  {results.length > 1 && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={copyAll}>
                        Copy all
                      </Button>
                      <Button variant="secondary" size="sm" onClick={downloadCSV}>
                        <Download className="mr-1 h-3.5 w-3.5" />
                        CSV
                      </Button>
                    </div>
                  )}
                </div>
                <Stagger className="grid gap-3" key={results.map((r) => r.id).join()}>
                  {results.map((r) => (
                    <StaggerItem key={r.id}>
                      <div className="glass-card card-hover grid grid-cols-1 items-center gap-4 rounded-2xl p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5">
                        <img
                          src={r.qr}
                          alt={`QR code for ${r.url}`}
                          className="mx-auto h-28 w-28 shrink-0 rounded-lg border border-border bg-white p-1 sm:mx-0 sm:h-24 sm:w-24"
                        />
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] px-2 py-0.5 font-medium text-[color:var(--success)]">
                              <ShieldCheck className="h-3 w-3" /> Active
                            </span>
                            <span>
                              {r.expiresAt
                                ? `Expires ${new Date(r.expiresAt).toLocaleDateString()}`
                                : "No expiry"}
                            </span>
                            <span>•</span>
                            <span>{r.maxUses ? `${r.maxUses} uses` : "Unlimited"}</span>
                          </div>
                          <div className="truncate rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-xs sm:text-sm">
                            {r.url}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                            <Button variant="secondary" size="sm" onClick={() => copy(r.url)}>
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copy
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                              <a href={r.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                Open
                              </a>
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                              <a href={r.qr} download={`qr-${r.slug}.png`}>
                                <Download className="mr-1 h-3.5 w-3.5" />
                                QR
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary ring-1 ring-primary/20 sm:h-7 sm:w-7 sm:text-xs">
          {step}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-tight text-foreground sm:text-sm">{title}</div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="grid gap-4 pl-0 sm:pl-10">{children}</div>
    </div>
  );
}


function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {n}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
