import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    /* ignore */
  }
}

loadEnvLocal();
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) {
  console.error("DATABASE_URL fehlt");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
await client.query(
  `ALTER TABLE public.session_live_states
   ADD COLUMN IF NOT EXISTS aurenfurt_party_tokens jsonb NOT NULL DEFAULT '{}'::jsonb`,
);
console.log("aurenfurt_party_tokens column ready");
await client.end();
