/**
 * Verifikation: SELECT id, name, gm_id FROM worlds LIMIT 1
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local nicht gefunden.");
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, name, gm_id FROM worlds LIMIT 1");
  await client.end();
  if (res.rows.length === 0) {
    console.log("Keine Einträge in worlds.");
    return;
  }
  const r = res.rows[0];
  console.log("=== Test-Abfrage: worlds (LIMIT 1) ===\n");
  console.log("  id:   ", r.id);
  console.log("  name: ", r.name);
  console.log("  gm_id:", r.gm_id);
  console.log("\n→ Damit die Welt im Frontend sichtbar ist, muss deine eingeloggte User-ID (auth.uid()) mit dieser gm_id übereinstimmen.");
}

main().catch((e) => { console.error(e); process.exit(1); });
