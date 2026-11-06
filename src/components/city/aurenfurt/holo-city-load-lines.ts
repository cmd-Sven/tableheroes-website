/**
 * Sprechblasen-Texte für den Stadt-Ladebildschirm.
 */

const LOAD_SPEECH_LINES = [
  "Stadt wird einmal auf Hochglanz poliert ...",
  "NPCs werden gebürstet und gestriegelt.",
  "Die Würfel werden poliert und bereit gelegt.",
  "Ratten werden vertrieben und Mülleimer geleert",
  "Der Himmel wird passend eingefärbt und Wolken neu platziert.",
  "Aufstände und Mobs werden aufgelöst.",
  "Stadtwachen werden rausgeputzt und entwurmt.",
  "Der Kaiser trägt ab sofort wieder sichtbare Kleidung!",
  "Die Straßennamen werden jetzt gegendert!",
  "Schlaglöcher werden gestopft und Mauerrisse gefüllt.",
];

/** Nächste Lade-Sprechblase (rotiert über idleTick / Asset-Wechsel). */
export function spookyLoadLine(url: string | null | undefined, idleTick = 0): string {
  const count = LOAD_SPEECH_LINES.length;
  if (count <= 0) return "Stadt wird vorbereitet…";
  let h = Math.abs(idleTick);
  const seed = url ?? "";
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LOAD_SPEECH_LINES[h % count]!;
}
