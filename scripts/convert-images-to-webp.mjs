/**
 * Konvertiert lokale Raster-Bilder in public/ nach WebP (Alpha bleibt erhalten).
 * Originale werden beibehalten. SVG, GIF und bereits vorhandene WebP werden übersprungen.
 *
 * Dry-Run (Standard):
 *   node scripts/convert-images-to-webp.mjs
 *
 * WebP-Dateien schreiben:
 *   node scripts/convert-images-to-webp.mjs --apply
 *
 * Referenzen in src/ + globals.css auf .webp umstellen (nur wenn WebP existiert):
 *   node scripts/convert-images-to-webp.mjs --update-refs
 *
 * Alles zusammen:
 *   node scripts/convert-images-to-webp.mjs --apply --update-refs
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, extname, join, relative, resolve } from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const SRC_DIR = join(ROOT, "src");

const APPLY = process.argv.includes("--apply");
const UPDATE_REFS = process.argv.includes("--update-refs");

const RASTER_EXT = new Set([".png", ".jpg", ".jpeg", ".gif"]);
const WEBP_QUALITY = 82;
const WEBP_EFFORT = 4;

/** Pfade, die absichtlich im Originalformat bleiben (Favicon, OG, MIME-Listen). */
const REF_UPDATE_SKIP_FILES = new Set([
  "src/app/layout.tsx",
  "src/app/(marketing)/page.tsx",
  "src/lib/actions/achievement-actions.ts",
  "src/lib/actions/news-actions.ts",
  "src/lib/queries/dashboard-widgets-queries.ts",
  "src/app/api/discord-asset/route.ts",
  "src/app/api/achievement-image/route.ts",
  "src/app/dashboard/campaigns/[id]/character-state-actions.ts",
  "src/app/dashboard/campaigns/[id]/character-token-actions.ts",
  "src/components/dashboard/campaigns/npcs/NpcTokenCropEditor.tsx",
  "src/types/achievement.ts",
]);

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function toPublicUrl(absPath) {
  const rel = relative(PUBLIC_DIR, absPath).replace(/\\/g, "/");
  return `/images/${rel.startsWith("images/") ? rel.slice("images/".length) : rel}`.replace(
    /\/+/g,
    "/",
  );
}

async function convertOne(inputPath) {
  const ext = extname(inputPath).toLowerCase();
  if (!RASTER_EXT.has(ext)) return null;

  const outputPath = inputPath.replace(/\.(png|jpe?g|gif)$/i, ".webp");
  if (existsSync(outputPath)) {
    const inputSize = statSync(inputPath).size;
    const outputSize = statSync(outputPath).size;
    return {
      inputPath,
      outputPath,
      skipped: true,
      inputSize,
      outputSize,
      hasAlpha: null,
    };
  }

  const inputBuffer = readFileSync(inputPath);
  const meta = await sharp(inputBuffer).metadata();
  const hasAlpha = Boolean(meta.hasAlpha);

  const webpBuffer = await sharp(inputBuffer)
    .rotate()
    .webp({
      quality: WEBP_QUALITY,
      effort: WEBP_EFFORT,
      lossless: false,
      alphaQuality: hasAlpha ? 100 : undefined,
    })
    .toBuffer();

  if (APPLY) {
    writeFileSync(outputPath, webpBuffer);
  }

  return {
    inputPath,
    outputPath,
    skipped: false,
    inputSize: inputBuffer.length,
    outputSize: webpBuffer.length,
    hasAlpha,
  };
}

function collectRefTargets() {
  const targets = [];
  for (const file of walkFiles(SRC_DIR)) {
    if (!/\.(tsx?|css)$/.test(file)) continue;
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (REF_UPDATE_SKIP_FILES.has(rel)) continue;
    targets.push(file);
  }
  return targets;
}

function shouldSkipReplacement(fullMatch) {
  if (/example\.com/i.test(fullMatch)) return true;
  if (/source\.png/i.test(fullMatch)) return true;
  if (/table_Heroes_Icon\.png/i.test(fullMatch)) return true;
  if (/tableHeroes-logo\.png/i.test(fullMatch)) return true;
  return false;
}

function updateReferences(webpByPublicPath) {
  const files = collectRefTargets();
  let filesChanged = 0;
  let replacements = 0;

  const pattern =
    /(\/images\/[A-Za-z0-9_\-./]+?)\.(png|jpe?g|gif)(?=[`'")\s,]|$)/gi;

  for (const file of files) {
    const original = readFileSync(file, "utf8");
    let changed = false;

    const updated = original.replace(pattern, (full, base, ext) => {
      if (shouldSkipReplacement(full)) return full;
      const publicPath = `${base}.webp`;
      if (!webpByPublicPath.has(publicPath)) return full;
      replacements += 1;
      changed = true;
      return publicPath;
    });

    if (changed) {
      writeFileSync(file, updated, "utf8");
      filesChanged += 1;
      console.log(`  refs: ${relative(ROOT, file).replace(/\\/g, "/")}`);
    }
  }

  return { filesChanged, replacements };
}

async function main() {
  if (!existsSync(PUBLIC_DIR)) {
    throw new Error("public/ Verzeichnis nicht gefunden.");
  }

  const rasterFiles = walkFiles(PUBLIC_DIR).filter((f) =>
    RASTER_EXT.has(extname(f).toLowerCase()),
  );

  console.log(
    `${APPLY ? "[apply]" : "[dry]"} Konvertiere ${rasterFiles.length} Raster-Dateien in public/ → WebP`,
  );
  console.log(`Qualität: ${WEBP_QUALITY}, Alpha: automatisch erhalten (sharp)\n`);

  let converted = 0;
  let skippedExisting = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let alphaCount = 0;

  const webpByPublicPath = new Set(
    walkFiles(PUBLIC_DIR)
      .filter((f) => extname(f).toLowerCase() === ".webp")
      .map((f) => {
        const rel = relative(PUBLIC_DIR, f).replace(/\\/g, "/");
        return `/images/${rel.startsWith("images/") ? rel.slice("images/".length) : rel}`.replace(
          /\/+/g,
          "/",
        );
      }),
  );

  for (const inputPath of rasterFiles.sort()) {
    const result = await convertOne(inputPath);
    if (!result) continue;

    totalInput += result.inputSize;
    totalOutput += result.outputSize;
    if (result.hasAlpha) alphaCount += 1;

    const rel = relative(ROOT, result.inputPath).replace(/\\/g, "/");
    const savings =
      result.inputSize > 0
        ? `${(((result.inputSize - result.outputSize) / result.inputSize) * 100).toFixed(0)}%`
        : "0%";

    if (result.skipped) {
      skippedExisting += 1;
      webpByPublicPath.add(toPublicUrl(result.outputPath));
      console.log(`  skip  ${rel} (WebP existiert bereits)`);
      continue;
    }

    converted += 1;
    webpByPublicPath.add(toPublicUrl(result.outputPath));
    const alphaNote = result.hasAlpha ? ", Alpha" : "";
    console.log(
      `  ${APPLY ? "ok   " : "plan "} ${rel} → ${formatBytes(result.inputSize)} → ${formatBytes(result.outputSize)} (-${savings}${alphaNote})`,
    );
  }

  const saved = totalInput - totalOutput;
  console.log("\n--- Zusammenfassung ---");
  console.log(`Neu konvertiert: ${converted}`);
  console.log(`Bereits vorhanden: ${skippedExisting}`);
  console.log(`Mit Alpha-Kanal: ${alphaCount}`);
  console.log(`Original gesamt: ${formatBytes(totalInput)}`);
  console.log(`WebP gesamt:     ${formatBytes(totalOutput)}`);
  console.log(
    `Ersparnis:       ${formatBytes(saved)} (${totalInput > 0 ? ((saved / totalInput) * 100).toFixed(1) : 0}%)`,
  );

  if (!APPLY && converted > 0) {
    console.log("\nZum Schreiben: node scripts/convert-images-to-webp.mjs --apply");
  }

  if (UPDATE_REFS) {
    console.log("\n--- Referenzen aktualisieren ---");
    const { filesChanged, replacements } = updateReferences(webpByPublicPath);
    console.log(`Geänderte Dateien: ${filesChanged}, Ersetzungen: ${replacements}`);
  } else if (converted > 0 || skippedExisting > 0) {
    console.log(
      "\nReferenzen optional: node scripts/convert-images-to-webp.mjs --update-refs",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
