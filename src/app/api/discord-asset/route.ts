import { NextResponse } from "next/server";
import {
  isAllowedDiscordAssetSource,
  resolveDiscordImageSource,
} from "@/src/lib/integrations/discord/resolve-image-url";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Öffentlicher Bild-Proxy für Discord-Embeds.
 * Discord lädt Bilder zuverlässiger von tableheroes.de als von Supabase-Pfaden mit Sonderzeichen.
 */
export async function GET(request: Request) {
  const rawParam = new URL(request.url).searchParams.get("url");
  if (!rawParam?.trim()) {
    return NextResponse.json({ error: "url fehlt" }, { status: 400 });
  }

  const source = resolveDiscordImageSource(rawParam) ?? rawParam.trim();
  if (!isAllowedDiscordAssetSource(source)) {
    return NextResponse.json({ error: "URL nicht erlaubt" }, { status: 403 });
  }

  try {
    const upstream = await fetch(source, {
      redirect: "follow",
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Bild nicht erreichbar (${upstream.status})` },
        { status: 404 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Kein Bild" }, { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Bild zu groß" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bild konnte nicht geladen werden" }, { status: 502 });
  }
}
