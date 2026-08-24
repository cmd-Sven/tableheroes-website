import fs from "fs";
const lines = fs
  .readFileSync("src/components/dashboard/campaigns/NPCDetailPage.tsx", "utf8")
  .split(/\r?\n/);
for (let i = 724; i < Math.min(2205, lines.length); i++) {
  const t = lines[i].trim();
  if (
    t.startsWith("{/*") ||
    t.startsWith("<h2") ||
    t.startsWith("<h3") ||
    (t.includes("font-cinzel") && t.startsWith("<"))
  ) {
    if (t.length < 160) console.log(i + 1 + ": " + t);
  }
}
