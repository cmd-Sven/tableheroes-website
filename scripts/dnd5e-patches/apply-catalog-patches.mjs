/**
 * Merge non-SRD / TableHeroes catalog extensions after `catalog:dnd5e`.
 * Survives rebuilds: build script calls this after API fetch + DE apply.
 *
 * Run standalone: node scripts/dnd5e-patches/apply-catalog-patches.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "../../src/lib/characters/dnd5e/progression/data");

/** @param {string} file */
async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

/**
 * Upsert spells from extra-spells.json; merge classes if spell already exists.
 * @param {Array<Record<string, unknown>>} spells
 * @param {Array<Record<string, unknown>>} extras
 */
function mergeExtraSpells(spells, extras) {
  let added = 0;
  let updated = 0;
  for (const extra of extras) {
    const idx = spells.findIndex((s) => s.id === extra.id);
    if (idx < 0) {
      spells.push({ ...extra });
      added++;
      continue;
    }
    const existing = spells[idx];
    const classes = [
      ...new Set([
        ...((existing.classes ?? [])),
        ...((extra.classes ?? [])),
      ]),
    ].sort();
    spells[idx] = {
      ...existing,
      ...extra,
      classes,
      // Prefer patch DE/EN text when provided
      nameDe: extra.nameDe ?? existing.nameDe,
      nameEn: extra.nameEn ?? existing.nameEn,
      descriptionDe: extra.descriptionDe ?? existing.descriptionDe,
      descriptionEn: extra.descriptionEn ?? existing.descriptionEn,
    };
    updated++;
  }
  spells.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { added, updated, total: spells.length };
}

/**
 * Merge subclass + top-level features into a class JSON (idempotent by id).
 * @param {Record<string, unknown>} klass
 * @param {{ features?: unknown[]; subclass?: Record<string, unknown> }} patch
 */
function mergeClassSubclassPatch(klass, patch) {
  if (!klass.features) klass.features = [];
  if (!klass.subclasses) klass.subclasses = [];

  let featuresAdded = 0;
  for (const feat of patch.features ?? []) {
    const list = /** @type {Array<{ id: string }>} */ (klass.features);
    if (list.some((f) => f.id === feat.id)) {
      const i = list.findIndex((f) => f.id === feat.id);
      list[i] = { ...list[i], ...feat };
    } else {
      list.push(feat);
      featuresAdded++;
    }
  }

  let subclassUpserted = false;
  if (patch.subclass) {
    const subs = /** @type {Array<{ id: string; features?: unknown[] }>} */ (
      klass.subclasses
    );
    const i = subs.findIndex((s) => s.id === patch.subclass.id);
    if (i < 0) {
      subs.push(patch.subclass);
      subclassUpserted = true;
    } else {
      const prev = subs[i];
      const featMap = new Map(
        (prev.features ?? []).map((f) => [/** @type {{id:string}} */ (f).id, f]),
      );
      for (const f of patch.subclass.features ?? []) {
        featMap.set(/** @type {{id:string}} */ (f).id, f);
      }
      subs[i] = {
        ...prev,
        ...patch.subclass,
        features: [...featMap.values()].sort(
          (a, b) =>
            (/** @type {{level?:number}} */ (a).level ?? 0) -
              (/** @type {{level?:number}} */ (b).level ?? 0) ||
            String(/** @type {{id:string}} */ (a).id).localeCompare(
              String(/** @type {{id:string}} */ (b).id),
            ),
        ),
      };
      subclassUpserted = true;
    }
  }

  return { featuresAdded, subclassUpserted };
}

/**
 * Ensure Life / Grave domain spell features carry grantedSpellIds.
 * @param {Record<string, unknown>} klass
 */
function ensureLifeDomainSpellGrants(klass) {
  const lifeDomainSpells = [
    {
      id: "life-domain-spells-1",
      level: 1,
      nameEn: "Domain Spells (1st)",
      nameDe: "Domänenzauber (1. Grad)",
      descriptionEn:
        "You always have the following spells prepared: Bless, Cure Wounds. They don't count against your number of prepared spells.",
      descriptionDe:
        "Du hast stets die folgenden Zauber vorbereitet: Segen, Wunden heilen. Sie zählen nicht gegen deine vorbereiteten Zauber.",
      subclass: "life",
      grantedSpellIds: ["bless", "cure-wounds"],
    },
    {
      id: "life-domain-spells-2",
      level: 3,
      nameEn: "Domain Spells (2nd)",
      nameDe: "Domänenzauber (2. Grad)",
      descriptionEn:
        "You always have the following spells prepared: Lesser Restoration, Spiritual Weapon.",
      descriptionDe:
        "Du hast stets die folgenden Zauber vorbereitet: Geringe Wiederherstellung, Geistige Waffe.",
      subclass: "life",
      grantedSpellIds: ["lesser-restoration", "spiritual-weapon"],
    },
    {
      id: "life-domain-spells-3",
      level: 5,
      nameEn: "Domain Spells (3rd)",
      nameDe: "Domänenzauber (3. Grad)",
      descriptionEn:
        "You always have the following spells prepared: Beacon of Hope, Revivify.",
      descriptionDe:
        "Du hast stets die folgenden Zauber vorbereitet: Hoffnungsschimmer, Wiederbeleben.",
      subclass: "life",
      grantedSpellIds: ["beacon-of-hope", "revivify"],
    },
    {
      id: "life-domain-spells-4",
      level: 7,
      nameEn: "Domain Spells (4th)",
      nameDe: "Domänenzauber (4. Grad)",
      descriptionEn:
        "You always have the following spells prepared: Death Ward, Guardian of Faith.",
      descriptionDe:
        "Du hast stets die folgenden Zauber vorbereitet: Todesschutz, Glaubenswächter.",
      subclass: "life",
      grantedSpellIds: ["death-ward", "guardian-of-faith"],
    },
    {
      id: "life-domain-spells-5",
      level: 9,
      nameEn: "Domain Spells (5th)",
      nameDe: "Domänenzauber (5. Grad)",
      descriptionEn:
        "You always have the following spells prepared: Mass Cure Wounds, Raise Dead.",
      descriptionDe:
        "Du hast stets die folgenden Zauber vorbereitet: Massen-Wunden heilen, Tote erwecken.",
      subclass: "life",
      grantedSpellIds: ["mass-cure-wounds", "raise-dead"],
    },
  ];

  const features = /** @type {Array<{ id: string }>} */ (klass.features ?? []);
  for (const feat of lifeDomainSpells) {
    if (!features.some((f) => f.id === feat.id)) features.push(feat);
  }
  klass.features = features;

  const life = (klass.subclasses ?? []).find((s) => s.id === "life");
  if (life) {
    if (!life.features) life.features = [];
    for (const feat of lifeDomainSpells) {
      const i = life.features.findIndex((f) => f.id === feat.id);
      if (i < 0) life.features.push(feat);
      else life.features[i] = { ...life.features[i], ...feat };
    }
  }
}

export async function applyCatalogPatches() {
  const extras = await readJson(path.join(__dirname, "extra-spells.json"));
  const gravePatch = await readJson(path.join(__dirname, "cleric-grave-domain.json"));
  const arcaneTricksterPatch = await readJson(
    path.join(__dirname, "rogue-arcane-trickster.json"),
  );

  const spellsPath = path.join(DATA, "spells.json");
  const spells = await readJson(spellsPath);
  const spellStats = mergeExtraSpells(spells, extras);
  await writeFile(spellsPath, JSON.stringify(spells, null, 2) + "\n");

  const clericPath = path.join(DATA, "classes", "cleric.json");
  const cleric = await readJson(clericPath);
  ensureLifeDomainSpellGrants(cleric);
  const clericStats = mergeClassSubclassPatch(cleric, gravePatch);
  await writeFile(clericPath, JSON.stringify(cleric, null, 2) + "\n");

  const roguePath = path.join(DATA, "classes", "rogue.json");
  const rogue = await readJson(roguePath);
  const rogueStats = mergeClassSubclassPatch(rogue, arcaneTricksterPatch);
  await writeFile(roguePath, JSON.stringify(rogue, null, 2) + "\n");

  return { spellStats, classStats: { cleric: clericStats, rogue: rogueStats } };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  applyCatalogPatches()
    .then((r) => {
      console.log("Catalog patches applied:", JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
