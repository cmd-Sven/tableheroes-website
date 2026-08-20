const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const content = fs.readFileSync(envPath, "utf8");
const databaseUrl = content
  .match(/DATABASE_URL=(.+)/)[1]
  .trim()
  .replace(/^["']|["']$/g, "");

(async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log("PostgREST schema cache reload triggered.");
  await client.end();
})();
