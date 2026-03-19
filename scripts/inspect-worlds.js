/**
 * Prüft Tabelle worlds: Spalten, Anzahl Zeilen, Beispiele (id, name).
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
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
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

    // 1) Spalten
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'worlds'
      ORDER BY ordinal_position
    `);
    console.log("=== Spalten der Tabelle 'worlds' ===\n");
    if (cols.rows.length === 0) {
      console.log("Tabelle 'worlds' nicht gefunden oder keine Spalten.");
      return;
    }
    cols.rows.forEach((r) => console.log("  -", r.column_name, "(", r.data_type, ")", r.is_nullable === "YES" ? "nullable" : "NOT NULL"));
    console.log("");

    // 2) Anzahl + Beispiele (id, name)
    const countRes = await client.query("SELECT COUNT(*) AS cnt FROM public.worlds");
    const count = parseInt(countRes.rows[0].cnt, 10);
    console.log("=== Einträge ===\n  Anzahl:", count, "\n");

    if (count > 0) {
      const sample = await client.query(`
        SELECT id, name FROM public.worlds ORDER BY created_at DESC NULLS LAST, id LIMIT 10
      `);
      console.log("  Beispiele (id, name) – bis zu 10 Einträge:\n");
      sample.rows.forEach((r) => console.log("    id:", r.id, "  name:", r.name ?? "(null)"));
    }
  } catch (err) {
    console.error("Fehler:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
