/**
 * Komprimiert Aurenfurt-GLBs: Dedup, Weld, Texture-Resize, Meshopt.
 * Überschreibt Dateien in public/models/aurenfurt/ (Backup optional via --backup).
 *
 * Usage: node scripts/optimize-aurenfurt-glbs.mjs [--backup] [--max-texture=1024]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  join,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
  meshopt,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const root = path.resolve("public/models/aurenfurt");
const args = new Set(process.argv.slice(2));
const backup = args.has("--backup");
const maxTexArg = [...args].find((a) => a.startsWith("--max-texture="));
const maxTexture = Number(maxTexArg?.split("=")[1] ?? 1024) || 1024;

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
  "meshopt.simplifier": MeshoptSimplifier,
});

const files = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".glb"))
  .sort();

if (files.length === 0) {
  console.error("Keine GLBs in", root);
  process.exit(1);
}

const backupDir = path.join(root, "_backup-pre-optimize");
if (backup) {
  fs.mkdirSync(backupDir, { recursive: true });
}

let beforeTotal = 0;
let afterTotal = 0;

for (const name of files) {
  const filePath = path.join(root, name);
  const before = fs.statSync(filePath).size;
  beforeTotal += before;

  if (backup) {
    fs.copyFileSync(filePath, path.join(backupDir, name));
  }

  const document = await io.read(filePath);
  await document.transform(
    dedup(),
    flatten(),
    join(),
    weld(),
    resample(),
    prune(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 }),
    textureCompress({
      targetFormat: "webp",
      resize: [maxTexture, maxTexture],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(filePath, document);

  const after = fs.statSync(filePath).size;
  afterTotal += after;
  const pct = before === 0 ? 0 : Math.round((1 - after / before) * 100);
  console.log(
    `${name.padEnd(22)} ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB (−${pct}%)`,
  );
}

console.log(
  `\nGesamt ${(beforeTotal / 1024 / 1024).toFixed(1)}MB → ${(afterTotal / 1024 / 1024).toFixed(1)}MB`,
);
if (backup) console.log(`Backup: ${backupDir}`);
