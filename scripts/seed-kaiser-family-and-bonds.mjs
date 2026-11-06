/**
 * Legt Flammguard-Familie + Kaiser-Beziehungen an (createNPC / createRelationship Schema).
 * Dry-run: node scripts/seed-kaiser-family-and-bonds.mjs
 * Apply:   node scripts/seed-kaiser-family-and-bonds.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
  }
  return env;
}

const APPLY = process.argv.includes("--apply");
const WORLD_ID = "689a0f11-7aa3-440b-9527-c6da0a84aebb";
const KAISER_ID = "43ceede2-211f-8ee9-7cc8-5e2deb41e173";
const LOC = {
  festungspalast: "98fd35d1-f789-4c91-afef-0215ed4b21e7",
  kathedrale: "3ee7e63f-4c9a-41d3-97dc-2b729b80f93e",
  observatorium: "e0d7fe0a-4805-4abf-8b0c-fa3f3101b9d6",
};

const FAMILY = {
  edward: "aaf40001-0001-4000-8000-000000000001",
  garrik: "aaf40001-0001-4000-8000-000000000002",
  aurill: "aaf40001-0001-4000-8000-000000000003",
  karolyn: "aaf40001-0001-4000-8000-000000000004",
};

/** Bestehende Aurenfurt-Schlüsselrollen */
const CITY = {
  brann: "aad129c3-fe60-0738-5f8c-18860201788f",
  aldric: "4e07fbd5-f913-8f8a-e0e8-8a16586dd761",
  mikaro: "0a2da011-0455-b584-8cf7-9ee4fcc8910a",
  elowen: "10154799-c01b-ed15-b1d3-01acf1f659e0",
  seraphine: "b56bba46-4306-24fc-ee28-abeaf9e2874f",
  gretal: "9788af58-3e0b-3df3-4137-7848fc25d3d5",
  lyra: "e024e93e-6bc1-af68-c825-b76a418da33a",
  kael: "c72b9165-f8fe-ee00-64c6-1dae43dbcc2f",
  nessa: "ed80e0cf-cb9a-8ae9-1098-4d163c19c529",
  torvald: "78db793b-1d1b-5c95-a126-7f483148f055",
};

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const familyNpcs = [
  {
    id: FAMILY.edward,
    name: "Edward Flammguard",
    title: "Kronprinz",
    role: "Gardist in Ausbildung",
    race: "Mensch",
    alignment: "Lawful Neutral",
    status: "Alive",
    description:
      "Ältester Sohn und direkter Nachfolger von Kaiser Artheus Flammguard dem Zweiten. Er vollzieht derzeit seine Ausbildung zum Gardisten und residiert mit der Kaiserfamilie im Festungspalast zu Aurenfurt.",
    appearance: null,
    personality_traits: null,
    gm_notes: "Familie des Kaisers — Beruf und Rolle aus dem Kaiser-Eintrag, keine zusätzlichen Lore-Fakten.",
    home_location_id: LOC.festungspalast,
    current_location_id: LOC.festungspalast,
    for_city_simulation: true,
    city_influence_tier: "authority_faction",
    city_axis_loyal_criminal: -3,
    city_axis_greedy_altruist: 0,
    city_axis_pious_skeptic: 0,
    city_axis_superstition_reason: 1,
    city_deity: null,
    city_faction_id: "stadtwachen",
    city_agenda: "Ausbildung zum Gardisten abschließen und als Nachfolger des Kaisers bereitstehen.",
    city_event_deck: [],
    city_abilities: [],
    city_card_plays: [],
  },
  {
    id: FAMILY.garrik,
    name: "Garrik Flammguard",
    title: "Prinz-Gelehrter",
    role: "Gelehrter der Magie",
    race: "Mensch",
    alignment: "Neutral Good",
    status: "Alive",
    description:
      "Zweiter Sohn von Kaiser Artheus Flammguard dem Zweiten. Ein eifriger Gelehrter, der sich der Magie verschrieben hat. Er gehört zur Kaiserfamilie im Festungspalast zu Aurenfurt.",
    appearance: null,
    personality_traits: null,
    gm_notes: "Familie des Kaisers — Beruf und Rolle aus dem Kaiser-Eintrag, keine zusätzlichen Lore-Fakten.",
    home_location_id: LOC.festungspalast,
    current_location_id: LOC.observatorium,
    for_city_simulation: true,
    city_influence_tier: "local",
    city_axis_loyal_criminal: -2,
    city_axis_greedy_altruist: 1,
    city_axis_pious_skeptic: 1,
    city_axis_superstition_reason: 3,
    city_deity: null,
    city_faction_id: "zirkel-observatorium",
    city_agenda: "Als Gelehrter der Magie lernen und forschen.",
    city_event_deck: [],
    city_abilities: [],
    city_card_plays: [],
  },
  {
    id: FAMILY.aurill,
    name: "Aurill Flammguard",
    title: "Prinzessin",
    role: "Novizin der Kathedrale zu Elysia",
    race: "Mensch",
    alignment: "Lawful Good",
    status: "Alive",
    description:
      "Einzige Tochter von Kaiser Artheus Flammguard dem Zweiten — eine junge Schwester von Elysia. Sie widmet sich der Kathedrale zu Elysia zusammen mit ihrer Mutter Karolyn.",
    appearance: null,
    personality_traits: null,
    gm_notes: "Familie des Kaisers — Beruf und Rolle aus dem Kaiser-Eintrag, keine zusätzlichen Lore-Fakten.",
    home_location_id: LOC.festungspalast,
    current_location_id: LOC.kathedrale,
    for_city_simulation: true,
    city_influence_tier: "local",
    city_axis_loyal_criminal: -2,
    city_axis_greedy_altruist: 2,
    city_axis_pious_skeptic: -3,
    city_axis_superstition_reason: -1,
    city_deity: "Elysia",
    city_faction_id: "bund-silberne-rose",
    city_agenda: "Sich der Kathedrale zu Elysia widmen, gemeinsam mit der Mutter.",
    city_event_deck: [],
    city_abilities: [],
    city_card_plays: [],
  },
  {
    id: FAMILY.karolyn,
    name: "Karolyn Flammguard",
    title: "Kaiserin",
    role: "Oberhaupt der Kirche von Elysia",
    race: "Mensch",
    alignment: "Neutral Good",
    status: "Alive",
    description:
      "Ehefrau von Kaiser Artheus Flammguard dem Zweiten. Sie stammt ursprünglich aus dem Reich der Westwinder, ist Oberhaupt der Kirche von Elysia und widmet sich zusammen mit ihrer Tochter Aurill religiösen Anlässen. Für ihren Gatten ist sie eine wichtige moralische Stütze, da sie weitaus mehr Empathie besitzt als er.",
    appearance: null,
    personality_traits: "Empathischer als ihr Gemahl; moralische Stütze am Hof.",
    gm_notes: "Familie des Kaisers — Beruf und Rolle aus dem Kaiser-Eintrag, keine zusätzlichen Lore-Fakten.",
    home_location_id: LOC.festungspalast,
    current_location_id: LOC.kathedrale,
    for_city_simulation: true,
    city_influence_tier: "authority_faction",
    city_axis_loyal_criminal: -2,
    city_axis_greedy_altruist: 3,
    city_axis_pious_skeptic: -4,
    city_axis_superstition_reason: -1,
    city_deity: "Elysia",
    city_faction_id: "bund-silberne-rose",
    city_agenda: "Kirche von Elysia führen und religiöse Anlässe mit der Tochter gestalten.",
    city_event_deck: [],
    city_abilities: [],
    city_card_plays: [],
  },
];

/** source = Kaiser (außer Mutter-Kinder / Geschwister) */
const familyRels = [
  {
    source_id: KAISER_ID,
    target_id: FAMILY.edward,
    source_role: "Vater",
    target_role: "Sohn",
    intensity: 75,
    monologue_source: "Mein Erbe. Die Garde formt ihn, bevor der Thron es tut.",
    monologue_target: "Vater erwartet Treue und Disziplin — ich werde sie liefern.",
    is_public: true,
    public_description: "Kaiser Artheus und sein ältester Sohn Edward, der Gardisten-Ausbildung.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: FAMILY.garrik,
    source_role: "Vater",
    target_role: "Sohn",
    intensity: 65,
    monologue_source: "Garrik sucht in Büchern, was ich in Befehlen halte.",
    monologue_target: "Vater toleriert meine Studien — solange ich dem Hause diene.",
    is_public: true,
    public_description: "Kaiser Artheus und sein zweiter Sohn Garrik, der Gelehrte der Magie.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: FAMILY.aurill,
    source_role: "Vater",
    target_role: "Tochter",
    intensity: 70,
    monologue_source: "Aurill gehört dem Licht — und dem Hause Flammguard.",
    monologue_target: "Vater ist fern, doch die Kathedrale und Mutter halten mich.",
    is_public: true,
    public_description: "Kaiser Artheus und seine Tochter Aurill an der Kathedrale zu Elysia.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: FAMILY.karolyn,
    source_role: "Ehemann",
    target_role: "Ehefrau",
    intensity: 85,
    monologue_source: "Karolyn hält, was ich nicht fühle — ohne sie wäre der Hof kälter.",
    monologue_target: "Artheus trägt die Last; ich trage das, was er nicht zeigen kann.",
    is_public: true,
    public_description: "Kaiser Artheus und Kaiserin Karolyn Flammguard.",
    affects_city_sim: true,
  },
  {
    source_id: FAMILY.karolyn,
    target_id: FAMILY.edward,
    source_role: "Mutter",
    target_role: "Sohn",
    intensity: 70,
    monologue_source: "Edward wird stark — möge er auch menschlich bleiben.",
    monologue_target: "Mutter sieht mehr als nur den Thronfolger in mir.",
    is_public: true,
    public_description: "Kaiserin Karolyn und Sohn Edward.",
    affects_city_sim: true,
  },
  {
    source_id: FAMILY.karolyn,
    target_id: FAMILY.garrik,
    source_role: "Mutter",
    target_role: "Sohn",
    intensity: 68,
    monologue_source: "Garriks Eifer ehrt uns — solange er das Licht nicht vergisst.",
    monologue_target: "Mutter versteht meine Neugier besser als der Hof.",
    is_public: true,
    public_description: "Kaiserin Karolyn und Sohn Garrik.",
    affects_city_sim: true,
  },
  {
    source_id: FAMILY.karolyn,
    target_id: FAMILY.aurill,
    source_role: "Mutter",
    target_role: "Tochter",
    intensity: 90,
    monologue_source: "An Aurills Seite diene ich Elysia — und unserem Hause.",
    monologue_target: "Mit Mutter an der Kathedrale bin ich, wo ich hingehöre.",
    is_public: true,
    public_description: "Kaiserin Karolyn und Tochter Aurill an der Kathedrale zu Elysia.",
    affects_city_sim: true,
  },
  {
    source_id: FAMILY.edward,
    target_id: FAMILY.garrik,
    source_role: "Bruder",
    target_role: "Bruder",
    intensity: 55,
    monologue_source: "Garrik liest, während ich trainiere — beides braucht das Reich.",
    monologue_target: "Edward trägt die Last des Erbes; ich trage die der Gelehrsamkeit.",
    is_public: true,
    public_description: "Die Brüder Edward und Garrik Flammguard.",
    affects_city_sim: false,
  },
  {
    source_id: FAMILY.edward,
    target_id: FAMILY.aurill,
    source_role: "Bruder",
    target_role: "Schwester",
    intensity: 60,
    monologue_source: "Aurill wählt den Tempel; ich die Garde — beide dienen dem Haus.",
    monologue_target: "Edward wird einst Kaiser; ich bleibe dem Licht nahe.",
    is_public: true,
    public_description: "Edward und Aurill Flammguard.",
    affects_city_sim: false,
  },
  {
    source_id: FAMILY.garrik,
    target_id: FAMILY.aurill,
    source_role: "Bruder",
    target_role: "Schwester",
    intensity: 58,
    monologue_source: "Aurills Glaube und meine Studien — verschiedene Wege, ein Blut.",
    monologue_target: "Garrik sucht Wissen; ich suche Gnade — wir verstehen uns.",
    is_public: true,
    public_description: "Garrik und Aurill Flammguard.",
    affects_city_sim: false,
  },
];

const cityRels = [
  // Brann existiert bereits — nur prüfen, nicht doppelt anlegen
  {
    source_id: KAISER_ID,
    target_id: CITY.aldric,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 25,
    monologue_source: "Aldrics Siegel formen die Stadt, bevor sie es merkt — unter meinem Wort.",
    monologue_target: "Der Kaiser spricht; die Kanzlei schreibt. So bleibt Ordnung.",
    is_public: false,
    public_description: "Kaiser und Hofkanzlist Aldric Pergament.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.mikaro,
    source_role: "Auftraggeber",
    target_role: "Untertan",
    intensity: 20,
    monologue_source: "Die Hofkapelle hält den Palast im Licht — nützlich und sichtbar.",
    monologue_target: "Dem Kaiser diene ich am Altar der Silbernen Rose.",
    is_public: true,
    public_description: "Kaiser und Hofkapellan Mikaro Kelchhof.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.elowen,
    source_role: "Verbündeter",
    target_role: "Verbündeter",
    intensity: 35,
    monologue_source: "Elowens Predigt hält Elysia in den Höfen — und Karolyns Kirche nah am Thron.",
    monologue_target: "Der Kaiser duldet unser Licht; wir halten die Stadt vor Chromus.",
    is_public: true,
    public_description: "Kaiser und Priorin Elowen Silberblatt.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.seraphine,
    source_role: "Auftraggeber",
    target_role: "Geschäftspartner",
    intensity: 15,
    monologue_source: "Seide zahlt Standgeld — und kauft Einfluss. Beides bleibt unter Aufsicht.",
    monologue_target: "Der Thron braucht Handel; Handel braucht den Thron.",
    is_public: false,
    public_description: "Kaiser und Handelskonsulin Seraphine Seidenhand.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.gretal,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 18,
    monologue_source: "Der Zunftbund hält die Werkstätten — solange er meinen Gesetzen folgt.",
    monologue_target: "Der Kaiser setzt Preise und Pflichten; wir halten die Stadt am Laufen.",
    is_public: true,
    public_description: "Kaiser und Zunftvögtin Gretal Hammerklang.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.lyra,
    source_role: "Auftraggeber",
    target_role: "Verbündeter",
    intensity: 22,
    monologue_source: "Das Observatorium sieht mehr als der Hof zugibt — und dient, wenn ich es rufe.",
    monologue_target: "Der Kaiser braucht klare Sterne; wir liefern Wissen ohne Panik.",
    is_public: false,
    public_description: "Kaiser und Magisterin Lyra Sternenwacht.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.kael,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -20,
    monologue_source: "Chronos-Zwang am Palast — nützlich, solange er nicht regiert.",
    monologue_target: "Der Kaiser zögert; Zahlen und Kerzen warten nicht.",
    is_public: false,
    public_description: "Spannung zwischen Kaiser und Numerus Kael Chronosiegel.",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.nessa,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 10,
    monologue_source: "Der Westmarkt spricht in Standgebühren — ich höre mit.",
    monologue_target: "Kaiserliche Ordnung hält Diebstahl und Preise im Zaum — meistens.",
    is_public: false,
    public_description: "Kaiser und Standmeisterin Nessa Markttuch (Westmarkt).",
    affects_city_sim: true,
  },
  {
    source_id: KAISER_ID,
    target_id: CITY.torvald,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 12,
    monologue_source: "Das Nordtor schützt Adel und Tempel — Branns Kette endet bei mir.",
    monologue_target: "Befehl vom Palast gilt am Tor wie in der Wache.",
    is_public: false,
    public_description: "Kaiser und Torhauptmann Torvald Wappenfels (Nordtor).",
    affects_city_sim: true,
  },
];

async function existingBond(a, b) {
  const { data } = await supabase
    .from("relationships")
    .select("id, source_id, target_id, source_role, target_role, intensity")
    .eq("world_id", WORLD_ID)
    .or(
      `and(source_id.eq.${a},target_id.eq.${b}),and(source_id.eq.${b},target_id.eq.${a})`,
    )
    .maybeSingle();
  return data;
}

async function upsertNpc(npc) {
  const { data: existing } = await supabase.from("npcs").select("id, name").eq("id", npc.id).maybeSingle();
  if (existing) {
    console.log(`  SKIP NPC (exists): ${npc.name} (${npc.id})`);
    return { id: existing.id, name: existing.name, created: false };
  }
  const { data: byName } = await supabase
    .from("npcs")
    .select("id, name")
    .eq("world_id", WORLD_ID)
    .eq("name", npc.name)
    .maybeSingle();
  if (byName) {
    console.log(`  SKIP NPC (name exists): ${byName.name} (${byName.id})`);
    return { id: byName.id, name: byName.name, created: false };
  }

  console.log(`  INSERT NPC: ${npc.name} — ${npc.role}`);
  if (!APPLY) return { id: npc.id, name: npc.name, created: true };

  const { data, error } = await supabase.from("npcs").insert({ ...npc, world_id: WORLD_ID }).select("id, name").single();
  if (error) throw new Error(`NPC ${npc.name}: ${error.message}`);
  return { id: data.id, name: data.name, created: true };
}

async function insertRel(rel, label) {
  const existing = await existingBond(rel.source_id, rel.target_id);
  if (existing) {
    console.log(
      `  SKIP REL (${label}): ${existing.source_role}↔${existing.target_role} intensity=${existing.intensity} id=${existing.id}`,
    );
    return { skipped: true, id: existing.id };
  }
  console.log(
    `  INSERT REL (${label}): ${rel.source_role}↔${rel.target_role} intensity=${rel.intensity}`,
  );
  if (!APPLY) return { skipped: false, id: null };

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      world_id: WORLD_ID,
      source_id: rel.source_id,
      target_id: rel.target_id,
      target_type: "npc",
      source_role: rel.source_role,
      target_role: rel.target_role,
      intensity: rel.intensity,
      monologue_source: rel.monologue_source,
      monologue_target: rel.monologue_target,
      is_public: rel.is_public,
      affects_city_sim: rel.affects_city_sim !== false,
      public_description: rel.public_description ?? "",
      history: [],
    })
    .select("id")
    .single();
  if (error) throw new Error(`Rel ${label}: ${error.message}`);
  return { skipped: false, id: data.id };
}

async function main() {
  console.log(APPLY ? "APPLY mode" : "DRY-RUN mode (pass --apply to write)");
  console.log(`World: ${WORLD_ID}`);

  const { data: kaiser, error: kErr } = await supabase
    .from("npcs")
    .select("id, name")
    .eq("id", KAISER_ID)
    .single();
  if (kErr || !kaiser) throw new Error(`Kaiser nicht gefunden: ${kErr?.message}`);
  console.log(`Kaiser: ${kaiser.name} (${kaiser.id})`);

  console.log("\n=== Familien-NPCs ===");
  const created = [];
  for (const npc of familyNpcs) {
    created.push(await upsertNpc(npc));
  }

  console.log("\n=== Familien-Beziehungen ===");
  const famResults = [];
  for (const rel of familyRels) {
    famResults.push(await insertRel(rel, "Familie"));
  }

  console.log("\n=== Bestehende Brann-Beziehung ===");
  const brann = await existingBond(KAISER_ID, CITY.brann);
  if (brann) {
    console.log(
      `  OK Brann: ${brann.source_role}↔${brann.target_role} intensity=${brann.intensity} (${brann.id})`,
    );
  } else {
    console.log("  FEHLT Brann — würde anlegen");
    await insertRel(
      {
        source_id: CITY.brann,
        target_id: KAISER_ID,
        source_role: "Untertan",
        target_role: "Vorgesetzter",
        intensity: 10,
        monologue_source: "Dem Kaiser treu — Befehl ist Gesetz.",
        monologue_target: "Brann hält die Wache; ich halte ihn.",
        is_public: false,
        public_description: "Kaiser und Hauptmann Brann Eisenwall.",
        affects_city_sim: true,
      },
      "Brann",
    );
  }

  console.log("\n=== Aurenfurt-Schlüsselrollen ===");
  const cityResults = [];
  for (const rel of cityRels) {
    cityResults.push(await insertRel(rel, "Stadt"));
  }

  console.log("\n=== Fertig ===");
  console.log(`NPCs: ${created.length}, Fam-Rels planned: ${familyRels.length}, Stadt-Rels planned: ${cityRels.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
