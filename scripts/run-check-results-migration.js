/**
 * Führt die Migration für check_results auf npcs aus (nutzt DATABASE_URL aus .env.local).
 * Aufruf: node scripts/run-check-results-migration.js
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
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250210110000_add_npcs_check_results.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: getDatabaseUrl() });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration erfolgreich ausgeführt: npcs.check_results Spalte.');
  } catch (err) {
    console.error('Fehler:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
