/**
 * Synchronisiert parsebare Rassenboni in world_lore.race_traits
 * und verknüpft Zwergenkultur.race_ids.
 *
 * Usage: npx tsx scripts/sync-race-lore-bonuses.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  KASSADRAS_RACE_BONUS_CATALOG,
  normalizeRaceKey,
  parseRaceTraits,
  serializeRaceTraits,
  type LoreRaceBonusSpec,
} from "../src/lib/lore-race-bonuses";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or service/anon key");
  process.exit(1);
}

const supabase = createClient(url, key);

const NARRATIVE_KEEP: Record<string, string> = {
  maschinenzwerge: `Physische Merkmale:
- zwischen 1,30 und 1,60 Meter groß (je nach Herkunft)
- zäh, robust und widerstandsfähig
- erreichen ein hohes Alter zwischen 350 bis 420 Jahre
- besondere Instinkte und geschickter Umgang im handwerklichen Bereich`,
  dahrinokzwerg: `Hügelzwerg-ähnliche Merkmale plus enge Naturverbundenheit im Dahorinwald.
Zusätzlich: Bund fürs Leben (permanenter Vertrauter).`,
};

async function main() {
  const { data: races, error } = await supabase
    .from("world_lore")
    .select("id, name, type, culture_id, race_traits, race_ids")
    .eq("type", "Rasse");

  if (error) throw error;

  let updated = 0;
  for (const race of races ?? []) {
    const key = normalizeRaceKey(race.name);
    let spec: LoreRaceBonusSpec | null = KASSADRAS_RACE_BONUS_CATALOG[key] ?? null;
    if (!spec) {
      for (const [ck, s] of Object.entries(KASSADRAS_RACE_BONUS_CATALOG)) {
        if (key.includes(ck) || ck.includes(key)) {
          spec = s;
          break;
        }
      }
    }
    if (!spec && key.includes("maschinen") && key.includes("zwerg")) {
      spec = KASSADRAS_RACE_BONUS_CATALOG.maschinenzwerge;
    }
    if (!spec && key.includes("dahrinok")) {
      spec = KASSADRAS_RACE_BONUS_CATALOG.dahrinokzwerg;
    }
    if (!spec) continue;

    const existing = parseRaceTraits(race.race_traits);
    if (existing.bonuses?.v === 1) {
      console.log(`skip (already structured): ${race.name}`);
      continue;
    }

    const display =
      NARRATIVE_KEEP[normalizeRaceKey(race.name)] ||
      existing.displayText ||
      spec.summary ||
      "";
    const next = serializeRaceTraits(display, spec);
    const { error: upErr } = await supabase
      .from("world_lore")
      .update({ race_traits: next })
      .eq("id", race.id);
    if (upErr) {
      console.error(`fail ${race.name}:`, upErr.message);
      continue;
    }
    console.log(`updated: ${race.name}`);
    updated++;
  }

  const ZWERG_CULTURE = "0741dc44-a69d-4e70-8115-0e06d5c1bf0d";
  const dwarfRaceIds = (races ?? [])
    .filter((r) => r.culture_id === ZWERG_CULTURE)
    .map((r) => r.id);
  if (dwarfRaceIds.length > 0) {
    const { error: cultErr } = await supabase
      .from("world_lore")
      .update({ race_ids: dwarfRaceIds })
      .eq("id", ZWERG_CULTURE);
    if (cultErr) console.error("Zwergenkultur race_ids:", cultErr.message);
    else console.log(`Zwergenkultur race_ids → ${dwarfRaceIds.length} Rassen`);
  }

  console.log(`Done. Updated ${updated} race trait rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
