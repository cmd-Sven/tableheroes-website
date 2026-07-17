/**
 * Fallback DE names/descriptions for SRD features not cleanly keyed in Foundry packs.
 * Terminology aligned with SRD 5.1 de / PHB (de) conventions.
 */

/** Short subclass names as stored in our catalog (often truncated vs Foundry). */
export const SUBCLASS_NAME_DE = {
  Berserker: "Berserker",
  Lore: "Wissen",
  Life: "Leben",
  Grave: "Grab",
  Land: "Land",
  Champion: "Champion",
  "Open Hand": "Offene Hand",
  Devotion: "Hingabe",
  Hunter: "Jäger",
  Thief: "Dieb",
  Draconic: "Drachenblut",
  Fiend: "Unhold",
  Evocation: "Hervorrufung",
};

/** @type {Record<string, { nameDe: string, descriptionDe?: string }>} */
export const RACE_TRAIT_FALLBACKS = {
  darkvision: {
    nameDe: "Dunkelsicht",
    descriptionDe:
      "Du siehst bei schwachem Licht in 18 m Entfernung wie bei hellem Licht und in Dunkelheit wie bei schwachem Licht. In Dunkelheit siehst du nur Graustufen, keine Farben.",
  },
  trance: {
    nameDe: "Trance",
    descriptionDe:
      "Elfen müssen nicht schlafen. Stattdessen meditieren sie 4 Stunden am Tag in einem halbwachen Zustand (Trance). Nach dieser Ruhe bist du so erholt wie ein Mensch nach 8 Stunden Schlaf.",
  },
  "draconic-ancestry": {
    nameDe: "Drachenblut",
    descriptionDe:
      "Du hast drakonische Vorfahren. Wähle einen Drachentyp: Er bestimmt den Schaden deiner Atemwaffe und deine Schadensresistenz.",
  },
  "breath-weapon": {
    nameDe: "Atemwaffe",
    descriptionDe:
      "Als Aktion speist du Energie gemäß deinem Drachenblut. Jede Kreatur im Wirkungsbereich muss einen GE-Rettungswurf gegen SG 8 + KON-Mod. + Übungsbonus bestehen oder den zugehörigen Schaden erleiden (halber Schaden bei Erfolg). Nutzung: 1× pro kurzer oder langer Rast.",
  },
  "damage-resistance": {
    nameDe: "Schadensresistenz",
    descriptionDe: "Du hast Resistenz gegen den Schadenstyp, der mit deinem Drachenblut verknüpft ist.",
  },
  "dwarven-combat-training": {
    nameDe: "Zwergische Kampfausbildung",
    descriptionDe: "Du bist im Umgang mit Streitaxt, Handaxt, leichtem und Kriegshammer geübt.",
  },
  "tool-proficiency": {
    nameDe: "Werkzeugübung",
    descriptionDe:
      "Du erhältst Übung mit dem Handwerkszeug deiner Wahl: Schmiedewerkzeug, Brauerausrüstung oder Maurerwerkzeug.",
  },
  "keen-senses": {
    nameDe: "Scharfe Sinne",
    descriptionDe: "Du bist in der Fertigkeit Wahrnehmung geübt.",
  },
  "skill-versatility": {
    nameDe: "Fertigkeitsvielseitigkeit",
    descriptionDe: "Du bist in zwei Fertigkeiten deiner Wahl geübt.",
  },
  menacing: {
    nameDe: "Bedrohlich",
    descriptionDe: "Du bist in der Fertigkeit Einschüchtern geübt.",
  },
};

/**
 * Exact EN name → DE (for scaled / variant class features).
 * @type {Record<string, string>}
 */
export const FEATURE_NAME_FALLBACKS = {
  "Action Surge (1 use)": "Aktionsstoß (1 Nutzung)",
  "Action Surge (2 uses)": "Aktionsstoß (2 Nutzungen)",
  "Arcane Tradition feature": "Merkmal der Arkanen Tradition",
  "Aura improvements": "Aura-Verbesserungen",
  "Bard College feature": "Merkmal des Bardencolleges",
  "Bardic Inspiration (d6)": "Bardeninspiration (W6)",
  "Bardic Inspiration (d8)": "Bardeninspiration (W8)",
  "Bardic Inspiration (d10)": "Bardeninspiration (W10)",
  "Bardic Inspiration (d12)": "Bardeninspiration (W12)",
  "Bonus Cantrip": "Zusätzlicher Zaubertrick",
  "Bonus Proficiencies": "Zusätzliche Übungen",
  "Bonus Proficiency": "Zusätzliche Übung",
  "Brutal Critical (1 die)": "Brutaler kritischer Treffer (1 Würfel)",
  "Brutal Critical (2 dice)": "Brutaler kritischer Treffer (2 Würfel)",
  "Brutal Critical (3 dice)": "Brutaler kritischer Treffer (3 Würfel)",
  "Channel Divinity": "Göttliche Macht kanalisieren",
  "Channel Divinity (1/rest)": "Göttliche Macht kanalisieren (1/Rast)",
  "Channel Divinity (2/rest)": "Göttliche Macht kanalisieren (2/Rast)",
  "Channel Divinity (3/rest)": "Göttliche Macht kanalisieren (3/Rast)",
  "Destroy Undead (CR 1/2 or below)": "Untote vernichten (SG 1/2 oder niedriger)",
  "Destroy Undead (CR 1 or below)": "Untote vernichten (SG 1 oder niedriger)",
  "Destroy Undead (CR 2 or below)": "Untote vernichten (SG 2 oder niedriger)",
  "Destroy Undead (CR 3 or below)": "Untote vernichten (SG 3 oder niedriger)",
  "Destroy Undead (CR 4 or below)": "Untote vernichten (SG 4 oder niedriger)",
  "Diamond Soul": "Diamantene Seele",
  "Divine Domain feature": "Merkmal des Göttlichen Bereichs",
  "Divine Intervention Improvement": "Göttliches Eingreifen (Verbesserung)",
  "Domain Spells": "Bereichszauber",
  "Druid Circle feature": "Merkmal des Druidenkreises",
  "Empty Body": "Leerer Körper",
  Expertise: "Expertise",
  "Extra Attack (2)": "Zusätzlicher Angriff (2)",
  "Extra Attack (3)": "Zusätzlicher Angriff (3)",
  "Favored Enemy (1 type)": "Bevorzugter Gegner (1 Typ)",
  "Favored Enemy (2 types)": "Bevorzugter Gegner (2 Typen)",
  "Favored Enemy (3 enemies)": "Bevorzugter Gegner (3 Typen)",
  "Flexible Casting: Converting Spell Slot": "Flexibles Wirken: Zauberplatz umwandeln",
  "Flexible Casting: Creating Spell Slots": "Flexibles Wirken: Zauberplätze erzeugen",
  "Flurry of Blows": "Schlaghagel",
  "Indomitable (1 use)": "Unbeugsam (1 Nutzung)",
  "Indomitable (2 uses)": "Unbeugsam (2 Nutzungen)",
  "Indomitable (3 uses)": "Unbeugsam (3 Nutzungen)",
  "Martial Archetype feature": "Merkmal des Kampfarchetyps",
  "Monastic Tradition feature": "Merkmal der Mönchstradition",
  "Mystic Arcanum (6th level)": "Mystisches Arkanum (6. Grad)",
  "Mystic Arcanum (7th level)": "Mystisches Arkanum (7. Grad)",
  "Mystic Arcanum (8th level)": "Mystisches Arkanum (8. Grad)",
  "Mystic Arcanum (9th level)": "Mystisches Arkanum (9. Grad)",
  "Otherworldly Patron feature": "Merkmal des Jenseitigen Patrons",
  "Primal Path feature": "Merkmal des Urpfads",
  "Ranger Archetype feature": "Merkmal des Waldläufer-Archetyps",
  "Roguish Archetype feature": "Merkmal des Schurkenarchetyps",
  "Sacred Oath feature": "Merkmal des Heiligen Eids",
  "Sorcerous Origin feature": "Merkmal des Zaubererursprungs",
  "Spellcasting: Bard": "Zauberwirken: Barde",
  "Spellcasting: Cleric": "Zauberwirken: Kleriker",
  "Spellcasting: Druid": "Zauberwirken: Druide",
  "Spellcasting: Paladin": "Zauberwirken: Paladin",
  "Spellcasting: Ranger": "Zauberwirken: Waldläufer",
  "Spellcasting: Sorcerer": "Zauberwirken: Zauberer",
  "Spellcasting: Warlock": "Zauberwirken: Hexer",
  "Spellcasting: Wizard": "Zauberwirken: Magier",
  "Additional Fighting Style": "Zusätzlicher Kampfstil",
  "Ability Score Improvement": "Attributswerterhöhung",
  "Oath Spells": "Eidzauber",
  "Signature Spell": "Signaturzauber",
  "Sorcerous Origin": "Zaubererursprung",
  Ki: "Ki",
  "Path feature": "Pfadmerkmal",
  "Primal Path": "Urpfad",
};

/**
 * Short DE blurbs for placeholder / scaled features that only have English SRD stubs.
 * @type {Record<string, string>}
 */
export const FEATURE_DESCRIPTION_FALLBACKS = {
  "Path feature": "Du erhältst ein Merkmal deines gewählten Urpfads.",
  "Bard College feature": "Du erhältst ein Merkmal deines Bardencolleges.",
  "Divine Domain feature": "Du erhältst ein Merkmal deines Göttlichen Bereichs.",
  "Druid Circle feature": "Du erhältst ein Merkmal deines Druidenkreises.",
  "Martial Archetype feature": "Du erhältst ein Merkmal deines Kampfarchetyps.",
  "Monastic Tradition feature": "Du erhältst ein Merkmal deiner Mönchstradition.",
  "Otherworldly Patron feature": "Du erhältst ein Merkmal deines Jenseitigen Patrons.",
  "Primal Path feature": "Du erhältst ein Merkmal deines Urpfads.",
  "Ranger Archetype feature": "Du erhältst ein Merkmal deines Waldläufer-Archetyps.",
  "Roguish Archetype feature": "Du erhältst ein Merkmal deines Schurkenarchetyps.",
  "Sacred Oath feature": "Du erhältst ein Merkmal deines Heiligen Eids.",
  "Sorcerous Origin feature": "Du erhältst ein Merkmal deines Zaubererursprungs.",
  "Arcane Tradition feature": "Du erhältst ein Merkmal deiner Arkanen Tradition.",
  "Domain Spells": "Dein Göttlicher Bereich gewährt dir zusätzliche Bereichszauber, die immer vorbereitet sind.",
  "Oath Spells": "Dein Heiliger Eid gewährt dir zusätzliche Eidzauber, die immer vorbereitet sind.",
  "Bonus Proficiencies": "Du erhältst zusätzliche Fertigkeits- oder Werkzeugübungen gemäß deiner Unterklasse.",
  "Bonus Proficiency": "Du erhältst eine zusätzliche Übung gemäß deiner Klasse oder Unterklasse.",
  "Bonus Cantrip": "Du erlernst einen zusätzlichen Zaubertrick.",
  "Aura improvements": "Die Reichweite deiner Auren verbessert sich.",
  "Divine Intervention Improvement": "Dein Göttliches Eingreifen gelingt automatisch (kein Wurf nötig).",
  "Signature Spell": "Du wählst einen Signaturzauber deines Zauberbuchs und kannst ihn freier wirken.",
  "Sorcerous Origin": "Du wählst den Ursprung deiner Zauberkraft.",
  Ki: "Du erhältst Ki-Punkte, die besondere Mönchstechniken speisen.",
  "Spellcasting: Bard": "Du wirkst Bardenzauber. Siehe Zauberwirken der Barde.",
  "Spellcasting: Cleric": "Du wirkst Klerikerzauber. Siehe Zauberwirken des Klerikers.",
  "Spellcasting: Druid": "Du wirkst Druidenzauber. Siehe Zauberwirken des Druiden.",
  "Spellcasting: Paladin": "Du wirkst Paladinzauber. Siehe Zauberwirken des Paladins.",
  "Spellcasting: Ranger": "Du wirkst Waldläuferzauber. Siehe Zauberwirken des Waldläufers.",
  "Spellcasting: Sorcerer": "Du wirkst Zaubererzauber. Siehe Zauberwirken des Zauberers.",
  "Spellcasting: Warlock": "Du wirkst Hexerzauber (Paktmagie). Siehe Zauberwirken des Hexers.",
  "Spellcasting: Wizard": "Du wirkst Magierzauber. Siehe Zauberwirken des Magiers.",
  "Flexible Casting: Converting Spell Slot": "Du kannst Zauberplätze in Zauberpunkte umwandeln.",
  "Flexible Casting: Creating Spell Slots": "Du kannst Zauberpunkte ausgeben, um Zauberplätze zu erzeugen.",
  "Additional Fighting Style": "Du wählst einen weiteren Kampfstil.",
  "Mystic Arcanum (6th level)": "Du wählst einen Hexerzauber des 6. Grades als Mystisches Arkanum. Du kannst ihn einmal ohne Zauberplatz wirken; erneuert sich nach langer Rast.",
  "Mystic Arcanum (7th level)": "Du wählst einen Hexerzauber des 7. Grades als Mystisches Arkanum. Du kannst ihn einmal ohne Zauberplatz wirken; erneuert sich nach langer Rast.",
  "Mystic Arcanum (8th level)": "Du wählst einen Hexerzauber des 8. Grades als Mystisches Arkanum. Du kannst ihn einmal ohne Zauberplatz wirken; erneuert sich nach langer Rast.",
  "Mystic Arcanum (9th level)": "Du wählst einen Hexerzauber des 9. Grades als Mystisches Arkanum. Du kannst ihn einmal ohne Zauberplatz wirken; erneuert sich nach langer Rast.",
};
export const FEATURE_BASE_ALIASES = {
  "action surge": "Aktionsstoß",
  "bardic inspiration": "Bardeninspiration",
  "brutal critical": "Brutaler kritischer Treffer",
  "channel divinity": "Göttliche Macht kanalisieren",
  "destroy undead": "Untote vernichten",
  "extra attack": "Zusätzlicher Angriff",
  "favored enemy": "Bevorzugter Gegner",
  indomitable: "Unbeugsam",
  expertise: "Expertise",
  "flurry of blows": "Schlaghagel",
  "diamond soul": "Diamantene Seele",
  "empty body": "Leerer Körper",
  "mystic arcanum": "Mystisches Arkanum",
  "divine intervention": "Göttliches Eingreifen",
  "fighting style": "Kampfstil",
  "ability score improvement": "Attributswerterhöhung",
  "bonus cantrip": "Zusätzlicher Zaubertrick",
  "bonus proficiencies": "Zusätzliche Übungen",
  "bonus proficiency": "Zusätzliche Übung",
  "domain spells": "Bereichszauber",
  "aura improvements": "Aura-Verbesserungen",
};

/**
 * Candidate EN keys to try when looking up Foundry entries.
 * @param {string} nameEn
 * @returns {string[]}
 */
export function lookupCandidates(nameEn) {
  const raw = String(nameEn ?? "").trim();
  const out = [raw];

  // Strip trailing parenthetical: "Foo (bar)" → "Foo"
  const noParen = raw.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (noParen && noParen !== raw) out.push(noParen);

  // "Ki: Flurry of Blows" style
  out.push(`Ki: ${noParen || raw}`);
  out.push((noParen || raw).replace(/^Ki:\s*/i, ""));

  // Class-tagged variants
  for (const cls of [
    "Cleric",
    "Paladin",
    "Bard",
    "Rogue",
    "Fighter",
    "Barbarian",
    "Monk",
    "Ranger",
    "Wizard",
    "Warlock",
    "Sorcerer",
    "Druid",
  ]) {
    out.push(`${noParen || raw} (${cls})`);
  }

  // CR notation variants
  if (/destroy undead/i.test(raw)) out.push("Destroy Undead");

  return [...new Set(out.filter(Boolean))];
}

/**
 * Translate a scaled feature name when no Foundry hit exists.
 * @param {string} nameEn
 */
export function translateFeatureNameHeuristic(nameEn) {
  if (FEATURE_NAME_FALLBACKS[nameEn]) return FEATURE_NAME_FALLBACKS[nameEn];

  const raw = String(nameEn);
  const m = raw.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (m) {
    const base = m[1].trim();
    const paren = m[2].trim();
    const baseDe =
      FEATURE_NAME_FALLBACKS[base] ||
      FEATURE_BASE_ALIASES[base.toLowerCase()] ||
      null;
    if (baseDe) {
      const parenDe = paren
        .replace(/\bdie\b/gi, "Würfel")
        .replace(/\bdice\b/gi, "Würfel")
        .replace(/\buse\b/gi, "Nutzung")
        .replace(/\buses\b/gi, "Nutzungen")
        .replace(/\brest\b/gi, "Rast")
        .replace(/\btype\b/gi, "Typ")
        .replace(/\btypes\b/gi, "Typen")
        .replace(/\benemies\b/gi, "Typen")
        .replace(/\blevel\b/gi, "Grad")
        .replace(/\bor below\b/gi, "oder niedriger")
        .replace(/\bCR\b/g, "SG");
      return `${baseDe} (${parenDe})`;
    }
  }

  const lower = raw.toLowerCase();
  for (const [en, de] of Object.entries(FEATURE_BASE_ALIASES)) {
    if (lower === en || lower.startsWith(en + " ")) return de;
  }

  if (/feature$/i.test(raw)) {
    return raw
      .replace(/Arcane Tradition feature/i, "Merkmal der Arkanen Tradition")
      .replace(/Bard College feature/i, "Merkmal des Bardencolleges")
      .replace(/Divine Domain feature/i, "Merkmal des Göttlichen Bereichs")
      .replace(/Druid Circle feature/i, "Merkmal des Druidenkreises")
      .replace(/Martial Archetype feature/i, "Merkmal des Kampfarchetyps")
      .replace(/Monastic Tradition feature/i, "Merkmal der Mönchstradition")
      .replace(/Otherworldly Patron feature/i, "Merkmal des Jenseitigen Patrons")
      .replace(/Primal Path feature/i, "Merkmal des Urpfads")
      .replace(/Ranger Archetype feature/i, "Merkmal des Waldläufer-Archetyps")
      .replace(/Roguish Archetype feature/i, "Merkmal des Schurkenarchetyps")
      .replace(/Sacred Oath feature/i, "Merkmal des Heiligen Eids")
      .replace(/Sorcerous Origin feature/i, "Merkmal des Zaubererursprungs");
  }

  return null;
}
