import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ACHIEVEMENT_IMAGE_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "achievement"
);

const ALLOWED_EXT = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Findet die passende Datei im Ordner – auch bei Umlaut-/Encoding-Unterschieden.
 */
function findMatchingFile(requestedFilename: string): string | null {
  const ext = path.extname(requestedFilename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return null;

  const baseRequested = path.basename(requestedFilename, ext);
  const normalizedRequested = normalizeForMatch(baseRequested);

  const resolvedDir = path.resolve(ACHIEVEMENT_IMAGE_DIR);
  if (!fs.existsSync(resolvedDir)) return null;

  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const entryExt = path.extname(e.name).toLowerCase();
    if (!ALLOWED_EXT.includes(entryExt)) continue;
    const baseEntry = path.basename(e.name, entryExt);
    const normalizedEntry = normalizeForMatch(baseEntry);
    if (normalizedEntry === normalizedRequested) {
      return e.name;
    }
  }

  return null;
}

/**
 * Serviert Achievement-Bilder aus public/images/achievement/.
 * Sucht per Normalisierung (Umlaute, Leerzeichen), falls exakter Match fehlschlägt.
 */
export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");
  if (!fileParam || !fileParam.trim()) {
    return NextResponse.json({ error: "file parameter required" }, { status: 400 });
  }

  const requestedFilename = path.basename(fileParam.trim());
  const ext = path.extname(requestedFilename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  let actualFilename: string | null = null;
  const directPath = path.join(ACHIEVEMENT_IMAGE_DIR, requestedFilename);
  const resolvedDirect = path.resolve(directPath);

  if (
    resolvedDirect.startsWith(path.resolve(ACHIEVEMENT_IMAGE_DIR)) &&
    fs.existsSync(resolvedDirect)
  ) {
    actualFilename = requestedFilename;
  }

  if (!actualFilename) {
    actualFilename = findMatchingFile(requestedFilename);
  }

  if (!actualFilename) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filePath = path.join(ACHIEVEMENT_IMAGE_DIR, actualFilename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ACHIEVEMENT_IMAGE_DIR))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = fs.readFileSync(resolved);
    const actualExt = path.extname(actualFilename).toLowerCase();
    const contentType =
      actualExt === ".png"
        ? "image/png"
        : actualExt === ".webp"
          ? "image/webp"
          : actualExt === ".jpg" || actualExt === ".jpeg"
            ? "image/jpeg"
            : actualExt === ".gif"
              ? "image/gif"
              : "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[achievement-image] Error serving:", actualFilename, err);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
