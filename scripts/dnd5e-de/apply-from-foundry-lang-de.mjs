/**
 * Apply German translations to the local D&D 5e progression catalog.
 *
 * Primary source for spell/feature/race names + descriptions:
 *   mhilbrunner/foundryvtt-dnd5e-lang-de (Babele compendia, SRD-oriented)
 *
 * Cross-check for spell names (optional, --verify-names):
 *   dnddeutsch.de JSON Übersetzer (PHB/SRD DE naming conventions)
 *
 * Official German SRD descriptions also available at openrpg.de (CC-BY-4.0).
 *
 * Run: node scripts/dnd5e-de/apply-from-foundry-lang-de.mjs
 *      node scripts/dnd5e-de/apply-from-foundry-lang-de.mjs --verify-names
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RACE_TRAIT_FALLBACKS,
  FEATURE_NAME_FALLBACKS,
  FEATURE_DESCRIPTION_FALLBACKS,
  SUBCLASS_NAME_DE,
  lookupCandidates,
  translateFeatureNameHeuristic,
} from "./fallbacks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const DATA = path.join(ROOT, "src/lib/characters/dnd5e/progression/data");
const CACHE = path.join(__dirname, "cache");

const FOUNDRY_BASE =
  "https://raw.githubusercontent.com/mhilbrunner/foundryvtt-dnd5e-lang-de/master/compendium";

const VERIFY = process.argv.includes("--verify-names");
/** Force re-download of Foundry packs. */
const REFRESH = process.argv.includes("--refresh");

/** Manual overrides where Foundry naming is weak or missing. */
const SPELL_NAME_OVERRIDES = {
  "toll-the-dead": "Totenläuten",
};

const FEAT_NAME_OVERRIDES = {
  linguist: "Sprachenkundiger",
  tough: "Zäh",
  durable: "Ausdauernd",
  alert: "Wachsam",
  observant: "Aufmerksam",
  "dual-wielder": "Zwei-Waffen-Kämpfer",
};

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/?(strong|em|b|i|u|span|div|ul|ol)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&uuml;/g, "ü")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&szlig;/g, "ß")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "TableHeroes-dnd5e-de-sync/1.0" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function loadFoundryPack(name) {
  await mkdir(CACHE, { recursive: true });
  const cachePath = path.join(CACHE, name);
  if (!REFRESH) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8"));
      if (cached?.entries && Object.keys(cached.entries).length > 0) return cached;
    } catch {
      /* fetch */
    }
  }
  const data = await fetchJson(`${FOUNDRY_BASE}/${name}`);
  await writeFile(cachePath, JSON.stringify(data, null, 2));
  return data;
}

function buildNameIndex(entries) {
  /** @type {Map<string, { name: string, description: string }>} */
  const byEn = new Map();
  for (const [enName, entry] of Object.entries(entries ?? {})) {
    const value = {
      name: entry.name ?? enName,
      description: stripHtml(entry.description ?? ""),
    };
    byEn.set(normalize(enName), value);
    // Also index without "Ki: " prefix
    if (/^ki:\s*/i.test(enName)) {
      byEn.set(normalize(enName.replace(/^ki:\s*/i, "")), value);
    }
  }
  return byEn;
}

/**
 * @param {Map<string, { name: string, description: string }>} index
 * @param {string} nameEn
 */
function resolveFeature(index, nameEn) {
  for (const candidate of lookupCandidates(nameEn)) {
    const hit = index.get(normalize(candidate));
    if (hit) {
      const fallbackName = FEATURE_NAME_FALLBACKS[nameEn] || translateFeatureNameHeuristic(nameEn);
      return {
        name: fallbackName && /\(|feature$/i.test(nameEn) ? fallbackName : hit.name,
        description: hit.description || FEATURE_DESCRIPTION_FALLBACKS[nameEn] || "",
      };
    }
  }
  const heuristic = translateFeatureNameHeuristic(nameEn);
  if (heuristic) {
    return {
      name: heuristic,
      description: FEATURE_DESCRIPTION_FALLBACKS[nameEn] || FEATURE_DESCRIPTION_FALLBACKS[nameEn.replace(/\s*\([^)]*\)\s*$/, "").trim()] || "",
    };
  }
  return null;
}

function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function verifySpellName(enName, deName) {
  const url =
    "https://www.dnddeutsch.de/tools/json.php?apiv=0.7&s=" +
    encodeURIComponent(enName) +
    "&o=dict&sp=on&mi=off&mo=off&it=off&misc=off";
  try {
    const j = await fetchJson(url);
    const hit = (j.result ?? []).find(
      (r) => r.type === "spell" && normalize(r.name_en) === normalize(enName),
    );
    if (!hit) return { status: "miss" };
    if (normalize(hit.name_de) === normalize(deName)) return { status: "ok", official: hit.name_de };
    return { status: "diff", official: hit.name_de, foundry: deName };
  } catch {
    return { status: "error" };
  }
}

async function applySpells(spellIndex) {
  const spells = JSON.parse(await readFile(path.join(DATA, "spells.json"), "utf8"));
  let named = 0;
  let described = 0;
  const missing = [];
  const diffs = [];

  for (const spell of spells) {
    const hit = spellIndex.get(normalize(spell.nameEn));
    if (!hit) {
      missing.push(spell.nameEn);
      continue;
    }
    const override = SPELL_NAME_OVERRIDES[spell.id];
    const nameDe = override ?? hit.name;
    if (nameDe && nameDe !== spell.nameDe) {
      spell.nameDe = nameDe;
      named++;
    } else if (nameDe) {
      spell.nameDe = nameDe;
      named++;
    }
    if (hit.description) {
      spell.descriptionDe = hit.description;
      described++;
    }

    if (VERIFY && diffs.length < 40) {
      const v = await verifySpellName(spell.nameEn, spell.nameDe);
      if (v.status === "diff") diffs.push({ en: spell.nameEn, ...v });
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  await writeFile(path.join(DATA, "spells.json"), JSON.stringify(spells, null, 2) + "\n");
  return { total: spells.length, named, described, missing, diffs };
}

async function applyClassFeatures(featureIndex, subclassIndex) {
  const index = JSON.parse(await readFile(path.join(DATA, "classes", "index.json"), "utf8"));
  let named = 0;
  let described = 0;
  let subclassNamed = 0;
  const missingNames = new Set();

  for (const { id } of index) {
    const file = path.join(DATA, "classes", `${id}.json`);
    const klass = JSON.parse(await readFile(file, "utf8"));

    for (const feat of klass.features ?? []) {
      const hit = resolveFeature(featureIndex, feat.nameEn);
      if (!hit) {
        missingNames.add(feat.nameEn);
        continue;
      }
      feat.nameDe = hit.name;
      named++;
      if (hit.description) {
        feat.descriptionDe = hit.description;
        described++;
      } else if (feat.descriptionDe === feat.descriptionEn) {
        // leave EN desc; name at least is DE
      }
    }

    for (const sub of klass.subclasses ?? []) {
      const subHit = subclassIndex.get(normalize(sub.nameEn));
      const shortDe = SUBCLASS_NAME_DE[sub.nameEn];
      if (shortDe) {
        sub.nameDe = shortDe;
        subclassNamed++;
      } else if (subHit?.name) {
        sub.nameDe = subHit.name;
        subclassNamed++;
      }
      for (const feat of sub.features ?? []) {
        const hit = resolveFeature(featureIndex, feat.nameEn);
        if (!hit) {
          missingNames.add(feat.nameEn);
          continue;
        }
        feat.nameDe = hit.name;
        named++;
        if (hit.description) {
          feat.descriptionDe = hit.description;
          described++;
        }
      }
    }

    await writeFile(file, JSON.stringify(klass, null, 2) + "\n");
  }

  return {
    named,
    described,
    subclassNamed,
    missing: [...missingNames].sort(),
  };
}

async function applyRaces(raceTraitIndex) {
  const index = JSON.parse(await readFile(path.join(DATA, "races", "index.json"), "utf8"));
  let named = 0;
  let described = 0;
  const missing = [];

  for (const { id } of index) {
    const file = path.join(DATA, "races", `${id}.json`);
    const race = JSON.parse(await readFile(file, "utf8"));
    for (const feat of race.features ?? []) {
      const hit = raceTraitIndex.get(normalize(feat.nameEn));
      const fallback = RACE_TRAIT_FALLBACKS[feat.id] || RACE_TRAIT_FALLBACKS[normalize(feat.nameEn).replace(/ /g, "-")];
      if (hit) {
        feat.nameDe = hit.name;
        named++;
        if (hit.description) {
          feat.descriptionDe = hit.description;
          described++;
        }
      } else if (fallback) {
        feat.nameDe = fallback.nameDe;
        named++;
        if (fallback.descriptionDe) {
          feat.descriptionDe = fallback.descriptionDe;
          described++;
        }
      } else {
        missing.push(`${id}:${feat.nameEn}`);
      }
    }
    await writeFile(file, JSON.stringify(race, null, 2) + "\n");
  }

  return { named, described, missing };
}

async function applyFeats() {
  const feats = JSON.parse(await readFile(path.join(DATA, "feats.json"), "utf8"));
  let changed = 0;
  for (const feat of feats) {
    const override = FEAT_NAME_OVERRIDES[feat.id];
    if (override && feat.nameDe !== override) {
      feat.nameDe = override;
      changed++;
    }
    // Expand thin linguist description
    if (feat.id === "linguist") {
      feat.descriptionDe =
        "Intelligenz +1 (max. 20). Du erlernst drei Sprachen deiner Wahl und kannst schriftliche Chiffren erstellen (SG = dein Intelligenzwert + Übungsbonus).";
      changed++;
    }
    if (feat.id === "tough") {
      feat.descriptionDe =
        "Dein Trefferpunkt-Maximum steigt um das Doppelte deiner Stufe. Danach erhältst du bei jedem Stufenaufstieg +2 TP.";
    }
    if (feat.id === "durable") {
      feat.nameDe = FEAT_NAME_OVERRIDES.durable;
      feat.descriptionDe =
        "Konstitution +1 (max. 20). Wenn du einen Trefferwürfel wirfst, um TP zurückzuerlangen, ist das Minimum 2 × dein KO-Modifikator (mindestens 2).";
    }
  }
  await writeFile(path.join(DATA, "feats.json"), JSON.stringify(feats, null, 2) + "\n");
  return { changed, total: feats.length };
}

async function updateMeta(stats) {
  const metaPath = path.join(DATA, "meta.json");
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  meta.translations = {
    appliedAt: new Date().toISOString(),
    sources: [
      {
        name: "foundryvtt-dnd5e-lang-de (Babele)",
        url: "https://github.com/mhilbrunner/foundryvtt-dnd5e-lang-de",
        note: "Deutsche Namen und Beschreibungen für SRD-Zauber, Klassenmerkmale und Volksmerkmale",
      },
      {
        name: "SRD 5.1 de / openrpg.de",
        url: "https://openrpg.de/srd/5e/de/",
        note: "Offizielle deutsche SRD-Namenskonventionen (CC-BY-4.0)",
      },
      {
        name: "dnddeutsch.de Übersetzer",
        url: "https://www.dnddeutsch.de/uebersetzer/",
        note: "Namens-Crosscheck (PHB/SRD DE)",
      },
    ],
    stats,
  };
  meta.attribution =
    "This work includes material from the System Reference Document 5.1 (SRD 5.1) © Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under CC-BY-4.0. German names and playable descriptions follow SRD 5.1 de conventions and community glossaries (see translations.sources).";
  await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
}

async function main() {
  console.log("Loading Foundry DE packs…");
  const [spellsPack, featuresPack, racesPack, subclassesPack] = await Promise.all([
    loadFoundryPack("dnd5e.spells.json"),
    loadFoundryPack("dnd5e.classfeatures.json"),
    loadFoundryPack("dnd5e.races.json"),
    loadFoundryPack("dnd5e.subclasses.json"),
  ]);

  const spellIndex = buildNameIndex(spellsPack.entries);
  const featureIndex = buildNameIndex(featuresPack.entries);
  const raceTraitIndex = buildNameIndex(racesPack.entries);
  const subclassIndex = buildNameIndex(subclassesPack.entries);

  console.log("Applying spells…");
  const spellStats = await applySpells(spellIndex);
  console.log(
    `  spells: ${spellStats.named}/${spellStats.total} names, ${spellStats.described} descriptions` +
      (spellStats.missing.length ? `, missing ${spellStats.missing.length}` : ""),
  );
  if (spellStats.missing.length) console.log("  missing:", spellStats.missing.join(", "));
  if (spellStats.diffs.length) {
    console.log("  name diffs vs dnddeutsch.de:");
    for (const d of spellStats.diffs) {
      console.log(`    ${d.en}: Foundry="${d.foundry}" official="${d.official}"`);
    }
  }

  console.log("Applying class features…");
  const classStats = await applyClassFeatures(featureIndex, subclassIndex);
  console.log(
    `  features named ${classStats.named}, described ${classStats.described}, subclasses ${classStats.subclassNamed}`,
  );
  if (classStats.missing.length) {
    console.log(`  unmatched feature names (${classStats.missing.length}):`);
    console.log("   ", classStats.missing.slice(0, 40).join(", "));
  }

  console.log("Applying race traits…");
  const raceStats = await applyRaces(raceTraitIndex);
  console.log(
    `  traits named ${raceStats.named}, described ${raceStats.described}` +
      (raceStats.missing.length ? `, missing ${raceStats.missing.length}` : ""),
  );
  if (raceStats.missing.length) console.log("  missing:", raceStats.missing.join(", "));

  console.log("Applying feat name fixes…");
  const featStats = await applyFeats();
  console.log(`  feats touched ${featStats.changed}/${featStats.total}`);

  const stats = { spells: spellStats, classes: classStats, races: raceStats, feats: featStats };
  await updateMeta(stats);
  console.log("Done. meta.json updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
