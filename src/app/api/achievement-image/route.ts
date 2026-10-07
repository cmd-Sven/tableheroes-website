import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  ACHIEVEMENT_IMAGE_DIR,
  findAchievementImageFile,
} from "@/src/lib/achievements/resolve-achievement-image";

/**
 * Serviert Achievement-Bilder aus public/images/achievement/.
 * Gleicht führende IDs, Bindestriche und Großschreibung an die echte Datei an.
 */
export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");
  if (!fileParam || !fileParam.trim()) {
    return NextResponse.json({ error: "file parameter required" }, { status: 400 });
  }

  const actualFilename = findAchievementImageFile(fileParam);
  if (!actualFilename) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filePath = path.join(ACHIEVEMENT_IMAGE_DIR, actualFilename);
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(ACHIEVEMENT_IMAGE_DIR);
  if (resolved !== resolvedDir && !resolved.startsWith(resolvedDir + path.sep)) {
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
