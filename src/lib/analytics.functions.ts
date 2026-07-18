import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function detectDevice(ua: string | null): string {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|phone|blackberry|opera mini/.test(s)) return "mobile";
  if (/bot|crawl|spider|slurp|preview/.test(s)) return "bot";
  return "desktop";
}

function readContext() {
  const req = getRequest();
  const h = req.headers;
  const country =
    h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || h.get("x-country") || null;
  const referrer = h.get("referer") || h.get("referrer") || null;
  const ua = h.get("user-agent");
  const ip =
    h.get("cf-connecting-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null;
  return { country, referrer, device: detectDevice(ua), ip: ip || null, userAgent: ua };
}

function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const recordLinkView = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const { data: link } = await supabase
      .from("links")
      .select("id, disabled")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!link || link.disabled) return { ok: false };
    const ctx = readContext();
    await supabase.from("link_views").insert({
      link_id: link.id,
      country: ctx.country,
      referrer: ctx.referrer,
      device: ctx.device,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
    });
    return { ok: true };
  });

export const redeemLinkServer = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; passwordHash: string | null }) => d)
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const ctx = readContext();
    const { data: result, error } = await supabase.rpc("redeem_link", {
      _slug: data.slug,
      _password_hash: data.passwordHash as string,
      _country: ctx.country ?? undefined,
      _referrer: ctx.referrer ?? undefined,
      _device: ctx.device ?? undefined,
    } as any);
    if (error) {
      return { ok: false as const, error: error.message };
    }
    const row = Array.isArray(result) ? result[0] : (result as any);
    if (!row?.code) return { ok: false as const, error: "invalid" };
    return { ok: true as const, code: row.code as string, remainingUses: row.remaining_uses as number | null };
  });
