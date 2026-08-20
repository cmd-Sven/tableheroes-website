/**
 * Fügt combat_started zu session_live_states hinzu (DATABASE_URL aus .env.local).
 * Aufruf: node scripts/run-combat-started-migration.js
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function getDatabaseUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local nicht gefunden. Bitte DATABASE_URL setzen.");
  }
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/DATABASE_URL=(.+)/);
  if (!match) throw new Error("DATABASE_URL in .env.local nicht gefunden.");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sqlPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260820090000_combat_started_phase.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: getDatabaseUrl() });
  try {
    await client.connect();
    await client.query(sql);
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log("Migration erfolgreich: combat_started Spalte erstellt.");
  } catch (err) {
    console.error("Fehler:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
