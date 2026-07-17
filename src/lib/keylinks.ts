/**
 * Public base URL for all generated redeem links.
 * Always uses the primary custom domain, regardless of where the app is accessed.
 */
export const PUBLIC_BASE_URL = "https://keylinks.space";

export function buildRedeemUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/r/${slug}`;
}

export function makeSlug(len = 12): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

export type ExpiryPreset = "never" | "1d" | "7d" | "30d" | "custom";
export function expiryFromPreset(preset: ExpiryPreset, custom?: string): string | null {
  if (preset === "never") return null;
  if (preset === "custom") return custom ? new Date(custom).toISOString() : null;
  const days = preset === "1d" ? 1 : preset === "7d" ? 7 : 30;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export async function hashPassword(pw: string): Promise<string> {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
