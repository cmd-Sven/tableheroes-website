/**
 * Erstellt die Tabelle world_tasks (DATABASE_URL aus .env.local).
 * Aufruf: node scripts/run-world-tasks-migration.js
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
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250210100000_create_world_tasks.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: getDatabaseUrl() });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration erfolgreich: Tabelle world_tasks erstellt.');
  } catch (err) {
    console.error('Fehler:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
