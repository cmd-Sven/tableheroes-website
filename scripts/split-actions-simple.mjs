/**
 * Reliable action splitter: duplicate full imports into each part; no helper extraction.
 * Usage: node scripts/split-actions-simple.mjs <file.ts> [maxLines=450]
 */
import fs from "fs";
import path from "path";

const filePath = process.argv[2];
const maxLines = Number(process.argv[3] || 450);
if (!filePath) process.exit(1);

const abs = path.resolve(filePath);
const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
const dir = path.dirname(abs);
const base = path.basename(abs, path.extname(abs));
const outDir = path.join(dir, base);
if (fs.existsSync(outDir)) {
  console.error("exists", outDir);
  process.exit(1);
}

const hasUseServer = lines.some(
  (l) => l.trim() === '"use server";' || l.trim() === "'use server';"
);

const exports = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(
    /^export (?:async )?function (\w+)|^export type (\w+)|^export interface (\w+)|^export const (\w+)/
  );
  if (m)
    exports.push({
      name: m[1] || m[2] || m[3] || m[4],
      index: i,
      isType: !!(m[2] || m[3]),
    });
}
if (exports.length < 2) {
  console.error("need >=2 exports");
  process.exit(1);
}

const first = exports[0].index;
const header = lines
  .slice(0, first)
  .filter((l) => {
    const t = l.trim();
    return t !== '"use server";' && t !== "'use server';";
  })
  .join("\n")
  .trim();

function bump(text) {
  const b = (s) => (s.startsWith("./") ? `../${s.slice(2)}` : s.startsWith("../") ? `../${s}` : s);
  return text
    .replace(/from ["'](\.\.?\/[^"']+)["']/g, (_, s) => `from "${b(s)}"`)
    .replace(/import\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g, (_, s) => `import("${b(s)}")`)
    .replace(
      /import\(\s*\n\s*["'](\.\.?\/[^"']+)["']\s*\n\s*\)/g,
      (_, s) => `import(\n  "${b(s)}"\n)`
    );
}

const bumpedHeader = bump(header);

const ranges = exports.map((e, i) => ({
  ...e,
  start: e.index,
  end: i + 1 < exports.length ? exports[i + 1].index : lines.length,
}));

const chunks = [];
let cur = null;
for (const r of ranges) {
  const size = r.end - r.start;
  if (!cur || (cur.size + size > maxLines && cur.names.length > 0)) {
    if (cur) chunks.push(cur);
    cur = { names: [], types: [], start: r.start, end: r.end, size: 0 };
  }
  if (r.isType) cur.types.push(r.name);
  else cur.names.push(r.name);
  cur.end = r.end;
  cur.size += size;
}
chunks.push(cur);

fs.mkdirSync(outDir, { recursive: true });
const meta = [];

chunks.forEach((chunk, idx) => {
  const part = `part-${String(idx + 1).padStart(2, "0")}.ts`;
  let body = lines.slice(chunk.start, chunk.end).join("\n").trimEnd() + "\n";

  // Cross-imports: other exported functions referenced in body
  let cross = "";
  for (let oi = 0; oi < chunks.length; oi++) {
    if (oi === idx) continue;
    for (const n of chunks[oi].names) {
      if (new RegExp(`\\b${n}\\b`).test(body)) {
        const pf = `part-${String(oi + 1).padStart(2, "0")}`;
        cross += `import { ${n} } from "./${pf}";\n`;
      }
    }
  }
  if (cross) cross += "\n";

  const content =
    `/**\n * ${base} — part ${idx + 1}: ${[...chunk.names, ...chunk.types].join(", ")}.\n */\n` +
    (hasUseServer ? `"use server";\n\n` : "") +
    cross +
    bumpedHeader +
    "\n\n" +
    body;

  fs.writeFileSync(path.join(outDir, part), content);
  meta.push({ part, names: chunk.names, types: chunk.types });
  console.log(`Wrote ${part} (~${content.split("\n").length})`);
});

let barrel = `/**\n * ${base} — barrel (see ./${base}/).\n */\n`;
if (hasUseServer) barrel += `"use server";\n\n`;
for (const m of meta) {
  if (m.types.length)
    barrel += `export type { ${m.types.join(", ")} } from "./${base}/${m.part.replace(/\.ts$/, "")}";\n`;
  if (m.names.length)
    barrel += `export {\n  ${m.names.join(",\n  ")}\n} from "./${base}/${m.part.replace(/\.ts$/, "")}";\n`;
}
fs.writeFileSync(abs, barrel);
console.log("Done", meta.length, "parts");
