import { getAppBaseUrl } from "./format";
import { isSafeStorageRef, parseSupabaseStorageRef } from "./storage-ref";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /\.local$/i,
];

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/** Rohe DB-URL / Storage-Pfad → absolute HTTPS-URL (ohne Discord-Proxy). */
export function resolveDiscordImageSource(
  raw: string | null | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();

  const storageRef = parseSupabaseStorageRef(trimmed);
  if (storageRef && isSafeStorageRef(storageRef)) {
    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (supabaseBase) {
      return new URL(
        `/storage/v1/object/public/${storageRef.bucket}/${storageRef.path}`,
        `${supabaseBase}/`,
      ).href;
    }
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:" && !isBlockedHost(parsed.hostname)) {
        return parsed.href;
      }
      return undefined;
    }

    const base = getAppBaseUrl().replace(/\/$/, "");
    const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const parsed = new URL(relative, `${base}/`);
    if (parsed.protocol === "https:" && !isBlockedHost(parsed.hostname)) {
      return parsed.href;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Nur URLs, die der Discord-Asset-Proxy laden darf (SSRF-Schutz). */
export function isAllowedDiscordAssetSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (isBlockedHost(parsed.hostname)) return false;

    const appHost = new URL(getAppBaseUrl()).hostname.toLowerCase();
    if (
      parsed.hostname.toLowerCase() === appHost &&
      parsed.pathname.startsWith("/images/")
    ) {
      return true;
    }

    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (supabaseBase) {
      const supabaseHost = new URL(supabaseBase).hostname.toLowerCase();
      if (
        parsed.hostname.toLowerCase() === supabaseHost &&
        parsed.pathname.includes("/storage/v1/object/")
      ) {
        return true;
      }
    }

    // Externe HTTPS-Bilder (NPC-Formular: beliebige Bild-URL)
    return true;
  } catch {
    return false;
  }
}

function buildStorageProxyUrl(ref: { bucket: string; path: string }): string | undefined {
  const base = getAppBaseUrl().replace(/\/$/, "");
  const proxy = new URL("/api/discord-asset", `${base}/`);
  proxy.searchParams.set("bucket", ref.bucket);
  proxy.searchParams.set("path", ref.path);
  if (proxy.href.length > 2048) return undefined;
  return proxy.href;
}

function buildUrlProxyUrl(source: string): string | undefined {
  const base = getAppBaseUrl().replace(/\/$/, "");
  const proxy = new URL("/api/discord-asset", `${base}/`);
  proxy.searchParams.set("url", source);
  if (proxy.href.length > 2048) return undefined;
  return proxy.href;
}

/** Öffentliche Proxy-URL für Discord-Embeds (Discord lädt von tableheroes.de). */
export function toDiscordEmbedImageUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined;

  const storageRef = parseSupabaseStorageRef(raw);
  if (storageRef && isSafeStorageRef(storageRef)) {
    return buildStorageProxyUrl(storageRef);
  }

  const source = resolveDiscordImageSource(raw);
  if (!source || !isAllowedDiscordAssetSource(source)) return undefined;

  return buildUrlProxyUrl(source);
}
