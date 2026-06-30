/**
 * Einmaliges Tool: bestehende NSC-KI-Portraits (PNG) im profile-media-Bucket
 * nach WebP komprimieren und image_url in der DB aktualisieren.
 *
 * Voraussetzungen: .env.local mit NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Dry-Run (nur anzeigen):
 *   node scripts/compress-npc-portraits.mjs
 *
 * Ausführen:
 *   node scripts/compress-npc-portraits.mjs --apply
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const BUCKET = "profile-media";
const MAX_EDGE = 1024;
const WEBP_QUALITY = 82;

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(".env.local nicht gefunden.");
  }
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function extractObjectPath(publicUrl) {
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  let path = publicUrl.slice(idx + marker.length);
  const q = path.indexOf("?");
  if (q !== -1) path = path.slice(0, q);
  return decodeURIComponent(path);
}

function isAiNpcPortraitPath(path) {
  const parts = path.split("/").filter(Boolean);
  return parts.length === 4 && parts[1] === "npcs" && parts[3].startsWith("portrait-");
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: npcs, error } = await supabase
    .from("npcs")
    .select("id, name, image_url")
    .not("image_url", "is", null);

  if (error) throw error;

  const candidates = (npcs ?? []).filter((npc) => {
    const imageUrl = String(npc.image_url ?? "");
    if (!imageUrl.includes(`/${BUCKET}/`)) return false;
    const path = extractObjectPath(imageUrl);
    if (!path) return false;
    if (!isAiNpcPortraitPath(path)) return false;
    return /\.(png|jpe?g)$/i.test(path);
  });

  console.log(`Gefunden: ${candidates.length} NSC-Portraits zum Komprimieren`);
  if (!candidates.length) return;

  let converted = 0;
  for (const npc of candidates) {
    const oldUrl = String(npc.image_url);
    const oldPath = extractObjectPath(oldUrl);
    if (!oldPath) continue;

    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(oldPath);
    if (downloadError || !blob) {
      console.warn(`[skip] ${npc.name}: Download fehlgeschlagen — ${downloadError?.message}`);
      continue;
    }

    const input = Buffer.from(await blob.arrayBuffer());
    const webpBuffer = await sharp(input)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const newPath = oldPath.replace(/\.(png|jpe?g)$/i, ".webp");
    const savings = `${((1 - webpBuffer.length / input.length) * 100).toFixed(0)}%`;

    console.log(
      `${APPLY ? "[apply]" : "[dry]"} ${npc.name}: ${oldPath} → ${newPath} (${input.length} → ${webpBuffer.length} B, -${savings})`,
    );

    if (!APPLY) continue;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, webpBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploadError) {
      console.warn(`[skip] ${npc.name}: Upload fehlgeschlagen — ${uploadError.message}`);
      continue;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    const { error: updateError } = await supabase
      .from("npcs")
      .update({ image_url: publicData.publicUrl })
      .eq("id", npc.id);
    if (updateError) {
      console.warn(`[skip] ${npc.name}: DB-Update fehlgeschlagen — ${updateError.message}`);
      continue;
    }

    if (newPath !== oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }
    converted += 1;
  }

  if (APPLY) {
    console.log(`Fertig: ${converted} Portraits konvertiert.`);
  } else {
    console.log("Dry-Run beendet. Zum Ausführen: node scripts/compress-npc-portraits.mjs --apply");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
