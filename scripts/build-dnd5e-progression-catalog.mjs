/**
 * Build local D&D 5e progression catalog from dnd5eapi.co (SRD 5.1 / CC-BY-4.0).
 * Run: node scripts/build-dnd5e-progression-catalog.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://www.dnd5eapi.co/api/2014";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/lib/characters/dnd5e/progression/data");

const CLASS_NAME_DE = {
  barbarian: "Barbar",
  bard: "Barde",
  cleric: "Kleriker",
  druid: "Druide",
  fighter: "Kämpfer",
  monk: "Mönch",
  paladin: "Paladin",
  ranger: "Waldläufer",
  rogue: "Schurke",
  sorcerer: "Zauberer",
  warlock: "Hexer",
  wizard: "Magier",
};

const RACE_NAME_DE = {
  dragonborn: "Drachenblütiger",
  dwarf: "Zwerg",
  elf: "Elf",
  gnome: "Gnom",
  "half-elf": "Halbelf",
  "half-orc": "Halbork",
  halvling: "Halbling",
  halfling: "Halbling",
  human: "Mensch",
  tiefling: "Tiefling",
};

const CLASS_SUBCLASS_LEVEL = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

const STANDARD_ASI = [4, 8, 12, 16, 19];
const FIGHTER_ASI = [4, 6, 8, 12, 14, 16, 19];
const ROGUE_ASI = [4, 8, 10, 12, 16, 19];

function asiFor(id) {
  if (id === "fighter") return FIGHTER_ASI;
  if (id === "rogue") return ROGUE_ASI;
  return STANDARD_ASI;
}

function casterFor(id) {
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(id)) return "full";
  if (["paladin", "ranger"].includes(id)) return "half";
  if (id === "warlock") return "pact";
  return "none";
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function joinDesc(desc) {
  if (!desc) return "";
  if (Array.isArray(desc)) return desc.join("\n\n");
  return String(desc);
}

async function buildClass(classId) {
  const klass = await getJson(`${API}/classes/${classId}`);
  const levels = await getJson(`${API}/classes/${classId}/levels`);

  const featureCache = new Map();
  async function loadFeature(index) {
    if (featureCache.has(index)) return featureCache.get(index);
    const f = await getJson(`${API}/features/${index}`);
    const entry = {
      id: f.index,
      level: f.level ?? 0,
      nameEn: f.name,
      nameDe: f.name,
      descriptionEn: joinDesc(f.desc),
      descriptionDe: joinDesc(f.desc),
      subclass: f.subclass?.index ?? null,
    };
    featureCache.set(index, entry);
    return entry;
  }

  const allFeatures = [];
  const levelRows = [];

  for (const row of levels) {
    const featureIds = [];
    for (const ref of row.features ?? []) {
      const feat = await loadFeature(ref.index);
      featureIds.push(feat.id);
      if (!allFeatures.some((x) => x.id === feat.id)) allFeatures.push(feat);
    }
    const spellcasting = row.spellcasting ?? null;
    const spellSlots = {};
    if (spellcasting) {
      for (let i = 1; i <= 9; i++) {
        const key = `spell_slots_level_${i}`;
        if (spellcasting[key]) spellSlots[String(i)] = spellcasting[key];
      }
    }
    levelRows.push({
      level: row.level,
      featureIds,
      ...(Object.keys(spellSlots).length ? { spellSlots } : {}),
      ...(spellcasting?.cantrips_known != null
        ? { cantripsKnown: spellcasting.cantrips_known }
        : {}),
      ...(spellcasting?.spells_known != null
        ? { spellsKnown: spellcasting.spells_known }
        : {}),
    });
  }

  const subclasses = [];
  for (const sub of klass.subclasses ?? []) {
    try {
      const subData = await getJson(`${API}/subclasses/${sub.index}`);
      const subFeatures = [];
      for (const lvl of subData.subclass_levels ?? []) {
        // subclass_levels is a URL string in some versions
      }
      // Load subclass levels endpoint
      let subLevels = [];
      try {
        subLevels = await getJson(`${API}/subclasses/${sub.index}/levels`);
      } catch {
        subLevels = [];
      }
      for (const row of subLevels) {
        for (const ref of row.features ?? []) {
          const feat = await loadFeature(ref.index);
          feat.subclass = sub.index;
          if (!subFeatures.some((x) => x.id === feat.id)) subFeatures.push(feat);
          if (!allFeatures.some((x) => x.id === feat.id)) allFeatures.push(feat);
        }
      }
      subclasses.push({
        id: sub.index,
        nameEn: subData.name ?? sub.name,
        nameDe: subData.name ?? sub.name,
        features: subFeatures,
      });
    } catch (err) {
      console.warn(`subclass ${sub.index}:`, err.message);
    }
  }

  return {
    id: classId,
    nameEn: klass.name,
    nameDe: CLASS_NAME_DE[classId] ?? klass.name,
    hitDie: klass.hit_die,
    caster: casterFor(classId),
    subclassLevel: CLASS_SUBCLASS_LEVEL[classId] ?? 3,
    asiLevels: asiFor(classId),
    levels: levelRows,
    features: allFeatures,
    subclasses,
  };
}

async function buildSpells() {
  const list = await getJson(`${API}/spells`);
  const spells = [];
  let i = 0;
  for (const ref of list.results ?? []) {
    i++;
    if (i % 50 === 0) console.log(`  spells ${i}/${list.count}`);
    const s = await getJson(`${API}${ref.url.replace("/api/2014", "")}`);
    const classes = (s.classes ?? [])
      .map((c) => c.index)
      .filter((id) => id in CLASS_NAME_DE);
    spells.push({
      id: s.index,
      nameEn: s.name,
      nameDe: s.name,
      descriptionEn: joinDesc(s.desc),
      descriptionDe: joinDesc(s.desc),
      level: s.level ?? 0,
      school: s.school?.name ?? s.school?.index ?? "",
      classes,
      ritual: Boolean(s.ritual),
      concentration: Boolean(s.concentration),
    });
  }
  return spells;
}

async function buildRaces() {
  const list = await getJson(`${API}/races`);
  const races = [];
  for (const ref of list.results ?? []) {
    const r = await getJson(`${API}/races/${ref.index}`);
    const features = [];
    for (const t of r.traits ?? []) {
      try {
        const trait = await getJson(`${API}/traits/${t.index}`);
        features.push({
          id: trait.index,
          level: 1,
          nameEn: trait.name,
          nameDe: trait.name,
          descriptionEn: joinDesc(trait.desc),
          descriptionDe: joinDesc(trait.desc),
          subclass: null,
        });
      } catch {
        /* skip */
      }
    }
    races.push({
      id: r.index,
      nameEn: r.name,
      nameDe: RACE_NAME_DE[r.index] ?? r.name,
      features,
    });
  }
  return races;
}

/** SRD has almost no feats; seed curated common feats with short EN text. */
function buildFeats() {
  const curated = [
    {
      id: "grappler",
      nameEn: "Grappler",
      nameDe: "Ringer",
      descriptionEn:
        "You've developed the skills necessary to hold your own in close-quarters grappling. Advantage on attack rolls against a creature you are grappling; can use an action to pin a creature grappled by you.",
      descriptionDe:
        "Du hast die Fähigkeiten entwickelt, im Nahkampf zu ringen. Vorteil auf Angriffswürfe gegen eine von dir festgehaltene Kreatur; Aktion zum Niederhalten möglich.",
    },
    {
      id: "alert",
      nameEn: "Alert",
      nameDe: "Wachsam",
      descriptionEn: "+5 to initiative; can't be surprised while conscious; hidden attackers don't gain advantage against you.",
      descriptionDe: "+5 Initiative; keine Überraschung bei Bewusstsein; versteckte Angreifer erhalten keinen Vorteil gegen dich.",
    },
    {
      id: "athlete",
      nameEn: "Athlete",
      nameDe: "Athlet",
      descriptionEn: "Increase Strength or Dexterity by 1 (max 20). Climbing doesn't cost extra movement; standing from prone costs only 5 feet; running long jump with only 5 feet of movement.",
      descriptionDe: "Stärke oder Geschicklichkeit +1 (max. 20). Klettern kostet keine Extra-Bewegung; Aufstehen aus dem Liegen nur 1,50 m; Anlauf für Weitsprung nur 1,50 m.",
      abilityBonus: { str: 1 },
    },
    {
      id: "actor",
      nameEn: "Actor",
      nameDe: "Schauspieler",
      descriptionEn: "Increase Charisma by 1 (max 20). Advantage on Deception and Performance when pretending to be someone else; mimic speech/sounds you've heard.",
      descriptionDe: "Charisma +1 (max. 20). Vorteil auf Täuschung und Auftreten beim Verstellen; Stimmen/Geräusche nachahmen.",
      abilityBonus: { cha: 1 },
    },
    {
      id: "charger",
      nameEn: "Charger",
      nameDe: "Anstürmer",
      descriptionEn: "When you Dash as an action, you can use a bonus action to make one melee weapon attack or shove; +5 damage if you moved 10+ feet in a straight line.",
      descriptionDe: "Nach Sprint als Aktion: Bonusaktion für Nahkampfangriff oder Stoßen; +5 Schaden bei 3 m gerader Bewegung.",
    },
    {
      id: "crossbow-expert",
      nameEn: "Crossbow Expert",
      nameDe: "Armbrustexperte",
      descriptionEn: "Ignore loading; no disadvantage in melee with crossbows; bonus action hand crossbow attack after Attack action with a one-handed weapon.",
      descriptionDe: "Laden ignorieren; kein Nachteil im Nahkampf mit Armbrüsten; Bonusaktion Handarmbrust nach Angriffsaktion mit Einhandwaffe.",
    },
    {
      id: "defensive-duelist",
      nameEn: "Defensive Duelist",
      nameDe: "Defensiver Duellant",
      descriptionEn: "Prerequisite: Dexterity 13+. With a finesse weapon you're wielding, reaction to add proficiency bonus to AC against one melee attack.",
      descriptionDe: "Voraussetzung: GES 13+. Mit Finesse-Waffe Reaktion: Übungsbonus zur RK gegen einen Nahkampfangriff.",
      prerequisiteEn: "Dexterity 13+",
      prerequisiteDe: "Geschicklichkeit 13+",
    },
    {
      id: "dual-wielder",
      nameEn: "Dual Wielder",
      nameDe: "Zwei-Waffen-Kämpfer",
      descriptionEn: "+1 AC while wielding a separate melee weapon in each hand; dual wield with non-light weapons; draw/stow two weapons when you'd normally draw one.",
      descriptionDe: "+1 RK mit je einer Nahkampfwaffe in jeder Hand; Zwei-Waffen-Kampf ohne Leicht; zwei Waffen ziehen/verstauen.",
    },
    {
      id: "durable",
      nameEn: "Durable",
      nameDe: "Ausdauernd",
      descriptionEn: "Constitution +1 (max 20). When you roll a Hit Die to regain HP, minimum = 2 × Constitution modifier (min 2).",
      descriptionDe: "Konstitution +1 (max. 20). Bei Trefferwürfel-Heilung Minimum = 2 × KO-Modifikator (mind. 2).",
      abilityBonus: { con: 1 },
    },
    {
      id: "elemental-adept",
      nameEn: "Elemental Adept",
      nameDe: "Elementaradept",
      descriptionEn: "Choose acid, cold, fire, lightning, or thunder. Spells you cast ignore resistance to that damage; treat 1s on damage dice as 2s for that type.",
      descriptionDe: "Wähle Säure, Kälte, Feuer, Blitz oder Donner. Zauber ignorieren Resistenz; 1er auf Schadenswürfeln werden zu 2ern.",
    },
    {
      id: "great-weapon-master",
      nameEn: "Great Weapon Master",
      nameDe: "Meister großer Waffen",
      descriptionEn: "On critical or reducing a creature to 0 HP with a melee weapon, bonus action melee attack. Before heavy weapon attack: -5 to hit, +10 damage.",
      descriptionDe: "Bei kritischem Treffer oder 0 TP mit Nahkampfwaffe: Bonusaktion Nahkampfangriff. Vor Angriff mit schwerer Waffe: -5 Angriff, +10 Schaden.",
    },
    {
      id: "healer",
      nameEn: "Healer",
      nameDe: "Heiler",
      descriptionEn: "Stabilize with healer's kit restores 1 HP. As action with healer's kit: creature regains 1d6 + 4 + its Hit Dice count HP (once per short/long rest per creature).",
      descriptionDe: "Stabilisieren mit Heilerwerkzeug: 1 TP. Aktion mit Heilerwerkzeug: 1W6+4+Trefferwürfel-Anzahl TP (1× pro Rast und Kreatur).",
    },
    {
      id: "heavily-armored",
      nameEn: "Heavily Armored",
      nameDe: "Schwere Rüstung",
      descriptionEn: "Prerequisite: Medium Armor proficiency. Strength +1 (max 20). Gain proficiency with heavy armor.",
      descriptionDe: "Voraussetzung: Übungsbonus mittelschwere Rüstung. Stärke +1. Übung mit schwerer Rüstung.",
      abilityBonus: { str: 1 },
      prerequisiteEn: "Medium armor proficiency",
      prerequisiteDe: "Übung mit mittelschwerer Rüstung",
    },
    {
      id: "inspiring-leader",
      nameEn: "Inspiring Leader",
      nameDe: "Inspirierender Anführer",
      descriptionEn: "Prerequisite: Charisma 13+. Spend 10 minutes inspiring up to 6 creatures (incl. you); temporary HP = your level + Charisma modifier.",
      descriptionDe: "Voraussetzung: CHA 13+. 10 Minuten inspirieren: bis 6 Kreaturen erhalten temp. TP = Stufe + CHA-Mod.",
      prerequisiteEn: "Charisma 13+",
      prerequisiteDe: "Charisma 13+",
    },
    {
      id: "keen-mind",
      nameEn: "Keen Mind",
      nameDe: "Scharfer Verstand",
      descriptionEn: "Intelligence +1 (max 20). Always know which way is north; know hours until sunrise/sunset; accurately recall anything seen or heard within a month.",
      descriptionDe: "Intelligenz +1. Immer Himmelsrichtung kennen; Stunden bis Sonnenauf-/untergang; genaue Erinnerung (1 Monat).",
      abilityBonus: { int: 1 },
    },
    {
      id: "lightly-armored",
      nameEn: "Lightly Armored",
      nameDe: "Leichte Rüstung",
      descriptionEn: "Strength or Dexterity +1 (max 20). Gain proficiency with light armor.",
      descriptionDe: "Stärke oder Geschicklichkeit +1. Übung mit leichter Rüstung.",
    },
    {
      id: "linguist",
      nameEn: "Linguist",
      nameDe: "Sprachenkundiger",
      descriptionEn: "Intelligence +1 (max 20). Learn three languages; create written ciphers (DC = your Intelligence score + proficiency bonus).",
      descriptionDe:
        "Intelligenz +1 (max. 20). Du erlernst drei Sprachen deiner Wahl und kannst schriftliche Chiffren erstellen (SG = dein Intelligenzwert + Übungsbonus).",
      abilityBonus: { int: 1 },
    },
    {
      id: "lucky",
      nameEn: "Lucky",
      nameDe: "Glückspilz",
      descriptionEn: "You have 3 luck points. Spend one to roll an additional d20 for an attack, check, or save (or force a reroll against you). Regain on long rest.",
      descriptionDe: "3 Glückspunkte. Für Angriff, Probe oder Rettungswurf zusätzlichen W20 würfeln (oder Angreifer neu würfeln lassen). Zurück nach langer Rast.",
    },
    {
      id: "mage-slayer",
      nameEn: "Mage Slayer",
      nameDe: "Magiertöter",
      descriptionEn: "Reaction melee attack when a creature in 5 feet casts a spell. Advantage on saves against spells cast by creatures within 5 feet. Concentration checks after your damage have disadvantage.",
      descriptionDe: "Reaktion Nahkampfangriff wenn Kreatur in 1,50 m zaubert. Vorteil auf RW gegen Zauber aus 1,50 m. Konzentrationswürfe nach deinem Schaden mit Nachteil.",
    },
    {
      id: "magic-initiate",
      nameEn: "Magic Initiate",
      nameDe: "Zauberadept",
      descriptionEn: "Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. Learn two cantrips and one 1st-level spell from that list (cast 1st-level once per long rest without a slot).",
      descriptionDe: "Klasse wählen: zwei Zaubertricks + ein Grad-1-Zauber der Liste (Grad 1 1×/lange Rast ohne Slot).",
    },
    {
      id: "martial-adept",
      nameEn: "Martial Adept",
      nameDe: "Kampfadept",
      descriptionEn: "Learn two maneuvers of your choice; gain one superiority die (d6), regained on short or long rest.",
      descriptionDe: "Zwei Manöver; ein Überlegenheitswürfel (W6), zurück nach kurzer/langer Rast.",
    },
    {
      id: "medium-armor-master",
      nameEn: "Medium Armor Master",
      nameDe: "Meister mittelschwerer Rüstung",
      descriptionEn: "Prerequisite: Medium armor proficiency. Medium armor doesn't impose stealth disadvantage; max Dexterity bonus to AC is 3 instead of 2.",
      descriptionDe: "Voraussetzung: Übung mittelschwere Rüstung. Kein Heimlichkeitsnachteil; max. GES-Bonus zur RK 3 statt 2.",
      prerequisiteEn: "Medium armor proficiency",
      prerequisiteDe: "Übung mit mittelschwerer Rüstung",
    },
    {
      id: "mobile",
      nameEn: "Mobile",
      nameDe: "Mobil",
      descriptionEn: "Speed +10 feet. Difficult terrain doesn't cost extra after Dash. When you make a melee attack against a creature, you don't provoke opportunity attacks from that creature for the rest of the turn.",
      descriptionDe: "Tempo +3 m. Nach Sprint kein Extra durch schwieriges Gelände. Nach Nahkampfangriff keine Gelegenheitsangriffe von diesem Ziel in diesem Zug.",
    },
    {
      id: "moderately-armored",
      nameEn: "Moderately Armored",
      nameDe: "Mittelschwere Rüstung",
      descriptionEn: "Prerequisite: Light armor proficiency. Strength or Dexterity +1. Gain proficiency with medium armor and shields.",
      descriptionDe: "Voraussetzung: Übung leichte Rüstung. STR oder GES +1. Übung mittelschwere Rüstung und Schilde.",
      prerequisiteEn: "Light armor proficiency",
      prerequisiteDe: "Übung mit leichter Rüstung",
    },
    {
      id: "mounted-combatant",
      nameEn: "Mounted Combatant",
      nameDe: "Berittener Kämpfer",
      descriptionEn: "Advantage on melee attacks against unmounted creatures smaller than your mount. Force attacks against your mount to target you instead. Mount takes no damage on Dexterity saves for half (full success) / half (failure).",
      descriptionDe: "Vorteil Nahkampf vs. kleinere nicht berittene Ziele. Angriffe auf Reittier auf dich umleiten. Reittier bei GES-RW: kein/halber Schaden.",
    },
    {
      id: "observant",
      nameEn: "Observant",
      nameDe: "Aufmerksam",
      descriptionEn: "Intelligence or Wisdom +1 (max 20). +5 bonus to passive Perception and Investigation. Read lips if you understand the language.",
      descriptionDe: "INT oder WEI +1. +5 auf passive Wahrnehmung und Nachforschung. Lippen lesen.",
    },
    {
      id: "polearm-master",
      nameEn: "Polearm Master",
      nameDe: "Stangenwaffenmeister",
      descriptionEn: "Bonus action attack with opposite end of glaive/halberd/quarterstaff/spear (1d4 bludgeoning). Opportunity attack when creature enters your reach with those weapons.",
      descriptionDe: "Bonusaktion Angriff mit dem anderen Ende (1W4 Wucht). Gelegenheitsangriff wenn Kreatur Reichweite betritt.",
    },
    {
      id: "resilient",
      nameEn: "Resilient",
      nameDe: "Widerstandsfähig",
      descriptionEn: "Increase one ability score by 1 (max 20) and gain proficiency in saving throws using that ability.",
      descriptionDe: "Ein Attribut +1 und Übung bei Rettungswürfen dieses Attributs.",
    },
    {
      id: "ritual-caster",
      nameEn: "Ritual Caster",
      nameDe: "Ritualzauberer",
      descriptionEn: "Prerequisite: Intelligence or Wisdom 13+. Learn two 1st-level ritual spells from one class list; keep a ritual book; can copy more rituals later.",
      descriptionDe: "Voraussetzung: INT oder WEI 13+. Zwei Grad-1-Rituale; Ritualbuch; weitere kopierbar.",
      prerequisiteEn: "Intelligence or Wisdom 13+",
      prerequisiteDe: "Intelligenz oder Weisheit 13+",
    },
    {
      id: "savage-attacker",
      nameEn: "Savage Attacker",
      nameDe: "Wilder Angreifer",
      descriptionEn: "Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon's damage dice and use either total.",
      descriptionDe: "1×/Zug Schadenswürfel einer Nahkampfwaffe neu würfeln und Ergebnis wählen.",
    },
    {
      id: "sentinel",
      nameEn: "Sentinel",
      nameDe: "Wächter",
      descriptionEn: "Opportunity attacks reduce target speed to 0. Creatures provoke even with Disengage. Reaction attack when an ally within 5 feet is attacked.",
      descriptionDe: "Gelegenheitsangriff setzt Tempo auf 0. Auch bei Rückzug. Reaktion wenn Verbündeter in 1,50 m angegriffen wird.",
    },
    {
      id: "sharpshooter",
      nameEn: "Sharpshooter",
      nameDe: "Scharfschütze",
      descriptionEn: "No disadvantage at long range; ignore half/three-quarters cover. Before ranged attack with a weapon: -5 to hit, +10 damage.",
      descriptionDe: "Kein Nachteil auf große Reichweite; Deckung ignorieren. Vor Fernkampfangriff: -5 Angriff, +10 Schaden.",
    },
    {
      id: "shield-master",
      nameEn: "Shield Master",
      nameDe: "Schildmeister",
      descriptionEn: "Bonus action shove after Attack action while wielding a shield. Add shield's AC bonus to Dexterity saves vs. effects targeting only you. On successful Dexterity save for half damage, take no damage (reaction).",
      descriptionDe: "Bonusaktion Stoßen nach Angriffsaktion mit Schild. Schild-RK-Bonus auf GES-RW. Bei erfolgreichem GES-RW (halber Schaden) → kein Schaden.",
    },
    {
      id: "skilled",
      nameEn: "Skilled",
      nameDe: "Gewandt",
      descriptionEn: "Gain proficiency in any combination of three skills or tools.",
      descriptionDe: "Übung in drei Fertigkeiten oder Werkzeugen (beliebige Kombination).",
    },
    {
      id: "skulker",
      nameEn: "Skulker",
      nameDe: "Schleicher",
      descriptionEn: "Prerequisite: Dexterity 13+. Hide when lightly obscured. Missing a ranged attack doesn't reveal position. Dim light doesn't impose disadvantage on Perception relying on sight.",
      descriptionDe: "Voraussetzung: GES 13+. Verstecken bei leichter Verhüllung. Fehlender Fernkampf verrät dich nicht.",
      prerequisiteEn: "Dexterity 13+",
      prerequisiteDe: "Geschicklichkeit 13+",
    },
    {
      id: "spell-sniper",
      nameEn: "Spell Sniper",
      nameDe: "Zauberschütze",
      descriptionEn: "Learn one cantrip that requires an attack roll. Spell attack range doubled; ignore half/three-quarters cover for spell attacks.",
      descriptionDe: "Ein Zaubertrick mit Angriffswurf. Reichweite verdoppelt; Deckung bei Zauberangriffen ignorieren.",
    },
    {
      id: "tavern-brawler",
      nameEn: "Tavern Brawler",
      nameDe: "Wirtshausschläger",
      descriptionEn: "Strength or Constitution +1. Proficiency with improvised weapons; unarmed 1d4. Bonus action grapple after hitting with unarmed or improvised weapon.",
      descriptionDe: "STR oder KO +1. Improvisierte Waffen; waffenlos 1W4. Bonusaktion Festhalten nach Treffer.",
    },
    {
      id: "tough",
      nameEn: "Tough",
      nameDe: "Zäh",
      descriptionEn: "Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Thereafter, +2 HP per level gained.",
      descriptionDe: "TP-Maximum +2 × Stufe (sofort), danach +2 TP je weitere Stufe.",
    },
    {
      id: "war-caster",
      nameEn: "War Caster",
      nameDe: "Kriegszauberer",
      descriptionEn: "Advantage on Constitution saves to maintain concentration. Perform somatic components with weapons/shield in hands. Opportunity attack can cast a one-action spell instead.",
      descriptionDe: "Vorteil auf KO-RW für Konzentration. Gesten mit Waffen/Schild. Gelegenheitsangriff als 1-Aktions-Zauber.",
    },
    {
      id: "weapon-master",
      nameEn: "Weapon Master",
      nameDe: "Waffenmeister",
      descriptionEn: "Strength or Dexterity +1 (max 20). Gain proficiency with four weapons of your choice.",
      descriptionDe: "STR oder GES +1. Übung mit vier Waffen deiner Wahl.",
    },
  ];
  return curated;
}

async function main() {
  await mkdir(path.join(OUT, "classes"), { recursive: true });
  await mkdir(path.join(OUT, "races"), { recursive: true });

  console.log("Building classes…");
  const classIds = Object.keys(CLASS_NAME_DE);
  const classIndex = [];
  for (const id of classIds) {
    console.log(`  class ${id}`);
    const data = await buildClass(id);
    await writeFile(path.join(OUT, "classes", `${id}.json`), JSON.stringify(data, null, 2));
    classIndex.push({ id, nameEn: data.nameEn, nameDe: data.nameDe });
  }
  await writeFile(path.join(OUT, "classes", "index.json"), JSON.stringify(classIndex, null, 2));

  console.log("Building spells…");
  const spells = await buildSpells();
  await writeFile(path.join(OUT, "spells.json"), JSON.stringify(spells, null, 2));

  console.log("Building races…");
  const races = await buildRaces();
  for (const race of races) {
    await writeFile(path.join(OUT, "races", `${race.id}.json`), JSON.stringify(race, null, 2));
  }
  await writeFile(
    path.join(OUT, "races", "index.json"),
    JSON.stringify(
      races.map((r) => ({ id: r.id, nameEn: r.nameEn, nameDe: r.nameDe })),
      null,
      2,
    ),
  );

  console.log("Building feats…");
  await writeFile(path.join(OUT, "feats.json"), JSON.stringify(buildFeats(), null, 2));

  await writeFile(
    path.join(OUT, "meta.json"),
    JSON.stringify(
      {
        source: "dnd5eapi.co / SRD 5.1",
        license: "CC-BY-4.0",
        attribution:
          "This work includes material from the System Reference Document 5.1 (SRD 5.1) © Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under CC-BY-4.0.",
        builtAt: new Date().toISOString(),
        counts: {
          classes: classIds.length,
          spells: spells.length,
          races: races.length,
          feats: buildFeats().length,
        },
      },
      null,
      2,
    ),
  );

  console.log("Applying German translations…");
  const { spawnSync } = await import("node:child_process");
  const apply = spawnSync(
    process.execPath,
    [path.join(__dirname, "dnd5e-de/apply-from-foundry-lang-de.mjs")],
    { stdio: "inherit", cwd: path.join(__dirname, "..") },
  );
  if (apply.status !== 0) {
    console.warn("DE translation apply failed — catalog left with English nameDe/descriptionDe placeholders.");
  }

  // Non-SRD extensions (Grave Domain, Toll the Dead, …) — must run AFTER DE apply
  console.log("Applying TableHeroes catalog patches…");
  const { applyCatalogPatches } = await import("./dnd5e-patches/apply-catalog-patches.mjs");
  const patchResult = await applyCatalogPatches();
  console.log("  patches:", JSON.stringify(patchResult));

  console.log("Done →", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
