import { createAdminClient } from "@/src/lib/supabase/server";
import { getAppBaseUrl } from "./format";
import { isSafeStorageRef, parseSupabaseStorageRef } from "./storage-ref";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

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

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function appHostname(): string | undefined {
  return hostnameOf(getAppBaseUrl());
}

function supabaseHostname(): string | undefined {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return undefined;
  return hostnameOf(base);
}

async function createSignedStorageUrl(
  ref: { bucket: string; path: string },
): Promise<string | undefined> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, SIGNED_URL_TTL_SEC);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // Service Role fehlt lokal → Fallback unten
  }
  return undefined;
}

/**
 * Discord lädt Bilder selbst. Externe URLs (Pinterest, imgbb, Supabase) direkt nutzen —
 * kein Proxy über NEXT_PUBLIC_APP_URL (Domain muss zur Vercel-App zeigen).
 */
export function toDiscordEmbedImageUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined;

  const storageRef = parseSupabaseStorageRef(raw);
  if (storageRef && isSafeStorageRef(storageRef)) {
    return resolveDiscordImageSource(raw) ?? buildStorageProxyUrl(storageRef);
  }

  const source = resolveDiscordImageSource(raw);
  if (!source || !isAllowedDiscordAssetSource(source)) return undefined;

  const sourceHost = hostnameOf(source);
  const appHost = appHostname();
  const supabaseHost = supabaseHostname();

  if (sourceHost && sourceHost !== appHost) {
    return source;
  }

  if (sourceHost === supabaseHost) {
    return source;
  }

  if (sourceHost === appHost && new URL(source).pathname.startsWith("/images/")) {
    return source;
  }

  return buildUrlProxyUrl(source);
}

/** Serverseitig: signierte Storage-URL bevorzugen (privater Bucket). */
export async function resolveDiscordEmbedImageUrl(
  raw: string | null | undefined,
): Promise<string | undefined> {
  if (!raw?.trim()) return undefined;

  const storageRef = parseSupabaseStorageRef(raw);
  if (storageRef && isSafeStorageRef(storageRef)) {
    const signed = await createSignedStorageUrl(storageRef);
    if (signed) return signed;
  }

  return toDiscordEmbedImageUrl(raw);
}
