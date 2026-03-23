/** Bekannte Achievement-Namen (müssen in Tabelle achievements existieren). */
export const ACHIEVEMENT_NAMES = {
  SLOGAN_SCHMIED: "Slogan-Schmied",
  ERSTER_ATEMZUG: "Der erste Atemzug",
  NEUES_GESICHT: "Ein neues Gesicht",
  PIZZA_BESTECHUNG: "Pizza-Bestechung",
  SCHAUSPIEL_LEGENDE: "Schauspiel-Legende",
} as const;

/** Alle 30 Achievements für GM-Vergabe (Name = Anzeige in DB). */
export const ALL_ACHIEVEMENT_NAMES: readonly string[] = [
  "Slogan-Schmied",
  "Der erste Atemzug",
  "Ein neues Gesicht",
  "Pizza-Bestechung",
  "Schauspiel-Legende",
  "Quest-Meister",
  "Lore-Wächter",
  "NPC-Flüsterer",
  "Session-Held",
  "Würfel-Glück",
  "Team-Player",
  "Erzähler",
  "Taktiker",
  "Entdecker",
  "Diplomat",
  "Schatzsucher",
  "Kartenzeichner",
  "Weltenschmied",
  "Charakter-Veteran",
  "Kampagnen-Gründer",
  "Treuer Begleiter",
  "Kritiker-Würze",
  "Nachtwache",
  "Geschichten-Sammler",
  "Rollen-Spieler",
  "Impro-König",
  "Regel-Wächter",
  "Atmosphären-Zauberer",
  "Epischer Moment",
  "Community-Stern",
];

/**
 * Zuordnung Achievement-Name (DB) → Dateiname in /images/achievement/.
 * Primäre Keys mit Umlauten + ASCII-Varianten (DB kann ae/oe/ue haben).
 */
const _MAP: Record<string, string> = {
  "Slogan-Schmied": "Schmiedemeister.png",
  "Der erste Atemzug": "heroischer Held.png",
  "Ein neues Gesicht": "Fröhlich und unschuldig durch die Welt.png",
  "Pizza-Bestechung": "Kochexperte.png",
  "Schauspiel-Legende": "Verführerisch.png",
  "Quest-Meister": "Quest erledigt.png",
  "Quest Meister": "Quest erledigt.png",
  "Lore-Wächter": "Bücherwurm.png",
  "Lore-Wachter": "Bücherwurm.png",
  "Lore Wächter": "Bücherwurm.png",
  "Lore Wachter": "Bücherwurm.png",
  "NPC-Flüsterer": "Beziehungsexperte.png",
  "NPC-Fluesterer": "Beziehungsexperte.png",
  "NPC Flüsterer": "Beziehungsexperte.png",
  "Session-Held": "Pünktlichkeit ist wichtig.png",
  "Session-Held: Pünktlichkeit": "Pünktlichkeit ist wichtig.png",
  "Session Held": "Pünktlichkeit ist wichtig.png",
  "Würfel-Glück": "Natürliche 20.png",
  "Wuerfel-Glueck": "Natürliche 20.png",
  "Würfel Glück": "Natürliche 20.png",
  "Team-Player": "Trinkfest und standhaft.png",
  "Team Player": "Trinkfest und standhaft.png",
  Erzähler: "barden zum schweigen gebracht.png",
  "Erzaehler": "barden zum schweigen gebracht.png",
  Taktiker: "Taktiker.png",
  Entdecker: "Geiriger-Abenteurer.png",
  Diplomat: "Experte-Einschüchtern.png",
  Schatzsucher: "MEgaschatz.png",
  Kartenzeichner: "Steinliebhaber.png",
  Weltenschmied: "Schmiedemeister.png",
  "Charakter-Veteran": "heroischer Held.png",
  "Charakter Veteran": "heroischer Held.png",
  "Kampagnen-Gründer": "Edles Streitross.png",
  "Kampagnen-Gruender": "Edles Streitross.png",
  "Kampagnen Gründer": "Edles Streitross.png",
  "Treuer Begleiter": "Tierliebhaber.png",
  "Kritiker-Würze": "NArrenkönig.png",
  "Kritiker-Wuerze": "NArrenkönig.png",
  "Kritiker Würze": "NArrenkönig.png",
  Nachtwache: "Regelhüter.png",
  "Geschichten-Sammler": "Bücherwurm.png",
  "Geschichten Sammler": "Bücherwurm.png",
  "Rollen-Spieler": "Modebewusst.png",
  "Rollen Spieler": "Modebewusst.png",
  "Impro-König": "NArrenkönig.png",
  "Impro-Koenig": "NArrenkönig.png",
  "Impro König": "NArrenkönig.png",
  "Regel-Wächter": "Regelhüter.png",
  "Regel-Wachter": "Regelhüter.png",
  "Regel Wächter": "Regelhüter.png",
  "Atmosphären-Zauberer": "Nerkomantie ist cool.png",
  "Atmosphaeren-Zauberer": "Nerkomantie ist cool.png",
  "Atmosphären Zauberer": "Nerkomantie ist cool.png",
  "Epischer Moment": "heroischer Held.png",
  "Community-Stern": "Zu Schön fürs Abenteuer.png",
  "Community Stern": "Zu Schön fürs Abenteuer.png",
  "Zuviel Gepäck": "zuviel Gepäck.png",
  "zuviel Gepäck": "zuviel Gepäck.png",
  "Zu viel Gepäck": "zuviel Gepäck.png",
  // Dateinamen als Achievement-Namen (Custom/Points-Katalog)
  Baumschmuser: "Baumschmuser.png",
  "Bis an die Zähne bewaffnet": "Bis an die Zähne bewaffnet.png",
  "Dümmlicher Krieger": "dümmlicher-krieger.png",
  "Dümmlicher-Krieger": "dümmlicher-krieger.png",
  "dümmlicher krieger": "dümmlicher-krieger.png",
  "dümmlicher-krieger": "dümmlicher-krieger.png",
};

export const ACHIEVEMENT_IMAGE_FILENAMES: Record<string, string> = _MAP;

/**
 * Normalisierter Lookup: findet Bild auch bei leichten Schreibvarianten.
 */
function normalizeKey(s: string): string {
  return s
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Prüft, ob der String wie ein Bild-Dateiname aussieht (mit Endung). */
const IMAGE_EXT = /\.(png|webp|jpg|jpeg|gif)$/i;

export function getAchievementImageForName(name: string): string | null {
  if (!name?.trim()) return null;
  if (_MAP[name]) return _MAP[name];
  const n = normalizeKey(name);
  for (const [k, v] of Object.entries(_MAP)) {
    if (normalizeKey(k) === n) return v;
  }
  // Fallback: Name ist evtl. schon der Dateiname (Custom-Achievements, Points-Katalog)
  const trimmed = name.trim();
  return IMAGE_EXT.test(trimmed) ? trimmed : `${trimmed}.png`;
}
