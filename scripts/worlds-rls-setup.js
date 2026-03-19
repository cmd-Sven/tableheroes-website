/**
 * RLS für Tabelle worlds: aktivieren, alte Policies (owner_id) entfernen, GM-Policy anlegen.
 * Nutzt DATABASE_URL aus .env.local.
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
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL fehlt in .env.local");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();

    // 1) RLS aktivieren
    await client.query("ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;");
    console.log("✅ RLS für Tabelle worlds aktiviert.");

    // 2) Bestehende Policies auflisten (um ggf. owner_id-Policies zu löschen)
    const list = await client.query(`
      SELECT policyname FROM pg_policies WHERE tablename = 'worlds' AND schemaname = 'public';
    `);
    for (const row of list.rows || []) {
      const name = row.policyname;
      try {
        await client.query(`DROP POLICY IF EXISTS "${name}" ON worlds;`);
        console.log("  Gelöscht: Policy", name);
      } catch (e) {
        console.warn("  Warnung beim Löschen von", name, ":", e.message);
      }
    }

    // 3) Neue Policy: GMs can manage their own worlds
    await client.query(`
      CREATE POLICY "GMs can manage their own worlds"
        ON worlds FOR ALL
        USING (auth.uid() = gm_id)
        WITH CHECK (auth.uid() = gm_id);
    `);
    console.log('✅ Policy "GMs can manage their own worlds" erstellt.');
  } catch (err) {
    console.error("Fehler:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
