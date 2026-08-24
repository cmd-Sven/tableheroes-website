/**
 * Heuristic: component files with no static import references elsewhere.
 */
import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const all = walk("src");
const contents = new Map(all.map((f) => [f, fs.readFileSync(f, "utf8")]));
const flagged = [];

for (const f of all) {
  if (!f.includes(`${path.sep}components${path.sep}`)) continue;
  const base = path.basename(f, path.extname(f));
  if (base === "index" || base.startsWith("use")) continue;
  if (
    ["page", "layout", "loading", "error", "not-found", "template", "default", "route"].includes(
      base
    )
  )
    continue;

  let hits = 0;
  for (const [other, text] of contents) {
    if (other === f) continue;
    if (
      text.includes(`/${base}"`) ||
      text.includes(`/${base}'`) ||
      text.includes(`./${base}"`) ||
      text.includes(`./${base}'`) ||
      text.includes(`../${base}"`) ||
      text.includes(`../${base}'`)
    ) {
      hits++;
      break;
    }
  }
  if (hits === 0) {
    const n = contents.get(f).split(/\n/).length;
    if (n > 100) flagged.push({ f, n });
  }
}

flagged.sort((a, b) => b.n - a.n);
console.log("Possibly unused (>100 lines, no import path hits):");
for (const x of flagged.slice(0, 30)) console.log(`${x.n}\t${x.f}`);
console.log("total", flagged.length);
