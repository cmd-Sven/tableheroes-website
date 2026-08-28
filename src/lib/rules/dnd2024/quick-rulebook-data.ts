import type { QuickRuleEntry, QuickRuleCategory } from "./types";
import { DND_2024_RULES_EDITION } from "./types";
import { buildCatalogQuickRules } from "./build-catalog-quick-rules";

const SOURCE = "PHB 2024";

function rule(
  partial: Omit<QuickRuleEntry, "rulesEdition" | "source"> & { source?: string },
): QuickRuleEntry {
  return {
    ...partial,
    source: partial.source ?? SOURCE,
    rulesEdition: DND_2024_RULES_EDITION,
  };
}

/** Curated D&D 2024 quick-reference entries — no 2014/SRD legacy rules. */
const CURATED_QUICK_RULEBOOK_ENTRIES: QuickRuleEntry[] = [
  rule({
    id: "fall-damage",
    category: "environment",
    titleDe: "Fallschaden",
    titleEn: "Fall Damage",
    summaryDe:
      "1W6 Stumpfschaden pro 3 m (10 ft) Fallhöhe, maximal 20W6. Landest du auf einer Kreatur, erleidet diese halben Schaden (GW DEX SG 15). Kreaturen mit Fluggeschwindigkeit können sich ab Stufe 1 abbremsen und nehmen keinen Fallschaden.",
    summaryEn:
      "1d6 bludgeoning per 10 feet fallen, max 20d6. If you land on a creature, it takes half damage (DEX save DC 15). Creatures with a fly speed can halt their fall from level 1 and take no fall damage.",
    aliases: [
      "fallschaden",
      "fall damage",
      "fallen",
      "fall",
      "sturz",
      "sturzschaden",
      "absturz",
    ],
  }),
  rule({
    id: "reckless-attack",
    category: "class-feature",
    titleDe: "Rücksichtslose Attacke (Barbar)",
    titleEn: "Reckless Attack (Barbarian)",
    summaryDe:
      "Bonusaktion: Bis zu deinem nächsten Zug hast du Vorteil auf Stärke-Angriffswürfe mit Nahkampfwaffen. Angriffe gegen dich haben in dieser Zeit Vorteil. Du kannst nur einmal pro Zug nutzen.",
    summaryEn:
      "Bonus Action: Until your next turn, gain Advantage on Strength melee attack rolls. Attack rolls against you have Advantage during this time. Usable once per turn.",
    aliases: [
      "rücksichtslose attacke",
      "ruecksichtslose attacke",
      "reckless attack",
      "reckless",
      "barbar rücksichtslos",
      "barbarian reckless",
    ],
    source: "PHB 2024 — Barbarian",
  }),
  rule({
    id: "potion-greater-healing",
    category: "item",
    titleDe: "Trank des größeren Heilens",
    titleEn: "Potion of Greater Healing",
    summaryDe:
      "Bonusaktion zum Trinken (D&D 2024). Stellt 4W4+4 Trefferpunkte wieder her. Du kannst einen Trank auch einer bewusstlosen Kreatur in 1,5 m (5 ft) verabreichen.",
    summaryEn:
      "Bonus Action to drink (D&D 2024). Restores 4d4+4 hit points. You can administer a potion to an unconscious creature within 5 feet.",
    aliases: [
      "großer heiltrank",
      "grosser heiltrank",
      "trank des größeren heilens",
      "greater healing",
      "potion of greater healing",
      "heiltrank groß",
      "healing potion greater",
    ],
    source: "PHB 2024 — Equipment",
  }),
  rule({
    id: "potion-healing",
    category: "item",
    titleDe: "Heiltrank",
    titleEn: "Potion of Healing",
    summaryDe:
      "Bonusaktion zum Trinken (D&D 2024). Stellt 2W4+2 Trefferpunkte wieder her.",
    summaryEn:
      "Bonus Action to drink (D&D 2024). Restores 2d4+2 hit points.",
    aliases: [
      "heiltrank",
      "healing potion",
      "potion of healing",
      "kleiner heiltrank",
      "trank des heilens",
    ],
    source: "PHB 2024 — Equipment",
  }),
  rule({
    id: "potion-superior-healing",
    category: "item",
    titleDe: "Trank des überlegenen Heilens",
    titleEn: "Potion of Superior Healing",
    summaryDe: "Bonusaktion. Stellt 8W4+8 Trefferpunkte wieder her.",
    summaryEn: "Bonus Action. Restores 8d4+8 hit points.",
    aliases: [
      "überlegener heiltrank",
      "superior healing",
      "potion of superior healing",
      "heiltrank superior",
    ],
    source: "PHB 2024 — Equipment",
  }),
  rule({
    id: "potion-supreme-healing",
    category: "item",
    titleDe: "Trank des höchsten Heilens",
    titleEn: "Potion of Supreme Healing",
    summaryDe: "Bonusaktion. Stellt 10W4+20 Trefferpunkte wieder her.",
    summaryEn: "Bonus Action. Restores 10d4+20 hit points.",
    aliases: [
      "höchster heiltrank",
      "supreme healing",
      "potion of supreme healing",
    ],
    source: "PHB 2024 — Equipment",
  }),
  rule({
    id: "potion-bonus-action",
    category: "general",
    titleDe: "Tränke trinken (Bonusaktion)",
    titleEn: "Drinking Potions (Bonus Action)",
    summaryDe:
      "In D&D 2024 ist das Trinken eines Tranks eine Bonusaktion (nicht Aktion). Das gilt für alle Heiltränke und andere Tränke, sofern nicht anders angegeben.",
    summaryEn:
      "In D&D 2024, drinking a potion is a Bonus Action (not an Action). Applies to healing potions and other potions unless noted otherwise.",
    aliases: [
      "trank bonusaktion",
      "potion bonus action",
      "tränke trinken",
      "drink potion",
      "heiltrank bonus",
    ],
  }),
  rule({
    id: "advantage-disadvantage",
    category: "general",
    titleDe: "Vorteil & Nachteil",
    titleEn: "Advantage & Disadvantage",
    summaryDe:
      "Vorteil: Würfle 2W20, nimm den höheren Wert. Nachteil: nimm den niedrigeren. Mehrere Quellen heben sich nicht auf — bei Vorteil und Nachteil gleichzeitig würfle normal 1W20.",
    summaryEn:
      "Advantage: roll 2d20, use the higher. Disadvantage: use the lower. Multiple sources don't stack — Advantage and Disadvantage cancel to a normal d20 roll.",
    aliases: [
      "vorteil",
      "nachteil",
      "advantage",
      "disadvantage",
      "adv",
      "disadv",
    ],
  }),
  rule({
    id: "cover",
    category: "combat",
    titleDe: "Deckung",
    titleEn: "Cover",
    summaryDe:
      "Halbe Deckung: +2 RW/AC. Dreivierteldeckung: +5 RW/AC. Volle Deckung: Ziel nicht direkt angreifbar. Deckung gilt für RW, RW-Zauber und manche Effekte.",
    summaryEn:
      "Half Cover: +2 AC/DEX saves. Three-Quarters Cover: +5 AC/DEX saves. Total Cover: target can't be targeted directly.",
    aliases: ["deckung", "cover", "halbe deckung", "half cover", "volle deckung"],
  }),
  rule({
    id: "death-saves",
    category: "combat",
    titleDe: "Todesrettungswürfe",
    titleEn: "Death Saving Throws",
    summaryDe:
      "Bei 0 TP und ohne Bewusstlos-Stabilisierung: Am Zugbeginn 1W20. 10+: Erfolg, unter 10: Fehlschlag. 3 Erfolge = stabil (1 TP), 3 Fehlschläge = Tod. Natürliche 1 = 2 Fehlschläge, Natürliche 20 = 1 TP und wach.",
    summaryEn:
      "At 0 HP without stabilization: d20 at start of turn. 10+ = success, below 10 = failure. 3 successes = stable at 1 HP, 3 failures = dead. Nat 1 = 2 failures, Nat 20 = awake at 1 HP.",
    aliases: [
      "todesrettungswürfe",
      "death saves",
      "death saving throws",
      "rettungswürfe gegen den tod",
      "stabilisieren",
    ],
  }),
  rule({
    id: "unconscious",
    category: "condition",
    titleDe: "Bewusstlos",
    titleEn: "Unconscious",
    summaryDe:
      "Kann nicht handeln oder sprechen. Fällt hin, wenn noch nicht am Boden. Auto-Fehlschlag bei Stärke-/Geschicklichkeits-RW. Angriffe gegen dich haben Vorteil; Treffer in 1,5 m sind kritisch.",
    summaryEn:
      "Can't act or speak. Falls prone if not already. Auto-fail STR/DEX saves. Attacks against you have Advantage; hits within 5 ft are critical.",
    aliases: ["bewusstlos", "unconscious", "ohnmächtig", "knockout"],
  }),
  rule({
    id: "prone",
    category: "condition",
    titleDe: "Am Boden (Prone)",
    titleEn: "Prone",
    summaryDe:
      "Nur Kriechen oder Aufstehen (kostet halbe Bewegung). Angriffswurf von am Boden: Nachteil. Nahkampfangriff gegen am Boden: Vorteil. Fernkampfangriff gegen am Boden: Nachteil, wenn Angreifer >1,5 m entfernt.",
    summaryEn:
      "Only crawl or stand (costs half movement). Attack rolls while prone: Disadvantage. Melee attacks against prone: Advantage. Ranged attacks from >5 ft: Disadvantage.",
    aliases: ["am boden", "prone", "hingefallen", "liegend"],
  }),
  rule({
    id: "grapple",
    category: "action",
    titleDe: "Ergreifen (Grapple)",
    titleEn: "Grapple",
    summaryDe:
      "Spezialaktion beim Angriff (ersetzt einen Angriff): Athletics-Wurf gegen Ziel-Athletics oder Akrobatik. Erfolg: Ziel hat Ergriffen. Ziel kann Aktion nutzen, um erneut zu würfeln und sich zu befreien.",
    summaryEn:
      "Special melee attack (replaces one attack): Athletics vs target's Athletics or Acrobatics. Success: target is Grappled. Target can use an Action to escape on a successful contest.",
    aliases: ["ergreifen", "grapple", "grappling", "festhalten", "würgen"],
  }),
  rule({
    id: "shove",
    category: "action",
    titleDe: "Stoßen (Shove)",
    titleEn: "Shove",
    summaryDe:
      "Spezialaktion beim Angriff: Athletics gegen Ziel-Athletics/Akrobatik. Erfolg: Ziel 1,5 m wegstoßen oder am Boden werfen (Ziel wählt nicht).",
    summaryEn:
      "Special attack: Athletics vs target's Athletics/Acrobatics. Success: push target 5 feet away or knock it Prone (target doesn't choose).",
    aliases: ["stoßen", "shove", "push", "umwerfen", "niederschmettern"],
  }),
  rule({
    id: "help",
    category: "action",
    titleDe: "Helfen",
    titleEn: "Help",
    summaryDe:
      "Aktion: Kreatur in 1,5 m bei einem Attributswurf, Angriffswurf oder Fertigkeitswurf unterstützen — das Ziel erhält Vorteil auf den nächsten passenden Wurf vor Beginn deines nächsten Zugs.",
    summaryEn:
      "Action: Aid a creature within 5 feet on an ability check, attack roll, or skill check — target gains Advantage on the next qualifying roll before your next turn starts.",
    aliases: ["helfen", "help", "help action", "unterstützen"],
  }),
  rule({
    id: "ready",
    category: "action",
    titleDe: "Vorbereiten (Ready)",
    titleEn: "Ready",
    summaryDe:
      "Aktion: Aktion oder Zug vorbereiten und Auslöser festlegen. Reaktion: Bei Auslöser ausführen. Zauber vorbereiten kostet Konzentration und hält nur die Runde bis zum Beginn deines nächsten Zugs.",
    summaryEn:
      "Action: Ready an action or movement with a trigger. Reaction: execute when triggered. Readying a spell requires Concentration and lasts until the start of your next turn.",
    aliases: ["vorbereiten", "ready", "ready action", "auslöser", "trigger"],
  }),
  rule({
    id: "dash",
    category: "action",
    titleDe: "Spurt (Dash)",
    titleEn: "Dash",
    summaryDe: "Aktion: In diesem Zug zusätzliche Bewegung in Höhe deiner Bewegungsrate.",
    summaryEn: "Action: Gain extra movement equal to your speed for this turn.",
    aliases: ["spurt", "dash", "rennen", "sprinten"],
  }),
  rule({
    id: "disengage",
    category: "action",
    titleDe: "Rückzug (Disengage)",
    titleEn: "Disengage",
    summaryDe:
      "Aktion: Deine Bewegung löst in diesem Zug keine Gelegenheitsangriffe aus.",
    summaryEn: "Action: Your movement doesn't provoke Opportunity Attacks this turn.",
    aliases: ["rückzug", "disengage", "zurückweichen"],
  }),
  rule({
    id: "dodge",
    category: "action",
    titleDe: "Ausweichen (Dodge)",
    titleEn: "Dodge",
    summaryDe:
      "Aktion: Angriffe gegen dich haben Nachteil bis zu deinem nächsten Zug. Du würfelst mit Vorteil auf DEX-Rettungswürfe.",
    summaryEn:
      "Action: Attacks against you have Disadvantage until your next turn. You have Advantage on DEX saving throws.",
    aliases: ["ausweichen", "dodge", "ducken"],
  }),
  rule({
    id: "hide",
    category: "action",
    titleDe: "Verstecken (Hide)",
    titleEn: "Hide",
    summaryDe:
      "Aktion: Heimlichkeitswurf gegen passive Wahrnehmung der Gegner. Bei Erfolg bist du verborgen (nicht unsichtbar). Angriffe aus Verborgenheit haben Vorteil.",
    summaryEn:
      "Action: Stealth vs enemies' passive Perception. Success: you are Hidden (not Invisible). Attacks from Hidden have Advantage.",
    aliases: ["verstecken", "hide", "heimlichkeit", "stealth"],
  }),
  rule({
    id: "opportunity-attack",
    category: "combat",
    titleDe: "Gelegenheitsangriff",
    titleEn: "Opportunity Attack",
    summaryDe:
      "Reaktion: Wenn sichtbarer Feind deinen Nahkampfreichweite verlässt, ein Nahkampfangriff. Ausweichen (Disengage), Teleportieren oder Zwangsbewegung löst keinen aus.",
    summaryEn:
      "Reaction: When a visible enemy leaves your melee reach, make one melee attack. Disengage, teleport, or forced movement don't trigger.",
    aliases: [
      "gelegenheitsangriff",
      "opportunity attack",
      "oa",
      "hieb der gelegenheit",
    ],
  }),
  rule({
    id: "critical-hit",
    category: "combat",
    titleDe: "Kritischer Treffer",
    titleEn: "Critical Hit",
    summaryDe:
      "Natürliche 20 beim Angriffswurf trifft automatisch und ist kritisch: Würfle alle Schadenswürfel des Angriffs doppelt, addiere Modifikatoren normal.",
    summaryEn:
      "Natural 20 on an attack roll is an automatic hit and a critical: roll all damage dice twice, add modifiers once.",
    aliases: ["kritischer treffer", "critical hit", "crit", "nat 20", "natürliche 20"],
  }),
  rule({
    id: "initiative",
    category: "combat",
    titleDe: "Initiative",
    titleEn: "Initiative",
    summaryDe:
      "Kampfbeginn: Jeder würfelt 1W20 + GES-Mod. Absteigend sortieren — das ist die Initiative-Reihenfolge für den gesamten Kampf (Reihenfolge bleibt, außer bei expliziten Effekten).",
    summaryEn:
      "Combat start: Each rolls d20 + DEX mod, sort descending — initiative order for the whole fight unless changed by effects.",
    aliases: ["initiative", "initiativewurf", "kampfreihenfolge"],
  }),
  rule({
    id: "exhaustion",
    category: "condition",
    titleDe: "Erschöpfung (2024)",
    titleEn: "Exhaustion (2024)",
    summaryDe:
      "D&D 2024: Stufen 1–6. Stufe 1: Nachteil auf Attributswürfe. Stufe 2: Bewegungsrate halbiert. Stufe 3: Nachteil auf Angriffs- und Rettungswürfe. Stufe 4: Max TP halbiert. Stufe 5: Bewegungsrate 0. Stufe 6: Tod.",
    summaryEn:
      "D&D 2024: Levels 1–6. L1: Disadvantage on ability checks. L2: Speed halved. L3: Disadvantage on attacks/saves. L4: Max HP halved. L5: Speed 0. L6: Death.",
    aliases: ["erschöpfung", "exhaustion", "exhausted", "müdigkeit"],
  }),
  rule({
    id: "concentration",
    category: "general",
    titleDe: "Konzentration",
    titleEn: "Concentration",
    summaryDe:
      "Bei Schaden während Konzentration: CON-RW SG 10 oder halber Schaden (gerundet hoch), was höher ist. Scheitert der RW, endet der Zauber. Nur ein Konzentrationszauber gleichzeitig.",
    summaryEn:
      "When taking damage while concentrating: CON save DC 10 or half damage (rounded up), whichever is higher. Fail = spell ends. Only one concentration spell at a time.",
    aliases: ["konzentration", "concentration", "con save", "con rw"],
  }),
  rule({
    id: "heroic-inspiration",
    category: "general",
    titleDe: "Heroische Inspiration",
    titleEn: "Heroic Inspiration",
    summaryDe:
      "D&D 2024: Einmal pro W20-Wurf Inspiration ausgeben für Vorteil auf diesen Wurf. Inspiration kann der SL für heroisches Spiel vergeben. Kein Stapeln — höchstens 1 Inspiration.",
    summaryEn:
      "D&D 2024: Spend Inspiration once per d20 roll for Advantage on that roll. DM can award for heroic play. No stacking — max 1 Inspiration.",
    aliases: [
      "heroische inspiration",
      "heroic inspiration",
      "inspiration",
      "inspi",
    ],
  }),
  rule({
    id: "short-rest",
    category: "general",
    titleDe: "Kurze Rast",
    titleEn: "Short Rest",
    summaryDe:
      "Mindestens 1 Stunde Pause. Du kannst Trefferwürfel ausgeben, um TP zu heilen, und manche Fähigkeiten/Zauber-Slots (klasseabhängig) zurückgewinnen.",
    summaryEn:
      "At least 1 hour of downtime. Spend Hit Dice to heal and regain some class features/spell slots (class-dependent).",
    aliases: ["kurze rast", "short rest", "rast", "pause"],
  }),
  rule({
    id: "long-rest",
    category: "general",
    titleDe: "Lange Rast",
    titleEn: "Long Rest",
    summaryDe:
      "Mindestens 8 Stunden Schlaf/Rast. Stellt alle TP, halbe Trefferwürfel (min. 1) und fast alle Fähigkeiten/Zauber-Slots wieder her. Max. 1 lange Rast pro 24 Stunden.",
    summaryEn:
      "At least 8 hours sleep/rest. Regain all HP, half Hit Dice (min 1), and most features/spell slots. Max one long rest per 24 hours.",
    aliases: ["lange rast", "long rest", "schlafen", "ausruhen"],
  }),
  rule({
    id: "difficult-terrain",
    category: "environment",
    titleDe: "Schwieriges Gelände",
    titleEn: "Difficult Terrain",
    summaryDe:
      "Jeder Meter (5 ft) kostet 2 Meter (10 ft) Bewegung. Mehrere überlappende schwierige Gelände-Typen stapeln sich nicht.",
    summaryEn:
      "Each foot costs 2 feet of movement. Overlapping difficult terrain types don't stack.",
    aliases: [
      "schwieriges gelände",
      "difficult terrain",
      "gelände",
      "terrain",
      "dschungel",
      "schnee",
    ],
  }),
  rule({
    id: "sneak-attack",
    category: "class-feature",
    titleDe: "Hinterhältiger Angriff (Schurke)",
    titleEn: "Sneak Attack (Rogue)",
    summaryDe:
      "Einmal pro Zug extra Schaden mit Finesse- oder Fernkampfwaffe, wenn du Vorteil hast oder ein Verbündeter in 1,5 m am Ziel ist und du keinen Nachteil hast. Skaliert mit Schurkenstufe (Würfel siehe Klasse).",
    summaryEn:
      "Once per turn extra damage with finesse or ranged weapon if you have Advantage or an ally is within 5 ft of the target and you don't have Disadvantage. Scales with Rogue level.",
    aliases: [
      "hinterhältiger angriff",
      "sneak attack",
      "schurke extra schaden",
      "rogue sneak",
    ],
    source: "PHB 2024 — Rogue",
  }),
  rule({
    id: "two-weapon-fighting",
    category: "combat",
    titleDe: "Zweifach bewaffnet (2024)",
    titleEn: "Two-Weapon Fighting (2024)",
    summaryDe:
      "D&D 2024: Wenn du in deinem Zug die Angriffsaktion ausführst und zwei leichte Nahkampfwaffen hältst, kannst du als Bonusaktion mit der zweiten Waffe angreifen — aber nur der Modifikator-Schaden (keine Waffenwürfel), sofern keine Klassenmerkmal etwas anderes sagt.",
    summaryEn:
      "D&D 2024: When you take the Attack action with two light melee weapons, Bonus Action attack with the second weapon — only modifier damage (no weapon dice) unless a class feature says otherwise.",
    aliases: [
      "zweifach bewaffnet",
      "two weapon fighting",
      "dual wield",
      "zwei waffen",
    ],
  }),
  rule({
    id: "weapon-mastery",
    category: "general",
    titleDe: "Waffenmeisterschaft",
    titleEn: "Weapon Mastery",
    summaryDe:
      "D&D 2024: Jeder Charakter beherrscht Waffen mit Mastery-Eigenschaften (z. B. Finesse, Topple, Nick, Graze, Slow, Push, Sap, Vex). Anzahl beherrschter Waffen steigt mit Stufe (siehe Klasse/Tabelle).",
    summaryEn:
      "D&D 2024: Characters master weapons with Mastery properties (e.g. Finesse, Topple, Nick, Graze, Slow, Push, Sap, Vex). Number of mastered weapons increases with level.",
    aliases: [
      "waffenmeisterschaft",
      "weapon mastery",
      "mastery",
      "topple",
      "nick",
      "graze",
    ],
  }),
  rule({
    id: "frightened",
    category: "condition",
    titleDe: "Verängstigt",
    titleEn: "Frightened",
    summaryDe:
      "Nachteil auf Attributswürfe und Angriffswürfe, solange du die Quelle siehst. Kann sich nicht freiwillig der Quelle nähern.",
    summaryEn:
      "Disadvantage on ability checks and attack rolls while you can see the source. Can't willingly move closer to the source.",
    aliases: ["verängstigt", "frightened", "fear", "angst"],
  }),
  rule({
    id: "poisoned",
    category: "condition",
    titleDe: "Vergiftet",
    titleEn: "Poisoned",
    summaryDe:
      "Nachteil auf Angriffsrollen und Attributswürfe.",
    summaryEn: "Disadvantage on attack rolls and ability checks.",
    aliases: ["vergiftet", "poisoned", "gift"],
  }),
  rule({
    id: "stunned",
    category: "condition",
    titleDe: "Betäubt",
    titleEn: "Stunned",
    summaryDe:
      "Inaktiv (Incapacitated), kann sich nicht bewegen, spricht nur stockend. Auto-Fehlschlag STR/DEX-RW. Angriffe gegen dich haben Vorteil.",
    summaryEn:
      "Incapacitated, can't move, speech faltering. Auto-fail STR/DEX saves. Attacks against you have Advantage.",
    aliases: ["betäubt", "stunned", "stun"],
  }),
  rule({
    id: "paralyzed",
    category: "condition",
    titleDe: "Paralysiert",
    titleEn: "Paralyzed",
    summaryDe:
      "Inaktiv, kann sich nicht bewegen/sprechen. Auto-Fehlschlag STR/DEX-RW. Angriffe gegen dich haben Vorteil; Treffer in 1,5 m sind kritisch.",
    summaryEn:
      "Incapacitated, can't move/speak. Auto-fail STR/DEX saves. Attacks have Advantage; hits within 5 ft are critical.",
    aliases: ["paralysiert", "paralyzed", "paralyse"],
  }),
  rule({
    id: "restrained",
    category: "condition",
    titleDe: "Festgehalten",
    titleEn: "Restrained",
    summaryDe:
      "Bewegungsrate 0. Angriffe gegen dich haben Vorteil, deine Angriffe Nachteil. Nachteil auf DEX-RW. Gegner sind nicht festgehalten.",
    summaryEn:
      "Speed 0. Attacks against you have Advantage, your attacks have Disadvantage. Disadvantage on DEX saves. Foes aren't Restrained.",
    aliases: ["festgehalten", "restrained", "gefesselt", "ergiffen"],
  }),
  rule({
    id: "invisible",
    category: "condition",
    titleDe: "Unsichtbar",
    titleEn: "Invisible",
    summaryDe:
      "Für dich schwer zu treffen: Angriffe gegen dich Nachteil, deine Angriffe Vorteil. Unsichtbar ≠ Verborgen — du kannst noch Lärm machen.",
    summaryEn:
      "Hard to hit: attacks against you Disadvantage, your attacks Advantage. Invisible ≠ Hidden — you can still make noise.",
    aliases: ["unsichtbar", "invisible", "invisibility"],
  }),
  rule({
    id: "darkvision",
    category: "general",
    titleDe: "Dunkelsicht",
    titleEn: "Darkvision",
    summaryDe:
      "In Dunkelheit und Dämmerschein innerhalb der Reichweite (meist 18 m / 60 ft) siehst du in Graustufen als ob helles Licht.",
    summaryEn:
      "In darkness and dim light within range (often 60 ft), see in shades of gray as bright light.",
    aliases: ["dunkelsicht", "darkvision", "dunkelheit sehen"],
  }),
  rule({
    id: "holding-breath",
    category: "environment",
    titleDe: "Luft anhalten",
    titleEn: "Holding Breath",
    summaryDe:
      "Du kannst 1 + KON-Mod Minuten die Luft anhalten (min. 30 Sek.). Danach verlierst du TP = deine Erschöpfungsstufe am Ende jedes Zugs, bis du wieder atmen kannst.",
    summaryEn:
      "Hold breath for 1 + CON mod minutes (min 30 seconds). Then lose HP equal to your Exhaustion level at end of each turn until you can breathe.",
    aliases: ["luft anhalten", "holding breath", "ertrinken", "drowning", "unterwasser"],
  }),
  rule({
    id: "jumping",
    category: "environment",
    titleDe: "Springen",
    titleEn: "Jumping",
    summaryDe:
      "Weitsprung: Stärke × 0,3 m (1 ft) horizontal mit Anlauf, halbe Distanz ohne. Hochsprung: 0,9 m + STR×0,3 m (3 + STR ft) mit Anlauf. Schwieriges Gelände kann Sprünge erschweren.",
    summaryEn:
      "Long jump: STR × 1 ft horizontal with run-up, half without. High jump: 3 + STR ft with run-up. Difficult terrain may complicate jumps.",
    aliases: ["springen", "jump", "weitsprung", "hochsprung", "long jump"],
  }),
];

const CATALOG_QUICK_RULEBOOK_ENTRIES = buildCatalogQuickRules(
  CURATED_QUICK_RULEBOOK_ENTRIES.map((entry) => entry.id),
);

/** Curated core rules plus all class features, feats, and spells from the 2024 catalog. */
export const QUICK_RULEBOOK_ENTRIES: QuickRuleEntry[] = [
  ...CURATED_QUICK_RULEBOOK_ENTRIES,
  ...CATALOG_QUICK_RULEBOOK_ENTRIES,
];

export const QUICK_RULEBOOK_ENTRY_COUNT = QUICK_RULEBOOK_ENTRIES.length;

export const QUICK_RULEBOOK_COUNTS: Record<QuickRuleCategory, number> = QUICK_RULEBOOK_ENTRIES.reduce(
  (acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1;
    return acc;
  },
  {
    combat: 0,
    action: 0,
    condition: 0,
    item: 0,
    "class-feature": 0,
    feat: 0,
    spell: 0,
    environment: 0,
    general: 0,
  } satisfies Record<QuickRuleCategory, number>,
);
