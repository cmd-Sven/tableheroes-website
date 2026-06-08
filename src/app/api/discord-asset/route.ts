import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  isAllowedDiscordAssetSource,
  resolveDiscordImageSource,
} from "@/src/lib/integrations/discord/resolve-image-url";
import { isSafeStorageRef, parseSupabaseStorageRef } from "@/src/lib/integrations/discord/storage-ref";

const MAX_BYTES = 8 * 1024 * 1024;

function imageResponse(buffer: ArrayBuffer, contentType: string) {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

function guessContentType(path: string, fallback?: string | null): string {
  if (fallback?.startsWith("image/")) return fallback;
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

async function loadFromStorage(bucket: string, path: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) return null;

  const buffer = await data.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return null;

  return imageResponse(buffer, guessContentType(path, data.type));
}

/**
 * Öffentlicher Bild-Proxy für Discord-Embeds.
 * Lädt Supabase-Storage per Service Role (auch wenn Bucket nicht öffentlich ist).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket")?.trim();
  const path = searchParams.get("path")?.trim();

  if (bucket && path) {
    const ref = { bucket, path };
    if (!isSafeStorageRef(ref)) {
      return NextResponse.json({ error: "Storage-Pfad nicht erlaubt" }, { status: 403 });
    }

    try {
      const response = await loadFromStorage(bucket, path);
      if (response) return response;
      return NextResponse.json({ error: "Bild nicht im Storage gefunden" }, { status: 404 });
    } catch {
      return NextResponse.json({ error: "Storage-Zugriff fehlgeschlagen" }, { status: 502 });
    }
  }

  const rawParam = searchParams.get("url");
  if (!rawParam?.trim()) {
    return NextResponse.json({ error: "url oder bucket+path fehlt" }, { status: 400 });
  }

  const storageFromUrl = parseSupabaseStorageRef(rawParam);
  if (storageFromUrl && isSafeStorageRef(storageFromUrl)) {
    try {
      const fromStorage = await loadFromStorage(storageFromUrl.bucket, storageFromUrl.path);
      if (fromStorage) return fromStorage;
    } catch {
      // Fallback auf öffentlichen Fetch
    }
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
      const ref = parseSupabaseStorageRef(source);
      if (ref && isSafeStorageRef(ref)) {
        const fromStorage = await loadFromStorage(ref.bucket, ref.path);
        if (fromStorage) return fromStorage;
      }
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

    return imageResponse(buffer, contentType);
  } catch {
    return NextResponse.json({ error: "Bild konnte nicht geladen werden" }, { status: 502 });
  }
}
