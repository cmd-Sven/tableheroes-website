import { PROFILE_MEDIA_BUCKET } from "@/src/lib/profile-media";
import { getAppBaseUrl } from "./format";

/** Rohe DB-URL / Storage-Pfad → absolute HTTPS-URL (ohne Discord-Proxy). */
export function resolveDiscordImageSource(
  raw: string | null | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).href;
    }

    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (supabaseBase) {
      // Nur Storage-Pfad (z. B. userId/npcs/worldId/portrait-123.png)
      if (!trimmed.startsWith("/") && trimmed.includes("/")) {
        return new URL(
          `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/${trimmed}`,
          `${supabaseBase}/`,
        ).href;
      }

      // /storage/v1/object/public/... relativ zur Supabase-Instanz
      if (trimmed.startsWith("/storage/")) {
        return new URL(trimmed, `${supabaseBase}/`).href;
      }
    }

    const base = getAppBaseUrl().replace(/\/$/, "");
    const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(relative, `${base}/`).href;
  } catch {
    return undefined;
  }
}

/** Nur URLs, die der Discord-Asset-Proxy laden darf (SSRF-Schutz). */
export function isAllowedDiscordAssetSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

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
        parsed.pathname.includes("/storage/v1/object/public/")
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/** Öffentliche Proxy-URL für Discord-Embeds (Discord lädt von tableheroes.de). */
export function toDiscordEmbedImageUrl(
  raw: string | null | undefined,
): string | undefined {
  const source = resolveDiscordImageSource(raw);
  if (!source || !isAllowedDiscordAssetSource(source)) return undefined;

  const proxy = new URL("/api/discord-asset", `${getAppBaseUrl().replace(/\/$/, "")}/`);
  proxy.searchParams.set("url", source);
  const href = proxy.href;
  if (href.length > 2048) return undefined;
  return href;
}
