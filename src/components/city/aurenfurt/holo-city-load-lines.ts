/**
 * Unheimliche, witzige Spielleiter-Zeilen für den Stadt-Ladebildschirm.
 */

const NAMED: Record<string, string[]> = {
  wirtshaus: [
    "Das Wirtshaus erscheint geisterhaft auf dem Feld…",
    "Hörst du das? Irgendwo knarrt schon eine Stubentür…",
    "Das Wirtshaus huscht aus dem Nebel — und bestellt gleich mit.",
  ],
  kraemer: [
    "Ein Krämerladen materialisiert sich… Preise inklusive Gänsehaut.",
    "Der Krämer zählt Münzen, die noch gar nicht da sind…",
    "Gewürze, Gerüchte und ein Hauch Schwefel — der Laden steht.",
  ],
  nordtor: [
    "Das Nordtor knarrt sich in die Stadt…",
    "Zwei Türme, ein Tor, und zu viele Schatten dahinter…",
    "Das Nordtor öffnet sich — oder schließt sich? Schwer zu sagen.",
  ],
  suedtor: [
    "Das Südtor steigt aus dem Dunst…",
    "Von Süden kommt selten Gutes. Diesmal kommt ein Tor.",
    "Das Südtor erscheint — und prüft schon mal eure Papiere.",
  ],
  wachturm: [
    "Ein Wachturm steigt unheimlich empor…",
    "Oben brennt ein Licht. Unten… lieber nicht nachsehen.",
    "Der Wachturm starrt über die Dächer. Er starrt zurück.",
  ],
  palais: [
    "Das Palais materialisiert sich mit einem Schauer…",
    "Marmor, Macht und ein leises Kichern hinter Vorhängen…",
    "Das Palais setzt sich — als gehöre die Stadt schon ihm.",
  ],
  kapelle: [
    "Die Kapelle flüstert sich auf die Karte…",
    "Glocken ohne Klöppel. Trotzdem hört man sie.",
    "Die Kapelle erscheint. Die Kerzen waren schon an.",
  ],
  hofkanzlei: [
    "Die Hofkanzlei taucht aus dem Schatten auf…",
    "Akten rascheln. Keiner hat sie angefasst.",
    "Siegel, Stempel, Schweigen — die Kanzlei ist da.",
  ],
  observatorium: [
    "Das Observatorium starrt vom Himmel herab…",
    "Sterne rücken sich zurecht. Oder wir tun es.",
    "Das Observatorium öffnet ein Auge. Nur eines.",
  ],
  aurenfurt: [
    "Die Stadttafel legt sich über den Tisch…",
    "Straßen, Schatten, Geheimnisse — die Karte erwacht.",
    "Aurenfurt atmet auf. Hoffentlich nur die Karte.",
  ],
  wall: [
    "Mauersteine klopfen von innen…",
    "Die Stadtmauer zieht sich enger. Nur ein Gefühl. Sicher.",
    "Ziegel auf Ziegel — und dazwischen ein Flüstern.",
  ],
};

const IDLE_LINES = [
  "Psst… die Stadt formt sich noch hinter dem Schirm…",
  "Nur keine Panik. Das Unheimliche braucht einen Moment.",
  "Ich beleuchte hier nur atmosphärisch. Versprochen.",
  "Würfel rollen im Off… Modelle auch.",
  "Gleich sitzt alles. Bis dahin: dramatische Pause.",
];

const GENERIC_LINES = [
  (name: string) => `„${name}“ erscheint geisterhaft auf dem Feld…`,
  (name: string) => `Aus dem Nichts: ${name}. Typisch Stadtmagie.`,
  (name: string) => `${name} huscht auf die Karte — bitte nicht anfassen.`,
  (name: string) => `Der Nebel weicht: ${name} steht bereit.`,
];

function hashPick(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return count <= 0 ? 0 : h % count;
}

function basenameOf(url: string) {
  const clean = url.split("?")[0] ?? url;
  const file = clean.split("/").pop() ?? clean;
  return file.replace(/\.(glb|gltf|jpg|jpeg|png|webp)$/i, "");
}

function prettyName(slug: string) {
  const known: Record<string, string> = {
    wirtshaus: "Das Wirtshaus",
    kraemer: "Der Krämerladen",
    nordtor: "Das Nordtor",
    suedtor: "Das Südtor",
    wachturm: "Der Wachturm",
    palais: "Das Palais",
    kapelle: "Die Kapelle",
    hofkanzlei: "Die Hofkanzlei",
    observatorium: "Das Observatorium",
    aurenfurt: "Aurenfurt",
  };
  if (known[slug]) return known[slug];
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchKey(slug: string): string | null {
  const lower = slug.toLowerCase();
  for (const key of Object.keys(NAMED)) {
    if (lower.includes(key)) return key;
  }
  if (/mauer|wall|stein|brick/i.test(lower)) return "wall";
  return null;
}

/** Eine stabile, witzig-unheimliche Zeile zum aktuell geladenen Asset. */
export function spookyLoadLine(url: string | null | undefined, idleTick = 0): string {
  if (!url) {
    return IDLE_LINES[Math.abs(idleTick) % IDLE_LINES.length]!;
  }
  const slug = basenameOf(url);
  const key = matchKey(slug);
  if (key && NAMED[key]) {
    const lines = NAMED[key]!;
    return lines[hashPick(url, lines.length)]!;
  }
  const name = prettyName(slug);
  const templates = GENERIC_LINES;
  return templates[hashPick(url, templates.length)]!(name);
}
