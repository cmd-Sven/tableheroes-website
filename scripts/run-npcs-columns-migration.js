/**
 * Führt die Migration für fehlende npcs-Spalten aus (DATABASE_URL aus .env.local).
 * Aufruf: node scripts/run-npcs-columns-migration.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local nicht gefunden. Bitte DATABASE_URL setzen.');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL=(.+)/);
  if (!match) throw new Error('DATABASE_URL in .env.local nicht gefunden.');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250210130000_add_npcs_location_and_other_columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: getDatabaseUrl() });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration erfolgreich: npcs (current_location_id, home_location_id, title, status, faction_id, narrative_hooks, is_secret_antagonist, hidden_agenda, true_nature).');
  } catch (err) {
    console.error('Fehler:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
