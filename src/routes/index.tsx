import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Sparkles, KeyRound, Link as LinkIcon, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { makeSlug, expiryFromPreset, hashPassword, type ExpiryPreset } from "@/lib/keylinks";

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
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Generated[]>([]);

  const codeList = codes.split(/\r?\n/).map(c => c.trim()).filter(Boolean);

  async function generate() {
    if (codeList.length === 0) { toast.error("Please enter at least one code"); return; }
    setBusy(true);
    try {
      const expiresAt = expiryFromPreset(expiry, customExpiry);
      const maxUses = maxUsesPreset === "unlimited" ? null : maxUsesPreset === "custom" ? Number(customMaxUses) || null : Number(maxUsesPreset);
      const passwordHash = password ? await hashPassword(password) : null;

      // Multi-code: one link per code. Single code: `quantity` links, each identical code.
      const rows: Array<{ slug: string; label: string | null; code: string; notes: string | null; password_hash: string | null; max_uses: number | null; expires_at: string | null; }> = [];
      if (codeList.length > 1) {
        for (const c of codeList) {
          rows.push({ slug: makeSlug(), label: label || null, code: c, notes: notes || null, password_hash: passwordHash, max_uses: maxUses, expires_at: expiresAt });
        }
      } else {
        for (let i = 0; i < Math.max(1, quantity); i++) {
          rows.push({ slug: makeSlug(), label: label || null, code: codeList[0], notes: notes || null, password_hash: passwordHash, max_uses: maxUses, expires_at: expiresAt });
        }
      }

      const { data, error } = await supabase.from("links").insert(rows).select("id, slug, code, created_at, expires_at, max_uses");
      if (error) throw error;

      const origin = window.location.origin;
      const generated: Generated[] = await Promise.all((data || []).map(async r => {
        const url = `${origin}/r/${r.slug}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#ffffff", light: "#00000000" } });
        return { id: r.id, slug: r.slug, url, qr, code: r.code, createdAt: r.created_at as string, expiresAt: r.expires_at as string | null, maxUses: r.max_uses as number | null };
      }));

      setResults(generated);
      // log
      await supabase.from("activity_logs").insert(generated.map(g => ({ action: "generated", link_id: g.id, meta: { label } })));

      if (generated.length === 1) {
        try { await navigator.clipboard.writeText(generated[0].url); toast.success("Link generated and copied"); }
        catch { toast.success("Link generated"); }
      } else {
        toast.success(`${generated.length} links generated`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  }

  function downloadCSV() {
    const rows = [["url", "code", "expires_at", "max_uses"], ...results.map(r => [r.url, r.code, r.expiresAt ?? "never", r.maxUses ?? "unlimited"])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keylinks.csv";
    a.click();
  }

  async function copyAll() {
    try { await navigator.clipboard.writeText(results.map(r => r.url).join("\n")); toast.success("All links copied"); } catch { toast.error("Copy failed"); }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><KeyRound className="h-4 w-4" /></span>
          keylinks
        </a>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Free forever</span>
          <a href="/admin" className="rounded-md px-2 py-1 hover:text-foreground">Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Instant, secure, free
          </div>
          <h1 className="gradient-text text-4xl font-semibold tracking-tight sm:text-5xl">Generate Secure Redeem Links</h1>
          <p className="mt-3 text-base text-muted-foreground">Turn any activation code into a secure shareable redemption link.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <div className="grid gap-5">
            <Field label="Label (optional)" hint="e.g. Customer Name, Order #1234">
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Customer Name" />
            </Field>

            <Field label="Redeem Code" hint="Paste one code, or many — one per line for bulk">
              <Textarea value={codes} onChange={e => setCodes(e.target.value)} rows={5} placeholder={"ABCD-1234-EFGH\nWXYZ-5678-IJKL"} className="font-mono text-sm" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Link Quantity" hint={codeList.length > 1 ? "Ignored in bulk mode" : "One link per copy"}>
                <Input type="number" min={1} max={500} value={quantity} onChange={e => setQuantity(Number(e.target.value))} disabled={codeList.length > 1} />
              </Field>
              <Field label="Expiry">
                <Select value={expiry} onValueChange={v => setExpiry(v as ExpiryPreset)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
                {expiry === "custom" && (
                  <Input type="datetime-local" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} className="mt-2" />
                )}
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Password (optional)" hint="Required to reveal the code">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank for no password" />
              </Field>
              <Field label="Maximum Uses">
                <Select value={maxUsesPreset} onValueChange={setMaxUsesPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {maxUsesPreset === "custom" && (
                  <Input type="number" min={1} value={customMaxUses} onChange={e => setCustomMaxUses(e.target.value)} className="mt-2" placeholder="e.g. 25" />
                )}
              </Field>
            </div>

            <Field label="Notes (optional)">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything you want to remember about these links" />
            </Field>

            <Button size="lg" onClick={generate} disabled={busy} className="mt-2 h-12 rounded-xl text-base">
              {busy ? "Generating…" : "Generate"}
              <LinkIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{results.length === 1 ? "Your link is ready" : `${results.length} links generated`}</h2>
              {results.length > 1 && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={copyAll}>Copy all</Button>
                  <Button variant="secondary" size="sm" onClick={downloadCSV}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {results.map(r => (
                <div key={r.id} className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                  <img src={r.qr} alt="QR" className="h-24 w-24 rounded-lg border border-border bg-black/30" />
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--success)]" /> Active
                      <span>•</span>
                      <span>{r.expiresAt ? `Expires ${new Date(r.expiresAt).toLocaleDateString()}` : "Never expires"}</span>
                      <span>•</span>
                      <span>{r.maxUses ? `${r.maxUses} uses` : "Unlimited uses"}</span>
                    </div>
                    <div className="truncate rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-sm">{r.url}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => copy(r.url)}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
                    <Button variant="secondary" size="sm" asChild><a href={r.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Open</a></Button>
                    <Button variant="secondary" size="sm" asChild><a href={r.qr} download={`qr-${r.slug}.png`}><Download className="mr-1 h-3.5 w-3.5" />QR</a></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
