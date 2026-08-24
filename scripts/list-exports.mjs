/**
 * List export symbols and line numbers for oversized modules.
 */
import fs from "fs";

const files = process.argv.slice(2);
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  console.log(`\n${f} (${lines.length})`);
  for (let i = 0; i < lines.length; i++) {
    const m =
      lines[i].match(/^export async function (\w+)/) ||
      lines[i].match(/^export function (\w+)/) ||
      lines[i].match(/^export type (\w+)/) ||
      lines[i].match(/^export interface (\w+)/) ||
      lines[i].match(/^export const (\w+)/);
    if (m) console.log(`  ${i + 1}: ${m[1]}`);
  }
}
