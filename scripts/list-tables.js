/**
 * Liest Tabellen aus der Supabase/PostgreSQL-Datenbank (Schema public).
 * Nutzt DATABASE_URL aus .env.local.
 * Ausführung: node scripts/list-tables.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local nicht gefunden.");
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) env[key] = value.slice(1, -1).replace(/\\"/g, '"');
    else if (value.startsWith("'") && value.endsWith("'")) env[key] = value.slice(1, -1).replace(/\\'/g, "'");
    else env[key] = value;
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
    const res = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    console.log("Tabellen in der Datenbank (Schema: public):\n");
    if (res.rows.length === 0) {
      console.log("  (keine Tabellen gefunden)");
    } else {
      res.rows.forEach((r) => console.log("  -", r.table_name));
      console.log("\nGesamt:", res.rows.length, "Tabelle(n)");
    }
  } catch (err) {
    console.error("Fehler:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
